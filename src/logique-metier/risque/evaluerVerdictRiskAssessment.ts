import type { ResultatIPR } from '../moteur-calcul/calculerIPR'
import type { VerdictRiskAssessment } from '../domaine/types'

/**
 * Moteur de décision Risk Assessment / AMDEC — compare un IPR déjà
 * calculé (`calculerIPR`, KEEP) au seuil d'action configuré par client
 * (`MethodProfileRiskAssessment.seuil_action`).
 *
 * Fonction pure déterministe — jamais déléguée à l'IA générative, même
 * discipline que `calculerIPR`/`evaluerVerdictImpactAssessment`. Un IPR non
 * calculé (valeurs incomplètes ou hors plage) ne produit jamais un verdict
 * deviné — `null` explicite, jamais `'acceptable'` par défaut.
 *
 * @requirement Target Architecture §10, ICH Q9
 */
export function evaluerVerdictRiskAssessment(
  resultatIPR: ResultatIPR,
  seuilAction: number,
): VerdictRiskAssessment | null {
  if (!resultatIPR.calcule) return null
  return resultatIPR.valeur >= seuilAction ? 'action_requise' : 'acceptable'
}
