import type { EmailAEnvoyer, EnvoyeurEmail, ResultatEnvoiEmail } from './envoyeurEmail'

/**
 * Envoi réel via l'API HTTP de Resend (https://resend.com/docs/api-reference/emails/send-email)
 * — un simple `fetch`, aucune dépendance ajoutée. `apiKey` est le secret
 * `RESEND_API_KEY` (`wrangler secret put`, jamais commité) ; `expediteur`
 * doit correspondre à un domaine vérifié côté Resend (ou
 * `onboarding@resend.dev` en attendant qu'un domaine réel soit vérifié —
 * fonctionne alors uniquement vers l'adresse du compte Resend lui-même).
 */
export class ResendEnvoyeurEmail implements EnvoyeurEmail {
  constructor(
    private readonly apiKey: string,
    private readonly expediteur: string,
  ) {}

  async envoyer(email: EmailAEnvoyer): Promise<ResultatEnvoiEmail> {
    try {
      const reponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.expediteur,
          to: [email.destinataire],
          subject: email.sujet,
          text: email.texte,
        }),
      })
      if (!reponse.ok) {
        return { ok: false, erreur: `resend_http_${reponse.status}` }
      }
      return { ok: true }
    } catch {
      return { ok: false, erreur: 'resend_injoignable' }
    }
  }
}
