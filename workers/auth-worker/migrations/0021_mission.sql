-- Mission/Activity/Dependency/AssociationMissionQualityEvent (Target
-- Architecture, domaine "Work", 03_DOMAIN_DATA_MODEL.md), Phase 8a du
-- chantier de migration D1 (docs/CHANTIER-MIGRATION-D1-RECAP.md) :
-- première brique de la Phase 8. Même principe que les phases
-- précédentes — scoping simple par client_id, jamais de owner_id/
-- shared_with.
--
-- Mission/Activity : mutables via statut/audit_log/updated_at (cycle de
-- vie), même patron que ContentPlan/KnowledgeItem.
-- Dependency/AssociationMissionQualityEvent : INSERT-only, purs
-- pointeurs relationnels.

CREATE TABLE missions (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  workspace_id TEXT,
  asset_node_id TEXT,
  titre TEXT NOT NULL,
  description TEXT NOT NULL,
  statut TEXT NOT NULL,
  audit_log TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_missions_client ON missions(client_id);

CREATE TABLE activities (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  mission_id TEXT NOT NULL,
  titre TEXT NOT NULL,
  description TEXT NOT NULL,
  statut TEXT NOT NULL,
  audit_log TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_activities_client ON activities(client_id);
CREATE INDEX idx_activities_mission ON activities(mission_id);

CREATE TABLE dependencies (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  activity_source_id TEXT NOT NULL,
  activity_cible_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_dependencies_client ON dependencies(client_id);
CREATE INDEX idx_dependencies_source ON dependencies(activity_source_id);

CREATE TABLE associations_mission_quality_event (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  mission_id TEXT NOT NULL,
  quality_event_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_assoc_mission_qe_client ON associations_mission_quality_event(client_id);
CREATE INDEX idx_assoc_mission_qe_mission ON associations_mission_quality_event(mission_id);
