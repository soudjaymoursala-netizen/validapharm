/**
 * Métadonnées d'un document normatif (Bibliothèque de normes) — le texte
 * extrait et le contenu binaire d'origine (s'il existe) vivent dans R2
 * (`StockageBinaireRepo`), jamais ici (voir migration 0003).
 */
export interface DocumentNormatifEnregistre {
  id: string
  category: string
  titre: string
  filename: string
  source: string
  sourceRef: string | null
  mimeType: string
  hasBinaryContent: boolean
  uploadedAt: string
  uploadedBy: string
}

export interface DocumentsNormatifsRepo {
  lister(): Promise<DocumentNormatifEnregistre[]>
  parId(id: string): Promise<DocumentNormatifEnregistre | null>
  creer(document: DocumentNormatifEnregistre): Promise<void>
  renommer(id: string, titre: string): Promise<void>
  supprimer(id: string): Promise<void>
}

export class DocumentsNormatifsRepoMemoire implements DocumentsNormatifsRepo {
  private readonly parId_ = new Map<string, DocumentNormatifEnregistre>()

  async lister(): Promise<DocumentNormatifEnregistre[]> {
    return [...this.parId_.values()]
  }

  async parId(id: string): Promise<DocumentNormatifEnregistre | null> {
    return this.parId_.get(id) ?? null
  }

  async creer(document: DocumentNormatifEnregistre): Promise<void> {
    this.parId_.set(document.id, document)
  }

  async renommer(id: string, titre: string): Promise<void> {
    const document = this.parId_.get(id)
    if (document) this.parId_.set(id, { ...document, titre })
  }

  async supprimer(id: string): Promise<void> {
    this.parId_.delete(id)
  }
}
