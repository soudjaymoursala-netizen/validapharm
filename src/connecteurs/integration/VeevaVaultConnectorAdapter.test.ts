import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { VeevaVaultConnectorAdapter } from './VeevaVaultConnectorAdapter'
import { AuthentificationError, DocumentIntrouvableError, IndisponibleError } from './erreurs'

function reponseMock(corps: unknown, options: { status?: number } = {}): Response {
  const status = options.status ?? 200
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => corps,
    text: async () => corps as string,
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

function adaptateur(): VeevaVaultConnectorAdapter {
  return new VeevaVaultConnectorAdapter({
    vaultDns: 'monvault.veevavault.com',
    nomUtilisateur: 'utilisateur@client.com',
    motDePasse: 'mot-de-passe-test',
  })
}

describe('VeevaVaultConnectorAdapter — authentification', () => {
  test('tester() authentifie avec succès et réutilise la session ensuite', async () => {
    fetchMock
      .mockResolvedValueOnce(reponseMock({ responseStatus: 'SUCCESS', sessionId: 'session-abc' }))
      .mockResolvedValueOnce(reponseMock({ documents: [] }))

    const client = adaptateur()
    expect(await client.tester()).toBe(true)
    await client.listerDocuments()

    // Un seul appel d'authentification malgré 2 opérations — session réutilisée.
    const appelsAuth = fetchMock.mock.calls.filter(([url]) => String(url).includes('/auth'))
    expect(appelsAuth).toHaveLength(1)
  })

  test('échec d’authentification (responseStatus != SUCCESS) -> AuthentificationError', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({ responseStatus: 'FAILURE' }))
    await expect(adaptateur().tester()).rejects.toThrow(AuthentificationError)
  })

  test('HTTP non-ok sur l’authentification -> AuthentificationError', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({}, { status: 401 }))
    await expect(adaptateur().tester()).rejects.toThrow(AuthentificationError)
  })
})

describe('VeevaVaultConnectorAdapter — documents', () => {
  test('listerDocuments() traduit la réponse Vault en DocumentExterne[]', async () => {
    fetchMock
      .mockResolvedValueOnce(reponseMock({ responseStatus: 'SUCCESS', sessionId: 'session-abc' }))
      .mockResolvedValueOnce(
        reponseMock({
          documents: [{ document: { id: 42, name__v: 'Protocole IQ SCADA-305' } }],
        }),
      )

    const documents = await adaptateur().listerDocuments()
    expect(documents).toEqual([{ identifiant: '42', libelle: 'Protocole IQ SCADA-305' }])
  })

  test('listerDocuments() en erreur -> IndisponibleError', async () => {
    fetchMock
      .mockResolvedValueOnce(reponseMock({ responseStatus: 'SUCCESS', sessionId: 'session-abc' }))
      .mockResolvedValueOnce(reponseMock({}, { status: 500 }))

    await expect(adaptateur().listerDocuments()).rejects.toThrow(IndisponibleError)
  })

  test('lireDocument() sur un identifiant inconnu -> DocumentIntrouvableError', async () => {
    fetchMock
      .mockResolvedValueOnce(reponseMock({ responseStatus: 'SUCCESS', sessionId: 'session-abc' }))
      .mockResolvedValueOnce(reponseMock({}, { status: 404 }))

    await expect(adaptateur().lireDocument('inconnu')).rejects.toThrow(DocumentIntrouvableError)
  })
})
