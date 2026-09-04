import type { D1Database } from '../../d1Types'
import type { ClientEnregistre, UtilisateurEnregistre } from '../../types'
import type { ClientsRepo } from '../clientsRepo'

interface LigneClient {
  id: string
  name: string
  adresse: string | null
  secteur: string | null
  details: string | null
  statut: string
  archived_at: string | null
  archived_by: string | null
  created_by_user_id: string
  shared_with: string
  created_at: string
  updated_at: string
}

function ligneVersClient(ligne: LigneClient): ClientEnregistre {
  return {
    id: ligne.id,
    name: ligne.name,
    adresse: ligne.adresse,
    secteur: ligne.secteur as ClientEnregistre['secteur'],
    details: ligne.details,
    statut: ligne.statut as ClientEnregistre['statut'],
    archivedAt: ligne.archived_at,
    archivedBy: ligne.archived_by,
    createdByUserId: ligne.created_by_user_id,
    sharedWith: JSON.parse(ligne.shared_with) as string[],
    createdAt: ligne.created_at,
    updatedAt: ligne.updated_at,
  }
}

/** Implémentation D1 du dépôt clients (TD-046) — voir `d1UtilisateursRepo.ts` pour la discipline générale. */
export class D1ClientsRepo implements ClientsRepo {
  constructor(private readonly db: D1Database) {}

  async creer(c: ClientEnregistre): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO clients
          (id, name, adresse, secteur, details, statut, archived_at, archived_by, created_by_user_id, shared_with, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        c.id,
        c.name,
        c.adresse,
        c.secteur,
        c.details,
        c.statut,
        c.archivedAt,
        c.archivedBy,
        c.createdByUserId,
        JSON.stringify(c.sharedWith),
        c.createdAt,
        c.updatedAt,
      )
      .run()
  }

  async parId(id: string): Promise<ClientEnregistre | null> {
    const ligne = await this.db
      .prepare('SELECT * FROM clients WHERE id = ?')
      .bind(id)
      .first<LigneClient>()
    return ligne ? ligneVersClient(ligne) : null
  }

  async listerVisiblesPar(utilisateur: UtilisateurEnregistre): Promise<ClientEnregistre[]> {
    if (utilisateur.role === 'admin') {
      const resultat = await this.db
        .prepare('SELECT * FROM clients ORDER BY name')
        .all<LigneClient>()
      return resultat.results.map(ligneVersClient)
    }
    const resultat = await this.db
      .prepare(
        `SELECT * FROM clients
         WHERE created_by_user_id = ? OR shared_with LIKE '%' || ? || '%'
         ORDER BY name`,
      )
      .bind(utilisateur.id, utilisateur.id)
      .all<LigneClient>()
    // `LIKE` ci-dessus est une présélection large (JSON stocké en texte) —
    // le filtre exact et sûr est ré-appliqué en mémoire sur le JSON parsé,
    // jamais la seule correspondance textuelle.
    return resultat.results
      .map(ligneVersClient)
      .filter((c) => c.createdByUserId === utilisateur.id || c.sharedWith.includes(utilisateur.id))
  }

  async mettreAJour(
    id: string,
    changements: Partial<ClientEnregistre>,
  ): Promise<ClientEnregistre | null> {
    const existant = await this.parId(id)
    if (!existant) return null
    const misAJour = { ...existant, ...changements }
    await this.db
      .prepare(
        `UPDATE clients SET name = ?, adresse = ?, secteur = ?, details = ?, statut = ?,
           archived_at = ?, archived_by = ?, shared_with = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(
        misAJour.name,
        misAJour.adresse,
        misAJour.secteur,
        misAJour.details,
        misAJour.statut,
        misAJour.archivedAt,
        misAJour.archivedBy,
        JSON.stringify(misAJour.sharedWith),
        misAJour.updatedAt,
        id,
      )
      .run()
    return misAJour
  }

  async supprimerDefinitivement(id: string): Promise<boolean> {
    const resultat = await this.db.prepare('DELETE FROM clients WHERE id = ?').bind(id).run()
    return resultat.success
  }
}
