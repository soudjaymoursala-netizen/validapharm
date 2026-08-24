/**
 * Contrat d'erreur typé du connecteur Drive (SDS §5bis) — jamais une
 * exception générique pour un cas prévu par la conception.
 */

/** HTTP 401 : jeton absent, invalide ou expiré. */
export class AuthentificationError extends Error {
  constructor(message = "Authentification refusée par l'API Drive (jeton invalide ou expiré).") {
    super(message)
    this.name = 'AuthentificationError'
  }
}

/** HTTP 403 avec un motif de quota de stockage Drive dépassé. */
export class QuotaDepasseError extends Error {
  constructor(message = "Quota de stockage Google Drive de l'utilisateur dépassé.") {
    super(message)
    this.name = 'QuotaDepasseError'
  }
}

/** Dépassement du délai d'attente réseau. */
export class TimeoutError extends Error {
  constructor(message = "Délai d'attente dépassé lors de l'appel à l'API Drive.") {
    super(message)
    this.name = 'TimeoutError'
  }
}
