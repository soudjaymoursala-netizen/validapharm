import type { DefinitionGabarit } from '../definitionGabarit'

/**
 * Gabarit "Plan de métrologie/étalonnage" (catalogue URS §10, famille L
 * "Métrologie") — "liste d'instruments, fréquences, tolérances,
 * certificats", lié à l'IQ (URS-F-000octies). Purement tabulaire, sans
 * champ scalaire ni colonne calculée — démontre le cas le plus simple.
 */
export const definitionPlanMetrologie: DefinitionGabarit = {
  template_id: 'plan_metrologie',
  template_version: '1.0.0',
  family: 'L',
  normes_associees: ['EudraLex Annexe 15 §3 (métrologie/étalonnage)'],
  sections: [
    {
      section_key: 'instruments',
      labels: {
        fr: 'Instruments de mesure',
        en: 'Measuring instruments',
        de: 'Messgeräte',
      },
      required_link_type: null,
      fields: [
        {
          field_key: 'instruments',
          labels: { fr: 'Instruments', en: 'Instruments', de: 'Geräte' },
          type: 'tableau_dynamique',
          required: false,
          colonnes: [
            {
              field_key: 'identifiant',
              labels: { fr: 'Identifiant', en: 'ID', de: 'Kennung' },
              type: 'texte_court',
              required: true,
              longueur_max: 100,
            },
            {
              field_key: 'designation',
              labels: { fr: 'Désignation', en: 'Designation', de: 'Bezeichnung' },
              type: 'texte_court',
              required: true,
              longueur_max: 200,
            },
            {
              field_key: 'frequence_etalonnage',
              labels: {
                fr: "Fréquence d'étalonnage",
                en: 'Calibration frequency',
                de: 'Kalibrierhäufigkeit',
              },
              type: 'texte_court',
              required: false,
              longueur_max: 100,
            },
            {
              field_key: 'tolerance',
              labels: { fr: 'Tolérance', en: 'Tolerance', de: 'Toleranz' },
              type: 'texte_court',
              required: false,
              longueur_max: 100,
            },
            {
              field_key: 'certificat_ref',
              labels: {
                fr: 'Référence certificat',
                en: 'Certificate reference',
                de: 'Zertifikatsreferenz',
              },
              type: 'texte_court',
              required: false,
              longueur_max: 100,
            },
          ],
        },
      ],
    },
  ],
}
