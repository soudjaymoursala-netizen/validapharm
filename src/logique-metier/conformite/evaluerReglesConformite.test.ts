import { describe, expect, test } from 'vitest'
import { evaluerReglesConformite, type RegleConformite } from './evaluerReglesConformite'

interface ContexteTest {
  valeur: number
}

describe('evaluerReglesConformite', () => {
  test('aucune règle bloquante -> tableau vide', () => {
    const regles: RegleConformite<ContexteTest>[] = [
      { code: 'trop_grand', bloque: (c) => c.valeur > 100, message: 'Trop grand' },
    ]
    expect(evaluerReglesConformite({ valeur: 5 }, regles)).toEqual([])
  })

  test('une règle bloquante -> retournée', () => {
    const regles: RegleConformite<ContexteTest>[] = [
      { code: 'trop_grand', bloque: (c) => c.valeur > 100, message: 'Trop grand' },
    ]
    const resultat = evaluerReglesConformite({ valeur: 150 }, regles)
    expect(resultat).toHaveLength(1)
    expect(resultat[0]?.code).toBe('trop_grand')
  })

  test('plusieurs règles bloquantes simultanément -> toutes retournées, dans l’ordre de déclaration, jamais un court-circuit', () => {
    const regles: RegleConformite<ContexteTest>[] = [
      { code: 'trop_grand', bloque: (c) => c.valeur > 10, message: 'Trop grand' },
      { code: 'pair', bloque: (c) => c.valeur % 2 === 0, message: 'Pair' },
      { code: 'jamais', bloque: () => false, message: 'Ne bloque jamais' },
    ]
    const resultat = evaluerReglesConformite({ valeur: 20 }, regles)
    expect(resultat.map((r) => r.code)).toEqual(['trop_grand', 'pair'])
  })

  test('aucune règle fournie -> tableau vide, jamais une exception', () => {
    expect(evaluerReglesConformite({ valeur: 1 }, [])).toEqual([])
  })
})
