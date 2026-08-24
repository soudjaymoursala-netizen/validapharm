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
})
