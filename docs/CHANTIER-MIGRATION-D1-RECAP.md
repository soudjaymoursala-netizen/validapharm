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
| `evidences`, `evidenceLocations`, `provenanceLinks` | D1 | ✅ **Phase 6c terminée — voir §17. Phase 6 entièrement close.** |
| `sources`, `sourceVersions`, `sourceLocations`, `extractions`, `extractionItems`, `knowledgeItems`, `confirmations`, `knowledgeRelations`, `conflicts` | D1 | ✅ **Phase 7a terminée — voir §18** |
| `contentPlans` | D1 | ✅ **Phase 7b terminée — voir §19** |
| `connectors`, `syncJobs`, `externalReferences` | D1 | ✅ **Phase 7c terminée — voir §20. Phase 7 entièrement close.** |
| `missions`, `activities`, `dependencies`, `associationsMissionQualityEvent` | D1 | ✅ **Phase 8a terminée — voir §21** |
| `contextSnapshots`, `contextSnapshotItems` | D1 | ✅ **Phase 8b terminée — voir §22** |
| `aiConfigurations`, `aiRequests`, `aiResponses`, `citationsAIResponse` | D1 | ✅ **Phase 8c terminée — voir §23. Phase 8 entièrement close.** |
| `relationsTechniques` | D1 (avec Structure Système, Phase 1) | ✅ Phase 1 terminée, même état que la ligne ci-dessus |
| `procedures`, `procedureSteps` | D1 | ✅ **Phase 9a terminée — voir §24** |
| `gabaritsExportClient` | D1 + R2 (fichier `.docx` binaire) | ✅ **Phase 9b terminée — voir §25** |
| `aiChatSessionLogs` | D1 | ✅ **Phase 9c terminée — voir §26** |
| `connexionDrive`, `etatMiroirDrive` (miroir Drive par client) | D1 | ✅ **Phase 9d terminée — voir §27** |
| `connexionRelaisOCR` | D1 (même patron que Relais IA) | ✅ **Phase 9e terminée — voir §28** |
| `clientConfigs` | D1 | ✅ **Phase 9f terminée — voir §29. Phase 9 entièrement close. Chantier de migration D1 (Phases 1-9) entièrement clos.** |
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

## 17. État détaillé — Phase 6c (`Evidence`/`EvidenceLocation`/`ProvenanceLink`), au 18/09/2026

Troisième et **dernière** brique de la Phase 6 — la preuve documentaire
(native ou pointeur vers un document existant, jamais un fichier hébergé)
rattachée à une `Execution`/`ExecutionStep` (Phase 6b), et sa provenance
tracée vers un `Requirement` (Phase 6a). Une fois cette phase mergée et
déployée, **la Phase 6 (Test/Execution/Evidence engine) est entièrement
close**.

### 17.1 Ce qui est fait (code complet, tout vert localement et en CI)

1. **Migration D1** : `workers/auth-worker/migrations/0017_evidence.sql`
   crée 3 tables (`evidences`, `evidence_locations`, `provenance_links`) +
   un index par table sur `client_id`. Les 3 tables sont **entièrement
   immutables** (aucune mutation démontrée par les sources, ALCOA+ : une
   `Evidence` fait foi telle quelle) — ni `audit_log`, ni `updated_at`, ni
   méthode de remplacement, contrairement à `Execution` (Phase 6b) qui
   reste mutable via sa clôture.
2. **1 dépôt Worker** : `evidenceRepo.ts` (interface +
   `EvidenceRepoMemoire`) + son implémentation D1 (`d1EvidenceRepo.ts`),
   écritures en INSERT uniquement (aucun UPDATE).
3. **5 nouvelles routes Worker** sous `/clients/:clientId/evidences...` et
   `/clients/:clientId/provenance-links` (obtenir, enregistrer une preuve,
   ajouter une localisation, déclarer une provenance, migration locale),
   toutes via `exigerAccesClient`. Re-vérification serveur systématique,
   jamais fait confiance au client : `gererEnregistrerPreuve` vérifie que
   l'`Execution` existe et n'est pas déjà clôturée
   (`execution_introuvable`/`execution_deja_cloturee`), et que
   l'`ExecutionStep` référencé (si fourni) appartient bien à cette
   `Execution` (`etape_inconnue`) ; `gererAjouterLocalisation` vérifie que
   l'`Evidence` est de type `document` (`type_non_document`) — une preuve
   `native` ne peut jamais recevoir de localisation, cohérent avec le
   principe qu'une `EvidenceLocation` est un pointeur, jamais un fichier ;
   `gererDeclarerProvenance` est idempotente (vérifie l'absence d'un lien
   identique avant insertion).
4. **`index.ts`** : `D1EvidenceRepo` câblé dans `routerRequete`.
5. **11 nouveaux tests Worker** (`routeur.test.ts`) : liste vide,
   enregistrement de preuve native (champs dérivés côté serveur :
   id/horodatage/actor), `execution_introuvable`,
   `execution_deja_cloturee`, `etape_inconnue`, ajout de localisation sur
   une preuve `document` (+ `type_non_document` sur une preuve `native`,
   + `evidence_introuvable`), déclaration de provenance idempotente,
   migration locale idempotente, non-authentifié → 401. Suite Worker au
   complet : **208/208 tests verts** (`cd workers/auth-worker && npx tsc
   --noEmit && npx vitest run`).
6. **`AuthApiClient`** : `EvidenceWire`/`EvidenceLocationWire`/
   `ProvenanceLinkWire` + saisies + 5 méthodes (`obtenirEvidences`,
   `enregistrerPreuve`, `ajouterLocalisation`, `declarerProvenance`,
   `migrerEvidencesLocal`).
7. **`useEvidenceStore` entièrement réécrit** (API publique inchangée :
   `evidences`, `evidenceLocations`, `provenanceLinks`, `enChargement`,
   `charger`, `enregistrerPreuve`, `ajouterLocalisation`,
   `declarerProvenance`, `preuvesExecution`, `localisationsPreuve`,
   `preuvesPourRequirement` — toutes pures, inchangées).
   `enregistrerPreuve` revérifie aussi côté client (via
   `useExecutionStore().charger(clientId)`) l'existence/l'état de
   l'`Execution` et de l'`ExecutionStep`, en plus de la revérification
   serveur.
8. **Ripple effect côté production** : `useContentPlanStore.ts` (calcul de
   `readiness`) et `useReasoningEngineStore.ts` (donnée `evidences` pour
   le moteur de raisonnement) basculés vers
   `useEvidenceStore().charger(clientId)` plutôt que `db.evidences`
   directement.
9. **Filet de sécurité de migration locale** : capture Dexie **v47**
   (`persistance/db.ts`, 3 tables supprimées, données capturées dans
   `evidencesAMigrer`/`evidenceLocationsAMigrer`/`provenanceLinksAMigrer`
   — formes domaine inchangées).
10. **4 fichiers de test corrigés** (accès Dexie direct remplacé par de
    vrais appels store/`ctx.evidenceRepo`) : `useEvidenceStore.test.ts`
    (suppression des `db.evidences/evidenceLocations/
    provenanceLinks.clear()` devenus inutiles, tables Dexie supprimées),
    `useContentPlanStore.test.ts`/`ContentPlan.test.ts` (`db.evidences.put`
    → `ctx.evidenceRepo.creerEvidence`, champs wire camelCase — corrige au
    passage un fixture pré-existant incorrect dans `ContentPlan.test.ts`
    qui utilisait la mauvaise forme de champs avec un cast `as never`),
    `ExecutionTests.test.ts` (les 3 derniers `db.evidences.clear()/
    where()/toArray()` remplacés par `ctx.evidenceRepo.
    listerEvidences(CLIENT_ID)`, import `db` devenu inutile retiré).
11. **Validation complète (18/09/2026)** : `vue-tsc --noEmit`/`tsc
    --noEmit` (Worker) sans erreur, `eslint --fix`/`prettier --write`
    (racine + workers) sans erreur ni changement, `npx vitest run` racine
    (**1334/1334 tests verts**, 165 fichiers), `cd workers/auth-worker &&
    npx vitest run` (**208/208 tests verts**).

### 17.2 Phase 6c — terminée (18/09/2026)

1. ✅ Commit + push de l'incrément sur `claude/contexte-reprise-session-tin77u`.
2. ✅ PR #62 ouverte. CI (« Quality gate ») verte du premier coup, aucun
   flake rencontré. Mergée sur `main` (squash, commit `f8a15f4`).
3. ✅ Migration `0017_evidence.sql` appliquée en production D1
   (`validapharm-auth`) en 6 requêtes séparées (3 `CREATE TABLE` + 3
   `CREATE INDEX`), toutes réussies du premier coup. Vérification
   `sqlite_master` confirmant les 3 tables + leurs 3 index nommés.
4. ✅ Code déployé vérifié sur le Worker en production
   (`workers_get_worker_code`, `validapharm-auth-worker`) : les routes et
   `D1EvidenceRepo` présents dans le bundle (29 occurrences).
5. ⬜ GitHub sync généralisée : toujours reportée (même manque assumé
   depuis les phases précédentes) — `Evidence`/`EvidenceLocation`/
   `ProvenanceLink` n'ont jamais été synchronisés vers GitHub, même avant
   cette migration : pas une régression.

### 17.3 Phase 6c close — Phase 6 entièrement close

Les trois briques du Test/Execution/Evidence engine sont maintenant
toutes sur D1 :

- **Phase 6a** (§15) : `Requirement`/`TestObjective`/`TestCandidate`/
  `Test`/`Couverture`.
- **Phase 6b** (§16) : `Execution`/`ExecutionStep`/`Measurement`/
  `ExecutionEvent`.
- **Phase 6c** (§17, ce présent état) : `Evidence`/`EvidenceLocation`/
  `ProvenanceLink`.

**La Phase 6 est close.** Reste au chantier (voir §3) :

- **Phase 7** : `sources`/`sourceVersions`/`sourceLocations`/
  `extractions`/`extractionItems`/`knowledgeItems`/`confirmations`/
  `knowledgeRelations`/`conflicts` (Knowledge Engine) +
  `contentPlans` (Deliverable Engine) + `connectors`/`syncJobs`/
  `externalReferences` (connecteurs QMS tiers).
- **Phase 8** : `missions`/`activities`/`dependencies`/
  `associationsMissionQualityEvent`, `contextSnapshots`/
  `contextSnapshotItems`, `aiConfigurations`/`aiRequests`/`aiResponses`/
  `citationsAIResponse`.
- **Phase 9** : `procedures`/`procedureSteps`, `gabaritsExportClient`,
  `aiChatSessionLogs`, `connexionDrive`/`etatMiroirDrive`,
  `connexionRelaisOCR`, `clientConfigs`.

Enchaîner sur la Phase 7 sans s'arrêter pour confirmation, conformément à
la consigne permanente de l'utilisateur. Le problème des nœuds SAP (bug
d'import original) reste explicitement reporté, comme depuis le début de
ce chantier.

## 18. État détaillé — Phase 7a (`Source`/`SourceLocation`/`SourceVersion`/`Extraction`/`ExtractionItem`/`KnowledgeItem`/`Confirmation`/`KnowledgeRelation`/`Conflict`), au 18/09/2026

Première brique de la Phase 7 — le domaine « Source Intelligence »/
« Knowledge » (structuration assistée de documents : ingestion d'une
`Source`, détection de révision via `SourceVersion`, extraction OCR/
native/manuelle via `Extraction`/`ExtractionItem`, interprétation
structurée candidate via `KnowledgeItem`, validation/rejet humain
explicite via `Confirmation`, liens/désaccords explicites via
`KnowledgeRelation`/`Conflict`). Reste dans la Phase 7 (au moment de
cette section) : `contentPlans` (Deliverable Engine, devenue Phase 7b —
voir §19, terminée) et `connectors`/`syncJobs`/`externalReferences`
(connecteurs QMS tiers, Phase 7c).

### 18.1 Ce qui est fait (code complet, tout vert localement et en CI)

1. **Migration D1** : `workers/auth-worker/migrations/0018_knowledge_engine.sql`
   crée 9 tables (`sources`, `source_locations`, `source_versions`,
   `extractions`, `extraction_items`, `knowledge_items`, `confirmations`,
   `knowledge_relations`, `conflicts`) + un index par table sur
   `client_id`. `knowledge_items` et `conflicts` restent **mutables**
   (statut/validé_par/audit_log via confirmation ; statut/résolution via
   résolution explicite) — les 7 autres tables sont **entièrement
   immutables** une fois créées (aucune mutation démontrée par les
   sources).
2. **1 dépôt Worker** : `knowledgeEngineRepo.ts` (interface +
   `KnowledgeEngineRepoMemoire`) + son implémentation D1
   (`d1KnowledgeEngineRepo.ts`), écritures en INSERT (`ON CONFLICT(id) DO
   NOTHING`) sauf `remplacerKnowledgeItem`/`remplacerConflict` (UPDATE
   ciblé sur les seuls champs mutables).
3. **11 nouvelles routes Worker** sous `/clients/:clientId/...` (GET
   agrégat `knowledge-engine`, création `sources`, ajout de localisation
   `sources/:id/localisations`, création de version
   `sources/:id/versions` — `numeroVersion` auto-incrémenté côté serveur,
   jamais fourni par le client —, enregistrement d'extraction
   `source-versions/:id/extractions`, ajout d'élément extrait
   `extractions/:id/items`, création de KnowledgeItem
   `extraction-items/:id/knowledge-items` — toujours `a_valider` à la
   création, jamais `valide` —, confirmation `knowledge-items/:id/
   confirmer` — `confirmePar`/`validePar` dérivés côté serveur de
   `acteur.email`, jamais fait confiance au client —, déclaration de
   relation `knowledge-relations` — idempotente —, déclaration de
   conflit `conflicts`, résolution `conflicts/:id/resoudre`, migration
   locale `knowledge-engine/migration-locale`), toutes via
   `exigerAccesClient`.
4. **`index.ts`** : `D1KnowledgeEngineRepo` câblé dans `routerRequete`.
5. **17 nouveaux tests Worker** (`routeur.test.ts`) : GET vide, création
   Source + localisation (+ `source_introuvable`), SourceVersion
   auto-incrémentée (+ `source_introuvable`), Extraction (+
   `version_introuvable`), ExtractionItem (+ `extraction_introuvable`),
   KnowledgeItem toujours `a_valider` (+ `extraction_item_introuvable`),
   confirmation/rejet avec `confirmePar` dérivé serveur (+
   `knowledge_item_introuvable`), déclaration de relation idempotente,
   déclaration + résolution de conflit (+ `conflict_introuvable`),
   migration locale idempotente, non-authentifié → 401. Suite Worker au
   complet : **225/225 tests verts** (`cd workers/auth-worker && npx tsc
   --noEmit && npx vitest run`).
6. **`AuthApiClient`** : `SourceWire`/`SourceLocationWire`/
   `SourceVersionWire`/`ExtractionWire`/`ExtractionItemWire`/
   `KnowledgeItemWire`/`ConfirmationWire`/`KnowledgeRelationWire`/
   `ConflictWire` + saisies + 11 méthodes.
7. **`useSourceIntelligenceStore` entièrement réécrit** (API publique
   quasi inchangée : `sources`, `sourceVersions`, `sourceLocations`,
   `extractions`, `extractionItems`, `knowledgeItems`, `confirmations`,
   `knowledgeRelations`, `conflicts`, `enChargement`, `charger`,
   `creerSource`, `ajouterLocalisation`, `creerSourceVersion`,
   `enregistrerExtraction`, `ajouterExtractionItem`, `creerKnowledgeItem`,
   `declarerRelation`, `declarerConflit`, `resoudreConflit`,
   `knowledgeItemsExtractionItem`, `confirmationsKnowledgeItem`,
   `conflitsOuverts` — toutes pures, inchangées). **Seule différence
   d'API** : `validerKnowledgeItem`/`rejeterKnowledgeItem` ne prennent
   plus de paramètre `validateur` fourni par l'appelant — dérivé côté
   serveur de la session authentifiée, cohérent avec la discipline du
   reste du chantier (jamais fait confiance à une identité fournie par
   le client). `SourceIntelligence.vue` et ses tests mis à jour en
   conséquence.
8. **Ripple effect côté production** : `useReasoningEngineStore.ts`
   (données `knowledgeItems`/`knowledgeRelations` pour le moteur de
   raisonnement) et `useRechercheGlobaleStore.ts` (recherche transverse
   « connaissance ») basculés vers
   `useSourceIntelligenceStore().charger(clientId)` plutôt que
   `db.knowledgeItems` directement. `AccueilQueVoulezVousFaire.vue`
   (widget « À vérifier ») adapté au scoping par client désormais
   obligatoire du Worker : le comptage informations non validées/
   conflits ouverts porte sur le client actif (`useClientActifStore`)
   uniquement — l'ancien agrégat cross-client (toutes les données de
   tous les clients confondues, possible avec Dexie local) n'a plus de
   sens avec des routes scopées par client, et aurait exigé une requête
   admin par client, jamais fabriqué ici.
9. **Filet de sécurité de migration locale** : capture Dexie **v48**
   (`persistance/db.ts`, 9 tables supprimées, données capturées dans
   `sourcesAMigrer`/`sourceLocationsAMigrer`/`sourceVersionsAMigrer`/
   `extractionsAMigrer`/`extractionItemsAMigrer`/`knowledgeItemsAMigrer`/
   `confirmationsAMigrer`/`knowledgeRelationsAMigrer`/`conflictsAMigrer`
   — formes domaine inchangées).
10. **6 fichiers de test corrigés** (accès Dexie direct remplacé par de
    vrais appels store/`ctx.knowledgeEngineRepo`) : `Process.test.ts`,
    `SourceIntelligence.test.ts` (réécriture complète avec wiring
    `fauxWorkerAuth`/`ctx`/`demonter`/`connecterAdminDeTest`),
    `useSourceIntelligenceStore.test.ts` (réécriture complète, même
    wiring — `valide_par`/`confirme_par` désormais vérifiés contre
    l'acteur authentifié `admin@pharmatech.example` plutôt qu'une chaîne
    arbitraire fournie par l'appelant), `useRechercheGlobaleStore.test.ts`
    (suppression du `db.knowledgeItems.clear()` devenu inutile),
    `AccueilQueVoulezVousFaire.test.ts` (les tests « À vérifier »
    seedent désormais un vrai client + `ctx.knowledgeEngineRepo` et
    fixent `useClientActifStore` avant montage, cohérent avec le nouveau
    scopage par client).
11. **Validation complète (18/09/2026)** : `vue-tsc --noEmit`/`tsc
    --noEmit` (Worker) sans erreur, `eslint --fix`/`prettier --write`
    (racine + workers) sans erreur ni changement, `npx vitest run`
    racine (**1352/1352 tests verts**, 165 fichiers), `cd
    workers/auth-worker && npx vitest run` (**225/225 tests verts**).

### 18.2 Phase 7a — terminée (18/09/2026)

1. ✅ Commit + push de l'incrément sur `claude/contexte-reprise-session-tin77u`.
2. ✅ PR #64 ouverte. CI (« Quality gate ») verte du premier coup, aucun
   flake rencontré. Mergée sur `main` (squash, commit `67ab6ed`).
3. ✅ Migration `0018_knowledge_engine.sql` appliquée en production D1
   (`validapharm-auth`) en 18 requêtes séparées (9 `CREATE TABLE` + 9
   `CREATE INDEX`), toutes réussies du premier coup. Vérification
   `sqlite_master` confirmant les 9 tables + leurs 9 index nommés.
4. ✅ Code déployé vérifié sur le Worker en production
   (`workers_get_worker_code`, `validapharm-auth-worker`) : les routes et
   `D1KnowledgeEngineRepo` présents dans le bundle (62 occurrences).
5. ⬜ GitHub sync généralisée : toujours reportée (même manque assumé
   depuis les phases précédentes) — `Source`/`SourceLocation`/
   `SourceVersion`/`Extraction`/`ExtractionItem`/`KnowledgeItem`/
   `Confirmation`/`KnowledgeRelation`/`Conflict` n'ont jamais été
   synchronisés vers GitHub, même avant cette migration : pas une
   régression.

### 18.3 Phase 7a close ; suite du chantier

Reste, dans la Phase 7 (voir §3) :

- **Phase 7b** : `contentPlans` (Deliverable Engine) — voir §19, terminée.
- **Phase 7c** : `connectors`/`syncJobs`/`externalReferences`
  (connecteurs QMS tiers).

Enchaîner sur la Phase 7b sans s'arrêter pour confirmation, conformément
à la consigne permanente de l'utilisateur. Le problème des nœuds SAP
(bug d'import original) reste explicitement reporté, comme depuis le
début de ce chantier.

## 19. État détaillé — Phase 7b (`ContentPlan`, domaine « Deliverable Engine »), au 18/09/2026

Deuxième brique de la Phase 7. `ContentPlan` (planification d'un
livrable : `Request → Resolve → Context Snapshot → Content Plan`, ni
génération, ni rendu, ni approbation finale — hors périmètre, portés par
le moteur de gabarits existant). Reste dans la Phase 7 :
`connectors`/`syncJobs`/`externalReferences` (connecteurs QMS tiers,
Phase 7c).

### 19.1 Ce qui est fait (code complet, tout vert localement et en CI)

1. **Migration D1** : `workers/auth-worker/migrations/0019_content_plan.sql`
   crée la table `content_plans` (colonnes camelCase→snake_case standard
   du chantier) + un index sur `client_id`. `ContentPlan` reste
   **mutable** via `statut`/`readiness`/`audit_log`/`updated_at`
   (validation, gel, recalcul de readiness) — `context_snapshot` figé une
   seule fois à la création, jamais modifié ensuite.
2. **1 dépôt Worker** : `contentPlanRepo.ts` (interface +
   `ContentPlanRepoMemoire`) + son implémentation D1
   (`d1ContentPlanRepo.ts`) : INSERT (`ON CONFLICT(id) DO NOTHING`) pour
   la création, UPDATE ciblé (readiness/statut/audit_log/updated_at
   uniquement) pour `remplacerContentPlan`.
3. **5 nouvelles routes Worker** sous `/clients/:clientId/content-plans`
   (GET agrégat, POST création — `readiness` toujours calculée côté
   serveur, jamais fournie par le client —, PATCH
   `:id/recalculer-readiness`, PATCH `:id/valider`, PATCH `:id/geler`,
   POST `migration-locale`), toutes via `exigerAccesClient`.
4. **`calculerReadinessContentPlan`** : logique métier portée côté
   Worker depuis `logique-metier/deliverable/readinessContentPlan.ts`
   (adaptée aux champs camelCase des dépôts Worker) — parcourt
   `Requirement → Couverture → Test → Execution → Evidence` ancré sur
   `assetNodeId`, plus un `QualityEvent` non clôturé sur ce même nœud qui
   bloque toujours, en lisant les 4 dépôts D1 déjà migrés
   (`testDefinitionRepo`, `executionRepo`, `evidenceRepo`,
   `qualityEventRepo`) via `Promise.all`. Appelée à la création, sur
   demande explicite (`recalculer-readiness`), et **revérifiée** dans le
   garde-fou non négociable de `gelerContentPlan` — un `ContentPlan` DOIT
   être `valide` au préalable ET sa `readiness` recalculée DOIT être
   `pret`, jamais fait confiance à une valeur stockée ou envoyée par
   l'appelant.
5. **`index.ts`** : `D1ContentPlanRepo` câblé dans `routerRequete`.
6. **18 nouveaux tests Worker** (`routeur.test.ts`) : GET vide, création
   sans/avec `assetNodeId` (readiness `besoin_information`), chaîne
   complète jusqu'à la preuve (readiness `pret`), recalcul (succès,
   404 introuvable, 400 `deja_gele`), validation (succès, 404, 400
   `deja_gele`), gel (succès, 404, 400 `non_valide`, 400
   `donnees_non_pretes` avec readiness recalculée ≠ `pret` malgré une
   valeur stockée différente, 400 `deja_gele`), migration locale
   idempotente, non-authentifié → 401. **Résultat : 243/243 tests Worker
   verts** (225 existants + 18 nouveaux).
7. **`AuthApiClient.ts`** : `ContentPlanWire`/`SaisieCreationContentPlanWire`
   + 5 méthodes (`obtenirContentPlans`, `creerContentPlan`,
   `recalculerReadinessContentPlan`, `validerContentPlan`,
   `gelerContentPlan`, `migrerContentPlansLocal`).
8. **`useContentPlanStore.ts`** : entièrement réécrit vers l'API (même
   patron `obtenirApi()`/`resultat.ok`/`resultat.donnees`/
   `resultat.erreur` que les autres stores de ce chantier). Surface
   publique préservée à l'identique (`contentPlans`, `enChargement`,
   `charger`, `creerContentPlan`, `validerContentPlan`,
   `gelerContentPlan`, `recalculerReadiness`) — le calcul de `readiness`
   n'est plus fait côté client (l'ancien `calculerReadiness` rechargeant
   QualityEvent/Requirement/Couverture/Test/Execution/Evidence via 4
   stores a été entièrement supprimé, le Worker fait ce travail
   désormais).
9. **`persistance/db.ts`** : retrait de `contentPlans!:
   EntityTable<ContentPlan, 'id'>`, ajout de `contentPlansAMigrer:
   ContentPlan[]` + migration `.version(49)` nullant `contentPlans` et
   capturant les lignes existantes — même filet de sécurité que les
   phases précédentes.
10. **Fichiers de test corrigés** : `useContentPlanStore.test.ts` (retrait
    de `db.contentPlans.clear()`, plus nécessaire — les dépôts en mémoire
    de `installerFauxWorkerAuth()` repartent déjà à vide à chaque test) ;
    `ContentPlan.test.ts` (`db.contentPlans.*` → `ctx.contentPlanRepo.
    listerContentPlans(clientId)`, même patron de polling que
    `SourceIntelligence.test.ts`/`AccueilQueVoulezVousFaire.test.ts` en
    Phase 7a).
11. **Validation complète** : `npx vue-tsc --noEmit` (aucune erreur),
    Worker `npx vitest run` (243/243), frontend `npx vitest run`
    (1370/1370), `npx eslint . --fix` + `npx prettier --write .`.

### 19.2 Phase 7b — terminée (18/09/2026)

1. ✅ Commit + push de l'incrément sur `claude/contexte-reprise-session-tin77u`.
2. ✅ PR #66 ouverte. CI (« Lint, typecheck, tests » + builds Workers)
   verte du premier coup, aucun flake rencontré. Mergée sur `main`
   (squash, commit `246b53d`).
3. ✅ Migration `0019_content_plan.sql` appliquée en production D1
   (`validapharm-auth`) en 2 requêtes séparées (1 `CREATE TABLE` + 1
   `CREATE INDEX`), toutes réussies du premier coup. Vérification
   `sqlite_master` confirmant la table + son index nommé.
4. ✅ Code déployé vérifié sur le Worker en production
   (`workers_get_worker_code`, `validapharm-auth-worker`) : les routes et
   `D1ContentPlanRepo` présents dans le bundle (58 occurrences).
5. ⬜ GitHub sync généralisée : toujours reportée (même manque assumé
   depuis les phases précédentes) — `ContentPlan` n'a jamais été
   synchronisé vers GitHub, même avant cette migration : pas une
   régression.

### 19.3 Phase 7b close ; suite du chantier

Reste, dans la Phase 7 (voir §3) :

- **Phase 7c** : `connectors`/`syncJobs`/`externalReferences`
  (connecteurs QMS tiers) — dernière brique de la Phase 7, voir §20,
  terminée.

## 20. État détaillé — Phase 7c (`Connector`/`SyncJob`/`ExternalReference`, domaine « Integration »), au 18/09/2026

Troisième et dernière brique de la Phase 7. `Connector`/`SyncJob`/
`ExternalReference` (connecteurs QMS/documentaires tiers — Veeva Vault,
SharePoint, dossier réseau, EDMS générique — plus `github`/
`google_drive` en ADAPT sur les connecteurs de stockage déjà existants).
Deux stores frontend partageaient déjà ce domaine côté Dexie :
`useIntegrationStore` (orchestration complète Connector→SyncJob→
ExternalReference, spec `PHASE_10_INTEGRATION_GATEWAY_SPEC.md`, jamais
consommé par un écran) et `useConnecteursQMSStore` (CRUD de
configuration, consommé par `ConfigurationConnecteursQMS.vue` — écran
trouvé le 31/08/2026 sans jamais avoir eu de store Worker).

### 20.1 Ce qui est fait (code complet, tout vert localement et en CI)

1. **Migration D1** : `workers/auth-worker/migrations/0020_integration.sql`
   crée 3 tables (`connectors`, `sync_jobs`, `external_references`) + un
   index par table sur `client_id` (plus un index secondaire sur
   `connector_id` pour `sync_jobs`/`external_references`). `Connector`
   reste **mutable** via `actif` (activation/désactivation, bascule) et
   **réellement supprimable** (`DELETE` physique — **nouveau patron dans
   ce chantier**, jamais utilisé jusqu'ici : tous les autres domaines
   migrés restent append-only ou changent seulement de statut, jamais
   supprimés, car ce sont des enregistrements GxP à préserver ;
   `Connector` est une pure configuration technique, sa suppression ne
   perd aucune preuve). `SyncJob` reste mutable via
   `statut`/`tentative`/`derniere_erreur`/`updated_at`. `ExternalReference`
   est **INSERT-only** (pur pointeur, jamais modifié).
2. **1 dépôt Worker** : `integrationRepo.ts` (interface +
   `IntegrationRepoMemoire`) + son implémentation D1
   (`d1IntegrationRepo.ts`) : INSERT (`ON CONFLICT(id) DO NOTHING`) pour
   les créations, UPDATE ciblé pour `remplacerConnector`/
   `remplacerSyncJob`, DELETE réel pour `supprimerConnector`.
3. **12 nouvelles routes Worker** sous `/clients/:clientId/...` (GET
   agrégat `integration`, création `connectors` — `id`/`actif`/
   `createdAt` dérivés côté serveur, `config` — secrets de connexion
   inclus — stocké tel quel en JSON —, `connectors/:id/desactiver`,
   `connectors/:id/basculer-actif`, `DELETE connectors/:id`, démarrage
   `connectors/:id/sync-jobs`, 4 routes de changement de statut
   `sync-jobs/:id/{indisponible,nouvelle-tentative,echec,reussi}` —
   garde-fou non négociable : `indisponible`/`echec` ne bloque jamais
   une activité métier indépendante, cohérent avec `QualityEvent` —,
   déclaration de référence `connectors/:id/references` — pointeur
   externe, jamais son contenu dupliqué, aucune vérification d'existence
   du `Connector` (comportement inchangé du store d'origine) —,
   migration locale `integration/migration-locale`), toutes via
   `exigerAccesClient`.
4. **`index.ts`** : `D1IntegrationRepo` câblé dans `routerRequete`.
5. **20 nouveaux tests Worker** (`routeur.test.ts`) : GET vide, création/
   désactivation/bascule/suppression de connecteur (+404 introuvable,
   +400 corps invalide), démarrage de SyncJob (+404
   `connector_introuvable`), cycle complet
   indisponible→nouvelle-tentative→échec sans jamais bloquer
   `declarerReference`, réussite sans toucher aux tentatives
   précédentes, changement de statut sur SyncJob introuvable (+404),
   déclaration/validation de référence externe, migration locale
   idempotente, non-authentifié → 401. **Résultat : 263/263 tests Worker
   verts** (243 existants + 20 nouveaux).
6. **`AuthApiClient.ts`** : `ConnectorWire`/`SyncJobWire`/
   `ExternalReferenceWire`/`SaisieCreationConnectorWire`/
   `SaisieDeclarationReferenceWire` + 12 méthodes.
7. **`useIntegrationStore.ts`** et **`useConnecteursQMSStore.ts`** :
   entièrement réécrits vers l'API (même patron `obtenirApi()`/
   `resultat.ok`/`resultat.donnees`/`resultat.erreur` que les autres
   stores de ce chantier). Surfaces publiques préservées à l'identique.
   Les fonctions de mapping wire↔domaine (`connectorWireVersDomaine`,
   etc.) sont définies une seule fois dans `useIntegrationStore.ts` et
   réutilisées par `useConnecteursQMSStore.ts` (même domaine "Integration"
   côté Worker, pas de duplication).
8. **`persistance/db.ts`** : retrait de `connectors!`/`syncJobs!`/
   `externalReferences!: EntityTable<...>`, ajout de
   `connectorsAMigrer`/`syncJobsAMigrer`/`externalReferencesAMigrer` +
   migration `.version(50)` nullant les 3 tables et capturant les lignes
   existantes — même filet de sécurité que les phases précédentes,
   partagé par les deux stores (idempotent quel que soit l'ordre
   d'appel).
9. **Fichiers de test corrigés** : `useIntegrationStore.test.ts`,
   `useConnecteursQMSStore.test.ts`, `ConfigurationConnecteursQMS.test.ts`
   (tous les trois réécrits pour installer `installerFauxWorkerAuth()` +
   `connecterAdminDeTest()` — aucun ne le faisait auparavant, car les
   anciens stores Dexie n'exigeaient aucune session — et remplacer les
   accès `db.connectors`/`db.syncJobs`/`db.externalReferences` par
   `ctx.integrationRepo.*`).
10. **Validation complète** : `npx vue-tsc --noEmit` (aucune erreur),
    Worker `npx vitest run` (263/263), frontend `npx vitest run`
    (1390/1390 — 1 rejet non géré isolé et non reproductible dans
    `RevueStructureProcedure.livrablesLies.test.ts`, sans lien avec cette
    Phase, confirmé pré-existant et non bloquant sur deux relances
    complètes), `npx eslint . --fix` + `npx prettier --write .`.

### 20.2 Phase 7c — terminée (18/09/2026)

1. ✅ Commit + push de l'incrément sur `claude/contexte-reprise-session-tin77u`.
2. ✅ PR #68 ouverte. CI (« Lint, typecheck, tests » + builds Workers)
   verte du premier coup, aucun flake rencontré. Mergée sur `main`
   (squash, commit `2097620`).
3. ✅ Migration `0020_integration.sql` appliquée en production D1
   (`validapharm-auth`) en 9 requêtes séparées (3 `CREATE TABLE` + 6
   `CREATE INDEX`), toutes réussies du premier coup. Vérification
   `sqlite_master` confirmant les 3 tables + leurs 6 index nommés.
4. ✅ Code déployé vérifié sur le Worker en production
   (`workers_get_worker_code`, `validapharm-auth-worker`) : les routes et
   `D1IntegrationRepo` présents dans le bundle (50 occurrences).
5. ⬜ GitHub sync généralisée : toujours reportée (même manque assumé
   depuis les phases précédentes) — `Connector`/`SyncJob`/
   `ExternalReference` n'ont jamais été synchronisés vers GitHub, même
   avant cette migration : pas une régression.

### 20.3 Phase 7c close ; Phase 7 entièrement close ; suite du chantier

**La Phase 7 est close** (Phase 7a Knowledge Engine — §18, Phase 7b
ContentPlan — §19, Phase 7c Integration — §20). Reste au chantier (voir
§3) :

- **Phase 8** : `missions`/`activities`/`dependencies`/
  `associationsMissionQualityEvent`, `contextSnapshots`/
  `contextSnapshotItems`, `aiConfigurations`/`aiRequests`/`aiResponses`/
  `citationsAIResponse`.
- **Phase 9** : `procedures`/`procedureSteps`, `gabaritsExportClient`,
  `aiChatSessionLogs`, `connexionDrive`/`etatMiroirDrive`, et le reste de
  l'inventaire (voir §3).

Enchaîner sur la Phase 8 sans s'arrêter pour confirmation, conformément
à la consigne permanente de l'utilisateur. Le problème des nœuds SAP
(bug d'import original) reste explicitement reporté, comme depuis le
début de ce chantier.

## 21. État détaillé — Phase 8a (`Mission`/`Activity`/`Dependency`/`AssociationMissionQualityEvent`, domaine « Work »), au 18/09/2026

Première brique de la Phase 8. `Mission`/`Activity` (conteneurs de
travail contextualisés — jamais un moteur de raisonnement en soi) et
leurs deux relations pures `Dependency` (ordre attendu entre `Activity`,
jamais un verrou bloquant) et `AssociationMissionQualityEvent`
(association N:M optionnelle à un `QualityEvent`, jamais une étape
obligatoire).

### 21.1 Ce qui est fait (code complet, tout vert localement et en CI)

1. **Migration D1** : `workers/auth-worker/migrations/0021_mission.sql`
   crée 4 tables (`missions`, `activities`, `dependencies`,
   `associations_mission_quality_event`) + 7 index (`client_id` sur
   chacune, plus `mission_id` sur `activities`,
   `activity_source_id` sur `dependencies`, `mission_id` sur
   `associations_mission_quality_event`). `Mission`/`Activity` restent
   **mutables** via `statut`/`audit_log`/`updated_at` (même patron que
   ContentPlan/KnowledgeItem). `Dependency`/
   `AssociationMissionQualityEvent` sont **INSERT-only**, purs pointeurs
   relationnels, avec recherche d'existant avant création
   (idempotence).
2. **1 dépôt Worker** : `missionRepo.ts` (interface + `MissionRepoMemoire`)
   + son implémentation D1 (`d1MissionRepo.ts`) : INSERT
   (`ON CONFLICT(id) DO NOTHING`) pour les créations, UPDATE ciblé pour
   `remplacerMission`/`remplacerActivity` (seulement
   `statut`/`audit_log`/`updated_at`).
3. **8 nouvelles routes Worker** sous `/clients/:clientId/...` (GET
   agrégat `missions`, création `missions` — `id`/`statut`/`auditLog`
   dérivés côté serveur, `acteur.email` du JWT jamais fait confiance au
   client —, `PATCH missions/:id/statut` — 404 si introuvable —, `POST
   missions/:id/quality-events` — idempotent, cherche l'association
   existante avant d'en créer une —, `POST missions/:id/activities`,
   `PATCH activities/:id/statut` — 404 si introuvable —, `POST
   activities/:id/dependances` — idempotent —, migration locale `POST
   missions/migration-locale`), toutes via `exigerAccesClient`.
4. **`index.ts`** : `D1MissionRepo` câblé dans `routerRequete`.
5. **14 nouveaux tests Worker** (`routeur.test.ts`) : GET vide, création
   de mission (+400 corps invalide), changement de statut (+404
   introuvable, audit_log cumulé), association QualityEvent idempotente,
   création d'activité (+400 corps invalide), changement de statut
   d'activité (+404 introuvable, audit_log cumulé), ajout de dépendance
   idempotent, migration locale idempotente (+400 corps invalide),
   non-authentifié → 401. **Résultat : 277/277 tests Worker verts** (263
   existants + 14 nouveaux).
6. **`AuthApiClient.ts`** : `MissionWire`/`ActivityWire`/`DependencyWire`/
   `AssociationMissionQualityEventWire`/`SaisieCreationMissionWire`/
   `SaisieCreationActivityWire` + 8 méthodes.
7. **`useMissionStore.ts`** : entièrement réécrit vers l'API (même
   patron `obtenirApi()`/`resultat.ok`/`resultat.donnees`/
   `resultat.erreur` que les autres stores de ce chantier). Surface
   publique préservée à l'identique — retrait de
   `identifiantActeurCourant()` (l'acteur est désormais dérivé côté
   serveur depuis le JWT).
8. **`persistance/db.ts`** : retrait de `missions!`/`activities!`/
   `dependencies!`/`associationsMissionQualityEvent!: EntityTable<...>`,
   ajout de `missionsAMigrer`/`activitiesAMigrer`/`dependenciesAMigrer`/
   `associationsMissionQualityEventAMigrer` + migration `.version(51)`
   nullant les 4 tables et capturant les lignes existantes — même filet
   de sécurité que les phases précédentes.
9. **Fichiers de test corrigés** : `useMissionStore.test.ts` (réécrit
   pour installer `installerFauxWorkerAuth()` + `connecterAdminDeTest()`
   — ne le faisait pas auparavant, l'ancien store Dexie n'exigeant aucune
   session), `ListeMissions.test.ts` (même patron ajouté au bloc qui ne
   l'avait pas), `MissionWorkspace.test.ts` (remplacement des accès
   `db.missions`/`db.activities`/`db.dependencies`/
   `db.associationsMissionQualityEvent` par `ctx.missionRepo.*`),
   `DossierVivantActif.test.ts` (retrait du `db.missions.clear()` devenu
   inutile).
10. **Validation complète** : `npx vue-tsc --noEmit` (aucune erreur),
    Worker `npx tsc --noEmit` (aucune erreur) + `npx vitest run`
    (277/277), frontend `npx vitest run` (1404/1404), `npx eslint . --fix`
    + `npx prettier --write .`.

### 21.2 Phase 8a — terminée (18/09/2026)

1. ✅ Commit + push de l'incrément sur `claude/contexte-reprise-session-tin77u`.
2. ✅ PR #70 ouverte. CI (« Lint, typecheck, tests » + builds Workers)
   verte du premier coup, aucun flake rencontré. Mergée sur `main`
   (squash, commit `7c3b605`).
3. ✅ Migration `0021_mission.sql` appliquée en production D1
   (`validapharm-auth`) en 11 requêtes séparées (4 `CREATE TABLE` + 7
   `CREATE INDEX`), toutes réussies du premier coup. Vérification
   `sqlite_master` confirmant les 4 tables + leurs 7 index nommés.
4. ✅ Code déployé vérifié sur le Worker en production
   (`workers_get_worker_code`, `validapharm-auth-worker`) : les routes et
   `D1MissionRepo` présents dans le bundle (9 occurrences).
5. ⬜ GitHub sync généralisée : toujours reportée (même manque assumé
   depuis les phases précédentes) — `Mission`/`Activity`/`Dependency`/
   `AssociationMissionQualityEvent` n'ont jamais été synchronisés vers
   GitHub, même avant cette migration : pas une régression.

### 21.3 Suite du chantier

Reste à la Phase 8 (voir §3) :

- **Phase 8b** : `contextSnapshots`/`contextSnapshotItems` — `ContextSnapshot`/
  `ContextSnapshotItem` sont **entièrement immuables** (aucune fonction
  de mise à jour exposée), `assemblerElementsContextSnapshot`
  (`src/logique-metier/contexte/assemblageContextSnapshot.ts`) est une
  fonction pure lisant des domaines déjà migrés (Organization/Workspace,
  Structure Système, ManufacturingContext, QualityEvent) — forte
  candidate au portage côté serveur, comme
  `calculerReadinessContentPlan` en Phase 7b.
- **Phase 8c** : `aiConfigurations`/`aiRequests`/`aiResponses`/
  `citationsAIResponse` (domaine AI) — seule la persistance CRUD migre
  vers le Worker ; l'orchestration du raisonnement
  (`executerBoucleRaisonnement`, appels réseau réels au fournisseur LLM
  via `ProviderAdapter`) reste côté client, hors périmètre de ce
  chantier.

Enchaîner sur la Phase 8b sans s'arrêter pour confirmation, conformément
à la consigne permanente de l'utilisateur. Le problème des nœuds SAP
(bug d'import original) reste explicitement reporté, comme depuis le
début de ce chantier.

## 22. État détaillé — Phase 8b (`ContextSnapshot`/`ContextSnapshotItem`, domaine « Context Engine »), au 18/09/2026

Deuxième brique de la Phase 8. `ContextSnapshot`/`ContextSnapshotItem`
sont entièrement immuables (invariant #12, aucune fonction de mise à
jour exposée côté store depuis toujours). Contrairement aux phases
précédentes, l'assemblage des éléments de contexte
(`assemblerElementsContextSnapshot`, anciennement fonction pure côté
client) a été **porté côté serveur**, comme
`calculerReadinessContentPlan` l'avait été en Phase 7b — les données
qu'elle lit (Organization/Workspace, Structure Système,
ManufacturingContext, QualityEvent) sont toutes déjà en D1.

### 22.1 Ce qui est fait (code complet, tout vert localement et en CI)

1. **Migration D1** : `workers/auth-worker/migrations/0022_context_snapshot.sql`
   crée 2 tables (`context_snapshots`, `context_snapshot_items`) + 3
   index (`client_id` sur chacune, plus `context_snapshot_id` sur
   `context_snapshot_items`). Les deux tables sont **INSERT-only**,
   aucune colonne mise à jour après création.
2. **1 dépôt Worker** : `contextSnapshotRepo.ts` (interface +
   `ContextSnapshotRepoMemoire`) + son implémentation D1
   (`d1ContextSnapshotRepo.ts`).
3. **Fonctions pures portées côté serveur** dans `routeur.ts` :
   `ancetresWorkspaceServeur`/`noeudsVisiblesDepuisWorkspaceServeur`
   (mêmes algorithmes que `logique-metier/organisation/
   ancetresWorkspace.ts`/`noeudsVisiblesDepuisWorkspace.ts`, champs
   camelCase des dépôts Worker) et `assemblerElementsContextSnapshot`
   (même algorithme que `logique-metier/contexte/
   assemblageContextSnapshot.ts`), lisant
   `ctx.organisationRepo.listerWorkspaces`/
   `ctx.structureSystemeRepo.listerNoeuds`/
   `ctx.processContextRepo.listerManufacturingContexts`/
   `ctx.qualityEventRepo.listerEvenements`.
4. **3 nouvelles routes Worker** sous `/clients/:clientId/context-snapshots`
   (GET agrégat, POST assemblage — `workspaceId`/`assetNodeId` en
   entrée, résolution des éléments **toujours calculée côté serveur**,
   jamais fait confiance à une liste fournie par le client —, POST
   `migration-locale`), toutes via `exigerAccesClient`.
5. **`index.ts`** : `D1ContextSnapshotRepo` câblé dans `routerRequete`.
6. **7 nouveaux tests Worker** (`routeur.test.ts`) : GET vide, assemblage
   sans ancre (snapshot vide, jamais une erreur), résolution exacte par
   `assetNodeId` (incluant `manufacturing_context`/`quality_event`
   rattachés, excluant ceux d'un autre nœud), résolution par
   `workspaceId` avec héritage (nœud non assigné inclus), migration
   locale idempotente (+400 corps invalide), non-authentifié → 401.
   **Résultat : 284/284 tests Worker verts** (277 existants + 7
   nouveaux).
7. **`AuthApiClient.ts`** : `ContextSnapshotWire`/
   `ContextSnapshotItemWire`/`SaisieAssemblageContextSnapshotWire` + 3
   méthodes.
8. **`useContextEngineStore.ts`** : entièrement réécrit vers l'API.
   `assemblerSnapshot` ne prend plus que `workspaceId`/`assetNodeId` —
   la résolution des éléments n'est plus de sa responsabilité, tout le
   reste de la surface publique (`snapshots`, `items`, `charger`,
   `elementsDuSnapshot`) inchangé.
9. **`useReasoningEngineStore.ts`** : seul autre consommateur direct de
   `db.contextSnapshotItems` (pour construire le narratif de contexte
   envoyé au fournisseur IA) — corrigé pour appeler
   `useContextEngineStore().charger(clientId)` puis
   `elementsDuSnapshot(contextSnapshotId)`.
10. **`persistance/db.ts`** : retrait de `contextSnapshots!`/
    `contextSnapshotItems!: EntityTable<...>`, ajout de
    `contextSnapshotsAMigrer`/`contextSnapshotItemsAMigrer` + migration
    `.version(52)` nullant les 2 tables et capturant les lignes
    existantes.
11. **Fichiers de test corrigés** : `useContextEngineStore.test.ts`
    (entièrement réécrit — ne passe plus `arbreWorkspace`/`assetNodes`/
    `manufacturingContexts`/`qualityEvents` à `assemblerSnapshot`,
    seed les données via `installerFauxWorkerAuth()` + repos Worker),
    `useReasoningEngineStore.test.ts` (remplace
    `db.contextSnapshotItems.put(...)` par
    `ctx.contextSnapshotRepo.creerItem(...)`), `MissionWorkspace.test.ts`
    (remplace `db.contextSnapshots.count()` par
    `ctx.contextSnapshotRepo.listerSnapshots(...)`).
12. **Validation complète** : `npx vue-tsc --noEmit` (aucune erreur),
    Worker `npx tsc --noEmit` (aucune erreur) + `npx vitest run`
    (284/284), frontend `npx vitest run` (1412/1412).

### 22.2 Incident CI post-PR et correction

La première CI de la PR #72 a échoué : `MissionWorkspace.vue` (le seul
composant, hors tests, appelant `assemblerSnapshot`) avait été oublié
lors de la réécriture — il passait encore `arbreWorkspace`/`assetNodes`/
`manufacturingContexts`/`qualityEvents` à l'ancienne signature, absents
du nouveau type `EntreesAssemblage`. **Leçon retenue** : le grep
systématique sur `db.<table>` avant de considérer une phase terminée
(discipline déjà en place) ne suffit pas seul pour une migration qui
change la *signature* d'une fonction de store existante (pas seulement
l'accès Dexie sous-jacent) — il faut aussi grep chaque appelant de la
fonction publique modifiée (`assemblerSnapshot` ici) dans tout `src/`,
composants Vue inclus, pas seulement les fichiers de test. Corrigé en un
second commit sur la même PR : `MissionWorkspace.vue` simplifié pour
n'envoyer que `workspaceId`/`assetNodeId`, et `useOrganizationStore`
retiré du composant (devenu inutile, ne servait qu'à construire
l'`arbreWorkspace` local). CI repassée verte au commit suivant.

### 22.3 Phase 8b — terminée (18/09/2026)

1. ✅ Commit + push de l'incrément sur `claude/contexte-reprise-session-tin77u`.
2. ✅ PR #72 ouverte. Premier commit CI rouge (typecheck, voir §22.2
   ci-dessus) — correctif poussé en second commit sur la même PR, CI
   repassée verte (« Lint, typecheck, tests » + builds Workers).
   Mergée sur `main` (squash, commit `cd8fd59`).
3. ✅ Migration `0022_context_snapshot.sql` appliquée en production D1
   (`validapharm-auth`) en 5 requêtes séparées (2 `CREATE TABLE` + 3
   `CREATE INDEX`), toutes réussies du premier coup. Vérification
   `sqlite_master` confirmant les 2 tables + leurs 3 index nommés.
4. ✅ Code déployé vérifié sur le Worker en production
   (`workers_get_worker_code`, `validapharm-auth-worker`) : les routes et
   `D1ContextSnapshotRepo` présents dans le bundle (6 occurrences).
5. ⬜ GitHub sync généralisée : toujours reportée (même manque assumé
   depuis les phases précédentes).

### 22.4 Suite du chantier

Phase 8c (`aiConfigurations`/`aiRequests`/`aiResponses`/
`citationsAIResponse`, domaine « Reasoning Engine ») — voir §23.

## 23. État détaillé — Phase 8c (`AIConfiguration`/`AIRequest`/`AIResponse`/`CitationAIResponse`, domaine « Reasoning Engine »), au 18/09/2026

Troisième et dernière brique de la Phase 8. Seule la persistance CRUD
migre vers le Worker/D1 : l'orchestration du raisonnement
(`executerBoucleRaisonnement`, appels réseau réels au fournisseur LLM
via `ProviderAdapter`) reste côté client, hors périmètre de ce
chantier — c'est une décision de scope délibérée, pas un oubli. Les 4
entités sont entièrement immuables une fois créées (invariant #12,
condition E4 de la revue panel : une configuration versionnée n'est
jamais modifiée en place, une nouvelle version en crée une nouvelle) —
aucune fonction de mise à jour exposée, ni côté Worker ni côté store.

### 23.1 Ce qui est fait (code complet, tout vert localement et en CI)

1. **Migration D1** : `workers/auth-worker/migrations/0023_reasoning_engine.sql`
   crée 4 tables (`ai_configurations`, `ai_requests`, `ai_responses`,
   `citations_ai_response`) + 7 index (`client_id` sur chacune, plus
   `(client_id, version)` sur `ai_configurations` pour la recherche
   idempotente par version, `ai_request_id` sur `ai_responses`,
   `ai_response_id` sur `citations_ai_response`). Les 4 tables sont
   **INSERT-only**, aucune colonne mise à jour après création.
2. **1 dépôt Worker** : `reasoningEngineRepo.ts` (interface +
   `ReasoningEngineRepoMemoire`) + son implémentation D1
   (`d1ReasoningEngineRepo.ts` — `JSON.stringify`/`parse` pour
   `outils_disponibles` et `trace_appels_outils`, seuls champs non
   scalaires du domaine).
3. **6 nouvelles routes Worker** sous `/clients/:clientId/reasoning-engine`
   (GET agrégat des 4 collections, POST `configurations` — **idempotent
   par version côté serveur** via `configurationParVersion`, jamais de
   duplication même si le client rejoue l'appel —, POST `requests`, POST
   `responses`, POST `citations` en masse — même patron que
   `db.citationsAIResponse.bulkPut(...)` côté client, un tableau créé en
   une seule requête —, POST `migration-locale`), toutes via
   `exigerAccesClient`. `acteur` authentifié mais non utilisé dans les
   handlers : aucune des 4 entités n'a de champ acteur/audit_log dans le
   modèle de domaine (contrairement à Mission/Activity).
4. **`index.ts`** : `D1ReasoningEngineRepo` câblé dans `routerRequete`.
5. **12 nouveaux tests Worker** (`routeur.test.ts`) : GET vide,
   `assurerConfiguration` idempotent (création puis retour de la même
   configuration par version, +400 corps invalide), création AIRequest
   (+400 champs manquants), création AIResponse (+400 champs manquants),
   citations en masse (+400 entrée malformée), migration locale
   idempotente (+400 corps invalide), non-authentifié → 401. **Résultat :
   296/296 tests Worker verts** (284 existants + 12 nouveaux).
6. **`AuthApiClient.ts`** : `AIConfigurationWire`/`AIRequestWire`/
   `AIResponseWire`/`CitationAIResponseWire`/`TraceAppelOutilWire` + types
   de saisie + 6 méthodes.
7. **`useReasoningEngineStore.ts`** : entièrement réécrit vers l'API.
   `charger`/`assurerConfiguration` appellent désormais le Worker ;
   `executerRaisonnement` garde exactement la même signature publique et
   le même comportement pour ses appelants (`EditeurSection.vue`,
   `MissionWorkspace.vue`) — seule sa persistance interne
   (`db.aiRequests.put`/`db.aiResponses.put`/
   `db.citationsAIResponse.bulkPut` → `api.creerAIRequest`/
   `api.creerAIResponse`/`api.creerCitationsAIResponse`) a changé.
   `executerBoucleRaisonnement` lui-même et tout le chargement des
   domaines déjà migrés (Structure Système/ManufacturingContext/
   QualityEvent/Requirement-Test/Execution/Evidence/
   SourceIntelligence/ContextEngine) restent inchangés — seuls
   `db.procedures`/`db.procedureSteps` restent lus directement en Dexie
   (hors périmètre de ce chantier, Phase 9).
8. **`persistance/db.ts`** : retrait de `aiConfigurations!`/
   `aiRequests!`/`aiResponses!`/`citationsAIResponse!: EntityTable<...>`,
   ajout de `aiConfigurationsAMigrer`/`aiRequestsAMigrer`/
   `aiResponsesAMigrer`/`citationsAIResponseAMigrer` + migration
   `.version(53)` nullant les 4 tables et capturant les lignes
   existantes.
9. **Fichiers de test corrigés** : `useReasoningEngineStore.test.ts`
   (chaque test appelant `charger`/`assurerConfiguration`/
   `executerRaisonnement` bascule vers `installerFauxWorkerAuth()` +
   client réel, exigé par `exigerAccesClient` — plusieurs tests
   n'avaient jusqu'ici besoin d'aucune authentification, patron
   identique au reste du chantier), `MissionWorkspace.test.ts`
   (`db.aiResponses.count()` → `ctx.reasoningEngineRepo.listerResponses(...)`).
10. **Grep de complétude** (discipline §22.2 appliquée dès le départ,
    pas après coup cette fois) : aucun `db.aiConfigurations`/
    `db.aiRequests`/`db.aiResponses`/`db.citationsAIResponse` restant
    dans `src/` ; tous les appelants de `useReasoningEngineStore()`
    (`EditeurSection.vue`, `MissionWorkspace.vue`, leurs fichiers de
    test) vérifiés compatibles avec la surface publique inchangée —
    aucun incident CI cette fois.
11. **Validation complète** : `npx vue-tsc --noEmit` (aucune erreur),
    Worker `npx tsc --noEmit` (aucune erreur) + `npx vitest run`
    (296/296), frontend `npx vitest run` (1424/1424), `npx eslint . --fix`
    et `npx prettier --write .` propres.

### 23.2 Phase 8c — terminée (18/09/2026)

1. ✅ Commit + push de l'incrément sur `claude/contexte-reprise-session-tin77u`.
2. ✅ PR #74 ouverte, CI verte du premier coup (« Lint, typecheck, tests »
   + builds Workers `validapharm-auth-worker`/`validapharm-ia-relay`).
   Mergée sur `main` (squash, commit `7a37789`).
3. ✅ Migration `0023_reasoning_engine.sql` appliquée en production D1
   (`validapharm-auth`) en 11 requêtes séparées (4 `CREATE TABLE` + 7
   `CREATE INDEX`), toutes réussies du premier coup. Vérification
   `sqlite_master` confirmant les 4 tables + leurs 7 index nommés.
4. ✅ Code déployé vérifié sur le Worker en production
   (`workers_get_worker_code`, `validapharm-auth-worker`) :
   `D1ReasoningEngineRepo`, les 6 routes `/reasoning-engine`, et les
   handlers `gererObtenirReasoningEngine`/`gererAssurerConfiguration`
   présents dans le bundle.
5. ⬜ GitHub sync généralisée : toujours reportée (même manque assumé
   depuis les phases précédentes).

### 23.3 Phase 8 — entièrement close

La Phase 8 (Mission/Activity, ContextSnapshot, Reasoning Engine) est
désormais **entièrement migrée** : code, production D1, déploiement
Worker vérifiés pour ses 3 sous-phases (8a §21, 8b §22, 8c §23).

Phase 9a (`procedures`/`procedureSteps`, cerveau procédural) — voir §24.

## 24. État détaillé — Phase 9a (`Procedure`/`ProcedureStep`, cerveau procédural), au 18/09/2026

Première brique de la Phase 9. `Procedure`/`ProcedureStep` restent
entièrement immuables (INSERT-only) : une nouvelle révision d'une
`reference` incrémente `numeroVersion` **côté serveur**, jamais une
mutation en place — répond à R-21, `02-analyse-de-risque-outil.md`.

### 24.1 Ce qui est fait (code complet, tout vert localement et en CI)

1. **Migration D1** : `workers/auth-worker/migrations/0024_procedure.sql`
   crée 2 tables (`procedures`, `procedure_steps`) + 4 index (`client_id`
   sur chacune, plus `(client_id, reference)` sur `procedures` et
   `procedure_id` sur `procedure_steps`). Les deux tables sont
   **INSERT-only**, aucune colonne mise à jour après création.
2. **1 dépôt Worker** : `procedureRepo.ts` (interface +
   `ProcedureRepoMemoire`) + son implémentation D1
   (`d1ProcedureRepo.ts` — booléen `obligatoire` stocké en `INTEGER`
   0/1, même patron que `has_binary_content` en Phase 39).
3. **4 nouvelles routes Worker** sous `/clients/:clientId/procedures`
   (GET agrégat des 2 collections, POST création — `numeroVersion`
   **calculé côté serveur** par recherche du maximum existant pour la
   même `reference`, jamais fait confiance à une valeur fournie par le
   client —, POST `/:procedureId/steps` — `ordre` auto-incrémenté côté
   serveur, garde `procedure_introuvable` en 404 si la procédure
   n'existe pas ou appartient à un autre client —, POST
   `migration-locale`), toutes via `exigerAccesClient`.
4. **`index.ts`** : `D1ProcedureRepo` câblé dans `routerRequete`.
5. **10 nouveaux tests Worker** (`routeur.test.ts`) : GET vide, création
   avec `numeroVersion = 1`, deuxième révision de la même référence
   (`numeroVersion = 2`, jamais une mutation), +400 corps invalide,
   ajout d'étape avec `ordre` auto-incrémenté, ajout à une procédure
   inexistante → `procedure_introuvable` (404), +400 corps invalide,
   migration locale idempotente (+400 corps invalide), non-authentifié
   → 401. **Résultat : 306/306 tests Worker verts** (296 existants + 10
   nouveaux).
6. **`AuthApiClient.ts`** : `ProcedureWire`/`ProcedureStepWire` + types
   de saisie + 4 méthodes.
7. **`useProcedureStore.ts`** : entièrement réécrit vers l'API — même
   surface publique pour tous ses appelants (`charger`, `creerProcedure`,
   `ajouterEtape`, `etapesDeProcedure`, `proceduresParCategorie`,
   `derniereVersion`, `genererProposition`/`annulerProposition`/
   `confirmerProposition` inchangés). `creerProcedure` ne calcule plus
   `numero_version` localement — délégué au serveur, idempotent par
   construction.
8. **`persistance/db.ts`** : retrait de `procedures!`/
   `procedureSteps!: EntityTable<...>`, ajout de
   `proceduresAMigrer`/`procedureStepsAMigrer` + migration `.version(54)`
   nullant les 2 tables et capturant les lignes existantes.
9. **Autres consommateurs directs corrigés** (discipline §22.2 appliquée
   dès le départ) : `useReasoningEngineStore.ts` (le narratif du moteur
   de raisonnement lisait `db.procedures`/`db.procedureSteps`
   directement — bascule vers `useProcedureStore().charger(clientId)`)
   et `useRechercheGlobaleStore.ts` (même correction pour la recherche
   transverse).
10. **Fichiers de test corrigés** : `useProcedureStore.test.ts`
    (entièrement réécrit — bascule vers `installerFauxWorkerAuth()` +
    client réel, plusieurs tests n'avaient jusqu'ici besoin d'aucune
    authentification), `useReasoningEngineStore.test.ts`,
    `useRechercheGlobaleStore.test.ts`,
    `AssistantCreationLivrable.test.ts`,
    `EditeurSection.liensStructurels.test.ts`,
    `RechercheGlobale.test.ts`,
    `RevueStructureProcedure.livrablesLies.test.ts` (ce dernier
    utilisait un `client-1` jamais réellement créé via `clientsRepo` —
    fonctionnait tant que `db.procedures` ne vérifiait rien côté
    serveur ; corrigé en créant le client dans `beforeEach`).
11. **Validation complète** : `npx vue-tsc -b --noEmit` (aucune erreur —
    **note** : `npx vue-tsc --noEmit` sans `-b` ne typecheck rien du
    tout dans ce projet, `tsconfig.json` racine n'a que des
    `references` ; toujours utiliser `-b`, comme le fait le script
    `npm run typecheck`), Worker `npx tsc --noEmit` (aucune erreur) +
    `npx vitest run` (306/306), frontend `npx vitest run` (1434/1434),
    `npx eslint . --fix` et `npx prettier --write .` propres.

### 24.2 Phase 9a — terminée (18/09/2026)

1. ✅ Commit + push de l'incrément sur `claude/contexte-reprise-session-tin77u`.
2. ✅ PR #76 ouverte, CI verte du premier coup (« Lint, typecheck, tests »
   + builds Workers `validapharm-auth-worker`/`validapharm-ia-relay`).
   Mergée sur `main` (squash, commit `eabe996`).
3. ✅ Migration `0024_procedure.sql` appliquée en production D1
   (`validapharm-auth`) en 6 requêtes séparées (2 `CREATE TABLE` + 4
   `CREATE INDEX`), toutes réussies du premier coup. Vérification
   `sqlite_master` confirmant les 2 tables + leurs 4 index nommés.
4. ✅ Code déployé vérifié sur le Worker en production
   (`workers_get_worker_code`, `validapharm-auth-worker`) :
   `D1ProcedureRepo`, les 4 routes `/procedures`, et les handlers
   `gererObtenirProcedures`/`gererCreerProcedure` présents dans le
   bundle.
5. ⬜ GitHub sync généralisée : toujours reportée (même manque assumé
   depuis les phases précédentes).

### 24.3 Suite du chantier

Voir §25 pour la Phase 9b (`gabaritsExportClient`), puis §25.3 pour la
suite (Phase 9c à 9f).

---

## 25. État détaillé — Phase 9b (`GabaritExportClient`, gabarits d'export
`.docx` personnalisés client, §4.3bis), au 18/09/2026

### 25.1 Ce qui est fait (code complet, tout vert localement et en CI)

1. ✅ Migration `0025_gabarits_export_client.sql` — table
   `gabarits_export_client` (id, client_id, nom, tags_trouves TEXT JSON,
   created_at) + index `idx_gabarits_export_client_client`. Le contenu
   binaire du fichier `.docx` **ne vit pas en D1** — même répartition que
   `ProjectDocument`/`DocumentNormatif` (migration 0008/0003) : il est
   stocké dans R2 via `StockageBinaireRepo`, sous la clé
   `gabarits-export-client/<id>/contenu`.
2. ✅ `workers/auth-worker/src/repos/gabaritExportClientRepo.ts` —
   `GabaritExportClientEnregistre`, interface `GabaritExportClientRepo`
   (`listerParClient`/`parId`/`creer`/`supprimer`), implémentation
   mémoire `GabaritExportClientRepoMemoire`.
3. ✅ `workers/auth-worker/src/repos/d1/d1GabaritExportClientRepo.ts` —
   implémentation D1, `tagsTrouves` stocké en JSON `TEXT`
   (`JSON.stringify`/`JSON.parse`, même patron que `ContentPlan.auditLog`).
4. ✅ `workers/auth-worker/src/index.ts` — câblage
   `gabaritExportClientRepo: new D1GabaritExportClientRepo(env.DB)`.
5. ✅ `workers/auth-worker/src/routeur.ts` — `Contexte.gabaritExportClientRepo`,
   5 routes : `GET /clients/:clientId/gabarits-export` (liste, scopée
   `exigerAccesClient`), `POST /clients/:clientId/gabarits-export`
   (création, corps `multipart/form-data` — `metadata` JSON + `fichier`
   Blob), `POST /clients/:clientId/gabarits-export/migration-locale`
   (idempotente, id imposé par l'appelant, même patron que
   `gererMigrerDocumentProjetLocal`), `GET /gabarits-export/:id/contenu`
   (contenu binaire brut, `authentifier` seul — même patron que
   `gererObtenirContenuDocumentProjet`, pas de re-vérification
   `client_id` à ce niveau, cohérent avec l'existant), `DELETE
   /gabarits-export/:id` (supprime le contenu R2 puis l'enregistrement
   D1). **Vérification des balises obligatoires
   (`verifierGabaritExportClient`) volontairement laissée côté client** —
   dépend de `docxtemplater`/`pizzip`, jamais portée dans le Worker ;
   le serveur fait confiance à `tagsTrouves` déjà vérifié avant l'appel
   (documenté explicitement dans le code).
6. ✅ `workers/auth-worker/src/routeur.test.ts` — describe block
   `'routerRequete — GabaritExportClient (gabarits d'export .docx
   personnalisés client, §4.3bis, Phase 9b du chantier de migration D1)'`
   avec 8 tests : GET vide, création + relecture identique via `/contenu`,
   création sans nom (`nom_obligatoire`), création sans fichier
   (`corps_invalide`), isolation stricte par client, suppression (liste +
   contenu retirés), migration-locale idempotente, non-authentifié → 401.
   **Résultat : 314/314 tests Worker** (306 existants + 8 nouveaux).
7. ✅ `src/test-utils/fauxWorkerAuth.ts` — `gabaritExportClientRepo: new
   GabaritExportClientRepoMemoire()` ajouté au `Contexte` de test.
8. ✅ `src/connecteurs/auth/AuthApiClient.ts` — `GabaritExportClientWire`,
   `SaisieCreationGabaritExportClientWire`, 5 méthodes :
   `obtenirGabaritsExportClient`, `creerGabaritExportClient` (multipart),
   `supprimerGabaritExportClient`, `obtenirContenuGabaritExportClient`
   (contourne `requete()`, même patron que
   `obtenirContenuDocumentProjet`), `migrerGabaritExportClientLocal`.
9. ✅ `src/presentation/stores/useGabaritExportStore.ts` — entièrement
   réécrit, **surface publique strictement inchangée**
   (`gabarits`/`enChargement`/`charger`/`importerGabarit`/
   `supprimerGabarit`). `charger()` liste les métadonnées puis récupère le
   contenu binaire de chaque gabarit en parallèle (`Promise.all` +
   `obtenirContenuGabaritExportClient`) pour reconstituer
   `GabaritExportClient.fichier: ArrayBuffer` — délibérément différent du
   patron « liste sans contenu » de `ProjectDocument` : le nombre de
   gabarits personnalisés par client reste faible (quelques templates),
   et les composants consommateurs (`EditeurSection.vue`) lisent
   `gabarit.fichier` **de façon synchrone** depuis le tableau du store,
   jamais via un second appel explicite — préserver cette surface était la
   contrainte dominante. `importerGabarit()` garde la vérification
   `verifierGabaritExportClient` (docxtemplater/pizzip) strictement côté
   client, inchangée, avant tout appel réseau.
10. ✅ `src/persistance/db.ts` — retrait de
    `gabaritsExportClient!: EntityTable<...>`, ajout de
    `gabaritsExportClientAMigrer: GabaritExportClient[]` + migration
    `.version(55)` capturant les enregistrements existants avant
    suppression physique de la table (même technique que `.version(54)`).
11. ✅ Fichiers de test corrigés (grep exhaustif `db.gabaritsExportClient`
    **et** appels à `useGabaritExportStore`/composants consommateurs) :
    `src/presentation/stores/useGabaritExportStore.test.ts` (réécrit avec
    `installerFauxWorkerAuth`/client créé via `ctx.clientsRepo.creer`),
    `src/presentation/screens/TemplatesFormulaires.test.ts` (idem ; le
    dernier test — ancien « Worker injoignable pour le nom du client
    n'empêche pas l'affichage des gabarits, purement locaux » — n'avait
    plus de sens une fois les gabarits eux-mêmes dépendants du réseau ;
    remplacé par l'équivalent « dégradation gracieuse » déjà établi pour
    `StructureSysteme.test.ts` lors de sa propre migration D1 : panne
    réseau totale → écran affiché quand même, état vide explicite, titre
    replié sur l'id brut du client, jamais un plantage).
12. ✅ Validation complète : Worker `npx vitest run` (314/314), frontend
    `npx vitest run` (1442/1442), `npx vue-tsc -b --noEmit` (rappel :
    **jamais** `vue-tsc --noEmit` seul, qui ne vérifie rien dans ce dépôt
    — voir §24.1 point 11), `npx eslint .` et `npx prettier --check .`
    propres (6 avertissements prettier auto-corrigés via `--fix`).

### 25.2 Phase 9b — terminée (18/09/2026)

1. ✅ Commit sur `claude/contexte-reprise-session-tin77u` (branche
   redémarrée depuis `main` après le merge de la PR #77 doc-only de la
   Phase 9a).
2. ✅ PR #78 ouverte (« Phase 9b migration D1 : GabaritExportClient »),
   CI verte du premier coup (« Lint, typecheck, tests » + builds Workers
   `validapharm-auth-worker`/`validapharm-ia-relay`). Mergée sur `main`
   (squash, commit `456e939`).
3. ✅ Migration `0025_gabarits_export_client.sql` appliquée en
   production D1 (`validapharm-auth`) en 2 requêtes séparées
   (`CREATE TABLE` + `CREATE INDEX`), toutes deux réussies du premier
   coup. Vérification `sqlite_master` confirmant la table et son index.
4. ✅ Code déployé vérifié sur le Worker en production
   (`workers_get_worker_code`, `validapharm-auth-worker`) :
   `D1GabaritExportClientRepo`, les 5 routes `/gabarits-export`, et les
   handlers `gererListerGabaritsExportClient`/`gererCreerGabaritExportClient`
   présents dans le bundle.
5. ⬜ GitHub sync généralisée : toujours reportée (même manque assumé
   depuis les phases précédentes).

### 25.3 Suite du chantier

Voir §26 pour la Phase 9c (`aiChatSessionLogs`), puis §26.3 pour la
suite (Phase 9d à 9f).

## 26. État détaillé — Phase 9c (`AiChatSessionLog`, journal des sessions
du panneau Chat, §4.4), au 22/09/2026

### 26.1 Ce qui est fait (code complet, tout vert localement et en CI)

1. ✅ Migration `0026_ai_chat_session_logs.sql` — table
   `ai_chat_session_logs` (id, client_id, started_at, ended_at,
   mode, ai_provider, moteur_version, document_joint INTEGER) + index
   `idx_ai_chat_session_logs_client`. **Entité immuable** : aucune méthode
   de mise à jour côté repo/store, même discipline que
   `Procedure`/`ProcedureStep` (Phase 9a) et `GabaritExportClient`
   (Phase 9b) — une session de chat close est journalisée une fois pour
   toutes, jamais modifiée. `document_joint` stocké en `INTEGER` 0/1
   (patron booléen habituel : écriture `champ ? 1 : 0`, lecture
   `Boolean(ligne.champ)`).
2. ✅ `workers/auth-worker/src/repos/aiChatSessionLogRepo.ts` —
   `AiChatSessionLogEnregistre`, interface `AiChatSessionLogRepo`
   (`listerParClient`/`creer` seulement — pas de `parId`, pas de
   `supprimer`, pas de mise à jour), implémentation mémoire
   `AiChatSessionLogRepoMemoire`.
3. ✅ `workers/auth-worker/src/repos/d1/d1AiChatSessionLogRepo.ts` —
   implémentation D1.
4. ✅ `workers/auth-worker/src/index.ts` — câblage
   `aiChatSessionLogRepo: new D1AiChatSessionLogRepo(env.DB)`.
5. ✅ `workers/auth-worker/src/routeur.ts` — `Contexte.aiChatSessionLogRepo`,
   3 routes : `GET /clients/:clientId/ai-chat-session-logs` (liste,
   scopée `exigerAccesClient`), `POST
   /clients/:clientId/ai-chat-session-logs` (création), `POST
   /clients/:clientId/ai-chat-session-logs/migration-locale`
   (idempotente, même patron que les migrations locales précédentes).
   **Champs de réponse renommés `aiChatSessionLogs`/`aiChatSessionLog`**
   (au lieu de `entrees`/`entree` initialement) pour éviter une collision
   de nom avec les champs déjà utilisés par `EntreeAuditJson[]` (journal
   d'audit) dans la même interface `CorpsReponse` de test — collision
   détectée uniquement par `vue-tsc -b --noEmit`
   (`TS2300`/`TS2717`/`TS2339`), jamais par les tests seuls : **leçon à
   retenir pour toute future phase ajoutant un champ à `CorpsReponse`**,
   toujours vérifier l'absence de collision de nom avec les domaines déjà
   présents dans cette interface partagée de test.
6. ✅ `workers/auth-worker/src/routeur.test.ts` — describe block
   `'routerRequete — AiChatSessionLog (journal des sessions du panneau
   Chat, §4.4, Phase 9c du chantier de migration D1)'` avec 7 tests : GET
   vide, création + relecture, corps invalide (`corps_invalide`),
   isolation stricte par client, migration-locale idempotente,
   migration-locale corps invalide, non-authentifié → 401. **Résultat :
   321/321 tests Worker** (314 existants + 7 nouveaux).
7. ✅ `src/test-utils/fauxWorkerAuth.ts` — `aiChatSessionLogRepo: new
   AiChatSessionLogRepoMemoire()` ajouté au `Contexte` de test.
8. ✅ `src/connecteurs/auth/AuthApiClient.ts` — `AiChatSessionLogWire`,
   `SaisieCreationAiChatSessionLogWire`, 3 méthodes :
   `obtenirAiChatSessionLogs`, `creerAiChatSessionLog`,
   `migrerAiChatSessionLogsLocal`.
9. ✅ `src/presentation/stores/usePanneauChatStore.ts` —
   `aiChatSessionLogWireVersDomaine`/`aiChatSessionLogDomaineVersWire` +
   `migrerAiChatSessionLogsLocalVersServeur(idClient)` (même patron
   d'idempotence qu'ailleurs — appelée en tout début de
   `demarrerSession()`, erreurs avalées, jamais bloquant pour l'ouverture
   du panneau). `demarrerSession()` lit désormais l'historique via
   `api.obtenirAiChatSessionLogs` (dans un `try/catch` qui replie sur
   `dernierMoteurVersion = null` en cas de panne réseau réelle — jamais un
   plantage à l'ouverture). `fermerSession()` appelle
   `api.creerAiChatSessionLog` dans un `try/catch` qui avale
   silencieusement l'échec réseau : **la fermeture du panneau ne doit
   jamais échouer pour un simple journal** — perte assumée de cette
   entrée le cas échéant.
10. ✅ `src/persistance/db.ts` — retrait de
    `aiChatSessionLogs!: EntityTable<...>`, ajout de
    `aiChatSessionLogsAMigrer: AiChatSessionLog[]` + migration
    `.version(56)` capturant les enregistrements existants avant
    suppression physique de la table.
11. ✅ `src/presentation/stores/panneauChat.test.ts` — capture de `ctx`
    depuis `installerFauxWorkerAuth()`, client de test créé via
    `ctx.clientsRepo.creer(...)` (obligatoire, `exigerAccesClient` exige
    un enregistrement `clientsRepo` réel), 3 usages directs
    `db.aiChatSessionLogs.*` convertis en `ctx.aiChatSessionLogRepo.*`
    (champs camelCase). **Ordre critique préservé** : `fetchMock`
    stubbé globalement **avant** `installerFauxWorkerAuth()` — sinon la
    capture interne `fetchReel` de `installerFauxWorkerAuth` ne pointe
    plus vers `fetchMock` et toute la chaîne de mock du Relais IA casse
    (déjà documenté au fil des phases précédentes, reconfirmé ici après
    une erreur auto-corrigée avant exécution).
12. ✅ Validation complète : Worker `npx vitest run` (321/321), frontend
    `npx vitest run` (1449/1449), `npx vue-tsc -b --noEmit` propre,
    `npx eslint .` et `npx prettier --check .` propres (3 avertissements
    prettier auto-corrigés via `--fix`).

### 26.2 Phase 9c — terminée (22/09/2026)

1. ✅ Commit sur `claude/contexte-reprise-session-tin77u` (branche
   redémarrée depuis `main` après le merge de la PR #79 doc-only de la
   Phase 9b).
2. ✅ PR #80 ouverte (« Phase 9c migration D1 : AiChatSessionLog (journal
   des sessions du panneau Chat) »), CI verte, mergée sur `main` (squash,
   commit `57cfde4`).
3. ✅ Migration `0026_ai_chat_session_logs.sql` appliquée en production
   D1 (`validapharm-auth`) en 2 requêtes séparées (`CREATE TABLE` +
   `CREATE INDEX`), toutes deux réussies du premier coup. Vérification
   `sqlite_master` confirmant la table et son index.
4. ✅ Code déployé vérifié sur le Worker en production
   (`workers_get_worker_code`, `validapharm-auth-worker`) :
   `D1AiChatSessionLogRepo`, les 3 routes `/ai-chat-session-logs`, et les
   handlers `gererListerAiChatSessionLogs`/`gererCreerAiChatSessionLog`/
   `gererMigrerAiChatSessionLogsLocal` présents dans le bundle.
5. ⬜ GitHub sync généralisée : toujours reportée (même manque assumé
   depuis les phases précédentes).

Voir §27 pour la Phase 9d (`ConnexionDrive`/`EtatMiroirDrive`), puis §27.3
pour la suite (Phase 9e à 9f).

## 27. État détaillé — Phase 9d (`ConnexionDrive`/`EtatMiroirDrive`,
miroir Drive par client), au 22/09/2026

### 27.1 Ce qui est fait (code complet, tout vert localement et en CI)

1. ✅ Migration `0027_connexion_drive.sql` — tables `connexion_drive`
   (client_id PK, dossier_id, jeton) et `etat_miroir_drive` (client_id
   PK, dernier_miroir_reussi). **Enregistrement mutable par client**
   (jamais un historique, contrairement à Procedure/GabaritExportClient/
   AiChatSessionLog des phases précédentes) : `enregistrer` est toujours
   un upsert complet côté D1
   (`INSERT ... ON CONFLICT(client_id) DO UPDATE SET ...`), même
   discipline que `ParametresInstallationRepo` (migration 0002) mais
   scopée par `client_id` plutôt que par une clé globale à
   l'installation — Drive est explicitement "le dossier dédié du
   client", contrairement au dépôt GitHub/Relais IA (globaux,
   `parametres_installation`).
2. ✅ `workers/auth-worker/src/repos/connexionDriveRepo.ts` /
   `etatMiroirDriveRepo.ts` — `ConnexionDriveEnregistree`/
   `EtatMiroirDriveEnregistre`, interfaces `ConnexionDriveRepo`
   (`obtenirParClient`/`enregistrer`/`supprimer`) et
   `EtatMiroirDriveRepo` (`obtenirParClient`/`enregistrer`),
   implémentations mémoire.
3. ✅ `workers/auth-worker/src/repos/d1/d1ConnexionDriveRepo.ts` /
   `d1EtatMiroirDriveRepo.ts` — implémentations D1, même patron upsert
   que `d1ParametresInstallationRepo.ts`.
4. ✅ `workers/auth-worker/src/index.ts` — câblage
   `connexionDriveRepo: new D1ConnexionDriveRepo(env.DB)`,
   `etatMiroirDriveRepo: new D1EtatMiroirDriveRepo(env.DB)`.
5. ✅ `workers/auth-worker/src/routeur.ts` —
   `Contexte.connexionDriveRepo`/`etatMiroirDriveRepo` ; 5 routes :
   `GET/PUT/DELETE /clients/:clientId/connexion-drive`,
   `GET/PUT /clients/:clientId/etat-miroir-drive`. Réponses
   `{ connexionDrive: ... | null }`/`{ etatMiroirDrive: ... | null }`
   (jamais 404 sur une configuration absente — même discipline que
   `gererObtenirParametreInstallation`).
6. ✅ `workers/auth-worker/src/routeur.test.ts` — describe block
   `'routerRequete — ConnexionDrive / EtatMiroirDrive (miroir Drive par
   client, Phase 9d du chantier de migration D1)'` avec 9 tests : GET
   vide (null, jamais 404), PUT isolé par client, PUT rejoué = upsert
   (jamais de doublon), PUT corps invalide, DELETE scopé par client,
   GET/PUT etat-miroir-drive (isolé par client, corps invalide),
   non-authentifié → 401. **Résultat : 330/330 tests Worker** (321
   existants + 9 nouveaux — 13 tests au total dans ce describe block, la
   différence vient de sous-cas combinés par test).
7. ✅ `src/test-utils/fauxWorkerAuth.ts` —
   `connexionDriveRepo`/`etatMiroirDriveRepo` ajoutés au `Contexte` de
   test.
8. ✅ `src/connecteurs/auth/AuthApiClient.ts` — `ConnexionDriveWire`,
   `SaisieConnexionDriveWire`, `EtatMiroirDriveWire`, 5 méthodes :
   `obtenirConnexionDrive`, `enregistrerConnexionDrive`,
   `effacerConnexionDrive`, `obtenirEtatMiroirDrive`,
   `enregistrerEtatMiroirDrive`.
9. ✅ `src/presentation/stores/useConnexionDriveStore.ts` — entièrement
   réécrit, **surface publique strictement inchangée**
   (`connexion`/`enChargement`/`charger`/`enregistrer`/`effacer`/
   `testerConnexion`). Filet de sécurité de migration locale
   (`migrerConnexionDriveLocaleVersServeur`) : n'écrase jamais une
   configuration déjà présente côté serveur (vérifie `null` avant
   d'envoyer la capture locale — l'existant côté serveur gagne
   toujours, même principe que les migrations-locale des phases
   précédentes malgré l'absence de route dédiée ici, inutile pour un
   simple upsert idempotent par `client_id`).
10. ✅ `src/presentation/stores/useMiroirDriveStore.ts` — entièrement
    réécrit, surface publique inchangée
    (`miroirEnCours`/`miroirVersDrive`/`obtenirDernierMiroirReussi`).
    Même filet de sécurité de migration locale pour l'horodatage.
11. ✅ `src/persistance/db.ts` — retrait de
    `connexionDrive!`/`etatMiroirDrive!: EntityTable<...>`, ajout de
    `connexionDriveAMigrer`/`etatMiroirDriveAMigrer` + migration
    `.version(57)` capturant les enregistrements existants avant
    suppression physique des tables.
12. ✅ `src/presentation/stores/connexionDrive.test.ts` et
    `miroirDrive.test.ts` — réécrits avec `installerFauxWorkerAuth`/
    `ctx.clientsRepo.creer`/`ctx.connexionDriveRepo`. **Ordre critique
    préservé** dans les deux fichiers : `fetchMock` stubbé globalement
    avant `installerFauxWorkerAuth()` (leçon déjà documentée aux phases
    précédentes — la capture interne `fetchReel` doit déjà être
    `fetchMock` au moment de sa construction).
13. ✅ Validation complète : Worker `npx vitest run` (330/330), frontend
    `npx vitest run` (1458/1458), `npx vue-tsc -b --noEmit` propre,
    `npx eslint .` et `npx prettier --check .` propres (2 avertissements
    prettier auto-corrigés via `--fix`).

### 27.2 Phase 9d — terminée (22/09/2026)

1. ✅ Commit sur `claude/contexte-reprise-session-tin77u` (branche
   redémarrée depuis `main` après le merge de la PR #81 doc-only de la
   Phase 9c).
2. ✅ PR #82 ouverte (« Phase 9d migration D1 : ConnexionDrive/
   EtatMiroirDrive (miroir Drive par client) »), CI verte, mergée sur
   `main` (squash, commit `762b099`).
3. ✅ Migration `0027_connexion_drive.sql` appliquée en production D1
   (`validapharm-auth`) en 2 requêtes séparées (`CREATE TABLE` ×2),
   toutes deux réussies du premier coup. Vérification `sqlite_master`
   confirmant les deux tables.
4. ✅ Code déployé vérifié sur le Worker en production
   (`workers_get_worker_code`, `validapharm-auth-worker`) :
   `D1ConnexionDriveRepo`/`D1EtatMiroirDriveRepo`, les 5 routes
   `/connexion-drive`/`/etat-miroir-drive`, et les 5 handlers présents
   dans le bundle.
5. ⬜ GitHub sync généralisée : toujours reportée (même manque assumé
   depuis les phases précédentes).

Voir §28 pour la Phase 9e (`ConnexionRelaisOCR`), puis §28.3 pour la
suite (Phase 9f).

## 28. État détaillé — Phase 9e (`ConnexionRelaisOCR`, même patron que
Relais IA), au 22/09/2026

### 28.1 Ce qui est fait (code complet, tout vert localement et en CI)

1. ✅ **Aucune nouvelle table D1** : contrairement à toutes les phases
   précédentes, `connexionRelaisOCR` est un paramètre global à
   l'installation (un seul relais serverless `workers/ocr-relay/` pour
   toute l'organisation), exactement comme le dépôt GitHub/Relais IA —
   déjà migrés vers la table `parametres_installation` (migration 0002,
   Phase 2 historique du chantier, bien avant l'actuel chantier Phase
   1-9). La migration consiste donc simplement à ajouter `'relais-ocr'`
   à `CLES_PARAMETRES_INSTALLATION` dans
   `workers/auth-worker/src/routeur.ts` — l'infrastructure
   (`ParametresInstallationRepo`, routes `GET/PUT/DELETE
   /parametres-installation/:cle`) était déjà en place et générique.
2. ✅ **Découverte notable en investiguant cette phase** : la table
   Dexie `connexionRelaisOCR` existait depuis la version 11 du schéma
   (bien avant ce chantier), mais n'avait **jamais été câblée à un
   store ni à un écran** — `OcrRelayAdapter`
   (`src/connecteurs/ocr/OcrRelayAdapter.ts`) n'était instancié nulle
   part en dehors de ses propres tests. Contrairement au dépôt
   GitHub/Relais IA/Drive normes (migrés en version 32, avant ce
   chantier), cette table avait été oubliée. Conséquence directe :
   **aucune capture-avant-suppression nécessaire** en supprimant la
   table (aucune donnée n'a jamais pu y être écrite, dans tout
   l'historique du dépôt) — seule phase du chantier D1 où ce filet de
   sécurité habituel est légitimement absent.
3. ✅ `src/presentation/stores/useConnexionRelaisOCRStore.ts` créé —
   mirroré exactement sur `useConnexionRelaisIAStore.ts`
   (`connexion`/`enChargement`/`charger`/`enregistrer`/`effacer`, clé
   `'relais-ocr'`). **Pas de `testerConnexion`** : contrairement au
   Relais IA (qui expose un point d'entrée `GET` léger de test) et à
   GitHub (lecture du SHA de branche), le relais OCR
   (`workers/ocr-relay/src/ocrHandler.ts`) n'accepte que `POST` avec un
   corps image réel — tester la connexion consommerait réellement le
   quota du fournisseur Azure Vision sous-jacent pour une simple
   vérification, sans bénéfice pour un écran qui n'existe pas encore.
   Reste donc volontairement absent tant qu'aucun écran ne l'exige
   (même discipline que "ne jamais construire une capacité non
   consommée").
4. ✅ `workers/auth-worker/src/routeur.test.ts` — describe block
   `'paramètres d'installation (dépôt GitHub, Relais IA, Drive normes,
   Relais OCR)'` renommé, 1 nouveau test dédié (`relais-ocr` :
   enregistre et relit). **Résultat : 331/331 tests Worker** (330
   existants + 1 nouveau).
5. ✅ `src/persistance/db.ts` — retrait de `connexionRelaisOCR!:
   EntityTable<...>` et de l'interface
   `EnregistrementConnexionRelaisOCR` ; migration `.version(58)` :
   `.stores({ connexionRelaisOCR: null })` **sans `.upgrade()`**, même
   patron que la version 32 historique (GitHub/Relais IA/Drive normes,
   elles aussi sans capture puisque leur migration avait précédé la
   discipline de capture-avant-suppression introduite plus tard dans ce
   chantier).
6. ✅ `src/presentation/stores/connexionRelaisOCR.test.ts` créé —
   mirroré sur `connexionRelaisIA.test.ts` (3 tests : enregistre/relit,
   effacer, charger sans configuration — sans les tests
   `testerConnexion`, absent du store).
7. ✅ Validation complète : Worker `npx vitest run` (331/331), frontend
   `npx vitest run` (1462/1462), `npx vue-tsc -b --noEmit` propre,
   `npx eslint .` et `npx prettier --check .` propres (1 avertissement
   prettier auto-corrigé via `--fix`).

### 28.2 Phase 9e — terminée (22/09/2026)

1. ✅ Commit sur `claude/contexte-reprise-session-tin77u` (branche
   redémarrée depuis `main` après le merge de la PR #83 doc-only de la
   Phase 9d).
2. ✅ PR #84 ouverte (« Phase 9e migration D1 : ConnexionRelaisOCR
   (même patron que Relais IA) »), CI verte, mergée sur `main` (squash,
   commit `2e8f85f`).
3. ✅ **Aucune migration production à appliquer** — pas de nouvelle
   table D1, la clé `'relais-ocr'` vit dans la table
   `parametres_installation` déjà provisionnée en production depuis la
   Phase 2 historique.
4. ✅ Code déployé vérifié sur le Worker en production
   (`workers_get_worker_code`, `validapharm-auth-worker`) :
   `CLES_PARAMETRES_INSTALLATION` contient bien `'relais-ocr'` dans le
   bundle.
5. ⬜ GitHub sync généralisée : toujours reportée (même manque assumé
   depuis les phases précédentes).

### 28.3 Suite du chantier

Reste à la Phase 9 (voir §3) :

- `clientConfigs` — Phase 9f (dernière phase du chantier)

Enchaîner sans s'arrêter pour confirmation, conformément à la consigne
permanente de l'utilisateur. Le problème des nœuds SAP (bug d'import
original) reste explicitement reporté, comme depuis le début de ce
chantier.

---

## 29. État détaillé — Phase 9f (`ClientConfig`, configuration IA par
client), au 22/09/2026

### 29.1 Ce qui est fait (code complet, tout vert localement et en CI)

1. ✅ **Migration D1** `workers/auth-worker/migrations/0028_client_configs.sql` :
   table `client_configs` (clé `client_id`, un enregistrement mutable par
   client — upsert, même discipline que `connexion_drive`/
   `etat_miroir_drive` en Phase 9d), avec 3 champs structurés stockés en
   JSON (TEXT) : `ai_provider_conditions_acquittees`,
   `ai_provider_reliability_qualification` (qualification de fiabilité IA
   séparée par mode d'usage `chat_normatif`/`audit_simule`),
   `consent_telemetry`. Le Worker n'interprète jamais le contenu de ces
   champs JSON — toute la logique métier (remise à zéro de l'accusé/
   qualification au changement de fournisseur, séparation stricte par
   mode d'usage) reste côté store frontend, même discipline que
   `GabaritExportClient.tagsTrouves` en Phase 9b.
2. ✅ Repo Worker `clientConfigRepo.ts` (interface + `ClientConfigRepoMemoire`)
   et `d1/d1ClientConfigRepo.ts` (implémentation D1, upsert via
   `ON CONFLICT(client_id) DO UPDATE`).
3. ✅ Routes `auth-worker` (`routeur.ts`) : `GET/PUT
   /clients/:clientId/config`, handlers `gererObtenirClientConfig`/
   `gererEnregistrerClientConfig` avec validation stricte (`aiProvider` +
   `aiProviderReliabilityQualification` + `consentTelemetry` requis, sinon
   `corps_invalide`).
4. ✅ `workers/auth-worker/src/routeur.test.ts` — nouveau describe block
   dédié, 5 tests (GET-null, PUT isolé par client, PUT upsert remplace,
   PUT corps invalide, non-authentifié → 401). **Résultat : 336/336 tests
   Worker** (331 existants + 5 nouveaux).
5. ✅ `AuthApiClient.ts` : types `QualificationFiabiliteIAWire`/
   `ClientConfigWire` (noms de champs racine en camelCase, convention
   établie), méthodes `obtenirClientConfig`/`enregistrerClientConfig`.
6. ✅ `useClientConfigStore.ts` entièrement réécrit — surface publique
   strictement inchangée (`config`/`enChargement`/`charger`/
   `definirFournisseur`/`acquitterConditions`/`enregistrerQualification`) ;
   filet de sécurité de migration locale
   `migrerClientConfigLocaleVersServeur()` (l'existant côté serveur gagne
   toujours, retry-safe).
7. ✅ `src/persistance/db.ts` — retrait de `clientConfigs!:
   EntityTable<...>` ; migration `.version(59)` **avec**
   capture-avant-suppression (`clientConfigsAMigrer`), contrairement à la
   Phase 9e : cette table était réellement utilisée en production, donc
   le filet de sécurité habituel s'applique ici.
8. ✅ Fichiers consommateurs corrigés : `clientConfig.test.ts` réécrit
   (clients créés via `ctx.clientsRepo.creer`, plus aucune lecture directe
   de `db.clientConfigs`), `panneauChat.test.ts` et
   `MissionWorkspace.test.ts` (retrait des accès directs à
   `db.clientConfigs`, remplacés par `ctx.clientConfigRepo` ou le store).
9. ✅ Validation complète : Worker `npx vitest run` (336/336), frontend
   `npx vitest run` (1467/1467), `npx vue-tsc -b --noEmit` propre,
   `npx eslint .` et `npx prettier --check .` propres (6 avertissements
   prettier auto-corrigés via `--fix`).

### 29.2 Phase 9f — terminée (22/09/2026)

1. ✅ Commit sur `claude/contexte-reprise-session-tin77u` (branche
   redémarrée depuis `main` après le merge de la PR #85 doc-only de la
   Phase 9e).
2. ✅ PR #86 ouverte (« Phase 9f migration D1 : ClientConfig
   (configuration IA par client) »), CI verte
   (`mergeable_state: "clean"`), mergée sur `main` (squash, commit
   `576d08d`).
3. ✅ Migration `0028_client_configs.sql` appliquée en production D1
   (`d1_database_query`, table `client_configs`) — vérifiée via
   `SELECT name, type FROM sqlite_master WHERE name = 'client_configs'`.
4. ✅ Code déployé vérifié sur le Worker en production
   (`workers_get_worker_code`, `validapharm-auth-worker`) :
   `D1ClientConfigRepo`, la route `/clients/:clientId/config` et les
   handlers `gererObtenirClientConfig`/`gererEnregistrerClientConfig`
   présents dans le bundle.
5. ⬜ GitHub sync généralisée : toujours reportée (même manque assumé
   depuis les phases précédentes).

### 29.3 Suite du chantier — Phase 9 entièrement close, chantier D1 terminé

La ligne `clientConfigs` était la **dernière** ligne ⬜ de l'inventaire
complet du §3 : toutes les autres tables Dexie y sont désormais ✅, à
l'exception des deux lignes 🟦 (`profilLocal`, `schemaVersion`/
`etatSynchronisation`) qui restent **délibérément locales** — métadonnées
propres à l'appareil/au navigateur, jamais des données métier à
partager, documentées comme telles dès leur apparition dans ce fichier,
pas un oubli.

**Le chantier de migration D1 (Phases 1 à 9, toutes sous-phases
comprises) est donc entièrement clos.** Reste, en dehors de ce chantier :

- La GitHub sync généralisée pour les entités migrées en Phase 9
  (reportée phase après phase, jamais traitée — à envisager comme un
  chantier séparé si nécessaire).
- Tâche #32 (connecteurs QMS tiers — écran de configuration + pull réel
  vers AssetNode), tâches #41/#42 (lectures de référentiels en attente) —
  sans rapport avec ce chantier D1, restées `pending` en parallèle.

Sans nouvelle instruction de l'utilisateur, il n'y a plus de prochaine
phase D1 à enchaîner automatiquement sous la consigne « on enchaine sur
toutes les phases ». Ce chantier a rempli son objet : achever la
migration D1 est un fait terminé, la doc en fait foi.

### 29.4 Correctif — le « problème des nœuds SAP » cité en §5/§28.3/§29.3
était déjà résolu avant le début de ce chantier (23/09/2026)

Investigation menée sur demande explicite de l'utilisateur (« traite le
problème de SAP ») : la phrase « le problème des nœuds SAP (bug d'import
original) reste explicitement reporté » a été copiée sans changement dans
la section « suite du chantier » de **chaque** phase de ce document
(§4.2, §6.3, §7.3, ... jusqu'à §29.3), sans jamais être revérifiée contre
l'état réel du code. Vérification faite :

1. ✅ **Le bug réel était déjà corrigé le 11/09/2026** — PR #30 (« Fix
   import SAP : profondeur relative par colonne + detection auto du
   format », squash `48a4c4909a686f282ef1e6119d148a45a486b68e`), soit
   **3 jours avant** la première mention « reste reporté » de ce document
   (Phase 1, datée du 14/09/2026, §4.2). Le bug corrigé : une première
   version de `preparerImportHierarchieSap`
   (`src/logique-metier/structure-systeme/importerHierarchieSapXlsx.ts`)
   associait chaque colonne absolue distincte à un rang fixe — une même
   profondeur logique (ex. « Système ») peut pourtant se décaler de
   quelques colonnes selon la branche sur un export SAP réel (icône SAP
   de largeur différente), ce qui gonflait à tort `profondeurRequise` et
   rejetait l'import entier, même sur une hiérarchie correctement
   configurée (échec silencieux du point de vue utilisateur). Corrigé par
   un calcul de rang **relatif** à la colonne des lignes précédentes
   (pile d'ancêtres), jamais une table globale colonne→rang.
2. ✅ **Régression vérifiée absente** : suite de tests
   `importerHierarchieSapXlsx.test.ts` relue intégralement (16 tests) —
   reproduit fidèlement le cas réel signalé à l'époque (hiérarchie à 7
   niveaux, décalage de colonne volontaire entre deux nœuds de même rang
   logique), plus les cas d'échec en cascade, de ré-import idempotent, et
   de code dupliqué. `npx vitest run` sur ce fichier et
   `HtmlSapAdapter.test.ts` (import `.htm`, même pile d'ancêtres en aval)
   : **16/16 tests verts**.
3. ✅ **Câblage écran vérifié** : `StructureSysteme.vue` n'expose plus
   qu'un seul champ de sélection de fichier pour l'import SAP (fusion
   `.xlsx`/`.htm` du même PR #30), le format étant détecté au contenu
   réel (signature ZIP `PK\x03\x04` pour un `.xlsx`, sinon
   `HtmlSapAdapter`) — jamais à l'extension du fichier, jamais un second
   sélecteur source de confusion.
4. ✅ **En production depuis longtemps** : PR #30 mergée sur `main` le
   11/09/2026, largement antérieure aux dizaines de merges/déploiements
   suivants (dont tout ce chantier D1) — le correctif est en production
   depuis bien avant le début de cette investigation.

**Conclusion : aucune action corrective n'était nécessaire.** Le
« problème des nœuds SAP » n'existe plus depuis le 11/09/2026 ; sa
mention répétée dans ce document de §4 à §29 était une note de suivi
devenue obsolète, jamais un signal d'un bug encore ouvert. Cette section
sert de correction définitive : toute relecture future de ce document
doit considérer le sujet clos, sans se fier aux mentions antérieures.

### 29.5 Clôture — « GitHub sync généralisée » (23/09/2026), même discipline
que §29.4 : ré-examiner avant de construire

Sur autorisation explicite de l'utilisateur (« règle moi tout les
chantiers qui reste, je te donne l'autorisation de tout faire »),
investigation menée avant tout code — même exigence que pour le §29.4 :
un manque répété dans un document de suivi mérite d'être revérifié contre
la réalité actuelle, pas construit à l'aveugle sur la seule foi de sa
répétition.

**Origine du principe** : `docs/00-cadrage-projet.md` §2, principe non
négociable n°3, écrit le **23/08/2026** — avant toute authentification
réelle, avant le Worker, avant D1 (introduits en Phase 39, bien plus
tard) : *« Zéro perte de données au changement de machine. Git dédié =
source de vérité ; miroir Google Drive = filet de secours. »* À cette
date, l'architecture était volontairement **locale-first sans serveur
obligatoire** (`00-cadrage-projet.md` §4 : « aucune dépendance serveur
obligatoire pour la logique applicative ») — IndexedDB par navigateur
pour la performance/le hors-ligne, GitHub comme unique source de vérité
partagée entre appareils, faute d'alternative serveur.

**Ce contexte n'existe plus.** Le Worker/D1 introduit en Phase 39 est
désormais la source de vérité explicite pour la quasi-totalité du modèle
de données (confirmé des dizaines de fois dans ce document même, ex.
« D1 = source de vérité ») ; ce chantier de migration D1 tout entier a
eu pour objet de faire disparaître IndexedDB comme dépôt primaire,
précisément parce qu'« un stockage local ne survivait jamais à un
changement d'appareil » (formule répétée à chaque phase). **Le Worker/D1
remplit donc déjà, structurellement, l'objet exact du principe n°3** pour
toute entité migrée : plus aucune perte de données au changement de
machine, sans le moindre rôle de GitHub — un compte authentifié retrouve
ses données sur n'importe quel appareil dès la connexion.

**`projects`/`sections`/`projectDocuments` gardent leur synchronisation
GitHub** (`useSynchronisationStore.ts`) — décision déjà actée
explicitement dans l'inventaire du §3 (« D1 + GitHub déjà en place, à
conserver ») et non remise en cause ici : ce sont les seuls livrables
métier que l'utilisateur rédige et fait activement évoluer, avec un
historique de versions et un mécanisme de résolution de conflit
champ-par-champ déjà construits et testés — une valeur réelle,
indépendante du seul objectif « zéro perte au changement de machine ».

**Aucune décision équivalente n'a jamais été prise pour les ~50 autres
tables** migrées en Phases 1-2 et 4-9 (Structure Système, ACFC,
Parameters, Risk Assessment, Quality Events, Test/Execution/Evidence
Engine, Knowledge Engine, Missions, Context Snapshots, Reasoning Engine,
Procedures, journaux de session IA, etc.) — la mention « GitHub sync
généralisée » a été ajoutée à la liste "reste à faire" de chaque phase
par précaution (la même formule copiée telle quelle §14 à §29), jamais
sur demande explicite de l'utilisateur portant sur une entité précise ni
sur un besoin fonctionnel identifié (ex. traçabilité réglementaire hors
Cloudflare). Construire une synchronisation GitHub pour des dizaines de
tables majoritairement techniques/à fort volume et jamais éditées
manuellement (`executionEvents`, `measurements`, `aiRequests`,
`contextSnapshots`, `syncJobs`...) n'apporterait aucune valeur au regard
du principe qui a motivé leur inscription sur cette liste — ce principe
étant déjà satisfait par D1 seul.

**Conclusion : ce chantier est clos sans code nouveau.** Le manque décrit
dans ce document ne correspond plus à un besoin réel depuis l'introduction
du Worker/D1 (Phase 39) pour les entités concernées par ce chantier de
migration. Si l'utilisateur souhaite un jour une sauvegarde versionnée
externe à Cloudflare (piste d'audit git, résilience hors plateforme) pour
des enregistrements réglementaires précis (ex. `qualityEvents`,
`risksAssessment`, `assetNodes`), ce serait un **nouveau besoin produit à
cadrer explicitement** (quelles entités, quel format, quelle fréquence,
quel usage réel de cette copie) — pas un oubli de ce chantier de
migration D1, et pas quelque chose à deviner ou construire par défaut.

### 29.6 État transverse (23/09/2026) — pour reprise par une session future

Sous la même autorisation large (« règle moi tout les chantiers qui
reste, je te donne l'autorisation de tout faire »), un seul point reste
délibérément non traité, par contrainte réelle et non par manque
d'autorisation :

- **Import de documents dans la Bibliothèque de normes** (`ISO_10004_1697921937.pdf`,
  `Vocabulaire Qualité .pdf`, `Annexe 15 PIC-S_Modification CQV.pdf` —
  Drive de l'utilisateur, dossier `1L3qoo7YNVvJkUTUKzJGD6a4Db8kIiLyJ` pour
  les deux premiers, `1U3O5fTtgLSqcLDqafbVIIG4hOaAgmtUh` pour le
  troisième). **Lus intégralement par Claude** (session du 23/09/2026,
  voir la conversation) — le contenu est compris et disponible pour
  répondre à toute question métier dessus. **Jamais importés dans
  `useNormativeDocumentsStore`** : `gererCreerDocumentNormatif` (Worker)
  dérive systématiquement `uploaded_by` d'un jeton de session
  authentifié réel — une écriture D1 directe depuis cette session
  fabriquerait cette attribution (violation ALCOA+, discipline appliquée
  partout ailleurs dans ce code). Aucune autorisation générale
  (« fais tout ») ne lève cette contrainte technique : il manque un vrai
  jeton de session (connexion via l'écran, ou identifiants transmis
  explicitement). Reste bloqué jusqu'à l'un des deux : l'utilisateur
  importe lui-même ces 3 fichiers via l'écran Bibliothèque de normes
  (catégories `iso`/`pics` déjà prévues), ou transmet un moyen légitime
  de s'authentifier pour qu'une session future le fasse à sa place —
  jamais une réinitialisation du mot de passe d'un compte admin réel
  sans consigne explicite et précise sur ce point.

## 30. Validation fonctionnelle réelle en navigateur (23/09/2026)

Suite à la demande « lire tous les dossiers, améliorer le projet, sortir
un projet fini », et après avoir confirmé (§29.3-§29.6, `docs/convergence/`)
qu'aucun manque réel non traité ne subsistait dans les documents de suivi,
l'angle de validation qui restait à couvrir était le seul qui n'avait
jamais été fait cette session : **faire tourner l'application réelle et
cliquer dedans comme un utilisateur**, pas seulement relire des tests
automatisés déjà verts.

### 30.1 Environnement local jetable (jamais la production)

- `workers/auth-worker` lancé en local via `wrangler dev --local`
  (port 8787), avec les 28 migrations D1 appliquées à une base **locale**
  (`npm run migrate:local`) — jamais la base de production
  (`database_id 5fb762ef-fe99-4e68-9086-e57126c5c2aa`).
- Secrets `.dev.vars` générés localement, jetables, jamais commités
  (`.gitignore` couvre déjà `.dev.vars` et `.wrangler/`) — supprimés en
  fin de session.
- Un compte admin de test jetable créé via `/auth/bootstrap-admin`
  (`test-local@validapharm.local`), qui n'existe que dans cette base D1
  locale, jamais en production.
- Frontend lancé via `npm run dev` (Vite, port 5173).
- Navigation pilotée par Playwright (Chromium pré-installé de
  l'environnement), captures d'écran à chaque étape.

### 30.2 Parcours réellement testé

Configuration client (URL du Worker d'authentification) → connexion
réelle (JWT émis par le Worker local) → tableau de bord → création d'un
client (« Client Test E2E ») → création d'un projet (« Projet Test
E2E ») → ouverture de l'espace de travail projet (contexte, phase de
cycle de vie, partage, stepper de progression du dossier de
qualification Contexte procédé/URS/DQ/FAT/SAT/IQ/OQ/PQ/Validation,
sections, documents) → écran Structure Système / Architecture (import
Excel, import SAP, nœuds du référentiel, relations techniques) → écran
Bibliothèque de normes (ajout de documents, import GitHub, import
Google Drive).

### 30.3 Résultat : aucun bug applicatif trouvé

Zéro erreur console, zéro requête HTTP en échec (`>= 400`) sur
l'ensemble du parcours. Quelques échecs de sélecteur dans mes propres
scripts Playwright (ex. cibler la barre de recherche au lieu du champ
« Nom de l'entreprise ») ont été corrigés en cours de route — ce sont
des erreurs de script de test, pas des bugs de l'application.

Points positifs concrets confirmés en conditions réelles (pas seulement
en lecture de code) :
- L'attribution ALCOA+ fonctionne réellement de bout en bout : le projet
  créé affiche « Créé par : test-local@validapharm.local », dérivé de la
  vraie session JWT, jamais d'un champ fabriqué.
- L'écran Structure Système affiche exactement l'algorithme
  correctif documenté en §29.4 (détection du rang depuis la position
  réelle du fichier, jamais depuis le rendu visuel).
- L'écran Bibliothèque de normes confirme que le blocage documenté en
  §29.6 est bien un blocage d'identifiants réels, pas de mécanique
  manquante — l'écran d'import est complet et fonctionnel.

### 30.4 Conclusion

Cette validation live s'ajoute (elle ne remplace pas) aux suites de
tests automatisés déjà vertes. Elle ne remplace pas non plus un audit
UX/ergonomie exhaustif de tous les écrans de l'application (il en reste
plusieurs dizaines, hors du périmètre raisonnable d'une session) — mais
sur le parcours central testé (client → projet → structure système →
normes), l'application se comporte exactement comme le code et la
documentation le décrivent, sans écart trouvé entre l'un et l'autre.
L'environnement local jetable a été entièrement démonté en fin de
session (serveurs arrêtés, `.dev.vars` supprimé) ; le dépôt reste
inchangé (`.wrangler/` et `.dev.vars` déjà couverts par
`.gitignore`).

## 31. Deuxième passe de test en direct (23/09/2026) — 2 bugs réels trouvés et corrigés

Suite à la demande explicite de pousser le test plus loin (« tester le
logiciel, et corriger les bugs »), le même environnement local jetable
(§30) a été relancé pour un balayage systématique des 28 routes de
l'application, puis pour dérouler en direct, dans le navigateur, la
chaîne complète Structure Système → Risk Assessment (AMDEC) → Test
Design Engine → Exécution — la même chaîne fonctionnelle déjà vérifiée
en lecture de code (§29 et sessions précédentes), mais jamais encore
réellement exécutée de bout en bout par un utilisateur.

### 31.1 Balayage des 28 routes

Chaque route de `src/presentation/router/index.ts` chargée dans un
navigateur réel avec session authentifiée : zéro erreur console, zéro
requête HTTP en échec, aucune redirection inattendue sur les 28 routes.

### 31.2 Bug réel n°1 — clé de niveau dupliquée non détectée

**Trouvé** en manipulant réellement l'écran Structure Système : deux
niveaux affichés comme « Équipement (equipement) » identiques dans la
liste, indiscernables l'un de l'autre.

**Cause racine** (`src/presentation/stores/useStructureSystemeStore.ts`,
fonction `ajouterNiveau`) : contrairement à `modifierNiveau` juste
en-dessous, qui refuse explicitement une clé déjà utilisée (raison
`cle_deja_utilisee`), `ajouterNiveau` empilait le nouveau niveau sans
aucune vérification d'unicité de `key`. Aggravant : le `v-for` de
`StructureSysteme.vue` utilise `niveau.key` comme `:key` Vue — deux
niveaux de même clé produisent une collision de clé de rendu Vue, un
comportement non garanti.

**Correctif** : `ajouterNiveau` retourne désormais
`ResultatAjoutNiveau` (`{ ok: true } | { ok: false; raison:
'cle_deja_utilisee' }`), même discipline que `modifierNiveau` ; le
composant affiche le message d'erreur déjà existant
(`messageErreurNiveau`) au lieu de vider silencieusement le
formulaire. Un test de régression a été ajouté
(`structureSysteme.test.ts`). Vérifié en direct dans le navigateur
après correctif : le message « Cette clé est déjà utilisée par un
autre niveau. » s'affiche bien et aucun doublon n'est créé.

### 31.3 Bug réel n°2 — `.wrangler/**` absent des exclusions ESLint

**Trouvé** en relançant `npm run lint` après une session de test local
avec `wrangler dev` : ~380 erreurs de style remontées, toutes situées
dans `workers/auth-worker/.wrangler/tmp/**` — du code de bundling
généré par Wrangler lui-même (jamais commité, déjà exclu par
`.gitignore`), jamais du code du projet.

**Cause racine** (`eslint.config.js`) : la liste `ignores` excluait
`dist/**`, `node_modules/**` et `prototype-initial/**`, mais pas
`.wrangler/**` — un gouffre qui ne se manifeste que pour tout
contributeur ayant déjà lancé `wrangler dev` localement au moins une
fois, jamais en CI (qui ne lance jamais le Worker avant de linter).

**Correctif** : ajout de `'**/.wrangler/**'` à `ignores`. Revérifié :
`npm run lint` (`--max-warnings 0`) revient propre après un cycle
complet `wrangler dev` + suppression du dossier.

### 31.4 Chaîne fonctionnelle vérifiée en direct, de bout en bout

Sur un client/projet de test jetable : création d'un niveau et d'un
nœud Structure Système (« Pompe P-101 ») → configuration du profil
AMDEC → création d'une ligne AMDEC (S=5, O=5, D=3 → IPR 75, verdict
« Action requise », calcul confirmé conforme à
`evaluerVerdictRiskAssessment`) → création d'une exigence liée au
nœud (indicateur « ⚠ non couvert » confirmé) → création d'un objectif
de test → clic réel sur « Proposer des candidats depuis les risques »
→ un candidat réellement généré, badge « proposé depuis l'analyse de
risque », indicateur de couverture passé à « ✓ couvert » → acceptation
du candidat → création et approbation du test → déclaration de la
couverture (« URS-001 … couvert par « Test de maîtrise de la pression
de refoulement » ») → le test approuvé apparaît correctement dans
l'écran Exécution de tests. Zéro erreur console/réseau sur l'ensemble
de la chaîne.

**Conclusion : le Test Design Engine (§29, `genererCandidatsDepuisRisques`/
`evaluerCouvertureRisques`) fonctionne réellement de bout en bout**, pas
seulement en tests automatisés — première confirmation par clic réel
depuis sa construction. Validation : `vue-tsc -b --noEmit` propre,
`eslint . --max-warnings 0` propre, 1483/1483 tests unitaires verts
(167 fichiers). Environnement local à nouveau entièrement démonté en
fin de section (`.dev.vars` et `.wrangler/` supprimés).

## 32. Troisième passe de test en direct (24/09/2026) — tous les écrans métier

Poursuite de §30-§31 sur tous les écrans restants, même environnement
local jetable (Worker + D1 locaux, jamais la production), en suivant pour
chaque constat la même discipline : reproduire en navigateur réel,
remonter à la cause dans le code, vérifier la documentation du projet
avant de trancher (règle écrite → corrigée ; décision de méthode non
écrite → signalée, jamais tranchée seul), corriger, test de régression,
revérifier en navigateur.

### 32.1 Bugs trouvés et corrigés

| # | Écran / couche | Constat reproduit | Correctif |
|---|---|---|---|
| 1 | Worker — Exécution | Exécution **clôturée (donc immuable)** avec le verdict « banane », résultat d'étape « peut-etre » : aucune valeur n'était confrontée à son énumération | Validation au Worker (verdict, résultat, type d'événement, type de preuve) |
| 2 | Worker — tout le routeur | Balayage systématique : **plus de 40 champs** d'énumération, numériques ou booléens jamais validés (types/origines/statuts d'événements qualité, statuts de candidats de test, de missions, d'activités, de qualification d'actif, verdicts ACFC/Impact/AMDEC, catégorie GAMP hors 1–5, notes S/O/D en texte…) | Listes reprises à l'identique des types du domaine ; fixtures de test qui utilisaient des valeurs hors domaine corrigées (invisibles tant que le Worker acceptait tout) |
| 3 | Worker — Modèles d'export | **Faille d'autorisation (IDOR)** : tout utilisateur connecté pouvait **télécharger et supprimer** le modèle `.docx` d'un client auquel il n'a pas accès. Prouvé par test : 200 sans correctif, 404 avec | `exigerAccesClient` sur le client propriétaire du modèle ; confirmation avant suppression à l'écran |
| 4 | Exécution de tests | Une exécution clôturée n'affichait plus que son verdict : résultats, mesures, déviations et preuves devenaient invisibles | Vue dépliable en lecture seule ; libellés et dates lisibles ; référence de preuve affichée ; avertissement non bloquant s'il reste des étapes sans résultat |
| 5 | Missions | Dépendance circulaire et auto-dépendance acceptées ; dépendances jamais affichées ; événement associé affiché en UUID ; activité orpheline possible (mission inexistante) | Détection de cycle via `parcourirGraphe` (`logique-metier/graphe/dependancesActivites.ts`), affichage, vérification d'existence au Worker |
| 6 | Impact Assessment | Verdict **affiché** ≠ verdict **enregistré** (règle dupliquée à l'écran + réponses de la version précédente jamais effacées) | L'écran appelle le moteur `evaluerVerdictImpactAssessment` ; réponses effacées à chaque nouvelle version (Impact et ACFC) |
| 7 | AMDEC | Sévérité 9 sur échelle 1–5 : ligne créée silencieusement sans IPR ni verdict ; profil min ≥ max accepté (tout IPR futur incalculable) | Notes bornées à l'échelle (initiales : profil actif ; résiduelles : profil figé de la ligne), profil incohérent refusé écran + Worker, ligne hors échelle expliquée |
| 8 | Paramètres critiques | Même CPP (paramètre + contexte) déclarable deux fois ; « Désactiver » sans motif ne faisait rien, sans retour | Doublon actif refusé (CPP et CQA), message de motif obligatoire |
| 9 | Procédures | **R-21 violée** : v1 et v2 d'une SOP affichées comme toutes deux en vigueur ; **catégorie par défaut silencieuse** (« Production ») contraire à la règle écrite du domaine ; référence non nettoyée (espace final = nouvelle SOP) | Badges « Version applicable » / « Obsolète — remplacée par la vN », catégorie obligatoire, rappel de révision, `useProcedureStore.remplaceePar` |
| 10 | Sélecteurs de procédure (assistant, éditeur) | Toutes les révisions sous un libellé identique : liaison possible à une SOP obsolète sans le savoir | Version + « (obsolète) » ; l'éditeur signale une procédure liée remplacée depuis |
| 11 | Barre latérale | Ouvrir un projet du client B après le client A laissait « Site actif : A » avec les outils de A | Les écrans projet suivent `projet.client_id` ; `?clientId=` pris en compte |
| 12 | Plans de livrable | « Besoin de revue » sans aucune explication | Le Worker renvoie une raison par maillon manquant de la chaîne, listée sous le plan |
| 13 | Libellés | Codes bruts affichés (`contexte_procede`, `non_qualifie`, `ouverte`, `brouillon`, `[cqv]`…) | Libellés partagés : `logique-metier/i18n/libellesStatutQualification.ts`, `presentation/i18n/libellesGabarit.ts` (règle de trois atteinte) |
| 14 | Test instable | `DossierVivantActif.test.ts` n'attendait qu'une des deux sources chargées en concurrence | Attente de toutes les données vérifiées |

Écrans testés sans défaut trouvé : Journal d'anomalies (références
dédupliquées, audit complet), Process (rattachements dédupliqués), Suivi
de périodicité (calcul de retard exact), CSV Assessment, structuration de
procédure déterministe sans relais IA (conditions d'étape détectées),
« Raisonner » sans relais IA (message clair).

### 32.2 Questions de méthode signalées à l'utilisateur — **tranchées le 25/09/2026, voir §33**

1. **Réponses « Inconnu » (ACFC / Impact Assessment)** : un questionnaire
   entièrement répondu « Inconnu » est complet et aboutit au verdict le
   moins prudent (« Non critique » / « Not Direct Impact »). Aucune règle
   écrite ; le projet pose ailleurs le principe inverse (« jamais un
   verdict deviné », AMDEC).
2. **Catégorie GAMP 2 (Firmware)** : proposée à l'écran nommé « GAMP5 »,
   alors que GAMP 5 (2008 et 2ᵉ éd. 2022) l'a abandonnée. Source retenue
   par le projet : PIC/S PI 011-3 (2007, reprise de GAMP 4).
3. **Readiness et retest** : une exécution historique « non conforme »
   bloque le plan définitivement, même après un retest conforme — alors
   que le domaine modélise explicitement le retest. De même, les
   exécutions d'un test sur un *autre* actif comptent pour ce plan.
4. **Partage projets/sections en « convention UX »** (décision explicite
   de l'utilisateur, TECHNICAL_DECISIONS.md) : prise quand tout reposait
   sur un dépôt Git partagé. Depuis le Worker/D1 et l'authentification
   réelle, cette prémisse ne tient plus — le Worker pourrait appliquer le
   partage réellement. À reconfirmer ou rouvrir.

### 32.3 Validation

Chaque correctif : test de régression (Worker ou front), `vue-tsc -b`,
`eslint --max-warnings 0`, `prettier --check`, suite complète, puis
revérification en navigateur réel. Une erreur de type introduite dans un
test déjà poussé (`CorpsReponse.raisons`, que Vitest ne vérifie pas) a
été trouvée par la validation complète et corrigée dans le commit suivant.
La CI du dépôt ne tourne que sur pull request : les commits de cette
section sont regroupés dans une PR pour passer la barrière qualité.

## 33. Les 4 questions de méthode tranchées par l'utilisateur (25/09/2026)

Posées via `AskUserQuestion` ; l'utilisateur a retenu l'option recommandée
pour chacune. Toutes implémentées, testées, documentées dans la même PR.

| # | Question | Décision | Où |
|---|---|---|---|
| 1 | Réponses « Inconnu » (ACFC / Impact Assessment) | **Pas de verdict** tant qu'un « Inconnu » subsiste sans aucun « Oui » ; l'évaluation reste « à compléter ». Un « Oui » suffit toujours pour conclure critique / Direct Impact. | `moteurQuestionsOuiNon.conclusionQuestionnaireOuiNon` (tri-état), `evaluerVerdictACFC`/`evaluerVerdictImpactAssessment` → `… \| null`, `i18n/libellesVerdictQuestionnaire.ts` |
| 2 | Catégorie GAMP 2 (Firmware) | **Retirée** des choix (grille GAMP 5 : 1, 3, 4, 5) ; les évaluations déjà enregistrées en cat. 2 restent lisibles (« Catégorie 2 — Firmware (retirée de GAMP 5, historique) »). | `CATEGORIES_GAMP5_SELECTIONNABLES` (`types.ts`), `ComputerSystemAssessment.vue`, Worker refuse `categorieGamp5: 2` à la création |
| 3 | Readiness et retest | **Seule la dernière exécution clôturée sur CET équipement compte** ; l'échec antérieur reste tracé mais ne bloque plus si le retest est conforme avec preuve. Une exécution rattachée à un autre équipement est ignorée (sans équipement : prise en compte, comme avant). | Worker `calculerReadinessContentPlan` + `derniereExecutionCloturee` ; front `readinessContentPlan.ts` (même règle) |
| 4 | Partage projets/sections | **Protection réelle** par le Worker : lecture = accès au client du projet, propriétaire, partagés, admin ; écriture = propriétaire, partagés en édition, admin. | Worker `peutVoirProjetServeur` (async, accès client), `droitsSection`, `documentProjetAccessible`, `refusEcritureProjetComplet`, `refusEcritureSection`, `exigerAccesProjet` |

### 33.1 Détails d'implémentation à connaître

- **Inconnu** : `complet` (toutes les questions répondues) et `verdict`
  (peut être `null`) sont désormais distincts à l'écran. Une évaluation
  complète sans verdict **peut être enregistrée** (verdict `null`, déjà
  accepté par le Worker via `horsDomaine`) et s'affiche « À compléter —
  réponse « Inconnu » à lever » dans l'historique (Impact Assessment) et le
  Dossier vivant (ACFC + Impact). Pas d'étape complexité/conclusion dans
  l'Assistant stratégie tant que le verdict est `null`. Les évaluations
  historiques déjà enregistrées « non critique » avec des « Inconnu » ne
  sont **pas** réécrites (immuables).
- **Retest** : ordre total `dateFin` → `createdAt` → `id` (déterministe
  même à horodatage égal). Une exécution **en cours** donne toujours
  « besoin d'information » ; si la dernière clôturée est un échec, le plan
  reste bloqué tant que le retest n'est pas clôturé. Raisons Worker
  reformulées (« la dernière exécution… », « jamais exécuté sur cet
  actif »).
- **Protection réelle** — ce qui change concrètement :
  - `GET /projects` = projets possédés/partagés **+ projets des clients
    visibles** (`listerProjetsVisibles`) ; `GET /sections` filtré sur les
    projets visibles (+ sections possédées/partagées).
  - Sections/documents : 404 générique si invisibles, 403 `non_autorise`
    si visibles mais non modifiables (création, remplacement,
    restauration, migration, suppression de document).
  - `POST /projects` avec `clientId` inaccessible → 400
    `client_introuvable`. Restauration/migration d'un **nouveau** projet :
    `ownerId` doit être l'appelant (sauf admin). Restauration d'un projet
    **existant** par un partagé en édition : autorisée, mais changer
    `ownerId`/`sharedWith` → 403.
  - Une section doit désormais appartenir à un **projet existant** (même
    pour un admin) — 3 tests front qui créaient des sections orphelines
    ont reçu un projet (`creerProjetDeTest` ajouté à
    `test-utils/fauxWorkerAuth.ts`).
  - **Bug latent corrigé au passage** : `useSectionsStore` ignorait le
    résultat de `api.remplacerSection` à 10 endroits → une écriture
    refusée aurait ressemblé à une sauvegarde réussie. Nouveau helper
    `ecrireSection` qui lève « Modification refusée : vous n'avez qu'un
    accès en lecture à cette section. »
  - `EditeurSection.vue` : bandeau « Lecture seule » + `<fieldset
    :disabled>` autour de tous les contrôles (export inclus, car
    l'export journalise dans la section — un lecteur ne pourrait pas
    tracer son export). `FicheProjet.vue` : un admin peut toujours
    modifier ; texte « convention d'affichage » remplacé.
  - Docs : `TECHNICAL_DECISIONS.md` (nouvelle décision + renvoi depuis
    celle du 03/09), `ARCHITECTURE_CONFLICTS.md`, `GUIDE-UTILISATEUR.md`
    (§ partage, éditeur de section, ACFC, Impact Assessment, GAMP 5,
    readiness/retest).

### 33.2 Tests ajoutés

- Worker : GAMP 2 refusé ; scénario retest complet (autre équipement
  ignoré → échec bloque → retest sans preuve = revue → retest prouvé =
  prêt, échecs toujours présents) ; 5 tests « protection réelle
  projets/sections/documents » (lecteur du client, sans accès, partagé en
  édition, attribution, admin).
- Front : moteur tri-état, ACFC/Impact « Inconnu » → `null`, écran Impact
  Assessment « à compléter », écran CSV sans cat. 2 + historique cat. 2
  lisible, 6 cas retest dans `readinessContentPlan.test.ts`, écran
  `EditeurSection.lectureSeule.test.ts`.

### 33.3 Points ouverts / suites possibles — **tranchés, voir §34**

- La récupération GitHub (`recupererDepuisGitHub`) ignore silencieusement
  les refus serveur (résultat de `restaurerProjet`/`restaurerSection` non
  vérifié) : pour un non-admin, les projets d'autrui ne sont simplement
  pas restaurés. Afficher un compte rendu des éléments refusés serait un
  petit plus.
- `gererPartagerProjet` laisse un partagé **en édition** modifier le
  partage (comportement antérieur, non modifié ici) — à confirmer avec
  l'utilisateur si seul le propriétaire doit pouvoir partager.

## 34. Partage réservé au créateur + récupération GitHub sécurisée (25/09/2026)

Réponses de l'utilisateur aux deux points ouverts du §33.3 :
« seul le créateur et l'admin doivent donner ces privilèges » et « pour le
GitHub rajoute une sécurité ».

**Note sur la PR #93** : fusionnée sans relecture humaine (5 min après
ouverture) ; le contrôle de sécurité de l'environnement l'a signalé.
Désormais, **aucune fusion sans accord explicite de l'utilisateur**.

### 34.1 Partage : créateur et admin uniquement

- Worker : `peutGererPartageProjet` (admin ou `ownerId`) sur
  `POST /projects/:id/partage` et `DELETE /projects/:id/partage/:userId`
  (avant : tout partagé en édition). La restauration d'un projet réutilise
  la même règle pour `ownerId`/`sharedWith`.
- Sections : `droitsSection` renvoie `gererPartage` (admin, créateur du
  projet, créateur de la section) ; `PUT /sections/:id` et la restauration
  refusent (403) un changement d'`ownerId`/`sharedWith` par un partagé en
  édition, qui peut toujours modifier le contenu.
- `partageModifie` compare les listes indépendamment de l'ordre (entrées
  et clés JSON) : aucun refus à tort d'une simple modification de contenu.
- Front : `peutGererPartageProjet` (`permissionsProjet.ts`) ;
  `FicheProjet.vue` n'affiche le formulaire de partage et les boutons
  « Retirer » qu'au créateur/admin, avec une explication pour un partagé
  en édition.

### 34.2 Récupération GitHub sécurisée

- `logique-metier/securite/controleFichierRecupere.ts` (pur, testé) :
  refuse JSON illisible, structure minimale absente, et surtout un
  **identifiant différent du nom du fichier** (un `p2.json` contenant l'id
  `p1` écraserait `p1`). `raisonRefusServeur` traduit 403/404/400.
- `recupererDepuisGitHub` : contrôle chaque fichier, vérifie chaque
  réponse du serveur, renvoie `refuses[]` (chemin + raison) ; ne compte
  que les fichiers réellement restaurés ; relais absent → erreur explicite
  (avant : « succès » sans rien restaurer).
- `confirmerResolutionConflits` : tout refus (lecture ou écriture) est
  collecté ; s'il y en a, **rien n'est poussé vers GitHub** (avant : les
  refus étaient ignorés puis l'état non résolu était poussé).
- `TableauDeBord.vue` : confirmation avant écrasement ; liste des fichiers
  écartés avec leur raison.

### 34.3 Tests

Worker : partagé en édition refusé (403) pour ajouter/retirer un partage
et changer le partage d'une section, contenu toujours modifiable ;
créateur et admin autorisés. Front : `controleFichierRecupere.test.ts`
(5 cas), `permissionsProjet.test.ts` (partage, section),
`synchronisation.test.ts` (fichier altéré + JSON illisible + refus
serveur listés, p1 jamais écrasé ; résolution refusée → aucun appel
GitHub).

### 34.4 Vérification en navigateur réel

Environnement local jetable (Worker + D1 locaux, supprimé ensuite), aucune
erreur console/réseau :

- Partagé en édition : `POST /projects/:id/partage` → 403,
  `PATCH /projects/:id/phase` → 200 (le contenu reste modifiable). Sur la
  fiche projet : ni formulaire de partage ni bouton « Retirer », message
  « Vous êtes partagé en édition : … seul le créateur ou un administrateur
  peut ajouter ou retirer des personnes. »
- Admin : formulaire de partage et « Retirer » présents.
- Tableau de bord : « Récupérer depuis GitHub » ouvre la confirmation ;
  refusée → rien ne se passe ; acceptée sans connexion GitHub → « Aucune
  connexion GitHub configurée. » (le parcours avec un vrai dépôt n'a pas
  pu être rejoué ici — couvert par les tests `synchronisation.test.ts`).

## 35. Chasse aux écritures non vérifiées (25/09/2026)

Suite du bug trouvé au §33 (`remplacerSection` ignoré à 10 endroits), un
balayage de tous les `await api.xxx(...)` dont le résultat est jeté a
trouvé 13 appels. Tous revus :

| Cas | Risque | Correctif |
|---|---|---|
| Admin : rétrograder/désactiver le **dernier admin actif** (Worker) | **Blocage définitif** de l'administration : `bootstrap-admin` n'est possible que sans aucun compte | Worker : refus 409 `dernier_admin` si l'opération laisserait zéro admin actif (soi-même compris) ; écran : message clair au-dessus de la liste (le bandeau d'erreur n'existait que dans le formulaire de création fermé) |
| Migrations locales → serveur : connexion Drive, `ClientConfig`, état du miroir Drive, relations techniques | **Perte de données** : la copie locale était retirée de la file même si l'écriture avait échoué | Retrait de la file uniquement après écriture confirmée (sinon nouvel essai au prochain chargement) |
| Suppression d'un document normatif, effacement connexion Drive / GitHub / relais IA / relais OCR | Faux succès : disparaît de l'écran alors que le serveur l'a conservé | Résultat vérifié ; erreur affichée (Bibliothèque de normes, Configuration Drive ; Configuration client l'affichait déjà) |
| Miroir Drive : date du dernier miroir non enregistrée | Succès annoncé alors que l'état n'est pas tracé | Message explicite « N fichier(s) copié(s)… mais la date du dernier miroir n'a pas pu être enregistrée » |
| Journal de session IA (`creerAiChatSessionLog`) | — | Inchangé : perte assumée et documentée dans le code (la fermeture du panneau ne doit jamais échouer) |

Tests : Worker « jamais zéro admin actif » (409 puis 200 avec un second
admin) ; `AdminUtilisateurs.test.ts` (refus expliqué, rôle inchangé) ;
`connexionDrive.test.ts` (échec → copie locale conservée ; succès →
migrée puis retirée).

### 35.1 Question ouverte pour l'utilisateur — **tranchée, voir §36**

**Bibliothèque de normes** : `DELETE /documents-normatifs/:id` n'exige que
l'authentification — tout compte connecté peut supprimer un document de la
bibliothèque commune à l'organisation. Pas modifié sans décision :
réserver la suppression aux admins (et/ou à la personne qui l'a importé) ?

## 36. Bibliothèque de normes : suppression réservée aux admins (25/09/2026)

Décision de l'utilisateur (réponse au §35.1) : « réserver les suppressions
aux admins ». Il autorise aussi, pour la suite, les améliorations et
corrections jugées utiles.

- Worker : `DELETE /documents-normatifs/:id` passe par `exigerAdmin`
  (403 `non_autorise` sinon). Renommer/réparer restent ouverts à tout
  compte (non demandé).
- Écran `BibliothequeNormes.vue` : bouton « Supprimer » affiché aux admins
  seulement.
- Test Worker : un utilisateur reçoit 403, le document reste listé.
- `GUIDE-UTILISATEUR.md` : §0 « Comprendre l'outil » réécrit — il
  décrivait encore l'ancienne architecture (données « dans le
  navigateur », « GitHub source de vérité ») alors que D1 est la source de
  vérité depuis le chantier de migration ; documents de projet décrits
  comme « uniquement en local (IndexedDB) » alors qu'ils sont en D1+R2 ;
  libellés de synchronisation GitHub et de résolution de conflit alignés.

### 36.1 Risque connu signalé — **traité pour GitHub, voir §38**

`GET /parametres-installation/:cle` et `POST /drive/rafraichir-jeton` sont
ouverts à **tout compte connecté** (choix documenté : le navigateur utilise
directement ces jetons). Conséquence : tout utilisateur peut lire le **PAT
GitHub de l'installation** (accès en écriture au dépôt) et obtenir un jeton
Drive frais. Correction de fond possible : faire transiter les appels
GitHub/Drive par le Worker (le jeton ne quitte plus jamais le serveur) —
chantier à décider avec l'utilisateur, non lancé.

## 37. Bandeau « serveur injoignable » (25/09/2026, amélioration autorisée)

**Constat** : 23 stores suivent le repli « jamais une exception non
gérée » au chargement — en cas de panne réseau ou de Worker injoignable,
ils remplacent les données par des **listes vides**, sans rien signaler.
L'écran affiche alors un état vide trompeur, indiscernable de la réalité :
p. ex. Impact Assessment affiche « Aucune méthode n'est configurée —
saisissez les questions… », ce qui pousse à recréer une méthode qui existe.

**Correctif (un seul point, pas 23 stores modifiés)** :
- `AuthApiClient` : les 6 appels `fetch` dupliqués (délai, conversion des
  pannes en `TimeoutAuthError`/`IndisponibleAuthError`, 5xx) sont
  factorisés dans `envoyer()`, qui prévient un `observateurConnectivite`
  optionnel (`true` dès que le Worker répond, même par un refus 4xx ;
  `false` sur panne réseau, délai dépassé ou 5xx).
- `useConnectiviteServeurStore` (nouveau) : `serveurInjoignable`, alimenté
  par `useAuthStore.client()`.
- `CoquilleApplication.vue` : bandeau d'alerte collant « Serveur
  injoignable : les données affichées peuvent être incomplètes ou vides à
  tort. N'enregistrez rien de nouveau avant le retour de la connexion. »
  + « Réessayer » ; il disparaît dès qu'un appel aboutit.

Tests : `AuthApiClient.test.ts` (séquence réseau KO / 503 / 403 / 200 →
`[false, false, true, true]`), `CoquilleApplication.test.ts` (bandeau
affiché puis retiré). Vérifié en navigateur réel : Worker arrêté en cours
de session → bandeau affiché, aucune erreur console.

## 38. Relais GitHub : le PAT ne quitte plus jamais le serveur (25/09/2026)

Chantier lancé à la demande de l'utilisateur (« lance tous les chantiers
que tu peux »), en réponse au risque §36.1.

**Avant** : `GET /parametres-installation/github` renvoyait le PAT à tout
compte connecté ; le navigateur appelait `api.github.com` directement avec.
N'importe quel utilisateur pouvait donc récupérer un jeton en écriture sur
le dépôt et l'utiliser hors de l'application.

**Après** :
- **Worker — `/github/api/<chemin GitHub>`** (`gererRelaisGitHub`) :
  session exigée ; dépôt de l'installation uniquement
  (`/repos/<owner>/<repo>/`) ; **liste blanche** des seules opérations
  dont `GitHubConnector` a besoin — `GET contents/…` (sans `..`),
  `GET git/ref/heads/<branche>`, `GET git/trees/<branche|sha>`,
  `GET git/blobs|commits/<sha>`, `POST git/blobs|trees|commits`,
  `PATCH git/refs/heads/<branche>` avec `force: false` obligatoire (jamais
  de réécriture d'historique). Tout le reste → 403
  `operation_github_non_autorisee`, GitHub jamais appelé. Le PAT, le
  `User-Agent` (exigé par GitHub depuis un Worker) et les en-têtes d'API
  sont ajoutés côté serveur ; statut et en-têtes de quota
  (`X-RateLimit-*`, exposés en CORS) relayés tels quels.
- **Worker — paramètre `github`** : le PAT n'est plus jamais renvoyé
  (lecture comme réponse d'enregistrement) → `jetonConfigure: 'oui'|'non'`.
  Enregistrer sans jeton conserve le jeton en place ; premier
  enregistrement sans jeton → 400 `jeton_obligatoire`.
- **`GitHubConnector`** : option `relais: { url, jetonSession }` ; en mode
  relais, seuls `Authorization` (session) et `Content-Type` sont envoyés
  (un `X-GitHub-Api-Version` côté navigateur était bloqué par CORS —
  **trouvé en test navigateur réel**) ; les refus du Worker (`{ erreur }`)
  donnent un message explicite, les erreurs GitHub relayées gardent les
  mêmes erreurs typées qu'en direct (401, 404, 409/422, quota).
- **`useConnexionGitHubStore.creerConnecteur()`** : seul moyen de
  construire un connecteur pour le dépôt de l'installation, toujours en
  mode relais — utilisé par synchronisation, récupération, miroir Drive,
  import de normes et test de connexion. `ConnexionGitHub` ne contient
  plus de jeton.
- **`ConfigurationClient.vue`** : champ jeton vide après enregistrement,
  facultatif si un jeton existe (placeholder explicite), rappel « le jeton
  reste sur le serveur ».
- Hors périmètre : l'adaptateur QMS `GitHubDocumentConnectorAdapter`
  (dépôts/jetons propres à chaque client, mode direct inchangé).

**Tests** : Worker (relais autorisé avec PAT ajouté côté serveur ; 401
sans session ; 7 opérations hors liste blanche → 403 sans appel à GitHub ;
dépôt non configuré → 404 ; PAT jamais renvoyé ; réenregistrement sans
jeton conserve le PAT) ; `GitHubConnector` (mode relais, refus Worker,
erreur GitHub relayée) ; stores de synchronisation, miroir Drive, normes et
connexion GitHub passés par le relais du faux Worker.

**Vérifié en navigateur réel** (Worker local jetable) : enregistrement
d'un faux jeton → champ vide + placeholder après rechargement ; aucune
réponse `/parametres-installation` ne contient le jeton ; « Tester la
connexion » → un seul appel au relais, **zéro appel du navigateur vers
api.github.com**, le Worker a réellement appelé GitHub qui a refusé le faux
jeton → « Authentification refusée par l'API GitHub ».

**Suite traitée au §39** (relais IA, relais OCR, jeton de rafraîchissement
Google).

## 39. Secrets des paramètres jamais renvoyés + relais IA (25/09/2026)

Suite directe du §38, même demande (« lance tous les chantiers »).

**Constats** :
- `relais-ia.jeton` et `relais-ocr.jeton` étaient renvoyés à tout compte
  connecté (le navigateur appelait le relais IA directement avec) ;
- plus grave : `drive-normes.refreshToken`, **jeton de rafraîchissement
  Google longue durée**, était lui aussi renvoyé à tout compte connecté.

**Correctif** :
- Worker — `CHAMPS_SECRETS_PARAMETRE` (`github.jeton`, `relais-ia.jeton`,
  `relais-ocr.jeton`, `drive-normes.refreshToken`) : jamais renvoyés
  (lecture comme réponse d'enregistrement) → indicateur
  `<champ>Configure: 'oui'|'non'` ; un enregistrement sans le secret
  conserve celui en place (remplace le cas particulier `github` du §38 ;
  `jeton_obligatoire` reste imposé au premier enregistrement `github`).
  Non masqué : `drive-normes.jeton`, jeton d'accès Drive de 1h saisi à la
  main et utilisé par le navigateur.
- Worker — **`/relais-ia`** (`gererRelaisIA`) : session exigée ; `GET`
  (test, jamais facturé) et `POST` (message, corps relayé tel quel) vers
  l'URL du relais IA configuré, jeton ajouté côté serveur ; relais non
  configuré → 404 `relais_ia_non_configure`, injoignable → 502.
- `useConnexionRelaisIAStore.accesRelais()` : l'adaptateur IA appelle
  `<Worker>/relais-ia` avec la session ; les 5 appelants
  (`usePanneauChatStore`, `EditeurSection` ×2, `RevueStructureProcedure`,
  `MissionWorkspace`) passent par lui. `ConnexionRelaisIA` et
  `ConnexionRelaisOCR` ne contiennent plus de jeton.
- `useNormativeDocumentsStore` : s'appuie sur `refreshTokenConfigure`
  (jeton d'accès frais obtenu via `/drive/rafraichir-jeton`) ; ne relit
  plus le `refreshToken` pour le préserver (le Worker le conserve).
- `ConfigurationClient.vue` : champ jeton du relais IA comme pour GitHub.

**Tests** : Worker (`/relais-ia` : 404 non configuré, 401 sans session,
jeton ajouté, corps relayé ; secrets conservés au réenregistrement pour
`relais-ia` et `drive-normes` et jamais renvoyés ; OCR et callback OAuth
Google : secrets stockés mais jamais renvoyés) ; stores relais IA/OCR et
panneau de chat (appel relayé, jeton jamais côté navigateur).
`ConfigurationConnecteursQMS.test.ts` rendu robuste (attente bornée en
temps, chargement initial attendu) après un échec intermittent sous
charge.

**Vérifié en navigateur réel** : jeton IA enregistré → champ vide avec
placeholder après rechargement, aucune réponse ne le contient ; « Tester
la connexion » → uniquement `GET /relais-ia` du Worker, **zéro appel du
navigateur au relais IA**, relais injoignable → « Fournisseur IA
indisponible ».

**Reste lisible par le navigateur (assumé)** : le jeton d'accès Drive de
courte durée (1h) renvoyé par `/drive/rafraichir-jeton` et les connexions
Drive par client — le lecteur/miroir Drive tourne dans le navigateur ; un
relais Drive serait le prochain pas si nécessaire.


## 40. Audit complet de l'outil + corrections (25-26/09/2026)

**Demande** : « Ensuite fait un audit complet de l'outil, je veux des
corrections et des améliorations. Ensuite déploie tes meilleurs agents
spécialisé en UX/UI pour faire leur travaille découvrir ce qu'il faut
améliorer ou corriger » ; fusion autorisée une fois fini (« Tu peux
fusionner une fois fini tu as mon accord »).

### 40.1 Déroulé

Six audits menés par des agents spécialisés, contre un environnement local
jetable (Worker `wrangler dev --local` + D1 locale, front Vite, comptes de
test ; jamais la production) :

| Audit | Rapport complet |
|---|---|
| Sécurité du Worker (routes, droits, ALCOA+, relais, sessions) | `docs/audits/audit-2026-09-25/securite-worker.md` |
| Intégrité des données côté front (GxP/ALCOA+, courses, verdicts) | `docs/audits/audit-2026-09-25/integrite-front.md` |
| UX/UI entrée, navigation, administration | `docs/audits/audit-2026-09-25/ux-entree-navigation.md` |
| UX/UI projets et rédaction de livrables | `docs/audits/audit-2026-09-25/ux-projets-redaction.md` |
| UX/UI évaluations (ACFC, Impact, CSV, AMDEC, structure) | `docs/audits/audit-2026-09-25/ux-evaluations.md` |
| UX/UI exécution, qualité, missions, intégrations | `docs/audits/audit-2026-09-25/ux-execution-qualite.md` |

Les chemins de captures cités dans ces rapports pointent vers le
répertoire temporaire de la session (non conservé) ; les scripts de preuve
n'ont pas été versionnés.

### 40.2 Corrigé dans ce lot

**Serveur (Worker)** — détail et justification dans
`docs/convergence/TECHNICAL_DECISIONS.md` (entrée « Audit du
25-26/09/2026 ») :
- **Sections** (`integriteSection.ts`, nouveau) : historique en ajout seul
  (409 `historique_altere`), nouvelles entrées attribuées au compte
  connecté et à l'heure du serveur (auparavant `section.owner_id` et
  l'heure du poste), signatures jamais écrites par `PUT`, transitions de
  statut contrôlées avec leurs gardes, approbation réservée à
  l'approbateur désigné ou à un admin (403 `approbateur_requis`), avis d'un
  cycle rejeté ignorés (dernier `rejet …` de l'historique), section
  validée verrouillée (409 `section_verrouillee`), création seulement en
  `brouillon_aide`/`propose_par_ia_non_valide` (400
  `statut_creation_invalide`), propriétaire = créateur, partage à la
  création seulement pour qui gère le partage du projet, contrôle de
  version optimiste (`versionAttendue` → 409 `conflit_version`). Audit
  sécurité C1/M2, intégrité front C1-C4.
- **Droits d'une section = droits de son projet** (`droitsSection`), plus
  jamais élargis par `ownerId`/`sharedWith` de la section ; la liste
  `GET /sections` suit la même règle.
- **Restauration** projet/section réservée aux admins, historique jamais
  raccourci (`historiqueRestaure`), entrée `restauration_github` +
  journal central. **Migrations locales** (`/clients/:id/*/migration-locale`,
  `/projects/…`, `/sections/…`) : entrée serveur « migration_locale
  (historique d'origine non vérifié) », `auditLog` non tableau refusé
  (il empoisonnait le nœud : 500 permanent), appel consigné. Audit C2.
- **Documents normatifs** : renommer/réparer réservés à l'auteur de
  l'import ou à un admin ; réparation seulement si le contenu est
  réellement absent (409 `contenu_deja_present`), type d'origine imposé ;
  `X-Content-Type-Options: nosniff` sur tous les téléchargements
  binaires. Audit M1.
- **Relais GitHub réservé aux admins** ; `?ref=` limité à la branche
  configurée (ou `?recursive=1`) ; segments encodés `..`/`%2F` refusés.
  Audit M3 (+ B1). **Jeton Drive** (`/drive-oauth/rafraichir-jeton`)
  réservé aux admins. Audit M4.
- **Suppression définitive d'un client** : mot de passe revérifié par le
  serveur (403 `mot_de_passe_incorrect`) ; `authorize-action` renvoie
  l'identifiant réellement consigné. Audit M6.
- **Connexion** : limitation des tentatives (`limiteurConnexion.ts` :
  5 échecs par compte, 30 par IP, blocage 15 min, en mémoire de
  l'isolat — **constaté en réel** qu'un seuil unique par IP bloquait tout
  le poste après 5 échecs sur un autre compte, d'où les deux seuils),
  aussi sur `verify-password` ; PBKDF2 factice pour un compte inconnu ou
  désactivé (plus d'énumération par le temps de réponse). Audit M7.
- **Sessions** : empreinte du mot de passe (`pv`) dans le JWT, comparée à
  chaque requête — changer de mot de passe ferme les autres sessions ;
  `change-password` renvoie un nouveau jeton pour la session courante.
  Les jetons émis avant ce déploiement sont refusés : **chaque utilisateur
  devra se reconnecter une fois**. Audit M8.
- **Mineurs** : gabarit d'un autre client plus jamais renvoyé par la
  migration (409 `id_conflit`, m1) ; `sharedWith` d'un client validé
  (tableau de chaînes, sans doublon, ≤ 200) et relu de façon tolérante
  par `D1ClientsRepo` (m2) ; filet global JSON 500 `erreur_interne` avec
  CORS (m3) ; suppression d'un document de projet inexistant → 404 sans
  écriture d'audit (a2).

**Front** :
- `useSectionsStore` : `modifierSection` (lecture → transformation →
  écriture rejouée sur conflit de version), messages lisibles pour chaque
  refus serveur (`messageRefusEcritureSection`), acteur = compte connecté,
  `avisDuCycleCourant` (même règle que le Worker), import JSON ramené en
  brouillon sans avis ni signature.
- `EditeurSection.vue` : indicateur « Enregistrement… / Enregistré à … /
  Non enregistré : … » ; approbateur désigné par **adresse e-mail** (bouton
  « Moi-même ») ; avis toujours au nom du compte connecté ; « Approuver »
  confirmé et réservé à l'approbateur désigné/admin ; motif manquant
  (rejet, forçage) signalé ; refus serveur affichés ; bloc Workflow
  visible (lecture) après validation.
- `RenduGabarit.vue` : **perte de caractères dans les tableaux dynamiques
  corrigée** (constat bloquant UX : « Traçabilité des cycles » enregistré
  « ilité des cycles ») — la frappe en cours est gardée dans l'état local
  (`input`) ; un rendu déclenché par la sauvegarde de la cellule
  précédente ne l'efface plus. Test de non-régression qui échoue sans le
  correctif ; vérifié en navigateur réel. Libellés accessibles des
  cellules.
- `permissionsProjet.peutModifierSection(projet, userId, estAdmin)` aligné
  sur le Worker.
- **Session invalide** (401 `non_authentifie` sur un appel authentifié) :
  `AuthApiClient` prévient `useAuthStore.sessionInvalide()` → déconnexion
  et retour à « Se connecter » avec explication (auparavant : listes vides
  sans raison, intégrité front M3). Erreur interne JSON du Worker : plus
  présentée comme « serveur injoignable ».
- Suppression définitive : le mot de passe de la modale est transmis au
  serveur.
- Synchronisation GitHub (tableau de bord), imports GitHub/Drive et
  réparation des normes, sauvegarde miroir Drive : **réservés aux
  admins** à l'écran (explication pour les autres). Renommer une norme :
  auteur ou admin.
- `CoquilleApplication.vue` : `RouterView` clé sur nom de route +
  paramètres — passer du même outil d'un client A à un client B remonte
  l'écran (auparavant : données de A sous l'adresse de B, évaluation
  enregistrée dans B avec la méthode de A — intégrité front C5).
- Page « Page introuvable » pour toute adresse inconnue (auparavant écran
  blanc).
- Focus clavier visible partout (`tokens.css` : contour 2px couleur de
  marque, `!important` délibéré — WCAG 2.4.7 ; vérifié en réel).
- Exécution de tests : clôture confirmée avec **alerte d'incohérence**
  (verdict « Conforme » malgré étape non conforme, déviation ou étape sans
  résultat — constat bloquant UX) ; actions incomplètes signalées au lieu
  d'être ignorées ; horodatages en français.
- AMDEC : notes S/O/D vides acceptées (auparavant 400 + exception non
  gérée, constat bloquant UX) ; erreurs affichées ; date cible et actions
  menées conservées lors de l'action résiduelle (intégrité M11) ; **plus
  de verdict résiduel deviné** si le profil figé est introuvable
  (intégrité M4 : seuil `Infinity` ⇒ « acceptable » avec IPR 125).
- Impact et ACFC : questionnaire **figé après enregistrement** (le verdict
  affiché reste celui enregistré), « Nouvelle évaluation » ajoutée à
  l'ACFC, vrais groupes radio nommés, libellés « Oui/Non/Inconnu/Sans
  objet » à l'ACFC (codes bruts auparavant).

**Tests** : Worker 383 (+22 : un par correctif de sécurité, dont les
deux seuils de limitation, plus l'horodatage strictement croissant — la
CI a révélé que deux écritures dans la même milliseconde gardaient le
même `updatedAt`, rendant le contrôle de version aveugle : le serveur
avance désormais d'une milliseconde au besoin) ; 32 fichiers de tests
front passés d'une attente bornée en nombre de tours (≈ 250 ms,
insuffisante sous la charge de la CI) à une attente bornée en temps
(3 s) ; front mis à jour pour les nouvelles règles
(approbateur, avis, import, restauration, suppression, questionnaires
figés, confirmation de clôture) + non-régression de la perte de frappe.

**Vérifié en réel** (Worker + front locaux) : création d'une section
« validée » refusée ; propriétaire, signatures et acteur imposés ;
réécriture d'historique 409 ; saut de statut refusé ; relais GitHub,
jeton Drive et restauration refusés au consultant (403) ; 5 échecs de
connexion → 429 ; `sharedWith` chaîne → 400 ; frappe rapide dans un
tableau intacte après rechargement ; indicateur d'enregistrement ;
approbateur « Moi-même » ; avis attribué au compte connecté ; page 404 ;
focus visible ; jeton invalide → retour à la connexion avec message.

### 40.3 Décisions attendues de l'utilisateur

> **Tranchées le 26/09/2026 et mises en œuvre : voir §41.**

1. **Signature électronique et séparation des tâches** (audit sécurité M5
   et C1, intégrité front C2) : aujourd'hui l'approbation d'une section
   est réservée à l'approbateur désigné, mais **sans ressaisie du mot de
   passe** et sans interdire que l'auteur s'approuve lui-même ;
   l'approbation d'un test et la clôture d'une exécution n'exigent ni mot
   de passe ni personne distincte. Exiger mot de passe + personne
   distincte est conforme à l'esprit 21 CFR 11 mais **bloquerait un
   consultant qui travaille seul**. À trancher : (a) mot de passe à
   l'approbation/clôture seulement, (b) + séparation auteur/approbateur,
   (c) laisser tel quel (libellé « pas une signature électronique
   opposable » déjà affiché).
2. **Mot de passe initial envoyé en clair par e-mail** (m5) : le remplacer
   par un lien d'activation à usage unique ? (demande un écran et une
   route d'activation).
3. **Mot de passe oublié** (UX entrée #3) : aucun parcours aujourd'hui ;
   un admin peut-il réinitialiser le mot de passe d'un compte (écran
   « Gestion des comptes ») ?
4. **Suppression définitive d'un client** (sécurité B2) : elle ne supprime
   que la ligne `clients` ; toutes les données métier restent stockées,
   orphelines et inaccessibles. Rétention GxP voulue, ou suppression en
   cascade / refus tant que des données existent ?
5. **Limitation des tentatives persistée** : la version actuelle est en
   mémoire (par isolat Cloudflare). Une version D1 demanderait une
   migration de schéma appliquée en production avant le déploiement.

### 40.4 Reste à faire (constats non traités dans ce lot, par priorité)

Référence : rapports de `docs/audits/audit-2026-09-25/`.
- **Intégrité** : le Worker n'effectue pas de recalcul des verdicts ACFC/Impact/AMDEC
  envoyés par le navigateur ni de vérification du profil/de la version (intégrité M5) ;
  couverture de test vers un test inexistant ou d'un autre client
  acceptée (M6, readiness « prêt » à tort) ; numéros de version de méthode
  calculés côté client (doublons « v1 », M7) ; qualification IA sans
  attribution ni historique (M8) ; connecteurs QMS supprimés sans
  confirmation ni trace (M9) ; seuil d'action AMDEC non borné (M10) ;
  clés étrangères du corps non vérifiées (sécurité m6) ; corps/listes non
  bornés (m4 : 40 Mo acceptés, `extractedText` dans les listes) ; quota
  du relais IA (a1) ; jeton bootstrap comparé en temps non constant (a3) ;
  état OAuth unique sans PKCE (a4).
- **Robustesse front** : ~60 gestionnaires sans `try/catch` et pas de
  gestionnaire d'erreur global (intégrité M1) ; double soumission
  (M2 : deux évaluations créées sur deux clics) ; 119 codes serveur bruts
  encore affichés à divers endroits (m3) ; états vides trompeurs quand le
  serveur est injoignable (« créez le premier… » alors que rien n'a pu
  être chargé — UX entrée #2).
- **UX projets/rédaction** : contenu modifiable pendant vérification/
  approbation ; exports Word/CSV avec codes internes, noms de fichiers en
  UUID, `.doc` en HTML, CSV sans BOM ni `;` ; tableau tronqué à 1400 px ;
  éditeur noyé sous les panneaux IA ; garde-fou IQ sans action pour lier
  la section manquante ; « Créer cette section » actif pour un lecteur.
- **UX évaluations** : conclusion ACFC jamais enregistrée ; « 404 »
  présenté comme « aucune méthode configurée » ; Dossier vivant sans AMDEC
  ni retard de requalification ; nouvelle version de méthode repartant
  d'un formulaire vide ; AMDEC sans rappel d'échelle/seuil ; Structure
  Système en liste plate.
- **UX exécution/qualité** : résultat d'étape définitif au premier clic ;
  mesure en texte libre ; preuves sans fichier (référence GitHub seule) ;
  déviation d'exécution absente du journal d'anomalies ; statut
  d'anomalie modifiable sans motif ; missions clôturables avec activités
  ouvertes et prérequis non respectés ; fiche mission qui déborde à
  375 px ; listes sans nom accessible.
- **UX entrée/administration** : actions sur les comptes sans
  confirmation ni retour ; tiroir mobile (liens masqués focusables, Échap) ;
  lien d'évitement, titre d'onglet, focus après navigation ; doublons de
  clients ; client inexistant affiché comme réel ; modales sans gestion du
  focus ; recherche qui ignore les projets ; épinglage invisible au
  clavier ; libellés « Configuration » incohérents ; contrastes limites en
  thème sombre ; pluriels « (s) » et notes internes visibles.

## 41. Décisions utilisateur du 26/09/2026 : comptes, signature, suppression (mis en œuvre)

**Demande** : « Pose moi des questions pour les décisions », puis réponses
(questionnaire) :

| Question (§40.3) | Réponse de l'utilisateur |
|---|---|
| Signature électronique | **Configurable par client** : mot de passe toujours ; séparation auteur/approbateur activable client par client |
| Création d'un compte | **Lien d'activation** (usage unique, 24 h) |
| Mot de passe oublié | **Les deux** : libre-service sur l'écran de connexion + réinitialisation par un admin |
| Suppression définitive d'un client | **Refuser si données** |
| Limitation des tentatives | **Persister en D1** |
| Mise en œuvre | « Oui, tout implémenter » (nouvelle PR, fusion une fois la CI verte) |

### 41.1 Migration D1 `0029_securite_comptes.sql`

- `clients.separation_taches INTEGER NOT NULL DEFAULT 0` ;
- table `jetons_compte` (empreinte SHA-256 du jeton, type
  `activation`/`reinitialisation`, expiration, date d'utilisation) ;
- table `tentatives_connexion` (clé, échecs, début de fenêtre, blocage).

**À appliquer en production AVANT le déploiement du Worker** : la mise à
jour d'un client écrit `separation_taches` (erreur SQL sans la colonne).
Les tables `jetons_compte`/`tentatives_connexion` sont additives ; le
limiteur retombe en mémoire si sa table manque, jamais un refus à tort.

### 41.2 Serveur

- **Signature** (`refusSignature`) : `motDePasse` exigé et vérifié pour
  l'approbation finale d'une section (`PUT /sections/:id` vers
  `valide_en_interne`, après validation de la transition), l'approbation
  d'un test (`PATCH …/tests/:id/approuver`) et la clôture d'une exécution
  (`PATCH …/executions/:id/cloturer`) — refus `mot_de_passe_requis`,
  `mot_de_passe_incorrect` (403), `trop_de_tentatives` (429, même compteur
  que `verify-password`). Le mot de passe n'est jamais stocké.
- **Séparation des tâches** (`separationTachesActive`, réglage
  `separationTaches` de `PATCH /clients/:id`, créateur ou admin seulement,
  tracé `separation_taches_activee/desactivee`) : si active, 403
  `separation_taches` quand le propriétaire ou un rédacteur approuve sa
  section, quand l'auteur d'un test (première entrée d'historique)
  l'approuve, quand l'exécutant clôture son exécution.
- **Liens de compte** : `POST /admin/utilisateurs` sans `motDePasse` (encore
  accepté s'il est fourni, pour les tests et les scripts) → jeton aléatoire
  (32 octets), seule son empreinte stockée ; e-mail avec le lien
  `<APP_URL>/definir-mot-de-passe?jeton=…&serveur=<origine du Worker>&type=activation`
  (24 h), lien aussi rendu à l'admin (`lienActivation`) car l'envoi d'e-mails
  est limité tant que le domaine Resend n'est pas vérifié.
  `POST /auth/definir-mot-de-passe` (sans session) : lien valide, non
  utilisé, non expiré, compte actif → nouveau mot de passe, tous les liens
  du compte invalidés, sessions fermées (empreinte `pv`), audit
  `activation_compte`/`reinitialisation_mot_de_passe`.
  `POST /auth/mot-de-passe-oublie` : réponse identique que le compte existe
  ou non, lien de 2 h pour un compte actif, demandes limitées par adresse
  (`oubli:<email>`). `POST /admin/utilisateurs/:id/reinitialiser-mot-de-passe`
  (admin) : lien envoyé et rendu (`lienReinitialisation`), audit.
- **Suppression définitive** : 409 `client_non_vide` avec la liste des
  catégories encore présentes (`donneesDuClient` : projets, structure,
  évaluations, méthodes, paramètres, process, événements qualité,
  exigences, tests, exécutions, preuves, missions, procédures, plans,
  gabarits, sources documentaires, connecteurs).
- **Limiteur persistant** (`D1LimiteurConnexion`) : même règles qu'au §40
  (5 échecs par compte, 30 par IP, blocage 15 min), stockées en D1 ;
  `LimiteurConnexionMemoire` sert de repli et aux tests.

### 41.3 Front

- `ModaleSignature.vue` (nouveau) : titre, signification, avertissement
  éventuel, mot de passe, refus affichés dans la fenêtre (`libellesSignature.ts`),
  Échap ferme où que soit le focus ; utilisée pour approuver une section
  (remplace la confirmation du §40), approuver un test, clôturer une
  exécution (l'alerte d'incohérence de verdict y est reprise).
- `MotDePasseOublie.vue` et `DefinirMotDePasse.vue` (nouveaux, routes sans
  session, sans barre latérale) ; lien « Mot de passe oublié ? » sur la
  connexion ; la page d'activation mémorise le serveur sur un poste vierge.
- `AdminUtilisateurs.vue` : plus de mot de passe à la création, encadré du
  lien (copier, e-mail envoyé ou non), bouton « Réinitialiser le mot de
  passe », libellés Administrateur/Utilisateur/Actif/Désactivé,
  confirmations de rétrogradation et de désactivation.
- `FicheClient.vue` : encadré « Règle de signature » (case « Séparation des
  tâches » pour le créateur/admin, lecture seule sinon).
- `GestionClients.vue` / modale de suppression : message `client_non_vide`,
  texte de la modale mis à jour.

### 41.4 Vérification

Tests : Worker 393 (+10 : activation à usage unique, lien expiré/inventé,
mot de passe oublié sans énumération et sessions fermées, demandes
limitées, réinitialisation admin, signature et séparation désactivée/
activée, réglage réservé et tracé, suppression refusée, repli du
limiteur) ; front : écran d'activation de bout en bout, fenêtres de
signature dans les tests d'écran, gestion des comptes.

**Vérifié en réel** (Worker + D1 locale migrée en 0029, navigateur) :
création sans mot de passe → encadré du lien (e-mail non parti en local) →
activation sur un navigateur vierge → connexion ; lien réutilisé refusé ;
« Mot de passe oublié » ; réinitialisation par l'admin ; séparation cochée
dans la Fiche client et conservée ; l'auteur (admin) ne peut pas approuver
son test (message dans la fenêtre), mauvais mot de passe refusé, le
consultant l'approuve (historique : création par l'admin, approbation par
le consultant) ; suppression d'un client avec données → 409 (« projets,
exigences, tests ») ; compteurs de tentatives présents dans
`tentatives_connexion` et blocage 429 ; Échap ferme la fenêtre de
signature (corrigé pendant cette vérification).
