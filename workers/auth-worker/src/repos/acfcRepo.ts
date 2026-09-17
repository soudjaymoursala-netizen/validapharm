export interface LangueTexte {
  fr?: string
  en?: string
  de?: string
}

export interface QuestionACFCEnregistree {
  id: string
  texte: LangueTexte
  famille?: string
}

export interface MethodProfileACFCEnregistre {
  id: string
  clientId: string
  version: string
  effectiveDate: string
  source: string
  origin: string
  questions: QuestionACFCEnregistree[]
  decisionRule: string
  createdAt: string
}

export interface EntreeJournalAuditEnregistree {
  timestamp: string
  actor: string
  action: string
}

export interface EvaluationACFCEnregistree {
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
 * Dépôt ACFC (F2 du catalogue §10) — Phase 4a du chantier de migration D1
 * (voir docs/CHANTIER-MIGRATION-D1-RECAP.md). La logique métier (calcul du
 * verdict, numéro de version suivant, immuabilité d'un profil déjà créé)
 * reste côté store frontend (`useMethodProfileACFCStore.ts`, déjà testée)
 * — ce dépôt ne fait que persister l'état qu'on lui donne, même
 * discipline que `StructureSystemeRepo`.
 */
export interface ACFCRepo {
  listerProfils(clientId: string): Promise<MethodProfileACFCEnregistre[]>
  creerProfil(profil: MethodProfileACFCEnregistre): Promise<void>
  listerEvaluations(clientId: string): Promise<EvaluationACFCEnregistree[]>
  creerEvaluation(evaluation: EvaluationACFCEnregistree): Promise<void>
}

export class ACFCRepoMemoire implements ACFCRepo {
  private readonly profils = new Map<string, MethodProfileACFCEnregistre>()
  private readonly evaluations = new Map<string, EvaluationACFCEnregistree>()

  async listerProfils(clientId: string): Promise<MethodProfileACFCEnregistre[]> {
    return [...this.profils.values()].filter((p) => p.clientId === clientId)
  }

  async creerProfil(profil: MethodProfileACFCEnregistre): Promise<void> {
    if (this.profils.has(profil.id)) return
    this.profils.set(profil.id, profil)
  }

  async listerEvaluations(clientId: string): Promise<EvaluationACFCEnregistree[]> {
    return [...this.evaluations.values()].filter((e) => e.clientId === clientId)
  }

  async creerEvaluation(evaluation: EvaluationACFCEnregistree): Promise<void> {
    if (this.evaluations.has(evaluation.id)) return
    this.evaluations.set(evaluation.id, evaluation)
  }
}
