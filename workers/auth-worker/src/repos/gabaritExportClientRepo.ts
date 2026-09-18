/**
 * Métadonnées d'un `GabaritExportClient` (gabarit d'export `.docx`
 * personnalisé par client, §4.3bis) — le contenu binaire du fichier vit
 * dans R2 (`StockageBinaireRepo`), jamais ici, même répartition que
 * `ProjectDocumentEnregistre` (migration 0008).
 */
export interface GabaritExportClientEnregistre {
  id: string
  clientId: string
  nom: string
  tagsTrouves: string[]
  createdAt: string
}

export interface GabaritExportClientRepo {
  listerParClient(clientId: string): Promise<GabaritExportClientEnregistre[]>
  parId(id: string): Promise<GabaritExportClientEnregistre | null>
  creer(gabarit: GabaritExportClientEnregistre): Promise<void>
  supprimer(id: string): Promise<void>
}

export class GabaritExportClientRepoMemoire implements GabaritExportClientRepo {
  private readonly parId_ = new Map<string, GabaritExportClientEnregistre>()

  async listerParClient(clientId: string): Promise<GabaritExportClientEnregistre[]> {
    return [...this.parId_.values()].filter((g) => g.clientId === clientId)
  }

  async parId(id: string): Promise<GabaritExportClientEnregistre | null> {
    return this.parId_.get(id) ?? null
  }

  async creer(gabarit: GabaritExportClientEnregistre): Promise<void> {
    this.parId_.set(gabarit.id, gabarit)
  }

  async supprimer(id: string): Promise<void> {
    this.parId_.delete(id)
  }
}
