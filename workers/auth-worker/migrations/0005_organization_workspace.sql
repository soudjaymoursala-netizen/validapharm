-- Organization/Workspace — jusqu'ici stockés uniquement en IndexedDB
-- (navigateur), donc jamais disponibles d'un appareil à l'autre. Phase 2
-- du chantier de migration D1 (voir docs/CHANTIER-MIGRATION-D1-RECAP.md).
--
-- `Organization.id` reprend exactement l'id du `Client` migré (même
-- convention que côté Dexie, voir `useOrganizationStore` — aucune des
-- tables indexées par `client_id` n'a besoin d'être touchée par cette
-- migration, leur `client_id` référence toujours la même valeur).
CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  type TEXT NOT NULL,
  nom TEXT NOT NULL,
  parent_workspace_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_workspaces_organization ON workspaces(organization_id);
