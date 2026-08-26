import { describe, expect, test } from 'vitest'
import { codeDejaUtilise } from './validerCodeUnique'

describe('codeDejaUtilise', () => {
  test('référentiel vide -> jamais utilisé', () => {
    expect(codeDejaUtilise([], 'CODE-1', null)).toBe(false)
  })

  test('code déjà présent chez un autre nœud -> utilisé', () => {
    const nodes = [{ id: 'a', code: 'CODE-1' }]
    expect(codeDejaUtilise(nodes, 'CODE-1', null)).toBe(true)
  })

  test('code du nœud lui-même exclu (modification sans changement de code)', () => {
    const nodes = [{ id: 'a', code: 'CODE-1' }]
    expect(codeDejaUtilise(nodes, 'CODE-1', 'a')).toBe(false)
  })

  test('code libre -> jamais utilisé', () => {
    const nodes = [{ id: 'a', code: 'CODE-1' }]
    expect(codeDejaUtilise(nodes, 'CODE-2', null)).toBe(false)
  })
})
