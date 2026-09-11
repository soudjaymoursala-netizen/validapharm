import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import { useConnexionRelaisIAStore } from './useConnexionRelaisIAStore'

let demonter: () => void

beforeEach(async () => {
  setActivePinia(createPinia())
  await reinitialiserAuthDeTest()
  demonter = installerFauxWorkerAuth().demonter
  await connecterAdminDeTest()
})

afterEach(() => {
  demonter()
})

describe('useConnexionRelaisIAStore', () => {
  test('enregistre et relit la configuration', async () => {
    const store = useConnexionRelaisIAStore()
    const resultat = await store.enregistrer({
      relayUrl: 'https://relais.workers.dev',
      jeton: 'jeton-x',
    })
    expect(resultat).toEqual({ ok: true })
    expect(store.connexion).toEqual({
      relayUrl: 'https://relais.workers.dev',
      jeton: 'jeton-x',
    })

    const autreVue = useConnexionRelaisIAStore()
    await autreVue.charger()
    expect(autreVue.connexion).toEqual(store.connexion)
  })

  test('effacer supprime la configuration stockée', async () => {
    const store = useConnexionRelaisIAStore()
    await store.enregistrer({ relayUrl: 'https://relais.workers.dev', jeton: 'x' })
    await store.effacer()
    expect(store.connexion).toBeNull()

    const autreVue = useConnexionRelaisIAStore()
    await autreVue.charger()
    expect(autreVue.connexion).toBeNull()
  })

  test('charger sans configuration existante : connexion null', async () => {
    const store = useConnexionRelaisIAStore()
    await store.charger()
    expect(store.connexion).toBeNull()
  })

  test('testerConnexion sans configuration enregistrée -> message clair, jamais de fetch au relais', async () => {
    const store = useConnexionRelaisIAStore()
    const resultat = await store.testerConnexion()
    expect(resultat).toEqual({ ok: false, message: 'Aucune configuration enregistrée.' })
  })

  test('testerConnexion : relais joignable et jeton valide -> ok (jamais un appel au fournisseur IA)', async () => {
    const store = useConnexionRelaisIAStore()
    await store.enregistrer({ relayUrl: 'https://relais-ia-test.workers.dev', jeton: 'jeton-x' })

    const fetchWorkerAuth = globalThis.fetch
    const fetchRelaisIA = vi.fn(
      async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    )
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url =
          typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
        if (url.startsWith('https://relais-ia-test.workers.dev')) return fetchRelaisIA()
        return fetchWorkerAuth(input, init)
      }),
    )

    const resultat = await store.testerConnexion()
    expect(resultat).toEqual({ ok: true })
    expect(fetchRelaisIA).toHaveBeenCalledTimes(1)
  })

  test('testerConnexion : jeton invalide (401) -> message explicite', async () => {
    const store = useConnexionRelaisIAStore()
    await store.enregistrer({ relayUrl: 'https://relais-ia-test.workers.dev', jeton: 'mauvais' })

    const fetchWorkerAuth = globalThis.fetch
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url =
          typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
        if (url.startsWith('https://relais-ia-test.workers.dev')) {
          return new Response(JSON.stringify({ erreur: 'jeton_invalide' }), { status: 401 })
        }
        return fetchWorkerAuth(input, init)
      }),
    )

    const resultat = await store.testerConnexion()
    expect(resultat.ok).toBe(false)
    expect(resultat).toMatchObject({ message: expect.stringContaining('Jeton invalide') })
  })
})
