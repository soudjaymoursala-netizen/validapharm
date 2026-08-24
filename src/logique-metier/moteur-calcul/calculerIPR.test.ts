import { describe, expect, test } from 'vitest'
import { calculerIPR } from './calculerIPR'

describe('calculerIPR', () => {
  test('cas nominal, échelle par défaut [1,5]', () => {
    expect(calculerIPR(3, 2, 4)).toEqual({ calcule: true, valeur: 24 })
  })

  test("valeurs aux bornes basses et hautes de l'échelle par défaut", () => {
    expect(calculerIPR(1, 1, 1)).toEqual({ calcule: true, valeur: 1 })
    expect(calculerIPR(5, 5, 5)).toEqual({ calcule: true, valeur: 125 })
  })

  test('échelle [1,10] explicite (certains gabarits)', () => {
    const echelle = { min: 1, max: 10 }
    expect(calculerIPR(10, 10, 10, echelle)).toEqual({ calcule: true, valeur: 1000 })
    expect(calculerIPR(7, 6, 8, echelle)).toEqual({ calcule: true, valeur: 336 })
  })

  test.each([
    [null, 2, 3],
    [1, null, 3],
    [1, 2, null],
    [null, null, null],
  ] as const)('valeur(s) vide(s) %s/%s/%s : non calculé, aucune erreur', (s, o, d) => {
    expect(calculerIPR(s, o, d)).toEqual({ calcule: false, raison: 'valeurs_incompletes' })
  })

  test('sévérité hors plage (0, en dessous du minimum) est rejetée, pas bornée', () => {
    expect(calculerIPR(0, 2, 3)).toEqual({
      calcule: false,
      raison: 'valeur_hors_plage',
      champ: 'severite',
    })
  })

  test('occurrence hors plage (6, échelle [1,5]) est rejetée', () => {
    expect(calculerIPR(3, 6, 3)).toEqual({
      calcule: false,
      raison: 'valeur_hors_plage',
      champ: 'occurrence',
    })
  })

  test('détectabilité hors plage est rejetée', () => {
    expect(calculerIPR(3, 3, 11, { min: 1, max: 10 })).toEqual({
      calcule: false,
      raison: 'valeur_hors_plage',
      champ: 'detectabilite',
    })
  })

  test('le premier champ hors plage rencontré (S puis O puis D) est celui rapporté', () => {
    // S et O sont tous les deux hors plage ici — S doit être signalé en premier.
    expect(calculerIPR(0, 6, 3)).toEqual({
      calcule: false,
      raison: 'valeur_hors_plage',
      champ: 'severite',
    })
  })
})
