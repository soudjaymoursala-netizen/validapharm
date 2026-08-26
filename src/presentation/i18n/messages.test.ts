import { describe, expect, test } from 'vitest'
import { messageSysteme, messagesSysteme } from './messages'

describe('messagesSysteme — complétude', () => {
  test('chaque code dispose des trois langues fr/en/de, aucune chaîne vide', () => {
    for (const [code, traductions] of Object.entries(messagesSysteme)) {
      for (const langue of ['fr', 'en', 'de'] as const) {
        expect(traductions[langue], `${code} / ${langue}`).toBeTruthy()
      }
    }
  })
})

describe('messageSysteme', () => {
  test('retourne le texte français par défaut sans interpolation nécessaire', () => {
    expect(messageSysteme('U-01', 'fr')).toBe(
      'Cette section ne peut être finalisée sans lien vers une section Contexte procédé de ce projet.',
    )
  })

  test('retourne le texte dans la langue demandée', () => {
    expect(messageSysteme('U-03', 'en')).toContain('OQ section cannot be closed')
    expect(messageSysteme('U-02', 'de')).toContain('IQ-Abschnitt')
  })

  test('interpole les paramètres nommés', () => {
    const texte = messageSysteme('U-12', 'fr', { x: '1.2.0' })
    expect(texte).toContain('revenez à la version 1.2.0')
  })
})
