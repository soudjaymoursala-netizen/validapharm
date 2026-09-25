import type { EvaluationACFC, EvaluationImpactAssessment } from '../../logique-metier/domaine/types'

/**
 * Absence de verdict d'un questionnaire Oui/Non/Inconnu (décision utilisateur
 * du 25/09/2026) : sans aucun « Oui », une réponse « Inconnu » empêche de
 * conclure. Affiché tel quel, jamais remplacé par un verdict par défaut.
 */
export const LIBELLE_VERDICT_A_COMPLETER = 'À compléter — réponse « Inconnu » à lever'

export function libelleVerdictImpact(verdict: EvaluationImpactAssessment['verdict']): string {
  if (verdict === null) return LIBELLE_VERDICT_A_COMPLETER
  return verdict === 'impact_direct' ? 'Direct Impact' : 'Not Direct Impact'
}

export function libelleVerdictAcfc(verdict: EvaluationACFC['verdict']): string {
  if (verdict === null) return LIBELLE_VERDICT_A_COMPLETER
  return verdict === 'critique' ? 'Critique' : 'Non critique'
}
