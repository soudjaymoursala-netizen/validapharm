import { describe, expect, test } from 'vitest'
import { comparerPourAffichage, evaluerPeriodicite } from './statutPeriodicite'

describe('evaluerPeriodicite', () => {
  test('non applicable si periodic_qualification.applicable est faux', () => {
    expect(evaluerPeriodicite({ applicable: false, deadline: '2026-01-01' }, '2026-06-01')).toEqual(
      { statut: 'non_applicable', joursRestants: null },
    )
  })

  test('échéance non renseignée si applicable mais deadline absente', () => {
    expect(evaluerPeriodicite({ applicable: true, deadline: null }, '2026-06-01')).toEqual({
      statut: 'echeance_non_renseignee',
      joursRestants: null,
    })
  })

  test('en retard si la date d’échéance est passée', () => {
    const resultat = evaluerPeriodicite({ applicable: true, deadline: '2026-05-01' }, '2026-06-01')
    expect(resultat.statut).toBe('en_retard')
    expect(resultat.joursRestants).toBe(-31)
  })

  test('proche échéance si dans la fenêtre de 90 jours', () => {
    const resultat = evaluerPeriodicite({ applicable: true, deadline: '2026-08-01' }, '2026-06-01')
    expect(resultat.statut).toBe('proche_echeance')
    expect(resultat.joursRestants).toBe(61)
  })

  test('à jour au-delà du seuil de proximité', () => {
    const resultat = evaluerPeriodicite({ applicable: true, deadline: '2027-01-01' }, '2026-06-01')
    expect(resultat.statut).toBe('a_jour')
    expect(resultat.joursRestants).toBeGreaterThan(90)
  })

  test('seuil de proximité personnalisable', () => {
    const resultat = evaluerPeriodicite(
      { applicable: true, deadline: '2026-06-10' },
      '2026-06-01',
      5,
    )
    expect(resultat.statut).toBe('a_jour')
  })

  test('échéance le jour même compte comme proche échéance, pas en retard', () => {
    const resultat = evaluerPeriodicite({ applicable: true, deadline: '2026-06-01' }, '2026-06-01')
    expect(resultat.statut).toBe('proche_echeance')
    expect(resultat.joursRestants).toBe(0)
  })
})

describe('comparerPourAffichage', () => {
  test('trie en_retard avant proche_echeance avant echeance_non_renseignee avant a_jour', () => {
    const evaluations = [
      { statut: 'a_jour' as const, joursRestants: 400 },
      { statut: 'en_retard' as const, joursRestants: -10 },
      { statut: 'echeance_non_renseignee' as const, joursRestants: null },
      { statut: 'proche_echeance' as const, joursRestants: 30 },
    ]
    const trie = [...evaluations].sort(comparerPourAffichage)
    expect(trie.map((e) => e.statut)).toEqual([
      'en_retard',
      'proche_echeance',
      'echeance_non_renseignee',
      'a_jour',
    ])
  })

  test('au sein d’un même statut, l’échéance la plus proche vient en premier', () => {
    const evaluations = [
      { statut: 'en_retard' as const, joursRestants: -3 },
      { statut: 'en_retard' as const, joursRestants: -30 },
    ]
    const trie = [...evaluations].sort(comparerPourAffichage)
    expect(trie.map((e) => e.joursRestants)).toEqual([-30, -3])
  })
})
