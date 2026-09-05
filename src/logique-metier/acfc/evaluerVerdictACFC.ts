import type { MethodProfileACFC, QuestionACFC, ReponseQuestionACFC } from '../domaine/types'
import {
  auMoinsUneReponseOui,
  questionsCompletementRepondues,
} from '../assessment/moteurQuestionsOuiNon'

/**
 * Moteur de décision ACFC (remplace `grilleCriticite.ts`).
 *
 * Une seule règle de décision est confirmée sur source réelle à ce jour
 * (Ferring, Sanofi Marcy, Sanofi Lyon-Gerland, ISPE Baseline Guide — 4
 * sources indépendantes, session du 24-25/08/2026) : **au moins une
 * réponse "oui" parmi les questions de la méthode → l'élément est
 * critique**, jamais moyennée ni pondérée. `sans_objet`/`inconnu` ne
 * comptent jamais comme un "oui".
 *
 * **(25/08/2026)** Délègue au moteur générique
 * `assessment/moteurQuestionsOuiNon.ts`, extrait une fois confirmé que le
 * même mécanisme s'applique aussi à l'Impact Assessment (F1) — voir
 * `evaluerVerdictImpactAssessment.ts`. Comportement et signature publique
 * inchangés.
 *
 * @requirement F2, Analyse de risque
 */
export function evaluerVerdictACFC(
  questions: readonly QuestionACFC[],
  reponses: Readonly<Record<string, ReponseQuestionACFC>>,
  decisionRule: MethodProfileACFC['decision_rule'],
): 'critique' | 'non_critique' {
  switch (decisionRule) {
    case 'au_moins_un_oui_critique':
      return auMoinsUneReponseOui(
        questions.map((q) => q.id),
        reponses,
      )
        ? 'critique'
        : 'non_critique'
  }
}

/** Une méthode est complète si chaque question a reçu une réponse (y compris `inconnu`/`sans_objet`). */
export function methodeCompletementRepondue(
  questions: readonly QuestionACFC[],
  reponses: Readonly<Record<string, ReponseQuestionACFC>>,
): boolean {
  return questionsCompletementRepondues(
    questions.map((q) => q.id),
    reponses,
  )
}
