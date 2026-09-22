-- Phase 9f du chantier de migration D1 (voir docs/CHANTIER-MIGRATION-D1-RECAP.md) :
-- configuration IA par client (choix du fournisseur, accusé des conditions
-- de traitement, qualification de fiabilité par mode d'usage, gabarit
-- d'export par défaut, consentement télémétrie) — un enregistrement
-- mutable par client_id (jamais un historique), même discipline d'upsert
-- que connexion_drive/etat_miroir_drive (Phase 9d) mais avec des champs
-- structurés stockés en JSON (TEXT) : la logique métier (remise à zéro de
-- l'accusé/qualification au changement de fournisseur, séparation par
-- mode d'usage) reste côté store frontend, ce dépôt ne fait que persister
-- l'état qu'on lui donne.

CREATE TABLE client_configs (
  client_id TEXT PRIMARY KEY,
  ai_provider TEXT NOT NULL,
  ai_provider_conditions_acquittees TEXT,
  ai_provider_reliability_qualification TEXT NOT NULL,
  export_template_id TEXT,
  consent_telemetry TEXT NOT NULL
);
