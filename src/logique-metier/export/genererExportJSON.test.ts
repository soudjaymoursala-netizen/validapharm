import { describe, expect, test } from 'vitest'
import type { Section } from '../domaine/types'
import { genererExportJSON } from './genererExportJSON'

function sectionMinimale(): Section {
  return {
    id: 's1',
    project_id: 'p1',
    template_type: 'contexte_procede',
    template_engine_version: '0.1.0',
    owner_id: 'u1',
    shared_with: [],
    language: 'fr',
    status: 'brouillon_aide',
    meta: { ref: 'REF-1', titre: 'Titre', version: '0.1' },
    workflow: { authors: ['u1'], reviewers: [], approver_final: null },
    signatures: { redacteur: {}, verificateur: {}, approbateur: {} },
    revisions: [],
    values: { description_procede: 'Un procédé' },
    tables: { cpp: [{ parametre: 'Température', valeur_cible: '25°C', tolerance: '±2°C' }] },
    generation_source: { source_document_id: null, generated_fields: [] },
    audit_log: [{ timestamp: '2026-01-01T00:00:00.000Z', actor: 'u1', action: 'création' }],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  }
}

describe('genererExportJSON', () => {
  test('produit un JSON complet, ré-analysable tel quel', () => {
    const section = sectionMinimale()
    const json = genererExportJSON(section)
    expect(JSON.parse(json)).toEqual(section)
  })

  test('lisible (indenté), pas minifié — fichier destiné à un transfert manuel', () => {
    const json = genererExportJSON(sectionMinimale())
    expect(json).toContain('\n')
  })
})
