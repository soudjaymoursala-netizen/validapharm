import type { D1Database } from '../../d1Types'
import type { JetonCompteEnregistre, JetonsCompteRepo, TypeJetonCompte } from '../jetonsCompteRepo'

interface LigneJetonCompte {
  empreinte: string
  user_id: string
  type: string
  expire_at: string
  utilise_at: string | null
  created_at: string
  created_by: string | null
}

export class D1JetonsCompteRepo implements JetonsCompteRepo {
  constructor(private readonly db: D1Database) {}

  async creer(jeton: JetonCompteEnregistre): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO jetons_compte
          (empreinte, user_id, type, expire_at, utilise_at, created_at, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        jeton.empreinte,
        jeton.userId,
        jeton.type,
        jeton.expireAt,
        jeton.utiliseAt,
        jeton.createdAt,
        jeton.createdBy,
      )
      .run()
  }

  async parEmpreinte(empreinte: string): Promise<JetonCompteEnregistre | null> {
    const ligne = await this.db
      .prepare('SELECT * FROM jetons_compte WHERE empreinte = ?')
      .bind(empreinte)
      .first<LigneJetonCompte>()
    if (!ligne) return null
    return {
      empreinte: ligne.empreinte,
      userId: ligne.user_id,
      type: ligne.type as TypeJetonCompte,
      expireAt: ligne.expire_at,
      utiliseAt: ligne.utilise_at,
      createdAt: ligne.created_at,
      createdBy: ligne.created_by,
    }
  }

  async invaliderPourUtilisateur(userId: string, date: string): Promise<void> {
    await this.db
      .prepare('UPDATE jetons_compte SET utilise_at = ? WHERE user_id = ? AND utilise_at IS NULL')
      .bind(date, userId)
      .run()
  }
}
