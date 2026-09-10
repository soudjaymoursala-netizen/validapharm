import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { db } from '../../persistance/db'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import { useConnexionGitHubStore } from './useConnexionGitHubStore'
import { useMiroirDriveStore } from './useMiroirDriveStore'

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

// Le dépôt GitHub est désormais un paramètre d'installation stocké côté
// Worker/D1 (`useConnexionGitHubStore`) — `fetchMock` ci-dessous ne sert
// donc plus qu'aux appels réels à l'API GitHub/Drive.
let fetchMock: ReturnType<typeof vi.fn>
let demonter: () => void

beforeEach(async () => {
  setActivePinia(createPinia())
  await reinitialiserAuthDeTest()
  await db.connexionDrive.clear()
  await db.etatMiroirDrive.clear()
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  demonter = installerFauxWorkerAuth().demonter
  await connecterAdminDeTest()
})

afterEach(() => {
  demonter()
})

async function configurerConnexionGitHub(): Promise<void> {
  const resultat = await useConnexionGitHubStore().enregistrer({
    owner: 'acme',
    repo: 'data',
    branche: 'main',
    jeton: 'x',
  })
  if (!resultat.ok)
    throw new Error(`préparation de la connexion GitHub échouée : ${resultat.erreur}`)
}

describe('useMiroirDriveStore — miroirVersDrive', () => {
  test('sans connexion GitHub configurée : échec explicite, aucun appel réseau', async () => {
    const store = useMiroirDriveStore()
    const resultat = await store.miroirVersDrive('client-1')
    expect(resultat).toEqual({
      ok: false,
      message:
        'Aucune connexion GitHub configurée — le miroir Drive lit son état depuis GitHub, pas depuis le cache local.',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('sans configuration Drive pour ce client : échec explicite', async () => {
    await configurerConnexionGitHub()
    const store = useMiroirDriveStore()
    const resultat = await store.miroirVersDrive('client-1')
    expect(resultat).toEqual({
      ok: false,
      message: 'Aucune configuration Drive enregistrée pour ce client.',
    })
  })

  test('lit l’arborescence GitHub complète et la mirroir vers Drive, enregistre l’horodatage', async () => {
    await configurerConnexionGitHub()
    await db.connexionDrive.put({ client_id: 'client-1', dossierId: 'dossier-1', jeton: 'y' })

    const contenuProjet = JSON.stringify({ id: 'p1', name: 'Projet' })
    fetchMock
      .mockResolvedValueOnce(
        reponseMock({ tree: [{ path: 'data/projects/p1.json', type: 'blob', sha: 'sha-1' }] }),
      ) // chargerArborescence
      .mockResolvedValueOnce(reponseMock({ content: encoderBase64Utf8(contenuProjet) })) // lireBlob
      .mockResolvedValueOnce(reponseMock({ files: [] })) // Drive : recherche
      .mockResolvedValueOnce(reponseMock({ id: 'fichier-drive-1' })) // Drive : création

    const store = useMiroirDriveStore()
    const resultat = await store.miroirVersDrive('client-1')
    expect(resultat).toEqual({ ok: true, nbFichiers: 1 })

    const dernierMiroir = await store.obtenirDernierMiroirReussi('client-1')
    expect(dernierMiroir).not.toBeNull()

    const [urlCreation, optionsCreation] = fetchMock.mock.calls[3] as [string, RequestInit]
    expect(urlCreation).toContain('googleapis.com')
    expect(optionsCreation.body as string).toContain(contenuProjet)
  })

  test('obtenirDernierMiroirReussi renvoie null quand aucun miroir n’a encore réussi', async () => {
    const store = useMiroirDriveStore()
    expect(await store.obtenirDernierMiroirReussi('client-inconnu')).toBeNull()
  })
})
