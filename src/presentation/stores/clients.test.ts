import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import { useClientsStore } from './useClientsStore'

let demonter: () => void

beforeEach(async () => {
  setActivePinia(createPinia())
  await reinitialiserAuthDeTest()
  demonter = installerFauxWorkerAuth().demonter
  await connecterAdminDeTest()
})

afterEach(() => {
  demonter()
})

describe('useClientsStore (Worker/D1, TD-046)', () => {
  test('creerClient persiste et ajoute au state', async () => {
    const store = useClientsStore()
    const resultat = await store.creerClient({ name: 'Client A' })
    expect('erreur' in resultat).toBe(false)
    if ('erreur' in resultat) return

    expect(resultat.name).toBe('Client A')
    expect(resultat.id).toBeTruthy()
    expect(store.clients).toEqual([resultat])
  })

  test('chargerClients relit depuis le Worker, triés par nom', async () => {
    const store = useClientsStore()
    await store.creerClient({ name: 'Zeta Pharma' })
    await store.creerClient({ name: 'Acme Pharma' })

    store.clients = []
    await store.chargerClients()

    expect(store.clients.map((c) => c.name)).toEqual(['Acme Pharma', 'Zeta Pharma'])
  })

  test('obtenirClient renvoie undefined pour un id inconnu', async () => {
    const store = useClientsStore()
    expect(await store.obtenirClient('inconnu')).toBeUndefined()
  })

  test('un client créé est actif, apparaît dans clientsActifs et pas dans clientsArchives', async () => {
    const store = useClientsStore()
    const resultat = await store.creerClient({ name: 'Client A' })
    if ('erreur' in resultat) throw resultat

    expect(resultat.statut).toBe('actif')
    expect(store.clientsActifs.map((c) => c.id)).toContain(resultat.id)
    expect(store.clientsArchives.map((c) => c.id)).not.toContain(resultat.id)
  })

  test('archiverClient bascule le statut, jamais une suppression physique (ALCOA+)', async () => {
    const store = useClientsStore()
    const client = await store.creerClient({ name: 'Client A' })
    if ('erreur' in client) throw client

    const resultat = await store.archiverClient(client.id)
    expect('erreur' in resultat).toBe(false)
    if ('erreur' in resultat) return

    expect(resultat.statut).toBe('archive')
    expect(resultat.archived_at).not.toBeNull()
    expect(resultat.archived_by).toBe('admin@pharmatech.example')

    expect(store.clientsActifs.map((c) => c.id)).not.toContain(client.id)
    expect(store.clientsArchives.map((c) => c.id)).toContain(client.id)

    // Jamais supprimé — juste archivé, encore récupérable.
    expect(await store.obtenirClient(client.id)).toBeDefined()
  })

  test('archiverClient refuse un client déjà archivé', async () => {
    const store = useClientsStore()
    const client = await store.creerClient({ name: 'Client A' })
    if ('erreur' in client) throw client
    await store.archiverClient(client.id)

    const resultat = await store.archiverClient(client.id)
    expect(resultat).toEqual({ erreur: 'deja_archive' })
  })

  test('archiverClient refuse un client introuvable', async () => {
    const store = useClientsStore()
    expect(await store.archiverClient('inconnu')).toEqual({ erreur: 'introuvable' })
  })

  test('desarchiverClient restaure un client archivé', async () => {
    const store = useClientsStore()
    const client = await store.creerClient({ name: 'Client A' })
    if ('erreur' in client) throw client
    await store.archiverClient(client.id)

    const resultat = await store.desarchiverClient(client.id)
    expect('erreur' in resultat).toBe(false)
    if ('erreur' in resultat) return

    expect(resultat.statut).toBe('actif')
    expect(resultat.archived_at).toBeNull()
    expect(resultat.archived_by).toBeNull()
  })

  test('desarchiverClient refuse un client déjà actif', async () => {
    const store = useClientsStore()
    const client = await store.creerClient({ name: 'Client A' })
    if ('erreur' in client) throw client
    expect(await store.desarchiverClient(client.id)).toEqual({ erreur: 'deja_actif' })
  })

  test('creerClient persiste adresse/secteur/détails (§13 du prompt maître, Phase 40)', async () => {
    const store = useClientsStore()
    const resultat = await store.creerClient({
      name: 'Client A',
      adresse: '12 rue de la Zone Industrielle',
      secteur: 'pharmaceutique',
      details: 'Fabrication de formes sèches',
    })
    if ('erreur' in resultat) throw resultat

    expect(resultat.adresse).toBe('12 rue de la Zone Industrielle')
    expect(resultat.secteur).toBe('pharmaceutique')
    expect(resultat.details).toBe('Fabrication de formes sèches')
  })

  test('modifierClient met à jour nom/adresse/secteur/détails sans toucher au statut', async () => {
    const store = useClientsStore()
    const client = await store.creerClient({ name: 'Client A' })
    if ('erreur' in client) throw client

    const resultat = await store.modifierClient(client.id, {
      name: 'Client A Renommé',
      adresse: '1 avenue des Laboratoires',
      secteur: 'dispositif_medical',
      details: 'Nouveau contexte industriel',
    })
    expect('erreur' in resultat).toBe(false)
    if ('erreur' in resultat) return

    expect(resultat.name).toBe('Client A Renommé')
    expect(resultat.adresse).toBe('1 avenue des Laboratoires')
    expect(resultat.secteur).toBe('dispositif_medical')
    expect(resultat.details).toBe('Nouveau contexte industriel')
    expect(resultat.statut).toBe('actif')

    expect(store.clients.find((c) => c.id === client.id)?.name).toBe('Client A Renommé')
  })

  test('modifierClient refuse un client introuvable', async () => {
    const store = useClientsStore()
    const resultat = await store.modifierClient('inconnu', {
      name: 'X',
      adresse: null,
      secteur: null,
      details: null,
    })
    expect(resultat).toEqual({ erreur: 'introuvable' })
  })

  test('supprimerDefinitivement retire le client (admin, TD-046)', async () => {
    const store = useClientsStore()
    const client = await store.creerClient({ name: 'Client A' })
    if ('erreur' in client) throw client

    const resultat = await store.supprimerDefinitivement(client.id, 'Test — nettoyage')
    expect(resultat).toEqual({ ok: true })
    expect(await store.obtenirClient(client.id)).toBeUndefined()
  })
})
