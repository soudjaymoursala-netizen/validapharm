import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { GitHubDocumentConnectorAdapter } from './GitHubDocumentConnectorAdapter'

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

describe('GitHubDocumentConnectorAdapter — ADAPT autour de GitHubConnector', () => {
  test('tester() et listerDocuments() délèguent bien au GitHubConnector existant', async () => {
    fetchMock
      .mockResolvedValueOnce(reponseMock({ object: { sha: 'sha-branche' } })) // tester()
      .mockResolvedValueOnce(
        reponseMock({
          tree: [{ path: 'docs/urs.md', type: 'blob', sha: 'sha-fichier' }],
        }),
      ) // listerDocuments()

    const adaptateur = new GitHubDocumentConnectorAdapter({
      owner: 'client',
      repo: 'depot',
      jeton: 'jeton-test',
    })
    expect(await adaptateur.tester()).toBe(true)
    expect(await adaptateur.listerDocuments()).toEqual([
      { identifiant: 'sha-fichier', libelle: 'docs/urs.md' },
    ])
  })
})
