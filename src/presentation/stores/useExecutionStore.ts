import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  Execution,
  ExecutionEvent,
  ExecutionStep,
  Measurement,
  ResultatEtapeExecution,
  TypeExecutionEvent,
  VerdictExecution,
} from '../../logique-metier/domaine/types'
import { IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1 } from '../identite/identiteLocale'
import { db } from '../../persistance/db'

export interface NouvelleExecutionInput {
  testId: string
  assetNodeId: string | null
}

export interface NouveauResultatEtapeInput {
  testStepId: string
  resultat: ResultatEtapeExecution
  observation: string
}

export interface NouvelleMesureInput {
  libelle: string
  valeur: string
  unite: string | null
}

export interface NouvelEvenementExecutionInput {
  type: TypeExecutionEvent
  description: string
  qualityEventId: string | null
}

export type ErreurDemarrageExecution = { erreur: 'test_non_approuve' | 'test_introuvable' }
export type ErreurEcritureExecution = {
  erreur: 'execution_introuvable' | 'execution_deja_cloturee' | 'etape_inconnue'
}

/**
 * Store de l'exécution d'un `Test` approuvé (Phase 7b de convergence
 * architecturale — spec dans `docs/convergence/PHASE_7B_EXECUTION_SPEC.md`).
 * Ne couvre que la traçabilité structurée du résultat (Execution →
 * ExecutionStep → Measurement, + ExecutionEvent) — pas l'Evidence
 * documentaire associée (Phase 7c), ni aucune génération IA.
 *
 * @requirement Target Architecture, domaine "Execution"
 */
export const useExecutionStore = defineStore('execution', () => {
  const executions = ref<Execution[]>([])
  const executionSteps = ref<ExecutionStep[]>([])
  const measurements = ref<Measurement[]>([])
  const executionEvents = ref<ExecutionEvent[]>([])
  const enChargement = ref(false)

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      executions.value = await db.executions.where('client_id').equals(clientId).toArray()
      executionSteps.value = await db.executionSteps.where('client_id').equals(clientId).toArray()
      measurements.value = await db.measurements.where('client_id').equals(clientId).toArray()
      executionEvents.value = await db.executionEvents.where('client_id').equals(clientId).toArray()
    } finally {
      enChargement.value = false
    }
  }

  /** Une `Execution` ne peut être créée qu'à partir d'un `Test` au statut `approuve`. */
  async function demarrerExecution(
    clientId: string,
    input: NouvelleExecutionInput,
  ): Promise<Execution | ErreurDemarrageExecution> {
    const test = await db.tests.get(input.testId)
    if (!test || test.client_id !== clientId) return { erreur: 'test_introuvable' }
    if (test.statut !== 'approuve') return { erreur: 'test_non_approuve' }

    const maintenant = new Date().toISOString()
    const execution: Execution = {
      id: crypto.randomUUID(),
      client_id: clientId,
      test_id: input.testId,
      asset_node_id: input.assetNodeId,
      executant: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1,
      statut: 'en_cours',
      verdict: null,
      date_debut: maintenant,
      date_fin: null,
      audit_log: [
        { timestamp: maintenant, actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1, action: 'démarrage' },
      ],
      created_at: maintenant,
      updated_at: maintenant,
    }
    await db.executions.put(execution)
    executions.value = [...executions.value, execution]
    return execution
  }

  /** Immutable une fois créé — une correction passe par un `ExecutionEvent`, jamais une réécriture. */
  async function enregistrerResultatEtape(
    clientId: string,
    executionId: string,
    input: NouveauResultatEtapeInput,
  ): Promise<ExecutionStep | ErreurEcritureExecution> {
    const execution = await db.executions.get(executionId)
    if (!execution || execution.client_id !== clientId) return { erreur: 'execution_introuvable' }
    if (execution.statut === 'terminee') return { erreur: 'execution_deja_cloturee' }

    const test = await db.tests.get(execution.test_id)
    const etapeConnue = test?.etapes.some((e) => e.id === input.testStepId) ?? false
    if (!etapeConnue) return { erreur: 'etape_inconnue' }

    const etape: ExecutionStep = {
      id: crypto.randomUUID(),
      client_id: clientId,
      execution_id: executionId,
      test_step_id: input.testStepId,
      resultat: input.resultat,
      observation: input.observation,
      horodatage: new Date().toISOString(),
    }
    await db.executionSteps.put(etape)
    executionSteps.value = [...executionSteps.value, etape]
    return etape
  }

  async function ajouterMesure(
    clientId: string,
    executionStepId: string,
    input: NouvelleMesureInput,
  ): Promise<Measurement | { erreur: 'etape_execution_introuvable' }> {
    const etape = await db.executionSteps.get(executionStepId)
    if (!etape || etape.client_id !== clientId) return { erreur: 'etape_execution_introuvable' }

    const mesure: Measurement = {
      id: crypto.randomUUID(),
      client_id: clientId,
      execution_step_id: executionStepId,
      libelle: input.libelle,
      valeur: input.valeur,
      unite: input.unite,
      horodatage: new Date().toISOString(),
    }
    await db.measurements.put(mesure)
    measurements.value = [...measurements.value, mesure]
    return mesure
  }

  /**
   * `quality_event_id` référence optionnellement un `QualityEvent` déjà
   * existant — jamais créé automatiquement par ce module (DEC-002).
   */
  async function consignerEvenement(
    clientId: string,
    executionId: string,
    input: NouvelEvenementExecutionInput,
  ): Promise<ExecutionEvent | ErreurEcritureExecution> {
    const execution = await db.executions.get(executionId)
    if (!execution || execution.client_id !== clientId) return { erreur: 'execution_introuvable' }
    if (execution.statut === 'terminee') return { erreur: 'execution_deja_cloturee' }

    const evenement: ExecutionEvent = {
      id: crypto.randomUUID(),
      client_id: clientId,
      execution_id: executionId,
      type: input.type,
      description: input.description,
      quality_event_id: input.qualityEventId,
      horodatage: new Date().toISOString(),
      actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1,
    }
    await db.executionEvents.put(evenement)
    executionEvents.value = [...executionEvents.value, evenement]
    return evenement
  }

  /** Le verdict est toujours fourni explicitement par l'appelant — jamais déduit des ExecutionStep. */
  async function cloturerExecution(
    clientId: string,
    executionId: string,
    verdict: VerdictExecution,
  ): Promise<Execution | ErreurEcritureExecution> {
    const existante = await db.executions.get(executionId)
    if (!existante || existante.client_id !== clientId) return { erreur: 'execution_introuvable' }
    if (existante.statut === 'terminee') return { erreur: 'execution_deja_cloturee' }

    const maintenant = new Date().toISOString()
    const miseAJour: Execution = {
      ...existante,
      statut: 'terminee',
      verdict,
      date_fin: maintenant,
      updated_at: maintenant,
      audit_log: [
        ...existante.audit_log,
        {
          timestamp: maintenant,
          actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1,
          action: `clôture : ${verdict}`,
        },
      ],
    }
    await db.executions.put(miseAJour)
    executions.value = executions.value.map((e) => (e.id === executionId ? miseAJour : e))
    return miseAJour
  }

  function etapesExecution(executionId: string): ExecutionStep[] {
    return executionSteps.value.filter((e) => e.execution_id === executionId)
  }

  function mesuresEtape(executionStepId: string): Measurement[] {
    return measurements.value.filter((m) => m.execution_step_id === executionStepId)
  }

  function evenementsExecution(executionId: string): ExecutionEvent[] {
    return executionEvents.value.filter((e) => e.execution_id === executionId)
  }

  return {
    executions,
    executionSteps,
    measurements,
    executionEvents,
    enChargement,
    charger,
    demarrerExecution,
    enregistrerResultatEtape,
    ajouterMesure,
    consignerEvenement,
    cloturerExecution,
    etapesExecution,
    mesuresEtape,
    evenementsExecution,
  }
})
