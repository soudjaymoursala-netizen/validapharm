import type { D1Database } from '../../d1Types'
import type { EtatMiroirDriveEnregistre, EtatMiroirDriveRepo } from '../etatMiroirDriveRepo'

interface LigneEtatMiroirDrive {
  client_id: string
  dernier_miroir_reussi: string | null
}

function ligneVersEtat(ligne: LigneEtatMiroirDrive): EtatMiroirDriveEnregistre {
  return {
    clientId: ligne.client_id,
    dernierMiroirReussi: ligne.dernier_miroir_reussi,
  }
}

/** Implémentation D1 du dépôt d'état du miroir Drive par client — voir `d1ParametresInstallationRepo.ts` pour la discipline générale d'upsert. */
export class D1EtatMiroirDriveRepo implements EtatMiroirDriveRepo {
  constructor(private readonly db: D1Database) {}

  async obtenirParClient(clientId: string): Promise<EtatMiroirDriveEnregistre | null> {
    const ligne = await this.db
      .prepare('SELECT * FROM etat_miroir_drive WHERE client_id = ?')
      .bind(clientId)
      .first<LigneEtatMiroirDrive>()
    return ligne ? ligneVersEtat(ligne) : null
  }

  async enregistrer(etat: EtatMiroirDriveEnregistre): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO etat_miroir_drive (client_id, dernier_miroir_reussi)
         VALUES (?, ?)
         ON CONFLICT(client_id) DO UPDATE SET dernier_miroir_reussi = excluded.dernier_miroir_reussi`,
      )
      .bind(etat.clientId, etat.dernierMiroirReussi)
      .run()
  }
}
