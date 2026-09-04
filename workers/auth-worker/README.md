# Worker d'authentification — Cloudflare Worker + D1 (TD-046)

Troisième relais serverless sans état applicatif propre (même pattern que
`workers/ocr-relay/`, TD-001), adossé à **Cloudflare D1** (SQLite managé,
palier gratuit) pour les 3 seules choses qui exigent structurellement un
point de vérité serveur : comptes utilisateurs, roster `Client` (nécessaire
pour qu'un admin voie réellement tous les clients de l'organisation), et
journal d'audit. `Project`/`Section`/gabarits/dossiers vivants restent
IndexedDB + synchronisation GitHub (TD-005), inchangés par ce lot.

Voir `docs/convergence/TECHNICAL_DECISIONS.md` TD-046 pour la décision
complète et `docs/convergence/ARCHITECTURE_CONFLICTS.md` CONFLICT-001/
CONFLICT-004 pour le contexte.

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

## Ce qui NE PEUT PAS être fait depuis une session Claude Code distante

Cette session n'a pas accès au compte Cloudflare de l'utilisateur — comme
pour `workers/ocr-relay/`, les étapes suivantes restent **à faire par
l'utilisateur** :

1. **Créer la base D1** :
   ```
   cd workers/auth-worker
   npm install
   wrangler login
   wrangler d1 create validapharm-auth
   ```
   Copier le `database_id` renvoyé dans `wrangler.toml` (remplace
   `REMPLACER_PAR_L_ID_REEL_APRES_wrangler_d1_create`).

2. **Appliquer le schéma** :
   ```
   npm run migrate:remote
   ```
   (`npm run migrate:local` pour tester avec `wrangler dev` en local
   d'abord, recommandé avant le déploiement réel.)

3. **Configurer les secrets** (jamais commités) :
   ```
   wrangler secret put JWT_SECRET          # chaîne aléatoire longue, ex. openssl rand -base64 48
   wrangler secret put BOOTSTRAP_TOKEN     # jeton à usage unique pour créer le premier admin
   wrangler secret put CORS_ORIGIN_AUTORISE   # origine exacte de la PWA déployée, jamais '*'
   ```

4. **Déployer** :
   ```
   wrangler deploy
   ```

5. **Créer le premier compte admin** (une seule fois — l'endpoint refuse
   tout second appel une fois un compte existant) :
   ```
   curl -X POST https://<votre-worker>.workers.dev/auth/bootstrap-admin \
     -H "Content-Type: application/json" \
     -d '{"email":"vous@exemple.com","motDePasse":"...","nom":"...","prenom":"...","jetonBootstrap":"<BOOTSTRAP_TOKEN>"}'
   ```

6. **Vérifier la joignabilité réseau réelle** depuis le poste professionnel
   de l'utilisateur — même méthode que AR-R-64 (relais IA) : charger
   `https://<votre-worker>.workers.dev/auth/me` (401 attendu sans jeton,
   ce qui confirme que le Worker répond) depuis ce poste.

7. **Configurer l'URL du Worker déployé** dans l'installation ValidaPharm
   — écran « Configuration de l'authentification » (route
   `/configuration-authentification`), accessible avant connexion,
   même principe que `useConnexionRelaisIAStore`.

## Limites assumées (TD-046)

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
