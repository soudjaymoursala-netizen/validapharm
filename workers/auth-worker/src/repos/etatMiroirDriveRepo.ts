export interface EtatMiroirDriveEnregistre {
  clientId: string
  dernierMiroirReussi: string | null
}

/**
 * Dépôt de l'horodatage du dernier miroir Drive réussi par client — un
 * enregistrement mutable par client (`clientId`), jamais un historique :
 * `enregistrer` est toujours un upsert complet, même discipline que
 * `ConnexionDriveRepo`. Phase 9d du chantier de migration D1 (voir
 * docs/CHANTIER-MIGRATION-D1-RECAP.md).
 */
export interface EtatMiroirDriveRepo {
  obtenirParClient(clientId: string): Promise<EtatMiroirDriveEnregistre | null>
  enregistrer(etat: EtatMiroirDriveEnregistre): Promise<void>
}

export class EtatMiroirDriveRepoMemoire implements EtatMiroirDriveRepo {
  private readonly parClient = new Map<string, EtatMiroirDriveEnregistre>()

  async obtenirParClient(clientId: string): Promise<EtatMiroirDriveEnregistre | null> {
    return this.parClient.get(clientId) ?? null
  }

  async enregistrer(etat: EtatMiroirDriveEnregistre): Promise<void> {
    this.parClient.set(etat.clientId, etat)
  }
}
