import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { db } from '../../persistance/db'
import { useProjectsStore } from './useProjectsStore'
import { useSectionsStore } from './useSectionsStore'

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.projects.clear()
  await db.sections.clear()
})

async function creerProjetEtSection(templateType: 'oq' | 'iq' | 'contexte_procede' | 'dq' = 'oq') {
  const projets = useProjectsStore()
  const sections = useSectionsStore()
  const projet = await projets.creerProjet({
    name: 'Ligne de conditionnement A12',
    context: 'Qualification suite à changement de fournisseur',
    scope_in: 'Machine de remplissage',
    scope_out: 'Étiquetage',
    deadline: null,
    language_default: 'fr',
    client_id: null,
  })
  const section = await sections.creerSection({
    project_id: projet.id,
    template_type: templateType,
    language: 'fr',
    titre: 'OQ ligne A12',
    owner_id: 'user-1',
  })
  return { projets, sections, projet, section }
}

describe('useProjectsStore', () => {
  test('creerProjet persiste et ajoute au state, chargerProjets relit depuis la base', async () => {
    const projets = useProjectsStore()
    const projet = await projets.creerProjet({
      name: 'Test',
      context: 'Ctx',
      scope_in: 'in',
      scope_out: 'out',
      deadline: null,
      language_default: 'fr',
      client_id: null,
    })
    expect(projets.projects).toHaveLength(1)

    const autreVue = useProjectsStore()
    await autreVue.chargerProjets()
    expect(autreVue.projects.map((p) => p.id)).toContain(projet.id)
  })
})

describe('useSectionsStore — création', () => {
  test('creerSection persiste, lie la section au projet, statut initial brouillon_aide', async () => {
    const { sections, projet, section } = await creerProjetEtSection()
    expect(section.status).toBe('brouillon_aide')

    const projetMisAJour = await db.projects.get(projet.id)
    expect(projetMisAJour?.sections).toContain(section.id)
    expect(sections.sectionsParProjet[projet.id]).toHaveLength(1)
  })
})

describe('useSectionsStore — mettreAJourValeurs (URS-F-009)', () => {
  test('persiste les valeurs saisies', async () => {
    const { sections, section } = await creerProjetEtSection('contexte_procede')
    await sections.mettreAJourValeurs(section.id, { contenu: "Texte rédigé par l'utilisateur" })
    const sectionEnBase = await db.sections.get(section.id)
    expect(sectionEnBase?.values.contenu).toBe("Texte rédigé par l'utilisateur")
  })

  test('refuse silencieusement toute écriture sur une section verrouillée (URS-F-012)', async () => {
    const { sections, section } = await creerProjetEtSection('contexte_procede')
    await db.sections.put({ ...section, status: 'valide_en_interne', values: { contenu: 'v1' } })
    await sections.mettreAJourValeurs(section.id, { contenu: 'tentative après verrouillage' })
    const sectionEnBase = await db.sections.get(section.id)
    expect(sectionEnBase?.values.contenu).toBe('v1')
  })

  test("journalise une entrée 'modification' dans audit_log (FS §3, traçabilité)", async () => {
    const { sections, section } = await creerProjetEtSection('contexte_procede')
    expect(section.audit_log).toHaveLength(1) // création uniquement, à ce stade

    await sections.mettreAJourValeurs(section.id, { contenu: 'v1' })
    const sectionEnBase = await db.sections.get(section.id)
    expect(sectionEnBase?.audit_log.at(-1)?.action).toBe('modification')
    expect(sectionEnBase?.audit_log).toHaveLength(2)
  })

  test('une section verrouillée ne journalise pas non plus de tentative refusée', async () => {
    const { sections, section } = await creerProjetEtSection('contexte_procede')
    await db.sections.put({ ...section, status: 'valide_en_interne' })
    await sections.mettreAJourValeurs(section.id, { contenu: 'tentative' })
    const sectionEnBase = await db.sections.get(section.id)
    expect(sectionEnBase?.audit_log).toHaveLength(1)
  })
})

describe('useSectionsStore — mettreAJourTable (FDS §4, tableau_dynamique)', () => {
  test('persiste les lignes sous la clé de table donnée, sans toucher aux autres tables', async () => {
    const { sections, section } = await creerProjetEtSection('dq')
    await db.sections.put({ ...section, tables: { autre_table: [{ x: 1 }] } })

    await sections.mettreAJourTable(section.id, 'risques', [
      { danger: 'Panne capteur', severite: 4, occurrence: 2, detectabilite: 3 },
    ])
    const sectionEnBase = await db.sections.get(section.id)
    expect(sectionEnBase?.tables.risques).toEqual([
      { danger: 'Panne capteur', severite: 4, occurrence: 2, detectabilite: 3 },
    ])
    expect(sectionEnBase?.tables.autre_table).toEqual([{ x: 1 }])
  })

  test('refuse silencieusement toute écriture sur une section verrouillée', async () => {
    const { sections, section } = await creerProjetEtSection('dq')
    await db.sections.put({ ...section, status: 'valide_en_interne', tables: { risques: [] } })
    await sections.mettreAJourTable(section.id, 'risques', [{ danger: 'x' }])
    const sectionEnBase = await db.sections.get(section.id)
    expect(sectionEnBase?.tables.risques).toEqual([])
  })

  test("journalise une entrée 'modification'", async () => {
    const { sections, section } = await creerProjetEtSection('dq')
    await sections.mettreAJourTable(section.id, 'risques', [{ danger: 'x' }])
    const sectionEnBase = await db.sections.get(section.id)
    expect(sectionEnBase?.audit_log.at(-1)?.action).toBe('modification')
  })
})

describe('useSectionsStore — workflow (approbateur, avis relecteur)', () => {
  test('assignerApprobateurFinal renseigne workflow.approver_final', async () => {
    const { sections, section } = await creerProjetEtSection('contexte_procede')
    await sections.assignerApprobateurFinal(section.id, 'qa-1')
    const sectionEnBase = await db.sections.get(section.id)
    expect(sectionEnBase?.workflow.approver_final).toBe('qa-1')
  })

  test('ajouterAvisRelecteur ajoute une entrée à workflow.reviewers', async () => {
    const { sections, section } = await creerProjetEtSection('contexte_procede')
    await sections.ajouterAvisRelecteur(section.id, 'revu-1', 'Favorable')
    const sectionEnBase = await db.sections.get(section.id)
    expect(sectionEnBase?.workflow.reviewers).toEqual([
      expect.objectContaining({ user_id: 'revu-1', avis: 'Favorable' }),
    ])
  })

  test('le parcours complet via le workflow (sans injection directe en base) atteint valide_en_interne', async () => {
    const { sections, section } = await creerProjetEtSection('contexte_procede')
    await sections.assignerApprobateurFinal(section.id, 'qa-1')
    expect(await sections.engagerVerification(section.id)).toEqual({ ok: true })

    await sections.ajouterAvisRelecteur(section.id, 'revu-1', 'Favorable')
    expect(await sections.transmettreApprobation(section.id)).toEqual({ ok: true })

    expect(await sections.approuver(section.id)).toEqual({ ok: true })
    const sectionFinale = await db.sections.get(section.id)
    expect(sectionFinale?.status).toBe('valide_en_interne')
  })
})

describe('useSectionsStore — engagerVerification (garde-fou U-01)', () => {
  test('bloqué sans lien Contexte procédé pour une section OQ', async () => {
    const { sections, section } = await creerProjetEtSection('oq')
    const resultat = await sections.engagerVerification(section.id)
    expect(resultat).toEqual({ ok: false, blocagesFinalisation: ['U-01'] })

    const sectionEnBase = await db.sections.get(section.id)
    expect(sectionEnBase?.status).toBe('brouillon_aide')
  })

  test('forçage sans motif reste bloqué', async () => {
    const { sections, section } = await creerProjetEtSection('oq')
    const resultat = await sections.engagerVerification(section.id, '   ')
    expect(resultat).toEqual({ ok: false, blocagesFinalisation: ['U-01'] })
  })

  test('forçage avec motif passe outre le blocage et journalise', async () => {
    const { sections, section } = await creerProjetEtSection('oq')
    await db.sections.put({
      ...section,
      workflow: { authors: ['user-1'], reviewers: [], approver_final: 'user-2' },
    })
    const resultat = await sections.engagerVerification(
      section.id,
      'Contexte procédé hors périmètre, validé en revue',
    )
    expect(resultat).toEqual({ ok: true })

    const sectionEnBase = await db.sections.get(section.id)
    expect(sectionEnBase?.status).toBe('en_verification')
    expect(sectionEnBase?.audit_log.at(-1)?.action).toContain('forcé')
  })

  test('autorisé directement si le lien Contexte procédé existe', async () => {
    const { projets, sections, projet, section } = await creerProjetEtSection('oq')
    const contexte = await sections.creerSection({
      project_id: projet.id,
      template_type: 'contexte_procede',
      language: 'fr',
      titre: 'Contexte procédé',
      owner_id: 'user-1',
    })
    const maintenant = new Date().toISOString()
    const projetAvecLien = await projets.obtenirProjet(projet.id)
    if (projetAvecLien === undefined) throw new Error('projet introuvable dans le test')
    await db.projects.put({
      ...projetAvecLien,
      links: [
        {
          from_section_id: section.id,
          to_section_id: contexte.id,
          created_by: 'user-1',
          created_at: maintenant,
        },
      ],
    })
    await db.sections.put({
      ...section,
      workflow: { authors: ['user-1'], reviewers: [], approver_final: 'user-2' },
    })

    const resultat = await sections.engagerVerification(section.id)
    expect(resultat).toEqual({ ok: true })
  })

  test('un gabarit IQ est bloqué par U-02 (métrologie), pas U-01', async () => {
    const { sections, section } = await creerProjetEtSection('iq')
    const resultat = await sections.engagerVerification(section.id)
    expect(resultat).toEqual({ ok: false, blocagesFinalisation: ['U-02'] })
  })
})

describe("useSectionsStore — cycle complet jusqu'à valide_en_interne", () => {
  test('rôles manquants bloquent engager_verification même sans souci de lien', async () => {
    const { sections, section } = await creerProjetEtSection('contexte_procede')
    // Un gabarit contexte_procede n'a pas de garde de lien (FDS §3.3) — mais
    // le workflow n'a pas d'approbateur final renseigné : la machine à
    // états doit bloquer indépendamment des garde-fous de finalisation.
    const resultat = await sections.engagerVerification(section.id)
    expect(resultat).toEqual({ ok: false, raisonTransition: 'roles_manquants' })
  })

  test('rejet ramène à brouillon_aide avec motif journalisé en revisions[]', async () => {
    const { sections, section } = await creerProjetEtSection('contexte_procede')
    await db.sections.put({
      ...section,
      workflow: { authors: ['user-1'], reviewers: [], approver_final: 'user-2' },
    })

    const engagement = await sections.engagerVerification(section.id)
    expect(engagement).toEqual({ ok: true })

    const rejet = await sections.rejeter(section.id, 'Références normatives manquantes')
    expect(rejet).toEqual({ ok: true })

    const sectionEnBase = await db.sections.get(section.id)
    expect(sectionEnBase?.status).toBe('brouillon_aide')
    expect(sectionEnBase?.revisions.at(-1)?.motif).toBe('Références normatives manquantes')
  })

  test("parcours nominal complet jusqu'à valide_en_interne (gabarit sans garde de lien)", async () => {
    const { sections, section } = await creerProjetEtSection('contexte_procede')
    await db.sections.put({
      ...section,
      workflow: {
        authors: ['user-1'],
        reviewers: [{ user_id: 'revu-1', avis: 'Favorable', date: new Date().toISOString() }],
        approver_final: 'user-2',
      },
    })

    expect(await sections.engagerVerification(section.id)).toEqual({ ok: true })
    expect(await sections.transmettreApprobation(section.id)).toEqual({ ok: true })
    expect(await sections.approuver(section.id)).toEqual({ ok: true })

    const sectionFinale = await db.sections.get(section.id)
    expect(sectionFinale?.status).toBe('valide_en_interne')

    // Verrouillée : toute nouvelle transition est refusée (URS-F-012).
    const tentative = await sections.transmettreApprobation(section.id)
    expect(tentative).toEqual({ ok: false, raisonTransition: 'section_verrouillee' })
  })
})
