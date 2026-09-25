import type { Project, Section } from '../domaine/types'

/**
 * Droit d'écriture sur un projet, côté interface. **(25/09/2026, décision
 * utilisateur « Protection réelle »)** Ce n'est plus une simple convention
 * d'affichage : le Worker applique la même règle et refuse (403) toute
 * écriture d'un projet, d'une section ou d'un document de projet à qui n'est
 * ni propriétaire, ni partagé en édition, ni admin. Cette fonction ne fait
 * que refléter ce droit dans l'interface (masquer/désactiver les contrôles).
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
 * Visibilité d'un projet pour un compte non-admin, du seul point de vue du
 * partage (`owner_id`/`shared_with`). Le Worker ouvre en plus la lecture à
 * quiconque a accès au client du projet (décision du 25/09/2026) — c'est
 * lui qui filtre réellement ce que chaque compte reçoit.
 */
export function peutVoirProjet(
  project: Pick<Project, 'owner_id' | 'shared_with'>,
  userId: string,
): boolean {
  if (project.owner_id === userId) return true
  return project.shared_with.some((partage) => partage.user_id === userId)
}

/**
 * Droit d'écriture sur une section : celui de son projet (admin,
 * propriétaire, partagé en édition), ou le partage propre à la section.
 * Même règle que `droitsSection` côté Worker, qui l'applique réellement.
 */
export function peutModifierSection(
  project: Pick<Project, 'owner_id' | 'shared_with'> | undefined,
  section: Pick<Section, 'owner_id' | 'shared_with'>,
  userId: string,
  estAdmin: boolean,
): boolean {
  if (estAdmin) return true
  if (project && peutModifierProjet(project, userId)) return true
  if (section.owner_id === userId) return true
  return section.shared_with.some(
    (partage) => partage.user_id === userId && partage.access_level === 'édition',
  )
}
