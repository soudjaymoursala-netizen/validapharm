-- Décisions utilisateur du 26/09/2026 (voir docs/CHANTIER-MIGRATION-D1-RECAP.md §41) :
--
-- 1. Séparation des tâches configurable par client : quand elle est
--    activée, la personne qui approuve (section, test) ou clôture une
--    exécution doit être différente de son auteur. Désactivée par défaut
--    (un consultant qui travaille seul reste autonome).
ALTER TABLE clients ADD COLUMN separation_taches INTEGER NOT NULL DEFAULT 0;

-- 2. Liens d'activation de compte et de réinitialisation de mot de passe
--    (usage unique, durée limitée). Seule l'empreinte SHA-256 du jeton est
--    stockée : le jeton lui-même n'existe que dans le lien envoyé.
CREATE TABLE jetons_compte (
  empreinte TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('activation', 'reinitialisation')),
  expire_at TEXT NOT NULL,
  utilise_at TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT
);
CREATE INDEX idx_jetons_compte_user ON jetons_compte(user_id);

-- 3. Limitation des tentatives de mot de passe, persistée (partagée par
--    toutes les instances du Worker) : une ligne par clé (compte, adresse
--    IP, demande de réinitialisation…), horodatages en millisecondes.
CREATE TABLE tentatives_connexion (
  cle TEXT PRIMARY KEY,
  echecs INTEGER NOT NULL,
  debut INTEGER NOT NULL,
  bloque_jusqua INTEGER NOT NULL
);
