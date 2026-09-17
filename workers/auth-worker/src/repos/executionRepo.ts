export interface EntreeJournalAuditEnregistree {
  timestamp: string
  actor: string
  action: string
}

export interface ExecutionEnregistree {
  id: string
  clientId: string
  testId: string
  assetNodeId: string | null
  executant: string
  statut: string
  verdict: string | null
  dateDebut: string
  dateFin: string | null
  auditLog: EntreeJournalAuditEnregistree[]
  createdAt: string
  updatedAt: string
}

export interface ExecutionStepEnregistree {
  id: string
  clientId: string
  executionId: string
  testStepId: string
  resultat: string
  observation: string
  horodatage: string
}

export interface MeasurementEnregistree {
  id: string
  clientId: string
  executionStepId: string
  libelle: string
  valeur: string
  unite: string | null
  horodatage: string
}

export interface ExecutionEventEnregistree {
  id: string
  clientId: string
  executionId: string
  type: string
  description: string
  qualityEventId: string | null
  horodatage: string
  actor: string
}

/**
 * Dépôt Execution/ExecutionStep/Measurement/ExecutionEvent (Target
 * Architecture, domaine "Execution") — Phase 6b du chantier de migration
 * D1 (voir docs/CHANTIER-MIGRATION-D1-RECAP.md) : le moteur d'exécution
 * d'un Test approuvé, jamais l'Evidence (Phase 6c). `executionParId`/
 * `remplacerExecution` suivent le patron mutable déjà utilisé pour
 * TestCandidate/Test (Phase 6a) : seule `Execution` est mutable
 * (statut/verdict/date_fin/audit_log via la clôture) — ExecutionStep/
 * Measurement/ExecutionEvent sont immutables une fois créés.
 */
export interface ExecutionRepo {
  listerExecutions(clientId: string): Promise<ExecutionEnregistree[]>
  creerExecution(execution: ExecutionEnregistree): Promise<void>
  executionParId(id: string): Promise<ExecutionEnregistree | null>
  remplacerExecution(execution: ExecutionEnregistree): Promise<void>
  listerExecutionSteps(clientId: string): Promise<ExecutionStepEnregistree[]>
  creerExecutionStep(etape: ExecutionStepEnregistree): Promise<void>
  executionStepParId(id: string): Promise<ExecutionStepEnregistree | null>
  listerMeasurements(clientId: string): Promise<MeasurementEnregistree[]>
  creerMeasurement(mesure: MeasurementEnregistree): Promise<void>
  listerExecutionEvents(clientId: string): Promise<ExecutionEventEnregistree[]>
  creerExecutionEvent(evenement: ExecutionEventEnregistree): Promise<void>
}

export class ExecutionRepoMemoire implements ExecutionRepo {
  private readonly executions = new Map<string, ExecutionEnregistree>()
  private readonly executionSteps = new Map<string, ExecutionStepEnregistree>()
  private readonly measurements = new Map<string, MeasurementEnregistree>()
  private readonly executionEvents = new Map<string, ExecutionEventEnregistree>()

  async listerExecutions(clientId: string): Promise<ExecutionEnregistree[]> {
    return [...this.executions.values()].filter((e) => e.clientId === clientId)
  }

  async creerExecution(execution: ExecutionEnregistree): Promise<void> {
    if (this.executions.has(execution.id)) return
    this.executions.set(execution.id, execution)
  }

  async executionParId(id: string): Promise<ExecutionEnregistree | null> {
    return this.executions.get(id) ?? null
  }

  async remplacerExecution(execution: ExecutionEnregistree): Promise<void> {
    this.executions.set(execution.id, execution)
  }

  async listerExecutionSteps(clientId: string): Promise<ExecutionStepEnregistree[]> {
    return [...this.executionSteps.values()].filter((e) => e.clientId === clientId)
  }

  async creerExecutionStep(etape: ExecutionStepEnregistree): Promise<void> {
    if (this.executionSteps.has(etape.id)) return
    this.executionSteps.set(etape.id, etape)
  }

  async executionStepParId(id: string): Promise<ExecutionStepEnregistree | null> {
    return this.executionSteps.get(id) ?? null
  }

  async listerMeasurements(clientId: string): Promise<MeasurementEnregistree[]> {
    return [...this.measurements.values()].filter((m) => m.clientId === clientId)
  }

  async creerMeasurement(mesure: MeasurementEnregistree): Promise<void> {
    if (this.measurements.has(mesure.id)) return
    this.measurements.set(mesure.id, mesure)
  }

  async listerExecutionEvents(clientId: string): Promise<ExecutionEventEnregistree[]> {
    return [...this.executionEvents.values()].filter((e) => e.clientId === clientId)
  }

  async creerExecutionEvent(evenement: ExecutionEventEnregistree): Promise<void> {
    if (this.executionEvents.has(evenement.id)) return
    this.executionEvents.set(evenement.id, evenement)
  }
}
