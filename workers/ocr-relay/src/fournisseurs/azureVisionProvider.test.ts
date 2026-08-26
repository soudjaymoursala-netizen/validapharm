import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { AzureVisionProvider } from './azureVisionProvider'

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  vi.useFakeTimers()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

function provider(): AzureVisionProvider {
  return new AzureVisionProvider({
    endpoint: 'https://exemple.cognitiveservices.azure.com',
    cleAbonnement: 'cle-secrete',
    delaiSondageMs: 1,
  })
}

describe('AzureVisionProvider — soumission (202 + Operation-Location)', () => {
  test("soumet les octets bruts avec la clé d'abonnement et le Content-Type transmis", async () => {
    fetchMock
      .mockResolvedValueOnce({
        status: 202,
        headers: new Headers({ 'Operation-Location': 'https://exemple/op/123' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'succeeded',
          analyzeResult: { version: '3.2.0', readResults: [{ lines: [{ text: 'Ligne 1' }] }] },
        }),
      } as Response)

    const resultat = await provider().extraireTexte(new ArrayBuffer(4), 'image/png')

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://exemple.cognitiveservices.azure.com/vision/v3.2/read/analyze')
    expect((options.headers as Record<string, string>)['Ocp-Apim-Subscription-Key']).toBe(
      'cle-secrete',
    )
    expect((options.headers as Record<string, string>)['Content-Type']).toBe('image/png')
    expect(resultat.texte).toBe('Ligne 1')
    expect(resultat.fournisseur).toBe('azure_ai_vision')
    expect(resultat.version_moteur).toBe('3.2.0')
  })

  test('statut de soumission différent de 202 -> erreur explicite', async () => {
    fetchMock.mockResolvedValueOnce({ status: 401, headers: new Headers() } as Response)
    await expect(provider().extraireTexte(new ArrayBuffer(4), 'image/png')).rejects.toThrow(
      /refusée/,
    )
  })

  test('202 sans en-tête Operation-Location -> erreur explicite', async () => {
    fetchMock.mockResolvedValueOnce({ status: 202, headers: new Headers() } as Response)
    await expect(provider().extraireTexte(new ArrayBuffer(4), 'image/png')).rejects.toThrow(
      /Operation-Location/,
    )
  })
})

describe("AzureVisionProvider — sondage (poll jusqu'à succeeded/failed)", () => {
  test('plusieurs tours "running" avant "succeeded" -> texte extrait correctement', async () => {
    fetchMock
      .mockResolvedValueOnce({
        status: 202,
        headers: new Headers({ 'Operation-Location': 'https://exemple/op/123' }),
      } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'running' }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'running' }) } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'succeeded',
          analyzeResult: {
            version: '3.2.0',
            readResults: [{ lines: [{ text: 'Page 1 ligne 1' }] }, { lines: [{ text: 'Page 2' }] }],
          },
        }),
      } as Response)

    const promesse = provider().extraireTexte(new ArrayBuffer(4), 'image/png')
    await vi.runAllTimersAsync()
    const resultat = await promesse

    expect(resultat.texte).toBe('Page 1 ligne 1\nPage 2')
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  test('statut "failed" -> erreur explicite, jamais un texte vide silencieux', async () => {
    fetchMock
      .mockResolvedValueOnce({
        status: 202,
        headers: new Headers({ 'Operation-Location': 'https://exemple/op/123' }),
      } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'failed' }) } as Response)

    await expect(provider().extraireTexte(new ArrayBuffer(4), 'image/png')).rejects.toThrow(/échec/)
  })

  test('nombre de sondages max dépassé -> erreur explicite, jamais une boucle infinie', async () => {
    fetchMock.mockResolvedValueOnce({
      status: 202,
      headers: new Headers({ 'Operation-Location': 'https://exemple/op/123' }),
    } as Response)
    for (let i = 0; i < 15; i++) {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'running' }),
      } as Response)
    }

    const providerAvecPeuDeSondages = new AzureVisionProvider({
      endpoint: 'https://exemple.cognitiveservices.azure.com',
      cleAbonnement: 'cle-secrete',
      nombreSondagesMax: 3,
      delaiSondageMs: 1,
    })
    const promesse = providerAvecPeuDeSondages.extraireTexte(new ArrayBuffer(4), 'image/png')
    // L'assertion attache un handler de rejet avant que les minuteurs ne
    // soient exécutés, pour ne jamais laisser la promesse se rejeter sans
    // handler déjà attaché (éviterait un avertissement de rejet non géré).
    const assertion = expect(promesse).rejects.toThrow(/non conclue/)
    await vi.runAllTimersAsync()
    await assertion
  })
})
