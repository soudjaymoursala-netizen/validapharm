import { describe, expect, test } from 'vitest'
import { rendreMarkdown } from './rendreMarkdown'

describe('rendreMarkdown', () => {
  test('convertit un titre et un paragraphe', () => {
    const html = rendreMarkdown('# Titre\n\nUn paragraphe.')
    expect(html).toContain('<h1>Titre</h1>')
    expect(html).toContain('<p>Un paragraphe.</p>')
  })

  test('convertit un tableau GFM', () => {
    const html = rendreMarkdown('| A | B |\n|---|---|\n| 1 | 2 |')
    expect(html).toContain('<table>')
    expect(html).toContain('<td>1</td>')
    expect(html).toContain('<td>2</td>')
  })

  test('convertit une liste et du texte en gras', () => {
    const html = rendreMarkdown('- **Important** : premier point\n- second point')
    expect(html).toContain('<ul>')
    expect(html).toContain('<strong>Important</strong>')
  })

  test('un simple saut de ligne devient un <br> (breaks: true)', () => {
    const html = rendreMarkdown('ligne 1\nligne 2')
    expect(html).toContain('<br>')
  })

  test('assainit un script injecté — jamais exécuté tel quel', () => {
    const html = rendreMarkdown('texte <script>alert(1)</script> suite')
    expect(html).not.toContain('<script')
  })

  test('assainit un attribut onerror injecté', () => {
    const html = rendreMarkdown('<img src="x" onerror="alert(1)">')
    expect(html).not.toContain('onerror')
  })
})
