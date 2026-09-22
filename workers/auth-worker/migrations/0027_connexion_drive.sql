-- Phase 9d du chantier de migration D1 (voir docs/CHANTIER-MIGRATION-D1-RECAP.md) :
-- configuration du miroir Drive par client — un enregistrement mutable par
-- client_id (jamais un historique), même discipline d'upsert que
-- parametres_installation mais scopée par client plutôt que par une clé
-- globale (Drive est explicitement "le dossier dédié du client",
-- contrairement au dépôt GitHub/Relais IA, globaux à l'installation).

CREATE TABLE connexion_drive (
  client_id TEXT PRIMARY KEY,
  dossier_id TEXT NOT NULL,
  jeton TEXT NOT NULL
);

CREATE TABLE etat_miroir_drive (
  client_id TEXT PRIMARY KEY,
  dernier_miroir_reussi TEXT
);
