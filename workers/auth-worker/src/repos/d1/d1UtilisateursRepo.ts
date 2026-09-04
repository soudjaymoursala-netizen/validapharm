import type { D1Database } from '../../d1Types'
import type { UtilisateurEnregistre } from '../../types'
import type { UtilisateursRepo } from '../utilisateursRepo'

interface LigneUtilisateur {
  id: string
  email: string
  mot_de_passe_hash: string
  mot_de_passe_sel: string
  nom: string
  prenom: string
  role: string
  statut: string
  created_at: string
  updated_at: string
  created_by: string | null
}

function ligneVersUtilisateur(ligne: LigneUtilisateur): UtilisateurEnregistre {
  return {
    id: ligne.id,
    email: ligne.email,
    motDePasseHash: ligne.mot_de_passe_hash,
    motDePasseSel: ligne.mot_de_passe_sel,
    nom: ligne.nom,
    prenom: ligne.prenom,
    role: ligne.role as UtilisateurEnregistre['role'],
    statut: ligne.statut as UtilisateurEnregistre['statut'],
    createdAt: ligne.created_at,
    updatedAt: ligne.updated_at,
    createdBy: ligne.created_by,
  }
}

/**
 * Implémentation D1 du dépôt utilisateurs (TD-046) — volontairement mince
 * (mapping SQL direct), la logique métier réelle vit dans `routeur.ts`,
 * testé contre `UtilisateursRepoMemoire`. Cohérent avec `index.ts` de
 * `workers/ocr-relay` : le câblage `env`/D1 lui-même n'est pas testé
 * unitairement (nécessiterait un vrai binding D1, non disponible hors du
 * runtime Workers réel) — limite assumée, à vérifier par l'utilisateur
 * après déploiement (voir README.md).
 */
export class D1UtilisateursRepo implements UtilisateursRepo {
  constructor(private readonly db: D1Database) {}

  async parEmail(email: string): Promise<UtilisateurEnregistre | null> {
    const ligne = await this.db
      .prepare('SELECT * FROM users WHERE lower(email) = lower(?)')
      .bind(email)
      .first<LigneUtilisateur>()
    return ligne ? ligneVersUtilisateur(ligne) : null
  }

  async parId(id: string): Promise<UtilisateurEnregistre | null> {
    const ligne = await this.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(id)
      .first<LigneUtilisateur>()
    return ligne ? ligneVersUtilisateur(ligne) : null
  }

  async creer(u: UtilisateurEnregistre): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO users
          (id, email, mot_de_passe_hash, mot_de_passe_sel, nom, prenom, role, statut, created_at, updated_at, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        u.id,
        u.email,
        u.motDePasseHash,
        u.motDePasseSel,
        u.nom,
        u.prenom,
        u.role,
        u.statut,
        u.createdAt,
        u.updatedAt,
        u.createdBy,
      )
      .run()
  }

  async listerTous(): Promise<UtilisateurEnregistre[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM users ORDER BY email')
      .all<LigneUtilisateur>()
    return resultat.results.map(ligneVersUtilisateur)
  }

  async mettreAJour(
    id: string,
    changements: Partial<UtilisateurEnregistre>,
  ): Promise<UtilisateurEnregistre | null> {
    const existant = await this.parId(id)
    if (!existant) return null
    const misAJour = { ...existant, ...changements }
    await this.db
      .prepare(
        `UPDATE users SET nom = ?, prenom = ?, role = ?, statut = ?,
           mot_de_passe_hash = ?, mot_de_passe_sel = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(
        misAJour.nom,
        misAJour.prenom,
        misAJour.role,
        misAJour.statut,
        misAJour.motDePasseHash,
        misAJour.motDePasseSel,
        misAJour.updatedAt,
        id,
      )
      .run()
    return misAJour
  }

  async compter(): Promise<number> {
    const ligne = await this.db
      .prepare('SELECT COUNT(*) as total FROM users')
      .first<{ total: number }>()
    return ligne?.total ?? 0
  }
}
