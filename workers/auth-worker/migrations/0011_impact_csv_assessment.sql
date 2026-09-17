-- Impact Assessment / System Classification (F1 du catalogue §10) et
-- Computer System Assessment (F3), Phase 4c du chantier de migration D1
-- (docs/CHANTIER-MIGRATION-D1-RECAP.md) : même principe que ACFC (F2,
-- Phase 4a) — scoping simple par client_id, jamais de owner_id/
-- shared_with. `questions`/`reponses`/`audit_log` restent des blobs JSON,
-- même choix que method_profiles_acfc/evaluations_acfc.

CREATE TABLE method_profiles_impact_assessment (
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
CREATE INDEX idx_method_profiles_impact_assessment_client
  ON method_profiles_impact_assessment(client_id);

CREATE TABLE evaluations_impact_assessment (
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
CREATE INDEX idx_evaluations_impact_assessment_client
  ON evaluations_impact_assessment(client_id);

-- Computer System Assessment (F3) — pas de MethodProfile, la
-- catégorisation GAMP5 est une grille normative fixe (PIC/S PI 011-3),
-- jamais configurable par client.
CREATE TABLE evaluations_csv_assessment (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  asset_node_id TEXT,
  nom_systeme TEXT NOT NULL,
  categorie_gamp5 INTEGER NOT NULL,
  justification_categorie TEXT NOT NULL,
  pertinence_gxp INTEGER NOT NULL,
  pertinence_eres_part11 INTEGER NOT NULL,
  justification_pertinence TEXT NOT NULL,
  audit_log TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_evaluations_csv_assessment_client
  ON evaluations_csv_assessment(client_id);
