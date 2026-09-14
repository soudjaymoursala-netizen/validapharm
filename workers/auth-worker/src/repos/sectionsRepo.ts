export interface PartageSectionEnregistre {
  userId: string
  accessLevel: 'lecture' | 'édition'
}

export interface AvisRelecteurEnregistre {
  userId: string
  avis: string
  date: string
}

export interface WorkflowSectionEnregistre {
  authors: string[]
  reviewers: AvisRelecteurEnregistre[]
  approverFinal: string | null
}

export interface SignatureRoleEnregistree {
  userId?: string
  date?: string
}

export interface SignaturesSectionEnregistrees {
  redacteur: SignatureRoleEnregistree
  verificateur: SignatureRoleEnregistree
  approbateur: SignatureRoleEnregistree
}

export interface RevisionSectionEnregistree {
  version: string
  date: string
  auteur: string
  motif: string
}

export interface MetaSectionEnregistree {
  ref: string
  titre: string
  version: string
  site?: string
}

export interface GenerationSourceEnregistree {
  sourceDocumentId: string | null
  generatedFields: string[]
}

export interface EntreeAuditSection {
  timestamp: string
  actor: string
  action: string
}

export interface SectionEnregistree {
  id: string
  projectId: string
  templateType: string
  templateEngineVersion: string
  ownerId: string
  sharedWith: PartageSectionEnregistre[]
  language: string
  status: string
  meta: MetaSectionEnregistree
  workflow: WorkflowSectionEnregistre
  signatures: SignaturesSectionEnregistrees
  revisions: RevisionSectionEnregistree[]
  values: Record<string, string | number | null>
  tables: Record<string, Array<Record<string, string | number | null>>>
  generationSource: GenerationSourceEnregistree
  procedureId: string | null
  assetNodeId: string | null
  auditLog: EntreeAuditSection[]
  createdAt: string
  updatedAt: string
}

/**
 * Dépôt Section — Phase 3b du chantier de migration D1 (voir
 * docs/CHANTIER-MIGRATION-D1-RECAP.md). Contrairement à `ProjectsRepo`,
 * aucune méthode ici ne filtre par visibilité utilisateur :
 * `Section.owner_id`/`shared_with` ne sont, comme avant cette migration,
 * jamais câblés comme une frontière de sécurité réelle (voir
 * `permissionsProjet.ts`) — toute la logique métier (machine à états,
 * garde-fous de finalisation) reste côté client, déjà testée ; ce dépôt
 * ne fait que persister l'état déjà validé.
 */
export interface SectionsRepo {
  obtenirSection(id: string): Promise<SectionEnregistree | null>
  listerParProjet(projectId: string): Promise<SectionEnregistree[]>
  /** Lecture complète — réservée aux besoins transverses (recherche globale, précédents du même gabarit, sections liées à une procédure/un nœud) qui filtrent ensuite côté appelant, même discipline que `clientsRepo.listerVisiblesPar`/`projectsRepo.listerVisiblesPar` (volume attendu modeste). */
  listerToutes(): Promise<SectionEnregistree[]>
  creerSection(section: SectionEnregistree): Promise<void>
  remplacerSection(section: SectionEnregistree): Promise<void>
}

export class SectionsRepoMemoire implements SectionsRepo {
  private readonly sections = new Map<string, SectionEnregistree>()

  async obtenirSection(id: string): Promise<SectionEnregistree | null> {
    return this.sections.get(id) ?? null
  }

  async listerParProjet(projectId: string): Promise<SectionEnregistree[]> {
    return [...this.sections.values()].filter((s) => s.projectId === projectId)
  }

  async listerToutes(): Promise<SectionEnregistree[]> {
    return [...this.sections.values()]
  }

  async creerSection(section: SectionEnregistree): Promise<void> {
    this.sections.set(section.id, section)
  }

  async remplacerSection(section: SectionEnregistree): Promise<void> {
    this.sections.set(section.id, section)
  }
}
