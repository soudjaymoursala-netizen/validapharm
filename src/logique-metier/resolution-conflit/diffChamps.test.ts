import { describe, expect, test } from 'vitest'
import {
  appliquerResolutions,
  construireMotifResolution,
  diffChamps,
  type ChoixResolutionChamp,
} from './diffChamps'

describe('diffChamps', () => {
  test('ne retourne que les champs réellement différents', () => {
    const local = { name: 'A', context: 'ctx', scope_in: 'x' }
    const distant = { name: 'B', context: 'ctx', scope_in: 'y' }
    const divergences = diffChamps(local, distant)
    expect(divergences).toEqual([
      { champ: 'name', valeurLocale: 'A', valeurDistante: 'B' },
      { champ: 'scope_in', valeurLocale: 'x', valeurDistante: 'y' },
    ])
  })

  test('deux enregistrements identiques : aucune divergence', () => {
    const record = { a: 1, b: [1, 2, 3], c: { x: 'y' } }
    expect(diffChamps(record, { ...record })).toEqual([])
  })

  test('exclut les champs explicitement ignorés (ex. updated_at, audit_log)', () => {
    const local = { name: 'A', updated_at: '2026-01-01', audit_log: [1] }
    const distant = { name: 'A', updated_at: '2026-01-02', audit_log: [1, 2] }
    const divergences = diffChamps(local, distant, ['updated_at', 'audit_log'])
    expect(divergences).toEqual([])
  })

  test('compare en profondeur les valeurs structurées (objets/tableaux), pas seulement les scalaires', () => {
    const local = { values: { contenu: 'v1' } }
    const distant = { values: { contenu: 'v2' } }
    expect(diffChamps(local, distant)).toEqual([
      { champ: 'values', valeurLocale: { contenu: 'v1' }, valeurDistante: { contenu: 'v2' } },
    ])
  })

  test("un champ présent uniquement d'un côté est signalé comme divergent", () => {
    const local: Record<string, unknown> = { name: 'A', extra: 'x' }
    const distant: Record<string, unknown> = { name: 'A' }
    expect(diffChamps(local, distant)).toEqual([
      { champ: 'extra', valeurLocale: 'x', valeurDistante: undefined },
    ])
  })
})

describe('appliquerResolutions', () => {
  const local = { name: 'Local', context: 'ctx-local', scope_in: 'in-local' }
  const distant = { name: 'Distant', context: 'ctx-distant', scope_in: 'in-distant' }

  test('part de la version distante, superpose les champs choisis "locale"', () => {
    const choix: ChoixResolutionChamp[] = [{ champ: 'name', choix: 'locale' }]
    expect(appliquerResolutions(local, distant, choix)).toEqual({
      name: 'Local',
      context: 'ctx-distant',
      scope_in: 'in-distant',
    })
  })

  test('un champ résolu "distante" reste à la valeur distante (aucune superposition nécessaire)', () => {
    const choix: ChoixResolutionChamp[] = [{ champ: 'context', choix: 'distante' }]
    expect(appliquerResolutions(local, distant, choix).context).toBe('ctx-distant')
  })

  test('une valeur fusionnée manuellement remplace les deux', () => {
    const choix: ChoixResolutionChamp[] = [
      { champ: 'scope_in', choix: 'manuelle', valeur: 'fusion manuelle des deux périmètres' },
    ]
    expect(appliquerResolutions(local, distant, choix).scope_in).toBe(
      'fusion manuelle des deux périmètres',
    )
  })

  test('aucune décision : le résultat est intégralement la version distante', () => {
    expect(appliquerResolutions(local, distant, [])).toEqual(distant)
  })
})

describe('construireMotifResolution', () => {
  test('capture la décision retenue pour chaque champ, jamais un texte générique', () => {
    const motif = construireMotifResolution([
      { champ: 'name', choix: 'locale' },
      { champ: 'context', choix: 'distante' },
      { champ: 'scope_in', choix: 'manuelle', valeur: 'x' },
    ])
    expect(motif).toBe(
      'Résolution de conflit — name: version locale ; context: version distante ; scope_in: valeur fusionnée manuellement',
    )
  })
})
