-- Décisions utilisateur du 29/09/2026 (docs/CHANTIER-MIGRATION-D1-RECAP.md §43) :
--
-- 1. Unicité (client, version) des méthodes ACFC, Impact Assessment et
--    AMDEC. Le numéro de version est attribué par le serveur depuis le
--    §42 ; deux créations simultanées pouvaient encore produire deux « v2 »
--    pour le même client. Vérifié avant application : aucun doublon en
--    production (requêtes de contrôle du §43).
--
-- 2. Conclusion de stratégie ACFC enregistrée avec l'évaluation (audit UX
--    du 25/09/2026, constat 3 : la complexité et la conclusion IQ/OQ/PQ
--    étaient affichées puis perdues). Colonnes facultatives : les
--    évaluations existantes restent sans conclusion.
CREATE UNIQUE INDEX IF NOT EXISTS ux_method_profiles_acfc_client_version
  ON method_profiles_acfc(client_id, version);
CREATE UNIQUE INDEX IF NOT EXISTS ux_method_profiles_impact_assessment_client_version
  ON method_profiles_impact_assessment(client_id, version);
CREATE UNIQUE INDEX IF NOT EXISTS ux_method_profiles_risk_assessment_client_version
  ON method_profiles_risk_assessment(client_id, version);

ALTER TABLE evaluations_acfc ADD COLUMN complexite TEXT;
ALTER TABLE evaluations_acfc ADD COLUMN conclusion TEXT;
ALTER TABLE evaluations_acfc ADD COLUMN version_grille TEXT;
