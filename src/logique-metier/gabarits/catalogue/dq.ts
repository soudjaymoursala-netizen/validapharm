import type { DefinitionGabarit } from '../definitionGabarit'

/**
 * Gabarit "DQ / Revue de conception" (famille B du catalogue de gabarits,
 * "Conception"). Inclut une table d'identification des risques avec
 * colonne IPR calculée (FDS §5) — démontre le mécanisme de colonne
 * calculée, seul gabarit du catalogue actuel à le faire.
 */
export const definitionDQ: DefinitionGabarit = {
  template_id: 'dq',
  template_version: '1.0.0',
  family: 'B',
  normes_associees: ['ASTM E2500', 'EudraLex Annexe 15 §4', 'ICH Q9'],
  sections: [
    {
      section_key: 'identification_risques',
      labels: {
        fr: 'Identification des risques de conception',
        en: 'Design risk identification',
        de: 'Identifizierung von Konstruktionsrisiken',
      },
      required_link_type: null,
      fields: [
        {
          field_key: 'risques',
          labels: {
            fr: 'Risques identifiés',
            en: 'Identified risks',
            de: 'Identifizierte Risiken',
          },
          type: 'tableau_dynamique',
          required: false,
          colonnes: [
            {
              field_key: 'danger',
              labels: { fr: 'Danger / situation dangereuse', en: 'Hazard', de: 'Gefährdung' },
              type: 'texte_court',
              required: true,
              longueur_max: 300,
            },
            {
              field_key: 'severite',
              labels: { fr: 'Sévérité (S)', en: 'Severity (S)', de: 'Schweregrad (S)' },
              type: 'nombre',
              required: true,
              min: 1,
              max: 5,
            },
            {
              field_key: 'occurrence',
              labels: { fr: 'Occurrence (O)', en: 'Occurrence (O)', de: 'Auftreten (O)' },
              type: 'nombre',
              required: true,
              min: 1,
              max: 5,
            },
            {
              field_key: 'detectabilite',
              labels: {
                fr: 'Détectabilité (D)',
                en: 'Detectability (D)',
                de: 'Entdeckbarkeit (D)',
              },
              type: 'nombre',
              required: true,
              min: 1,
              max: 5,
            },
            {
              field_key: 'ipr',
              labels: { fr: 'IPR (S×O×D)', en: 'RPN (S×O×D)', de: 'RPZ (S×O×D)' },
              type: 'nombre',
              required: false,
              min: 1,
              max: 125,
              formule: { cle: 'ipr', entrees: ['severite', 'occurrence', 'detectabilite'] },
            },
            {
              field_key: 'mesure_maitrise',
              labels: {
                fr: 'Mesure de maîtrise proposée',
                en: 'Proposed control measure',
                de: 'Vorgeschlagene Kontrollmassnahme',
              },
              type: 'texte_court',
              required: false,
              longueur_max: 500,
            },
          ],
        },
      ],
    },
    {
      section_key: 'conclusion',
      labels: {
        fr: 'Conclusion de la revue',
        en: 'Review conclusion',
        de: 'Schlussfolgerung der Überprüfung',
      },
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
