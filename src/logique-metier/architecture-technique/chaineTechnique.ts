import type { AssetNode, RelationTechnique } from '../domaine/types'
import { parcourirGraphe } from '../graphe/parcourirGraphe'

/** Une relation résolue vers le nœud cible qu'elle atteint. */
export interface EtapeChaineTechnique {
  relation: RelationTechnique
  noeud: AssetNode
}

/**
 * Parcours en largeur des relations *sortantes* depuis un `AssetNode` de
 * départ (spec §3) — répond à "quel PLC contrôle cet équipement, quel
 * SCADA le supervise, quel serveur l'héberge" en une seule traversée,
 * dans l'ordre de découverte.
 *
 * Aucune détection de cycle : même tolérance documentée
 * qu'`AssetNode.associated_nodes[]` ("graphe libre, cycles acceptés").
 *
 * Fonction pure — aucun accès base, réutilisable par un futur écran et
 * par l'outil `tracer_chaine_technique` du Reasoning Engine.
 *
 * Implémenté via le parcours générique
 * `parcourirGraphe` (Knowledge Graph) — comportement strictement
 * identique à avant ce refactor.
 */
export function chaineTechniqueDepuis(
  noeudDepartId: string,
  relations: readonly RelationTechnique[],
  noeuds: readonly AssetNode[],
): EtapeChaineTechnique[] {
  return parcourirGraphe(
    noeudDepartId,
    relations,
    noeuds,
    (r) => r.noeud_source_id,
    (r) => r.noeud_cible_id,
  ).map((etape) => ({ relation: etape.arete, noeud: etape.noeud }))
}
