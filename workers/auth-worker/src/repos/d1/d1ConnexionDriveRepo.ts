import type { D1Database } from '../../d1Types'
import type { ConnexionDriveEnregistree, ConnexionDriveRepo } from '../connexionDriveRepo'

interface LigneConnexionDrive {
  client_id: string
  dossier_id: string
  jeton: string
}

function ligneVersConnexion(ligne: LigneConnexionDrive): ConnexionDriveEnregistree {
  return {
    clientId: ligne.client_id,
    dossierId: ligne.dossier_id,
    jeton: ligne.jeton,
  }
}

/** Implémentation D1 du dépôt de configuration Drive par client — voir `d1ParametresInstallationRepo.ts` pour la discipline générale d'upsert. */
export class D1ConnexionDriveRepo implements ConnexionDriveRepo {
  constructor(private readonly db: D1Database) {}

  async obtenirParClient(clientId: string): Promise<ConnexionDriveEnregistree | null> {
    const ligne = await this.db
      .prepare('SELECT * FROM connexion_drive WHERE client_id = ?')
      .bind(clientId)
      .first<LigneConnexionDrive>()
    return ligne ? ligneVersConnexion(ligne) : null
  }

  async enregistrer(connexion: ConnexionDriveEnregistree): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO connexion_drive (client_id, dossier_id, jeton)
         VALUES (?, ?, ?)
         ON CONFLICT(client_id) DO UPDATE SET dossier_id = excluded.dossier_id, jeton = excluded.jeton`,
      )
      .bind(connexion.clientId, connexion.dossierId, connexion.jeton)
      .run()
  }

  async supprimer(clientId: string): Promise<void> {
    await this.db.prepare('DELETE FROM connexion_drive WHERE client_id = ?').bind(clientId).run()
  }
}
