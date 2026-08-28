/**
 * Knowledge Graph générique (Phase 31 de convergence architecturale,
 * TD-029) — extrait le parcours en largeur déjà construit et testé pour
 * l'Architecture Technique (`chaineTechniqueDepuis`, Phase 18) en un
 * utilitaire réutilisable pour tout ensemble d'arêtes typées reliant deux
 * nœuds par id (`{ id }`), quel que soit le nom réel de leurs champs
 * source/cible — jamais figé sur `noeud_source_id`/`noeud_cible_id`
 * (`RelationTechnique`) ni sur `knowledge_item_source_id`/
 * `knowledge_item_cible_id` (`KnowledgeRelation`), qui n'ont jamais eu la
 * même forme littérale malgré une sémantique identique.
 *
 * **Deuxième cas réel démontré avant généralisation** (`VISION_NORTH_STAR_
 * CONVERGENCE.md` §3, couche 5 : "jointures typées ad hoc... pas de graphe
 * générique interrogeable") — `relationsConnaissance.ts` (ce même dossier)
 * en est le second consommateur, aux côtés de `chaineTechnique.ts`
 * (refactoré, comportement identique).
 *
 * @requirement `VISION_NORTH_STAR_CONVERGENCE.md` §3 (couche 5, Knowledge Graph)
 */
export interface EtapeParcoursGraphe<TArete, TNoeud> {
  arete: TArete
  noeud: TNoeud
}

/**
 * Parcours en largeur des arêtes *sortantes* depuis un nœud de départ.
 * Aucune détection de cycle (même tolérance que `chaineTechniqueDepuis`,
 * TD-013) : un `visites` défensif évite seulement une boucle infinie
 * d'exécution, il ne rejette jamais une arête valide.
 */
export function parcourirGraphe<TArete, TNoeud extends { id: string }>(
  noeudDepartId: string,
  aretes: readonly TArete[],
  noeuds: readonly TNoeud[],
  idSource: (arete: TArete) => string,
  idCible: (arete: TArete) => string,
): EtapeParcoursGraphe<TArete, TNoeud>[] {
  const parId = new Map(noeuds.map((n) => [n.id, n]))
  const resultat: EtapeParcoursGraphe<TArete, TNoeud>[] = []
  const visites = new Set<string>([noeudDepartId])
  let frontiere = [noeudDepartId]

  while (frontiere.length > 0) {
    const suivante: string[] = []
    for (const id of frontiere) {
      const aretesSortantes = aretes.filter((a) => idSource(a) === id)
      for (const arete of aretesSortantes) {
        const cible = idCible(arete)
        if (visites.has(cible)) continue
        const noeud = parId.get(cible)
        if (!noeud) continue
        resultat.push({ arete, noeud })
        visites.add(cible)
        suivante.push(cible)
      }
    }
    frontiere = suivante
  }

  return resultat
}
