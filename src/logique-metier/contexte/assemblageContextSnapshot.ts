import type {
  AssetNode,
  ManufacturingContext,
  QualityEvent,
  TypeObjetContexte,
  Workspace,
} from '../domaine/types'
import { noeudsVisiblesDepuisWorkspace } from '../organisation/noeudsVisiblesDepuisWorkspace'

export interface ElementContextSnapshot {
  type_objet: TypeObjetContexte
  objet_id: string
}

export interface EntreesAssemblageContextSnapshot {
  workspaceId: string | null
  assetNodeId: string | null
  arbreWorkspace: ReadonlyMap<string, Pick<Workspace, 'id' | 'parent_workspace_id'>>
  assetNodes: readonly AssetNode[]
  manufacturingContexts: readonly ManufacturingContext[]
  qualityEvents: readonly QualityEvent[]
}

/**
 * Assemble les éléments de contexte pertinents pour une ancre donnée —
 * fonction pure, jamais d'accès direct à la base : l'appelant
 * (`useContextEngineStore`)
 * fournit les données déjà chargées.
 *
 * Si `assetNodeId` est fourni, résolution exacte sur ce nœud précis (pas
 * ses descendants) — cohérent avec `QualityEvent.asset_node_id`, une
 * référence exacte, jamais hiérarchique. Sinon, si `workspaceId` est
 * fourni, résolution par visibilité de site
 * (`noeudsVisiblesDepuisWorkspace`) — une ancre plus large (ex. tous les
 * actifs d'un site).
 * Si ni l'un ni l'autre n'est fourni, aucun élément n'est assemblé.
 *
 * Ne résout PAS la "méthode applicable" ni les "documents pertinents"
 * (voir spec §2/§3) — ni `MethodProfileACFC`/`MethodProfileImpactAssessment`
 * ni `Source` n'ont de rattachement `Workspace`/`AssetNode` à ce jour.
 */
export function assemblerElementsContextSnapshot(
  entrees: EntreesAssemblageContextSnapshot,
): ElementContextSnapshot[] {
  const {
    workspaceId,
    assetNodeId,
    arbreWorkspace,
    assetNodes,
    manufacturingContexts,
    qualityEvents,
  } = entrees

  const noeudsPertinents: readonly AssetNode[] = assetNodeId
    ? assetNodes.filter((n) => n.id === assetNodeId)
    : workspaceId
      ? noeudsVisiblesDepuisWorkspace(workspaceId, arbreWorkspace, assetNodes)
      : []

  const idsNoeudsPertinents = new Set(noeudsPertinents.map((n) => n.id))

  const elements: ElementContextSnapshot[] = noeudsPertinents.map((n) => ({
    type_objet: 'asset_node' as const,
    objet_id: n.id,
  }))

  for (const contexte of manufacturingContexts) {
    if (idsNoeudsPertinents.has(contexte.asset_node_id)) {
      elements.push({ type_objet: 'manufacturing_context', objet_id: contexte.id })
    }
  }

  for (const evenement of qualityEvents) {
    if (evenement.asset_node_id !== null && idsNoeudsPertinents.has(evenement.asset_node_id)) {
      elements.push({ type_objet: 'quality_event', objet_id: evenement.id })
    }
  }

  return elements
}
