-- Phase 9c du chantier de migration D1 : AiChatSessionLog (journal des
-- sessions du panneau Chat — horodatage/fournisseur/moteur/mode, jamais le
-- contenu échangé). Entité entièrement immuable une fois créée
-- (INSERT-only), jamais de mise à jour ni de suppression.
CREATE TABLE ai_chat_session_logs (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  mode TEXT NOT NULL,
  ai_provider TEXT NOT NULL,
  moteur_version TEXT,
  document_joint INTEGER NOT NULL
);
CREATE INDEX idx_ai_chat_session_logs_client ON ai_chat_session_logs(client_id);
