-- Connector/SyncJob/ExternalReference (Target Architecture, domaine
-- "Integration", 03_DOMAIN_DATA_MODEL.md), Phase 7c du chantier de
-- migration D1 (docs/CHANTIER-MIGRATION-D1-RECAP.md) : troisième et
-- dernière brique de la Phase 7. Même principe que les phases
-- précédentes — scoping simple par client_id, jamais de owner_id/
-- shared_with.
--
-- Connector : mutable via actif (activation/désactivation, bascule) et
-- réellement supprimable (DELETE, configuration pure — pas un
-- enregistrement GxP à préserver, contrairement au reste du chantier).
-- `config` (secrets de connexion inclus : jeton/mot de passe) stocké en
-- JSON, même principe que `context_snapshot` de ContentPlan.
--
-- SyncJob : mutable via statut/tentative/derniere_erreur/updated_at
-- (cycle de vie d'une tentative de synchronisation).
--
-- ExternalReference : immutable, pur pointeur vers un document externe.

CREATE TABLE connectors (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  nom TEXT NOT NULL,
  actif INTEGER NOT NULL,
  type TEXT NOT NULL,
  config TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_connectors_client ON connectors(client_id);

CREATE TABLE sync_jobs (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  connector_id TEXT NOT NULL,
  statut TEXT NOT NULL,
  tentative INTEGER NOT NULL,
  derniere_erreur TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_sync_jobs_client ON sync_jobs(client_id);
CREATE INDEX idx_sync_jobs_connector ON sync_jobs(connector_id);

CREATE TABLE external_references (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  connector_id TEXT NOT NULL,
  identifiant_externe TEXT NOT NULL,
  libelle TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_external_references_client ON external_references(client_id);
CREATE INDEX idx_external_references_connector ON external_references(connector_id);
