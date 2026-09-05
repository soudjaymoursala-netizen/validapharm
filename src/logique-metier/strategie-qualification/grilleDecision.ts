/**
 * Table de décision (§4.6) — mappe (criticité ACFC binaire,
 * complexité) vers une conclusion parmi la liste fermée déjà fixée.
 * **Table de décision fermée** : un calcul réglementaire
 * versionné indépendamment, jamais une extrapolation — toute combinaison
 * non couverte explicitement renvoie `autre`, jamais une valeur devinée.
 *
 * **Adaptée le 25/08/2026** : la criticité d'entrée est
 * désormais le verdict binaire réel de l'ACFC (`evaluerVerdictACFC.ts` —
 * "critique"/"non_critique", confirmé sur 4 sources indépendantes),
 * remplaçant l'ancien modèle à 4 niveaux (`critique/majeur/mineur/
 * absence_criticite`) qui provenait d'une source générique distincte de
 * l'ACFC et n'a jamais été le modèle réel de cette méthode.
 *
 * **PROVISOIRE** : le mapping vers FAT/SAT/IQ/IQ+OQ/IQ+OQ+PQ reste une
 * première proposition, jamais validée par un expert qualification réel.
 *
 * @requirement Table de décision de stratégie de qualification
 */

export type NiveauComplexite = 'catalogue' | 'specifique'

export type ConclusionStrategieQualification =
  'aucun_impact' | 'revue_documentaire' | 'fat' | 'sat' | 'iq' | 'iq_oq' | 'iq_oq_pq' | 'autre'

/**
 * Version de la table elle-même ("versionnée indépendamment,
 * même principe que `template_engine_version`") — à incrémenter à
 * chaque modification de la table, jamais silencieusement.
 */
export const VERSION_GRILLE_STRATEGIE_QUALIFICATION = '0.2.0-provisoire'

type CleTable = `${'critique' | 'non_critique'}_${NiveauComplexite}`

const TABLE_DECISION: Record<CleTable, ConclusionStrategieQualification> = {
  non_critique_catalogue: 'revue_documentaire',
  non_critique_specifique: 'fat',
  critique_catalogue: 'iq_oq',
  critique_specifique: 'iq_oq_pq',
}

/**
 * Détermine la conclusion — jamais d'interpolation ni de calcul dérivé.
 * Toute combinaison non explicitement présente dans `TABLE_DECISION`
 * renvoie `autre` plutôt que de planter ou d'extrapoler.
 */
export function determinerConclusion(
  criticite: 'critique' | 'non_critique',
  complexite: NiveauComplexite | null,
): ConclusionStrategieQualification {
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
