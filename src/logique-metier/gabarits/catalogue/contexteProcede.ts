import type { DefinitionGabarit } from '../definitionGabarit'

/**
 * Gabarit "Contexte procédé" (famille A "Cadrage" du
 * catalogue de gabarits). Champs explicitement listés : description procédé,
 * CPP, CQA, conditions opératoires, références de validation existantes.
 *
 * CPP/CQA modélisés en `tableau_dynamique` (un procédé réel en compte
 * typiquement plusieurs, pas une valeur unique) plutôt qu'en texte libre —
 * plus fidèle à l'usage réel et démontre le type de champ sans colonne
 * calculée (voir `dq.ts` pour le cas avec IPR).
 */
export const definitionContexteProcede: DefinitionGabarit = {
  template_id: 'contexte_procede',
  template_version: '1.0.0',
  family: 'A',
  normes_associees: ['ICH Q8', 'ASTM E2500'],
  sections: [
    {
      section_key: 'description',
      labels: {
        fr: 'Description du procédé',
        en: 'Process description',
        de: 'Prozessbeschreibung',
      },
      required_link_type: null,
      fields: [
        {
          field_key: 'description_procede',
          labels: {
            fr: 'Description du procédé',
            en: 'Process description',
            de: 'Prozessbeschreibung',
          },
          type: 'texte_long',
          required: true,
        },
        {
          field_key: 'conditions_operatoires',
          labels: {
            fr: 'Conditions opératoires',
            en: 'Operating conditions',
            de: 'Betriebsbedingungen',
          },
          type: 'texte_long',
          required: false,
        },
        {
          field_key: 'references_validation_existantes',
          labels: {
            fr: 'Références de validation existantes',
            en: 'Existing validation references',
            de: 'Bestehende Validierungsreferenzen',
          },
          type: 'texte_long',
          required: false,
        },
      ],
    },
    {
      section_key: 'parametres_critiques',
      labels: {
        fr: 'Paramètres et attributs critiques',
        en: 'Critical parameters and attributes',
        de: 'Kritische Parameter und Attribute',
      },
      required_link_type: null,
      fields: [
        {
          field_key: 'cpp',
          labels: {
            fr: 'Paramètres critiques du procédé (CPP)',
            en: 'Critical process parameters (CPP)',
            de: 'Kritische Prozessparameter (CPP)',
          },
          type: 'tableau_dynamique',
          required: false,
          colonnes: [
            {
              field_key: 'parametre',
              labels: { fr: 'Paramètre', en: 'Parameter', de: 'Parameter' },
              type: 'texte_court',
              required: true,
              longueur_max: 200,
            },
            {
              field_key: 'valeur_cible',
              labels: { fr: 'Valeur cible', en: 'Target value', de: 'Zielwert' },
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
          ],
        },
        {
          field_key: 'cqa',
          labels: {
            fr: 'Attributs qualité critiques (CQA)',
            en: 'Critical quality attributes (CQA)',
            de: 'Kritische Qualitätsattribute (CQA)',
          },
          type: 'tableau_dynamique',
          required: false,
          colonnes: [
            {
              field_key: 'attribut',
              labels: { fr: 'Attribut', en: 'Attribute', de: 'Attribut' },
              type: 'texte_court',
              required: true,
              longueur_max: 200,
            },
            {
              field_key: 'specification',
              labels: { fr: 'Spécification', en: 'Specification', de: 'Spezifikation' },
              type: 'texte_court',
              required: false,
              longueur_max: 200,
            },
          ],
        },
      ],
    },
  ],
}
