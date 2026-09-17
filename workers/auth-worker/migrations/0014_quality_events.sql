-- QualityEvent/ReferenceQualityEvent (URS catalogue §10 famille H : Change
-- Control/CAPA/Deviation/Investigation/AuditFinding, famille I : Periodic
-- Review), Phase 5b du chantier de migration D1
-- (docs/CHANTIER-MIGRATION-D1-RECAP.md) : dernière brique de la Phase 5.
-- Même principe que les phases précédentes — scoping simple par
-- client_id, jamais de owner_id/shared_with, audit_log/reference_externe
-- en blobs JSON. `reference_externe` référence un système externe, ne le
-- duplique jamais comme contenu officiel (garde-fou non négociable, voir
-- domaine `QualityEvent`). `references_quality_event` n'a pas d'audit_log :
-- simple relation créée une fois, jamais mutée (même discipline que
-- `relations_techniques`/`associations_fonction_process`).

CREATE TABLE quality_events (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  type TEXT NOT NULL,
  titre TEXT NOT NULL,
  description TEXT NOT NULL,
  origine TEXT NOT NULL,
  reference_externe TEXT,
  asset_node_id TEXT,
  process_id TEXT,
  manufacturing_context_id TEXT,
  statut TEXT NOT NULL,
  audit_log TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_quality_events_client ON quality_events(client_id);

CREATE TABLE references_quality_event (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  quality_event_source_id TEXT NOT NULL,
  quality_event_cible_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_references_quality_event_client ON references_quality_event(client_id);
