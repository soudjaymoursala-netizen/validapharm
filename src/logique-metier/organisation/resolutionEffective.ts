import type { Workspace } from '../domaine/types'

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
 * (`global`) via `parent_workspace_id`, et retourne la première règle
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
  const visites = new Set<string>()
  let courant: string | null = workspaceId

  while (courant !== null) {
    if (visites.has(courant)) return null // cycle inattendu dans l'arbre — pas de règle résolvable
    visites.add(courant)

    if (reglesParWorkspace.has(courant)) {
      return { valeur: reglesParWorkspace.get(courant) as T, workspaceIdOrigine: courant }
    }

    courant = arbre.get(courant)?.parent_workspace_id ?? null
  }

  return null
}
