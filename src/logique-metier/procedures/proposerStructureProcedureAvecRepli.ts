import type { ProviderAdapter } from '../../connecteurs/ia/ProviderAdapter'
import type {
  EtapeProposee,
  EtapeProposeeIA,
  SectionDetectee,
  SectionDetecteeIA,
  TableauDocx,
} from '../domaine/types'
import { proposerStructureProcedureParIA } from './proposerStructureProcedureIA'
import { proposerStructureProcedure } from './parseurStructureProcedure'

/**
 * Orchestration du repli (Phase 25, TD-023) : essaie d'abord le parseur
 * déterministe (Phases 21-22, aucun appel IA), et n'invoque le repli
 * IA-assisté (Phase 24, TD-022) que si celui-ci ne trouve **strictement
 * rien d'exploitable** — aucune section, aucune étape. Un résultat
 * partiel du parseur déterministe (ex. sections trouvées mais aucune
 * étape) reste tel quel : mélanger silencieusement les deux sources sur
 * un même document produirait une proposition dont la provenance de
 * chaque élément ne serait plus claire pour l'humain qui doit la
 * confirmer (`source` doit toujours désigner la totalité du résultat,
 * jamais un mélange implicite).
 */
export type PropositionAvecSource =
  | { source: 'deterministe'; sections: SectionDetectee[]; etapesProposees: EtapeProposee[] }
  | {
      source: 'ia'
      sections: SectionDetecteeIA[]
      etapesProposees: EtapeProposeeIA[]
      texteReponseBrute: string
    }

export async function proposerStructureProcedureAvecRepli(
  texte: string,
  tableaux: readonly TableauDocx[],
  provider: ProviderAdapter,
): Promise<PropositionAvecSource> {
  const propositionDeterministe = proposerStructureProcedure(texte, tableaux)
  const estVide =
    propositionDeterministe.sections.length === 0 &&
    propositionDeterministe.etapesProposees.length === 0

  if (!estVide) {
    return { source: 'deterministe', ...propositionDeterministe }
  }

  const propositionIA = await proposerStructureProcedureParIA(texte, provider)
  return { source: 'ia', ...propositionIA }
}
