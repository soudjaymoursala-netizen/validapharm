import type {
  Couverture,
  Evidence,
  Execution,
  QualityEvent,
  ReadinessContentPlan,
  Requirement,
  Test,
} from '../domaine/types'

/**
 * Calcul déterministe de `ContentPlan.readiness` (Phase 28 de convergence
 * architecturale, TD-026) — jusqu'ici toujours fourni à la main par
 * l'appelant à la création (`docs/convergence/PHASE_9_CONTENT_PLAN_SPEC.md`,
 * commentaire du type domaine : "Fourni explicitement par l'appelant à la
 * création, jamais calculé automatiquement... pas de mécanisme
 * d'évaluation de complétude construit ici").
 *
 * Résout la chaîne déjà réelle et testée `Requirement → Couverture → Test
 * → Execution → Evidence` (Phases 7a/7b/7c) ancrée sur `ContentPlan.
 * asset_node_id` — même patron de résolution que l'outil du Reasoning
 * Engine `lister_requirements_pour_actif` (Phase 15). Ne résout rien de
 * nouveau, ne fabrique aucune donnée : `besoin_information` chaque fois
 * qu'un maillon de la chaîne manque, jamais un état plus favorable deviné.
 *
 * @requirement 01_ARCHITECTURE_MASTER_FINAL.md §26, 09_DELIVERABLE_ENGINE.md
 */
export interface DonneesReadinessContentPlan {
  assetNodeId: string | null
  requirements: readonly Requirement[]
  couvertures: readonly Couverture[]
  tests: readonly Test[]
  executions: readonly Execution[]
  evidences: readonly Evidence[]
  qualityEvents: readonly QualityEvent[]
}

/** Sévérité pour combiner plusieurs signaux (un par `Requirement`) — le pire l'emporte, jamais une moyenne ni le premier trouvé. */
const SEVERITE: Record<ReadinessContentPlan, number> = {
  bloque: 3,
  besoin_information: 2,
  besoin_revue: 1,
  pret: 0,
}

function pire(a: ReadinessContentPlan, b: ReadinessContentPlan): ReadinessContentPlan {
  return SEVERITE[b] > SEVERITE[a] ? b : a
}

export function construireReadinessContentPlan(
  donnees: DonneesReadinessContentPlan,
): ReadinessContentPlan {
  if (donnees.assetNodeId === null) return 'besoin_information'

  // Un événement qualité encore ouvert sur ce nœud précis est un problème
  // réel non résolu — bloque toujours, quel que soit l'état de la chaîne
  // de traçabilité par ailleurs.
  const evenementBloquant = donnees.qualityEvents.some(
    (e) => e.asset_node_id === donnees.assetNodeId && e.statut !== 'cloture',
  )
  if (evenementBloquant) return 'bloque'

  const requirementsPertinents = donnees.requirements.filter(
    (r) => r.asset_node_id === donnees.assetNodeId,
  )
  if (requirementsPertinents.length === 0) return 'besoin_information'

  let resultat: ReadinessContentPlan = 'pret'

  for (const requirement of requirementsPertinents) {
    resultat = pire(resultat, evaluerRequirement(requirement, donnees))
  }

  return resultat
}

function evaluerRequirement(
  requirement: Requirement,
  donnees: DonneesReadinessContentPlan,
): ReadinessContentPlan {
  const testIdsCouvrants = donnees.couvertures
    .filter((c) => c.requirement_id === requirement.id)
    .map((c) => c.test_id)
  if (testIdsCouvrants.length === 0) return 'besoin_revue'

  const testsCouvrants = donnees.tests.filter((t) => testIdsCouvrants.includes(t.id))

  let resultat: ReadinessContentPlan = 'pret'
  for (const test of testsCouvrants) {
    resultat = pire(resultat, evaluerTest(test, donnees))
  }
  return resultat
}

function evaluerTest(test: Test, donnees: DonneesReadinessContentPlan): ReadinessContentPlan {
  if (test.statut === 'brouillon') return 'besoin_revue'

  const executionsDuTest = donnees.executions.filter((e) => e.test_id === test.id)
  if (executionsDuTest.length === 0) return 'besoin_information'

  let resultat: ReadinessContentPlan = 'pret'
  for (const execution of executionsDuTest) {
    resultat = pire(resultat, evaluerExecution(execution, donnees))
  }
  return resultat
}

function evaluerExecution(
  execution: Execution,
  donnees: DonneesReadinessContentPlan,
): ReadinessContentPlan {
  if (execution.statut !== 'terminee') return 'besoin_information'
  if (execution.verdict === 'non_conforme') return 'bloque'

  const aDeLaPreuve = donnees.evidences.some((ev) => ev.execution_id === execution.id)
  if (!aDeLaPreuve) return 'besoin_revue'

  return 'pret'
}
