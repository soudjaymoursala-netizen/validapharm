-- Project (référentiel de projets) — jusqu'ici stocké uniquement en
-- IndexedDB (navigateur), donc jamais disponible d'un appareil à l'autre
-- malgré une sauvegarde GitHub existante (useSynchronisationStore, portée
-- explicitement conservée). Phase 3a du chantier de migration D1 (voir
-- docs/CHANTIER-MIGRATION-D1-RECAP.md) : Cloudflare D1 devient la source
-- de vérité, la synchronisation GitHub reste un filet de secours
-- secondaire.
--
-- Modèle de visibilité différent des domaines déjà migrés (Structure
-- Système/Organization, scopés `client_id`) : un `Project` est visible par
-- son propriétaire (`owner_id`, l'email du compte) ou par partage explicite
-- (`shared_with`), jamais seulement par `client_id` (un projet peut même
-- avoir `client_id: null`) — même logique que `clients.createdByUserId`/
-- `sharedWith`, ici au niveau projet plutôt que client.
--
-- `sections`/`documents`/`links`/`shared_with`/`audit_log` : structures
-- imbriquées stockées en JSON, même choix que `clients.shared_with`.
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  context TEXT NOT NULL,
  scope_in TEXT NOT NULL,
  scope_out TEXT NOT NULL,
  deadline TEXT,
  language_default TEXT NOT NULL,
  client_id TEXT,
  sections TEXT NOT NULL,
  documents TEXT NOT NULL,
  links TEXT NOT NULL,
  statut TEXT NOT NULL,
  phase TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  shared_with TEXT NOT NULL,
  archived_at TEXT,
  archived_by TEXT,
  audit_log TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_projects_client ON projects(client_id);
CREATE INDEX idx_projects_owner ON projects(owner_id);
