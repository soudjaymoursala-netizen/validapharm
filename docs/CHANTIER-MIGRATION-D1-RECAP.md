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
| `organizations`, `workspaces` | D1 | 🔧 **Phase 2 — code complet (14/09/2026), migration 0005 pas encore appliquée en prod, PR pas encore ouverte** |
| `projects`, `sections`, `projectDocuments` | D1 (+ GitHub déjà en place, à conserver) | ⬜ Phase 3 |
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

### 5.2 Ce qui reste à faire avant de considérer la Phase 2 terminée

1. Commit + push de l'incrément.
2. Ouvrir la PR, suivre CI jusqu'au vert (même réflexe qu'en Phase 1 pour
   la panne connue `Workers Builds: validapharm-auth-worker` hors `main`),
   merger.
3. Appliquer la migration `0005_organization_workspace.sql` en production D1.
4. Vérifier le code réellement déployé sur le Worker en production.
5. Marquer la ligne Organization/Workspace de §3 ✅ une fois les points
   1-4 ci-dessus faits.
6. GitHub sync généralisée : toujours reportée (même manque assumé qu'en
   Phase 1, §4.2 point 5) — à traiter une fois plusieurs domaines migrés.

### 5.3 Prochaine action immédiate

Commit/push de l'incrément Phase 2, puis ouverture de la PR et suivi
CI/merge/migration prod/vérification déploiement — reprendre directement à
cette étape si la session s'interrompt ici. Une fois clos, enchaîner sur
la Phase 3 (`projects`/`sections`/`projectDocuments`, §3) — consigne de
l'utilisateur : enchaîner sur toutes les phases sans s'arrêter pour
demander confirmation entre chacune.
