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
| `sections` | D1 (+ GitHub déjà en place, à conserver) | ✅ **Phase 3b terminée (14/09/2026)** — voir §7 |
| `projectDocuments` (D1+R2, contenu binaire) | D1+R2 | ✅ **Phase 3c terminée (14/09/2026)** — voir §8 |
| `methodProfilesACFC`, `evaluationsACFC` | D1 | ✅ **Phase 4a terminée** — voir §9 |
| `parameters`, `classificationsCriticiteParametre`, `cpps`, `cqas` | D1 | ✅ **Phase 4b terminée** — voir §10 |
| `methodProfilesImpactAssessment`, `evaluationsImpactAssessment`, `evaluationsCSVAssessment` | D1 | ✅ **Phase 4c terminée** — voir §11 |
| `methodProfilesRiskAssessment`, `risksAssessment` | D1 | ✅ **Phase 4d terminée — voir §12. Phase 4 entièrement close.** |
| `processes`, `fonctionsActif`, `associationsFonctionAssetNode`, `associationsFonctionProcess`, `manufacturingContexts` | D1 | ✅ **Phase 5a terminée — voir §13** |
| `qualityEvents`, `referencesQualityEvent` | D1 | ✅ **Phase 5b terminée — voir §14. Phase 5 entièrement close.** |
| `requirements`, `testObjectives`, `testCandidates`, `tests`, `couvertures` | D1 | ✅ **Phase 6a terminée — voir §15** |
| `executions`, `executionSteps`, `measurements`, `executionEvents` | D1 | ✅ **Phase 6b terminée — voir §16** |
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
12. **Validation complète** (14/09/2026) : `npm run typecheck` racine
    (`vue-tsc -b --noEmit`, 0 erreur), `npm run lint` (0 erreur/warning),
    `npm run format` (0 erreur), `npx vitest run` racine (**1237/1237 tests
    verts**), `cd workers/auth-worker && npx vitest run` (**103/103 tests
    verts**, dont 2 nouveaux tests pour `/sections/:id/restauration` et
    `/sections/migration-locale`). **Piège découvert pendant cette
    validation** : `npx vue-tsc --noEmit -p tsconfig.app.json` (frontend
    seul) et `npx vue-tsc --noEmit -p .` (racine, mode non-build) passent
    tous les deux à tort sans erreur même quand `workers/auth-worker`
    contient une vraie erreur de type — seul `npm run typecheck` (mode
    `-b`, celui réellement exécuté par la CI, "Lint, typecheck, tests")
    vérifie les deux ensemble avec les project references. A fait
    échouer une première passe de CI (voir §7.2 point 1bis) — toujours
    utiliser `npm run typecheck` pour valider localement avant de pousser,
    jamais un `vue-tsc` isolé sur un seul sous-projet.

### 7.2 Phase 3b — terminée (14/09/2026)

1. ✅ Commit + push de l'incrément sur `claude/contexte-reprise-session-tin77u`.
2. ✅ PR #42 ouverte. Premier passage CI rouge sur `Lint, typecheck, tests` —
   pas la panne connue `Workers Builds` mais une vraie erreur de type dans
   le test de migration locale ajouté cette session
   (`corps.sections[0]` possiblement `undefined`,
   `noUncheckedIndexedAccess`, jamais détectée localement faute d'avoir
   utilisé `npm run typecheck`, voir §7.1 point 12) — corrigée (accès
   chaîné en optionnel) et repoussée. CI verte (`Lint, typecheck, tests`),
   même panne connue `Workers Builds: validapharm-auth-worker` hors `main`
   confirmée (commentaire de statu quo posté, même précédent que
   #19/#24-28/#39/#40/#41), mergée sur `main` (squash, commit `77ece5c`).
3. ✅ Migration `0007_sections.sql` appliquée en production D1
   (`validapharm-auth`) — table `sections` et ses trois index confirmés
   présents (`sqlite_master`).
4. ✅ Code déployé vérifié sur le Worker en production
   (`workers_get_worker_code`, `validapharm-auth-worker`) : `D1SectionsRepo`,
   les 8 routes `/sections/...` (dont `migration-locale` et
   `:id/restauration`) et `ctx.sectionsRepo` bien présents.
5. ⬜ GitHub sync généralisée : toujours reportée (même manque assumé
   qu'en Phases 1/2/3a) — `sections` a déjà sa synchronisation (préexistante,
   adaptée ci-dessus, §7.1 point 8), seul le reste des domaines migrés en
   manque encore.

### 7.3 Prochaine action

Phase 3b close. Enchaîner directement sur la Phase 3c (`projectDocuments`
+ R2, contenu binaire `Blob`, miroir du patron déjà construit pour la
Bibliothèque de normes) — même consigne de l'utilisateur (14/09/2026) :
enchaîner sur toutes les phases sans s'arrêter pour demander confirmation
entre chacune, le sujet des nœuds (import SAP) reste repoussé à plus tard.

---

## 8. État détaillé — Phase 3c (`ProjectDocument`), au 14/09/2026

`ProjectDocument` clôt la Phase 3 (`projects`/`sections`/`projectDocuments`)
— même répartition D1(métadonnées)/R2(texte extrait + contenu binaire) que
la Bibliothèque de normes (`NormativeDocument`), jamais de contenu binaire
préchargé avec la liste.

### 8.1 Ce qui est fait (code complet, tout vert localement)

1. **Migration D1** : `workers/auth-worker/migrations/0008_project_documents.sql`
   crée `project_documents` (id, project_id, filename, status, mime_type,
   has_binary_content, uploaded_at, uploaded_by — texte extrait et contenu
   binaire vivent en R2, jamais en D1) + un index sur `project_id`.
   **Pas encore appliquée en production à l'écriture de cette section.**
2. **Repo D1+R2** : `workers/auth-worker/src/repos/projectDocumentsRepo.ts`
   (interface + `ProjectDocumentsRepoMemoire`) et
   `.../repos/d1/d1ProjectDocumentsRepo.ts` (implémentation D1) — réutilise
   le `R2StockageBinaireRepo(env.BUCKET)` déjà partagé avec la Bibliothèque
   de normes, aucun nouveau câblage R2 nécessaire.
3. **Collision de route évitée** : `POST /projects/:id/documents` existait
   déjà depuis la Phase 3a (`gererAjouterDocumentProjet` — référence un id
   de document dans `Project.documents[]`, jamais le contenu du document) —
   la création réelle d'un document utilise donc `POST /project-documents`
   (id de projet dans le corps), un chemin distinct.
4. **6 routes `auth-worker`** sous `/project-documents/...` (+ 1 route
   `GET /projects/:id/documents` pour lister par projet) : lister par
   projet, créer (`multipart/form-data`), migration locale (idempotente,
   l'existant côté serveur gagne toujours), obtenir le contenu binaire à la
   demande (`GET .../:id/contenu`, vérifiée avant la route générique `:id`),
   obtenir les métadonnées + texte extrait, supprimer. Corps
   `multipart/form-data` (jamais JSON) pour la création/migration locale —
   `metadata` (JSON) + `texte` + `contenu` (Blob optionnel) — même garde-fou
   "jamais `instanceof Blob`, structure + `size > 0`" que
   `gererCreerDocumentNormatif` (protège contre un jeton Drive expiré
   produisant un Blob présent mais vide, bug de production réel déjà
   rencontré).
5. **Clés de réponse dédiées** : `documentProjet`/`documentsProjet` (jamais
   `document`/`documents`, déjà pris par les routes de documents normatifs
   préexistantes) — erreur de nommage initiale détectée par une collision de
   type sur `CorpsReponse` dans les tests, corrigée avant validation.
6. **8 nouveaux tests Worker** (`routeur.test.ts`) : création sans/avec
   contenu binaire, cas limite Blob vide, listing scopé par projet, 404 sur
   id inconnu, suppression, idempotence de la migration locale,
   non-authentifié → 401.
7. **`AuthApiClient`** : `ProjectDocumentWire` + `SaisieCreationDocumentProjet`
   + 6 méthodes (liste par projet/obtention/création/suppression/contenu
   binaire à la demande/migration locale), toutes vérifiées
   `npm run typecheck` propre.
8. **Type domaine `ProjectDocument`** (`logique-metier/domaine/types.ts`) :
   `content: Blob | null` retiré, `has_binary_content: boolean` ajouté
   (doc-comment miroir de `NormativeDocument.has_binary_content`,
   référençant `useProjectDocumentsStore.telechargerContenu`).
9. **`useProjectDocumentsStore` entièrement réécrit** (même API publique
   `{ documents, enChargement, charger, importerDocument, supprimerDocument }`
   + nouvelle méthode `telechargerContenu(documentId): Promise<Blob>`,
   même patron que `useNormativeDocumentsStore.telechargerContenu` —
   contenu jamais préchargé avec la liste). `obtenirApi()` lève si le relais
   n'est pas configuré (mutations), `obtenirApiProjet()` dégrade
   silencieusement vers `null` (appel de référence
   `Project.documents[]`, jamais consommé en production). `charger` dégrade
   gracieusement vers `[]` sur toute erreur.
10. **Ripple effect côté production** : `useSectionsStore` (création de la
    référence de document dans `genererBrouillonIA` via
    `api.creerDocumentProjet`, `obtenirDocumentReference` dégradé vers
    `undefined` sur échec), `FicheProjet.vue` (`telechargerDocument`
    devenue asynchrone, appelle `telechargerContenu` à la demande au clic,
    nouvel état d'erreur `erreurTelechargementDocument`, bouton désactivé
    sur `!document.has_binary_content` au lieu de `!document.content`),
    `useRechercheGlobaleStore.rechercherPourClient` (documents par ensemble
    de projets d'un client via un appel API parallèle par projet, même
    patron que la recherche transverse de sections).
11. **Filet de sécurité de migration locale** : capture Dexie v38
    (`persistance/db.ts`, table `projectDocuments` supprimée, données
    capturées dans `projectDocumentsAMigrer`) +
    `migrerDocumentsLocauxVersServeur()` — appelée au début de `charger`.
    Contrairement à `migrerSectionsLocalesVersServeur` (un seul appel
    groupé, route acceptant un tableau), la route Worker
    `/project-documents/migration-locale` traite un document à la fois
    (corps `multipart/form-data`, contenu binaire potentiellement
    volumineux) : chaque document n'est retiré de la file qu'après
    confirmation serveur individuelle, jamais avant.
12. **3 fichiers de test corrigés** (stray `db.projectDocuments.clear()`
    dans leur `beforeEach`, import `db` retiré quand devenu inutilisé) :
    `FicheProjet.test.ts`, `sections.test.ts`,
    `useRechercheGlobaleStore.test.ts`. `useProjectDocumentsStore.test.ts`
    adapté pour lire `has_binary_content` au lieu de `content` et re-charger
    via le store plutôt qu'interroger Dexie directement.
13. **Validation complète** (14/09/2026, avec la leçon de la Phase 3b déjà
    appliquée dès le départ — uniquement `npm run typecheck`, jamais un
    `vue-tsc` isolé) : `npm run typecheck` (0 erreur), `npm run lint`
    (0 erreur/warning), `npm run format` (0 erreur), `npx vitest run`
    racine (**1245/1245 tests verts**), `cd workers/auth-worker && npx
    vitest run` (**119/119 tests verts**, dont les 8 nouveaux tests
    `ProjectDocument`).

### 8.2 Phase 3c — terminée (14/09/2026)

1. ✅ Commit + push de l'incrément sur `claude/contexte-reprise-session-tin77u`.
2. ✅ PR #43 ouverte. `Lint, typecheck, tests` vert dès le premier passage
   (leçon de la Phase 3b déjà appliquée). Seule la panne connue `Workers
   Builds: validapharm-auth-worker` hors `main` est rouge — commentaire de
   statu quo posté (même précédent que #19/#24-28/#39/#40/#41/#42),
   mergée sur `main` (squash, commit `f0862bf`).
3. ✅ Migration `0008_project_documents.sql` appliquée en production D1
   (`validapharm-auth`) — table `project_documents` et son index confirmés
   présents (`sqlite_master`).
4. ✅ Code déployé vérifié sur le Worker en production
   (`workers_get_worker_code`, `validapharm-auth-worker`) :
   `D1ProjectDocumentsRepo`, les routes `/project-documents/...` et
   `ctx.projectDocumentsRepo` bien présents.
5. ⬜ GitHub sync généralisée : toujours reportée (même manque assumé
   depuis les Phases 1/2/3a/3b) — `projectDocuments` n'a d'ailleurs jamais
   été synchronisé vers GitHub, même avant cette migration (portée de
   `useSynchronisationStore` limitée à projects/sections) : pas une
   régression introduite ici.
6. ✅ **Panne `Workers Builds: validapharm-auth-worker` (hors `main`)
   résolue pour de bon** — cette session (14/09/2026), sur un incrément
   documentaire de suivi (PR #44), l'utilisateur a creusé la vraie cause
   avec les logs réels du tableau de bord Cloudflare (jusqu'ici jamais
   accessibles à aucun outil MCP disponible) : le déploiement de
   prévisualisation (`Settings → Build → Version command`, par défaut
   `npx wrangler versions upload` sans argument) échouait avec `✘ [ERROR]
   Missing entry-point to Worker script`, alors que `Root directory`
   affichait pourtant la bonne valeur (`workers/auth-worker`) — le
   répertoire de travail réel utilisé par Cloudflare au moment d'exécuter
   cette commande ne correspondait pas à celui affiché dans les réglages
   (incohérence côté plateforme Cloudflare, pas ce dépôt). **Corrigé** en
   réglant `Version command` sur `npx wrangler versions upload --config
   workers/auth-worker/wrangler.toml` (chemin explicite depuis la racine
   du dépôt, indépendant du répertoire de travail réel) — confirmé vert
   sur le build suivant, PR #44 mergée sans aucun contournement. Détails
   complets dans `workers/auth-worker/README.md`. **Ne plus reproduire le
   réflexe "panne connue, on merge quand même" pour ce check à l'avenir**
   — s'il redevient rouge, vérifier d'abord que ce réglage `--config`
   n'a pas été perdu avant de supposer une régression de code.

### 8.3 Prochaine action

Phase 3 entièrement close (`projects`/`sections`/`projectDocuments` tous
sur D1, `projectDocuments` sur D1+R2). Enchaîner directement sur la Phase 4
(`methodProfilesACFC`/`evaluationsACFC`/`parameters`/
`classificationsCriticiteParametre`/`cpps`/`cqas`/
`methodProfilesImpactAssessment`/`evaluationsImpactAssessment`/
`evaluationsCSVAssessment`/`methodProfilesRiskAssessment`/
`risksAssessment`, voir §3) — même consigne de l'utilisateur : enchaîner
sur toutes les phases sans s'arrêter pour demander confirmation entre
chacune, le sujet des nœuds (import SAP) reste repoussé à plus tard.

---

## 9. État détaillé — Phase 4a (`ACFC`), au 17/09/2026

Première brique de la Phase 4 (méthodologie de qualification). `ACFC`
(F2 du catalogue §10) est scopé `client_id` simple — **pas** de
`owner_id`/`shared_with` (jamais eu cette notion) — même patron que
Structure Système (Phase 1), pas celui de `Project` (Phase 3a).

### 9.1 Ce qui est fait (code complet, tout vert localement)

1. **Migration D1** : `workers/auth-worker/migrations/0009_acfc.sql` crée
   `method_profiles_acfc` (9 colonnes, `questions` en JSON — structure
   imbriquée modeste, jamais interrogée par son contenu côté serveur,
   même choix que `levels` sur Structure Système) et `evaluations_acfc`
   (11 colonnes, `reponses`/`audit_log` en JSON) + un index par table sur
   `client_id`. **Pas encore appliquée en production.**
2. **Repo Worker** : `workers/auth-worker/src/repos/acfcRepo.ts`
   (interface + `ACFCRepoMemoire`) et `.../repos/d1/d1AcfcRepo.ts`
   (implémentation D1) — `creerProfil`/`creerEvaluation` utilisent
   `ON CONFLICT(id) DO NOTHING` côté D1 (et un test `Map.has` côté
   mémoire) pour être nativement idempotents, réutilisés tels quels par
   la création normale (id toujours neuf, jamais de conflit) et par la
   migration locale (id imposé, existant gagne toujours).
3. **4 routes `auth-worker`** sous `/clients/:clientId/acfc/...` (obtenir
   profils+évaluations/créer un profil/créer une évaluation/migration
   locale), toutes via `exigerAccesClient` (même garde que Structure
   Système). La logique métier (numéro de version suivant, calcul du
   verdict via `evaluerVerdictACFC`) reste côté store frontend, déjà
   testée — ces handlers ne font que persister l'état qu'on leur donne,
   dérivant uniquement `id`/`effectiveDate`/`createdAt` (création) ou
   `id`/`auditLog`/timestamps (évaluation), jamais une identité d'acteur
   fournie par l'appelant.
4. **8 nouveaux tests Worker** (`routeur.test.ts`) : liste vide sans
   profil, création de profil (dérivation serveur), corps invalide,
   création d'évaluation (audit_log dérivé), migration locale idempotente
   (l'existant gagne), non-authentifié → 401.
5. **`AuthApiClient`** : `MethodProfileACFCWire`/`EvaluationACFCWire` +
   4 méthodes (obtenir/créer profil/créer évaluation/migration locale).
6. **`useMethodProfileACFCStore` entièrement réécrit** (même API publique
   `{ profils, evaluations, enChargement, profilActif, charger,
   creerNouvelleVersion, creerEvaluation }`) : toute la logique métier déjà
   testée (calcul du verdict, numéro de version suivant, tri par numéro de
   version jamais par `created_at`) reste côté client, seule la
   persistance passe par l'API. `profilAcfcWireVersDomaine`/
   `evaluationAcfcWireVersDomaine` (exportées) font la conversion
   camelCase ↔ snake_case. `charger` dégrade gracieusement vers `[]` sur
   toute erreur, même discipline que `useStructureSystemeStore.charger`.
7. **Ripple effect côté production** : aucun — `DossierVivantActif.vue`/
   `AssistantCreationLivrable.vue` ne consomment que l'API publique
   inchangée du store (`profilActif`, `evaluations` filtrées par
   `asset_node_id`), aucune référence directe à Dexie.
8. **Filet de sécurité de migration locale** : capture Dexie v39
   (`persistance/db.ts`, tables `methodProfilesACFC`/`evaluationsACFC`
   supprimées, données capturées dans `methodProfilesACFCAMigrer`/
   `evaluationsACFCAMigrer` — la forme de ces deux types domaine n'a pas
   changé, contrairement à `ProjectDocument`, donc pas de type "Ancien"
   séparé) + `migrerAcfcLocalVersServeur(clientId)` — appelée au début de
   `charger`, flushe en un seul appel groupé les entrées du client
   consulté (filtrage par `client_id` sur les deux files avant l'appel,
   contrairement au flush global de `useSectionsStore` — nécessaire ici
   car `charger` est scopé par client, jamais un appel global tous
   clients confondus).
9. **2 fichiers de test corrigés** (accès Dexie direct remplacé par de
   vrais appels store, client de test créé via `ctx.clientsRepo.creer`,
   même patron que `structureSysteme.test.ts`) :
   `methodProfileACFC.test.ts` (entièrement réécrit) et
   `AssistantStrategieQualification.test.ts` (`creerProfilDeTest` bascule
   sur `store.creerNouvelleVersion` au lieu de `db.methodProfilesACFC.put`).
10. **Validation complète** (17/09/2026, uniquement `npm run typecheck`,
    jamais un `vue-tsc` isolé — leçon de la Phase 3b) : `npm run typecheck`
    (0 erreur), `npm run lint` (0 erreur/warning), `npm run format`
    (0 erreur), `npx vitest run` racine (**1251/1251 tests verts**),
    `cd workers/auth-worker && npx vitest run` (**125/125 tests verts**,
    dont les 8 nouveaux tests ACFC).

### 9.2 Phase 4a — terminée (17/09/2026)

1. ✅ Commit + push de l'incrément sur `claude/contexte-reprise-session-tin77u`.
2. ✅ PR #46 ouverte. `Lint, typecheck, tests` et les deux `Workers
   Builds` (`ia-relay`/`auth-worker`) verts dès le premier passage — le
   correctif `--config` du Version command (§8.2 point 6) tient sans
   aucun contournement. Mergée sur `main` (squash, commit `af5c12b`).
3. ✅ Migration `0009_acfc.sql` appliquée en production D1
   (`validapharm-auth`) — les deux tables et leurs index confirmés
   présents (`sqlite_master`). **Étourderie repérée et corrigée dans la
   foulée** : le premier passage n'avait créé que l'index
   `idx_method_profiles_acfc_client`, pas
   `idx_evaluations_acfc_client` (oublié en enchaînant les requêtes) —
   détecté immédiatement par la vérification `sqlite_master` d'usage,
   corrigé par une requête `CREATE INDEX` supplémentaire, reconfirmé.
4. ✅ Code déployé vérifié sur le Worker en production
   (`workers_get_worker_code`, `validapharm-auth-worker`) : `D1AcfcRepo`,
   les routes `/clients/:clientId/acfc/...` et `ctx.acfcRepo` bien
   présents.
5. ⬜ GitHub sync généralisée : toujours reportée (même manque assumé
   depuis les phases précédentes) — `ACFC` n'a jamais été synchronisé
   vers GitHub, même avant cette migration : pas une régression.

### 9.3 Phase 4a — clôturée

PR #47 (doc-only, complétant ce §9 avec les faits réels de merge/migration/
déploiement) ouverte, CI verte (y compris les deux `Workers Builds` sans
aucun contournement), mergée (squash, commit `1d0aa7c`). Phase 4a
définitivement close, enchaînement immédiat sur la Phase 4b ci-dessous.

---

## 10. État détaillé — Phase 4b (`Parameter`/`ClassificationCriticiteParametre`/`CPP`/`CQA`), au 17/09/2026

Deuxième brique de la Phase 4. Même patron client_id-scopé que ACFC
(Phase 4a)/Structure Système (Phase 1) — **pas** de `owner_id`/
`shared_with` sur ces 4 types (jamais eu cette notion). Garde-fou central
du domaine (Target Architecture §10, `docs/convergence/GAP.md`) inchangé :
un `CPP`/`CQA` ne peut être créé que par une déclaration humaine explicite,
jamais dérivé automatiquement d'une `ClassificationCriticiteParametre` —
vérifié par un test dédié côté Worker et côté store.

### 10.1 Ce qui est fait (code complet, tout vert localement)

1. **Migration D1** : `workers/auth-worker/migrations/0010_parameters.sql`
   crée 4 tables (`parameters`, `classifications_criticite_parametre`,
   `cpps`, `cqas`) + un index par table sur `client_id`. `actif` (CPP/CQA)
   stocké en `INTEGER` (0/1), même convention que
   `has_binary_content`/etc. sur les dépôts D1 existants
   (`Boolean(l.actif)` à la lecture, `c.actif ? 1 : 0` à l'écriture).
   **Pas encore appliquée en production.**
2. **Repo Worker** : `workers/auth-worker/src/repos/parametersRepo.ts`
   (interface `ParametersRepo` + `ParametersRepoMemoire`) et
   `.../repos/d1/d1ParametersRepo.ts` (implémentation D1) — les 4
   créations utilisent `ON CONFLICT(id) DO NOTHING` côté D1 (idempotence
   création normale/migration locale, même patron qu'ACFC) ; `CPP`/`CQA`
   ont en plus `cppParId`/`remplacerCPP` et `cqaParId`/`remplacerCQA`
   (l'`UPDATE` de la désactivation, seule mutation du domaine — aucun
   autre type de ce chantier n'en avait eu besoin jusqu'ici).
3. **9 routes `auth-worker`** sous `/clients/:clientId/parameters/...`
   (obtenir les 4 listes / créer un paramètre / créer une classification /
   créer+désactiver un CPP / créer+désactiver un CQA / migration locale),
   toutes via `exigerAccesClient`. Clé JSON `parametreProcede`/
   `parametresProcede` (jamais `parametre`/`parametres`) : `parametre`
   désigne déjà une entrée `parametres_installation` (config technique
   clé/valeur, `/parametres-installation/:cle`) — une collision de nom
   aurait rendu les deux réponses JSON ambiguës pour le frontend, repérée
   avant l'écriture des tests plutôt qu'après.
4. **8 nouveaux tests Worker** (`routeur.test.ts`) : listes vides sans
   rien configuré, création de paramètre (dérivation serveur), corps
   invalide, classification ne crée jamais de CPP/CQA (garde-fou),
   déclaration+désactivation CPP (historique conservé), déclaration+
   désactivation CQA, migration locale idempotente, non-authentifié → 401.
   Suite Worker au complet : **133/133 tests verts**.
5. **Bug de validation trouvé et corrigé en écrivant les tests** :
   `gererCreerParametre`/`gererCreerCQA` rejetaient à tort une
   `description`/`contexte` **vide** (`''`) comme `corps_invalide`
   (`!corps.description` traite `''` comme absent) — repéré par le test
   d'isolation par client (`description: ''`) et par le formulaire réel
   (`ParametresCritiques.vue` soumet une description vide par défaut).
   Corrigé en testant `corps.description === undefined` (absent) plutôt
   que la valeur falsy — seul `nom`/`contexte`/`justification` restent
   réellement requis.
6. **`AuthApiClient`** : `ParameterWire`/`ClassificationCriticiteParametreWire`/
   `CPPWire`/`CQAWire` + 7 méthodes (obtenir/créer paramètre/créer
   classification/déclarer+désactiver CPP/déclarer+désactiver CQA/
   migration locale).
7. **`useParameterStore` entièrement réécrit** (même API publique
   `{ parametres, classifications, cpps, cqas, enChargement, cppsActifs,
   cqasActifs, charger, creerParametre, classifierParametre, declarerCPP,
   desactiverCPP, declarerCQA, desactiverCQA }`) : le garde-fou central
   (aucune fonction ne crée de CPP/CQA depuis une classification) reste
   intégralement dans le store, seule la persistance passe par l'API.
   `charger` dégrade gracieusement vers 4 listes vides sur toute erreur,
   même discipline qu'ACFC/Structure Système.
8. **Ripple effect côté production** : aucun en dehors de
   `ParametresCritiques.vue`, qui ne consommait déjà que l'API publique du
   store (aucune référence directe à Dexie).
9. **Filet de sécurité de migration locale** : capture Dexie v40
   (`persistance/db.ts`, 4 tables supprimées, données capturées dans
   `parametersAMigrer`/`classificationsCriticiteParametreAMigrer`/
   `cppsAMigrer`/`cqasAMigrer` — formes domaine inchangées, pas de type
   "Ancien") + `migrerParametersLocalVersServeur(clientId)`, filtrage par
   client sur les 4 files avant un seul appel groupé, même patron qu'ACFC.
10. **2 fichiers de test corrigés** (accès Dexie direct remplacé par de
    vrais appels store/`ctx.parametersRepo`, client de test créé via
    `ctx.clientsRepo.creer`, même patron que `methodProfileACFC.test.ts`) :
    `useParameterStore.test.ts` (entièrement réécrit) et
    `ParametresCritiques.test.ts` (idem, plus la découverte du bug de
    validation ci-dessus).
11. **Validation complète** (17/09/2026, uniquement `npm run typecheck`,
    jamais un `vue-tsc` isolé) : `npm run typecheck` (0 erreur), `npm run
    lint` (0 erreur/warning), `npm run format` (0 erreur), `npx vitest
    run` racine (**1259/1259 tests verts**), `cd workers/auth-worker &&
    npx vitest run` (**133/133 tests verts**, dont les 8 nouveaux tests
    Parameter/CPP/CQA).

### 10.2 Phase 4b — terminée (17/09/2026)

1. ✅ Commit + push de l'incrément sur `claude/contexte-reprise-session-tin77u`.
2. ✅ PR #48 ouverte. `Lint, typecheck, tests` et les deux `Workers
   Builds` (`ia-relay`/`auth-worker`) verts dès le premier passage — le
   correctif `--config` du Version command (§8.2 point 6) continue de
   tenir sans aucun contournement. Mergée sur `main` (squash, commit
   `7b6e6ff`).
3. ✅ Migration `0010_parameters.sql` appliquée en production D1
   (`validapharm-auth`) en 8 requêtes séparées (une par `CREATE
   TABLE`/`CREATE INDEX`, pour éviter l'étourderie de la Phase 4a §9.2
   point 3) — les 4 tables et leurs 4 index confirmés présents dès le
   premier passage (`sqlite_master`).
4. ✅ Code déployé vérifié sur le Worker en production
   (`workers_get_worker_code`, `validapharm-auth-worker`) : `D1ParametersRepo`
   et `ctx.parametersRepo` bien câblés dans tous les handlers.
5. ⬜ GitHub sync généralisée : toujours reportée (même manque assumé
   depuis les phases précédentes) — `Parameter`/`CPP`/`CQA` n'ont jamais
   été synchronisés vers GitHub, même avant cette migration : pas une
   régression.

### 10.3 Phase 4b — clôturée

PR #49 (doc-only, complétant ce §10 avec les faits réels de merge/
migration/déploiement) ouverte et mergée. Phase 4b définitivement close,
enchaînement immédiat sur la Phase 4c ci-dessous.

---

## 11. État détaillé — Phase 4c (`MethodProfileImpactAssessment`/`EvaluationImpactAssessment`/`EvaluationCSVAssessment`), au 17/09/2026

Troisième brique de la Phase 4 : Impact Assessment / System Classification
(F1 du catalogue §10) et Computer System Assessment (F3). Même patron
client_id-scopé qu'ACFC (F2, Phase 4a)/Parameter (Phase 4b) — pas de
`owner_id`/`shared_with`. `MethodProfileImpactAssessment`/
`EvaluationImpactAssessment` sont une réplique quasi exacte du patron ACFC
(questionnaire Oui/Non versionné, verdict calculé côté client) ;
`EvaluationCSVAssessment` n'a pas de `MethodProfile` (catégorisation GAMP5
fixe, PIC/S PI 011-3, jamais configurable par client) — même discipline
que la distinction CPP/CQA de la Phase 4b, mais ici c'est le type entier
qui est plus simple (pas de version, pas de désactivation, création seule).

### 11.1 Ce qui est fait (code complet, tout vert localement)

1. **Migration D1** : `workers/auth-worker/migrations/0011_impact_csv_assessment.sql`
   crée 3 tables (`method_profiles_impact_assessment`,
   `evaluations_impact_assessment`, `evaluations_csv_assessment`) + un
   index par table sur `client_id`. **Pas encore appliquée en production.**
2. **2 dépôts Worker** : `impactAssessmentRepo.ts` (interface +
   `ImpactAssessmentRepoMemoire`, mirroir exact d'`ACFCRepo`) et
   `csvAssessmentRepo.ts` (interface + `CSVAssessmentRepoMemoire`, pas de
   notion de profil) + leurs implémentations D1
   (`d1ImpactAssessmentRepo.ts`/`d1CsvAssessmentRepo.ts`), créations
   idempotentes via `ON CONFLICT(id) DO NOTHING`.
3. **7 nouvelles routes Worker** sous `/clients/:clientId/impact-assessment/...`
   (obtenir/créer profil/créer évaluation/migration locale) et
   `/clients/:clientId/csv-assessment/...` (obtenir/créer évaluation/
   migration locale), toutes via `exigerAccesClient`. Clés JSON
   `profilImpact`/`profilsImpact`/`evaluationImpact`/`evaluationsImpact`
   (jamais `profil`/`profils`/`evaluation`/`evaluations`, déjà pris par
   ACFC) et `evaluationCsv`/`evaluationsCsv` — même discipline de
   disambiguïsation que `parametreProcede` en Phase 4b, repérée cette
   fois **avant** l'écriture du code grâce à la leçon de la Phase 4b.
4. **13 nouveaux tests Worker** (`routeur.test.ts`) : listes vides,
   création de profil/évaluation Impact Assessment (dérivation serveur),
   corps invalide, migration locale idempotente, non-authentifié → 401
   (×2 domaines) + spécificités CSV (catégorie GAMP5 fixe). Suite Worker
   au complet : **144/144 tests verts**.
5. **`AuthApiClient`** : `MethodProfileImpactAssessmentWire`/
   `EvaluationImpactAssessmentWire`/`EvaluationCSVAssessmentWire` + 7
   méthodes.
6. **`useImpactAssessmentStore`/`useCSVAssessmentStore` entièrement
   réécrits** (API publique inchangée) : logique métier (verdict, numéro
   de version suivant pour Impact Assessment) intégralement côté client,
   seule la persistance passe par l'API. `charger` dégrade gracieusement
   sur toute erreur, même discipline qu'ACFC/Parameter.
7. **Ripple effect côté production** : aucun — `DossierVivantActif.vue`
   ne consomme que l'API publique des stores.
8. **Filet de sécurité de migration locale** : capture Dexie v41
   (`persistance/db.ts`, 3 tables supprimées, données capturées dans
   `methodProfilesImpactAssessmentAMigrer`/
   `evaluationsImpactAssessmentAMigrer`/`evaluationsCSVAssessmentAMigrer`
   — formes domaine inchangées, pas de type "Ancien").
9. **5 fichiers de test corrigés** (accès Dexie direct remplacé par de
   vrais appels store/`ctx.impactAssessmentRepo`/`ctx.csvAssessmentRepo`,
   client de test créé via `ctx.clientsRepo.creer`) :
   `useImpactAssessmentStore.test.ts`, `useCSVAssessmentStore.test.ts`,
   `ImpactAssessment.test.ts`, `ComputerSystemAssessment.test.ts`
   (entièrement réécrits) et `DossierVivantActif.test.ts` (un seul appel
   `db.evaluationsCSVAssessment.put` remplacé par
   `ctx.csvAssessmentRepo.creerEvaluation`).
10. **Validation complète** (17/09/2026) : `npm run typecheck` (0
    erreur), `npm run lint` (0 erreur/warning), `npm run format` (0
    erreur), `npx vitest run` racine (**1270/1270 tests verts**),
    `cd workers/auth-worker && npx vitest run` (**144/144 tests verts**,
    dont les 13 nouveaux tests Impact/CSV Assessment).

### 11.2 Phase 4c — terminée (17/09/2026)

1. ✅ Commit + push de l'incrément sur `claude/contexte-reprise-session-tin77u`.
2. ✅ PR #50 ouverte. **CI rouge à deux reprises, deux causes réelles
   distinctes, aucune des deux un simple contournement** :
   - **Course dans `DossierVivantActif.test.ts`** (véritable défaut de
     synchronisation du test, pas une panne d'infrastructure) : le test
     n'attendait que l'apparition du nom du nœud
     (`wrapper.text().includes('Autoclave AUT-042')`) avant d'affirmer sur
     l'évaluation CSV Assessment associée (« PLC autoclave ») — or
     Structure Système et CSV Assessment/Quality Events se chargent via
     des `charger()` concurrents distincts (risque déjà documenté dans
     l'en-tête du fichier). Jamais reproduit en local (5 exécutions
     répétées + suite complète, toutes vertes), mais l'ordonnancement plus
     lent de CI l'a fait échouer une fois. Corrigé en alignant la
     condition d'attente sur la donnée réellement testée
     (`wrapper.text().includes('PLC autoclave')`) ; re-vérifié stable sur
     5 exécutions locales supplémentaires avant push.
   - **Erreur non gérée pré-existante et sans rapport avec cette PR** :
     après la correction ci-dessus, un second passage CI a échoué sur une
     `IndisponibleAuthError` non interceptée provenant de
     `RevueStructureProcedure.livrablesLies.test.ts`/`RevueStructureProcedure.vue`
     (fichiers jamais touchés par cette PR) — les 1270 tests étaient
     pourtant tous verts, seule une rejection résiduelle après la fin du
     test a fait échouer le job. Confirmé comme panne isolée (pas de
     rapport avec le diff de cette PR) par un unique nouveau passage,
     repassé vert sans aucune modification.
   - Les deux `Workers Builds` (`ia-relay`/`auth-worker`) verts dès le
     premier passage — le correctif `--config` du Version command
     continue de tenir. Mergée sur `main` (squash, commit `9b0bbaf`).
3. ✅ Migration `0011_impact_csv_assessment.sql` appliquée en production
   D1 (`validapharm-auth`) en 6 requêtes séparées. **Nouvel aléa
   d'infrastructure repéré et corrigé dans la foulée** : le tout premier
   `CREATE TABLE method_profiles_impact_assessment` a échoué sur une
   erreur 403 transitoire côté API Cloudflare (jamais rencontrée aux
   Phases 4a/4b) — détecté immédiatement par la vérification
   `sqlite_master` d'usage (2 tables sur 3 seulement), corrigé en
   réémettant la table puis son index manquants, reconfirmé (3 tables +
   3 index présents).
4. ✅ Code déployé vérifié sur le Worker en production
   (`workers_get_worker_code`, `validapharm-auth-worker`) :
   `D1ImpactAssessmentRepo`/`D1CsvAssessmentRepo` bien câblés dans le
   contexte.
5. ⬜ GitHub sync généralisée : toujours reportée (même manque assumé
   depuis les phases précédentes) — `ImpactAssessment`/`CSVAssessment`
   n'ont jamais été synchronisés vers GitHub, même avant cette migration :
   pas une régression.

### 11.3 Prochaine action

Phase 4c définitivement close. Enchaîner sur la Phase 4d, dernière brique
de la Phase 4 (`methodProfilesRiskAssessment`/`risksAssessment`, AMDEC —
cycle en deux temps évaluation initiale/résiduelle, seule nuance par
rapport au patron ACFC/Impact Assessment), sans s'arrêter pour
confirmation, conformément à la consigne permanente de l'utilisateur.

---

## 12. État détaillé — Phase 4d (`MethodProfileRiskAssessment`/`RiskAssessment`, AMDEC), au 17/09/2026

Quatrième et dernière brique de la Phase 4 : Risk Assessment / AMDEC (ICH
Q9). Même patron client_id-scopé qu'ACFC/Impact Assessment (Phases
4a/4c) — méthodologie versionnée par client (`echelle_min`/`echelle_max`/
`seuil_action` plutôt qu'un questionnaire Oui/Non, mécanisme numérique
réellement différent, d'où un type volontairement distinct). Nuance
propre à ce domaine : `RiskAssessment` a un vrai cycle en deux temps
(évaluation initiale → action corrective → évaluation résiduelle), les
champs `*_residuel*`/`recommandation`/`responsable`/`date_cible`/
`actions_menees` restant `null` tant qu'aucune action n'a été
explicitement enregistrée — jamais une valeur devinée égale à l'initial.

### 12.1 Ce qui est fait (code complet, tout vert localement)

1. **Migration D1** : `workers/auth-worker/migrations/0012_risk_assessment.sql`
   crée 2 tables (`method_profiles_risk_assessment`, `risks_assessment`) +
   un index par table sur `client_id`.
2. **1 dépôt Worker** : `riskAssessmentRepo.ts` (interface +
   `RiskAssessmentRepoMemoire`) + son implémentation D1
   (`d1RiskAssessmentRepo.ts`). Création idempotente via
   `ON CONFLICT(id) DO NOTHING` pour profils/évaluations, plus
   `evaluationParId`/`remplacerEvaluation` (même patron mutable que
   `cppParId`/`remplacerCPP` en Phase 4b) pour enregistrer l'action
   résiduelle sans jamais muter les champs de l'évaluation initiale — le
   `UPDATE` D1 ne touche que les colonnes `recommandation`/`responsable`/
   `date_cible`/`actions_menees`/`*_residuel*`/`audit_log`/`updated_at`.
3. **5 nouvelles routes Worker** sous `/clients/:clientId/risk-assessment/...`
   (obtenir, créer profil, créer évaluation, `PATCH .../evaluations/:id/action-residuelle`,
   migration locale), toutes via `exigerAccesClient`. Clés JSON
   `profilRisque`/`profilsRisque`/`evaluationRisque`/`evaluationsRisque`
   (jamais `profil`/`evaluation`, déjà pris par ACFC, ni `profilImpact`/
   `evaluationImpact`/`evaluationCsv`) — désambiguïsation décidée
   **avant** l'écriture du code, méthode reprise de la Phase 4c.
   Validation `effetDefaillance`/`causePotentielle`/`controleActuel` :
   chaîne vide acceptée (champs non `required` dans
   `RiskAssessmentAmdec.vue`), seule l'absence (`undefined`) est rejetée —
   même discipline que `description` en Phase 4b, trouvée cette fois par
   un test d'écran réel (formulaire soumettant des champs vides) plutôt
   qu'en re-découverte a posteriori.
4. **9 nouveaux tests Worker** (`routeur.test.ts`) : liste vide, création
   de profil (dérivation serveur), corps invalide (profil et évaluation),
   création d'évaluation avec résiduel `null`, enregistrement de l'action
   résiduelle (IPR/verdict résiduels, initial jamais muté, audit_log à 2
   entrées), action résiduelle sur évaluation introuvable → 404, migration
   locale idempotente, non-authentifié → 401. Suite Worker au complet :
   **153/153 tests verts**.
5. **`AuthApiClient`** : `MethodProfileRiskAssessmentWire`/
   `RiskAssessmentWire` + 5 méthodes (dont
   `enregistrerActionResiduelleRiskAssessment`, `PATCH`).
6. **`useRiskAssessmentStore` entièrement réécrit** (API publique
   inchangée : `profils`, `evaluations`, `profilActif`, `charger`,
   `creerNouvelleVersion`, `creerEvaluation`, `enregistrerActionResiduelle`) :
   logique métier (numéro de version suivant, `calculerIPR`,
   `evaluerVerdictRiskAssessment`) intégralement côté client, seule la
   persistance passe par l'API. `enregistrerActionResiduelle` retrouve
   l'évaluation/le profil figé dans l'état déjà chargé du store (jamais un
   aller-retour serveur supplémentaire juste pour vérifier l'existence) —
   nuance par rapport au patron Dexie d'origine qui interrogeait `db`
   directement, cohérente avec le fait que `charger()` a toujours déjà
   peuplé `evaluations`/`profils` avant tout appel de mutation depuis
   l'écran.
7. **Ripple effect côté production** : `useTestDefinitionStore.ts` (lecture
   seule de `RiskAssessment` pour le moteur de couverture de tests) a été
   basculé pour appeler `useRiskAssessmentStore().charger(clientId)` puis
   lire `.evaluations`, plutôt que `db.risksAssessment` directement — seul
   fichier de production impacté en dehors du store lui-même, composition
   store-dans-store déjà précédentée (`useOrganizationStore`→`useClientsStore`,
   `useReasoningEngineStore`→`useStructureSystemeStore`).
8. **Filet de sécurité de migration locale** : capture Dexie v42
   (`persistance/db.ts`, 2 tables supprimées, données capturées dans
   `methodProfilesRiskAssessmentAMigrer`/`risksAssessmentAMigrer` — formes
   domaine inchangées, pas de type "Ancien").
9. **4 fichiers de test corrigés/réécrits** (accès Dexie direct remplacé
   par de vrais appels store/`ctx.riskAssessmentRepo`, client de test créé
   via `ctx.clientsRepo.creer`) : `useRiskAssessmentStore.test.ts`,
   `RiskAssessmentAmdec.test.ts` (entièrement réécrits au patron
   `fauxWorkerAuth`), `useTestDefinitionStore.test.ts` (ajout de
   `installerFauxWorkerAuth`/clients de test, 3 seeds `db.risksAssessment.put`
   remplacés par `ctx.riskAssessmentRepo.creerEvaluation`).
10. **Validation complète (17/09/2026)** : `vue-tsc --noEmit`/`tsc
    --noEmit` (Worker) sans erreur, `eslint` (src + workers/auth-worker/src)
    sans erreur ni avertissement, `npx vitest run` racine (**1279/1279
    tests verts**), `cd workers/auth-worker && npx vitest run` (**153/153
    tests verts**, dont les 9 nouveaux tests Risk Assessment).

### 12.2 Phase 4d — terminée (17/09/2026)

1. ✅ Commit + push de l'incrément sur `claude/contexte-reprise-session-tin77u`.
2. ✅ PR #52 ouverte. CI verte du premier coup (Workers Builds
   `ia-relay`/`auth-worker` + `Lint, typecheck, tests`) — aucun incident,
   contrairement aux Phases 4a/4c. Mergée sur `main` (squash, commit `1e8e895`).
3. ✅ Migration `0012_risk_assessment.sql` appliquée en production D1
   (`validapharm-auth`) en 4 requêtes séparées, toutes réussies du premier
   coup — aucun 403 transitoire cette fois. Vérification `sqlite_master`
   confirmant les 2 tables + leurs 2 index nommés (plus les 2
   auto-index de clé primaire).
4. ✅ Code déployé vérifié sur le Worker en production
   (`workers_get_worker_code`, `validapharm-auth-worker`) :
   `D1RiskAssessmentRepo` bien câblé dans le contexte, toutes les routes
   `ctx.riskAssessmentRepo.*` présentes dans le bundle.
5. ⬜ GitHub sync généralisée : toujours reportée (même manque assumé
   depuis les phases précédentes) — Risk Assessment n'a jamais été
   synchronisé vers GitHub, même avant cette migration : pas une régression.

### 12.3 Phase 4 — entièrement close

Les 4 briques (4a ACFC, 4b Parameter/CPP/CQA, 4c Impact/CSV Assessment, 4d
Risk Assessment/AMDEC) sont maintenant toutes migrées vers D1, en
production, déploiement vérifié. Enchaîner sur la Phase 5
(`processes`/`fonctionsActif`/`associationsFonctionAssetNode`/
`associationsFonctionProcess`/`manufacturingContexts` et
`qualityEvents`/`referencesQualityEvent`, voir §3), sans s'arrêter pour
confirmation, conformément à la consigne permanente de l'utilisateur. Le
problème des nœuds SAP (bug d'import original) reste explicitement
reporté, comme depuis le début de ce chantier.

---

## 13. État détaillé — Phase 5a (`Process`/`FonctionActif`/`ManufacturingContext`), au 17/09/2026

Première brique de la Phase 5 : `Process`/`FonctionActif` (Target
Architecture §4/§5) et `ManufacturingContext` (§7), plus leurs 2 tables
d'association N:M (`AssociationFonctionAssetNode`/
`AssociationFonctionProcess`). Contrairement aux phases 4a-4d (un seul
"domaine d'assessment" par phase), ce sous-domaine regroupe directement 5
types dans un seul dépôt Worker (`ProcessContextRepo`), même patron que
`ParametersRepo` en Phase 4b — ils partagent le même cycle de vie simple
(création seule, pas de version, pas de désactivation) et le même
store frontend (`useProcessContextStore`) déjà.

### 13.1 Ce qui est fait (code complet, tout vert localement)

1. **Migration D1** : `workers/auth-worker/migrations/0013_process_context.sql`
   crée 5 tables (`processes`, `fonctions_actif`,
   `associations_fonction_asset_node`, `associations_fonction_process`,
   `manufacturing_contexts`) + un index par table sur `client_id`. Les 2
   tables d'association n'ont ni `audit_log` ni `updated_at` (simples
   relations créées une fois, jamais mutées — même discipline que
   `relations_techniques`, Phase 1).
2. **1 dépôt Worker** : `processContextRepo.ts` (interface +
   `ProcessContextRepoMemoire`) + son implémentation D1
   (`d1ProcessContextRepo.ts`). Création idempotente via
   `ON CONFLICT(id) DO NOTHING` pour les 5 types — le dédoublonnage
   client-side d'une association déjà chargée (paire
   fonction/asset_node ou fonction/process) reste entièrement côté store
   frontend, comme avant la migration.
3. **6 nouvelles routes Worker** sous `/clients/:clientId/process-context/...`
   (obtenir, créer process/fonction/association-fonction-asset-node/
   association-fonction-process/manufacturing-context, migration locale),
   toutes via `exigerAccesClient`. Clés JSON `process`/`fonction`/
   `associationFonctionAssetNode`/`associationFonctionProcess`/
   `manufacturingContext` — noms neufs, aucune collision avec les
   domaines déjà migrés, décidés avant l'écriture du code (méthode
   reprise des Phases 4c/4d).
4. **9 nouveaux tests Worker** (`routeur.test.ts`) : listes vides,
   création de process/fonction (dérivation serveur), corps invalide,
   association fonction/asset-node, association fonction/process,
   création de manufacturing context (+ corps invalide), migration locale
   idempotente, non-authentifié → 401. Suite Worker au complet :
   **163/163 tests verts**.
5. **`AuthApiClient`** : `ProcessWire`/`FonctionActifWire`/
   `AssociationFonctionAssetNodeWire`/`AssociationFonctionProcessWire`/
   `ManufacturingContextWire` + 6 méthodes.
6. **`useProcessContextStore` entièrement réécrit** (API publique
   inchangée : `processes`, `fonctions`, `associationsFonctionAssetNode`,
   `associationsFonctionProcess`, `manufacturingContexts`, `charger`,
   `creerProcess`, `creerFonction`, `associerFonctionAAssetNode`,
   `associerFonctionAProcess`, `creerManufacturingContext`,
   `contextesPourAssetNode`) : logique métier (dédoublonnage
   d'association) intégralement côté client, seule la persistance passe
   par l'API.
7. **Ripple effect côté production** : `useReasoningEngineStore.ts`
   (lecture de `ManufacturingContext` pour le narratif de
   `ContextSnapshot`) et `useRechercheGlobaleStore.ts` (lecture de
   `Process` pour la recherche transverse) basculés vers
   `useProcessContextStore().charger(clientId)` plutôt que `db.processes`/
   `db.manufacturingContexts` directement — même patron que
   `useTestDefinitionStore`→`useRiskAssessmentStore` en Phase 4d.
8. **Filet de sécurité de migration locale** : capture Dexie v43
   (`persistance/db.ts`, 5 tables supprimées, données capturées dans
   `processesAMigrer`/`fonctionsActifAMigrer`/
   `associationsFonctionAssetNodeAMigrer`/
   `associationsFonctionProcessAMigrer`/`manufacturingContextsAMigrer` —
   formes domaine inchangées, pas de type "Ancien").
9. **6 fichiers de test corrigés/réécrits** (accès Dexie direct remplacé
   par de vrais appels store/`ctx.processContextRepo`, client de test créé
   via `ctx.clientsRepo.creer`) : `useProcessContextStore.test.ts`,
   `Process.test.ts` (entièrement réécrits au patron `fauxWorkerAuth`,
   dont le test "Worker injoignable" dont la sémantique a changé — les
   données ne sont plus purement locales, même discipline que
   `StructureSysteme.test.ts`), `useQualityEventStore.test.ts`,
   `useReasoningEngineStore.test.ts`, `useRechercheGlobaleStore.test.ts`,
   `AssistantCreationLivrable.test.ts` (retrait des `.clear()` Dexie
   devenus obsolètes, ajout de `fauxWorkerAuth` où nécessaire).
10. **Validation complète (17/09/2026)** : `vue-tsc --noEmit`/`tsc
    --noEmit` (Worker) sans erreur, `eslint` (src + workers/auth-worker/src)
    sans erreur ni avertissement, `npx vitest run` racine (**1289/1289
    tests verts**), `cd workers/auth-worker && npx vitest run` (**163/163
    tests verts**, dont les 9 nouveaux tests Process Context).

### 13.2 Phase 5a — terminée (17/09/2026)

1. ✅ Commit + push de l'incrément sur `claude/contexte-reprise-session-tin77u`.
2. ✅ PR #54 ouverte. CI verte du premier coup (Workers Builds
   `ia-relay`/`auth-worker` + `Lint, typecheck, tests`) — aucun incident.
   Mergée sur `main` (squash, commit `15cf306`).
3. ✅ Migration `0013_process_context.sql` appliquée en production D1
   (`validapharm-auth`) en 10 requêtes séparées, toutes réussies du
   premier coup. Vérification `sqlite_master` confirmant les 5 tables +
   leurs 5 index nommés.
4. ✅ Code déployé vérifié sur le Worker en production
   (`workers_get_worker_code`, `validapharm-auth-worker`) :
   `D1ProcessContextRepo` bien câblé dans le contexte, toutes les routes
   `ctx.processContextRepo.*` présentes dans le bundle.
5. ⬜ GitHub sync généralisée : toujours reportée (même manque assumé
   depuis les phases précédentes) — Process/FonctionActif/
   ManufacturingContext n'ont jamais été synchronisés vers GitHub, même
   avant cette migration : pas une régression.

### 13.3 Phase 5a — clôturée

Phase 5a définitivement close, enchaînée sans confirmation sur la Phase
5b (voir §14 ci-dessous), conformément à la consigne permanente de
l'utilisateur.

---

## 14. État détaillé — Phase 5b (`QualityEvent`/`ReferenceQualityEvent`), au 17/09/2026

Dernière brique de la Phase 5 (URS catalogue §10 famille H : Change
Control/Deviation/CAPA/Investigation/Audit Finding, famille I : Periodic
Review). Même méthodologie que 4a-4d/5a : migration SQL → dépôt Worker
(mémoire+D1) → routes → tests Worker → `AuthApiClient` → réécriture du
store → filet de sécurité de migration locale Dexie → correction des
consommateurs.

### 14.1 Ce qui est fait (code complet, tout vert localement)

1. **Migration D1** : `workers/auth-worker/migrations/0014_quality_events.sql`
   crée 2 tables (`quality_events`, `references_quality_event`) + un index
   par table sur `client_id`. `references_quality_event` n'a ni
   `audit_log` ni `updated_at` (simple relation créée une fois, jamais
   mutée — même discipline que `associations_fonction_process`, Phase 5a).
   `reference_externe` stocké en blob JSON (`null` si absent).
2. **1 dépôt Worker** : `qualityEventRepo.ts` (interface +
   `QualityEventRepoMemoire`) + son implémentation D1
   (`d1QualityEventRepo.ts`). Création idempotente via
   `ON CONFLICT(id) DO NOTHING`. `evenementParId`/`remplacerEvenement`
   suivent le patron mutable déjà utilisé pour CPP/CQA (Phase 4b) et
   RiskAssessment (Phase 4d) : `remplacerEvenement` ne met à jour que
   `statut`/`audit_log`/`updated_at` (la seule mutation réelle,
   `changerStatut`), jamais les autres champs.
3. **5 nouvelles routes Worker** sous `/clients/:clientId/quality-events/...`
   (obtenir, créer événement, `PATCH .../evenements/:id/statut`,
   référencer, migration locale), toutes via `exigerAccesClient`. Clés
   JSON `evenement`/`evenements`/`reference`/`references` — noms neufs,
   aucune collision avec les domaines déjà migrés.
4. **8 nouveaux tests Worker** (`routeur.test.ts`) : liste vide, création
   d'événement (dérivation serveur du `statut='ouvert'` et de
   l'`auditLog`), corps invalide, changement de statut (audit_log
   accumulé), changement de statut sur événement inexistant → 404,
   référence entre deux événements + test de régression dédié au
   garde-fou central (un Change Control externe ouvert référençant un
   événement n'empêche pas la création d'un `ManufacturingContext`
   indépendant), migration locale idempotente, non-authentifié → 401.
   Suite Worker au complet : **171/171 tests verts**.
5. **`AuthApiClient`** : `QualityEventWire`/`ReferenceQualityEventWire` +
   5 méthodes.
6. **`useQualityEventStore` entièrement réécrit** (API publique
   inchangée : `evenements`, `references`, `enChargement`, `charger`,
   `creerEvenement`, `changerStatut`, `referencerEvenement`,
   `referencesDepuis`) : le garde-fou central (aucun blocage automatique
   d'une opération d'un autre module à partir d'un `QualityEvent`
   externe) reste entièrement porté côté store/Worker, inchangé par la
   migration.
7. **Ripple effect côté production** : `useReasoningEngineStore.ts`
   (narratif de `ContextSnapshot`) et `useContentPlanStore.ts` (calcul de
   `readiness`) basculés vers `useQualityEventStore().charger(clientId)`
   plutôt que `db.qualityEvents` directement — même patron que
   `useProcessContextStore` en Phase 5a.
8. **Filet de sécurité de migration locale** : capture Dexie v44
   (`persistance/db.ts`, 2 tables supprimées, données capturées dans
   `qualityEventsAMigrer`/`referencesQualityEventAMigrer` — formes
   domaine inchangées, pas de type "Ancien").
9. **7 fichiers de test corrigés/réécrits** (accès Dexie direct remplacé
   par de vrais appels store/`ctx.qualityEventRepo`, clients de test créés
   via `ctx.clientsRepo.creer` là où c'était encore manquant) :
   `useQualityEventStore.test.ts`, `DossierVivantActif.test.ts`,
   `JournalAnomalies.test.ts` (entièrement réécrit au patron
   `fauxWorkerAuth`, n'avait jamais eu de session/client de test avant
   cette migration), `MissionWorkspace.test.ts` (ajout de la session/client
   de test en tête de fichier), `ContentPlan.test.ts`,
   `useReasoningEngineStore.test.ts`, `useExecutionStore.test.ts`
   (assertion `db.qualityEvents` devenue un garde-fou structurel commenté
   plutôt qu'une lecture Dexie, `useExecutionStore` n'ayant de toute façon
   aucun code créant un `QualityEvent`).
10. **Validation complète (17/09/2026)** : `vue-tsc --noEmit`/`tsc
    --noEmit` (Worker) sans erreur, `eslint`/`prettier --check` (src +
    workers/auth-worker/src) sans erreur ni avertissement, `npx vitest
    run` racine (**1297/1297 tests verts**), `cd workers/auth-worker &&
    npx vitest run` (**171/171 tests verts**, dont les 8 nouveaux tests
    QualityEvent).

### 14.2 Phase 5b — terminée (17/09/2026)

1. ✅ Commit + push de l'incrément sur `claude/contexte-reprise-session-tin77u`.
2. ✅ PR #56 ouverte. CI verte du premier coup (Workers Builds
   `ia-relay`/`auth-worker` + `Lint, typecheck, tests`) — aucun incident.
   Mergée sur `main` (squash, commit `f8eb9d2`).
3. ✅ Migration `0014_quality_events.sql` appliquée en production D1
   (`validapharm-auth`) en 4 requêtes séparées, toutes réussies du
   premier coup. Vérification `sqlite_master` confirmant les 2 tables +
   leurs 2 index nommés.
4. ✅ Code déployé vérifié sur le Worker en production
   (`workers_get_worker_code`, `validapharm-auth-worker`) : les routes et
   handlers `quality-events`/`D1QualityEventRepo` présents dans le
   bundle.
5. ⬜ GitHub sync généralisée : toujours reportée (même manque assumé
   depuis les phases précédentes) — `QualityEvent`/`ReferenceQualityEvent`
   n'ont jamais été synchronisés vers GitHub, même avant cette migration :
   pas une régression.

### 14.3 Phase 5 — entièrement close

Les 2 briques (5a Process/FonctionActif/ManufacturingContext, 5b
QualityEvent/ReferenceQualityEvent) sont maintenant toutes migrées vers
D1, en production, déploiement vérifié. Enchaîner sur la Phase 6
(`requirements`/`testObjectives`/`testCandidates`/`tests`/`couvertures` +
`executions`/`executionSteps`/`measurements`/`executionEvents` +
`evidences`/`evidenceLocations`/`provenanceLinks`, voir §3), sans
s'arrêter pour confirmation, conformément à la consigne permanente de
l'utilisateur. Le problème des nœuds SAP (bug d'import original) reste
explicitement reporté, comme depuis le début de ce chantier.

---

## 15. État détaillé — Phase 6a (`Requirement`/`TestObjective`/`TestCandidate`/`Test`/`Couverture`), au 17/09/2026

Première brique de la Phase 6 — Test/Execution/Evidence engine
(`03_DOMAIN_DATA_MODEL.md`, domaine "Test") : uniquement la chaîne de
**définition** (`Requirement → TestObjective → TestCandidate → Test` +
déclaration de `Couverture`), jamais l'exécution (Phase 6b :
`executions`/`executionSteps`/`measurements`/`executionEvents`) ni
l'Evidence (Phase 6c :
`evidences`/`evidenceLocations`/`provenanceLinks`) — risque élevé,
séquencé en étapes distinctes comme prévu depuis l'origine de ce domaine
(commentaire `qualityEventRepo.ts`/`types.ts`).

### 15.1 Ce qui est fait (code complet, tout vert localement)

1. **Migration D1** : `workers/auth-worker/migrations/0015_test_definition.sql`
   crée 5 tables (`requirements`, `test_objectives`, `test_candidates`,
   `tests`, `couvertures`) + un index par table sur `client_id`.
   `test_objectives`/`couvertures` n'ont pas d'audit_log (mêmes raisons
   que les associations déjà migrées). `etapes` (Test) reste un blob JSON
   embarqué. **PAS ENCORE APPLIQUÉE EN PRODUCTION D1** (aucun code n'a
   encore été mergé sur `main` pour cette phase).
2. **1 dépôt Worker** : `testDefinitionRepo.ts` (interface +
   `TestDefinitionRepoMemoire`) + son implémentation D1
   (`d1TestDefinitionRepo.ts`). Création idempotente via
   `ON CONFLICT(id) DO NOTHING`. `testCandidateParId`/
   `remplacerTestCandidate` et `testParId`/`remplacerTest` suivent le
   patron mutable déjà utilisé pour CPP/CQA (Phase 4b) et RiskAssessment
   (Phase 4d) : `remplacerTestCandidate` ne met à jour que
   `statut`/`motif_rejet`/`duplique_de_id`/`remplace_par_id`/
   `audit_log`/`updated_at` ; `remplacerTest` ne met à jour que
   `statut`/`audit_log`/`updated_at`.
3. **9 nouvelles routes Worker** sous `/clients/:clientId/test-definition/...`
   (obtenir, créer requirement/test-objective/test-candidate, créer des
   candidats en lot depuis une analyse de risque
   `test-candidates/depuis-risques`, `PATCH .../test-candidates/:id/statut`,
   créer un Test depuis un candidat **accepté uniquement** (revérifié
   côté serveur, jamais fait confiance au client), `PATCH .../tests/:id/approuver`,
   créer une couverture (idempotente), migration locale), toutes via
   `exigerAccesClient`. Clés JSON `requirement(s)`/`testObjective(s)`/
   `testCandidate(s)`/`test`/`tests`/`couverture(s)` — noms neufs, aucune
   collision avec les domaines déjà migrés.
4. **`index.ts`** : `D1TestDefinitionRepo` câblé dans `routerRequete`.
5. **13 nouveaux tests Worker** (`routeur.test.ts`) : listes vides,
   création requirement (+ corps invalide), création test-objective,
   création test-candidate (statut `propose` par défaut), création en
   lot depuis risques, changement de statut (audit_log accumulé),
   changement de statut sur candidat inexistant → 404, création de Test
   depuis candidat non accepté → `candidat_non_accepte`, création de Test
   depuis candidat accepté puis approbation, déclaration de couverture
   idempotente, migration locale idempotente, non-authentifié → 401.
   Suite Worker au complet : **184/184 tests verts**
   (`cd workers/auth-worker && npx tsc --noEmit && npx vitest run`).
6. **`AuthApiClient`** : `RequirementWire`/`TestObjectiveWire`/
   `TestCandidateWire`/`EtapeTestWire`/`TestWire`/`CouvertureWire` +
   saisies + 9 méthodes.
7. **`useTestDefinitionStore` entièrement réécrit** (API publique
   inchangée : `requirements`, `testObjectives`, `testCandidates`,
   `tests`, `couvertures`, `risquesAssessment`, `enChargement`,
   `charger`, `creerRequirement`, `creerTestObjective`,
   `creerTestCandidate`, `genererCandidatsRisquesPourObjectif` (délègue
   toujours à la fonction pure `genererCandidatsDepuisRisques`, envoie
   désormais les suggestions au POST `test-candidates/depuis-risques`),
   `couvertureRisquesRequirement` (pure, inchangée),
   `accepterTestCandidate`/`rejeterTestCandidate`/
   `marquerBesoinInformation`/`marquerBesoinRevue`/`marquerDoublon`/
   `marquerRemplace` (délèguent au `PATCH test-candidates/:id/statut`),
   `creerTestDepuisCandidat` (contrôle client-side conservé, revérifié
   aussi côté serveur), `approuverTest`, `declarerCouverture`
   (dédoublonnage client-side conservé), `testsCouvrantRequirement`
   (pure, inchangée). `risquesAssessment` continue de déléguer à
   `useRiskAssessmentStore` (Phase 4d), inchangé.
8. **Ripple effect côté production** : `useReasoningEngineStore.ts`
   (outil `lister_requirements_pour_actif` + narratif) et
   `useContentPlanStore.ts` (calcul de `readiness`) basculés vers
   `useTestDefinitionStore().charger(clientId)` plutôt que
   `db.requirements`/`db.couvertures`/`db.tests` directement.
   `useExecutionStore.ts` (`demarrerExecution`/
   `enregistrerResultatEtape`) bascule pareil pour vérifier qu'un Test
   est `approuve` avant de démarrer une exécution.
9. **Filet de sécurité de migration locale** : capture Dexie **v45**
   (`persistance/db.ts`, 5 tables supprimées, données capturées dans
   `requirementsAMigrer`/`testObjectivesAMigrer`/`testCandidatesAMigrer`/
   `testsAMigrer`/`couverturesAMigrer` — formes domaine inchangées).
10. **9 fichiers de test corrigés/réécrits** (accès Dexie direct
    remplacé par de vrais appels store/`ctx.testDefinitionRepo`, clients
    de test créés via `ctx.clientsRepo.creer` là où c'était encore
    manquant) : `useTestDefinitionStore.test.ts`,
    `useExecutionStore.test.ts`, `useEvidenceStore.test.ts`,
    `useContentPlanStore.test.ts`, `useReasoningEngineStore.test.ts`,
    `ContentPlan.test.ts`, `DefinitionTests.test.ts` (réécriture
    complète au patron `fauxWorkerAuth`), `ExecutionTests.test.ts`,
    `MissionWorkspace.test.ts` (le crash venait uniquement des
    `db.requirements/couvertures/tests.clear()` désormais supprimées de
    son `beforeEach`, ce qui empêchait `ctx`/`demonter` d'être jamais
    assignés — pas un problème de patron `fauxWorkerAuth`, déjà en place
    depuis la Phase 5b sur ce fichier).
11. **Validation complète (17/09/2026)** : `vue-tsc --noEmit`/`tsc
    --noEmit` (Worker) sans erreur, `eslint`/`prettier --check` (src +
    workers/auth-worker/src) sans erreur ni avertissement, `npx vitest
    run` racine (**1310/1310 tests verts**), `cd workers/auth-worker &&
    npx vitest run` (**184/184 tests verts**).

### 15.2 Phase 6a — terminée (17/09/2026)

1. ✅ Commit + push de l'incrément sur `claude/contexte-reprise-session-tin77u`.
2. ✅ PR #58 ouverte. CI verte du premier coup (Workers Builds
   `ia-relay`/`auth-worker` + `Lint, typecheck, tests`) — aucun incident.
   Mergée sur `main` (squash, commit `5a2c260`).
3. ✅ Migration `0015_test_definition.sql` appliquée en production D1
   (`validapharm-auth`) en 10 requêtes séparées (5 `CREATE TABLE` + 5
   `CREATE INDEX`), toutes réussies du premier coup. Vérification
   `sqlite_master` confirmant les 5 tables + leurs 5 index nommés.
4. ✅ Code déployé vérifié sur le Worker en production
   (`workers_get_worker_code`, `validapharm-auth-worker`) : les routes et
   handlers `test-definition`/`D1TestDefinitionRepo` présents dans le
   bundle (13 occurrences).
5. ⬜ GitHub sync généralisée : toujours reportée (même manque assumé
   depuis les phases précédentes) — `Requirement`/`TestObjective`/
   `TestCandidate`/`Test`/`Couverture` n'ont jamais été synchronisés vers
   GitHub, même avant cette migration : pas une régression.

### 15.3 Phase 6a — close ; suite du chantier

Seule la chaîne de **définition** de tests est migrée. Restent, dans la
Phase 6 (voir §3) :

- **Phase 6b** : `executions`/`executionSteps`/`measurements`/
  `executionEvents` (moteur d'exécution).
- **Phase 6c** : `evidences`/`evidenceLocations`/`provenanceLinks`
  (Evidence).

Enchaîner sur la Phase 6b sans s'arrêter pour confirmation, conformément
à la consigne permanente de l'utilisateur. Le problème des nœuds SAP (bug
d'import original) reste explicitement reporté, comme depuis le début de
ce chantier.

---

## 16. État détaillé — Phase 6b (`Execution`/`ExecutionStep`/`Measurement`/`ExecutionEvent`), au 17/09/2026

Deuxième brique de la Phase 6 — le moteur d'exécution d'un `Test`
approuvé (`Requirement → TestObjective → TestCandidate → Test` migrés en
Phase 6a). Jamais l'Evidence documentaire associée (Phase 6c :
`evidences`/`evidenceLocations`/`provenanceLinks`), traitée séparément —
risque élevé, séquencé en étapes distinctes comme prévu depuis l'origine
de ce domaine.

### 16.1 Ce qui est fait (code complet, tout vert localement)

1. **Migration D1** : `workers/auth-worker/migrations/0016_execution.sql`
   crée 4 tables (`executions`, `execution_steps`, `measurements`,
   `execution_events`) + un index par table sur `client_id`.
   `execution_steps`/`measurements`/`execution_events` n'ont ni
   `audit_log` ni `updated_at` : immutables une fois créés (aucune
   mutation démontrée par les sources) — seule `executions` est mutable
   (`statut`/`verdict`/`date_fin` via la clôture), même discipline que
   `test_candidates`/`tests` (Phase 6a).
2. **1 dépôt Worker** : `executionRepo.ts` (interface +
   `ExecutionRepoMemoire`) + son implémentation D1
   (`d1ExecutionRepo.ts`). Création idempotente via `ON CONFLICT(id) DO
   NOTHING`. `executionParId`/`remplacerExecution` suivent le patron
   mutable déjà utilisé pour TestCandidate/Test (Phase 6a) :
   `remplacerExecution` ne met à jour que
   `statut`/`verdict`/`date_fin`/`audit_log`/`updated_at`.
3. **7 nouvelles routes Worker** sous `/clients/:clientId/executions...`
   (obtenir, démarrer une exécution depuis un Test **approuvé
   uniquement** — revérifié côté serveur, jamais fait confiance au
   client —, enregistrer un résultat d'étape avec vérification que
   l'étape appartient réellement au Test exécuté, ajouter une mesure via
   `/execution-steps/:id/mesures`, consigner un événement, clôturer avec
   verdict toujours fourni explicitement, migration locale), toutes via
   `exigerAccesClient`. Clés JSON `execution(s)`/`executionStep(s)`/
   `measurement(s)`/`executionEvent(s)` — noms neufs, aucune collision
   avec les domaines déjà migrés.
4. **`index.ts`** : `D1ExecutionRepo` câblé dans `routerRequete`.
5. **13 nouveaux tests Worker** (`routeur.test.ts`) : liste vide,
   démarrage depuis Test approuvé (id/statut/audit_log dérivés côté
   serveur), démarrage depuis Test non approuvé → `test_non_approuve`,
   démarrage depuis Test inconnu → `test_introuvable`, enregistrement de
   résultat d'étape (+ étape inconnue → `etape_inconnue`, + exécution
   inconnue → `execution_introuvable`), ajout de mesure (+ étape
   d'exécution inconnue → `etape_execution_introuvable`), consignation
   d'événement (`quality_event_id` optionnel jamais créé
   automatiquement), clôture avec verdict explicite (+ reclôture →
   `execution_deja_cloturee`), migration locale idempotente,
   non-authentifié → 401. Suite Worker au complet : **197/197 tests
   verts** (`cd workers/auth-worker && npx tsc --noEmit && npx vitest
   run`).
6. **`AuthApiClient`** : `ExecutionWire`/`ExecutionStepWire`/
   `MeasurementWire`/`ExecutionEventWire` + saisies + 7 méthodes.
7. **`useExecutionStore` entièrement réécrit** (API publique inchangée :
   `executions`, `executionSteps`, `measurements`, `executionEvents`,
   `enChargement`, `charger`, `demarrerExecution` (revérifie aussi
   côté client que le Test est `approuve`, en plus de la revérification
   serveur), `enregistrerResultatEtape`, `ajouterMesure`,
   `consignerEvenement`, `cloturerExecution`, `etapesExecution`,
   `mesuresEtape`, `evenementsExecution` — toutes pures, inchangées).
8. **Ripple effect côté production** : `useContentPlanStore.ts` (calcul
   de `readiness`) et `useReasoningEngineStore.ts` (donnée `executions`
   pour le moteur de raisonnement) basculés vers
   `useExecutionStore().charger(clientId)` plutôt que `db.executions`
   directement. `useEvidenceStore.ts` (`enregistrerPreuve`) bascule
   pareil pour vérifier qu'une Execution existe/n'est pas clôturée et
   qu'un ExecutionStep référencé est réel — Evidence reste elle-même
   Dexie (Phase 6c, pas encore migrée).
9. **Filet de sécurité de migration locale** : capture Dexie **v46**
   (`persistance/db.ts`, 4 tables supprimées, données capturées dans
   `executionsAMigrer`/`executionStepsAMigrer`/`measurementsAMigrer`/
   `executionEventsAMigrer` — formes domaine inchangées).
10. **5 fichiers de test corrigés** (accès Dexie direct remplacé par de
    vrais appels store/`ctx.executionRepo`) : `useExecutionStore.test.ts`
    (suppression des `db.executions/executionSteps/measurements/
    executionEvents.clear()` devenus inutiles, table Dexie supprimée),
    `useEvidenceStore.test.ts` (idem), `useContentPlanStore.test.ts`/
    `ContentPlan.test.ts` (`db.executions.put` → `ctx.executionRepo.
    creerExecution`, champs wire camelCase), `ExecutionTests.test.ts`
    (tous les `db.executions/executionSteps/measurements.toArray()/
    where()` remplacés par `ctx.executionRepo.lister*(CLIENT_ID)` —
    Evidence, non migrée, reste lue via `db.evidences` directement).
11. **Validation complète (17/09/2026)** : `vue-tsc --noEmit`/`tsc
    --noEmit` (Worker) sans erreur, `eslint`/`prettier --check` (src +
    workers/auth-worker/src) sans erreur ni avertissement, `npx vitest
    run` racine (**1323/1323 tests verts**), `cd workers/auth-worker &&
    npx vitest run` (**197/197 tests verts**).

### 16.2 Phase 6b — terminée (17/09/2026)

1. ✅ Commit + push de l'incrément sur `claude/contexte-reprise-session-tin77u`.
2. ✅ PR #60 ouverte. Premier passage de CI rouge sur `Lint, typecheck,
   tests` : `DossierVivantActif.test.ts` en échec (comparaison de texte
   sur un écran ne référençant ni `Execution` ni aucun fichier touché par
   ce diff) — passait 3/3 en local isolé, cohérent avec la fragilité de
   timing déjà documentée dans les commentaires de ce test (course entre
   plusieurs `charger()` concurrents dans `onMounted`). Un seul re-run
   ciblé (`rerun_failed_jobs`) a confirmé le flake : CI verte ensuite.
   Mergée sur `main` (squash, commit `90d431b`).
3. ✅ Migration `0016_execution.sql` appliquée en production D1
   (`validapharm-auth`) en 8 requêtes séparées (4 `CREATE TABLE` + 4
   `CREATE INDEX`), toutes réussies du premier coup. Vérification
   `sqlite_master` confirmant les 4 tables + leurs 4 index nommés.
4. ✅ Code déployé vérifié sur le Worker en production
   (`workers_get_worker_code`, `validapharm-auth-worker`) : les routes et
   `D1ExecutionRepo` présents dans le bundle (20 occurrences).
5. ⬜ GitHub sync généralisée : toujours reportée (même manque assumé
   depuis les phases précédentes) — `Execution`/`ExecutionStep`/
   `Measurement`/`ExecutionEvent` n'ont jamais été synchronisés vers
   GitHub, même avant cette migration : pas une régression.

### 16.3 Phase 6b — close ; suite du chantier

Reste, dans la Phase 6 (voir §3) :

- **Phase 6c** : `evidences`/`evidenceLocations`/`provenanceLinks`
  (Evidence) — dernière brique du Test/Execution/Evidence engine.

Enchaîner sur la Phase 6c sans s'arrêter pour confirmation, conformément
à la consigne permanente de l'utilisateur. Le problème des nœuds SAP (bug
d'import original) reste explicitement reporté, comme depuis le début de
ce chantier.
