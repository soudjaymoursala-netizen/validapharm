import { describe, expect, test } from 'vitest'
import { ancetresWorkspace } from './ancetresWorkspace'

function arbre(
  entrees: Array<[string, string | null]>,
): ReadonlyMap<string, { id: string; parent_workspace_id: string | null }> {
  return new Map(entrees.map(([id, parent_workspace_id]) => [id, { id, parent_workspace_id }]))
}

describe('ancetresWorkspace', () => {
  test('retourne le chemin complet du plus spécifique au plus général', () => {
    const a = arbre([
      ['global', null],
      ['site-a', 'global'],
      ['ligne-a1', 'site-a'],
    ])
    expect(ancetresWorkspace('ligne-a1', a)).toEqual(['ligne-a1', 'site-a', 'global'])
  })

  test('un workspace racine retourne uniquement lui-même', () => {
    const a = arbre([['global', null]])
    expect(ancetresWorkspace('global', a)).toEqual(['global'])
  })

  test('un cycle arrête la remontée plutôt que de boucler indéfiniment', () => {
    const a = arbre([
      ['x', 'y'],
      ['y', 'x'],
    ])
    expect(ancetresWorkspace('x', a)).toEqual(['x', 'y'])
  })
})
