import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import type { Contexte } from '../../../workers/auth-worker/src/routeur'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import { useCSVAssessmentStore } from './useCSVAssessmentStore'

let ctx: Contexte
let demonter: () => void

/** Computer System Assessment migré vers le Worker/D1 (Phase 4c) — un client doit réellement exister pour que `exigerAccesClient` l'autorise. */
async function creerClientDeTest(id: string): Promise<void> {
  await ctx.clientsRepo.creer({
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

beforeEach(async () => {
  setActivePinia(createPinia())
  await reinitialiserAuthDeTest()
  const installation = installerFauxWorkerAuth()
  ctx = installation.ctx
  demonter = installation.demonter
  await connecterAdminDeTest()
  await creerClientDeTest('client-1')
  await creerClientDeTest('client-A')
  await creerClientDeTest('client-B')
})

afterEach(() => {
  demonter()
})

describe('useCSVAssessmentStore — Computer System Assessment (F3)', () => {
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

    await store.charger('client-1')
    expect(store.evaluations).toHaveLength(2)
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
