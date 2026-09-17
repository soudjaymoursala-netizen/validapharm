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
import type {
  DocumentNormatifEnregistre,
  DocumentsNormatifsRepo,
} from './repos/documentsNormatifsRepo'
import type {
  OrganisationRepo,
  OrganizationEnregistree,
  WorkspaceEnregistre,
} from './repos/organisationRepo'
import type {
  ParametresInstallationRepo,
  ValeurParametreInstallation,
} from './repos/parametresInstallationRepo'
import type { ProjectDocumentEnregistre, ProjectDocumentsRepo } from './repos/projectDocumentsRepo'
import type {
  LienProjetEnregistre,
  PartageProjetEnregistre,
  PhaseProjetEnregistree,
  ProjectEnregistre,
  ProjectsRepo,
} from './repos/projectsRepo'
import type { SectionEnregistree, SectionsRepo } from './repos/sectionsRepo'
import type { StockageBinaireRepo } from './repos/stockageBinaireRepo'
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
