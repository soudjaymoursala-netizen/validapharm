import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { db } from '../../persistance/db'
import { useEvidenceStore } from './useEvidenceStore'
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
  await db.evidences.clear()
  await db.evidenceLocations.clear()
  await db.provenanceLinks.clear()
})

/** Construit la chaîne complète jusqu'à un ExecutionStep constaté, sur une Execution non clôturée. */
async function creerExecutionEnCours(clientId: string) {
  const definition = useTestDefinitionStore()
  await definition.charger(clientId)
  const requirement = await definition.creerRequirement(clientId, {
    reference: 'URS-F-001',
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
    etapes: [{ action: 'Vérifier le point A', resultatAttendu: 'Conforme' }],
  })
  if ('erreur' in test) throw new Error('unreachable')
  await definition.approuverTest(clientId, test.id)
  await definition.declarerCouverture(clientId, requirement.id, test.id)

  const execution = useExecutionStore()
  const instance = await execution.demarrerExecution(clientId, {
    testId: test.id,
    assetNodeId: null,
  })
  if ('erreur' in instance) throw new Error('unreachable')

  const etape = test.etapes[0]
  if (!etape) throw new Error('unreachable')
  const resultatEtape = await execution.enregistrerResultatEtape(clientId, instance.id, {
    testStepId: etape.id,
    resultat: 'conforme',
    observation: 'RAS',
  })
  if ('erreur' in resultatEtape) throw new Error('unreachable')

  return { requirement, test, execution: instance, executionStep: resultatEtape }
}

describe('useEvidenceStore — traçabilité complète (Acceptance Criteria Phase 7)', () => {
  test('Requirement -> Test -> Execution -> Evidence, démontrée par preuvesPourRequirement', async () => {
    const { requirement, execution, executionStep } = await creerExecutionEnCours('client-1')
    const store = useEvidenceStore()
    await store.charger('client-1')

    const preuve = await store.enregistrerPreuve('client-1', execution.id, {
      executionStepId: executionStep.id,
      type: 'native',
      titre: 'Constat direct de conformité',
      description: "Lecture de l'exécutant, sans document source",
    })
    if ('erreur' in preuve) throw new Error('unreachable')
    expect(store.preuvesExecution(execution.id)).toHaveLength(1)

    await store.declarerProvenance('client-1', preuve.id, requirement.id)

    const preuvesTracees = store.preuvesPourRequirement(requirement.id)
    expect(preuvesTracees).toHaveLength(1)
    expect(preuvesTracees[0]?.id).toBe(preuve.id)
  })

  test('une Evidence de type document peut être localisée (pointeur, jamais un fichier)', async () => {
    const { execution } = await creerExecutionEnCours('client-1')
    const store = useEvidenceStore()

    const preuve = await store.enregistrerPreuve('client-1', execution.id, {
      executionStepId: null,
      type: 'document',
      titre: 'Export capteur',
      description: '',
    })
    if ('erreur' in preuve) throw new Error('unreachable')

    const localisation = await store.ajouterLocalisation('client-1', preuve.id, {
      systeme: 'drive',
      reference: '/preuves/export-capteur-2026-08-25.csv',
    })
    if ('erreur' in localisation) throw new Error('unreachable')
    expect(store.localisationsPreuve(preuve.id)).toHaveLength(1)
  })
})

describe('useEvidenceStore — garde-fous', () => {
  test('une Evidence ne peut être créée que pour une Execution existante', async () => {
    const store = useEvidenceStore()
    const resultat = await store.enregistrerPreuve('client-1', 'execution-inconnue', {
      executionStepId: null,
      type: 'native',
      titre: '',
      description: '',
    })
    expect(resultat).toEqual({ erreur: 'execution_introuvable' })
  })

  test("une Execution clôturée n'accepte plus aucune nouvelle Evidence", async () => {
    const { execution } = await creerExecutionEnCours('client-1')
    const executionStore = useExecutionStore()
    await executionStore.cloturerExecution('client-1', execution.id, 'conforme')

    const store = useEvidenceStore()
    const resultat = await store.enregistrerPreuve('client-1', execution.id, {
      executionStepId: null,
      type: 'native',
      titre: '',
      description: '',
    })
    expect(resultat).toEqual({ erreur: 'execution_deja_cloturee' })
  })

  test("une Evidence ne peut référencer qu'un ExecutionStep réel de l'Execution", async () => {
    const { execution } = await creerExecutionEnCours('client-1')
    const store = useEvidenceStore()
    const resultat = await store.enregistrerPreuve('client-1', execution.id, {
      executionStepId: 'etape-inconnue',
      type: 'native',
      titre: '',
      description: '',
    })
    expect(resultat).toEqual({ erreur: 'etape_inconnue' })
  })

  test('une EvidenceLocation ne peut être créée que pour une Evidence de type document', async () => {
    const { execution } = await creerExecutionEnCours('client-1')
    const store = useEvidenceStore()
    const preuve = await store.enregistrerPreuve('client-1', execution.id, {
      executionStepId: null,
      type: 'native',
      titre: '',
      description: '',
    })
    if ('erreur' in preuve) throw new Error('unreachable')

    const resultat = await store.ajouterLocalisation('client-1', preuve.id, {
      systeme: 'drive',
      reference: '/inutile',
    })
    expect(resultat).toEqual({ erreur: 'type_non_document' })
  })

  test('déclarer deux fois la même provenance est idempotent', async () => {
    const { requirement, execution } = await creerExecutionEnCours('client-1')
    const store = useEvidenceStore()
    const preuve = await store.enregistrerPreuve('client-1', execution.id, {
      executionStepId: null,
      type: 'native',
      titre: '',
      description: '',
    })
    if ('erreur' in preuve) throw new Error('unreachable')

    await store.declarerProvenance('client-1', preuve.id, requirement.id)
    await store.declarerProvenance('client-1', preuve.id, requirement.id)
    expect(store.provenanceLinks).toHaveLength(1)
  })

  test('un Requirement sans aucune preuve tracée retourne une liste vide, pas une erreur', () => {
    const store = useEvidenceStore()
    expect(store.preuvesPourRequirement('inconnu')).toEqual([])
  })
})

describe('useEvidenceStore — isolation stricte par client', () => {
  test("les preuves d'un client ne fuient pas vers un autre", async () => {
    const { execution } = await creerExecutionEnCours('client-A')
    const store = useEvidenceStore()
    await store.charger('client-A')
    await store.enregistrerPreuve('client-A', execution.id, {
      executionStepId: null,
      type: 'native',
      titre: '',
      description: '',
    })

    await store.charger('client-B')
    expect(store.evidences).toHaveLength(0)
  })
})
