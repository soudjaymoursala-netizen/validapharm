import type { MethodProfileACFC, QuestionACFC, ReponseQuestionACFC } from '../domaine/types'

/**
 * Moteur de décision ACFC (FS §4.6bis, remplace `grilleCriticite.ts` —
 * `docs/convergence/TECHNICAL_DECISIONS.md` TD-002).
 *
 * Une seule règle de décision est confirmée sur source réelle à ce jour
 * (Ferring, Sanofi Marcy, Sanofi Lyon-Gerland, ISPE Baseline Guide — 4
 * sources indépendantes, session du 24-25/08/2026) : **au moins une
 * réponse "oui" parmi les questions de la méthode → l'élément est
 * critique**, jamais moyennée ni pondérée. `sans_objet`/`inconnu` ne
 * comptent jamais comme un "oui".
 *
 * @requirement URS-F-050 (F2, Analyse de risque)
 */
export function evaluerVerdictACFC(
  questions: readonly QuestionACFC[],
  reponses: Readonly<Record<string, ReponseQuestionACFC>>,
  decisionRule: MethodProfileACFC['decision_rule'],
): 'critique' | 'non_critique' {
  switch (decisionRule) {
    case 'au_moins_un_oui_critique':
      return questions.some((q) => reponses[q.id] === 'oui') ? 'critique' : 'non_critique'
  }
}

/** Une méthode est complète si chaque question a reçu une réponse (y compris `inconnu`/`sans_objet`). */
export function methodeCompletementRepondue(
  questions: readonly QuestionACFC[],
  reponses: Readonly<Record<string, ReponseQuestionACFC>>,
): boolean {
  return questions.every((q) => reponses[q.id] !== undefined)
}
