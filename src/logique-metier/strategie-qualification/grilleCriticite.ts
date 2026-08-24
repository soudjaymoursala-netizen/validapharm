/**
 * Grille d'évaluation de la criticité (FS §4.6, URS-F-050) — **provisoire,
 * n'a jamais été validée par un expert qualification réel** : constituée
 * à partir de deux sources documentées avec l'utilisateur (24/08/2026) —
 * les 4 niveaux de criticité et la règle d'agrégation "niveau le plus
 * élevé" d'une procédure interne Sanofi consultée pour cette conception
 * (structure générale réutilisable, items eux-mêmes généralisés — ceux de
 * la source étaient spécifiques à un procédé de fabrication vaccin et non
 * transposables tels quels), et le principe d'approche par le risque
 * confirmé par le guide public PIC/S PI 006-3-2 (§2.8.1/§4.1.5, basé sur
 * l'Annexe 15 PIC/S). AUCUN usage réel avant revue par un expert
 * qualification du client.
 *
 * @requirement URS-F-050, FDS §5 ("table de décision fermée")
 */

export type NiveauCriticite = 'critique' | 'majeur' | 'mineur' | 'absence_criticite'

const RANG_CRITICITE: Record<NiveauCriticite, number> = {
  absence_criticite: 0,
  mineur: 1,
  majeur: 2,
  critique: 3,
}

export interface ItemCriticite {
  id: string
  libelle: string
  niveau: NiveauCriticite
}

/**
 * Grille provisoire (voir avertissement en tête de fichier). Chaque item
 * est une situation d'usage du système ; l'utilisateur coche celles qui
 * s'appliquent, la criticité retenue est la plus élevée parmi les items
 * cochés (règle reprise de la source Sanofi, § "niveau le plus élevé
 * déterminé").
 */
export const CRITERES_CRITICITE_V1: readonly ItemCriticite[] = [
  {
    id: 'contact-direct-produit',
    libelle: 'Contact direct avec le produit ou son environnement immédiat',
    niveau: 'critique',
  },
  {
    id: 'decision-conformite',
    libelle: 'Résultat utilisé pour une décision de conformité produit (libération/rejet)',
    niveau: 'critique',
  },
  {
    id: 'parametre-pilotage-critique',
    libelle: 'Paramètre de pilotage critique du procédé de fabrication',
    niveau: 'majeur',
  },
  {
    id: 'nettoyage-surfaces-contact',
    libelle: 'Nettoyage/décontamination de surfaces en contact avec le produit',
    niveau: 'majeur',
  },
  {
    id: 'utilite-contact-produit',
    libelle: 'Utilité à usage pharmaceutique en contact avec le produit (eau, gaz, vapeur)',
    niveau: 'majeur',
  },
  {
    id: 'environnement-reglemente',
    libelle: 'Environnement réglementé sans contact produit direct (locaux, HVAC, zone classée)',
    niveau: 'mineur',
  },
  {
    id: 'support-fonction-critique',
    libelle: 'Support à une fonction critique, sans mesure ni pilotage direct',
    niveau: 'mineur',
  },
  {
    id: 'sans-contact-sans-mesure',
    libelle:
      'Sans contact produit, sans chaîne de mesure, sans paramètre de pilotage ayant un impact sur la qualité du produit',
    niveau: 'absence_criticite',
  },
] as const

/**
 * Niveau le plus élevé parmi les niveaux fournis — jamais une moyenne
 * (règle non négociable, source Sanofi §8.1.1 "niveau le plus élevé
 * déterminé"). Aucun item coché → `absence_criticite` (par défaut,
 * cohérent avec le formulaire source : "aucun impact" est l'état neutre).
 */
export function niveauLePlusEleve(niveaux: readonly NiveauCriticite[]): NiveauCriticite {
  if (niveaux.length === 0) return 'absence_criticite'
  return niveaux.reduce((plusHaut, n) =>
    RANG_CRITICITE[n] > RANG_CRITICITE[plusHaut] ? n : plusHaut,
  )
}
