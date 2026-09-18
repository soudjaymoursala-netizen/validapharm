import type { D1Database } from '../../d1Types'
import type {
  ContextSnapshotEnregistre,
  ContextSnapshotItemEnregistre,
  ContextSnapshotRepo,
} from '../contextSnapshotRepo'

function ligneVersSnapshot(l: Record<string, unknown>): ContextSnapshotEnregistre {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    workspaceId: l.workspace_id as string | null,
    assetNodeId: l.asset_node_id as string | null,
    createdAt: l.created_at as string,
  }
}

function ligneVersItem(l: Record<string, unknown>): ContextSnapshotItemEnregistre {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    contextSnapshotId: l.context_snapshot_id as string,
    typeObjet: l.type_objet as string,
    objetId: l.objet_id as string,
  }
}

export class D1ContextSnapshotRepo implements ContextSnapshotRepo {
  constructor(private readonly db: D1Database) {}

  async listerSnapshots(clientId: string): Promise<ContextSnapshotEnregistre[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM context_snapshots WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersSnapshot(l as Record<string, unknown>))
  }

  async creerSnapshot(snapshot: ContextSnapshotEnregistre): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO context_snapshots
          (id, client_id, workspace_id, asset_node_id, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        snapshot.id,
        snapshot.clientId,
        snapshot.workspaceId,
        snapshot.assetNodeId,
        snapshot.createdAt,
      )
      .run()
  }

  async listerItems(clientId: string): Promise<ContextSnapshotItemEnregistre[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM context_snapshot_items WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersItem(l as Record<string, unknown>))
  }

  async creerItem(item: ContextSnapshotItemEnregistre): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO context_snapshot_items
          (id, client_id, context_snapshot_id, type_objet, objet_id)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(item.id, item.clientId, item.contextSnapshotId, item.typeObjet, item.objetId)
      .run()
  }
}
