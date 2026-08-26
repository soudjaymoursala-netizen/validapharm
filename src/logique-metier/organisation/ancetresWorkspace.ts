import type { Workspace } from '../domaine/types'

/**
 * Remonte l'arbre `Workspace` depuis `workspaceId` vers la racine
 * (`global`) via `parent_workspace_id`, et retourne la liste des id
 * traversés (lui-même inclus, dans l'ordre du plus spécifique au plus
 * général). Garde anti-cycle : un id déjà visité arrête la remontée
 * plutôt que de boucler indéfiniment.
 *
 * Extrait de `resoudreRegleEffective` (Phase 11) pour être réutilisé par
 * tout consommateur ayant besoin de la même remontée d'arbre sans
 * dupliquer la logique — voir `CABLAGE_ETAPE_1_STRUCTURE_SYSTEME_SPEC.md`.
 */
export function ancetresWorkspace(
  workspaceId: string,
  arbre: ReadonlyMap<string, Pick<Workspace, 'id' | 'parent_workspace_id'>>,
): string[] {
  const chemin: string[] = []
  const visites = new Set<string>()
  let courant: string | null = workspaceId

  while (courant !== null) {
    if (visites.has(courant)) break
    visites.add(courant)
    chemin.push(courant)
    courant = arbre.get(courant)?.parent_workspace_id ?? null
  }

  return chemin
}
