import { describe, expect, test } from 'vitest'
import { messageBornesAmdec } from './bornesMethodeAmdec'

describe('messageBornesAmdec (audit M10)', () => {
  test('une méthode 1-5 avec un seuil atteignable est acceptée', () => {
    expect(messageBornesAmdec(1, 5, 50)).toBeNull()
    expect(messageBornesAmdec(1, 5, 125)).toBeNull()
  })

  test('un seuil hors des IPR possibles est refusé (toutes les lignes auraient le même verdict)', () => {
    expect(messageBornesAmdec(1, 5, 200)).toContain('entre 2 et 125')
    expect(messageBornesAmdec(1, 5, 1)).toContain('entre 2 et 125')
  })

  test('échelle commençant sous 1, inversée ou non entière refusée', () => {
    expect(messageBornesAmdec(0, 5, 50)).toContain('au moins 1')
    expect(messageBornesAmdec(5, 5, 50)).toContain('strictement inférieure')
    expect(messageBornesAmdec(1, 5, 50.5)).toContain('entiers')
  })
})
