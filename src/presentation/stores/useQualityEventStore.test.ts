import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { db } from '../../persistance/db'
import { useQualityEventStore } from './useQualityEventStore'
import { useProcessContextStore } from './useProcessContextStore'

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.qualityEvents.clear()
  await db.referencesQualityEvent.clear()
  await db.processes.clear()
  await db.manufacturingContexts.clear()
})

describe('useQualityEventStore — création de base', () => {
  test('crée un Change Control interne, statut ouvert par défaut', async () => {
    const store = useQualityEventStore()
    await store.charger('client-1')
    const evenement = await store.creerEvenement('client-1', {
      type: 'change_control',
      titre: 'Changement de fournisseur de joint',
      description: 'Remplacement du joint EPDM par un joint FKM',
      origine: 'interne',
      referenceExterne: null,
      assetNodeId: null,
      processId: null,
      manufacturingContextId: null,
    })
    expect(evenement.statut).toBe('ouvert')
    expect(evenement.audit_log).toHaveLength(1)
    expect(store.evenements).toHaveLength(1)
  })

  test('crée une Deviation externe avec référence au système source, sans dupliquer de contenu', async () => {
    const store = useQualityEventStore()
    await store.charger('client-1')
    const evenement = await store.creerEvenement('client-1', {
      type: 'deviation',
      titre: 'Écart de température hors plage',
      description: 'Référencé, contenu officiel géré dans le QMS externe',
      origine: 'externe',
      referenceExterne: { systeme: 'TrackWise', identifiant: 'DEV-2026-04582' },
      assetNodeId: null,
      processId: null,
      manufacturingContextId: null,
    })
    expect(evenement.origine).toBe('externe')
    expect(evenement.reference_externe).toEqual({
      systeme: 'TrackWise',
      identifiant: 'DEV-2026-04582',
    })
  })
})

describe('useQualityEventStore — changement de statut', () => {
  test('changerStatut journalise le changement', async () => {
    const store = useQualityEventStore()
    await store.charger('client-1')
    const evenement = await store.creerEvenement('client-1', {
      type: 'capa',
      titre: 'Action corrective',
      description: '',
      origine: 'interne',
      referenceExterne: null,
      assetNodeId: null,
      processId: null,
      manufacturingContextId: null,
    })
    const misAJour = await store.changerStatut('client-1', evenement.id, 'cloture')
    expect(misAJour?.statut).toBe('cloture')
    expect(misAJour?.audit_log).toHaveLength(2)
  })
})

describe('useQualityEventStore — références optionnelles entre événements (E2 : jamais un workflow obligatoire)', () => {
  test('Deviation -> Investigation -> CAPA peut être chaînée par référence', async () => {
    const store = useQualityEventStore()
    await store.charger('client-1')
    const deviation = await store.creerEvenement('client-1', {
      type: 'deviation',
      titre: 'Déviation A',
      description: '',
      origine: 'interne',
      referenceExterne: null,
      assetNodeId: null,
      processId: null,
      manufacturingContextId: null,
    })
    const investigation = await store.creerEvenement('client-1', {
      type: 'investigation',
      titre: 'Investigation de la déviation A',
      description: '',
      origine: 'interne',
      referenceExterne: null,
      assetNodeId: null,
      processId: null,
      manufacturingContextId: null,
    })
    const capa = await store.creerEvenement('client-1', {
      type: 'capa',
      titre: 'CAPA suite investigation',
      description: '',
      origine: 'interne',
      referenceExterne: null,
      assetNodeId: null,
      processId: null,
      manufacturingContextId: null,
    })

    await store.referencerEvenement('client-1', deviation.id, investigation.id)
    await store.referencerEvenement('client-1', investigation.id, capa.id)

    expect(store.referencesDepuis(deviation.id)).toHaveLength(1)
    expect(store.referencesDepuis(investigation.id)).toHaveLength(1)
    expect(store.referencesDepuis(capa.id)).toHaveLength(0)
  })

  test('une déviation mineure peut se clôturer sans aucune référence (pas de workflow obligatoire)', async () => {
    const store = useQualityEventStore()
    await store.charger('client-1')
    const deviation = await store.creerEvenement('client-1', {
      type: 'deviation',
      titre: 'Déviation mineure',
      description: '',
      origine: 'interne',
      referenceExterne: null,
      assetNodeId: null,
      processId: null,
      manufacturingContextId: null,
    })
    const cloturee = await store.changerStatut('client-1', deviation.id, 'cloture')
    expect(cloturee?.statut).toBe('cloture')
    expect(store.referencesDepuis(deviation.id)).toHaveLength(0)
  })

  test('référencer deux fois la même paire est idempotent', async () => {
    const store = useQualityEventStore()
    await store.charger('client-1')
    const a = await store.creerEvenement('client-1', {
      type: 'audit_finding',
      titre: 'Constat audit',
      description: '',
      origine: 'interne',
      referenceExterne: null,
      assetNodeId: null,
      processId: null,
      manufacturingContextId: null,
    })
    const b = await store.creerEvenement('client-1', {
      type: 'capa',
      titre: 'CAPA suite constat',
      description: '',
      origine: 'interne',
      referenceExterne: null,
      assetNodeId: null,
      processId: null,
      manufacturingContextId: null,
    })
    await store.referencerEvenement('client-1', a.id, b.id)
    await store.referencerEvenement('client-1', a.id, b.id)
    expect(store.referencesDepuis(a.id)).toHaveLength(1)
  })
})

describe('scénario obligatoire "external deviation/change ne bloque pas une activité indépendante" (11_USE_CASES)', () => {
  test("un Change Control externe ouvert référençant un nœud n'empêche pas la création d'un ManufacturingContext indépendant sur ce même nœud", async () => {
    const qualityEventStore = useQualityEventStore()
    const processContextStore = useProcessContextStore()
    await qualityEventStore.charger('client-1')
    await processContextStore.charger('client-1')

    const process = await processContextStore.creerProcess('client-1', {
      nom: 'Granulation',
      description: '',
      type: 'manufacturing',
    })

    // Change Control EXTERNE, ouvert, référençant le même équipement.
    await qualityEventStore.creerEvenement('client-1', {
      type: 'change_control',
      titre: 'Changement piloté hors ValidaPharm',
      description: '',
      origine: 'externe',
      referenceExterne: { systeme: 'Veeva Vault', identifiant: 'CC-2026-00912' },
      assetNodeId: 'granulateur-01',
      processId: process.id,
      manufacturingContextId: null,
    })

    // Aucun garde-fou de blocage n'existe dans ce module : l'opération
    // indépendante sur le même équipement doit réussir normalement.
    const contexte = await processContextStore.creerManufacturingContext('client-1', {
      assetNodeId: 'granulateur-01',
      processId: process.id,
      produit: 'Produit A',
      recette: 'R01',
      format: null,
      configuration: null,
    })

    expect(contexte.id).toBeTruthy()
    expect(processContextStore.contextesPourAssetNode('granulateur-01')).toHaveLength(1)
  })
})

describe('useQualityEventStore — isolation stricte par client', () => {
  test("les événements d'un client ne fuient pas vers un autre", async () => {
    const store = useQualityEventStore()
    await store.charger('client-A')
    await store.creerEvenement('client-A', {
      type: 'capa',
      titre: 'CAPA A',
      description: '',
      origine: 'interne',
      referenceExterne: null,
      assetNodeId: null,
      processId: null,
      manufacturingContextId: null,
    })
    await store.charger('client-B')
    expect(store.evenements).toHaveLength(0)
  })
})
