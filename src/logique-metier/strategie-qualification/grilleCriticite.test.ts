import { describe, expect, test } from 'vitest'
import { CRITERES_CRITICITE_V1, niveauLePlusEleve } from './grilleCriticite'

describe('niveauLePlusEleve', () => {
  test('aucun item coché -> absence_criticite (état neutre par défaut)', () => {
    expect(niveauLePlusEleve([])).toBe('absence_criticite')
  })

  test('un seul niveau -> ce niveau', () => {
    expect(niveauLePlusEleve(['mineur'])).toBe('mineur')
  })

  test('mélange -> retient le plus élevé, jamais une moyenne', () => {
    expect(niveauLePlusEleve(['mineur', 'critique', 'absence_criticite'])).toBe('critique')
    expect(niveauLePlusEleve(['mineur', 'majeur'])).toBe('majeur')
    expect(niveauLePlusEleve(['absence_criticite', 'absence_criticite'])).toBe('absence_criticite')
  })

  test('ordre des éléments sans effet sur le résultat', () => {
    expect(niveauLePlusEleve(['critique', 'mineur', 'majeur'])).toBe('critique')
    expect(niveauLePlusEleve(['majeur', 'critique', 'mineur'])).toBe('critique')
  })
})

describe('CRITERES_CRITICITE_V1', () => {
  test('identifiants uniques (aucun doublon)', () => {
    const ids = CRITERES_CRITICITE_V1.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('au moins un item par niveau de criticité (grille couvre les 4 niveaux)', () => {
    const niveaux = new Set(CRITERES_CRITICITE_V1.map((c) => c.niveau))
    expect(niveaux).toEqual(new Set(['critique', 'majeur', 'mineur', 'absence_criticite']))
  })
})
