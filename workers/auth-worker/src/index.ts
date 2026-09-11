import type { D1Database } from './d1Types'
import { ResendEnvoyeurEmail } from './notifications/resendEnvoyeurEmail'
import { D1AuditRepo } from './repos/d1/d1AuditRepo'
import { D1ClientsRepo } from './repos/d1/d1ClientsRepo'
import { D1DocumentsNormatifsRepo } from './repos/d1/d1DocumentsNormatifsRepo'
import { D1ParametresInstallationRepo } from './repos/d1/d1ParametresInstallationRepo'
import { D1UtilisateursRepo } from './repos/d1/d1UtilisateursRepo'
import { R2StockageBinaireRepo } from './repos/r2/r2StockageBinaireRepo'
import { routerRequete } from './routeur'
import type { R2Bucket } from './r2Types'

/**
 * Point d'entrée réel du Worker — ne fait que câbler
 * secrets/D1/R2 → dépôts → routeur ; toute la logique testable vit dans
 * `routeur.ts` (même principe que `workers/ocr-relay/src/index.ts`).
 *
 * Secrets attendus (`wrangler secret put ...`, jamais commités) : voir
 * `README.md`. `RESEND_FROM`/`APP_URL` sont de simples variables
 * (`[vars]` de `wrangler.toml`, non secrètes).
 */
export interface Env {
  DB: D1Database
  BUCKET: R2Bucket
  JWT_SECRET: string
  BOOTSTRAP_TOKEN: string
  CORS_ORIGIN_AUTORISE: string
  RESEND_API_KEY: string
  RESEND_FROM: string
  APP_URL: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return routerRequete(request, {
      utilisateursRepo: new D1UtilisateursRepo(env.DB),
      clientsRepo: new D1ClientsRepo(env.DB),
      parametresInstallationRepo: new D1ParametresInstallationRepo(env.DB),
      documentsNormatifsRepo: new D1DocumentsNormatifsRepo(env.DB),
      stockageBinaireRepo: new R2StockageBinaireRepo(env.BUCKET),
      auditRepo: new D1AuditRepo(env.DB),
      secretJwt: env.JWT_SECRET,
      jetonBootstrap: env.BOOTSTRAP_TOKEN,
      corsOrigin: env.CORS_ORIGIN_AUTORISE,
      envoyeurEmail: new ResendEnvoyeurEmail(env.RESEND_API_KEY, env.RESEND_FROM),
      urlApplication: env.APP_URL,
    })
  },
}
