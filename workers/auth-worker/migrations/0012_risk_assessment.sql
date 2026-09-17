-- Risk Assessment (AMDEC — ICH Q9) autonome, Phase 4d du chantier de
-- migration D1 (docs/CHANTIER-MIGRATION-D1-RECAP.md) : même principe que
-- ACFC/Impact Assessment (Phases 4a/4c) pour `method_profiles_risk_assessment`
-- — méthodologie versionnée par client, scoping simple par client_id,
-- jamais de owner_id/shared_with. `risks_assessment` porte en plus le
-- cycle en deux temps réel (évaluation initiale -> action -> évaluation
-- résiduelle, cf. `RiskAssessment` dans logique-metier/domaine/types.ts) :
-- toutes les colonnes `*_residuel*`/recommandation/responsable/
-- date_cible/actions_menees restent NULL tant qu'aucune action n'a été
-- enregistrée, jamais de valeur devinée. `audit_log` reste un blob JSON,
-- même choix que le reste de la Phase 4.

CREATE TABLE method_profiles_risk_assessment (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  version TEXT NOT NULL,
  effective_date TEXT NOT NULL,
  source TEXT NOT NULL,
  origin TEXT NOT NULL,
  echelle_min INTEGER NOT NULL,
  echelle_max INTEGER NOT NULL,
  seuil_action INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_method_profiles_risk_assessment_client
  ON method_profiles_risk_assessment(client_id);

CREATE TABLE risks_assessment (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  method_profile_id TEXT NOT NULL,
  method_profile_version TEXT NOT NULL,
  asset_node_id TEXT,
  parameter_id TEXT,
  etape_processus TEXT NOT NULL,
  mode_defaillance TEXT NOT NULL,
  effet_defaillance TEXT NOT NULL,
  cause_potentielle TEXT NOT NULL,
  controle_actuel TEXT NOT NULL,
  severite_initiale INTEGER,
  occurrence_initiale INTEGER,
  detectabilite_initiale INTEGER,
  ipr_initial INTEGER,
  verdict_initial TEXT,
  recommandation TEXT,
  responsable TEXT,
  date_cible TEXT,
  actions_menees TEXT,
  severite_residuelle INTEGER,
  occurrence_residuelle INTEGER,
  detectabilite_residuelle INTEGER,
  ipr_residuel INTEGER,
  verdict_residuel TEXT,
  audit_log TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_risks_assessment_client
  ON risks_assessment(client_id);
