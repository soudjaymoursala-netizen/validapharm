import type { UtilisateurEnregistre } from '../types'

/**
 * Dépôt utilisateurs — interface indépendante de D1, pour
 * pouvoir tester `routeur.ts` contre une implémentation en mémoire sans
 * dépendre du runtime Workers réel (même discipline que `ocrHandler.ts`
 * testé indépendamment du binding `env`).
 */
export interface UtilisateursRepo {
  parEmail(email: string): Promise<UtilisateurEnregistre | null>
  parId(id: string): Promise<UtilisateurEnregistre | null>
  creer(utilisateur: UtilisateurEnregistre): Promise<void>
  listerTous(): Promise<UtilisateurEnregistre[]>
  mettreAJour(
    id: string,
    changements: Partial<
      Pick<
        UtilisateurEnregistre,
        'nom' | 'prenom' | 'role' | 'statut' | 'motDePasseHash' | 'motDePasseSel' | 'updatedAt'
      >
    >,
  ): Promise<UtilisateurEnregistre | null>
  compter(): Promise<number>
}

export class UtilisateursRepoMemoire implements UtilisateursRepo {
  private readonly parId_ = new Map<string, UtilisateurEnregistre>()

  async parEmail(email: string): Promise<UtilisateurEnregistre | null> {
    for (const u of this.parId_.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) return u
    }
    return null
  }

  async parId(id: string): Promise<UtilisateurEnregistre | null> {
    return this.parId_.get(id) ?? null
  }

  async creer(utilisateur: UtilisateurEnregistre): Promise<void> {
    this.parId_.set(utilisateur.id, utilisateur)
  }

  async listerTous(): Promise<UtilisateurEnregistre[]> {
    return Array.from(this.parId_.values()).sort((a, b) => a.email.localeCompare(b.email))
  }

  async mettreAJour(
    id: string,
    changements: Partial<UtilisateurEnregistre>,
  ): Promise<UtilisateurEnregistre | null> {
    const existant = this.parId_.get(id)
    if (!existant) return null
    const misAJour = { ...existant, ...changements }
    this.parId_.set(id, misAJour)
    return misAJour
  }

  async compter(): Promise<number> {
    return this.parId_.size
  }
}
