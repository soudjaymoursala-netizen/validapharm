import type { DefinitionGabarit } from '../definitionGabarit'

/**
 * Gabarit "OQ — Qualification opérationnelle" (famille C du catalogue de
 * gabarits, "Protocoles"). Deux liens obligatoires distincts s'appliquent à cette
 * section à deux points de contrôle différents (`gardesFinalisation.ts`) :
 * Contexte procédé à l'entrée en vérification et Plan
 * de maintenance préventive à la clôture. Le schéma de
 * gabarit ne porte qu'un seul `required_link_type` par section (limitation
 * déjà documentée dans `definitionGabarit.ts`) — `plan_maintenance` est
 * retenu ici car c'est la contrainte la plus tardive/spécifique à l'OQ.
 */
export const definitionOQ: DefinitionGabarit = {
  template_id: 'oq',
  template_version: '1.0.0',
  family: 'C',
  normes_associees: ['ASTM E2500', 'EudraLex Annexe 15 §4 et §3.12'],
  sections: [
    {
      section_key: 'essais_fonctionnels',
      labels: { fr: 'Essais fonctionnels', en: 'Functional tests', de: 'Funktionsprüfungen' },
      required_link_type: 'plan_maintenance',
      fields: [
        {
          field_key: 'essais',
          labels: { fr: 'Essais', en: 'Tests', de: 'Prüfungen' },
          type: 'tableau_dynamique',
          required: false,
          colonnes: [
            {
              field_key: 'essai',
              labels: { fr: 'Essai', en: 'Test', de: 'Prüfung' },
              type: 'texte_court',
              required: true,
              longueur_max: 300,
            },
            {
              field_key: 'critere_acceptation',
              labels: {
                fr: "Critère d'acceptation",
                en: 'Acceptance criterion',
                de: 'Akzeptanzkriterium',
              },
              type: 'texte_court',
              required: true,
              longueur_max: 300,
            },
            {
              field_key: 'resultat',
              labels: { fr: 'Résultat', en: 'Result', de: 'Ergebnis' },
              type: 'texte_court',
              required: false,
              longueur_max: 300,
            },
            {
              field_key: 'conforme',
              labels: { fr: 'Conforme', en: 'Compliant', de: 'Konform' },
              type: 'liste',
              required: false,
              options: [
                { valeur: 'oui', labels: { fr: 'Oui', en: 'Yes', de: 'Ja' } },
                { valeur: 'non', labels: { fr: 'Non', en: 'No', de: 'Nein' } },
              ],
            },
          ],
        },
      ],
    },
    {
      section_key: 'conclusion',
      labels: { fr: 'Conclusion', en: 'Conclusion', de: 'Schlussfolgerung' },
      required_link_type: null,
      fields: [
        {
          field_key: 'conclusion',
          labels: { fr: 'Conclusion', en: 'Conclusion', de: 'Schlussfolgerung' },
          type: 'texte_long',
          required: true,
        },
      ],
    },
  ],
}
