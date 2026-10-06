import { describe, expect, test } from 'vitest'
import {
  COMPLEXITES,
  conclusionStrategie,
  VERSION_GRILLE_STRATEGIE,
  calculerIpr,
  refusBornesAmdec,
  verdictAcfc,
  verdictImpact,
  verdictRisque,
} from '../../../workers/auth-worker/src/verdictsEvaluation'
import { evaluerVerdictACFC } from '../acfc/evaluerVerdictACFC'
import {
  VERSION_GRILLE_STRATEGIE_QUALIFICATION,
  determinerConclusion,
} from '../strategie-qualification/grilleDecision'
import { calculerIPR } from '../moteur-calcul/calculerIPR'
import { messageBornesAmdec } from '../risque/bornesMethodeAmdec'
import { evaluerVerdictRiskAssessment } from '../risque/evaluerVerdictRiskAssessment'
import type { ReponseQuestionOuiNon } from './moteurQuestionsOuiNon'
import { evaluerVerdictImpactAssessment } from './evaluerVerdictImpactAssessment'

/**
 * Le Worker recalcule les verdicts (audit M5) avec sa propre copie des
 * règles : ce test garantit que le navigateur et le serveur concluent
 * toujours la même chose — sinon chaque enregistrement serait refusé
 * (`verdict_incoherent`).
 */
const REPONSES: ReponseQuestionOuiNon[] = ['oui', 'non', 'inconnu', 'sans_objet']

function combinaisons(n: number): Record<string, ReponseQuestionOuiNon | undefined>[] {
  if (n === 0) return [{}]
  const suite = combinaisons(n - 1)
  const resultat: Record<string, ReponseQuestionOuiNon | undefined>[] = []
  for (const r of [...REPONSES, undefined]) {
    for (const s of suite) resultat.push({ ...s, [`q${n}`]: r })
  }
  return resultat
}

function sansVides(r: Record<string, ReponseQuestionOuiNon | undefined>) {
  return Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined)) as Record<
    string,
    ReponseQuestionOuiNon
  >
}

describe('parité navigateur / serveur des verdicts', () => {
  test('ACFC et Impact : toutes les combinaisons de 0 à 3 questions', () => {
    for (let n = 0; n <= 3; n++) {
      const questions = Array.from({ length: n }, (_, i) => ({
        id: `q${i + 1}`,
        texte: { fr: `Question ${i + 1}` },
      }))
      const ids = questions.map((q) => q.id)
      for (const brutes of combinaisons(n)) {
        const reponses = sansVides(brutes)
        expect(verdictAcfc(ids, reponses, 'au_moins_un_oui_critique')).toBe(
          evaluerVerdictACFC(questions, reponses, 'au_moins_un_oui_critique'),
        )
        expect(verdictImpact(ids, reponses, 'au_moins_un_oui_impact_direct')).toBe(
          evaluerVerdictImpactAssessment(questions, reponses, 'au_moins_un_oui_impact_direct'),
        )
      }
    }
  })

  test('AMDEC : IPR et verdict identiques, notes absentes, hors échelle ou non entières comprises', () => {
    const notes = [null, 0, 1, 2, 2.5, 5, 6, Number.NaN]
    const echelle = { min: 1, max: 5 }
    for (const s of notes)
      for (const o of notes)
        for (const d of notes) {
          const front = calculerIPR(s, o, d, echelle)
          const serveur = calculerIpr(s, o, d, echelle)
          expect(serveur).toBe(front.calcule ? front.valeur : null)
          expect(verdictRisque(serveur, 50)).toBe(evaluerVerdictRiskAssessment(front, 50))
        }
  })

  test('bornes de méthode AMDEC : même décision des deux côtés', () => {
    for (const [min, max, seuil] of [
      [1, 5, 50],
      [1, 5, 200],
      [0, 5, 50],
      [5, 5, 50],
      [1, 10, 1000],
      [1, 5, 1],
      [1, 5, 2.5],
    ] as const) {
      expect(refusBornesAmdec(min, max, seuil) === null).toBe(
        messageBornesAmdec(min, max, seuil) === null,
      )
    }
  })
})

describe('parité front/Worker — conclusion de stratégie ACFC', () => {
  test('même grille, même version, toutes les combinaisons', () => {
    expect(VERSION_GRILLE_STRATEGIE).toBe(VERSION_GRILLE_STRATEGIE_QUALIFICATION)
    for (const verdict of ['critique', 'non_critique'] as const) {
      for (const complexite of COMPLEXITES) {
        expect(conclusionStrategie(verdict, complexite)).toBe(
          determinerConclusion(verdict, complexite),
        )
      }
      expect(conclusionStrategie(verdict, null)).toBeNull()
    }
    expect(conclusionStrategie(null, 'catalogue')).toBeNull()
  })
})
