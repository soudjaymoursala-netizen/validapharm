/**
 * Erreurs typées du client du Worker d'authentification — jamais
 * une exception générique. Réservées aux échecs de **connectivité**
 * (réseau, délai, réponse illisible) : les échecs métier attendus
 * (identifiants invalides, justification manquante, rôle insuffisant...)
 * sont renvoyés comme un résultat typé (`ResultatApi`), jamais levés — même
 * discipline que `archiverClient`/`modifierClient` (unions `{ erreur }`).
 */

export class TimeoutAuthError extends Error {
  constructor(message = "Délai d'attente dépassé en contactant le Worker d'authentification.") {
    super(message)
    this.name = 'TimeoutAuthError'
  }
}

export class IndisponibleAuthError extends Error {
  constructor(message = "Worker d'authentification injoignable.") {
    super(message)
    this.name = 'IndisponibleAuthError'
  }
}

export class ReponseInvalideAuthError extends Error {
  constructor(message = "Réponse du Worker d'authentification invalide ou de forme inattendue.") {
    super(message)
    this.name = 'ReponseInvalideAuthError'
  }
}
