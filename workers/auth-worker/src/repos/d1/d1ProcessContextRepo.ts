import type { D1Database } from '../../d1Types'
import type {
  AssociationFonctionAssetNodeEnregistree,
  AssociationFonctionProcessEnregistree,
  FonctionActifEnregistree,
  ManufacturingContextEnregistre,
  ProcessContextRepo,
  ProcessEnregistre,
} from '../processContextRepo'

function ligneVersProcess(l: Record<string, unknown>): ProcessEnregistre {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    nom: l.nom as string,
    description: l.description as string,
    type: l.type as string,
    sourceId: l.source_id as string | null,
    auditLog: JSON.parse(l.audit_log as string),
    createdAt: l.created_at as string,
    updatedAt: l.updated_at as string,
  }
}

function ligneVersFonction(l: Record<string, unknown>): FonctionActifEnregistree {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    nom: l.nom as string,
    description: l.description as string,
    auditLog: JSON.parse(l.audit_log as string),
    createdAt: l.created_at as string,
    updatedAt: l.updated_at as string,
  }
}

function ligneVersAssociationFonctionAssetNode(
  l: Record<string, unknown>,
): AssociationFonctionAssetNodeEnregistree {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    functionId: l.function_id as string,
    assetNodeId: l.asset_node_id as string,
    createdAt: l.created_at as string,
  }
}

function ligneVersAssociationFonctionProcess(
  l: Record<string, unknown>,
): AssociationFonctionProcessEnregistree {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    functionId: l.function_id as string,
    processId: l.process_id as string,
    createdAt: l.created_at as string,
  }
}

function ligneVersManufacturingContext(l: Record<string, unknown>): ManufacturingContextEnregistre {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    assetNodeId: l.asset_node_id as string,
    processId: l.process_id as string,
    produit: l.produit as string,
    recette: l.recette as string | null,
    format: l.format as string | null,
    configuration: l.configuration as string | null,
    createdAt: l.created_at as string,
    updatedAt: l.updated_at as string,
  }
}

export class D1ProcessContextRepo implements ProcessContextRepo {
  constructor(private readonly db: D1Database) {}

  async listerProcesses(clientId: string): Promise<ProcessEnregistre[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM processes WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersProcess(l as Record<string, unknown>))
  }

  async creerProcess(p: ProcessEnregistre): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO processes
          (id, client_id, nom, description, type, source_id, audit_log, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        p.id,
        p.clientId,
        p.nom,
        p.description,
        p.type,
        p.sourceId,
        JSON.stringify(p.auditLog),
        p.createdAt,
        p.updatedAt,
      )
      .run()
  }

  async listerFonctions(clientId: string): Promise<FonctionActifEnregistree[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM fonctions_actif WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersFonction(l as Record<string, unknown>))
  }

  async creerFonction(f: FonctionActifEnregistree): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO fonctions_actif
          (id, client_id, nom, description, audit_log, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        f.id,
        f.clientId,
        f.nom,
        f.description,
        JSON.stringify(f.auditLog),
        f.createdAt,
        f.updatedAt,
      )
      .run()
  }

  async listerAssociationsFonctionAssetNode(
    clientId: string,
  ): Promise<AssociationFonctionAssetNodeEnregistree[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM associations_fonction_asset_node WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) =>
      ligneVersAssociationFonctionAssetNode(l as Record<string, unknown>),
    )
  }

  async creerAssociationFonctionAssetNode(
    a: AssociationFonctionAssetNodeEnregistree,
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO associations_fonction_asset_node
          (id, client_id, function_id, asset_node_id, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(a.id, a.clientId, a.functionId, a.assetNodeId, a.createdAt)
      .run()
  }

  async listerAssociationsFonctionProcess(
    clientId: string,
  ): Promise<AssociationFonctionProcessEnregistree[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM associations_fonction_process WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) =>
      ligneVersAssociationFonctionProcess(l as Record<string, unknown>),
    )
  }

  async creerAssociationFonctionProcess(a: AssociationFonctionProcessEnregistree): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO associations_fonction_process
          (id, client_id, function_id, process_id, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(a.id, a.clientId, a.functionId, a.processId, a.createdAt)
      .run()
  }

  async listerManufacturingContexts(clientId: string): Promise<ManufacturingContextEnregistre[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM manufacturing_contexts WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersManufacturingContext(l as Record<string, unknown>))
  }

  async creerManufacturingContext(c: ManufacturingContextEnregistre): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO manufacturing_contexts
          (id, client_id, asset_node_id, process_id, produit, recette, format, configuration, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        c.id,
        c.clientId,
        c.assetNodeId,
        c.processId,
        c.produit,
        c.recette,
        c.format,
        c.configuration,
        c.createdAt,
        c.updatedAt,
      )
      .run()
  }
}
