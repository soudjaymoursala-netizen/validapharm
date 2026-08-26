import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { db } from '../../persistance/db'
import { useProcessContextStore } from './useProcessContextStore'

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.processes.clear()
  await db.fonctionsActif.clear()
  await db.associationsFonctionAssetNode.clear()
  await db.associationsFonctionProcess.clear()
  await db.manufacturingContexts.clear()
})

describe('useProcessContextStore — Process et Function de base', () => {
  test('crée un Process générique typé', async () => {
    const store = useProcessContextStore()
    await store.charger('client-1')
    const process = await store.creerProcess('client-1', {
      nom: 'Granulation',
      description: 'Procédé de granulation humide',
      type: 'manufacturing',
    })
    expect(process.type).toBe('manufacturing')
    expect(store.processes).toHaveLength(1)
  })

  test('une Function est indépendante du type de Process (EHS, alarme, etc.)', async () => {
    const store = useProcessContextStore()
    await store.charger('client-1')
    const fonction = await store.creerFonction('client-1', {
      nom: 'Alarme haute pression',
      description: 'Fonction de sécurité déclenchant une alarme',
    })
    expect(store.fonctions).toHaveLength(1)
    expect(fonction.nom).toBe('Alarme haute pression')
  })
})

describe('useProcessContextStore — relations N:M Function ⟷ AssetNode / Process', () => {
  test("une même fonction peut être associée à plusieurs nœuds d'actif", async () => {
    const store = useProcessContextStore()
    await store.charger('client-1')
    const fonction = await store.creerFonction('client-1', {
      nom: 'Mesure de température',
      description: '',
    })
    await store.associerFonctionAAssetNode('client-1', fonction.id, 'asset-1')
    await store.associerFonctionAAssetNode('client-1', fonction.id, 'asset-2')
    expect(store.associationsFonctionAssetNode).toHaveLength(2)
  })

  test("un même nœud d'actif peut porter plusieurs fonctions", async () => {
    const store = useProcessContextStore()
    await store.charger('client-1')
    const f1 = await store.creerFonction('client-1', { nom: 'Production', description: '' })
    const f2 = await store.creerFonction('client-1', { nom: 'Nettoyage', description: '' })
    await store.associerFonctionAAssetNode('client-1', f1.id, 'asset-1')
    await store.associerFonctionAAssetNode('client-1', f2.id, 'asset-1')
    expect(store.associationsFonctionAssetNode).toHaveLength(2)
  })

  test('associer deux fois la même paire fonction/nœud est idempotent (pas de doublon)', async () => {
    const store = useProcessContextStore()
    await store.charger('client-1')
    const fonction = await store.creerFonction('client-1', { nom: 'Test', description: '' })
    await store.associerFonctionAAssetNode('client-1', fonction.id, 'asset-1')
    await store.associerFonctionAAssetNode('client-1', fonction.id, 'asset-1')
    expect(store.associationsFonctionAssetNode).toHaveLength(1)
  })

  test('une fonction peut être associée à plusieurs Process', async () => {
    const store = useProcessContextStore()
    await store.charger('client-1')
    const fonction = await store.creerFonction('client-1', { nom: 'Contrôle', description: '' })
    const p1 = await store.creerProcess('client-1', {
      nom: 'Process A',
      description: '',
      type: 'manufacturing',
    })
    const p2 = await store.creerProcess('client-1', {
      nom: 'Process B',
      description: '',
      type: 'packaging',
    })
    await store.associerFonctionAProcess('client-1', fonction.id, p1.id)
    await store.associerFonctionAProcess('client-1', fonction.id, p2.id)
    expect(store.associationsFonctionProcess).toHaveLength(2)
  })
})

describe('useProcessContextStore — scénarios obligatoires "Equipment/SCADA multi-process" et "multi-produit/recette/format" (11_USE_CASES)', () => {
  test('un même équipement numérique (SCADA) sert 2 procédés différents avec des paramètres différents', async () => {
    const store = useProcessContextStore()
    await store.charger('client-1')
    const coating = await store.creerProcess('client-1', {
      nom: 'Enrobage',
      description: '',
      type: 'manufacturing',
    })
    const granulation = await store.creerProcess('client-1', {
      nom: 'Granulation',
      description: '',
      type: 'manufacturing',
    })

    await store.creerManufacturingContext('client-1', {
      assetNodeId: 'scada-305',
      processId: coating.id,
      produit: 'Produit A',
      recette: 'R02',
      format: null,
      configuration: null,
    })
    await store.creerManufacturingContext('client-1', {
      assetNodeId: 'scada-305',
      processId: granulation.id,
      produit: 'Produit B',
      recette: 'R05',
      format: null,
      configuration: null,
    })

    const contextes = store.contextesPourAssetNode('scada-305')
    expect(contextes).toHaveLength(2)
    expect(contextes.map((c) => c.produit).sort()).toEqual(['Produit A', 'Produit B'])
    // Aucune relation ne doit être faussement déduite comme universelle :
    // chaque contexte reste indépendant, avec son propre process/produit/recette.
    expect(contextes.find((c) => c.process_id === coating.id)?.recette).toBe('R02')
    expect(contextes.find((c) => c.process_id === granulation.id)?.recette).toBe('R05')
  })

  test('multi-produit/recette/format sur un même équipement, sans écraser les contextes précédents', async () => {
    const store = useProcessContextStore()
    await store.charger('client-1')
    const process = await store.creerProcess('client-1', {
      nom: 'Compression',
      description: '',
      type: 'manufacturing',
    })

    await store.creerManufacturingContext('client-1', {
      assetNodeId: 'presse-12',
      processId: process.id,
      produit: 'Produit A',
      recette: 'R01',
      format: 'Comprimé 500mg',
      configuration: 'Outillage rond',
    })
    await store.creerManufacturingContext('client-1', {
      assetNodeId: 'presse-12',
      processId: process.id,
      produit: 'Produit A',
      recette: 'R01',
      format: 'Comprimé 250mg',
      configuration: 'Outillage ovale',
    })

    const contextes = store.contextesPourAssetNode('presse-12')
    expect(contextes).toHaveLength(2)
    expect(contextes.map((c) => c.format).sort()).toEqual(['Comprimé 250mg', 'Comprimé 500mg'])
  })

  test('un équipement sans aucun contexte configuré retourne une liste vide, pas une erreur', () => {
    const store = useProcessContextStore()
    expect(store.contextesPourAssetNode('inconnu')).toEqual([])
  })
})

describe('useProcessContextStore — isolation stricte par client', () => {
  test("processes/fonctions/contextes d'un client ne fuient pas vers un autre", async () => {
    const store = useProcessContextStore()
    await store.charger('client-A')
    const process = await store.creerProcess('client-A', {
      nom: 'Process A',
      description: '',
      type: 'manufacturing',
    })
    await store.creerManufacturingContext('client-A', {
      assetNodeId: 'asset-A',
      processId: process.id,
      produit: 'Produit A',
      recette: null,
      format: null,
      configuration: null,
    })

    await store.charger('client-B')
    expect(store.processes).toHaveLength(0)
    expect(store.manufacturingContexts).toHaveLength(0)
  })
})
