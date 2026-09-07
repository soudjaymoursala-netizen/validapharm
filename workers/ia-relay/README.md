# Relais IA — Cloudflare Worker

Relais serverless sans état pour le chat expert et le mode audit simulé
(`09-architecture-detaillee.md` §10, `22-SDS-outil.md` §10quater) : le
navigateur (PWA) n'appelle jamais un fournisseur IA directement — seul ce
Worker, côté serveur, détient la clé du fournisseur. Même pattern exact
que le relais OCR (`workers/ocr-relay/`).

## Fournisseur : ChatGPT (OpenAI)

Choix explicite de l'utilisateur (07/09/2026) — remplace le choix initial
de conception (« Claude par défaut », `09-architecture-detaillee.md` §10).
`src/fournisseurs/claudeProvider.ts` reste dans le dépôt, non supprimé et
toujours testé, pour un retour en arrière ou un usage ultérieur sans
reconstruction.

**Architecture délibérément swappable** (`src/fournisseurs/FournisseurIA.ts`) :
`relayHandler.ts` ne connaît que l'interface `FournisseurIA`, jamais un
fournisseur concret directement. Basculer d'un fournisseur à l'autre ne
demande de changer que les deux lignes de `src/index.ts` (import +
construction) — jamais `relayHandler.ts`, jamais le contrat côté PWA.

Ce choix reste **entièrement côté serveur** — le navigateur/PWA ne connaît
et n'a jamais connu que l'URL du relais (`RelayProviderAdapter.ts`), jamais
l'identité du fournisseur final.

## Contrat requête/réponse

Identique à ce qu'envoie déjà `src/connecteurs/ia/RelayProviderAdapter.ts`
côté PWA — jamais modifié depuis ce Worker :

- Requête `POST` : `{ mode: 'chat_normatif' | 'audit_simule', question: string, contenu_joint: boolean, contenu?: string }`.
- Réponse `200` : `{ texte: string, version_moteur: string | null, citations: string[] }`
  (`citations` toujours `[]` — ce relais est un simple proxy, aucune
  vérification de citation ne s'y fait, cf. `relayHandler.ts`).
- `429` → quota/débit dépassé (jamais de bascule automatique côté client).
- `>= 500` (dont `502` fournisseur indisponible) → bascule automatique
  vers le modèle local (Ollama), gérée par `envoyerAvecBascule.ts`.
- `401` → jeton d'accès manquant/invalide (voir ci-dessous).

## Jeton d'accès

Un jeton partagé (`RELAIS_JETON_ACCES`), vérifié en
`Authorization: Bearer <jeton>`, protège le budget OpenAI contre un appel
par un tiers qui aurait deviné l'URL `*.workers.dev` du relais — celui-ci
n'est authentifié par aucun autre moyen. C'est le même jeton à saisir dans
l'écran « Configuration » → section « Relais IA » → « Jeton d'accès » de
la PWA.

## Modèle par mode d'usage

`MODELE_CHAT_NORMATIF`/`MODELE_AUDIT_SIMULE` (variables non secrètes, en
`[vars]` dans `wrangler.toml`, modifiables sans redéploiement de code) —
un chat normatif à forte volumétrie n'a pas le même profil coût/qualité
qu'un mode audit simulé à faible volumétrie mais où la qualité du débat
contradictoire multi-angles est la valeur du produit
(`22-SDS-outil.md` §10quater). Valeur par défaut actuelle : `gpt-4o` pour
les deux modes — identifiant connu au 07/09/2026, **jamais confirmé
contre le catalogue OpenAI réellement disponible au moment du
déploiement** (aucun accès à un compte OpenAI depuis cette session) : à
vérifier/ajuster dans `wrangler.toml` avant mise en production, sans
redéploiement de code nécessaire.

## Ce qui est fait dans ce commit

- `src/fournisseurs/FournisseurIA.ts` : interface commune + `ErreurFournisseurIA`
  (distingue un statut HTTP amont 429 du reste, pour que `relayHandler.ts`
  puisse traduire correctement sans jamais exposer le détail fournisseur).
- `src/fournisseurs/openaiProvider.ts` : implémentation Chat Completions
  API OpenAI, testée (mocks `fetch`) — fournisseur câblé dans `index.ts`.
- `src/fournisseurs/claudeProvider.ts` : implémentation Messages API
  Anthropic, testée, conservée mais non câblée (voir ci-dessus).
- `src/relayHandler.ts` : logique HTTP (CORS, jeton d'accès, validation du
  corps, cadrage système fixe, gestion d'erreur — jamais de détail
  fournisseur exposé au client), testée indépendamment du runtime Workers
  réel.
- `src/index.ts` : câblage réel `env` (secrets + vars) → fournisseur →
  handler.
- Intégré à la suite de qualité existante du dépôt (`npm run typecheck`,
  `npm run lint`, `npm run test` couvrent aussi ce dossier — `tsconfig.json`
  racine référencé, `vite.config.ts` dont `test.include` couvre déjà
  `workers/**/*.test.ts`).

## Ce qui NE PEUT PAS être fait depuis une session Claude Code distante

Cette session n'a pas accès au compte Cloudflare ni OpenAI de
l'utilisateur — même limite que pour `workers/ocr-relay/`, les étapes
suivantes restent **à faire par l'utilisateur** :

1. **Obtenir une clé API OpenAI** (platform.openai.com) et configurer un
   plafond de dépense **côté tableau de bord OpenAI lui-même** (limite
   mensuelle + alerte) — exigence explicite de conception
   (`22-SDS-outil.md` §10quater : « le second niveau DOIT être configuré
   avant toute mise en production, pas seulement documenté »), distincte
   du quota applicatif déjà géré côté `client_config`.
2. **Choisir un jeton d'accès fort** (ex. généré par un gestionnaire de
   mots de passe) pour `RELAIS_JETON_ACCES` — jamais un mot simple.
3. **Déployer ce Worker** :
   ```
   cd workers/ia-relay
   npm install
   wrangler login
   wrangler secret put OPENAI_API_KEY
   wrangler secret put RELAIS_JETON_ACCES
   wrangler secret put CORS_ORIGIN_AUTORISE   # origine exacte de la PWA déployée, jamais '*'
   wrangler deploy
   ```
   (`MODELE_CHAT_NORMATIF`/`MODELE_AUDIT_SIMULE` sont déjà dans
   `wrangler.toml` — à vérifier/ajuster directement dans ce fichier avant
   déploiement, voir ci-dessus, pas un secret.)
4. **Vérifier la joignabilité réseau réelle** depuis le poste professionnel
   de l'utilisateur — même méthode que pour les deux autres Workers déjà
   déployés (`validapharm-auth-worker`) : charger l'URL `*.workers.dev` de
   ce nouveau Worker et confirmer qu'elle répond.
5. **Vérifier le contrat Chat Completions API en conditions réelles** (le
   code a été écrit à partir de la documentation OpenAI connue au
   07/09/2026, jamais appelée en vrai depuis cette session) — envoyer une
   vraie question et confirmer que la réponse a exactement la forme
   attendue, et que `gpt-4o` (ou le modèle choisi) est bien disponible sur
   le compte utilisé.
6. **Configurer l'URL du Worker déployé** dans l'écran « Configuration »
   de la PWA → section « Relais IA » (URL du relais + le jeton d'accès
   choisi à l'étape 2).

## Revenir à Claude (Anthropic)

`src/fournisseurs/claudeProvider.ts` est toujours présent et testé — pour
rebasculer :

1. Dans `src/index.ts` : `import { ClaudeProvider } from './fournisseurs/claudeProvider'`
   et `new ClaudeProvider({ cleApi: env.ANTHROPIC_API_KEY })` à la place de
   `OpenaiProvider`.
2. Ajuster `Env` (`OPENAI_API_KEY` → `ANTHROPIC_API_KEY`) et
   `wrangler secret put ANTHROPIC_API_KEY` au lieu de `OPENAI_API_KEY`.
3. Ajuster les identifiants de modèle dans `wrangler.toml` (ex.
   `claude-sonnet-5`/`claude-opus-5` — à revérifier contre le catalogue
   Anthropic réellement disponible au moment du redéploiement).

## Sans état

Aucune donnée de la requête (question, document joint) ou de la réponse
n'est persistée par ce Worker au-delà du traitement de la requête en
cours — pas de binding KV/D1/R2/Durable Object. Seul le nom de l'erreur
(jamais son contenu) est loggé en cas d'échec.
