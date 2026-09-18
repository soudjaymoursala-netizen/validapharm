-- ContextSnapshot/ContextSnapshotItem (Target Architecture, domaine
-- "Context Engine", 03_DOMAIN_DATA_MODEL.md), Phase 8b du chantier de
-- migration D1 (docs/CHANTIER-MIGRATION-D1-RECAP.md). Même principe que
-- les phases précédentes — scoping simple par client_id.
--
-- ContextSnapshot/ContextSnapshotItem sont entièrement immuables
-- (invariant #12) : INSERT-only, jamais de colonne mise à jour après
-- création.

CREATE TABLE context_snapshots (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  workspace_id TEXT,
  asset_node_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_context_snapshots_client ON context_snapshots(client_id);

CREATE TABLE context_snapshot_items (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  context_snapshot_id TEXT NOT NULL,
  type_objet TEXT NOT NULL,
  objet_id TEXT NOT NULL
);
CREATE INDEX idx_context_snapshot_items_client ON context_snapshot_items(client_id);
CREATE INDEX idx_context_snapshot_items_snapshot ON context_snapshot_items(context_snapshot_id);
