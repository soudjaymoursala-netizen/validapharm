import type { D1Database } from '../../d1Types'
import type {
  QualityEventEnregistre,
  QualityEventRepo,
  ReferenceQualityEventEnregistree,
} from '../qualityEventRepo'

function ligneVersEvenement(l: Record<string, unknown>): QualityEventEnregistre {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    type: l.type as string,
    titre: l.titre as string,
    description: l.description as string,
    origine: l.origine as string,
    referenceExterne: l.reference_externe ? JSON.parse(l.reference_externe as string) : null,
    assetNodeId: l.asset_node_id as string | null,
    processId: l.process_id as string | null,
    manufacturingContextId: l.manufacturing_context_id as string | null,
    statut: l.statut as string,
    auditLog: JSON.parse(l.audit_log as string),
    createdAt: l.created_at as string,
    updatedAt: l.updated_at as string,
  }
}

function ligneVersReference(l: Record<string, unknown>): ReferenceQualityEventEnregistree {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    qualityEventSourceId: l.quality_event_source_id as string,
    qualityEventCibleId: l.quality_event_cible_id as string,
    createdAt: l.created_at as string,
  }
}

export class D1QualityEventRepo implements QualityEventRepo {
  constructor(private readonly db: D1Database) {}

  async listerEvenements(clientId: string): Promise<QualityEventEnregistre[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM quality_events WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersEvenement(l as Record<string, unknown>))
  }

  async creerEvenement(e: QualityEventEnregistre): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO quality_events
          (id, client_id, type, titre, description, origine, reference_externe, asset_node_id,
           process_id, manufacturing_context_id, statut, audit_log, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        e.id,
        e.clientId,
        e.type,
        e.titre,
        e.description,
        e.origine,
        e.referenceExterne ? JSON.stringify(e.referenceExterne) : null,
        e.assetNodeId,
        e.processId,
        e.manufacturingContextId,
        e.statut,
        JSON.stringify(e.auditLog),
        e.createdAt,
        e.updatedAt,
      )
      .run()
  }

  async evenementParId(id: string): Promise<QualityEventEnregistre | null> {
    const ligne = await this.db
      .prepare('SELECT * FROM quality_events WHERE id = ?')
      .bind(id)
      .first()
    return ligne ? ligneVersEvenement(ligne as Record<string, unknown>) : null
  }

  async remplacerEvenement(e: QualityEventEnregistre): Promise<void> {
    await this.db
      .prepare(
        `UPDATE quality_events
         SET statut = ?, audit_log = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(e.statut, JSON.stringify(e.auditLog), e.updatedAt, e.id)
      .run()
  }

  async listerReferences(clientId: string): Promise<ReferenceQualityEventEnregistree[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM references_quality_event WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersReference(l as Record<string, unknown>))
  }

  async creerReference(r: ReferenceQualityEventEnregistree): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO references_quality_event
          (id, client_id, quality_event_source_id, quality_event_cible_id, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(r.id, r.clientId, r.qualityEventSourceId, r.qualityEventCibleId, r.createdAt)
      .run()
  }
}
