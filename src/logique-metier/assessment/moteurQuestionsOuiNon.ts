/**
 * Moteur de décision générique "questionnaire Oui/Non/Inconnu/Sans objet,
 * au moins un Oui → verdict positif".
 *
 * Extrait du moteur ACFC (`logique-metier/acfc/evaluerVerdictACFC.ts`)
 * une fois confirmé que **le même mécanisme** s'applique aussi à
 * l'Impact Assessment (F1, URS §10) — confirmé sur les mêmes sources
 * réelles (Ferring FSMP, ISPE Baseline Guide "System Classification") :
 * questions définies par le client, conservées mot pour mot, "au moins un
 * Oui" → verdict positif (critique pour l'ACFC, Direct Impact pour
 * l'Impact Assessment). Ce n'est PAS une règle universelle pour tout
 * `Assessment` futur (le Computer System Assessment, F3, suit un mécanisme
 * différent — sélection de catégorie GAMP5, pas un questionnaire Oui/Non) :
 * ce module ne prétend couvrir que ce mécanisme précis, pas "l'Assessment"
 * en général.
 */
export type ReponseQuestionOuiNon = 'oui' | 'non' | 'inconnu' | 'sans_objet'

export function auMoinsUneReponseOui(
  questionIds: readonly string[],
  reponses: Readonly<Record<string, ReponseQuestionOuiNon>>,
): boolean {
  return questionIds.some((id) => reponses[id] === 'oui')
}

/** Un questionnaire est complet si chaque question a reçu une réponse (y compris `inconnu`/`sans_objet`). */
export function questionsCompletementRepondues(
  questionIds: readonly string[],
  reponses: Readonly<Record<string, ReponseQuestionOuiNon>>,
): boolean {
  return questionIds.every((id) => reponses[id] !== undefined)
}
