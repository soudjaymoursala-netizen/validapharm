import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { db } from '../../persistance/db'
import { useConnexionDriveStore } from './useConnexionDriveStore'

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.connexionDrive.clear()
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
    expect(await db.connexionDrive.get('client-1')).toBeUndefined()
    expect(await db.connexionDrive.get('client-2')).toBeDefined()
  })
})

describe('useConnexionDriveStore — testerConnexion', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

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
