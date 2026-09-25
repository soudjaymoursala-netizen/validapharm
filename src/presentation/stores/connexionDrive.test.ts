import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import { connexionDriveAMigrer } from '../../persistance/db'
import { useConnexionDriveStore } from './useConnexionDriveStore'

// `fetchMock` doit être stubbé **avant** `installerFauxWorkerAuth()` : sa
// capture interne `fetchReel` doit déjà être `fetchMock` au moment de sa
// construction pour que les appels réels (DriveConnector -> googleapis.com)
// tombent dans ce mock contrôlable, tandis que les appels au faux Worker de
// test restent interceptés par `routerRequete` (même leçon que
// `panneauChat.test.ts`).
let fetchMock: ReturnType<typeof vi.fn>
let demonter: () => void

beforeEach(async () => {
  setActivePinia(createPinia())
  await reinitialiserAuthDeTest()
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  const installation = installerFauxWorkerAuth()
  demonter = installation.demonter
  const { ctx } = installation
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
  await ctx.clientsRepo.creer({
    id: 'client-2',
    name: 'Client 2',
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

describe('useConnexionDriveStore — enregistrer/charger', () => {
  test('enregistre et relit la configuration, isolée par client_id', async () => {
    const store = useConnexionDriveStore()
    await store.enregistrer('client-1', { dossierId: 'dossier-1', jeton: 'jeton-1' })
    expect(store.connexion).toEqual({
      client_id: 'client-1',
      dossierId: 'dossier-1',
      jeton: 'jeton-1',
    })

    await store.enregistrer('client-2', { dossierId: 'dossier-2', jeton: 'jeton-2' })
    expect(store.connexion).toEqual({
      client_id: 'client-2',
      dossierId: 'dossier-2',
      jeton: 'jeton-2',
    })

    await store.charger('client-1')
    expect(store.connexion).toEqual({
      client_id: 'client-1',
      dossierId: 'dossier-1',
      jeton: 'jeton-1',
    })
  })

  test('charger un client sans configuration : connexion null', async () => {
    const store = useConnexionDriveStore()
    await store.charger('client-inconnu')
    expect(store.connexion).toBeNull()
  })

  test('effacer supprime uniquement la configuration du client visé', async () => {
    const store = useConnexionDriveStore()
    await store.enregistrer('client-1', { dossierId: 'd1', jeton: 'j1' })
    await store.enregistrer('client-2', { dossierId: 'd2', jeton: 'j2' })
    await store.effacer('client-1')

    await store.charger('client-1')
    expect(store.connexion).toBeNull()
    await store.charger('client-2')
    expect(store.connexion).not.toBeNull()
  })
})

describe('useConnexionDriveStore — testerConnexion', () => {
  test('sans configuration chargée : échec explicite sans appel réseau', async () => {
    const store = useConnexionDriveStore()
    const resultat = await store.testerConnexion()
    expect(resultat).toEqual({ ok: false, message: 'Aucune configuration enregistrée.' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('configuration valide : appelle réellement l’API et retourne le nom du dossier', async () => {
    const store = useConnexionDriveStore()
    await store.enregistrer('client-1', { dossierId: 'dossier-1', jeton: 'x' })
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ name: 'Client A', mimeType: 'application/vnd.google-apps.folder' }),
    })

    const resultat = await store.testerConnexion()
    expect(resultat).toEqual({ ok: true, nomDossier: 'Client A' })
  })

  test('jeton invalide : retourne un échec explicite, jamais le jeton dans le message', async () => {
    const store = useConnexionDriveStore()
    await store.enregistrer('client-1', { dossierId: 'dossier-1', jeton: 'jeton-secret' })
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) })

    const resultat = await store.testerConnexion()
    expect(resultat.ok).toBe(false)
    expect(JSON.stringify(resultat)).not.toContain('jeton-secret')
  })
})

describe('useConnexionDriveStore — migration locale', () => {
  test('échec côté serveur : la copie locale est conservée pour un nouvel essai (jamais perdue)', async () => {
    connexionDriveAMigrer.push({ client_id: 'client-inaccessible', dossierId: 'd', jeton: 't' })
    try {
      await useConnexionDriveStore().charger('client-inaccessible')
      expect(connexionDriveAMigrer.some((c) => c.client_id === 'client-inaccessible')).toBe(true)
    } finally {
      connexionDriveAMigrer.splice(0, connexionDriveAMigrer.length)
    }
  })

  test('succès : la copie locale est migrée puis retirée de la file', async () => {
    connexionDriveAMigrer.push({ client_id: 'client-1', dossierId: 'dossier-local', jeton: 't' })
    const store = useConnexionDriveStore()
    await store.charger('client-1')
    expect(connexionDriveAMigrer).toHaveLength(0)
    expect(store.connexion?.dossierId).toBe('dossier-local')
  })
})
