import type { ClientEnregistre, UtilisateurEnregistre } from '../types'

/**
 * Dépôt clients — D1 devient la source de vérité : nécessaire
 * pour qu'un admin puisse réellement "voir tous les clients de
 * l'organisation", structurellement impossible tant que `Client` restait
 * seulement local (IndexedDB par navigateur, un utilisateur = un poste).
 *
 * Visibilité (`listerVisiblesPar`) : un admin voit tout ; un utilisateur
 * voit les clients qu'il a créés ou ceux explicitement partagés avec lui
 * (`sharedWith`) — même convention `owner_id`/`shared_with` que
 * `Project`, désormais réellement appliquée côté serveur
 * plutôt qu'en simple convention d'affichage.
 */
export interface ClientsRepo {
  creer(client: ClientEnregistre): Promise<void>
  parId(id: string): Promise<ClientEnregistre | null>
  listerVisiblesPar(utilisateur: UtilisateurEnregistre): Promise<ClientEnregistre[]>
  mettreAJour(
    id: string,
    changements: Partial<
      Pick<
        ClientEnregistre,
        | 'name'
        | 'adresse'
        | 'secteur'
        | 'details'
        | 'statut'
        | 'archivedAt'
        | 'archivedBy'
        | 'sharedWith'
        | 'updatedAt'
      >
    >,
  ): Promise<ClientEnregistre | null>
  supprimerDefinitivement(id: string): Promise<boolean>
}

export class ClientsRepoMemoire implements ClientsRepo {
  private readonly parId_ = new Map<string, ClientEnregistre>()

  async creer(client: ClientEnregistre): Promise<void> {
    this.parId_.set(client.id, client)
  }

  async parId(id: string): Promise<ClientEnregistre | null> {
    return this.parId_.get(id) ?? null
  }

  async listerVisiblesPar(utilisateur: UtilisateurEnregistre): Promise<ClientEnregistre[]> {
    const tous = Array.from(this.parId_.values())
    const visibles =
      utilisateur.role === 'admin'
        ? tous
        : tous.filter(
            (c) => c.createdByUserId === utilisateur.id || c.sharedWith.includes(utilisateur.id),
          )
    return visibles.sort((a, b) => a.name.localeCompare(b.name))
  }

  async mettreAJour(
    id: string,
    changements: Partial<ClientEnregistre>,
  ): Promise<ClientEnregistre | null> {
    const existant = this.parId_.get(id)
    if (!existant) return null
    const misAJour = { ...existant, ...changements }
    this.parId_.set(id, misAJour)
    return misAJour
  }

  async supprimerDefinitivement(id: string): Promise<boolean> {
    return this.parId_.delete(id)
  }
}
