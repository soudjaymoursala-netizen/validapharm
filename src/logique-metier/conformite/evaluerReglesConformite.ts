/**
 * Compliance Engine généralisé — extrait le patron commun déjà utilisé
 * indépendamment à 3 endroits du dépôt (règle de trois) :
 * `verifierBlocageExport.ts` (export de section), `gardesFinalisation.ts`
 * (garde-fous U-01/U-02/U-03), et `gelerContentPlan` (garde `readiness`).
 * Les trois évaluaient
 * chacun, à leur façon, "un ensemble de règles contre un contexte, retourne
 * les règles bloquantes" — jamais factorisé jusqu'ici (`VISION_NORTH_STAR_
 * CONVERGENCE.md` §3, couche 14 : "un seul statut vérifié — à généraliser").
 *
 * **Refactor pur** : ce module ne définit ni n'invente aucune nouvelle
 * règle métier — les 3 consommateurs existants gardent exactement leur
 * comportement, leur API publique et leurs tests déjà validés inchangés,
 * seule la mécanique d'évaluation interne est désormais partagée.
 *
 * @requirement `VISION_NORTH_STAR_CONVERGENCE.md` §3 (couche 14, Compliance Engine)
 */
export interface RegleConformite<TContexte, TCode extends string = string> {
  code: TCode
  bloque: (contexte: TContexte) => boolean
  message: string
}

/**
 * Évalue un ensemble de règles de conformité contre un contexte donné et
 * retourne, dans l'ordre de déclaration, celles qui bloquent — jamais un
 * court-circuit au premier trouvé : plusieurs règles indépendantes peuvent
 * s'appliquer simultanément au même contexte (ex. U-01 et U-02 à l'entrée
 * en vérification d'une même section IQ).
 */
export function evaluerReglesConformite<TContexte, TCode extends string = string>(
  contexte: TContexte,
  regles: readonly RegleConformite<TContexte, TCode>[],
): RegleConformite<TContexte, TCode>[] {
  return regles.filter((regle) => regle.bloque(contexte))
}
