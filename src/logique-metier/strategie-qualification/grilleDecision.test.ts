import { describe, expect, test } from 'vitest'
import { determinerConclusion, LIBELLES_CONCLUSION, type NiveauComplexite } from './grilleDecision'

describe('determinerConclusion — table de décision fermée (FDS §5, adaptée 25/08/2026 au verdict binaire ACFC)', () => {
  test('couverture exhaustive de toutes les combinaisons criticité×complexité définies', () => {
    const attendu: Record<string, ReturnType<typeof determinerConclusion>> = {
      non_critique_catalogue: 'revue_documentaire',
      non_critique_specifique: 'fat',
      critique_catalogue: 'iq_oq',
      critique_specifique: 'iq_oq_pq',
    }
    const criticites: Array<'critique' | 'non_critique'> = ['critique', 'non_critique']
    const complexites: NiveauComplexite[] = ['catalogue', 'specifique']

    for (const criticite of criticites) {
      for (const complexite of complexites) {
        const resultat = determinerConclusion(criticite, complexite)
        expect(resultat).toBe(attendu[`${criticite}_${complexite}`])
        expect(resultat).not.toBe('autre')
      }
    }
  })

  test('complexité manquante -> autre, jamais une extrapolation', () => {
    expect(determinerConclusion('non_critique', null)).toBe('autre')
    expect(determinerConclusion('critique', null)).toBe('autre')
  })
})

describe('LIBELLES_CONCLUSION', () => {
  test('un libellé pour chaque conclusion possible', () => {
    const conclusions = [
      'aucun_impact',
      'revue_documentaire',
      'fat',
      'sat',
      'iq',
      'iq_oq',
      'iq_oq_pq',
      'autre',
    ] as const
    for (const c of conclusions) {
      expect(LIBELLES_CONCLUSION[c]).toBeTruthy()
    }
  })
})
