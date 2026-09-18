import type { D1Database } from '../../d1Types'
import type {
  EvidenceEnregistree,
  EvidenceLocationEnregistree,
  EvidenceRepo,
  ProvenanceLinkEnregistre,
} from '../evidenceRepo'

function ligneVersEvidence(l: Record<string, unknown>): EvidenceEnregistree {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    executionId: l.execution_id as string,
    executionStepId: l.execution_step_id as string | null,
    type: l.type as string,
    titre: l.titre as string,
    description: l.description as string,
    horodatage: l.horodatage as string,
    actor: l.actor as string,
  }
}

function ligneVersEvidenceLocation(l: Record<string, unknown>): EvidenceLocationEnregistree {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    evidenceId: l.evidence_id as string,
    systeme: l.systeme as string,
    reference: l.reference as string,
  }
}

function ligneVersProvenanceLink(l: Record<string, unknown>): ProvenanceLinkEnregistre {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    evidenceId: l.evidence_id as string,
    requirementId: l.requirement_id as string,
    createdAt: l.created_at as string,
  }
}

export class D1EvidenceRepo implements EvidenceRepo {
  constructor(private readonly db: D1Database) {}

  async listerEvidences(clientId: string): Promise<EvidenceEnregistree[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM evidences WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersEvidence(l as Record<string, unknown>))
  }

  async creerEvidence(e: EvidenceEnregistree): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO evidences
          (id, client_id, execution_id, execution_step_id, type, titre, description, horodatage, actor)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        e.id,
        e.clientId,
        e.executionId,
        e.executionStepId,
        e.type,
        e.titre,
        e.description,
        e.horodatage,
        e.actor,
      )
      .run()
  }

  async evidenceParId(id: string): Promise<EvidenceEnregistree | null> {
    const ligne = await this.db.prepare('SELECT * FROM evidences WHERE id = ?').bind(id).first()
    return ligne ? ligneVersEvidence(ligne as Record<string, unknown>) : null
  }

  async listerEvidenceLocations(clientId: string): Promise<EvidenceLocationEnregistree[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM evidence_locations WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersEvidenceLocation(l as Record<string, unknown>))
  }

  async creerEvidenceLocation(location: EvidenceLocationEnregistree): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO evidence_locations (id, client_id, evidence_id, systeme, reference)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        location.id,
        location.clientId,
        location.evidenceId,
        location.systeme,
        location.reference,
      )
      .run()
  }

  async listerProvenanceLinks(clientId: string): Promise<ProvenanceLinkEnregistre[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM provenance_links WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersProvenanceLink(l as Record<string, unknown>))
  }

  async creerProvenanceLink(lien: ProvenanceLinkEnregistre): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO provenance_links (id, client_id, evidence_id, requirement_id, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(lien.id, lien.clientId, lien.evidenceId, lien.requirementId, lien.createdAt)
      .run()
  }
}
