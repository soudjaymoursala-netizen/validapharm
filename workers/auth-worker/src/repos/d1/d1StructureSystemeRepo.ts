import type { D1Database } from '../../d1Types'
import type {
  AssetHierarchySchemaEnregistre,
  AssetNodeEnregistre,
  RelationTechniqueEnregistree,
  StructureSystemeRepo,
} from '../structureSystemeRepo'

function ligneVersNoeud(l: Record<string, unknown>): AssetNodeEnregistre {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    workspaceId: l.workspace_id as string | null,
    levelKey: l.level_key as string,
    name: l.name as string,
    code: l.code as string,
    parentId: l.parent_id as string | null,
    associatedNodes: JSON.parse(l.associated_nodes as string),
    source: l.source as AssetNodeEnregistre['source'],
    qmsConnectorId: l.qms_connector_id as string | null,
    periodicQualification: JSON.parse(l.periodic_qualification as string),
    qualificationStatus: l.qualification_status as string,
    auditLog: JSON.parse(l.audit_log as string),
    createdAt: l.created_at as string,
    updatedAt: l.updated_at as string,
  }
}

export class D1StructureSystemeRepo implements StructureSystemeRepo {
  constructor(private readonly db: D1Database) {}

  async obtenirSchema(clientId: string): Promise<AssetHierarchySchemaEnregistre | null> {
    const ligne = await this.db
      .prepare('SELECT * FROM asset_hierarchy_schemas WHERE client_id = ?')
      .bind(clientId)
      .first<Record<string, unknown>>()
    if (!ligne) return null
    return { clientId, levels: JSON.parse(ligne.levels as string) }
  }

  async enregistrerSchema(schema: AssetHierarchySchemaEnregistre): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO asset_hierarchy_schemas (client_id, levels) VALUES (?, ?)
         ON CONFLICT(client_id) DO UPDATE SET levels = excluded.levels`,
      )
      .bind(schema.clientId, JSON.stringify(schema.levels))
      .run()
  }

  async listerNoeuds(clientId: string): Promise<AssetNodeEnregistre[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM asset_nodes WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersNoeud(l as Record<string, unknown>))
  }

  async noeudParId(id: string): Promise<AssetNodeEnregistre | null> {
    const ligne = await this.db.prepare('SELECT * FROM asset_nodes WHERE id = ?').bind(id).first()
    return ligne ? ligneVersNoeud(ligne as Record<string, unknown>) : null
  }

  async creerNoeud(n: AssetNodeEnregistre): Promise<void> {
    await this.creerNoeuds([n])
  }

  async creerNoeuds(noeuds: AssetNodeEnregistre[]): Promise<void> {
    if (noeuds.length === 0) return
    const instructions = noeuds.map((n) =>
      this.db
        .prepare(
          `INSERT INTO asset_nodes
            (id, client_id, workspace_id, level_key, name, code, parent_id, associated_nodes,
             source, qms_connector_id, periodic_qualification, qualification_status, audit_log,
             created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          n.id,
          n.clientId,
          n.workspaceId,
          n.levelKey,
          n.name,
          n.code,
          n.parentId,
          JSON.stringify(n.associatedNodes),
          n.source,
          n.qmsConnectorId,
          JSON.stringify(n.periodicQualification),
          n.qualificationStatus,
          JSON.stringify(n.auditLog),
          n.createdAt,
          n.updatedAt,
        ),
    )
    await this.db.batch(instructions)
  }

  async remplacerNoeud(n: AssetNodeEnregistre): Promise<void> {
    await this.db
      .prepare(
        `UPDATE asset_nodes SET
           workspace_id = ?, level_key = ?, name = ?, code = ?, parent_id = ?,
           associated_nodes = ?, source = ?, qms_connector_id = ?,
           periodic_qualification = ?, qualification_status = ?, audit_log = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(
        n.workspaceId,
        n.levelKey,
        n.name,
        n.code,
        n.parentId,
        JSON.stringify(n.associatedNodes),
        n.source,
        n.qmsConnectorId,
        JSON.stringify(n.periodicQualification),
        n.qualificationStatus,
        JSON.stringify(n.auditLog),
        n.updatedAt,
        n.id,
      )
      .run()
  }

  async listerRelationsTechniques(clientId: string): Promise<RelationTechniqueEnregistree[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM relations_techniques WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => {
      const ligne = l as Record<string, unknown>
      return {
        id: ligne.id as string,
        clientId: ligne.client_id as string,
        typeRelation: ligne.type_relation as string,
        noeudSourceId: ligne.noeud_source_id as string,
        noeudCibleId: ligne.noeud_cible_id as string,
        createdAt: ligne.created_at as string,
      }
    })
  }

  async creerRelationTechnique(r: RelationTechniqueEnregistree): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO relations_techniques
          (id, client_id, type_relation, noeud_source_id, noeud_cible_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(r.id, r.clientId, r.typeRelation, r.noeudSourceId, r.noeudCibleId, r.createdAt)
      .run()
  }
}
