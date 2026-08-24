/**
 * Contrat d'erreur typé du connecteur GitHub (SDS §5) — jamais une
 * exception générique pour un cas prévu par la conception.
 */

/** HTTP 409 sur une écriture : le SHA distant a changé depuis la dernière lecture (AR-R-34). */
export class ConflitShaError extends Error {
  constructor(message = 'Le contenu distant a changé depuis la dernière lecture (SHA différent).') {
    super(message)
    this.name = 'ConflitShaError'
  }
}

/** Dépassement du délai d'attente réseau. */
export class TimeoutError extends Error {
  constructor(message = "Délai d'attente dépassé lors de l'appel à l'API GitHub.") {
    super(message)
    this.name = 'TimeoutError'
  }
}

/** HTTP 401 : jeton absent, invalide ou expiré. */
export class AuthentificationError extends Error {
  constructor(message = "Authentification refusée par l'API GitHub (jeton invalide ou expiré).") {
    super(message)
    this.name = 'AuthentificationError'
  }
}

/** HTTP 403 hors quota épuisé : jeton authentifié mais sans les permissions requises. */
export class PorteeInsuffisanteError extends Error {
  constructor(
    message = "Le jeton n'a pas la portée nécessaire pour cette opération (dépôt/branche non accessible).",
  ) {
    super(message)
    this.name = 'PorteeInsuffisanteError'
  }
}

/** HTTP 403 avec `X-RateLimit-Remaining: 0` : quota d'appels API épuisé (AR-R-63). */
export class QuotaApiDepasseError extends Error {
  constructor(
    message: string,
    /** Horodatage de réinitialisation du quota, si connu (en-tête `X-RateLimit-Reset`). */
    public readonly reinitialisationA: Date | null,
  ) {
    super(message)
    this.name = 'QuotaApiDepasseError'
  }
}
