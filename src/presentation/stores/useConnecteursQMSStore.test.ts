import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { db } from '../../persistance/db'
import { useConnecteursQMSStore } from './useConnecteursQMSStore'

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.connectors.clear()
})

describe('useConnecteursQMSStore — creerConnecteur (URS-F-090 à 090ter)', () => {
  test('crée un connecteur Veeva Vault et le persiste', async () => {
    const store = useConnecteursQMSStore()
    await store.charger('client-1')

    await store.creerConnecteur('client-1', {
      nom: 'Veeva Vault site Rennes',
      actif: true,
      type: 'veeva_vault',
      config: {
        vaultDns: 'rennes.veevavault.com',
        nomUtilisateur: 'qa-rennes',
        motDePasse: 's3cret',
      },
    })

    expect(store.connecteurs).toHaveLength(1)
    const relu = await db.connectors.toArray()
    expect(relu).toHaveLength(1)
    expect(relu[0]?.nom).toBe('Veeva Vault site Rennes')
    expect(relu[0]?.type).toBe('veeva_vault')
  })

  test('isolation stricte par client', async () => {
    const store = useConnecteursQMSStore()
    await store.charger('client-A')
    await store.creerConnecteur('client-A', {
      nom: 'Connecteur A',
      actif: true,
      type: 'dossier_reseau',
      config: { chemin: '\\\\serveur\\partage' },
    })

    await store.charger('client-B')
    expect(store.connecteurs).toHaveLength(0)

    await store.charger('client-A')
    expect(store.connecteurs).toHaveLength(1)
  })
})

describe('useConnecteursQMSStore — basculerActif', () => {
  test('bascule actif -> inactif -> actif', async () => {
    const store = useConnecteursQMSStore()
    await store.charger('client-1')
    await store.creerConnecteur('client-1', {
      nom: 'EDMS',
      actif: true,
      type: 'edms_generique',
      config: { url: 'https://edms.example.com', jeton: 'jeton' },
    })
    const id = store.connecteurs[0]?.id ?? ''

    await store.basculerActif(id)
    expect(store.connecteurs.find((c) => c.id === id)?.actif).toBe(false)

    await store.basculerActif(id)
    expect(store.connecteurs.find((c) => c.id === id)?.actif).toBe(true)
  })
})

describe('useConnecteursQMSStore — supprimerConnecteur', () => {
  test('retire le connecteur de la liste et de la base', async () => {
    const store = useConnecteursQMSStore()
    await store.charger('client-1')
    await store.creerConnecteur('client-1', {
      nom: 'SharePoint',
      actif: true,
      type: 'sharepoint',
      config: { siteUrl: 'https://sharepoint.example.com', jeton: 'jeton' },
    })
    const id = store.connecteurs[0]?.id ?? ''

    await store.supprimerConnecteur(id)

    expect(store.connecteurs).toHaveLength(0)
    expect(await db.connectors.get(id)).toBeUndefined()
  })
})
