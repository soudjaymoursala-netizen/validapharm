import JSZip from 'jszip'
import { DocumentInvalideError } from './erreurs'

const ESPACE_NOMS_SPREADSHEET = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'

/**
 * Ingestion native d'un classeur `.xlsx` (Phase 36 de convergence
 * architecturale — résolution partielle de TD-014, `TECHNICAL_DECISIONS.md`
 * TD-042) : bloquée jusqu'ici faute de librairie saine (`xlsx`/SheetJS
 * porte une vulnérabilité haute sans correctif sur le registre npm ;
 * `exceljs` introduit une dépendance transitive vulnérable — voir le
 * commentaire de `MethodeExtraction` dans `domaine/types.ts`).
 *
 * **Choix technique** : même patron que `DocxNatifAdapter.ts`
 * (`jszip`+`DOMParser` natif, jamais une librairie Excel généraliste) —
 * `jszip` est déjà une dépendance vettée (0 vulnérabilité `npm audit` au
 * 03/09/2026) et un `.xlsx` est structurellement un ZIP de XML,
 * exactement comme un `.docx`.
 *
 * **Périmètre volontairement étroit** (jamais une prétention de lire
 * tout le format Excel — limite assumée, documentée plutôt que
 * silencieuse) :
 * - une seule feuille lue (`xl/worksheets/sheet1.xml`, la première),
 *   aucune résolution des relations multi-feuilles ;
 * - seules les valeurs de cellules sont extraites (texte via
 *   `xl/sharedStrings.xml`, texte inline, ou nombre) ;
 * - une formule (`<f>`) n'est **jamais évaluée** — seule sa dernière
 *   valeur mise en cache (`<v>`) est lue si présente ;
 * - aucune macro VBA (`vbaProject.bin`), aucun objet OLE, aucun lien
 *   externe n'est jamais ouvert ou suivi.
 *
 * @requirement docs/convergence/TECHNICAL_DECISIONS.md TD-042
 */
export interface GrilleXlsx {
  lignes: string[][]
}

async function ouvrirXlsx(fichier: ArrayBuffer): Promise<JSZip> {
  try {
    return await JSZip.loadAsync(fichier)
  } catch {
    throw new DocumentInvalideError()
  }
}

function analyserXml(xml: string, contexte: string): Document {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new DocumentInvalideError(`${contexte} est illisible (XML invalide).`)
  }
  return doc
}

/** Convertit une référence de cellule ("A1", "AB12"...) en index de colonne 0-based. */
function indexColonne(reference: string): number {
  const lettres = reference.match(/^[A-Z]+/)?.[0] ?? ''
  let index = 0
  for (const lettre of lettres) {
    index = index * 26 + (lettre.charCodeAt(0) - 64)
  }
  return index - 1
}

/** Chaînes partagées (`xl/sharedStrings.xml`) — absent si le classeur n'utilise que des valeurs inline/numériques, jamais une erreur dans ce cas. */
async function extraireChainesPartagees(zip: JSZip): Promise<string[]> {
  const fichier = zip.file('xl/sharedStrings.xml')
  if (!fichier) return []
  const xml = await fichier.async('string')
  const doc = analyserXml(xml, 'xl/sharedStrings.xml')
  return Array.from(doc.getElementsByTagNameNS(ESPACE_NOMS_SPREADSHEET, 'si')).map((si) =>
    Array.from(si.getElementsByTagNameNS(ESPACE_NOMS_SPREADSHEET, 't'))
      .map((t) => t.textContent ?? '')
      .join(''),
  )
}

export async function extraireGrilleXlsx(fichier: ArrayBuffer): Promise<GrilleXlsx> {
  const zip = await ouvrirXlsx(fichier)

  const feuille = zip.file('xl/worksheets/sheet1.xml')
  if (!feuille) {
    throw new DocumentInvalideError(
      "Le fichier ne contient pas de xl/worksheets/sheet1.xml — ce n'est pas un .xlsx valide, ou la première feuille a été renommée/déplacée dans le classeur.",
    )
  }

  const [xmlFeuille, chainesPartagees] = await Promise.all([
    feuille.async('string'),
    extraireChainesPartagees(zip),
  ])
  const doc = analyserXml(xmlFeuille, 'xl/worksheets/sheet1.xml')

  const lignesXml = Array.from(doc.getElementsByTagNameNS(ESPACE_NOMS_SPREADSHEET, 'row'))
  const lignes: string[][] = lignesXml.map((ligneXml) => {
    const cellulesXml = Array.from(ligneXml.getElementsByTagNameNS(ESPACE_NOMS_SPREADSHEET, 'c'))
    const ligne: string[] = []
    cellulesXml.forEach((celluleXml, indexSequentiel) => {
      const reference = celluleXml.getAttribute('r')
      const colonne = reference ? indexColonne(reference) : indexSequentiel
      const type = celluleXml.getAttribute('t')

      let valeur: string
      if (type === 'inlineStr') {
        valeur = Array.from(celluleXml.getElementsByTagNameNS(ESPACE_NOMS_SPREADSHEET, 't'))
          .map((t) => t.textContent ?? '')
          .join('')
      } else {
        const v = celluleXml.getElementsByTagNameNS(ESPACE_NOMS_SPREADSHEET, 'v')[0]?.textContent
        valeur = type === 's' ? (chainesPartagees[Number(v ?? '-1')] ?? '') : (v ?? '')
      }

      while (ligne.length < colonne) ligne.push('')
      ligne[colonne] = valeur
    })
    return ligne
  })

  return { lignes }
}
