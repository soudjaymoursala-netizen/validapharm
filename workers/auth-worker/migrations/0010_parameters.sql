-- Parameter / ClassificationCriticiteParametre / CPP / CQA
-- (Target Architecture §10, Phase 4b du chantier de migration D1,
-- docs/CHANTIER-MIGRATION-D1-RECAP.md) : même principe que Structure
-- Système/ACFC (Phases 1/4a) — scoping simple par client_id, jamais de
-- owner_id/shared_with (aucune notion de propriétaire distincte du client
-- dans ces types). `audit_log` reste un blob JSON, même choix que
-- `questions`/`audit_log` d'ACFC.

CREATE TABLE parameters (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  asset_node_id TEXT,
  nom TEXT NOT NULL,
  description TEXT NOT NULL,
  unite TEXT,
  audit_log TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_parameters_client ON parameters(client_id);

-- Déclaration qu'un Parameter est important ou critique pour le procédé —
-- jamais une mutation de `parameters`, un objet séparé et daté (§10).
CREATE TABLE classifications_criticite_parametre (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  parameter_id TEXT NOT NULL,
  niveau TEXT NOT NULL,
  contexte TEXT,
  justification TEXT NOT NULL,
  audit_log TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_classifications_criticite_parametre_client
  ON classifications_criticite_parametre(client_id);

-- CPP (Critical Process Parameter, ICH Q8/Q9/Q10) — déclaration humaine
-- explicite et contextuelle, jamais dérivée d'une classification.
CREATE TABLE cpps (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  parameter_id TEXT NOT NULL,
  contexte TEXT NOT NULL,
  justification TEXT NOT NULL,
  actif INTEGER NOT NULL,
  audit_log TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_cpps_client ON cpps(client_id);

-- CQA (Critical Quality Attribute, ICH Q8) — même principe que CPP mais sur
-- un attribut qualité produit, sans parameter_id.
CREATE TABLE cqas (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  nom TEXT NOT NULL,
  description TEXT NOT NULL,
  contexte TEXT NOT NULL,
  justification TEXT NOT NULL,
  actif INTEGER NOT NULL,
  audit_log TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_cqas_client ON cqas(client_id);
