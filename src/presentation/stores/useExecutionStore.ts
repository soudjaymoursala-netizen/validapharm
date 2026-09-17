import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  ExecutionEventWire,
  ExecutionStepWire,
  ExecutionWire,
  MeasurementWire,
} from '../../connecteurs/auth/AuthApiClient'
import type {
  Execution,
  ExecutionEvent,
  ExecutionStep,
  Measurement,
  ResultatEtapeExecution,
  TypeExecutionEvent,
  VerdictExecution,
} from '../../logique-metier/domaine/types'
import {
  executionEventsAMigrer,
  executionsAMigrer,
  executionStepsAMigrer,
  measurementsAMigrer,
} from '../../persistance/db'
import { useAuthStore } from './useAuthStore'
import { useTestDefinitionStore } from './useTestDefinitionStore'

export function executionWireVersDomaine(wire: ExecutionWire): Execution {
  return {
    id: wire.id,
    client_id: wire.clientId,
    test_id: wire.testId,
    asset_node_id: wire.assetNodeId,
    executant: wire.executant,
    statut: wire.statut as Execution['statut'],
    verdict: wire.verdict as Execution['verdict'],
    date_debut: wire.dateDebut,
    date_fin: wire.dateFin,
    audit_log: wire.auditLog,
    created_at: wire.createdAt,
    updated_at: wire.updatedAt,
  }
}

export function executionStepWireVersDomaine(wire: ExecutionStepWire): ExecutionStep {
  return {
    id: wire.id,
    client_id: wire.clientId,
    execution_id: wire.executionId,
    test_step_id: wire.testStepId,
    resultat: wire.resultat as ResultatEtapeExecution,
    observation: wire.observation,
    horodatage: wire.horodatage,
  }
}

export function measurementWireVersDomaine(wire: MeasurementWire): Measurement {
  return {
    id: wire.id,
    client_id: wire.clientId,
    execution_step_id: wire.executionStepId,
    libelle: wire.libelle,
    valeur: wire.valeur,
    unite: wire.unite,
    horodatage: wire.horodatage,
  }
}

export function executionEventWireVersDomaine(wire: ExecutionEventWire): ExecutionEvent {
  return {
    id: wire.id,
    client_id: wire.clientId,
    execution_id: wire.executionId,
    type: wire.type as TypeExecutionEvent,
    description: wire.description,
    quality_event_id: wire.qualityEventId,
    horodatage: wire.horodatage,
    actor: wire.actor,
  }
}

function executionDomaineVersWire(e: Execution): ExecutionWire {
  return {
    id: e.id,
    clientId: e.client_id,
    testId: e.test_id,
    assetNodeId: e.asset_node_id,
    executant: e.executant,
    statut: e.statut,
    verdict: e.verdict,
    dateDebut: e.date_debut,
    dateFin: e.date_fin,
    auditLog: e.audit_log,
    createdAt: e.created_at,
    updatedAt: e.updated_at,
  }
}

function executionStepDomaineVersWire(e: ExecutionStep): ExecutionStepWire {
  return {
    id: e.id,
    clientId: e.client_id,
    executionId: e.execution_id,
    testStepId: e.test_step_id,
    resultat: e.resultat,
    observation: e.observation,
    horodatage: e.horodatage,
  }
}

function measurementDomaineVersWire(m: Measurement): MeasurementWire {
  return {
    id: m.id,
    clientId: m.client_id,
    executionStepId: m.execution_step_id,
    libelle: m.libelle,
    valeur: m.valeur,
    unite: m.unite,
    horodatage: m.horodatage,
  }
}

function executionEventDomaineVersWire(e: ExecutionEvent): ExecutionEventWire {
  return {
    id: e.id,
    clientId: e.client_id,
    executionId: e.execution_id,
    type: e.type,
    description: e.description,
    qualityEventId: e.quality_event_id,
    horodatage: e.horodatage,
    actor: e.actor,
  }
}

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
 * Store de l'exécution d'un `Test` approuvé (convergence
 * architecturale — spec dans `docs/convergence/PHASE_7B_EXECUTION_SPEC.md`).
 * Ne couvre que la traçabilité structurée du résultat (Execution →
 * ExecutionStep → Measurement, + ExecutionEvent) — pas l'Evidence
 * documentaire associée, ni aucune génération IA.
 *
 * **Phase 6b du chantier de migration D1**
 * (docs/CHANTIER-MIGRATION-D1-RECAP.md) : Cloudflare D1 devient la source
 * de vérité — mêmes routes authentifiées scopées par client que les
 * autres domaines de ce chantier.
 *
 * @requirement Target Architecture, domaine "Execution"
 */
export const useExecutionStore = defineStore('execution', () => {
  const executions = ref<Execution[]>([])
  const executionSteps = ref<ExecutionStep[]>([])
  const measurements = ref<Measurement[]>([])
  const executionEvents = ref<ExecutionEvent[]>([])
  const enChargement = ref(false)

  /** Lève si le relais n'est pas configuré — mutations exigent désormais systématiquement le Worker/D1, même discipline que les autres stores de ce chantier. */
  async function obtenirApi() {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) {
      throw new Error("Relais d'authentification non configuré (Configuration client).")
    }
    return { api, jeton: authStore.jeton }
  }

  /**
   * Envoie au serveur les enregistrements capturés depuis les anciennes
   * tables IndexedDB locales juste avant leur suppression — n'a d'effet
   * réel qu'une seule fois (voir migration Dexie v46, `persistance/db.ts`).
   * Filtre par client avant envoi, même patron que les autres domaines de
   * ce chantier.
   */
  async function migrerExecutionsLocalVersServeur(clientId: string): Promise<void> {
    const executionsDuClient = executionsAMigrer.filter((e) => e.client_id === clientId)
    const executionStepsDuClient = executionStepsAMigrer.filter((e) => e.client_id === clientId)
    const measurementsDuClient = measurementsAMigrer.filter((m) => m.client_id === clientId)
    const executionEventsDuClient = executionEventsAMigrer.filter((e) => e.client_id === clientId)
    if (
      executionsDuClient.length === 0 &&
      executionStepsDuClient.length === 0 &&
      measurementsDuClient.length === 0 &&
      executionEventsDuClient.length === 0
    ) {
      return
    }

    const { api, jeton } = await obtenirApi()
    const resultat = await api.migrerExecutionsLocal(jeton, clientId, {
      executions: executionsDuClient.map(executionDomaineVersWire),
      executionSteps: executionStepsDuClient.map(executionStepDomaineVersWire),
      measurements: measurementsDuClient.map(measurementDomaineVersWire),
      executionEvents: executionEventsDuClient.map(executionEventDomaineVersWire),
    })
    if (!resultat.ok) {
      throw new Error(`Échec de la migration Execution : ${resultat.erreur}`)
    }
    for (const e of executionsDuClient) {
      const index = executionsAMigrer.indexOf(e)
      if (index !== -1) executionsAMigrer.splice(index, 1)
    }
    for (const e of executionStepsDuClient) {
      const index = executionStepsAMigrer.indexOf(e)
      if (index !== -1) executionStepsAMigrer.splice(index, 1)
    }
    for (const m of measurementsDuClient) {
      const index = measurementsAMigrer.indexOf(m)
      if (index !== -1) measurementsAMigrer.splice(index, 1)
    }
    for (const e of executionEventsDuClient) {
      const index = executionEventsAMigrer.indexOf(e)
      if (index !== -1) executionEventsAMigrer.splice(index, 1)
    }
  }

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      try {
        await migrerExecutionsLocalVersServeur(clientId)
      } catch {
        // Nouvel essai au prochain chargement — ne bloque jamais l'affichage normal.
      }
      const { api, jeton } = await obtenirApi()
      const resultat = await api.obtenirExecutions(jeton, clientId)
      if (resultat.ok) {
        executions.value = resultat.donnees.executions.map(executionWireVersDomaine)
        executionSteps.value = resultat.donnees.executionSteps.map(executionStepWireVersDomaine)
        measurements.value = resultat.donnees.measurements.map(measurementWireVersDomaine)
        executionEvents.value = resultat.donnees.executionEvents.map(executionEventWireVersDomaine)
      } else {
        executions.value = []
        executionSteps.value = []
        measurements.value = []
        executionEvents.value = []
      }
    } catch {
      // Panne réseau réelle ou relais non configuré : jamais une exception
      // non gérée, même discipline que les autres stores de ce chantier.
      executions.value = []
      executionSteps.value = []
      measurements.value = []
      executionEvents.value = []
    } finally {
      enChargement.value = false
    }
  }

  /** Une `Execution` ne peut être créée qu'à partir d'un `Test` au statut `approuve` — revérifié aussi côté serveur. */
  async function demarrerExecution(
    clientId: string,
    input: NouvelleExecutionInput,
  ): Promise<Execution | ErreurDemarrageExecution> {
    // Test migré vers le Worker/D1 (Phase 6a du chantier de migration D1)
    // — chargé via le store dédié plutôt qu'un accès Dexie direct, devenu
    // impossible depuis cette migration.
    const testDefinitionStore = useTestDefinitionStore()
    await testDefinitionStore.charger(clientId)
    const test = testDefinitionStore.tests.find((t) => t.id === input.testId)
    if (!test || test.client_id !== clientId) return { erreur: 'test_introuvable' }
    if (test.statut !== 'approuve') return { erreur: 'test_non_approuve' }

    const { api, jeton } = await obtenirApi()
    const resultat = await api.demarrerExecution(jeton, clientId, {
      testId: input.testId,
      assetNodeId: input.assetNodeId,
    })
    if (!resultat.ok) {
      if (resultat.erreur === 'test_introuvable' || resultat.erreur === 'test_non_approuve') {
        return { erreur: resultat.erreur }
      }
      throw new Error(`Échec du démarrage de l'exécution : ${resultat.erreur}`)
    }
    const execution = executionWireVersDomaine(resultat.donnees.execution)
    executions.value = [...executions.value, execution]
    return execution
  }

  /** Immutable une fois créé — une correction passe par un `ExecutionEvent`, jamais une réécriture. */
  async function enregistrerResultatEtape(
    clientId: string,
    executionId: string,
    input: NouveauResultatEtapeInput,
  ): Promise<ExecutionStep | ErreurEcritureExecution> {
    const execution = executions.value.find((e) => e.id === executionId)
    if (!execution || execution.client_id !== clientId) return { erreur: 'execution_introuvable' }
    if (execution.statut === 'terminee') return { erreur: 'execution_deja_cloturee' }

    const { api, jeton } = await obtenirApi()
    const resultat = await api.enregistrerResultatEtape(jeton, clientId, executionId, {
      testStepId: input.testStepId,
      resultat: input.resultat,
      observation: input.observation,
    })
    if (!resultat.ok) {
      if (
        resultat.erreur === 'execution_introuvable' ||
        resultat.erreur === 'execution_deja_cloturee' ||
        resultat.erreur === 'etape_inconnue'
      ) {
        return { erreur: resultat.erreur }
      }
      throw new Error(`Échec de l'enregistrement du résultat d'étape : ${resultat.erreur}`)
    }
    const etape = executionStepWireVersDomaine(resultat.donnees.executionStep)
    executionSteps.value = [...executionSteps.value, etape]
    return etape
  }

  async function ajouterMesure(
    clientId: string,
    executionStepId: string,
    input: NouvelleMesureInput,
  ): Promise<Measurement | { erreur: 'etape_execution_introuvable' }> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.ajouterMesure(jeton, clientId, executionStepId, {
      libelle: input.libelle,
      valeur: input.valeur,
      unite: input.unite,
    })
    if (!resultat.ok) {
      if (resultat.erreur === 'etape_execution_introuvable') return { erreur: resultat.erreur }
      throw new Error(`Échec de l'ajout de la mesure : ${resultat.erreur}`)
    }
    const mesure = measurementWireVersDomaine(resultat.donnees.measurement)
    measurements.value = [...measurements.value, mesure]
    return mesure
  }

  /**
   * `quality_event_id` référence optionnellement un `QualityEvent` déjà
   * existant — jamais créé automatiquement par ce module.
   */
  async function consignerEvenement(
    clientId: string,
    executionId: string,
    input: NouvelEvenementExecutionInput,
  ): Promise<ExecutionEvent | ErreurEcritureExecution> {
    const execution = executions.value.find((e) => e.id === executionId)
    if (!execution || execution.client_id !== clientId) return { erreur: 'execution_introuvable' }
    if (execution.statut === 'terminee') return { erreur: 'execution_deja_cloturee' }

    const { api, jeton } = await obtenirApi()
    const resultat = await api.consignerEvenement(jeton, clientId, executionId, {
      type: input.type,
      description: input.description,
      qualityEventId: input.qualityEventId,
    })
    if (!resultat.ok) {
      if (
        resultat.erreur === 'execution_introuvable' ||
        resultat.erreur === 'execution_deja_cloturee'
      ) {
        return { erreur: resultat.erreur }
      }
      throw new Error(`Échec de la consignation de l'événement : ${resultat.erreur}`)
    }
    const evenement = executionEventWireVersDomaine(resultat.donnees.executionEvent)
    executionEvents.value = [...executionEvents.value, evenement]
    return evenement
  }

  /** Le verdict est toujours fourni explicitement par l'appelant — jamais déduit des ExecutionStep. */
  async function cloturerExecution(
    clientId: string,
    executionId: string,
    verdict: VerdictExecution,
  ): Promise<Execution | ErreurEcritureExecution> {
    const existante = executions.value.find((e) => e.id === executionId)
    if (!existante || existante.client_id !== clientId) return { erreur: 'execution_introuvable' }
    if (existante.statut === 'terminee') return { erreur: 'execution_deja_cloturee' }

    const { api, jeton } = await obtenirApi()
    const resultat = await api.cloturerExecution(jeton, clientId, executionId, verdict)
    if (!resultat.ok) {
      if (
        resultat.erreur === 'execution_introuvable' ||
        resultat.erreur === 'execution_deja_cloturee'
      ) {
        return { erreur: resultat.erreur }
      }
      throw new Error(`Échec de la clôture de l'exécution : ${resultat.erreur}`)
    }
    const miseAJour = executionWireVersDomaine(resultat.donnees.execution)
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
