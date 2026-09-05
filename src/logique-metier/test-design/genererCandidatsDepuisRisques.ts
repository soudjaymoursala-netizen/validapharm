import type { Requirement, RiskAssessment, TestCandidate } from '../domaine/types'

/**
 * Génération déterministe de candidats de test à partir des risques réels
 * du référentiel (Test Design Engine) — jamais un appel
 * IA, jamais un contenu fabriqué : chaque suggestion ne fait que
 * reformuler dans le vocabulaire "candidat de test" des champs déjà saisis
 * par l'utilisateur sur un `RiskAssessment` réel (même discipline que
 * `construireReadinessContentPlan`/`evaluerVerdictRiskAssessment` — une
 * fonction pure, jamais une approbation automatique).
 *
 * Grounding (`docs/couche-ia/METHODE_RAISONNEMENT_DISTILLATION.md` §4) :
 * "un risque sans aucune mesure de mitigation testée doit être
 * immédiatement signalé" — un `RiskAssessment` dont le verdict (initial ou
 * résiduel) est `action_requise` et qui n'a **aucun** candidat déjà associé
 * devient une suggestion. Le rappel méthodologique explicite (§4/§5 de la
 * même distillation) est ajouté au texte proposé : un test doit reproduire
 * la condition dangereuse, jamais se limiter à une vérification
 * d'affichage — mais reste un rappel générique, jamais un contenu de test
 * inventé à la place de l'utilisateur.
 *
 * Jointure `Requirement ↔ RiskAssessment` : aucun lien direct n'existe
 * dans le domaine (confirmé par audit, GAP.md §4) — la seule clé commune
 * réelle est `asset_node_id`, partagée par les deux entités. Un
 * `Requirement`/`RiskAssessment` sans `asset_node_id` ne peut être
 * rapproché d'aucun risque — retourne une liste vide, jamais une
 * supposition.
 *
 * @requirement Test Design Engine — génération de candidats depuis les risques
 */
export interface CandidatSuggereDepuisRisque {
  risk_assessment_id: string
  titre: string
  description: string
}

const RAPPEL_METHODOLOGIQUE =
  "Ce test doit reproduire la condition dangereuse et vérifier que le contrôle/l'action recommandée mitige réellement le risque — jamais se limiter à une vérification d'affichage ou d'état nominal (docs/couche-ia/METHODE_RAISONNEMENT_DISTILLATION.md §4/§5)."

function risqueNecessiteAction(risque: RiskAssessment): boolean {
  return risque.verdict_initial === 'action_requise' || risque.verdict_residuel === 'action_requise'
}

function construireDescription(risque: RiskAssessment): string {
  const lignes = [
    `Risque : ${risque.mode_defaillance} (cause : ${risque.cause_potentielle} ; effet : ${risque.effet_defaillance}).`,
    `Contrôle actuel déclaré : ${risque.controle_actuel || 'aucun'}.`,
  ]
  if (risque.recommandation) {
    lignes.push(`Action recommandée (AMDEC) : ${risque.recommandation}.`)
  }
  lignes.push(RAPPEL_METHODOLOGIQUE)
  return lignes.join('\n')
}

export function genererCandidatsDepuisRisques(
  requirement: Pick<Requirement, 'asset_node_id'>,
  risquesDuClient: readonly RiskAssessment[],
  candidatsExistants: readonly Pick<TestCandidate, 'risk_assessment_id'>[],
): CandidatSuggereDepuisRisque[] {
  if (requirement.asset_node_id === null) return []

  const risquesDejaCouverts = new Set(
    candidatsExistants.map((c) => c.risk_assessment_id).filter((id): id is string => id !== null),
  )

  return risquesDuClient
    .filter((risque) => risque.asset_node_id === requirement.asset_node_id)
    .filter(risqueNecessiteAction)
    .filter((risque) => !risquesDejaCouverts.has(risque.id))
    .map((risque) => ({
      risk_assessment_id: risque.id,
      titre: `Vérifier la maîtrise du risque — ${risque.mode_defaillance}`,
      description: construireDescription(risque),
    }))
}
