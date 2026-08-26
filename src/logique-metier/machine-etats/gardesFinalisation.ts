import type { TemplateType } from '../domaine/types'

export type MessageBlocageFinalisation = 'U-01' | 'U-02' | 'U-03'

export type PointDeControle = 'entree_en_verification' | 'cloture_valide_en_interne'

export interface ContexteGardeFinalisation {
  templateType: TemplateType
  aLienVersContextProcede: boolean
  aLienVersPlanMetrologie: boolean
  aLienVersPlanMaintenance: boolean
}

const TEMPLATES_EXIGEANT_CONTEXTE_PROCEDE: readonly TemplateType[] = [
  'oq',
  'pq',
  'validation_procede',
]

/**
 * Détermine les blocages de finalisation applicables (FDS §3.3), pour un
 * point de contrôle donné du cycle de vie d'une section.
 *
 * @requirement URS-F-000septies, URS-F-000octies, URS-F-000nonies, FDS §3.3 (U-01/U-02/U-03)
 *
 * Asymétrie délibérée (FDS §3.3, justifiée par Annexe 15 §3.12) : le
 * Contexte procédé (U-01) et le Plan de métrologie (U-02) sont exigés à
 * l'**entrée** en vérification (finalisation), tandis que le Plan de
 * maintenance (U-03) n'est exigé qu'à la **clôture** (passage à
 * `valide_en_interne`) — pas avant, contrairement aux deux autres. Chaque
 * appel ne doit évaluer que le point de contrôle correspondant à la
 * transition en cours ; ne pas appeler ce module pour une transition qui
 * n'est ni l'une ni l'autre (ex. rejet, approbation intermédiaire).
 */
export function evaluerGardesFinalisation(
  contexte: ContexteGardeFinalisation,
  pointDeControle: PointDeControle,
): MessageBlocageFinalisation[] {
  const blocages: MessageBlocageFinalisation[] = []

  if (pointDeControle === 'entree_en_verification') {
    if (
      TEMPLATES_EXIGEANT_CONTEXTE_PROCEDE.includes(contexte.templateType) &&
      !contexte.aLienVersContextProcede
    ) {
      blocages.push('U-01')
    }
    if (contexte.templateType === 'iq' && !contexte.aLienVersPlanMetrologie) {
      blocages.push('U-02')
    }
  }

  if (pointDeControle === 'cloture_valide_en_interne') {
    if (contexte.templateType === 'oq' && !contexte.aLienVersPlanMaintenance) {
      blocages.push('U-03')
    }
  }

  return blocages
}

/**
 * Valide le motif obligatoire du mécanisme de forçage d'un blocage de
 * finalisation (FDS §3.3 : "chaque blocage propose un bouton Forcer avec
 * saisie d'un motif obligatoire").
 *
 * @requirement FDS §3.3, mitige AR-R-43
 */
export function motifDeForcageValide(motif: string | undefined): boolean {
  return motif !== undefined && motif.trim().length > 0
}
