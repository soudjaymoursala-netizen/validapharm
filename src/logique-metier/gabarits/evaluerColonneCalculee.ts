import { calculerIPR } from '../moteur-calcul/calculerIPR'
import type { ColonneTableau, ChampNombre } from './definitionGabarit'

/**
 * Évalue la valeur d'une colonne calculée d'un tableau dynamique (FDS §5) —
 * jamais saisissable directement, toujours dérivée des autres colonnes de
 * la même ligne.
 *
 * @requirement FDS §5
 *
 * Une seule formule implémentée à ce stade (`ipr`) — c'est la seule
 * référencée par un gabarit réel du catalogue actuel (`dq`, tâche #12).
 * Ajouter une formule future (ex. MACO) suit le même principe que le
 * moteur de rendu de gabarit : un nouveau cas de ce `switch`, jamais une
 * réécriture des gabarits existants.
 *
 * `null` (jamais une erreur) si les entrées sont incomplètes ou hors
 * plage — reflète fidèlement `calculerIPR` (FDS §5 : "valeurs vides → IPR
 * non calculé, aucune erreur").
 *
 * Reçoit les définitions des **colonnes d'entrée** (`colonnesTable`), pas
 * seulement leurs clés : l'échelle S/O/D (FDS §5, ex. [1,5] ou [1,10])
 * appartient à *ces* colonnes, jamais à la colonne calculée elle-même —
 * confondre les deux était une erreur de conception détectée par test
 * avant tout câblage à l'écran (la colonne IPR a sa propre plage de
 * sortie, ex. [1,125], sans rapport avec la plage de saisie S/O/D).
 */
export function evaluerColonneCalculee(
  colonne: ChampNombre,
  colonnesTable: readonly ColonneTableau[],
  ligne: Record<string, string | number | null>,
): number | null {
  if (colonne.formule === undefined) return null

  if (colonne.formule.cle === 'ipr') {
    const [cleSeverite, cleOccurrence, cleDetectabilite] = colonne.formule.entrees
    const colonneSeverite = trouverColonneNombre(colonnesTable, cleSeverite)
    const colonneOccurrence = trouverColonneNombre(colonnesTable, cleOccurrence)
    const colonneDetectabilite = trouverColonneNombre(colonnesTable, cleDetectabilite)
    if (
      colonneSeverite === undefined ||
      colonneOccurrence === undefined ||
      colonneDetectabilite === undefined
    ) {
      return null
    }

    const lire = (cle: string): number | null => {
      const valeur = ligne[cle]
      return typeof valeur === 'number' ? valeur : null
    }
    const resultat = calculerIPR(
      lire(colonneSeverite.field_key),
      lire(colonneOccurrence.field_key),
      lire(colonneDetectabilite.field_key),
      { min: colonneSeverite.min, max: colonneSeverite.max },
    )
    return resultat.calcule ? resultat.valeur : null
  }

  return null
}

function trouverColonneNombre(
  colonnes: readonly ColonneTableau[],
  cle: string | undefined,
): ChampNombre | undefined {
  const colonne = colonnes.find((c) => c.field_key === cle)
  return colonne?.type === 'nombre' ? colonne : undefined
}
