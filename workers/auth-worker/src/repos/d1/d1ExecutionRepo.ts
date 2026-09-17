import type { D1Database } from '../../d1Types'
import type {
  ExecutionEnregistree,
  ExecutionEventEnregistree,
  ExecutionRepo,
  ExecutionStepEnregistree,
  MeasurementEnregistree,
} from '../executionRepo'

function ligneVersExecution(l: Record<string, unknown>): ExecutionEnregistree {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    testId: l.test_id as string,
    assetNodeId: l.asset_node_id as string | null,
    executant: l.executant as string,
    statut: l.statut as string,
    verdict: l.verdict as string | null,
    dateDebut: l.date_debut as string,
    dateFin: l.date_fin as string | null,
    auditLog: JSON.parse(l.audit_log as string),
    createdAt: l.created_at as string,
    updatedAt: l.updated_at as string,
  }
}

function ligneVersExecutionStep(l: Record<string, unknown>): ExecutionStepEnregistree {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    executionId: l.execution_id as string,
    testStepId: l.test_step_id as string,
    resultat: l.resultat as string,
    observation: l.observation as string,
    horodatage: l.horodatage as string,
  }
}

function ligneVersMeasurement(l: Record<string, unknown>): MeasurementEnregistree {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    executionStepId: l.execution_step_id as string,
    libelle: l.libelle as string,
    valeur: l.valeur as string,
    unite: l.unite as string | null,
    horodatage: l.horodatage as string,
  }
}

function ligneVersExecutionEvent(l: Record<string, unknown>): ExecutionEventEnregistree {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    executionId: l.execution_id as string,
    type: l.type as string,
    description: l.description as string,
    qualityEventId: l.quality_event_id as string | null,
    horodatage: l.horodatage as string,
    actor: l.actor as string,
  }
}

export class D1ExecutionRepo implements ExecutionRepo {
  constructor(private readonly db: D1Database) {}

  async listerExecutions(clientId: string): Promise<ExecutionEnregistree[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM executions WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersExecution(l as Record<string, unknown>))
  }

  async creerExecution(e: ExecutionEnregistree): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO executions
          (id, client_id, test_id, asset_node_id, executant, statut, verdict, date_debut, date_fin, audit_log, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        e.id,
        e.clientId,
        e.testId,
        e.assetNodeId,
        e.executant,
        e.statut,
        e.verdict,
        e.dateDebut,
        e.dateFin,
        JSON.stringify(e.auditLog),
        e.createdAt,
        e.updatedAt,
      )
      .run()
  }

  async executionParId(id: string): Promise<ExecutionEnregistree | null> {
    const ligne = await this.db.prepare('SELECT * FROM executions WHERE id = ?').bind(id).first()
    return ligne ? ligneVersExecution(ligne as Record<string, unknown>) : null
  }

  async remplacerExecution(e: ExecutionEnregistree): Promise<void> {
    await this.db
      .prepare(
        `UPDATE executions
         SET statut = ?, verdict = ?, date_fin = ?, audit_log = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(e.statut, e.verdict, e.dateFin, JSON.stringify(e.auditLog), e.updatedAt, e.id)
      .run()
  }

  async listerExecutionSteps(clientId: string): Promise<ExecutionStepEnregistree[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM execution_steps WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersExecutionStep(l as Record<string, unknown>))
  }

  async creerExecutionStep(etape: ExecutionStepEnregistree): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO execution_steps
          (id, client_id, execution_id, test_step_id, resultat, observation, horodatage)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        etape.id,
        etape.clientId,
        etape.executionId,
        etape.testStepId,
        etape.resultat,
        etape.observation,
        etape.horodatage,
      )
      .run()
  }

  async executionStepParId(id: string): Promise<ExecutionStepEnregistree | null> {
    const ligne = await this.db
      .prepare('SELECT * FROM execution_steps WHERE id = ?')
      .bind(id)
      .first()
    return ligne ? ligneVersExecutionStep(ligne as Record<string, unknown>) : null
  }

  async listerMeasurements(clientId: string): Promise<MeasurementEnregistree[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM measurements WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersMeasurement(l as Record<string, unknown>))
  }

  async creerMeasurement(mesure: MeasurementEnregistree): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO measurements
          (id, client_id, execution_step_id, libelle, valeur, unite, horodatage)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        mesure.id,
        mesure.clientId,
        mesure.executionStepId,
        mesure.libelle,
        mesure.valeur,
        mesure.unite,
        mesure.horodatage,
      )
      .run()
  }

  async listerExecutionEvents(clientId: string): Promise<ExecutionEventEnregistree[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM execution_events WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersExecutionEvent(l as Record<string, unknown>))
  }

  async creerExecutionEvent(evenement: ExecutionEventEnregistree): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO execution_events
          (id, client_id, execution_id, type, description, quality_event_id, horodatage, actor)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        evenement.id,
        evenement.clientId,
        evenement.executionId,
        evenement.type,
        evenement.description,
        evenement.qualityEventId,
        evenement.horodatage,
        evenement.actor,
      )
      .run()
  }
}
