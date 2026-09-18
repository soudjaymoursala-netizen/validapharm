export interface EntreeJournalAuditEnregistree {
  timestamp: string
  actor: string
  action: string
}

export interface ContentPlanEnregistre {
  id: string
  clientId: string
  templateId: string
  assetNodeId: string | null
  processId: string | null
  methodProfileId: string | null
  methodProfileType: string | null
  contextSnapshot: string
  readiness: string
  statut: string
  auditLog: EntreeJournalAuditEnregistree[]
  createdAt: string
  updatedAt: string
}

/**
 * Dépôt ContentPlan (Target Architecture, domaine "Deliverable Engine")
 * — Phase 7b du chantier de migration D1 (voir
 * docs/CHANTIER-MIGRATION-D1-RECAP.md) : deuxième brique de la Phase 7.
 * `contentPlanParId`/`remplacerContentPlan` suivent le patron mutable
 * déjà utilisé pour KnowledgeItem/Conflict (Phase 7a) : `remplacer*` ne
 * met à jour que `statut`/`readiness`/`auditLog`/`updatedAt` —
 * `contextSnapshot` reste figé une seule fois à la création.
 */
export interface ContentPlanRepo {
  listerContentPlans(clientId: string): Promise<ContentPlanEnregistre[]>
  creerContentPlan(plan: ContentPlanEnregistre): Promise<void>
  contentPlanParId(id: string): Promise<ContentPlanEnregistre | null>
  remplacerContentPlan(plan: ContentPlanEnregistre): Promise<void>
}

export class ContentPlanRepoMemoire implements ContentPlanRepo {
  private readonly contentPlans = new Map<string, ContentPlanEnregistre>()

  async listerContentPlans(clientId: string): Promise<ContentPlanEnregistre[]> {
    return [...this.contentPlans.values()].filter((p) => p.clientId === clientId)
  }

  async creerContentPlan(plan: ContentPlanEnregistre): Promise<void> {
    if (this.contentPlans.has(plan.id)) return
    this.contentPlans.set(plan.id, plan)
  }

  async contentPlanParId(id: string): Promise<ContentPlanEnregistre | null> {
    return this.contentPlans.get(id) ?? null
  }

  async remplacerContentPlan(plan: ContentPlanEnregistre): Promise<void> {
    this.contentPlans.set(plan.id, plan)
  }
}
