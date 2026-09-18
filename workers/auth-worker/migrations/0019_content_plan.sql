-- ContentPlan (Target Architecture, domaine "Deliverable Engine",
-- 03_DOMAIN_DATA_MODEL.md), Phase 7b du chantier de migration D1
-- (docs/CHANTIER-MIGRATION-D1-RECAP.md) : deuxième brique de la Phase 7.
-- Même principe que les phases précédentes — scoping simple par
-- client_id, jamais de owner_id/shared_with.
--
-- Mutable via statut/readiness/audit_log/updated_at (validation, gel,
-- recalcul de readiness) — context_snapshot reste figé une seule fois à
-- la création et n'est jamais modifié ensuite.

CREATE TABLE content_plans (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  asset_node_id TEXT,
  process_id TEXT,
  method_profile_id TEXT,
  method_profile_type TEXT,
  context_snapshot TEXT NOT NULL,
  readiness TEXT NOT NULL,
  statut TEXT NOT NULL,
  audit_log TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_content_plans_client ON content_plans(client_id);
