-- Section (rédaction/cycle de vie d'un livrable) — jusqu'ici stockée
-- uniquement en IndexedDB (navigateur), donc jamais disponible d'un
-- appareil à l'autre malgré une sauvegarde GitHub existante
-- (useSynchronisationStore, portée explicitement conservée). Phase 3b du
-- chantier de migration D1 (voir docs/CHANTIER-MIGRATION-D1-RECAP.md) :
-- Cloudflare D1 devient la source de vérité, la synchronisation GitHub
-- reste un filet de secours secondaire.
--
-- Contrairement à `projects` (Phase 3a, visibilité réellement appliquée
-- côté serveur), `Section.owner_id`/`shared_with` ne sont ici, comme avant
-- cette migration, jamais câblés comme une frontière de sécurité réelle
-- (voir `permissionsProjet.ts`) — les routes Worker n'exigent qu'une
-- authentification, jamais un contrôle d'appartenance à un projet
-- précis : même régime d'accès que l'ancienne table Dexie unique
-- (accessible sans restriction à quiconque avait accès à l'application),
-- pas une régression.
--
-- `shared_with`/`meta`/`workflow`/`signatures`/`revisions`/`values`/
-- `tables`/`generation_source`/`audit_log` : structures imbriquées
-- stockées en JSON, même choix que `projects`. `values`/`tables` sont des
-- mots-clés SQL — colonnes nommées `values_json`/`tables_json` pour
-- écarter toute ambiguïté.
CREATE TABLE sections (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  template_type TEXT NOT NULL,
  template_engine_version TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  shared_with TEXT NOT NULL,
  language TEXT NOT NULL,
  status TEXT NOT NULL,
  meta TEXT NOT NULL,
  workflow TEXT NOT NULL,
  signatures TEXT NOT NULL,
  revisions TEXT NOT NULL,
  values_json TEXT NOT NULL,
  tables_json TEXT NOT NULL,
  generation_source TEXT NOT NULL,
  procedure_id TEXT,
  asset_node_id TEXT,
  audit_log TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_sections_project ON sections(project_id);
CREATE INDEX idx_sections_procedure ON sections(procedure_id);
CREATE INDEX idx_sections_asset_node ON sections(asset_node_id);
