import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { DriveDocumentConnectorAdapter } from './DriveDocumentConnectorAdapter'
import { OperationNonSupporteeError } from './erreurs'

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

describe('DriveDocumentConnectorAdapter — écriture seule, jamais lu comme source', () => {
  test('tester() délègue à DriveConnector.verifierDossier()', async () => {
    fetchMock.mockResolvedValueOnce(
      reponseMock({ name: 'Dossier client', mimeType: 'application/vnd.google-apps.folder' }),
    )
    const adaptateur = new DriveDocumentConnectorAdapter({
      dossierId: 'dossier-1',
      jeton: 'jeton-test',
    })
    expect(await adaptateur.tester()).toBe(true)
  })

  test('listerDocuments()/lireDocument() lèvent OperationNonSupporteeError — jamais lu comme source', async () => {
    const adaptateur = new DriveDocumentConnectorAdapter({
      dossierId: 'dossier-1',
      jeton: 'jeton-test',
    })
    await expect(adaptateur.listerDocuments()).rejects.toThrow(OperationNonSupporteeError)
    await expect(adaptateur.lireDocument()).rejects.toThrow(OperationNonSupporteeError)
  })
})
