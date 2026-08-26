import type { DefinitionGabarit } from '../definitionGabarit'

/**
 * Gabarit "SAT — Test sur site" (Site Acceptance Test, catalogue URS §10,
 * famille C "Protocoles") — même structure que le FAT, réalisé après
 * installation sur le site final plutôt que chez le fournisseur.
 */
export const definitionSAT: DefinitionGabarit = {
  template_id: 'sat',
  template_version: '1.0.0',
  family: 'C',
  normes_associees: ['ASTM E2500', 'ISPE Baseline Guide'],
  sections: [
    {
      section_key: 'tests',
      labels: { fr: 'Tests sur site', en: 'Site tests', de: 'Standorttests' },
      required_link_type: null,
      fields: [
        {
          field_key: 'tests',
          labels: { fr: 'Tests', en: 'Tests', de: 'Tests' },
          type: 'tableau_dynamique',
          required: false,
          colonnes: [
            {
              field_key: 'etape',
              labels: { fr: 'Étape testée', en: 'Tested step', de: 'Getesteter Schritt' },
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
              field_key: 'resultat_obtenu',
              labels: { fr: 'Résultat obtenu', en: 'Result obtained', de: 'Erzieltes Ergebnis' },
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
