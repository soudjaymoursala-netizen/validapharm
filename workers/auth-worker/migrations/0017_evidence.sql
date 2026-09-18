-- Evidence/EvidenceLocation/ProvenanceLink (Target Architecture, domaine
-- "Evidence", 03_DOMAIN_DATA_MODEL.md), Phase 6c du chantier de migration
-- D1 (docs/CHANTIER-MIGRATION-D1-RECAP.md) : dernière brique du
-- Test/Execution/Evidence engine — la Phase 6 est entièrement close une
-- fois cette migration mergée. Même principe que les phases précédentes
-- — scoping simple par client_id, jamais de owner_id/shared_with.
-- Les 3 tables sont immutables une fois créées (aucune mutation
-- démontrée par les sources, ALCOA+ : une `Evidence` fait foi telle
-- quelle) : ni audit_log, ni updated_at.

CREATE TABLE evidences (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  execution_id TEXT NOT NULL,
  execution_step_id TEXT,
  type TEXT NOT NULL,
  titre TEXT NOT NULL,
  description TEXT NOT NULL,
  horodatage TEXT NOT NULL,
  actor TEXT NOT NULL
);
CREATE INDEX idx_evidences_client ON evidences(client_id);

CREATE TABLE evidence_locations (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  evidence_id TEXT NOT NULL,
  systeme TEXT NOT NULL,
  reference TEXT NOT NULL
);
CREATE INDEX idx_evidence_locations_client ON evidence_locations(client_id);

CREATE TABLE provenance_links (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  evidence_id TEXT NOT NULL,
  requirement_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_provenance_links_client ON provenance_links(client_id);
