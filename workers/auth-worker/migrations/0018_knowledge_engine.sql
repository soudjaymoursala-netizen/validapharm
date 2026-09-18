-- Source/SourceLocation/SourceVersion/Extraction/ExtractionItem/
-- KnowledgeItem/Confirmation/KnowledgeRelation/Conflict (Target
-- Architecture, domaines "Source Intelligence" et "Knowledge",
-- 03_DOMAIN_DATA_MODEL.md), Phase 7a du chantier de migration D1
-- (docs/CHANTIER-MIGRATION-D1-RECAP.md) : première brique de la Phase 7
-- (Knowledge Engine). Même principe que les phases précédentes —
-- scoping simple par client_id, jamais de owner_id/shared_with.
--
-- La plupart de ces tables sont immutables une fois créées (aucune
-- mutation démontrée par les sources) : sources, source_locations,
-- source_versions, extractions, extraction_items, confirmations,
-- knowledge_relations n'ont ni audit_log ni updated_at.
--
-- knowledge_items et conflicts restent mutables : knowledge_items via
-- la validation/rejet (statut/valide_par/audit_log/updated_at,
-- toujours créé au statut a_valider) ; conflicts via la résolution
-- (statut/resolution), jamais auto-résolu.

CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  type TEXT NOT NULL,
  titre TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_sources_client ON sources(client_id);

CREATE TABLE source_locations (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  systeme TEXT NOT NULL,
  reference TEXT NOT NULL
);
CREATE INDEX idx_source_locations_client ON source_locations(client_id);

CREATE TABLE source_versions (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  numero_version INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_source_versions_client ON source_versions(client_id);

CREATE TABLE extractions (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  source_version_id TEXT NOT NULL,
  methode TEXT NOT NULL,
  horodatage TEXT NOT NULL
);
CREATE INDEX idx_extractions_client ON extractions(client_id);

CREATE TABLE extraction_items (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  extraction_id TEXT NOT NULL,
  contenu TEXT NOT NULL,
  position INTEGER NOT NULL
);
CREATE INDEX idx_extraction_items_client ON extraction_items(client_id);

CREATE TABLE knowledge_items (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  extraction_item_id TEXT NOT NULL,
  libelle TEXT NOT NULL,
  valeur_interpretee TEXT NOT NULL,
  statut TEXT NOT NULL,
  valide_par TEXT,
  audit_log TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_knowledge_items_client ON knowledge_items(client_id);

CREATE TABLE confirmations (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  knowledge_item_id TEXT NOT NULL,
  decision TEXT NOT NULL,
  confirme_par TEXT NOT NULL,
  horodatage TEXT NOT NULL
);
CREATE INDEX idx_confirmations_client ON confirmations(client_id);

CREATE TABLE knowledge_relations (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  knowledge_item_source_id TEXT NOT NULL,
  knowledge_item_cible_id TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_knowledge_relations_client ON knowledge_relations(client_id);

CREATE TABLE conflicts (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  knowledge_item_source_id TEXT NOT NULL,
  knowledge_item_cible_id TEXT NOT NULL,
  description TEXT NOT NULL,
  statut TEXT NOT NULL,
  resolution TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_conflicts_client ON conflicts(client_id);
