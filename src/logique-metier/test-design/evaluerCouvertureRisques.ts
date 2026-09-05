import type { Requirement, RiskAssessment, TestCandidate } from '../domaine/types'

/**
 * Détection déterministe des risques non couverts par un candidat de test
 * (Test Design Engine) — un `RiskAssessment` dont le
 * verdict est `action_requise` mais qui n'a aucun candidat de test associé
 * (dans un statut non écarté) est un gap réel, jamais silencieux. Même
 * discipline que `construireReadinessContentPlan` : un statut explicite
 * plutôt qu'une déduction optimiste.
 *
 * Un candidat `rejete`/`doublon`/`remplace` ne compte jamais comme une
 * couverture — seul un candidat encore actif (`propose`, `besoin_*`,
 * `accepte`) ou déjà transformé en `Test` démontre une intention réelle de
 * test.
 *
 * @requirement Test Design Engine — évaluation de couverture des risques
 */
export type StatutCouvertureRisque = 'couvert' | 'non_couvert'

export interface CouvertureRisque {
  risk_assessment_id: string
  mode_defaillance: string
  statut: StatutCouvertureRisque
}

const STATUTS_NE_COMPTANT_JAMAIS_COMME_COUVERTURE = new Set(['rejete', 'doublon', 'remplace'])

export function evaluerCouvertureRisques(
  requirement: Pick<Requirement, 'asset_node_id'>,
  risquesDuClient: readonly RiskAssessment[],
  candidatsDuClient: readonly Pick<TestCandidate, 'risk_assessment_id' | 'statut'>[],
): CouvertureRisque[] {
  if (requirement.asset_node_id === null) return []

  const risqueIdsCouverts = new Set(
    candidatsDuClient
      .filter((c) => !STATUTS_NE_COMPTANT_JAMAIS_COMME_COUVERTURE.has(c.statut))
      .map((c) => c.risk_assessment_id)
      .filter((id): id is string => id !== null),
  )

  return risquesDuClient
    .filter((risque) => risque.asset_node_id === requirement.asset_node_id)
    .filter(
      (risque) =>
        risque.verdict_initial === 'action_requise' || risque.verdict_residuel === 'action_requise',
    )
    .map((risque) => ({
      risk_assessment_id: risque.id,
      mode_defaillance: risque.mode_defaillance,
      statut: risqueIdsCouverts.has(risque.id) ? 'couvert' : 'non_couvert',
    }))
}
