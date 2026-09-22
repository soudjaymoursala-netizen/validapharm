/**
 * Journal d'une session du panneau Chat expert (§4.4) — horodatage,
 * fournisseur, moteur, mode, jamais le contenu échangé (questions/
 * réponses). Entièrement immuable une fois créé (INSERT-only), jamais de
 * mise à jour ni de suppression.
 */
export interface AiChatSessionLogEnregistre {
  id: string
  clientId: string
  startedAt: string
  endedAt: string | null
  mode: string
  aiProvider: string
  moteurVersion: string | null
  documentJoint: boolean
}

export interface AiChatSessionLogRepo {
  listerParClient(clientId: string): Promise<AiChatSessionLogEnregistre[]>
  creer(entree: AiChatSessionLogEnregistre): Promise<void>
}

export class AiChatSessionLogRepoMemoire implements AiChatSessionLogRepo {
  private readonly parId = new Map<string, AiChatSessionLogEnregistre>()

  async listerParClient(clientId: string): Promise<AiChatSessionLogEnregistre[]> {
    return [...this.parId.values()].filter((e) => e.clientId === clientId)
  }

  async creer(entree: AiChatSessionLogEnregistre): Promise<void> {
    this.parId.set(entree.id, entree)
  }
}
