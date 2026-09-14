export type LangueNiveau = 'fr' | 'en' | 'de'

export interface NiveauHierarchieEnregistre {
  key: string
  label: Record<LangueNiveau, string>
  numberingPattern: string
}

export interface AssetHierarchySchemaEnregistre {
  clientId: string
  levels: NiveauHierarchieEnregistre[]
}

export interface EntreeJournalAuditNoeud {
  timestamp: string
  actor: string
  action: string
}

export interface AssetNodeEnregistre {
  id: string
  clientId: string
  workspaceId: string | null
  levelKey: string
  name: string
  code: string
  parentId: string | null
  associatedNodes: string[]
  source: 'manuel' | 'qms_pull' | 'import_fichier'
  qmsConnectorId: string | null
  periodicQualification: { applicable: boolean; deadline: string | null }
  qualificationStatus: string
  auditLog: EntreeJournalAuditNoeud[]
  createdAt: string
  updatedAt: string
}

export interface RelationTechniqueEnregistree {
  id: string
  clientId: string
  typeRelation: string
  noeudSourceId: string
  noeudCibleId: string
  createdAt: string
}

/**
 * Dépôt Structure Système (référentiel d'actifs) — Phase 1 du chantier de
 * migration D1 (voir docs/CHANTIER-MIGRATION-D1-RECAP.md). `obtenirSchema`/
 * `enregistrerSchema` opèrent toujours sur l'objet entier (même contrat que
 * l'ancien `db.assetHierarchySchemas.put` côté client) : la logique de
 * validation (clé déjà utilisée, niveau référencé par des nœuds…) reste
 * côté store frontend, déjà testée — ce dépôt ne fait que persister l'état
 * final qu'on lui donne, jamais de règle métier ici.
 */
export interface StructureSystemeRepo {
  obtenirSchema(clientId: string): Promise<AssetHierarchySchemaEnregistre | null>
  enregistrerSchema(schema: AssetHierarchySchemaEnregistre): Promise<void>
  listerNoeuds(clientId: string): Promise<AssetNodeEnregistre[]>
  noeudParId(id: string): Promise<AssetNodeEnregistre | null>
  creerNoeud(noeud: AssetNodeEnregistre): Promise<void>
  creerNoeuds(noeuds: AssetNodeEnregistre[]): Promise<void>
  remplacerNoeud(noeud: AssetNodeEnregistre): Promise<void>
  listerRelationsTechniques(clientId: string): Promise<RelationTechniqueEnregistree[]>
  creerRelationTechnique(relation: RelationTechniqueEnregistree): Promise<void>
}

export class StructureSystemeRepoMemoire implements StructureSystemeRepo {
  private readonly schemas = new Map<string, AssetHierarchySchemaEnregistre>()
  private readonly noeuds = new Map<string, AssetNodeEnregistre>()
  private readonly relations = new Map<string, RelationTechniqueEnregistree>()

  async obtenirSchema(clientId: string): Promise<AssetHierarchySchemaEnregistre | null> {
    return this.schemas.get(clientId) ?? null
  }

  async enregistrerSchema(schema: AssetHierarchySchemaEnregistre): Promise<void> {
    this.schemas.set(schema.clientId, schema)
  }

  async listerNoeuds(clientId: string): Promise<AssetNodeEnregistre[]> {
    return [...this.noeuds.values()].filter((n) => n.clientId === clientId)
  }

  async noeudParId(id: string): Promise<AssetNodeEnregistre | null> {
    return this.noeuds.get(id) ?? null
  }

  async creerNoeud(noeud: AssetNodeEnregistre): Promise<void> {
    this.noeuds.set(noeud.id, noeud)
  }

  async creerNoeuds(noeuds: AssetNodeEnregistre[]): Promise<void> {
    for (const noeud of noeuds) this.noeuds.set(noeud.id, noeud)
  }

  async remplacerNoeud(noeud: AssetNodeEnregistre): Promise<void> {
    this.noeuds.set(noeud.id, noeud)
  }

  async listerRelationsTechniques(clientId: string): Promise<RelationTechniqueEnregistree[]> {
    return [...this.relations.values()].filter((r) => r.clientId === clientId)
  }

  async creerRelationTechnique(relation: RelationTechniqueEnregistree): Promise<void> {
    this.relations.set(relation.id, relation)
  }
}
