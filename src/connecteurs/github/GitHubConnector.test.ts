import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { GitHubConnector } from './GitHubConnector'
import {
  AuthentificationError,
  ConflitShaError,
  PorteeInsuffisanteError,
  QuotaApiDepasseError,
  TimeoutError,
} from './erreurs'

function reponseMock(
  corps: unknown,
  options: { status?: number; headers?: Record<string, string> } = {},
): Response {
  const status = options.status ?? 200
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (nom: string) => options.headers?.[nom] ?? null },
    json: async () => corps,
  } as Response
}

function encoderBase64Utf8(texte: string): string {
  const octets = new TextEncoder().encode(texte)
  return btoa(String.fromCharCode(...octets))
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function connecteur(): GitHubConnector {
  return new GitHubConnector({ owner: 'acme', repo: 'validapharm-data', jeton: 'jeton-test' })
}

describe('GitHubConnector — lire', () => {
  test('décode correctement un contenu UTF-8 (accents)', async () => {
    fetchMock.mockResolvedValueOnce(
      reponseMock({
        content: encoderBase64Utf8('{"titre":"Qualité opérationnelle"}'),
        sha: 'sha-abc',
      }),
    )
    const resultat = await connecteur().lire('projects/p1.json')
    expect(resultat).toEqual({ contenu: '{"titre":"Qualité opérationnelle"}', sha: 'sha-abc' })
  })

  test('401 -> AuthentificationError', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({}, { status: 401 }))
    await expect(connecteur().lire('x.json')).rejects.toBeInstanceOf(AuthentificationError)
  })

  test('403 avec quota épuisé -> QuotaApiDepasseError avec date de réinitialisation', async () => {
    fetchMock.mockResolvedValueOnce(
      reponseMock(
        {},
        {
          status: 403,
          headers: { 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': '1700000000' },
        },
      ),
    )
    const erreur = await connecteur()
      .lire('x.json')
      .catch((e: unknown) => e)
    expect(erreur).toBeInstanceOf(QuotaApiDepasseError)
    expect((erreur as QuotaApiDepasseError).reinitialisationA).toEqual(new Date(1700000000 * 1000))
  })

  test('403 sans quota épuisé -> PorteeInsuffisanteError', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({}, { status: 403 }))
    await expect(connecteur().lire('x.json')).rejects.toBeInstanceOf(PorteeInsuffisanteError)
  })

  test('abandon réseau (timeout) -> TimeoutError', async () => {
    const erreurAbort = new Error('aborted')
    erreurAbort.name = 'AbortError'
    fetchMock.mockRejectedValueOnce(erreurAbort)
    await expect(connecteur().lire('x.json')).rejects.toBeInstanceOf(TimeoutError)
  })

  test('statut non prévu par le contrat typé -> erreur explicite, pas silencieuse', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({}, { status: 500 }))
    await expect(connecteur().lire('x.json')).rejects.toThrow('500')
  })
})

describe('GitHubConnector — chargerArborescence', () => {
  test('ne garde que les entrées de type blob, ignore les sous-arbres/submodules', async () => {
    fetchMock.mockResolvedValueOnce(
      reponseMock({
        tree: [
          { path: 'data/projects/p1.json', type: 'blob', sha: 'sha-1' },
          { path: 'data/projects', type: 'tree', sha: 'sha-dir' },
          { path: 'vendor/lib', type: 'commit', sha: 'sha-submodule' },
          { path: 'data/sections/s1.json', type: 'blob', sha: 'sha-2' },
        ],
      }),
    )
    const arborescence = await connecteur().chargerArborescence()
    expect(arborescence).toEqual([
      { chemin: 'data/projects/p1.json', sha: 'sha-1' },
      { chemin: 'data/sections/s1.json', sha: 'sha-2' },
    ])
  })
})

describe('GitHubConnector — ecrireGroupe', () => {
  test('séquence nominale : vérifie le SHA, crée un blob par fichier, un arbre, un commit, met à jour la référence', async () => {
    fetchMock
      .mockResolvedValueOnce(reponseMock({ object: { sha: 'sha-branche-actuel' } })) // shaBrancheActuel
      .mockResolvedValueOnce(reponseMock({ tree: { sha: 'sha-arbre-base' } })) // commit de base
      .mockResolvedValueOnce(reponseMock({ sha: 'sha-blob-1' })) // blob fichier 1
      .mockResolvedValueOnce(reponseMock({ sha: 'sha-nouvel-arbre' })) // nouvel arbre
      .mockResolvedValueOnce(reponseMock({ sha: 'sha-nouveau-commit' })) // nouveau commit
      .mockResolvedValueOnce(reponseMock({ object: { sha: 'sha-nouveau-commit' } })) // mise à jour ref

    const resultat = await connecteur().ecrireGroupe(
      [{ chemin: 'data/projects/p1.json', contenu: '{"a":1}' }],
      'sha-branche-actuel',
      'project p1 création',
    )

    expect(resultat).toEqual({
      commitSha: 'sha-nouveau-commit',
      nouvelleShaBranche: 'sha-nouveau-commit',
    })
    expect(fetchMock).toHaveBeenCalledTimes(6)

    const [, optionsArbre] = fetchMock.mock.calls[3] as [string, RequestInit]
    const corpsArbre = JSON.parse(optionsArbre.body as string) as {
      base_tree: string
      tree: Array<{ path: string; sha: string }>
    }
    expect(corpsArbre.base_tree).toBe('sha-arbre-base')
    expect(corpsArbre.tree).toEqual([
      { path: 'data/projects/p1.json', mode: '100644', type: 'blob', sha: 'sha-blob-1' },
    ])
  })

  test("nombre d'appels constant, indépendant du nombre de fichiers modifiés (hors les N créations de blob nécessaires)", async () => {
    fetchMock
      .mockResolvedValueOnce(reponseMock({ object: { sha: 'sha-branche-actuel' } }))
      .mockResolvedValueOnce(reponseMock({ tree: { sha: 'sha-arbre-base' } }))
      .mockResolvedValueOnce(reponseMock({ sha: 'sha-blob-1' }))
      .mockResolvedValueOnce(reponseMock({ sha: 'sha-blob-2' }))
      .mockResolvedValueOnce(reponseMock({ sha: 'sha-blob-3' }))
      .mockResolvedValueOnce(reponseMock({ sha: 'sha-nouvel-arbre' }))
      .mockResolvedValueOnce(reponseMock({ sha: 'sha-nouveau-commit' }))
      .mockResolvedValueOnce(reponseMock({ object: { sha: 'sha-nouveau-commit' } }))

    await connecteur().ecrireGroupe(
      [
        { chemin: 'a.json', contenu: '{}' },
        { chemin: 'b.json', contenu: '{}' },
        { chemin: 'c.json', contenu: '{}' },
      ],
      'sha-branche-actuel',
      'écriture groupée',
    )

    // 3 fichiers -> 5 appels fixes (ref, commit base, arbre, commit, patch ref) + 3 blobs = 8.
    expect(fetchMock).toHaveBeenCalledTimes(8)
  })

  test('conflit détecté avant tout appel coûteux si le SHA de branche a déjà changé', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({ object: { sha: 'sha-different' } }))

    await expect(
      connecteur().ecrireGroupe([{ chemin: 'a.json', contenu: '{}' }], 'sha-attendu', 'msg'),
    ).rejects.toBeInstanceOf(ConflitShaError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test('conflit détecté tardivement (fenêtre de concurrence) : la mise à jour de référence échoue en 422', async () => {
    fetchMock
      .mockResolvedValueOnce(reponseMock({ object: { sha: 'sha-branche-actuel' } }))
      .mockResolvedValueOnce(reponseMock({ tree: { sha: 'sha-arbre-base' } }))
      .mockResolvedValueOnce(reponseMock({ sha: 'sha-blob-1' }))
      .mockResolvedValueOnce(reponseMock({ sha: 'sha-nouvel-arbre' }))
      .mockResolvedValueOnce(reponseMock({ sha: 'sha-nouveau-commit' }))
      .mockResolvedValueOnce(reponseMock({}, { status: 422 }))

    await expect(
      connecteur().ecrireGroupe([{ chemin: 'a.json', contenu: '{}' }], 'sha-branche-actuel', 'msg'),
    ).rejects.toBeInstanceOf(ConflitShaError)
  })
})
