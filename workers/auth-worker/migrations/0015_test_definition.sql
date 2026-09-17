-- Requirement/TestObjective/TestCandidate/Test/Couverture (Target
-- Architecture, domaine "Test", 03_DOMAIN_DATA_MODEL.md), Phase 6a du
-- chantier de migration D1 (docs/CHANTIER-MIGRATION-D1-RECAP.md) :
-- première brique du Test/Execution/Evidence engine — uniquement la
-- chaîne de définition, jamais l'exécution (Phase 6b) ni l'Evidence
-- (Phase 6c), traitées séparément (risque élevé, séquencé en étapes
-- distinctes). Même principe que les phases précédentes — scoping simple
-- par client_id, jamais de owner_id/shared_with, audit_log en blob JSON.
-- `test_objectives`/`couvertures` n'ont pas d'audit_log : simples
-- enregistrements créés une fois puis jamais mutés (pour `couvertures`)
-- ou dont les seuls champs mutables (`titre`/`description`) ne sont pas
-- encore exposés par le store (pour `test_objectives`) — même discipline
-- que `associations_fonction_process`. `etapes` (Test) reste un blob JSON
-- embarqué, jamais une table séparée (aucune source ne démontre de besoin
-- de les interroger indépendamment de leur Test).

CREATE TABLE requirements (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  reference TEXT NOT NULL,
  titre TEXT NOT NULL,
  description TEXT NOT NULL,
  asset_node_id TEXT,
  process_id TEXT,
  audit_log TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_requirements_client ON requirements(client_id);

CREATE TABLE test_objectives (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  requirement_id TEXT NOT NULL,
  titre TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_test_objectives_client ON test_objectives(client_id);

CREATE TABLE test_candidates (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  test_objective_id TEXT NOT NULL,
  risk_assessment_id TEXT,
  titre TEXT NOT NULL,
  description TEXT NOT NULL,
  statut TEXT NOT NULL,
  motif_rejet TEXT,
  duplique_de_id TEXT,
  remplace_par_id TEXT,
  audit_log TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_test_candidates_client ON test_candidates(client_id);

CREATE TABLE tests (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  test_candidate_id TEXT NOT NULL,
  titre TEXT NOT NULL,
  description TEXT NOT NULL,
  etapes TEXT NOT NULL,
  statut TEXT NOT NULL,
  audit_log TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_tests_client ON tests(client_id);

CREATE TABLE couvertures (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  requirement_id TEXT NOT NULL,
  test_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_couvertures_client ON couvertures(client_id);
