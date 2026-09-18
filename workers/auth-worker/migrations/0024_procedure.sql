-- Procedure/ProcedureStep (cerveau procédural, 03_DOMAIN_DATA_MODEL.md),
-- Phase 9a du chantier de migration D1 (docs/CHANTIER-MIGRATION-D1-RECAP.md).
-- Même principe que les phases précédentes — scoping simple par client_id.
--
-- Les deux tables sont INSERT-only : une Procedure est immuable une fois
-- créée (une nouvelle révision de la même `reference` crée une nouvelle
-- Procedure avec un numero_version incrémenté, jamais une mutation en
-- place — répond à R-21), une ProcedureStep de même.

CREATE TABLE procedures (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  reference TEXT NOT NULL,
  numero_version INTEGER NOT NULL,
  titre TEXT NOT NULL,
  effective_date TEXT NOT NULL,
  categorie TEXT NOT NULL,
  source_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_procedures_client ON procedures(client_id);
CREATE INDEX idx_procedures_reference ON procedures(client_id, reference);

CREATE TABLE procedure_steps (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  procedure_id TEXT NOT NULL,
  ordre INTEGER NOT NULL,
  description TEXT NOT NULL,
  obligatoire INTEGER NOT NULL,
  condition TEXT,
  responsable TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_procedure_steps_client ON procedure_steps(client_id);
CREATE INDEX idx_procedure_steps_procedure ON procedure_steps(procedure_id);
