import { traiterRequeteRelaisIA } from './relayHandler'
import { ClaudeProvider } from './fournisseurs/claudeProvider'

/**
 * Point d'entrée réel du Worker Cloudflare — ne contient que le câblage
 * secrets → fournisseur → handler, même pattern que
 * `workers/ocr-relay/src/index.ts` ; toute la logique testable vit dans
 * `relayHandler.ts`/`fournisseurs/*.ts`.
 *
 * Secrets/variables attendus (`wrangler secret put ...`/`[vars]`, jamais
 * commités) : voir `README.md`.
 */
export interface Env {
  ANTHROPIC_API_KEY: string
  RELAIS_JETON_ACCES: string
  CORS_ORIGIN_AUTORISE: string
  MODELE_CHAT_NORMATIF: string
  MODELE_AUDIT_SIMULE: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const fournisseur = new ClaudeProvider({ cleApi: env.ANTHROPIC_API_KEY })
    return traiterRequeteRelaisIA(request, fournisseur, {
      corsOrigin: env.CORS_ORIGIN_AUTORISE,
      jetonAcces: env.RELAIS_JETON_ACCES,
      modeleParMode: {
        chat_normatif: env.MODELE_CHAT_NORMATIF,
        audit_simule: env.MODELE_AUDIT_SIMULE,
      },
    })
  },
}
