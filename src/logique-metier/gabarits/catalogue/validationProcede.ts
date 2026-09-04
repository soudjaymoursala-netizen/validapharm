import type { DefinitionGabarit } from '../definitionGabarit'

/**
 * Gabarit "Validation de procédé — classique (3 lots)" (famille D du
 * catalogue de gabarits, "Validation de procédé"). Les approches "vérification
 * continue" et "hybride" identifiées par le catalogue restent hors
 * périmètre de cet incrément (aucun `TemplateType` dédié à ce stade).
 * Contexte procédé requis à l'entrée en vérification (`gardesFinalisation.ts`)
 * — non reflété ici, `required_link_type` reste
 * informationnel (voir `definitionGabarit.ts`).
 */
export const definitionValidationProcede: DefinitionGabarit = {
  template_id: 'validation_procede',
  template_version: '1.0.0',
  family: 'D',
  normes_associees: ['EudraLex Annexe 15 §5', 'FDA Process Validation Guidance (2011)'],
  sections: [
    {
      section_key: 'lots_valides',
      labels: { fr: 'Lots de validation', en: 'Validation batches', de: 'Validierungschargen' },
      required_link_type: 'contexte_procede',
      fields: [
        {
          field_key: 'lots',
          labels: { fr: 'Lots', en: 'Batches', de: 'Chargen' },
          type: 'tableau_dynamique',
          required: false,
          colonnes: [
            {
              field_key: 'numero_lot',
              labels: { fr: 'Numéro de lot', en: 'Batch number', de: 'Chargennummer' },
              type: 'texte_court',
              required: true,
              longueur_max: 100,
            },
            {
              field_key: 'date',
              labels: { fr: 'Date', en: 'Date', de: 'Datum' },
              type: 'date',
              required: false,
            },
            {
              field_key: 'parametre_critique',
              labels: {
                fr: 'Paramètre critique',
                en: 'Critical parameter',
                de: 'Kritischer Parameter',
              },
              type: 'texte_court',
              required: true,
              longueur_max: 300,
            },
            {
              field_key: 'valeur_mesuree',
              labels: { fr: 'Valeur mesurée', en: 'Measured value', de: 'Gemessener Wert' },
              type: 'texte_court',
              required: false,
              longueur_max: 100,
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
