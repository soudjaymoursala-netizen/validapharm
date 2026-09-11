import { ErreurFournisseurIA, type FournisseurIA } from './fournisseurs/FournisseurIA'

/**
 * Handler du relais IA — logique pure, indépendante du binding Cloudflare
 * Workers (`env`/`ExecutionContext`), même pattern que
 * `workers/ocr-relay/src/ocrHandler.ts`. `index.ts` ne fait que construire
 * le `FournisseurIA` à partir des secrets et déléguer ici.
 *
 * Contrat requête/réponse strictement celui déjà attendu côté navigateur
 * (`src/connecteurs/ia/RelayProviderAdapter.ts`, jamais modifié ici) :
 * requête `{ mode, question, contenu_joint, contenu? }`, réponse
 * `{ texte, version_moteur, citations }`. `citations` toujours `[]` — ce
 * relais est un simple proxy sans état, aucune vérification de citation
 * ne s'y fait (celle-ci reste entièrement côté Reasoning Engine,
 * `verifierConfiance`, jamais dupliquée ici).
 *
 * Sans état : aucune donnée de la requête (question, document joint) ou
 * de la réponse n'est conservée au-delà du traitement en cours — pas
 * d'écriture KV/D1/Durable Object, jamais de journalisation du corps
 * échangé (seul le nom de l'erreur est loggé en cas d'échec, jamais son
 * contenu — cohérent avec `AiChatSessionLog`, qui ne journalise que des
 * métadonnées de session côté PWA, jamais le contenu).
 *
 * CORS restreint strictement à l'origine exacte de la PWA déployée
 * (`09-architecture-detaillee.md` §10), jamais `*`.
 */

type ModeUsageIA = 'chat_normatif' | 'audit_simule'

export interface ConfigRelayHandler {
  corsOrigin: string
  /** Jeton partagé attendu en `Authorization: Bearer <jeton>` — protège le budget du fournisseur contre un appel par un tiers qui aurait deviné l'URL du relais (le relais est un simple sous-domaine `workers.dev`, jamais authentifié par ailleurs). */
  jetonAcces: string
  modeleParMode: Record<ModeUsageIA, string>
}

interface CorpsRequeteRelais {
  mode: ModeUsageIA
  question: string
  contenu_joint: boolean
  contenu?: string
}

/**
 * Cadrage fixe, identique pour les deux modes : en mode `audit_simule`, la
 * question porte déjà le prompt enrichi (personas, débat contradictoire)
 * construit côté navigateur — ce relais ne fabrique jamais de cadrage
 * supplémentaire par mode. Reprend mot pour mot le seul disclaimer déjà
 * affiché à l'utilisateur (`docs/GUIDE-UTILISATEUR.md` §28), pour ne
 * jamais introduire une posture non documentée ailleurs.
 */
const SYSTEM_PROMPT =
  "Tu es l'assistant IA de ValidaPharm, un outil d'aide à la rédaction de " +
  "livrables qualité CQV/CSV/QA pour l'industrie pharmaceutique et les " +
  'dispositifs médicaux. Tu apportes une aide à la rédaction et à la ' +
  "compréhension réglementaire. Aide, pas avis opposable : tu n'émets " +
  'jamais une décision de conformité ni un avis réglementaire engageant — ' +
  "l'humain reste seul décisionnaire. Si tu ne sais pas, dis-le explicitement " +
  "plutôt que d'inventer une référence normative. Réponds en Markdown : " +
  'utilise des titres, des listes et surtout des tableaux dès que la ' +
  'question appelle un document structuré, une comparaison ou une analyse ' +
  '(ex. comparaison IQ/OQ/PQ, matrice de traçabilité, liste de critères) — ' +
  "un tableau bien formé vaut mieux qu'un paragraphe dense pour ce type de " +
  'contenu.'

export async function traiterRequeteRelaisIA(
  request: Request,
  fournisseur: FournisseurIA,
  config: ConfigRelayHandler,
): Promise<Response> {
  const entetesCors = {
    'Access-Control-Allow-Origin': config.corsOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: entetesCors })
  }

  // Vérification de connexion (écran Configuration client) : ne fait
  // jamais qu'authentifier le jeton, sans jamais appeler le fournisseur IA
  // — un « Tester la connexion » ne doit ni coûter un appel au fournisseur
  // (facturé), ni dépendre de sa disponibilité pour valider la seule chose
  // qu'il vérifie réellement, la configuration du relais lui-même.
  if (request.method === 'GET') {
    if (!jetonValide(request, config.jetonAcces)) {
      return reponseJson({ erreur: 'jeton_invalide' }, 401, entetesCors)
    }
    return reponseJson({ ok: true }, 200, entetesCors)
  }

  if (request.method !== 'POST') {
    return reponseJson({ erreur: 'methode_non_autorisee' }, 405, entetesCors)
  }

  if (!jetonValide(request, config.jetonAcces)) {
    return reponseJson({ erreur: 'jeton_invalide' }, 401, entetesCors)
  }

  let corps: CorpsRequeteRelais
  try {
    corps = await lireEtValiderCorps(request)
  } catch (erreur) {
    return reponseJson(
      { erreur: 'requete_invalide', message: erreur instanceof Error ? erreur.message : '' },
      400,
      entetesCors,
    )
  }

  const modele = config.modeleParMode[corps.mode]
  const messageUtilisateur = corps.contenu_joint
    ? `Document joint :\n\n${corps.contenu}\n\n---\n\n${corps.question}`
    : corps.question

  try {
    const resultat = await fournisseur.envoyerMessage(SYSTEM_PROMPT, messageUtilisateur, modele)
    return reponseJson(
      { texte: resultat.texte, version_moteur: resultat.version_moteur, citations: [] },
      200,
      entetesCors,
    )
  } catch (erreur) {
    // Jamais de détail fournisseur brut renvoyé au client (même principe
    // que ocrHandler.ts) — seul le statut HTTP éventuel de l'erreur
    // typée sert à distinguer un quota dépassé (429, jamais de bascule
    // automatique côté client) d'une indisponibilité générique (le
    // reste, code >= 500, bascule automatique vers le modèle local).
    console.error(
      'Appel au relais IA échoué :',
      erreur instanceof Error ? erreur.name : 'erreur inconnue',
    )
    const statut = erreur instanceof ErreurFournisseurIA ? erreur.statutHttp : null
    if (statut === 429) return reponseJson({ erreur: 'quota_depasse' }, 429, entetesCors)
    return reponseJson({ erreur: 'fournisseur_indisponible' }, 502, entetesCors)
  }
}

function jetonValide(request: Request, jetonAttendu: string): boolean {
  const entete = request.headers.get('Authorization')
  return entete === `Bearer ${jetonAttendu}`
}

async function lireEtValiderCorps(request: Request): Promise<CorpsRequeteRelais> {
  let brut: unknown
  try {
    brut = await request.json()
  } catch {
    throw new Error('Corps JSON invalide.')
  }
  if (typeof brut !== 'object' || brut === null) throw new Error('Corps JSON invalide.')
  const c = brut as Record<string, unknown>

  if (c.mode !== 'chat_normatif' && c.mode !== 'audit_simule') {
    throw new Error("Champ 'mode' invalide — attendu 'chat_normatif' ou 'audit_simule'.")
  }
  if (typeof c.question !== 'string' || c.question.trim().length === 0) {
    throw new Error("Champ 'question' manquant ou vide.")
  }
  if (typeof c.contenu_joint !== 'boolean') {
    throw new Error("Champ 'contenu_joint' manquant ou invalide.")
  }
  if (c.contenu_joint && (typeof c.contenu !== 'string' || c.contenu.trim().length === 0)) {
    throw new Error("Champ 'contenu' manquant alors que 'contenu_joint' vaut true.")
  }

  return {
    mode: c.mode,
    question: c.question,
    contenu_joint: c.contenu_joint,
    ...(c.contenu_joint ? { contenu: c.contenu as string } : {}),
  }
}

function reponseJson(corps: unknown, status: number, entetes: Record<string, string>): Response {
  return new Response(JSON.stringify(corps), {
    status,
    headers: { ...entetes, 'Content-Type': 'application/json' },
  })
}
