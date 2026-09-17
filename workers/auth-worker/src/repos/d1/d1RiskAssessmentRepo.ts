import type { D1Database } from '../../d1Types'
import type {
  MethodProfileRiskAssessmentEnregistre,
  RiskAssessmentEnregistre,
  RiskAssessmentRepo,
} from '../riskAssessmentRepo'

function ligneVersProfil(l: Record<string, unknown>): MethodProfileRiskAssessmentEnregistre {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    version: l.version as string,
    effectiveDate: l.effective_date as string,
    source: l.source as string,
    origin: l.origin as string,
    echelleMin: l.echelle_min as number,
    echelleMax: l.echelle_max as number,
    seuilAction: l.seuil_action as number,
    createdAt: l.created_at as string,
  }
}

function ligneVersEvaluation(l: Record<string, unknown>): RiskAssessmentEnregistre {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    methodProfileId: l.method_profile_id as string,
    methodProfileVersion: l.method_profile_version as string,
    assetNodeId: l.asset_node_id as string | null,
    parameterId: l.parameter_id as string | null,
    etapeProcessus: l.etape_processus as string,
    modeDefaillance: l.mode_defaillance as string,
    effetDefaillance: l.effet_defaillance as string,
    causePotentielle: l.cause_potentielle as string,
    controleActuel: l.controle_actuel as string,
    severiteInitiale: l.severite_initiale as number | null,
    occurrenceInitiale: l.occurrence_initiale as number | null,
    detectabiliteInitiale: l.detectabilite_initiale as number | null,
    iprInitial: l.ipr_initial as number | null,
    verdictInitial: l.verdict_initial as string | null,
    recommandation: l.recommandation as string | null,
    responsable: l.responsable as string | null,
    dateCible: l.date_cible as string | null,
    actionsMenees: l.actions_menees as string | null,
    severiteResiduelle: l.severite_residuelle as number | null,
    occurrenceResiduelle: l.occurrence_residuelle as number | null,
    detectabiliteResiduelle: l.detectabilite_residuelle as number | null,
    iprResiduel: l.ipr_residuel as number | null,
    verdictResiduel: l.verdict_residuel as string | null,
    auditLog: JSON.parse(l.audit_log as string),
    createdAt: l.created_at as string,
    updatedAt: l.updated_at as string,
  }
}

export class D1RiskAssessmentRepo implements RiskAssessmentRepo {
  constructor(private readonly db: D1Database) {}

  async listerProfils(clientId: string): Promise<MethodProfileRiskAssessmentEnregistre[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM method_profiles_risk_assessment WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersProfil(l as Record<string, unknown>))
  }

  async creerProfil(p: MethodProfileRiskAssessmentEnregistre): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO method_profiles_risk_assessment
          (id, client_id, version, effective_date, source, origin, echelle_min, echelle_max, seuil_action, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        p.id,
        p.clientId,
        p.version,
        p.effectiveDate,
        p.source,
        p.origin,
        p.echelleMin,
        p.echelleMax,
        p.seuilAction,
        p.createdAt,
      )
      .run()
  }

  async listerEvaluations(clientId: string): Promise<RiskAssessmentEnregistre[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM risks_assessment WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersEvaluation(l as Record<string, unknown>))
  }

  async creerEvaluation(e: RiskAssessmentEnregistre): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO risks_assessment
          (id, client_id, method_profile_id, method_profile_version, asset_node_id, parameter_id,
           etape_processus, mode_defaillance, effet_defaillance, cause_potentielle, controle_actuel,
           severite_initiale, occurrence_initiale, detectabilite_initiale, ipr_initial, verdict_initial,
           recommandation, responsable, date_cible, actions_menees,
           severite_residuelle, occurrence_residuelle, detectabilite_residuelle, ipr_residuel, verdict_residuel,
           audit_log, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        e.id,
        e.clientId,
        e.methodProfileId,
        e.methodProfileVersion,
        e.assetNodeId,
        e.parameterId,
        e.etapeProcessus,
        e.modeDefaillance,
        e.effetDefaillance,
        e.causePotentielle,
        e.controleActuel,
        e.severiteInitiale,
        e.occurrenceInitiale,
        e.detectabiliteInitiale,
        e.iprInitial,
        e.verdictInitial,
        e.recommandation,
        e.responsable,
        e.dateCible,
        e.actionsMenees,
        e.severiteResiduelle,
        e.occurrenceResiduelle,
        e.detectabiliteResiduelle,
        e.iprResiduel,
        e.verdictResiduel,
        JSON.stringify(e.auditLog),
        e.createdAt,
        e.updatedAt,
      )
      .run()
  }

  async evaluationParId(id: string): Promise<RiskAssessmentEnregistre | null> {
    const ligne = await this.db
      .prepare('SELECT * FROM risks_assessment WHERE id = ?')
      .bind(id)
      .first()
    return ligne ? ligneVersEvaluation(ligne as Record<string, unknown>) : null
  }

  async remplacerEvaluation(e: RiskAssessmentEnregistre): Promise<void> {
    await this.db
      .prepare(
        `UPDATE risks_assessment
         SET recommandation = ?, responsable = ?, date_cible = ?, actions_menees = ?,
             severite_residuelle = ?, occurrence_residuelle = ?, detectabilite_residuelle = ?,
             ipr_residuel = ?, verdict_residuel = ?, audit_log = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(
        e.recommandation,
        e.responsable,
        e.dateCible,
        e.actionsMenees,
        e.severiteResiduelle,
        e.occurrenceResiduelle,
        e.detectabiliteResiduelle,
        e.iprResiduel,
        e.verdictResiduel,
        JSON.stringify(e.auditLog),
        e.updatedAt,
        e.id,
      )
      .run()
  }
}
