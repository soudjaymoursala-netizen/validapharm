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
 * Lecture toujours ouverte pour qui a accès au projet (vision de
 * l'utilisateur : "lecture pour tous les accès, écriture pour le
 * créateur + les partagés") — cette fonction ne détermine que le droit
 * d'écriture ; voir `peutVoirProjet` ci-dessous pour l'accès en lecture
 * lui-même.
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

/**
 * Contrôle de visibilité d'un projet pour un compte non-admin : visible
 * si propriétaire (`owner_id`) ou explicitement partagé (`shared_with`,
 * quel que soit le niveau d'accès). Un compte admin n'est jamais soumis
 * à cette fonction (voir `useProjectsStore.chargerProjets`/
 * `obtenirProjet`) — il continue de tout voir, sans régression pour les
 * comptes déjà existants.
 *
 * Reste, comme `peutModifierProjet`, une convention côté client : le
 * dépôt Git synchronisé n'est pas lui-même partitionné par utilisateur.
 */
export function peutVoirProjet(
  project: Pick<Project, 'owner_id' | 'shared_with'>,
  userId: string,
): boolean {
  if (project.owner_id === userId) return true
  return project.shared_with.some((partage) => partage.user_id === userId)
}
