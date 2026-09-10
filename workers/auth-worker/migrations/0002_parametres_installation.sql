-- Paramètres globaux à l'installation (dépôt GitHub dédié, Relais IA,
-- Drive de lecture pour la bibliothèque de normes) — jusqu'ici stockés
-- uniquement dans IndexedDB (navigateur), donc jamais partagés entre
-- appareils/postes : un utilisateur qui se connectait depuis un autre poste
-- retrouvait ces sections vides, obligé de tout ressaisir. D1 devient la
-- source de vérité (comme `clients` depuis 0001), une seule ligne par
-- paramètre (`cle`), un payload JSON en `valeur` (forme différente selon
-- la clé, jamais validée en SQL — validation faite côté routeur).
--
-- Lecture ouverte à tout utilisateur authentifié (le jeton/PAT qu'elle
-- contient doit être utilisable directement depuis le navigateur par
-- n'importe quel compte de l'organisation, exactement comme avant cette
-- migration où chacun devait le ressaisir lui-même) ; écriture réservée à
-- un admin (voir `routeur.ts`).
CREATE TABLE parametres_installation (
  cle TEXT PRIMARY KEY,
  valeur TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL REFERENCES users(id)
);
