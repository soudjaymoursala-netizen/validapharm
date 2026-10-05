import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { describe, expect, test } from 'vitest'
import type { DefinitionGabarit } from '../../logique-metier/gabarits/definitionGabarit'
import type { Langue, Section } from '../../logique-metier/domaine/types'
import { construireDonneesExportGabarit } from '../../logique-metier/export/donneesExportGabarit'
import { genererDocxParDefaut } from './genererDocxParDefaut'

/** Génère le `.docx` et renvoie le XML de son corps (`word/document.xml`). */
function exporter(
  section: Section,
  definition: DefinitionGabarit | undefined,
  langue: Langue,
): string {
  const docx = genererDocxParDefaut(
    construireDonneesExportGabarit(section, definition, langue),
    langue,
  )
  return new PizZip(docx).file('word/document.xml')?.asText() ?? ''
}

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
    procedure_id: null,
    asset_node_id: null,
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

describe('genererDocxParDefaut', () => {
  test('inclut le titre, la référence, la version et le statut en toutes lettres', () => {
    const xml = exporter(sectionBase(), undefined, 'fr')
    expect(xml).toContain('Contexte procédé — Ligne A12')
    expect(xml).toContain('REF-1')
    expect(xml).toContain('0.1')
    expect(xml).toContain('Brouillon (aide à la rédaction)')
  })

  test('statut valide_en_interne : rappel complet, jamais raccourci, plus le bandeau de responsabilité', () => {
    const xml = exporter(sectionBase({ status: 'valide_en_interne' }), undefined, 'fr')
    expect(xml).toContain('Validé en interne — pas une signature électronique opposable')
    expect(xml).toContain('Responsabilité de conformité et de conservation réglementaire')
  })

  test('sans le statut valide_en_interne : pas de bandeau de responsabilité', () => {
    const xml = exporter(sectionBase(), undefined, 'fr')
    expect(xml).not.toContain('Responsabilité de conformité')
  })

  test('historique des révisions rendu quand présent', () => {
    const xml = exporter(
      sectionBase({
        revisions: [{ version: '0.2', date: '2026-02-01', auteur: 'alice', motif: 'correction' }],
      }),
      undefined,
      'fr',
    )
    expect(xml).toContain('0.2')
    expect(xml).toContain('correction')
  })

  test('avec définition de gabarit : rend les libellés et valeurs des champs', () => {
    const xml = exporter(
      sectionBase({ values: { description_procede: 'Un procédé de remplissage' } }),
      definitionMinimale,
      'fr',
    )
    expect(xml).toContain('Description du procédé')
    expect(xml).toContain('Un procédé de remplissage')
  })

  test('sans définition : repli sur values.contenu', () => {
    const xml = exporter(sectionBase({ values: { contenu: 'Texte libre' } }), undefined, 'fr')
    expect(xml).toContain('Texte libre')
  })

  test('échappe le XML dans les valeurs saisies (jamais un document corrompu ni une injection)', () => {
    const xml = exporter(
      sectionBase({ meta: { ref: 'R1', titre: '<script>alert(1)</script>', version: '0.1' } }),
      undefined,
      'fr',
    )
    expect(xml).not.toContain('<script>alert(1)</script>')
    expect(xml).toContain('&lt;script&gt;')
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
    const xml = exporter(
      sectionBase({
        tables: {
          risques: [{ severite: 5, occurrence: 2, detectabilite: 3, ipr: null }],
        },
      }),
      definitionAvecTableauIPR,
      'fr',
    )
    expect(xml).toContain('>30</w:t>')
  })

  test('un vrai paquet OOXML, que le moteur de gabarits sait rouvrir', () => {
    const docx = genererDocxParDefaut(
      construireDonneesExportGabarit(sectionBase(), undefined, 'fr'),
      'fr',
    )
    const zip = new PizZip(docx)
    for (const partie of [
      '[Content_Types].xml',
      '_rels/.rels',
      'word/document.xml',
      'word/styles.xml',
      'word/_rels/document.xml.rels',
    ]) {
      expect(zip.file(partie)).not.toBeNull()
    }
    expect(() => new Docxtemplater(zip, { paragraphLoop: true })).not.toThrow()
    expect(zip.file('word/styles.xml')?.asText()).toContain('w:val="fr-FR"')
  })

  test('valeurs de liste en toutes lettres, jamais le code interne', () => {
    const definition: DefinitionGabarit = {
      ...definitionMinimale,
      sections: [
        {
          section_key: 's1',
          labels: { fr: 'Exigences', en: 'Requirements', de: 'Anforderungen' },
          required_link_type: null,
          fields: [
            {
              field_key: 'exigences',
              labels: { fr: 'Exigences', en: 'Requirements', de: 'Anforderungen' },
              type: 'tableau_dynamique',
              required: false,
              colonnes: [
                {
                  field_key: 'priorite',
                  labels: { fr: 'Priorité', en: 'Priority', de: 'Priorität' },
                  type: 'liste',
                  required: true,
                  options: [
                    { valeur: 'must', labels: { fr: 'Doit (Must)', en: 'Must', de: 'Muss' } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }
    const xml = exporter(
      sectionBase({ tables: { exigences: [{ priorite: 'must' }] } }),
      definition,
      'fr',
    )
    expect(xml).toContain('Doit (Must)')
    expect(xml).not.toContain('>must<')
  })

  test('avis des relecteurs et approbation (qui, quand) figurent dans le document', () => {
    const xml = exporter(
      sectionBase({
        status: 'valide_en_interne',
        workflow: {
          authors: ['alice@ex.com'],
          reviewers: [
            { user_id: 'bob@ex.com', avis: 'Favorable', date: '2026-09-20T08:00:00.000Z' },
          ],
          approver_final: 'qa@ex.com',
        },
        audit_log: [
          {
            timestamp: '2026-09-21T09:30:00.000Z',
            actor: 'qa@ex.com',
            action: 'changement_statut: approuver',
          },
        ],
      }),
      undefined,
      'fr',
    )
    expect(xml).toContain('bob@ex.com')
    expect(xml).toContain('Favorable — cycle en cours')
    expect(xml).toContain('qa@ex.com')
    expect(xml).toContain('21/09/2026 11:30')
    expect(xml).toContain('Approuvé — validé en interne')
  })
})
