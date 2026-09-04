import type { AssetNode } from '../domaine/types'

/**
 * Détection de cycle sur le lien hiérarchique `parent_id` (FS §3) —
 * l'arbre du référentiel d'actifs ne doit jamais
 * contenir de cycle, contrairement à `associated_nodes[]` (graphe libre,
 * cycles acceptés, ex. une utilité desservant plusieurs systèmes).
 *
 * @requirement revalidation au reparentage
 * "avec la même rigueur qu'à la création"
 *
 * Remonte la chaîne des parents depuis `nouveauParentId` : si `nodeId` y
 * apparaît (ou si `nouveauParentId === nodeId`, un nœud ne peut être son
 * propre parent), la modification introduirait un cycle.
 */
export function introduitUnCycle(
  nodes: readonly Pick<AssetNode, 'id' | 'parent_id'>[],
  nodeId: string,
  nouveauParentId: string | null,
): boolean {
  if (nouveauParentId === null) return false
  if (nouveauParentId === nodeId) return true

  const parentParId = new Map(nodes.map((n) => [n.id, n.parent_id]))
  const visites = new Set<string>()
  let courant: string | null = nouveauParentId
  while (courant !== null) {
    if (courant === nodeId) return true
    if (visites.has(courant)) return false // cycle préexistant ailleurs, pas introduit par cette modification
    visites.add(courant)
    courant = parentParId.get(courant) ?? null
  }
  return false
}
