import { describe, expect, test } from 'vitest'
import { introduitUnCycle } from './detectionCycle'

describe('introduitUnCycle', () => {
  test('nouveau parent null (racine) -> jamais un cycle', () => {
    expect(introduitUnCycle([], 'a', null)).toBe(false)
  })

  test('un nœud ne peut pas être son propre parent', () => {
    expect(introduitUnCycle([{ id: 'a', parent_id: null }], 'a', 'a')).toBe(true)
  })

  test('parent direct sans ascendance -> pas de cycle', () => {
    const nodes = [
      { id: 'a', parent_id: null },
      { id: 'b', parent_id: null },
    ]
    expect(introduitUnCycle(nodes, 'b', 'a')).toBe(false)
  })

  test('rattacher un ancêtre à son propre descendant -> cycle détecté', () => {
    // a -> b -> c (c est enfant de b, b est enfant de a)
    const nodes = [
      { id: 'a', parent_id: null },
      { id: 'b', parent_id: 'a' },
      { id: 'c', parent_id: 'b' },
    ]
    // rattacher a sous c créerait a -> c -> b -> a : cycle
    expect(introduitUnCycle(nodes, 'a', 'c')).toBe(true)
  })

  test('rattacher un nœud à un cousin sans lien ascendant -> pas de cycle', () => {
    const nodes = [
      { id: 'a', parent_id: null },
      { id: 'b', parent_id: 'a' },
      { id: 'c', parent_id: 'a' },
    ]
    expect(introduitUnCycle(nodes, 'b', 'c')).toBe(false)
  })

  test('chaîne profonde sans cycle -> pas de faux positif', () => {
    const nodes = [
      { id: 'n1', parent_id: null },
      { id: 'n2', parent_id: 'n1' },
      { id: 'n3', parent_id: 'n2' },
      { id: 'n4', parent_id: 'n3' },
      { id: 'n5', parent_id: 'n4' },
    ]
    expect(introduitUnCycle(nodes, 'n1', 'n5')).toBe(true) // n1 remonterait vers lui-même via n5->n4->n3->n2->n1
    expect(introduitUnCycle(nodes, 'nouveau', 'n5')).toBe(false)
  })
})
