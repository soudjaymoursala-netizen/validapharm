import { describe, expect, test } from 'vitest'
import { dependanceInvalide } from './dependancesActivites'

const activites = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
const dep = (source: string, cible: string) => ({
  activity_source_id: source,
  activity_cible_id: cible,
})

describe('dependanceInvalide', () => {
  test('dépendance simple acceptée', () => {
    expect(dependanceInvalide(activites, [], 'a', 'b')).toBeNull()
  })

  test('une activité ne peut dépendre d’elle-même', () => {
    expect(dependanceInvalide(activites, [], 'a', 'a')).toBe('auto_dependance')
  })

  test('cycle direct refusé : b dépend déjà de a', () => {
    expect(dependanceInvalide(activites, [dep('b', 'a')], 'a', 'b')).toBe('cycle_introduit')
  })

  test('cycle indirect refusé : c → b → a, puis a → c', () => {
    expect(dependanceInvalide(activites, [dep('c', 'b'), dep('b', 'a')], 'a', 'c')).toBe(
      'cycle_introduit',
    )
  })

  test('deux activités dépendant d’une même troisième : pas un cycle', () => {
    expect(dependanceInvalide(activites, [dep('a', 'c')], 'b', 'c')).toBeNull()
  })
})
