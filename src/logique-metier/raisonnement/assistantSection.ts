import type { Section } from '../domaine/types'

/**
 * Construit l'objectif du Reasoning Engine (Phase 15) pour l'assistant
 * contextuel par section (Phase 38, Option 1 — TD-045).
 *
 * @requirement docs/convergence/CONVERGENCE_PLAN.md Phase 38, TD-045
 *
 * La section n'est pas un objet interrogeable par le catalogue d'outils
 * existant (`Requirement`/`Test`/`AssetNode`/...) — plutôt que d'étendre ce
 * catalogue et les données chargées par `useReasoningEngineStore` pour un
 * seul objet, son contenu actuel est injecté directement dans le texte de
 * l'objectif, même idiome que le narratif de contexte (Phase 27) déjà
 * concaténé au prompt. `executerBoucleRaisonnement`/ses outils existants
 * (traçabilité, procédures, connaissance) restent pleinement disponibles
 * pour répondre à la question.
 */
export function construireObjectifAssistantSection(
  section: Pick<Section, 'id' | 'template_type' | 'meta' | 'values'>,
  question: string,
): string {
  const valeursNonVides = Object.entries(section.values).filter(
    ([, valeur]) => valeur !== null && valeur !== '',
  )
  const contenuSection =
    valeursNonVides.length > 0
      ? valeursNonVides.map(([cle, valeur]) => `- ${cle} : ${valeur}`).join('\n')
      : '(aucune valeur saisie pour l’instant)'

  return [
    `Tu assistes l'utilisateur sur une section précise du dossier (id ${section.id}, gabarit "${section.template_type}", titre "${section.meta.titre}").`,
    'Contenu actuel de cette section (valeurs déjà saisies) :',
    contenuSection,
    '',
    "Question de l'utilisateur sur cette section :",
    question,
  ].join('\n')
}
