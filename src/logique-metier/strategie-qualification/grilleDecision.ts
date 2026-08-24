import type { NiveauCriticite } from './grilleCriticite'

/**
 * Table de décision (FS §4.6, URS-F-050) — mappe (criticité, complexité)
 * vers une conclusion parmi la liste fermée déjà fixée en FS. **Table de
 * décision fermée au sens FDS §5** : un calcul réglementaire versionné
 * indépendamment, jamais une extrapolation — toute combinaison non
 * couverte explicitement renvoie `autre`, jamais une valeur devinée.
 *
 * **PROVISOIRE** (voir avertissement dans `grilleCriticite.ts`) : le
 * mapping vers FAT/SAT/IQ/IQ+OQ/IQ+OQ+PQ est une première proposition,
 * jamais validée par un expert qualification réel.
 *
 * @requirement URS-F-050, URS-F-053, FDS §5
 */

export type NiveauComplexite = 'catalogue' | 'specifique'

export type ConclusionStrategieQualification =
  'aucun_impact' | 'revue_documentaire' | 'fat' | 'sat' | 'iq' | 'iq_oq' | 'iq_oq_pq' | 'autre'

/**
 * Version de la table elle-même (FDS §5 : "versionnée indépendamment,
 * même principe que `template_engine_version`") — à incrémenter à
 * chaque modification de la table, jamais silencieusement.
 */
export const VERSION_GRILLE_STRATEGIE_QUALIFICATION = '0.1.0-provisoire'

type CleTable = `${Exclude<NiveauCriticite, 'absence_criticite'>}_${NiveauComplexite}`

const TABLE_DECISION: Record<CleTable, ConclusionStrategieQualification> = {
  mineur_catalogue: 'revue_documentaire',
  mineur_specifique: 'fat',
  majeur_catalogue: 'sat',
  majeur_specifique: 'iq',
  critique_catalogue: 'iq_oq',
  critique_specifique: 'iq_oq_pq',
}

/**
 * Détermine la conclusion — jamais d'interpolation ni de calcul dérivé :
 * `absence_criticite` court-circuite systématiquement vers `aucun_impact`
 * (la complexité n'est volontairement pas évaluée dans ce cas, source
 * Sanofi §8.1.2 "la complexité n'est pas à évaluer en cas d'absence de
 * criticité") ; toute autre combinaison non explicitement présente dans
 * `TABLE_DECISION` renvoie `autre` plutôt que de planter ou d'extrapoler.
 */
export function determinerConclusion(
  criticite: NiveauCriticite,
  complexite: NiveauComplexite | null,
): ConclusionStrategieQualification {
  if (criticite === 'absence_criticite') return 'aucun_impact'
  if (complexite === null) return 'autre'
  const cle = `${criticite}_${complexite}` as CleTable
  return TABLE_DECISION[cle] ?? 'autre'
}

export const LIBELLES_CONCLUSION: Record<ConclusionStrategieQualification, string> = {
  aucun_impact: 'Aucun impact',
  revue_documentaire: 'Revue documentaire',
  fat: 'FAT',
  sat: 'SAT',
  iq: 'IQ',
  iq_oq: 'IQ+OQ',
  iq_oq_pq: 'IQ+OQ+PQ',
  autre: "Autre — à définir par l'expert",
}
