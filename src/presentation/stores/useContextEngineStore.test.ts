import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import type {
  AssetNode,
  ManufacturingContext,
  QualityEvent,
} from '../../logique-metier/domaine/types'
import { db } from '../../persistance/db'
import { useContextEngineStore } from './useContextEngineStore'

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

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.contextSnapshots.clear()
  await db.contextSnapshotItems.clear()
})

describe('useContextEngineStore — assemblage et persistance', () => {
  test('assemblerSnapshot fige workspace_id/asset_node_id et persiste les éléments résolus', async () => {
    const store = useContextEngineStore()
    await store.charger('client-1')

    const noeuds = [noeud('granulateur-01', 'site-a')]
    const contextes = [contexteFabrication('mc-1', 'granulateur-01')]
    const evenements = [evenementQualite('qe-1', 'granulateur-01')]

    const snapshot = await store.assemblerSnapshot('client-1', {
      workspaceId: null,
      assetNodeId: 'granulateur-01',
      arbreWorkspace: arbre([['site-a', null]]),
      assetNodes: noeuds,
      manufacturingContexts: contextes,
      qualityEvents: evenements,
    })

    expect(snapshot.asset_node_id).toBe('granulateur-01')
    expect(snapshot.workspace_id).toBeNull()
    expect(store.snapshots).toHaveLength(1)

    const elements = store.elementsDuSnapshot(snapshot.id)
    expect(elements.map((e) => e.type_objet).sort()).toEqual([
      'asset_node',
      'manufacturing_context',
      'quality_event',
    ])
  })

  test("aucune fonction de mise à jour n'est exposée (ContextSnapshot immuable)", async () => {
    const store = useContextEngineStore()
    expect('mettreAJourSnapshot' in store).toBe(false)
    expect('changerStatutSnapshot' in store).toBe(false)
  })

  test('isolation stricte par client', async () => {
    const store = useContextEngineStore()
    await store.charger('client-A')
    await store.assemblerSnapshot('client-A', {
      workspaceId: null,
      assetNodeId: null,
      arbreWorkspace: arbre([]),
      assetNodes: [],
      manufacturingContexts: [],
      qualityEvents: [],
    })
    await store.charger('client-B')
    expect(store.snapshots).toHaveLength(0)
  })
})
