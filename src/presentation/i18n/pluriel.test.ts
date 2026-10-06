import { describe, expect, it } from 'vitest'
import { pluriel } from './pluriel'

describe('pluriel', () => {
  it('prend le singulier pour 0 et 1, le pluriel au-delà', () => {
    expect(pluriel(0, 'résultat', 'résultats')).toBe('0 résultat')
    expect(pluriel(1, 'résultat', 'résultats')).toBe('1 résultat')
    expect(pluriel(2, 'résultat', 'résultats')).toBe('2 résultats')
  })
})
