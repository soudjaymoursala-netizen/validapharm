-- Structure Système (référentiel d'actifs) — jusqu'ici stockée uniquement
-- en IndexedDB (navigateur), donc jamais disponible d'un appareil à
-- l'autre malgré des données réelles déjà saisies par l'utilisateur
-- (hiérarchie FERRING PHARMACEUTICAL). Phase 1 du chantier de migration
-- D1 (voir docs/CHANTIER-MIGRATION-D1-RECAP.md) : Cloudflare D1 devient la
-- source de vérité, le dépôt GitHub reste une synchronisation secondaire
-- généralisée séparément.
--
-- `levels`/`associated_nodes`/`periodic_qualification`/`audit_log` :
-- structures imbriquées de taille modeste et jamais interrogées par leur
-- contenu interne côté serveur (toujours lues/écrites en bloc par le
-- client) — stockées en JSON, même choix que `shared_with` sur `clients`.
CREATE TABLE asset_hierarchy_schemas (
  client_id TEXT PRIMARY KEY,
  levels TEXT NOT NULL
);

CREATE TABLE asset_nodes (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  workspace_id TEXT,
  level_key TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  parent_id TEXT,
  associated_nodes TEXT NOT NULL,
  source TEXT NOT NULL,
  qms_connector_id TEXT,
  periodic_qualification TEXT NOT NULL,
  qualification_status TEXT NOT NULL,
  audit_log TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_asset_nodes_client ON asset_nodes(client_id);

CREATE TABLE relations_techniques (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  type_relation TEXT NOT NULL,
  noeud_source_id TEXT NOT NULL,
  noeud_cible_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_relations_techniques_client ON relations_techniques(client_id);
