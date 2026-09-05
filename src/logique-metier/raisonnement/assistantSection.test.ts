import { describe, expect, test } from 'vitest'
import { construireObjectifAssistantSection } from './assistantSection'

const SECTION_MINIMALE = {
  id: 'section-1',
  template_type: 'urs' as const,
  meta: { ref: 'URS-001', titre: 'Exigences utilisateur', version: '1' },
  values: { objectif: 'Réduire le temps de cycle', vide: '', absent: null },
}

describe('construireObjectifAssistantSection', () => {
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

  test('sans document normatif : aucun bloc "Documents normatifs disponibles"', () => {
    const objectif = construireObjectifAssistantSection(SECTION_MINIMALE, 'Question')
    expect(objectif).not.toContain('Documents normatifs disponibles')
  })

  test('injecte les documents normatifs fournis, tels quels', () => {
    const objectif = construireObjectifAssistantSection(SECTION_MINIMALE, 'Question', [
      { titre: 'ICH Q9', category: 'norme', extracted_text: 'Gestion du risque qualité.' },
    ])
    expect(objectif).toContain('Documents normatifs disponibles')
    expect(objectif).toContain('--- ICH Q9 (norme) ---')
    expect(objectif).toContain('Gestion du risque qualité.')
  })

  test('tronque un extrait trop long avec un marqueur explicite, jamais silencieusement', () => {
    const texteLong = 'x'.repeat(5000)
    const objectif = construireObjectifAssistantSection(SECTION_MINIMALE, 'Question', [
      { titre: 'Guide long', category: 'guideline', extracted_text: texteLong },
    ])
    expect(objectif).toContain('[...texte tronqué...]')
    expect(objectif).not.toContain('x'.repeat(5000))
    expect(objectif).toContain('x'.repeat(4000))
  })
})
