import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import { useConnecteursQMSStore } from './useConnecteursQMSStore'

let demonter: () => void

beforeEach(async () => {
  setActivePinia(createPinia())
  await reinitialiserAuthDeTest()
  const installation = installerFauxWorkerAuth()
  demonter = installation.demonter
  await connecterAdminDeTest()
  for (const id of ['client-1', 'client-A', 'client-B']) {
    await installation.ctx.clientsRepo.creer({
      id,
      name: id,
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
  }
})

afterEach(() => {
  demonter()
})

describe('useConnecteursQMSStore — creerConnecteur', () => {
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
    expect(store.connecteurs[0]?.nom).toBe('Veeva Vault site Rennes')
    expect(store.connecteurs[0]?.type).toBe('veeva_vault')
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

    await store.charger('client-1')
    expect(store.connecteurs).toHaveLength(0)
  })
})
