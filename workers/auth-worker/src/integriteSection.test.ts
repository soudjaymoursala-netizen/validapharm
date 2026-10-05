import { describe, expect, test } from 'vitest'
import { avisDuCycleCourant, preparerRemplacementSection } from './integriteSection'
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

describe('preparerRemplacementSection — contenu modifié en cours de cycle (décision du 29/09/2026)', () => {
  const acteur = { email: 'a@ex.com', role: 'utilisateur' }
  const enVerification: SectionEnregistree = {
    ...section,
    status: 'en_verification',
    workflow: {
      authors: ['a@ex.com'],
      reviewers: [{ userId: 'r@ex.com', avis: 'Favorable', date: '2026-09-27T00:00:00.000Z' }],
      approverFinal: 'q@ex.com',
    },
    updatedAt: '2026-09-27T00:00:00.000Z',
  }

  test('une modification du contenu renvoie la section en rédaction, avis du cycle écartés', () => {
    const resultat = preparerRemplacementSection(
      enVerification,
      { ...enVerification, tables: { exigences: [{ id: 'URS-001' }] } },
      acteur,
      '2026-09-28T00:00:00.000Z',
    )
    expect(resultat.ok).toBe(true)
    if (!resultat.ok) return
    expect(resultat.section.status).toBe('brouillon_aide')
    expect(resultat.section.auditLog.at(-1)?.action).toBe(
      'retour en rédaction : contenu modifié pendant la vérification',
    )
    expect(avisDuCycleCourant(resultat.section)).toEqual([])
    // L'avis reste dans l'historique : écarté du cycle, jamais effacé.
    expect(resultat.section.workflow.reviewers).toHaveLength(1)
  })

  test('un avis ou un changement de rôle sans toucher au contenu ne change pas le statut', () => {
    const resultat = preparerRemplacementSection(
      enVerification,
      {
        ...enVerification,
        workflow: {
          ...enVerification.workflow,
          reviewers: [
            ...enVerification.workflow.reviewers,
            { userId: 'x', avis: 'Favorable', date: 'x' },
          ],
        },
      },
      acteur,
      '2026-09-28T00:00:00.000Z',
    )
    expect(resultat.ok && resultat.section.status).toBe('en_verification')
  })

  test('contenu modifié et transmission à l’approbation dans la même écriture : refusé', () => {
    const resultat = preparerRemplacementSection(
      enVerification,
      { ...enVerification, status: 'en_approbation', values: { objet: 'modifié' } },
      acteur,
      '2026-09-28T00:00:00.000Z',
    )
    expect(resultat).toEqual({ ok: false, erreur: 'transition_invalide' })
  })

  test('un rejet sans motif reste refusé, même accompagné d’une modification', () => {
    const resultat = preparerRemplacementSection(
      enVerification,
      {
        ...enVerification,
        status: 'brouillon_aide',
        values: { objet: 'modifié' },
        auditLog: [...enVerification.auditLog, { timestamp: 'x', actor: 'x', action: 'rejet' }],
      },
      acteur,
      '2026-09-28T00:00:00.000Z',
    )
    expect(resultat).toEqual({ ok: false, erreur: 'motif_requis' })
  })
})
