import { describe, expect, test } from 'vitest'
import {
  evaluerVerdictImpactAssessment,
  methodeCompletementRepondue,
} from './evaluerVerdictImpactAssessment'
import type { QuestionImpactAssessment } from '../domaine/types'

const questions: QuestionImpactAssessment[] = [
  { id: 'q1', texte: { fr: 'Le système a-t-il un contact direct avec le produit ?' } },
  { id: 'q2', texte: { fr: 'Le système génère-t-il des données GxP ?' } },
]

describe('evaluerVerdictImpactAssessment — règle "au moins un oui" (F1, Ferring/ISPE)', () => {
  test('au moins un "oui" -> impact_direct', () => {
    expect(
      evaluerVerdictImpactAssessment(
        questions,
        { q1: 'non', q2: 'oui' },
        'au_moins_un_oui_impact_direct',
      ),
    ).toBe('impact_direct')
  })

  test('aucun "oui" -> non_impact_direct', () => {
    expect(
      evaluerVerdictImpactAssessment(
        questions,
        { q1: 'non', q2: 'non' },
        'au_moins_un_oui_impact_direct',
      ),
    ).toBe('non_impact_direct')
  })

  test('modèle strictement binaire : jamais de troisième verdict "indirect" (ISPE Baseline Guide 2e éd.)', () => {
    const verdict = evaluerVerdictImpactAssessment(
      questions,
      { q1: 'inconnu', q2: 'sans_objet' },
      'au_moins_un_oui_impact_direct',
    )
    expect(['impact_direct', 'non_impact_direct']).toContain(verdict)
  })
})

describe('methodeCompletementRepondue', () => {
  test('détecte une méthode incomplète', () => {
    expect(methodeCompletementRepondue(questions, { q1: 'oui' })).toBe(false)
  })

  test('détecte une méthode complète', () => {
    expect(methodeCompletementRepondue(questions, { q1: 'oui', q2: 'non' })).toBe(true)
  })
})
