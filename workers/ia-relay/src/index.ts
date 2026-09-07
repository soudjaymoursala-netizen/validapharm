import { traiterRequeteRelaisIA } from './relayHandler'
import { OpenaiProvider } from './fournisseurs/openaiProvider'

/**
 * Point d'entrée réel du Worker Cloudflare — ne contient que le câblage
 * secrets → fournisseur → handler, même pattern que
 * `workers/ocr-relay/src/index.ts` ; toute la logique testable vit dans
 * `relayHandler.ts`/`fournisseurs/*.ts`.
 *
 * Fournisseur : ChatGPT (OpenAI), choix explicite de l'utilisateur
 * (07/09/2026) — remplace `ClaudeProvider` (Anthropic), conservé dans le
 * dépôt et toujours testé pour un retour en arrière ou un usage ultérieur
 * sans reconstruction. Basculer entre les deux ne demande de changer que
 * les deux lignes ci-dessous (import + construction) — jamais
 * `relayHandler.ts`, jamais le contrat côté PWA.
 *
 * Secrets/variables attendus (`wrangler secret put ...`/`[vars]`, jamais
 * commités) : voir `README.md`.
 */
export interface Env {
  OPENAI_API_KEY: string
  RELAIS_JETON_ACCES: string
  CORS_ORIGIN_AUTORISE: string
  MODELE_CHAT_NORMATIF: string
  MODELE_AUDIT_SIMULE: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const fournisseur = new OpenaiProvider({ cleApi: env.OPENAI_API_KEY })
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
