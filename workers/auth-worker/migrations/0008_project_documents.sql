-- ProjectDocument (section "Documents" d'un projet, §4.9) — jusqu'ici
-- stocké uniquement en IndexedDB (navigateur), donc jamais disponible d'un
-- appareil à l'autre, contrairement à `Project`/`Section` (Phases 3a/3b) qui
-- ont déjà migré. Phase 3c du chantier de migration D1 (voir
-- docs/CHANTIER-MIGRATION-D1-RECAP.md) : Cloudflare D1 devient la source de
-- vérité pour les métadonnées, le bucket R2 déjà utilisé par la
-- Bibliothèque de normes (migration 0003) accueille le texte extrait et le
-- fichier binaire d'origine (`project-documents/<id>/texte.txt` et
-- `project-documents/<id>/contenu`), jamais dans cette table — même
-- répartition D1/R2 que `documents_normatifs`. `ProjectDocument.content`
-- n'a jamais été synchronisé vers GitHub (portée de
-- `useSynchronisationStore` limitée à projects/sections) : ce
-- comportement ne change pas ici.
--
-- Lecture/écriture ouvertes à tout utilisateur authentifié, même régime
-- que `sections` (Phase 3b) — aucune frontière de sécurité par projet
-- appliquée ici (voir `permissionsProjet.ts`), cohérent avec l'ancienne
-- table Dexie unique.
CREATE TABLE project_documents (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  status TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  has_binary_content INTEGER NOT NULL,
  uploaded_at TEXT NOT NULL,
  uploaded_by TEXT NOT NULL
);

CREATE INDEX idx_project_documents_project ON project_documents(project_id);
