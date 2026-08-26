import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { db } from '../../persistance/db'
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

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.connexionGitHub.clear()
  await db.connexionDrive.clear()
  await db.etatMiroirDrive.clear()
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

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
    await db.connexionGitHub.put({
      id: 'unique',
      owner: 'acme',
      repo: 'data',
      branche: 'main',
      jeton: 'x',
    })
    const store = useMiroirDriveStore()
    const resultat = await store.miroirVersDrive('client-1')
    expect(resultat).toEqual({
      ok: false,
      message: 'Aucune configuration Drive enregistrée pour ce client.',
    })
  })

  test('lit l’arborescence GitHub complète et la mirroir vers Drive, enregistre l’horodatage', async () => {
    await db.connexionGitHub.put({
      id: 'unique',
      owner: 'acme',
      repo: 'data',
      branche: 'main',
      jeton: 'x',
    })
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
