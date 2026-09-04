import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { AuthApiClient } from './AuthApiClient'
import { IndisponibleAuthError, ReponseInvalideAuthError, TimeoutAuthError } from './erreurs'

function reponseMock(corps: unknown, options: { status?: number } = {}): Response {
  const status = options.status ?? 200
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => corps,
  } as Response
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function client(): AuthApiClient {
  return new AuthApiClient('https://auth.exemple.workers.dev')
}

describe('AuthApiClient — login', () => {
  test('appel nominal : POST /auth/login, extrait jeton/utilisateur', async () => {
    fetchMock.mockResolvedValueOnce(
      reponseMock({
        jeton: 'jwt-xyz',
        utilisateur: { id: 'u1', email: 'q@example.com', role: 'admin' },
      }),
    )
    const resultat = await client().login('q@example.com', 'CoffreFort!2026')
    expect(resultat).toEqual({
      ok: true,
      donnees: {
        jeton: 'jwt-xyz',
        utilisateur: { id: 'u1', email: 'q@example.com', role: 'admin' },
      },
    })

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://auth.exemple.workers.dev/auth/login')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body as string)).toEqual({
      email: 'q@example.com',
      motDePasse: 'CoffreFort!2026',
    })
  })

  test('identifiants invalides -> résultat typé { ok: false }, jamais une exception', async () => {
    fetchMock.mockResolvedValueOnce(
      reponseMock({ erreur: 'identifiants_invalides' }, { status: 401 }),
    )
    const resultat = await client().login('q@example.com', 'mauvais')
    expect(resultat).toEqual({ ok: false, erreur: 'identifiants_invalides', status: 401 })
  })
})

describe('AuthApiClient — jeton en Authorization', () => {
  test('me() transmet le jeton en en-tête Authorization Bearer', async () => {
    fetchMock.mockResolvedValueOnce(
      reponseMock({ utilisateur: { id: 'u1', email: 'q@example.com', role: 'admin' } }),
    )
    await client().me('jwt-xyz')
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect((options.headers as Record<string, string>).Authorization).toBe('Bearer jwt-xyz')
  })
})

describe('AuthApiClient — échecs de connectivité (jamais un résultat typé)', () => {
  test('timeout -> TimeoutAuthError', async () => {
    fetchMock.mockImplementationOnce(() => {
      const erreur = new Error('aborted')
      erreur.name = 'AbortError'
      return Promise.reject(erreur)
    })
    await expect(client().login('q@example.com', 'x')).rejects.toBeInstanceOf(TimeoutAuthError)
  })

  test('échec réseau -> IndisponibleAuthError', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'))
    await expect(client().login('q@example.com', 'x')).rejects.toBeInstanceOf(IndisponibleAuthError)
  })

  test('erreur serveur 500 -> IndisponibleAuthError', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({ erreur: 'panne' }, { status: 500 }))
    await expect(client().login('q@example.com', 'x')).rejects.toBeInstanceOf(IndisponibleAuthError)
  })

  test('réponse JSON illisible -> ReponseInvalideAuthError', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('pas du JSON')
      },
    } as unknown as Response)
    await expect(client().login('q@example.com', 'x')).rejects.toBeInstanceOf(
      ReponseInvalideAuthError,
    )
  })
})

describe('AuthApiClient — clients', () => {
  test('creerClient POST /clients avec le corps attendu', async () => {
    fetchMock.mockResolvedValueOnce(
      reponseMock({ client: { id: 'c1', name: 'Client A' } }, { status: 201 }),
    )
    const resultat = await client().creerClient('jwt-xyz', {
      name: 'Client A',
      secteur: 'pharmaceutique',
    })
    expect(resultat.ok).toBe(true)

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://auth.exemple.workers.dev/clients')
    expect(JSON.parse(options.body as string)).toEqual({
      name: 'Client A',
      secteur: 'pharmaceutique',
    })
  })

  test('supprimerClientDefinitivement DELETE /clients/:id avec la justification', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({ ok: true }))
    const resultat = await client().supprimerClientDefinitivement('jwt-xyz', 'c1', 'Nettoyage test')
    expect(resultat).toEqual({ ok: true, donnees: { ok: true } })

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://auth.exemple.workers.dev/clients/c1')
    expect(options.method).toBe('DELETE')
    expect(JSON.parse(options.body as string)).toEqual({ justification: 'Nettoyage test' })
  })
})
