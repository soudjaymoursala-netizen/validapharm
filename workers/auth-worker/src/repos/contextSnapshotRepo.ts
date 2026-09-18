export interface ContextSnapshotEnregistre {
  id: string
  clientId: string
  workspaceId: string | null
  assetNodeId: string | null
  createdAt: string
}

export interface ContextSnapshotItemEnregistre {
  id: string
  clientId: string
  contextSnapshotId: string
  typeObjet: string
  objetId: string
}

/**
 * Dépôt ContextSnapshot (Target Architecture, domaine "Context Engine")
 * — Phase 8b du chantier de migration D1 (voir
 * docs/CHANTIER-MIGRATION-D1-RECAP.md). `ContextSnapshot`/
 * `ContextSnapshotItem` sont entièrement immuables (invariant #12) :
 * INSERT-only, aucune méthode de mise à jour exposée.
 */
export interface ContextSnapshotRepo {
  listerSnapshots(clientId: string): Promise<ContextSnapshotEnregistre[]>
  creerSnapshot(snapshot: ContextSnapshotEnregistre): Promise<void>

  listerItems(clientId: string): Promise<ContextSnapshotItemEnregistre[]>
  creerItem(item: ContextSnapshotItemEnregistre): Promise<void>
}

export class ContextSnapshotRepoMemoire implements ContextSnapshotRepo {
  private readonly snapshots = new Map<string, ContextSnapshotEnregistre>()
  private readonly items = new Map<string, ContextSnapshotItemEnregistre>()

  async listerSnapshots(clientId: string): Promise<ContextSnapshotEnregistre[]> {
    return [...this.snapshots.values()].filter((s) => s.clientId === clientId)
  }

  async creerSnapshot(snapshot: ContextSnapshotEnregistre): Promise<void> {
    if (this.snapshots.has(snapshot.id)) return
    this.snapshots.set(snapshot.id, snapshot)
  }

  async listerItems(clientId: string): Promise<ContextSnapshotItemEnregistre[]> {
    return [...this.items.values()].filter((i) => i.clientId === clientId)
  }

  async creerItem(item: ContextSnapshotItemEnregistre): Promise<void> {
    if (this.items.has(item.id)) return
    this.items.set(item.id, item)
  }
}
