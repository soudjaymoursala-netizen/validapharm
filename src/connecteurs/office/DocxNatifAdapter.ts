import JSZip from 'jszip'
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

export async function extraireTexteDocx(fichier: ArrayBuffer): Promise<ResultatExtractionDocx> {
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

  const paragraphes = Array.from(doc.getElementsByTagNameNS(ESPACE_NOMS_WORDPROCESSING, 'p'))
  const texte = paragraphes
    .map((paragraphe) =>
      Array.from(paragraphe.getElementsByTagNameNS(ESPACE_NOMS_WORDPROCESSING, 't'))
        .map((run) => run.textContent ?? '')
        .join(''),
    )
    .join('\n')

  return { texte }
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
