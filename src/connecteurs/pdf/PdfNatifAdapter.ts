import { DocumentPdfInvalideError } from './erreurs'
// `?url` (transform Vite native) force le bundler à copier réellement ce
// fichier comme asset buildé et à renvoyer son URL finale hashée —
// indispensable ici : `new URL('pdfjs-dist/...', import.meta.url)` (le
// premier essai) compile mais ne fait PAS que Vite embarque le worker
// dans le build de production (spécificateur nu vers `node_modules`,
// jamais détecté par l'analyse statique de `new URL()`) ; en production
// réelle (GitHub Pages), l'URL obtenue pointait vers un chemin jamais
// généré (404), pdfjs échouait même son repli "fake worker" (qui a
// besoin d'importer dynamiquement ce même module) et chaque PDF réel
// remontait `DocumentPdfInvalideError` — jamais reproduit en test
// (Node résout le vrai chemin de fichier via `require.resolve`) ni en
// dev Vite (résolution `node_modules` transparente), découvert
// uniquement en import réel depuis le site déployé.
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url'

/**
 * Ingestion native d'un document `.pdf` — complète l'ingestion Office
 * native (`.docx`) pour le format resté non couvert jusqu'ici : une SOP réelle du
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
 * *exactement* celui exécuté par la PWA (même discipline qu'ailleurs :
 * ne jamais tester un chemin de code différent de celui de production).
 *
 * **Différence assumée avec l'échec de `mammoth`** : `mammoth`
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
  /** URL du script worker `pdf.worker.mjs`. Par défaut : asset buildé par Vite (import `?url`), fonctionne en navigateur réel comme en production. */
  workerSrc?: string
  /** URL du dossier des polices standard. Par défaut : copie statique `public/pdfjs-standard-fonts/` (voir plus bas pourquoi ce n'est pas `pdfjs-dist/standard_fonts/` directement). */
  standardFontDataUrl?: string
}

export interface ResultatExtractionPdf {
  texte: string
  nombrePages: number
}

export async function extraireTextePdf(
  fichier: ArrayBuffer,
  config: ConfigExtractionPdf = {},
): Promise<ResultatExtractionPdf> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
  pdfjsLib.GlobalWorkerOptions.workerSrc = config.workerSrc ?? pdfWorkerUrl

  let document
  try {
    document = await pdfjsLib.getDocument({
      data: new Uint8Array(fichier),
      // Dossier des polices standard — copié tel quel (`public/
      // pdfjs-standard-fonts/`, licences Foxit/Liberation incluses)
      // plutôt qu'un import par fichier (`?url` ne bundle qu'un fichier
      // à la fois, jamais un dossier entier) ; chemin construit via
      // `import.meta.env.BASE_URL` (toujours `/…/`, jamais un `/` en
      // dur — la PWA est servie sous `/validapharm/` en production,
      // GitHub Pages) — une simple concaténation, jamais `new URL()` :
      // `BASE_URL` seul n'est pas une URL absolue, `new URL()` la
      // rejetterait.
      standardFontDataUrl:
        config.standardFontDataUrl ?? `${import.meta.env.BASE_URL}pdfjs-standard-fonts/`,
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
