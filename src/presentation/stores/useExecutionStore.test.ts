import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { db } from '../../persistance/db'
import { useExecutionStore } from './useExecutionStore'
import { useTestDefinitionStore } from './useTestDefinitionStore'

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.requirements.clear()
  await db.testObjectives.clear()
  await db.testCandidates.clear()
  await db.tests.clear()
  await db.couvertures.clear()
  await db.executions.clear()
  await db.executionSteps.clear()
  await db.measurements.clear()
  await db.executionEvents.clear()
  await db.qualityEvents.clear()
})

/** Construit un Test approuvé avec 2 étapes, prêt à être exécuté. */
async function creerTestApprouve(clientId: string) {
  const definition = useTestDefinitionStore()
  await definition.charger(clientId)
  const requirement = await definition.creerRequirement(clientId, {
    reference: 'REQ-001',
    titre: 'Exigence',
    description: '',
    assetNodeId: null,
    processId: null,
  })
  const objectif = await definition.creerTestObjective(clientId, {
    requirementId: requirement.id,
    titre: 'Objectif',
    description: '',
  })
  const candidat = await definition.creerTestCandidate(clientId, {
    testObjectiveId: objectif.id,
    titre: 'Candidat',
    description: '',
  })
  await definition.accepterTestCandidate(clientId, candidat.id)
  const test = await definition.creerTestDepuisCandidat(clientId, candidat.id, {
    titre: 'Test IQ',
    description: '',
    etapes: [
      { action: 'Vérifier le point A', resultatAttendu: 'Conforme' },
      { action: 'Vérifier le point B', resultatAttendu: 'Conforme' },
    ],
  })
  if ('erreur' in test) throw new Error('unreachable')
  await definition.approuverTest(clientId, test.id)
  return test
}

describe('useExecutionStore — cycle nominal', () => {
  test('Execution -> ExecutionStep -> Measurement -> clôture avec verdict explicite', async () => {
    const test = await creerTestApprouve('client-1')
    const store = useExecutionStore()
    await store.charger('client-1')

    const execution = await store.demarrerExecution('client-1', {
      testId: test.id,
      assetNodeId: null,
    })
    if ('erreur' in execution) throw new Error('unreachable')
    expect(execution.statut).toBe('en_cours')
    expect(execution.verdict).toBeNull()

    const etape1 = test.etapes[0]
    const etape2 = test.etapes[1]
    if (!etape1 || !etape2) throw new Error('unreachable')

    const resultat1 = await store.enregistrerResultatEtape('client-1', execution.id, {
      testStepId: etape1.id,
      resultat: 'conforme',
      observation: 'RAS',
    })
    if ('erreur' in resultat1) throw new Error('unreachable')

    const mesure = await store.ajouterMesure('client-1', resultat1.id, {
      libelle: 'Température',
      valeur: '21.5',
      unite: '°C',
    })
    if ('erreur' in mesure) throw new Error('unreachable')
    expect(store.mesuresEtape(resultat1.id)).toHaveLength(1)

    await store.enregistrerResultatEtape('client-1', execution.id, {
      testStepId: etape2.id,
      resultat: 'non_conforme',
      observation: 'Écart constaté',
    })
    expect(store.etapesExecution(execution.id)).toHaveLength(2)

    const cloturee = await store.cloturerExecution('client-1', execution.id, 'non_conforme')
    if ('erreur' in cloturee) throw new Error('unreachable')
    expect(cloturee.statut).toBe('terminee')
    expect(cloturee.verdict).toBe('non_conforme')
    expect(cloturee.date_fin).not.toBeNull()
    expect(cloturee.audit_log).toHaveLength(2)
  })
})

describe('useExecutionStore — garde-fous', () => {
  test("une Execution ne peut être créée qu'à partir d'un Test approuvé", async () => {
    const definition = useTestDefinitionStore()
    await definition.charger('client-1')
    const requirement = await definition.creerRequirement('client-1', {
      reference: 'REQ-001',
      titre: 'Exigence',
      description: '',
      assetNodeId: null,
      processId: null,
    })
    const objectif = await definition.creerTestObjective('client-1', {
      requirementId: requirement.id,
      titre: 'Objectif',
      description: '',
    })
    const candidat = await definition.creerTestCandidate('client-1', {
      testObjectiveId: objectif.id,
      titre: 'Candidat',
      description: '',
    })
    await definition.accepterTestCandidate('client-1', candidat.id)
    const testBrouillon = await definition.creerTestDepuisCandidat('client-1', candidat.id, {
      titre: 'Test non approuvé',
      description: '',
      etapes: [],
    })
    if ('erreur' in testBrouillon) throw new Error('unreachable')

    const store = useExecutionStore()
    const resultat = await store.demarrerExecution('client-1', {
      testId: testBrouillon.id,
      assetNodeId: null,
    })
    expect(resultat).toEqual({ erreur: 'test_non_approuve' })
  })

  test('un ExecutionStep ne peut référencer que des test_step_id réels du Test exécuté', async () => {
    const test = await creerTestApprouve('client-1')
    const store = useExecutionStore()
    const execution = await store.demarrerExecution('client-1', {
      testId: test.id,
      assetNodeId: null,
    })
    if ('erreur' in execution) throw new Error('unreachable')

    const resultat = await store.enregistrerResultatEtape('client-1', execution.id, {
      testStepId: 'etape-inconnue',
      resultat: 'conforme',
      observation: '',
    })
    expect(resultat).toEqual({ erreur: 'etape_inconnue' })
  })

  test("une Execution clôturée n'accepte plus aucune écriture — immutabilité post-clôture", async () => {
    const test = await creerTestApprouve('client-1')
    const store = useExecutionStore()
    const execution = await store.demarrerExecution('client-1', {
      testId: test.id,
      assetNodeId: null,
    })
    if ('erreur' in execution) throw new Error('unreachable')
    await store.cloturerExecution('client-1', execution.id, 'conforme')

    const etape = test.etapes[0]
    if (!etape) throw new Error('unreachable')

    const resultatEtape = await store.enregistrerResultatEtape('client-1', execution.id, {
      testStepId: etape.id,
      resultat: 'conforme',
      observation: '',
    })
    expect(resultatEtape).toEqual({ erreur: 'execution_deja_cloturee' })

    const evenement = await store.consignerEvenement('client-1', execution.id, {
      type: 'commentaire',
      description: '',
      qualityEventId: null,
    })
    expect(evenement).toEqual({ erreur: 'execution_deja_cloturee' })

    const secondeCloture = await store.cloturerExecution('client-1', execution.id, 'non_conforme')
    expect(secondeCloture).toEqual({ erreur: 'execution_deja_cloturee' })
  })

  test('un ExecutionEvent ne crée jamais automatiquement de QualityEvent (DEC-002)', async () => {
    const test = await creerTestApprouve('client-1')
    const store = useExecutionStore()
    const execution = await store.demarrerExecution('client-1', {
      testId: test.id,
      assetNodeId: null,
    })
    if ('erreur' in execution) throw new Error('unreachable')

    await store.enregistrerResultatEtape('client-1', execution.id, {
      testStepId: test.etapes[1]?.id ?? '',
      resultat: 'non_conforme',
      observation: 'Écart',
    })
    await store.consignerEvenement('client-1', execution.id, {
      type: 'deviation',
      description: 'Résultat non conforme constaté',
      qualityEventId: null,
    })

    const evenementsQualite = await db.qualityEvents.toArray()
    expect(evenementsQualite).toHaveLength(0)
  })

  test('un ExecutionEvent peut référencer, de façon optionnelle, un QualityEvent déjà existant', async () => {
    const test = await creerTestApprouve('client-1')
    const store = useExecutionStore()
    const execution = await store.demarrerExecution('client-1', {
      testId: test.id,
      assetNodeId: null,
    })
    if ('erreur' in execution) throw new Error('unreachable')

    const evenement = await store.consignerEvenement('client-1', execution.id, {
      type: 'deviation',
      description: 'Écart constaté',
      qualityEventId: 'qe-existant-123',
    })
    if ('erreur' in evenement) throw new Error('unreachable')
    expect(evenement.quality_event_id).toBe('qe-existant-123')
  })
})

describe('useExecutionStore — isolation stricte par client', () => {
  test("les exécutions d'un client ne fuient pas vers un autre", async () => {
    const test = await creerTestApprouve('client-A')
    const store = useExecutionStore()
    await store.charger('client-A')
    await store.demarrerExecution('client-A', { testId: test.id, assetNodeId: null })

    await store.charger('client-B')
    expect(store.executions).toHaveLength(0)
  })
})
