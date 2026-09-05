/**
 * Contrat d'erreur typé du relais OCR (même principe que
 * `connecteurs/ia/erreurs.ts`) — jamais une exception générique pour un
 * cas prévu par la conception.
 */

export class TimeoutError extends Error {
  constructor(message = "Délai d'attente dépassé lors de l'appel au relais OCR.") {
    super(message)
    this.name = 'TimeoutError'
  }
}

export class QuotaExceededError extends Error {
  constructor(message = "Quota d'appels au relais OCR dépassé.") {
    super(message)
    this.name = 'QuotaExceededError'
  }
}

export class ReponseInvalideError extends Error {
  constructor(message = 'Réponse du relais OCR invalide ou de forme inattendue.') {
    super(message)
    this.name = 'ReponseInvalideError'
  }
}

export class IndisponibleError extends Error {
  constructor(message = 'Relais OCR indisponible.') {
    super(message)
    this.name = 'IndisponibleError'
  }
}
