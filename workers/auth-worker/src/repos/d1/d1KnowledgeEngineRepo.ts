import type { D1Database } from '../../d1Types'
import type {
  ConfirmationEnregistree,
  ConflictEnregistre,
  ExtractionEnregistree,
  ExtractionItemEnregistre,
  KnowledgeEngineRepo,
  KnowledgeItemEnregistre,
  KnowledgeRelationEnregistree,
  SourceEnregistree,
  SourceLocationEnregistree,
  SourceVersionEnregistree,
} from '../knowledgeEngineRepo'

function ligneVersSource(l: Record<string, unknown>): SourceEnregistree {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    type: l.type as string,
    titre: l.titre as string,
    createdAt: l.created_at as string,
  }
}

function ligneVersSourceLocation(l: Record<string, unknown>): SourceLocationEnregistree {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    sourceId: l.source_id as string,
    systeme: l.systeme as string,
    reference: l.reference as string,
  }
}

function ligneVersSourceVersion(l: Record<string, unknown>): SourceVersionEnregistree {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    sourceId: l.source_id as string,
    numeroVersion: l.numero_version as number,
    createdAt: l.created_at as string,
  }
}

function ligneVersExtraction(l: Record<string, unknown>): ExtractionEnregistree {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    sourceVersionId: l.source_version_id as string,
    methode: l.methode as string,
    horodatage: l.horodatage as string,
  }
}

function ligneVersExtractionItem(l: Record<string, unknown>): ExtractionItemEnregistre {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    extractionId: l.extraction_id as string,
    contenu: l.contenu as string,
    position: l.position as number,
  }
}

function ligneVersKnowledgeItem(l: Record<string, unknown>): KnowledgeItemEnregistre {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    extractionItemId: l.extraction_item_id as string,
    libelle: l.libelle as string,
    valeurInterpretee: l.valeur_interpretee as string,
    statut: l.statut as string,
    validePar: l.valide_par as string | null,
    auditLog: JSON.parse(l.audit_log as string),
    createdAt: l.created_at as string,
    updatedAt: l.updated_at as string,
  }
}

function ligneVersConfirmation(l: Record<string, unknown>): ConfirmationEnregistree {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    knowledgeItemId: l.knowledge_item_id as string,
    decision: l.decision as string,
    confirmePar: l.confirme_par as string,
    horodatage: l.horodatage as string,
  }
}

function ligneVersKnowledgeRelation(l: Record<string, unknown>): KnowledgeRelationEnregistree {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    knowledgeItemSourceId: l.knowledge_item_source_id as string,
    knowledgeItemCibleId: l.knowledge_item_cible_id as string,
    type: l.type as string,
    createdAt: l.created_at as string,
  }
}

function ligneVersConflict(l: Record<string, unknown>): ConflictEnregistre {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    knowledgeItemSourceId: l.knowledge_item_source_id as string,
    knowledgeItemCibleId: l.knowledge_item_cible_id as string,
    description: l.description as string,
    statut: l.statut as string,
    resolution: l.resolution as string | null,
    createdAt: l.created_at as string,
  }
}

export class D1KnowledgeEngineRepo implements KnowledgeEngineRepo {
  constructor(private readonly db: D1Database) {}

  async listerSources(clientId: string): Promise<SourceEnregistree[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM sources WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersSource(l as Record<string, unknown>))
  }

  async creerSource(s: SourceEnregistree): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO sources (id, client_id, type, titre, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(s.id, s.clientId, s.type, s.titre, s.createdAt)
      .run()
  }

  async sourceParId(id: string): Promise<SourceEnregistree | null> {
    const ligne = await this.db.prepare('SELECT * FROM sources WHERE id = ?').bind(id).first()
    return ligne ? ligneVersSource(ligne as Record<string, unknown>) : null
  }

  async listerSourceLocations(clientId: string): Promise<SourceLocationEnregistree[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM source_locations WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersSourceLocation(l as Record<string, unknown>))
  }

  async creerSourceLocation(loc: SourceLocationEnregistree): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO source_locations (id, client_id, source_id, systeme, reference)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(loc.id, loc.clientId, loc.sourceId, loc.systeme, loc.reference)
      .run()
  }

  async listerSourceVersions(clientId: string): Promise<SourceVersionEnregistree[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM source_versions WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersSourceVersion(l as Record<string, unknown>))
  }

  async creerSourceVersion(v: SourceVersionEnregistree): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO source_versions (id, client_id, source_id, numero_version, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(v.id, v.clientId, v.sourceId, v.numeroVersion, v.createdAt)
      .run()
  }

  async sourceVersionParId(id: string): Promise<SourceVersionEnregistree | null> {
    const ligne = await this.db
      .prepare('SELECT * FROM source_versions WHERE id = ?')
      .bind(id)
      .first()
    return ligne ? ligneVersSourceVersion(ligne as Record<string, unknown>) : null
  }

  async listerExtractions(clientId: string): Promise<ExtractionEnregistree[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM extractions WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersExtraction(l as Record<string, unknown>))
  }

  async creerExtraction(e: ExtractionEnregistree): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO extractions (id, client_id, source_version_id, methode, horodatage)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(e.id, e.clientId, e.sourceVersionId, e.methode, e.horodatage)
      .run()
  }

  async extractionParId(id: string): Promise<ExtractionEnregistree | null> {
    const ligne = await this.db.prepare('SELECT * FROM extractions WHERE id = ?').bind(id).first()
    return ligne ? ligneVersExtraction(ligne as Record<string, unknown>) : null
  }

  async listerExtractionItems(clientId: string): Promise<ExtractionItemEnregistre[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM extraction_items WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersExtractionItem(l as Record<string, unknown>))
  }

  async creerExtractionItem(item: ExtractionItemEnregistre): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO extraction_items (id, client_id, extraction_id, contenu, position)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(item.id, item.clientId, item.extractionId, item.contenu, item.position)
      .run()
  }

  async listerKnowledgeItems(clientId: string): Promise<KnowledgeItemEnregistre[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM knowledge_items WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersKnowledgeItem(l as Record<string, unknown>))
  }

  async creerKnowledgeItem(item: KnowledgeItemEnregistre): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO knowledge_items
          (id, client_id, extraction_item_id, libelle, valeur_interpretee, statut,
           valide_par, audit_log, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        item.id,
        item.clientId,
        item.extractionItemId,
        item.libelle,
        item.valeurInterpretee,
        item.statut,
        item.validePar,
        JSON.stringify(item.auditLog),
        item.createdAt,
        item.updatedAt,
      )
      .run()
  }

  async knowledgeItemParId(id: string): Promise<KnowledgeItemEnregistre | null> {
    const ligne = await this.db
      .prepare('SELECT * FROM knowledge_items WHERE id = ?')
      .bind(id)
      .first()
    return ligne ? ligneVersKnowledgeItem(ligne as Record<string, unknown>) : null
  }

  async remplacerKnowledgeItem(item: KnowledgeItemEnregistre): Promise<void> {
    await this.db
      .prepare(
        `UPDATE knowledge_items
         SET statut = ?, valide_par = ?, audit_log = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(item.statut, item.validePar, JSON.stringify(item.auditLog), item.updatedAt, item.id)
      .run()
  }

  async listerConfirmations(clientId: string): Promise<ConfirmationEnregistree[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM confirmations WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersConfirmation(l as Record<string, unknown>))
  }

  async creerConfirmation(c: ConfirmationEnregistree): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO confirmations (id, client_id, knowledge_item_id, decision, confirme_par, horodatage)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(c.id, c.clientId, c.knowledgeItemId, c.decision, c.confirmePar, c.horodatage)
      .run()
  }

  async listerKnowledgeRelations(clientId: string): Promise<KnowledgeRelationEnregistree[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM knowledge_relations WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersKnowledgeRelation(l as Record<string, unknown>))
  }

  async creerKnowledgeRelation(r: KnowledgeRelationEnregistree): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO knowledge_relations
          (id, client_id, knowledge_item_source_id, knowledge_item_cible_id, type, created_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(r.id, r.clientId, r.knowledgeItemSourceId, r.knowledgeItemCibleId, r.type, r.createdAt)
      .run()
  }

  async listerConflicts(clientId: string): Promise<ConflictEnregistre[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM conflicts WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersConflict(l as Record<string, unknown>))
  }

  async creerConflict(c: ConflictEnregistre): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO conflicts
          (id, client_id, knowledge_item_source_id, knowledge_item_cible_id, description,
           statut, resolution, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        c.id,
        c.clientId,
        c.knowledgeItemSourceId,
        c.knowledgeItemCibleId,
        c.description,
        c.statut,
        c.resolution,
        c.createdAt,
      )
      .run()
  }

  async conflictParId(id: string): Promise<ConflictEnregistre | null> {
    const ligne = await this.db.prepare('SELECT * FROM conflicts WHERE id = ?').bind(id).first()
    return ligne ? ligneVersConflict(ligne as Record<string, unknown>) : null
  }

  async remplacerConflict(c: ConflictEnregistre): Promise<void> {
    await this.db
      .prepare(`UPDATE conflicts SET statut = ?, resolution = ? WHERE id = ?`)
      .bind(c.statut, c.resolution, c.id)
      .run()
  }
}
