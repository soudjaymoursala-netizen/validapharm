import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { db } from '../../persistance/db'
import { useCSVAssessmentStore } from './useCSVAssessmentStore'

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.evaluationsCSVAssessment.clear()
})

describe('useCSVAssessmentStore — Computer System Assessment (F3, URS-F-050)', () => {
  test('crée une évaluation avec une catégorie GAMP5 parmi les 5 fixes, justifiée', async () => {
    const store = useCSVAssessmentStore()
    await store.charger('client-1')
    const evaluation = await store.creerEvaluation('client-1', {
      nomSysteme: 'SCADA-305',
      assetNodeId: null,
      categorieGamp5: 4,
      justificationCategorie: 'Logiciel configurable standard, paramétrage sans code custom',
      pertinenceGxp: true,
      pertinenceEresPart11: true,
      justificationPertinence: 'Génère des enregistrements électroniques de lot',
    })

    expect(evaluation.categorie_gamp5).toBe(4)
    expect(evaluation.pertinence_gxp).toBe(true)
    expect(store.evaluations).toHaveLength(1)
    expect(evaluation.audit_log).toHaveLength(1)
  })

  test('un système peut être non pertinent GxP (catégorie 1, infrastructure pure)', async () => {
    const store = useCSVAssessmentStore()
    await store.charger('client-1')
    const evaluation = await store.creerEvaluation('client-1', {
      nomSysteme: 'Switch réseau backbone',
      assetNodeId: null,
      categorieGamp5: 1,
      justificationCategorie: 'Infrastructure réseau générique, aucune logique métier',
      pertinenceGxp: false,
      pertinenceEresPart11: false,
      justificationPertinence: 'Ne stocke ni ne traite aucune donnée GxP',
    })
    expect(evaluation.pertinence_gxp).toBe(false)
    expect(evaluation.pertinence_eres_part11).toBe(false)
  })

  test('deux évaluations successives persistent toutes les deux (régression DataCloneError)', async () => {
    const store = useCSVAssessmentStore()
    await store.charger('client-1')
    await store.creerEvaluation('client-1', {
      nomSysteme: 'Système 1',
      assetNodeId: null,
      categorieGamp5: 3,
      justificationCategorie: 'Standard non configuré',
      pertinenceGxp: false,
      pertinenceEresPart11: false,
      justificationPertinence: 'N/A',
    })
    await store.creerEvaluation('client-1', {
      nomSysteme: 'Système 2',
      assetNodeId: null,
      categorieGamp5: 5,
      justificationCategorie: 'Sur mesure',
      pertinenceGxp: true,
      pertinenceEresPart11: false,
      justificationPertinence: 'Calculs métier spécifiques',
    })
    expect(store.evaluations).toHaveLength(2)
    const relues = await db.evaluationsCSVAssessment.where('client_id').equals('client-1').toArray()
    expect(relues).toHaveLength(2)
  })
})

describe('useCSVAssessmentStore — isolation stricte par client', () => {
  test("les évaluations d'un client ne fuient pas vers un autre", async () => {
    const store = useCSVAssessmentStore()
    await store.charger('client-A')
    await store.creerEvaluation('client-A', {
      nomSysteme: 'Système A',
      assetNodeId: null,
      categorieGamp5: 4,
      justificationCategorie: 'Test',
      pertinenceGxp: true,
      pertinenceEresPart11: false,
      justificationPertinence: 'Test',
    })
    await store.charger('client-B')
    expect(store.evaluations).toHaveLength(0)
  })
})
