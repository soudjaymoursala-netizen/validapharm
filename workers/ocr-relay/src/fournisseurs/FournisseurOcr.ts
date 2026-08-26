/**
 * Contrat commun à tout fournisseur OCR/vision relayé par ce Worker
 * (TD-001, `docs/convergence/TECHNICAL_DECISIONS.md` : "un second Worker
 * sans état pour l'OCR/Document Intelligence, relais vers une API cloud
 * de vision, même pattern exact que le relais IA existant").
 *
 * Décision explicite de l'utilisateur (25/08/2026) : fournisseur initial
 * Azure AI Vision (Read API) — meilleur niveau gratuit (5000
 * transactions/mois contre 1000 chez Google Cloud Vision au moment de la
 * décision), déjà approuvé par l'utilisateur au même titre que Google
 * Cloud Vision. Cette interface existe spécifiquement pour que remplacer
 * ou ajouter un fournisseur (ex. Google Cloud Vision) n'exige de modifier
 * ni `ocrHandler.ts` ni le contrat client (`OcrRelayAdapter` côté PWA) —
 * seul un nouveau fichier `fournisseurs/*.ts` implémentant ce contrat est
 * nécessaire.
 */
export interface ResultatExtractionOcr {
  texte: string
  fournisseur: string
  version_moteur: string | null
}

export interface FournisseurOcr {
  extraireTexte(imageBytes: ArrayBuffer, contentType: string): Promise<ResultatExtractionOcr>
}
