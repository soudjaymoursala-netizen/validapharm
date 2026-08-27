/**
 * Contrat d'erreur typé de l'ingestion Office native (Phase 19, TD-014) —
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
