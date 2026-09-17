export interface LangueTexte {
  fr?: string
  en?: string
  de?: string
}

export interface QuestionImpactAssessmentEnregistree {
  id: string
  texte: LangueTexte
}

export interface MethodProfileImpactAssessmentEnregistre {
  id: string
  clientId: string
  version: string
  effectiveDate: string
  source: string
  origin: string
  questions: QuestionImpactAssessmentEnregistree[]
  decisionRule: string
  createdAt: string
}

export interface EntreeJournalAuditEnregistree {
  timestamp: string
  actor: string
  action: string
}

export interface EvaluationImpactAssessmentEnregistree {
  id: string
  clientId: string
  methodProfileId: string
  methodProfileVersion: string
  assetNodeId: string | null
  nomElement: string
  reponses: Record<string, string>
  verdict: string | null
  auditLog: EntreeJournalAuditEnregistree[]
  createdAt: string
  updatedAt: string
}

/**
 * Dépôt Impact Assessment / System Classification (F1 du catalogue §10) —
 * Phase 4c du chantier de migration D1 (voir
 * docs/CHANTIER-MIGRATION-D1-RECAP.md). La logique métier (calcul du
 * verdict, numéro de version suivant, immuabilité d'un profil déjà créé)
 * reste côté store frontend (`useImpactAssessmentStore.ts`, déjà testée)
 * — ce dépôt ne fait que persister l'état qu'on lui donne, même
 * discipline que `ACFCRepo`.
 */
export interface ImpactAssessmentRepo {
  listerProfils(clientId: string): Promise<MethodProfileImpactAssessmentEnregistre[]>
  creerProfil(profil: MethodProfileImpactAssessmentEnregistre): Promise<void>
  listerEvaluations(clientId: string): Promise<EvaluationImpactAssessmentEnregistree[]>
  creerEvaluation(evaluation: EvaluationImpactAssessmentEnregistree): Promise<void>
}

export class ImpactAssessmentRepoMemoire implements ImpactAssessmentRepo {
  private readonly profils = new Map<string, MethodProfileImpactAssessmentEnregistre>()
  private readonly evaluations = new Map<string, EvaluationImpactAssessmentEnregistree>()

  async listerProfils(clientId: string): Promise<MethodProfileImpactAssessmentEnregistre[]> {
    return [...this.profils.values()].filter((p) => p.clientId === clientId)
  }

  async creerProfil(profil: MethodProfileImpactAssessmentEnregistre): Promise<void> {
    if (this.profils.has(profil.id)) return
    this.profils.set(profil.id, profil)
  }

  async listerEvaluations(clientId: string): Promise<EvaluationImpactAssessmentEnregistree[]> {
    return [...this.evaluations.values()].filter((e) => e.clientId === clientId)
  }

  async creerEvaluation(evaluation: EvaluationImpactAssessmentEnregistree): Promise<void> {
    if (this.evaluations.has(evaluation.id)) return
    this.evaluations.set(evaluation.id, evaluation)
  }
}
