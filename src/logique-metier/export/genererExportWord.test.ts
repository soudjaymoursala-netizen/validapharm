import { describe, expect, test } from 'vitest'
import type { DefinitionGabarit } from '../gabarits/definitionGabarit'
import type { Section } from '../domaine/types'
import { genererExportWord } from './genererExportWord'

function sectionBase(surcharge: Partial<Section> = {}): Section {
  return {
    id: 's1',
    project_id: 'p1',
    template_type: 'contexte_procede',
    template_engine_version: '0.1.0',
    owner_id: 'u1',
    shared_with: [],
    language: 'fr',
    status: 'brouillon_aide',
    meta: { ref: 'REF-1', titre: 'Contexte procédé — Ligne A12', version: '0.1' },
    workflow: { authors: ['alice'], reviewers: [], approver_final: null },
    signatures: { redacteur: {}, verificateur: {}, approbateur: {} },
    revisions: [],
    values: {},
    tables: {},
    generation_source: { source_document_id: null, generated_fields: [] },
    audit_log: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...surcharge,
  }
}

const definitionMinimale: DefinitionGabarit = {
  template_id: 'contexte_procede',
  template_version: '1.0.0',
  family: 'A',
  normes_associees: [],
  sections: [
    {
      section_key: 's1',
      labels: { fr: 'Description', en: 'Description', de: 'Beschreibung' },
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
      ],
    },
  ],
}

describe('genererExportWord', () => {
  test('inclut le titre, la référence, la version et le statut en toutes lettres', () => {
    const html = genererExportWord(sectionBase(), undefined, 'fr')
    expect(html).toContain('Contexte procédé — Ligne A12')
    expect(html).toContain('REF-1')
    expect(html).toContain('0.1')
    expect(html).toContain('Brouillon (aide à la rédaction)')
  })

  test('statut valide_en_interne : rappel complet, jamais raccourci, plus le bandeau de responsabilité', () => {
    const html = genererExportWord(sectionBase({ status: 'valide_en_interne' }), undefined, 'fr')
    expect(html).toContain('Validé en interne — pas une signature électronique opposable')
    expect(html).toContain('Responsabilité de conformité et de conservation réglementaire')
  })

  test('sans le statut valide_en_interne : pas de bandeau de responsabilité', () => {
    const html = genererExportWord(sectionBase(), undefined, 'fr')
    expect(html).not.toContain('Responsabilité de conformité')
  })

  test('historique des révisions rendu quand présent', () => {
    const html = genererExportWord(
      sectionBase({
        revisions: [{ version: '0.2', date: '2026-02-01', auteur: 'alice', motif: 'correction' }],
      }),
      undefined,
      'fr',
    )
    expect(html).toContain('0.2')
    expect(html).toContain('correction')
  })

  test('avec définition de gabarit : rend les libellés et valeurs des champs', () => {
    const html = genererExportWord(
      sectionBase({ values: { description_procede: 'Un procédé de remplissage' } }),
      definitionMinimale,
      'fr',
    )
    expect(html).toContain('Description du procédé')
    expect(html).toContain('Un procédé de remplissage')
  })

  test('sans définition : repli sur values.contenu', () => {
    const html = genererExportWord(
      sectionBase({ values: { contenu: 'Texte libre' } }),
      undefined,
      'fr',
    )
    expect(html).toContain('Texte libre')
  })

  test('échappe le HTML dans les valeurs saisies (jamais d’injection)', () => {
    const html = genererExportWord(
      sectionBase({ meta: { ref: 'R1', titre: '<script>alert(1)</script>', version: '0.1' } }),
      undefined,
      'fr',
    )
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  test("colonne calculée (IPR) : recalculée pour l'export, jamais une cellule vide malgré une valeur brute non persistée", () => {
    const definitionAvecTableauIPR: DefinitionGabarit = {
      template_id: 'dq',
      template_version: '1.0.0',
      family: 'B',
      normes_associees: [],
      sections: [
        {
          section_key: 'risques',
          labels: { fr: 'Risques', en: 'Risks', de: 'Risiken' },
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
                  field_key: 'severite',
                  labels: { fr: 'Sévérité', en: 'Severity', de: 'Schweregrad' },
                  type: 'nombre',
                  required: true,
                  min: 1,
                  max: 5,
                },
                {
                  field_key: 'occurrence',
                  labels: { fr: 'Occurrence', en: 'Occurrence', de: 'Auftreten' },
                  type: 'nombre',
                  required: true,
                  min: 1,
                  max: 5,
                },
                {
                  field_key: 'detectabilite',
                  labels: { fr: 'Détectabilité', en: 'Detectability', de: 'Entdeckbarkeit' },
                  type: 'nombre',
                  required: true,
                  min: 1,
                  max: 5,
                },
                {
                  field_key: 'ipr',
                  labels: { fr: 'IPR', en: 'RPN', de: 'RPZ' },
                  type: 'nombre',
                  required: false,
                  min: 1,
                  max: 125,
                  formule: { cle: 'ipr', entrees: ['severite', 'occurrence', 'detectabilite'] },
                },
              ],
            },
          ],
        },
      ],
    }
    const html = genererExportWord(
      sectionBase({
        tables: {
          risques: [{ severite: 5, occurrence: 2, detectabilite: 3, ipr: null }],
        },
      }),
      definitionAvecTableauIPR,
      'fr',
    )
    expect(html).toContain('<td>30</td>')
  })
})
