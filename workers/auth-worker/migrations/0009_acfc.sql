-- Méthode ACFC configurable par client (F2 du catalogue §10) — jusqu'ici
-- stockée uniquement en IndexedDB (navigateur), donc jamais disponible
-- d'un appareil à l'autre. Phase 4a du chantier de migration D1 (voir
-- docs/CHANTIER-MIGRATION-D1-RECAP.md) : Cloudflare D1 devient la source
-- de vérité — mêmes routes authentifiées scopées par client que Structure
-- Système (Phase 1), pas de owner_id/shared_with (ACFC n'a jamais eu cette
-- notion, contrairement à Project).
--
-- `questions`/`audit_log` : structures imbriquées de taille modeste et
-- jamais interrogées par leur contenu interne côté serveur (toujours
-- lues/écrites en bloc par le client) — stockées en JSON, même choix que
-- `levels`/`associated_nodes` sur Structure Système (migration 0004).
CREATE TABLE method_profiles_acfc (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  version TEXT NOT NULL,
  effective_date TEXT NOT NULL,
  source TEXT NOT NULL,
  origin TEXT NOT NULL,
  questions TEXT NOT NULL,
  decision_rule TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_method_profiles_acfc_client ON method_profiles_acfc(client_id);

CREATE TABLE evaluations_acfc (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  method_profile_id TEXT NOT NULL,
  method_profile_version TEXT NOT NULL,
  asset_node_id TEXT,
  nom_element TEXT NOT NULL,
  reponses TEXT NOT NULL,
  verdict TEXT,
  audit_log TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_evaluations_acfc_client ON evaluations_acfc(client_id);
