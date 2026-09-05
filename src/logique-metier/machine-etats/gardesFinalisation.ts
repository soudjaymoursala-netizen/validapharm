import type { TemplateType } from '../domaine/types'
import {
  evaluerReglesConformite,
  type RegleConformite,
} from '../conformite/evaluerReglesConformite'

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

interface RegleGardeFinalisation extends RegleConformite<
  ContexteGardeFinalisation,
  MessageBlocageFinalisation
> {
  pointDeControle: PointDeControle
}

const REGLES_GARDES_FINALISATION: readonly RegleGardeFinalisation[] = [
  {
    code: 'U-01',
    pointDeControle: 'entree_en_verification',
    bloque: (c) =>
      TEMPLATES_EXIGEANT_CONTEXTE_PROCEDE.includes(c.templateType) && !c.aLienVersContextProcede,
    message: 'Lien vers le Contexte procédé manquant.',
  },
  {
    code: 'U-02',
    pointDeControle: 'entree_en_verification',
    bloque: (c) => c.templateType === 'iq' && !c.aLienVersPlanMetrologie,
    message: 'Lien vers le Plan de métrologie manquant.',
  },
  {
    code: 'U-03',
    pointDeControle: 'cloture_valide_en_interne',
    bloque: (c) => c.templateType === 'oq' && !c.aLienVersPlanMaintenance,
    message: 'Lien vers le Plan de maintenance manquant.',
  },
]

/**
 * Détermine les blocages de finalisation applicables, pour un
 * point de contrôle donné du cycle de vie d'une section.
 *
 * @requirement Blocages de finalisation (U-01/U-02/U-03)
 *
 * Asymétrie délibérée (justifiée par Annexe 15 §3.12) : le
 * Contexte procédé (U-01) et le Plan de métrologie (U-02) sont exigés à
 * l'**entrée** en vérification (finalisation), tandis que le Plan de
 * maintenance (U-03) n'est exigé qu'à la **clôture** (passage à
 * `valide_en_interne`) — pas avant, contrairement aux deux autres. Chaque
 * appel ne doit évaluer que le point de contrôle correspondant à la
 * transition en cours ; ne pas appeler ce module pour une transition qui
 * n'est ni l'une ni l'autre (ex. rejet, approbation intermédiaire).
 *
 * Implémenté via le Compliance Engine
 * généralisé (`evaluerReglesConformite`) — comportement strictement
 * identique à avant ce refactor.
 */
export function evaluerGardesFinalisation(
  contexte: ContexteGardeFinalisation,
  pointDeControle: PointDeControle,
): MessageBlocageFinalisation[] {
  const reglesApplicables = REGLES_GARDES_FINALISATION.filter(
    (regle) => regle.pointDeControle === pointDeControle,
  )
  return evaluerReglesConformite(contexte, reglesApplicables).map((regle) => regle.code)
}

/**
 * Valide le motif obligatoire du mécanisme de forçage d'un blocage de
 * finalisation ("chaque blocage propose un bouton Forcer avec
 * saisie d'un motif obligatoire").
 *
 * @requirement Mitigation du risque de forçage de blocage sans motif tracé
 */
export function motifDeForcageValide(motif: string | undefined): boolean {
  return motif !== undefined && motif.trim().length > 0
}
