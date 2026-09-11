import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { db } from '../../persistance/db'
import { useConnexionAuthentificationStore } from './useConnexionAuthentificationStore'

function reponseMock(corps: unknown, options: { status?: number } = {}): Response {
  const status = options.status ?? 200
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => corps,
  } as Response
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.connexionAuthentification.clear()
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useConnexionAuthentificationStore', () => {
  test('enregistre et relit la configuration (IndexedDB, avant toute session)', async () => {
    const store = useConnexionAuthentificationStore()
    await store.enregistrer({ relayUrl: 'https://auth.exemple.workers.dev/' })
    expect(store.connexion).toEqual({
      id: 'unique',
      relayUrl: 'https://auth.exemple.workers.dev',
    })

    const autreVue = useConnexionAuthentificationStore()
    await autreVue.charger()
    expect(autreVue.connexion).toEqual(store.connexion)
  })

  test('testerConnexion sans configuration enregistrée -> message clair, jamais de fetch', async () => {
    const store = useConnexionAuthentificationStore()
    const resultat = await store.testerConnexion()
    expect(resultat).toEqual({ ok: false, message: 'Aucune configuration enregistrée.' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('testerConnexion : Worker joignable -> ok, jamais une authentification', async () => {
    const store = useConnexionAuthentificationStore()
    await store.enregistrer({ relayUrl: 'https://auth.exemple.workers.dev' })
    fetchMock.mockResolvedValueOnce(reponseMock({ ok: true }))

    const resultat = await store.testerConnexion()
    expect(resultat).toEqual({ ok: true })

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://auth.exemple.workers.dev/sante')
    expect((options.headers as Record<string, string> | undefined)?.Authorization).toBeUndefined()
  })

  test('testerConnexion : Worker injoignable -> message explicite', async () => {
    const store = useConnexionAuthentificationStore()
    await store.enregistrer({ relayUrl: 'https://auth.exemple.workers.dev' })
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const resultat = await store.testerConnexion()
    expect(resultat.ok).toBe(false)
    expect((resultat as { ok: false; message: string }).message).toBeTruthy()
  })
})
