# CURRENT_ARCHITECTURE — État réel du repository (25/08/2026)

| | |
|---|---|
| **Statut** | 2ᵉ livrable de convergence (`14_MASTER_PROMPT_FOR_CLAUDE.md`), après `GAP.md`. |
| **Méthode** | Reconstruit à partir du code, de `domaine/types.ts`, de `db.ts` et des 282 tests réellement exécutés — pas des intentions de l'URS v25 ou de la spécification fonctionnelle v17 qui n'ont pas de code correspondant (celles-là sont dans `GAP.md`, colonne "Cible", pas ici). |

---

> **Note de suivi (25/08/2026, mise à jour au fil des phases):** instantané figé, non réécrit à chaque phase terminée pour conserver sa valeur de point de départ. Les mentions de "grille de criticité ACFC codée en dur" (ligne 30 et §"Technical Debt" ci-dessous) sont **obsolètes** (`a8f7f83`, remplacé par `MethodProfileACFC`); il n'existait alors aucun `Parameter`/`CPP`/`CQA`, **ajoutés depuis** (`c6391ca`). Voir `CONVERGENCE_PLAN.md` §"Suivi d'avancement" pour l'état courant réel.

## Current Domains

Le repository ne connaît aujourd'hui que 3 domaines métier réels (au sens: entité persistée + logique + écran):

1. **Documentation qualité par projet** (Project/Section/ProjectDocument) — le cœur historique de l'outil.
2. **Référentiel client** (Client/ClientConfig) — un client = une organisation, sans hiérarchie interne.
3. **Structure Système** (AssetHierarchySchema/AssetNode) — hiérarchie d'actifs configurable par client, la fondation la plus proche du modèle "Asset" de la Target Architecture.

Deux domaines transverses, pas des domaines métier au sens GxP:

4. **Synchronisation** (GitHub + Drive).
5. **Assistance IA** (chat expert + assistant de stratégie de qualification).

## Current Modules

| Module | Emplacement | Rôle réel |
|---|---|---|
| Machine à états de section | `logique-metier/machine-etats/` | Cycle de vie brouillon→approuvé, garde-fous U-01/U-02/U-03 |
| Moteur de gabarits déclaratif | `logique-metier/gabarits/` | Schéma JSON générique (sections/champs/colonnes), 11 gabarits concrets |
| Calcul IPR | `logique-metier/moteur-calcul/calculerIPR.ts` | S×O×D, seul calcul réglementaire déterministe du repo |
| Grille de criticité ACFC (provisoire) | `logique-metier/strategie-qualification/` | Grille de 9 critères codée en dur + moteur de décision fermé |
| Structure Système | `logique-metier/structure-systeme/` | Détection de cycle, unicité de code, hiérarchie configurable |
| Export/import | `logique-metier/export/` | JSON/Word(doc HTML)/CSV/PDF |
| Résolution de conflit | `logique-metier/resolution-conflit/` | Diff champ par champ entre deux versions d'une section |
| Routeur IA | `logique-metier/routeur-ia/` | Bascule cloud/local, qualification de fiabilité par client |
| Garde de compatibilité de schéma | `logique-metier/schema-compatibilite/` | Empêche un rollback de version de corrompre les données |

## Current Entities

`Project`, `Section`, `ProjectDocument`, `Client`, `ClientConfig`, `AssetHierarchySchema`, `AssetNode`, `AiChatSessionLog` — 8 entités, toutes définies dans `src/logique-metier/domaine/types.ts`. Aucune autre, quel que soit ce que l'URS §10 catalogue nomme par ailleurs (voir `GAP.md` pour l'écart complet).

## Current Database

Dexie.js (IndexedDB), schéma en version 5 (migrations v1→v5 vérifiées sans perte de données en navigateur réel — condition non négociable du cadrage). Tables: `projects`, `sections`, `projectDocuments`, `clients`, `clientConfigs`, `assetHierarchySchemas`, `assetNodes`, `aiChatSessionLogs`. Pas de base relationnelle serveur — tout est local au navigateur, synchronisé vers GitHub (source de vérité distante) via commits API.

## Current Relationships

- `Section.project_id → Project` (1:N)
- `Project.client_id → Client` (N:1, optionnel — gap trouvé et corrigé le 24/08: longtemps impossible de lier un projet à un client depuis l'UI)
- `ClientConfig.client_id → Client` (1:1)
- `AssetNode.parent_id → AssetNode` (arbre, cycle interdit par construction)
- `AssetNode.client_id → Client` (N:1, isolation stricte testée)
- Aucune relation N:M avec objet de contexte explicite (pas de `ManufacturingContext`, pas de `DataFlow`) — toutes les relations actuelles sont des clés étrangères simples 1:N ou N:1.

## Current APIs

Pas d'API HTTP serveur (architecture 100% navigateur, cf. cadrage §4 — contrainte du poste de travail professionnel). "API" au sens de contrats internes:
- `ProviderAdapter` (interface commune Relay Cloudflare Workers / Ollama local)
- `GitHubConnector` / `DriveConnector` (contrats `miroir`, erreurs typées)
- Aucun `Connector`/`SyncJob` générique — chaque connecteur a sa propre forme d'erreur.

## Current Workflows

Un seul workflow réel et générique: le cycle de vie d'une section (`transitionSection.ts`), brouillon → approuvé, avec garde-fous de finalisation (liens obligatoires vers Contexte procédé/Plan de métrologie/Plan de maintenance selon le type de section). Pas de moteur de workflow paramétrable, pas d'`Activity`/`Mission`.

## Current Integrations

GitHub (lecture/écriture groupée, résolution de conflit par SHA), Google Drive (miroir manuel, jamais automatique — testé et confirmé impossible à automatiser sur ce compte). Aucune intégration SAP/MES/LIMS/Veeva/TrackWise/SCADA (référencées dans l'URS famille N mais non codées — backlog #32).

## Current AI

`ProviderAdapter` + `RelayProviderAdapter` (Cloudflare Workers, masquage de clé) + `OllamaProviderAdapter` (local), bascule automatique (`envoyerAvecBascule.ts`), qualification de fiabilité par client avant activation (consentement explicite). Deux usages: chat expert normatif (§4.4) et assistant de stratégie de qualification (§4.6, moteur déterministe — l'IA n'y calcule rien, elle ne fait qu'assister le chat). Aucun mode "audit simulé" (backlog #28), aucune génération de brouillon par IA (backlog #29).

## Current Document Processing

Inexistant en ingestion. L'outil sait **exporter** (JSON/Word/CSV/PDF) mais ne sait **importer/comprendre** qu'un JSON qu'il a lui-même produit (transfert entre postes). Aucun parsing PDF/Word/Excel tiers, aucun OCR, aucune compréhension de schéma/diagramme.

## Current Deliverables

11 gabarits produisant un document exportable: `contexte_procede`, `urs`, `dq` (avec table IPR), `fat`, `sat`, `iq`, `oq`, `pq`, `validation_procede`, `plan_metrologie`, `plan_maintenance`. Rendu statique — pas de `ContentPlan`, pas de résolution Method/Template/Example, pas de version tracée avec provenance des sources.

## Current Test System

282 tests, 39 fichiers, tous verts (`npx vitest run`, vérifié le 25/08/2026). Vitest (unitaire) + Playwright (vérifications ponctuelles en navigateur réel pour les migrations Dexie et les bugs de `DataCloneError`, non intégrées en CI). Aucun test de scénario métier de bout en bout au sens de `11_USE_CASES_70_SCENARIOS.md` (les 70 scénarios de la cible n'ont pas d'équivalent testé aujourd'hui).

## Current Security

Aucune (mono-utilisateur assumé, cadrage §4/§5). Le jeton GitHub est stocké dans le navigateur (risque documenté). Pas de RBAC, pas d'authentification, pas de piste d'audit en base au-delà de l'historique Git et des `audit_log` par entité (Section, AssetNode).

## Current Deployment

PWA statique, aucune installation, `vite-plugin-pwa` référencé au cadrage mais **pas encore câblé** (backlog explicite). Hébergement cible GitHub Pages (confirmé accessible depuis le poste de travail professionnel de l'utilisateur, testé le 24/08/2026).

## Current Legacy

Un seul héritage réel: le "moteur de templates v1" mentionné au cadrage comme référence conceptuelle — **aucun code ni donnée n'en a été repris** (décision explicite du 22/08/2026, confirmée dans `00-cadrage-projet.md`). Il n'y a donc pas de vraie dette "legacy" à migrer au sens strict du terme; le seul héritage à gérer est l'écart entre le catalogue URS §10 (aspirations) et ce qui est réellement construit.

## Current Technical Debt

1. **ACFC codé en dur** (`grilleCriticite.ts`) — dette la plus documentée, déjà identifiée trois fois indépendamment (session de recherche normative, challenge de l'URS, Target Architecture elle-même).
2. **AMDEC non autonome** — le calcul IPR n'existe que comme sous-section du gabarit DQ, pas comme module de risque indépendant.
3. **Absence de `Function`/`Process`/`ManufacturingContext`** — Structure Système modélise les actifs mais pas ce qu'ils font ni dans quel contexte produit/procédé.
4. **Pas de test de non-régression multi-navigateur automatisé** — les vérifications Playwright critiques (migrations Dexie) restent manuelles.

## Current Known Limitations

- Mono-utilisateur, mono-langue de rédaction par document (i18n existe pour l'interface, pas pour le contenu métier multilingue simultané).
- Pas de recherche plein texte/sémantique sur les projets.
- Aucune capacité multimodale (image, schéma, scan).
- Le mode "brouillon d'aide" vs "approuvé dans l'outil" existe au niveau du statut de section, mais rien n'empêche techniquement un contenu non revu d'être exporté comme si il était approuvé au-delà du bandeau d'avertissement visuel (contrôle procédural, pas structurel).

---

## Addendum — État réel au 03/09/2026 (9 jours, 34 phases plus tard)

> Comme annoncé dans la note de suivi ci-dessus, ce document reste un instantané figé. Cet addendum ne le réécrit pas — il documente l'état réel vérifié le 03/09/2026 par 3 audits indépendants (domaine/données, services/workflows, IA/document intelligence), chacun ayant lu le code réel sans connaissance préalable de ce fichier, à la demande explicite de l'utilisateur ("j'ai l'impression que le mode assistant ne marche pas" a ouvert une session de fix, suivie d'un nouveau document de vision redemandant l'audit complet §1 du master package).

### Domains (mise à jour)

Le repository connaît maintenant **beaucoup plus que 3 domaines**: Governance/Scope (Organization/Workspace hiérarchique), Asset (System/Subsystem/Equipment/Component via `AssetNode` générique + relations typées), Process/Function/ManufacturingContext, Criticality/Assessment (4 moteurs: ACFC, Impact, CSV, Risk/AMDEC), Quality Events (6 sous-types), Test/Execution/Evidence (traçabilité complète testée), Source Intelligence (Source→Extraction→KnowledgeItem→Confirmation), Mission/Activity, Context/AI (Reasoning Engine à appel d'outils), Procedural Knowledge (structuration de SOP), Deliverable (Content Plan + readiness).

### Entities (mise à jour)

**89 interfaces** dans `domaine/types.ts` (contre 8), avec **28 versions** de schéma Dexie incrémentales — détail complet dans l'audit domaine du 03/09/2026 (voir `GAP.md` §4). L'ancienne ligne "Aucune autre" de ce document est obsolète depuis longtemps.

### Relationships (mise à jour)

Confirmé génuinement relationnel/graphe, pas de simples clés étrangères 1:N: arbres à détection de cycle (`AssetNode.parent_id`, `Workspace.parent_workspace_id`), graphe libre tolérant les cycles par conception (`associated_nodes[]`), relations typées dirigées (`RelationTechnique`), jointures N:M explicites avec contexte (`Couverture`, `ProvenanceLink`, `AssociationFonctionAssetNode`), objets de jointure polymorphes (`ContextSnapshotItem`), et un moteur de parcours de graphe générique (`parcourirGraphe.ts`) réutilisé sur 2 domaines indépendants. L'intégrité référentielle reste conventionnelle (`string` id, pas de contrainte Dexie), pas garantie par le moteur de base.

### AI (mise à jour)

AI Gateway confirmé solide: `ProviderAdapter` (2 implémentations réelles), routage à bascule, traçabilité de version de modèle avec détection de dérive silencieuse (`QualificationFiabiliteIA`). Nouveau depuis: **Reasoning Engine** à appel d'outils (4+ outils: Requirements/Tests/Evidence/KnowledgeItems/AssetNodes/Procedures) avec vérification déterministe de citation (`verifierConfiance`) et **mode audit simulé** (débat contradictoire multi-angles + personas régulateurs). Chat expert (`PanneauChat.vue`) reste un chatbot générique + pièce jointe manuelle d'une section — le Reasoning Engine grounded existe mais n'y est pas câblé (2 features distinctes).

### Document Processing (mise à jour)

Radicalement différent ("inexistant en ingestion"): parsing DOCX natif réel (texte/tableaux/images), parsing PDF natif réel (`pdfjs-dist`), OCR Azure Vision réel via relais Cloudflare Worker dédié. Toujours absent: Excel (bloqué, aucune librairie saine), et surtout **toute compréhension de diagramme/schéma/P&ID** (confirmé absent par l'audit du 03/09, choix assumé — CHALLENGE-001).

### Deliverables (mise à jour)

Le calcul de `readiness` existe maintenant réellement (`construireReadinessContentPlan`) et parcourt la vraie chaîne Requirement→Couverture→Test→Execution→Evidence, bloquant sur `QualityEvent` ouvert. Reste vrai: pas d'objet `DeliverableVersion` unifié référençant l'ensemble des versions utilisées (voir).

### Test System (mise à jour)

**762 tests** au 03/09/2026 (contre 282), tous verts. Toujours aucun test de scénario de bout en bout au sens des 70 scénarios du package (`11_USE_CASES_70_SCENARIOS.md`).

### Security (inchangé, confirmé délibéré)

Toujours aucune authentification/RBAC — confirmé par les 3 audits du 03/09 comme un choix délibéré et documenté, pas un oubli. Nouveau depuis: un verrou local par mot de passe protège l'archivage accidentel, explicitement documenté comme n'étant *pas* une authentification. Voir `ARCHITECTURE_CONFLICTS.md` pour la tension (non résolue, non bloquante) avec le narratif du 03/09/2026 qui redemande des comptes/rôles.

### Technical Debt (mise à jour)

Les 2 premiers points de la liste sont clos (`ACFC codé en dur` → `MethodProfileACFC`; `AMDEC non autonome` → module autonome). Nouvelles dettes identifiées par les audits du 03/09:
5. **Test Design Engine inexistant** — `useTestDefinitionStore.ts` est un CRUD manuel pur; aucune génération de candidat de test depuis Context+Risk+Requirement, aucune critique IA de couverture (pilier central de la cible, §28-30 du master prompt).
6. **`DataFlow` non modélisé comme entité** — seule une relation typée (`RelationTechnique`) approxime les flux de données entre systèmes digitaux.
7. **Deliverable Engine non unifié** — 3 mécanismes réels (readiness `ContentPlan`, machine à états `Section`, garde d'export) glués par convention plutôt qu'un objet `DeliverableVersion` unique.
8. **Memory/Learning non gouverné au niveau règle** — le journal `Confirmation` gouverne chaque fait individuellement, rien ne généralise une confirmation répétée en règle client réutilisable versionnée.

---

*Prochain livrable: `LEGACY_MAPPING.md` (classification KEEP/ADAPT/EXTEND/REFACTOR/MIGRATE/REPLACE/DEPRECATE/UNKNOWN de chaque élément listé ci-dessus). Mis à jour le 03/09/2026 avec les composants construits depuis — voir sa propre section "Composants construits depuis le 25/08/2026".*
