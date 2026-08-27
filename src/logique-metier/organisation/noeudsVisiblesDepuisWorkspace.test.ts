import { describe, expect, test } from 'vitest'
import type { AssetNode } from '../domaine/types'
import { noeudsVisiblesDepuisWorkspace } from './noeudsVisiblesDepuisWorkspace'

function arbre(
  entrees: Array<[string, string | null]>,
): ReadonlyMap<string, { id: string; parent_workspace_id: string | null }> {
  return new Map(entrees.map(([id, parent_workspace_id]) => [id, { id, parent_workspace_id }]))
}

function noeud(code: string, workspaceId: string | null): AssetNode {
  return {
    id: code,
    client_id: 'client-1',
    workspace_id: workspaceId,
    level_key: 'equipement',
    name: code,
    code,
    parent_id: null,
    associated_nodes: [],
    source: 'manuel',
    qms_connector_id: null,
    periodic_qualification: { applicable: false, deadline: null },
    qualification_status: 'non_qualifie',
    audit_log: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  }
}

describe('noeudsVisiblesDepuisWorkspace', () => {
  test('un nœud de site est visible depuis ce site et ses ancêtres, jamais un site cousin', () => {
    const a = arbre([
      ['global', null],
      ['site-a', 'global'],
      ['site-b', 'global'],
    ])
    const noeuds = [
      noeud('GLOBAL-1', 'global'),
      noeud('SITE-A-1', 'site-a'),
      noeud('SITE-B-1', 'site-b'),
    ]

    expect(
      noeudsVisiblesDepuisWorkspace('site-a', a, noeuds)
        .map((n) => n.code)
        .sort(),
    ).toEqual(['GLOBAL-1', 'SITE-A-1'])
    expect(noeudsVisiblesDepuisWorkspace('global', a, noeuds).map((n) => n.code)).toEqual([
      'GLOBAL-1',
    ])
  })

  test('un nœud legacy (workspace_id null) reste visible depuis tout workspace', () => {
    const a = arbre([
      ['global', null],
      ['site-a', 'global'],
    ])
    const noeuds = [noeud('LEGACY-1', null)]
    expect(noeudsVisiblesDepuisWorkspace('site-a', a, noeuds).map((n) => n.code)).toEqual([
      'LEGACY-1',
    ])
  })
})
