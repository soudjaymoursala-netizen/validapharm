import type { DefinitionGabarit } from '../definitionGabarit'

/**
 * Gabarit "PQ — Qualification de performance" (catalogue URS §10, famille
 * C "Protocoles"). Contexte procédé requis à l'entrée en vérification
 * (URS-F-000septies, `gardesFinalisation.ts`) — non reflété ici,
 * `required_link_type` reste informationnel (voir `definitionGabarit.ts`).
 */
export const definitionPQ: DefinitionGabarit = {
  template_id: 'pq',
  template_version: '1.0.0',
  family: 'C',
  normes_associees: ['ASTM E2500', 'EudraLex Annexe 15 §4'],
  sections: [
    {
      section_key: 'essais_performance',
      labels: { fr: 'Essais de performance', en: 'Performance tests', de: 'Leistungsprüfungen' },
      required_link_type: 'contexte_procede',
      fields: [
        {
          field_key: 'essais',
          labels: { fr: 'Essais', en: 'Tests', de: 'Prüfungen' },
          type: 'tableau_dynamique',
          required: false,
          colonnes: [
            {
              field_key: 'parametre',
              labels: { fr: 'Paramètre testé', en: 'Tested parameter', de: 'Getesteter Parameter' },
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
              labels: { fr: 'Résultat mesuré', en: 'Measured result', de: 'Gemessenes Ergebnis' },
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
