import type { Project } from '../domaine/types'

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
 * Droit d'écriture sur une section : exactement celui de son projet (admin,
 * propriétaire, partagé en édition). **(Audit du 25/09/2026)** Le partage
 * propre à la section n'élargit plus jamais ces droits — même règle que
 * `droitsSection` côté Worker, qui l'applique réellement.
 */
export function peutModifierSection(
  project: Pick<Project, 'owner_id' | 'shared_with'> | undefined,
  userId: string,
  estAdmin: boolean,
): boolean {
  if (estAdmin) return true
  return project !== undefined && peutModifierProjet(project, userId)
}

/**
 * Gérer le partage d'un projet (ajouter/retirer une personne) : réservé au
 * créateur et aux admins (décision utilisateur du 25/09/2026) — une
 * personne partagée en édition modifie le contenu, jamais les droits.
 * Même règle que `peutGererPartageProjet` côté Worker.
 */
export function peutGererPartageProjet(
  project: Pick<Project, 'owner_id'>,
  userId: string,
  estAdmin: boolean,
): boolean {
  return estAdmin || project.owner_id === userId
}
