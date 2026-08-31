import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { db } from '../../persistance/db'
import { useClientsStore } from './useClientsStore'

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.clients.clear()
})

describe('useClientsStore', () => {
  test('creerClient persiste et ajoute au state', async () => {
    const store = useClientsStore()
    const client = await store.creerClient({ name: 'Client A' })

    expect(client.name).toBe('Client A')
    expect(client.id).toBeTruthy()
    expect(store.clients).toEqual([client])

    const enBase = await db.clients.get(client.id)
    expect(enBase).toEqual(client)
  })

  test('chargerClients relit depuis la base, triés par nom', async () => {
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
    const client = await store.creerClient({ name: 'Client A' })

    expect(client.statut).toBe('actif')
    expect(store.clientsActifs.map((c) => c.id)).toContain(client.id)
    expect(store.clientsArchives.map((c) => c.id)).not.toContain(client.id)
  })

  test('archiverClient bascule le statut, jamais une suppression physique (ALCOA+)', async () => {
    const store = useClientsStore()
    const client = await store.creerClient({ name: 'Client A' })

    const resultat = await store.archiverClient(client.id, 'QLD (q.lead@pharmatech.example)')
    expect('erreur' in resultat).toBe(false)
    if ('erreur' in resultat) return

    expect(resultat.statut).toBe('archive')
    expect(resultat.archived_at).not.toBeNull()
    expect(resultat.archived_by).toBe('QLD (q.lead@pharmatech.example)')
    expect(resultat.audit_log.at(-1)?.action).toBe('archivage')

    // Jamais supprimé de la base — juste archivé.
    const enBase = await db.clients.get(client.id)
    expect(enBase).toBeDefined()
    expect(enBase?.statut).toBe('archive')

    expect(store.clientsActifs.map((c) => c.id)).not.toContain(client.id)
    expect(store.clientsArchives.map((c) => c.id)).toContain(client.id)
  })

  test('archiverClient refuse un client déjà archivé', async () => {
    const store = useClientsStore()
    const client = await store.creerClient({ name: 'Client A' })
    await store.archiverClient(client.id, 'QLD')

    const resultat = await store.archiverClient(client.id, 'QLD')
    expect(resultat).toEqual({ erreur: 'deja_archive' })
  })

  test('archiverClient refuse un client introuvable', async () => {
    const store = useClientsStore()
    expect(await store.archiverClient('inconnu', 'QLD')).toEqual({ erreur: 'introuvable' })
  })

  test('desarchiverClient restaure un client archivé, tracé dans audit_log', async () => {
    const store = useClientsStore()
    const client = await store.creerClient({ name: 'Client A' })
    await store.archiverClient(client.id, 'QLD')

    const resultat = await store.desarchiverClient(client.id, 'QLD')
    expect('erreur' in resultat).toBe(false)
    if ('erreur' in resultat) return

    expect(resultat.statut).toBe('actif')
    expect(resultat.archived_at).toBeNull()
    expect(resultat.archived_by).toBeNull()
    expect(resultat.audit_log.at(-1)?.action).toBe('désarchivage')
  })

  test('desarchiverClient refuse un client déjà actif', async () => {
    const store = useClientsStore()
    const client = await store.creerClient({ name: 'Client A' })
    expect(await store.desarchiverClient(client.id, 'QLD')).toEqual({ erreur: 'deja_actif' })
  })
})
