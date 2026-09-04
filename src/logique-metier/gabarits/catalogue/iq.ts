import type { DefinitionGabarit } from '../definitionGabarit'

/**
 * Gabarit "IQ — Qualification d'installation" (famille C du catalogue de
 * gabarits, "Protocoles"). `required_link_type: 'plan_metrologie'` reflète
 * la finalisation bloquée sans lien vers un Plan de
 * métrologie/étalonnage — purement informationnel dans cet incrément, le
 * garde-fou réel reste porté par `gardesFinalisation.ts`.
 */
export const definitionIQ: DefinitionGabarit = {
  template_id: 'iq',
  template_version: '1.0.0',
  family: 'C',
  normes_associees: ['ASTM E2500', 'EudraLex Annexe 15 §4'],
  sections: [
    {
      section_key: 'verifications_installation',
      labels: {
        fr: "Vérifications d'installation",
        en: 'Installation checks',
        de: 'Installationsprüfungen',
      },
      required_link_type: 'plan_metrologie',
      fields: [
        {
          field_key: 'verifications',
          labels: { fr: 'Vérifications', en: 'Checks', de: 'Prüfungen' },
          type: 'tableau_dynamique',
          required: false,
          colonnes: [
            {
              field_key: 'point_de_controle',
              labels: { fr: 'Point de contrôle', en: 'Control point', de: 'Kontrollpunkt' },
              type: 'texte_court',
              required: true,
              longueur_max: 300,
            },
            {
              field_key: 'critere',
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
