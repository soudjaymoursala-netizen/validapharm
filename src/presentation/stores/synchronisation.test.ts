import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { db } from '../../persistance/db'
import { useSynchronisationStore } from './useSynchronisationStore'

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

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.connexionGitHub.clear()
  await db.etatSynchronisation.clear()
  await db.projects.clear()
  await db.sections.clear()
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function configurerConnexion(): Promise<void> {
  await db.connexionGitHub.put({
    id: 'unique',
    owner: 'acme',
    repo: 'data',
    branche: 'main',
    jeton: 'x',
  })
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
    await db.projects.put({
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
    await db.sections.put({
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
      audit_log: [],
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    })

    fetchMock
      .mockResolvedValueOnce(reponseMock({ object: { sha: 'sha-connue' } })) // vérif dans ecrireGroupe
      .mockResolvedValueOnce(reponseMock({ tree: { sha: 'sha-arbre-base' } }))
      .mockResolvedValueOnce(reponseMock({ sha: 'sha-blob-1' }))
      .mockResolvedValueOnce(reponseMock({ sha: 'sha-nouvel-arbre' }))
      .mockResolvedValueOnce(reponseMock({ sha: 'sha-nouveau-commit' }))
      .mockResolvedValueOnce(reponseMock({ object: { sha: 'sha-nouveau-commit' } }))

    const store = useSynchronisationStore()
    await store.synchroniser()
    expect(fetchMock).toHaveBeenCalledTimes(6)
  })

  test('conflit détecté : retourne conflit=true, ne met pas à jour le SHA connu', async () => {
    await configurerConnexion()
    await db.etatSynchronisation.put({
      id: 'unique',
      shaBrancheConnue: 'sha-perimee',
      derniereSynchronisation: null,
    })
    await db.projects.put({
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

describe('useSynchronisationStore — recupererDepuisGitHub', () => {
  test('filtre aux chemins data/projects et data/sections, ignore le reste', async () => {
    await configurerConnexion()
    const projetJson = JSON.stringify({ id: 'p1', name: 'Récupéré' })

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

    const projetEnBase = await db.projects.get('p1')
    expect(projetEnBase?.name).toBe('Récupéré')
    expect((await db.etatSynchronisation.get('unique'))?.shaBrancheConnue).toBe('sha-post-pull')
  })
})
