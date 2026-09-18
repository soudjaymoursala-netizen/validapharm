import type { D1Database } from '../../d1Types'
import type {
  GabaritExportClientEnregistre,
  GabaritExportClientRepo,
} from '../gabaritExportClientRepo'

function ligneVersGabarit(l: Record<string, unknown>): GabaritExportClientEnregistre {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    nom: l.nom as string,
    tagsTrouves: JSON.parse(l.tags_trouves as string) as string[],
    createdAt: l.created_at as string,
  }
}

export class D1GabaritExportClientRepo implements GabaritExportClientRepo {
  constructor(private readonly db: D1Database) {}

  async listerParClient(clientId: string): Promise<GabaritExportClientEnregistre[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM gabarits_export_client WHERE client_id = ? ORDER BY created_at DESC')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersGabarit(l as Record<string, unknown>))
  }

  async parId(id: string): Promise<GabaritExportClientEnregistre | null> {
    const ligne = await this.db
      .prepare('SELECT * FROM gabarits_export_client WHERE id = ?')
      .bind(id)
      .first()
    return ligne ? ligneVersGabarit(ligne as Record<string, unknown>) : null
  }

  async creer(g: GabaritExportClientEnregistre): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO gabarits_export_client
          (id, client_id, nom, tags_trouves, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(g.id, g.clientId, g.nom, JSON.stringify(g.tagsTrouves), g.createdAt)
      .run()
  }

  async supprimer(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM gabarits_export_client WHERE id = ?').bind(id).run()
  }
}
