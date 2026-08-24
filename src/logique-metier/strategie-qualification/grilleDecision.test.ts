import { describe, expect, test } from 'vitest'
import type { NiveauCriticite } from './grilleCriticite'
import { determinerConclusion, LIBELLES_CONCLUSION, type NiveauComplexite } from './grilleDecision'

describe('determinerConclusion — table de décision fermée (URS-F-050, FDS §5)', () => {
  test('absence_criticite -> aucun_impact, quelle que soit la complexité (jamais évaluée)', () => {
    expect(determinerConclusion('absence_criticite', 'catalogue')).toBe('aucun_impact')
    expect(determinerConclusion('absence_criticite', 'specifique')).toBe('aucun_impact')
    expect(determinerConclusion('absence_criticite', null)).toBe('aucun_impact')
  })

  test('couverture exhaustive de toutes les combinaisons criticité×complexité définies', () => {
    const attendu: Record<string, ReturnType<typeof determinerConclusion>> = {
      mineur_catalogue: 'revue_documentaire',
      mineur_specifique: 'fat',
      majeur_catalogue: 'sat',
      majeur_specifique: 'iq',
      critique_catalogue: 'iq_oq',
      critique_specifique: 'iq_oq_pq',
    }
    const criticites: Array<Exclude<NiveauCriticite, 'absence_criticite'>> = [
      'mineur',
      'majeur',
      'critique',
    ]
    const complexites: NiveauComplexite[] = ['catalogue', 'specifique']

    for (const criticite of criticites) {
      for (const complexite of complexites) {
        const resultat = determinerConclusion(criticite, complexite)
        expect(resultat).toBe(attendu[`${criticite}_${complexite}`])
        expect(resultat).not.toBe('autre')
      }
    }
  })

  test('complexité manquante pour une criticité non nulle -> autre, jamais une extrapolation', () => {
    expect(determinerConclusion('mineur', null)).toBe('autre')
    expect(determinerConclusion('majeur', null)).toBe('autre')
    expect(determinerConclusion('critique', null)).toBe('autre')
  })

  test('combinaison hors table (garde défensive, cas non atteignable via les types actuels) -> autre', () => {
    const criticiteInconnue = 'inconnue' as NiveauCriticite
    expect(determinerConclusion(criticiteInconnue, 'catalogue')).toBe('autre')
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
