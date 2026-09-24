import type { Activity, Dependency } from '../domaine/types'
import { parcourirGraphe } from './parcourirGraphe'

export type RaisonDependanceInvalide = 'auto_dependance' | 'cycle_introduit'

/**
 * « A dépend de B » n'exprime qu'un ordre attendu (jamais un verrou), mais
 * un ordre contradictoire n'a aucun sens : une activité ne peut dépendre
 * d'elle-même, ni de B si B dépend déjà — directement ou non — de A.
 */
export function dependanceInvalide(
  activites: readonly Pick<Activity, 'id'>[],
  dependances: readonly Pick<Dependency, 'activity_source_id' | 'activity_cible_id'>[],
  sourceId: string,
  cibleId: string,
): RaisonDependanceInvalide | null {
  if (sourceId === cibleId) return 'auto_dependance'
  const atteignablesDepuisCible = parcourirGraphe(
    cibleId,
    dependances,
    activites,
    (d) => d.activity_source_id,
    (d) => d.activity_cible_id,
  )
  return atteignablesDepuisCible.some((etape) => etape.noeud.id === sourceId)
    ? 'cycle_introduit'
    : null
}
