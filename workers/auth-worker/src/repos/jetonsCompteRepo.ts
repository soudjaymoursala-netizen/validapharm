/**
 * Jetons de lien de compte (activation d'un nouveau compte, réinitialisation
 * de mot de passe) — décisions utilisateur du 26/09/2026. Usage unique,
 * durée limitée ; seule l'empreinte SHA-256 du jeton est conservée.
 */
export type TypeJetonCompte = 'activation' | 'reinitialisation'

export interface JetonCompteEnregistre {
  empreinte: string
  userId: string
  type: TypeJetonCompte
  expireAt: string
  utiliseAt: string | null
  createdAt: string
  createdBy: string | null
}

export interface JetonsCompteRepo {
  creer(jeton: JetonCompteEnregistre): Promise<void>
  parEmpreinte(empreinte: string): Promise<JetonCompteEnregistre | null>
  /** Marque comme utilisés tous les jetons encore valides du compte (un seul lien actif à la fois). */
  invaliderPourUtilisateur(userId: string, date: string): Promise<void>
}

export class JetonsCompteRepoMemoire implements JetonsCompteRepo {
  private readonly jetons = new Map<string, JetonCompteEnregistre>()

  async creer(jeton: JetonCompteEnregistre): Promise<void> {
    this.jetons.set(jeton.empreinte, jeton)
  }

  async parEmpreinte(empreinte: string): Promise<JetonCompteEnregistre | null> {
    return this.jetons.get(empreinte) ?? null
  }

  async invaliderPourUtilisateur(userId: string, date: string): Promise<void> {
    for (const [cle, jeton] of this.jetons) {
      if (jeton.userId === userId && jeton.utiliseAt === null) {
        this.jetons.set(cle, { ...jeton, utiliseAt: date })
      }
    }
  }
}
