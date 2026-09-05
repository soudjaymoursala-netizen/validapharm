import { describe, expect, test } from 'vitest'
import { resoudreRegleEffective } from './resolutionEffective'

/** Global -> Site A, Site B (scénario obligatoire "Global + N sites"). */
function arbreGlobalPlusDeuxSites() {
  return new Map([
    ['global', { id: 'global', parent_workspace_id: null }],
    ['site-a', { id: 'site-a', parent_workspace_id: 'global' }],
    ['site-b', { id: 'site-b', parent_workspace_id: 'global' }],
  ])
}

describe('resoudreRegleEffective — scénario Global + N sites', () => {
  test('un site sans règle propre hérite silencieusement de la règle globale', () => {
    const regles = new Map([['global', 'méthode ACFC v3']])
    const resultat = resoudreRegleEffective('site-a', regles, arbreGlobalPlusDeuxSites())
    expect(resultat).toEqual({ valeur: 'méthode ACFC v3', workspaceIdOrigine: 'global' })
  })

  test('un site avec sa propre règle la voit prévaloir (override explicite)', () => {
    const regles = new Map([
      ['global', 'méthode ACFC v3'],
      ['site-b', 'méthode ACFC v5 — dérogation site B'],
    ])

    const resolutionSiteA = resoudreRegleEffective('site-a', regles, arbreGlobalPlusDeuxSites())
    const resolutionSiteB = resoudreRegleEffective('site-b', regles, arbreGlobalPlusDeuxSites())

    expect(resolutionSiteA).toEqual({ valeur: 'méthode ACFC v3', workspaceIdOrigine: 'global' })
    expect(resolutionSiteB).toEqual({
      valeur: 'méthode ACFC v5 — dérogation site B',
      workspaceIdOrigine: 'site-b',
    })
  })

  test('aucune règle nulle part jusqu’à la racine -> null, jamais une erreur', () => {
    const resultat = resoudreRegleEffective('site-a', new Map(), arbreGlobalPlusDeuxSites())
    expect(resultat).toBeNull()
  })

  test('un cycle inattendu dans l’arbre ne boucle jamais indéfiniment -> null', () => {
    const arbreCyclique = new Map([
      ['a', { id: 'a', parent_workspace_id: 'b' }],
      ['b', { id: 'b', parent_workspace_id: 'a' }],
    ])
    const resultat = resoudreRegleEffective('a', new Map(), arbreCyclique)
    expect(resultat).toBeNull()
  })
})
