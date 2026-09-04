import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { IndisponibleError, ReponseInvalideError, TimeoutError } from './erreurs'
import { OllamaProviderAdapter } from './OllamaProviderAdapter'

function reponseMock(corps: unknown, options: { status?: number } = {}): Response {
  const status = options.status ?? 200
  return { ok: status >= 200 && status < 300, status, json: async () => corps } as Response
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function adaptateur(): OllamaProviderAdapter {
  return new OllamaProviderAdapter({ modele: 'llama3' })
}

describe('OllamaProviderAdapter', () => {
  test('nomAffiche/estCloud identifient clairement le repli local', () => {
    const a = adaptateur()
    expect(a.estCloud).toBe(false)
    expect(a.nomAffiche).toContain('local')
  })

  test('appel nominal : construit le prompt, appelle localhost:11434 par défaut', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({ response: 'Réponse locale' }))
    const resultat = await adaptateur().envoyerMessage(
      'chat_normatif',
      { contenu_joint: false },
      'Question ?',
    )
    expect(resultat).toEqual({ texte: 'Réponse locale', version_moteur: 'llama3', citations: [] })

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:11434/api/generate')
    const corps = JSON.parse(options.body as string) as { model: string; prompt: string }
    expect(corps.model).toBe('llama3')
    expect(corps.prompt).toBe('Question ?')
  })

  test('contenu_joint: true -> le contenu est ajouté au prompt', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({ response: 'x' }))
    await adaptateur().envoyerMessage(
      'chat_normatif',
      { contenu_joint: true, contenu: 'Corps de la section', titre_document: 'Titre' },
      'Question ?',
    )
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    const corps = JSON.parse(options.body as string) as { prompt: string }
    expect(corps.prompt).toContain('Question ?')
    expect(corps.prompt).toContain('Corps de la section')
  })

  test('serveur Ollama non joignable (cas nominal de ce garde-fou) -> IndisponibleError', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(
      adaptateur().envoyerMessage('chat_normatif', { contenu_joint: false }, 'Q'),
    ).rejects.toBeInstanceOf(IndisponibleError)
  })

  test('statut HTTP non ok -> IndisponibleError', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({}, { status: 500 }))
    await expect(
      adaptateur().envoyerMessage('chat_normatif', { contenu_joint: false }, 'Q'),
    ).rejects.toBeInstanceOf(IndisponibleError)
  })

  test('réponse sans champ "response" -> ReponseInvalideError', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({ autre: 1 }))
    await expect(
      adaptateur().envoyerMessage('chat_normatif', { contenu_joint: false }, 'Q'),
    ).rejects.toBeInstanceOf(ReponseInvalideError)
  })

  test('abandon réseau (timeout) -> TimeoutError', async () => {
    const erreurAbort = new Error('aborted')
    erreurAbort.name = 'AbortError'
    fetchMock.mockRejectedValueOnce(erreurAbort)
    await expect(
      adaptateur().envoyerMessage('chat_normatif', { contenu_joint: false }, 'Q'),
    ).rejects.toBeInstanceOf(TimeoutError)
  })

  test('URL configurée personnalisée respectée', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({ response: 'x' }))
    const a = new OllamaProviderAdapter({ modele: 'llama3', url: 'http://192.168.1.10:11434' })
    await a.envoyerMessage('chat_normatif', { contenu_joint: false }, 'Q')
    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toBe('http://192.168.1.10:11434/api/generate')
  })
})
