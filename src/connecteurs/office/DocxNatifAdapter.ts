import JSZip from 'jszip'
import type { TableauDocx } from '../../logique-metier/domaine/types'
import { DocumentInvalideError } from './erreurs'

const ESPACE_NOMS_WORDPROCESSING = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

/**
 * Ingestion native d'un document `.docx` (Phase 19 de convergence
 * architecturale — première brique du chantier P0 "ingestion Office
 * native" du plan `docs/convergence/VISION_NORTH_STAR_CONVERGENCE.md`,
 * TD-014 ; images incorporées — Phase 19bis, TD-015).
 *
 * **Choix technique (texte)** : extraction directe du texte brut à
 * partir de `word/document.xml` (paragraphes `<w:p>`, runs de texte
 * `<w:t>`) avec `jszip` (dézippage) + `DOMParser` (natif navigateur,
 * disponible sous jsdom en test) — plutôt que la bibliothèque `mammoth`
 * initialement envisagée (TD-014) : `mammoth` distingue son code Node
 * de son code navigateur via le champ `browser` de son `package.json`,
 * un mécanisme propre aux bundlers (webpack/browserify) que la
 * résolution de modules de Vitest (SSR, Node) n'applique pas — le même
 * code testé n'aurait jamais été celui réellement exécuté par la PWA.
 * `jszip`+`DOMParser` sont isomorphes par construction, aucune
 * divergence Node/navigateur.
 *
 * **Une SOP n'est pas toujours du texte seul** (constat de l'utilisateur,
 * 27/08/2026) : un `.docx` réel contient souvent des schémas/photos
 * incorporés — `extraireImagesDocx` les récupère séparément (`word/
 * media/*`) pour qu'un appelant les transmette ensuite à l'OCR
 * (`connecteurs/ocr/OcrRelayAdapter.ts`, Phase 6) — jamais un
 * remplacement de l'OCR, un complément : le texte natif et les images
 * incorporées produisent chacun leur propre `Extraction` sur la même
 * `SourceVersion` (Phase 8a, `Extraction produces ExtractionItem 1:N`,
 * plusieurs `Extraction` par version déjà admises par le modèle).
 *
 * Contrairement à l'OCR, la lecture du texte natif n'appelle jamais de
 * relais réseau : tout s'exécute localement, cohérent avec l'architecture
 * PWA-only (TD-001).
 *
 * **Limite assumée et non résolue (TD-015)** : un scan filigrané (SOP
 * scannée avec surimpression "COPIE CONTRÔLÉE"/"DRAFT") peut dégrader la
 * qualité de l'OCR — aucune détection/correction automatique de filigrane
 * n'est construite ici, et il ne faut jamais en prétendre une sans
 * preuve réelle. Le filet de sécurité reste la validation humaine déjà
 * non négociable de tout `KnowledgeItem` (`a_valider` à la création,
 * Phase 8a) : un texte dégradé par un filigrane doit être visible et
 * corrigé à cette étape, jamais silencieusement accepté.
 *
 * @requirement docs/convergence/PHASE_19_INGESTION_OFFICE_SPEC.md, TD-014, TD-015
 */
export interface ResultatExtractionDocx {
  texte: string
}

async function ouvrirDocx(fichier: ArrayBuffer): Promise<JSZip> {
  try {
    return await JSZip.loadAsync(fichier)
  } catch {
    throw new DocumentInvalideError()
  }
}

async function chargerDocumentXml(fichier: ArrayBuffer): Promise<Document> {
  const zip = await ouvrirDocx(fichier)

  const documentXml = zip.file('word/document.xml')
  if (!documentXml) {
    throw new DocumentInvalideError(
      "Le fichier ne contient pas de word/document.xml — ce n'est pas un .docx valide.",
    )
  }

  const xml = await documentXml.async('string')
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new DocumentInvalideError('word/document.xml est illisible (XML invalide).')
  }
  return doc
}

/** Concatène les runs de texte `<w:t>` d'un élément (paragraphe ou cellule), dans l'ordre du document. */
function texteDeRuns(element: Element): string {
  return Array.from(element.getElementsByTagNameNS(ESPACE_NOMS_WORDPROCESSING, 't'))
    .map((run) => run.textContent ?? '')
    .join('')
}

/** Enfants *directs* d'un élément portant un nom local donné, dans l'espace de noms WordprocessingML — évite de remonter les lignes/cellules d'un tableau imbriqué dans une cellule (non traité, voir `extraireTableauxDocx`). */
function enfantsNommes(element: Element, nomLocal: string): Element[] {
  return Array.from(element.children).filter(
    (enfant) => enfant.namespaceURI === ESPACE_NOMS_WORDPROCESSING && enfant.localName === nomLocal,
  )
}

export async function extraireTexteDocx(fichier: ArrayBuffer): Promise<ResultatExtractionDocx> {
  const doc = await chargerDocumentXml(fichier)
  const paragraphes = Array.from(doc.getElementsByTagNameNS(ESPACE_NOMS_WORDPROCESSING, 'p'))
  const texte = paragraphes.map(texteDeRuns).join('\n')
  return { texte }
}

/**
 * Extrait les tableaux d'un `.docx` en grille de cellules brutes (Phase
 * 22, TD-019) — calibré sur un manuel équipement réel lu dans Google
 * Drive (Markem-Imaje, SOP C350) dont **la quasi-totalité des étapes
 * sont sous forme de tableau** ("Previous achievement"/"Required time"/
 * numéro d'étape en première colonne, instruction en deuxième) plutôt
 * qu'en texte à puces — le genre explicitement laissé hors couverture
 * par TD-017/TD-018.
 *
 * Seuls les tableaux **de premier niveau** (enfants directs de `<w:body>`)
 * sont extraits — un tableau imbriqué dans une cellule n'est pas
 * reconstruit dans cette version (aucune preuve d'un tel cas dans les
 * documents réels consultés ; limite assumée plutôt que silencieuse).
 * Une cellule fusionnée verticalement apparaît vide sur ses lignes de
 * continuation, jamais un contenu deviné.
 */
export async function extraireTableauxDocx(fichier: ArrayBuffer): Promise<TableauDocx[]> {
  const doc = await chargerDocumentXml(fichier)
  const corps = doc.getElementsByTagNameNS(ESPACE_NOMS_WORDPROCESSING, 'body')[0]
  if (!corps) return []

  const tableaux: TableauDocx[] = []
  let texteProche: string | null = null

  for (const enfant of Array.from(corps.children)) {
    if (enfant.namespaceURI !== ESPACE_NOMS_WORDPROCESSING) continue

    if (enfant.localName === 'p') {
      const texte = texteDeRuns(enfant).trim()
      if (texte.length > 0) texteProche = texte
      continue
    }

    if (enfant.localName === 'tbl') {
      const lignes = enfantsNommes(enfant, 'tr').map((ligne) =>
        enfantsNommes(ligne, 'tc').map((cellule) => {
          const paragraphes = Array.from(
            cellule.getElementsByTagNameNS(ESPACE_NOMS_WORDPROCESSING, 'p'),
          )
          return paragraphes.map(texteDeRuns).join('\n').trim()
        }),
      )
      tableaux.push({ lignes, titreProchePrecedent: texteProche })
    }
  }

  return tableaux
}

/** Types d'image raster que le relais OCR (Phase 6) sait traiter. */
const TYPES_MIME_PAR_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  bmp: 'image/bmp',
  tif: 'image/tiff',
  tiff: 'image/tiff',
}

export interface ImageIncorporeeDocx {
  nomFichier: string
  /** `null` pour un format non raster (ex. EMF/WMF — dessin vectoriel Office) : jamais transmissible à l'OCR tel quel. */
  contentType: string | null
  donnees: Blob
}

/**
 * Extrait les images incorporées d'un `.docx` (`word/media/*`) — schémas,
 * photos, diagrammes — pour qu'un appelant les transmette à l'OCR
 * (`OcrRelayAdapter.extraireTexte`). Un format non raster (EMF/WMF,
 * fréquent pour un schéma collé depuis Visio/PowerPoint) est retourné
 * avec `contentType: null` plutôt que silencieusement omis — l'appelant
 * doit voir qu'une image existe même si elle n'est pas encore exploitable.
 */
export async function extraireImagesDocx(fichier: ArrayBuffer): Promise<ImageIncorporeeDocx[]> {
  const zip = await ouvrirDocx(fichier)

  const fichiersMedia = Object.values(zip.files).filter(
    (f) => !f.dir && f.name.startsWith('word/media/'),
  )

  const images: ImageIncorporeeDocx[] = []
  for (const fichierMedia of fichiersMedia) {
    const extension = fichierMedia.name.split('.').pop()?.toLowerCase() ?? ''
    const contentType = TYPES_MIME_PAR_EXTENSION[extension] ?? null
    const donnees = await fichierMedia.async('blob')
    images.push({ nomFichier: fichierMedia.name, contentType, donnees })
  }
  return images
}
