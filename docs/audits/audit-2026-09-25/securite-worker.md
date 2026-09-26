# Audit de sécurité du serveur ValidaPharm (Worker `auth-worker`), 25/09/2026

Périmètre : `workers/auth-worker/src/routeur.ts` (toutes les routes), `jwt.ts`, `motDePasse.ts`, `repos/d1/*`. Chaque preuve a été exécutée contre le Worker local `http://localhost:8787`. Les scripts `00-setup.mjs` à `08-signatures.mjs` sont dans ce dossier. Comptes utilisés : admin, consultant (partagé sur le client de démo, partagé **en édition** sur le projet de démo) et `audit-sec-outsider@validapharm.local`, un compte « utilisateur » créé pour l'audit, sans aucun accès.
Aucun fichier du dépôt n'a été modifié.

Ce qui tient (vérifié) : la signature HS256 est vérifiée (`alg:none` refusé avec 401). Un compte désactivé perd immédiatement l'accès (`authentifier` relit le statut en base). Toutes les requêtes D1 sont paramétrées : aucune injection SQL trouvée. Les secrets des paramètres d'installation sont masqués. Les réponses renvoient 404 sans distinguer « introuvable » de « non autorisé ». CORS est limité à une seule origine et l'authentification passe par un jeton Bearer, donc pas de CSRF. Sur les routes `/clients/:id/<x>/:itemId`, le serveur vérifie bien que `item.clientId` correspond au client de l'URL. Le partage de projet est bien limité au propriétaire et aux admins (403 vérifié).

---
## A. Constats vérifiés

### C1. CRITIQUE : signatures et workflow d'approbation des sections falsifiables (21 CFR 11.50/11.70/11.200)
- **Routes** : `POST /sections` (`routeur.ts:8898`), `PUT /sections/:id` (`:8936`), `PUT /sections/:id/restauration` (`:9015`), `POST /sections/migration-locale` (`:8974`).
- **Description** : le serveur enregistre la section entière envoyée par le client : `signatures.{redacteur,verificateur,approbateur}.{userId,date}`, `workflow.approverFinal/reviewers`, `status`, `auditLog`, `revisions` et `createdAt`. N'importe quel partagé en édition peut donc inscrire une signature d'approbation au nom d'un autre utilisateur, à une date au choix, sans ré-authentification.
- **Preuve** (`03-projets-sections.mjs`) : le consultant (partagé en édition) envoie `PUT /sections/<id>` avec `approbateur:{userId:"test-local@…",date:"2026-01-12"}` et `auditLog:[{actor:"test-local@…",action:"approbation"}]`. Réponse **200**. L'admin relit ensuite `approbateur: test-local@… 2026-01-12` et un journal d'audit ne contenant qu'une fausse entrée « approbation ».
- **Correctif** :
  - Ne jamais accepter `signatures`, `workflow`, `status`, `auditLog`, `revisions`, `createdAt` ni `ownerId` depuis le client : `PUT` ne fusionne que `values`, `tables`, `meta` et `language`, et le serveur ajoute lui-même l'entrée d'audit.
  - Créer une route dédiée `POST /sections/:id/signatures/:role` qui exige le mot de passe dans le corps (vérifié côté serveur). Le signataire est l'utilisateur authentifié, l'horodatage est celui du serveur, la signification est stockée avec un hash SHA-256 du contenu signé. Le serveur vérifie que la personne a bien le rôle attendu dans le workflow et que le vérificateur/approbateur n'est pas l'auteur.
  - Refuser toute modification de contenu d'une section signée ou approuvée : il faut créer une nouvelle révision.

### C2. CRITIQUE : routes de migration et de restauration qui acceptent des enregistrements complets (historique, statut, verdict et attribution falsifiables, ALCOA+)
- **Routes** :
  - Les 22 routes `POST /clients/:id/*/migration-locale`, dont `structure-systeme/noeuds` (`:2614`), `test-definition` (`:4642`), `executions` (`:4977`), `acfc`, `parameters`, `risk-assessment`, `quality-events`, `evidences`, `knowledge-engine`, `content-plans`, `missions`, `context-snapshots`, `reasoning-engine`, `procedures` et `ai-chat-session-logs`.
  - `POST /projects/migration-locale` (`:8368`) et `PUT /projects/:id/restauration` (`:8236`).
  - `PUT /clients/:id/config` (`:7906`, qualification de fiabilité IA fournie par le client).
  - Seule condition exigée : avoir accès au client. Les routes restent ouvertes en permanence et rien n'est consigné dans le journal central.
- **Preuve** (`02-alcoa.mjs`, `03-…`) :
  - Le consultant migre un nœud `qualificationStatus:"qualifie"` avec `auditLog` = « création 2024-01-15 / qualification approuvée (signature QA) » par `test-local@…`. Réponse **201**, relue telle quelle par l'admin.
  - Même chose pour un test `statut:"approuve"` et une exécution `statut:"terminee", verdict:"conforme", executant:"test-local@…"`, datés de 2024. Réponse **200**.
  - `GET /admin/audit` ne mentionne rien.
  - Le consultant, simple partagé en édition, appelle `PUT /projects/P2/restauration` avec `auditLog` réduit à une seule entrée de 2020. Réponse **200**. Avant : 2 entrées réelles. Après : `[{"timestamp":"2020-01-01…","actor":"test-local@…","action":"création"}]`, soit un historique effacé et réécrit.
  - Aggravant, empoisonnement : un nœud migré avec `auditLog:null` et un statut hors domaine est accepté (201). Tout `PATCH` ultérieur sur ce nœud renvoie ensuite **500**, de façon permanente (il n'existe aucune route de suppression de nœud).
- **Correctif** :
  - Fermer ces routes, puisque la migration est terminée (feature flag désactivé par défaut). À défaut, les réserver à l'admin, en usage unique par client, et consigner chaque appel dans `audit`.
  - Côté serveur, ajouter systématiquement une entrée « importé par X le T (données d'origine non vérifiées) » et valider chaque champ (énumérations, types, `auditLog` sous forme de tableau).
  - Restauration : ne jamais remplacer `auditLog`, `createdAt`, `ownerId`, `statut`, `phase` ni `archivedAt`. On garde l'existant, on applique seulement le contenu éditable et on ajoute une entrée d'audit.

### M1. MAJEURE : tout compte authentifié peut remplacer le binaire (et renommer) n'importe quel document normatif
- **Routes** : `PUT /documents-normatifs/:id/contenu` (`:10054`), `PATCH /documents-normatifs/:id` (`:10092`).
- **Description** : aucune vérification de rôle ni d'état : la « réparation » n'est pas limitée aux documents dont le contenu est vide. Le `Content-Type` est choisi par l'appelant, `uploadedBy` reste celui de l'auteur d'origine (attribution faussée) et aucune version n'est conservée. Pourtant, la suppression est bien réservée à l'admin (403 vérifié) : remplacer le contenu revient à supprimer le document et à le falsifier.
- **Preuve** (`01-normes.mjs`) : l'admin crée « Annexe 11 » en PDF. L'outsider, sans aucun client, envoie `PUT …/contenu` avec `Content-Type: text/html` : **200**. Il renomme aussi le document : **200**. Sa tentative de `DELETE` renvoie bien **403**. L'admin relit ensuite `200 text/html <html><script>alert(1)</script>FALSIFIE</html>`, alors que `uploadedBy` pointe toujours sur l'admin.
- **Correctif** :
  - Réserver ces deux routes à l'admin ou à l'uploader d'origine, et refuser la réparation si l'objet R2 existe et n'est pas vide.
  - Imposer une liste blanche de `Content-Type`, conserver la version précédente (clé R2 versionnée) avec son hash SHA-256, et enregistrer `updatedBy`.
  - Ajouter `X-Content-Type-Options: nosniff` sur `/contenu`.

### M2. MAJEURE : un partagé en édition peut distribuer des droits, et l'accès aux sections survit à la révocation
- **Routes** : `POST /sections` (`:8898`), `POST /sections/migration-locale` (`:8974`), `droitsSection` (`:8098`).
- **Description** : à la création, `ownerId` et `sharedWith` sont libres. De plus, `droitsSection` accorde lecture et écriture au propriétaire ou à un partagé de la section, même quand il ne voit plus le projet. Cela contourne la décision « gérer le partage = créateur ou admin uniquement ».
- **Preuve** (`03-…`) :
  - Le consultant (édition) tente `POST /projects/P2/partage` : **403** (le contrôle fonctionne).
  - Il crée ensuite `POST /sections` avec `sharedWith:[{outsider, édition}]` : **201**.
  - L'outsider reçoit 404 sur le projet, mais **200** sur `GET /sections/<id>` et **200** sur `PUT /sections/<id>`.
  - Après `DELETE /projects/P2/partage/consultant`, le consultant reçoit bien 403 sur la phase du projet, mais **200** sur `PUT /sections/<id>`, et l'outsider garde **200** en lecture.
- **Correctif** :
  - À la création ou à la migration, forcer `ownerId = utilisateur.email`. N'accepter `sharedWith` que si `peutGererPartageProjet`, sinon `[]`.
  - Dans `droitsSection`, pour un non-admin, exiger que le projet soit visible (voir) et modifiable (modifier). Le partage de section doit seulement restreindre, jamais élargir, les droits hérités du projet.

### M3. MAJEURE : le relais GitHub contourne tout le cloisonnement client/projet
- **Route** : `/github/api/*` (`:9478`, `:9507`).
- **Description** :
  - La synchro écrit `data/projects/<id>.json` et `data/sections/<id>.json` pour tous les projets et toutes les sections visibles de l'utilisateur qui synchronise (tout, si c'est un admin) : `src/presentation/stores/useSynchronisationStore.ts:150-159`.
  - Le relais n'exige qu'une session : tout compte, même sans client, peut lire tout le dépôt (`contents/*`, `git/trees/<branche>?recursive=1`) et y pousser des commits (`POST git/blobs|trees|commits` puis `PATCH refs/heads/<branche>` avec `force:false`).
  - Les données piégées ainsi poussées sont ensuite restaurées avec les droits de la victime (`recupererDepuisGitHub`, puis `PUT …/restauration` : voir C2).
  - Le paramètre `?ref=` de la requête est transmis tel quel, ce qui permet de lire n'importe quelle branche ou n'importe quel commit du dépôt.
- **Preuve** (`06-relais.mjs`, configuration GitHub factice posée puis effacée) :
  - Avec la session de l'outsider, `GET …/contents/data/projects/<id>.json?ref=main`, `GET git/trees/main?recursive=1`, `POST git/commits` et `PATCH git/refs/heads/main {force:false}` renvoient **401 « Bad credentials » de GitHub**. Les requêtes ont donc passé la liste blanche et sont parties vers GitHub (seul le faux PAT a échoué).
  - Contrôles : `DELETE` ref, `force:true` et `collaborators` renvoient bien 403 `operation_github_non_autorisee`.
- **Correctif** (par ordre de préférence) :
  1. Supprimer la synchro GitHub pilotée par le navigateur, puisque D1 est désormais la source de vérité, ou la faire exécuter par le serveur à partir de D1.
  2. Sinon, réserver le relais aux admins, ou le filtrer : `contents/data/projects/<id>.json` uniquement si `peutVoirProjetServeur`, arborescences filtrées, commits construits par le serveur.
  3. Ignorer `recherche` en dehors de `ref=<branche configurée>`.

### M4. MAJEURE : le jeton Google `drive.readonly` du compte admin est distribué à tout utilisateur
- **Route** : `POST /drive-oauth/rafraichir-jeton` (`:9778`), portée `drive.readonly` (`:9634`).
- **Description** : le jeton d'accès renvoyé porte sur tout le Google Drive de l'admin qui a connecté l'application, pas seulement sur le dossier des normes. Tout compte authentifié peut l'obtenir et lire l'intégralité de ce Drive.
- **Preuve** : lecture de code. La route n'exige que `authentifier`, puis renvoie `{jeton: access_token}`. Pas exécutable localement, faute d'identifiants OAuth Google.
- **Correctif** :
  - Relayer Drive côté serveur : liste limitée à `'<dossierId>' in parents` et `files.get`/`export` seulement si le parent est ce dossier.
  - Ou passer à un compte de service ou à la portée `drive.file`, avec un seul dossier partagé.
  - Ne plus jamais renvoyer le jeton, sinon le réserver à l'admin.

### M5. MAJEURE : approbation de test sans signature électronique ni séparation des tâches
- **Routes** : `PATCH /clients/:id/test-definition/tests/:id/approuver` (`:4561`). Même constat par lecture de code pour `…/executions/:id/cloturer` (`:4923`).
- **Preuve** (`08-signatures.mjs`) : le consultant crée un test puis l'approuve lui-même. **200**, avec `auditLog` = création et approbation par `consultant@…`. Aucun mot de passe n'est demandé.
- **Correctif** : exiger `motDePasse` (vérifié côté serveur) et une signification. Refuser que l'approbateur soit l'auteur (`auditLog[0].actor` ou un champ `createdBy` serveur) et prévoir un rôle d'approbateur. Consigner l'approbation dans `audit`.

### M6. MAJEURE : la ré-authentification des actions critiques n'est faite que dans le navigateur
- **Routes** : `DELETE /clients/:id` (`:2356`), archivage `PATCH /clients/:id`. `POST /audit/authorize-action` (`:2187`) renvoie un `auditId` fictif (`:2217` : l'id généré n'est pas celui qui est consigné).
- **Description** : `ModaleSuppressionDefinitive.vue` et `ModaleConfirmationArchivage.vue` appellent `/auth/verify-password`, puis la vraie requête ne transporte aucune preuve. Un jeton volé ou une session laissée ouverte suffit donc.
- **Preuve** (`08-…`) : `DELETE /clients/<id>` avec `{justification}` seule renvoie **200**. L'`auditId` renvoyé n'apparaît pas dans `GET /admin/audit` (`false`).
- **Correctif** : ajouter `motDePasse` au corps des routes critiques et le vérifier côté serveur (ou utiliser un jeton d'élévation court, signé et à usage unique). Renvoyer l'id réellement consigné.

### M7. MAJEURE : aucune limitation de débit, et énumération des comptes par le temps de réponse
- **Routes** : `POST /auth/login` (`:1931`), `POST /auth/verify-password` (`:2023`), `POST /auth/change-password` (`:1986`).
- **Preuve** (`05-auth.mjs`) :
  - 50 connexions parallèles avec un mauvais mot de passe : `{"401":50}`, en 2,6 s, sans aucun 429 ni verrouillage.
  - 30 appels `verify-password` : tous 200, ce qui en fait un oracle de mot de passe sans limite pour un jeton volé.
  - Temps médian : **9,6 ms** pour un e-mail inconnu contre **54,6 ms** pour un compte existant. Le message d'erreur générique est donc contourné par le temps de réponse, parce que PBKDF2 n'est pas calculé pour un compte inconnu ou désactivé.
- **Correctif** :
  - Mettre en place le binding Cloudflare Rate Limiting (ou un compteur D1/KV par IP et par e-mail) avec délai progressif et verrouillage temporaire, sur les trois routes.
  - Pour un compte inconnu ou désactivé, calculer un PBKDF2 factice avec un sel fixe.

### M8. MAJEURE : les sessions ne sont pas révoquées après un changement de mot de passe
- **Fichiers** : `jwt.ts:12` (12 h), `authentifier` (`routeur.ts:383`).
- **Preuve** (`05-…`) : après `change-password` (200), l'ancien jeton reçoit toujours **200** sur `/auth/me`. La désactivation, elle, fonctionne (401).
- **Correctif** : ajouter une colonne `session_version` (ou `password_changed_at`) incrémentée au changement de mot de passe, au changement de rôle et sur demande (déconnexion globale), puis comparée au claim du JWT. Raccourcir aussi la durée de vie (par exemple 1 h avec renouvellement).

### m1. MINEURE : fuite inter-clients de métadonnées de gabarit
- **Route** : `POST /clients/:id/gabarits-export/migration-locale` (`:7515`, `:7532`).
- **Description** : quand l'id existe déjà, la route renvoie le gabarit existant sans vérifier qu'il appartient bien à `clientId`.
- **Preuve** (`04-clients.mjs`) : l'outsider, sur son propre client, envoie l'id d'un gabarit d'un client admin qui lui est invisible (404 en contrôle). Il reçoit **201** avec `{"clientId":"758d…","nom":"audit-sec-Gabarit CONFIDENTIEL Sanofi","tagsTrouves":["{{prix_contrat}}"]}`.
- **Correctif** : `if (existant && existant.clientId !== clientId) return 409 id_conflit` (ou 404).

### m2. MINEURE : `sharedWith` d'un client non validé (déni de service ciblé et correspondance par sous-chaîne)
- **Routes** : `PATCH /clients/:id` (`:2344`), `d1ClientsRepo.ts:83`.
- **Preuve** (`04-…`) :
  - L'outsider met `sharedWith:{piege:"<id du consultant>"}` sur son propre client : 200. Le consultant reçoit alors **500** sur `GET /clients` et sur `GET /projects`, jusqu'à ce que l'outsider remette la valeur.
  - Avec `sharedWith:"xx<id>yy"` (une chaîne), le consultant voit le client, car `String.includes` fait une correspondance par sous-chaîne.
- **Correctif** : exiger un tableau de chaînes, sans doublons, d'au plus N éléments, correspondant à des ids d'utilisateurs existants. Côté dépôt, faire `Array.isArray(...) ? ... : []` au parsing.

### m3. MINEURE : validation d'entrée lacunaire et erreurs non gérées
- **Description** :
  - Les types ne sont pas contrôlés : `POST /clients {name:123}` renvoie **500** (`:2248`).
  - Les domaines ne sont pas contrôlés : `secteur:"<img src=x onerror=…>"` est accepté avec **200**.
  - Les statuts migrés peuvent être hors énumération (voir C2).
  - Aucun `try/catch` global : les erreurs donnent une page HTML 500 sans en-têtes CORS.
- **Preuve** : `04-…` et `02-…`.
- **Correctif** : valider chaque corps par schéma (types, énumérations, longueurs) et envelopper `routerRequete` dans un `try/catch` qui renvoie `{erreur:'erreur_interne'}` en 500 avec CORS.

### m4. MINEURE : corps et réponses non bornés (déni de service, coût R2/D1)
- **Routes** : `POST /documents-normatifs` (`:9870`, tout compte), `GET /documents-normatifs` (`:9857`, renvoie le texte extrait de tous les documents), `…/noeuds/lot` (`:2524`), toutes les routes `migration-locale`.
- **Preuve** (`07-taille.mjs`) :
  - L'outsider téléverse 40 Mo de binaire et 5 Mo de texte : **201**. Aussitôt, `GET /documents-normatifs` pèse 5,2 Mo.
  - Un lot de 3 000 nœuds renvoie 201.
- **Correctif** : contrôler `Content-Length` et `Blob.size` (par exemple 25 Mo en binaire, 2 Mo en texte), limiter les lots (par exemple 500), paginer les listes et retirer `extractedText` des listes.

### m5. MINEURE : mot de passe initial envoyé en clair par e-mail
- **Emplacement** : `:2111` (`gererCreerUtilisateur`).
- **Correctif** : envoyer un lien d'activation à usage unique qui expire (par exemple sous 24 h) et imposer le changement de mot de passe à la première connexion.

### m6. MINEURE : clés étrangères du corps non vérifiées
- **Champs** : `assetNodeId`, `methodProfileId`, `parentId`, `workspaceId`, etc.
- **Preuve** : lecture de code, par exemple `gererDemarrerExecution` (`:4724`, `assetNodeId` libre), `gererCreerEvaluationAcfc` (`:2810`), `gererCreerNoeud` et `gererModifierNoeud` (`parentId`/`workspaceId` libres, `:2477`, `:2640`). On peut lier un objet à un id d'un autre client ou à un id inexistant. Pas de fuite observée, mais l'intégrité de la traçabilité est atteinte.
- **Correctif** : pour chaque id étranger, vérifier `repo.parId(id)?.clientId === clientId`.

### a1. AMÉLIORATION : relais IA ouvert à tout compte, sans quota ni borne de taille
- **Emplacement** : `:9593`, lecture de code.
- **Correctif** : quota par utilisateur, taille maximale du corps et journalisation de l'usage (coût, confidentialité).

### a2. AMÉLIORATION : `DELETE /project-documents/:id` sur un id absent de D1
- **Emplacement** : `:9338`, lecture de code.
- **Description** : la route supprime quand même les objets R2 `project-documents/<id>/*` et écrit une entrée d'audit.
- **Correctif** : répondre 404 si l'id n'existe pas.

### a3. AMÉLIORATION : jeton bootstrap comparé avec `!==`
- **Emplacement** : `:1895`.
- **Description** : comparaison non constante en temps. L'impact est faible, puisque la route devient inopérante dès qu'un compte existe.
- **Correctif** : comparaison HMAC à temps constant.

### a4. AMÉLIORATION : état OAuth Google unique pour toute l'installation
- **Emplacement** : `:9667` à `9740`.
- **Description** : l'état n'est pas lié au navigateur qui a lancé le flux, et un second admin qui démarre le flux écrase celui du premier. Impact faible (le démarrage est réservé à l'admin).
- **Correctif** : un état par admin, plus PKCE.

---
## B. À confirmer (non démontrable en local)
1. **`contents/..%2F..%2F…` via le relais GitHub** : le segment encodé passe la liste blanche et part vers GitHub (401 observé, et non 403). Il reste à vérifier, avec un vrai PAT, si GitHub décode `%2F` et normalise `..`, ce qui permettrait de sortir de `/repos/<o>/<r>/contents/` en GET. Correctif préventif : refuser `%` dans le suffixe, ou valider `decodeURIComponent` segment par segment.
2. **Suppression définitive de client** (`DELETE FROM clients` seul, aucune FK `REFERENCES clients` dans les migrations) : les données métier du client deviennent orphelines et inaccessibles à tous, admin compris, mais restent stockées. Il faut décider si c'est souhaité (rétention GxP) ou s'il faut soit supprimer en cascade, soit refuser la suppression tant que des données existent.

---
## C. Données créées pendant l'audit (environnement local)
- **Comptes** : `audit-sec-outsider@validapharm.local` (actif, environnement local jetable) et `audit-sec-temp-*@validapharm.local` (désactivé).
- **Projets, sections, clients** : projet `audit-sec-Projet P2` (2b115967-…) et sa section `audit-sec-section-*`, client `audit-sec-Client secret admin` (758d5035-…) avec son gabarit. Le client de l'outsider a été supprimé.
- **Document normatif** : `audit-sec-Annexe 11` (d24688b2-…), contenu falsifié.
- **Données dans le client de démo, que l'API ne permet pas de supprimer** : nœuds `audit-sec-node-*` et `audit-sec-node-null-*` (ce dernier bloque tout `PATCH`), environ 3 000 nœuds `audit-sec-lot-*`, tests `audit-sec-test-*` et exécution `audit-sec-exec-*`. Il faudra les purger ou remettre la base locale à zéro.
- Le paramètre `github`, configuré avec une valeur factice pendant le test, a été effacé.

---
## D. Tableau récapitulatif

| # | Gravité | Constat | Emplacement | Statut |
|---|---|---|---|---|
| C1 | Critique | Signatures et workflow des sections falsifiables | routeur.ts:8898/8936/9015 | Vérifié |
| C2 | Critique | Migrations et restauration : historique, statut, verdict et attribution forgés (ALCOA+), historique de projet effacé | routeur.ts:2614, 4642, 4977, 8236, 8368, 7906… | Vérifié |
| M1 | Majeure | Remplacement et renommage de documents normatifs par tout compte | routeur.ts:10054/10092 | Vérifié |
| M2 | Majeure | Un partagé en édition distribue des droits via une section ; accès à la section conservé après révocation | routeur.ts:8898/8098 | Vérifié |
| M3 | Majeure | Relais GitHub : lecture et écriture de tout le dépôt de synchro par tout compte | routeur.ts:9478/9507 | Vérifié |
| M4 | Majeure | Jeton `drive.readonly` du Drive entier de l'admin donné à tous | routeur.ts:9634/9778 | Vérifié (code) |
| M5 | Majeure | Auto-approbation de test sans signature | routeur.ts:4561/4923 | Vérifié |
| M6 | Majeure | Ré-authentification uniquement côté client ; `auditId` fictif | routeur.ts:2356/2217 | Vérifié |
| M7 | Majeure | Aucune limitation de débit ; énumération par le temps de réponse (9,6 ms contre 54,6 ms) | routeur.ts:1931/2023 | Vérifié |
| M8 | Majeure | JWT valide après changement de mot de passe | jwt.ts:12, routeur.ts:383 | Vérifié |
| m1 | Mineure | Fuite inter-clients de métadonnées de gabarit | routeur.ts:7532 | Vérifié |
| m2 | Mineure | `sharedWith` non typé : 500 chez une victime, correspondance par sous-chaîne | routeur.ts:2344, d1ClientsRepo.ts:83 | Vérifié |
| m3 | Mineure | Validation des types et domaines ; pas de `try/catch` global | routeur.ts:2248… | Vérifié |
| m4 | Mineure | Corps et listes non bornés | routeur.ts:9857/9870/2524 | Vérifié |
| m5 | Mineure | Mot de passe initial en clair par e-mail | routeur.ts:2111 | Vérifié (code) |
| m6 | Mineure | Clés étrangères du corps non vérifiées | routeur.ts:2810/4724/2640 | Vérifié (code) |
| a1 | Amélioration | Relais IA sans quota | routeur.ts:9593 | Vérifié (code) |
| a2 | Amélioration | `DELETE` d'un document de projet inexistant agit quand même | routeur.ts:9338 | Vérifié (code) |
| a3 | Amélioration | Comparaison non constante du jeton bootstrap | routeur.ts:1895 | Vérifié (code) |
| a4 | Amélioration | État OAuth global, sans PKCE | routeur.ts:9667 | Vérifié (code) |
| B1 | ? | `..%2F` transmis à GitHub | routeur.ts:9484 | À confirmer |
| B2 | ? | Suppression de client sans cascade | migrations/* | À confirmer |
