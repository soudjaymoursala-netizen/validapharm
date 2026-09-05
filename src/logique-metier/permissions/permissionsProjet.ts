import type { Project } from '../domaine/types'

/**
 * Contrôle d'affichage du partage de projet (Authentification
 * multi-utilisateur) — jamais une frontière de sécurité réelle :
 * le dépôt Git sous-jacent reste accessible dans son ensemble à qui
 * détient le jeton du client. Cette fonction ne pilote que l'affichage
 * des contrôles d'édition dans l'interface, exactement comme
 * `Section.owner_id`/`shared_with` (jamais câblés jusqu'ici
 * faute d'identité résolue).
 *
 * Lecture toujours ouverte (vision de l'utilisateur : "lecture pour tous,
 * écriture pour le créateur + les partagés") — cette fonction ne
 * détermine que le droit d'écriture, jamais le droit de lecture.
 *
 * @requirement Partage de projet multi-utilisateur
 */
export function peutModifierProjet(
  project: Pick<Project, 'owner_id' | 'shared_with'>,
  userId: string,
): boolean {
  if (project.owner_id === userId) return true
  return project.shared_with.some(
    (partage) => partage.user_id === userId && partage.access_level === 'édition',
  )
}
