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
 * Calcul déterministe de `ContentPlan.readiness` — jusqu'ici toujours
 * fourni à la main par l'appelant à la création (commentaire du type
 * domaine : "Fourni explicitement par l'appelant à la
 * création, jamais calculé automatiquement... pas de mécanisme
 * d'évaluation de complétude construit ici").
 *
 * Résout la chaîne déjà réelle et testée `Requirement → Couverture → Test
 * → Execution → Evidence` ancrée sur `ContentPlan.
 * asset_node_id` — même patron de résolution que l'outil du Reasoning
 * Engine `lister_requirements_pour_actif`. Ne résout rien de
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

/**
 * Dernière exécution clôturée (`statut === 'terminee'`), ordonnée par
 * `date_fin`, puis `created_at`, puis `id` — ordre total, donc résultat
 * déterministe même à horodatage égal.
 */
export function derniereExecutionCloturee(executions: readonly Execution[]): Execution | undefined {
  const cle = (e: Execution) => [e.date_fin ?? '', e.created_at, e.id] as const
  let derniere: Execution | undefined
  for (const e of executions) {
    if (e.statut !== 'terminee') continue
    if (!derniere) {
      derniere = e
      continue
    }
    const [a, b] = [cle(e), cle(derniere)]
    const plusRecente = a[0] !== b[0] ? a[0] > b[0] : a[1] !== b[1] ? a[1] > b[1] : a[2] > b[2]
    if (plusRecente) derniere = e
  }
  return derniere
}

function evaluerTest(test: Test, donnees: DonneesReadinessContentPlan): ReadinessContentPlan {
  if (test.statut === 'brouillon') return 'besoin_revue'

  // Exécutions de ce test sur CET équipement : une exécution rattachée
  // explicitement à un autre nœud est ignorée ; sans nœud, elle compte.
  const executionsDuTest = donnees.executions.filter(
    (e) =>
      e.test_id === test.id &&
      (e.asset_node_id === null || e.asset_node_id === donnees.assetNodeId),
  )
  if (executionsDuTest.length === 0) return 'besoin_information'

  let resultat: ReadinessContentPlan = executionsDuTest.some((e) => e.statut !== 'terminee')
    ? 'besoin_information'
    : 'pret'
  // Décision utilisateur du 25/09/2026 : seule la dernière exécution
  // clôturée compte — un échec antérieur reste tracé mais ne bloque plus si
  // le retest est conforme et prouvé.
  const derniere = derniereExecutionCloturee(executionsDuTest)
  if (derniere) resultat = pire(resultat, evaluerExecutionCloturee(derniere, donnees))
  return resultat
}

function evaluerExecutionCloturee(
  execution: Execution,
  donnees: DonneesReadinessContentPlan,
): ReadinessContentPlan {
  if (execution.verdict === 'non_conforme') return 'bloque'

  const aDeLaPreuve = donnees.evidences.some((ev) => ev.execution_id === execution.id)
  if (!aDeLaPreuve) return 'besoin_revue'

  return 'pret'
}
