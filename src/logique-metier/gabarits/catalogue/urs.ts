import type { DefinitionGabarit } from '../definitionGabarit'

/**
 * Gabarit "URS — Exigences utilisateur" (famille A du catalogue de gabarits,
 * "Cadrage").
 */
export const definitionURS: DefinitionGabarit = {
  template_id: 'urs',
  template_version: '1.0.0',
  family: 'A',
  normes_associees: ['ASTM E2500', 'ISPE Baseline Guide'],
  sections: [
    {
      section_key: 'exigences',
      labels: {
        fr: 'Exigences',
        en: 'Requirements',
        de: 'Anforderungen',
      },
      required_link_type: null,
      fields: [
        {
          field_key: 'exigences',
          labels: { fr: 'Exigences', en: 'Requirements', de: 'Anforderungen' },
          type: 'tableau_dynamique',
          required: false,
          colonnes: [
            {
              field_key: 'identifiant',
              labels: { fr: 'Identifiant', en: 'ID', de: 'Kennung' },
              type: 'texte_court',
              required: true,
              longueur_max: 50,
            },
            {
              field_key: 'description',
              labels: { fr: 'Description', en: 'Description', de: 'Beschreibung' },
              type: 'texte_court',
              required: true,
              longueur_max: 500,
            },
            {
              field_key: 'type',
              labels: { fr: 'Type', en: 'Type', de: 'Typ' },
              type: 'liste',
              required: true,
              options: [
                {
                  valeur: 'fonctionnelle',
                  labels: { fr: 'Fonctionnelle', en: 'Functional', de: 'Funktional' },
                },
                {
                  valeur: 'non_fonctionnelle',
                  labels: { fr: 'Non fonctionnelle', en: 'Non-functional', de: 'Nichtfunktional' },
                },
              ],
            },
            {
              field_key: 'priorite',
              labels: { fr: 'Priorité', en: 'Priority', de: 'Priorität' },
              type: 'liste',
              required: true,
              options: [
                { valeur: 'must', labels: { fr: 'Doit (Must)', en: 'Must', de: 'Muss' } },
                {
                  valeur: 'should',
                  labels: { fr: 'Devrait (Should)', en: 'Should', de: 'Sollte' },
                },
                { valeur: 'could', labels: { fr: 'Pourrait (Could)', en: 'Could', de: 'Könnte' } },
              ],
            },
            {
              field_key: 'critique',
              labels: {
                fr: 'Critique pour le produit/patient',
                en: 'Critical to product/patient',
                de: 'Kritisch für Produkt/Patient',
              },
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
  ],
}
