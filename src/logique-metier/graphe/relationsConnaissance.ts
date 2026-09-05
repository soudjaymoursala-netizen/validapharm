import type { KnowledgeItem, KnowledgeRelation } from '../domaine/types'
import { parcourirGraphe } from './parcourirGraphe'

/** Une relation résolue vers le `KnowledgeItem` cible qu'elle atteint. */
export interface EtapeRelationsConnaissance {
  relation: KnowledgeRelation
  item: KnowledgeItem
}

/**
 * Parcours en largeur des `KnowledgeRelation` *sortantes* depuis un
 * `KnowledgeItem` de départ — second consommateur réel
 * du parcours générique `parcourirGraphe`, aux côtés de
 * `chaineTechniqueDepuis`. Même forme `{ id, type, source_id,
 * cible_id }` que `RelationTechnique`, jamais fusionnée en un type unique
 * (les deux graphes portent sur des domaines distincts — actifs techniques
 * vs faits de connaissance — jamais mélangés).
 *
 * Fonction pure — aucun accès base, réutilisable par l'outil
 * `tracer_relations_connaissance` du Reasoning Engine.
 */
export function relationsConnaissanceDepuis(
  knowledgeItemDepartId: string,
  relations: readonly KnowledgeRelation[],
  items: readonly KnowledgeItem[],
): EtapeRelationsConnaissance[] {
  return parcourirGraphe(
    knowledgeItemDepartId,
    relations,
    items,
    (r) => r.knowledge_item_source_id,
    (r) => r.knowledge_item_cible_id,
  ).map((etape) => ({ relation: etape.arete, item: etape.noeud }))
}
