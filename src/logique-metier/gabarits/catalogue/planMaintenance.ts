import type { DefinitionGabarit } from '../definitionGabarit'

/**
 * Gabarit "Plan de maintenance préventive" (catalogue URS §10, famille M
 * "Maintenance") — lié à la clôture de l'OQ (URS-F-000nonies, EudraLex
 * Annexe 15 §3.12). Purement tabulaire, même style que
 * `planMetrologie.ts`.
 */
export const definitionPlanMaintenance: DefinitionGabarit = {
  template_id: 'plan_maintenance',
  template_version: '1.0.0',
  family: 'M',
  normes_associees: ['EudraLex Annexe 15 §3.12'],
  sections: [
    {
      section_key: 'taches_maintenance',
      labels: {
        fr: 'Tâches de maintenance préventive',
        en: 'Preventive maintenance tasks',
        de: 'Vorbeugende Wartungsaufgaben',
      },
      required_link_type: null,
      fields: [
        {
          field_key: 'taches',
          labels: { fr: 'Tâches', en: 'Tasks', de: 'Aufgaben' },
          type: 'tableau_dynamique',
          required: false,
          colonnes: [
            {
              field_key: 'equipement',
              labels: { fr: 'Équipement', en: 'Equipment', de: 'Ausrüstung' },
              type: 'texte_court',
              required: true,
              longueur_max: 200,
            },
            {
              field_key: 'tache',
              labels: { fr: 'Tâche', en: 'Task', de: 'Aufgabe' },
              type: 'texte_court',
              required: true,
              longueur_max: 300,
            },
            {
              field_key: 'frequence',
              labels: { fr: 'Fréquence', en: 'Frequency', de: 'Häufigkeit' },
              type: 'texte_court',
              required: false,
              longueur_max: 100,
            },
            {
              field_key: 'derniere_realisation',
              labels: {
                fr: 'Dernière réalisation',
                en: 'Last performed',
                de: 'Zuletzt durchgeführt',
              },
              type: 'date',
              required: false,
            },
          ],
        },
      ],
    },
  ],
}
