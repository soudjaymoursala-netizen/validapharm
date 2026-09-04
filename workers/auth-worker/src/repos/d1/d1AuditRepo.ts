import type { D1Database } from '../../d1Types'
import type { EntreeAudit } from '../../types'
import type { AuditRepo } from '../auditRepo'

interface LigneAudit {
  id: string
  acteur_user_id: string
  acteur_email: string
  action: string
  target_type: string
  target_id: string
  justification: string | null
  timestamp: string
}

function ligneVersEntree(ligne: LigneAudit): EntreeAudit {
  return {
    id: ligne.id,
    acteurUserId: ligne.acteur_user_id,
    acteurEmail: ligne.acteur_email,
    action: ligne.action,
    targetType: ligne.target_type,
    targetId: ligne.target_id,
    justification: ligne.justification,
    timestamp: ligne.timestamp,
  }
}

/** Implémentation D1 du journal d'audit (TD-046) — append-only, jamais de UPDATE/DELETE. */
export class D1AuditRepo implements AuditRepo {
  constructor(private readonly db: D1Database) {}

  async consigner(e: EntreeAudit): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO audit_log
          (id, acteur_user_id, acteur_email, action, target_type, target_id, justification, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        e.id,
        e.acteurUserId,
        e.acteurEmail,
        e.action,
        e.targetType,
        e.targetId,
        e.justification,
        e.timestamp,
      )
      .run()
  }

  async lister(limite: number): Promise<EntreeAudit[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT ?')
      .bind(limite)
      .all<LigneAudit>()
    return resultat.results.map(ligneVersEntree)
  }
}
