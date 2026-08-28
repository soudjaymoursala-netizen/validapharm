import { describe, expect, test } from 'vitest'
import type { KnowledgeItem, KnowledgeRelation } from '../domaine/types'
import { relationsConnaissanceDepuis } from './relationsConnaissance'

function item(surcharge: Partial<KnowledgeItem> = {}): KnowledgeItem {
  return {
    id: 'ki-1',
    client_id: 'c1',
    extraction_item_id: 'ext-1',
    libelle: 'Fait',
    valeur_interpretee: '',
    statut: 'valide',
    valide_par: null,
    audit_log: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...surcharge,
  }
}

function relation(surcharge: Partial<KnowledgeRelation> = {}): KnowledgeRelation {
  return {
    id: 'rel-1',
    client_id: 'c1',
    knowledge_item_source_id: 'ki-1',
    knowledge_item_cible_id: 'ki-2',
    type: 'depend_de',
    created_at: '2026-01-01T00:00:00.000Z',
    ...surcharge,
  }
}

describe('relationsConnaissanceDepuis', () => {
  test('trace une chaîne de relations sortantes depuis un KnowledgeItem', () => {
    const items = [item({ id: 'ki-1' }), item({ id: 'ki-2' }), item({ id: 'ki-3' })]
    const relations = [
      relation({ id: 'rel-1', knowledge_item_source_id: 'ki-1', knowledge_item_cible_id: 'ki-2' }),
      relation({ id: 'rel-2', knowledge_item_source_id: 'ki-2', knowledge_item_cible_id: 'ki-3' }),
    ]
    const resultat = relationsConnaissanceDepuis('ki-1', relations, items)
    expect(resultat.map((e) => e.item.id)).toEqual(['ki-2', 'ki-3'])
    expect(resultat[0]?.relation.type).toBe('depend_de')
  })

  test('aucune relation sortante -> tableau vide', () => {
    const items = [item({ id: 'ki-1' })]
    expect(relationsConnaissanceDepuis('ki-1', [], items)).toEqual([])
  })

  test('cycle entre deux KnowledgeItem -> aucune boucle infinie', () => {
    const items = [item({ id: 'ki-1' }), item({ id: 'ki-2' })]
    const relations = [
      relation({ id: 'rel-1', knowledge_item_source_id: 'ki-1', knowledge_item_cible_id: 'ki-2' }),
      relation({ id: 'rel-2', knowledge_item_source_id: 'ki-2', knowledge_item_cible_id: 'ki-1' }),
    ]
    const resultat = relationsConnaissanceDepuis('ki-1', relations, items)
    expect(resultat.map((e) => e.item.id)).toEqual(['ki-2'])
  })
})
