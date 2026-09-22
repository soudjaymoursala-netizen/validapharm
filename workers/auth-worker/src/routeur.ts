import { signerJwt, verifierJwt } from './jwt'
import { genererSel, hacherMotDePasse, verifierMotDePasse } from './motDePasse'
import type { EnvoyeurEmail } from './notifications/envoyeurEmail'
import type {
  ACFCRepo,
  EvaluationACFCEnregistree,
  MethodProfileACFCEnregistre,
  QuestionACFCEnregistree,
} from './repos/acfcRepo'
import type { AuditRepo } from './repos/auditRepo'
import type { ClientsRepo } from './repos/clientsRepo'
import type { ContentPlanEnregistre, ContentPlanRepo } from './repos/contentPlanRepo'
import type {
  ContextSnapshotEnregistre,
  ContextSnapshotItemEnregistre,
  ContextSnapshotRepo,
} from './repos/contextSnapshotRepo'
import type {
  CSVAssessmentRepo,
  EvaluationCSVAssessmentEnregistree,
} from './repos/csvAssessmentRepo'
import type {
  DocumentNormatifEnregistre,
  DocumentsNormatifsRepo,
} from './repos/documentsNormatifsRepo'
import type {
  EvidenceEnregistree,
  EvidenceLocationEnregistree,
  EvidenceRepo,
  ProvenanceLinkEnregistre,
} from './repos/evidenceRepo'
import type {
  ExecutionEnregistree,
  ExecutionEventEnregistree,
  ExecutionRepo,
  ExecutionStepEnregistree,
  MeasurementEnregistree,
} from './repos/executionRepo'
import type {
  EvaluationImpactAssessmentEnregistree,
  ImpactAssessmentRepo,
  MethodProfileImpactAssessmentEnregistre,
  QuestionImpactAssessmentEnregistree,
} from './repos/impactAssessmentRepo'
import type {
  ConnectorEnregistre,
  ExternalReferenceEnregistre,
  IntegrationRepo,
  SyncJobEnregistre,
} from './repos/integrationRepo'
import type {
  ConfirmationEnregistree,
  ConflictEnregistre,
  ExtractionEnregistree,
  ExtractionItemEnregistre,
  KnowledgeEngineRepo,
  KnowledgeItemEnregistre,
  KnowledgeRelationEnregistree,
  SourceEnregistree,
  SourceLocationEnregistree,
  SourceVersionEnregistree,
} from './repos/knowledgeEngineRepo'
import type {
  ActivityEnregistree,
  AssociationMissionQualityEventEnregistree,
  DependencyEnregistree,
  MissionEnregistree,
  MissionRepo,
} from './repos/missionRepo'
import type {
  OrganisationRepo,
  OrganizationEnregistree,
  WorkspaceEnregistre,
} from './repos/organisationRepo'
import type {
  AIConfigurationEnregistree,
  AIRequestEnregistree,
  AIResponseEnregistree,
  CitationAIResponseEnregistree,
  ReasoningEngineRepo,
} from './repos/reasoningEngineRepo'
import type {
  CPPEnregistre,
  CQAEnregistre,
  ClassificationCriticiteParametreEnregistree,
  ParameterEnregistre,
  ParametersRepo,
} from './repos/parametersRepo'
import type {
  ParametresInstallationRepo,
  ValeurParametreInstallation,
} from './repos/parametresInstallationRepo'
import type {
  ProcedureEnregistree,
  ProcedureRepo,
  ProcedureStepEnregistree,
} from './repos/procedureRepo'
import type {
  GabaritExportClientEnregistre,
  GabaritExportClientRepo,
} from './repos/gabaritExportClientRepo'
import type { AiChatSessionLogEnregistre, AiChatSessionLogRepo } from './repos/aiChatSessionLogRepo'
import type { ConnexionDriveEnregistree, ConnexionDriveRepo } from './repos/connexionDriveRepo'
import type { EtatMiroirDriveEnregistre, EtatMiroirDriveRepo } from './repos/etatMiroirDriveRepo'
import type {
  AssociationFonctionAssetNodeEnregistree,
  AssociationFonctionProcessEnregistree,
  FonctionActifEnregistree,
  ManufacturingContextEnregistre,
  ProcessContextRepo,
  ProcessEnregistre,
} from './repos/processContextRepo'
import type { ProjectDocumentEnregistre, ProjectDocumentsRepo } from './repos/projectDocumentsRepo'
import type {
  QualityEventEnregistre,
  QualityEventRepo,
  ReferenceQualityEventEnregistree,
} from './repos/qualityEventRepo'
import type {
  LienProjetEnregistre,
  PartageProjetEnregistre,
  PhaseProjetEnregistree,
  ProjectEnregistre,
  ProjectsRepo,
} from './repos/projectsRepo'
import type {
  MethodProfileRiskAssessmentEnregistre,
  RiskAssessmentEnregistre,
  RiskAssessmentRepo,
} from './repos/riskAssessmentRepo'
import type { SectionEnregistree, SectionsRepo } from './repos/sectionsRepo'
import type { StockageBinaireRepo } from './repos/stockageBinaireRepo'
import type {
  CouvertureEnregistree,
  RequirementEnregistre,
  TestCandidateEnregistre,
  TestDefinitionRepo,
  TestEnregistre,
  TestObjectiveEnregistre,
} from './repos/testDefinitionRepo'
import type {
  AssetHierarchySchemaEnregistre,
  AssetNodeEnregistre,
  NiveauHierarchieEnregistre,
  RelationTechniqueEnregistree,
  StructureSystemeRepo,
} from './repos/structureSystemeRepo'
import type { UtilisateursRepo } from './repos/utilisateursRepo'
import type { ClientEnregistre, EntreeAudit, Role, UtilisateurEnregistre } from './types'
import { versUtilisateurPublic } from './types'

/** Seules clés de paramètre d'installation reconnues — jamais une clé arbitraire fournie par l'appelant. */
const CLES_PARAMETRES_INSTALLATION = ['github', 'relais-ia', 'drive-normes'] as const
type CleParametreInstallation = (typeof CLES_PARAMETRES_INSTALLATION)[number]

function estCleParametreInstallationValide(cle: string): cle is CleParametreInstallation {
  return (CLES_PARAMETRES_INSTALLATION as readonly string[]).includes(cle)
}

export interface Contexte {
  utilisateursRepo: UtilisateursRepo
  clientsRepo: ClientsRepo
  parametresInstallationRepo: ParametresInstallationRepo
  documentsNormatifsRepo: DocumentsNormatifsRepo
  stockageBinaireRepo: StockageBinaireRepo
  structureSystemeRepo: StructureSystemeRepo
  organisationRepo: OrganisationRepo
  projectsRepo: ProjectsRepo
  sectionsRepo: SectionsRepo
  projectDocumentsRepo: ProjectDocumentsRepo
  acfcRepo: ACFCRepo
  parametersRepo: ParametersRepo
  impactAssessmentRepo: ImpactAssessmentRepo
  csvAssessmentRepo: CSVAssessmentRepo
  riskAssessmentRepo: RiskAssessmentRepo
  processContextRepo: ProcessContextRepo
  qualityEventRepo: QualityEventRepo
  testDefinitionRepo: TestDefinitionRepo
  executionRepo: ExecutionRepo
  evidenceRepo: EvidenceRepo
  knowledgeEngineRepo: KnowledgeEngineRepo
  contentPlanRepo: ContentPlanRepo
  integrationRepo: IntegrationRepo
  missionRepo: MissionRepo
  contextSnapshotRepo: ContextSnapshotRepo
  reasoningEngineRepo: ReasoningEngineRepo
  procedureRepo: ProcedureRepo
  gabaritExportClientRepo: GabaritExportClientRepo
  aiChatSessionLogRepo: AiChatSessionLogRepo
  connexionDriveRepo: ConnexionDriveRepo
  etatMiroirDriveRepo: EtatMiroirDriveRepo
  auditRepo: AuditRepo
  secretJwt: string
  jetonBootstrap: string
  corsOrigin: string
  envoyeurEmail: EnvoyeurEmail
  urlApplication: string
  /** Identifiants OAuth Google (Drive normes) — vides tant que l'utilisateur n'a pas créé son propre client OAuth dans Google Cloud Console ; `gererDemarrerOAuthDrive`/`gererRafraichirJetonDrive` répondent alors `oauth_google_non_configure` plutôt que d'échouer silencieusement. */
  googleOAuthClientId: string
  googleOAuthClientSecret: string
}

/** Seules catégories reconnues pour un document normatif — jamais une valeur arbitraire fournie par l'appelant. */
const CATEGORIES_DOCUMENT_NORMATIF = [
  'iso',
  'eudralex',
  'pics',
  'astm',
  'ispe',
  'gmp',
  'cqv',
  'csv',
  'autre',
] as const

/** Seules sources reconnues pour un document normatif. */
const SOURCES_DOCUMENT_NORMATIF = ['televersement', 'github', 'drive'] as const

function cleTexteDocument(id: string): string {
  return `documents/${id}/texte.txt`
}

function cleContenuDocument(id: string): string {
  return `documents/${id}/contenu`
}

function cleTexteDocumentProjet(id: string): string {
  return `project-documents/${id}/texte.txt`
}

function cleContenuDocumentProjet(id: string): string {
  return `project-documents/${id}/contenu`
}

const LONGUEUR_MIN_MOT_DE_PASSE = 8
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function entetesCors(corsOrigin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

function reponseJson(corps: unknown, status: number, entetes: Record<string, string>): Response {
  return new Response(JSON.stringify(corps), {
    status,
    headers: { ...entetes, 'Content-Type': 'application/json' },
  })
}

function genererId(): string {
  return crypto.randomUUID()
}

function horodatage(): string {
  return new Date().toISOString()
}

async function lireCorpsJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T
  } catch {
    return null
  }
}

async function authentifier(
  request: Request,
  ctx: Contexte,
): Promise<UtilisateurEnregistre | null> {
  const entete = request.headers.get('Authorization')
  if (!entete?.startsWith('Bearer ')) return null
  const jeton = entete.slice('Bearer '.length)
  const payload = await verifierJwt(jeton, ctx.secretJwt)
  if (!payload) return null
  const utilisateur = await ctx.utilisateursRepo.parId(payload.sub)
  if (!utilisateur || utilisateur.statut !== 'actif') return null
  return utilisateur
}

async function consignerAudit(
  ctx: Contexte,
  acteur: UtilisateurEnregistre,
  action: string,
  targetType: string,
  targetId: string,
  justification: string | null,
): Promise<void> {
  const entree: EntreeAudit = {
    id: genererId(),
    acteurUserId: acteur.id,
    acteurEmail: acteur.email,
    action,
    targetType,
    targetId,
    justification,
    timestamp: horodatage(),
  }
  await ctx.auditRepo.consigner(entree)
}

/**
 * Routeur HTTP du Worker d'authentification — logique pure,
 * indépendante du binding D1 réel (mêmes principes que `ocrHandler.ts` de
 * `workers/ocr-relay`) : `index.ts` ne fait que construire les dépôts D1
 * et les secrets, puis déléguer ici. Entièrement testable contre
 * `UtilisateursRepoMemoire`/`ClientsRepoMemoire`/`AuditRepoMemoire`.
 */
export async function routerRequete(request: Request, ctx: Contexte): Promise<Response> {
  const entetes = entetesCors(ctx.corsOrigin)

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: entetes })
  }

  const url = new URL(request.url)
  const chemin = url.pathname

  // --- Vérification de connexion (écran Configuration, avant toute
  // connexion réelle) — jamais d'authentification requise ici : à ce
  // stade l'utilisateur n'a par construction aucun jeton de session, ce
  // « Tester la connexion » ne vérifie que la joignabilité du Worker à
  // l'URL saisie. ---
  if (chemin === '/sante' && request.method === 'GET') {
    return reponseJson({ ok: true }, 200, entetes)
  }

  // --- Bootstrap (aucune authentification requise, jeton dédié) ---
  if (chemin === '/auth/bootstrap-admin' && request.method === 'POST') {
    return gererBootstrapAdmin(request, ctx, entetes)
  }
  if (chemin === '/auth/login' && request.method === 'POST') {
    return gererLogin(request, ctx, entetes)
  }

  // --- Authentifiées ---
  if (chemin === '/auth/me' && request.method === 'GET') {
    const utilisateur = await authentifier(request, ctx)
    if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)
    return reponseJson({ utilisateur: versUtilisateurPublic(utilisateur) }, 200, entetes)
  }
  if (chemin === '/auth/me' && request.method === 'PATCH') {
    return gererModifierProfil(request, ctx, entetes)
  }
  if (chemin === '/auth/change-password' && request.method === 'POST') {
    return gererChangerMotDePasse(request, ctx, entetes)
  }
  if (chemin === '/auth/verify-password' && request.method === 'POST') {
    return gererVerifierMotDePasse(request, ctx, entetes)
  }

  // --- Admin : comptes ---
  if (chemin === '/admin/utilisateurs' && request.method === 'GET') {
    return gererListerUtilisateurs(request, ctx, entetes)
  }
  if (chemin === '/admin/utilisateurs' && request.method === 'POST') {
    return gererCreerUtilisateur(request, ctx, entetes)
  }
  const matchUtilisateurId = chemin.match(/^\/admin\/utilisateurs\/([^/]+)$/)
  if (matchUtilisateurId && request.method === 'PATCH') {
    return gererModifierUtilisateur(request, ctx, entetes, matchUtilisateurId[1] as string)
  }

  // --- Admin : audit ---
  if (chemin === '/admin/audit' && request.method === 'GET') {
    return gererListerAudit(request, ctx, entetes, url)
  }
  if (chemin === '/audit/authorize-action' && request.method === 'POST') {
    return gererAutoriserAction(request, ctx, entetes)
  }

  // --- Clients (D1 = source de vérité) ---
  if (chemin === '/clients' && request.method === 'GET') {
    return gererListerClients(request, ctx, entetes)
  }
  if (chemin === '/clients' && request.method === 'POST') {
    return gererCreerClient(request, ctx, entetes)
  }
  const matchClientId = chemin.match(/^\/clients\/([^/]+)$/)
  if (matchClientId && request.method === 'GET') {
    return gererObtenirClient(request, ctx, entetes, matchClientId[1] as string)
  }
  if (matchClientId && request.method === 'PATCH') {
    return gererModifierClient(request, ctx, entetes, matchClientId[1] as string)
  }
  if (matchClientId && request.method === 'DELETE') {
    return gererSupprimerClientDefinitivement(request, ctx, entetes, matchClientId[1] as string)
  }

  // --- Structure Système (référentiel d'actifs, D1 = source de vérité,
  // Phase 1 du chantier de migration D1) ---
  const matchStructureSysteme = chemin.match(/^\/clients\/([^/]+)\/structure-systeme$/)
  if (matchStructureSysteme && request.method === 'GET') {
    return gererObtenirStructureSysteme(request, ctx, entetes, matchStructureSysteme[1] as string)
  }
  const matchSchemaHierarchie = chemin.match(/^\/clients\/([^/]+)\/structure-systeme\/schema$/)
  if (matchSchemaHierarchie && request.method === 'PUT') {
    return gererEnregistrerSchemaHierarchie(
      request,
      ctx,
      entetes,
      matchSchemaHierarchie[1] as string,
    )
  }
  const matchNoeudsBulk = chemin.match(/^\/clients\/([^/]+)\/structure-systeme\/noeuds\/lot$/)
  if (matchNoeudsBulk && request.method === 'POST') {
    return gererCreerNoeudsEnLot(request, ctx, entetes, matchNoeudsBulk[1] as string)
  }
  const matchMigrationLocale = chemin.match(
    /^\/clients\/([^/]+)\/structure-systeme\/noeuds\/migration-locale$/,
  )
  if (matchMigrationLocale && request.method === 'POST') {
    return gererMigrerNoeudsLocaux(request, ctx, entetes, matchMigrationLocale[1] as string)
  }
  const matchNoeuds = chemin.match(/^\/clients\/([^/]+)\/structure-systeme\/noeuds$/)
  if (matchNoeuds && request.method === 'POST') {
    return gererCreerNoeud(request, ctx, entetes, matchNoeuds[1] as string)
  }
  const matchNoeudId = chemin.match(/^\/clients\/([^/]+)\/structure-systeme\/noeuds\/([^/]+)$/)
  if (matchNoeudId && request.method === 'PATCH') {
    return gererModifierNoeud(
      request,
      ctx,
      entetes,
      matchNoeudId[1] as string,
      matchNoeudId[2] as string,
    )
  }
  const matchRelationsTechniques = chemin.match(
    /^\/clients\/([^/]+)\/structure-systeme\/relations-techniques$/,
  )
  if (matchRelationsTechniques && request.method === 'POST') {
    return gererCreerRelationTechnique(request, ctx, entetes, matchRelationsTechniques[1] as string)
  }

  // --- ACFC (méthode configurable par client, F2 du catalogue §10, Phase
  // 4a du chantier de migration D1) ---
  const matchAcfc = chemin.match(/^\/clients\/([^/]+)\/acfc$/)
  if (matchAcfc && request.method === 'GET') {
    return gererObtenirAcfc(request, ctx, entetes, matchAcfc[1] as string)
  }
  const matchAcfcProfils = chemin.match(/^\/clients\/([^/]+)\/acfc\/profils$/)
  if (matchAcfcProfils && request.method === 'POST') {
    return gererCreerProfilAcfc(request, ctx, entetes, matchAcfcProfils[1] as string)
  }
  const matchAcfcMigrationLocale = chemin.match(/^\/clients\/([^/]+)\/acfc\/migration-locale$/)
  if (matchAcfcMigrationLocale && request.method === 'POST') {
    return gererMigrerAcfcLocal(request, ctx, entetes, matchAcfcMigrationLocale[1] as string)
  }
  const matchAcfcEvaluations = chemin.match(/^\/clients\/([^/]+)\/acfc\/evaluations$/)
  if (matchAcfcEvaluations && request.method === 'POST') {
    return gererCreerEvaluationAcfc(request, ctx, entetes, matchAcfcEvaluations[1] as string)
  }

  // --- Parameter/ClassificationCriticiteParametre/CPP/CQA (Target
  // Architecture §10, Phase 4b du chantier de migration D1) ---
  const matchParameters = chemin.match(/^\/clients\/([^/]+)\/parameters$/)
  if (matchParameters && request.method === 'GET') {
    return gererObtenirParameters(request, ctx, entetes, matchParameters[1] as string)
  }
  const matchParametersMigrationLocale = chemin.match(
    /^\/clients\/([^/]+)\/parameters\/migration-locale$/,
  )
  if (matchParametersMigrationLocale && request.method === 'POST') {
    return gererMigrerParametersLocal(
      request,
      ctx,
      entetes,
      matchParametersMigrationLocale[1] as string,
    )
  }
  const matchParametresCreation = chemin.match(/^\/clients\/([^/]+)\/parameters\/parametres$/)
  if (matchParametresCreation && request.method === 'POST') {
    return gererCreerParametre(request, ctx, entetes, matchParametresCreation[1] as string)
  }
  const matchClassifications = chemin.match(/^\/clients\/([^/]+)\/parameters\/classifications$/)
  if (matchClassifications && request.method === 'POST') {
    return gererCreerClassification(request, ctx, entetes, matchClassifications[1] as string)
  }
  const matchCppsCreation = chemin.match(/^\/clients\/([^/]+)\/parameters\/cpps$/)
  if (matchCppsCreation && request.method === 'POST') {
    return gererCreerCPP(request, ctx, entetes, matchCppsCreation[1] as string)
  }
  const matchCppId = chemin.match(/^\/clients\/([^/]+)\/parameters\/cpps\/([^/]+)$/)
  if (matchCppId && request.method === 'PATCH') {
    return gererDesactiverCPP(
      request,
      ctx,
      entetes,
      matchCppId[1] as string,
      matchCppId[2] as string,
    )
  }
  const matchCqasCreation = chemin.match(/^\/clients\/([^/]+)\/parameters\/cqas$/)
  if (matchCqasCreation && request.method === 'POST') {
    return gererCreerCQA(request, ctx, entetes, matchCqasCreation[1] as string)
  }
  const matchCqaId = chemin.match(/^\/clients\/([^/]+)\/parameters\/cqas\/([^/]+)$/)
  if (matchCqaId && request.method === 'PATCH') {
    return gererDesactiverCQA(
      request,
      ctx,
      entetes,
      matchCqaId[1] as string,
      matchCqaId[2] as string,
    )
  }

  // --- Impact Assessment / System Classification (F1 du catalogue §10,
  // Phase 4c du chantier de migration D1) ---
  const matchImpactAssessment = chemin.match(/^\/clients\/([^/]+)\/impact-assessment$/)
  if (matchImpactAssessment && request.method === 'GET') {
    return gererObtenirImpactAssessment(request, ctx, entetes, matchImpactAssessment[1] as string)
  }
  const matchImpactAssessmentProfils = chemin.match(
    /^\/clients\/([^/]+)\/impact-assessment\/profils$/,
  )
  if (matchImpactAssessmentProfils && request.method === 'POST') {
    return gererCreerProfilImpactAssessment(
      request,
      ctx,
      entetes,
      matchImpactAssessmentProfils[1] as string,
    )
  }
  const matchImpactAssessmentMigrationLocale = chemin.match(
    /^\/clients\/([^/]+)\/impact-assessment\/migration-locale$/,
  )
  if (matchImpactAssessmentMigrationLocale && request.method === 'POST') {
    return gererMigrerImpactAssessmentLocal(
      request,
      ctx,
      entetes,
      matchImpactAssessmentMigrationLocale[1] as string,
    )
  }
  const matchImpactAssessmentEvaluations = chemin.match(
    /^\/clients\/([^/]+)\/impact-assessment\/evaluations$/,
  )
  if (matchImpactAssessmentEvaluations && request.method === 'POST') {
    return gererCreerEvaluationImpactAssessment(
      request,
      ctx,
      entetes,
      matchImpactAssessmentEvaluations[1] as string,
    )
  }

  // --- Computer System Assessment (F3 du catalogue §10, Phase 4c du
  // chantier de migration D1) ---
  const matchCsvAssessment = chemin.match(/^\/clients\/([^/]+)\/csv-assessment$/)
  if (matchCsvAssessment && request.method === 'GET') {
    return gererObtenirCsvAssessment(request, ctx, entetes, matchCsvAssessment[1] as string)
  }
  const matchCsvAssessmentMigrationLocale = chemin.match(
    /^\/clients\/([^/]+)\/csv-assessment\/migration-locale$/,
  )
  if (matchCsvAssessmentMigrationLocale && request.method === 'POST') {
    return gererMigrerCsvAssessmentLocal(
      request,
      ctx,
      entetes,
      matchCsvAssessmentMigrationLocale[1] as string,
    )
  }
  const matchCsvAssessmentEvaluations = chemin.match(
    /^\/clients\/([^/]+)\/csv-assessment\/evaluations$/,
  )
  if (matchCsvAssessmentEvaluations && request.method === 'POST') {
    return gererCreerEvaluationCsvAssessment(
      request,
      ctx,
      entetes,
      matchCsvAssessmentEvaluations[1] as string,
    )
  }

  // --- Risk Assessment / AMDEC (Target Architecture §10, Phase 4d du
  // chantier de migration D1) ---
  const matchRiskAssessment = chemin.match(/^\/clients\/([^/]+)\/risk-assessment$/)
  if (matchRiskAssessment && request.method === 'GET') {
    return gererObtenirRiskAssessment(request, ctx, entetes, matchRiskAssessment[1] as string)
  }
  const matchRiskAssessmentProfils = chemin.match(/^\/clients\/([^/]+)\/risk-assessment\/profils$/)
  if (matchRiskAssessmentProfils && request.method === 'POST') {
    return gererCreerProfilRiskAssessment(
      request,
      ctx,
      entetes,
      matchRiskAssessmentProfils[1] as string,
    )
  }
  const matchRiskAssessmentMigrationLocale = chemin.match(
    /^\/clients\/([^/]+)\/risk-assessment\/migration-locale$/,
  )
  if (matchRiskAssessmentMigrationLocale && request.method === 'POST') {
    return gererMigrerRiskAssessmentLocal(
      request,
      ctx,
      entetes,
      matchRiskAssessmentMigrationLocale[1] as string,
    )
  }
  const matchRiskAssessmentEvaluations = chemin.match(
    /^\/clients\/([^/]+)\/risk-assessment\/evaluations$/,
  )
  if (matchRiskAssessmentEvaluations && request.method === 'POST') {
    return gererCreerEvaluationRiskAssessment(
      request,
      ctx,
      entetes,
      matchRiskAssessmentEvaluations[1] as string,
    )
  }
  const matchRiskAssessmentActionResiduelle = chemin.match(
    /^\/clients\/([^/]+)\/risk-assessment\/evaluations\/([^/]+)\/action-residuelle$/,
  )
  if (matchRiskAssessmentActionResiduelle && request.method === 'PATCH') {
    return gererEnregistrerActionResiduelleRiskAssessment(
      request,
      ctx,
      entetes,
      matchRiskAssessmentActionResiduelle[1] as string,
      matchRiskAssessmentActionResiduelle[2] as string,
    )
  }

  // --- Process/FonctionActif/ManufacturingContext (Target Architecture
  // §4/§5/§7, Phase 5a du chantier de migration D1) ---
  const matchProcessContext = chemin.match(/^\/clients\/([^/]+)\/process-context$/)
  if (matchProcessContext && request.method === 'GET') {
    return gererObtenirProcessContext(request, ctx, entetes, matchProcessContext[1] as string)
  }
  const matchProcessContextProcesses = chemin.match(
    /^\/clients\/([^/]+)\/process-context\/processes$/,
  )
  if (matchProcessContextProcesses && request.method === 'POST') {
    return gererCreerProcess(request, ctx, entetes, matchProcessContextProcesses[1] as string)
  }
  const matchProcessContextFonctions = chemin.match(
    /^\/clients\/([^/]+)\/process-context\/fonctions$/,
  )
  if (matchProcessContextFonctions && request.method === 'POST') {
    return gererCreerFonction(request, ctx, entetes, matchProcessContextFonctions[1] as string)
  }
  const matchProcessContextAssocFonctionAssetNode = chemin.match(
    /^\/clients\/([^/]+)\/process-context\/associations-fonction-asset-node$/,
  )
  if (matchProcessContextAssocFonctionAssetNode && request.method === 'POST') {
    return gererCreerAssociationFonctionAssetNode(
      request,
      ctx,
      entetes,
      matchProcessContextAssocFonctionAssetNode[1] as string,
    )
  }
  const matchProcessContextAssocFonctionProcess = chemin.match(
    /^\/clients\/([^/]+)\/process-context\/associations-fonction-process$/,
  )
  if (matchProcessContextAssocFonctionProcess && request.method === 'POST') {
    return gererCreerAssociationFonctionProcess(
      request,
      ctx,
      entetes,
      matchProcessContextAssocFonctionProcess[1] as string,
    )
  }
  const matchProcessContextManufacturingContexts = chemin.match(
    /^\/clients\/([^/]+)\/process-context\/manufacturing-contexts$/,
  )
  if (matchProcessContextManufacturingContexts && request.method === 'POST') {
    return gererCreerManufacturingContext(
      request,
      ctx,
      entetes,
      matchProcessContextManufacturingContexts[1] as string,
    )
  }
  const matchProcessContextMigrationLocale = chemin.match(
    /^\/clients\/([^/]+)\/process-context\/migration-locale$/,
  )
  if (matchProcessContextMigrationLocale && request.method === 'POST') {
    return gererMigrerProcessContextLocal(
      request,
      ctx,
      entetes,
      matchProcessContextMigrationLocale[1] as string,
    )
  }

  // --- QualityEvent/ReferenceQualityEvent (URS catalogue §10 famille
  // H/I, Phase 5b du chantier de migration D1) ---
  const matchQualityEvents = chemin.match(/^\/clients\/([^/]+)\/quality-events$/)
  if (matchQualityEvents && request.method === 'GET') {
    return gererObtenirQualityEvents(request, ctx, entetes, matchQualityEvents[1] as string)
  }
  const matchQualityEventsEvenements = chemin.match(
    /^\/clients\/([^/]+)\/quality-events\/evenements$/,
  )
  if (matchQualityEventsEvenements && request.method === 'POST') {
    return gererCreerEvenementQualityEvent(
      request,
      ctx,
      entetes,
      matchQualityEventsEvenements[1] as string,
    )
  }
  const matchQualityEventsStatut = chemin.match(
    /^\/clients\/([^/]+)\/quality-events\/evenements\/([^/]+)\/statut$/,
  )
  if (matchQualityEventsStatut && request.method === 'PATCH') {
    return gererChangerStatutQualityEvent(
      request,
      ctx,
      entetes,
      matchQualityEventsStatut[1] as string,
      matchQualityEventsStatut[2] as string,
    )
  }
  const matchQualityEventsReferences = chemin.match(
    /^\/clients\/([^/]+)\/quality-events\/references$/,
  )
  if (matchQualityEventsReferences && request.method === 'POST') {
    return gererCreerReferenceQualityEvent(
      request,
      ctx,
      entetes,
      matchQualityEventsReferences[1] as string,
    )
  }
  const matchQualityEventsMigrationLocale = chemin.match(
    /^\/clients\/([^/]+)\/quality-events\/migration-locale$/,
  )
  if (matchQualityEventsMigrationLocale && request.method === 'POST') {
    return gererMigrerQualityEventsLocal(
      request,
      ctx,
      entetes,
      matchQualityEventsMigrationLocale[1] as string,
    )
  }

  // --- Requirement/TestObjective/TestCandidate/Test/Couverture (Target
  // Architecture, domaine "Test", Phase 6a du chantier de migration D1) ---
  const matchTestDefinition = chemin.match(/^\/clients\/([^/]+)\/test-definition$/)
  if (matchTestDefinition && request.method === 'GET') {
    return gererObtenirTestDefinition(request, ctx, entetes, matchTestDefinition[1] as string)
  }
  const matchTestDefinitionRequirements = chemin.match(
    /^\/clients\/([^/]+)\/test-definition\/requirements$/,
  )
  if (matchTestDefinitionRequirements && request.method === 'POST') {
    return gererCreerRequirement(
      request,
      ctx,
      entetes,
      matchTestDefinitionRequirements[1] as string,
    )
  }
  const matchTestDefinitionTestObjectives = chemin.match(
    /^\/clients\/([^/]+)\/test-definition\/test-objectives$/,
  )
  if (matchTestDefinitionTestObjectives && request.method === 'POST') {
    return gererCreerTestObjective(
      request,
      ctx,
      entetes,
      matchTestDefinitionTestObjectives[1] as string,
    )
  }
  const matchTestDefinitionTestCandidates = chemin.match(
    /^\/clients\/([^/]+)\/test-definition\/test-candidates$/,
  )
  if (matchTestDefinitionTestCandidates && request.method === 'POST') {
    return gererCreerTestCandidate(
      request,
      ctx,
      entetes,
      matchTestDefinitionTestCandidates[1] as string,
    )
  }
  const matchTestDefinitionTestCandidatsDepuisRisques = chemin.match(
    /^\/clients\/([^/]+)\/test-definition\/test-candidates\/depuis-risques$/,
  )
  if (matchTestDefinitionTestCandidatsDepuisRisques && request.method === 'POST') {
    return gererCreerTestCandidatsDepuisRisques(
      request,
      ctx,
      entetes,
      matchTestDefinitionTestCandidatsDepuisRisques[1] as string,
    )
  }
  const matchTestDefinitionTestCandidatStatut = chemin.match(
    /^\/clients\/([^/]+)\/test-definition\/test-candidates\/([^/]+)\/statut$/,
  )
  if (matchTestDefinitionTestCandidatStatut && request.method === 'PATCH') {
    return gererChangerStatutTestCandidate(
      request,
      ctx,
      entetes,
      matchTestDefinitionTestCandidatStatut[1] as string,
      matchTestDefinitionTestCandidatStatut[2] as string,
    )
  }
  const matchTestDefinitionTests = chemin.match(/^\/clients\/([^/]+)\/test-definition\/tests$/)
  if (matchTestDefinitionTests && request.method === 'POST') {
    return gererCreerTest(request, ctx, entetes, matchTestDefinitionTests[1] as string)
  }
  const matchTestDefinitionTestApprouver = chemin.match(
    /^\/clients\/([^/]+)\/test-definition\/tests\/([^/]+)\/approuver$/,
  )
  if (matchTestDefinitionTestApprouver && request.method === 'PATCH') {
    return gererApprouverTest(
      request,
      ctx,
      entetes,
      matchTestDefinitionTestApprouver[1] as string,
      matchTestDefinitionTestApprouver[2] as string,
    )
  }
  const matchTestDefinitionCouvertures = chemin.match(
    /^\/clients\/([^/]+)\/test-definition\/couvertures$/,
  )
  if (matchTestDefinitionCouvertures && request.method === 'POST') {
    return gererCreerCouverture(request, ctx, entetes, matchTestDefinitionCouvertures[1] as string)
  }
  const matchTestDefinitionMigrationLocale = chemin.match(
    /^\/clients\/([^/]+)\/test-definition\/migration-locale$/,
  )
  if (matchTestDefinitionMigrationLocale && request.method === 'POST') {
    return gererMigrerTestDefinitionLocal(
      request,
      ctx,
      entetes,
      matchTestDefinitionMigrationLocale[1] as string,
    )
  }

  // --- Execution/ExecutionStep/Measurement/ExecutionEvent (Target
  // Architecture, domaine "Execution", Phase 6b du chantier de migration D1) ---
  const matchExecutions = chemin.match(/^\/clients\/([^/]+)\/executions$/)
  if (matchExecutions && request.method === 'GET') {
    return gererObtenirExecutions(request, ctx, entetes, matchExecutions[1] as string)
  }
  if (matchExecutions && request.method === 'POST') {
    return gererDemarrerExecution(request, ctx, entetes, matchExecutions[1] as string)
  }
  const matchExecutionEtapes = chemin.match(/^\/clients\/([^/]+)\/executions\/([^/]+)\/etapes$/)
  if (matchExecutionEtapes && request.method === 'POST') {
    return gererEnregistrerResultatEtape(
      request,
      ctx,
      entetes,
      matchExecutionEtapes[1] as string,
      matchExecutionEtapes[2] as string,
    )
  }
  const matchExecutionStepMesures = chemin.match(
    /^\/clients\/([^/]+)\/execution-steps\/([^/]+)\/mesures$/,
  )
  if (matchExecutionStepMesures && request.method === 'POST') {
    return gererAjouterMesure(
      request,
      ctx,
      entetes,
      matchExecutionStepMesures[1] as string,
      matchExecutionStepMesures[2] as string,
    )
  }
  const matchExecutionEvenements = chemin.match(
    /^\/clients\/([^/]+)\/executions\/([^/]+)\/evenements$/,
  )
  if (matchExecutionEvenements && request.method === 'POST') {
    return gererConsignerEvenement(
      request,
      ctx,
      entetes,
      matchExecutionEvenements[1] as string,
      matchExecutionEvenements[2] as string,
    )
  }
  const matchExecutionCloturer = chemin.match(/^\/clients\/([^/]+)\/executions\/([^/]+)\/cloturer$/)
  if (matchExecutionCloturer && request.method === 'PATCH') {
    return gererCloturerExecution(
      request,
      ctx,
      entetes,
      matchExecutionCloturer[1] as string,
      matchExecutionCloturer[2] as string,
    )
  }
  const matchExecutionsMigrationLocale = chemin.match(
    /^\/clients\/([^/]+)\/executions\/migration-locale$/,
  )
  if (matchExecutionsMigrationLocale && request.method === 'POST') {
    return gererMigrerExecutionsLocal(
      request,
      ctx,
      entetes,
      matchExecutionsMigrationLocale[1] as string,
    )
  }

  // --- Evidence/EvidenceLocation/ProvenanceLink (Target Architecture,
  // domaine "Evidence", Phase 6c du chantier de migration D1) ---
  const matchEvidences = chemin.match(/^\/clients\/([^/]+)\/evidences$/)
  if (matchEvidences && request.method === 'GET') {
    return gererObtenirEvidences(request, ctx, entetes, matchEvidences[1] as string)
  }
  if (matchEvidences && request.method === 'POST') {
    return gererEnregistrerPreuve(request, ctx, entetes, matchEvidences[1] as string)
  }
  const matchEvidenceLocalisation = chemin.match(
    /^\/clients\/([^/]+)\/evidences\/([^/]+)\/localisations$/,
  )
  if (matchEvidenceLocalisation && request.method === 'POST') {
    return gererAjouterLocalisation(
      request,
      ctx,
      entetes,
      matchEvidenceLocalisation[1] as string,
      matchEvidenceLocalisation[2] as string,
    )
  }
  const matchProvenanceLinks = chemin.match(/^\/clients\/([^/]+)\/provenance-links$/)
  if (matchProvenanceLinks && request.method === 'POST') {
    return gererDeclarerProvenance(request, ctx, entetes, matchProvenanceLinks[1] as string)
  }
  const matchEvidencesMigrationLocale = chemin.match(
    /^\/clients\/([^/]+)\/evidences\/migration-locale$/,
  )
  if (matchEvidencesMigrationLocale && request.method === 'POST') {
    return gererMigrerEvidencesLocal(
      request,
      ctx,
      entetes,
      matchEvidencesMigrationLocale[1] as string,
    )
  }

  // --- Source/SourceLocation/SourceVersion/Extraction/ExtractionItem/
  // KnowledgeItem/Confirmation/KnowledgeRelation/Conflict (Target
  // Architecture, domaines "Source Intelligence" et "Knowledge", Phase 7a
  // du chantier de migration D1) ---
  const matchKnowledgeEngine = chemin.match(/^\/clients\/([^/]+)\/knowledge-engine$/)
  if (matchKnowledgeEngine && request.method === 'GET') {
    return gererObtenirKnowledgeEngine(request, ctx, entetes, matchKnowledgeEngine[1] as string)
  }
  const matchSources = chemin.match(/^\/clients\/([^/]+)\/sources$/)
  if (matchSources && request.method === 'POST') {
    return gererCreerSource(request, ctx, entetes, matchSources[1] as string)
  }
  const matchSourceLocalisations = chemin.match(
    /^\/clients\/([^/]+)\/sources\/([^/]+)\/localisations$/,
  )
  if (matchSourceLocalisations && request.method === 'POST') {
    return gererAjouterLocalisationSource(
      request,
      ctx,
      entetes,
      matchSourceLocalisations[1] as string,
      matchSourceLocalisations[2] as string,
    )
  }
  const matchSourceVersions = chemin.match(/^\/clients\/([^/]+)\/sources\/([^/]+)\/versions$/)
  if (matchSourceVersions && request.method === 'POST') {
    return gererCreerSourceVersion(
      request,
      ctx,
      entetes,
      matchSourceVersions[1] as string,
      matchSourceVersions[2] as string,
    )
  }
  const matchExtractions = chemin.match(
    /^\/clients\/([^/]+)\/source-versions\/([^/]+)\/extractions$/,
  )
  if (matchExtractions && request.method === 'POST') {
    return gererEnregistrerExtraction(
      request,
      ctx,
      entetes,
      matchExtractions[1] as string,
      matchExtractions[2] as string,
    )
  }
  const matchExtractionItems = chemin.match(/^\/clients\/([^/]+)\/extractions\/([^/]+)\/items$/)
  if (matchExtractionItems && request.method === 'POST') {
    return gererAjouterExtractionItem(
      request,
      ctx,
      entetes,
      matchExtractionItems[1] as string,
      matchExtractionItems[2] as string,
    )
  }
  const matchKnowledgeItems = chemin.match(
    /^\/clients\/([^/]+)\/extraction-items\/([^/]+)\/knowledge-items$/,
  )
  if (matchKnowledgeItems && request.method === 'POST') {
    return gererCreerKnowledgeItem(
      request,
      ctx,
      entetes,
      matchKnowledgeItems[1] as string,
      matchKnowledgeItems[2] as string,
    )
  }
  const matchConfirmerKnowledgeItem = chemin.match(
    /^\/clients\/([^/]+)\/knowledge-items\/([^/]+)\/confirmer$/,
  )
  if (matchConfirmerKnowledgeItem && request.method === 'PATCH') {
    return gererConfirmerKnowledgeItem(
      request,
      ctx,
      entetes,
      matchConfirmerKnowledgeItem[1] as string,
      matchConfirmerKnowledgeItem[2] as string,
    )
  }
  const matchKnowledgeRelations = chemin.match(/^\/clients\/([^/]+)\/knowledge-relations$/)
  if (matchKnowledgeRelations && request.method === 'POST') {
    return gererDeclarerRelation(request, ctx, entetes, matchKnowledgeRelations[1] as string)
  }
  const matchConflicts = chemin.match(/^\/clients\/([^/]+)\/conflicts$/)
  if (matchConflicts && request.method === 'POST') {
    return gererDeclarerConflit(request, ctx, entetes, matchConflicts[1] as string)
  }
  const matchResoudreConflit = chemin.match(/^\/clients\/([^/]+)\/conflicts\/([^/]+)\/resoudre$/)
  if (matchResoudreConflit && request.method === 'PATCH') {
    return gererResoudreConflit(
      request,
      ctx,
      entetes,
      matchResoudreConflit[1] as string,
      matchResoudreConflit[2] as string,
    )
  }
  const matchKnowledgeEngineMigrationLocale = chemin.match(
    /^\/clients\/([^/]+)\/knowledge-engine\/migration-locale$/,
  )
  if (matchKnowledgeEngineMigrationLocale && request.method === 'POST') {
    return gererMigrerKnowledgeEngineLocal(
      request,
      ctx,
      entetes,
      matchKnowledgeEngineMigrationLocale[1] as string,
    )
  }

  // --- ContentPlan (Target Architecture, domaine "Deliverable Engine",
  // Phase 7b du chantier de migration D1) ---
  const matchContentPlans = chemin.match(/^\/clients\/([^/]+)\/content-plans$/)
  if (matchContentPlans && request.method === 'GET') {
    return gererObtenirContentPlans(request, ctx, entetes, matchContentPlans[1] as string)
  }
  if (matchContentPlans && request.method === 'POST') {
    return gererCreerContentPlan(request, ctx, entetes, matchContentPlans[1] as string)
  }
  const matchRecalculerReadiness = chemin.match(
    /^\/clients\/([^/]+)\/content-plans\/([^/]+)\/recalculer-readiness$/,
  )
  if (matchRecalculerReadiness && request.method === 'PATCH') {
    return gererRecalculerReadiness(
      request,
      ctx,
      entetes,
      matchRecalculerReadiness[1] as string,
      matchRecalculerReadiness[2] as string,
    )
  }
  const matchValiderContentPlan = chemin.match(
    /^\/clients\/([^/]+)\/content-plans\/([^/]+)\/valider$/,
  )
  if (matchValiderContentPlan && request.method === 'PATCH') {
    return gererValiderContentPlan(
      request,
      ctx,
      entetes,
      matchValiderContentPlan[1] as string,
      matchValiderContentPlan[2] as string,
    )
  }
  const matchGelerContentPlan = chemin.match(/^\/clients\/([^/]+)\/content-plans\/([^/]+)\/geler$/)
  if (matchGelerContentPlan && request.method === 'PATCH') {
    return gererGelerContentPlan(
      request,
      ctx,
      entetes,
      matchGelerContentPlan[1] as string,
      matchGelerContentPlan[2] as string,
    )
  }
  const matchContentPlansMigrationLocale = chemin.match(
    /^\/clients\/([^/]+)\/content-plans\/migration-locale$/,
  )
  if (matchContentPlansMigrationLocale && request.method === 'POST') {
    return gererMigrerContentPlansLocal(
      request,
      ctx,
      entetes,
      matchContentPlansMigrationLocale[1] as string,
    )
  }

  // --- Integration (Target Architecture, domaine "Integration",
  // Phase 7c du chantier de migration D1) ---
  const matchIntegration = chemin.match(/^\/clients\/([^/]+)\/integration$/)
  if (matchIntegration && request.method === 'GET') {
    return gererObtenirIntegration(request, ctx, entetes, matchIntegration[1] as string)
  }
  const matchConnectors = chemin.match(/^\/clients\/([^/]+)\/connectors$/)
  if (matchConnectors && request.method === 'POST') {
    return gererCreerConnector(request, ctx, entetes, matchConnectors[1] as string)
  }
  const matchDesactiverConnector = chemin.match(
    /^\/clients\/([^/]+)\/connectors\/([^/]+)\/desactiver$/,
  )
  if (matchDesactiverConnector && request.method === 'PATCH') {
    return gererDesactiverConnector(
      request,
      ctx,
      entetes,
      matchDesactiverConnector[1] as string,
      matchDesactiverConnector[2] as string,
    )
  }
  const matchBasculerActifConnector = chemin.match(
    /^\/clients\/([^/]+)\/connectors\/([^/]+)\/basculer-actif$/,
  )
  if (matchBasculerActifConnector && request.method === 'PATCH') {
    return gererBasculerActifConnector(
      request,
      ctx,
      entetes,
      matchBasculerActifConnector[1] as string,
      matchBasculerActifConnector[2] as string,
    )
  }
  const matchConnectorParId = chemin.match(/^\/clients\/([^/]+)\/connectors\/([^/]+)$/)
  if (matchConnectorParId && request.method === 'DELETE') {
    return gererSupprimerConnector(
      request,
      ctx,
      entetes,
      matchConnectorParId[1] as string,
      matchConnectorParId[2] as string,
    )
  }
  const matchDemarrerSyncJob = chemin.match(/^\/clients\/([^/]+)\/connectors\/([^/]+)\/sync-jobs$/)
  if (matchDemarrerSyncJob && request.method === 'POST') {
    return gererDemarrerSyncJob(
      request,
      ctx,
      entetes,
      matchDemarrerSyncJob[1] as string,
      matchDemarrerSyncJob[2] as string,
    )
  }
  const matchSyncJobIndisponible = chemin.match(
    /^\/clients\/([^/]+)\/sync-jobs\/([^/]+)\/indisponible$/,
  )
  if (matchSyncJobIndisponible && request.method === 'PATCH') {
    return gererMarquerSyncJobIndisponible(
      request,
      ctx,
      entetes,
      matchSyncJobIndisponible[1] as string,
      matchSyncJobIndisponible[2] as string,
    )
  }
  const matchSyncJobNouvelleTentative = chemin.match(
    /^\/clients\/([^/]+)\/sync-jobs\/([^/]+)\/nouvelle-tentative$/,
  )
  if (matchSyncJobNouvelleTentative && request.method === 'PATCH') {
    return gererMarquerSyncJobNouvelleTentative(
      request,
      ctx,
      entetes,
      matchSyncJobNouvelleTentative[1] as string,
      matchSyncJobNouvelleTentative[2] as string,
    )
  }
  const matchSyncJobEchec = chemin.match(/^\/clients\/([^/]+)\/sync-jobs\/([^/]+)\/echec$/)
  if (matchSyncJobEchec && request.method === 'PATCH') {
    return gererMarquerSyncJobEchec(
      request,
      ctx,
      entetes,
      matchSyncJobEchec[1] as string,
      matchSyncJobEchec[2] as string,
    )
  }
  const matchSyncJobReussi = chemin.match(/^\/clients\/([^/]+)\/sync-jobs\/([^/]+)\/reussi$/)
  if (matchSyncJobReussi && request.method === 'PATCH') {
    return gererMarquerSyncJobReussi(
      request,
      ctx,
      entetes,
      matchSyncJobReussi[1] as string,
      matchSyncJobReussi[2] as string,
    )
  }
  const matchDeclarerReference = chemin.match(
    /^\/clients\/([^/]+)\/connectors\/([^/]+)\/references$/,
  )
  if (matchDeclarerReference && request.method === 'POST') {
    return gererDeclarerReference(
      request,
      ctx,
      entetes,
      matchDeclarerReference[1] as string,
      matchDeclarerReference[2] as string,
    )
  }
  const matchIntegrationMigrationLocale = chemin.match(
    /^\/clients\/([^/]+)\/integration\/migration-locale$/,
  )
  if (matchIntegrationMigrationLocale && request.method === 'POST') {
    return gererMigrerIntegrationLocal(
      request,
      ctx,
      entetes,
      matchIntegrationMigrationLocale[1] as string,
    )
  }

  // --- Mission/Activity/Dependency/AssociationMissionQualityEvent
  // (Target Architecture, domaine "Work", Phase 8a du chantier de
  // migration D1) ---
  const matchMissions = chemin.match(/^\/clients\/([^/]+)\/missions$/)
  if (matchMissions && request.method === 'GET') {
    return gererObtenirMissions(request, ctx, entetes, matchMissions[1] as string)
  }
  if (matchMissions && request.method === 'POST') {
    return gererCreerMission(request, ctx, entetes, matchMissions[1] as string)
  }
  const matchStatutMission = chemin.match(/^\/clients\/([^/]+)\/missions\/([^/]+)\/statut$/)
  if (matchStatutMission && request.method === 'PATCH') {
    return gererChangerStatutMission(
      request,
      ctx,
      entetes,
      matchStatutMission[1] as string,
      matchStatutMission[2] as string,
    )
  }
  const matchAssocierQualityEvent = chemin.match(
    /^\/clients\/([^/]+)\/missions\/([^/]+)\/quality-events$/,
  )
  if (matchAssocierQualityEvent && request.method === 'POST') {
    return gererAssocierQualityEvent(
      request,
      ctx,
      entetes,
      matchAssocierQualityEvent[1] as string,
      matchAssocierQualityEvent[2] as string,
    )
  }
  const matchCreerActivity = chemin.match(/^\/clients\/([^/]+)\/missions\/([^/]+)\/activities$/)
  if (matchCreerActivity && request.method === 'POST') {
    return gererCreerActivity(
      request,
      ctx,
      entetes,
      matchCreerActivity[1] as string,
      matchCreerActivity[2] as string,
    )
  }
  const matchStatutActivity = chemin.match(/^\/clients\/([^/]+)\/activities\/([^/]+)\/statut$/)
  if (matchStatutActivity && request.method === 'PATCH') {
    return gererChangerStatutActivity(
      request,
      ctx,
      entetes,
      matchStatutActivity[1] as string,
      matchStatutActivity[2] as string,
    )
  }
  const matchAjouterDependance = chemin.match(
    /^\/clients\/([^/]+)\/activities\/([^/]+)\/dependances$/,
  )
  if (matchAjouterDependance && request.method === 'POST') {
    return gererAjouterDependance(
      request,
      ctx,
      entetes,
      matchAjouterDependance[1] as string,
      matchAjouterDependance[2] as string,
    )
  }
  const matchMissionsMigrationLocale = chemin.match(
    /^\/clients\/([^/]+)\/missions\/migration-locale$/,
  )
  if (matchMissionsMigrationLocale && request.method === 'POST') {
    return gererMigrerMissionsLocal(
      request,
      ctx,
      entetes,
      matchMissionsMigrationLocale[1] as string,
    )
  }

  // --- ContextSnapshot/ContextSnapshotItem (Target Architecture, domaine
  // "Context Engine", Phase 8b du chantier de migration D1) ---
  const matchContextSnapshots = chemin.match(/^\/clients\/([^/]+)\/context-snapshots$/)
  if (matchContextSnapshots && request.method === 'GET') {
    return gererObtenirContextSnapshots(request, ctx, entetes, matchContextSnapshots[1] as string)
  }
  if (matchContextSnapshots && request.method === 'POST') {
    return gererAssemblerContextSnapshot(request, ctx, entetes, matchContextSnapshots[1] as string)
  }
  const matchContextSnapshotsMigrationLocale = chemin.match(
    /^\/clients\/([^/]+)\/context-snapshots\/migration-locale$/,
  )
  if (matchContextSnapshotsMigrationLocale && request.method === 'POST') {
    return gererMigrerContextSnapshotsLocal(
      request,
      ctx,
      entetes,
      matchContextSnapshotsMigrationLocale[1] as string,
    )
  }

  // --- AIConfiguration/AIRequest/AIResponse/CitationAIResponse (Target
  // Architecture, domaine "Reasoning Engine", Phase 8c du chantier de
  // migration D1) ---
  const matchReasoningEngine = chemin.match(/^\/clients\/([^/]+)\/reasoning-engine$/)
  if (matchReasoningEngine && request.method === 'GET') {
    return gererObtenirReasoningEngine(request, ctx, entetes, matchReasoningEngine[1] as string)
  }
  const matchAssurerConfiguration = chemin.match(
    /^\/clients\/([^/]+)\/reasoning-engine\/configurations$/,
  )
  if (matchAssurerConfiguration && request.method === 'POST') {
    return gererAssurerConfiguration(request, ctx, entetes, matchAssurerConfiguration[1] as string)
  }
  const matchCreerAIRequest = chemin.match(/^\/clients\/([^/]+)\/reasoning-engine\/requests$/)
  if (matchCreerAIRequest && request.method === 'POST') {
    return gererCreerAIRequest(request, ctx, entetes, matchCreerAIRequest[1] as string)
  }
  const matchCreerAIResponse = chemin.match(/^\/clients\/([^/]+)\/reasoning-engine\/responses$/)
  if (matchCreerAIResponse && request.method === 'POST') {
    return gererCreerAIResponse(request, ctx, entetes, matchCreerAIResponse[1] as string)
  }
  const matchCreerCitations = chemin.match(/^\/clients\/([^/]+)\/reasoning-engine\/citations$/)
  if (matchCreerCitations && request.method === 'POST') {
    return gererCreerCitations(request, ctx, entetes, matchCreerCitations[1] as string)
  }
  const matchReasoningEngineMigrationLocale = chemin.match(
    /^\/clients\/([^/]+)\/reasoning-engine\/migration-locale$/,
  )
  if (matchReasoningEngineMigrationLocale && request.method === 'POST') {
    return gererMigrerReasoningEngineLocal(
      request,
      ctx,
      entetes,
      matchReasoningEngineMigrationLocale[1] as string,
    )
  }

  // --- Procedure/ProcedureStep (cerveau procédural, Phase 9a du chantier
  // de migration D1) ---
  const matchProcedures = chemin.match(/^\/clients\/([^/]+)\/procedures$/)
  if (matchProcedures && request.method === 'GET') {
    return gererObtenirProcedures(request, ctx, entetes, matchProcedures[1] as string)
  }
  if (matchProcedures && request.method === 'POST') {
    return gererCreerProcedure(request, ctx, entetes, matchProcedures[1] as string)
  }
  const matchAjouterEtapeProcedure = chemin.match(
    /^\/clients\/([^/]+)\/procedures\/([^/]+)\/steps$/,
  )
  if (matchAjouterEtapeProcedure && request.method === 'POST') {
    return gererAjouterEtapeProcedure(
      request,
      ctx,
      entetes,
      matchAjouterEtapeProcedure[1] as string,
      matchAjouterEtapeProcedure[2] as string,
    )
  }
  const matchProceduresMigrationLocale = chemin.match(
    /^\/clients\/([^/]+)\/procedures\/migration-locale$/,
  )
  if (matchProceduresMigrationLocale && request.method === 'POST') {
    return gererMigrerProceduresLocal(
      request,
      ctx,
      entetes,
      matchProceduresMigrationLocale[1] as string,
    )
  }

  // --- GabaritExportClient (gabarits d'export .docx personnalisés
  // client, §4.3bis, Phase 9b du chantier de migration D1) ---
  const matchGabaritsExportClient = chemin.match(/^\/clients\/([^/]+)\/gabarits-export$/)
  if (matchGabaritsExportClient && request.method === 'GET') {
    return gererListerGabaritsExportClient(
      request,
      ctx,
      entetes,
      matchGabaritsExportClient[1] as string,
    )
  }
  if (matchGabaritsExportClient && request.method === 'POST') {
    return gererCreerGabaritExportClient(
      request,
      ctx,
      entetes,
      matchGabaritsExportClient[1] as string,
    )
  }
  const matchGabaritsExportClientMigrationLocale = chemin.match(
    /^\/clients\/([^/]+)\/gabarits-export\/migration-locale$/,
  )
  if (matchGabaritsExportClientMigrationLocale && request.method === 'POST') {
    return gererMigrerGabaritExportClientLocal(
      request,
      ctx,
      entetes,
      matchGabaritsExportClientMigrationLocale[1] as string,
    )
  }
  const matchContenuGabaritExportClient = chemin.match(/^\/gabarits-export\/([^/]+)\/contenu$/)
  if (matchContenuGabaritExportClient && request.method === 'GET') {
    return gererObtenirContenuGabaritExportClient(
      request,
      ctx,
      entetes,
      matchContenuGabaritExportClient[1] as string,
    )
  }
  const matchGabaritExportClientId = chemin.match(/^\/gabarits-export\/([^/]+)$/)
  if (matchGabaritExportClientId && request.method === 'DELETE') {
    return gererSupprimerGabaritExportClient(
      request,
      ctx,
      entetes,
      matchGabaritExportClientId[1] as string,
    )
  }

  // --- AiChatSessionLog (journal des sessions du panneau Chat, §4.4,
  // Phase 9c du chantier de migration D1) ---
  const matchAiChatSessionLogs = chemin.match(/^\/clients\/([^/]+)\/ai-chat-session-logs$/)
  if (matchAiChatSessionLogs && request.method === 'GET') {
    return gererListerAiChatSessionLogs(request, ctx, entetes, matchAiChatSessionLogs[1] as string)
  }
  if (matchAiChatSessionLogs && request.method === 'POST') {
    return gererCreerAiChatSessionLog(request, ctx, entetes, matchAiChatSessionLogs[1] as string)
  }
  const matchAiChatSessionLogsMigrationLocale = chemin.match(
    /^\/clients\/([^/]+)\/ai-chat-session-logs\/migration-locale$/,
  )
  if (matchAiChatSessionLogsMigrationLocale && request.method === 'POST') {
    return gererMigrerAiChatSessionLogsLocal(
      request,
      ctx,
      entetes,
      matchAiChatSessionLogsMigrationLocale[1] as string,
    )
  }

  // --- ConnexionDrive / EtatMiroirDrive (miroir Drive par client, Phase
  // 9d du chantier de migration D1) ---
  const matchConnexionDrive = chemin.match(/^\/clients\/([^/]+)\/connexion-drive$/)
  if (matchConnexionDrive && request.method === 'GET') {
    return gererObtenirConnexionDrive(request, ctx, entetes, matchConnexionDrive[1] as string)
  }
  if (matchConnexionDrive && request.method === 'PUT') {
    return gererEnregistrerConnexionDrive(request, ctx, entetes, matchConnexionDrive[1] as string)
  }
  if (matchConnexionDrive && request.method === 'DELETE') {
    return gererEffacerConnexionDrive(request, ctx, entetes, matchConnexionDrive[1] as string)
  }
  const matchEtatMiroirDrive = chemin.match(/^\/clients\/([^/]+)\/etat-miroir-drive$/)
  if (matchEtatMiroirDrive && request.method === 'GET') {
    return gererObtenirEtatMiroirDrive(request, ctx, entetes, matchEtatMiroirDrive[1] as string)
  }
  if (matchEtatMiroirDrive && request.method === 'PUT') {
    return gererEnregistrerEtatMiroirDrive(request, ctx, entetes, matchEtatMiroirDrive[1] as string)
  }

  // --- Organization/Workspace (Phase 2 du chantier de migration D1) ---
  const matchOrganisation = chemin.match(/^\/clients\/([^/]+)\/organisation$/)
  if (matchOrganisation && request.method === 'GET') {
    return gererObtenirOrganisation(request, ctx, entetes, matchOrganisation[1] as string)
  }
  const matchMigrerOrganisation = chemin.match(/^\/clients\/([^/]+)\/organisation\/migrer$/)
  if (matchMigrerOrganisation && request.method === 'POST') {
    return gererMigrerClientVersOrganisation(
      request,
      ctx,
      entetes,
      matchMigrerOrganisation[1] as string,
    )
  }
  const matchWorkspaces = chemin.match(/^\/clients\/([^/]+)\/organisation\/workspaces$/)
  if (matchWorkspaces && request.method === 'POST') {
    return gererCreerWorkspace(request, ctx, entetes, matchWorkspaces[1] as string)
  }

  // --- Projects (Phase 3a du chantier de migration D1) ---
  if (chemin === '/projects' && request.method === 'GET') {
    return gererListerProjets(request, ctx, entetes)
  }
  if (chemin === '/projects' && request.method === 'POST') {
    return gererCreerProjet(request, ctx, entetes)
  }
  if (chemin === '/projects/migration-locale' && request.method === 'POST') {
    return gererMigrerProjetsLocaux(request, ctx, entetes)
  }
  const matchProjetsClient = chemin.match(/^\/clients\/([^/]+)\/projects$/)
  if (matchProjetsClient && request.method === 'GET') {
    return gererListerProjetsClient(request, ctx, entetes, matchProjetsClient[1] as string)
  }
  const matchProjetId = chemin.match(/^\/projects\/([^/]+)$/)
  if (matchProjetId && request.method === 'GET') {
    return gererObtenirProjet(request, ctx, entetes, matchProjetId[1] as string)
  }
  const matchProjetRestauration = chemin.match(/^\/projects\/([^/]+)\/restauration$/)
  if (matchProjetRestauration && request.method === 'PUT') {
    return gererRestaurerProjet(request, ctx, entetes, matchProjetRestauration[1] as string)
  }
  const matchProjetPhase = chemin.match(/^\/projects\/([^/]+)\/phase$/)
  if (matchProjetPhase && request.method === 'PATCH') {
    return gererChangerPhaseProjet(request, ctx, entetes, matchProjetPhase[1] as string)
  }
  const matchProjetArchiver = chemin.match(/^\/projects\/([^/]+)\/archiver$/)
  if (matchProjetArchiver && request.method === 'POST') {
    return gererArchiverProjet(request, ctx, entetes, matchProjetArchiver[1] as string)
  }
  const matchProjetDesarchiver = chemin.match(/^\/projects\/([^/]+)\/desarchiver$/)
  if (matchProjetDesarchiver && request.method === 'POST') {
    return gererDesarchiverProjet(request, ctx, entetes, matchProjetDesarchiver[1] as string)
  }
  const matchProjetSuspendre = chemin.match(/^\/projects\/([^/]+)\/suspendre$/)
  if (matchProjetSuspendre && request.method === 'POST') {
    return gererSuspendreProjet(request, ctx, entetes, matchProjetSuspendre[1] as string)
  }
  const matchProjetReprendre = chemin.match(/^\/projects\/([^/]+)\/reprendre$/)
  if (matchProjetReprendre && request.method === 'POST') {
    return gererReprendreProjet(request, ctx, entetes, matchProjetReprendre[1] as string)
  }
  const matchProjetSupprimer = chemin.match(/^\/projects\/([^/]+)\/supprimer$/)
  if (matchProjetSupprimer && request.method === 'POST') {
    return gererSupprimerProjet(request, ctx, entetes, matchProjetSupprimer[1] as string)
  }
  const matchProjetPartage = chemin.match(/^\/projects\/([^/]+)\/partage$/)
  if (matchProjetPartage && request.method === 'POST') {
    return gererPartagerProjet(request, ctx, entetes, matchProjetPartage[1] as string)
  }
  const matchProjetPartageUtilisateur = chemin.match(/^\/projects\/([^/]+)\/partage\/([^/]+)$/)
  if (matchProjetPartageUtilisateur && request.method === 'DELETE') {
    return gererRetirerPartageProjet(
      request,
      ctx,
      entetes,
      matchProjetPartageUtilisateur[1] as string,
      decodeURIComponent(matchProjetPartageUtilisateur[2] as string),
    )
  }
  const matchProjetDocuments = chemin.match(/^\/projects\/([^/]+)\/documents$/)
  if (matchProjetDocuments && request.method === 'POST') {
    return gererAjouterDocumentProjet(request, ctx, entetes, matchProjetDocuments[1] as string)
  }
  const matchProjetSections = chemin.match(/^\/projects\/([^/]+)\/sections$/)
  if (matchProjetSections && request.method === 'POST') {
    return gererAjouterSectionProjet(request, ctx, entetes, matchProjetSections[1] as string)
  }
  const matchProjetLiens = chemin.match(/^\/projects\/([^/]+)\/liens$/)
  if (matchProjetLiens && request.method === 'POST') {
    return gererAjouterLienProjet(request, ctx, entetes, matchProjetLiens[1] as string)
  }
  if (matchProjetLiens && request.method === 'DELETE') {
    return gererRetirerLienProjet(request, ctx, entetes, matchProjetLiens[1] as string)
  }

  // --- Sections (Phase 3b du chantier de migration D1) ---
  //
  // Une route `POST /projects/:id/sections` existe déjà depuis la Phase 3a
  // (`gererAjouterSectionProjet` — référence un id de section dans
  // `Project.sections[]`, jamais le contenu de la section elle-même,
  // toujours consommé par `TableauDeBord.vue`) : la création réelle d'une
  // section utilise donc `POST /sections` (id de projet dans le corps),
  // jamais le même chemin, pour ne jamais entrer en collision avec elle.
  if (chemin === '/sections' && request.method === 'GET') {
    return gererListerToutesLesSections(request, ctx, entetes)
  }
  if (chemin === '/sections' && request.method === 'POST') {
    return gererCreerSection(request, ctx, entetes)
  }
  if (chemin === '/sections/migration-locale' && request.method === 'POST') {
    return gererMigrerSectionsLocales(request, ctx, entetes)
  }
  const matchSectionsProjet = chemin.match(/^\/projects\/([^/]+)\/sections$/)
  if (matchSectionsProjet && request.method === 'GET') {
    return gererListerSectionsProjet(request, ctx, entetes, matchSectionsProjet[1] as string)
  }
  const matchSectionId = chemin.match(/^\/sections\/([^/]+)$/)
  if (matchSectionId && request.method === 'GET') {
    return gererObtenirSection(request, ctx, entetes, matchSectionId[1] as string)
  }
  if (matchSectionId && request.method === 'PUT') {
    return gererRemplacerSection(request, ctx, entetes, matchSectionId[1] as string)
  }
  const matchSectionRestauration = chemin.match(/^\/sections\/([^/]+)\/restauration$/)
  if (matchSectionRestauration && request.method === 'PUT') {
    return gererRestaurerSection(request, ctx, entetes, matchSectionRestauration[1] as string)
  }

  // --- ProjectDocument (Phase 3c du chantier de migration D1) ---
  //
  // Une route `POST /projects/:id/documents` existe déjà depuis la Phase 3a
  // (`gererAjouterDocumentProjet` — référence un id de document dans
  // `Project.documents[]`, jamais le contenu du document, toujours
  // consommé par la section "Documents" de `FicheProjet.vue`) : la
  // création réelle d'un document utilise donc `POST /project-documents`
  // (id de projet dans le corps multipart), même patron que `sections`
  // face à la même collision.
  const matchDocumentsProjet = chemin.match(/^\/projects\/([^/]+)\/documents$/)
  if (matchDocumentsProjet && request.method === 'GET') {
    return gererListerDocumentsProjet(request, ctx, entetes, matchDocumentsProjet[1] as string)
  }
  if (chemin === '/project-documents' && request.method === 'POST') {
    return gererCreerDocumentProjet(request, ctx, entetes)
  }
  if (chemin === '/project-documents/migration-locale' && request.method === 'POST') {
    return gererMigrerDocumentProjetLocal(request, ctx, entetes)
  }
  const matchContenuDocumentProjet = chemin.match(/^\/project-documents\/([^/]+)\/contenu$/)
  if (matchContenuDocumentProjet && request.method === 'GET') {
    return gererObtenirContenuDocumentProjet(
      request,
      ctx,
      entetes,
      matchContenuDocumentProjet[1] as string,
    )
  }
  const matchDocumentProjetId = chemin.match(/^\/project-documents\/([^/]+)$/)
  if (matchDocumentProjetId && request.method === 'GET') {
    return gererObtenirDocumentProjet(request, ctx, entetes, matchDocumentProjetId[1] as string)
  }
  if (matchDocumentProjetId && request.method === 'DELETE') {
    return gererSupprimerDocumentProjet(request, ctx, entetes, matchDocumentProjetId[1] as string)
  }

  // --- Paramètres d'installation (dépôt GitHub dédié, Relais IA, Drive normes) ---
  const matchParametreInstallation = chemin.match(/^\/parametres-installation\/([^/]+)$/)
  if (matchParametreInstallation && request.method === 'GET') {
    return gererObtenirParametreInstallation(
      request,
      ctx,
      entetes,
      matchParametreInstallation[1] as string,
    )
  }
  if (matchParametreInstallation && request.method === 'PUT') {
    return gererEnregistrerParametreInstallation(
      request,
      ctx,
      entetes,
      matchParametreInstallation[1] as string,
    )
  }
  if (matchParametreInstallation && request.method === 'DELETE') {
    return gererEffacerParametreInstallation(
      request,
      ctx,
      entetes,
      matchParametreInstallation[1] as string,
    )
  }

  // --- OAuth Google (Drive normes) — jeton de rafraîchissement longue
  // durée, jamais plus le jeton d'accès (1h) recopié à la main depuis
  // l'OAuth Playground ---
  if (chemin === '/drive-oauth/demarrer' && request.method === 'GET') {
    return gererDemarrerOAuthDrive(request, ctx, entetes)
  }
  if (chemin === '/drive-oauth/callback' && request.method === 'GET') {
    return gererCallbackOAuthDrive(request, ctx)
  }
  if (chemin === '/drive-oauth/rafraichir-jeton' && request.method === 'POST') {
    return gererRafraichirJetonDrive(request, ctx, entetes)
  }

  // --- Documents normatifs (Bibliothèque de normes — global à l'installation) ---
  if (chemin === '/documents-normatifs' && request.method === 'GET') {
    return gererListerDocumentsNormatifs(request, ctx, entetes)
  }
  if (chemin === '/documents-normatifs' && request.method === 'POST') {
    return gererCreerDocumentNormatif(request, ctx, entetes)
  }
  if (chemin === '/documents-normatifs/diagnostiquer' && request.method === 'POST') {
    return gererDiagnostiquerContenuDocumentsNormatifs(request, ctx, entetes)
  }
  const matchContenuDocumentNormatif = chemin.match(/^\/documents-normatifs\/([^/]+)\/contenu$/)
  if (matchContenuDocumentNormatif && request.method === 'GET') {
    return gererObtenirContenuDocumentNormatif(
      request,
      ctx,
      entetes,
      matchContenuDocumentNormatif[1] as string,
    )
  }
  if (matchContenuDocumentNormatif && request.method === 'PUT') {
    return gererRepararContenuDocumentNormatif(
      request,
      ctx,
      entetes,
      matchContenuDocumentNormatif[1] as string,
    )
  }
  const matchDocumentNormatifId = chemin.match(/^\/documents-normatifs\/([^/]+)$/)
  if (matchDocumentNormatifId && request.method === 'PATCH') {
    return gererRenommerDocumentNormatif(
      request,
      ctx,
      entetes,
      matchDocumentNormatifId[1] as string,
    )
  }
  if (matchDocumentNormatifId && request.method === 'DELETE') {
    return gererSupprimerDocumentNormatif(
      request,
      ctx,
      entetes,
      matchDocumentNormatifId[1] as string,
    )
  }

  return reponseJson({ erreur: 'route_introuvable' }, 404, entetes)
}

// --- Handlers : authentification ---

async function gererBootstrapAdmin(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
): Promise<Response> {
  const corps = await lireCorpsJson<{
    email?: string
    motDePasse?: string
    nom?: string
    prenom?: string
    jetonBootstrap?: string
  }>(request)
  if (!corps) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)

  if (!corps.jetonBootstrap || corps.jetonBootstrap !== ctx.jetonBootstrap) {
    return reponseJson({ erreur: 'jeton_invalide' }, 403, entetes)
  }
  if ((await ctx.utilisateursRepo.compter()) > 0) {
    return reponseJson({ erreur: 'deja_initialise' }, 403, entetes)
  }

  const erreurValidation = validerNouveauCompte(corps)
  if (erreurValidation) return reponseJson({ erreur: erreurValidation }, 400, entetes)

  const maintenant = horodatage()
  const sel = genererSel()
  const hash = await hacherMotDePasse(corps.motDePasse as string, sel)
  const utilisateur: UtilisateurEnregistre = {
    id: genererId(),
    email: (corps.email as string).trim(),
    motDePasseHash: hash,
    motDePasseSel: sel,
    nom: (corps.nom as string).trim(),
    prenom: (corps.prenom as string).trim(),
    role: 'admin',
    statut: 'actif',
    createdAt: maintenant,
    updatedAt: maintenant,
    createdBy: null,
  }
  await ctx.utilisateursRepo.creer(utilisateur)
  await consignerAudit(ctx, utilisateur, 'bootstrap_admin', 'user', utilisateur.id, null)

  const jeton = await signerJwt(
    { sub: utilisateur.id, email: utilisateur.email, role: utilisateur.role },
    ctx.secretJwt,
  )
  return reponseJson({ jeton, utilisateur: versUtilisateurPublic(utilisateur) }, 201, entetes)
}

async function gererLogin(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
): Promise<Response> {
  const corps = await lireCorpsJson<{ email?: string; motDePasse?: string }>(request)
  if (!corps?.email || !corps.motDePasse) {
    return reponseJson({ erreur: 'identifiants_invalides' }, 400, entetes)
  }

  const utilisateur = await ctx.utilisateursRepo.parEmail(corps.email)
  // Message générique volontaire (email inconnu vs mot de passe incorrect
  // vs compte désactivé) — jamais confirmer l'existence d'un compte à un
  // appelant non authentifié.
  if (!utilisateur || utilisateur.statut !== 'actif') {
    return reponseJson({ erreur: 'identifiants_invalides' }, 401, entetes)
  }
  const motDePasseValide = await verifierMotDePasse(
    corps.motDePasse,
    utilisateur.motDePasseSel,
    utilisateur.motDePasseHash,
  )
  if (!motDePasseValide) {
    return reponseJson({ erreur: 'identifiants_invalides' }, 401, entetes)
  }

  const jeton = await signerJwt(
    { sub: utilisateur.id, email: utilisateur.email, role: utilisateur.role },
    ctx.secretJwt,
  )
  return reponseJson({ jeton, utilisateur: versUtilisateurPublic(utilisateur) }, 200, entetes)
}

async function gererModifierProfil(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
): Promise<Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)

  const corps = await lireCorpsJson<{ nom?: string; prenom?: string }>(request)
  if (!corps) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)

  // Jamais email/role via cet endpoint — géré exclusivement par un admin
  // (`/admin/utilisateurs/:id`), cohérent avec un RBAC minimal réel.
  const misAJour = await ctx.utilisateursRepo.mettreAJour(utilisateur.id, {
    ...(corps.nom !== undefined ? { nom: corps.nom.trim() } : {}),
    ...(corps.prenom !== undefined ? { prenom: corps.prenom.trim() } : {}),
    updatedAt: horodatage(),
  })
  if (!misAJour) return reponseJson({ erreur: 'introuvable' }, 404, entetes)
  return reponseJson({ utilisateur: versUtilisateurPublic(misAJour) }, 200, entetes)
}

async function gererChangerMotDePasse(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
): Promise<Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)

  const corps = await lireCorpsJson<{ motDePasseActuel?: string; nouveauMotDePasse?: string }>(
    request,
  )
  if (!corps?.motDePasseActuel || !corps.nouveauMotDePasse) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  const actuelValide = await verifierMotDePasse(
    corps.motDePasseActuel,
    utilisateur.motDePasseSel,
    utilisateur.motDePasseHash,
  )
  if (!actuelValide) {
    return reponseJson({ erreur: 'mot_de_passe_actuel_incorrect' }, 401, entetes)
  }
  if (corps.nouveauMotDePasse.length < LONGUEUR_MIN_MOT_DE_PASSE) {
    return reponseJson({ erreur: 'mot_de_passe_trop_court' }, 400, entetes)
  }

  const sel = genererSel()
  const hash = await hacherMotDePasse(corps.nouveauMotDePasse, sel)
  await ctx.utilisateursRepo.mettreAJour(utilisateur.id, {
    motDePasseHash: hash,
    motDePasseSel: sel,
    updatedAt: horodatage(),
  })
  await consignerAudit(ctx, utilisateur, 'changement_mot_de_passe', 'user', utilisateur.id, null)
  return reponseJson({ ok: true }, 200, entetes)
}

async function gererVerifierMotDePasse(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
): Promise<Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)

  const corps = await lireCorpsJson<{ motDePasse?: string }>(request)
  if (!corps?.motDePasse) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)

  const valide = await verifierMotDePasse(
    corps.motDePasse,
    utilisateur.motDePasseSel,
    utilisateur.motDePasseHash,
  )
  return reponseJson({ valide }, 200, entetes)
}

// --- Handlers : administration des comptes ---

async function gererListerUtilisateurs(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
): Promise<Response> {
  const acteur = await exigerAdmin(request, ctx, entetes)
  if (acteur instanceof Response) return acteur

  const utilisateurs = await ctx.utilisateursRepo.listerTous()
  return reponseJson({ utilisateurs: utilisateurs.map(versUtilisateurPublic) }, 200, entetes)
}

async function gererCreerUtilisateur(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
): Promise<Response> {
  const acteur = await exigerAdmin(request, ctx, entetes)
  if (acteur instanceof Response) return acteur

  const corps = await lireCorpsJson<{
    email?: string
    motDePasse?: string
    nom?: string
    prenom?: string
    role?: Role
  }>(request)
  if (!corps) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  if (corps.role !== 'admin' && corps.role !== 'utilisateur') {
    return reponseJson({ erreur: 'role_invalide' }, 400, entetes)
  }
  const erreurValidation = validerNouveauCompte(corps)
  if (erreurValidation) return reponseJson({ erreur: erreurValidation }, 400, entetes)

  if (await ctx.utilisateursRepo.parEmail(corps.email as string)) {
    return reponseJson({ erreur: 'email_deja_utilise' }, 409, entetes)
  }

  const maintenant = horodatage()
  const sel = genererSel()
  const hash = await hacherMotDePasse(corps.motDePasse as string, sel)
  const nouvelUtilisateur: UtilisateurEnregistre = {
    id: genererId(),
    email: (corps.email as string).trim(),
    motDePasseHash: hash,
    motDePasseSel: sel,
    nom: (corps.nom as string).trim(),
    prenom: (corps.prenom as string).trim(),
    role: corps.role,
    statut: 'actif',
    createdAt: maintenant,
    updatedAt: maintenant,
    createdBy: acteur.id,
  }
  await ctx.utilisateursRepo.creer(nouvelUtilisateur)
  await consignerAudit(ctx, acteur, 'creation_utilisateur', 'user', nouvelUtilisateur.id, null)

  const resultatEmail = await ctx.envoyeurEmail.envoyer({
    destinataire: nouvelUtilisateur.email,
    sujet: 'Votre compte ValidaPharm a été créé',
    texte: [
      `Bonjour ${nouvelUtilisateur.prenom},`,
      '',
      `Un compte ValidaPharm vient d'être créé pour vous par ${acteur.prenom} ${acteur.nom}.`,
      '',
      `Adresse de connexion : ${ctx.urlApplication}`,
      `Identifiant : ${nouvelUtilisateur.email}`,
      `Mot de passe initial : ${corps.motDePasse as string}`,
      '',
      'Nous vous recommandons de changer ce mot de passe dès votre première connexion.',
    ].join('\n'),
  })

  return reponseJson(
    { utilisateur: versUtilisateurPublic(nouvelUtilisateur), emailEnvoye: resultatEmail.ok },
    201,
    entetes,
  )
}

async function gererModifierUtilisateur(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  idCible: string,
): Promise<Response> {
  const acteur = await exigerAdmin(request, ctx, entetes)
  if (acteur instanceof Response) return acteur

  const corps = await lireCorpsJson<{ role?: Role; statut?: 'actif' | 'desactive' }>(request)
  if (!corps) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  if (corps.role !== undefined && corps.role !== 'admin' && corps.role !== 'utilisateur') {
    return reponseJson({ erreur: 'role_invalide' }, 400, entetes)
  }
  if (corps.statut !== undefined && corps.statut !== 'actif' && corps.statut !== 'desactive') {
    return reponseJson({ erreur: 'statut_invalide' }, 400, entetes)
  }

  const misAJour = await ctx.utilisateursRepo.mettreAJour(idCible, {
    ...(corps.role !== undefined ? { role: corps.role } : {}),
    ...(corps.statut !== undefined ? { statut: corps.statut } : {}),
    updatedAt: horodatage(),
  })
  if (!misAJour) return reponseJson({ erreur: 'introuvable' }, 404, entetes)
  await consignerAudit(ctx, acteur, 'modification_utilisateur', 'user', idCible, null)
  return reponseJson({ utilisateur: versUtilisateurPublic(misAJour) }, 200, entetes)
}

// --- Handlers : audit ---

async function gererListerAudit(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  url: URL,
): Promise<Response> {
  const acteur = await exigerAdmin(request, ctx, entetes)
  if (acteur instanceof Response) return acteur

  const limiteParam = Number(url.searchParams.get('limite') ?? '50')
  const limite = Number.isFinite(limiteParam) && limiteParam > 0 ? Math.min(limiteParam, 500) : 50
  const entrees = await ctx.auditRepo.lister(limite)
  return reponseJson({ entrees }, 200, entetes)
}

async function gererAutoriserAction(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
): Promise<Response> {
  const acteur = await exigerAdmin(request, ctx, entetes)
  if (acteur instanceof Response) return acteur

  const corps = await lireCorpsJson<{
    action?: string
    targetType?: string
    targetId?: string
    justification?: string
  }>(request)
  if (!corps?.action || !corps.targetType || !corps.targetId) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  if (!corps.justification || corps.justification.trim().length === 0) {
    return reponseJson({ erreur: 'justification_obligatoire' }, 400, entetes)
  }

  const id = genererId()
  await consignerAudit(
    ctx,
    acteur,
    corps.action,
    corps.targetType,
    corps.targetId,
    corps.justification.trim(),
  )
  return reponseJson({ authorized: true, auditId: id }, 200, entetes)
}

// --- Handlers : clients ---

async function gererListerClients(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
): Promise<Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)

  const clients = await ctx.clientsRepo.listerVisiblesPar(utilisateur)
  return reponseJson({ clients }, 200, entetes)
}

async function gererCreerClient(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
): Promise<Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)

  const corps = await lireCorpsJson<{
    name?: string
    adresse?: string | null
    secteur?: ClientEnregistre['secteur']
    details?: string | null
  }>(request)
  if (!corps?.name || corps.name.trim().length === 0) {
    return reponseJson({ erreur: 'nom_obligatoire' }, 400, entetes)
  }

  const maintenant = horodatage()
  const client: ClientEnregistre = {
    id: genererId(),
    name: corps.name.trim(),
    adresse: corps.adresse ?? null,
    secteur: corps.secteur ?? null,
    details: corps.details ?? null,
    statut: 'actif',
    archivedAt: null,
    archivedBy: null,
    createdByUserId: utilisateur.id,
    sharedWith: [],
    createdAt: maintenant,
    updatedAt: maintenant,
  }
  await ctx.clientsRepo.creer(client)
  await consignerAudit(ctx, utilisateur, 'creation_client', 'client', client.id, null)
  return reponseJson({ client }, 201, entetes)
}

async function gererObtenirClient(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  id: string,
): Promise<Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)

  const client = await ctx.clientsRepo.parId(id)
  if (!client || !peutVoirClient(utilisateur, client)) {
    // 404 générique — jamais distinguer "introuvable" de "non autorisé" à
    // un appelant qui n'a pas le droit de le savoir.
    return reponseJson({ erreur: 'introuvable' }, 404, entetes)
  }
  return reponseJson({ client }, 200, entetes)
}

async function gererModifierClient(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  id: string,
): Promise<Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)

  const client = await ctx.clientsRepo.parId(id)
  if (!client || !peutVoirClient(utilisateur, client)) {
    return reponseJson({ erreur: 'introuvable' }, 404, entetes)
  }
  if (!peutModifierClient(utilisateur, client)) {
    return reponseJson({ erreur: 'non_autorise' }, 403, entetes)
  }

  const corps = await lireCorpsJson<{
    name?: string
    adresse?: string | null
    secteur?: ClientEnregistre['secteur']
    details?: string | null
    statut?: ClientEnregistre['statut']
    sharedWith?: string[]
  }>(request)
  if (!corps) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)

  // Un changement de statut explicite doit être cohérent avec l'état
  // actuel — jamais un archivage silencieux d'un client déjà archivé
  // (idempotence trompeuse), même discipline que l'ancienne implémentation
  // Dexie (`useClientsStore.archiverClient`/`desarchiverClient`).
  if (corps.statut === 'archive' && client.statut === 'archive') {
    return reponseJson({ erreur: 'deja_archive' }, 409, entetes)
  }
  if (corps.statut === 'actif' && client.statut !== 'archive') {
    return reponseJson({ erreur: 'deja_actif' }, 409, entetes)
  }

  const archivage = corps.statut === 'archive' && client.statut !== 'archive'
  const desarchivage = corps.statut === 'actif' && client.statut === 'archive'

  const misAJour = await ctx.clientsRepo.mettreAJour(id, {
    ...(corps.name !== undefined ? { name: corps.name.trim() } : {}),
    ...(corps.adresse !== undefined ? { adresse: corps.adresse } : {}),
    ...(corps.secteur !== undefined ? { secteur: corps.secteur } : {}),
    ...(corps.details !== undefined ? { details: corps.details } : {}),
    ...(corps.statut !== undefined ? { statut: corps.statut } : {}),
    ...(archivage ? { archivedAt: horodatage(), archivedBy: utilisateur.email } : {}),
    ...(desarchivage ? { archivedAt: null, archivedBy: null } : {}),
    // Le partage ne peut être changé que par le créateur ou un admin —
    // jamais par un utilisateur seulement partagé (il ne peut pas
    // s'accorder l'accès à d'autres).
    ...(corps.sharedWith !== undefined &&
    (utilisateur.role === 'admin' || client.createdByUserId === utilisateur.id)
      ? { sharedWith: corps.sharedWith }
      : {}),
    updatedAt: horodatage(),
  })
  if (!misAJour) return reponseJson({ erreur: 'introuvable' }, 404, entetes)

  if (archivage) await consignerAudit(ctx, utilisateur, 'archivage_client', 'client', id, null)
  if (desarchivage)
    await consignerAudit(ctx, utilisateur, 'desarchivage_client', 'client', id, null)
  return reponseJson({ client: misAJour }, 200, entetes)
}

async function gererSupprimerClientDefinitivement(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  id: string,
): Promise<Response> {
  const acteur = await exigerAdmin(request, ctx, entetes)
  if (acteur instanceof Response) return acteur

  const corps = await lireCorpsJson<{ justification?: string }>(request)
  if (!corps?.justification || corps.justification.trim().length === 0) {
    return reponseJson({ erreur: 'justification_obligatoire' }, 400, entetes)
  }

  const client = await ctx.clientsRepo.parId(id)
  if (!client) return reponseJson({ erreur: 'introuvable' }, 404, entetes)

  await ctx.clientsRepo.supprimerDefinitivement(id)
  await consignerAudit(
    ctx,
    acteur,
    'suppression_definitive_client',
    'client',
    id,
    corps.justification.trim(),
  )
  return reponseJson({ ok: true }, 200, entetes)
}

// --- Handlers : Structure Système (référentiel d'actifs, Phase 1 du
// chantier de migration D1, docs/CHANTIER-MIGRATION-D1-RECAP.md) ---
//
// La logique métier (unicité de code, absence de cycle, un niveau
// référencé par un nœud ne peut être ni renommé ni supprimé…) reste
// côté store frontend (`useStructureSystemeStore.ts`, déjà testée) — ces
// handlers ne font qu'authentifier, vérifier l'accès au client concerné
// et persister l'état qu'on leur donne, même discipline que
// `gererModifierClient`/`peutModifierClient`.

/** Authentifie puis vérifie l'accès au client concerné — retourne soit l'acteur, soit la Response d'erreur à renvoyer telle quelle. Même garde que `peutVoirClient`/`peutModifierClient` : jamais distinguer "client introuvable" de "non autorisé" à un appelant qui n'a pas le droit de le savoir. */
async function exigerAccesClient(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<UtilisateurEnregistre | Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)
  const client = await ctx.clientsRepo.parId(clientId)
  if (!client || !peutVoirClient(utilisateur, client)) {
    return reponseJson({ erreur: 'introuvable' }, 404, entetes)
  }
  return utilisateur
}

async function gererObtenirStructureSysteme(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const [schema, noeuds, relationsTechniques] = await Promise.all([
    ctx.structureSystemeRepo.obtenirSchema(clientId),
    ctx.structureSystemeRepo.listerNoeuds(clientId),
    ctx.structureSystemeRepo.listerRelationsTechniques(clientId),
  ])
  return reponseJson(
    { schema: schema ?? { clientId, levels: [] }, noeuds, relationsTechniques },
    200,
    entetes,
  )
}

async function gererEnregistrerSchemaHierarchie(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const corps = await lireCorpsJson<{ levels?: NiveauHierarchieEnregistre[] }>(request)
  if (!corps || !Array.isArray(corps.levels)) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  const schema: AssetHierarchySchemaEnregistre = { clientId, levels: corps.levels }
  await ctx.structureSystemeRepo.enregistrerSchema(schema)
  return reponseJson({ schema }, 200, entetes)
}

/**
 * Champs qu'un client peut fournir à la création — jamais `auditLog`/
 * `createdAt`/`updatedAt`, dérivés ici pour ne jamais faire confiance à une
 * identité d'acteur fournie par l'appelant (même discipline que
 * `uploadedBy` sur les documents normatifs).
 *
 * `id` reste une exception délibérée pour l'import en lot uniquement
 * (`gererCreerNoeudsEnLot`) : la planification pure d'un import
 * (`preparerImportHierarchie`/`preparerImportHierarchieSap`, côté store
 * frontend) attribue déjà les identifiants des nouveaux nœuds AVANT
 * l'appel réseau, précisément pour pouvoir faire pointer un nouveau nœud
 * vers le parent qu'il vient de créer dans le même lot (`parentId`
 * référençant un autre élément du même tableau) — un identifiant
 * regénéré côté serveur casserait ce chaînage. Aucun souci de sécurité :
 * un identifiant n'est qu'une clé étrangère opaque, jamais une donnée
 * sensible. `gererCreerNoeud` (création manuelle, un seul nœud, jamais de
 * chaînage) ignore ce champ et génère toujours son propre identifiant.
 */
interface SaisieCreationNoeud {
  id?: string
  levelKey?: string
  name?: string
  code?: string
  parentId?: string | null
  workspaceId?: string | null
}

function noeudDepuisSaisie(
  clientId: string,
  saisie: SaisieCreationNoeud,
  source: AssetNodeEnregistre['source'],
  acteur: UtilisateurEnregistre,
  action: string,
  idImpose?: string,
): AssetNodeEnregistre | null {
  if (!saisie.levelKey || !saisie.name || !saisie.code) return null
  const maintenant = horodatage()
  return {
    id: idImpose ?? genererId(),
    clientId,
    workspaceId: saisie.workspaceId ?? null,
    levelKey: saisie.levelKey,
    name: saisie.name,
    code: saisie.code,
    parentId: saisie.parentId ?? null,
    associatedNodes: [],
    source,
    qmsConnectorId: null,
    periodicQualification: { applicable: false, deadline: null },
    qualificationStatus: 'non_qualifie',
    auditLog: [{ timestamp: maintenant, actor: acteur.email, action }],
    createdAt: maintenant,
    updatedAt: maintenant,
  }
}

async function gererCreerNoeud(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const corps = await lireCorpsJson<SaisieCreationNoeud>(request)
  const noeud = corps ? noeudDepuisSaisie(clientId, corps, 'manuel', acteur, 'création') : null
  if (!noeud) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)

  await ctx.structureSystemeRepo.creerNoeud(noeud)
  return reponseJson({ noeud }, 201, entetes)
}

async function gererCreerNoeudsEnLot(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const corps = await lireCorpsJson<{ noeuds?: SaisieCreationNoeud[]; action?: string }>(request)
  if (!corps || !Array.isArray(corps.noeuds)) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  const action = corps.action ?? 'création (import)'
  const noeuds: AssetNodeEnregistre[] = []
  for (const saisie of corps.noeuds) {
    if (!saisie.id) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    const noeud = noeudDepuisSaisie(clientId, saisie, 'import_fichier', acteur, action, saisie.id)
    if (!noeud) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    noeuds.push(noeud)
  }

  await ctx.structureSystemeRepo.creerNoeuds(noeuds)
  return reponseJson({ noeuds }, 201, entetes)
}

/**
 * Migration ponctuelle (filet de sécurité `assetNodesAMigrer`,
 * `useStructureSystemeStore.migrerStructureSystemeLocaleVersServeur`) —
 * seule route qui accepte un nœud déjà complet tel quel (statut de
 * qualification, périodicité, journal d'audit d'origine, horodatages
 * d'origine inclus) : contrairement à `gererCreerNoeud`/
 * `gererCreerNoeudsEnLot`, ces données ne sont jamais fabriquées ici mais
 * proviennent d'un enregistrement réel déjà existant côté navigateur
 * (ALCOA+ : une migration de stockage ne doit jamais faire perdre un
 * statut de qualification déjà acté ni réécrire son historique).
 */
async function gererMigrerNoeudsLocaux(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const corps = await lireCorpsJson<{ noeuds?: AssetNodeEnregistre[] }>(request)
  if (!corps || !Array.isArray(corps.noeuds)) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  const noeuds: AssetNodeEnregistre[] = []
  for (const n of corps.noeuds) {
    if (!n.id || !n.levelKey || !n.name || !n.code) {
      return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    }
    noeuds.push({ ...n, clientId })
  }

  await ctx.structureSystemeRepo.creerNoeuds(noeuds)
  return reponseJson({ noeuds }, 201, entetes)
}

async function gererModifierNoeud(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  noeudId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const noeud = await ctx.structureSystemeRepo.noeudParId(noeudId)
  if (!noeud || noeud.clientId !== clientId) {
    return reponseJson({ erreur: 'introuvable' }, 404, entetes)
  }

  const corps = await lireCorpsJson<{
    parentId?: string | null
    qualificationStatus?: string
    periodicQualification?: { applicable: boolean; deadline: string | null }
    action?: string
  }>(request)
  if (!corps) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)

  const maintenant = horodatage()
  const misAJour: AssetNodeEnregistre = {
    ...noeud,
    ...(corps.parentId !== undefined ? { parentId: corps.parentId } : {}),
    ...(corps.qualificationStatus !== undefined
      ? { qualificationStatus: corps.qualificationStatus }
      : {}),
    ...(corps.periodicQualification !== undefined
      ? { periodicQualification: corps.periodicQualification }
      : {}),
    updatedAt: maintenant,
    auditLog: [
      ...noeud.auditLog,
      { timestamp: maintenant, actor: acteur.email, action: corps.action ?? 'modification' },
    ],
  }
  await ctx.structureSystemeRepo.remplacerNoeud(misAJour)
  return reponseJson({ noeud: misAJour }, 200, entetes)
}

async function gererCreerRelationTechnique(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const corps = await lireCorpsJson<{
    typeRelation?: string
    noeudSourceId?: string
    noeudCibleId?: string
  }>(request)
  if (!corps?.typeRelation || !corps.noeudSourceId || !corps.noeudCibleId) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  const source = await ctx.structureSystemeRepo.noeudParId(corps.noeudSourceId)
  const cible = await ctx.structureSystemeRepo.noeudParId(corps.noeudCibleId)
  if (!source || !cible || source.clientId !== clientId || cible.clientId !== clientId) {
    return reponseJson({ erreur: 'noeud_introuvable' }, 400, entetes)
  }

  const relation: RelationTechniqueEnregistree = {
    id: genererId(),
    clientId,
    typeRelation: corps.typeRelation,
    noeudSourceId: corps.noeudSourceId,
    noeudCibleId: corps.noeudCibleId,
    createdAt: horodatage(),
  }
  await ctx.structureSystemeRepo.creerRelationTechnique(relation)
  return reponseJson({ relation }, 201, entetes)
}

// --- Handlers : ACFC (méthode configurable par client, F2 du catalogue
// §10, Phase 4a du chantier de migration D1) ---
//
// La logique métier (numéro de version suivant, calcul du verdict via
// `evaluerVerdictACFC`) reste côté store frontend
// (`useMethodProfileACFCStore.ts`, déjà testée) — ces handlers ne font
// qu'authentifier, vérifier l'accès au client concerné et persister l'état
// qu'on leur donne, même discipline que les handlers Structure Système.

interface SaisieCreationProfilAcfc {
  version?: string
  source?: string
  origin?: string
  questions?: QuestionACFCEnregistree[]
  decisionRule?: string
}

function profilAcfcDepuisSaisie(
  clientId: string,
  saisie: SaisieCreationProfilAcfc,
): MethodProfileACFCEnregistre | null {
  if (
    !saisie.version ||
    !saisie.source ||
    !saisie.origin ||
    !Array.isArray(saisie.questions) ||
    !saisie.decisionRule
  ) {
    return null
  }
  const maintenant = horodatage()
  return {
    id: genererId(),
    clientId,
    version: saisie.version,
    effectiveDate: maintenant,
    source: saisie.source,
    origin: saisie.origin,
    questions: saisie.questions,
    decisionRule: saisie.decisionRule,
    createdAt: maintenant,
  }
}

async function gererObtenirAcfc(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const [profils, evaluations] = await Promise.all([
    ctx.acfcRepo.listerProfils(clientId),
    ctx.acfcRepo.listerEvaluations(clientId),
  ])
  return reponseJson({ profils, evaluations }, 200, entetes)
}

async function gererCreerProfilAcfc(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const corps = await lireCorpsJson<SaisieCreationProfilAcfc>(request)
  const profil = corps ? profilAcfcDepuisSaisie(clientId, corps) : null
  if (!profil) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)

  await ctx.acfcRepo.creerProfil(profil)
  return reponseJson({ profil }, 201, entetes)
}

interface SaisieCreationEvaluationAcfc {
  methodProfileId?: string
  methodProfileVersion?: string
  assetNodeId?: string | null
  nomElement?: string
  reponses?: Record<string, string>
  verdict?: string | null
}

async function gererCreerEvaluationAcfc(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const corps = await lireCorpsJson<SaisieCreationEvaluationAcfc>(request)
  if (
    !corps?.methodProfileId ||
    !corps.methodProfileVersion ||
    !corps.nomElement ||
    !corps.reponses
  ) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  const maintenant = horodatage()
  const evaluation: EvaluationACFCEnregistree = {
    id: genererId(),
    clientId,
    methodProfileId: corps.methodProfileId,
    methodProfileVersion: corps.methodProfileVersion,
    assetNodeId: corps.assetNodeId ?? null,
    nomElement: corps.nomElement,
    reponses: corps.reponses,
    verdict: corps.verdict ?? null,
    auditLog: [{ timestamp: maintenant, actor: acteur.email, action: 'création' }],
    createdAt: maintenant,
    updatedAt: maintenant,
  }
  await ctx.acfcRepo.creerEvaluation(evaluation)
  return reponseJson({ evaluation }, 201, entetes)
}

/**
 * Filet de sécurité de migration locale (`acfcAMigrer`,
 * `useMethodProfileACFCStore.migrerAcfcLocalVersServeur`) — idempotente,
 * l'existant côté serveur gagne toujours (`ON CONFLICT(id) DO NOTHING`
 * dans `D1AcfcRepo`), jamais un écrasement, même discipline que
 * `POST /sections/migration-locale`.
 */
interface SaisieMigrationAcfc {
  profils?: MethodProfileACFCEnregistre[]
  evaluations?: EvaluationACFCEnregistree[]
}

async function gererMigrerAcfcLocal(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const corps = await lireCorpsJson<SaisieMigrationAcfc>(request)
  if (!corps || (!Array.isArray(corps.profils) && !Array.isArray(corps.evaluations))) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  for (const p of corps.profils ?? []) {
    if (p.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.acfcRepo.creerProfil(p)
  }
  for (const e of corps.evaluations ?? []) {
    if (e.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.acfcRepo.creerEvaluation(e)
  }
  return reponseJson(
    { profils: corps.profils ?? [], evaluations: corps.evaluations ?? [] },
    200,
    entetes,
  )
}

// --- Handlers : Parameter/ClassificationCriticiteParametre/CPP/CQA (Target
// Architecture §10, Phase 4b du chantier de migration D1) ---
//
// Garde-fou central inchangé côté serveur : aucun de ces handlers ne crée
// de CPP/CQA à partir d'une classification, ce sont des actes de
// déclaration humaine distincts et volontairement non reliés par du code
// (même discipline que `useParameterStore.ts`, déjà testée).

async function gererObtenirParameters(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const [parametresProcede, classifications, cpps, cqas] = await Promise.all([
    ctx.parametersRepo.listerParametres(clientId),
    ctx.parametersRepo.listerClassifications(clientId),
    ctx.parametersRepo.listerCPPs(clientId),
    ctx.parametersRepo.listerCQAs(clientId),
  ])
  return reponseJson({ parametresProcede, classifications, cpps, cqas }, 200, entetes)
}

interface SaisieCreationParametre {
  nom?: string
  description?: string
  unite?: string | null
  assetNodeId?: string | null
}

async function gererCreerParametre(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const corps = await lireCorpsJson<SaisieCreationParametre>(request)
  // `description` peut être vide (chaîne vide) sans être invalide — seul
  // `nom` est réellement requis ; `undefined` distingue "absent" de "vide".
  if (!corps?.nom || corps.description === undefined) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  const maintenant = horodatage()
  // Clé `parametreProcede` (jamais `parametre`) : `parametre` désigne déjà
  // une entrée `parametres_installation` (config technique clé/valeur,
  // `/parametres-installation/:cle`) — une collision de nom aurait rendu
  // les deux réponses JSON ambiguës pour le frontend.
  const parametreProcede: ParameterEnregistre = {
    id: genererId(),
    clientId,
    assetNodeId: corps.assetNodeId ?? null,
    nom: corps.nom,
    description: corps.description,
    unite: corps.unite ?? null,
    auditLog: [{ timestamp: maintenant, actor: acteur.email, action: 'création' }],
    createdAt: maintenant,
    updatedAt: maintenant,
  }
  await ctx.parametersRepo.creerParametre(parametreProcede)
  return reponseJson({ parametreProcede }, 201, entetes)
}

interface SaisieCreationClassification {
  parameterId?: string
  niveau?: string
  contexte?: string | null
  justification?: string
}

async function gererCreerClassification(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const corps = await lireCorpsJson<SaisieCreationClassification>(request)
  if (!corps?.parameterId || !corps.niveau || !corps.justification) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  const maintenant = horodatage()
  const classification: ClassificationCriticiteParametreEnregistree = {
    id: genererId(),
    clientId,
    parameterId: corps.parameterId,
    niveau: corps.niveau,
    contexte: corps.contexte ?? null,
    justification: corps.justification,
    auditLog: [{ timestamp: maintenant, actor: acteur.email, action: 'création' }],
    createdAt: maintenant,
  }
  await ctx.parametersRepo.creerClassification(classification)
  return reponseJson({ classification }, 201, entetes)
}

interface SaisieCreationCPP {
  parameterId?: string
  contexte?: string
  justification?: string
}

async function gererCreerCPP(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const corps = await lireCorpsJson<SaisieCreationCPP>(request)
  if (!corps?.parameterId || !corps.contexte || !corps.justification) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  const maintenant = horodatage()
  const cpp: CPPEnregistre = {
    id: genererId(),
    clientId,
    parameterId: corps.parameterId,
    contexte: corps.contexte,
    justification: corps.justification,
    actif: true,
    auditLog: [{ timestamp: maintenant, actor: acteur.email, action: 'création' }],
    createdAt: maintenant,
    updatedAt: maintenant,
  }
  await ctx.parametersRepo.creerCPP(cpp)
  return reponseJson({ cpp }, 201, entetes)
}

/**
 * Désactive un CPP existant (changement de contexte) sans le muter ni le
 * supprimer : l'historique reste lisible tel qu'il a été produit — même
 * principe `ContextSnapshot` que `gererModifierNoeud`.
 */
async function gererDesactiverCPP(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  cppId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const cpp = await ctx.parametersRepo.cppParId(cppId)
  if (!cpp || cpp.clientId !== clientId) {
    return reponseJson({ erreur: 'introuvable' }, 404, entetes)
  }
  const corps = await lireCorpsJson<{ motif?: string }>(request)
  if (!corps?.motif) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)

  const maintenant = horodatage()
  const misAJour: CPPEnregistre = {
    ...cpp,
    actif: false,
    auditLog: [
      ...cpp.auditLog,
      { timestamp: maintenant, actor: acteur.email, action: `désactivation : ${corps.motif}` },
    ],
    updatedAt: maintenant,
  }
  await ctx.parametersRepo.remplacerCPP(misAJour)
  return reponseJson({ cpp: misAJour }, 200, entetes)
}

interface SaisieCreationCQA {
  nom?: string
  description?: string
  contexte?: string
  justification?: string
}

async function gererCreerCQA(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const corps = await lireCorpsJson<SaisieCreationCQA>(request)
  // `description` peut être vide (chaîne vide) sans être invalide, même
  // discipline que `gererCreerParametre`.
  if (!corps?.nom || corps.description === undefined || !corps.contexte || !corps.justification) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  const maintenant = horodatage()
  const cqa: CQAEnregistre = {
    id: genererId(),
    clientId,
    nom: corps.nom,
    description: corps.description,
    contexte: corps.contexte,
    justification: corps.justification,
    actif: true,
    auditLog: [{ timestamp: maintenant, actor: acteur.email, action: 'création' }],
    createdAt: maintenant,
    updatedAt: maintenant,
  }
  await ctx.parametersRepo.creerCQA(cqa)
  return reponseJson({ cqa }, 201, entetes)
}

async function gererDesactiverCQA(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  cqaId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const cqa = await ctx.parametersRepo.cqaParId(cqaId)
  if (!cqa || cqa.clientId !== clientId) {
    return reponseJson({ erreur: 'introuvable' }, 404, entetes)
  }
  const corps = await lireCorpsJson<{ motif?: string }>(request)
  if (!corps?.motif) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)

  const maintenant = horodatage()
  const misAJour: CQAEnregistre = {
    ...cqa,
    actif: false,
    auditLog: [
      ...cqa.auditLog,
      { timestamp: maintenant, actor: acteur.email, action: `désactivation : ${corps.motif}` },
    ],
    updatedAt: maintenant,
  }
  await ctx.parametersRepo.remplacerCQA(misAJour)
  return reponseJson({ cqa: misAJour }, 200, entetes)
}

/**
 * Filet de sécurité de migration locale (`parametersAMigrer`/etc.,
 * `useParameterStore.migrerParametersLocalVersServeur`) — idempotente,
 * l'existant côté serveur gagne toujours (`ON CONFLICT(id) DO NOTHING`
 * dans `D1ParametersRepo`), même discipline que `POST /clients/:id/acfc/migration-locale`.
 */
interface SaisieMigrationParameters {
  parametresProcede?: ParameterEnregistre[]
  classifications?: ClassificationCriticiteParametreEnregistree[]
  cpps?: CPPEnregistre[]
  cqas?: CQAEnregistre[]
}

async function gererMigrerParametersLocal(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const corps = await lireCorpsJson<SaisieMigrationParameters>(request)
  if (
    !corps ||
    (!Array.isArray(corps.parametresProcede) &&
      !Array.isArray(corps.classifications) &&
      !Array.isArray(corps.cpps) &&
      !Array.isArray(corps.cqas))
  ) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  for (const p of corps.parametresProcede ?? []) {
    if (p.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.parametersRepo.creerParametre(p)
  }
  for (const c of corps.classifications ?? []) {
    if (c.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.parametersRepo.creerClassification(c)
  }
  for (const c of corps.cpps ?? []) {
    if (c.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.parametersRepo.creerCPP(c)
  }
  for (const c of corps.cqas ?? []) {
    if (c.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.parametersRepo.creerCQA(c)
  }
  return reponseJson(
    {
      parametresProcede: corps.parametresProcede ?? [],
      classifications: corps.classifications ?? [],
      cpps: corps.cpps ?? [],
      cqas: corps.cqas ?? [],
    },
    200,
    entetes,
  )
}

// --- Handlers : Impact Assessment / System Classification (F1 du
// catalogue §10, Phase 4c du chantier de migration D1) ---
//
// La logique métier (numéro de version suivant, calcul du verdict) reste
// côté store frontend (`useImpactAssessmentStore.ts`, déjà testée) — ces
// handlers ne font qu'authentifier, vérifier l'accès au client concerné
// et persister l'état qu'on leur donne, même discipline que les handlers
// ACFC.

interface SaisieCreationProfilImpactAssessment {
  version?: string
  source?: string
  origin?: string
  questions?: QuestionImpactAssessmentEnregistree[]
  decisionRule?: string
}

function profilImpactAssessmentDepuisSaisie(
  clientId: string,
  saisie: SaisieCreationProfilImpactAssessment,
): MethodProfileImpactAssessmentEnregistre | null {
  if (
    !saisie.version ||
    !saisie.source ||
    !saisie.origin ||
    !Array.isArray(saisie.questions) ||
    !saisie.decisionRule
  ) {
    return null
  }
  const maintenant = horodatage()
  return {
    id: genererId(),
    clientId,
    version: saisie.version,
    effectiveDate: maintenant,
    source: saisie.source,
    origin: saisie.origin,
    questions: saisie.questions,
    decisionRule: saisie.decisionRule,
    createdAt: maintenant,
  }
}

async function gererObtenirImpactAssessment(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const [profilsImpact, evaluationsImpact] = await Promise.all([
    ctx.impactAssessmentRepo.listerProfils(clientId),
    ctx.impactAssessmentRepo.listerEvaluations(clientId),
  ])
  return reponseJson({ profilsImpact, evaluationsImpact }, 200, entetes)
}

async function gererCreerProfilImpactAssessment(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const corps = await lireCorpsJson<SaisieCreationProfilImpactAssessment>(request)
  // Clé `profilImpact` (jamais `profil`) : `profil` désigne déjà la
  // réponse de `POST /clients/:id/acfc/profils` — même discipline que
  // `parametreProcede` pour éviter une collision de nom entre deux
  // réponses JSON distinctes.
  const profilImpact = corps ? profilImpactAssessmentDepuisSaisie(clientId, corps) : null
  if (!profilImpact) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)

  await ctx.impactAssessmentRepo.creerProfil(profilImpact)
  return reponseJson({ profilImpact }, 201, entetes)
}

interface SaisieCreationEvaluationImpactAssessment {
  methodProfileId?: string
  methodProfileVersion?: string
  assetNodeId?: string | null
  nomElement?: string
  reponses?: Record<string, string>
  verdict?: string | null
}

async function gererCreerEvaluationImpactAssessment(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const corps = await lireCorpsJson<SaisieCreationEvaluationImpactAssessment>(request)
  if (
    !corps?.methodProfileId ||
    !corps.methodProfileVersion ||
    !corps.nomElement ||
    !corps.reponses
  ) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  const maintenant = horodatage()
  const evaluationImpact: EvaluationImpactAssessmentEnregistree = {
    id: genererId(),
    clientId,
    methodProfileId: corps.methodProfileId,
    methodProfileVersion: corps.methodProfileVersion,
    assetNodeId: corps.assetNodeId ?? null,
    nomElement: corps.nomElement,
    reponses: corps.reponses,
    verdict: corps.verdict ?? null,
    auditLog: [{ timestamp: maintenant, actor: acteur.email, action: 'création' }],
    createdAt: maintenant,
    updatedAt: maintenant,
  }
  await ctx.impactAssessmentRepo.creerEvaluation(evaluationImpact)
  return reponseJson({ evaluationImpact }, 201, entetes)
}

/**
 * Filet de sécurité de migration locale (`methodProfilesImpactAssessmentAMigrer`/
 * `evaluationsImpactAssessmentAMigrer`,
 * `useImpactAssessmentStore.migrerImpactAssessmentLocalVersServeur`) —
 * idempotente, l'existant côté serveur gagne toujours (`ON CONFLICT(id) DO
 * NOTHING` dans `D1ImpactAssessmentRepo`), même discipline que
 * `POST /clients/:id/acfc/migration-locale`.
 */
interface SaisieMigrationImpactAssessment {
  profilsImpact?: MethodProfileImpactAssessmentEnregistre[]
  evaluationsImpact?: EvaluationImpactAssessmentEnregistree[]
}

async function gererMigrerImpactAssessmentLocal(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const corps = await lireCorpsJson<SaisieMigrationImpactAssessment>(request)
  if (!corps || (!Array.isArray(corps.profilsImpact) && !Array.isArray(corps.evaluationsImpact))) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  for (const p of corps.profilsImpact ?? []) {
    if (p.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.impactAssessmentRepo.creerProfil(p)
  }
  for (const e of corps.evaluationsImpact ?? []) {
    if (e.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.impactAssessmentRepo.creerEvaluation(e)
  }
  return reponseJson(
    { profilsImpact: corps.profilsImpact ?? [], evaluationsImpact: corps.evaluationsImpact ?? [] },
    200,
    entetes,
  )
}

// --- Handlers : Computer System Assessment (F3 du catalogue §10, Phase
// 4c du chantier de migration D1) ---
//
// Pas de MethodProfile ici : la catégorisation GAMP5 est une grille
// normative fixe (PIC/S PI 011-3), jamais configurable par client — même
// discipline documentée dans `useCSVAssessmentStore.ts`.

async function gererObtenirCsvAssessment(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const evaluationsCsv = await ctx.csvAssessmentRepo.listerEvaluations(clientId)
  return reponseJson({ evaluationsCsv }, 200, entetes)
}

interface SaisieCreationEvaluationCsvAssessment {
  assetNodeId?: string | null
  nomSysteme?: string
  categorieGamp5?: number
  justificationCategorie?: string
  pertinenceGxp?: boolean
  pertinenceEresPart11?: boolean
  justificationPertinence?: string
}

async function gererCreerEvaluationCsvAssessment(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const corps = await lireCorpsJson<SaisieCreationEvaluationCsvAssessment>(request)
  if (
    !corps?.nomSysteme ||
    !corps.categorieGamp5 ||
    !corps.justificationCategorie ||
    corps.pertinenceGxp === undefined ||
    corps.pertinenceEresPart11 === undefined ||
    !corps.justificationPertinence
  ) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  const maintenant = horodatage()
  const evaluationCsv: EvaluationCSVAssessmentEnregistree = {
    id: genererId(),
    clientId,
    assetNodeId: corps.assetNodeId ?? null,
    nomSysteme: corps.nomSysteme,
    categorieGamp5: corps.categorieGamp5,
    justificationCategorie: corps.justificationCategorie,
    pertinenceGxp: corps.pertinenceGxp,
    pertinenceEresPart11: corps.pertinenceEresPart11,
    justificationPertinence: corps.justificationPertinence,
    auditLog: [{ timestamp: maintenant, actor: acteur.email, action: 'création' }],
    createdAt: maintenant,
    updatedAt: maintenant,
  }
  await ctx.csvAssessmentRepo.creerEvaluation(evaluationCsv)
  return reponseJson({ evaluationCsv }, 201, entetes)
}

/**
 * Filet de sécurité de migration locale (`evaluationsCSVAssessmentAMigrer`,
 * `useCSVAssessmentStore.migrerCsvAssessmentLocalVersServeur`) —
 * idempotente, même discipline que les autres migrations locales de ce
 * chantier.
 */
interface SaisieMigrationCsvAssessment {
  evaluationsCsv?: EvaluationCSVAssessmentEnregistree[]
}

async function gererMigrerCsvAssessmentLocal(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const corps = await lireCorpsJson<SaisieMigrationCsvAssessment>(request)
  if (!corps || !Array.isArray(corps.evaluationsCsv)) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  for (const e of corps.evaluationsCsv) {
    if (e.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.csvAssessmentRepo.creerEvaluation(e)
  }
  return reponseJson({ evaluationsCsv: corps.evaluationsCsv }, 200, entetes)
}

// --- Handlers : Risk Assessment / AMDEC (Target Architecture §10, Phase
// 4d du chantier de migration D1) ---
//
// La logique métier (numéro de version suivant, calcul IPR, verdict) reste
// côté store frontend (`useRiskAssessmentStore.ts`, déjà testée) — ces
// handlers ne font qu'authentifier, vérifier l'accès au client concerné et
// persister l'état qu'on leur donne, même discipline que les handlers
// Impact Assessment/Parameters. Clés JSON `profilRisque`/`evaluationRisque`
// (jamais `profil`/`evaluation`, déjà pris par ACFC, ni `profilImpact`/
// `evaluationImpact`/`evaluationCsv`) — même discipline de désambiguïsation
// que `parametreProcede`.

async function gererObtenirRiskAssessment(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const [profilsRisque, evaluationsRisque] = await Promise.all([
    ctx.riskAssessmentRepo.listerProfils(clientId),
    ctx.riskAssessmentRepo.listerEvaluations(clientId),
  ])
  return reponseJson({ profilsRisque, evaluationsRisque }, 200, entetes)
}

interface SaisieCreationProfilRiskAssessment {
  version?: string
  source?: string
  origin?: string
  echelleMin?: number
  echelleMax?: number
  seuilAction?: number
}

async function gererCreerProfilRiskAssessment(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const corps = await lireCorpsJson<SaisieCreationProfilRiskAssessment>(request)
  if (
    !corps?.version ||
    !corps.source ||
    !corps.origin ||
    corps.echelleMin === undefined ||
    corps.echelleMax === undefined ||
    corps.seuilAction === undefined
  ) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  const maintenant = horodatage()
  const profilRisque: MethodProfileRiskAssessmentEnregistre = {
    id: genererId(),
    clientId,
    version: corps.version,
    effectiveDate: maintenant,
    source: corps.source,
    origin: corps.origin,
    echelleMin: corps.echelleMin,
    echelleMax: corps.echelleMax,
    seuilAction: corps.seuilAction,
    createdAt: maintenant,
  }
  await ctx.riskAssessmentRepo.creerProfil(profilRisque)
  return reponseJson({ profilRisque }, 201, entetes)
}

interface SaisieCreationEvaluationRiskAssessment {
  methodProfileId?: string
  methodProfileVersion?: string
  assetNodeId?: string | null
  parameterId?: string | null
  etapeProcessus?: string
  modeDefaillance?: string
  effetDefaillance?: string
  causePotentielle?: string
  controleActuel?: string
  severiteInitiale?: number | null
  occurrenceInitiale?: number | null
  detectabiliteInitiale?: number | null
  iprInitial?: number | null
  verdictInitial?: string | null
}

async function gererCreerEvaluationRiskAssessment(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const corps = await lireCorpsJson<SaisieCreationEvaluationRiskAssessment>(request)
  // `effetDefaillance`/`causePotentielle`/`controleActuel` peuvent être des
  // chaînes vides (champs non `required` dans `RiskAssessmentAmdec.vue`) sans
  // être invalides — même discipline que `gererCreerParametre`/`gererCreerCQA`
  // pour `description`.
  if (
    !corps?.methodProfileId ||
    !corps.methodProfileVersion ||
    !corps.etapeProcessus ||
    !corps.modeDefaillance ||
    corps.effetDefaillance === undefined ||
    corps.causePotentielle === undefined ||
    corps.controleActuel === undefined
  ) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  const maintenant = horodatage()
  const evaluationRisque: RiskAssessmentEnregistre = {
    id: genererId(),
    clientId,
    methodProfileId: corps.methodProfileId,
    methodProfileVersion: corps.methodProfileVersion,
    assetNodeId: corps.assetNodeId ?? null,
    parameterId: corps.parameterId ?? null,
    etapeProcessus: corps.etapeProcessus,
    modeDefaillance: corps.modeDefaillance,
    effetDefaillance: corps.effetDefaillance,
    causePotentielle: corps.causePotentielle,
    controleActuel: corps.controleActuel,
    severiteInitiale: corps.severiteInitiale ?? null,
    occurrenceInitiale: corps.occurrenceInitiale ?? null,
    detectabiliteInitiale: corps.detectabiliteInitiale ?? null,
    iprInitial: corps.iprInitial ?? null,
    verdictInitial: corps.verdictInitial ?? null,
    recommandation: null,
    responsable: null,
    dateCible: null,
    actionsMenees: null,
    severiteResiduelle: null,
    occurrenceResiduelle: null,
    detectabiliteResiduelle: null,
    iprResiduel: null,
    verdictResiduel: null,
    auditLog: [{ timestamp: maintenant, actor: acteur.email, action: 'création' }],
    createdAt: maintenant,
    updatedAt: maintenant,
  }
  await ctx.riskAssessmentRepo.creerEvaluation(evaluationRisque)
  return reponseJson({ evaluationRisque }, 201, entetes)
}

interface SaisieActionResiduelleRiskAssessment {
  recommandation?: string | null
  responsable?: string | null
  dateCible?: string | null
  actionsMenees?: string | null
  severiteResiduelle?: number | null
  occurrenceResiduelle?: number | null
  detectabiliteResiduelle?: number | null
  iprResiduel?: number | null
  verdictResiduel?: string | null
}

/**
 * Enregistre l'action corrective et l'évaluation résiduelle (deuxième
 * temps du cycle AMDEC) sans muter les champs de l'évaluation initiale —
 * même principe que `gererDesactiverCPP` : l'historique reste lisible tel
 * qu'il a été produit. Le calcul IPR résiduel/verdict reste côté store
 * frontend (`calculerIPR`/`evaluerVerdictRiskAssessment`, déjà testés) —
 * ce handler ne persiste que ce qu'on lui donne.
 */
async function gererEnregistrerActionResiduelleRiskAssessment(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  evaluationId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const existant = await ctx.riskAssessmentRepo.evaluationParId(evaluationId)
  if (!existant || existant.clientId !== clientId) {
    return reponseJson({ erreur: 'introuvable' }, 404, entetes)
  }
  const corps = await lireCorpsJson<SaisieActionResiduelleRiskAssessment>(request)
  if (!corps) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)

  const maintenant = horodatage()
  const evaluationRisque: RiskAssessmentEnregistre = {
    ...existant,
    recommandation: corps.recommandation ?? null,
    responsable: corps.responsable ?? null,
    dateCible: corps.dateCible ?? null,
    actionsMenees: corps.actionsMenees ?? null,
    severiteResiduelle: corps.severiteResiduelle ?? null,
    occurrenceResiduelle: corps.occurrenceResiduelle ?? null,
    detectabiliteResiduelle: corps.detectabiliteResiduelle ?? null,
    iprResiduel: corps.iprResiduel ?? null,
    verdictResiduel: corps.verdictResiduel ?? null,
    updatedAt: maintenant,
    auditLog: [
      ...existant.auditLog,
      { timestamp: maintenant, actor: acteur.email, action: 'action résiduelle enregistrée' },
    ],
  }
  await ctx.riskAssessmentRepo.remplacerEvaluation(evaluationRisque)
  return reponseJson({ evaluationRisque }, 200, entetes)
}

/**
 * Filet de sécurité de migration locale
 * (`methodProfilesRiskAssessmentAMigrer`/`risksAssessmentAMigrer`,
 * `useRiskAssessmentStore.migrerRiskAssessmentLocalVersServeur`) —
 * idempotente, l'existant côté serveur gagne toujours (`ON CONFLICT(id) DO
 * NOTHING` dans `D1RiskAssessmentRepo`), même discipline que les autres
 * migrations locales de ce chantier.
 */
interface SaisieMigrationRiskAssessment {
  profilsRisque?: MethodProfileRiskAssessmentEnregistre[]
  evaluationsRisque?: RiskAssessmentEnregistre[]
}

async function gererMigrerRiskAssessmentLocal(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const corps = await lireCorpsJson<SaisieMigrationRiskAssessment>(request)
  if (!corps || (!Array.isArray(corps.profilsRisque) && !Array.isArray(corps.evaluationsRisque))) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  for (const p of corps.profilsRisque ?? []) {
    if (p.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.riskAssessmentRepo.creerProfil(p)
  }
  for (const e of corps.evaluationsRisque ?? []) {
    if (e.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.riskAssessmentRepo.creerEvaluation(e)
  }
  return reponseJson(
    { profilsRisque: corps.profilsRisque ?? [], evaluationsRisque: corps.evaluationsRisque ?? [] },
    200,
    entetes,
  )
}

// --- Handlers : Process/FonctionActif/ManufacturingContext (Target
// Architecture §4/§5/§7, Phase 5a du chantier de migration D1) ---
//
// La logique métier (dédoublonnage client-side d'une association déjà
// chargée) reste côté store frontend (`useProcessContextStore.ts`, déjà
// testée) — ces handlers ne font qu'authentifier, vérifier l'accès au
// client concerné et persister l'état qu'on leur donne, même discipline
// que les autres handlers de ce chantier.

async function gererObtenirProcessContext(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const [
    processes,
    fonctions,
    associationsFonctionAssetNode,
    associationsFonctionProcess,
    manufacturingContexts,
  ] = await Promise.all([
    ctx.processContextRepo.listerProcesses(clientId),
    ctx.processContextRepo.listerFonctions(clientId),
    ctx.processContextRepo.listerAssociationsFonctionAssetNode(clientId),
    ctx.processContextRepo.listerAssociationsFonctionProcess(clientId),
    ctx.processContextRepo.listerManufacturingContexts(clientId),
  ])
  return reponseJson(
    {
      processes,
      fonctions,
      associationsFonctionAssetNode,
      associationsFonctionProcess,
      manufacturingContexts,
    },
    200,
    entetes,
  )
}

interface SaisieCreationProcess {
  nom?: string
  description?: string
  type?: string
  sourceId?: string | null
}

async function gererCreerProcess(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const corps = await lireCorpsJson<SaisieCreationProcess>(request)
  // `description` peut être vide sans être invalide, même discipline que
  // `gererCreerParametre`.
  if (!corps?.nom || corps.description === undefined || !corps.type) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  const maintenant = horodatage()
  const process: ProcessEnregistre = {
    id: genererId(),
    clientId,
    nom: corps.nom,
    description: corps.description,
    type: corps.type,
    sourceId: corps.sourceId ?? null,
    auditLog: [{ timestamp: maintenant, actor: acteur.email, action: 'création' }],
    createdAt: maintenant,
    updatedAt: maintenant,
  }
  await ctx.processContextRepo.creerProcess(process)
  return reponseJson({ process }, 201, entetes)
}

interface SaisieCreationFonction {
  nom?: string
  description?: string
}

async function gererCreerFonction(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const corps = await lireCorpsJson<SaisieCreationFonction>(request)
  if (!corps?.nom || corps.description === undefined) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  const maintenant = horodatage()
  const fonction: FonctionActifEnregistree = {
    id: genererId(),
    clientId,
    nom: corps.nom,
    description: corps.description,
    auditLog: [{ timestamp: maintenant, actor: acteur.email, action: 'création' }],
    createdAt: maintenant,
    updatedAt: maintenant,
  }
  await ctx.processContextRepo.creerFonction(fonction)
  return reponseJson({ fonction }, 201, entetes)
}

interface SaisieCreationAssociationFonctionAssetNode {
  functionId?: string
  assetNodeId?: string
}

async function gererCreerAssociationFonctionAssetNode(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const corps = await lireCorpsJson<SaisieCreationAssociationFonctionAssetNode>(request)
  if (!corps?.functionId || !corps.assetNodeId) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  const associationFonctionAssetNode: AssociationFonctionAssetNodeEnregistree = {
    id: genererId(),
    clientId,
    functionId: corps.functionId,
    assetNodeId: corps.assetNodeId,
    createdAt: horodatage(),
  }
  await ctx.processContextRepo.creerAssociationFonctionAssetNode(associationFonctionAssetNode)
  return reponseJson({ associationFonctionAssetNode }, 201, entetes)
}

interface SaisieCreationAssociationFonctionProcess {
  functionId?: string
  processId?: string
}

async function gererCreerAssociationFonctionProcess(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const corps = await lireCorpsJson<SaisieCreationAssociationFonctionProcess>(request)
  if (!corps?.functionId || !corps.processId) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  const associationFonctionProcess: AssociationFonctionProcessEnregistree = {
    id: genererId(),
    clientId,
    functionId: corps.functionId,
    processId: corps.processId,
    createdAt: horodatage(),
  }
  await ctx.processContextRepo.creerAssociationFonctionProcess(associationFonctionProcess)
  return reponseJson({ associationFonctionProcess }, 201, entetes)
}

interface SaisieCreationManufacturingContext {
  assetNodeId?: string
  processId?: string
  produit?: string
  recette?: string | null
  format?: string | null
  configuration?: string | null
}

async function gererCreerManufacturingContext(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const corps = await lireCorpsJson<SaisieCreationManufacturingContext>(request)
  if (!corps?.assetNodeId || !corps.processId || !corps.produit) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  const maintenant = horodatage()
  const manufacturingContext: ManufacturingContextEnregistre = {
    id: genererId(),
    clientId,
    assetNodeId: corps.assetNodeId,
    processId: corps.processId,
    produit: corps.produit,
    recette: corps.recette ?? null,
    format: corps.format ?? null,
    configuration: corps.configuration ?? null,
    createdAt: maintenant,
    updatedAt: maintenant,
  }
  await ctx.processContextRepo.creerManufacturingContext(manufacturingContext)
  return reponseJson({ manufacturingContext }, 201, entetes)
}

/**
 * Filet de sécurité de migration locale
 * (`processesAMigrer`/`fonctionsActifAMigrer`/etc.,
 * `useProcessContextStore.migrerProcessContextLocalVersServeur`) —
 * idempotente, l'existant côté serveur gagne toujours (`ON CONFLICT(id) DO
 * NOTHING` dans `D1ProcessContextRepo`), même discipline que les autres
 * migrations locales de ce chantier.
 */
interface SaisieMigrationProcessContext {
  processes?: ProcessEnregistre[]
  fonctions?: FonctionActifEnregistree[]
  associationsFonctionAssetNode?: AssociationFonctionAssetNodeEnregistree[]
  associationsFonctionProcess?: AssociationFonctionProcessEnregistree[]
  manufacturingContexts?: ManufacturingContextEnregistre[]
}

async function gererMigrerProcessContextLocal(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const corps = await lireCorpsJson<SaisieMigrationProcessContext>(request)
  if (
    !corps ||
    (!Array.isArray(corps.processes) &&
      !Array.isArray(corps.fonctions) &&
      !Array.isArray(corps.associationsFonctionAssetNode) &&
      !Array.isArray(corps.associationsFonctionProcess) &&
      !Array.isArray(corps.manufacturingContexts))
  ) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  for (const p of corps.processes ?? []) {
    if (p.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.processContextRepo.creerProcess(p)
  }
  for (const f of corps.fonctions ?? []) {
    if (f.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.processContextRepo.creerFonction(f)
  }
  for (const a of corps.associationsFonctionAssetNode ?? []) {
    if (a.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.processContextRepo.creerAssociationFonctionAssetNode(a)
  }
  for (const a of corps.associationsFonctionProcess ?? []) {
    if (a.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.processContextRepo.creerAssociationFonctionProcess(a)
  }
  for (const c of corps.manufacturingContexts ?? []) {
    if (c.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.processContextRepo.creerManufacturingContext(c)
  }
  return reponseJson(
    {
      processes: corps.processes ?? [],
      fonctions: corps.fonctions ?? [],
      associationsFonctionAssetNode: corps.associationsFonctionAssetNode ?? [],
      associationsFonctionProcess: corps.associationsFonctionProcess ?? [],
      manufacturingContexts: corps.manufacturingContexts ?? [],
    },
    200,
    entetes,
  )
}

// --- Handlers : QualityEvent/ReferenceQualityEvent (URS catalogue §10
// famille H/I, Phase 5b du chantier de migration D1) ---
//
// Garde-fou central inchangé côté Worker : un événement externe est
// seulement référencé (`referenceExterne`), jamais un verrou — ces
// handlers ne font qu'authentifier, vérifier l'accès au client concerné
// et persister l'état qu'on leur donne, même discipline que les autres
// handlers de ce chantier.

async function gererObtenirQualityEvents(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const [evenements, references] = await Promise.all([
    ctx.qualityEventRepo.listerEvenements(clientId),
    ctx.qualityEventRepo.listerReferences(clientId),
  ])
  return reponseJson({ evenements, references }, 200, entetes)
}

interface SaisieCreationQualityEvent {
  type?: string
  titre?: string
  description?: string
  origine?: string
  referenceExterne?: { systeme: string; identifiant: string } | null
  assetNodeId?: string | null
  processId?: string | null
  manufacturingContextId?: string | null
}

async function gererCreerEvenementQualityEvent(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const corps = await lireCorpsJson<SaisieCreationQualityEvent>(request)
  // `description` peut être vide sans être invalide, même discipline que
  // `gererCreerParametre`/`gererCreerProcess`.
  if (!corps?.type || !corps.titre || corps.description === undefined || !corps.origine) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  const maintenant = horodatage()
  const evenement: QualityEventEnregistre = {
    id: genererId(),
    clientId,
    type: corps.type,
    titre: corps.titre,
    description: corps.description,
    origine: corps.origine,
    referenceExterne: corps.referenceExterne ?? null,
    assetNodeId: corps.assetNodeId ?? null,
    processId: corps.processId ?? null,
    manufacturingContextId: corps.manufacturingContextId ?? null,
    statut: 'ouvert',
    auditLog: [{ timestamp: maintenant, actor: acteur.email, action: 'création' }],
    createdAt: maintenant,
    updatedAt: maintenant,
  }
  await ctx.qualityEventRepo.creerEvenement(evenement)
  return reponseJson({ evenement }, 201, entetes)
}

interface SaisieChangementStatutQualityEvent {
  statut?: string
}

async function gererChangerStatutQualityEvent(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  evenementId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const existant = await ctx.qualityEventRepo.evenementParId(evenementId)
  if (!existant || existant.clientId !== clientId) {
    return reponseJson({ erreur: 'introuvable' }, 404, entetes)
  }
  const corps = await lireCorpsJson<SaisieChangementStatutQualityEvent>(request)
  if (!corps?.statut) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)

  const maintenant = horodatage()
  const evenement: QualityEventEnregistre = {
    ...existant,
    statut: corps.statut,
    updatedAt: maintenant,
    auditLog: [
      ...existant.auditLog,
      {
        timestamp: maintenant,
        actor: acteur.email,
        action: `changement de statut : ${corps.statut}`,
      },
    ],
  }
  await ctx.qualityEventRepo.remplacerEvenement(evenement)
  return reponseJson({ evenement }, 200, entetes)
}

interface SaisieCreationReferenceQualityEvent {
  sourceId?: string
  cibleId?: string
}

async function gererCreerReferenceQualityEvent(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const corps = await lireCorpsJson<SaisieCreationReferenceQualityEvent>(request)
  if (!corps?.sourceId || !corps.cibleId) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  const existantes = await ctx.qualityEventRepo.listerReferences(clientId)
  const dejaExistante = existantes.find(
    (r) => r.qualityEventSourceId === corps.sourceId && r.qualityEventCibleId === corps.cibleId,
  )
  if (dejaExistante) return reponseJson({ reference: dejaExistante }, 200, entetes)

  const reference: ReferenceQualityEventEnregistree = {
    id: genererId(),
    clientId,
    qualityEventSourceId: corps.sourceId,
    qualityEventCibleId: corps.cibleId,
    createdAt: horodatage(),
  }
  await ctx.qualityEventRepo.creerReference(reference)
  return reponseJson({ reference }, 201, entetes)
}

/**
 * Filet de sécurité de migration locale
 * (`qualityEventsAMigrer`/`referencesQualityEventAMigrer`,
 * `useQualityEventStore.migrerQualityEventsLocalVersServeur`) —
 * idempotente, l'existant côté serveur gagne toujours (`ON CONFLICT(id) DO
 * NOTHING` dans `D1QualityEventRepo`), même discipline que les autres
 * migrations locales de ce chantier.
 */
interface SaisieMigrationQualityEvents {
  evenements?: QualityEventEnregistre[]
  references?: ReferenceQualityEventEnregistree[]
}

async function gererMigrerQualityEventsLocal(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const corps = await lireCorpsJson<SaisieMigrationQualityEvents>(request)
  if (!corps || (!Array.isArray(corps.evenements) && !Array.isArray(corps.references))) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  for (const e of corps.evenements ?? []) {
    if (e.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.qualityEventRepo.creerEvenement(e)
  }
  for (const r of corps.references ?? []) {
    if (r.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.qualityEventRepo.creerReference(r)
  }
  return reponseJson(
    { evenements: corps.evenements ?? [], references: corps.references ?? [] },
    200,
    entetes,
  )
}

// --- Handlers : Requirement/TestObjective/TestCandidate/Test/Couverture
// (Target Architecture, domaine "Test", Phase 6a du chantier de
// migration D1) ---
//
// Première brique du Test/Execution/Evidence engine : uniquement la
// chaîne de définition. La logique métier (génération de candidats depuis
// les risques, rapport de couverture des risques) reste côté store
// frontend (`useTestDefinitionStore.ts`, déjà testée) — ces handlers ne
// font qu'authentifier, vérifier l'accès au client concerné et persister
// l'état qu'on leur donne, même discipline que les autres handlers de ce
// chantier.

async function gererObtenirTestDefinition(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const [requirements, testObjectives, testCandidates, tests, couvertures] = await Promise.all([
    ctx.testDefinitionRepo.listerRequirements(clientId),
    ctx.testDefinitionRepo.listerTestObjectives(clientId),
    ctx.testDefinitionRepo.listerTestCandidates(clientId),
    ctx.testDefinitionRepo.listerTests(clientId),
    ctx.testDefinitionRepo.listerCouvertures(clientId),
  ])
  return reponseJson(
    { requirements, testObjectives, testCandidates, tests, couvertures },
    200,
    entetes,
  )
}

interface SaisieCreationRequirement {
  reference?: string
  titre?: string
  description?: string
  assetNodeId?: string | null
  processId?: string | null
}

async function gererCreerRequirement(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const corps = await lireCorpsJson<SaisieCreationRequirement>(request)
  if (!corps?.reference || !corps.titre || corps.description === undefined) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  const maintenant = horodatage()
  const requirement: RequirementEnregistre = {
    id: genererId(),
    clientId,
    reference: corps.reference,
    titre: corps.titre,
    description: corps.description,
    assetNodeId: corps.assetNodeId ?? null,
    processId: corps.processId ?? null,
    auditLog: [{ timestamp: maintenant, actor: acteur.email, action: 'création' }],
    createdAt: maintenant,
    updatedAt: maintenant,
  }
  await ctx.testDefinitionRepo.creerRequirement(requirement)
  return reponseJson({ requirement }, 201, entetes)
}

interface SaisieCreationTestObjective {
  requirementId?: string
  titre?: string
  description?: string
}

async function gererCreerTestObjective(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const corps = await lireCorpsJson<SaisieCreationTestObjective>(request)
  if (!corps?.requirementId || !corps.titre || corps.description === undefined) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  const maintenant = horodatage()
  const testObjective: TestObjectiveEnregistre = {
    id: genererId(),
    clientId,
    requirementId: corps.requirementId,
    titre: corps.titre,
    description: corps.description,
    createdAt: maintenant,
    updatedAt: maintenant,
  }
  await ctx.testDefinitionRepo.creerTestObjective(testObjective)
  return reponseJson({ testObjective }, 201, entetes)
}

interface SaisieCreationTestCandidate {
  testObjectiveId?: string
  titre?: string
  description?: string
}

async function gererCreerTestCandidate(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const corps = await lireCorpsJson<SaisieCreationTestCandidate>(request)
  if (!corps?.testObjectiveId || !corps.titre || corps.description === undefined) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  const maintenant = horodatage()
  const testCandidate: TestCandidateEnregistre = {
    id: genererId(),
    clientId,
    testObjectiveId: corps.testObjectiveId,
    riskAssessmentId: null,
    titre: corps.titre,
    description: corps.description,
    statut: 'propose',
    motifRejet: null,
    dupliqueDeId: null,
    remplaceParId: null,
    auditLog: [{ timestamp: maintenant, actor: acteur.email, action: 'création' }],
    createdAt: maintenant,
    updatedAt: maintenant,
  }
  await ctx.testDefinitionRepo.creerTestCandidate(testCandidate)
  return reponseJson({ testCandidate }, 201, entetes)
}

interface SaisieCandidatDepuisRisques {
  testObjectiveId?: string
  riskAssessmentId?: string | null
  titre?: string
  description?: string
}

interface SaisieCreationTestCandidatsDepuisRisques {
  candidats?: SaisieCandidatDepuisRisques[]
}

/**
 * Persiste des candidats déjà proposés côté store frontend
 * (`genererCandidatsDepuisRisques`, Test Design Engine) — id/statut
 * ('propose')/audit_log/horodatages toujours dérivés côté serveur, jamais
 * fournis par l'appelant, même discipline que `gererCreerTestCandidate`.
 */
async function gererCreerTestCandidatsDepuisRisques(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const corps = await lireCorpsJson<SaisieCreationTestCandidatsDepuisRisques>(request)
  if (!corps || !Array.isArray(corps.candidats)) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  for (const c of corps.candidats) {
    if (!c.testObjectiveId || !c.titre || c.description === undefined) {
      return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    }
  }

  const maintenant = horodatage()
  const testCandidates: TestCandidateEnregistre[] = corps.candidats.map((c) => ({
    id: genererId(),
    clientId,
    testObjectiveId: c.testObjectiveId as string,
    riskAssessmentId: c.riskAssessmentId ?? null,
    titre: c.titre as string,
    description: c.description as string,
    statut: 'propose',
    motifRejet: null,
    dupliqueDeId: null,
    remplaceParId: null,
    auditLog: [
      {
        timestamp: maintenant,
        actor: acteur.email,
        action: 'création (proposé depuis analyse de risque)',
      },
    ],
    createdAt: maintenant,
    updatedAt: maintenant,
  }))
  await ctx.testDefinitionRepo.creerTestCandidats(testCandidates)
  return reponseJson({ testCandidates }, 201, entetes)
}

interface SaisieChangementStatutTestCandidate {
  statut?: string
  motifRejet?: string | null
  dupliqueDeId?: string | null
  remplaceParId?: string | null
}

async function gererChangerStatutTestCandidate(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  testCandidateId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const existant = await ctx.testDefinitionRepo.testCandidateParId(testCandidateId)
  if (!existant || existant.clientId !== clientId) {
    return reponseJson({ erreur: 'introuvable' }, 404, entetes)
  }
  const corps = await lireCorpsJson<SaisieChangementStatutTestCandidate>(request)
  if (!corps?.statut) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)

  const maintenant = horodatage()
  const motifRejet = corps.motifRejet ?? null
  const testCandidate: TestCandidateEnregistre = {
    ...existant,
    statut: corps.statut,
    motifRejet,
    dupliqueDeId: corps.dupliqueDeId ?? null,
    remplaceParId: corps.remplaceParId ?? null,
    updatedAt: maintenant,
    auditLog: [
      ...existant.auditLog,
      {
        timestamp: maintenant,
        actor: acteur.email,
        action: `changement de statut : ${corps.statut}${motifRejet ? ` (${motifRejet})` : ''}`,
      },
    ],
  }
  await ctx.testDefinitionRepo.remplacerTestCandidate(testCandidate)
  return reponseJson({ testCandidate }, 200, entetes)
}

interface SaisieCreationTest {
  testCandidateId?: string
  titre?: string
  description?: string
  etapes?: { ordre: number; action: string; resultatAttendu: string }[]
}

/** Un `Test` ne peut être créé qu'à partir d'un candidat accepté — même garde-fou que côté store avant la migration, revérifié ici côté serveur. */
async function gererCreerTest(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const corps = await lireCorpsJson<SaisieCreationTest>(request)
  if (
    !corps?.testCandidateId ||
    !corps.titre ||
    corps.description === undefined ||
    !Array.isArray(corps.etapes)
  ) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  const candidat = await ctx.testDefinitionRepo.testCandidateParId(corps.testCandidateId)
  if (!candidat || candidat.clientId !== clientId) {
    return reponseJson({ erreur: 'candidat_introuvable' }, 404, entetes)
  }
  if (candidat.statut !== 'accepte') {
    return reponseJson({ erreur: 'candidat_non_accepte' }, 400, entetes)
  }

  const maintenant = horodatage()
  const test: TestEnregistre = {
    id: genererId(),
    clientId,
    testCandidateId: corps.testCandidateId,
    titre: corps.titre,
    description: corps.description,
    etapes: corps.etapes.map((e, index) => ({
      id: genererId(),
      ordre: index + 1,
      action: e.action,
      resultatAttendu: e.resultatAttendu,
    })),
    statut: 'brouillon',
    auditLog: [{ timestamp: maintenant, actor: acteur.email, action: 'création' }],
    createdAt: maintenant,
    updatedAt: maintenant,
  }
  await ctx.testDefinitionRepo.creerTest(test)
  return reponseJson({ test }, 201, entetes)
}

async function gererApprouverTest(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  testId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const existant = await ctx.testDefinitionRepo.testParId(testId)
  if (!existant || existant.clientId !== clientId) {
    return reponseJson({ erreur: 'introuvable' }, 404, entetes)
  }

  const maintenant = horodatage()
  const test: TestEnregistre = {
    ...existant,
    statut: 'approuve',
    updatedAt: maintenant,
    auditLog: [
      ...existant.auditLog,
      { timestamp: maintenant, actor: acteur.email, action: 'approbation' },
    ],
  }
  await ctx.testDefinitionRepo.remplacerTest(test)
  return reponseJson({ test }, 200, entetes)
}

interface SaisieCreationCouverture {
  requirementId?: string
  testId?: string
}

async function gererCreerCouverture(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const corps = await lireCorpsJson<SaisieCreationCouverture>(request)
  if (!corps?.requirementId || !corps.testId) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  const existantes = await ctx.testDefinitionRepo.listerCouvertures(clientId)
  const dejaExistante = existantes.find(
    (c) => c.requirementId === corps.requirementId && c.testId === corps.testId,
  )
  if (dejaExistante) return reponseJson({ couverture: dejaExistante }, 200, entetes)

  const couverture: CouvertureEnregistree = {
    id: genererId(),
    clientId,
    requirementId: corps.requirementId,
    testId: corps.testId,
    createdAt: horodatage(),
  }
  await ctx.testDefinitionRepo.creerCouverture(couverture)
  return reponseJson({ couverture }, 201, entetes)
}

/**
 * Filet de sécurité de migration locale
 * (`requirementsAMigrer`/`testObjectivesAMigrer`/etc.,
 * `useTestDefinitionStore.migrerTestDefinitionLocalVersServeur`) —
 * idempotente, l'existant côté serveur gagne toujours (`ON CONFLICT(id) DO
 * NOTHING` dans `D1TestDefinitionRepo`), même discipline que les autres
 * migrations locales de ce chantier.
 */
interface SaisieMigrationTestDefinition {
  requirements?: RequirementEnregistre[]
  testObjectives?: TestObjectiveEnregistre[]
  testCandidates?: TestCandidateEnregistre[]
  tests?: TestEnregistre[]
  couvertures?: CouvertureEnregistree[]
}

async function gererMigrerTestDefinitionLocal(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const corps = await lireCorpsJson<SaisieMigrationTestDefinition>(request)
  if (
    !corps ||
    (!Array.isArray(corps.requirements) &&
      !Array.isArray(corps.testObjectives) &&
      !Array.isArray(corps.testCandidates) &&
      !Array.isArray(corps.tests) &&
      !Array.isArray(corps.couvertures))
  ) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  for (const r of corps.requirements ?? []) {
    if (r.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.testDefinitionRepo.creerRequirement(r)
  }
  for (const o of corps.testObjectives ?? []) {
    if (o.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.testDefinitionRepo.creerTestObjective(o)
  }
  for (const c of corps.testCandidates ?? []) {
    if (c.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.testDefinitionRepo.creerTestCandidate(c)
  }
  for (const t of corps.tests ?? []) {
    if (t.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.testDefinitionRepo.creerTest(t)
  }
  for (const c of corps.couvertures ?? []) {
    if (c.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.testDefinitionRepo.creerCouverture(c)
  }
  return reponseJson(
    {
      requirements: corps.requirements ?? [],
      testObjectives: corps.testObjectives ?? [],
      testCandidates: corps.testCandidates ?? [],
      tests: corps.tests ?? [],
      couvertures: corps.couvertures ?? [],
    },
    200,
    entetes,
  )
}

// --- Handlers : Execution/ExecutionStep/Measurement/ExecutionEvent
// (Target Architecture, domaine "Execution", Phase 6b du chantier de
// migration D1) ---

async function gererObtenirExecutions(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const [executions, executionSteps, measurements, executionEvents] = await Promise.all([
    ctx.executionRepo.listerExecutions(clientId),
    ctx.executionRepo.listerExecutionSteps(clientId),
    ctx.executionRepo.listerMeasurements(clientId),
    ctx.executionRepo.listerExecutionEvents(clientId),
  ])
  return reponseJson({ executions, executionSteps, measurements, executionEvents }, 200, entetes)
}

interface SaisieDemarrageExecution {
  testId?: string
  assetNodeId?: string | null
}

/** Une `Execution` ne peut être créée qu'à partir d'un `Test` au statut `approuve` — revérifié ici côté serveur, même garde-fou que côté store avant la migration. */
async function gererDemarrerExecution(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const corps = await lireCorpsJson<SaisieDemarrageExecution>(request)
  if (!corps?.testId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)

  const test = await ctx.testDefinitionRepo.testParId(corps.testId)
  if (!test || test.clientId !== clientId) {
    return reponseJson({ erreur: 'test_introuvable' }, 404, entetes)
  }
  if (test.statut !== 'approuve') {
    return reponseJson({ erreur: 'test_non_approuve' }, 400, entetes)
  }

  const maintenant = horodatage()
  const execution: ExecutionEnregistree = {
    id: genererId(),
    clientId,
    testId: corps.testId,
    assetNodeId: corps.assetNodeId ?? null,
    executant: acteur.email,
    statut: 'en_cours',
    verdict: null,
    dateDebut: maintenant,
    dateFin: null,
    auditLog: [{ timestamp: maintenant, actor: acteur.email, action: 'démarrage' }],
    createdAt: maintenant,
    updatedAt: maintenant,
  }
  await ctx.executionRepo.creerExecution(execution)
  return reponseJson({ execution }, 201, entetes)
}

interface SaisieResultatEtape {
  testStepId?: string
  resultat?: string
  observation?: string
}

/** Immutable une fois créé — une correction passe par un `ExecutionEvent`, jamais une réécriture. */
async function gererEnregistrerResultatEtape(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  executionId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const execution = await ctx.executionRepo.executionParId(executionId)
  if (!execution || execution.clientId !== clientId) {
    return reponseJson({ erreur: 'execution_introuvable' }, 404, entetes)
  }
  if (execution.statut === 'terminee') {
    return reponseJson({ erreur: 'execution_deja_cloturee' }, 400, entetes)
  }

  const corps = await lireCorpsJson<SaisieResultatEtape>(request)
  if (!corps?.testStepId || !corps.resultat || corps.observation === undefined) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  const test = await ctx.testDefinitionRepo.testParId(execution.testId)
  const etapeConnue = test?.etapes.some((e) => e.id === corps.testStepId) ?? false
  if (!etapeConnue) return reponseJson({ erreur: 'etape_inconnue' }, 400, entetes)

  const etape: ExecutionStepEnregistree = {
    id: genererId(),
    clientId,
    executionId,
    testStepId: corps.testStepId,
    resultat: corps.resultat,
    observation: corps.observation,
    horodatage: horodatage(),
  }
  await ctx.executionRepo.creerExecutionStep(etape)
  return reponseJson({ executionStep: etape }, 201, entetes)
}

interface SaisieMesure {
  libelle?: string
  valeur?: string
  unite?: string | null
}

async function gererAjouterMesure(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  executionStepId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const etape = await ctx.executionRepo.executionStepParId(executionStepId)
  if (!etape || etape.clientId !== clientId) {
    return reponseJson({ erreur: 'etape_execution_introuvable' }, 404, entetes)
  }

  const corps = await lireCorpsJson<SaisieMesure>(request)
  if (!corps?.libelle || !corps.valeur) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  const mesure: MeasurementEnregistree = {
    id: genererId(),
    clientId,
    executionStepId,
    libelle: corps.libelle,
    valeur: corps.valeur,
    unite: corps.unite ?? null,
    horodatage: horodatage(),
  }
  await ctx.executionRepo.creerMeasurement(mesure)
  return reponseJson({ measurement: mesure }, 201, entetes)
}

interface SaisieEvenementExecution {
  type?: string
  description?: string
  qualityEventId?: string | null
}

/** `qualityEventId` référence optionnellement un `QualityEvent` déjà existant — jamais créé automatiquement ici. */
async function gererConsignerEvenement(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  executionId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const execution = await ctx.executionRepo.executionParId(executionId)
  if (!execution || execution.clientId !== clientId) {
    return reponseJson({ erreur: 'execution_introuvable' }, 404, entetes)
  }
  if (execution.statut === 'terminee') {
    return reponseJson({ erreur: 'execution_deja_cloturee' }, 400, entetes)
  }

  const corps = await lireCorpsJson<SaisieEvenementExecution>(request)
  if (!corps?.type || corps.description === undefined) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  const evenement: ExecutionEventEnregistree = {
    id: genererId(),
    clientId,
    executionId,
    type: corps.type,
    description: corps.description,
    qualityEventId: corps.qualityEventId ?? null,
    horodatage: horodatage(),
    actor: acteur.email,
  }
  await ctx.executionRepo.creerExecutionEvent(evenement)
  return reponseJson({ executionEvent: evenement }, 201, entetes)
}

interface SaisieClotureExecution {
  verdict?: string
}

/** Le verdict est toujours fourni explicitement par l'appelant — jamais déduit des ExecutionStep. */
async function gererCloturerExecution(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  executionId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const existante = await ctx.executionRepo.executionParId(executionId)
  if (!existante || existante.clientId !== clientId) {
    return reponseJson({ erreur: 'execution_introuvable' }, 404, entetes)
  }
  if (existante.statut === 'terminee') {
    return reponseJson({ erreur: 'execution_deja_cloturee' }, 400, entetes)
  }

  const corps = await lireCorpsJson<SaisieClotureExecution>(request)
  if (!corps?.verdict) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)

  const maintenant = horodatage()
  const execution: ExecutionEnregistree = {
    ...existante,
    statut: 'terminee',
    verdict: corps.verdict,
    dateFin: maintenant,
    updatedAt: maintenant,
    auditLog: [
      ...existante.auditLog,
      { timestamp: maintenant, actor: acteur.email, action: `clôture : ${corps.verdict}` },
    ],
  }
  await ctx.executionRepo.remplacerExecution(execution)
  return reponseJson({ execution }, 200, entetes)
}

/**
 * Filet de sécurité de migration locale
 * (`executionsAMigrer`/`executionStepsAMigrer`/etc.,
 * `useExecutionStore.migrerExecutionsLocalVersServeur`) — idempotente,
 * l'existant côté serveur gagne toujours (`ON CONFLICT(id) DO NOTHING`
 * dans `D1ExecutionRepo`), même discipline que les autres migrations
 * locales de ce chantier.
 */
interface SaisieMigrationExecutions {
  executions?: ExecutionEnregistree[]
  executionSteps?: ExecutionStepEnregistree[]
  measurements?: MeasurementEnregistree[]
  executionEvents?: ExecutionEventEnregistree[]
}

async function gererMigrerExecutionsLocal(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const corps = await lireCorpsJson<SaisieMigrationExecutions>(request)
  if (
    !corps ||
    (!Array.isArray(corps.executions) &&
      !Array.isArray(corps.executionSteps) &&
      !Array.isArray(corps.measurements) &&
      !Array.isArray(corps.executionEvents))
  ) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  for (const e of corps.executions ?? []) {
    if (e.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.executionRepo.creerExecution(e)
  }
  for (const e of corps.executionSteps ?? []) {
    if (e.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.executionRepo.creerExecutionStep(e)
  }
  for (const m of corps.measurements ?? []) {
    if (m.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.executionRepo.creerMeasurement(m)
  }
  for (const e of corps.executionEvents ?? []) {
    if (e.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.executionRepo.creerExecutionEvent(e)
  }
  return reponseJson(
    {
      executions: corps.executions ?? [],
      executionSteps: corps.executionSteps ?? [],
      measurements: corps.measurements ?? [],
      executionEvents: corps.executionEvents ?? [],
    },
    200,
    entetes,
  )
}

// --- Handlers : Evidence/EvidenceLocation/ProvenanceLink (Target
// Architecture, domaine "Evidence", Phase 6c du chantier de migration
// D1) ---

async function gererObtenirEvidences(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const [evidences, evidenceLocations, provenanceLinks] = await Promise.all([
    ctx.evidenceRepo.listerEvidences(clientId),
    ctx.evidenceRepo.listerEvidenceLocations(clientId),
    ctx.evidenceRepo.listerProvenanceLinks(clientId),
  ])
  return reponseJson({ evidences, evidenceLocations, provenanceLinks }, 200, entetes)
}

interface SaisieEnregistrementPreuve {
  executionId?: string
  executionStepId?: string | null
  type?: string
  titre?: string
  description?: string
}

/** Une Evidence n'existe que pour une Execution réelle, non clôturée (immutabilité post-clôture, cohérent avec Phase 6b). */
async function gererEnregistrerPreuve(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const corps = await lireCorpsJson<SaisieEnregistrementPreuve>(request)
  if (
    !corps?.executionId ||
    !corps.type ||
    corps.titre === undefined ||
    corps.description === undefined
  ) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  const execution = await ctx.executionRepo.executionParId(corps.executionId)
  if (!execution || execution.clientId !== clientId) {
    return reponseJson({ erreur: 'execution_introuvable' }, 404, entetes)
  }
  if (execution.statut === 'terminee') {
    return reponseJson({ erreur: 'execution_deja_cloturee' }, 400, entetes)
  }
  if (corps.executionStepId) {
    const etape = await ctx.executionRepo.executionStepParId(corps.executionStepId)
    if (!etape || etape.executionId !== corps.executionId) {
      return reponseJson({ erreur: 'etape_inconnue' }, 400, entetes)
    }
  }

  const evidence: EvidenceEnregistree = {
    id: genererId(),
    clientId,
    executionId: corps.executionId,
    executionStepId: corps.executionStepId ?? null,
    type: corps.type,
    titre: corps.titre,
    description: corps.description,
    horodatage: horodatage(),
    actor: acteur.email,
  }
  await ctx.evidenceRepo.creerEvidence(evidence)
  return reponseJson({ evidence }, 201, entetes)
}

interface SaisieAjoutLocalisation {
  systeme?: string
  reference?: string
}

/** Ne peut être créée que pour une Evidence de type `document`. */
async function gererAjouterLocalisation(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  evidenceId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const preuve = await ctx.evidenceRepo.evidenceParId(evidenceId)
  if (!preuve || preuve.clientId !== clientId) {
    return reponseJson({ erreur: 'evidence_introuvable' }, 404, entetes)
  }
  if (preuve.type !== 'document') {
    return reponseJson({ erreur: 'type_non_document' }, 400, entetes)
  }

  const corps = await lireCorpsJson<SaisieAjoutLocalisation>(request)
  if (!corps?.systeme || !corps.reference) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  const location: EvidenceLocationEnregistree = {
    id: genererId(),
    clientId,
    evidenceId,
    systeme: corps.systeme,
    reference: corps.reference,
  }
  await ctx.evidenceRepo.creerEvidenceLocation(location)
  return reponseJson({ evidenceLocation: location }, 201, entetes)
}

interface SaisieDeclarationProvenance {
  evidenceId?: string
  requirementId?: string
}

/** Déclaration explicite, jamais déduite — idempotente, même logique que `declarerCouverture` (Phase 6a). */
async function gererDeclarerProvenance(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const corps = await lireCorpsJson<SaisieDeclarationProvenance>(request)
  if (!corps?.evidenceId || !corps.requirementId) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  const existants = await ctx.evidenceRepo.listerProvenanceLinks(clientId)
  const dejaExistant = existants.find(
    (p) => p.evidenceId === corps.evidenceId && p.requirementId === corps.requirementId,
  )
  if (dejaExistant) return reponseJson({ provenanceLink: dejaExistant }, 200, entetes)

  const lien: ProvenanceLinkEnregistre = {
    id: genererId(),
    clientId,
    evidenceId: corps.evidenceId,
    requirementId: corps.requirementId,
    createdAt: horodatage(),
  }
  await ctx.evidenceRepo.creerProvenanceLink(lien)
  return reponseJson({ provenanceLink: lien }, 201, entetes)
}

/**
 * Filet de sécurité de migration locale
 * (`evidencesAMigrer`/`evidenceLocationsAMigrer`/`provenanceLinksAMigrer`,
 * `useEvidenceStore.migrerEvidencesLocalVersServeur`) — idempotente,
 * l'existant côté serveur gagne toujours (`ON CONFLICT(id) DO NOTHING`
 * dans `D1EvidenceRepo`), même discipline que les autres migrations
 * locales de ce chantier.
 */
interface SaisieMigrationEvidences {
  evidences?: EvidenceEnregistree[]
  evidenceLocations?: EvidenceLocationEnregistree[]
  provenanceLinks?: ProvenanceLinkEnregistre[]
}

async function gererMigrerEvidencesLocal(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const corps = await lireCorpsJson<SaisieMigrationEvidences>(request)
  if (
    !corps ||
    (!Array.isArray(corps.evidences) &&
      !Array.isArray(corps.evidenceLocations) &&
      !Array.isArray(corps.provenanceLinks))
  ) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  for (const e of corps.evidences ?? []) {
    if (e.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.evidenceRepo.creerEvidence(e)
  }
  for (const l of corps.evidenceLocations ?? []) {
    if (l.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.evidenceRepo.creerEvidenceLocation(l)
  }
  for (const p of corps.provenanceLinks ?? []) {
    if (p.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.evidenceRepo.creerProvenanceLink(p)
  }
  return reponseJson(
    {
      evidences: corps.evidences ?? [],
      evidenceLocations: corps.evidenceLocations ?? [],
      provenanceLinks: corps.provenanceLinks ?? [],
    },
    200,
    entetes,
  )
}

// --- Handlers : Source/SourceLocation/SourceVersion/Extraction/
// ExtractionItem/KnowledgeItem/Confirmation/KnowledgeRelation/Conflict
// (Target Architecture, domaines "Source Intelligence" et "Knowledge",
// Phase 7a du chantier de migration D1) ---

async function gererObtenirKnowledgeEngine(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const [
    sources,
    sourceLocations,
    sourceVersions,
    extractions,
    extractionItems,
    knowledgeItems,
    confirmations,
    knowledgeRelations,
    conflicts,
  ] = await Promise.all([
    ctx.knowledgeEngineRepo.listerSources(clientId),
    ctx.knowledgeEngineRepo.listerSourceLocations(clientId),
    ctx.knowledgeEngineRepo.listerSourceVersions(clientId),
    ctx.knowledgeEngineRepo.listerExtractions(clientId),
    ctx.knowledgeEngineRepo.listerExtractionItems(clientId),
    ctx.knowledgeEngineRepo.listerKnowledgeItems(clientId),
    ctx.knowledgeEngineRepo.listerConfirmations(clientId),
    ctx.knowledgeEngineRepo.listerKnowledgeRelations(clientId),
    ctx.knowledgeEngineRepo.listerConflicts(clientId),
  ])
  return reponseJson(
    {
      sources,
      sourceLocations,
      sourceVersions,
      extractions,
      extractionItems,
      knowledgeItems,
      confirmations,
      knowledgeRelations,
      conflicts,
    },
    200,
    entetes,
  )
}

interface SaisieCreationSource {
  type?: string
  titre?: string
}

async function gererCreerSource(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const corps = await lireCorpsJson<SaisieCreationSource>(request)
  if (!corps?.type || !corps.titre) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  const source: SourceEnregistree = {
    id: genererId(),
    clientId,
    type: corps.type,
    titre: corps.titre,
    createdAt: horodatage(),
  }
  await ctx.knowledgeEngineRepo.creerSource(source)
  return reponseJson({ source }, 201, entetes)
}

interface SaisieAjoutLocalisationSource {
  systeme?: string
  reference?: string
}

/** Un `Source` peut avoir plusieurs localisations (ex. miroir Drive + référence externe). */
async function gererAjouterLocalisationSource(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  sourceId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const source = await ctx.knowledgeEngineRepo.sourceParId(sourceId)
  if (!source || source.clientId !== clientId) {
    return reponseJson({ erreur: 'source_introuvable' }, 404, entetes)
  }

  const corps = await lireCorpsJson<SaisieAjoutLocalisationSource>(request)
  if (!corps?.systeme || !corps.reference) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  const localisation: SourceLocationEnregistree = {
    id: genererId(),
    clientId,
    sourceId,
    systeme: corps.systeme,
    reference: corps.reference,
  }
  await ctx.knowledgeEngineRepo.creerSourceLocation(localisation)
  return reponseJson({ sourceLocation: localisation }, 201, entetes)
}

/** `numeroVersion` est auto-incrémenté côté serveur à partir des versions existantes de cette `Source` — jamais fourni par le client. */
async function gererCreerSourceVersion(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  sourceId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const source = await ctx.knowledgeEngineRepo.sourceParId(sourceId)
  if (!source || source.clientId !== clientId) {
    return reponseJson({ erreur: 'source_introuvable' }, 404, entetes)
  }

  const versionsExistantes = (await ctx.knowledgeEngineRepo.listerSourceVersions(clientId)).filter(
    (v) => v.sourceId === sourceId,
  )
  const numeroVersion = versionsExistantes.reduce((max, v) => Math.max(max, v.numeroVersion), 0) + 1

  const version: SourceVersionEnregistree = {
    id: genererId(),
    clientId,
    sourceId,
    numeroVersion,
    createdAt: horodatage(),
  }
  await ctx.knowledgeEngineRepo.creerSourceVersion(version)
  return reponseJson({ sourceVersion: version }, 201, entetes)
}

interface SaisieEnregistrementExtraction {
  methode?: string
}

async function gererEnregistrerExtraction(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  sourceVersionId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const version = await ctx.knowledgeEngineRepo.sourceVersionParId(sourceVersionId)
  if (!version || version.clientId !== clientId) {
    return reponseJson({ erreur: 'version_introuvable' }, 404, entetes)
  }

  const corps = await lireCorpsJson<SaisieEnregistrementExtraction>(request)
  if (!corps?.methode) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  const extraction: ExtractionEnregistree = {
    id: genererId(),
    clientId,
    sourceVersionId,
    methode: corps.methode,
    horodatage: horodatage(),
  }
  await ctx.knowledgeEngineRepo.creerExtraction(extraction)
  return reponseJson({ extraction }, 201, entetes)
}

interface SaisieAjoutExtractionItem {
  contenu?: string
  position?: number
}

/** Immutable une fois créé — la "preuve de premier niveau" d'une extraction. */
async function gererAjouterExtractionItem(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  extractionId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const extraction = await ctx.knowledgeEngineRepo.extractionParId(extractionId)
  if (!extraction || extraction.clientId !== clientId) {
    return reponseJson({ erreur: 'extraction_introuvable' }, 404, entetes)
  }

  const corps = await lireCorpsJson<SaisieAjoutExtractionItem>(request)
  if (corps?.contenu === undefined || corps.position === undefined) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  const item: ExtractionItemEnregistre = {
    id: genererId(),
    clientId,
    extractionId,
    contenu: corps.contenu,
    position: corps.position,
  }
  await ctx.knowledgeEngineRepo.creerExtractionItem(item)
  return reponseJson({ extractionItem: item }, 201, entetes)
}

interface SaisieCreationKnowledgeItem {
  libelle?: string
  valeurInterpretee?: string
}

/** Garde-fou non négociable : toujours créé au statut `a_valider`, jamais `valide` à la création. */
async function gererCreerKnowledgeItem(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  extractionItemId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const items = await ctx.knowledgeEngineRepo.listerExtractionItems(clientId)
  const item = items.find((i) => i.id === extractionItemId)
  if (!item) {
    return reponseJson({ erreur: 'extraction_item_introuvable' }, 404, entetes)
  }

  const corps = await lireCorpsJson<SaisieCreationKnowledgeItem>(request)
  if (!corps?.libelle || corps.valeurInterpretee === undefined) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  const maintenant = horodatage()
  const knowledgeItem: KnowledgeItemEnregistre = {
    id: genererId(),
    clientId,
    extractionItemId,
    libelle: corps.libelle,
    valeurInterpretee: corps.valeurInterpretee,
    statut: 'a_valider',
    validePar: null,
    auditLog: [{ timestamp: maintenant, actor: acteur.email, action: 'création' }],
    createdAt: maintenant,
    updatedAt: maintenant,
  }
  await ctx.knowledgeEngineRepo.creerKnowledgeItem(knowledgeItem)
  return reponseJson({ knowledgeItem }, 201, entetes)
}

interface SaisieConfirmationKnowledgeItem {
  decision?: string
}

/**
 * Validation/rejet toujours humains et explicites — jamais automatiques.
 * Crée un enregistrement `Confirmation` auditable distinct, en plus de la
 * mise à jour dénormalisée de `KnowledgeItem.statut`/`validePar`.
 * `confirmePar`/`validePar` dérivés côté serveur (`acteur.email`), jamais
 * fait confiance au client.
 */
async function gererConfirmerKnowledgeItem(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  knowledgeItemId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const existant = await ctx.knowledgeEngineRepo.knowledgeItemParId(knowledgeItemId)
  if (!existant || existant.clientId !== clientId) {
    return reponseJson({ erreur: 'knowledge_item_introuvable' }, 404, entetes)
  }

  const corps = await lireCorpsJson<SaisieConfirmationKnowledgeItem>(request)
  if (corps?.decision !== 'confirme' && corps?.decision !== 'rejete') {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  const maintenant = horodatage()
  const confirmation: ConfirmationEnregistree = {
    id: genererId(),
    clientId,
    knowledgeItemId,
    decision: corps.decision,
    confirmePar: acteur.email,
    horodatage: maintenant,
  }
  await ctx.knowledgeEngineRepo.creerConfirmation(confirmation)

  const statut = corps.decision === 'confirme' ? 'valide' : 'rejete'
  const miseAJour: KnowledgeItemEnregistre = {
    ...existant,
    statut,
    validePar: acteur.email,
    updatedAt: maintenant,
    auditLog: [
      ...existant.auditLog,
      { timestamp: maintenant, actor: acteur.email, action: `changement de statut : ${statut}` },
    ],
  }
  await ctx.knowledgeEngineRepo.remplacerKnowledgeItem(miseAJour)
  return reponseJson({ knowledgeItem: miseAJour, confirmation }, 200, entetes)
}

interface SaisieDeclarationRelation {
  knowledgeItemSourceId?: string
  knowledgeItemCibleId?: string
  type?: string
}

/** Lien explicite non conflictuel entre deux `KnowledgeItem` — jamais déduit, idempotent. */
async function gererDeclarerRelation(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const corps = await lireCorpsJson<SaisieDeclarationRelation>(request)
  if (!corps?.knowledgeItemSourceId || !corps.knowledgeItemCibleId || !corps.type) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  const existantes = await ctx.knowledgeEngineRepo.listerKnowledgeRelations(clientId)
  const existante = existantes.find(
    (r) =>
      r.knowledgeItemSourceId === corps.knowledgeItemSourceId &&
      r.knowledgeItemCibleId === corps.knowledgeItemCibleId &&
      r.type === corps.type,
  )
  if (existante) return reponseJson({ knowledgeRelation: existante }, 200, entetes)

  const relation: KnowledgeRelationEnregistree = {
    id: genererId(),
    clientId,
    knowledgeItemSourceId: corps.knowledgeItemSourceId,
    knowledgeItemCibleId: corps.knowledgeItemCibleId,
    type: corps.type,
    createdAt: horodatage(),
  }
  await ctx.knowledgeEngineRepo.creerKnowledgeRelation(relation)
  return reponseJson({ knowledgeRelation: relation }, 201, entetes)
}

interface SaisieDeclarationConflit {
  knowledgeItemSourceId?: string
  knowledgeItemCibleId?: string
  description?: string
}

async function gererDeclarerConflit(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const corps = await lireCorpsJson<SaisieDeclarationConflit>(request)
  if (!corps?.knowledgeItemSourceId || !corps.knowledgeItemCibleId || !corps.description) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  const conflit: ConflictEnregistre = {
    id: genererId(),
    clientId,
    knowledgeItemSourceId: corps.knowledgeItemSourceId,
    knowledgeItemCibleId: corps.knowledgeItemCibleId,
    description: corps.description,
    statut: 'ouvert',
    resolution: null,
    createdAt: horodatage(),
  }
  await ctx.knowledgeEngineRepo.creerConflict(conflit)
  return reponseJson({ conflict: conflit }, 201, entetes)
}

interface SaisieResolutionConflit {
  resolution?: string
}

/** Un Conflict reste `ouvert` tant qu'aucune résolution explicite n'est fournie — jamais auto-résolu. */
async function gererResoudreConflit(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  conflictId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const existant = await ctx.knowledgeEngineRepo.conflictParId(conflictId)
  if (!existant || existant.clientId !== clientId) {
    return reponseJson({ erreur: 'conflict_introuvable' }, 404, entetes)
  }

  const corps = await lireCorpsJson<SaisieResolutionConflit>(request)
  if (!corps?.resolution) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  const miseAJour: ConflictEnregistre = {
    ...existant,
    statut: 'resolu',
    resolution: corps.resolution,
  }
  await ctx.knowledgeEngineRepo.remplacerConflict(miseAJour)
  return reponseJson({ conflict: miseAJour }, 200, entetes)
}

/**
 * Filet de sécurité de migration locale (`useSourceIntelligenceStore`),
 * même discipline que les autres migrations locales de ce chantier —
 * idempotente, l'existant côté serveur gagne toujours (`ON CONFLICT(id)
 * DO NOTHING` dans `D1KnowledgeEngineRepo`).
 */
interface SaisieMigrationKnowledgeEngine {
  sources?: SourceEnregistree[]
  sourceLocations?: SourceLocationEnregistree[]
  sourceVersions?: SourceVersionEnregistree[]
  extractions?: ExtractionEnregistree[]
  extractionItems?: ExtractionItemEnregistre[]
  knowledgeItems?: KnowledgeItemEnregistre[]
  confirmations?: ConfirmationEnregistree[]
  knowledgeRelations?: KnowledgeRelationEnregistree[]
  conflicts?: ConflictEnregistre[]
}

async function gererMigrerKnowledgeEngineLocal(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const corps = await lireCorpsJson<SaisieMigrationKnowledgeEngine>(request)
  if (
    !corps ||
    (!Array.isArray(corps.sources) &&
      !Array.isArray(corps.sourceLocations) &&
      !Array.isArray(corps.sourceVersions) &&
      !Array.isArray(corps.extractions) &&
      !Array.isArray(corps.extractionItems) &&
      !Array.isArray(corps.knowledgeItems) &&
      !Array.isArray(corps.confirmations) &&
      !Array.isArray(corps.knowledgeRelations) &&
      !Array.isArray(corps.conflicts))
  ) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  for (const s of corps.sources ?? []) {
    if (s.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.knowledgeEngineRepo.creerSource(s)
  }
  for (const l of corps.sourceLocations ?? []) {
    if (l.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.knowledgeEngineRepo.creerSourceLocation(l)
  }
  for (const v of corps.sourceVersions ?? []) {
    if (v.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.knowledgeEngineRepo.creerSourceVersion(v)
  }
  for (const e of corps.extractions ?? []) {
    if (e.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.knowledgeEngineRepo.creerExtraction(e)
  }
  for (const i of corps.extractionItems ?? []) {
    if (i.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.knowledgeEngineRepo.creerExtractionItem(i)
  }
  for (const k of corps.knowledgeItems ?? []) {
    if (k.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.knowledgeEngineRepo.creerKnowledgeItem(k)
  }
  for (const c of corps.confirmations ?? []) {
    if (c.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.knowledgeEngineRepo.creerConfirmation(c)
  }
  for (const r of corps.knowledgeRelations ?? []) {
    if (r.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.knowledgeEngineRepo.creerKnowledgeRelation(r)
  }
  for (const c of corps.conflicts ?? []) {
    if (c.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.knowledgeEngineRepo.creerConflict(c)
  }
  return reponseJson(
    {
      sources: corps.sources ?? [],
      sourceLocations: corps.sourceLocations ?? [],
      sourceVersions: corps.sourceVersions ?? [],
      extractions: corps.extractions ?? [],
      extractionItems: corps.extractionItems ?? [],
      knowledgeItems: corps.knowledgeItems ?? [],
      confirmations: corps.confirmations ?? [],
      knowledgeRelations: corps.knowledgeRelations ?? [],
      conflicts: corps.conflicts ?? [],
    },
    200,
    entetes,
  )
}

// --- Handlers : ContentPlan (Target Architecture, domaine "Deliverable
// Engine", Phase 7b du chantier de migration D1) ---

const SEVERITE_READINESS: Record<string, number> = {
  bloque: 3,
  besoin_information: 2,
  besoin_revue: 1,
  pret: 0,
}

function pireReadiness(a: string, b: string): string {
  return (SEVERITE_READINESS[b] ?? 0) > (SEVERITE_READINESS[a] ?? 0) ? b : a
}

/**
 * Calcul déterministe de `readiness` — porté côté serveur (jamais fait
 * confiance à une valeur fournie par le client, notamment pour le
 * garde-fou de `gererGelerContentPlan`) à partir des mêmes dépôts D1 que
 * `construireReadinessContentPlan` (`logique-metier/deliverable/
 * readinessContentPlan.ts`, côté frontend) résout côté client pour
 * l'affichage : `Requirement → Couverture → Test → Execution → Evidence`
 * ancré sur `assetNodeId`, plus un `QualityEvent` non clôturé sur ce
 * même nœud qui bloque toujours. Même logique, adaptée aux champs
 * camelCase des dépôts Worker.
 */
async function calculerReadinessContentPlan(
  ctx: Contexte,
  clientId: string,
  assetNodeId: string | null,
): Promise<string> {
  if (assetNodeId === null) return 'besoin_information'

  const [requirements, couvertures, tests, executions, evidences, qualityEvents] =
    await Promise.all([
      ctx.testDefinitionRepo.listerRequirements(clientId),
      ctx.testDefinitionRepo.listerCouvertures(clientId),
      ctx.testDefinitionRepo.listerTests(clientId),
      ctx.executionRepo.listerExecutions(clientId),
      ctx.evidenceRepo.listerEvidences(clientId),
      ctx.qualityEventRepo.listerEvenements(clientId),
    ])

  const evenementBloquant = qualityEvents.some(
    (e) => e.assetNodeId === assetNodeId && e.statut !== 'cloture',
  )
  if (evenementBloquant) return 'bloque'

  const requirementsPertinents = requirements.filter((r) => r.assetNodeId === assetNodeId)
  if (requirementsPertinents.length === 0) return 'besoin_information'

  let resultat = 'pret'
  for (const requirement of requirementsPertinents) {
    const testIdsCouvrants = couvertures
      .filter((c) => c.requirementId === requirement.id)
      .map((c) => c.testId)
    if (testIdsCouvrants.length === 0) {
      resultat = pireReadiness(resultat, 'besoin_revue')
      continue
    }

    const testsCouvrants = tests.filter((t) => testIdsCouvrants.includes(t.id))
    for (const test of testsCouvrants) {
      if (test.statut === 'brouillon') {
        resultat = pireReadiness(resultat, 'besoin_revue')
        continue
      }
      const executionsDuTest = executions.filter((e) => e.testId === test.id)
      if (executionsDuTest.length === 0) {
        resultat = pireReadiness(resultat, 'besoin_information')
        continue
      }
      for (const execution of executionsDuTest) {
        if (execution.statut !== 'terminee') {
          resultat = pireReadiness(resultat, 'besoin_information')
          continue
        }
        if (execution.verdict === 'non_conforme') {
          resultat = pireReadiness(resultat, 'bloque')
          continue
        }
        const aDeLaPreuve = evidences.some((ev) => ev.executionId === execution.id)
        resultat = pireReadiness(resultat, aDeLaPreuve ? 'pret' : 'besoin_revue')
      }
    }
  }
  return resultat
}

async function gererObtenirContentPlans(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const contentPlans = await ctx.contentPlanRepo.listerContentPlans(clientId)
  return reponseJson({ contentPlans }, 200, entetes)
}

interface SaisieCreationContentPlan {
  templateId?: string
  assetNodeId?: string | null
  processId?: string | null
  methodProfileId?: string | null
  methodProfileType?: string | null
  contextSnapshot?: string
}

/** `readiness` est toujours calculée côté serveur à la création, jamais fournie par l'appelant. */
async function gererCreerContentPlan(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const corps = await lireCorpsJson<SaisieCreationContentPlan>(request)
  if (!corps?.templateId || corps.contextSnapshot === undefined) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  const assetNodeId = corps.assetNodeId ?? null
  const readiness = await calculerReadinessContentPlan(ctx, clientId, assetNodeId)
  const maintenant = horodatage()
  const plan: ContentPlanEnregistre = {
    id: genererId(),
    clientId,
    templateId: corps.templateId,
    assetNodeId,
    processId: corps.processId ?? null,
    methodProfileId: corps.methodProfileId ?? null,
    methodProfileType: corps.methodProfileType ?? null,
    contextSnapshot: corps.contextSnapshot,
    readiness,
    statut: 'brouillon',
    auditLog: [{ timestamp: maintenant, actor: acteur.email, action: 'création' }],
    createdAt: maintenant,
    updatedAt: maintenant,
  }
  await ctx.contentPlanRepo.creerContentPlan(plan)
  return reponseJson({ contentPlan: plan }, 201, entetes)
}

/** Recalcule `readiness` à la demande — jamais automatique en tâche de fond, toujours une action explicite tracée. */
async function gererRecalculerReadiness(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  contentPlanId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const existant = await ctx.contentPlanRepo.contentPlanParId(contentPlanId)
  if (!existant || existant.clientId !== clientId) {
    return reponseJson({ erreur: 'introuvable' }, 404, entetes)
  }
  if (existant.statut === 'gele') {
    return reponseJson({ erreur: 'deja_gele' }, 400, entetes)
  }

  const readiness = await calculerReadinessContentPlan(ctx, clientId, existant.assetNodeId)
  const maintenant = horodatage()
  const miseAJour: ContentPlanEnregistre = {
    ...existant,
    readiness,
    updatedAt: maintenant,
    auditLog: [
      ...existant.auditLog,
      {
        timestamp: maintenant,
        actor: acteur.email,
        action: `recalcul readiness : ${readiness}`,
      },
    ],
  }
  await ctx.contentPlanRepo.remplacerContentPlan(miseAJour)
  return reponseJson({ contentPlan: miseAJour }, 200, entetes)
}

async function gererValiderContentPlan(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  contentPlanId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const existant = await ctx.contentPlanRepo.contentPlanParId(contentPlanId)
  if (!existant || existant.clientId !== clientId) {
    return reponseJson({ erreur: 'introuvable' }, 404, entetes)
  }
  if (existant.statut === 'gele') {
    return reponseJson({ erreur: 'deja_gele' }, 400, entetes)
  }

  const miseAJour = changerStatutContentPlan(existant, 'valide', acteur.email)
  await ctx.contentPlanRepo.remplacerContentPlan(miseAJour)
  return reponseJson({ contentPlan: miseAJour }, 200, entetes)
}

/**
 * Garde-fous non négociables, revérifiés côté serveur : DOIT être
 * `valide` au préalable (pas de saut direct depuis `brouillon`) ET
 * `readiness` DOIT être `pret` — jamais fait confiance à une valeur
 * fournie par le client, recalculée ici avant toute décision.
 */
async function gererGelerContentPlan(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  contentPlanId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const existant = await ctx.contentPlanRepo.contentPlanParId(contentPlanId)
  if (!existant || existant.clientId !== clientId) {
    return reponseJson({ erreur: 'introuvable' }, 404, entetes)
  }
  if (existant.statut === 'gele') {
    return reponseJson({ erreur: 'deja_gele' }, 400, entetes)
  }
  if (existant.statut !== 'valide') {
    return reponseJson({ erreur: 'non_valide' }, 400, entetes)
  }

  const readiness = await calculerReadinessContentPlan(ctx, clientId, existant.assetNodeId)
  if (readiness !== 'pret') {
    return reponseJson({ erreur: 'donnees_non_pretes' }, 400, entetes)
  }

  const miseAJour = changerStatutContentPlan({ ...existant, readiness }, 'gele', acteur.email)
  await ctx.contentPlanRepo.remplacerContentPlan(miseAJour)
  return reponseJson({ contentPlan: miseAJour }, 200, entetes)
}

function changerStatutContentPlan(
  existant: ContentPlanEnregistre,
  statut: string,
  actor: string,
): ContentPlanEnregistre {
  const maintenant = horodatage()
  return {
    ...existant,
    statut,
    updatedAt: maintenant,
    auditLog: [
      ...existant.auditLog,
      { timestamp: maintenant, actor, action: `changement de statut : ${statut}` },
    ],
  }
}

/**
 * Filet de sécurité de migration locale (`useContentPlanStore`), même
 * discipline que les autres migrations locales de ce chantier —
 * idempotente, l'existant côté serveur gagne toujours (`ON CONFLICT(id)
 * DO NOTHING` dans `D1ContentPlanRepo`).
 */
interface SaisieMigrationContentPlans {
  contentPlans?: ContentPlanEnregistre[]
}

async function gererMigrerContentPlansLocal(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const corps = await lireCorpsJson<SaisieMigrationContentPlans>(request)
  if (!corps || !Array.isArray(corps.contentPlans)) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  for (const p of corps.contentPlans) {
    if (p.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.contentPlanRepo.creerContentPlan(p)
  }
  return reponseJson({ contentPlans: corps.contentPlans }, 200, entetes)
}

// --- Handlers : Integration (Target Architecture, domaine "Integration",
// Phase 7c du chantier de migration D1) ---

async function gererObtenirIntegration(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const [connectors, syncJobs, externalReferences] = await Promise.all([
    ctx.integrationRepo.listerConnectors(clientId),
    ctx.integrationRepo.listerSyncJobs(clientId),
    ctx.integrationRepo.listerExternalReferences(clientId),
  ])
  return reponseJson({ connectors, syncJobs, externalReferences }, 200, entetes)
}

interface SaisieCreationConnector {
  nom?: string
  actif?: boolean
  type?: string
  config?: unknown
}

/** `config` (secrets de connexion inclus) est stocké tel quel en JSON — même principe que `contextSnapshot` de ContentPlan. */
async function gererCreerConnector(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const corps = await lireCorpsJson<SaisieCreationConnector>(request)
  if (!corps?.nom || !corps.type || corps.config === undefined) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  const connector: ConnectorEnregistre = {
    id: genererId(),
    clientId,
    nom: corps.nom,
    actif: corps.actif ?? true,
    type: corps.type,
    config: JSON.stringify(corps.config),
    createdAt: horodatage(),
  }
  await ctx.integrationRepo.creerConnector(connector)
  return reponseJson({ connector }, 201, entetes)
}

async function gererDesactiverConnector(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  connectorId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const existant = await ctx.integrationRepo.connectorParId(connectorId)
  if (!existant || existant.clientId !== clientId) {
    return reponseJson({ erreur: 'introuvable' }, 404, entetes)
  }

  const miseAJour: ConnectorEnregistre = { ...existant, actif: false }
  await ctx.integrationRepo.remplacerConnector(miseAJour)
  return reponseJson({ connector: miseAJour }, 200, entetes)
}

async function gererBasculerActifConnector(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  connectorId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const existant = await ctx.integrationRepo.connectorParId(connectorId)
  if (!existant || existant.clientId !== clientId) {
    return reponseJson({ erreur: 'introuvable' }, 404, entetes)
  }

  const miseAJour: ConnectorEnregistre = { ...existant, actif: !existant.actif }
  await ctx.integrationRepo.remplacerConnector(miseAJour)
  return reponseJson({ connector: miseAJour }, 200, entetes)
}

/**
 * Vraie suppression physique — nouveau patron dans ce chantier,
 * justifié car `Connector` est une pure configuration technique (pas un
 * enregistrement GxP à préserver), contrairement à tous les autres
 * domaines migrés jusqu'ici.
 */
async function gererSupprimerConnector(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  connectorId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const existant = await ctx.integrationRepo.connectorParId(connectorId)
  if (!existant || existant.clientId !== clientId) {
    return reponseJson({ erreur: 'introuvable' }, 404, entetes)
  }

  await ctx.integrationRepo.supprimerConnector(connectorId)
  return reponseJson({ ok: true }, 200, entetes)
}

async function gererDemarrerSyncJob(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  connectorId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const connector = await ctx.integrationRepo.connectorParId(connectorId)
  if (!connector || connector.clientId !== clientId) {
    return reponseJson({ erreur: 'connector_introuvable' }, 404, entetes)
  }

  const maintenant = horodatage()
  const job: SyncJobEnregistre = {
    id: genererId(),
    clientId,
    connectorId,
    statut: 'en_attente',
    tentative: 1,
    derniereErreur: null,
    createdAt: maintenant,
    updatedAt: maintenant,
  }
  await ctx.integrationRepo.creerSyncJob(job)
  return reponseJson({ syncJob: job }, 201, entetes)
}

/**
 * Garde-fou non négociable : `indisponible`/`echec` ne bloque jamais une
 * activité métier indépendante — aucun handler de ce domaine ne
 * conditionne `gererDeclarerReference` ou toute autre opération au
 * statut d'un `SyncJob` (cohérent avec `QualityEvent`).
 */
async function gererMarquerSyncJobIndisponible(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  syncJobId: string,
): Promise<Response> {
  return changerStatutSyncJob(request, ctx, entetes, clientId, syncJobId, (existant) => ({
    ...existant,
    statut: 'indisponible',
    derniereErreur: null,
  }))
}

async function gererMarquerSyncJobNouvelleTentative(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  syncJobId: string,
): Promise<Response> {
  return changerStatutSyncJob(request, ctx, entetes, clientId, syncJobId, (existant) => ({
    ...existant,
    statut: 'nouvelle_tentative',
    tentative: existant.tentative + 1,
  }))
}

async function gererMarquerSyncJobEchec(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  syncJobId: string,
): Promise<Response> {
  const corps = await lireCorpsJson<{ erreur?: string }>(request)
  if (!corps?.erreur) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)

  return changerStatutSyncJob(request, ctx, entetes, clientId, syncJobId, (existant) => ({
    ...existant,
    statut: 'echec',
    derniereErreur: corps.erreur as string,
  }))
}

async function gererMarquerSyncJobReussi(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  syncJobId: string,
): Promise<Response> {
  return changerStatutSyncJob(request, ctx, entetes, clientId, syncJobId, (existant) => ({
    ...existant,
    statut: 'reussi',
    derniereErreur: null,
  }))
}

async function changerStatutSyncJob(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  syncJobId: string,
  transformer: (existant: SyncJobEnregistre) => SyncJobEnregistre,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const existant = await ctx.integrationRepo.syncJobParId(syncJobId)
  if (!existant || existant.clientId !== clientId) {
    return reponseJson({ erreur: 'introuvable' }, 404, entetes)
  }

  const miseAJour: SyncJobEnregistre = { ...transformer(existant), updatedAt: horodatage() }
  await ctx.integrationRepo.remplacerSyncJob(miseAJour)
  return reponseJson({ syncJob: miseAJour }, 200, entetes)
}

interface SaisieDeclarationReference {
  identifiantExterne?: string
  libelle?: string
}

/** Pointeur vers un document externe — jamais son contenu dupliqué. Aucune vérification d'existence du `Connector` (comportement inchangé du store d'origine). */
async function gererDeclarerReference(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  connectorId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const corps = await lireCorpsJson<SaisieDeclarationReference>(request)
  if (!corps?.identifiantExterne || !corps.libelle) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  const reference: ExternalReferenceEnregistre = {
    id: genererId(),
    clientId,
    connectorId,
    identifiantExterne: corps.identifiantExterne,
    libelle: corps.libelle,
    createdAt: horodatage(),
  }
  await ctx.integrationRepo.creerExternalReference(reference)
  return reponseJson({ externalReference: reference }, 201, entetes)
}

/**
 * Filet de sécurité de migration locale (`useIntegrationStore`/
 * `useConnecteursQMSStore`), même discipline que les autres migrations
 * locales de ce chantier — idempotente, l'existant côté serveur gagne
 * toujours (`ON CONFLICT(id) DO NOTHING` dans `D1IntegrationRepo`).
 */
interface SaisieMigrationIntegration {
  connectors?: ConnectorEnregistre[]
  syncJobs?: SyncJobEnregistre[]
  externalReferences?: ExternalReferenceEnregistre[]
}

async function gererMigrerIntegrationLocal(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const corps = await lireCorpsJson<SaisieMigrationIntegration>(request)
  if (
    !corps ||
    !Array.isArray(corps.connectors) ||
    !Array.isArray(corps.syncJobs) ||
    !Array.isArray(corps.externalReferences)
  ) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  for (const c of corps.connectors) {
    if (c.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.integrationRepo.creerConnector(c)
  }
  for (const j of corps.syncJobs) {
    if (j.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.integrationRepo.creerSyncJob(j)
  }
  for (const r of corps.externalReferences) {
    if (r.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.integrationRepo.creerExternalReference(r)
  }
  return reponseJson(
    {
      connectors: corps.connectors,
      syncJobs: corps.syncJobs,
      externalReferences: corps.externalReferences,
    },
    200,
    entetes,
  )
}

// --- Handlers : Mission/Activity/Dependency/AssociationMissionQualityEvent (Target Architecture, domaine "Work", Phase 8a du chantier de migration D1) ---

async function gererObtenirMissions(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  const [missions, activities, dependencies, associationsQualityEvent] = await Promise.all([
    ctx.missionRepo.listerMissions(clientId),
    ctx.missionRepo.listerActivities(clientId),
    ctx.missionRepo.listerDependencies(clientId),
    ctx.missionRepo.listerAssociationsMissionQualityEvent(clientId),
  ])
  return reponseJson({ missions, activities, dependencies, associationsQualityEvent }, 200, entetes)
}

interface SaisieCreationMission {
  workspaceId?: string | null
  assetNodeId?: string | null
  titre?: string
  description?: string
}

async function gererCreerMission(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  const corps = await lireCorpsJson<SaisieCreationMission>(request)
  if (!corps?.titre || corps.description === undefined) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  const maintenant = horodatage()
  const mission: MissionEnregistree = {
    id: genererId(),
    clientId,
    workspaceId: corps.workspaceId ?? null,
    assetNodeId: corps.assetNodeId ?? null,
    titre: corps.titre,
    description: corps.description,
    statut: 'ouverte',
    auditLog: [{ timestamp: maintenant, actor: acteur.email, action: 'création' }],
    createdAt: maintenant,
    updatedAt: maintenant,
  }
  await ctx.missionRepo.creerMission(mission)
  return reponseJson({ mission }, 201, entetes)
}

async function gererChangerStatutMission(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  missionId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  const existante = await ctx.missionRepo.missionParId(missionId)
  if (!existante || existante.clientId !== clientId) {
    return reponseJson({ erreur: 'introuvable' }, 404, entetes)
  }
  const corps = await lireCorpsJson<{ statut?: string }>(request)
  if (!corps?.statut) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  const maintenant = horodatage()
  const miseAJour: MissionEnregistree = {
    ...existante,
    statut: corps.statut,
    updatedAt: maintenant,
    auditLog: [
      ...existante.auditLog,
      {
        timestamp: maintenant,
        actor: acteur.email,
        action: `changement de statut : ${corps.statut}`,
      },
    ],
  }
  await ctx.missionRepo.remplacerMission(miseAJour)
  return reponseJson({ mission: miseAJour }, 200, entetes)
}

/** Association N:M idempotente — jamais une étape obligatoire. */
async function gererAssocierQualityEvent(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  missionId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur
  const corps = await lireCorpsJson<{ qualityEventId?: string }>(request)
  if (!corps?.qualityEventId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  const existante = await ctx.missionRepo.associationMissionQualityEventExistante(
    missionId,
    corps.qualityEventId,
  )
  if (existante) return reponseJson({ association: existante }, 200, entetes)
  const association: AssociationMissionQualityEventEnregistree = {
    id: genererId(),
    clientId,
    missionId,
    qualityEventId: corps.qualityEventId,
    createdAt: horodatage(),
  }
  await ctx.missionRepo.creerAssociationMissionQualityEvent(association)
  return reponseJson({ association }, 201, entetes)
}

interface SaisieCreationActivity {
  titre?: string
  description?: string
}

async function gererCreerActivity(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  missionId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  const corps = await lireCorpsJson<SaisieCreationActivity>(request)
  if (!corps?.titre || corps.description === undefined) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  const maintenant = horodatage()
  const activity: ActivityEnregistree = {
    id: genererId(),
    clientId,
    missionId,
    titre: corps.titre,
    description: corps.description,
    statut: 'a_faire',
    auditLog: [{ timestamp: maintenant, actor: acteur.email, action: 'création' }],
    createdAt: maintenant,
    updatedAt: maintenant,
  }
  await ctx.missionRepo.creerActivity(activity)
  return reponseJson({ activity }, 201, entetes)
}

async function gererChangerStatutActivity(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  activityId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  const existante = await ctx.missionRepo.activityParId(activityId)
  if (!existante || existante.clientId !== clientId) {
    return reponseJson({ erreur: 'introuvable' }, 404, entetes)
  }
  const corps = await lireCorpsJson<{ statut?: string }>(request)
  if (!corps?.statut) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  const maintenant = horodatage()
  const miseAJour: ActivityEnregistree = {
    ...existante,
    statut: corps.statut,
    updatedAt: maintenant,
    auditLog: [
      ...existante.auditLog,
      {
        timestamp: maintenant,
        actor: acteur.email,
        action: `changement de statut : ${corps.statut}`,
      },
    ],
  }
  await ctx.missionRepo.remplacerActivity(miseAJour)
  return reponseJson({ activity: miseAJour }, 200, entetes)
}

/**
 * Dépendance Activity -> Activity — jamais un verrou bloquant : aucun
 * handler de ce domaine ne conditionne un changement de statut d'Activity
 * à l'état de ses dépendances (même discipline que QualityEvent/Connector).
 */
async function gererAjouterDependance(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  activitySourceId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur
  const corps = await lireCorpsJson<{ activityCibleId?: string }>(request)
  if (!corps?.activityCibleId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  const existante = await ctx.missionRepo.dependencyExistante(
    activitySourceId,
    corps.activityCibleId,
  )
  if (existante) return reponseJson({ dependency: existante }, 200, entetes)
  const dependency: DependencyEnregistree = {
    id: genererId(),
    clientId,
    activitySourceId,
    activityCibleId: corps.activityCibleId,
    createdAt: horodatage(),
  }
  await ctx.missionRepo.creerDependency(dependency)
  return reponseJson({ dependency }, 201, entetes)
}

interface SaisieMigrationMissions {
  missions?: MissionEnregistree[]
  activities?: ActivityEnregistree[]
  dependencies?: DependencyEnregistree[]
  associationsQualityEvent?: AssociationMissionQualityEventEnregistree[]
}

async function gererMigrerMissionsLocal(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur
  const corps = await lireCorpsJson<SaisieMigrationMissions>(request)
  if (
    !corps ||
    !Array.isArray(corps.missions) ||
    !Array.isArray(corps.activities) ||
    !Array.isArray(corps.dependencies) ||
    !Array.isArray(corps.associationsQualityEvent)
  ) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  for (const m of corps.missions) {
    if (m.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.missionRepo.creerMission(m)
  }
  for (const a of corps.activities) {
    if (a.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.missionRepo.creerActivity(a)
  }
  for (const d of corps.dependencies) {
    if (d.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.missionRepo.creerDependency(d)
  }
  for (const assoc of corps.associationsQualityEvent) {
    if (assoc.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.missionRepo.creerAssociationMissionQualityEvent(assoc)
  }
  return reponseJson(
    {
      missions: corps.missions,
      activities: corps.activities,
      dependencies: corps.dependencies,
      associationsQualityEvent: corps.associationsQualityEvent,
    },
    200,
    entetes,
  )
}

// --- Handlers : ContextSnapshot/ContextSnapshotItem (Target Architecture, domaine "Context Engine", Phase 8b du chantier de migration D1) ---

interface ElementContextSnapshotServeur {
  typeObjet: string
  objetId: string
}

/**
 * Remonte l'arbre `Workspace` depuis `workspaceId` vers la racine via
 * `parentWorkspaceId`, et retourne la liste des id traversés (lui-même
 * inclus). Garde anti-cycle : un id déjà visité arrête la remontée.
 * Porté côté serveur depuis `logique-metier/organisation/
 * ancetresWorkspace.ts` (frontend) — même logique, champs camelCase des
 * dépôts Worker.
 */
function ancetresWorkspaceServeur(
  workspaceId: string,
  arbre: ReadonlyMap<string, WorkspaceEnregistre>,
): string[] {
  const chemin: string[] = []
  const visites = new Set<string>()
  let courant: string | null = workspaceId

  while (courant !== null) {
    if (visites.has(courant)) break
    visites.add(courant)
    chemin.push(courant)
    courant = arbre.get(courant)?.parentWorkspaceId ?? null
  }

  return chemin
}

/**
 * Un nœud est visible depuis `workspaceId` s'il y est assigné, s'il est
 * assigné à l'un de ses ancêtres (héritage descendant), ou s'il n'a pas
 * encore été assigné (`workspaceId: null`). Porté côté serveur depuis
 * `logique-metier/organisation/noeudsVisiblesDepuisWorkspace.ts`.
 */
function noeudsVisiblesDepuisWorkspaceServeur(
  workspaceId: string,
  arbre: ReadonlyMap<string, WorkspaceEnregistre>,
  noeuds: readonly AssetNodeEnregistre[],
): AssetNodeEnregistre[] {
  const ancetres = new Set(ancetresWorkspaceServeur(workspaceId, arbre))
  return noeuds.filter((n) => n.workspaceId === null || ancetres.has(n.workspaceId))
}

/**
 * Assemble les éléments de contexte pertinents pour une ancre donnée —
 * porté côté serveur depuis `logique-metier/contexte/
 * assemblageContextSnapshot.ts` (fonction pure, frontend), à partir des
 * mêmes dépôts D1 déjà migrés (Organization/Workspace Phase 2, Structure
 * Système Phase 1, ManufacturingContext Phase 5a, QualityEvent Phase
 * 5b). Si `assetNodeId` est fourni, résolution exacte sur ce nœud précis
 * (pas ses descendants). Sinon, si `workspaceId` est fourni, résolution
 * par visibilité de site. Si ni l'un ni l'autre, aucun élément assemblé.
 */
async function assemblerElementsContextSnapshot(
  ctx: Contexte,
  clientId: string,
  workspaceId: string | null,
  assetNodeId: string | null,
): Promise<ElementContextSnapshotServeur[]> {
  const [workspaces, assetNodes, manufacturingContexts, qualityEvents] = await Promise.all([
    ctx.organisationRepo.listerWorkspaces(clientId),
    ctx.structureSystemeRepo.listerNoeuds(clientId),
    ctx.processContextRepo.listerManufacturingContexts(clientId),
    ctx.qualityEventRepo.listerEvenements(clientId),
  ])
  const arbre = new Map(workspaces.map((w) => [w.id, w]))

  const noeudsPertinents: readonly AssetNodeEnregistre[] = assetNodeId
    ? assetNodes.filter((n) => n.id === assetNodeId)
    : workspaceId
      ? noeudsVisiblesDepuisWorkspaceServeur(workspaceId, arbre, assetNodes)
      : []

  const idsNoeudsPertinents = new Set(noeudsPertinents.map((n) => n.id))

  const elements: ElementContextSnapshotServeur[] = noeudsPertinents.map((n) => ({
    typeObjet: 'asset_node',
    objetId: n.id,
  }))

  for (const contexte of manufacturingContexts) {
    if (idsNoeudsPertinents.has(contexte.assetNodeId)) {
      elements.push({ typeObjet: 'manufacturing_context', objetId: contexte.id })
    }
  }

  for (const evenement of qualityEvents) {
    if (evenement.assetNodeId !== null && idsNoeudsPertinents.has(evenement.assetNodeId)) {
      elements.push({ typeObjet: 'quality_event', objetId: evenement.id })
    }
  }

  return elements
}

async function gererObtenirContextSnapshots(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  const [contextSnapshots, contextSnapshotItems] = await Promise.all([
    ctx.contextSnapshotRepo.listerSnapshots(clientId),
    ctx.contextSnapshotRepo.listerItems(clientId),
  ])
  return reponseJson({ contextSnapshots, contextSnapshotItems }, 200, entetes)
}

interface SaisieAssemblageContextSnapshot {
  workspaceId?: string | null
  assetNodeId?: string | null
}

/**
 * Assemble et persiste un nouveau `ContextSnapshot` — l'assemblage est
 * calculé côté serveur (`assemblerElementsContextSnapshot`), jamais fait
 * confiance à une liste d'éléments fournie par le client. Immuable une
 * fois créé (invariant #12) : aucune route de mise à jour n'existe pour
 * ce domaine.
 */
async function gererAssemblerContextSnapshot(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const corps = await lireCorpsJson<SaisieAssemblageContextSnapshot>(request)
  const workspaceId = corps?.workspaceId ?? null
  const assetNodeId = corps?.assetNodeId ?? null

  const elements = await assemblerElementsContextSnapshot(ctx, clientId, workspaceId, assetNodeId)

  const contextSnapshot: ContextSnapshotEnregistre = {
    id: genererId(),
    clientId,
    workspaceId,
    assetNodeId,
    createdAt: horodatage(),
  }
  await ctx.contextSnapshotRepo.creerSnapshot(contextSnapshot)

  const contextSnapshotItems: ContextSnapshotItemEnregistre[] = elements.map((element) => ({
    id: genererId(),
    clientId,
    contextSnapshotId: contextSnapshot.id,
    typeObjet: element.typeObjet,
    objetId: element.objetId,
  }))
  for (const item of contextSnapshotItems) {
    await ctx.contextSnapshotRepo.creerItem(item)
  }

  return reponseJson({ contextSnapshot, contextSnapshotItems }, 201, entetes)
}

interface SaisieMigrationContextSnapshots {
  contextSnapshots?: ContextSnapshotEnregistre[]
  contextSnapshotItems?: ContextSnapshotItemEnregistre[]
}

async function gererMigrerContextSnapshotsLocal(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur
  const corps = await lireCorpsJson<SaisieMigrationContextSnapshots>(request)
  if (
    !corps ||
    !Array.isArray(corps.contextSnapshots) ||
    !Array.isArray(corps.contextSnapshotItems)
  ) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  for (const s of corps.contextSnapshots) {
    if (s.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.contextSnapshotRepo.creerSnapshot(s)
  }
  for (const i of corps.contextSnapshotItems) {
    if (i.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.contextSnapshotRepo.creerItem(i)
  }
  return reponseJson(
    {
      contextSnapshots: corps.contextSnapshots,
      contextSnapshotItems: corps.contextSnapshotItems,
    },
    200,
    entetes,
  )
}

// --- Handlers : AIConfiguration/AIRequest/AIResponse/CitationAIResponse
// (Target Architecture, domaine "Reasoning Engine", Phase 8c du chantier
// de migration D1) — seule la persistance CRUD migre ici : l'orchestration
// du raisonnement (appels réseau réels au fournisseur LLM) reste côté
// client, hors périmètre de ce chantier. Les 4 entités sont entièrement
// immuables une fois créées, INSERT-only.

async function gererObtenirReasoningEngine(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  const [configurations, requests, responses, citations] = await Promise.all([
    ctx.reasoningEngineRepo.listerConfigurations(clientId),
    ctx.reasoningEngineRepo.listerRequests(clientId),
    ctx.reasoningEngineRepo.listerResponses(clientId),
    ctx.reasoningEngineRepo.listerCitations(clientId),
  ])
  return reponseJson({ configurations, requests, responses, citations }, 200, entetes)
}

interface SaisieAssurerConfiguration {
  version?: string
  outilsDisponibles?: string[]
}

/**
 * Idempotent : le catalogue d'outils disponibles (`CATALOGUE_OUTILS_RAISONNEMENT`)
 * et le numéro de version courante sont un concept purement client
 * (`logique-metier/raisonnement/outilsRaisonnement.ts`) — le serveur ne
 * fait que chercher une configuration existante pour cette version avant
 * d'en créer une nouvelle, jamais de modification en place (condition E4).
 */
async function gererAssurerConfiguration(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur
  const corps = await lireCorpsJson<SaisieAssurerConfiguration>(request)
  if (!corps?.version || !Array.isArray(corps.outilsDisponibles)) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  const existante = await ctx.reasoningEngineRepo.configurationParVersion(clientId, corps.version)
  if (existante) return reponseJson({ configuration: existante }, 200, entetes)
  const configuration: AIConfigurationEnregistree = {
    id: genererId(),
    clientId,
    version: corps.version,
    outilsDisponibles: corps.outilsDisponibles,
    createdAt: horodatage(),
  }
  await ctx.reasoningEngineRepo.creerConfiguration(configuration)
  return reponseJson({ configuration }, 201, entetes)
}

interface SaisieCreationAIRequest {
  missionId?: string | null
  contextSnapshotId?: string | null
  aiConfigurationId?: string
  objectif?: string
}

async function gererCreerAIRequest(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur
  const corps = await lireCorpsJson<SaisieCreationAIRequest>(request)
  if (!corps?.aiConfigurationId || !corps.objectif) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  const aiRequest: AIRequestEnregistree = {
    id: genererId(),
    clientId,
    missionId: corps.missionId ?? null,
    contextSnapshotId: corps.contextSnapshotId ?? null,
    aiConfigurationId: corps.aiConfigurationId,
    objectif: corps.objectif,
    createdAt: horodatage(),
  }
  await ctx.reasoningEngineRepo.creerRequest(aiRequest)
  return reponseJson({ request: aiRequest }, 201, entetes)
}

interface SaisieCreationAIResponse {
  aiRequestId?: string
  texte?: string
  etatConfiance?: string
  traceAppelsOutils?: AIResponseEnregistree['traceAppelsOutils']
  versionMoteur?: string | null
}

async function gererCreerAIResponse(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur
  const corps = await lireCorpsJson<SaisieCreationAIResponse>(request)
  if (
    !corps?.aiRequestId ||
    corps.texte === undefined ||
    !corps.etatConfiance ||
    !Array.isArray(corps.traceAppelsOutils)
  ) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  const aiResponse: AIResponseEnregistree = {
    id: genererId(),
    clientId,
    aiRequestId: corps.aiRequestId,
    texte: corps.texte,
    etatConfiance: corps.etatConfiance,
    traceAppelsOutils: corps.traceAppelsOutils,
    versionMoteur: corps.versionMoteur ?? null,
    createdAt: horodatage(),
  }
  await ctx.reasoningEngineRepo.creerResponse(aiResponse)
  return reponseJson({ response: aiResponse }, 201, entetes)
}

interface SaisieCitationAIResponse {
  aiResponseId?: string
  typeObjetCite?: string
  objetId?: string
}

interface SaisieCreationCitations {
  citations?: SaisieCitationAIResponse[]
}

/**
 * Création groupée — les citations d'une `AIResponse` sont toujours
 * créées ensemble juste après elle (même lot que `bulkPut` côté client
 * avant cette migration), jamais une à une dans le flux normal.
 */
async function gererCreerCitations(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur
  const corps = await lireCorpsJson<SaisieCreationCitations>(request)
  if (!corps || !Array.isArray(corps.citations)) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  const citations: CitationAIResponseEnregistree[] = []
  for (const c of corps.citations) {
    if (!c.aiResponseId || !c.typeObjetCite || !c.objetId) {
      return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    }
    const citation: CitationAIResponseEnregistree = {
      id: genererId(),
      clientId,
      aiResponseId: c.aiResponseId,
      typeObjetCite: c.typeObjetCite,
      objetId: c.objetId,
    }
    await ctx.reasoningEngineRepo.creerCitation(citation)
    citations.push(citation)
  }
  return reponseJson({ citations }, 201, entetes)
}

interface SaisieMigrationReasoningEngine {
  configurations?: AIConfigurationEnregistree[]
  requests?: AIRequestEnregistree[]
  responses?: AIResponseEnregistree[]
  citations?: CitationAIResponseEnregistree[]
}

async function gererMigrerReasoningEngineLocal(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur
  const corps = await lireCorpsJson<SaisieMigrationReasoningEngine>(request)
  if (
    !corps ||
    !Array.isArray(corps.configurations) ||
    !Array.isArray(corps.requests) ||
    !Array.isArray(corps.responses) ||
    !Array.isArray(corps.citations)
  ) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  for (const c of corps.configurations) {
    if (c.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.reasoningEngineRepo.creerConfiguration(c)
  }
  for (const r of corps.requests) {
    if (r.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.reasoningEngineRepo.creerRequest(r)
  }
  for (const r of corps.responses) {
    if (r.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.reasoningEngineRepo.creerResponse(r)
  }
  for (const c of corps.citations) {
    if (c.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.reasoningEngineRepo.creerCitation(c)
  }
  return reponseJson(
    {
      configurations: corps.configurations,
      requests: corps.requests,
      responses: corps.responses,
      citations: corps.citations,
    },
    200,
    entetes,
  )
}

// --- Handlers : Procedure/ProcedureStep (cerveau procédural, Phase 9a du
// chantier de migration D1) — les deux entités sont entièrement
// immuables une fois créées (INSERT-only) : une nouvelle révision d'une
// `reference` crée une nouvelle Procedure avec un numeroVersion
// incrémenté, jamais une mutation en place.

async function gererObtenirProcedures(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  const [procedures, procedureSteps] = await Promise.all([
    ctx.procedureRepo.listerProcedures(clientId),
    ctx.procedureRepo.listerEtapes(clientId),
  ])
  return reponseJson({ procedures, procedureSteps }, 200, entetes)
}

interface SaisieCreationProcedure {
  reference?: string
  titre?: string
  effectiveDate?: string
  categorie?: string
  sourceId?: string | null
}

async function gererCreerProcedure(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur
  const corps = await lireCorpsJson<SaisieCreationProcedure>(request)
  if (!corps?.reference || !corps.titre || !corps.effectiveDate || !corps.categorie) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  const versionsExistantes = (await ctx.procedureRepo.listerProcedures(clientId)).filter(
    (p) => p.reference === corps.reference,
  )
  const numeroVersion = versionsExistantes.reduce((max, p) => Math.max(max, p.numeroVersion), 0) + 1
  const procedure: ProcedureEnregistree = {
    id: genererId(),
    clientId,
    reference: corps.reference,
    numeroVersion,
    titre: corps.titre,
    effectiveDate: corps.effectiveDate,
    categorie: corps.categorie,
    sourceId: corps.sourceId ?? null,
    createdAt: horodatage(),
  }
  await ctx.procedureRepo.creerProcedure(procedure)
  return reponseJson({ procedure }, 201, entetes)
}

interface SaisieCreationEtapeProcedure {
  description?: string
  obligatoire?: boolean
  condition?: string | null
  responsable?: string | null
}

async function gererAjouterEtapeProcedure(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
  procedureId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur
  const procedure = await ctx.procedureRepo.procedureParId(clientId, procedureId)
  if (!procedure) {
    return reponseJson({ erreur: 'procedure_introuvable' }, 404, entetes)
  }
  const corps = await lireCorpsJson<SaisieCreationEtapeProcedure>(request)
  if (!corps || corps.description === undefined || corps.obligatoire === undefined) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  const etapesExistantes = (await ctx.procedureRepo.listerEtapes(clientId)).filter(
    (e) => e.procedureId === procedureId,
  )
  const ordre = etapesExistantes.reduce((max, e) => Math.max(max, e.ordre), 0) + 1
  const etape: ProcedureStepEnregistree = {
    id: genererId(),
    clientId,
    procedureId,
    ordre,
    description: corps.description,
    obligatoire: corps.obligatoire,
    condition: corps.condition ?? null,
    responsable: corps.responsable ?? null,
    createdAt: horodatage(),
  }
  await ctx.procedureRepo.creerEtape(etape)
  return reponseJson({ etape }, 201, entetes)
}

interface SaisieMigrationProcedures {
  procedures?: ProcedureEnregistree[]
  procedureSteps?: ProcedureStepEnregistree[]
}

async function gererMigrerProceduresLocal(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur
  const corps = await lireCorpsJson<SaisieMigrationProcedures>(request)
  if (!corps || !Array.isArray(corps.procedures) || !Array.isArray(corps.procedureSteps)) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  for (const p of corps.procedures) {
    if (p.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.procedureRepo.creerProcedure(p)
  }
  for (const e of corps.procedureSteps) {
    if (e.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.procedureRepo.creerEtape(e)
  }
  return reponseJson(
    { procedures: corps.procedures, procedureSteps: corps.procedureSteps },
    200,
    entetes,
  )
}

// --- Handlers : GabaritExportClient (gabarits d'export .docx
// personnalisés client, §4.3bis, Phase 9b du chantier de migration D1) —
// le contenu binaire du fichier vit dans R2 (`stockageBinaireRepo`),
// jamais en D1 (voir migration 0025), même répartition que
// `ProjectDocument`. La vérification des balises obligatoires
// (`verifierGabaritExportClient`) reste côté client (bibliothèque
// `docxtemplater`/`pizzip`, non portée dans le Worker) — le serveur fait
// confiance à `tagsTrouves` fourni par l'appelant, déjà vérifié avant
// l'appel.

function cleContenuGabaritExportClient(id: string): string {
  return `gabarits-export-client/${id}/contenu`
}

interface GabaritExportClientJson {
  id: string
  clientId: string
  nom: string
  tagsTrouves: string[]
  createdAt: string
}

function assemblerGabaritExportClient(g: GabaritExportClientEnregistre): GabaritExportClientJson {
  return {
    id: g.id,
    clientId: g.clientId,
    nom: g.nom,
    tagsTrouves: g.tagsTrouves,
    createdAt: g.createdAt,
  }
}

async function gererListerGabaritsExportClient(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  const gabarits = await ctx.gabaritExportClientRepo.listerParClient(clientId)
  return reponseJson({ gabarits: gabarits.map(assemblerGabaritExportClient) }, 200, entetes)
}

interface CorpsCreationGabaritExportClient {
  /** Réservé à la migration locale (`gererMigrerGabaritExportClientLocal`) — ignoré par `gererCreerGabaritExportClient` (création normale). */
  id?: string
  nom?: string
  tagsTrouves?: string[]
}

/** Lit et valide le `FormData` commun à la création et à la migration locale — même patron que `lireFormDataDocumentProjet`. */
async function lireFormDataGabaritExportClient(
  request: Request,
): Promise<
  { ok: true; corps: CorpsCreationGabaritExportClient; fichierBlob: Blob } | { ok: false }
> {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return { ok: false }
  }

  const metadataBrut = formData.get('metadata')
  if (typeof metadataBrut !== 'string') return { ok: false }
  let corps: CorpsCreationGabaritExportClient
  try {
    corps = JSON.parse(metadataBrut) as CorpsCreationGabaritExportClient
  } catch {
    return { ok: false }
  }

  const fichierValeur = formData.get('fichier')
  // Même vérification structurelle (jamais `instanceof Blob`) et même
  // exigence `size > 0` que `gererCreerDocumentProjet` — voir sa
  // docstring pour le bug réel qu'elle évite.
  if (
    fichierValeur === null ||
    typeof fichierValeur !== 'object' ||
    typeof (fichierValeur as Blob).arrayBuffer !== 'function' ||
    (fichierValeur as Blob).size === 0
  ) {
    return { ok: false }
  }

  return { ok: true, corps, fichierBlob: fichierValeur as Blob }
}

async function gererCreerGabaritExportClient(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const lecture = await lireFormDataGabaritExportClient(request)
  if (!lecture.ok) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  const { corps, fichierBlob } = lecture
  if (!corps.nom || corps.nom.trim().length === 0) {
    return reponseJson({ erreur: 'nom_obligatoire' }, 400, entetes)
  }

  const id = genererId()
  await ctx.stockageBinaireRepo.enregistrer(
    cleContenuGabaritExportClient(id),
    await fichierBlob.arrayBuffer(),
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  )
  const gabarit: GabaritExportClientEnregistre = {
    id,
    clientId,
    nom: corps.nom.trim(),
    tagsTrouves: corps.tagsTrouves ?? [],
    createdAt: horodatage(),
  }
  await ctx.gabaritExportClientRepo.creer(gabarit)
  await consignerAudit(
    ctx,
    acteur,
    'import_gabarit_export_client',
    'gabarit_export_client',
    id,
    null,
  )

  return reponseJson({ gabarit: assemblerGabaritExportClient(gabarit) }, 201, entetes)
}

/**
 * Migration ponctuelle (filet de sécurité `gabaritsExportClientAMigrer`,
 * `useGabaritExportStore.migrerGabaritsLocauxVersServeur`) — même patron
 * d'idempotence que `gererMigrerDocumentProjetLocal` (l'existant côté
 * serveur gagne toujours, jamais un écrasement), un seul gabarit par
 * appel (le fichier `.docx` est un `Blob`, non sérialisable dans un lot
 * JSON). L'id est imposé par l'appelant, jamais fabriqué ici.
 */
async function gererMigrerGabaritExportClientLocal(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const lecture = await lireFormDataGabaritExportClient(request)
  if (!lecture.ok) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  const { corps, fichierBlob } = lecture
  const id = corps.id
  if (!id || !corps.nom) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)

  const existant = await ctx.gabaritExportClientRepo.parId(id)
  if (existant) {
    return reponseJson({ gabarit: assemblerGabaritExportClient(existant) }, 201, entetes)
  }

  await ctx.stockageBinaireRepo.enregistrer(
    cleContenuGabaritExportClient(id),
    await fichierBlob.arrayBuffer(),
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  )
  const gabarit: GabaritExportClientEnregistre = {
    id,
    clientId,
    nom: corps.nom.trim(),
    tagsTrouves: corps.tagsTrouves ?? [],
    createdAt: horodatage(),
  }
  await ctx.gabaritExportClientRepo.creer(gabarit)
  return reponseJson({ gabarit: assemblerGabaritExportClient(gabarit) }, 201, entetes)
}

async function gererObtenirContenuGabaritExportClient(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  id: string,
): Promise<Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)

  const gabarit = await ctx.gabaritExportClientRepo.parId(id)
  if (!gabarit) return reponseJson({ erreur: 'introuvable' }, 404, entetes)
  const contenu = await ctx.stockageBinaireRepo.lire(cleContenuGabaritExportClient(id))
  if (!contenu) return reponseJson({ erreur: 'introuvable' }, 404, entetes)

  return new Response(contenu.contenu, {
    status: 200,
    headers: {
      ...entetes,
      'Content-Type': contenu.typeContenu,
      'Content-Disposition': `attachment; filename="${gabarit.nom.replace(/"/g, '')}.docx"`,
    },
  })
}

async function gererSupprimerGabaritExportClient(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  id: string,
): Promise<Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)

  await ctx.stockageBinaireRepo.supprimer(cleContenuGabaritExportClient(id))
  await ctx.gabaritExportClientRepo.supprimer(id)
  await consignerAudit(
    ctx,
    utilisateur,
    'suppression_gabarit_export_client',
    'gabarit_export_client',
    id,
    null,
  )
  return reponseJson({ ok: true }, 200, entetes)
}

// --- Handlers : AiChatSessionLog (journal des sessions du panneau Chat,
// §4.4, Phase 9c du chantier de migration D1) — entièrement immuable une
// fois créé (INSERT-only), jamais de mise à jour ni de suppression.

interface AiChatSessionLogJson {
  id: string
  clientId: string
  startedAt: string
  endedAt: string | null
  mode: string
  aiProvider: string
  moteurVersion: string | null
  documentJoint: boolean
}

function assemblerAiChatSessionLog(e: AiChatSessionLogEnregistre): AiChatSessionLogJson {
  return {
    id: e.id,
    clientId: e.clientId,
    startedAt: e.startedAt,
    endedAt: e.endedAt,
    mode: e.mode,
    aiProvider: e.aiProvider,
    moteurVersion: e.moteurVersion,
    documentJoint: e.documentJoint,
  }
}

async function gererListerAiChatSessionLogs(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  const entrees = await ctx.aiChatSessionLogRepo.listerParClient(clientId)
  return reponseJson({ aiChatSessionLogs: entrees.map(assemblerAiChatSessionLog) }, 200, entetes)
}

interface SaisieCreationAiChatSessionLog {
  startedAt?: string
  endedAt?: string | null
  mode?: string
  aiProvider?: string
  moteurVersion?: string | null
  documentJoint?: boolean
}

async function gererCreerAiChatSessionLog(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur
  const corps = await lireCorpsJson<SaisieCreationAiChatSessionLog>(request)
  if (!corps?.startedAt || !corps.mode || !corps.aiProvider || corps.documentJoint === undefined) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  const entree: AiChatSessionLogEnregistre = {
    id: genererId(),
    clientId,
    startedAt: corps.startedAt,
    endedAt: corps.endedAt ?? null,
    mode: corps.mode,
    aiProvider: corps.aiProvider,
    moteurVersion: corps.moteurVersion ?? null,
    documentJoint: corps.documentJoint,
  }
  await ctx.aiChatSessionLogRepo.creer(entree)
  return reponseJson({ aiChatSessionLog: assemblerAiChatSessionLog(entree) }, 201, entetes)
}

interface SaisieMigrationAiChatSessionLogs {
  aiChatSessionLogs?: AiChatSessionLogJson[]
}

/** Réservé au filet de sécurité de migration locale — voir la documentation de la route Worker `gererMigrerProceduresLocal` (même patron d'idempotence : l'existant côté serveur gagne toujours, jamais un écrasement). */
async function gererMigrerAiChatSessionLogsLocal(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur
  const corps = await lireCorpsJson<SaisieMigrationAiChatSessionLogs>(request)
  if (!corps || !Array.isArray(corps.aiChatSessionLogs)) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  for (const e of corps.aiChatSessionLogs) {
    if (e.clientId !== clientId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    await ctx.aiChatSessionLogRepo.creer({
      id: e.id,
      clientId: e.clientId,
      startedAt: e.startedAt,
      endedAt: e.endedAt,
      mode: e.mode,
      aiProvider: e.aiProvider,
      moteurVersion: e.moteurVersion,
      documentJoint: e.documentJoint,
    })
  }
  return reponseJson({ aiChatSessionLogs: corps.aiChatSessionLogs }, 200, entetes)
}

// --- Handlers : ConnexionDrive / EtatMiroirDrive (miroir Drive par
// client, Phase 9d du chantier de migration D1) — un enregistrement
// mutable par client (jamais un historique) : `enregistrer` est toujours
// un upsert complet, même discipline que
// `gererEnregistrerParametreInstallation` mais scopée par client plutôt
// que par une clé globale à l'installation.

interface ConnexionDriveJson {
  clientId: string
  dossierId: string
  jeton: string
}

function assemblerConnexionDrive(c: ConnexionDriveEnregistree): ConnexionDriveJson {
  return { clientId: c.clientId, dossierId: c.dossierId, jeton: c.jeton }
}

async function gererObtenirConnexionDrive(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  const connexion = await ctx.connexionDriveRepo.obtenirParClient(clientId)
  return reponseJson(
    { connexionDrive: connexion ? assemblerConnexionDrive(connexion) : null },
    200,
    entetes,
  )
}

interface SaisieConnexionDrive {
  dossierId?: string
  jeton?: string
}

async function gererEnregistrerConnexionDrive(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur
  const corps = await lireCorpsJson<SaisieConnexionDrive>(request)
  if (!corps?.dossierId || !corps.jeton) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  const connexion: ConnexionDriveEnregistree = {
    clientId,
    dossierId: corps.dossierId,
    jeton: corps.jeton,
  }
  await ctx.connexionDriveRepo.enregistrer(connexion)
  return reponseJson({ connexionDrive: assemblerConnexionDrive(connexion) }, 200, entetes)
}

async function gererEffacerConnexionDrive(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur
  await ctx.connexionDriveRepo.supprimer(clientId)
  return reponseJson({ ok: true }, 200, entetes)
}

interface EtatMiroirDriveJson {
  clientId: string
  dernierMiroirReussi: string | null
}

function assemblerEtatMiroirDrive(e: EtatMiroirDriveEnregistre): EtatMiroirDriveJson {
  return { clientId: e.clientId, dernierMiroirReussi: e.dernierMiroirReussi }
}

async function gererObtenirEtatMiroirDrive(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  const etat = await ctx.etatMiroirDriveRepo.obtenirParClient(clientId)
  return reponseJson(
    { etatMiroirDrive: etat ? assemblerEtatMiroirDrive(etat) : null },
    200,
    entetes,
  )
}

interface SaisieEtatMiroirDrive {
  dernierMiroirReussi?: string
}

async function gererEnregistrerEtatMiroirDrive(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur
  const corps = await lireCorpsJson<SaisieEtatMiroirDrive>(request)
  if (typeof corps?.dernierMiroirReussi !== 'string') {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  const etat: EtatMiroirDriveEnregistre = {
    clientId,
    dernierMiroirReussi: corps.dernierMiroirReussi,
  }
  await ctx.etatMiroirDriveRepo.enregistrer(etat)
  return reponseJson({ etatMiroirDrive: assemblerEtatMiroirDrive(etat) }, 200, entetes)
}

// --- Handlers : Organization/Workspace (Phase 2 du chantier de migration D1) ---

async function gererObtenirOrganisation(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const [organization, workspaces] = await Promise.all([
    ctx.organisationRepo.obtenirOrganization(clientId),
    ctx.organisationRepo.listerWorkspaces(clientId),
  ])
  return reponseJson({ organization, workspaces }, 200, entetes)
}

/**
 * Idempotente — même discipline que l'ancienne implémentation Dexie
 * (`useOrganizationStore.migrerClient`) : si l'`Organization` existe déjà
 * pour ce client, la renvoie telle quelle avec son `Workspace` racine déjà
 * créé, jamais une seconde création. `Organization.id` reprend
 * exactement `clientId` (jamais un id généré) — décision structurante qui
 * évite de toucher aux ~25 tables indexées par `client_id`.
 */
async function gererMigrerClientVersOrganisation(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const existante = await ctx.organisationRepo.obtenirOrganization(clientId)
  if (existante) {
    const workspaces = await ctx.organisationRepo.listerWorkspaces(clientId)
    const workspaceRacine = workspaces.find((w) => w.parentWorkspaceId === null)
    if (!workspaceRacine) {
      // Incohérence de données jamais censée survenir (toute Organization
      // créée par cette même route a systématiquement son Workspace
      // racine) — jamais fabriquer un Workspace de remplacement ici.
      return reponseJson({ erreur: 'workspace_racine_introuvable' }, 500, entetes)
    }
    return reponseJson({ organization: existante, workspaceRacine }, 200, entetes)
  }

  const client = await ctx.clientsRepo.parId(clientId)
  if (!client) return reponseJson({ erreur: 'introuvable' }, 404, entetes)

  const maintenant = horodatage()
  const organization: OrganizationEnregistree = {
    id: clientId,
    nom: client.name,
    createdAt: maintenant,
  }
  const workspaceRacine: WorkspaceEnregistre = {
    id: genererId(),
    organizationId: clientId,
    type: 'global',
    nom: `${client.name} — Global`,
    parentWorkspaceId: null,
    createdAt: maintenant,
  }
  await ctx.organisationRepo.creerOrganization(organization)
  await ctx.organisationRepo.creerWorkspace(workspaceRacine)
  return reponseJson({ organization, workspaceRacine }, 201, entetes)
}

async function gererCreerWorkspace(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur
  void acteur

  const corps = await lireCorpsJson<{ nom?: string; parentWorkspaceId?: string }>(request)
  if (!corps?.nom || !corps.parentWorkspaceId) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  const organization = await ctx.organisationRepo.obtenirOrganization(clientId)
  if (!organization) return reponseJson({ erreur: 'organization_introuvable' }, 400, entetes)

  const parent = await ctx.organisationRepo.workspaceParId(corps.parentWorkspaceId)
  if (!parent || parent.organizationId !== clientId) {
    return reponseJson({ erreur: 'parent_introuvable' }, 400, entetes)
  }

  const site: WorkspaceEnregistre = {
    id: genererId(),
    organizationId: clientId,
    type: 'site',
    nom: corps.nom,
    parentWorkspaceId: corps.parentWorkspaceId,
    createdAt: horodatage(),
  }
  await ctx.organisationRepo.creerWorkspace(site)
  return reponseJson({ workspace: site }, 201, entetes)
}

// --- Handlers : Projects (Phase 3a du chantier de migration D1) ---
//
// Modèle de visibilité repris tel quel de l'ancienne implémentation Dexie
// (`peutVoirProjet`/`peutModifierProjet`, `src/logique-metier/permissions/
// permissionsProjet.ts`) : `owner_id`/`shared_with[].userId` stockent
// l'email du compte (jamais l'id interne), un admin voit/modifie tout.
// Contrairement à l'ancien commentaire « jamais une frontière de sécurité
// réelle » (vrai tant que le dépôt Git sous-jacent n'était pas lui-même
// partitionné), D1 devenant la seule source de vérité ces contrôles sont
// ici une vraie frontière — même durcissement que `peutModifierClient` en
// Phase 39.

function peutVoirProjetServeur(
  projet: ProjectEnregistre,
  utilisateur: UtilisateurEnregistre,
): boolean {
  if (utilisateur.role === 'admin') return true
  if (projet.ownerId === utilisateur.email) return true
  return projet.sharedWith.some((p) => p.userId === utilisateur.email)
}

function peutModifierProjetServeur(
  projet: ProjectEnregistre,
  utilisateur: UtilisateurEnregistre,
): boolean {
  if (utilisateur.role === 'admin') return true
  if (projet.ownerId === utilisateur.email) return true
  return projet.sharedWith.some(
    (p) => p.userId === utilisateur.email && p.accessLevel === 'édition',
  )
}

async function gererListerProjets(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
): Promise<Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)

  const projects = await ctx.projectsRepo.listerVisiblesPar(utilisateur)
  return reponseJson({ projects }, 200, entetes)
}

async function gererListerProjetsClient(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  clientId: string,
): Promise<Response> {
  const acteur = await exigerAccesClient(request, ctx, entetes, clientId)
  if (acteur instanceof Response) return acteur

  const projects = await ctx.projectsRepo.listerParClient(clientId)
  return reponseJson({ projects }, 200, entetes)
}

async function gererObtenirProjet(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  id: string,
): Promise<Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)

  const projet = await ctx.projectsRepo.obtenirProjet(id)
  if (!projet || !peutVoirProjetServeur(projet, utilisateur)) {
    // 404 générique — même discipline que `gererObtenirClient` : jamais
    // distinguer "introuvable" de "non autorisé".
    return reponseJson({ erreur: 'introuvable' }, 404, entetes)
  }
  return reponseJson({ projet }, 200, entetes)
}

/**
 * Restauration/fusion en écrasement — utilisée par `useSynchronisationStore`
 * (`recupererDepuisGitHub`, qui écrase délibérément le cache local par
 * l'état distant ; `confirmerResolutionConflits`, qui envoie l'état déjà
 * fusionné côté client) : accepte un enregistrement déjà complet tel quel
 * (id, `owner_id`/`shared_with`/`audit_log`/horodatages inclus, jamais
 * fabriqués ici) et REMPLACE l'existant s'il y en a un, sans jamais
 * fusionner lui-même — contrairement à `gererMigrerProjetsLocaux` (qui
 * préserve l'existant), cette route privilégie toujours la version fournie
 * par l'appelant, cohérent avec le comportement `db.projects.put(...)`
 * d'avant cette migration (« écrasement délibéré, pas de fusion »).
 */
async function gererRestaurerProjet(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  id: string,
): Promise<Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)

  const corps = await lireCorpsJson<ProjectEnregistre>(request)
  if (!corps?.name) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)

  const projetAEcrire: ProjectEnregistre = { ...corps, id }
  const existant = await ctx.projectsRepo.obtenirProjet(id)
  if (existant) {
    await ctx.projectsRepo.remplacerProjet(projetAEcrire)
  } else {
    await ctx.projectsRepo.creerProjet(projetAEcrire)
  }
  return reponseJson({ projet: projetAEcrire }, 200, entetes)
}

async function gererCreerProjet(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
): Promise<Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)

  const corps = await lireCorpsJson<{
    name?: string
    context?: string
    scopeIn?: string
    scopeOut?: string
    deadline?: string | null
    languageDefault?: string
    clientId?: string | null
  }>(request)
  if (!corps?.name || corps.name.trim().length === 0) {
    return reponseJson({ erreur: 'nom_obligatoire' }, 400, entetes)
  }

  const maintenant = horodatage()
  const projet: ProjectEnregistre = {
    id: genererId(),
    name: corps.name.trim(),
    context: corps.context ?? '',
    scopeIn: corps.scopeIn ?? '',
    scopeOut: corps.scopeOut ?? '',
    deadline: corps.deadline ?? null,
    languageDefault: corps.languageDefault ?? 'fr',
    clientId: corps.clientId ?? null,
    sections: [],
    documents: [],
    links: [],
    statut: 'actif',
    phase: 'concept',
    ownerId: utilisateur.email,
    sharedWith: [],
    archivedAt: null,
    archivedBy: null,
    auditLog: [{ timestamp: maintenant, actor: utilisateur.email, action: 'création' }],
    createdAt: maintenant,
    updatedAt: maintenant,
  }
  await ctx.projectsRepo.creerProjet(projet)
  return reponseJson({ projet }, 201, entetes)
}

/**
 * Migration ponctuelle (filet de sécurité `projectsAMigrer`,
 * `useProjectsStore.migrerProjetsLocauxVersServeur`) — seule route qui
 * accepte un projet déjà complet tel quel (id, `owner_id`/`shared_with`,
 * `audit_log`, horodatages d'origine inclus) : contrairement à
 * `gererCreerProjet`, ces données ne sont jamais fabriquées ici mais
 * proviennent d'un enregistrement réel déjà existant côté navigateur
 * (ALCOA+ : une migration de stockage ne doit jamais faire perdre
 * l'historique ni changer l'id référencé par `sections`/
 * `projectDocuments`, encore en IndexedDB local le temps des phases 3b/3c).
 * Idempotente : un projet dont l'id existe déjà côté serveur est ignoré
 * silencieusement (jamais un doublon ni une erreur), pour rester
 * rejouable sans effet après un succès partiel.
 */
async function gererMigrerProjetsLocaux(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
): Promise<Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)

  const corps = await lireCorpsJson<{ projects?: ProjectEnregistre[] }>(request)
  if (!corps || !Array.isArray(corps.projects)) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  const projects: ProjectEnregistre[] = []
  for (const p of corps.projects) {
    if (!p.id || !p.name) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    const existant = await ctx.projectsRepo.obtenirProjet(p.id)
    if (existant) {
      projects.push(existant)
      continue
    }
    await ctx.projectsRepo.creerProjet(p)
    projects.push(p)
  }

  return reponseJson({ projects }, 201, entetes)
}

/** Authentifie puis charge le projet demandé, vérifiant la visibilité — retourne soit `{utilisateur, projet}`, soit la Response d'erreur à renvoyer telle quelle. */
async function chargerProjetVisible(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  id: string,
): Promise<{ utilisateur: UtilisateurEnregistre; projet: ProjectEnregistre } | Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)

  const projet = await ctx.projectsRepo.obtenirProjet(id)
  if (!projet || !peutVoirProjetServeur(projet, utilisateur)) {
    return reponseJson({ erreur: 'introuvable' }, 404, entetes)
  }
  return { utilisateur, projet }
}

async function gererChangerPhaseProjet(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  id: string,
): Promise<Response> {
  const charge = await chargerProjetVisible(request, ctx, entetes, id)
  if (charge instanceof Response) return charge
  const { utilisateur, projet } = charge
  if (!peutModifierProjetServeur(projet, utilisateur)) {
    return reponseJson({ erreur: 'non_autorise' }, 403, entetes)
  }

  const corps = await lireCorpsJson<{ phase?: PhaseProjetEnregistree }>(request)
  const phasesValides: readonly PhaseProjetEnregistree[] = [
    'concept',
    'realisation',
    'operation',
    'retrait',
  ]
  if (!corps?.phase || !phasesValides.includes(corps.phase)) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  const maintenant = horodatage()
  const projetMisAJour: ProjectEnregistre = {
    ...projet,
    phase: corps.phase,
    updatedAt: maintenant,
    auditLog: [
      ...projet.auditLog,
      {
        timestamp: maintenant,
        actor: utilisateur.email,
        action: `changement_phase (${corps.phase})`,
      },
    ],
  }
  await ctx.projectsRepo.remplacerProjet(projetMisAJour)
  return reponseJson({ projet: projetMisAJour }, 200, entetes)
}

async function gererArchiverProjet(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  id: string,
): Promise<Response> {
  const charge = await chargerProjetVisible(request, ctx, entetes, id)
  if (charge instanceof Response) return charge
  const { utilisateur, projet } = charge
  if (!peutModifierProjetServeur(projet, utilisateur)) {
    return reponseJson({ erreur: 'non_autorise' }, 403, entetes)
  }
  if (projet.statut === 'archive') return reponseJson({ erreur: 'deja_archive' }, 409, entetes)

  const maintenant = horodatage()
  const projetMisAJour: ProjectEnregistre = {
    ...projet,
    statut: 'archive',
    archivedAt: maintenant,
    archivedBy: utilisateur.email,
    updatedAt: maintenant,
    auditLog: [
      ...projet.auditLog,
      { timestamp: maintenant, actor: utilisateur.email, action: 'archivage' },
    ],
  }
  await ctx.projectsRepo.remplacerProjet(projetMisAJour)
  return reponseJson({ projet: projetMisAJour }, 200, entetes)
}

async function gererDesarchiverProjet(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  id: string,
): Promise<Response> {
  const charge = await chargerProjetVisible(request, ctx, entetes, id)
  if (charge instanceof Response) return charge
  const { utilisateur, projet } = charge
  if (!peutModifierProjetServeur(projet, utilisateur)) {
    return reponseJson({ erreur: 'non_autorise' }, 403, entetes)
  }
  if (projet.statut !== 'archive') return reponseJson({ erreur: 'deja_actif' }, 409, entetes)

  const maintenant = horodatage()
  const projetMisAJour: ProjectEnregistre = {
    ...projet,
    statut: 'actif',
    archivedAt: null,
    archivedBy: null,
    updatedAt: maintenant,
    auditLog: [
      ...projet.auditLog,
      { timestamp: maintenant, actor: utilisateur.email, action: 'désarchivage' },
    ],
  }
  await ctx.projectsRepo.remplacerProjet(projetMisAJour)
  return reponseJson({ projet: projetMisAJour }, 200, entetes)
}

async function gererSuspendreProjet(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  id: string,
): Promise<Response> {
  const charge = await chargerProjetVisible(request, ctx, entetes, id)
  if (charge instanceof Response) return charge
  const { utilisateur, projet } = charge
  if (!peutModifierProjetServeur(projet, utilisateur)) {
    return reponseJson({ erreur: 'non_autorise' }, 403, entetes)
  }
  if (projet.statut === 'suspendu') return reponseJson({ erreur: 'deja_suspendu' }, 409, entetes)

  const maintenant = horodatage()
  const projetMisAJour: ProjectEnregistre = {
    ...projet,
    statut: 'suspendu',
    updatedAt: maintenant,
    auditLog: [
      ...projet.auditLog,
      { timestamp: maintenant, actor: utilisateur.email, action: 'suspension' },
    ],
  }
  await ctx.projectsRepo.remplacerProjet(projetMisAJour)
  return reponseJson({ projet: projetMisAJour }, 200, entetes)
}

async function gererReprendreProjet(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  id: string,
): Promise<Response> {
  const charge = await chargerProjetVisible(request, ctx, entetes, id)
  if (charge instanceof Response) return charge
  const { utilisateur, projet } = charge
  if (!peutModifierProjetServeur(projet, utilisateur)) {
    return reponseJson({ erreur: 'non_autorise' }, 403, entetes)
  }
  if (projet.statut !== 'suspendu') return reponseJson({ erreur: 'pas_suspendu' }, 409, entetes)

  const maintenant = horodatage()
  const projetMisAJour: ProjectEnregistre = {
    ...projet,
    statut: 'actif',
    updatedAt: maintenant,
    auditLog: [
      ...projet.auditLog,
      { timestamp: maintenant, actor: utilisateur.email, action: 'reprise' },
    ],
  }
  await ctx.projectsRepo.remplacerProjet(projetMisAJour)
  return reponseJson({ projet: projetMisAJour }, 200, entetes)
}

async function gererSupprimerProjet(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  id: string,
): Promise<Response> {
  const charge = await chargerProjetVisible(request, ctx, entetes, id)
  if (charge instanceof Response) return charge
  const { utilisateur, projet } = charge
  if (!peutModifierProjetServeur(projet, utilisateur)) {
    return reponseJson({ erreur: 'non_autorise' }, 403, entetes)
  }
  if (projet.statut === 'supprime') return reponseJson({ erreur: 'deja_supprime' }, 409, entetes)
  if (projet.statut !== 'archive') return reponseJson({ erreur: 'pas_archive' }, 409, entetes)

  const maintenant = horodatage()
  const projetMisAJour: ProjectEnregistre = {
    ...projet,
    statut: 'supprime',
    updatedAt: maintenant,
    auditLog: [
      ...projet.auditLog,
      { timestamp: maintenant, actor: utilisateur.email, action: 'suppression' },
    ],
  }
  await ctx.projectsRepo.remplacerProjet(projetMisAJour)
  return reponseJson({ projet: projetMisAJour }, 200, entetes)
}

async function gererPartagerProjet(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  id: string,
): Promise<Response> {
  const charge = await chargerProjetVisible(request, ctx, entetes, id)
  if (charge instanceof Response) return charge
  const { utilisateur, projet } = charge
  if (!peutModifierProjetServeur(projet, utilisateur)) {
    return reponseJson({ erreur: 'non_autorise' }, 403, entetes)
  }

  const corps = await lireCorpsJson<{
    userId?: string
    accessLevel?: PartageProjetEnregistre['accessLevel']
  }>(request)
  if (!corps?.userId || (corps.accessLevel !== 'lecture' && corps.accessLevel !== 'édition')) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  const maintenant = horodatage()
  const autres = projet.sharedWith.filter((p) => p.userId !== corps.userId)
  const projetMisAJour: ProjectEnregistre = {
    ...projet,
    sharedWith: [...autres, { userId: corps.userId, accessLevel: corps.accessLevel }],
    updatedAt: maintenant,
    auditLog: [
      ...projet.auditLog,
      {
        timestamp: maintenant,
        actor: utilisateur.email,
        action: `partage_ajoute (${corps.userId})`,
      },
    ],
  }
  await ctx.projectsRepo.remplacerProjet(projetMisAJour)
  return reponseJson({ projet: projetMisAJour }, 200, entetes)
}

async function gererRetirerPartageProjet(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  id: string,
  userId: string,
): Promise<Response> {
  const charge = await chargerProjetVisible(request, ctx, entetes, id)
  if (charge instanceof Response) return charge
  const { utilisateur, projet } = charge
  if (!peutModifierProjetServeur(projet, utilisateur)) {
    return reponseJson({ erreur: 'non_autorise' }, 403, entetes)
  }

  const maintenant = horodatage()
  const projetMisAJour: ProjectEnregistre = {
    ...projet,
    sharedWith: projet.sharedWith.filter((p) => p.userId !== userId),
    updatedAt: maintenant,
    auditLog: [
      ...projet.auditLog,
      { timestamp: maintenant, actor: utilisateur.email, action: `partage_retire (${userId})` },
    ],
  }
  await ctx.projectsRepo.remplacerProjet(projetMisAJour)
  return reponseJson({ projet: projetMisAJour }, 200, entetes)
}

/**
 * Référence un `ProjectDocument` (encore stocké en IndexedDB local, Phase
 * 3c à venir) dans `Project.documents[]` — seul le lien id est concerné
 * ici, jamais le contenu du document lui-même. `retirerDocumentProjet`
 * n'existe pas : `supprimerDocument`
 * (`useProjectDocumentsStore`) n'a jamais nettoyé cette liste non plus
 * avant cette migration, comportement préservé tel quel.
 */
async function gererAjouterDocumentProjet(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  id: string,
): Promise<Response> {
  const charge = await chargerProjetVisible(request, ctx, entetes, id)
  if (charge instanceof Response) return charge
  const { utilisateur, projet } = charge
  if (!peutModifierProjetServeur(projet, utilisateur)) {
    return reponseJson({ erreur: 'non_autorise' }, 403, entetes)
  }

  const corps = await lireCorpsJson<{ documentId?: string }>(request)
  if (!corps?.documentId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)

  const maintenant = horodatage()
  const projetMisAJour: ProjectEnregistre = {
    ...projet,
    documents: [...projet.documents, corps.documentId],
    updatedAt: maintenant,
    auditLog: [
      ...projet.auditLog,
      { timestamp: maintenant, actor: utilisateur.email, action: 'ajout_document' },
    ],
  }
  await ctx.projectsRepo.remplacerProjet(projetMisAJour)
  return reponseJson({ projet: projetMisAJour }, 200, entetes)
}

/**
 * Référence une `Section` (encore stockée en IndexedDB local, Phase 3b à
 * venir) dans `Project.sections[]` — seul le lien id est concerné ici,
 * jamais le contenu de la section elle-même.
 */
async function gererAjouterSectionProjet(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  id: string,
): Promise<Response> {
  const charge = await chargerProjetVisible(request, ctx, entetes, id)
  if (charge instanceof Response) return charge
  const { utilisateur, projet } = charge
  if (!peutModifierProjetServeur(projet, utilisateur)) {
    return reponseJson({ erreur: 'non_autorise' }, 403, entetes)
  }

  const corps = await lireCorpsJson<{ sectionId?: string }>(request)
  if (!corps?.sectionId) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)

  const maintenant = horodatage()
  const projetMisAJour: ProjectEnregistre = {
    ...projet,
    sections: [...projet.sections, corps.sectionId],
    updatedAt: maintenant,
    auditLog: [
      ...projet.auditLog,
      { timestamp: maintenant, actor: utilisateur.email, action: 'ajout_section' },
    ],
  }
  await ctx.projectsRepo.remplacerProjet(projetMisAJour)
  return reponseJson({ projet: projetMisAJour }, 200, entetes)
}

function memeLienProjet(
  a: Pick<LienProjetEnregistre, 'fromSectionId' | 'toSectionId'>,
  fromSectionId: string,
  toSectionId: string,
): boolean {
  return (
    (a.fromSectionId === fromSectionId && a.toSectionId === toSectionId) ||
    (a.fromSectionId === toSectionId && a.toSectionId === fromSectionId)
  )
}

async function gererAjouterLienProjet(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  id: string,
): Promise<Response> {
  const charge = await chargerProjetVisible(request, ctx, entetes, id)
  if (charge instanceof Response) return charge
  const { utilisateur, projet } = charge
  if (!peutModifierProjetServeur(projet, utilisateur)) {
    return reponseJson({ erreur: 'non_autorise' }, 403, entetes)
  }

  const corps = await lireCorpsJson<{ fromSectionId?: string; toSectionId?: string }>(request)
  if (!corps?.fromSectionId || !corps.toSectionId) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  if (
    projet.links.some((l) =>
      memeLienProjet(l, corps.fromSectionId as string, corps.toSectionId as string),
    )
  ) {
    return reponseJson({ projet }, 200, entetes)
  }

  const maintenant = horodatage()
  const lien: LienProjetEnregistre = {
    fromSectionId: corps.fromSectionId,
    toSectionId: corps.toSectionId,
    createdBy: utilisateur.email,
    createdAt: maintenant,
  }
  const projetMisAJour: ProjectEnregistre = {
    ...projet,
    links: [...projet.links, lien],
    updatedAt: maintenant,
    auditLog: [
      ...projet.auditLog,
      { timestamp: maintenant, actor: utilisateur.email, action: 'lien_ajoute' },
    ],
  }
  await ctx.projectsRepo.remplacerProjet(projetMisAJour)
  return reponseJson({ projet: projetMisAJour }, 200, entetes)
}

async function gererRetirerLienProjet(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  id: string,
): Promise<Response> {
  const charge = await chargerProjetVisible(request, ctx, entetes, id)
  if (charge instanceof Response) return charge
  const { utilisateur, projet } = charge
  if (!peutModifierProjetServeur(projet, utilisateur)) {
    return reponseJson({ erreur: 'non_autorise' }, 403, entetes)
  }

  const corps = await lireCorpsJson<{ fromSectionId?: string; toSectionId?: string }>(request)
  if (!corps?.fromSectionId || !corps.toSectionId) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  const maintenant = horodatage()
  const projetMisAJour: ProjectEnregistre = {
    ...projet,
    links: projet.links.filter(
      (l) => !memeLienProjet(l, corps.fromSectionId as string, corps.toSectionId as string),
    ),
    updatedAt: maintenant,
    auditLog: [
      ...projet.auditLog,
      { timestamp: maintenant, actor: utilisateur.email, action: 'lien_retire' },
    ],
  }
  await ctx.projectsRepo.remplacerProjet(projetMisAJour)
  return reponseJson({ projet: projetMisAJour }, 200, entetes)
}

// --- Handlers : Sections (Phase 3b du chantier de migration D1) ---
//
// Contrairement à Project (Phase 3a), aucune vérification de visibilité
// par projet ici : `Section.owner_id`/`shared_with` ne sont, comme avant
// cette migration, jamais câblés comme une frontière de sécurité réelle
// (voir `permissionsProjet.ts`) — même régime d'accès que l'ancienne
// table Dexie unique (authentification seule), pas une régression. Toute
// la logique métier (machine à états, garde-fous de finalisation) reste
// côté client, déjà testée — ces handlers ne font qu'authentifier et
// persister l'état déjà validé.

async function gererListerToutesLesSections(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
): Promise<Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)

  const sections = await ctx.sectionsRepo.listerToutes()
  return reponseJson({ sections }, 200, entetes)
}

async function gererListerSectionsProjet(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  projectId: string,
): Promise<Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)

  const sections = await ctx.sectionsRepo.listerParProjet(projectId)
  return reponseJson({ sections }, 200, entetes)
}

async function gererObtenirSection(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  id: string,
): Promise<Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)

  const section = await ctx.sectionsRepo.obtenirSection(id)
  if (!section) return reponseJson({ erreur: 'introuvable' }, 404, entetes)
  return reponseJson({ section }, 200, entetes)
}

async function gererCreerSection(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
): Promise<Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)

  const corps = await lireCorpsJson<SectionEnregistree>(request)
  if (!corps?.id || !corps.projectId || !corps.templateType) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  await ctx.sectionsRepo.creerSection(corps)
  return reponseJson({ section: corps }, 201, entetes)
}

async function gererRemplacerSection(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  id: string,
): Promise<Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)

  const existante = await ctx.sectionsRepo.obtenirSection(id)
  if (!existante) return reponseJson({ erreur: 'introuvable' }, 404, entetes)

  const corps = await lireCorpsJson<SectionEnregistree>(request)
  if (!corps?.templateType) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)

  const section: SectionEnregistree = { ...corps, id, projectId: existante.projectId }
  await ctx.sectionsRepo.remplacerSection(section)
  return reponseJson({ section }, 200, entetes)
}

/**
 * Migration ponctuelle (filet de sécurité `sectionsAMigrer`,
 * `useSectionsStore.migrerSectionsLocalesVersServeur`) — même patron que
 * `gererMigrerProjetsLocaux` : accepte une section déjà complète telle
 * quelle (id, `owner_id`/`shared_with`, `audit_log`, horodatages d'origine
 * inclus), jamais fabriquée ici. Idempotente : une section dont l'id
 * existe déjà côté serveur est ignorée silencieusement (jamais un doublon
 * ni un écrasement d'une donnée déjà migrée/modifiée côté serveur),
 * contrairement à `gererRestaurerSection` (qui écrase toujours) — ici
 * l'existant côté serveur gagne toujours, cohérent avec « une migration de
 * stockage ne doit jamais faire perdre l'historique ».
 */
async function gererMigrerSectionsLocales(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
): Promise<Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)

  const corps = await lireCorpsJson<{ sections?: SectionEnregistree[] }>(request)
  if (!corps || !Array.isArray(corps.sections)) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  const sections: SectionEnregistree[] = []
  for (const s of corps.sections) {
    if (!s.id || !s.projectId || !s.templateType) {
      return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
    }
    const existante = await ctx.sectionsRepo.obtenirSection(s.id)
    if (existante) {
      sections.push(existante)
      continue
    }
    await ctx.sectionsRepo.creerSection(s)
    sections.push(s)
  }

  return reponseJson({ sections }, 201, entetes)
}

/**
 * Filet de récupération après conflit GitHub (`recupererDepuisGitHub`) —
 * écrit l'enregistrement fourni tel quel (id fixé par l'URL), en création
 * ou en remplacement selon qu'il existe déjà, toujours en écrasant par la
 * version fournie par l'appelant plutôt qu'en la fusionnant, cohérent avec
 * le comportement `db.sections.put(...)` d'avant cette migration
 * (« écrasement délibéré, pas de fusion »). Même patron que
 * `gererRestaurerProjet`.
 */
async function gererRestaurerSection(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  id: string,
): Promise<Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)

  const corps = await lireCorpsJson<SectionEnregistree>(request)
  if (!corps?.projectId || !corps.templateType) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  const section: SectionEnregistree = { ...corps, id }
  const existante = await ctx.sectionsRepo.obtenirSection(id)
  if (existante) {
    await ctx.sectionsRepo.remplacerSection(section)
  } else {
    await ctx.sectionsRepo.creerSection(section)
  }
  return reponseJson({ section }, 200, entetes)
}

// --- Handlers : ProjectDocument (Phase 3c du chantier de migration D1) ---
//
// Même répartition D1 (métadonnées)/R2 (texte extrait + contenu binaire)
// que les documents normatifs, même absence de frontière de sécurité par
// projet que `sections` (authentification seule, voir en-tête des routes
// ci-dessus) — `ProjectDocument.content` n'était déjà synchronisé nulle
// part avant cette migration (portée de `useSynchronisationStore` limitée
// à projects/sections), donc aucune perte de fonctionnalité de partage à
// combler.

interface ProjectDocumentWire {
  id: string
  projectId: string
  filename: string
  status: string
  extractedText: string
  mimeType: string
  hasBinaryContent: boolean
  uploadedAt: string
  uploadedBy: string
}

/** Assemble la réponse complète (métadonnées D1 + texte extrait R2) — jamais le contenu binaire, récupéré séparément via `/contenu` pour ne pas alourdir la liste. */
async function assemblerDocumentProjet(
  ctx: Contexte,
  d: ProjectDocumentEnregistre,
): Promise<ProjectDocumentWire> {
  const texte = await ctx.stockageBinaireRepo.lire(cleTexteDocumentProjet(d.id))
  return {
    id: d.id,
    projectId: d.projectId,
    filename: d.filename,
    status: d.status,
    extractedText: texte ? new TextDecoder().decode(texte.contenu) : '',
    mimeType: d.mimeType,
    hasBinaryContent: d.hasBinaryContent,
    uploadedAt: d.uploadedAt,
    uploadedBy: d.uploadedBy,
  }
}

async function gererListerDocumentsProjet(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  projectId: string,
): Promise<Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)

  const metadonnees = await ctx.projectDocumentsRepo.listerParProjet(projectId)
  const documentsProjet = await Promise.all(metadonnees.map((d) => assemblerDocumentProjet(ctx, d)))
  return reponseJson({ documentsProjet }, 200, entetes)
}

interface CorpsCreationDocumentProjet {
  /** Réservé à la migration locale (`gererMigrerDocumentProjetLocal`) — voir sa documentation pour pourquoi le client impose l'identifiant dans ce cas précis. Ignoré par `gererCreerDocumentProjet` (création normale). */
  id?: string
  projectId?: string
  filename?: string
  status?: string
  mimeType?: string
}

/** Lit et valide le `FormData` commun à la création et à la migration locale — seule la gestion de l'id (fabriqué ici / imposé par l'appelant là-bas) diffère entre les deux appelants. */
async function lireFormDataDocumentProjet(request: Request): Promise<
  | {
      ok: true
      corps: CorpsCreationDocumentProjet
      extractedText: string
      contenuBlob: Blob | null
    }
  | { ok: false }
> {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return { ok: false }
  }

  const metadataBrut = formData.get('metadata')
  if (typeof metadataBrut !== 'string') return { ok: false }
  let corps: CorpsCreationDocumentProjet
  try {
    corps = JSON.parse(metadataBrut) as CorpsCreationDocumentProjet
  } catch {
    return { ok: false }
  }

  const texteValeur = formData.get('texte')
  const extractedText = typeof texteValeur === 'string' ? texteValeur : ''

  const contenuValeur = formData.get('contenu')
  // Même vérification structurelle (jamais `instanceof Blob`) et même
  // exigence `size > 0` que `gererCreerDocumentNormatif` — voir sa
  // docstring pour le bug réel (Blob présent mais vide) qu'elle évite.
  const contenuBlob =
    contenuValeur !== null &&
    typeof contenuValeur === 'object' &&
    typeof (contenuValeur as Blob).arrayBuffer === 'function' &&
    (contenuValeur as Blob).size > 0
      ? (contenuValeur as Blob)
      : null

  return { ok: true, corps, extractedText, contenuBlob }
}

async function gererCreerDocumentProjet(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
): Promise<Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)

  const lecture = await lireFormDataDocumentProjet(request)
  if (!lecture.ok) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  const { corps, extractedText, contenuBlob } = lecture
  if (!corps.projectId) return reponseJson({ erreur: 'projectId_obligatoire' }, 400, entetes)
  if (!corps.filename || corps.filename.trim().length === 0) {
    return reponseJson({ erreur: 'filename_obligatoire' }, 400, entetes)
  }
  const mimeType = corps.mimeType ?? 'application/octet-stream'
  const status = corps.status ?? 'reference_de_travail_non_maitre'

  const id = genererId()
  await ctx.stockageBinaireRepo.enregistrer(
    cleTexteDocumentProjet(id),
    new TextEncoder().encode(extractedText).buffer as ArrayBuffer,
    'text/plain; charset=utf-8',
  )
  if (contenuBlob) {
    await ctx.stockageBinaireRepo.enregistrer(
      cleContenuDocumentProjet(id),
      await contenuBlob.arrayBuffer(),
      mimeType,
    )
  }

  const document: ProjectDocumentEnregistre = {
    id,
    projectId: corps.projectId,
    filename: corps.filename.trim(),
    status,
    mimeType,
    hasBinaryContent: contenuBlob !== null,
    uploadedAt: horodatage(),
    uploadedBy: utilisateur.id,
  }
  await ctx.projectDocumentsRepo.creer(document)
  await consignerAudit(ctx, utilisateur, 'import_document_projet', 'project_document', id, null)

  return reponseJson({ documentProjet: await assemblerDocumentProjet(ctx, document) }, 201, entetes)
}

/**
 * Migration ponctuelle (filet de sécurité `projectDocumentsAMigrer`,
 * `useProjectDocumentsStore.migrerDocumentsLocauxVersServeur`) — même
 * patron d'idempotence que `gererMigrerSectionsLocales`
 * (l'existant côté serveur gagne toujours, jamais un écrasement), mais en
 * `multipart/form-data` (jamais du JSON, comme `gererCreerDocumentProjet`)
 * et un seul document par appel : `ProjectDocument.content` étant un
 * `Blob`, le lot ne peut pas être sérialisé dans un unique corps JSON
 * comme pour `projects`/`sections`. L'id est imposé par l'appelant
 * (référencé par `Project.documents[]`/`Section.generation_source.
 * source_document_id`, jamais fabriqué ici).
 */
async function gererMigrerDocumentProjetLocal(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
): Promise<Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)

  const lecture = await lireFormDataDocumentProjet(request)
  if (!lecture.ok) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  const { corps, extractedText, contenuBlob } = lecture
  const id = corps.id
  if (!id || !corps.projectId || !corps.filename) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  const existant = await ctx.projectDocumentsRepo.parId(id)
  if (existant) {
    return reponseJson(
      { documentProjet: await assemblerDocumentProjet(ctx, existant) },
      201,
      entetes,
    )
  }

  const mimeType = corps.mimeType ?? 'application/octet-stream'
  const status = corps.status ?? 'reference_de_travail_non_maitre'
  await ctx.stockageBinaireRepo.enregistrer(
    cleTexteDocumentProjet(id),
    new TextEncoder().encode(extractedText).buffer as ArrayBuffer,
    'text/plain; charset=utf-8',
  )
  if (contenuBlob) {
    await ctx.stockageBinaireRepo.enregistrer(
      cleContenuDocumentProjet(id),
      await contenuBlob.arrayBuffer(),
      mimeType,
    )
  }
  const document: ProjectDocumentEnregistre = {
    id,
    projectId: corps.projectId,
    filename: corps.filename.trim(),
    status,
    mimeType,
    hasBinaryContent: contenuBlob !== null,
    uploadedAt: horodatage(),
    uploadedBy: utilisateur.id,
  }
  await ctx.projectDocumentsRepo.creer(document)
  return reponseJson({ documentProjet: await assemblerDocumentProjet(ctx, document) }, 201, entetes)
}

async function gererObtenirDocumentProjet(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  id: string,
): Promise<Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)

  const document = await ctx.projectDocumentsRepo.parId(id)
  if (!document) return reponseJson({ erreur: 'introuvable' }, 404, entetes)
  return reponseJson({ documentProjet: await assemblerDocumentProjet(ctx, document) }, 200, entetes)
}

async function gererObtenirContenuDocumentProjet(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  id: string,
): Promise<Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)

  const document = await ctx.projectDocumentsRepo.parId(id)
  if (!document || !document.hasBinaryContent) {
    return reponseJson({ erreur: 'introuvable' }, 404, entetes)
  }
  const contenu = await ctx.stockageBinaireRepo.lire(cleContenuDocumentProjet(id))
  if (!contenu) return reponseJson({ erreur: 'introuvable' }, 404, entetes)

  return new Response(contenu.contenu, {
    status: 200,
    headers: {
      ...entetes,
      'Content-Type': contenu.typeContenu,
      'Content-Disposition': `attachment; filename="${document.filename.replace(/"/g, '')}"`,
    },
  })
}

async function gererSupprimerDocumentProjet(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  id: string,
): Promise<Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)

  await ctx.stockageBinaireRepo.supprimer(cleTexteDocumentProjet(id))
  await ctx.stockageBinaireRepo.supprimer(cleContenuDocumentProjet(id))
  await ctx.projectDocumentsRepo.supprimer(id)
  await consignerAudit(
    ctx,
    utilisateur,
    'suppression_document_projet',
    'project_document',
    id,
    null,
  )
  return reponseJson({ ok: true }, 200, entetes)
}

// --- Handlers : paramètres d'installation ---

async function gererObtenirParametreInstallation(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  cle: string,
): Promise<Response> {
  // Lecture ouverte à tout utilisateur authentifié (jamais réservée à
  // l'admin) : le jeton/PAT qu'elle contient doit être utilisable
  // directement depuis le navigateur par n'importe quel compte de
  // l'organisation — exactement ce que chacun devait ressaisir
  // manuellement avant cette migration (stockage local par poste).
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)
  if (!estCleParametreInstallationValide(cle)) {
    return reponseJson({ erreur: 'cle_invalide' }, 400, entetes)
  }

  const parametre = await ctx.parametresInstallationRepo.obtenir(cle)
  return reponseJson({ parametre }, 200, entetes)
}

async function gererEnregistrerParametreInstallation(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  cle: string,
): Promise<Response> {
  const acteur = await exigerAdmin(request, ctx, entetes)
  if (acteur instanceof Response) return acteur
  if (!estCleParametreInstallationValide(cle)) {
    return reponseJson({ erreur: 'cle_invalide' }, 400, entetes)
  }

  const corps = await lireCorpsJson<{ valeur?: ValeurParametreInstallation }>(request)
  if (!corps?.valeur || typeof corps.valeur !== 'object') {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  await ctx.parametresInstallationRepo.enregistrer(cle, corps.valeur, acteur.id)
  await consignerAudit(ctx, acteur, 'modification_parametre_installation', 'parametre', cle, null)
  const parametre = await ctx.parametresInstallationRepo.obtenir(cle)
  return reponseJson({ parametre }, 200, entetes)
}

async function gererEffacerParametreInstallation(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  cle: string,
): Promise<Response> {
  const acteur = await exigerAdmin(request, ctx, entetes)
  if (acteur instanceof Response) return acteur
  if (!estCleParametreInstallationValide(cle)) {
    return reponseJson({ erreur: 'cle_invalide' }, 400, entetes)
  }

  await ctx.parametresInstallationRepo.effacer(cle)
  await consignerAudit(ctx, acteur, 'suppression_parametre_installation', 'parametre', cle, null)
  return reponseJson({ ok: true }, 200, entetes)
}

// --- Handlers : OAuth Google (Drive normes) ---

const CLE_PARAMETRE_DRIVE_NORMES = 'drive-normes'
/** Clé technique interne (jamais dans `CLES_PARAMETRES_INSTALLATION` — sans intérêt pour le client, jamais exposée via `GET /parametres-installation/:cle`) : état CSRF à usage unique entre `gererDemarrerOAuthDrive` et `gererCallbackOAuthDrive`. */
const CLE_ETAT_OAUTH_DRIVE = 'drive-oauth-etat'
const DUREE_VALIDITE_ETAT_OAUTH_MS = 10 * 60 * 1000
const PORTEE_OAUTH_DRIVE = 'https://www.googleapis.com/auth/drive.readonly'

function urlRedirectionOAuthDrive(request: Request): string {
  return `${new URL(request.url).origin}/drive-oauth/callback`
}

interface JetonsGoogleOAuth {
  access_token: string
  refresh_token?: string
  expires_in: number
}

/** Un seul point d'appel à `oauth2.googleapis.com/token` — échange initial (`authorization_code`) et renouvellement (`refresh_token`) partagent le même format de requête/réponse. `null` sur tout échec (jamais une exception : un jeton expiré/révoqué côté Google est un cas attendu, pas une panne). */
async function echangerAvecGoogleOAuth(
  corps: Record<string, string>,
): Promise<JetonsGoogleOAuth | null> {
  const reponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(corps).toString(),
  })
  if (!reponse.ok) return null
  return (await reponse.json()) as JetonsGoogleOAuth
}

/**
 * Démarre l'autorisation Google (Drive normes) — remplace le jeton d'accès
 * recopié à la main depuis l'OAuth Playground (valable 1h, cause du #35/
 * #36/#37) par un jeton de rafraîchissement longue durée, renouvelé
 * automatiquement (`gererRafraichirJetonDrive`) à chaque usage. Réservé à
 * un admin (même exigence que `gererEnregistrerParametreInstallation`,
 * dont cette connexion tient lieu).
 */
async function gererDemarrerOAuthDrive(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
): Promise<Response> {
  const acteur = await exigerAdmin(request, ctx, entetes)
  if (acteur instanceof Response) return acteur
  if (!ctx.googleOAuthClientId || !ctx.googleOAuthClientSecret) {
    return reponseJson({ erreur: 'oauth_google_non_configure' }, 501, entetes)
  }

  const etat = genererId()
  await ctx.parametresInstallationRepo.enregistrer(
    CLE_ETAT_OAUTH_DRIVE,
    {
      etat,
      utilisateurId: acteur.id,
      expireA: new Date(Date.now() + DUREE_VALIDITE_ETAT_OAUTH_MS).toISOString(),
    },
    acteur.id,
  )

  const parametres = new URLSearchParams({
    client_id: ctx.googleOAuthClientId,
    redirect_uri: urlRedirectionOAuthDrive(request),
    response_type: 'code',
    scope: PORTEE_OAUTH_DRIVE,
    access_type: 'offline',
    prompt: 'consent',
    state: etat,
  })
  return reponseJson(
    { urlAutorisation: `https://accounts.google.com/o/oauth2/v2/auth?${parametres.toString()}` },
    200,
    entetes,
  )
}

/**
 * Réception de la redirection Google — jamais authentifiée par construction
 * (navigation top-level du navigateur, aucun jeton de session envoyable) :
 * la protection CSRF passe par `state`, comparé à l'état à usage unique
 * posé par `gererDemarrerOAuthDrive` (qui y attache aussi l'utilisateur
 * d'origine, nécessaire pour `updated_by` — colonne `REFERENCES users(id)`,
 * voir migration 0002 — qu'un flux non authentifié ne peut jamais fournir
 * autrement). Ne renvoie jamais de JSON : toujours une redirection vers
 * l'application, succès ou échec.
 */
async function gererCallbackOAuthDrive(request: Request, ctx: Contexte): Promise<Response> {
  const urlBase = ctx.urlApplication.replace(/\/+$/, '')
  const echec = (raison: string): Response =>
    Response.redirect(`${urlBase}/normes?drive_oauth=erreur&raison=${raison}`, 302)

  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const etatRecu = url.searchParams.get('state')
  if (!code || !etatRecu) return echec('parametres_manquants')
  if (!ctx.googleOAuthClientId || !ctx.googleOAuthClientSecret) {
    return echec('oauth_google_non_configure')
  }

  const etatEnregistre = await ctx.parametresInstallationRepo.obtenir(CLE_ETAT_OAUTH_DRIVE)
  if (
    !etatEnregistre ||
    etatEnregistre.valeur.etat !== etatRecu ||
    new Date(etatEnregistre.valeur.expireA ?? 0) < new Date()
  ) {
    return echec('etat_invalide_ou_expire')
  }
  const utilisateurId = etatEnregistre.valeur.utilisateurId
  await ctx.parametresInstallationRepo.effacer(CLE_ETAT_OAUTH_DRIVE)
  if (!utilisateurId) return echec('etat_invalide_ou_expire')

  const utilisateur = await ctx.utilisateursRepo.parId(utilisateurId)
  if (!utilisateur) return echec('utilisateur_introuvable')

  const jetons = await echangerAvecGoogleOAuth({
    code,
    client_id: ctx.googleOAuthClientId,
    client_secret: ctx.googleOAuthClientSecret,
    redirect_uri: urlRedirectionOAuthDrive(request),
    grant_type: 'authorization_code',
  })
  if (!jetons?.refresh_token) return echec('echange_jeton_echoue')

  const existant = await ctx.parametresInstallationRepo.obtenir(CLE_PARAMETRE_DRIVE_NORMES)
  await ctx.parametresInstallationRepo.enregistrer(
    CLE_PARAMETRE_DRIVE_NORMES,
    { ...existant?.valeur, refreshToken: jetons.refresh_token },
    utilisateurId,
  )
  await consignerAudit(
    ctx,
    utilisateur,
    'connexion_oauth_drive',
    'parametre',
    CLE_PARAMETRE_DRIVE_NORMES,
    null,
  )

  return Response.redirect(`${urlBase}/normes?drive_oauth=ok`, 302)
}

/**
 * Renouvelle le jeton d'accès Drive à la demande à partir du jeton de
 * rafraîchissement stocké — jamais persisté (durée de vie ~1h, sans
 * intérêt à conserver) : chaque appelant en réclame un frais. Même
 * exigence d'authentification que la lecture du paramètre lui-même
 * (`gererObtenirParametreInstallation`) : tout compte de l'organisation, ce
 * jeton devant être directement utilisable depuis son navigateur.
 */
async function gererRafraichirJetonDrive(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
): Promise<Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)
  if (!ctx.googleOAuthClientId || !ctx.googleOAuthClientSecret) {
    return reponseJson({ erreur: 'oauth_google_non_configure' }, 501, entetes)
  }

  const parametre = await ctx.parametresInstallationRepo.obtenir(CLE_PARAMETRE_DRIVE_NORMES)
  const refreshToken = parametre?.valeur.refreshToken
  if (!refreshToken) return reponseJson({ erreur: 'oauth_non_connecte' }, 404, entetes)

  const jetons = await echangerAvecGoogleOAuth({
    refresh_token: refreshToken,
    client_id: ctx.googleOAuthClientId,
    client_secret: ctx.googleOAuthClientSecret,
    grant_type: 'refresh_token',
  })
  if (!jetons?.access_token) {
    // 400, jamais 5xx : un jeton de rafraîchissement révoqué/expiré est un
    // échec métier attendu (l'utilisateur doit reconnecter Google), pas une
    // panne du Worker — `AuthApiClient.requete` traite tout 5xx comme
    // « relais injoignable » (`IndisponibleAuthError`), masquerait le vrai
    // message ici.
    return reponseJson({ erreur: 'rafraichissement_echoue' }, 400, entetes)
  }

  return reponseJson({ jeton: jetons.access_token, expiresIn: jetons.expires_in }, 200, entetes)
}

// --- Handlers : documents normatifs (Bibliothèque de normes) ---

interface DocumentNormatifWire {
  id: string
  category: string
  titre: string
  filename: string
  source: string
  sourceRef: string | null
  extractedText: string
  mimeType: string
  hasBinaryContent: boolean
  uploadedAt: string
  uploadedBy: string
}

interface CorpsCreationDocumentNormatif {
  category?: string
  titre?: string
  filename?: string
  source?: string
  sourceRef?: string
  mimeType?: string
}

/** Assemble la réponse complète (métadonnées D1 + texte extrait R2) — jamais le contenu binaire, récupéré séparément via `/contenu` pour ne pas alourdir la liste. */
async function assemblerDocumentNormatif(
  ctx: Contexte,
  d: DocumentNormatifEnregistre,
): Promise<DocumentNormatifWire> {
  const texte = await ctx.stockageBinaireRepo.lire(cleTexteDocument(d.id))
  return {
    id: d.id,
    category: d.category,
    titre: d.titre,
    filename: d.filename,
    source: d.source,
    sourceRef: d.sourceRef,
    extractedText: texte ? new TextDecoder().decode(texte.contenu) : '',
    mimeType: d.mimeType,
    hasBinaryContent: d.hasBinaryContent,
    uploadedAt: d.uploadedAt,
    uploadedBy: d.uploadedBy,
  }
}

async function gererListerDocumentsNormatifs(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
): Promise<Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)

  const metadonnees = await ctx.documentsNormatifsRepo.lister()
  const documents = await Promise.all(metadonnees.map((d) => assemblerDocumentNormatif(ctx, d)))
  return reponseJson({ documents }, 200, entetes)
}

async function gererCreerDocumentNormatif(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
): Promise<Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  const metadataBrut = formData.get('metadata')
  if (typeof metadataBrut !== 'string') {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  let corps: CorpsCreationDocumentNormatif
  try {
    corps = JSON.parse(metadataBrut) as CorpsCreationDocumentNormatif
  } catch {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }
  if (
    !corps.category ||
    !(CATEGORIES_DOCUMENT_NORMATIF as readonly string[]).includes(corps.category)
  ) {
    return reponseJson({ erreur: 'categorie_invalide' }, 400, entetes)
  }
  if (!corps.titre || corps.titre.trim().length === 0) {
    return reponseJson({ erreur: 'titre_obligatoire' }, 400, entetes)
  }
  if (!corps.filename || corps.filename.trim().length === 0) {
    return reponseJson({ erreur: 'filename_obligatoire' }, 400, entetes)
  }
  if (!corps.source || !(SOURCES_DOCUMENT_NORMATIF as readonly string[]).includes(corps.source)) {
    return reponseJson({ erreur: 'source_invalide' }, 400, entetes)
  }
  const mimeType = corps.mimeType ?? 'application/octet-stream'

  const texteValeur = formData.get('texte')
  const extractedText = typeof texteValeur === 'string' ? texteValeur : ''

  const contenuValeur = formData.get('contenu')
  // `instanceof Blob` s'est révélé peu fiable selon l'environnement
  // d'exécution (jsdom/undici/workerd n'exposent pas nécessairement la
  // même classe `Blob` d'un realm à l'autre) — vérification structurelle
  // (présence d'`arrayBuffer()`) plutôt qu'un test de type nominal.
  //
  // `size > 0` est délibéré, jamais une simple présence structurelle : un
  // import Drive dont le jeton a expiré en cours de lot a été constaté en
  // production produisant un Blob présent mais vide (0 octet) — la requête
  // entière n'échoue jamais dans ce cas (le texte déjà extrait côté client
  // arrive intact dans le même FormData), donc rien ne signalait l'échec.
  // `hasBinaryContent` affirmait alors à tort qu'un fichier d'origine
  // existait, pour 177 documents sur l'installation concernée. Un Blob vide
  // n'est jamais enregistré ni annoncé comme contenu binaire disponible.
  const contenuBlob =
    contenuValeur !== null &&
    typeof contenuValeur === 'object' &&
    typeof (contenuValeur as Blob).arrayBuffer === 'function' &&
    (contenuValeur as Blob).size > 0
      ? (contenuValeur as Blob)
      : null

  const id = genererId()
  await ctx.stockageBinaireRepo.enregistrer(
    cleTexteDocument(id),
    new TextEncoder().encode(extractedText).buffer as ArrayBuffer,
    'text/plain; charset=utf-8',
  )
  if (contenuBlob) {
    await ctx.stockageBinaireRepo.enregistrer(
      cleContenuDocument(id),
      await contenuBlob.arrayBuffer(),
      mimeType,
    )
  }

  const document: DocumentNormatifEnregistre = {
    id,
    category: corps.category,
    titre: corps.titre.trim(),
    filename: corps.filename.trim(),
    source: corps.source,
    sourceRef: corps.sourceRef ?? null,
    mimeType,
    hasBinaryContent: contenuBlob !== null,
    uploadedAt: horodatage(),
    uploadedBy: utilisateur.id,
  }
  await ctx.documentsNormatifsRepo.creer(document)
  await consignerAudit(ctx, utilisateur, 'import_document_normatif', 'document_normatif', id, null)

  return reponseJson({ document: await assemblerDocumentNormatif(ctx, document) }, 201, entetes)
}

/**
 * Recale `hasBinaryContent` sur la réalité observée dans R2 (via `taille`,
 * sans télécharger le contenu) pour un lot de documents donné — jamais un
 * balayage de toute l'installation en un seul appel : le nombre de
 * sous-requêtes R2 par invocation est limité côté Workers, donc le client
 * découpe en lots (voir `diagnostiquerContenu`, store). Corrige le champ
 * dans un sens comme dans l'autre : un ancien import de masse a pu
 * annoncer un contenu inexistant (#35/#36) tout comme, en théorie, l'
 * inverse — jamais une simple remise à `false`.
 */
async function gererDiagnostiquerContenuDocumentsNormatifs(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
): Promise<Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)

  const corps = await lireCorpsJson<{ ids?: string[] }>(request)
  if (!corps || !Array.isArray(corps.ids) || corps.ids.length === 0) {
    return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  }

  const resultats = await Promise.all(
    corps.ids.map(async (id) => {
      const document = await ctx.documentsNormatifsRepo.parId(id)
      if (!document) return { id, hasBinaryContent: false, corrige: false }

      const taille = await ctx.stockageBinaireRepo.taille(cleContenuDocument(id))
      const disponibleReel = taille !== null && taille > 0
      const corrige = disponibleReel !== document.hasBinaryContent
      if (corrige) {
        await ctx.documentsNormatifsRepo.corrigerHasBinaryContent(id, disponibleReel)
        await consignerAudit(
          ctx,
          utilisateur,
          'correction_has_binary_content_document_normatif',
          'document_normatif',
          id,
          null,
        )
      }
      return { id, hasBinaryContent: disponibleReel, corrige }
    }),
  )

  return reponseJson({ resultats }, 200, entetes)
}

async function gererObtenirContenuDocumentNormatif(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  id: string,
): Promise<Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)

  const document = await ctx.documentsNormatifsRepo.parId(id)
  if (!document || !document.hasBinaryContent) {
    return reponseJson({ erreur: 'introuvable' }, 404, entetes)
  }
  const contenu = await ctx.stockageBinaireRepo.lire(cleContenuDocument(id))
  if (!contenu) return reponseJson({ erreur: 'introuvable' }, 404, entetes)

  return new Response(contenu.contenu, {
    status: 200,
    headers: {
      ...entetes,
      'Content-Type': contenu.typeContenu,
      'Content-Disposition': `attachment; filename="${document.filename.replace(/"/g, '')}"`,
    },
  })
}

/**
 * Répare un document dont le contenu binaire s'est révélé vide après coup
 * (voir docstring de `gererCreerDocumentNormatif` — jeton Drive expiré en
 * cours d'un import de masse) : remplace uniquement le contenu binaire
 * d'un document déjà existant, jamais ses métadonnées (titre déjà
 * renommé, catégorie déjà choisie) — jamais une recréation qui perdrait
 * ces personnalisations. Corps brut (jamais multipart, contrairement à la
 * création) : le client connaît déjà tout le reste, seul le contenu
 * change.
 */
async function gererRepararContenuDocumentNormatif(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  id: string,
): Promise<Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)

  const document = await ctx.documentsNormatifsRepo.parId(id)
  if (!document) return reponseJson({ erreur: 'introuvable' }, 404, entetes)

  const contenu = await request.arrayBuffer()
  // Même garde qu'à la création (#35) : jamais annoncer un contenu
  // disponible pour un corps vide, même reçu avec un statut 200.
  if (contenu.byteLength === 0) {
    return reponseJson({ erreur: 'contenu_vide' }, 400, entetes)
  }

  const typeContenu = request.headers.get('Content-Type') ?? document.mimeType
  await ctx.stockageBinaireRepo.enregistrer(cleContenuDocument(id), contenu, typeContenu)
  await ctx.documentsNormatifsRepo.marquerContenuDisponible(id)
  await consignerAudit(
    ctx,
    utilisateur,
    'reparation_contenu_document_normatif',
    'document_normatif',
    id,
    null,
  )

  return reponseJson(
    { document: await assemblerDocumentNormatif(ctx, { ...document, hasBinaryContent: true }) },
    200,
    entetes,
  )
}

async function gererRenommerDocumentNormatif(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  id: string,
): Promise<Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)

  const document = await ctx.documentsNormatifsRepo.parId(id)
  if (!document) return reponseJson({ erreur: 'introuvable' }, 404, entetes)

  const corps = await lireCorpsJson<{ titre?: string }>(request)
  if (!corps) return reponseJson({ erreur: 'corps_invalide' }, 400, entetes)
  if (!corps.titre || corps.titre.trim().length === 0) {
    return reponseJson({ erreur: 'titre_obligatoire' }, 400, entetes)
  }

  const titre = corps.titre.trim()
  await ctx.documentsNormatifsRepo.renommer(id, titre)
  await consignerAudit(
    ctx,
    utilisateur,
    'renommage_document_normatif',
    'document_normatif',
    id,
    null,
  )

  return reponseJson(
    { document: await assemblerDocumentNormatif(ctx, { ...document, titre }) },
    200,
    entetes,
  )
}

async function gererSupprimerDocumentNormatif(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
  id: string,
): Promise<Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)

  await ctx.stockageBinaireRepo.supprimer(cleTexteDocument(id))
  await ctx.stockageBinaireRepo.supprimer(cleContenuDocument(id))
  await ctx.documentsNormatifsRepo.supprimer(id)
  await consignerAudit(
    ctx,
    utilisateur,
    'suppression_document_normatif',
    'document_normatif',
    id,
    null,
  )
  return reponseJson({ ok: true }, 200, entetes)
}

// --- Aides ---

function peutVoirClient(utilisateur: UtilisateurEnregistre, client: ClientEnregistre): boolean {
  return (
    utilisateur.role === 'admin' ||
    client.createdByUserId === utilisateur.id ||
    client.sharedWith.includes(utilisateur.id)
  )
}

function peutModifierClient(utilisateur: UtilisateurEnregistre, client: ClientEnregistre): boolean {
  // Cohérent avec la vision utilisateur : "lecture pour tous [les
  // partagés], écriture pour le créateur + les partagés" — jamais un
  // simple lecteur sans lien de partage/propriété.
  return peutVoirClient(utilisateur, client)
}

/** Authentifie puis exige le rôle admin — retourne soit l'acteur, soit la Response d'erreur à renvoyer telle quelle. */
async function exigerAdmin(
  request: Request,
  ctx: Contexte,
  entetes: Record<string, string>,
): Promise<UtilisateurEnregistre | Response> {
  const utilisateur = await authentifier(request, ctx)
  if (!utilisateur) return reponseJson({ erreur: 'non_authentifie' }, 401, entetes)
  if (utilisateur.role !== 'admin') return reponseJson({ erreur: 'non_autorise' }, 403, entetes)
  return utilisateur
}

function validerNouveauCompte(corps: {
  email?: string
  motDePasse?: string
  nom?: string
  prenom?: string
}): string | null {
  if (!corps.email || !REGEX_EMAIL.test(corps.email.trim())) return 'email_invalide'
  if (!corps.motDePasse || corps.motDePasse.length < LONGUEUR_MIN_MOT_DE_PASSE) {
    return 'mot_de_passe_trop_court'
  }
  if (!corps.nom || corps.nom.trim().length === 0) return 'nom_obligatoire'
  if (!corps.prenom || corps.prenom.trim().length === 0) return 'prenom_obligatoire'
  return null
}
