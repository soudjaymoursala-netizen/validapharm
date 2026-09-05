/**
 * Contrat d'erreur typé de l'ingestion PDF native —
 * même principe que `connecteurs/office/erreurs.ts`/`connecteurs/ocr/
 * erreurs.ts` : jamais une exception générique pour un cas prévu par la
 * conception. Aucun réseau ici (parsing entièrement local via `pdfjs-dist`)
 * — pas de `TimeoutError`/`IndisponibleError`, seulement un document
 * illisible ou d'un format inattendu.
 */

export class DocumentPdfInvalideError extends Error {
  constructor(message = "Le fichier fourni n'est pas un PDF valide ou n'a pas pu être lu.") {
    super(message)
    this.name = 'DocumentPdfInvalideError'
  }
}
