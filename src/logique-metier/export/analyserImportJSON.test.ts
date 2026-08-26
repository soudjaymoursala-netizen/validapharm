import { describe, expect, test } from 'vitest'
import { analyserImportJSON } from './analyserImportJSON'

function jsonSectionValide(): string {
  return JSON.stringify({
    id: 's1',
    project_id: 'p1',
    template_type: 'dq',
    template_engine_version: '0.1.0',
    owner_id: 'u1',
    shared_with: [],
    language: 'fr',
    status: 'brouillon_aide',
    meta: { ref: 'REF-1', titre: 'Titre', version: '0.1' },
    workflow: { authors: ['u1'], reviewers: [], approver_final: null },
    signatures: { redacteur: {}, verificateur: {}, approbateur: {} },
    revisions: [],
    values: {},
    tables: { risques: [] },
    generation_source: { source_document_id: null, generated_fields: [] },
    audit_log: [{ timestamp: '2026-01-01T00:00:00.000Z', actor: 'u1', action: 'création' }],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  })
}

describe('analyserImportJSON', () => {
  test('accepte un export valide et exclut id/project_id/updated_at du résultat', () => {
    const resultat = analyserImportJSON(jsonSectionValide())
    expect(resultat.ok).toBe(true)
    if (!resultat.ok) return
    expect(resultat.donnees.template_type).toBe('dq')
    expect('id' in resultat.donnees).toBe(false)
    expect('project_id' in resultat.donnees).toBe(false)
    expect('updated_at' in resultat.donnees).toBe(false)
  })

  test('rejette un JSON syntaxiquement invalide', () => {
    const resultat = analyserImportJSON('{ ceci n’est pas du JSON')
    expect(resultat).toEqual({
      ok: false,
      motif: "Fichier illisible — ce n'est pas un JSON valide.",
    })
  })

  test('rejette un tableau ou une primitive (pas un objet)', () => {
    expect(analyserImportJSON('[]').ok).toBe(false)
    expect(analyserImportJSON('"texte"').ok).toBe(false)
    expect(analyserImportJSON('42').ok).toBe(false)
  })

  test('rejette un template_type manquant ou non reconnu', () => {
    expect(analyserImportJSON(JSON.stringify({})).ok).toBe(false)
    const json = JSON.parse(jsonSectionValide())
    json.template_type = 'gabarit_inexistant'
    expect(analyserImportJSON(JSON.stringify(json)).ok).toBe(false)
  })

  test('rejette un status non reconnu', () => {
    const json = JSON.parse(jsonSectionValide())
    json.status = 'archivee'
    expect(analyserImportJSON(JSON.stringify(json)).ok).toBe(false)
  })

  test.each(['values', 'tables', 'meta', 'audit_log'])('rejette si %s est manquant', (champ) => {
    const json = JSON.parse(jsonSectionValide()) as Record<string, unknown>
    const sansChamp = Object.fromEntries(Object.entries(json).filter(([cle]) => cle !== champ))
    const resultat = analyserImportJSON(JSON.stringify(sansChamp))
    expect(resultat.ok).toBe(false)
  })
})
