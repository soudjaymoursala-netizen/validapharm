import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  IndisponibleError,
  QuotaExceededError,
  ReponseInvalideError,
  TimeoutError,
} from './erreurs'
import { OcrRelayAdapter } from './OcrRelayAdapter'

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

function adaptateur(): OcrRelayAdapter {
  return new OcrRelayAdapter({ relayUrl: 'https://ocr-relais.workers.dev' })
}

describe('OcrRelayAdapter', () => {
  test('appel nominal : transmet le Content-Type et le corps image, extrait la réponse', async () => {
    fetchMock.mockResolvedValueOnce(
      reponseMock({
        texte: 'Texte extrait',
        fournisseur: 'azure_ai_vision',
        version_moteur: '3.2.0',
      }),
    )
    const image = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' })
    const resultat = await adaptateur().extraireTexte(image, 'image/png')
    expect(resultat).toEqual({
      texte: 'Texte extrait',
      fournisseur: 'azure_ai_vision',
      version_moteur: '3.2.0',
    })

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://ocr-relais.workers.dev')
    expect((options.headers as Record<string, string>)['Content-Type']).toBe('image/png')
  })

  test('fournisseur/version_moteur absents de la réponse -> valeurs par défaut sûres', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({ texte: 'x' }))
    const resultat = await adaptateur().extraireTexte(new Blob(['x']), 'image/png')
    expect(resultat).toEqual({ texte: 'x', fournisseur: 'inconnu', version_moteur: null })
  })

  test('429 -> QuotaExceededError', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({}, { status: 429 }))
    await expect(adaptateur().extraireTexte(new Blob(['x']), 'image/png')).rejects.toBeInstanceOf(
      QuotaExceededError,
    )
  })

  test('5xx -> IndisponibleError', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({}, { status: 503 }))
    await expect(adaptateur().extraireTexte(new Blob(['x']), 'image/png')).rejects.toBeInstanceOf(
      IndisponibleError,
    )
  })

  test('statut non prévu -> ReponseInvalideError', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({}, { status: 400 }))
    await expect(adaptateur().extraireTexte(new Blob(['x']), 'image/png')).rejects.toBeInstanceOf(
      ReponseInvalideError,
    )
  })

  test('corps de réponse sans champ "texte" -> ReponseInvalideError', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({ autre_chose: 1 }))
    await expect(adaptateur().extraireTexte(new Blob(['x']), 'image/png')).rejects.toBeInstanceOf(
      ReponseInvalideError,
    )
  })

  test('JSON illisible -> ReponseInvalideError', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('invalide')
      },
    } as unknown as Response)
    await expect(adaptateur().extraireTexte(new Blob(['x']), 'image/png')).rejects.toBeInstanceOf(
      ReponseInvalideError,
    )
  })

  test('abandon réseau (timeout) -> TimeoutError', async () => {
    const erreurAbort = new Error('aborted')
    erreurAbort.name = 'AbortError'
    fetchMock.mockRejectedValueOnce(erreurAbort)
    await expect(adaptateur().extraireTexte(new Blob(['x']), 'image/png')).rejects.toBeInstanceOf(
      TimeoutError,
    )
  })

  test('échec réseau générique -> IndisponibleError', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(adaptateur().extraireTexte(new Blob(['x']), 'image/png')).rejects.toBeInstanceOf(
      IndisponibleError,
    )
  })
})
