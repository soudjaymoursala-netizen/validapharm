/**
 * Contrat d'erreur typé du routeur IA — jamais une exception
 * générique pour un cas prévu par la conception.
 *
 * @requirement Contrat d'erreur du routeur IA ("ajouté v02 — revue de conception, E5")
 *
 * Noms repris tels quels du texte de la conception interne (mélange français/anglais
 * assumé par la spec elle-même) — ne pas les franciser par cohérence
 * cosmétique avec les autres connecteurs, un auditeur qui compare le code
 * à la documentation interne doit retrouver exactement ces noms.
 */

/** Délai d'attente réseau dépassé — déclenche la bascule automatique vers le modèle local. */
export class TimeoutError extends Error {
  constructor(message = "Délai d'attente dépassé lors de l'appel au fournisseur IA.") {
    super(message)
    this.name = 'TimeoutError'
  }
}

/** Quota du fournisseur dépassé — jamais confondu avec une indisponibilité, ne déclenche jamais de bascule automatique. */
export class QuotaExceededError extends Error {
  constructor(message = "Quota d'appels au fournisseur IA dépassé.") {
    super(message)
    this.name = 'QuotaExceededError'
  }
}

/** Réponse du fournisseur illisible ou de forme inattendue. */
export class ReponseInvalideError extends Error {
  constructor(message = 'Réponse du fournisseur IA invalide ou de forme inattendue.') {
    super(message)
    this.name = 'ReponseInvalideError'
  }
}

/** Fournisseur injoignable (panne, réseau) — déclenche la bascule automatique vers le modèle local. */
export class IndisponibleError extends Error {
  constructor(message = 'Fournisseur IA indisponible.') {
    super(message)
    this.name = 'IndisponibleError'
  }
}
