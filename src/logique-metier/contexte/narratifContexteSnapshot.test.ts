import { describe, expect, test } from 'vitest'
import type {
  AssetNode,
  ContextSnapshotItem,
  ManufacturingContext,
  QualityEvent,
} from '../domaine/types'
import {
  construireNarratifContexte,
  estNarratifVide,
  idsNarratifContexte,
  serialiserNarratifContexte,
} from './narratifContexteSnapshot'

function noeud(surcharge: Partial<AssetNode> = {}): AssetNode {
  return {
    id: 'n1',
    client_id: 'c1',
    workspace_id: null,
    level_key: 'systeme',
    name: 'Ligne A12',
    code: 'SYS-A12',
    parent_id: null,
    associated_nodes: [],
    source: 'manuel',
    qms_connector_id: null,
    periodic_qualification: { applicable: false, deadline: null },
    qualification_status: 'qualifie',
    audit_log: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...surcharge,
  }
}

function manufacturingContext(surcharge: Partial<ManufacturingContext> = {}): ManufacturingContext {
  return {
    id: 'm1',
    client_id: 'c1',
    asset_node_id: 'n1',
    process_id: 'p1',
    produit: 'Produit X',
    recette: 'R02',
    format: null,
    configuration: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...surcharge,
  }
}

function qualityEvent(surcharge: Partial<QualityEvent> = {}): QualityEvent {
  return {
    id: 'q1',
    client_id: 'c1',
    type: 'deviation',
    titre: 'Écart de température',
    description: 'Dépassement de la plage 2-8°C pendant 2h',
    origine: 'interne',
    reference_externe: null,
    asset_node_id: 'n1',
    process_id: null,
    manufacturing_context_id: null,
    statut: 'ouvert',
    audit_log: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...surcharge,
  }
}

describe('construireNarratifContexte', () => {
  test('répartit chaque type d’objet résolu dans la bonne facette', () => {
    const items: ContextSnapshotItem[] = [
      {
        id: 'i1',
        client_id: 'c1',
        context_snapshot_id: 's1',
        type_objet: 'asset_node',
        objet_id: 'n1',
      },
      {
        id: 'i2',
        client_id: 'c1',
        context_snapshot_id: 's1',
        type_objet: 'manufacturing_context',
        objet_id: 'm1',
      },
      {
        id: 'i3',
        client_id: 'c1',
        context_snapshot_id: 's1',
        type_objet: 'quality_event',
        objet_id: 'q1',
      },
    ]

    const narratif = construireNarratifContexte({
      items,
      assetNodes: [noeud()],
      manufacturingContexts: [manufacturingContext()],
      qualityEvents: [qualityEvent()],
    })

    expect(narratif.ou).toHaveLength(1)
    expect(narratif.ou[0]?.texte).toContain('Ligne A12')
    expect(narratif.quoi).toHaveLength(1)
    expect(narratif.quoi[0]?.texte).toContain('Produit X')
    expect(narratif.pourquoiImpact).toHaveLength(1)
    expect(narratif.pourquoiImpact[0]?.texte).toContain('Écart de température')
    expect(narratif.comment).toEqual([])
  })

  test('un item référençant un objet introuvable est ignoré, jamais un plantage', () => {
    const items: ContextSnapshotItem[] = [
      {
        id: 'i1',
        client_id: 'c1',
        context_snapshot_id: 's1',
        type_objet: 'asset_node',
        objet_id: 'inconnu',
      },
    ]
    const narratif = construireNarratifContexte({
      items,
      assetNodes: [],
      manufacturingContexts: [],
      qualityEvents: [],
    })
    expect(estNarratifVide(narratif)).toBe(true)
  })
})

describe('serialiserNarratifContexte', () => {
  test('omet les sections vides, jamais un intitulé sans contenu', () => {
    const texte = serialiserNarratifContexte({
      ou: [{ id: 'n1', texte: 'Ligne A12' }],
      quoi: [],
      comment: [],
      pourquoiImpact: [],
    })
    expect(texte).toContain('OÙ (localisation)')
    expect(texte).not.toContain('QUOI')
    expect(texte).not.toContain('COMMENT')
    expect(texte).not.toContain('POURQUOI')
  })

  test('narratif entièrement vide produit une chaîne vide', () => {
    expect(serialiserNarratifContexte({ ou: [], quoi: [], comment: [], pourquoiImpact: [] })).toBe(
      '',
    )
  })
})

describe('idsNarratifContexte', () => {
  test('regroupe les ids des quatre facettes', () => {
    const ids = idsNarratifContexte({
      ou: [{ id: 'n1', texte: '' }],
      quoi: [{ id: 'm1', texte: '' }],
      comment: [],
      pourquoiImpact: [{ id: 'q1', texte: '' }],
    })
    expect(ids).toEqual(['n1', 'm1', 'q1'])
  })
})
