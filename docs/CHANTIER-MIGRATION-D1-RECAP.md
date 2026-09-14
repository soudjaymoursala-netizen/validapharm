# Chantier « migration D1 » — toutes les données disponibles peu importe l'appareil

**Ce fichier est la mémoire de ce chantier précis.** Il ne remplace ni
`docs/CONTEXTE-REPRISE-SESSION.md` (état global du projet) ni
`docs/CHANTIER-PAGES-RECAP.md` (chantier fonctionnel/UI écran par écran, en
cours en parallèle) — il sert uniquement à ce que n'importe quelle session
Claude reprenne exactement où la précédente s'est arrêtée sur ce sujet précis.

**Règle pour toute nouvelle session qui reprend ce chantier** : lire ce
fichier en entier avant d'agir, en particulier §3 (inventaire et état
d'avancement) et §4 (prochaine action).

---

## 1. Décision (12-14/09/2026, demande explicite de l'utilisateur)

Constat : la quasi-totalité des données métier de l'outil (~40 tables Dexie)
ne vit **que** dans IndexedDB du navigateur — aucune disponibilité garantie
d'un appareil à l'autre. Seuls quelques domaines sont déjà réellement
côté serveur (comptes clients, authentification, config dépôt GitHub/Relais
IA/Drive, documents de la Bibliothèque de normes — tous sur Cloudflare D1,
plus R2 pour les documents). Le dépôt GitHub dédié, présenté depuis le
cadrage comme "source de vérité", ne reçoit en réalité qu'un
export manuel de deux tables (`projects`/`sections`, voir
`useSynchronisationStore.ts`) — tout le reste (Structure Système, ACFC,
Parameter/CPP/CQA, QualityEvent, Test/Execution/Evidence, Missions,
Source Intelligence, ContentPlan, Organization/Workspace, domaine AI,
Procedure, RiskAssessment, etc.) n'a **aucune** sauvegarde du tout.

**Décision de l'utilisateur** : Cloudflare D1 devient la source de vérité
pour toutes ces données (même patron que les migrations déjà faites :
Worker + D1, jamais IndexedDB seul) ; le dépôt GitHub reste en synchronisation
« au cas où » (sauvegarde secondaire), généralisé à tous les domaines migrés,
pas seulement projects/sections.

**Ce que ça implique concrètement, par domaine migré** :
1. Migration D1 (table(s) + index).
2. Repo Worker (interface + implémentation mémoire pour les tests + implémentation D1), même patron que `documentsNormatifsRepo`/`parametresInstallationRepo`.
3. Routes `auth-worker` (CRUD authentifié, scoping `client_id` vérifié contre le compte connecté comme pour `/clients`).
4. `AuthApiClient` : méthodes correspondantes.
5. Store Pinia du domaine : bascule de `db.<table>` vers l'API — jamais les deux en parallèle une fois la bascule faite (pas de double écriture qui pourrait diverger).
6. Suppression de la table Dexie correspondante (migration de schéma `null`, même discipline que les migrations v32/v33 déjà faites) — **seulement après** avoir vérifié qu'aucune donnée réelle utilisateur n'existe encore dessus qui serait perdue (le filet de sécurité `documentsNormatifsAMigrer` — capturer avant suppression, réinjecter côté serveur au premier chargement — est le patron à reproduire si des données réelles existent déjà en local).
7. `useSynchronisationStore` étendu pour inclure ce domaine dans l'export/import GitHub (lit désormais depuis l'API pour ce domaine, plus depuis Dexie).
8. Tests réels (jamais de mock de la logique testée elle-même), typecheck, lint, suite complète verte.
9. Commit + push + PR + CI verte + merge + migration D1 appliquée en production + vérification du code déployé (mêmes réflexes que les chantiers précédents de cette session).

**Ordre des phases** : dépendances d'abord (Organization/Workspace, référencé
par beaucoup), puis Structure Système (priorité utilisateur — sujet des
nœuds à reprendre juste après), puis le reste par ordre d'usage réel
décroissant.

---

## 2. Méthodologie (reprise à l'identique des migrations déjà faites)

- **Jamais de Big Bang** : un domaine migré = un commit/PR distinct,
  jamais mélangé avec un autre domaine ni avec un correctif fonctionnel
  sans rapport (même discipline que `docs/CHANTIER-PAGES-RECAP.md`).
- **Scoping `client_id`** : toute route Worker sur une donnée `client_id`
  doit vérifier que l'utilisateur connecté a accès au client concerné
  (même garde que `/clients/:id`, `peutVoirClient`) — jamais une simple
  vérification d'authentification sans vérification d'appartenance.
- **Jamais de perte de données existantes** : si des utilisateurs réels
  (l'utilisateur final de l'outil) ont déjà des données sur ce domaine en
  IndexedDB au moment de la migration, capturer avant suppression de la
  table Dexie et les migrer automatiquement vers le serveur au premier
  chargement (patron déjà validé : `documentsNormatifsAMigrer`).
- **GitHub reste secondaire, jamais bloquant** : un échec de synchronisation
  GitHub ne doit jamais empêcher l'utilisation normale de l'outil (D1 est la
  source de vérité réelle) — la sync GitHub est un filet de secours
  consultable/déclenchable, pas un chemin critique.
- Avant de considérer une phase terminée : `npm run lint`,
  `npm run typecheck`, `npx vitest run` (racine) et
  `cd workers/auth-worker && npx vitest run` verts.

---

## 3. Inventaire complet des tables Dexie et état d'avancement

Légende : ✅ déjà sur D1 (avant ce chantier) · 🔧 en cours · ⬜ pas commencé
· 🟦 reste local délibérément (voir justification)

| Domaine / table(s) Dexie | Cible | État |
|---|---|---|
| `clients` | D1 (déjà fait, Phase 39) | ✅ |
| `connexionAuthentification`/`sessionAuthentification` | D1 (session, déjà fait) | ✅ |
| Config dépôt GitHub/Relais IA/Drive normes (`parametres_installation`) | D1 (déjà fait) | ✅ |
| Documents Bibliothèque de normes (D1+R2, déjà fait) | D1+R2 | ✅ |
| `assetHierarchySchemas`, `assetNodes` (Structure Système) | D1 | ✅ **Phase 1 terminée (14/09/2026)** — PR #39 mergée, migration 0004 appliquée en production D1, déploiement Worker vérifié |
| `organizations`, `workspaces` | D1 | ✅ **Phase 2 terminée (14/09/2026)** — PR #40 mergée, migration 0005 appliquée en production D1, déploiement Worker vérifié |
| `projects` | D1 (+ GitHub déjà en place, à conserver) | ✅ **Phase 3a terminée (14/09/2026)** — voir §6 |
| `sections` | D1 (+ GitHub déjà en place, à conserver) | 🔧 **Phase 3b — code complet, PR en cours** — voir §7 |
| `projectDocuments` (D1+R2, contenu binaire) | D1+R2 | ⬜ Phase 3c |
| `methodProfilesACFC`, `evaluationsACFC` | D1 | ⬜ Phase 4 |
| `parameters`, `classificationsCriticiteParametre`, `cpps`, `cqas` | D1 | ⬜ Phase 4 |
| `methodProfilesImpactAssessment`, `evaluationsImpactAssessment`, `evaluationsCSVAssessment` | D1 | ⬜ Phase 4 |
| `methodProfilesRiskAssessment`, `risksAssessment` | D1 | ⬜ Phase 4 |
| `processes`, `fonctionsActif`, `associationsFonctionAssetNode`, `associationsFonctionProcess`, `manufacturingContexts` | D1 | ⬜ Phase 5 |
| `qualityEvents`, `referencesQualityEvent` | D1 | ⬜ Phase 5 |
| `requirements`, `testObjectives`, `testCandidates`, `tests`, `couvertures` | D1 | ⬜ Phase 6 |
| `executions`, `executionSteps`, `measurements`, `executionEvents` | D1 | ⬜ Phase 6 |
| `evidences`, `evidenceLocations`, `provenanceLinks` | D1 | ⬜ Phase 6 |
| `sources`, `sourceVersions`, `sourceLocations`, `extractions`, `extractionItems`, `knowledgeItems`, `confirmations`, `knowledgeRelations`, `conflicts` | D1 | ⬜ Phase 7 |
| `contentPlans` | D1 | ⬜ Phase 7 |
| `connectors`, `syncJobs`, `externalReferences` | D1 | ⬜ Phase 7 |
| `missions`, `activities`, `dependencies`, `associationsMissionQualityEvent` | D1 | ⬜ Phase 8 |
| `contextSnapshots`, `contextSnapshotItems` | D1 | ⬜ Phase 8 |
| `aiConfigurations`, `aiRequests`, `aiResponses`, `citationsAIResponse` | D1 | ⬜ Phase 8 |
| `relationsTechniques` | D1 (avec Structure Système, Phase 1) | ✅ Phase 1 terminée, même état que la ligne ci-dessus |
| `procedures`, `procedureSteps` | D1 | ⬜ Phase 9 |
| `gabaritsExportClient` | D1 | ⬜ Phase 9 |
| `aiChatSessionLogs` | D1 | ⬜ Phase 9 |
| `connexionDrive`, `etatMiroirDrive` (miroir Drive par client) | D1 | ⬜ Phase 9 |
| `connexionRelaisOCR` | D1 (même patron que Relais IA) | ⬜ Phase 9 |
| `clientConfigs` | D1 | ⬜ Phase 9 |
| `profilLocal` | 🟦 reste local — verrou de confirmation propre à **cet appareil** (mot de passe de confirmation d'archivage), pas une donnée métier à partager ; à documenter comme tel, pas un oubli |
| `schemaVersion`, `etatSynchronisation` | 🟦 reste local — métadonnées techniques de ce navigateur précis (version de schéma Dexie connue, SHA GitHub connu pour la détection de conflit optimiste), sans objet côté serveur |

---

## 4. État détaillé — Phase 1 (Structure Système), au 14/09/2026

### 4.1 Ce qui est fait (code complet, tout vert localement)

1. **Migration D1** : `workers/auth-worker/migrations/0004_structure_systeme.sql`
   crée `asset_hierarchy_schemas` (clé `client_id`, `levels` en JSON),
   `asset_nodes` (id, `client_id` indexé, tous les champs métier dont
   `qualification_status`/`periodic_qualification`/`audit_log` en JSON) et
   `relations_techniques` (id, `client_id` indexé, type/source/cible).
   **Pas encore appliquée en production** (pas encore passée par
   `mcp__Cloudflare_Developer_Platform__d1_database_query`, même étape que
   pour les migrations 0001-0003).
2. **Repo Worker** : `workers/auth-worker/src/repos/structureSystemeRepo.ts`
   (interface + `StructureSystemeRepoMemoire`) et
   `.../repos/d1/d1StructureSystemeRepo.ts` (implémentation D1, utilise
   `D1Database.batch()` — ajouté à `d1Types.ts` — pour l'insertion en lot
   atomique lors d'un import de hiérarchie).
3. **Routes `auth-worker`** (`routeur.ts`) : 7 routes sous
   `/clients/:clientId/structure-systeme/...` (schéma GET/PUT, nœud
   POST/PATCH, nœuds en lot POST, migration locale→serveur POST dédiée à
   fidélité complète, relation technique POST) — toutes protégées par
   `exigerAccesClient()` (même garde `peutVoirClient` que le reste). Point
   notable documenté dans le code : `SaisieCreationNoeud.id` est optionnel et
   honoré **uniquement** par la route en lot (jamais par la création d'un
   nœud seul) — nécessaire pour que le chaînage `parent_id` entre nœuds tout
   juste créés dans un même import (SAP/XLSX) reste valide, l'id étant déjà
   attribué côté client par la planification pure
   (`preparerImportHierarchie(Sap)`) avant tout appel réseau.
4. **Fidélité de migration GxP** : route dédiée
   `POST .../noeuds/migration-locale` qui accepte l'`AssetNode` complet
   tel quel (jamais une recréation via la route d'import en lot, qui aurait
   remis `source: 'import_fichier'`, réinitialisé
   `qualification_status` et fabriqué un nouvel `audit_log` — interdit par
   ALCOA+ : un statut de qualification est un état métier réel, jamais une
   simple métadonnée soft comme l'avait été `uploadedAt` lors de la
   migration `documentsNormatifsAMigrer`).
5. **`AuthApiClient`** : méthodes `obtenirStructureSysteme`,
   `enregistrerSchemaHierarchie`, `creerNoeud`, `creerNoeudsEnLot`,
   `modifierNoeud`, `creerRelationTechnique`, `migrerNoeudsLocaux`.
6. **`useStructureSystemeStore`** entièrement réécrit (même API publique) :
   toute la logique métier déjà testée (unicité de code, absence de cycle,
   niveau référencé non renommable/supprimable) reste côté client, seule la
   persistance passe par l'API. `charger()` dégrade gracieusement vers un
   état vide (jamais une exception non gérée) aussi bien en l'absence de
   session **qu'en cas de panne réseau réelle** (`try/catch` autour de
   `api.obtenirStructureSysteme`, même discipline que
   `useClientsStore.obtenirClient`) — correctif ajouté pendant cette session
   en écrivant les tests de panne de connectivité (voir §4.2).
7. **Filet de sécurité de migration locale** : capture Dexie v34
   (`persistance/db.ts`, tables `assetHierarchySchemas`/`assetNodes`/
   `relationsTechniques` supprimées, données capturées dans les tableaux
   exportés `assetHierarchySchemasAMigrer`/`assetNodesAMigrer`/
   `relationsTechniquesAMigrer`) + `migrerStructureSystemeLocaleVersServeur()`
   appelée au début de `charger()`, retry-safe (ne retire une entrée de la
   file qu'après confirmation serveur).
8. **Ripple effect** : les ~12 fichiers qui accédaient directement à
   `db.assetNodes`/`db.assetHierarchySchemas`/`db.relationsTechniques`
   (1 fichier de production — `useReasoningEngineStore.ts`, corrigé pour
   charger via le store plutôt que Dexie directement — et 11 fichiers de
   test) sont tous corrigés : la plupart n'avaient qu'un `.clear()` à
   retirer, mais plusieurs ont nécessité un vrai câblage
   `installerFauxWorkerAuth()` + création d'un client réel (`ctx.clientsRepo.
   creer(...)`) + seed via `ctx.structureSystemeRepo` (les nœuds ne sont
   plus purement locaux : un test qui les seedait directement dans Dexie
   doit maintenant passer par le dépôt en mémoire du faux Worker, exactement
   comme le ferait un vrai navigateur face au vrai Worker) :
   `ContentPlan.test.ts`, `DossierVivantActif.test.ts`,
   `EditeurSection.liensStructurels.test.ts`, `StructureSysteme.test.ts`,
   `SuiviPeriodicite.test.ts`, `structureSysteme.test.ts` (store),
   `useReasoningEngineStore.test.ts` — plus
   `AssistantStrategieQualification.test.ts`, `ListeMissions.test.ts`,
   `MissionWorkspace.test.ts`, `JournalAnomalies.test.ts` (simple retrait de
   `.clear()`).
9. **Deux scénarios de test devenus obsolètes par la migration, réécrits**
   (jamais juste ignorés) :
   - `SuiviPeriodicite.test.ts` et `StructureSysteme.test.ts` avaient chacun
     un test "Worker injoignable pour le nom du client n'empêche pas
     l'affichage (purement local)" — prémisse fausse depuis cette
     migration : les nœuds ne sont plus purement locaux, donc une panne
     réseau empêche réellement leur affichage. Réécrits pour vérifier la
     dégradation gracieuse réelle (jamais de crash, écran vide explicite,
     titre replié sur l'id brut du client) plutôt que l'ancien comportement
     devenu impossible.
   - `structureSysteme.test.ts` avait un test "refuse une relation entre
     deux nœuds de clients différents" qui exploitait le fait que
     `store.noeuds` accumulait autrefois les nœuds de plusieurs appels
     `charger()` successifs sur la même instance de store — un artefact de
     test, pas un vrai scénario utilisateur (`charger(clientId)` ne charge
     jamais qu'un seul client à la fois, jamais un mélange). Réécrit pour
     vérifier le comportement réel et sécurisé : un nœud d'un autre client
     est traité comme introuvable, jamais distingué (même discipline que
     `peutVoirClient` côté Worker, qui renvoie déjà `noeud_introuvable`
     dans les deux cas plutôt que de révéler l'existence d'un nœud chez un
     autre client).
10. **Validation complète** (14/09/2026) : `npm run typecheck` (racine, 0
    erreur — y compris le correctif du `@types/jsdom` manquant en
    `node_modules` malgré sa présence dans `package.json`, réglé par un
    simple `npm install`), `npm run lint` (0 erreur/warning),
    `npx vitest run` racine (**1210/1210 tests verts**),
    `cd workers/auth-worker && npx vitest run` (**83/83 tests verts**).

### 4.2 Phase 1 — terminée (14/09/2026)

1. ✅ Commit + push de l'incrément sur `claude/contexte-reprise-session-tin77u`.
2. ✅ PR #39 ouverte, CI verte (la panne connue `Workers Builds:
   validapharm-auth-worker` hors `main` a été confirmée sans rapport avec
   ce diff — commentaire de statu quo posté, même précédent que #19/#24-28),
   mergée sur `main` (squash, commit `79bd200`).
3. ✅ Migration `0004_structure_systeme.sql` appliquée en production D1
   (`validapharm-auth`) via `mcp__Cloudflare_Developer_Platform__d1_database_query`
   — tables `asset_hierarchy_schemas`/`asset_nodes`/`relations_techniques`
   confirmées présentes (`sqlite_master`).
4. ✅ Code déployé vérifié sur le Worker en production
   (`mcp__Cloudflare_Developer_Platform__workers_get_worker_code`,
   `validapharm-auth-worker`) : routes `/clients/:clientId/structure-systeme/...`
   et `structureSystemeRepo: new D1StructureSystemeRepo(env.DB)` bien présents.
5. ⬜ **Reste un vrai manque, assumé et reporté** : GitHub sync (§1) —
   `useSynchronisationStore` ne couvre toujours que `projects`/`sections`, la
   généralisation à Structure Système (et aux autres domaines migrés) n'a
   **pas** été faite dans cette Phase 1. À traiter une fois plusieurs
   domaines migrés (éviter de réécrire `useSynchronisationStore` domaine par
   domaine si un patron générique se dégage) — pas bloquant pour démarrer la
   Phase 2 ni pour reprendre le sujet des nœuds (import SAP).

### 4.3 Phase 1 — clôturée

Terminée intégralement (§4.2). L'utilisateur a demandé d'enchaîner
directement sur toutes les phases suivantes — le sujet des nœuds (import
SAP) reste repoussé à plus tard, à sa demande explicite (14/09/2026 :
« on enchaine sur toutes les phases, on s'occupera des noeuds plus tard »).

---

## 5. État détaillé — Phase 2 (Organization/Workspace), au 14/09/2026

### 5.1 Ce qui est fait (code complet, tout vert localement)

1. **Migration D1** : `workers/auth-worker/migrations/0005_organization_workspace.sql`
   crée `organizations` (clé `id` — reprend exactement l'id du `Client`
   migré, même convention que l'ancienne implémentation Dexie) et
   `workspaces` (id, `organization_id` indexé, type/nom/parent_workspace_id).
   **Pas encore appliquée en production.**
2. **Repo Worker** : `workers/auth-worker/src/repos/organisationRepo.ts`
   (interface + `OrganisationRepoMemoire`) et
   `.../repos/d1/d1OrganisationRepo.ts` (implémentation D1).
3. **Routes `auth-worker`** : 3 routes sous `/clients/:clientId/organisation/...`
   (GET schéma+workspaces, POST migration idempotente, POST création de
   site) — toutes protégées par `exigerAccesClient()`. La route de
   migration (`gererMigrerClientVersOrganisation`) reproduit exactement la
   logique d'idempotence de l'ancienne implémentation Dexie : si
   l'`Organization` existe déjà pour ce client, renvoie son `Workspace`
   racine existant plutôt que d'en recréer un.
4. **`AuthApiClient`** : méthodes `obtenirOrganisation`,
   `migrerClientVersOrganisation`, `creerWorkspace`.
5. **`useOrganizationStore`** entièrement réécrit (même API publique) —
   changement de contrat assumé : `charger()` prend désormais un
   `clientId` obligatoire (auparavant, chargeait tous les clients d'un
   coup — incompatible avec le scoping serveur par client, même discipline
   que `useStructureSystemeStore`/Phase 1). Deux call sites mis à jour
   (`ListeMissions.vue`, `MissionWorkspace.vue`, tous deux avaient déjà
   `props.clientId` disponible). Même dégradation gracieuse sur panne
   réseau que Phase 1.
6. **Filet de sécurité de migration locale** : capture Dexie v35
   (`organizations`/`workspaces` supprimées, données capturées dans
   `organizationsAMigrer`/`workspacesAMigrer`) +
   `migrerOrganisationsLocalesVersServeur()`. Point notable : contrairement
   au Workspace racine (recréé idempotent côté serveur, l'original local
   simplement abandonné — aucune donnée utilisateur perdue, juste son id
   change), les Workspaces "site" sont recréés dans l'ordre topologique en
   remappant chaque ancien id local vers le nouvel id serveur (un site ne
   peut être recréé qu'une fois son parent déjà migré) — nécessaire pour
   préserver une hiérarchie de sites à plusieurs niveaux. Retrait
   progressif de la file uniquement après confirmation serveur de chaque
   site (jamais de retrait optimiste), même discipline que les relations
   techniques en Phase 1.
7. **Dépendance croisée corrigée** : `useStructureSystemeStore.creerNoeud()`
   vérifiait un `workspace_id` fourni via `db.workspaces.get(...)` direct
   (dépendance transitoire documentée comme telle en Phase 1, "Organization/
   Workspace pas encore migré") — remplacé par un appel à
   `api.obtenirOrganisation(clientId)` et recherche dans la liste retournée
   (scoping implicite : un workspace renvoyé pour ce client lui appartient
   forcément).
8. **Ripple effect** : 4 fichiers de test corrigés — `ListeMissions.test.ts`/
   `MissionWorkspace.test.ts` (simple retrait de `.clear()`, ces tests
   n'exercent pas Organization/Workspace directement) ;
   `useOrganizationStore.test.ts` (déjà câblé `installerFauxWorkerAuth`
   pour la création de client — seuls les appels `store.charger()` sans
   argument ont dû passer un `clientId`) ; `structureSysteme.test.ts`
   (helper `creerOrganizationEtWorkspaces` converti de `db.organizations.put`/
   `db.workspaces.bulkPut` vers `ctx.organisationRepo.creerOrganization`/
   `creerWorkspace`, même patron que Phase 1).
9. **Validation complète** (14/09/2026) : `npm run typecheck`,
   `npm run lint` (0 erreur/warning), `npx vitest run` racine
   (**1218/1218 tests verts**), `cd workers/auth-worker && npx vitest run`
   (**91/91 tests verts**).

### 5.2 Phase 2 — terminée (14/09/2026)

1. ✅ Commit + push de l'incrément sur `claude/contexte-reprise-session-tin77u`.
2. ✅ PR #40 ouverte, CI verte (même panne connue `Workers Builds:
   validapharm-auth-worker` hors `main`, commentaire de statu quo posté,
   même précédent que #19/#24-28/#39), mergée sur `main` (squash, commit
   `f62ee4e`).
3. ✅ Migration `0005_organization_workspace.sql` appliquée en production
   D1 (`validapharm-auth`) — tables `organizations`/`workspaces`
   confirmées présentes (`sqlite_master`).
4. ✅ Code déployé vérifié sur le Worker en production
   (`workers_get_worker_code`, `validapharm-auth-worker`) : routes
   `/clients/:clientId/organisation/...` et
   `organisationRepo: new D1OrganisationRepo(env.DB)` bien présents.
5. ⬜ GitHub sync généralisée : toujours reportée (même manque assumé
   qu'en Phase 1, §4.2 point 5) — à traiter une fois plusieurs domaines
   migrés.

### 5.3 Prochaine action

Phase 2 close. Enchaîner directement sur la Phase 3
(`projects`/`sections`/`projectDocuments`, §3) — consigne de l'utilisateur
(14/09/2026) : enchaîner sur toutes les phases sans s'arrêter pour
demander confirmation entre chacune, le sujet des nœuds (import SAP) reste
repoussé à plus tard.

---

## 6. État détaillé — Phase 3a (`Project`), au 14/09/2026

Phase 3 (`projects`/`sections`/`projectDocuments`) est découpée en trois
sous-phases (**jamais de Big Bang**, §2) : **3a `projects`** (ce qui suit),
**3b `sections`** (store de 689 lignes, domaine le plus complexe de
l'application — révisions/workflow/signatures/generation_source/moteur de
gabarits), **3c `projectDocuments`** (contenu binaire `Blob`, nécessite R2
en miroir du patron déjà construit pour la Bibliothèque de normes). `db.projects`
était référencé directement dans 21 fichiers (vs. 12 en Phase 1, 6 en
Phase 2) — l'incrément le plus large de ce chantier à ce jour.

### 6.1 Ce qui est fait (code complet, tout vert localement)

1. **Migration D1** : `workers/auth-worker/migrations/0006_projects.sql`
   crée `projects` (20 colonnes — `sections`/`documents`/`links`/
   `shared_with`/`audit_log` en JSON, index sur `client_id` et `owner_id`).
   **Pas encore appliquée en production.**
2. **Modèle de visibilité différent des domaines déjà migrés** :
   `owner_id`/`shared_with[].userId` stockent l'**email** du compte
   (`identifiantActeurCourant()`), jamais l'id interne — un `Project` est
   visible par son propriétaire ou par partage explicite, jamais
   seulement par `client_id` (un projet peut avoir `client_id: null`).
   `ProjectsRepo.listerVisiblesPar`/`listerParClient` couvrent les deux
   usages réels (liste principale par propriété/partage ;
   `usePanneauChatStore.listerSectionsDisponibles` par client).
3. **Repo Worker** : `workers/auth-worker/src/repos/projectsRepo.ts`
   (interface + `ProjectsRepoMemoire`) et `.../repos/d1/d1ProjectsRepo.ts`
   (implémentation D1, `listerVisiblesPar` filtre côté application après
   lecture complète — même choix que `clientsRepo.listerVisiblesPar`,
   volume attendu modeste).
4. **Durcissement assumé** : contrairement à l'ancien commentaire
   `permissionsProjet.ts` (« jamais une frontière de sécurité réelle », vrai
   tant que GitHub restait la seule persistance partagée), le Worker
   applique désormais réellement `peutVoirProjetServeur`/
   `peutModifierProjetServeur` — D1 étant la seule source de vérité, c'est
   ici que l'enforcement a du sens (même durcissement que
   `peutModifierClient` en Phase 39).
5. **13 routes `auth-worker`** sous `/projects/...` (lister/obtenir/créer/
   phase/archiver/désarchiver/suspendre/reprendre/supprimer/partage
   ajout-retrait/liens ajout-retrait) + 3 routes de service :
   `POST /projects/:id/documents` et `POST /projects/:id/sections`
   (référencent un `ProjectDocument`/une `Section`, encore en IndexedDB
   local, dans `Project.documents[]`/`sections[]`) et
   `PUT /projects/:id/restauration` (écrasement sans fusion, réservée à
   `useSynchronisationStore` — restauration GitHub/conflit déjà résolu
   côté client) et `POST /projects/migration-locale` (filet de sécurité,
   idempotente par id). Toutes les mutations consignent l'acteur réel
   (JWT), **jamais** une valeur déclarée par l'appelant — les fonctions du
   store gardent leur paramètre `identiteDeclaree` par compatibilité
   d'appel (garde de confirmation UI) mais ne le transmettent plus au
   serveur.
6. **`AuthApiClient`** : `ProjectWire` + 15 méthodes (liste/obtention/
   création/cycle de vie/partage/liens/documents/sections/restauration/
   migration locale).
7. **`useProjectsStore` entièrement réécrit** (même API publique) : toutes
   les mutations passent par l'API, `projetWireVersDomaine`/
   `projetDomaineVersWireComplet` (exportées) font la conversion
   camelCase ↔ snake_case — le format déjà poussé sur GitHub reste
   snake_case, jamais renommé par cette migration.
8. **`useSynchronisationStore` partiellement réécrit** : la moitié
   `projects` de `synchroniser`/`recupererDepuisGitHub`/`analyserConflit`/
   `confirmerResolutionConflits` passe désormais par l'API
   (`listerProjets`/`restaurerProjet`/`obtenirProjet`) ; la moitié
   `sections` reste sur Dexie jusqu'à la Phase 3b.
9. **Ripple effect côté production** : `usePanneauChatStore.
   listerSectionsDisponibles` (client-scopé, via `listerProjetsClient`),
   `useProjectDocumentsStore.importerDocument` (référence désormais via
   `ajouterDocumentProjet`), `useRechercheGlobaleStore.rechercherPourClient`
   (idem), `useSectionsStore` (3 call sites : ajout de section/document au
   projet, lecture des liens pour les garde-fous de finalisation),
   `AssistantCreationLivrable.vue` (précédents du même client via
   `useProjectsStore.listerProjetsClient`, nouvelle méthode exposée).
10. **Filet de sécurité de migration locale** : capture Dexie v36
    (`projects` supprimée, données capturées dans `projectsAMigrer`) +
    `migrerProjetsLocauxVersServeur()` — envoi en un seul appel batch
    (`POST /projects/migration-locale`, idempotent par id, jamais un
    doublon même rejouée), contrairement à Organization/Workspace (Phase 2)
    aucune dépendance topologique entre projets, pas besoin de boucle
    d'ordre.
11. **21 fichiers de test corrigés** (le lot le plus large de ce chantier) :
    la majorité n'exigeait qu'un retrait de `db.projects.clear()`
    (`AccueilQueVoulezVousFaire`/`AssistantCreationLivrable`/
    `EditeurSection.liensStructurels`/`EditeurSection.
    mutationsNonVerifiees`/`FicheClient`/`FicheProjet`/`RechercheGlobale`/
    `PipelineQualification`) une fois `installerFauxWorkerAuth`/
    `connecterAdminDeTest` déjà câblés ; `sections.test.ts` et
    `synchronisation.test.ts` ont demandé une réécriture plus profonde
    (helpers `seedProjet`/`obtenirProjetDeTest` via la route
    `restaurerProjet`, seule voie qui préserve un id choisi par
    l'appelant) ; `projets-archivage.test.ts` et
    `useProjectsStore.isolation.test.ts` ont perdu leur scénario « projet
    créé hors session authentifiée » (`owner_id` replié sur l'espace
    réservé local) — devenu impossible à reproduire une fois `creerProjet`
    exigeant systématiquement un relais configuré, comme pour Structure
    Système/Organization (Phases 1/2).
12. **Validation complète** (14/09/2026) : `npm run typecheck`,
    `npm run lint` (0 erreur/warning), `npx vitest run` racine
    (**1230/1230 tests verts**), `cd workers/auth-worker && npx vitest run`
    (**104/104 tests verts**).

### 6.2 Phase 3a — terminée (14/09/2026)

1. ✅ Commit + push de l'incrément sur `claude/contexte-reprise-session-tin77u`.
2. ✅ PR #41 ouverte, CI verte (même panne connue `Workers Builds:
   validapharm-auth-worker` hors `main`, commentaire de statu quo posté,
   même précédent que #19/#24-28/#39/#40), mergée sur `main` (squash,
   commit `146433d`).
3. ✅ Migration `0006_projects.sql` appliquée en production D1
   (`validapharm-auth`) — table `projects` et ses deux index confirmés
   présents (`sqlite_master`).
4. ✅ Code déployé vérifié sur le Worker en production
   (`workers_get_worker_code`, `validapharm-auth-worker`) : `D1ProjectsRepo`,
   les 16 routes `/projects/...` et `ctx.projectsRepo` bien présents.
5. ⬜ GitHub sync généralisée : toujours reportée (même manque assumé
   qu'en Phases 1/2, §4.2/§5.2 point 5) — `projects` a déjà sa
   synchronisation (préexistante, adaptée ci-dessus), seul le reste des
   domaines migrés en manque encore.

### 6.3 Prochaine action

Phase 3a close. Enchaîner directement sur la Phase 3b (`sections`) puis
la Phase 3c (`projectDocuments` + R2) — même consigne de l'utilisateur
(14/09/2026) : enchaîner sur toutes les phases sans s'arrêter pour
demander confirmation entre chacune, le sujet des nœuds (import SAP) reste
repoussé à plus tard.

---

## 7. État détaillé — Phase 3b (`Section`), au 14/09/2026

`Section` est le domaine le plus complexe migré jusqu'ici dans ce chantier :
689 lignes de store (`useSectionsStore.ts`), machine à états du cycle de
vie, garde-fous de finalisation (liens Contexte procédé/Plan métrologie/
Plan maintenance), moteur de gabarits, génération de brouillon par
adaptation IA, discipline ALCOA+ complète sur `audit_log`/`revisions`.

### 7.1 Ce qui est fait (code complet, tout vert localement)

1. **Migration D1** : `workers/auth-worker/migrations/0007_sections.sql`
   crée `sections` (20 colonnes — `shared_with`/`meta`/`workflow`/
   `signatures`/`revisions`/`values_json`/`tables_json`/
   `generation_source`/`audit_log` en JSON, `values`/`tables` renommées
   `values_json`/`tables_json` pour écarter toute ambiguïté avec ces
   mots-clés SQL ; index sur `project_id`, `procedure_id`, `asset_node_id`).
   **Pas encore appliquée en production.**
2. **Décision de visibilité délibérément différente de `Project`** :
   contrairement à la Phase 3a (`peutVoirProjetServeur`/
   `peutModifierProjetServeur`, réellement appliqués), les routes
   `/sections/...` n'exigent qu'une authentification, jamais un contrôle
   d'appartenance à un projet précis — `Section.owner_id`/`shared_with`
   restent, comme avant cette migration, jamais une frontière de sécurité
   réelle (voir `permissionsProjet.ts`). Décision assumée plutôt qu'un
   oubli : retrouver une scoping cohérente à travers ~5 formes de requête
   différentes (par `project_id`, `procedure_id`, `asset_node_id`,
   `template_type`, ou un ensemble arbitraire d'id de projets) aurait été
   un chantier de durcissement spéculatif distinct de ce qui était demandé,
   et le régime d'accès reste identique à l'ancienne table Dexie unique
   (accessible sans restriction à quiconque avait accès à l'application) —
   pas une régression.
3. **Repo Worker** : `workers/auth-worker/src/repos/sectionsRepo.ts`
   (interface + `SectionsRepoMemoire`) et
   `.../repos/d1/d1SectionsRepo.ts` (implémentation D1).
4. **Collision de route évitée** : `POST /projects/:id/sections` existait
   déjà depuis la Phase 3a (`gererAjouterSectionProjet` — référence un id
   de section dans `Project.sections[]`, jamais le contenu de la section,
   consommé par `TableauDeBord.vue`) — la création réelle d'une section
   utilise donc `POST /sections` (id de projet dans le corps), un chemin
   distinct, jamais de collision avec la route Phase 3a inchangée.
5. **8 routes `auth-worker`** sous `/sections/...` (lister toutes/lister
   par projet/obtenir/créer/remplacer) + 2 routes de service :
   `PUT /sections/:id/restauration` (écrasement sans fusion, réservée à
   `useSynchronisationStore` — même patron que
   `PUT /projects/:id/restauration`) et
   `POST /sections/migration-locale` (filet de sécurité, idempotente par
   id — l'existant côté serveur gagne toujours, contrairement à la route
   de restauration qui écrase toujours ; même patron que
   `POST /projects/migration-locale`).
6. **`AuthApiClient`** : `SectionWire` + 6 méthodes (liste toutes/liste par
   projet/obtention/création/remplacement/restauration/migration locale).
7. **`useSectionsStore` entièrement réécrit** (même API publique) : toute
   la logique métier déjà testée (machine à états, garde-fous de
   finalisation, discipline ALCOA+ sur `audit_log`/`revisions`) reste côté
   client, seule la persistance passe par l'API.
   `sectionWireVersDomaine`/`sectionDomaineVersWire` (exportées) font la
   conversion camelCase ↔ snake_case. `chargerSectionsDuProjet` dégrade
   gracieusement vers un tableau vide (jamais une exception non gérée),
   même discipline que `useProjectsStore.chargerProjets` ; les mutations
   lèvent si le relais n'est pas configuré, même discipline que
   `useProjectsStore` pour ses propres mutations.
8. **`useSynchronisationStore` entièrement réécrit** : la moitié
   `sections` de `synchroniser`/`recupererDepuisGitHub`/`analyserConflit`/
   `confirmerResolutionConflits` passe désormais par l'API
   (`listerToutesLesSections`/`restaurerSection`/`obtenirSection`) — les
   deux moitiés (`projects`/`sections`) passent maintenant par l'API,
   Dexie n'intervient plus que pour `etatSynchronisation` (métadonnées
   locales de synchronisation, jamais une donnée métier).
9. **Ripple effect côté production** : `usePanneauChatStore` (sections
   joignables au chat + lecture d'une section précise),
   `useRechercheGlobaleStore.rechercherPourClient` (sections par ensemble
   de projets d'un client), `AssistantCreationLivrable.vue` (précédents du
   même gabarit, toutes sections puis filtrage client-side par
   `template_type`), `AccueilQueVoulezVousFaire.vue` (compte de sections du
   dernier projet actif, via le store), `RevueStructureProcedure.vue`
   (sections liées par `procedure_id`), `DossierVivantActif.vue` (sections
   liées par `asset_node_id`). Les 4 derniers utilisent
   `listerToutesLesSections` + filtrage client-side (cohérent avec la
   décision de visibilité du point 2 : aucune route scopée dédiée à ces
   requêtes transverses).
10. **Filet de sécurité de migration locale** : capture Dexie v37
    (`persistance/db.ts`, table `sections` supprimée, données capturées
    dans `sectionsAMigrer`) + `migrerSectionsLocalesVersServeur()` — appelée
    au début de `chargerSectionsDuProjet` (seul point d'entrée
    systématiquement exercé par les écrans), flushe l'intégralité de la
    file en un seul appel batch quel que soit le projet consulté.
11. **11 fichiers de test corrigés** (sur les ~14 référençant encore
    `db.sections` au début de cet incrément — `synchronisation.test.ts` et
    le commentaire historique de `RenduGabarit.vue` étaient déjà à jour) :
    `RechercheGlobale.test.ts`, `FicheProjet.test.ts`,
    `useRechercheGlobaleStore.test.ts`,
    `PipelineQualification.test.ts` n'exigeaient qu'un retrait de
    `db.sections.clear()` ; `DossierVivantActif.test.ts`,
    `EditeurSection.mutationsNonVerifiees.test.ts`,
    `EditeurSection.liensStructurels.test.ts`,
    `AccueilQueVoulezVousFaire.test.ts`,
    `RevueStructureProcedure.livrablesLies.test.ts` (celui-ci a en plus
    nécessité l'ajout de `installerFauxWorkerAuth()`/
    `connecterAdminDeTest()`, absents jusqu'ici), `AssistantCreationLivrable.
    test.ts` ont demandé l'ajout d'un helper de préparation
    (`seedSection`/`obtenirSectionDeTest`/`sectionsDuProjetDeTest`, tous via
    `AuthApiClient`) ; `sections.test.ts` (~640 lignes, le plus gros fichier
    de test du chantier) a été mécaniquement converti
    `db.sections.put(...)` → `seedSection(...)` et
    `db.sections.get(...)` → `obtenirSectionDeTest(...)`, chaque assertion
    ALCOA+/`audit_log`/`revisions` vérifiée comme lisant exactement la même
    forme de donnée qu'avant. Aucun scénario "hors session authentifiée"
    rencontré cette fois (contrairement à la Phase 3a) — les 11 fichiers
    utilisaient déjà ou utilisent désormais systématiquement
    `installerFauxWorkerAuth()`/`connecterAdminDeTest()`.
12. **Validation complète** (14/09/2026) : `npx vue-tsc --noEmit -p
    tsconfig.app.json` (0 erreur — **`-p .` seul sous-rapporte les erreurs
    dans ce dépôt, toujours utiliser `tsconfig.app.json` explicitement**),
    `npx eslint src/ --max-warnings 0` (0 erreur/warning), `npx vitest run`
    racine (**1237/1237 tests verts**),
    `cd workers/auth-worker && npx vitest run` (**103/103 tests verts**,
    dont 2 nouveaux tests pour `/sections/:id/restauration` et
    `/sections/migration-locale`).

### 7.2 Phase 3b — en cours de clôture (14/09/2026)

1. ⬜ Commit + push de l'incrément sur `claude/contexte-reprise-session-tin77u`.
2. ⬜ PR ouverte, CI verte (même panne connue `Workers Builds:
   validapharm-auth-worker` hors `main` attendue, commentaire de statu quo
   à reposter si nécessaire), à merger sur `main`.
3. ⬜ Migration `0007_sections.sql` à appliquer en production D1
   (`validapharm-auth`, database_id `5fb762ef-fe99-4e68-9086-e57126c5c2aa`).
4. ⬜ Code déployé à vérifier sur le Worker en production
   (`workers_get_worker_code`, `validapharm-auth-worker`).
5. ⬜ GitHub sync généralisée : toujours reportée (même manque assumé
   qu'en Phases 1/2/3a) — `sections` a déjà sa synchronisation (préexistante,
   adaptée ci-dessus, §7.1 point 8), seul le reste des domaines migrés en
   manque encore.

### 7.3 Prochaine action

Terminer la clôture de la Phase 3b (§7.2), puis enchaîner directement sur
la Phase 3c (`projectDocuments` + R2, contenu binaire `Blob`, miroir du
patron déjà construit pour la Bibliothèque de normes) — même consigne de
l'utilisateur (14/09/2026) : enchaîner sur toutes les phases sans
s'arrêter pour demander confirmation entre chacune, le sujet des nœuds
(import SAP) reste repoussé à plus tard.
