-- Schéma initial — 3 tables seulement, cohérent avec la portée
-- étroite décidée : comptes, roster
-- Client, journal d'audit. `Project`/`Section`/gabarits restent IndexedDB
-- + synchronisation GitHub, inchangés par ce lot.

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  mot_de_passe_hash TEXT NOT NULL,
  mot_de_passe_sel TEXT NOT NULL,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'utilisateur')),
  statut TEXT NOT NULL CHECK (statut IN ('actif', 'desactive')) DEFAULT 'actif',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT
);

CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  adresse TEXT,
  secteur TEXT,
  details TEXT,
  statut TEXT NOT NULL CHECK (statut IN ('actif', 'archive')) DEFAULT 'actif',
  archived_at TEXT,
  archived_by TEXT,
  created_by_user_id TEXT NOT NULL REFERENCES users(id),
  -- Tableau JSON d'ids utilisateur (même convention que Project.shared_with
  -- côté frontend) — désormais réellement appliqué par
  -- `listerVisiblesPar`, pas seulement une convention d'affichage.
  shared_with TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Append-only (ALCOA+) : aucune contrainte de mise à jour nécessaire, le
-- code applicatif ne fait jamais d'UPDATE/DELETE sur cette table.
CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  acteur_user_id TEXT NOT NULL,
  acteur_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  justification TEXT,
  timestamp TEXT NOT NULL
);

CREATE INDEX idx_clients_created_by ON clients(created_by_user_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);
