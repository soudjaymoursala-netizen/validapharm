import { describe, expect, test } from 'vitest'
import { evaluerVerdictACFC, methodeCompletementRepondue } from './evaluerVerdictACFC'
import type { QuestionACFC } from '../domaine/types'

const questions: QuestionACFC[] = [
  { id: 'q1', texte: { fr: 'Le système a-t-il un contact direct avec le produit ?' } },
  { id: 'q2', texte: { fr: 'Le système participe-t-il à une décision de conformité ?' } },
  { id: 'q3', texte: { fr: 'Une défaillance du système pose-t-elle un risque au patient ?' } },
]

describe('evaluerVerdictACFC — règle "au moins un oui"', () => {
  test('aucun oui -> non_critique', () => {
    const reponses = { q1: 'non', q2: 'non', q3: 'non' } as const
    expect(evaluerVerdictACFC(questions, reponses, 'au_moins_un_oui_critique')).toBe('non_critique')
  })

  test('un seul oui parmi plusieurs -> critique (jamais moyenné)', () => {
    const reponses = { q1: 'non', q2: 'oui', q3: 'non' } as const
    expect(evaluerVerdictACFC(questions, reponses, 'au_moins_un_oui_critique')).toBe('critique')
  })

  test('tous oui -> critique', () => {
    const reponses = { q1: 'oui', q2: 'oui', q3: 'oui' } as const
    expect(evaluerVerdictACFC(questions, reponses, 'au_moins_un_oui_critique')).toBe('critique')
  })

  test('inconnu et sans_objet ne comptent jamais comme un oui', () => {
    const reponses = { q1: 'inconnu', q2: 'sans_objet', q3: 'non' } as const
    expect(evaluerVerdictACFC(questions, reponses, 'au_moins_un_oui_critique')).toBe('non_critique')
  })

  test('méthode à 1 seule question (cas réel Sanofi Lyon-Gerland : 4 questions, ici réduit à 1 pour le test unitaire)', () => {
    const uneQuestion: QuestionACFC[] = [{ id: 'q1', texte: { fr: 'Question unique ?' } }]
    expect(evaluerVerdictACFC(uneQuestion, { q1: 'oui' }, 'au_moins_un_oui_critique')).toBe(
      'critique',
    )
  })

  test('méthode à N questions (10, cas réel Sanofi Marcy) : un seul oui en position 10 suffit', () => {
    const dixQuestions: QuestionACFC[] = Array.from({ length: 10 }, (_, i) => ({
      id: `q${i + 1}`,
      texte: { fr: `Question ${i + 1}` },
    }))
    const reponses = Object.fromEntries(
      dixQuestions.map((q, i) => [q.id, i === 9 ? 'oui' : 'non']),
    ) as Record<string, 'oui' | 'non'>
    expect(evaluerVerdictACFC(dixQuestions, reponses, 'au_moins_un_oui_critique')).toBe('critique')
  })
})

describe('methodeCompletementRepondue', () => {
  test('toutes les questions répondues -> true', () => {
    expect(methodeCompletementRepondue(questions, { q1: 'oui', q2: 'non', q3: 'inconnu' })).toBe(
      true,
    )
  })

  test('une question sans réponse -> false', () => {
    expect(methodeCompletementRepondue(questions, { q1: 'oui', q2: 'non' })).toBe(false)
  })

  test('aucune question répondue -> false', () => {
    expect(methodeCompletementRepondue(questions, {})).toBe(false)
  })
})
