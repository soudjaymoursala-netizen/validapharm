import { describe, expect, test } from 'vitest'
import { construirePrompt, parserSortieModele } from './protocoleRaisonnement'

describe('construirePrompt', () => {
  test("inclut objectif, catalogue d'outils et historique", () => {
    const prompt = construirePrompt(
      'Évaluer impact du changement de recette',
      [
        {
          nom: 'lister_requirements_pour_actif',
          description: 'Liste les Requirement liés à un AssetNode',
        },
      ],
      [
        'APPEL_OUTIL: {"nom":"lister_requirements_pour_actif","parametres":{"asset_node_id":"granulateur-01"}}',
      ],
    )
    expect(prompt).toContain('Évaluer impact du changement de recette')
    expect(prompt).toContain('lister_requirements_pour_actif')
    expect(prompt).toContain('Historique de ce raisonnement')
    expect(prompt).toContain('APPEL_OUTIL')
    expect(prompt).toContain('REPONSE_FINALE')
  })

  test('aucun historique au premier tour : pas de section historique', () => {
    const prompt = construirePrompt('Objectif', [], [])
    expect(prompt).not.toContain('Historique de ce raisonnement')
  })
})

describe('parserSortieModele — formats valides', () => {
  test("reconnaît un appel d'outil bien formé", () => {
    const sortie = parserSortieModele(
      'APPEL_OUTIL: {"nom": "lister_requirements_pour_actif", "parametres": {"asset_node_id": "granulateur-01"}}',
    )
    expect(sortie).toEqual({
      type: 'appel_outil',
      appel: {
        nom: 'lister_requirements_pour_actif',
        parametres: { asset_node_id: 'granulateur-01' },
      },
    })
  })

  test('reconnaît une réponse finale bien formée', () => {
    const sortie = parserSortieModele(
      'REPONSE_FINALE: {"texte": "Impact limité", "etat_confiance": "connu", "citations": ["req-1"]}',
    )
    expect(sortie).toEqual({
      type: 'reponse_finale',
      reponse: { texte: 'Impact limité', etat_confiance: 'connu', citations: ['req-1'] },
    })
  })

  test('tolère du texte parasite autour du JSON (le modèle ignore partiellement la consigne)', () => {
    const sortie = parserSortieModele(
      'Bien sûr, voici ma réponse.\nAPPEL_OUTIL: {"nom": "lister_tests_pour_requirement", "parametres": {"requirement_id": "req-1"}}\nMerci.',
    )
    expect(sortie).toEqual({
      type: 'appel_outil',
      appel: { nom: 'lister_tests_pour_requirement', parametres: { requirement_id: 'req-1' } },
    })
  })
})

describe('parserSortieModele — dégradation gracieuse (spec §2)', () => {
  test('un texte libre sans aucun des deux préfixes est non_reconnu', () => {
    const sortie = parserSortieModele("Je pense que l'impact est limité.")
    expect(sortie).toEqual({ type: 'non_reconnu', texteBrut: "Je pense que l'impact est limité." })
  })

  test('un JSON malformé après le préfixe est non_reconnu, jamais une exception', () => {
    expect(() => parserSortieModele('REPONSE_FINALE: {texte: pas du json valide')).not.toThrow()
    expect(parserSortieModele('REPONSE_FINALE: {texte: pas du json valide').type).toBe(
      'non_reconnu',
    )
  })

  test('un état de confiance hors de la taxonomie fermée est non_reconnu', () => {
    const sortie = parserSortieModele(
      'REPONSE_FINALE: {"texte": "x", "etat_confiance": "tres_confiant", "citations": []}',
    )
    expect(sortie.type).toBe('non_reconnu')
  })

  test('une réponse finale sans champ citations (absent) est non_reconnu plutôt que déduit', () => {
    const sortie = parserSortieModele('REPONSE_FINALE: {"texte": "x", "etat_confiance": "connu"}')
    expect(sortie.type).toBe('non_reconnu')
  })
})
