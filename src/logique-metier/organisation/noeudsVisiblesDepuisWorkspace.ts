import type { AssetNode, Workspace } from '../domaine/types'
import { ancetresWorkspace } from './ancetresWorkspace'

/**
 * Câblage Workspace, étape 1 (`CABLAGE_ETAPE_1_STRUCTURE_SYSTEME_SPEC.md`
 * §E1/E7) : un nœud est visible depuis `workspaceId` s'il y est assigné,
 * s'il est assigné à l'un de ses ancêtres (héritage descendant), ou s'il
 * n'a pas encore été assigné (`workspace_id: null`, non-régression).
 *
 * Extrait de `useStructureSystemeStore` (Phase 14, `PHASE_14_CONTEXT_
 * ENGINE_SPEC.md`) pour être réutilisé par l'assemblage de `ContextSnapshot`
 * sans dupliquer la logique — même traitement que l'extraction
 * d'`ancetresWorkspace` en Phase 12.
 */
export function noeudsVisiblesDepuisWorkspace(
  workspaceId: string,
  arbre: ReadonlyMap<string, Pick<Workspace, 'id' | 'parent_workspace_id'>>,
  noeuds: readonly AssetNode[],
): AssetNode[] {
  const ancetres = new Set(ancetresWorkspace(workspaceId, arbre))
  return noeuds.filter((n) => n.workspace_id === null || ancetres.has(n.workspace_id))
}
