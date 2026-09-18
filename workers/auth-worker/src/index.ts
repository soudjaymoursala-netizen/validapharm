import type { D1Database } from './d1Types'
import { ResendEnvoyeurEmail } from './notifications/resendEnvoyeurEmail'
import { D1AcfcRepo } from './repos/d1/d1AcfcRepo'
import { D1AuditRepo } from './repos/d1/d1AuditRepo'
import { D1ClientsRepo } from './repos/d1/d1ClientsRepo'
import { D1ContentPlanRepo } from './repos/d1/d1ContentPlanRepo'
import { D1CsvAssessmentRepo } from './repos/d1/d1CsvAssessmentRepo'
import { D1DocumentsNormatifsRepo } from './repos/d1/d1DocumentsNormatifsRepo'
import { D1EvidenceRepo } from './repos/d1/d1EvidenceRepo'
import { D1ExecutionRepo } from './repos/d1/d1ExecutionRepo'
import { D1ImpactAssessmentRepo } from './repos/d1/d1ImpactAssessmentRepo'
import { D1IntegrationRepo } from './repos/d1/d1IntegrationRepo'
import { D1KnowledgeEngineRepo } from './repos/d1/d1KnowledgeEngineRepo'
import { D1MissionRepo } from './repos/d1/d1MissionRepo'
import { D1OrganisationRepo } from './repos/d1/d1OrganisationRepo'
import { D1ParametersRepo } from './repos/d1/d1ParametersRepo'
import { D1ParametresInstallationRepo } from './repos/d1/d1ParametresInstallationRepo'
import { D1ProjectDocumentsRepo } from './repos/d1/d1ProjectDocumentsRepo'
import { D1ProcessContextRepo } from './repos/d1/d1ProcessContextRepo'
import { D1ProjectsRepo } from './repos/d1/d1ProjectsRepo'
import { D1QualityEventRepo } from './repos/d1/d1QualityEventRepo'
import { D1RiskAssessmentRepo } from './repos/d1/d1RiskAssessmentRepo'
import { D1SectionsRepo } from './repos/d1/d1SectionsRepo'
import { D1StructureSystemeRepo } from './repos/d1/d1StructureSystemeRepo'
import { D1TestDefinitionRepo } from './repos/d1/d1TestDefinitionRepo'
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
  /** Identifiants OAuth Google (Drive normes, jeton de rafraîchissement — voir README.md) — vides tant que non posés, `Contexte` gère alors une fonctionnalité désactivée plutôt qu'une erreur. */
  GOOGLE_OAUTH_CLIENT_ID: string
  GOOGLE_OAUTH_CLIENT_SECRET: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return routerRequete(request, {
      utilisateursRepo: new D1UtilisateursRepo(env.DB),
      clientsRepo: new D1ClientsRepo(env.DB),
      parametresInstallationRepo: new D1ParametresInstallationRepo(env.DB),
      documentsNormatifsRepo: new D1DocumentsNormatifsRepo(env.DB),
      stockageBinaireRepo: new R2StockageBinaireRepo(env.BUCKET),
      structureSystemeRepo: new D1StructureSystemeRepo(env.DB),
      organisationRepo: new D1OrganisationRepo(env.DB),
      projectsRepo: new D1ProjectsRepo(env.DB),
      sectionsRepo: new D1SectionsRepo(env.DB),
      projectDocumentsRepo: new D1ProjectDocumentsRepo(env.DB),
      acfcRepo: new D1AcfcRepo(env.DB),
      parametersRepo: new D1ParametersRepo(env.DB),
      impactAssessmentRepo: new D1ImpactAssessmentRepo(env.DB),
      csvAssessmentRepo: new D1CsvAssessmentRepo(env.DB),
      riskAssessmentRepo: new D1RiskAssessmentRepo(env.DB),
      processContextRepo: new D1ProcessContextRepo(env.DB),
      qualityEventRepo: new D1QualityEventRepo(env.DB),
      testDefinitionRepo: new D1TestDefinitionRepo(env.DB),
      executionRepo: new D1ExecutionRepo(env.DB),
      evidenceRepo: new D1EvidenceRepo(env.DB),
      knowledgeEngineRepo: new D1KnowledgeEngineRepo(env.DB),
      contentPlanRepo: new D1ContentPlanRepo(env.DB),
      integrationRepo: new D1IntegrationRepo(env.DB),
      missionRepo: new D1MissionRepo(env.DB),
      auditRepo: new D1AuditRepo(env.DB),
      secretJwt: env.JWT_SECRET,
      jetonBootstrap: env.BOOTSTRAP_TOKEN,
      corsOrigin: env.CORS_ORIGIN_AUTORISE,
      envoyeurEmail: new ResendEnvoyeurEmail(env.RESEND_API_KEY, env.RESEND_FROM),
      urlApplication: env.APP_URL,
      googleOAuthClientId: env.GOOGLE_OAUTH_CLIENT_ID,
      googleOAuthClientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
    })
  },
}
