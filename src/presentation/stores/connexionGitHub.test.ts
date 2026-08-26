import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { db } from '../../persistance/db'
import { useConnexionGitHubStore } from './useConnexionGitHubStore'

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.connexionGitHub.clear()
})

describe('useConnexionGitHubStore — enregistrer/charger', () => {
  test('enregistre et relit la configuration, branche par défaut à "main"', async () => {
    const store = useConnexionGitHubStore()
    await store.enregistrer({
      owner: 'acme',
      repo: 'validapharm-data',
      branche: '',
      jeton: 'ghp_xxx',
    })
    expect(store.connexion).toEqual({
      id: 'unique',
      owner: 'acme',
      repo: 'validapharm-data',
      branche: 'main',
      jeton: 'ghp_xxx',
    })

    const autreVue = useConnexionGitHubStore()
    await autreVue.charger()
    expect(autreVue.connexion).toEqual(store.connexion)
  })

  test('effacer supprime la configuration stockée', async () => {
    const store = useConnexionGitHubStore()
    await store.enregistrer({ owner: 'acme', repo: 'data', branche: 'main', jeton: 'x' })
    await store.effacer()
    expect(store.connexion).toBeNull()
    expect(await db.connexionGitHub.get('unique')).toBeUndefined()
  })
})

describe('useConnexionGitHubStore — testerConnexion', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('sans configuration enregistrée : échec explicite sans appel réseau', async () => {
    const store = useConnexionGitHubStore()
    const resultat = await store.testerConnexion()
    expect(resultat).toEqual({ ok: false, message: 'Aucune configuration enregistrée.' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test("configuration valide : appelle réellement l'API et retourne le SHA de branche", async () => {
    const store = useConnexionGitHubStore()
    await store.enregistrer({ owner: 'acme', repo: 'data', branche: 'main', jeton: 'x' })
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({ object: { sha: 'sha-actuel' } }),
    })

    const resultat = await store.testerConnexion()
    expect(resultat).toEqual({ ok: true, shaBranche: 'sha-actuel' })
  })

  test('jeton invalide : retourne un échec explicite, jamais le jeton dans le message', async () => {
    const store = useConnexionGitHubStore()
    await store.enregistrer({ owner: 'acme', repo: 'data', branche: 'main', jeton: 'jeton-secret' })
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: { get: () => null },
      json: async () => ({}),
    })

    const resultat = await store.testerConnexion()
    expect(resultat.ok).toBe(false)
    expect(JSON.stringify(resultat)).not.toContain('jeton-secret')
  })
})
