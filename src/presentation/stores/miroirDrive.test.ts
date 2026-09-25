import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { Contexte } from '../../../workers/auth-worker/src/routeur'
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
  // Vraie `Response` : les appels GitHub passent désormais par le relais du
  // faux Worker, qui relit le corps (`text()`) et les en-têtes.
  return new Response(JSON.stringify(corps), {
    status: options.status ?? 200,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
}

function encoderBase64Utf8(texte: string): string {
  const octets = new TextEncoder().encode(texte)
  return btoa(String.fromCharCode(...octets))
}

// Le dépôt GitHub est désormais un paramètre d'installation stocké côté
// Worker/D1 (`useConnexionGitHubStore`) — `fetchMock` ci-dessous ne sert
// donc plus qu'aux appels réels à l'API GitHub/Drive.
let ctx: Contexte
let fetchMock: ReturnType<typeof vi.fn>
let demonter: () => void

beforeEach(async () => {
  setActivePinia(createPinia())
  await reinitialiserAuthDeTest()
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  const installation = installerFauxWorkerAuth()
  ctx = installation.ctx
  demonter = installation.demonter
  await connecterAdminDeTest()
  await ctx.clientsRepo.creer({
    id: 'client-1',
    name: 'Client 1',
    adresse: null,
    secteur: null,
    details: null,
    statut: 'actif',
    archivedAt: null,
    archivedBy: null,
    createdByUserId: 'admin-test',
    sharedWith: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
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
    await ctx.connexionDriveRepo.enregistrer({
      clientId: 'client-1',
      dossierId: 'dossier-1',
      jeton: 'y',
    })

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
