import type { DefinitionGabarit } from '../definitionGabarit'

/**
 * Gabarit "CSV — Dossier de validation de système informatisé" (famille F
 * du catalogue de gabarits, "Systèmes informatisés" — catalogue §10.F, même
 * famille que `EvaluationCSVAssessment`/F3, jamais fusionné avec les
 * gabarits d'équipement physique IQ/OQ/PQ : un système informatisé suit un
 * cycle de vie de validation distinct, même quand il pilote un équipement
 * physique déjà qualifié séparément — c'est pourquoi ce gabarit reste hors
 * de `ETAPES_PIPELINE` de `PipelineQualification.vue`).
 *
 * Structure calquée sur l'Annexe 11 "Systèmes informatisés" du Guide des
 * bonnes pratiques de fabrication (ANSM, décision du 6 mai 2019, lue
 * intégralement) — mêmes rubriques dans le même ordre (gestion du risque,
 * validation, données/sécurité/signature électronique/continuité
 * opérationnelle/archivage), vérifiée mot pour mot identique à l'Annexe 11
 * d'EudraLex Volume 4 déjà étudiée. Champs de la section "Généralités"
 * délibérément nommés à l'identique de `EvaluationCSVAssessment` (F3 —
 * `nom_systeme`/`categorie_gamp5`/`pertinence_gxp`/`pertinence_eres_part11`)
 * pour permettre un futur pré-remplissage automatique depuis une évaluation
 * Computer System Assessment déjà conduite (intention documentée en
 * 03-specifications-fonctionnelles.md §4.6ter) — **non câblé dans cet
 * incrément** : ce gabarit ne lit ni n'écrit `EvaluationCSVAssessment`, la
 * saisie de "Généralités" reste manuelle pour l'instant.
 */
export const definitionCSV: DefinitionGabarit = {
  template_id: 'csv',
  template_version: '1.0.0',
  family: 'F',
  normes_associees: [
    'BPF France Annexe 11 (ANSM, décision du 6 mai 2019)',
    'EudraLex Volume 4 Annexe 11',
    'BPF France / EudraLex Annexe 15 §3 (systèmes informatisés)',
    'GAMP 5',
  ],
  sections: [
    {
      section_key: 'generalites',
      labels: { fr: 'Généralités', en: 'General information', de: 'Allgemeines' },
      required_link_type: null,
      fields: [
        {
          field_key: 'nom_systeme',
          labels: { fr: 'Nom du système', en: 'System name', de: 'Systemname' },
          type: 'texte_court',
          required: true,
          longueur_max: 200,
        },
        {
          field_key: 'description_fonctionnelle',
          labels: {
            fr: 'Description fonctionnelle (dispositions physiques et logiques, flux de données, interfaces)',
            en: 'Functional description (physical/logical layout, data flows, interfaces)',
            de: 'Funktionsbeschreibung (physischer/logischer Aufbau, Datenflüsse, Schnittstellen)',
          },
          type: 'texte_long',
          required: true,
        },
        {
          field_key: 'categorie_gamp5',
          labels: {
            fr: 'Catégorie GAMP 5 (1 à 5)',
            en: 'GAMP 5 category (1 to 5)',
            de: 'GAMP-5-Kategorie (1 bis 5)',
          },
          type: 'nombre',
          required: true,
          min: 1,
          max: 5,
        },
        {
          field_key: 'pertinence_gxp',
          labels: { fr: 'Pertinence GxP', en: 'GxP relevance', de: 'GxP-Relevanz' },
          type: 'liste',
          required: true,
          options: [
            { valeur: 'oui', labels: { fr: 'Oui', en: 'Yes', de: 'Ja' } },
            { valeur: 'non', labels: { fr: 'Non', en: 'No', de: 'Nein' } },
          ],
        },
        {
          field_key: 'pertinence_eres_part11',
          labels: {
            fr: 'Pertinence ERES / 21 CFR Part 11',
            en: 'ERES / 21 CFR Part 11 relevance',
            de: 'ERES-/21-CFR-Part-11-Relevanz',
          },
          type: 'liste',
          required: true,
          options: [
            { valeur: 'oui', labels: { fr: 'Oui', en: 'Yes', de: 'Ja' } },
            { valeur: 'non', labels: { fr: 'Non', en: 'No', de: 'Nein' } },
          ],
        },
        {
          field_key: 'fournisseur',
          labels: {
            fr: 'Fournisseur / prestataire',
            en: 'Supplier / service provider',
            de: 'Lieferant/Dienstleister',
          },
          type: 'texte_court',
          required: false,
          longueur_max: 200,
        },
      ],
    },
    {
      section_key: 'validation',
      labels: {
        fr: 'Validation et cycle de vie',
        en: 'Validation and lifecycle',
        de: 'Validierung und Lebenszyklus',
      },
      required_link_type: null,
      fields: [
        {
          field_key: 'exigences_validation',
          labels: {
            fr: 'Étapes de validation',
            en: 'Validation steps',
            de: 'Validierungsschritte',
          },
          type: 'tableau_dynamique',
          required: false,
          colonnes: [
            {
              field_key: 'etape',
              labels: {
                fr: 'Étape (ex. URS, qualification de la conception, tests fonctionnels, migration de données)',
                en: 'Step',
                de: 'Schritt',
              },
              type: 'texte_court',
              required: true,
              longueur_max: 300,
            },
            {
              field_key: 'preuve_documentaire',
              labels: {
                fr: 'Preuve documentaire',
                en: 'Documented evidence',
                de: 'Dokumentierter Nachweis',
              },
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
            {
              field_key: 'commentaire',
              labels: { fr: 'Commentaire', en: 'Comment', de: 'Kommentar' },
              type: 'texte_court',
              required: false,
              longueur_max: 500,
            },
          ],
        },
      ],
    },
    {
      section_key: 'securite_integrite_continuite',
      labels: {
        fr: 'Sécurité, intégrité des données et continuité opérationnelle',
        en: 'Security, data integrity and business continuity',
        de: 'Sicherheit, Datenintegrität und Betriebskontinuität',
      },
      required_link_type: null,
      fields: [
        {
          field_key: 'controles',
          labels: { fr: 'Contrôles', en: 'Controls', de: 'Kontrollen' },
          type: 'tableau_dynamique',
          required: false,
          colonnes: [
            {
              field_key: 'point_de_controle',
              labels: {
                fr: 'Point de contrôle (ex. audit trail, sécurité des accès, signature électronique, sauvegarde, mode dégradé, archivage)',
                en: 'Control point',
                de: 'Kontrollpunkt',
              },
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
