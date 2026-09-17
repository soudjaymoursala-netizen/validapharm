export interface EntreeJournalAuditEnregistree {
  timestamp: string
  actor: string
  action: string
}

export interface EvaluationCSVAssessmentEnregistree {
  id: string
  clientId: string
  assetNodeId: string | null
  nomSysteme: string
  categorieGamp5: number
  justificationCategorie: string
  pertinenceGxp: boolean
  pertinenceEresPart11: boolean
  justificationPertinence: string
  auditLog: EntreeJournalAuditEnregistree[]
  createdAt: string
  updatedAt: string
}

/**
 * Dépôt Computer System Assessment (F3 du catalogue §10) — Phase 4c du
 * chantier de migration D1 (voir docs/CHANTIER-MIGRATION-D1-RECAP.md).
 * Contrairement à `ACFCRepo`/`ImpactAssessmentRepo`, pas de MethodProfile :
 * la catégorisation GAMP5 est une grille normative fixe (PIC/S PI 011-3),
 * jamais configurable par client.
 */
export interface CSVAssessmentRepo {
  listerEvaluations(clientId: string): Promise<EvaluationCSVAssessmentEnregistree[]>
  creerEvaluation(evaluation: EvaluationCSVAssessmentEnregistree): Promise<void>
}

export class CSVAssessmentRepoMemoire implements CSVAssessmentRepo {
  private readonly evaluations = new Map<string, EvaluationCSVAssessmentEnregistree>()

  async listerEvaluations(clientId: string): Promise<EvaluationCSVAssessmentEnregistree[]> {
    return [...this.evaluations.values()].filter((e) => e.clientId === clientId)
  }

  async creerEvaluation(evaluation: EvaluationCSVAssessmentEnregistree): Promise<void> {
    if (this.evaluations.has(evaluation.id)) return
    this.evaluations.set(evaluation.id, evaluation)
  }
}
