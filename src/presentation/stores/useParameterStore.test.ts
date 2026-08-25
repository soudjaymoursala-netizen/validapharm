import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { db } from '../../persistance/db'
import { useParameterStore } from './useParameterStore'

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.parameters.clear()
  await db.classificationsCriticiteParametre.clear()
  await db.cpps.clear()
  await db.cqas.clear()
})

describe('useParameterStore — Parameter de base', () => {
  test('création simple, rattachable optionnellement à un nœud de Structure Système', async () => {
    const store = useParameterStore()
    await store.charger('client-1')
    const parametre = await store.creerParametre('client-1', {
      nom: 'Température de séchage',
      description: 'Température mesurée en sortie de sécheur',
      unite: '°C',
      assetNodeId: null,
    })
    expect(parametre.id).toBeTruthy()
    expect(store.parametres).toHaveLength(1)
  })
})

describe('useParameterStore — scénario obligatoire "parameter critical but not CPP" (11_USE_CASES)', () => {
  test('classifier un paramètre critique ne crée jamais de CPP', async () => {
    const store = useParameterStore()
    await store.charger('client-1')
    const parametre = await store.creerParametre('client-1', {
      nom: 'Vitesse de mélange',
      description: 'Vitesse du mélangeur',
      unite: 'rpm',
      assetNodeId: null,
    })

    await store.classifierParametre('client-1', {
      parameterId: parametre.id,
      niveau: 'critique',
      contexte: 'Granulation / Produit A / Recette R02',
      justification: 'Impact démontré sur la distribution granulométrique',
    })

    expect(store.classifications).toHaveLength(1)
    expect(store.classifications[0]?.niveau).toBe('critique')
    // Le garde-fou central : aucun CPP ne doit exister après une simple classification.
    expect(store.cpps).toHaveLength(0)

    const cppsEnBase = await db.cpps.where('parameter_id').equals(parametre.id).toArray()
    expect(cppsEnBase).toHaveLength(0)
  })

  test('un paramètre important (pas critique) reste aussi sans CPP', async () => {
    const store = useParameterStore()
    await store.charger('client-1')
    const parametre = await store.creerParametre('client-1', {
      nom: 'Humidité relative de la salle',
      description: 'HR ambiante',
      unite: '%',
      assetNodeId: null,
    })
    await store.classifierParametre('client-1', {
      parameterId: parametre.id,
      niveau: 'important',
      contexte: null,
      justification: 'Suivi de tendance uniquement',
    })
    expect(store.cpps).toHaveLength(0)
  })

  test('un CPP ne peut être créé que par une déclaration explicite et séparée', async () => {
    const store = useParameterStore()
    await store.charger('client-1')
    const parametre = await store.creerParametre('client-1', {
      nom: 'Pression de compression',
      description: 'Pression appliquée en compression',
      unite: 'kN',
      assetNodeId: null,
    })
    await store.classifierParametre('client-1', {
      parameterId: parametre.id,
      niveau: 'critique',
      contexte: 'Compression / Produit B',
      justification: 'Impact sur la dureté du comprimé',
    })

    const cpp = await store.declarerCPP('client-1', {
      parameterId: parametre.id,
      contexte: 'Compression / Produit B',
      justification: 'Confirmé CPP suite étude DoE',
    })

    expect(cpp.actif).toBe(true)
    expect(store.cppsActifs).toHaveLength(1)
    expect(store.cppsActifs[0]?.parameter_id).toBe(parametre.id)
  })
})

describe('useParameterStore — scénario obligatoire "CQA/CPP context change" (11_USE_CASES)', () => {
  test('un CPP déclaré pour un contexte reste inchangé quand un nouveau contexte est ajouté', async () => {
    const store = useParameterStore()
    await store.charger('client-1')
    const parametre = await store.creerParametre('client-1', {
      nom: 'Débit de pulvérisation',
      description: 'Débit de la buse de pulvérisation',
      unite: 'g/min',
      assetNodeId: null,
    })

    const cppR02 = await store.declarerCPP('client-1', {
      parameterId: parametre.id,
      contexte: 'Enrobage / Produit A / Recette R02',
      justification: 'CPP confirmé pour R02',
    })

    // Changement de contexte (nouvelle recette) : nouvelle déclaration,
    // l'ancienne n'est ni mutée ni supprimée.
    const cppR05 = await store.declarerCPP('client-1', {
      parameterId: parametre.id,
      contexte: 'Enrobage / Produit B / Recette R05',
      justification: 'Également CPP pour R05, étude distincte',
    })

    expect(store.cppsActifs).toHaveLength(2)
    const r02Relu = await db.cpps.get(cppR02.id)
    expect(r02Relu?.contexte).toBe('Enrobage / Produit A / Recette R02')
    expect(r02Relu?.actif).toBe(true)
    expect(cppR05.contexte).toBe('Enrobage / Produit B / Recette R05')
  })

  test('désactiver un CPP conserve son historique (pas de suppression, pas de mutation du contexte)', async () => {
    const store = useParameterStore()
    await store.charger('client-1')
    const parametre = await store.creerParametre('client-1', {
      nom: 'Débit de pulvérisation',
      description: 'Débit de la buse de pulvérisation',
      unite: 'g/min',
      assetNodeId: null,
    })
    const cpp = await store.declarerCPP('client-1', {
      parameterId: parametre.id,
      contexte: 'Enrobage / Produit A / Recette R02',
      justification: 'CPP confirmé pour R02',
    })

    const desactive = await store.desactiverCPP(
      'client-1',
      cpp.id,
      'Recette R02 retirée du portefeuille produit',
    )

    expect(desactive?.actif).toBe(false)
    expect(desactive?.contexte).toBe('Enrobage / Produit A / Recette R02')
    expect(desactive?.audit_log).toHaveLength(2)
    expect(store.cppsActifs).toHaveLength(0)

    const relu = await db.cpps.get(cpp.id)
    expect(relu?.actif).toBe(false)
    expect(relu?.contexte).toBe('Enrobage / Produit A / Recette R02')
  })

  test('CQA : même principe de contexte et de désactivation, sans parameter_id requis', async () => {
    const store = useParameterStore()
    await store.charger('client-1')
    const cqa = await store.declarerCQA('client-1', {
      nom: 'Teneur en principe actif',
      description: 'Dosage du principe actif dans le comprimé fini',
      contexte: 'Produit A / Recette R02',
      justification: 'Attribut qualité critique du produit fini',
    })
    expect(cqa.actif).toBe(true)
    expect(store.cqasActifs).toHaveLength(1)

    const desactive = await store.desactiverCQA('client-1', cqa.id, 'Produit A retiré du marché')
    expect(desactive?.actif).toBe(false)
    expect(store.cqasActifs).toHaveLength(0)
    const relu = await db.cqas.get(cqa.id)
    expect(relu?.contexte).toBe('Produit A / Recette R02')
  })
})

describe('useParameterStore — isolation stricte par client', () => {
  test("les paramètres/classifications/CPP/CQA d'un client ne fuient pas vers un autre", async () => {
    const store = useParameterStore()
    await store.charger('client-A')
    const parametre = await store.creerParametre('client-A', {
      nom: 'Paramètre A',
      description: '',
      unite: null,
      assetNodeId: null,
    })
    await store.declarerCPP('client-A', {
      parameterId: parametre.id,
      contexte: 'Contexte A',
      justification: 'Justification A',
    })

    await store.charger('client-B')
    expect(store.parametres).toHaveLength(0)
    expect(store.cpps).toHaveLength(0)
  })
})
