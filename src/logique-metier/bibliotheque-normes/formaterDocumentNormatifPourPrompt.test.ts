import { describe, expect, test } from 'vitest'
import {
  blocDocumentsNormatifsPourPrompt,
  formaterDocumentNormatifPourPrompt,
} from './formaterDocumentNormatifPourPrompt'

describe('formaterDocumentNormatifPourPrompt', () => {
  test('inclut le titre, la catégorie et le texte tels quels', () => {
    const formate = formaterDocumentNormatifPourPrompt({
      titre: 'ISO 9001',
      category: 'iso',
      extracted_text: 'Systèmes de management de la qualité.',
    })
    expect(formate).toContain('--- ISO 9001 (iso) ---')
    expect(formate).toContain('Systèmes de management de la qualité.')
  })

  test('tronque un extrait trop long avec un marqueur explicite, jamais silencieusement', () => {
    const texteLong = 'x'.repeat(5000)
    const formate = formaterDocumentNormatifPourPrompt({
      titre: 'Guide long',
      category: 'autre',
      extracted_text: texteLong,
    })
    expect(formate).toContain('[...texte tronqué...]')
    expect(formate).not.toContain('x'.repeat(5000))
    expect(formate).toContain('x'.repeat(4000))
  })
})

describe('blocDocumentsNormatifsPourPrompt', () => {
  test('chaîne vide sans document — simple ajout au prompt sans conditionnelle côté appelant', () => {
    expect(blocDocumentsNormatifsPourPrompt([])).toBe('')
  })

  test('assemble un bloc "Documents normatifs disponibles" avec chaque document', () => {
    const bloc = blocDocumentsNormatifsPourPrompt([
      { titre: 'ISO 9001', category: 'iso', extracted_text: 'Texte ISO.' },
      { titre: 'ASTM E2500', category: 'astm', extracted_text: 'Texte ASTM.' },
    ])
    expect(bloc).toContain('Documents normatifs disponibles')
    expect(bloc).toContain('--- ISO 9001 (iso) ---')
    expect(bloc).toContain('--- ASTM E2500 (astm) ---')
  })
})
