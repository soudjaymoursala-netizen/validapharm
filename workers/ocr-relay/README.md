# Relais OCR — Cloudflare Worker (TD-001)

Second relais serverless sans état, même pattern que le relais IA existant
(`connecteurs/ia/RelayProviderAdapter.ts`, SDS §10quater) : le navigateur
(PWA) n'appelle jamais un fournisseur de vision/OCR directement — seul ce
Worker, côté serveur, connaît la clé du fournisseur.

## Fournisseur actuel : Azure AI Vision (Read API)

Décision explicite de l'utilisateur (25/08/2026) : Azure AI Vision comme
premier fournisseur relayé — meilleur niveau gratuit au moment de la
décision (5000 transactions/mois contre 1000 chez Google Cloud Vision),
déjà approuvé par l'utilisateur au même titre que Google Cloud Vision.

**Architecture délibérément swappable** (`src/fournisseurs/FournisseurOcr.ts`) :
`ocrHandler.ts` ne connaît que l'interface `FournisseurOcr`, jamais Azure
directement. Pour ajouter/remplacer par Google Cloud Vision :

1. Créer `src/fournisseurs/googleVisionProvider.ts` implémentant
   `FournisseurOcr` (contrat REST Google Cloud Vision — à vérifier contre
   sa documentation au moment de l'implémentation, pas encore fait).
2. Changer l'unique ligne de câblage dans `src/index.ts`
   (`new AzureVisionProvider(...)` → `new GoogleVisionProvider(...)`), ou
   lire le choix depuis une variable d'environnement du Worker pour basculer
   sans redéploiement de code.

## Ce qui est fait dans ce commit

- `src/fournisseurs/FournisseurOcr.ts` : interface commune.
- `src/fournisseurs/azureVisionProvider.ts` : implémentation Azure Read API
  v3.2 (soumission + sondage asynchrone), testée (mocks `fetch`).
- `src/ocrHandler.ts` : logique HTTP (CORS, validation, gestion d'erreur —
  jamais de détail fournisseur exposé au client), testée indépendamment du
  runtime Workers réel.
- `src/index.ts` : câblage réel `env` (secrets) → fournisseur → handler.
- Intégré à la suite de qualité existante du dépôt (`npm run typecheck`,
  `npm run lint`, `npm run test` couvrent aussi ce dossier — voir
  `tsconfig.json` référencé depuis le `tsconfig.json` racine, et
  `vite.config.ts` dont `test.include` couvre `workers/**/*.test.ts`).

## Ce qui NE PEUT PAS être fait depuis une session Claude Code distante

Cette session n'a pas accès au compte Cloudflare de l'utilisateur ni à un
abonnement Azure réel — donc, comme pour CHALLENGE-002 (capacité offline
multimodale, `docs/convergence/ARCHITECTURE_CHALLENGES.md`), les étapes
suivantes restent **à faire par l'utilisateur** :

1. **Créer une ressource Azure AI Vision** (portail Azure, niveau F0
   gratuit pour commencer) et récupérer `endpoint` + clé d'abonnement.
2. **Déployer ce Worker** :
   ```
   cd workers/ocr-relay
   npm install
   wrangler login
   wrangler secret put AZURE_VISION_ENDPOINT
   wrangler secret put AZURE_VISION_KEY
   wrangler secret put CORS_ORIGIN_AUTORISE   # origine exacte de la PWA déployée, jamais '*'
   wrangler deploy
   ```
3. **Vérifier la joignabilité réseau réelle** depuis le poste professionnel
   de l'utilisateur — même méthode que AR-R-64 (relais IA) : charger l'URL
   `*.workers.dev` de ce nouveau Worker depuis ce poste et confirmer
   qu'elle répond. Ce test **ne peut être fait que sur ce poste réel**, pas
   depuis cet environnement.
4. **Vérifier le contrat Azure Read API en conditions réelles** (le code a
   été écrit à partir de la documentation Microsoft connue au 25/08/2026,
   revérifiée par recherche mais jamais appelée en vrai depuis cette
   session) — envoyer une vraie image et confirmer que la réponse a
   exactement la forme attendue par `azureVisionProvider.ts`.
5. Configurer l'URL du Worker déployé dans l'installation ValidaPharm
   (table Dexie `connexionRelaisOCR` — pas encore d'écran dédié, cohérent
   avec le reste de la Phase 6 : ce Worker prépare la brique technique dont
   les Phases 7-8 (Source Intelligence) ont besoin, il n'est pas encore
   consommé par un écran).

## Sans état (TD-001)

Aucune donnée de la requête (image envoyée, texte extrait) n'est persistée
par ce Worker au-delà du traitement de la requête en cours — pas de
binding KV/D1/R2/Durable Object. Le sondage de l'API Azure interroge Azure
lui-même, jamais un état conservé ici.
