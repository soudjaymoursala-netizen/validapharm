export interface ConnexionDriveEnregistree {
  clientId: string
  dossierId: string
  jeton: string
}

/**
 * Dépôt de la configuration du miroir Drive — un enregistrement mutable
 * par client (`clientId`), jamais un historique : `enregistrer` est
 * toujours un upsert complet (même discipline que
 * `ParametresInstallationRepo`, scopée par client plutôt que par une clé
 * globale à l'installation). Phase 9d du chantier de migration D1 (voir
 * docs/CHANTIER-MIGRATION-D1-RECAP.md).
 */
export interface ConnexionDriveRepo {
  obtenirParClient(clientId: string): Promise<ConnexionDriveEnregistree | null>
  enregistrer(connexion: ConnexionDriveEnregistree): Promise<void>
  supprimer(clientId: string): Promise<void>
}

export class ConnexionDriveRepoMemoire implements ConnexionDriveRepo {
  private readonly parClient = new Map<string, ConnexionDriveEnregistree>()

  async obtenirParClient(clientId: string): Promise<ConnexionDriveEnregistree | null> {
    return this.parClient.get(clientId) ?? null
  }

  async enregistrer(connexion: ConnexionDriveEnregistree): Promise<void> {
    this.parClient.set(connexion.clientId, connexion)
  }

  async supprimer(clientId: string): Promise<void> {
    this.parClient.delete(clientId)
  }
}
