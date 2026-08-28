import { describe, expect, test } from 'vitest'
import { evaluerVerdictRiskAssessment } from './evaluerVerdictRiskAssessment'

describe('evaluerVerdictRiskAssessment', () => {
  test('IPR strictement inférieur au seuil -> acceptable', () => {
    expect(evaluerVerdictRiskAssessment({ calcule: true, valeur: 50 }, 100)).toBe('acceptable')
  })

  test('IPR égal au seuil -> action_requise (seuil inclusif)', () => {
    expect(evaluerVerdictRiskAssessment({ calcule: true, valeur: 100 }, 100)).toBe('action_requise')
  })

  test('IPR strictement supérieur au seuil -> action_requise', () => {
    expect(evaluerVerdictRiskAssessment({ calcule: true, valeur: 150 }, 100)).toBe('action_requise')
  })

  test('IPR non calculé (valeurs incomplètes) -> null, jamais un verdict deviné', () => {
    expect(
      evaluerVerdictRiskAssessment({ calcule: false, raison: 'valeurs_incompletes' }, 100),
    ).toBeNull()
  })

  test('IPR non calculé (valeur hors plage) -> null', () => {
    expect(
      evaluerVerdictRiskAssessment(
        { calcule: false, raison: 'valeur_hors_plage', champ: 'severite' },
        100,
      ),
    ).toBeNull()
  })
})
