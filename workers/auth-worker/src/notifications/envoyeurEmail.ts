/**
 * Envoi d'email — interface indépendante du fournisseur réel (Resend),
 * pour pouvoir tester `routeur.ts` contre une implémentation en mémoire
 * sans jamais faire un appel réseau réel pendant les tests (même
 * discipline que `UtilisateursRepo`/`UtilisateursRepoMemoire`).
 */
export interface EmailAEnvoyer {
  destinataire: string
  sujet: string
  texte: string
}

export type ResultatEnvoiEmail = { ok: true } | { ok: false; erreur: string }

export interface EnvoyeurEmail {
  envoyer(email: EmailAEnvoyer): Promise<ResultatEnvoiEmail>
}

export class EnvoyeurEmailMemoire implements EnvoyeurEmail {
  readonly envoyes: EmailAEnvoyer[] = []

  async envoyer(email: EmailAEnvoyer): Promise<ResultatEnvoiEmail> {
    this.envoyes.push(email)
    return { ok: true }
  }
}
