import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { DriveConnector } from './DriveConnector'
import { AuthentificationError, QuotaDepasseError, TimeoutError } from './erreurs'

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

function connecteur(): DriveConnector {
  return new DriveConnector({ dossierId: 'dossier-1', jeton: 'jeton-test' })
}

describe('DriveConnector — miroir', () => {
  test('fichier absent du dossier Drive : recherche puis création (upload multipart)', async () => {
    fetchMock
      .mockResolvedValueOnce(reponseMock({ files: [] })) // recherche
      .mockResolvedValueOnce(reponseMock({ id: 'fichier-cree' })) // création

    const resultat = await connecteur().miroir([
      { chemin: 'data/projects/p1.json', contenu: '{"a":1}' },
    ])
    expect(resultat).toEqual({ nbFichiers: 1 })
    expect(fetchMock).toHaveBeenCalledTimes(2)

    const [urlRecherche] = fetchMock.mock.calls[0] as [string]
    expect(urlRecherche).toContain('files?q=')
    expect(urlRecherche).toContain(encodeURIComponent("name='data/projects/p1.json'"))

    const [urlCreation, optionsCreation] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(urlCreation).toBe(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    )
    expect(optionsCreation.method).toBe('POST')
    expect(optionsCreation.body as string).toContain('"parents":["dossier-1"]')
    expect(optionsCreation.body as string).toContain('{"a":1}')
  })

  test('fichier déjà présent : recherche puis écrasement du contenu (media upload), jamais de fusion', async () => {
    fetchMock
      .mockResolvedValueOnce(reponseMock({ files: [{ id: 'fichier-existant' }] }))
      .mockResolvedValueOnce(reponseMock({ id: 'fichier-existant' }))

    await connecteur().miroir([{ chemin: 'data/projects/p1.json', contenu: '{"a":2}' }])

    const [urlMaj, optionsMaj] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(urlMaj).toBe(
      'https://www.googleapis.com/upload/drive/v3/files/fichier-existant?uploadType=media',
    )
    expect(optionsMaj.method).toBe('PATCH')
    expect(optionsMaj.body).toBe('{"a":2}')
  })

  test('plusieurs fichiers : une recherche + une écriture par fichier, indépendantes', async () => {
    fetchMock
      .mockResolvedValueOnce(reponseMock({ files: [] }))
      .mockResolvedValueOnce(reponseMock({ id: 'f1' }))
      .mockResolvedValueOnce(reponseMock({ files: [{ id: 'f2' }] }))
      .mockResolvedValueOnce(reponseMock({ id: 'f2' }))

    const resultat = await connecteur().miroir([
      { chemin: 'data/projects/p1.json', contenu: '{}' },
      { chemin: 'data/sections/s1.json', contenu: '{}' },
    ])
    expect(resultat).toEqual({ nbFichiers: 2 })
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  test('401 -> AuthentificationError', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({}, { status: 401 }))
    await expect(connecteur().miroir([{ chemin: 'a.json', contenu: '{}' }])).rejects.toBeInstanceOf(
      AuthentificationError,
    )
  })

  test('403 (quota de stockage dépassé) -> QuotaDepasseError avec le message Drive', async () => {
    fetchMock.mockResolvedValueOnce(
      reponseMock(
        { error: { message: 'The user has exceeded their Drive storage quota.' } },
        { status: 403 },
      ),
    )
    const erreur = await connecteur()
      .miroir([{ chemin: 'a.json', contenu: '{}' }])
      .catch((e: unknown) => e)
    expect(erreur).toBeInstanceOf(QuotaDepasseError)
    expect((erreur as Error).message).toBe('The user has exceeded their Drive storage quota.')
  })

  test('abandon réseau (timeout) -> TimeoutError', async () => {
    const erreurAbort = new Error('aborted')
    erreurAbort.name = 'AbortError'
    fetchMock.mockRejectedValueOnce(erreurAbort)
    await expect(connecteur().miroir([{ chemin: 'a.json', contenu: '{}' }])).rejects.toBeInstanceOf(
      TimeoutError,
    )
  })

  test('statut non prévu par le contrat typé -> erreur explicite, pas silencieuse', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({}, { status: 500 }))
    await expect(connecteur().miroir([{ chemin: 'a.json', contenu: '{}' }])).rejects.toThrow('500')
  })

  test('aucun fichier à miroiter : aucun appel réseau', async () => {
    const resultat = await connecteur().miroir([])
    expect(resultat).toEqual({ nbFichiers: 0 })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('DriveConnector — verifierDossier', () => {
  test('dossier accessible : renvoie son nom', async () => {
    fetchMock.mockResolvedValueOnce(
      reponseMock({ name: 'Client A', mimeType: 'application/vnd.google-apps.folder' }),
    )
    const resultat = await connecteur().verifierDossier()
    expect(resultat).toEqual({ nom: 'Client A' })

    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toBe('https://www.googleapis.com/drive/v3/files/dossier-1?fields=name,mimeType')
  })

  test("l'identifiant configuré ne désigne pas un dossier : erreur explicite", async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({ name: 'p1.json', mimeType: 'application/json' }))
    await expect(connecteur().verifierDossier()).rejects.toThrow(
      "L'identifiant configuré ne désigne pas un dossier Drive.",
    )
  })

  test('401 -> AuthentificationError', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({}, { status: 401 }))
    await expect(connecteur().verifierDossier()).rejects.toBeInstanceOf(AuthentificationError)
  })
})
