import { signerJwt, verifierJwt } from './jwt'
import { genererSel, hacherMotDePasse, verifierMotDePasse } from './motDePasse'
import type { AuditRepo } from './repos/auditRepo'
import type { ClientsRepo } from './repos/clientsRepo'
import type { UtilisateursRepo } from './repos/utilisateursRepo'
import type { ClientEnregistre, EntreeAudit, Role, UtilisateurEnregistre } from './types'
import { versUtilisateurPublic } from './types'

export interface Contexte {
  utilisateursRepo: UtilisateursRepo
  clientsRepo: ClientsRepo
  auditRepo: AuditRepo
  secretJwt: string
  jetonBootstrap: string
  corsOrigin: string
}

const LONGUEUR_MIN_MOT_DE_PASSE = 8
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function entetesCors(corsOrigin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
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
 * Routeur HTTP du Worker d'authentification (TD-046) — logique pure,
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

  // --- Clients (D1 = source de vérité, TD-046) ---
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
  return reponseJson({ utilisateur: versUtilisateurPublic(nouvelUtilisateur) }, 201, entetes)
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

// --- Aides ---

function peutVoirClient(utilisateur: UtilisateurEnregistre, client: ClientEnregistre): boolean {
  return (
    utilisateur.role === 'admin' ||
    client.createdByUserId === utilisateur.id ||
    client.sharedWith.includes(utilisateur.id)
  )
}

function peutModifierClient(utilisateur: UtilisateurEnregistre, client: ClientEnregistre): boolean {
  // Cohérent avec la vision utilisateur (TD-043) : "lecture pour tous [les
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
