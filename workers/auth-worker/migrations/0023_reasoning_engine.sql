-- AIConfiguration/AIRequest/AIResponse/CitationAIResponse (Target
-- Architecture, domaine "Reasoning Engine", 03_DOMAIN_DATA_MODEL.md),
-- Phase 8c du chantier de migration D1 (docs/CHANTIER-MIGRATION-D1-RECAP.md) :
-- dernière brique de la Phase 8. Même principe que les phases
-- précédentes — scoping simple par client_id.
--
-- Seule la persistance CRUD migre : l'orchestration du raisonnement
-- (executerBoucleRaisonnement, appels réseau réels au fournisseur LLM
-- via ProviderAdapter) reste côté client, hors périmètre de ce
-- chantier. Les 4 tables sont entièrement immuables une fois créées,
-- INSERT-only (condition E4 : une configuration versionnée n'est
-- jamais modifiée en place, une nouvelle version en crée une nouvelle).

CREATE TABLE ai_configurations (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  version TEXT NOT NULL,
  outils_disponibles TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_ai_configurations_client ON ai_configurations(client_id);
CREATE INDEX idx_ai_configurations_version ON ai_configurations(client_id, version);

CREATE TABLE ai_requests (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  mission_id TEXT,
  context_snapshot_id TEXT,
  ai_configuration_id TEXT NOT NULL,
  objectif TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_ai_requests_client ON ai_requests(client_id);

CREATE TABLE ai_responses (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  ai_request_id TEXT NOT NULL,
  texte TEXT NOT NULL,
  etat_confiance TEXT NOT NULL,
  trace_appels_outils TEXT NOT NULL,
  version_moteur TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_ai_responses_client ON ai_responses(client_id);
CREATE INDEX idx_ai_responses_request ON ai_responses(ai_request_id);

CREATE TABLE citations_ai_response (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  ai_response_id TEXT NOT NULL,
  type_objet_cite TEXT NOT NULL,
  objet_id TEXT NOT NULL
);
CREATE INDEX idx_citations_ai_response_client ON citations_ai_response(client_id);
CREATE INDEX idx_citations_ai_response_response ON citations_ai_response(ai_response_id);
