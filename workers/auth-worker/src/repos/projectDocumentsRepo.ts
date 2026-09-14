/**
 * Métadonnées d'un `ProjectDocument` (section "Documents" d'un projet,
 * §4.9) — le texte extrait et le contenu binaire d'origine (s'il existe)
 * vivent dans R2 (`StockageBinaireRepo`), jamais ici (voir migration 0008,
 * même répartition que `DocumentNormatifEnregistre`).
 */
export interface ProjectDocumentEnregistre {
  id: string
  projectId: string
  filename: string
  status: string
  mimeType: string
  hasBinaryContent: boolean
  uploadedAt: string
  uploadedBy: string
}

export interface ProjectDocumentsRepo {
  listerParProjet(projectId: string): Promise<ProjectDocumentEnregistre[]>
  parId(id: string): Promise<ProjectDocumentEnregistre | null>
  creer(document: ProjectDocumentEnregistre): Promise<void>
  supprimer(id: string): Promise<void>
}

export class ProjectDocumentsRepoMemoire implements ProjectDocumentsRepo {
  private readonly parId_ = new Map<string, ProjectDocumentEnregistre>()

  async listerParProjet(projectId: string): Promise<ProjectDocumentEnregistre[]> {
    return [...this.parId_.values()].filter((d) => d.projectId === projectId)
  }

  async parId(id: string): Promise<ProjectDocumentEnregistre | null> {
    return this.parId_.get(id) ?? null
  }

  async creer(document: ProjectDocumentEnregistre): Promise<void> {
    this.parId_.set(document.id, document)
  }

  async supprimer(id: string): Promise<void> {
    this.parId_.delete(id)
  }
}
