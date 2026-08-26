import { describe, expect, test } from 'vitest'
import { auMoinsUneReponseOui, questionsCompletementRepondues } from './moteurQuestionsOuiNon'

describe('auMoinsUneReponseOui', () => {
  test('un seul "oui" parmi plusieurs réponses -> true', () => {
    expect(auMoinsUneReponseOui(['q1', 'q2', 'q3'], { q1: 'non', q2: 'oui', q3: 'non' })).toBe(true)
  })

  test('aucun "oui" -> false', () => {
    expect(auMoinsUneReponseOui(['q1', 'q2'], { q1: 'non', q2: 'inconnu' })).toBe(false)
  })

  test('"inconnu" et "sans_objet" ne comptent jamais comme un "oui"', () => {
    expect(auMoinsUneReponseOui(['q1', 'q2'], { q1: 'inconnu', q2: 'sans_objet' })).toBe(false)
  })

  test('aucune question -> false (pas de "oui" possible)', () => {
    expect(auMoinsUneReponseOui([], {})).toBe(false)
  })
})

describe('questionsCompletementRepondues', () => {
  test('toutes les questions répondues, y compris inconnu/sans_objet -> true', () => {
    expect(
      questionsCompletementRepondues(['q1', 'q2', 'q3'], {
        q1: 'oui',
        q2: 'inconnu',
        q3: 'sans_objet',
      }),
    ).toBe(true)
  })

  test('une question sans réponse -> false', () => {
    expect(questionsCompletementRepondues(['q1', 'q2'], { q1: 'oui' })).toBe(false)
  })
})
