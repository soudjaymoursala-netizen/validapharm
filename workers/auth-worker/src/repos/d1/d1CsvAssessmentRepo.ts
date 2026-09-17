import type { D1Database } from '../../d1Types'
import type { CSVAssessmentRepo, EvaluationCSVAssessmentEnregistree } from '../csvAssessmentRepo'

function ligneVersEvaluation(l: Record<string, unknown>): EvaluationCSVAssessmentEnregistree {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    assetNodeId: l.asset_node_id as string | null,
    nomSysteme: l.nom_systeme as string,
    categorieGamp5: l.categorie_gamp5 as number,
    justificationCategorie: l.justification_categorie as string,
    pertinenceGxp: Boolean(l.pertinence_gxp),
    pertinenceEresPart11: Boolean(l.pertinence_eres_part11),
    justificationPertinence: l.justification_pertinence as string,
    auditLog: JSON.parse(l.audit_log as string),
    createdAt: l.created_at as string,
    updatedAt: l.updated_at as string,
  }
}

export class D1CsvAssessmentRepo implements CSVAssessmentRepo {
  constructor(private readonly db: D1Database) {}

  async listerEvaluations(clientId: string): Promise<EvaluationCSVAssessmentEnregistree[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM evaluations_csv_assessment WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersEvaluation(l as Record<string, unknown>))
  }

  async creerEvaluation(e: EvaluationCSVAssessmentEnregistree): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO evaluations_csv_assessment
          (id, client_id, asset_node_id, nom_systeme, categorie_gamp5, justification_categorie,
           pertinence_gxp, pertinence_eres_part11, justification_pertinence, audit_log,
           created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        e.id,
        e.clientId,
        e.assetNodeId,
        e.nomSysteme,
        e.categorieGamp5,
        e.justificationCategorie,
        e.pertinenceGxp ? 1 : 0,
        e.pertinenceEresPart11 ? 1 : 0,
        e.justificationPertinence,
        JSON.stringify(e.auditLog),
        e.createdAt,
        e.updatedAt,
      )
      .run()
  }
}
