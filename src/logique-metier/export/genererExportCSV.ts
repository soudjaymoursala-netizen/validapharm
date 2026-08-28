import type { ColonneTableau } from '../gabarits/definitionGabarit'
import type { Langue } from '../domaine/types'
import { evaluerColonneCalculee } from '../gabarits/evaluerColonneCalculee'

/**
 * Export CSV d'un tableau dynamique (FS §4.3, URS-F-022 : "export CSV/XLSX
 * pour les tableaux dynamiques, ex. registre AMDEC").
 *
 * @requirement URS-F-022, FS §4.3
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
      // Colonne calculée (ex. IPR, FDS §5) : jamais persistée, recalculée
      // ici comme à l'écran (`RenduGabarit.vue`) — sinon le CSV exporté
      // contient une cellule vide là où l'écran montre une valeur.
      const valeur =
        colonne.type === 'nombre' && colonne.formule !== undefined
          ? evaluerColonneCalculee(colonne, colonnes, ligne)
          : ligne[colonne.field_key]
      return echapperCellule(String(valeur ?? ''))
    }),
  )
  return [entetes, ...rangees].map((rangee) => rangee.join(',')).join('\r\n')
}

function echapperCellule(valeur: string): string {
  if (/[",\r\n]/.test(valeur)) {
    return `"${valeur.replaceAll('"', '""')}"`
  }
  return valeur
}
