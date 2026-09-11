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
 * vérifiée indépendamment.
 *
 * **Profondeur relative, jamais une table globale colonne→rang** : une
 * première version associait chaque colonne de code distincte, triée,
 * à un rang croissant (1re colonne = rang 1, etc.) — supposant qu'une même
 * profondeur logique utilise toujours exactement la même colonne partout
 * dans le fichier. Constaté sur un export réel (~7 250 lignes) que ce
 * n'est pas garanti : une même profondeur logique (ex. « Système ou
 * équipement ») peut se décaler de quelques colonnes selon la branche
 * (largeur d'icône différente pour un équipement plutôt qu'un
 * emplacement fonctionnel, compression SAP des chaînes à enfant unique)
 * — la table globale comptait alors ce décalage comme un niveau
 * supplémentaire, gonflant à tort `profondeurRequise` et rejetant
 * l'import entier même hiérarchie correctement configurée (échec
 * silencieux du point de vue de l'utilisateur : aucune ligne fautive à
 * montrer, juste "il en faut plus"). Le rang est donc désormais déterminé
 * *relativement* à la ligne de donnée précédente, via une pile
 * d'ancêtres : une colonne strictement supérieure au sommet de pile est
 * un enfant (rang = rang du sommet + 1), une colonne inférieure ou égale
 * dépile jusqu'à retrouver l'ancêtre correspondant (frère ou oncle) —
 * jamais affecté par la valeur absolue de la colonne, seulement par sa
 * position relative aux lignes voisines déjà vues.
 *
 * **Échec en cascade, jamais un rattachement fantôme** : si une ligne est
 * rejetée (code déjà utilisé), ses descendants directs dans le fichier ne
 * sont jamais rattachés à un nœud qui n'existera pas — ils héritent de la
 * même erreur (`ancetre_manquant`), jusqu'à ce qu'une ligne de rang égal
 * ou inférieur referme la branche en échec.
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

interface AncetrePile {
  colonne: number
  rang: number
  id: string
}

interface LigneAvecRang {
  numeroLigne: number
  code: string
  nom: string
  rang: number
  id: string
  parentId: string | null
}

/**
 * Reconstruit le rang (profondeur) et le parent de chaque ligne via une
 * pile d'ancêtres, relativement à la colonne des lignes déjà vues —
 * jamais une table globale colonne→rang (voir docstring du module). Pure
 * et indépendante du schéma : ne fabrique aucun `NoeudAImporter`, se
 * limite à la structure, pour permettre de valider la profondeur requise
 * avant toute création.
 */
function reconstruireProfondeurs(lignesDonnees: readonly LigneDonneeSap[]): {
  lignes: LigneAvecRang[]
  profondeurRequise: number
} {
  const pile: AncetrePile[] = []
  const lignes: LigneAvecRang[] = []
  let profondeurRequise = 0

  for (const { numeroLigne, colonneCode, code, nom } of lignesDonnees) {
    let sommet = pile[pile.length - 1]
    while (sommet !== undefined && sommet.colonne >= colonneCode) {
      pile.pop()
      sommet = pile[pile.length - 1]
    }

    const parent = sommet ?? null
    const rang = (parent?.rang ?? 0) + 1
    profondeurRequise = Math.max(profondeurRequise, rang)

    const id = crypto.randomUUID()
    lignes.push({ numeroLigne, code, nom, rang, id, parentId: parent?.id ?? null })
    pile.push({ colonne: colonneCode, rang, id })
  }

  return { lignes, profondeurRequise }
}

export function preparerImportHierarchieSap(
  grille: readonly string[][],
  schema: Pick<AssetHierarchySchema, 'levels'>,
  noeudsExistants: readonly Pick<AssetNode, 'id' | 'code'>[],
): ResultatPreparationImportHierarchieSap {
  if (grille.length === 0) return { ok: false, raison: 'grille_vide' }

  const { lignes: lignesDonnees, erreurs: erreursDeForme } = extraireLignesDonnees(grille)
  if (lignesDonnees.length === 0) return { ok: false, raison: 'grille_vide' }

  const { lignes: lignesAvecRang, profondeurRequise } = reconstruireProfondeurs(lignesDonnees)
  if (schema.levels.length < profondeurRequise) {
    return {
      ok: false,
      raison: 'profondeur_insuffisante',
      profondeurRequise,
      profondeurConfiguree: schema.levels.length,
    }
  }

  const aCreer: NoeudAImporter[] = []
  const erreurs: ErreurLigneImportHierarchieSap[] = [...erreursDeForme]
  const codesUtilises = new Set(noeudsExistants.map((n) => n.code))
  const idsEchoues = new Set<string>()

  for (const { numeroLigne, code, nom, rang, id, parentId } of lignesAvecRang) {
    // Le code propre à la ligne est vérifié avant la cascade parent : un
    // ré-import intégral du même fichier (toutes les lignes déjà
    // importées, y compris la racine) doit remonter « code déjà utilisé »
    // pour chaque ligne individuellement, jamais un « ancêtre manquant »
    // en cascade qui masquerait la vraie raison, plus directement
    // exploitable par l'utilisateur.
    if (codesUtilises.has(code)) {
      erreurs.push({ ligne: numeroLigne, raison: 'code_deja_utilise' })
      idsEchoues.add(id)
      continue
    }
    if (parentId !== null && idsEchoues.has(parentId)) {
      erreurs.push({ ligne: numeroLigne, raison: 'ancetre_manquant' })
      idsEchoues.add(id)
      continue
    }
    codesUtilises.add(code)

    const niveau = schema.levels[rang - 1]
    if (!niveau) continue // ne peut pas survenir : profondeur déjà validée ci-dessus

    aCreer.push({ id, level_key: niveau.key, name: nom, code, parent_id: parentId })
  }

  return { ok: true, plan: { aCreer, erreurs } }
}
