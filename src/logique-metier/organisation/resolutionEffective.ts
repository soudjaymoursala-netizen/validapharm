import type { Workspace } from '../domaine/types'
import { ancetresWorkspace } from './ancetresWorkspace'

export interface RegleEffective<T> {
  valeur: T
  workspaceIdOrigine: string
}

/**
 * Résolution de configuration effective (Phase 11, `01_ARCHITECTURE_
 * MASTER_FINAL.md` §3 : `Scope + Applicability + Effectivity +
 * Inheritance/Override`, DEC-061).
 *
 * Remonte l'arbre `Workspace` depuis `workspaceId` vers la racine
 * (`global`) via `ancetresWorkspace`, et retourne la première règle
 * trouvée dans `reglesParWorkspace` — un `Workspace` avec sa propre règle
 * la voit toujours prévaloir sur celle héritée (override explicite,
 * puisqu'elle est rencontrée avant tout ancêtre). `workspaceIdOrigine`
 * trace toujours d'où vient la règle retenue — jamais une valeur sans
 * provenance (garde-fou non négociable, spec §3).
 *
 * Retourne `null` si aucune règle n'est trouvée jusqu'à la racine
 * (y compris à la racine elle-même) — jamais une erreur, un `Workspace`
 * sans règle propre hérite silencieusement.
 */
export function resoudreRegleEffective<T>(
  workspaceId: string,
  reglesParWorkspace: ReadonlyMap<string, T>,
  arbre: ReadonlyMap<string, Pick<Workspace, 'id' | 'parent_workspace_id'>>,
): RegleEffective<T> | null {
  for (const id of ancetresWorkspace(workspaceId, arbre)) {
    if (reglesParWorkspace.has(id)) {
      return { valeur: reglesParWorkspace.get(id) as T, workspaceIdOrigine: id }
    }
  }
  return null
}
