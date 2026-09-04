import { describe, expect, test } from 'vitest'
import { construirePromptAuditSimule } from './construirePromptAuditSimule'

describe('construirePromptAuditSimule', () => {
  test('aucune persona -> seul le débat multi-angles est demandé, jamais une persona par défaut', () => {
    const prompt = construirePromptAuditSimule({
      question: 'La section IQ est-elle prête pour approbation ?',
      personas: [],
    })
    expect(prompt).toContain('DÉBAT CONTRADICTOIRE MULTI-ANGLES')
    expect(prompt).toContain('fonctionnel, réglementaire, sécurité, qualité')
    expect(prompt).not.toContain('SIMULATION DE PERSONA')
    expect(prompt).toContain('La section IQ est-elle prête pour approbation ?')
  })

  test('le rappel de non-opposabilité est toujours présent', () => {
    const prompt = construirePromptAuditSimule({ question: 'Question', personas: [] })
    expect(prompt).toContain('ne constitue en aucun cas un audit réglementaire réel')
  })

  test('une persona sélectionnée -> section de simulation ajoutée en complément, pas à la place du débat', () => {
    const prompt = construirePromptAuditSimule({
      question: 'Question',
      personas: ['swissmedic'],
    })
    expect(prompt).toContain('DÉBAT CONTRADICTOIRE MULTI-ANGLES')
    expect(prompt).toContain('SIMULATION DE PERSONA')
    expect(prompt).toContain('Swissmedic (inspection GxP — systèmes informatisés)')
    expect(prompt).toContain('Majeur')
    expect(prompt).toContain('Mineur')
    expect(prompt).toContain('Observation')
  })

  test('plusieurs personas sélectionnées -> toutes listées', () => {
    const prompt = construirePromptAuditSimule({
      question: 'Question',
      personas: ['swissmedic', 'fda', 'cabinet_conseil_gxp', 'qa_specialisee'],
    })
    expect(prompt).toContain('Swissmedic (inspection GxP — systèmes informatisés)')
    expect(prompt).toContain('FDA')
    expect(prompt).toContain('Cabinet de conseil GxP')
    expect(prompt).toContain('QA spécialisée')
  })

  test('la question est toujours reproduite intégralement, jamais résumée ni altérée', () => {
    const question = 'Une question précise avec des « guillemets » et un saut\nde ligne.'
    const prompt = construirePromptAuditSimule({ question, personas: [] })
    expect(prompt.endsWith(question)).toBe(true)
  })
})
