import type { AssetHierarchySchema, AssetNode } from '../domaine/types'
import type { NoeudAImporter } from './importerHierarchieXlsx'

/**
 * Planification pure de l'import d'une hiérarchie d'actifs depuis un
 * export SAP (rapport ALV arborescent — ex. transaction `IH01`/`IH03` —
 * téléchargé « vers feuille de calcul ») — jamais d'écriture ici, même
 * discipline que `importerHierarchieXlsx.ts`.
 *
 * Convention réelle de ce type d'export, établie par analyse d'un export
 * réel (07/09/2026, ~7 250 lignes de données) plutôt que devinée : chaque
 * ligne porte exactement deux cellules significatives (après retrait des
 * cellules vides ou ne contenant que des espaces d'indentation) — un code
 * (le plus à gauche) et une description (le plus à droite) — la position
 * de colonne du code encodant la profondeur dans l'arborescence (plus la
 * colonne est à droite, plus le nœud est profond). Deux lignes d'en-tête
 * (`Functional Location`/`Description`) précèdent les données et sont
 * reconnues par leur texte en première colonne (colonne A) et ignorées ;
 * une colonne A valant `X` isolée est la case à cocher SAP, jamais un
 * code.
 *
 * La profondeur réelle d'un export SAP varie selon les branches (deux
 * équipements peuvent être imbriqués à des niveaux différents dans deux
 * services distincts) — jamais aplatie de force à un nombre de niveaux
 * arbitraire : le nombre de niveaux nécessaires est calculé à partir du
 * fichier, et l'import est refusé si `schema.levels[]` n'en compte pas
 * assez (jamais un niveau fabriqué à la volée, même principe que
 * `importerHierarchieXlsx.ts` — l'utilisateur choisit lui-même les clés
 * et libellés via « Ajouter le niveau » avant de réimporter).
 *
 * La reconstruction parent→enfant suppose un export en parcours préfixe
 * (chaque nœud immédiatement suivi de ses descendants avant son prochain
 * frère) — hypothèse structurelle de ce type d'export SAP, jamais
 * vérifiée indépendamment ; une rupture de cette hypothèse se traduit par
 * une erreur de ligne explicite (`ancetre_manquant`), jamais un
 * rattachement silencieux à la racine.
 */

export interface ErreurLigneImportHierarchieSap {
  ligne: number
  raison: 'code_deja_utilise' | 'ancetre_manquant' | 'forme_ligne_inattendue'
}

export interface PlanImportHierarchieSap {
  aCreer: NoeudAImporter[]
  erreurs: ErreurLigneImportHierarchieSap[]
}

export type ResultatPreparationImportHierarchieSap =
  | { ok: true; plan: PlanImportHierarchieSap }
  | { ok: false; raison: 'grille_vide' }
  | {
      ok: false
      raison: 'profondeur_insuffisante'
      profondeurRequise: number
      profondeurConfiguree: number
    }

interface CelluleSignificative {
  colonne: number
  valeur: string
}

interface LigneDonneeSap {
  numeroLigne: number
  colonneCode: number
  code: string
  nom: string
}

/** Cellules non vides (après trim) d'une ligne, position de colonne conservée. */
function cellulesSignificatives(ligne: readonly string[]): CelluleSignificative[] {
  const resultat: CelluleSignificative[] = []
  for (let colonne = 0; colonne < ligne.length; colonne += 1) {
    const valeur = (ligne[colonne] ?? '').trim()
    if (valeur !== '') resultat.push({ colonne, valeur })
  }
  return resultat
}

/**
 * Découpe la grille brute en lignes de données exploitables, en écartant
 * silencieusement les lignes d'en-tête/légende (texte en colonne A) et les
 * lignes entièrement vides (séparateurs), et en signalant explicitement
 * toute ligne dont la forme ne correspond ni à « code seul » ni à « code +
 * description ».
 */
function extraireLignesDonnees(grille: readonly string[][]): {
  lignes: LigneDonneeSap[]
  erreurs: ErreurLigneImportHierarchieSap[]
} {
  const lignes: LigneDonneeSap[] = []
  const erreurs: ErreurLigneImportHierarchieSap[] = []

  grille.forEach((ligne, indexLigne) => {
    const numeroLigne = indexLigne + 1
    const colonneA = (ligne[0] ?? '').trim()
    if (colonneA !== '' && colonneA !== 'X') return // en-tête/légende (ex. "Functional Location")

    let cellules = cellulesSignificatives(ligne)
    if (cellules.length === 0) return // ligne vide : séparateur de tableur

    if (cellules.length > 1 && cellules[0]?.valeur === 'X') {
      cellules = cellules.slice(1) // case à cocher SAP, jamais un code
    }

    if (cellules.length === 1 && cellules[0]?.valeur === 'X') {
      erreurs.push({ ligne: numeroLigne, raison: 'forme_ligne_inattendue' })
      return
    }
    if (cellules.length === 0 || cellules.length > 2) {
      erreurs.push({ ligne: numeroLigne, raison: 'forme_ligne_inattendue' })
      return
    }

    const celluleCode = cellules[0]
    if (!celluleCode) return
    const celluleNom = cellules.length === 2 ? cellules[1] : celluleCode

    lignes.push({
      numeroLigne,
      colonneCode: celluleCode.colonne,
      code: celluleCode.valeur,
      nom: celluleNom?.valeur ?? celluleCode.valeur,
    })
  })

  return { lignes, erreurs }
}

export function preparerImportHierarchieSap(
  grille: readonly string[][],
  schema: Pick<AssetHierarchySchema, 'levels'>,
  noeudsExistants: readonly Pick<AssetNode, 'id' | 'code'>[],
): ResultatPreparationImportHierarchieSap {
  if (grille.length === 0) return { ok: false, raison: 'grille_vide' }

  const { lignes: lignesDonnees, erreurs: erreursDeForme } = extraireLignesDonnees(grille)
  if (lignesDonnees.length === 0) return { ok: false, raison: 'grille_vide' }

  const colonnesCodeTriees = Array.from(new Set(lignesDonnees.map((l) => l.colonneCode))).sort(
    (a, b) => a - b,
  )
  const profondeurRequise = colonnesCodeTriees.length
  if (schema.levels.length < profondeurRequise) {
    return {
      ok: false,
      raison: 'profondeur_insuffisante',
      profondeurRequise,
      profondeurConfiguree: schema.levels.length,
    }
  }
  const rangParColonne = new Map(colonnesCodeTriees.map((colonne, i) => [colonne, i + 1]))

  const aCreer: NoeudAImporter[] = []
  const erreurs: ErreurLigneImportHierarchieSap[] = [...erreursDeForme]
  const codesUtilises = new Set(noeudsExistants.map((n) => n.code))
  const dernierIdParRang = new Map<number, string>()

  for (const { numeroLigne, colonneCode, code, nom } of lignesDonnees) {
    const rang = rangParColonne.get(colonneCode)
    if (rang === undefined) continue // ne peut pas survenir : colonneCode vient de colonnesCodeTriees

    let parentId: string | null = null
    if (rang > 1) {
      const parentTrouve = dernierIdParRang.get(rang - 1)
      if (parentTrouve === undefined) {
        erreurs.push({ ligne: numeroLigne, raison: 'ancetre_manquant' })
        continue
      }
      parentId = parentTrouve
    }

    if (codesUtilises.has(code)) {
      erreurs.push({ ligne: numeroLigne, raison: 'code_deja_utilise' })
      continue
    }
    codesUtilises.add(code)

    const niveau = schema.levels[rang - 1]
    if (!niveau) continue // ne peut pas survenir : profondeur déjà validée ci-dessus

    const nouvelId = crypto.randomUUID()
    aCreer.push({ id: nouvelId, level_key: niveau.key, name: nom, code, parent_id: parentId })
    dernierIdParRang.set(rang, nouvelId)
  }

  return { ok: true, plan: { aCreer, erreurs } }
}
