import type { AssetNode } from '../domaine/types'

/**
 * Statut dérivé d'échéance de requalification périodique — calculé à
 * l'affichage à partir de `AssetNode.periodic_qualification`, jamais
 * persisté et jamais utilisé pour écrire `qualification_status` : même
 * discipline que `echeanceDepassee` dans `StructureSysteme.vue` (signal
 * visuel seul, aucune transition automatique fabriquée par l'outil sur une
 * donnée à impact GMP — voir le commentaire de
 * `useStructureSystemeStore.modifierQualificationNoeud`).
 */
export type StatutPeriodicite =
  'non_applicable' | 'echeance_non_renseignee' | 'en_retard' | 'proche_echeance' | 'a_jour'

export interface EvaluationPeriodicite {
  statut: StatutPeriodicite
  joursRestants: number | null
}

export const SEUIL_PROCHE_ECHEANCE_JOURS = 90

function joursEntre(depuis: string, jusqua: string): number {
  const MS_PAR_JOUR = 1000 * 60 * 60 * 24
  return Math.round((Date.parse(jusqua) - Date.parse(depuis)) / MS_PAR_JOUR)
}

/**
 * `aujourdHui` en paramètre (jamais `new Date()` lu à l'intérieur) — rend la
 * fonction pure et testable sans horloge système, cohérent avec le reste de
 * la logique métier de ce dossier (ex. `detectionCycle.ts`).
 */
export function evaluerPeriodicite(
  periodicQualification: AssetNode['periodic_qualification'],
  aujourdHui: string,
  seuilJours: number = SEUIL_PROCHE_ECHEANCE_JOURS,
): EvaluationPeriodicite {
  if (!periodicQualification.applicable) {
    return { statut: 'non_applicable', joursRestants: null }
  }
  if (!periodicQualification.deadline) {
    return { statut: 'echeance_non_renseignee', joursRestants: null }
  }

  const joursRestants = joursEntre(aujourdHui, periodicQualification.deadline)
  if (joursRestants < 0) return { statut: 'en_retard', joursRestants }
  if (joursRestants <= seuilJours) return { statut: 'proche_echeance', joursRestants }
  return { statut: 'a_jour', joursRestants }
}

const PRIORITE_STATUT: Record<StatutPeriodicite, number> = {
  en_retard: 0,
  proche_echeance: 1,
  echeance_non_renseignee: 2,
  a_jour: 3,
  non_applicable: 4,
}

/** Retard d'abord, puis échéance la plus proche — pour le tri d'un tableau de suivi. */
export function comparerPourAffichage(a: EvaluationPeriodicite, b: EvaluationPeriodicite): number {
  const diffPriorite = PRIORITE_STATUT[a.statut] - PRIORITE_STATUT[b.statut]
  if (diffPriorite !== 0) return diffPriorite
  return (a.joursRestants ?? Infinity) - (b.joursRestants ?? Infinity)
}
