import type { D1Database } from './d1Types'
import { D1AuditRepo } from './repos/d1/d1AuditRepo'
import { D1ClientsRepo } from './repos/d1/d1ClientsRepo'
import { D1UtilisateursRepo } from './repos/d1/d1UtilisateursRepo'
import { routerRequete } from './routeur'

/**
 * Point d'entrée réel du Worker (TD-046) — ne fait que câbler
 * secrets/D1 → dépôts → routeur ; toute la logique testable vit dans
 * `routeur.ts` (même principe que `workers/ocr-relay/src/index.ts`).
 *
 * Secrets attendus (`wrangler secret put ...`, jamais commités) : voir
 * `README.md`.
 */
export interface Env {
  DB: D1Database
  JWT_SECRET: string
  BOOTSTRAP_TOKEN: string
  CORS_ORIGIN_AUTORISE: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return routerRequete(request, {
      utilisateursRepo: new D1UtilisateursRepo(env.DB),
      clientsRepo: new D1ClientsRepo(env.DB),
      auditRepo: new D1AuditRepo(env.DB),
      secretJwt: env.JWT_SECRET,
      jetonBootstrap: env.BOOTSTRAP_TOKEN,
      corsOrigin: env.CORS_ORIGIN_AUTORISE,
    })
  },
}
