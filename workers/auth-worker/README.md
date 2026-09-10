# Worker d'authentification — Cloudflare Worker + D1

Troisième relais serverless sans état applicatif propre (même pattern que
`workers/ocr-relay/`), adossé à **Cloudflare D1** (SQLite managé,
palier gratuit) pour les 3 seules choses qui exigent structurellement un
point de vérité serveur : comptes utilisateurs, roster `Client` (nécessaire
pour qu'un admin voie réellement tous les clients de l'organisation), et
journal d'audit. `Project`/`Section`/gabarits/dossiers vivants restent
IndexedDB + synchronisation GitHub, inchangés par ce lot.

## Ce qui est fait dans ce commit

- `src/types.ts` : types du domaine (utilisateur, client, entrée d'audit).
- `src/motDePasse.ts` : PBKDF2-SHA-256 (mêmes paramètres que
  `src/logique-metier/securite/verrouLocal.ts` du frontend, mais exécuté
  ici côté serveur — ce qui lui donne une vraie valeur probante).
- `src/jwt.ts` : jeton de session HS256 minimal, sans dépendance externe.
- `src/repos/*` : interfaces de dépôt (utilisateurs/clients/audit) +
  implémentations en mémoire (`*Memoire`, utilisées par les tests) et D1
  (`repos/d1/*`, utilisées par le runtime réel).
- `src/routeur.ts` : toute la logique HTTP (authentification, rôles,
  visibilité des clients, suppression définitive avec justification
  obligatoire) — testée intégralement contre les dépôts en mémoire (31
  tests, `routeur.test.ts`), indépendamment du binding D1 réel.
- `src/index.ts` : câblage réel `env`/D1 → dépôts → routeur.
- `migrations/0001_init.sql` : schéma initial (`users`, `clients`,
  `audit_log`).
- `src/notifications/envoyeurEmail.ts` (+ `resendEnvoyeurEmail.ts`) : email
  de bienvenue envoyé (via [Resend](https://resend.com)) à la création d'un
  compte par un admin — contient l'adresse de connexion, l'email et le mot
  de passe initial fixé par l'admin. Un échec d'envoi n'empêche jamais la
  création du compte (`emailEnvoye: false` renvoyé à l'admin, à charge pour
  lui de communiquer les identifiants autrement dans ce cas).

### Configuration requise pour l'email de bienvenue

- Secret `RESEND_API_KEY` (`wrangler secret put RESEND_API_KEY`, jamais
  commité) — clé API d'un compte [Resend](https://resend.com).
- Variables `RESEND_FROM`/`APP_URL` dans `wrangler.toml` (`[vars]`, non
  secrètes). Par défaut `RESEND_FROM = "onboarding@resend.dev"` (domaine
  partagé Resend) — n'envoie alors que vers l'adresse du compte Resend
  lui-même, jamais vers de vrais utilisateurs (limite anti-spam du web, pas
  de l'outil). Pour envoyer à de vrais destinataires : vérifier un domaine
  propre dans Resend (Domains → Add Domain → enregistrements DNS
  TXT/CNAME fournis par Resend), puis changer `RESEND_FROM` pour une
  adresse sur ce domaine (ex. `invitations@votredomaine.com`).

## Déploiement — historique et état réel

Initialement écrit en supposant aucun accès Cloudflare — le 04/09/2026,
l'utilisateur a connecté le connecteur MCP « Cloudflare Developer
Platform » à cette session, qui a alors pu réaliser les étapes 1 et 2
réellement (base D1 créée sous le compte réel de l'utilisateur, schéma
appliqué). Ce connecteur ne fournissait toutefois aucun moyen d'uploader
le code d'un Worker ni de poser un secret — les étapes 3 à 7 ont donc été
faites manuellement par l'utilisateur (`wrangler deploy` en CLI depuis son
poste), secrets compris.

1. ~~**Créer la base D1**~~ — **fait** (04/09/2026, via le connecteur MCP) :
   base `validapharm-auth`, `database_id` `5fb762ef-fe99-4e68-9086-e57126c5c2aa`,
   déjà renseigné dans `wrangler.toml`.
2. ~~**Appliquer le schéma**~~ — **fait** (04/09/2026, migration `0001_init.sql`
   appliquée statement par statement via le connecteur MCP) : tables
   `users`/`clients`/`audit_log` + les 2 index existent réellement sur la
   base ci-dessus, vérifiées par une requête sur `sqlite_master`.
3. ~~**Secrets configurés**~~ — **fait** (`JWT_SECRET`, `BOOTSTRAP_TOKEN`,
   `CORS_ORIGIN_AUTORISE`), en place depuis le premier déploiement CLI.
4. ~~**Déployé**~~, ~~**premier compte admin créé**~~, ~~**joignabilité
   vérifiée**~~, ~~**URL configurée côté PWA**~~ — tout **fait**.

**Écart trouvé et corrigé le 07/09/2026** : ce Worker restait déployé
uniquement en CLI manuelle depuis sa création, jamais redéployé depuis —
contrairement à `workers/ia-relay/`, il ne recevait donc aucune des
routes/corrections ajoutées au code au fil des phases suivantes (constaté
via des `404`/`401` sur des routes pourtant présentes dans `routeur.ts`,
ex. `GET /clients/:id`). **Reconnecté à GitHub via Cloudflare Workers
Builds ce même jour** (`Settings → Builds → Git repository`, répertoire
racine `workers/auth-worker`, commande de déploiement `npx wrangler
deploy`, chemins surveillés restreints à `workers/auth-worker/**`) — même
principe que `ia-relay`, sans jamais toucher aux secrets déjà en place
(un Worker Git-connecté conserve les secrets posés côté `wrangler secret`/
dashboard, indépendamment de la méthode de déploiement). `main` redéploie
désormais ce Worker automatiquement à chaque changement dans ce
répertoire, comme `ia-relay`.

## Limites assumées

- **Pas de révocation immédiate de session** — le JWT expire après 12h,
  seule protection dans ce lot (backlog si un besoin réel de révocation
  immédiate apparaît, ex. compte compromis).
- **Dépendance réseau dure** pour tout ce qui touche `Client`/comptes —
  contrairement au reste de l'app, la liste des clients et la connexion ne
  fonctionnent plus hors-ligne. Assumé et documenté dans l'UI.
- **Suppression définitive de documents de projet** (`ProjectDocument`) :
  hors périmètre de ce lot — le point d'audit générique
  (`POST /audit/authorize-action`) est prêt à être réutilisé, mais aucun
  écran ne l'appelle encore pour cette entité.
- Le contrat D1 lui-même (`repos/d1/*`) n'est pas testé unitairement
  (nécessiterait un vrai binding D1) — seule la logique métier
  (`routeur.ts`) l'est, contre des dépôts en mémoire. À vérifier par
  l'utilisateur après déploiement (étape 6 ci-dessus).
