import { describe, expect, test } from 'vitest'
import { preparerRemplacementSection } from './integriteSection'
import type { SectionEnregistree } from './repos/sectionsRepo'

const section: SectionEnregistree = {
  id: 's1',
  projectId: 'p1',
  templateType: 'oq',
  templateEngineVersion: '0.1.0',
  ownerId: 'a@ex.com',
  sharedWith: [],
  language: 'fr',
  status: 'brouillon_aide',
  meta: { ref: '', titre: 'OQ', version: '0.1' },
  workflow: { authors: ['a@ex.com'], reviewers: [], approverFinal: null },
  signatures: { redacteur: {}, verificateur: {}, approbateur: {} },
  revisions: [],
  values: {},
  tables: {},
  generationSource: { sourceDocumentId: null, generatedFields: [] },
  procedureId: null,
  assetNodeId: null,
  auditLog: [{ timestamp: '2026-09-26T00:00:00.000Z', actor: 'a@ex.com', action: 'création' }],
  createdAt: '2026-09-26T00:00:00.000Z',
  updatedAt: '2026-09-26T00:00:00.000Z',
}

describe('preparerRemplacementSection — horodatage', () => {
  test('deux écritures dans la même milliseconde produisent des versions distinctes', () => {
    const resultat = preparerRemplacementSection(
      section,
      { ...section, values: { a: 1 } },
      { email: 'a@ex.com', role: 'utilisateur' },
      section.updatedAt,
    )
    expect(resultat.ok).toBe(true)
    if (!resultat.ok) return
    expect(resultat.section.updatedAt > section.updatedAt).toBe(true)
    expect(resultat.section.auditLog.at(-1)?.timestamp).toBe(resultat.section.updatedAt)
  })
})
