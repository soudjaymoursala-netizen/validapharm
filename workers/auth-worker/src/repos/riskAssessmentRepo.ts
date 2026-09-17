export interface EntreeJournalAuditEnregistree {
  timestamp: string
  actor: string
  action: string
}

export interface MethodProfileRiskAssessmentEnregistre {
  id: string
  clientId: string
  version: string
  effectiveDate: string
  source: string
  origin: string
  echelleMin: number
  echelleMax: number
  seuilAction: number
  createdAt: string
}

export interface RiskAssessmentEnregistre {
  id: string
  clientId: string
  methodProfileId: string
  methodProfileVersion: string
  assetNodeId: string | null
  parameterId: string | null
  etapeProcessus: string
  modeDefaillance: string
  effetDefaillance: string
  causePotentielle: string
  controleActuel: string
  severiteInitiale: number | null
  occurrenceInitiale: number | null
  detectabiliteInitiale: number | null
  iprInitial: number | null
  verdictInitial: string | null
  recommandation: string | null
  responsable: string | null
  dateCible: string | null
  actionsMenees: string | null
  severiteResiduelle: number | null
  occurrenceResiduelle: number | null
  detectabiliteResiduelle: number | null
  iprResiduel: number | null
  verdictResiduel: string | null
  auditLog: EntreeJournalAuditEnregistree[]
  createdAt: string
  updatedAt: string
}

/**
 * Dépôt Risk Assessment (AMDEC, ICH Q9) — Phase 4d du chantier de
 * migration D1 (voir docs/CHANTIER-MIGRATION-D1-RECAP.md). La logique
 * métier (numéro de version suivant, calcul IPR, verdict) reste côté
 * store frontend (`useRiskAssessmentStore.ts`, déjà testée) — ce dépôt ne
 * fait que persister l'état qu'on lui donne, même discipline que
 * `ImpactAssessmentRepo`/`ParametersRepo`. Le cycle à deux temps
 * (évaluation initiale -> action -> évaluation résiduelle) exige, en plus
 * de la création idempotente, une mutation réelle (`remplacerEvaluation`)
 * — même patron que `remplacerCPP`/`remplacerCQA`.
 */
export interface RiskAssessmentRepo {
  listerProfils(clientId: string): Promise<MethodProfileRiskAssessmentEnregistre[]>
  creerProfil(profil: MethodProfileRiskAssessmentEnregistre): Promise<void>
  listerEvaluations(clientId: string): Promise<RiskAssessmentEnregistre[]>
  creerEvaluation(evaluation: RiskAssessmentEnregistre): Promise<void>
  evaluationParId(id: string): Promise<RiskAssessmentEnregistre | null>
  remplacerEvaluation(evaluation: RiskAssessmentEnregistre): Promise<void>
}

export class RiskAssessmentRepoMemoire implements RiskAssessmentRepo {
  private readonly profils = new Map<string, MethodProfileRiskAssessmentEnregistre>()
  private readonly evaluations = new Map<string, RiskAssessmentEnregistre>()

  async listerProfils(clientId: string): Promise<MethodProfileRiskAssessmentEnregistre[]> {
    return [...this.profils.values()].filter((p) => p.clientId === clientId)
  }

  async creerProfil(profil: MethodProfileRiskAssessmentEnregistre): Promise<void> {
    if (this.profils.has(profil.id)) return
    this.profils.set(profil.id, profil)
  }

  async listerEvaluations(clientId: string): Promise<RiskAssessmentEnregistre[]> {
    return [...this.evaluations.values()].filter((e) => e.clientId === clientId)
  }

  async creerEvaluation(evaluation: RiskAssessmentEnregistre): Promise<void> {
    if (this.evaluations.has(evaluation.id)) return
    this.evaluations.set(evaluation.id, evaluation)
  }

  async evaluationParId(id: string): Promise<RiskAssessmentEnregistre | null> {
    return this.evaluations.get(id) ?? null
  }

  async remplacerEvaluation(evaluation: RiskAssessmentEnregistre): Promise<void> {
    this.evaluations.set(evaluation.id, evaluation)
  }
}
