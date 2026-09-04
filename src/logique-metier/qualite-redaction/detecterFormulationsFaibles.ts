/**
 * Détection de formulations faibles/vagues dans un texte rédigé (inspiré de
 * l'outil "Strong Editor" — souligner en temps réel les tournures qui
 * affaiblissent un texte). Jamais un verdict de conformité : uniquement un
 * signal informatif pour le rédacteur, avant relecture humaine — même
 * discipline que `detecterEcartsStructurels` (aucune fonction de ce module
 * ne bloque quoi que ce soit).
 */

export interface FormulationFaibleDetectee {
  motif: string
  extrait: string
  position: number
  suggestion: string
}

interface PatternFormulationFaible {
  regex: RegExp
  motif: string
  suggestion: string
}

const PATTERNS: readonly PatternFormulationFaible[] = [
  {
    regex: /\bdevrai(?:en)?t\b/giu,
    motif: 'Obligation faible ("devrait")',
    suggestion:
      "Préférer « doit » pour une exigence contraignante, ou indiquer explicitement que c'est une recommandation.",
  },
  {
    regex: /\b(généralement|habituellement|normalement|la plupart du temps)\b/giu,
    motif: 'Généralisation non quantifiée',
    suggestion: "Préciser la condition exacte ou la fréquence, plutôt qu'une tendance générale.",
  },
  {
    regex: /\betc\.?/giu,
    motif: 'Liste non exhaustive ("etc.")',
    suggestion:
      'Énumérer explicitement tous les éléments visés — une liste ouverte est ambiguë en contexte réglementaire.',
  },
  {
    regex: /\bsi (nécessaire|besoin)\b/giu,
    motif: 'Condition non définie ("si nécessaire"/"si besoin")',
    suggestion: "Préciser le critère concret qui déclenche l'action.",
  },
  {
    regex: /\bde manière appropriée\b/giu,
    motif: 'Responsabilité vague ("de manière appropriée")',
    suggestion:
      'Décrire concrètement ce qui est attendu plutôt que de renvoyer au jugement du lecteur.',
  },
  {
    regex: /\ble cas échéant\b/giu,
    motif: 'Condition implicite ("le cas échéant")',
    suggestion: 'Préciser explicitement le cas visé.',
  },
] as const

export function detecterFormulationsFaibles(texte: string): FormulationFaibleDetectee[] {
  if (!texte) return []
  const resultats: FormulationFaibleDetectee[] = []
  for (const pattern of PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags)
    let correspondance: RegExpExecArray | null
    while ((correspondance = regex.exec(texte)) !== null) {
      resultats.push({
        motif: pattern.motif,
        extrait: correspondance[0],
        position: correspondance.index,
        suggestion: pattern.suggestion,
      })
      if (correspondance[0].length === 0) regex.lastIndex += 1
    }
  }
  return resultats.sort((a, b) => a.position - b.position)
}

export interface FormulationFaibleParChamp {
  champ: string
  formulations: FormulationFaibleDetectee[]
}

/**
 * Balaie l'ensemble des valeurs textuelles d'une section (champs scalaires
 * `values` + cellules de tableau dynamique `tables`) — mêmes structures que
 * `Section.values`/`Section.tables` (`domaine/types.ts`), passées ici sans
 * dépendre du type `Section` complet pour rester réutilisable (ex. sur un
 * brouillon en cours d'édition non encore persisté).
 */
export function detecterFormulationsFaiblesSection(
  values: Record<string, string | number | null>,
  tables: Record<string, Array<Record<string, string | number | null>>>,
): FormulationFaibleParChamp[] {
  const resultats: FormulationFaibleParChamp[] = []

  for (const [champ, valeur] of Object.entries(values)) {
    if (typeof valeur !== 'string') continue
    const formulations = detecterFormulationsFaibles(valeur)
    if (formulations.length > 0) resultats.push({ champ, formulations })
  }

  for (const [nomTableau, lignes] of Object.entries(tables)) {
    lignes.forEach((ligne, index) => {
      for (const [colonne, valeur] of Object.entries(ligne)) {
        if (typeof valeur !== 'string') continue
        const formulations = detecterFormulationsFaibles(valeur)
        if (formulations.length > 0) {
          resultats.push({ champ: `${nomTableau}[${index + 1}].${colonne}`, formulations })
        }
      }
    })
  }

  return resultats
}
