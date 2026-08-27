import { describe, expect, test } from 'vitest'
import type { AssetNode, RelationTechnique, TypeRelationTechnique } from '../domaine/types'
import { chaineTechniqueDepuis } from './chaineTechnique'

function noeud(code: string): AssetNode {
  return {
    id: code,
    client_id: 'client-1',
    workspace_id: null,
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

function relation(
  type: TypeRelationTechnique,
  sourceId: string,
  cibleId: string,
): RelationTechnique {
  return {
    id: `${sourceId}-${type}-${cibleId}`,
    client_id: 'client-1',
    type_relation: type,
    noeud_source_id: sourceId,
    noeud_cible_id: cibleId,
    created_at: '2026-01-01T00:00:00.000Z',
  }
}

describe('chaineTechniqueDepuis', () => {
  test('trace la chaîne Equipment→PLC→SCADA→Server (scénario réel de la vision, TEST 6)', () => {
    const equipement = noeud('GRANULATEUR-01')
    const plc = noeud('PLC-01')
    const scada = noeud('SCADA-01')
    const serveur = noeud('SERVEUR-01')
    const noeuds = [equipement, plc, scada, serveur]
    const relations = [
      relation('controle_par', equipement.id, plc.id),
      relation('connecte_a', plc.id, scada.id),
      relation('heberge_sur', scada.id, serveur.id),
    ]

    const chaine = chaineTechniqueDepuis(equipement.id, relations, noeuds)

    expect(chaine.map((etape) => etape.noeud.code)).toEqual(['PLC-01', 'SCADA-01', 'SERVEUR-01'])
    expect(chaine.map((etape) => etape.relation.type_relation)).toEqual([
      'controle_par',
      'connecte_a',
      'heberge_sur',
    ])
  })

  test('un nœud sans relation sortante retourne une chaîne vide', () => {
    const isole = noeud('ISOLE-01')
    expect(chaineTechniqueDepuis(isole.id, [], [isole])).toEqual([])
  })

  test('plusieurs relations de types différents depuis le même nœud sont toutes retournées', () => {
    const equipement = noeud('EQUIP-01')
    const plc = noeud('PLC-01')
    const armoire = noeud('ARMOIRE-01')
    const noeuds = [equipement, plc, armoire]
    const relations = [
      relation('controle_par', equipement.id, plc.id),
      relation('heberge_sur', equipement.id, armoire.id),
    ]

    const chaine = chaineTechniqueDepuis(equipement.id, relations, noeuds)

    expect(chaine.map((etape) => etape.noeud.code).sort()).toEqual(['ARMOIRE-01', 'PLC-01'])
  })

  test('un cycle ne provoque jamais de boucle infinie (tolérance déjà documentée pour le graphe libre)', () => {
    const a = noeud('A')
    const b = noeud('B')
    const noeuds = [a, b]
    const relations = [relation('connecte_a', a.id, b.id), relation('connecte_a', b.id, a.id)]

    const chaine = chaineTechniqueDepuis(a.id, relations, noeuds)

    expect(chaine.map((etape) => etape.noeud.code)).toEqual(['B'])
  })
})
