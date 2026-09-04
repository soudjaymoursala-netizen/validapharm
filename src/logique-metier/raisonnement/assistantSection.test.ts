import { describe, expect, test } from 'vitest'
import { construireObjectifAssistantSection } from './assistantSection'

const SECTION_MINIMALE = {
  id: 'section-1',
  template_type: 'urs' as const,
  meta: { ref: 'URS-001', titre: 'Exigences utilisateur', version: '1' },
  values: { objectif: 'Réduire le temps de cycle', vide: '', absent: null },
}

describe('construireObjectifAssistantSection (Phase 38, TD-045)', () => {
  test('inclut l’identité de la section et la question', () => {
    const objectif = construireObjectifAssistantSection(SECTION_MINIMALE, 'Que manque-t-il ?')
    expect(objectif).toContain('section-1')
    expect(objectif).toContain('urs')
    expect(objectif).toContain('Exigences utilisateur')
    expect(objectif).toContain('Que manque-t-il ?')
  })

  test('inclut les valeurs non vides, jamais les valeurs vides ou nulles', () => {
    const objectif = construireObjectifAssistantSection(SECTION_MINIMALE, 'Question')
    expect(objectif).toContain('objectif : Réduire le temps de cycle')
    expect(objectif).not.toContain('vide :')
    expect(objectif).not.toContain('absent :')
  })

  test('signale explicitement une section sans aucune valeur, jamais une supposition', () => {
    const objectif = construireObjectifAssistantSection(
      { ...SECTION_MINIMALE, values: {} },
      'Question',
    )
    expect(objectif).toContain('aucune valeur saisie')
  })
})
