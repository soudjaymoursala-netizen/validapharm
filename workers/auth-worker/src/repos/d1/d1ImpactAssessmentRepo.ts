import type { D1Database } from '../../d1Types'
import type {
  EvaluationImpactAssessmentEnregistree,
  ImpactAssessmentRepo,
  MethodProfileImpactAssessmentEnregistre,
} from '../impactAssessmentRepo'

function ligneVersProfil(l: Record<string, unknown>): MethodProfileImpactAssessmentEnregistre {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    version: l.version as string,
    effectiveDate: l.effective_date as string,
    source: l.source as string,
    origin: l.origin as string,
    questions: JSON.parse(l.questions as string),
    decisionRule: l.decision_rule as string,
    createdAt: l.created_at as string,
  }
}

function ligneVersEvaluation(l: Record<string, unknown>): EvaluationImpactAssessmentEnregistree {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    methodProfileId: l.method_profile_id as string,
    methodProfileVersion: l.method_profile_version as string,
    assetNodeId: l.asset_node_id as string | null,
    nomElement: l.nom_element as string,
    reponses: JSON.parse(l.reponses as string),
    verdict: l.verdict as string | null,
    auditLog: JSON.parse(l.audit_log as string),
    createdAt: l.created_at as string,
    updatedAt: l.updated_at as string,
  }
}

export class D1ImpactAssessmentRepo implements ImpactAssessmentRepo {
  constructor(private readonly db: D1Database) {}

  async listerProfils(clientId: string): Promise<MethodProfileImpactAssessmentEnregistre[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM method_profiles_impact_assessment WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersProfil(l as Record<string, unknown>))
  }

  async creerProfil(p: MethodProfileImpactAssessmentEnregistre): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO method_profiles_impact_assessment
          (id, client_id, version, effective_date, source, origin, questions, decision_rule, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        p.id,
        p.clientId,
        p.version,
        p.effectiveDate,
        p.source,
        p.origin,
        JSON.stringify(p.questions),
        p.decisionRule,
        p.createdAt,
      )
      .run()
  }

  async listerEvaluations(clientId: string): Promise<EvaluationImpactAssessmentEnregistree[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM evaluations_impact_assessment WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersEvaluation(l as Record<string, unknown>))
  }

  async creerEvaluation(e: EvaluationImpactAssessmentEnregistree): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO evaluations_impact_assessment
          (id, client_id, method_profile_id, method_profile_version, asset_node_id, nom_element,
           reponses, verdict, audit_log, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        e.id,
        e.clientId,
        e.methodProfileId,
        e.methodProfileVersion,
        e.assetNodeId,
        e.nomElement,
        JSON.stringify(e.reponses),
        e.verdict,
        JSON.stringify(e.auditLog),
        e.createdAt,
        e.updatedAt,
      )
      .run()
  }
}
