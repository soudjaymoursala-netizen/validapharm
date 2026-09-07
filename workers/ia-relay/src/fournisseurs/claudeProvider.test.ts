import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { ClaudeProvider } from './claudeProvider'
import { ErreurFournisseurIA } from './FournisseurIA'

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function provider(): ClaudeProvider {
  return new ClaudeProvider({
    cleApi: 'cle-secrete',
    endpoint: 'https://api.exemple.anthropic.com',
  })
}

describe('ClaudeProvider — appel nominal', () => {
  test('envoie x-api-key/anthropic-version/model/system/messages, extrait texte et version', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'Réponse Claude.' }],
        model: 'claude-sonnet-5-20260901',
      }),
    } as Response)

    const resultat = await provider().envoyerMessage('Système.', 'Question.', 'claude-sonnet-5')

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.exemple.anthropic.com/v1/messages')
    const entetes = options.headers as Record<string, string>
    expect(entetes['x-api-key']).toBe('cle-secrete')
    expect(entetes['anthropic-version']).toBe('2023-06-01')
    const corps = JSON.parse(options.body as string) as Record<string, unknown>
    expect(corps.model).toBe('claude-sonnet-5')
    expect(corps.system).toBe('Système.')
    expect(corps.messages).toEqual([{ role: 'user', content: 'Question.' }])

    expect(resultat.texte).toBe('Réponse Claude.')
    expect(resultat.version_moteur).toBe('claude-sonnet-5-20260901')
  })

  test('plusieurs blocs de texte -> concaténés', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [
          { type: 'text', text: 'Première partie. ' },
          { type: 'text', text: 'Seconde partie.' },
        ],
      }),
    } as Response)

    const resultat = await provider().envoyerMessage('Système.', 'Question.', 'claude-sonnet-5')
    expect(resultat.texte).toBe('Première partie. Seconde partie.')
    expect(resultat.version_moteur).toBeNull()
  })
})

describe("ClaudeProvider — gestion d'erreur", () => {
  test('statut 429 -> ErreurFournisseurIA avec statutHttp 429 (quota, jamais une indisponibilité générique)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: { type: 'rate_limit_error', message: 'Rate limited.' } }),
    } as Response)

    await expect(
      provider().envoyerMessage('Système.', 'Question.', 'claude-sonnet-5'),
    ).rejects.toMatchObject({ statutHttp: 429 })
  })

  test('statut 401 (clé invalide) -> ErreurFournisseurIA avec statutHttp 401', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: { type: 'authentication_error', message: 'Invalid key.' } }),
    } as Response)

    await expect(
      provider().envoyerMessage('Système.', 'Question.', 'claude-sonnet-5'),
    ).rejects.toBeInstanceOf(ErreurFournisseurIA)
  })

  test('échec réseau (fetch rejette) -> ErreurFournisseurIA avec statutHttp null', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'))

    await expect(
      provider().envoyerMessage('Système.', 'Question.', 'claude-sonnet-5'),
    ).rejects.toMatchObject({ statutHttp: null })
  })

  test('réponse 200 sans bloc texte -> erreur explicite, jamais un texte vide silencieux', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: [] }),
    } as Response)

    await expect(
      provider().envoyerMessage('Système.', 'Question.', 'claude-sonnet-5'),
    ).rejects.toThrow(/sans contenu textuel/)
  })
})
