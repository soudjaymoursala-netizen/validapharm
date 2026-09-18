import type { D1Database } from '../../d1Types'
import type { ContentPlanEnregistre, ContentPlanRepo } from '../contentPlanRepo'

function ligneVersContentPlan(l: Record<string, unknown>): ContentPlanEnregistre {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    templateId: l.template_id as string,
    assetNodeId: l.asset_node_id as string | null,
    processId: l.process_id as string | null,
    methodProfileId: l.method_profile_id as string | null,
    methodProfileType: l.method_profile_type as string | null,
    contextSnapshot: l.context_snapshot as string,
    readiness: l.readiness as string,
    statut: l.statut as string,
    auditLog: JSON.parse(l.audit_log as string),
    createdAt: l.created_at as string,
    updatedAt: l.updated_at as string,
  }
}

export class D1ContentPlanRepo implements ContentPlanRepo {
  constructor(private readonly db: D1Database) {}

  async listerContentPlans(clientId: string): Promise<ContentPlanEnregistre[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM content_plans WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersContentPlan(l as Record<string, unknown>))
  }

  async creerContentPlan(p: ContentPlanEnregistre): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO content_plans
          (id, client_id, template_id, asset_node_id, process_id, method_profile_id,
           method_profile_type, context_snapshot, readiness, statut, audit_log, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        p.id,
        p.clientId,
        p.templateId,
        p.assetNodeId,
        p.processId,
        p.methodProfileId,
        p.methodProfileType,
        p.contextSnapshot,
        p.readiness,
        p.statut,
        JSON.stringify(p.auditLog),
        p.createdAt,
        p.updatedAt,
      )
      .run()
  }

  async contentPlanParId(id: string): Promise<ContentPlanEnregistre | null> {
    const ligne = await this.db.prepare('SELECT * FROM content_plans WHERE id = ?').bind(id).first()
    return ligne ? ligneVersContentPlan(ligne as Record<string, unknown>) : null
  }

  async remplacerContentPlan(p: ContentPlanEnregistre): Promise<void> {
    await this.db
      .prepare(
        `UPDATE content_plans
         SET readiness = ?, statut = ?, audit_log = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(p.readiness, p.statut, JSON.stringify(p.auditLog), p.updatedAt, p.id)
      .run()
  }
}
