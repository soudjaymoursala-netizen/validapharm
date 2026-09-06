import { describe, expect, test } from 'vitest'
import { correspondPourRecherche } from './correspondPourRecherche'

describe('correspondPourRecherche', () => {
  test('insensible à la casse', () => {
    expect(correspondPourRecherche('COMPRESSION', 'Compression rotative')).toBe(true)
  })

  test('sous-chaîne, pas un mot entier', () => {
    expect(correspondPourRecherche('press', 'Qualification presse P-200')).toBe(true)
  })

  test('teste chaque champ fourni', () => {
    expect(correspondPourRecherche('sop-qa', 'Titre sans rapport', 'SOP-QA-012')).toBe(true)
  })

  test('aucun champ ne correspond', () => {
    expect(correspondPourRecherche('inconnu', 'Compression', 'SOP-QA-012')).toBe(false)
  })

  test('requête vide ne correspond jamais (évite de tout retourner par accident)', () => {
    expect(correspondPourRecherche('', 'Compression')).toBe(false)
    expect(correspondPourRecherche('   ', 'Compression')).toBe(false)
  })

  test('champ null/undefined ignoré sans erreur', () => {
    expect(correspondPourRecherche('compression', null, undefined, 'Compression')).toBe(true)
  })
})
