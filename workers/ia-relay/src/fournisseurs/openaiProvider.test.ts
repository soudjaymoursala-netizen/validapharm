import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { OpenaiProvider } from './openaiProvider'
import { ErreurFournisseurIA } from './FournisseurIA'

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function provider(): OpenaiProvider {
  return new OpenaiProvider({ cleApi: 'cle-secrete', endpoint: 'https://api.exemple.openai.com' })
}

describe('OpenaiProvider — appel nominal', () => {
  test('envoie Authorization Bearer/model/messages système+utilisateur, extrait texte et version', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Réponse ChatGPT.' } }],
        model: 'gpt-4o-2026-08-01',
      }),
    } as Response)

    const resultat = await provider().envoyerMessage('Système.', 'Question.', 'gpt-4o')

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.exemple.openai.com/v1/chat/completions')
    const entetes = options.headers as Record<string, string>
    expect(entetes['Authorization']).toBe('Bearer cle-secrete')
    const corps = JSON.parse(options.body as string) as Record<string, unknown>
    expect(corps.model).toBe('gpt-4o')
    expect(corps.messages).toEqual([
      { role: 'system', content: 'Système.' },
      { role: 'user', content: 'Question.' },
    ])

    expect(resultat.texte).toBe('Réponse ChatGPT.')
    expect(resultat.version_moteur).toBe('gpt-4o-2026-08-01')
  })

  test('champ model absent -> version_moteur null', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Réponse.' } }] }),
    } as Response)

    const resultat = await provider().envoyerMessage('Système.', 'Question.', 'gpt-4o')
    expect(resultat.version_moteur).toBeNull()
  })
})

describe("OpenaiProvider — gestion d'erreur", () => {
  test('statut 429 -> ErreurFournisseurIA avec statutHttp 429 (quota, jamais une indisponibilité générique)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: { type: 'rate_limit_exceeded', message: 'Rate limited.' } }),
    } as Response)

    await expect(
      provider().envoyerMessage('Système.', 'Question.', 'gpt-4o'),
    ).rejects.toMatchObject({ statutHttp: 429 })
  })

  test('statut 401 (clé invalide) -> ErreurFournisseurIA avec statutHttp 401', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: { type: 'invalid_request_error', message: 'Invalid key.' } }),
    } as Response)

    await expect(
      provider().envoyerMessage('Système.', 'Question.', 'gpt-4o'),
    ).rejects.toBeInstanceOf(ErreurFournisseurIA)
  })

  test('échec réseau (fetch rejette) -> ErreurFournisseurIA avec statutHttp null', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'))

    await expect(
      provider().envoyerMessage('Système.', 'Question.', 'gpt-4o'),
    ).rejects.toMatchObject({ statutHttp: null })
  })

  test('réponse 200 sans contenu -> erreur explicite, jamais un texte vide silencieux', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [] }),
    } as Response)

    await expect(provider().envoyerMessage('Système.', 'Question.', 'gpt-4o')).rejects.toThrow(
      /sans contenu textuel/,
    )
  })
})
