import type { CategorieDocumentNormatif } from '../domaine/types'

/** Document normatif injectable dans un prompt — sous-ensemble de `NormativeDocument` (jamais `content`, un `Blob` sans intérêt pour un prompt texte). */
export interface DocumentNormatifPourPrompt {
  titre: string
  category: CategorieDocumentNormatif
  extracted_text: string
}

/** Au-delà de cette longueur, le texte d'un document est tronqué avec un marqueur explicite — jamais silencieusement, pour qu'une réponse fondée sur un extrait incomplet reste identifiable. */
export const LONGUEUR_MAX_EXTRAIT_DOCUMENT_NORMATIF = 4000

/**
 * Formate un document normatif pour injection dans un prompt IA — même
 * idiome partout où la bibliothèque de normes est consultée (assistant
 * contextuel de section, génération de brouillon) : injecté tel quel,
 * jamais résumé ou reformulé par une étape intermédiaire qui risquerait
 * de fabriquer du contenu, seul un extrait tronqué limite la taille du
 * prompt.
 */
export function formaterDocumentNormatifPourPrompt(document: DocumentNormatifPourPrompt): string {
  const texte = document.extracted_text
  const tronque = texte.length > LONGUEUR_MAX_EXTRAIT_DOCUMENT_NORMATIF
  const corps = tronque ? texte.slice(0, LONGUEUR_MAX_EXTRAIT_DOCUMENT_NORMATIF) : texte
  return [
    `--- ${document.titre} (${document.category}) ---`,
    corps,
    tronque ? '[...texte tronqué...]' : null,
  ]
    .filter((ligne): ligne is string => ligne !== null)
    .join('\n')
}

/** Bloc complet "Documents normatifs disponibles" — chaîne vide si aucun document, pour rester un simple ajout au prompt sans conditionnelle côté appelant. */
export function blocDocumentsNormatifsPourPrompt(
  documents: readonly DocumentNormatifPourPrompt[],
): string {
  if (documents.length === 0) return ''
  return [
    '',
    'Documents normatifs disponibles (normes/guidelines importés par l’organisation) :',
    ...documents.map(formaterDocumentNormatifPourPrompt),
  ].join('\n')
}
