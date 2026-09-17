-- Execution/ExecutionStep/Measurement/ExecutionEvent (Target Architecture,
-- domaine "Execution", 03_DOMAIN_DATA_MODEL.md), Phase 6b du chantier de
-- migration D1 (docs/CHANTIER-MIGRATION-D1-RECAP.md) : le moteur
-- d'exécution d'un Test approuvé — jamais l'Evidence documentaire associée
-- (Phase 6c), traitée séparément. Même principe que les phases
-- précédentes — scoping simple par client_id, jamais de
-- owner_id/shared_with, audit_log en blob JSON.
-- `execution_steps`/`measurements`/`execution_events` n'ont ni audit_log
-- ni updated_at : immutables une fois créés (aucune mutation démontrée par
-- les sources) — seule `executions` est mutable (statut/verdict/date_fin
-- via la clôture), même discipline que `test_candidates`/`tests` (Phase 6a).

CREATE TABLE executions (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  test_id TEXT NOT NULL,
  asset_node_id TEXT,
  executant TEXT NOT NULL,
  statut TEXT NOT NULL,
  verdict TEXT,
  date_debut TEXT NOT NULL,
  date_fin TEXT,
  audit_log TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_executions_client ON executions(client_id);

CREATE TABLE execution_steps (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  execution_id TEXT NOT NULL,
  test_step_id TEXT NOT NULL,
  resultat TEXT NOT NULL,
  observation TEXT NOT NULL,
  horodatage TEXT NOT NULL
);
CREATE INDEX idx_execution_steps_client ON execution_steps(client_id);

CREATE TABLE measurements (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  execution_step_id TEXT NOT NULL,
  libelle TEXT NOT NULL,
  valeur TEXT NOT NULL,
  unite TEXT,
  horodatage TEXT NOT NULL
);
CREATE INDEX idx_measurements_client ON measurements(client_id);

CREATE TABLE execution_events (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  execution_id TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  quality_event_id TEXT,
  horodatage TEXT NOT NULL,
  actor TEXT NOT NULL
);
CREATE INDEX idx_execution_events_client ON execution_events(client_id);
