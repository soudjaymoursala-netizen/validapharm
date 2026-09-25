import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { Project, Section } from '../../logique-metier/domaine/types'
import { db } from '../../persistance/db'
import type { Contexte } from '../../../workers/auth-worker/src/routeur'
import {
  connecterAdminDeTest,
  creerProjetDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import { useAuthStore } from './useAuthStore'
import { useConnexionGitHubStore } from './useConnexionGitHubStore'
import { projetDomaineVersWireComplet, projetWireVersDomaine } from './useProjectsStore'
import { sectionDomaineVersWire, sectionWireVersDomaine } from './useSectionsStore'
import { useSynchronisationStore } from './useSynchronisationStore'

/**
 * `Project`/`Section` vivent désormais dans le Worker/D1 (Phases 3a/3b du
 * chantier de migration D1) — remplace les anciens `db.projects.put(...)`/
 * `db.sections.put(...)` directs de préparation de test : utilise la même
 * route `restaurerProjet`/`restaurerSection` (écrasement sans fusion) que
 * `useSynchronisationStore.recupererDepuisGitHub`, seule voie qui accepte
 * un enregistrement déjà complet avec un id choisi par l'appelant.
 */
async function seedProjet(projet: Project): Promise<void> {
  const authStore = useAuthStore()
  const api = await authStore.client()
  if (!api || !authStore.jeton) throw new Error('session absente en préparation de test')
  const resultat = await api.restaurerProjet(
    authStore.jeton,
    projet.id,
    projetDomaineVersWireComplet(projet),
  )
  if (!resultat.ok) throw new Error(`échec de préparation de test : ${resultat.erreur}`)
}

async function obtenirProjetDeTest(id: string): Promise<Project | undefined> {
  const authStore = useAuthStore()
  const api = await authStore.client()
  if (!api || !authStore.jeton) return undefined
  const resultat = await api.obtenirProjet(authStore.jeton, id)
  if (!resultat.ok) return undefined
  return projetWireVersDomaine(resultat.donnees.projet)
}

async function seedSection(section: Section): Promise<void> {
  const authStore = useAuthStore()
  const api = await authStore.client()
  if (!api || !authStore.jeton) throw new Error('session absente en préparation de test')
  const resultat = await api.restaurerSection(
    authStore.jeton,
    section.id,
    sectionDomaineVersWire(section),
  )
  if (!resultat.ok) throw new Error(`échec de préparation de test : ${resultat.erreur}`)
}

async function obtenirSectionDeTest(id: string): Promise<Section | undefined> {
  const authStore = useAuthStore()
  const api = await authStore.client()
  if (!api || !authStore.jeton) return undefined
  const resultat = await api.obtenirSection(authStore.jeton, id)
  if (!resultat.ok) return undefined
  return sectionWireVersDomaine(resultat.donnees.section)
}

function reponseMock(
  corps: unknown,
  options: { status?: number; headers?: Record<string, string> } = {},
): Response {
  const status = options.status ?? 200
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (nom: string) => options.headers?.[nom] ?? null },
    json: async () => corps,
  } as Response
}

function encoderBase64Utf8(texte: string): string {
  const octets = new TextEncoder().encode(texte)
  return btoa(String.fromCharCode(...octets))
}

// Le dépôt GitHub est désormais un paramètre d'installation stocké côté
// Worker/D1 (`useConnexionGitHubStore`) — `fetchMock` ci-dessous ne sert
// donc plus qu'aux appels réels à l'API GitHub, jamais à
// l'authentification/la configuration (interceptées par
// `installerFauxWorkerAuth`, qui délègue tout le reste à `fetchMock`).
let fetchMock: ReturnType<typeof vi.fn>
let demonter: () => void
let ctx: Contexte

beforeEach(async () => {
  setActivePinia(createPinia())
  await reinitialiserAuthDeTest()
  await db.etatSynchronisation.clear()
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  const installation = installerFauxWorkerAuth()
  ctx = installation.ctx
  demonter = installation.demonter
  await connecterAdminDeTest()
})

afterEach(() => {
  demonter()
})

async function configurerConnexion(): Promise<void> {
  const resultat = await useConnexionGitHubStore().enregistrer({
    owner: 'acme',
    repo: 'data',
    branche: 'main',
    jeton: 'x',
  })
  if (!resultat.ok)
    throw new Error(`préparation de la connexion GitHub échouée : ${resultat.erreur}`)
}

describe('useSynchronisationStore — synchroniser', () => {
  test('sans connexion configurée : échec explicite, aucun appel réseau', async () => {
    const store = useSynchronisationStore()
    const resultat = await store.synchroniser()
    expect(resultat).toEqual({
      ok: false,
      conflit: false,
      message: 'Aucune connexion GitHub configurée.',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('aucune donnée locale : ne tente aucune écriture', async () => {
    await configurerConnexion()
    await db.etatSynchronisation.put({
      id: 'unique',
      shaBrancheConnue: 'sha-connue',
      derniereSynchronisation: null,
    })
    const store = useSynchronisationStore()
    const resultat = await store.synchroniser()
    expect(resultat).toEqual({ ok: true, nbFichiers: 0 })
  })

  test("premier sync (aucun SHA connu) : lit le SHA de branche avant d'écrire", async () => {
    await configurerConnexion()
    await seedProjet({
      id: 'p1',
      name: 'Projet',
      context: '',
      scope_in: '',
      scope_out: '',
      deadline: null,
      language_default: 'fr',
      client_id: null,
      sections: [],
      documents: [],
      links: [],
      statut: 'actif',
      phase: 'concept',
      owner_id: 'admin@pharmatech.example',
      shared_with: [],
      archived_at: null,
      archived_by: null,
      audit_log: [],
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    })

    fetchMock
      .mockResolvedValueOnce(reponseMock({ object: { sha: 'sha-initiale' } })) // shaBrancheActuel (première lecture)
      .mockResolvedValueOnce(reponseMock({ object: { sha: 'sha-initiale' } })) // shaBrancheActuel (vérif dans ecrireGroupe)
      .mockResolvedValueOnce(reponseMock({ tree: { sha: 'sha-arbre-base' } }))
      .mockResolvedValueOnce(reponseMock({ sha: 'sha-blob-1' }))
      .mockResolvedValueOnce(reponseMock({ sha: 'sha-nouvel-arbre' }))
      .mockResolvedValueOnce(reponseMock({ sha: 'sha-nouveau-commit' }))
      .mockResolvedValueOnce(reponseMock({ object: { sha: 'sha-nouveau-commit' } }))

    const store = useSynchronisationStore()
    const resultat = await store.synchroniser()
    expect(resultat).toEqual({ ok: true, nbFichiers: 1 })

    const etat = await db.etatSynchronisation.get('unique')
    expect(etat?.shaBrancheConnue).toBe('sha-nouveau-commit')
  })

  test('SHA déjà connu : ne relit pas le SHA de branche par avance (une vérification suffit, dans ecrireGroupe)', async () => {
    await configurerConnexion()
    await db.etatSynchronisation.put({
      id: 'unique',
      shaBrancheConnue: 'sha-connue',
      derniereSynchronisation: null,
    })
    // Une section ne peut exister que dans un projet réel (protection
    // réelle des projets/sections, 25/09/2026).
    await creerProjetDeTest(ctx, 'p1')
    await seedSection({
      id: 's1',
      project_id: 'p1',
      template_type: 'contexte_procede',
      template_engine_version: '0.1.0',
      owner_id: 'u1',
      shared_with: [],
      language: 'fr',
      status: 'brouillon_aide',
      meta: { ref: '', titre: 't', version: '0.1' },
      workflow: { authors: [], reviewers: [], approver_final: null },
      signatures: { redacteur: {}, verificateur: {}, approbateur: {} },
      revisions: [],
      values: {},
      tables: {},
      generation_source: { source_document_id: null, generated_fields: [] },
      procedure_id: null,
      asset_node_id: null,
      audit_log: [],
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    })

    fetchMock
      .mockResolvedValueOnce(reponseMock({ object: { sha: 'sha-connue' } })) // vérif dans ecrireGroupe
      .mockResolvedValueOnce(reponseMock({ tree: { sha: 'sha-arbre-base' } }))
      .mockResolvedValueOnce(reponseMock({ sha: 'sha-blob-1' }))
      .mockResolvedValueOnce(reponseMock({ sha: 'sha-blob-2' }))
      .mockResolvedValueOnce(reponseMock({ sha: 'sha-nouvel-arbre' }))
      .mockResolvedValueOnce(reponseMock({ sha: 'sha-nouveau-commit' }))
      .mockResolvedValueOnce(reponseMock({ object: { sha: 'sha-nouveau-commit' } }))

    expect((await obtenirSectionDeTest('s1'))?.id).toBe('s1')

    const store = useSynchronisationStore()
    await store.synchroniser()
    // 1 vérification de SHA en amont (jamais une seconde lecture par
    // avance) + arbre de base + 2 blobs (projet p1, section s1) + arbre +
    // commit + mise à jour de la référence.
    expect(fetchMock).toHaveBeenCalledTimes(7)
  })

  test('conflit détecté : retourne conflit=true, ne met pas à jour le SHA connu', async () => {
    await configurerConnexion()
    await db.etatSynchronisation.put({
      id: 'unique',
      shaBrancheConnue: 'sha-perimee',
      derniereSynchronisation: null,
    })
    await seedProjet({
      id: 'p1',
      name: 'x',
      context: '',
      scope_in: '',
      scope_out: '',
      deadline: null,
      language_default: 'fr',
      client_id: null,
      sections: [],
      documents: [],
      links: [],
      statut: 'actif',
      phase: 'concept',
      owner_id: 'utilisateur-local-phase1',
      shared_with: [],
      archived_at: null,
      archived_by: null,
      audit_log: [],
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    })
    fetchMock.mockResolvedValueOnce(reponseMock({ object: { sha: 'sha-a-jour-distante' } }))

    const store = useSynchronisationStore()
    const resultat = await store.synchroniser()
    expect(resultat).toEqual({ ok: false, conflit: true })
    expect((await db.etatSynchronisation.get('unique'))?.shaBrancheConnue).toBe('sha-perimee')
  })
})

describe('useSynchronisationStore — analyserConflit', () => {
  test('sans connexion configurée : aucun conflit signalé, aucun appel réseau', async () => {
    const store = useSynchronisationStore()
    const conflits = await store.analyserConflit()
    expect(conflits).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('enregistrement jamais encore poussé (404 distant) : jamais un conflit', async () => {
    await configurerConnexion()
    await seedProjet({
      id: 'p1',
      name: 'Projet local',
      context: '',
      scope_in: '',
      scope_out: '',
      deadline: null,
      language_default: 'fr',
      client_id: null,
      sections: [],
      documents: [],
      links: [],
      statut: 'actif',
      phase: 'concept',
      owner_id: 'utilisateur-local-phase1',
      shared_with: [],
      archived_at: null,
      archived_by: null,
      audit_log: [],
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    })
    fetchMock.mockResolvedValueOnce(reponseMock({}, { status: 404 }))

    const store = useSynchronisationStore()
    const conflits = await store.analyserConflit()
    expect(conflits).toEqual([])
  })

  test('champ de contenu divergent : signalé ; updated_at/audit_log seuls divergents : pas signalé', async () => {
    await configurerConnexion()
    await seedProjet({
      id: 'p1',
      name: 'Nom local',
      context: '',
      scope_in: '',
      scope_out: '',
      deadline: null,
      language_default: 'fr',
      client_id: null,
      sections: [],
      documents: [],
      links: [],
      statut: 'actif',
      phase: 'concept',
      owner_id: 'utilisateur-local-phase1',
      shared_with: [],
      archived_at: null,
      archived_by: null,
      audit_log: [{ timestamp: '2026-01-02', actor: 'u1', action: 'modification' }],
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
    })
    await seedProjet({
      id: 'p2',
      name: 'Identique',
      context: '',
      scope_in: '',
      scope_out: '',
      deadline: null,
      language_default: 'fr',
      client_id: null,
      sections: [],
      documents: [],
      links: [],
      statut: 'actif',
      phase: 'concept',
      owner_id: 'utilisateur-local-phase1',
      shared_with: [],
      archived_at: null,
      archived_by: null,
      audit_log: [],
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    })

    const distantP1 = JSON.stringify({
      id: 'p1',
      name: 'Nom distant',
      context: '',
      scope_in: '',
      scope_out: '',
      deadline: null,
      language_default: 'fr',
      client_id: null,
      sections: [],
      documents: [],
      links: [],
      statut: 'actif',
      phase: 'concept',
      owner_id: 'utilisateur-local-phase1',
      shared_with: [],
      archived_at: null,
      archived_by: null,
      audit_log: [],
      created_at: '2026-01-01',
      updated_at: '2026-01-03',
    })
    const distantP2 = JSON.stringify({
      id: 'p2',
      name: 'Identique',
      context: '',
      scope_in: '',
      scope_out: '',
      deadline: null,
      language_default: 'fr',
      client_id: null,
      sections: [],
      documents: [],
      links: [],
      statut: 'actif',
      phase: 'concept',
      owner_id: 'utilisateur-local-phase1',
      shared_with: [],
      archived_at: null,
      archived_by: null,
      audit_log: [{ timestamp: '2026-01-09', actor: 'autre', action: 'modification' }],
      created_at: '2026-01-01',
      updated_at: '2026-01-09',
    })

    fetchMock
      .mockResolvedValueOnce(reponseMock({ content: encoderBase64Utf8(distantP1) }))
      .mockResolvedValueOnce(reponseMock({ content: encoderBase64Utf8(distantP2) }))

    const store = useSynchronisationStore()
    const conflits = await store.analyserConflit()
    expect(conflits).toHaveLength(1)
    expect(conflits[0]?.id).toBe('p1')
    expect(conflits[0]?.divergences).toEqual([
      { champ: 'name', valeurLocale: 'Nom local', valeurDistante: 'Nom distant' },
    ])
  })
})

describe('useSynchronisationStore — confirmerResolutionConflits', () => {
  test('applique le choix par champ, journalise le motif structuré, puis repousse via synchroniser()', async () => {
    await configurerConnexion()
    await seedProjet({
      id: 'p1',
      name: 'Nom local',
      context: 'contexte local',
      scope_in: '',
      scope_out: '',
      deadline: null,
      language_default: 'fr',
      client_id: null,
      sections: [],
      documents: [],
      links: [],
      statut: 'actif',
      phase: 'concept',
      owner_id: 'utilisateur-local-phase1',
      shared_with: [],
      archived_at: null,
      archived_by: null,
      audit_log: [{ timestamp: '2026-01-01', actor: 'u1', action: 'création' }],
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
    })

    const distant = {
      id: 'p1',
      name: 'Nom distant',
      context: 'contexte distant',
      scope_in: '',
      scope_out: '',
      deadline: null,
      language_default: 'fr',
      client_id: null,
      sections: [],
      documents: [],
      links: [],
      statut: 'actif',
      phase: 'concept',
      owner_id: 'admin@pharmatech.example',
      shared_with: [],
      archived_at: null,
      archived_by: null,
      audit_log: [],
      created_at: '2026-01-01',
      updated_at: '2026-01-03',
    }

    const store = useSynchronisationStore()
    const conflit = {
      type: 'project' as const,
      id: 'p1',
      local: {} as Record<string, unknown>,
      distant: distant as Record<string, unknown>,
      divergences: [
        { champ: 'name', valeurLocale: 'Nom local', valeurDistante: 'Nom distant' },
        { champ: 'context', valeurLocale: 'contexte local', valeurDistante: 'contexte distant' },
      ],
    }

    fetchMock
      .mockResolvedValueOnce(reponseMock({ object: { sha: 'sha-post-resolution' } })) // shaBrancheActuel avant réenregistrement
      .mockResolvedValueOnce(reponseMock({ object: { sha: 'sha-post-resolution' } })) // vérif dans ecrireGroupe (synchroniser)
      .mockResolvedValueOnce(reponseMock({ tree: { sha: 'sha-arbre-base' } }))
      .mockResolvedValueOnce(reponseMock({ sha: 'sha-blob-1' }))
      .mockResolvedValueOnce(reponseMock({ sha: 'sha-nouvel-arbre' }))
      .mockResolvedValueOnce(reponseMock({ sha: 'sha-nouveau-commit' }))
      .mockResolvedValueOnce(reponseMock({ object: { sha: 'sha-nouveau-commit' } }))

    const resultat = await store.confirmerResolutionConflits([
      {
        conflit,
        choix: [
          { champ: 'name', choix: 'locale' },
          { champ: 'context', choix: 'distante' },
        ],
      },
    ])

    expect(resultat).toEqual({ ok: true, nbFichiers: 1 })

    const fusionne = await obtenirProjetDeTest('p1')
    expect(fusionne?.name).toBe('Nom local')
    expect(fusionne?.context).toBe('contexte distant')
    expect(fusionne?.audit_log.at(-1)?.action).toBe(
      'Résolution de conflit — name: version locale ; context: version distante',
    )

    const etat = await db.etatSynchronisation.get('unique')
    expect(etat?.shaBrancheConnue).toBe('sha-nouveau-commit')
  })
})

describe('useSynchronisationStore — recupererDepuisGitHub', () => {
  test('filtre aux chemins data/projects et data/sections, ignore le reste', async () => {
    await configurerConnexion()
    const projetJson = JSON.stringify({
      id: 'p1',
      name: 'Récupéré',
      context: '',
      scope_in: '',
      scope_out: '',
      deadline: null,
      language_default: 'fr',
      client_id: null,
      sections: [],
      documents: [],
      links: [],
      statut: 'actif',
      phase: 'concept',
      owner_id: 'admin@pharmatech.example',
      shared_with: [],
      archived_at: null,
      archived_by: null,
      audit_log: [],
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    })

    fetchMock
      .mockResolvedValueOnce(
        reponseMock({
          tree: [
            { path: 'data/projects/p1.json', type: 'blob', sha: 'sha-p1' },
            { path: 'README.md', type: 'blob', sha: 'sha-readme' },
          ],
        }),
      )
      .mockResolvedValueOnce(reponseMock({ content: encoderBase64Utf8(projetJson) }))
      .mockResolvedValueOnce(reponseMock({ object: { sha: 'sha-post-pull' } }))

    const store = useSynchronisationStore()
    const resultat = await store.recupererDepuisGitHub()
    expect(resultat).toEqual({ ok: true, nbFichiers: 1 })

    const projetEnBase = await obtenirProjetDeTest('p1')
    expect(projetEnBase?.name).toBe('Récupéré')
    expect((await db.etatSynchronisation.get('unique'))?.shaBrancheConnue).toBe('sha-post-pull')
  })
})
