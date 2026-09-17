-- Process/Function/ManufacturingContext (Target Architecture §4/§5/§7),
-- Phase 5a du chantier de migration D1
-- (docs/CHANTIER-MIGRATION-D1-RECAP.md) : même principe que les phases
-- précédentes — scoping simple par client_id, jamais de owner_id/
-- shared_with, audit_log en blob JSON. Les deux tables d'association
-- (N:M FonctionActif<->AssetNode, FonctionActif<->Process) n'ont pas
-- d'audit_log ni de updated_at : ce sont de simples relations créées une
-- fois, jamais mutées (même discipline que relations_techniques,
-- Phase 1).

CREATE TABLE processes (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  nom TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL,
  source_id TEXT,
  audit_log TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_processes_client ON processes(client_id);

CREATE TABLE fonctions_actif (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  nom TEXT NOT NULL,
  description TEXT NOT NULL,
  audit_log TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_fonctions_actif_client ON fonctions_actif(client_id);

CREATE TABLE associations_fonction_asset_node (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  function_id TEXT NOT NULL,
  asset_node_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_associations_fonction_asset_node_client
  ON associations_fonction_asset_node(client_id);

CREATE TABLE associations_fonction_process (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  function_id TEXT NOT NULL,
  process_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_associations_fonction_process_client
  ON associations_fonction_process(client_id);

CREATE TABLE manufacturing_contexts (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  asset_node_id TEXT NOT NULL,
  process_id TEXT NOT NULL,
  produit TEXT NOT NULL,
  recette TEXT,
  format TEXT,
  configuration TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_manufacturing_contexts_client ON manufacturing_contexts(client_id);
