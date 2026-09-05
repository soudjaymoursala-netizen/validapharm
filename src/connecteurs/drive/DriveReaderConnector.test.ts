import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { DriveReaderConnector } from './DriveReaderConnector'
import { AuthentificationError, QuotaDepasseError } from './erreurs'

function reponseMock(
  corps: unknown,
  options: { status?: number; texte?: string; binaire?: ArrayBuffer } = {},
): Response {
  const status = options.status ?? 200
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => corps,
    text: async () => options.texte ?? '',
    arrayBuffer: async () => options.binaire ?? new ArrayBuffer(0),
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

function connecteur(): DriveReaderConnector {
  return new DriveReaderConnector({ dossierId: 'dossier-normes', jeton: 'jeton-test' })
}

describe('DriveReaderConnector — listerFichiers', () => {
  test('liste les fichiers du dossier configuré', async () => {
    const fichiers = [
      {
        id: 'f1',
        nom: 'ICH-Q7.pdf',
        mimeType: 'application/pdf',
        modifiedTime: '2026-01-01T00:00:00Z',
      },
    ]
    fetchMock.mockResolvedValueOnce(reponseMock({ files: fichiers }))

    const resultat = await connecteur().listerFichiers()
    expect(resultat).toEqual(fichiers)

    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toContain('https://www.googleapis.com/drive/v3/files?q=')
    expect(url).toContain(encodeURIComponent("'dossier-normes' in parents and trashed=false"))
    expect(url).toContain('fields=files(id,name,mimeType,modifiedTime)')
  })

  test('401 -> AuthentificationError', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({}, { status: 401 }))
    await expect(connecteur().listerFichiers()).rejects.toBeInstanceOf(AuthentificationError)
  })

  test('403 (quota dépassé) -> QuotaDepasseError avec le message Drive', async () => {
    fetchMock.mockResolvedValueOnce(
      reponseMock(
        { error: { message: 'The user has exceeded their Drive storage quota.' } },
        { status: 403 },
      ),
    )
    const erreur = await connecteur()
      .listerFichiers()
      .catch((e: unknown) => e)
    expect(erreur).toBeInstanceOf(QuotaDepasseError)
    expect((erreur as Error).message).toBe('The user has exceeded their Drive storage quota.')
  })

  test('statut non prévu -> erreur explicite', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({}, { status: 500 }))
    await expect(connecteur().listerFichiers()).rejects.toThrow('500')
  })
})

describe('DriveReaderConnector — tester', () => {
  test("vérifie l'accès en listant réellement le dossier", async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({ files: [] }))
    await expect(connecteur().tester()).resolves.toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test('401 -> AuthentificationError propagée', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({}, { status: 401 }))
    await expect(connecteur().tester()).rejects.toBeInstanceOf(AuthentificationError)
  })
})

describe('DriveReaderConnector — telechargerContenu', () => {
  test('télécharge le contenu binaire réel du fichier', async () => {
    const binaire = new TextEncoder().encode('contenu-binaire').buffer
    fetchMock.mockResolvedValueOnce(reponseMock({}, { binaire }))

    const resultat = await connecteur().telechargerContenu('fichier-1')
    expect(resultat).toBe(binaire)

    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toBe('https://www.googleapis.com/drive/v3/files/fichier-1?alt=media')
  })

  test('401 -> AuthentificationError', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({}, { status: 401 }))
    await expect(connecteur().telechargerContenu('fichier-1')).rejects.toBeInstanceOf(
      AuthentificationError,
    )
  })
})

describe('DriveReaderConnector — lireTexteExporte', () => {
  test('exporte un document Google natif en texte brut', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({}, { texte: 'Texte exporté du document Google.' }))

    const resultat = await connecteur().lireTexteExporte('doc-google-1')
    expect(resultat).toBe('Texte exporté du document Google.')

    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toBe(
      'https://www.googleapis.com/drive/v3/files/doc-google-1/export?mimeType=text/plain',
    )
  })

  test('403 (quota dépassé) -> QuotaDepasseError', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({ error: { message: 'quota' } }, { status: 403 }))
    await expect(connecteur().lireTexteExporte('doc-google-1')).rejects.toBeInstanceOf(
      QuotaDepasseError,
    )
  })
})

describe('DriveReaderConnector — estDocumentGoogleNatif', () => {
  test.each([
    'application/vnd.google-apps.document',
    'application/vnd.google-apps.spreadsheet',
    'application/vnd.google-apps.presentation',
  ])('%s est un document Google natif', (mimeType) => {
    expect(connecteur().estDocumentGoogleNatif(mimeType)).toBe(true)
  })

  test.each([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ])("%s n'est pas un document Google natif", (mimeType) => {
    expect(connecteur().estDocumentGoogleNatif(mimeType)).toBe(false)
  })
})
