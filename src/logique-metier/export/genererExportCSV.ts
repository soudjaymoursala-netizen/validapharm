import type { ColonneTableau } from '../gabarits/definitionGabarit'
import type { Langue } from '../domaine/types'
import { evaluerColonneCalculee } from '../gabarits/evaluerColonneCalculee'
import { valeurLisible } from './valeursExport'

/** Marque d'ordre des octets UTF-8 : sans elle, Excel lit le fichier en Windows-1252 et casse les accents. */
const BOM_UTF8 = '\uFEFF'

/** Séparateur attendu par Excel réglé en français (la virgule y est le séparateur décimal). */
const SEPARATEUR = ';'

/**
 * Export CSV d'un tableau dynamique ("export CSV/XLSX
 * pour les tableaux dynamiques, ex. registre AMDEC").
 *
 * @requirement Export CSV de tableau dynamique
 *
 * CSV plutôt que XLSX binaire dans cet incrément : "CSV/XLSX" de l'URS
 * n'impose pas les deux formats, et CSV couvre sans perte l'usage
 * documenté (registre tabulaire) sans ajouter de dépendance tierce
 * (08-conventions-codage.md, principe de minimiser les dépendances
 * auditées) — un export XLSX binaire réel reste possible plus tard sans
 * changer ce module (backlog #26, si un vrai besoin apparaît).
 *
 * En-têtes = libellés des colonnes (pas les `field_key` techniques) —
 * un fichier destiné à un humain, pas une réimportation programmatique
 * (celle-ci passe par le JSON complet, `genererExportJSON.ts`).
 *
 * Format « Excel français » (décision du 29/09/2026) : séparateur `;`,
 * BOM UTF-8, valeurs de liste en toutes lettres, dates et nombres au
 * format de la langue du livrable — ouvert tel quel par un double clic.
 */
export function genererExportCSV(
  colonnes: readonly ColonneTableau[],
  lignes: readonly Record<string, string | number | null>[],
  langue: Langue,
): string {
  const entetes = colonnes.map((colonne) =>
    echapperCellule(colonne.labels[langue] ?? colonne.labels.fr),
  )
  const rangees = lignes.map((ligne) =>
    colonnes.map((colonne) => {
      // Colonne calculée (ex. IPR) : jamais persistée, recalculée
      // ici comme à l'écran (`RenduGabarit.vue`) — sinon le CSV exporté
      // contient une cellule vide là où l'écran montre une valeur.
      const valeur =
        colonne.type === 'nombre' && colonne.formule !== undefined
          ? evaluerColonneCalculee(colonne, colonnes, ligne)
          : ligne[colonne.field_key]
      return echapperCellule(valeurLisible(colonne, valeur, langue))
    }),
  )
  return BOM_UTF8 + [entetes, ...rangees].map((rangee) => rangee.join(SEPARATEUR)).join('\r\n')
}

function echapperCellule(valeur: string): string {
  if (/[";\r\n]/.test(valeur)) {
    return `"${valeur.replaceAll('"', '""')}"`
  }
  return valeur
}
