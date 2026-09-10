import type { D1Database } from '../../d1Types'
import type {
  ParametreInstallationEnregistre,
  ParametresInstallationRepo,
  ValeurParametreInstallation,
} from '../parametresInstallationRepo'

interface LigneParametreInstallation {
  cle: string
  valeur: string
  updated_at: string
  updated_by: string
}

function ligneVersParametre(ligne: LigneParametreInstallation): ParametreInstallationEnregistre {
  return {
    cle: ligne.cle,
    valeur: JSON.parse(ligne.valeur) as ValeurParametreInstallation,
    updatedAt: ligne.updated_at,
    updatedBy: ligne.updated_by,
  }
}

/** Implémentation D1 du dépôt des paramètres d'installation — voir `d1UtilisateursRepo.ts` pour la discipline générale. */
export class D1ParametresInstallationRepo implements ParametresInstallationRepo {
  constructor(private readonly db: D1Database) {}

  async obtenir(cle: string): Promise<ParametreInstallationEnregistre | null> {
    const ligne = await this.db
      .prepare('SELECT * FROM parametres_installation WHERE cle = ?')
      .bind(cle)
      .first<LigneParametreInstallation>()
    return ligne ? ligneVersParametre(ligne) : null
  }

  async enregistrer(
    cle: string,
    valeur: ValeurParametreInstallation,
    acteurId: string,
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO parametres_installation (cle, valeur, updated_at, updated_by)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur, updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
      )
      .bind(cle, JSON.stringify(valeur), new Date().toISOString(), acteurId)
      .run()
  }

  async effacer(cle: string): Promise<void> {
    await this.db.prepare('DELETE FROM parametres_installation WHERE cle = ?').bind(cle).run()
  }
}
