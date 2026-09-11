/** Une valeur de paramètre reste un simple objet de chaînes — le routeur ne connaît pas la forme exacte de chaque clé (github/relais-ia/drive-normes), seul le frontend/connecteur concerné l'interprète. */
export type ValeurParametreInstallation = Record<string, string>

export interface ParametreInstallationEnregistre {
  cle: string
  valeur: ValeurParametreInstallation
  updatedAt: string
  updatedBy: string
}

/**
 * Dépôt des paramètres globaux à l'installation (dépôt GitHub dédié,
 * Relais IA, Drive de lecture pour la bibliothèque de normes) — D1 devient
 * la source de vérité, remplaçant un stockage IndexedDB par navigateur qui
 * ne survivait jamais à un changement d'appareil/poste (voir migration
 * `0002_parametres_installation.sql`).
 */
export interface ParametresInstallationRepo {
  obtenir(cle: string): Promise<ParametreInstallationEnregistre | null>
  enregistrer(cle: string, valeur: ValeurParametreInstallation, acteurId: string): Promise<void>
  effacer(cle: string): Promise<void>
}

export class ParametresInstallationRepoMemoire implements ParametresInstallationRepo {
  private readonly parCle = new Map<string, ParametreInstallationEnregistre>()

  async obtenir(cle: string): Promise<ParametreInstallationEnregistre | null> {
    return this.parCle.get(cle) ?? null
  }

  async enregistrer(
    cle: string,
    valeur: ValeurParametreInstallation,
    acteurId: string,
  ): Promise<void> {
    this.parCle.set(cle, {
      cle,
      valeur,
      updatedAt: new Date().toISOString(),
      updatedBy: acteurId,
    })
  }

  async effacer(cle: string): Promise<void> {
    this.parCle.delete(cle)
  }
}
