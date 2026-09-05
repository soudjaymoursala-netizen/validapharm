import type { QualificationFiabiliteIA } from '../domaine/types'

/**
 * `ClientConfig.ai_provider_reliability_
 * qualification` est indexé par mode d'usage — ce module
 * continue d'opérer sur **une** qualification à la fois, l'appelant
 * sélectionnant déjà l'entrée du bon mode avant d'appeler ces fonctions.
 */
export type QualificationFiabilite = QualificationFiabiliteIA

/**
 * Garde-fou non négociable : l'activation d'un fournisseur pour un usage
 * réel est bloquée tant qu'aucune qualification de fiabilité n'a été
 * consignée (§4.4, message U-05).
 *
 * @requirement Mitigation du risque d'activation d'un fournisseur IA non qualifié
 */
export function peutActiverFournisseur(qualification: QualificationFiabilite | null): boolean {
  return qualification !== null
}

/**
 * Détecte une dérive de version de fournisseur entre la qualification de
 * fiabilité et le moteur réellement utilisé dans la session courante —
 * une qualification initiale ne se présume jamais valide indéfiniment
 * (dérive silencieuse possible côté fournisseur).
 *
 * @requirement Mitigation du risque de dérive de version de fournisseur non détectée
 *
 * Compare `moteur_version_qualifiee` (version du **moteur** au moment de
 * la qualification, v14) — jamais `qualification_test_set_version`
 * (version du jeu de test, une notion distincte confondue par erreur dans
 * une version antérieure du schéma). Absence de version des deux côtés
 * (fournisseur n'exposant aucun identifiant) → pas de dérive détectable,
 * jamais une fausse alerte.
 */
/**
 * Vérifie que les conditions de traitement des données du fournisseur
 * **actuellement configuré** ont bien été acquittées — jamais un accusé
 * générique valable pour n'importe quel fournisseur : changer de
 * fournisseur exige un nouvel accusé (v15).
 *
 * @requirement Mitigation du risque d'accusé de traitement des données non spécifique au fournisseur
 */
export function conditionsTraitementAcquittees(
  acquittement: { fournisseur: string; date: string } | null,
  fournisseurActuel: string,
): boolean {
  return acquittement !== null && acquittement.fournisseur === fournisseurActuel
}

export function deriveVersionDetectee(
  versionMoteurSession: string | null,
  qualification: QualificationFiabilite | null,
): boolean {
  if (qualification === null) return false
  if (versionMoteurSession === null || qualification.moteur_version_qualifiee === null) {
    return false
  }
  return versionMoteurSession !== qualification.moteur_version_qualifiee
}
