import type { AssetNode } from '../domaine/types'

/**
 * Unicité du code d'un nœud au sein du référentiel de son client
 * (mitige AR-R-53) — "rejet explicite en cas de
 * doublon". Exclut le nœud lui-même lors d'une modification (identifié
 * par `nodeIdExclu`), pour ne pas rejeter un nœud dont le code n'a pas
 * changé.
 */
export function codeDejaUtilise(
  nodesDuClient: readonly Pick<AssetNode, 'id' | 'code'>[],
  code: string,
  nodeIdExclu: string | null,
): boolean {
  return nodesDuClient.some((n) => n.id !== nodeIdExclu && n.code === code)
}
