import { signerJwt, verifierJwt } from './jwt'
import { genererSel, hacherMotDePasse, verifierMotDePasse } from './motDePasse'
import type { EnvoyeurEmail } from './notifications/envoyeurEmail'
import type { AuditRepo } from './repos/auditRepo'
import type { ClientsRepo } from './repos/clientsRepo'
import type {
  DocumentNormatifEnregistre,
  DocumentsNormatifsRepo,
} from './repos/documentsNormatifsRepo'
import type {
  ParametresInstallationRepo,
  ValeurParametreInstallation,
} from './repos/parametresInstallationRepo'
import type { StockageBinaireRepo } from './repos/stockageBinaireRepo'
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
  auditRepo: AuditRepo
  secretJwt: string
  jetonBootstrap: string
  corsOrigin: string
  envoyeurEmail: EnvoyeurEmail
  urlApplication: string
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

  // --- Documents normatifs (Bibliothèque de normes — global à l'installation) ---
  if (chemin === '/documents-normatifs' && request.method === 'GET') {
    return gererListerDocumentsNormatifs(request, ctx, entetes)
  }
  if (chemin === '/documents-normatifs' && request.method === 'POST') {
    return gererCreerDocumentNormatif(request, ctx, entetes)
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
