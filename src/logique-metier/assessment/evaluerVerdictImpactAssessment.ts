import type { MethodProfileImpactAssessment, QuestionImpactAssessment } from '../domaine/types'
import {
  auMoinsUneReponseOui,
  questionsCompletementRepondues,
  type ReponseQuestionOuiNon,
} from './moteurQuestionsOuiNon'

/**
 * Moteur de décision Impact Assessment / System Classification (F1 du
 * catalogue §10, URS-F-050 — Phase 3 de convergence architecturale).
 *
 * Règle confirmée sur 2 sources réelles indépendantes (Ferring FSMP Project
 * Master Plan, ISPE Baseline Guide "System Classification", session du
 * 24-25/08/2026) : **au moins une réponse "oui" parmi les questions de la
 * méthode → le système est Direct Impact**, jamais pondérée. Modèle
 * strictement binaire (Direct/Not Direct Impact) — l'ISPE Baseline Guide
 * 2ᵉ édition retire explicitement la notion "Indirect Impact" (ternaire) de
 * sa 1ʳᵉ édition.
 *
 * @requirement URS-F-050 (F1, Impact Assessment / System Classification)
 */
export function evaluerVerdictImpactAssessment(
  questions: readonly QuestionImpactAssessment[],
  reponses: Readonly<Record<string, ReponseQuestionOuiNon>>,
  decisionRule: MethodProfileImpactAssessment['decision_rule'],
): 'impact_direct' | 'non_impact_direct' {
  switch (decisionRule) {
    case 'au_moins_un_oui_impact_direct':
      return auMoinsUneReponseOui(
        questions.map((q) => q.id),
        reponses,
      )
        ? 'impact_direct'
        : 'non_impact_direct'
  }
}

export function methodeCompletementRepondue(
  questions: readonly QuestionImpactAssessment[],
  reponses: Readonly<Record<string, ReponseQuestionOuiNon>>,
): boolean {
  return questionsCompletementRepondues(
    questions.map((q) => q.id),
    reponses,
  )
}
