import JSZip from 'jszip'
import { DocumentInvalideError } from './erreurs'

const ESPACE_NOMS_WORDPROCESSING = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

/**
 * Ingestion native d'un document `.docx` (Phase 19 de convergence
 * architecturale — première brique du chantier P0 "ingestion Office
 * native" du plan `docs/convergence/VISION_NORTH_STAR_CONVERGENCE.md`,
 * TD-014).
 *
 * **Choix technique** : extraction directe du texte brut à partir de
 * `word/document.xml` (paragraphes `<w:p>`, runs de texte `<w:t>`) avec
 * `jszip` (dézippage) + `DOMParser` (natif navigateur, disponible sous
 * jsdom en test) — plutôt que la bibliothèque `mammoth` initialement
 * envisagée (TD-014) : `mammoth` distingue son code Node de son code
 * navigateur via le champ `browser` de son `package.json`, un mécanisme
 * propre aux bundlers (webpack/browserify) que la résolution de modules
 * de Vitest (SSR, Node) n'applique pas — le même code testé n'aurait
 * jamais été celui réellement exécuté par la PWA. `jszip`+`DOMParser`
 * sont isomorphes par construction, aucune divergence Node/navigateur.
 * Contrairement à l'OCR (`connecteurs/ocr/OcrRelayAdapter.ts`), aucun
 * relais réseau : tout s'exécute localement, cohérent avec l'architecture
 * PWA-only (TD-001). Utilisé pour lire une procédure (SOP/WI) ou un
 * gabarit fournis directement par l'utilisateur — jamais un remplacement
 * de l'OCR (qui reste nécessaire pour un scan/image).
 *
 * @requirement docs/convergence/PHASE_19_INGESTION_OFFICE_SPEC.md, TD-014
 */
export interface ResultatExtractionDocx {
  texte: string
}

export async function extraireTexteDocx(fichier: ArrayBuffer): Promise<ResultatExtractionDocx> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(fichier)
  } catch {
    throw new DocumentInvalideError()
  }

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
