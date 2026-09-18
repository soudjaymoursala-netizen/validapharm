-- Phase 9b du chantier de migration D1 : GabaritExportClient (gabarits
-- d'export .docx personnalisés par client, §4.3bis). Le contenu binaire du
-- fichier .docx vit dans R2 (StockageBinaireRepo), jamais ici — même
-- répartition que project_documents (migration 0008).
CREATE TABLE gabarits_export_client (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  nom TEXT NOT NULL,
  tags_trouves TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_gabarits_export_client_client ON gabarits_export_client(client_id);
