-- Métadonnées des documents normatifs (Bibliothèque de normes) — jusqu'ici
-- stockés uniquement en IndexedDB (navigateur), donc jamais partagés entre
-- appareils/postes malgré leur nature "globale à l'installation" (voir
-- `NormativeDocument` : "jamais scopé par client"). Même limite déjà
-- corrigée pour `parametres_installation` (migration 0002), appliquée ici
-- aux documents eux-mêmes.
--
-- Le contenu réel (texte extrait + fichier binaire d'origine s'il existe)
-- vit dans le bucket R2 dédié (`documents/<id>/texte.txt` et
-- `documents/<id>/contenu`), jamais dans cette table : un texte extrait de
-- PDF/DOCX peut être volumineux, D1 reste réservé aux métadonnées de
-- taille fixe et prévisible.
--
-- Lecture/écriture ouvertes à tout utilisateur authentifié (import et
-- suppression sont déjà des gestes non-admin côté écran Bibliothèque de
-- normes, `BibliothequeNormes.vue` — cohérent avec le comportement
-- précédent en IndexedDB, jamais restreint à un admin).
CREATE TABLE documents_normatifs (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  titre TEXT NOT NULL,
  filename TEXT NOT NULL,
  source TEXT NOT NULL,
  source_ref TEXT,
  mime_type TEXT NOT NULL,
  has_binary_content INTEGER NOT NULL,
  uploaded_at TEXT NOT NULL,
  uploaded_by TEXT NOT NULL REFERENCES users(id)
);

CREATE INDEX idx_documents_normatifs_category ON documents_normatifs(category);
