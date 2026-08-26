# CURRENT_ARCHITECTURE — État réel du repository (25/08/2026)

| | |
|---|---|
| **Statut** | 2ᵉ livrable de la Phase 0 de convergence (`14_MASTER_PROMPT_FOR_CLAUDE.md`), après `GAP.md`. |
| **Méthode** | Reconstruit à partir du code, de `domaine/types.ts`, de `db.ts` et des 282 tests réellement exécutés — pas des intentions de l'URS v25/FS v17 qui n'ont pas de code correspondant (celles-là sont dans `GAP.md`, colonne "Cible", pas ici). |

---

> **Note de suivi (25/08/2026, mise à jour au fil des phases) :** instantané figé de la Phase 0, non réécrit à chaque phase terminée pour conserver sa valeur de point de départ. Les mentions de "grille de criticité ACFC codée en dur" (ligne 30 et §"Technical Debt" ci-dessous) sont **obsolètes depuis la Phase 1** (`a8f7f83`, remplacé par `MethodProfileACFC`) ; il n'existait alors aucun `Parameter`/`CPP`/`CQA`, **ajoutés depuis en Phase 2** (`c6391ca`). Voir `CONVERGENCE_PLAN.md` §"Suivi d'avancement" pour l'état courant réel.

## Current Domains

Le repository ne connaît aujourd'hui que 3 domaines métier réels (au sens : entité persistée + logique + écran) :

1. **Documentation qualité par projet** (Project/Section/ProjectDocument) — le cœur historique de l'outil.
2. **Référentiel client** (Client/ClientConfig) — un client = une organisation, sans hiérarchie interne.
3. **Structure Système** (AssetHierarchySchema/AssetNode) — hiérarchie d'actifs configurable par client, la fondation la plus proche du modèle "Asset" de la Target Architecture.

Deux domaines transverses, pas des domaines métier au sens GxP :

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
| Export/import | `logique-metier/export/` | JSON/Word(.doc HTML)/CSV/PDF |
| Résolution de conflit | `logique-metier/resolution-conflit/` | Diff champ par champ entre deux versions d'une section |
| Routeur IA | `logique-metier/routeur-ia/` | Bascule cloud/local, qualification de fiabilité par client |
| Garde de compatibilité de schéma | `logique-metier/schema-compatibilite/` | Empêche un rollback de version de corrompre les données |

## Current Entities

`Project`, `Section`, `ProjectDocument`, `Client`, `ClientConfig`, `AssetHierarchySchema`, `AssetNode`, `AiChatSessionLog` — 8 entités, toutes définies dans `src/logique-metier/domaine/types.ts`. Aucune autre, quel que soit ce que l'URS §10 catalogue nomme par ailleurs (voir `GAP.md` pour l'écart complet).

## Current Database

Dexie.js (IndexedDB), schéma en version 5 (migrations v1→v5 vérifiées sans perte de données en navigateur réel — condition non négociable du cadrage). Tables : `projects`, `sections`, `projectDocuments`, `clients`, `clientConfigs`, `assetHierarchySchemas`, `assetNodes`, `aiChatSessionLogs`. Pas de base relationnelle serveur — tout est local au navigateur, synchronisé vers GitHub (source de vérité distante) via commits API.

## Current Relationships

- `Section.project_id → Project` (1:N)
- `Project.client_id → Client` (N:1, optionnel — gap trouvé et corrigé le 24/08 : longtemps impossible de lier un projet à un client depuis l'UI)
- `ClientConfig.client_id → Client` (1:1)
- `AssetNode.parent_id → AssetNode` (arbre, cycle interdit par construction)
- `AssetNode.client_id → Client` (N:1, isolation stricte testée)
- Aucune relation N:M avec objet de contexte explicite (pas de `ManufacturingContext`, pas de `DataFlow`) — toutes les relations actuelles sont des clés étrangères simples 1:N ou N:1.

## Current APIs

Pas d'API HTTP serveur (architecture 100% navigateur, cf. cadrage §4 — contrainte du poste de travail professionnel). "API" au sens de contrats internes :
- `ProviderAdapter` (interface commune Relay Cloudflare Workers / Ollama local)
- `GitHubConnector` / `DriveConnector` (contrats `miroir()`, erreurs typées)
- Aucun `Connector`/`SyncJob` générique — chaque connecteur a sa propre forme d'erreur.

## Current Workflows

Un seul workflow réel et générique : le cycle de vie d'une section (`transitionSection.ts`), brouillon → approuvé, avec garde-fous de finalisation (liens obligatoires vers Contexte procédé/Plan de métrologie/Plan de maintenance selon le type de section). Pas de moteur de workflow paramétrable, pas d'`Activity`/`Mission`.

## Current Integrations

GitHub (lecture/écriture groupée, résolution de conflit par SHA), Google Drive (miroir manuel, jamais automatique — testé et confirmé impossible à automatiser sur ce compte). Aucune intégration SAP/MES/LIMS/Veeva/TrackWise/SCADA (référencées dans l'URS famille N mais non codées — backlog #32).

## Current AI

`ProviderAdapter` + `RelayProviderAdapter` (Cloudflare Workers, masquage de clé) + `OllamaProviderAdapter` (local), bascule automatique (`envoyerAvecBascule.ts`), qualification de fiabilité par client avant activation (consentement explicite). Deux usages : chat expert normatif (§4.4) et assistant de stratégie de qualification (§4.6, moteur déterministe — l'IA n'y calcule rien, elle ne fait qu'assister le chat). Aucun mode "audit simulé" (backlog #28), aucune génération de brouillon par IA (backlog #29).

## Current Document Processing

Inexistant en ingestion. L'outil sait **exporter** (JSON/Word/CSV/PDF) mais ne sait **importer/comprendre** qu'un JSON qu'il a lui-même produit (transfert entre postes). Aucun parsing PDF/Word/Excel tiers, aucun OCR, aucune compréhension de schéma/diagramme.

## Current Deliverables

11 gabarits produisant un document exportable : `contexte_procede`, `urs`, `dq` (avec table IPR), `fat`, `sat`, `iq`, `oq`, `pq`, `validation_procede`, `plan_metrologie`, `plan_maintenance`. Rendu statique — pas de `ContentPlan`, pas de résolution Method/Template/Example, pas de version tracée avec provenance des sources.

## Current Test System

282 tests, 39 fichiers, tous verts (`npx vitest run`, vérifié le 25/08/2026). Vitest (unitaire) + Playwright (vérifications ponctuelles en navigateur réel pour les migrations Dexie et les bugs de `DataCloneError`, non intégrées en CI). Aucun test de scénario métier de bout en bout au sens de `11_USE_CASES_70_SCENARIOS.md` (les 70 scénarios de la cible n'ont pas d'équivalent testé aujourd'hui).

## Current Security

Aucune (mono-utilisateur assumé Phase 1, cadrage §4/§5). Le jeton GitHub est stocké dans le navigateur (risque documenté AR-R-61). Pas de RBAC, pas d'authentification, pas de piste d'audit en base au-delà de l'historique Git et des `audit_log` par entité (Section, AssetNode).

## Current Deployment

PWA statique, aucune installation, `vite-plugin-pwa` référencé au cadrage mais **pas encore câblé** (backlog explicite). Hébergement cible GitHub Pages (confirmé accessible depuis le poste de travail professionnel de l'utilisateur, testé le 24/08/2026).

## Current Legacy

Un seul héritage réel : le "moteur de templates v1" mentionné au cadrage comme référence conceptuelle — **aucun code ni donnée n'en a été repris** (décision explicite du 22/08/2026, confirmée dans `00-cadrage-projet.md`). Il n'y a donc pas de vraie dette "legacy" à migrer au sens strict du terme ; le seul héritage à gérer est l'écart entre le catalogue URS §10 (aspirations) et ce qui est réellement construit.

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

*Prochain livrable : `LEGACY_MAPPING.md` (classification KEEP/ADAPT/EXTEND/REFACTOR/MIGRATE/REPLACE/DEPRECATE/UNKNOWN de chaque élément listé ci-dessus).*
