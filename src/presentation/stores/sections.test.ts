import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import type { ProviderAdapter } from '../../connecteurs/ia/ProviderAdapter'
import { db } from '../../persistance/db'
import { useProjectsStore } from './useProjectsStore'
import { useSectionsStore } from './useSectionsStore'

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.projects.clear()
  await db.sections.clear()
  await db.projectDocuments.clear()
})

function providerRepondant(texte: string): ProviderAdapter {
  return {
    nomAffiche: 'Fournisseur test',
    estCloud: true,
    envoyerMessage: async () => ({ texte, version_moteur: null, citations: [] }),
  }
}

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

  test('ajouterLien crée un lien non dirigé, retirerLien le retire — idempotents', async () => {
    const { projets, sections, projet, section: oq } = await creerProjetEtSection('oq')
    const contexte = await sections.creerSection({
      project_id: projet.id,
      template_type: 'contexte_procede',
      language: 'fr',
      titre: 'Contexte procédé',
      owner_id: 'user-1',
    })

    await projets.ajouterLien(projet.id, oq.id, contexte.id)
    const projetApresAjout = await db.projects.get(projet.id)
    expect(projetApresAjout?.links).toHaveLength(1)
    expect(projetApresAjout?.links[0]).toMatchObject({
      from_section_id: oq.id,
      to_section_id: contexte.id,
    })

    // Idempotent : rejouer dans l'autre sens ne duplique pas le lien.
    await projets.ajouterLien(projet.id, contexte.id, oq.id)
    const projetApresDoublon = await db.projects.get(projet.id)
    expect(projetApresDoublon?.links).toHaveLength(1)

    await projets.retirerLien(projet.id, oq.id, contexte.id)
    const projetApresRetrait = await db.projects.get(projet.id)
    expect(projetApresRetrait?.links).toHaveLength(0)
  })

  test('ajouterLien lève réellement le blocage U-01 (bout en bout, sans passer par "Forcer")', async () => {
    const { projets, sections, projet, section: oq } = await creerProjetEtSection('oq')
    const contexte = await sections.creerSection({
      project_id: projet.id,
      template_type: 'contexte_procede',
      language: 'fr',
      titre: 'Contexte procédé',
      owner_id: 'user-1',
    })
    await db.sections.put({
      ...oq,
      workflow: { authors: ['user-1'], reviewers: [], approver_final: 'user-2' },
    })

    const bloque = await sections.engagerVerification(oq.id)
    expect(bloque).toEqual({ ok: false, blocagesFinalisation: ['U-01'] })

    await projets.ajouterLien(projet.id, oq.id, contexte.id)
    const autorise = await sections.engagerVerification(oq.id)
    expect(autorise).toEqual({ ok: true })
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

describe('useSectionsStore — journaliserExport (FS §4.3, URS-F-027)', () => {
  test('journalise "export" par défaut', async () => {
    const { sections, section } = await creerProjetEtSection('contexte_procede')
    await sections.journaliserExport(section.id, false)
    const sectionEnBase = await db.sections.get(section.id)
    expect(sectionEnBase?.audit_log.at(-1)?.action).toBe('export')
  })

  test('journalise "export_force" quand forcé', async () => {
    const { sections, section } = await creerProjetEtSection('contexte_procede')
    await sections.journaliserExport(section.id, true)
    const sectionEnBase = await db.sections.get(section.id)
    expect(sectionEnBase?.audit_log.at(-1)?.action).toBe('export_force')
  })

  test("n'est jamais bloqué par le verrouillage valide_en_interne (l'export d'une section validée est l'usage principal)", async () => {
    const { sections, section } = await creerProjetEtSection('contexte_procede')
    await db.sections.put({ ...section, status: 'valide_en_interne' })
    await sections.journaliserExport(section.id, false)
    const sectionEnBase = await db.sections.get(section.id)
    expect(sectionEnBase?.audit_log.at(-1)?.action).toBe('export')
  })
})

describe('useSectionsStore — importerSection (FS §4.3, URS-F-021)', () => {
  test('crée une section nouvelle (id distinct), rattachée au projet cible, avec entrée "import"', async () => {
    const { sections, projet } = await creerProjetEtSection('contexte_procede')
    const donnees = {
      template_type: 'dq' as const,
      template_engine_version: '0.1.0',
      owner_id: 'u-distant',
      shared_with: [],
      language: 'fr' as const,
      status: 'brouillon_aide' as const,
      meta: { ref: 'REF-X', titre: 'Section importée', version: '0.1' },
      workflow: { authors: ['u-distant'], reviewers: [], approver_final: null },
      signatures: { redacteur: {}, verificateur: {}, approbateur: {} },
      revisions: [],
      values: {},
      tables: {},
      generation_source: { source_document_id: null, generated_fields: [] },
      audit_log: [
        { timestamp: '2026-01-01T00:00:00.000Z', actor: 'u-distant', action: 'création' },
      ],
      created_at: '2026-01-01T00:00:00.000Z',
    }

    const importee = await sections.importerSection(projet.id, donnees, 'u-local')
    expect(importee.project_id).toBe(projet.id)
    expect(importee.id).not.toBe('')

    const sectionEnBase = await db.sections.get(importee.id)
    expect(sectionEnBase?.meta.titre).toBe('Section importée')
    // Historique importé préservé + entrée "import" ajoutée (jamais "création", qui masquerait l'origine).
    expect(sectionEnBase?.audit_log).toHaveLength(2)
    expect(sectionEnBase?.audit_log[0]?.action).toBe('création')
    expect(sectionEnBase?.audit_log[1]).toMatchObject({ actor: 'u-local', action: 'import' })

    const projetEnBase = await db.projects.get(projet.id)
    expect(projetEnBase?.sections).toContain(importee.id)
  })
})

describe('useSectionsStore — genererBrouillonIA (§4.1bis, Phase 33, URS-F-060 à 064)', () => {
  test('refuse sans confirmation explicite du droit d’usage (URS-F-062)', async () => {
    const { sections, section } = await creerProjetEtSection('contexte_procede')
    const resultat = await sections.genererBrouillonIA(
      section.id,
      {
        texteDocumentReference: 'Texte source',
        nomDocumentReference: 'ref.docx',
        contexteNouveauCas: 'Nouveau cas',
        confirmationDroitUsage: false,
        actor: 'user-1',
      },
      providerRepondant('CHAMP|description.description_procede|Procédé adapté.'),
    )
    expect(resultat).toEqual({ ok: false, motif: 'confirmation_droit_usage_requise' })

    const sectionEnBase = await db.sections.get(section.id)
    expect(sectionEnBase?.status).toBe('brouillon_aide')
  })

  test('refuse sur une section qui n’est plus brouillon_aide', async () => {
    const { sections, section } = await creerProjetEtSection('contexte_procede')
    await db.sections.put({ ...section, status: 'valide_en_interne' })
    const resultat = await sections.genererBrouillonIA(
      section.id,
      {
        texteDocumentReference: 'Texte source',
        nomDocumentReference: 'ref.docx',
        contexteNouveauCas: 'Nouveau cas',
        confirmationDroitUsage: true,
        actor: 'user-1',
      },
      providerRepondant('CHAMP|description.description_procede|Procédé adapté.'),
    )
    expect(resultat).toEqual({ ok: false, motif: 'statut_incompatible' })
  })

  test('cas nominal : crée le document de référence, remplit les champs, statut propose_par_ia_non_valide, filiation et journal complets', async () => {
    const { sections, projet, section } = await creerProjetEtSection('contexte_procede')
    const resultat = await sections.genererBrouillonIA(
      section.id,
      {
        texteDocumentReference: 'Le procédé source décrit un remplissage aseptique.',
        nomDocumentReference: 'procede-reference.docx',
        contexteNouveauCas: 'Nouvelle ligne, même principe de remplissage.',
        confirmationDroitUsage: true,
        actor: 'user-1',
      },
      providerRepondant(
        [
          'CHAMP|description.description_procede|Remplissage aseptique adapté à la nouvelle ligne.',
          'CHAMP|description.conditions_operatoires|Température ambiante contrôlée.',
        ].join('\n'),
      ),
    )
    expect(resultat).toEqual({ ok: true, champsGeneres: 2, lignesTableauxGenerees: 0 })

    const sectionEnBase = await db.sections.get(section.id)
    expect(sectionEnBase?.status).toBe('propose_par_ia_non_valide')
    expect(sectionEnBase?.values.description_procede).toBe(
      'Remplissage aseptique adapté à la nouvelle ligne.',
    )
    expect(sectionEnBase?.values.conditions_operatoires).toBe('Température ambiante contrôlée.')
    // Gabarit "contexte_procede" n'a aucun champ scalaire `nombre' — aucun
    // champ n'est donc d'origine technique/numérique dans ce cas (URS-F-063).
    expect(sectionEnBase?.generation_source.generated_fields).toEqual([])
    const sourceDocumentId = sectionEnBase?.generation_source.source_document_id
    expect(sourceDocumentId).toBeTruthy()
    if (!sourceDocumentId) throw new Error('source_document_id manquant')

    const documentReference = await sections.obtenirDocumentReference(sourceDocumentId)
    expect(documentReference).toMatchObject({
      filename: 'procede-reference.docx',
      project_id: projet.id,
      extracted_text: 'Le procédé source décrit un remplissage aseptique.',
    })

    const actions = sectionEnBase?.audit_log.map((e) => e.action) ?? []
    expect(actions).toContain('confirmation_droit_usage_document_reference')
    expect(actions.some((a) => a.startsWith('generation_brouillon_ia'))).toBe(true)

    // ALCOA+ (FS §3, v04) : entrée "génération assistée" distincte, jamais
    // fusionnée avec une future validation utilisateur.
    expect(sectionEnBase?.revisions.at(-1)).toMatchObject({
      motif: 'génération assistée',
      auteur: 'système (Fournisseur test)',
    })

    const projetEnBase = await db.projects.get(projet.id)
    expect(projetEnBase?.documents).toContain(sectionEnBase?.generation_source.source_document_id)
  })

  test('propose des lignes de tableau dynamique pour un tableau vide (Phase 38, Option 2, TD-045)', async () => {
    const { sections, section } = await creerProjetEtSection('contexte_procede')
    const resultat = await sections.genererBrouillonIA(
      section.id,
      {
        texteDocumentReference: 'Le procédé source décrit un remplissage aseptique.',
        nomDocumentReference: 'procede-reference.docx',
        contexteNouveauCas: 'Nouvelle ligne, même principe de remplissage.',
        confirmationDroitUsage: true,
        actor: 'user-1',
      },
      providerRepondant(
        [
          'LIGNE_TABLEAU|parametres_critiques.cpp|parametre=Température;valeur_cible=121°C;tolerance=±1°C',
          'LIGNE_TABLEAU|parametres_critiques.cpp|parametre=Pression;valeur_cible=2 bar;tolerance=±0.1 bar',
        ].join('\n'),
      ),
    )
    expect(resultat).toEqual({ ok: true, champsGeneres: 0, lignesTableauxGenerees: 2 })

    const sectionEnBase = await db.sections.get(section.id)
    expect(sectionEnBase?.tables.cpp).toEqual([
      { parametre: 'Température', valeur_cible: '121°C', tolerance: '±1°C' },
      { parametre: 'Pression', valeur_cible: '2 bar', tolerance: '±0.1 bar' },
    ])
  })

  test('ne recouvre jamais un tableau déjà rempli (Phase 38, Option 2, TD-045)', async () => {
    const { sections, section } = await creerProjetEtSection('contexte_procede')
    await sections.mettreAJourTable(section.id, 'cpp', [{ parametre: 'Déjà saisi' }])

    const resultat = await sections.genererBrouillonIA(
      section.id,
      {
        texteDocumentReference: 'Texte source',
        nomDocumentReference: 'ref.docx',
        contexteNouveauCas: 'Nouveau cas',
        confirmationDroitUsage: true,
        actor: 'user-1',
      },
      providerRepondant('LIGNE_TABLEAU|parametres_critiques.cpp|parametre=Nouvelle valeur'),
    )
    expect(resultat).toEqual({ ok: true, champsGeneres: 0, lignesTableauxGenerees: 0 })

    const sectionEnBase = await db.sections.get(section.id)
    expect(sectionEnBase?.tables.cpp).toEqual([{ parametre: 'Déjà saisi' }])
  })

  test('ne recouvre jamais une valeur déjà saisie par l’utilisateur', async () => {
    const { sections, section } = await creerProjetEtSection('contexte_procede')
    await sections.mettreAJourValeurs(section.id, {
      description_procede: "Déjà rédigé par l'utilisateur.",
    })

    await sections.genererBrouillonIA(
      section.id,
      {
        texteDocumentReference: 'Texte source',
        nomDocumentReference: 'ref.docx',
        contexteNouveauCas: 'Nouveau cas',
        confirmationDroitUsage: true,
        actor: 'user-1',
      },
      providerRepondant('CHAMP|description.description_procede|Valeur proposée par IA.'),
    )

    const sectionEnBase = await db.sections.get(section.id)
    expect(sectionEnBase?.values.description_procede).toBe("Déjà rédigé par l'utilisateur.")
  })

  test('refuse quand aucun gabarit n’est défini pour le template_type', async () => {
    const { sections, section } = await creerProjetEtSection('contexte_procede')
    await db.sections.put({ ...section, template_type: 'inconnu_hors_catalogue' as never })
    const resultat = await sections.genererBrouillonIA(
      section.id,
      {
        texteDocumentReference: 'Texte source',
        nomDocumentReference: 'ref.docx',
        contexteNouveauCas: 'Nouveau cas',
        confirmationDroitUsage: true,
        actor: 'user-1',
      },
      providerRepondant('CHAMP|description.description_procede|x'),
    )
    expect(resultat).toEqual({ ok: false, motif: 'gabarit_introuvable' })
  })
})

describe('useSectionsStore — validerSectionIA (URS-F-061, clarification ALCOA+ FS §3 v04)', () => {
  test('transition propose_par_ia_non_valide -> brouillon_aide avec une entrée revisions distincte motif "validation utilisateur"', async () => {
    const { sections, section } = await creerProjetEtSection('contexte_procede')
    await db.sections.put({
      ...section,
      status: 'propose_par_ia_non_valide',
      revisions: [
        {
          version: '0.1',
          date: '2026-01-01T00:00:00.000Z',
          auteur: 'système (Claude)',
          motif: 'génération assistée',
        },
      ],
    })

    const resultat = await sections.validerSectionIA(section.id)
    expect(resultat).toEqual({ ok: true })

    const sectionEnBase = await db.sections.get(section.id)
    expect(sectionEnBase?.status).toBe('brouillon_aide')
    expect(sectionEnBase?.revisions).toHaveLength(2)
    expect(sectionEnBase?.revisions.at(-1)).toMatchObject({ motif: 'validation utilisateur' })
    // L'entrée "génération assistée" reste intacte, jamais fusionnée.
    expect(sectionEnBase?.revisions[0]?.motif).toBe('génération assistée')
  })
})
