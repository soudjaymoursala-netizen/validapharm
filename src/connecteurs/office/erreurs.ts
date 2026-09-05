/**
 * Contrat d'erreur typé de l'ingestion Office native —
 * même principe que `connecteurs/ocr/erreurs.ts`/`connecteurs/ia/erreurs.ts` :
 * jamais une exception générique pour un cas prévu par la conception.
 * Aucun réseau ici (parsing entièrement local) — pas de `TimeoutError`/
 * `IndisponibleError`, seulement un document illisible ou d'un format
 * inattendu.
 */

export class DocumentInvalideError extends Error {
  constructor(message = "Le fichier fourni n'est pas un document valide ou n'a pas pu être lu.") {
    super(message)
    this.name = 'DocumentInvalideError'
  }
}

/** Gabarit d'export client illisible, ou dont les balises `docxtemplater` sont incompatibles avec les données à injecter (balise mal fermée, boucle non refermée…). */
export class GabaritDocxInvalideError extends Error {
  constructor(
    message = "Le gabarit fourni n'est pas un .docx valide ou contient des balises invalides.",
  ) {
    super(message)
    this.name = 'GabaritDocxInvalideError'
  }
}
