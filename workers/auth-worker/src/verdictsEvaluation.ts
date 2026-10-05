/**
 * Recalcul serveur des verdicts d'évaluation (audit d'intégrité du
 * 25/09/2026, M5) — auparavant le Worker enregistrait tel quel le verdict
 * calculé par le navigateur : un poste modifié, un bug front ou un appel
 * direct pouvait enregistrer « non critique » avec une réponse « oui ».
 *
 * Portage côté serveur (même discipline que les autres règles du Worker,
 * jamais un import du front) de :
 * - `logique-metier/assessment/moteurQuestionsOuiNon.ts`
 *   (`conclusionQuestionnaireOuiNon`) ;
 * - `logique-metier/acfc/evaluerVerdictACFC.ts` et
 *   `logique-metier/assessment/evaluerVerdictImpactAssessment.ts` ;
 * - `logique-metier/moteur-calcul/calculerIPR.ts` et
 *   `logique-metier/risque/evaluerVerdictRiskAssessment.ts`.
 * `verdictsEvaluation.parite.test.ts` (côté front) vérifie que les deux
 * versions donnent le même résultat.
 */

export const REPONSES_QUESTIONNAIRE = ['oui', 'non', 'inconnu', 'sans_objet'] as const
export type ReponseQuestionnaire = (typeof REPONSES_QUESTIONNAIRE)[number]

/**
 * Au moins un `oui` → positif ; sinon une question sans réponse ou
 * `inconnu` → pas de verdict (`null`) ; sinon négatif. Un questionnaire sans
 * aucune question ne conclut jamais (audit m4 : il donnait « non critique »).
 */
export function conclusionQuestionnaire(
  questionIds: readonly string[],
  reponses: Readonly<Record<string, string>>,
): 'positif' | 'negatif' | null {
  if (questionIds.length === 0) return null
  if (questionIds.some((id) => reponses[id] === 'oui')) return 'positif'
  const indetermine = questionIds.some(
    (id) => reponses[id] === undefined || reponses[id] === 'inconnu',
  )
  return indetermine ? null : 'negatif'
}

/**
 * Réponses d'un questionnaire acceptables pour cette méthode : chaque clé
 * est une question de la méthode, chaque valeur une réponse connue.
 */
export function reponsesValides(questionIds: readonly string[], reponses: unknown): boolean {
  if (!reponses || typeof reponses !== 'object' || Array.isArray(reponses)) return false
  const connues = new Set(questionIds)
  return Object.entries(reponses as Record<string, unknown>).every(
    ([id, valeur]) =>
      connues.has(id) &&
      typeof valeur === 'string' &&
      (REPONSES_QUESTIONNAIRE as readonly string[]).includes(valeur),
  )
}

export function verdictAcfc(
  questionIds: readonly string[],
  reponses: Readonly<Record<string, string>>,
  regle: string,
): 'critique' | 'non_critique' | null {
  if (regle !== 'au_moins_un_oui_critique') return null
  const conclusion = conclusionQuestionnaire(questionIds, reponses)
  if (conclusion === null) return null
  return conclusion === 'positif' ? 'critique' : 'non_critique'
}

/**
 * Grille de décision de la stratégie de qualification — copie serveur de
 * `logique-metier/strategie-qualification/grilleDecision.ts` (test de
 * parité). Toute combinaison non couverte donne `autre`, jamais une
 * conclusion devinée.
 */
export const VERSION_GRILLE_STRATEGIE = '0.2.0-provisoire'
export const COMPLEXITES = ['catalogue', 'specifique'] as const
const GRILLE_STRATEGIE: Record<string, string> = {
  non_critique_catalogue: 'revue_documentaire',
  non_critique_specifique: 'fat',
  critique_catalogue: 'iq_oq',
  critique_specifique: 'iq_oq_pq',
}

export function conclusionStrategie(
  verdict: 'critique' | 'non_critique' | null,
  complexite: string | null,
): string | null {
  if (verdict === null || complexite === null) return null
  return GRILLE_STRATEGIE[`${verdict}_${complexite}`] ?? 'autre'
}

export function verdictImpact(
  questionIds: readonly string[],
  reponses: Readonly<Record<string, string>>,
  regle: string,
): 'impact_direct' | 'non_impact_direct' | null {
  if (regle !== 'au_moins_un_oui_impact_direct') return null
  const conclusion = conclusionQuestionnaire(questionIds, reponses)
  if (conclusion === null) return null
  return conclusion === 'positif' ? 'impact_direct' : 'non_impact_direct'
}

/**
 * IPR = S × O × D ; `null` si une note manque ou sort de l'échelle (entiers
 * seulement — audit m5 : `NaN` et 2,5 passaient), jamais une valeur bornée
 * en silence.
 */
export function calculerIpr(
  severite: number | null,
  occurrence: number | null,
  detectabilite: number | null,
  echelle: { min: number; max: number },
): number | null {
  if (severite === null || occurrence === null || detectabilite === null) return null
  const horsEchelle = (n: number) => !Number.isInteger(n) || n < echelle.min || n > echelle.max
  if (horsEchelle(severite) || horsEchelle(occurrence) || horsEchelle(detectabilite)) return null
  return severite * occurrence * detectabilite
}

export function verdictRisque(
  ipr: number | null,
  seuilAction: number | null,
): 'acceptable' | 'action_requise' | null {
  if (ipr === null || seuilAction === null) return null
  return ipr >= seuilAction ? 'action_requise' : 'acceptable'
}

/**
 * Bornes d'une méthode AMDEC (audit M10) : entiers, échelle commençant à
 * 1 au moins, seuil atteignable et non trivial
 * (`echelleMin³ < seuil ≤ echelleMax³`) — un seuil de 200 sur une échelle
 * 1-5 (IPR maximal 125) rendait toute ligne « acceptable ».
 */
export function refusBornesAmdec(
  echelleMin: number,
  echelleMax: number,
  seuilAction: number,
): string | null {
  if (![echelleMin, echelleMax, seuilAction].every(Number.isInteger)) return 'valeurs_non_entieres'
  if (echelleMin < 1) return 'echelle_min_invalide'
  if (echelleMax <= echelleMin) return 'echelle_invalide'
  if (seuilAction <= echelleMin ** 3 || seuilAction > echelleMax ** 3) return 'seuil_hors_bornes'
  return null
}

/**
 * Numéro de version suivant d'une méthode (audit M7) : attribué par le
 * serveur à partir des versions existantes (`vN`), jamais par le
 * navigateur — qui calculait `v${profils.length + 1}` sur une liste
 * parfois vide après un chargement en échec, d'où deux « v1 ».
 */
export function versionSuivante(versionsExistantes: readonly string[]): string {
  let max = 0
  for (const v of versionsExistantes) {
    const correspondance = /^v(\d+)$/.exec(v)
    if (correspondance) max = Math.max(max, Number(correspondance[1]))
  }
  return `v${Math.max(max, versionsExistantes.length) + 1}`
}
