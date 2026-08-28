import { describe, expect, test } from 'vitest'
import { parcourirGraphe } from './parcourirGraphe'

interface Arete {
  from: string
  to: string
}

interface Noeud {
  id: string
  nom: string
}

describe('parcourirGraphe', () => {
  const noeuds: Noeud[] = [
    { id: 'a', nom: 'A' },
    { id: 'b', nom: 'B' },
    { id: 'c', nom: 'C' },
    { id: 'd', nom: 'D' },
  ]

  test('chaîne linéaire A->B->C->D — parcourue entièrement, dans l’ordre de découverte', () => {
    const aretes: Arete[] = [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'c' },
      { from: 'c', to: 'd' },
    ]
    const resultat = parcourirGraphe(
      'a',
      aretes,
      noeuds,
      (ar) => ar.from,
      (ar) => ar.to,
    )
    expect(resultat.map((e) => e.noeud.id)).toEqual(['b', 'c', 'd'])
  })

  test('nœud sans arête sortante -> tableau vide', () => {
    const resultat = parcourirGraphe(
      'd',
      [{ from: 'a', to: 'b' }],
      noeuds,
      (ar) => ar.from,
      (ar) => ar.to,
    )
    expect(resultat).toEqual([])
  })

  test('cycle (A->B->A) -> aucune boucle infinie, chaque nœud visité une seule fois', () => {
    const aretes: Arete[] = [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'a' },
    ]
    const resultat = parcourirGraphe(
      'a',
      aretes,
      noeuds,
      (ar) => ar.from,
      (ar) => ar.to,
    )
    expect(resultat.map((e) => e.noeud.id)).toEqual(['b'])
  })

  test('arête vers un nœud inconnu -> ignorée, jamais une exception', () => {
    const resultat = parcourirGraphe(
      'a',
      [{ from: 'a', to: 'inconnu' }],
      noeuds,
      (ar) => ar.from,
      (ar) => ar.to,
    )
    expect(resultat).toEqual([])
  })

  test('embranchement (A->B, A->C) -> les deux branches retournées', () => {
    const aretes: Arete[] = [
      { from: 'a', to: 'b' },
      { from: 'a', to: 'c' },
    ]
    const resultat = parcourirGraphe(
      'a',
      aretes,
      noeuds,
      (ar) => ar.from,
      (ar) => ar.to,
    )
    expect(resultat.map((e) => e.noeud.id).sort()).toEqual(['b', 'c'])
  })
})
