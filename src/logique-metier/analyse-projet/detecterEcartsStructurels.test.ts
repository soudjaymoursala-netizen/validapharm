import { describe, expect, test } from 'vitest'
import { detecterEcartsStructurels } from './detecterEcartsStructurels'

const lienEntre = (a: string, b: string) => ({
  from_section_id: a,
  to_section_id: b,
  created_by: 'user-1',
  created_at: '2026-01-01T00:00:00.000Z',
})

describe('detecterEcartsStructurels — section URS isolée', () => {
  test('signale une section urs sans aucun lien', () => {
    const sections = [{ id: 's-urs-1', template_type: 'urs' as const }]
    const ecarts = detecterEcartsStructurels(sections, [])
    expect(ecarts).toEqual([
      expect.objectContaining({ code: 'section_urs_isolee', sectionId: 's-urs-1' }),
    ])
  })

  test('ne signale rien pour une section urs liée en tant que "from"', () => {
    const sections = [
      { id: 's-urs-1', template_type: 'urs' as const },
      { id: 's-oq-1', template_type: 'oq' as const },
    ]
    const ecarts = detecterEcartsStructurels(sections, [lienEntre('s-urs-1', 's-oq-1')])
    expect(ecarts).toEqual([])
  })

  test('ne signale rien pour une section urs liée en tant que "to" (le sens du lien ne compte pas)', () => {
    const sections = [
      { id: 's-urs-1', template_type: 'urs' as const },
      { id: 's-oq-1', template_type: 'oq' as const },
    ]
    const ecarts = detecterEcartsStructurels(sections, [lienEntre('s-oq-1', 's-urs-1')])
    expect(ecarts).toEqual([])
  })

  test('ne signale jamais une section d’un autre gabarit, même isolée', () => {
    const sections = [{ id: 's-oq-1', template_type: 'oq' as const }]
    const ecarts = detecterEcartsStructurels(sections, [])
    expect(ecarts).toEqual([])
  })

  test('signale chaque section urs isolée indépendamment (plusieurs constats possibles)', () => {
    const sections = [
      { id: 's-urs-1', template_type: 'urs' as const },
      { id: 's-urs-2', template_type: 'urs' as const },
    ]
    const ecarts = detecterEcartsStructurels(sections, [])
    expect(ecarts.map((e) => e.sectionId).sort()).toEqual(['s-urs-1', 's-urs-2'])
  })

  test('le message ne contient jamais un verdict tranché ("conforme"/"non conforme")', () => {
    const sections = [{ id: 's-urs-1', template_type: 'urs' as const }]
    const [ecart] = detecterEcartsStructurels(sections, [])
    expect(ecart?.message.toLowerCase()).not.toMatch(/non conforme|est conforme/)
    expect(ecart?.message).toContain('Constat')
  })
})
