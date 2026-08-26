/**
 * Contrat d'erreur typé commun aux adaptateurs `ConnecteurDocumentaire`
 * (Phase 10) — jamais une exception générique pour un cas prévu.
 */

/** Authentification refusée par le système documentaire externe. */
export class AuthentificationError extends Error {
  constructor(message = 'Authentification refusée par le système documentaire externe.') {
    super(message)
    this.name = 'AuthentificationError'
  }
}

/** Le système documentaire externe est indisponible ou a répondu en erreur. */
export class IndisponibleError extends Error {
  constructor(message = 'Système documentaire externe indisponible.') {
    super(message)
    this.name = 'IndisponibleError'
  }
}

/** Document introuvable dans le système documentaire externe. */
export class DocumentIntrouvableError extends Error {
  constructor(message = 'Document introuvable dans le système documentaire externe.') {
    super(message)
    this.name = 'DocumentIntrouvableError'
  }
}

/** Opération non supportée par cet adaptateur (ex. lecture sur un connecteur d'écriture seule). */
export class OperationNonSupporteeError extends Error {
  constructor(message = 'Opération non supportée par ce connecteur.') {
    super(message)
    this.name = 'OperationNonSupporteeError'
  }
}

/** Dépassement du délai d'attente réseau. */
export class TimeoutError extends Error {
  constructor(
    message = "Délai d'attente dépassé lors de l'appel au système documentaire externe.",
  ) {
    super(message)
    this.name = 'TimeoutError'
  }
}
