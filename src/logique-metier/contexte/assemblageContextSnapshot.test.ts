import { describe, expect, test } from 'vitest'
import type { AssetNode, ManufacturingContext, QualityEvent } from '../domaine/types'
import { assemblerElementsContextSnapshot } from './assemblageContextSnapshot'

function arbre(
  entrees: Array<[string, string | null]>,
): ReadonlyMap<string, { id: string; parent_workspace_id: string | null }> {
  return new Map(entrees.map(([id, parent_workspace_id]) => [id, { id, parent_workspace_id }]))
}

function noeud(id: string, workspaceId: string | null): AssetNode {
  return {
    id,
    client_id: 'client-1',
    workspace_id: workspaceId,
    level_key: 'equipement',
    name: id,
    code: id,
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

function contexteFabrication(id: string, assetNodeId: string): ManufacturingContext {
  return {
    id,
    client_id: 'client-1',
    asset_node_id: assetNodeId,
    process_id: 'process-1',
    produit: 'Produit A',
    recette: null,
    format: null,
    configuration: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  }
}

function evenementQualite(id: string, assetNodeId: string | null): QualityEvent {
  return {
    id,
    client_id: 'client-1',
    type: 'change_control',
    titre: id,
    description: '',
    origine: 'interne',
    reference_externe: null,
    asset_node_id: assetNodeId,
    process_id: null,
    manufacturing_context_id: null,
    statut: 'ouvert',
    audit_log: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  }
}

describe('assemblerElementsContextSnapshot', () => {
  test('ancre précise (assetNodeId) : résolution exacte sur ce nœud, pas ses descendants', () => {
    const noeuds = [noeud('granulateur-01', 'site-a'), noeud('granulateur-02', 'site-a')]
    const contextes = [contexteFabrication('mc-1', 'granulateur-01')]
    const evenements = [
      evenementQualite('qe-1', 'granulateur-01'),
      evenementQualite('qe-2', 'granulateur-02'),
    ]

    const elements = assemblerElementsContextSnapshot({
      workspaceId: null,
      assetNodeId: 'granulateur-01',
      arbreWorkspace: arbre([['site-a', null]]),
      assetNodes: noeuds,
      manufacturingContexts: contextes,
      qualityEvents: evenements,
    })

    expect(elements).toEqual(
      expect.arrayContaining([
        { type_objet: 'asset_node', objet_id: 'granulateur-01' },
        { type_objet: 'manufacturing_context', objet_id: 'mc-1' },
        { type_objet: 'quality_event', objet_id: 'qe-1' },
      ]),
    )
    expect(elements).toHaveLength(3)
  })

  test('ancre de site (workspaceId) : résolution par visibilité, tous les actifs du site', () => {
    const a = arbre([
      ['global', null],
      ['site-a', 'global'],
      ['site-b', 'global'],
    ])
    const noeuds = [
      noeud('global-1', 'global'),
      noeud('site-a-1', 'site-a'),
      noeud('site-b-1', 'site-b'),
    ]

    const elements = assemblerElementsContextSnapshot({
      workspaceId: 'site-a',
      assetNodeId: null,
      arbreWorkspace: a,
      assetNodes: noeuds,
      manufacturingContexts: [],
      qualityEvents: [],
    })

    expect(elements.map((e) => e.objet_id).sort()).toEqual(['global-1', 'site-a-1'])
    expect(elements.every((e) => e.type_objet === 'asset_node')).toBe(true)
  })

  test('ni ancre de site ni ancre précise : aucun élément assemblé', () => {
    const elements = assemblerElementsContextSnapshot({
      workspaceId: null,
      assetNodeId: null,
      arbreWorkspace: arbre([]),
      assetNodes: [noeud('x', null)],
      manufacturingContexts: [],
      qualityEvents: [],
    })
    expect(elements).toHaveLength(0)
  })

  test("un QualityEvent non rattaché à un AssetNode (asset_node_id null) n'est jamais inclus", () => {
    const noeuds = [noeud('granulateur-01', null)]
    const evenements = [evenementQualite('qe-sans-actif', null)]

    const elements = assemblerElementsContextSnapshot({
      workspaceId: null,
      assetNodeId: 'granulateur-01',
      arbreWorkspace: arbre([]),
      assetNodes: noeuds,
      manufacturingContexts: [],
      qualityEvents: evenements,
    })

    expect(elements.some((e) => e.type_objet === 'quality_event')).toBe(false)
  })
})
