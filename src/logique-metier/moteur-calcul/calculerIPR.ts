export interface EchelleIPR {
  min: number
  max: number
}

export type ChampIPR = 'severite' | 'occurrence' | 'detectabilite'

export type ResultatIPR =
  | { calcule: true; valeur: number }
  | { calcule: false; raison: 'valeurs_incompletes' }
  | { calcule: false; raison: 'valeur_hors_plage'; champ: ChampIPR }

const ECHELLE_PAR_DEFAUT: EchelleIPR = { min: 1, max: 5 }

/**
 * Calcule l'Indice de Priorité de Risque (IPR = Sévérité × Occurrence ×
 * Détectabilité), calcul réglementaire AMDEC/ICH Q9.
 *
 * @param severite Sévérité (S), ou `null` si non encore saisie.
 * @param occurrence Occurrence (O), ou `null` si non encore saisie.
 * @param detectabilite Détectabilité (D), ou `null` si non encore saisie.
 * @param echelle Plage autorisée pour S/O/D — dépend du gabarit (ex. [1,5] ou [1,10]), défaut [1,5].
 * @requirement Calcul de l'IPR (colonne calculée de gabarit)
 *
 * Fonction pure déterministe — jamais déléguée à l'IA générative.
 * Une valeur absente (`null`) ne calcule pas l'IPR mais n'est
 * jamais une erreur ("valeurs vides → IPR non calculé, aucune
 * erreur") — une saisie hors plage est en revanche rejetée explicitement,
 * jamais silencieusement bornée ("clampée").
 */
export function calculerIPR(
  severite: number | null,
  occurrence: number | null,
  detectabilite: number | null,
  echelle: EchelleIPR = ECHELLE_PAR_DEFAUT,
): ResultatIPR {
  if (severite === null || occurrence === null || detectabilite === null) {
    return { calcule: false, raison: 'valeurs_incompletes' }
  }

  const horsPlage =
    verifierPlage(severite, 'severite', echelle) ??
    verifierPlage(occurrence, 'occurrence', echelle) ??
    verifierPlage(detectabilite, 'detectabilite', echelle)
  if (horsPlage !== null) {
    return { calcule: false, raison: 'valeur_hors_plage', champ: horsPlage }
  }

  return { calcule: true, valeur: severite * occurrence * detectabilite }
}

function verifierPlage(valeur: number, champ: ChampIPR, echelle: EchelleIPR): ChampIPR | null {
  return valeur < echelle.min || valeur > echelle.max ? champ : null
}
