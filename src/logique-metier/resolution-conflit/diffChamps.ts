export interface ChampDivergent {
  champ: string
  valeurLocale: unknown
  valeurDistante: unknown
}

/**
 * Compare deux versions d'un même enregistrement (locale/distante) champ
 * par champ et retourne les champs dont la valeur diffère réellement.
 *
 * @requirement Mitigation du risque de fusion non explicite lors d'un conflit
 *
 * Comparaison structurelle (`JSON.stringify`), suffisante ici : les
 * enregistrements comparés sont déjà des objets JSON-safe (c'est leur
 * forme de sérialisation vers GitHub) — jamais de fonctions, de
 * `Date`, de `Map`/`Set` à comparer.
 *
 * Certains champs sont exclus par construction (`champsIgnores`) : ceux
 * qui divergent *toujours* entre deux copies indépendantes sans que ce
 * soit un conflit de contenu réel (ex. `updated_at`, `audit_log`,
 * `revisions` — ces champs eux-mêmes enregistrent l'historique, ils n'ont
 * pas vocation à être "résolus" comme une valeur métier).
 */
export function diffChamps<T extends object>(
  local: T,
  distant: T,
  champsIgnores: readonly string[] = [],
): ChampDivergent[] {
  const localIndexe = local as Record<string, unknown>
  const distantIndexe = distant as Record<string, unknown>
  const cles = new Set([...Object.keys(localIndexe), ...Object.keys(distantIndexe)])
  const divergences: ChampDivergent[] = []

  for (const champ of cles) {
    if (champsIgnores.includes(champ)) continue
    const valeurLocale = localIndexe[champ]
    const valeurDistante = distantIndexe[champ]
    if (JSON.stringify(valeurLocale) !== JSON.stringify(valeurDistante)) {
      divergences.push({ champ, valeurLocale, valeurDistante })
    }
  }

  return divergences
}

export type ChoixResolutionChamp =
  | { champ: string; choix: 'locale' }
  | { champ: string; choix: 'distante' }
  | { champ: string; choix: 'manuelle'; valeur: unknown }

/**
 * Applique les décisions de résolution (une par champ divergent) et
 * produit l'enregistrement fusionné. Part de la version **distante**
 * (l'état réellement en vigueur sur la source de vérité au moment de la
 * résolution : "réécrit avec le SHA distant à jour") puis
 * superpose chaque champ pour lequel une décision différente a été prise
 * — jamais de fusion textuelle brute, jamais un champ non explicitement
 * tranché qui garderait silencieusement l'ancienne valeur locale.
 */
export function appliquerResolutions<T extends object>(
  local: T,
  distant: T,
  choix: readonly ChoixResolutionChamp[],
): T {
  const localIndexe = local as Record<string, unknown>
  const resultat = { ...distant } as Record<string, unknown>
  for (const decision of choix) {
    if (decision.choix === 'locale') {
      resultat[decision.champ] = localIndexe[decision.champ]
    } else if (decision.choix === 'manuelle') {
      resultat[decision.champ] = decision.valeur
    }
    // 'distante' : déjà la valeur de base, rien à faire.
  }
  return resultat as T
}

/**
 * Construit le motif de révision structuré exigé par la spec : capture,
 * pour chaque champ en conflit, la décision retenue — jamais un texte
 * générique type "résolution de conflit".
 */
export function construireMotifResolution(choix: readonly ChoixResolutionChamp[]): string {
  const parties = choix.map((decision) => {
    if (decision.choix === 'manuelle') return `${decision.champ}: valeur fusionnée manuellement`
    return `${decision.champ}: version ${decision.choix}`
  })
  return `Résolution de conflit — ${parties.join(' ; ')}`
}
