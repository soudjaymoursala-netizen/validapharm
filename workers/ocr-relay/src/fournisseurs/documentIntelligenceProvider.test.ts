import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { DocumentIntelligenceProvider } from './documentIntelligenceProvider'

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

function provider(): DocumentIntelligenceProvider {
  return new DocumentIntelligenceProvider({
    endpoint: 'https://exemple.cognitiveservices.azure.com',
    cleAbonnement: 'cle-secrete',
    delaiSondageMs: 1,
  })
}

describe('DocumentIntelligenceProvider — soumission (202 + Operation-Location)', () => {
  test("soumet les octets bruts avec la clé d'abonnement et le Content-Type transmis, vers le modèle prebuilt-layout", async () => {
    fetchMock
      .mockResolvedValueOnce({
        status: 202,
        headers: new Headers({ 'Operation-Location': 'https://exemple/op/123' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'succeeded',
          analyzeResult: { apiVersion: '2024-11-30', content: 'Texte extrait.', tables: [] },
        }),
      } as Response)

    const resultat = await provider().extraireTexte(new ArrayBuffer(4), 'image/png')

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(
      'https://exemple.cognitiveservices.azure.com/documentintelligence/documentModels/prebuilt-layout:analyze?api-version=2024-11-30',
    )
    expect((options.headers as Record<string, string>)['Ocp-Apim-Subscription-Key']).toBe(
      'cle-secrete',
    )
    expect(resultat.texte).toBe('Texte extrait.')
    expect(resultat.fournisseur).toBe('azure_document_intelligence')
    expect(resultat.version_moteur).toBe('2024-11-30')
    expect(resultat.tableaux).toEqual([])
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

describe('DocumentIntelligenceProvider — reconstruction de tableau (Phase 22, TD-020)', () => {
  test('reconstruit une grille dense à partir de la liste plate de cellules Azure', async () => {
    fetchMock
      .mockResolvedValueOnce({
        status: 202,
        headers: new Headers({ 'Operation-Location': 'https://exemple/op/123' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'succeeded',
          analyzeResult: {
            apiVersion: '2024-11-30',
            content: '1 | Connect the cable.\n2 | Turn the switch on.',
            tables: [
              {
                rowCount: 2,
                columnCount: 2,
                cells: [
                  { rowIndex: 0, columnIndex: 0, content: '1' },
                  { rowIndex: 0, columnIndex: 1, content: 'Connect the cable.' },
                  { rowIndex: 1, columnIndex: 0, content: '2' },
                  { rowIndex: 1, columnIndex: 1, content: 'Turn the switch on.' },
                ],
              },
            ],
          },
        }),
      } as Response)

    const resultat = await provider().extraireTexte(new ArrayBuffer(4), 'application/pdf')

    expect(resultat.tableaux).toEqual([
      {
        lignes: [
          ['1', 'Connect the cable.'],
          ['2', 'Turn the switch on.'],
        ],
      },
    ])
  })

  test('une cellule absente de la réponse Azure (fusion) reste une chaîne vide, jamais un contenu deviné', async () => {
    fetchMock
      .mockResolvedValueOnce({
        status: 202,
        headers: new Headers({ 'Operation-Location': 'https://exemple/op/123' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'succeeded',
          analyzeResult: {
            tables: [
              {
                rowCount: 1,
                columnCount: 2,
                cells: [{ rowIndex: 0, columnIndex: 0, content: 'Seule cellule renvoyée' }],
              },
            ],
          },
        }),
      } as Response)

    const resultat = await provider().extraireTexte(new ArrayBuffer(4), 'image/png')

    expect(resultat.tableaux).toEqual([{ lignes: [['Seule cellule renvoyée', '']] }])
  })

  test('aucun tableau dans la réponse -> tableau vide, jamais fabriqué', async () => {
    fetchMock
      .mockResolvedValueOnce({
        status: 202,
        headers: new Headers({ 'Operation-Location': 'https://exemple/op/123' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'succeeded', analyzeResult: { content: 'Sans tableau.' } }),
      } as Response)

    const resultat = await provider().extraireTexte(new ArrayBuffer(4), 'image/png')

    expect(resultat.tableaux).toEqual([])
  })
})

describe("DocumentIntelligenceProvider — sondage (poll jusqu'à succeeded/failed)", () => {
  test('statut "failed" -> erreur explicite, jamais un résultat vide silencieux', async () => {
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

    const providerAvecPeuDeSondages = new DocumentIntelligenceProvider({
      endpoint: 'https://exemple.cognitiveservices.azure.com',
      cleAbonnement: 'cle-secrete',
      nombreSondagesMax: 3,
      delaiSondageMs: 1,
    })
    const promesse = providerAvecPeuDeSondages.extraireTexte(new ArrayBuffer(4), 'image/png')
    const assertion = expect(promesse).rejects.toThrow(/non conclue/)
    await vi.runAllTimersAsync()
    await assertion
  })
})
