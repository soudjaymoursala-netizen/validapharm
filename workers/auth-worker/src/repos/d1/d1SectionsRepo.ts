import type { D1Database } from '../../d1Types'
import type { SectionEnregistree, SectionsRepo } from '../sectionsRepo'

function ligneVersSection(l: Record<string, unknown>): SectionEnregistree {
  return {
    id: l.id as string,
    projectId: l.project_id as string,
    templateType: l.template_type as string,
    templateEngineVersion: l.template_engine_version as string,
    ownerId: l.owner_id as string,
    sharedWith: JSON.parse(l.shared_with as string),
    language: l.language as string,
    status: l.status as string,
    meta: JSON.parse(l.meta as string),
    workflow: JSON.parse(l.workflow as string),
    signatures: JSON.parse(l.signatures as string),
    revisions: JSON.parse(l.revisions as string),
    values: JSON.parse(l.values_json as string),
    tables: JSON.parse(l.tables_json as string),
    generationSource: JSON.parse(l.generation_source as string),
    procedureId: l.procedure_id as string | null,
    assetNodeId: l.asset_node_id as string | null,
    auditLog: JSON.parse(l.audit_log as string),
    createdAt: l.created_at as string,
    updatedAt: l.updated_at as string,
  }
}

export class D1SectionsRepo implements SectionsRepo {
  constructor(private readonly db: D1Database) {}

  async obtenirSection(id: string): Promise<SectionEnregistree | null> {
    const ligne = await this.db
      .prepare('SELECT * FROM sections WHERE id = ?')
      .bind(id)
      .first<Record<string, unknown>>()
    return ligne ? ligneVersSection(ligne) : null
  }

  async listerParProjet(projectId: string): Promise<SectionEnregistree[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM sections WHERE project_id = ?')
      .bind(projectId)
      .all()
    return resultat.results.map((l) => ligneVersSection(l as Record<string, unknown>))
  }

  async listerToutes(): Promise<SectionEnregistree[]> {
    const resultat = await this.db.prepare('SELECT * FROM sections').all()
    return resultat.results.map((l) => ligneVersSection(l as Record<string, unknown>))
  }

  async creerSection(s: SectionEnregistree): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO sections
          (id, project_id, template_type, template_engine_version, owner_id, shared_with,
           language, status, meta, workflow, signatures, revisions, values_json, tables_json,
           generation_source, procedure_id, asset_node_id, audit_log, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        s.id,
        s.projectId,
        s.templateType,
        s.templateEngineVersion,
        s.ownerId,
        JSON.stringify(s.sharedWith),
        s.language,
        s.status,
        JSON.stringify(s.meta),
        JSON.stringify(s.workflow),
        JSON.stringify(s.signatures),
        JSON.stringify(s.revisions),
        JSON.stringify(s.values),
        JSON.stringify(s.tables),
        JSON.stringify(s.generationSource),
        s.procedureId,
        s.assetNodeId,
        JSON.stringify(s.auditLog),
        s.createdAt,
        s.updatedAt,
      )
      .run()
  }

  async remplacerSection(s: SectionEnregistree): Promise<void> {
    await this.db
      .prepare(
        `UPDATE sections SET
           project_id = ?, template_type = ?, template_engine_version = ?, owner_id = ?,
           shared_with = ?, language = ?, status = ?, meta = ?, workflow = ?, signatures = ?,
           revisions = ?, values_json = ?, tables_json = ?, generation_source = ?,
           procedure_id = ?, asset_node_id = ?, audit_log = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(
        s.projectId,
        s.templateType,
        s.templateEngineVersion,
        s.ownerId,
        JSON.stringify(s.sharedWith),
        s.language,
        s.status,
        JSON.stringify(s.meta),
        JSON.stringify(s.workflow),
        JSON.stringify(s.signatures),
        JSON.stringify(s.revisions),
        JSON.stringify(s.values),
        JSON.stringify(s.tables),
        JSON.stringify(s.generationSource),
        s.procedureId,
        s.assetNodeId,
        JSON.stringify(s.auditLog),
        s.updatedAt,
        s.id,
      )
      .run()
  }
}
