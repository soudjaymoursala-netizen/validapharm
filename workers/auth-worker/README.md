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

## Ce qui NE PEUT PAS être fait depuis une session Claude Code distante

Initialement écrit en supposant aucun accès Cloudflare — le 04/09/2026,
l'utilisateur a connecté le connecteur MCP « Cloudflare Developer
Platform » à cette session, qui a alors pu réaliser les étapes 1 et 2
réellement (base D1 créée sous le compte réel de l'utilisateur, schéma
appliqué). Ce connecteur ne fournit toutefois aucun moyen d'uploader le
code d'un Worker ni de poser un secret (`wrangler secret put` n'a pas
d'équivalent MCP disponible) — les étapes 3 à 7 restent donc **à faire
par l'utilisateur**, avec ou sans ce connecteur :

1. ~~**Créer la base D1**~~ — **fait** (04/09/2026, via le connecteur MCP) :
   base `validapharm-auth`, `database_id` `5fb762ef-fe99-4e68-9086-e57126c5c2aa`,
   déjà renseigné dans `wrangler.toml`.

2. ~~**Appliquer le schéma**~~ — **fait** (04/09/2026, migration `0001_init.sql`
   appliquée statement par statement via le connecteur MCP) : tables
   `users`/`clients`/`audit_log` + les 2 index existent réellement sur la
   base ci-dessus, vérifiées par une requête sur `sqlite_master`.

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
   de l'utilisateur — même méthode que pour le relais IA : charger
   `https://<votre-worker>.workers.dev/auth/me` (401 attendu sans jeton,
   ce qui confirme que le Worker répond) depuis ce poste.

7. **Configurer l'URL du Worker déployé** dans l'installation ValidaPharm
   — écran « Configuration de l'authentification » (route
   `/configuration-authentification`), accessible avant connexion,
   même principe que `useConnexionRelaisIAStore`.

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
