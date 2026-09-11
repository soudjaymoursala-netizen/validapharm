/**
 * Stockage brut (bucket R2 en runtime réel) pour le contenu volumineux des
 * documents normatifs — texte extrait et fichier binaire d'origine, jamais
 * en D1 (voir migration 0003). Interface volontairement minimale (clé →
 * octets), indépendante du binding Workers réel — testable en mémoire.
 */
export interface StockageBinaireRepo {
  enregistrer(cle: string, contenu: ArrayBuffer, typeContenu: string): Promise<void>
  lire(cle: string): Promise<{ contenu: ArrayBuffer; typeContenu: string } | null>
  supprimer(cle: string): Promise<void>
}

export class StockageBinaireRepoMemoire implements StockageBinaireRepo {
  private readonly parCle = new Map<string, { contenu: ArrayBuffer; typeContenu: string }>()

  async enregistrer(cle: string, contenu: ArrayBuffer, typeContenu: string): Promise<void> {
    this.parCle.set(cle, { contenu, typeContenu })
  }

  async lire(cle: string): Promise<{ contenu: ArrayBuffer; typeContenu: string } | null> {
    return this.parCle.get(cle) ?? null
  }

  async supprimer(cle: string): Promise<void> {
    this.parCle.delete(cle)
  }
}
