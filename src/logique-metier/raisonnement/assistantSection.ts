import type { CategorieDocumentNormatif, Section } from '../domaine/types'

/** Document normatif injectable dans l'objectif — sous-ensemble de `NormativeDocument` (jamais `content`, un `Blob` sans intérêt pour un prompt texte). */
export interface DocumentNormatifPourAssistant {
  titre: string
  category: CategorieDocumentNormatif
  extracted_text: string
}

/** Au-delà de cette longueur, le texte d'un document est tronqué avec un marqueur explicite — jamais silencieusement, pour qu'une réponse fondée sur un extrait incomplet reste identifiable. */
const LONGUEUR_MAX_EXTRAIT_DOCUMENT_NORMATIF = 4000

function extraitDocumentNormatif(document: DocumentNormatifPourAssistant): string {
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

/**
 * Construit l'objectif du Reasoning Engine pour l'assistant
 * contextuel par section.
 *
 * @requirement Assistant contextuel par section
 *
 * La section n'est pas un objet interrogeable par le catalogue d'outils
 * existant (`Requirement`/`Test`/`AssetNode`/...) — plutôt que d'étendre ce
 * catalogue et les données chargées par `useReasoningEngineStore` pour un
 * seul objet, son contenu actuel est injecté directement dans le texte de
 * l'objectif, même idiome que le narratif de contexte déjà
 * concaténé au prompt. `executerBoucleRaisonnement`/ses outils existants
 * (traçabilité, procédures, connaissance) restent pleinement disponibles
 * pour répondre à la question.
 *
 * `documentsNormatifs` (bibliothèque de normes, §4.5) suit le même idiome :
 * injectés tels quels, jamais résumés ou reformulés par une étape
 * intermédiaire qui risquerait de fabriquer du contenu — seul un extrait
 * tronqué (jamais silencieux, voir `extraitDocumentNormatif`) limite la
 * taille du prompt. Aucun filtrage de pertinence ici : c'est au modèle,
 * pas à un heuristique local non prouvé, de décider ce qui répond à la
 * question.
 */
export function construireObjectifAssistantSection(
  section: Pick<Section, 'id' | 'template_type' | 'meta' | 'values'>,
  question: string,
  documentsNormatifs: readonly DocumentNormatifPourAssistant[] = [],
): string {
  const valeursNonVides = Object.entries(section.values).filter(
    ([, valeur]) => valeur !== null && valeur !== '',
  )
  const contenuSection =
    valeursNonVides.length > 0
      ? valeursNonVides.map(([cle, valeur]) => `- ${cle} : ${valeur}`).join('\n')
      : '(aucune valeur saisie pour l’instant)'

  const blocDocumentsNormatifs =
    documentsNormatifs.length > 0
      ? [
          '',
          'Documents normatifs disponibles (normes/guidelines importés par l’organisation) :',
          ...documentsNormatifs.map(extraitDocumentNormatif),
        ]
      : []

  return [
    `Tu assistes l'utilisateur sur une section précise du dossier (id ${section.id}, gabarit "${section.template_type}", titre "${section.meta.titre}").`,
    'Contenu actuel de cette section (valeurs déjà saisies) :',
    contenuSection,
    ...blocDocumentsNormatifs,
    '',
    "Question de l'utilisateur sur cette section :",
    question,
  ].join('\n')
}
