import { DocumentPdfInvalideError } from './erreurs'

/**
 * Ingestion native d'un document `.pdf` (Phase 23 de convergence
 * architecturale, TD-021) — complète l'ingestion Office native (Phase 19,
 * `.docx`) pour le format resté non couvert jusqu'ici : une SOP réelle du
 * corpus consulté (ex. "SOP Qualif Balance.pdf", "LYON-QUAL-PGN-000198.pdf")
 * est parfois livrée en PDF plutôt qu'en `.docx` éditable.
 *
 * **Recherche de librairie (avant conception)** : `pdfjs-dist` (Mozilla,
 * actif, 0 vulnérabilité `npm audit`) retenu — seul candidat crédible pour
 * un parsing PDF en navigateur. Le build principal (`pdfjs-dist/build/
 * pdf.mjs`) échoue à l'import dans l'environnement de test (`jsdom`) :
 * `DOMMatrix is not defined`, une API Canvas absente de jsdom, jamais des
 * vrais navigateurs cibles de la PWA. Le build `legacy` (`pdfjs-dist/
 * legacy/build/pdf.mjs`, explicitement documenté par Mozilla pour les
 * environnements sans Canvas complet) importe et exécute sans erreur dans
 * les deux environnements — retenu ici pour que le code testé soit
 * *exactement* celui exécuté par la PWA (même discipline que TD-014 :
 * ne jamais tester un chemin de code différent de celui de production).
 *
 * **Différence assumée avec l'échec de `mammoth` (TD-014)** : `mammoth`
 * avait deux implémentations *comportementalement différentes* selon
 * Node/navigateur (celle de test n'acceptait même pas un `ArrayBuffer`).
 * Ici, `getDocument`/`getTextContent` sont le même code, octet pour octet,
 * dans les deux environnements — seule l'URL du script worker et des
 * polices standard diffère (résolue en navigateur via `import.meta.url`,
 * pattern Vite natif ; en test via un chemin de fichier Node explicite,
 * voir `PdfNatifAdapter.test.ts`) — une configuration d'environnement,
 * jamais une divergence de logique.
 */
export interface ConfigExtractionPdf {
  /** URL du script worker `pdf.worker.mjs`. Par défaut : résolution Vite native (`import.meta.url`), fonctionne en navigateur réel. */
  workerSrc?: string
  /** URL du dossier des polices standard `pdfjs-dist/standard_fonts/`. Même défaut Vite natif. */
  standardFontDataUrl?: string
}

export interface ResultatExtractionPdf {
  texte: string
  nombrePages: number
}

function urlParDefaut(cheminRelatif: string): string {
  return new URL(cheminRelatif, import.meta.url).href
}

export async function extraireTextePdf(
  fichier: ArrayBuffer,
  config: ConfigExtractionPdf = {},
): Promise<ResultatExtractionPdf> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    config.workerSrc ?? urlParDefaut('pdfjs-dist/legacy/build/pdf.worker.mjs')

  let document
  try {
    document = await pdfjsLib.getDocument({
      data: new Uint8Array(fichier),
      standardFontDataUrl: config.standardFontDataUrl ?? urlParDefaut('pdfjs-dist/standard_fonts/'),
    }).promise
  } catch {
    throw new DocumentPdfInvalideError()
  }

  const textesPages: string[] = []
  for (let numero = 1; numero <= document.numPages; numero++) {
    const page = await document.getPage(numero)
    const contenu = await page.getTextContent()
    const texte = contenu.items
      .map((item) => {
        if (!('str' in item)) return ''
        return item.str + (item.hasEOL ? '\n' : '')
      })
      .join('')
    textesPages.push(texte.trim())
  }

  return { texte: textesPages.join('\n\n'), nombrePages: document.numPages }
}
