import { DocumentInvalideError } from './erreurs'

/**
 * Ingestion native d'un export SAP au format `.htm`/`.html` (rapport ALV
 * arborescent, transaction `IH01`/`IH03`, « Enregistrer comme fichier
 * HTML ») — même famille que `XlsxNatifAdapter.ts`, `DOMParser` natif,
 * jamais une librairie de scraping HTML généraliste.
 *
 * **Forme réelle de ce type d'export**, établie par analyse d'un export
 * réel (le même arbre que celui utilisé pour `XlsxNatifAdapter`, ~7 250
 * lignes de données) : chaque ligne du rapport est un bloc de balises
 * `<font>`/`<span>`/`<nobr>` terminé par un `<br>`. Une ligne de donnée
 * réelle commence toujours par une case à cocher (`<input type=checkbox>`)
 * — absente des 2 lignes d'en-tête et des lignes purement décoratives
 * (traits de connexion de l'arbre entre deux nœuds) : c'est ce marqueur,
 * jamais une heuristique de texte, qui distingue une ligne de donnée d'une
 * ligne à ignorer.
 *
 * **Piège identifié et écarté** : le rendu visuel de l'arbre (nombre de
 * traits `|`/`-`, largeur des espaces d'indentation) ne permet **pas** de
 * reconstruire fiablement la profondeur — vérifié sur le fichier réel :
 * un nœud et son propre enfant unique peuvent partager exactement le même
 * nombre de cellules décoratives (SAP compresse visuellement les chaînes
 * à enfant unique). La position de colonne **réelle** est en revanche
 * bien présente, encodée dans l'attribut `id` de chaque `<nobr>`
 * (ex. `id="l0008016"` — un numéro de ligne SAP interne partagé par
 * toutes les cellules de la même ligne, suivi de la colonne caractère
 * exacte). Le numéro de ligne est retiré via le plus long préfixe commun
 * des `id` numériques d'une même ligne (jamais une largeur de préfixe
 * supposée fixe, qui dériverait sur un très long rapport) ; la colonne
 * restante encode alors la profondeur exactement comme la position de
 * colonne d'un export `.xlsx` — validé, sur ce fichier réel, identique au
 * `.xlsx` correspondant (mêmes 7 niveaux, même répartition exacte par
 * niveau, 0 erreur).
 *
 * Chaque cellule significative (code ou description) devient une cellule
 * de la grille retournée, à l'index de sa colonne réelle — même contrat
 * que `GrilleXlsx.lignes` (`string[][]`), consommable tel quel par
 * `preparerImportHierarchieSap`. Une cellule purement décorative (traits
 * `|`/`-` de dessin de l'arbre, ou icône de dossier/feuille rendue via la
 * police `SAPDings`) n'est jamais placée dans la grille.
 */

const REGEX_CELLULE_DECORATIVE = /^[\s|-]*$/
const REGEX_ID_NUMERIQUE = /^l(\d+)$/

function estPoliceIcone(element: Element): boolean {
  let courant: Element | null = element
  while (courant) {
    if (courant.tagName === 'FONT' && courant.getAttribute('face') === 'SAPDings') return true
    courant = courant.parentElement
  }
  return false
}

/** Plus long préfixe commun d'un ensemble de chaînes — jamais une largeur supposée fixe. */
function prefixeCommun(chaines: readonly string[]): string {
  if (chaines.length === 0) return ''
  let prefixe = chaines[0] ?? ''
  for (const chaine of chaines.slice(1)) {
    let i = 0
    while (i < prefixe.length && i < chaine.length && prefixe[i] === chaine[i]) i += 1
    prefixe = prefixe.slice(0, i)
  }
  return prefixe
}

interface CelluleHtml {
  element: Element
  idNumerique: string | null
}

export function extraireGrilleHtmlSap(html: string): string[][] {
  let document_: Document
  try {
    document_ = new DOMParser().parseFromString(html, 'text/html')
  } catch {
    throw new DocumentInvalideError()
  }
  if (!document_.body) throw new DocumentInvalideError()

  const grille: string[][] = []
  let ligneCourante: CelluleHtml[] | null = null

  function traiterLigne(cellules: CelluleHtml[]): void {
    const idsConnus = cellules.map((c) => c.idNumerique).filter((v): v is string => v !== null)
    if (idsConnus.length === 0) return
    const prefixe = prefixeCommun(idsConnus)

    const ligne: string[] = []
    for (const { element, idNumerique } of cellules) {
      if (idNumerique === null || estPoliceIcone(element)) continue
      const texte = (element.textContent ?? '').trim()
      if (REGEX_CELLULE_DECORATIVE.test(texte)) continue
      const suffixeColonne = idNumerique.slice(prefixe.length)
      const colonne = suffixeColonne === '' ? 0 : Number.parseInt(suffixeColonne, 10)
      ligne[colonne] = texte
    }
    grille.push(ligne)
  }

  function visiter(noeud: Node): void {
    if (noeud.nodeType !== Node.ELEMENT_NODE) return
    const element = noeud as Element

    if (element.tagName === 'BR') {
      if (ligneCourante) traiterLigne(ligneCourante)
      ligneCourante = null
      return
    }
    if (element.tagName === 'INPUT' && element.getAttribute('type') === 'checkbox') {
      ligneCourante = []
      return
    }
    if (element.tagName === 'NOBR') {
      if (ligneCourante) {
        const id = element.getAttribute('id')
        const correspondance = id ? REGEX_ID_NUMERIQUE.exec(id) : null
        ligneCourante.push({
          element,
          idNumerique: correspondance ? (correspondance[1] ?? null) : null,
        })
      }
      return
    }
    for (const enfant of Array.from(element.childNodes)) visiter(enfant)
  }

  visiter(document_.body)
  if (ligneCourante) traiterLigne(ligneCourante)

  return grille
}
