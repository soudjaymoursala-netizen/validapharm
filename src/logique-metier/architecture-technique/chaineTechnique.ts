import type { AssetNode, RelationTechnique } from '../domaine/types'

/** Une relation résolue vers le nœud cible qu'elle atteint. */
export interface EtapeChaineTechnique {
  relation: RelationTechnique
  noeud: AssetNode
}

/**
 * Parcours en largeur des relations *sortantes* depuis un `AssetNode` de
 * départ (Phase 18, `PHASE_18_ARCHITECTURE_TECHNIQUE_SPEC.md` §3) —
 * répond à "quel PLC contrôle cet équipement, quel SCADA le supervise,
 * quel serveur l'héberge" en une seule traversée, dans l'ordre de
 * découverte.
 *
 * Aucune détection de cycle (TD-013) : même tolérance documentée
 * qu'`AssetNode.associated_nodes[]` ("graphe libre, cycles acceptés") —
 * un `visites` défensif évite seulement une boucle infinie d'exécution,
 * il ne rejette jamais une relation valide.
 *
 * Fonction pure — aucun accès base, réutilisable par un futur écran et
 * par l'outil `tracer_chaine_technique` du Reasoning Engine (Phase 15).
 */
export function chaineTechniqueDepuis(
  noeudDepartId: string,
  relations: readonly RelationTechnique[],
  noeuds: readonly AssetNode[],
): EtapeChaineTechnique[] {
  const parId = new Map(noeuds.map((n) => [n.id, n]))
  const resultat: EtapeChaineTechnique[] = []
  const visites = new Set<string>([noeudDepartId])
  let frontiere = [noeudDepartId]

  while (frontiere.length > 0) {
    const suivante: string[] = []
    for (const id of frontiere) {
      const relationsSortantes = relations.filter((r) => r.noeud_source_id === id)
      for (const relation of relationsSortantes) {
        if (visites.has(relation.noeud_cible_id)) continue
        const noeud = parId.get(relation.noeud_cible_id)
        if (!noeud) continue
        resultat.push({ relation, noeud })
        visites.add(relation.noeud_cible_id)
        suivante.push(relation.noeud_cible_id)
      }
    }
    frontiere = suivante
  }

  return resultat
}
