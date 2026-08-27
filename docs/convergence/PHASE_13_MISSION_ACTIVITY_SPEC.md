# Phase 13 — Domaine Work : `Mission` / `Activity`

*26/08/2026 — première implémentation de code de la vision Mission/Context/Reasoning Engine, après la revue panel `PHASE_13_17_REVUE_PANEL_MOTEUR_RAISONNEMENT.md` (TD-007 à TD-009). Décision d'entrée : TD-009 — `Mission`/`Activity` seulement, `WorkflowDefinition`/`WorkflowInstance`/`Approval` différés sur besoin réel démontré.*

## 1. Périmètre exact retenu

Sources de vérité consultées avant conception : `04_RELATIONSHIP_MATRIX_FINAL.md` (Google Drive) donne les relations exactes du domaine "Work" :

```text
Mission  | relates_to  | QualityEvent | N:M | event
Mission  | contains    | Activity     | 1:N | mission
Activity | depends_on  | Activity     | N:M | mission
Activity | produces    | Evidence     | N:M | execution
```

et `01_ARCHITECTURE_MASTER_FINAL.md` §8 : une `Mission` est le conteneur qui regroupe des *workstreams* (ex. CQV/CSV) partageant Context/Sources/Evidence/Risk/Traceability sans être elle-même un moteur de raisonnement.

Le texte de `CONVERGENCE_PLAN.md` §Phase 13, rédigé avant cette conception détaillée, évoquait une Mission référençant directement Organization/Workspace/AssetNode/Requirement/Assessment/Test/Evidence/Deliverable. La conception ci-dessous **précise et resserre** ce périmètre (voir §3 — NEEDS ADAPTATION) : seule la relation la mieux étayée par la matrice et la moins spéculative est construite maintenant ; le reste est différé au même titre que Workflow/Approval, plutôt que fabriqué sans cas réel pour le calibrer.

## 2. Modèle retenu

- **`Mission`** — conteneur de travail contextualisé : `workspace_id` (site, même convention que `AssetNode`, `null` = hérité/non assigné), `asset_node_id` (ancre optionnelle, même pattern que `QualityEvent.asset_node_id`), `titre`, `description`, `statut` (`ouverte | en_cours | cloturee`), `audit_log`.
- **`Activity`** — unité de travail à l'intérieur d'une Mission (`mission_id` obligatoire, 1:N). `statut` (`a_faire | en_cours | terminee | bloquee`), `audit_log`.
- **`Dependency`** — relation N:M `Activity → Activity` (jointure explicite, même pattern que `Couverture`/`AssociationFonctionAssetNode` : jamais un tableau d'IDs dénormalisé).
- **`AssociationMissionQualityEvent`** — relation N:M `Mission ↔ QualityEvent` (même pattern que `ReferenceQualityEvent`).

Toutes ces entités suivent les conventions déjà établies : `id`/`client_id` (Organization), horodatage `created_at`/`updated_at`, `audit_log: EntreeJournalAudit[]` pour les entités à cycle de vie, jointures explicites pour toute relation N:M (jamais de tableau d'IDs dénormalisé, jamais de lien polymorphe générique).

## 3. Divergences identifiées (méthode Comprendre → Comparer → Identifier)

### NEEDS ADAPTATION — Requirement/Assessment/Test/Evidence/Deliverable référencés depuis `Mission`

`CONVERGENCE_PLAN.md` évoquait ces références directes. En réalité, la matrice de relations montre que ce rôle appartient à l'entité cible **`Strategy`** (`Strategy derives_from Assessment`, `Strategy addresses Requirement`, `Strategy plans Test`, contexte "mission") — pas à `Mission` elle-même. `Strategy` n'est pas construite (le module `strategie-qualification/grilleDecision.ts` existant est une fonction déterministe pure, jamais persistée comme entité). Construire ces références directement sur `Mission` maintenant reviendrait à fabriquer une partie du rôle de `Strategy` sans l'avoir conçue — reporté à un incrément qui construira réellement `Strategy`, sur besoin démontré (même discipline que TD-009 pour Workflow/Approval).

### CONFLICT — `Activity produces Evidence` vs le garde-fou Phase 7c

La matrice cible modélise `Activity produces Evidence` (N:M). Mais `Evidence` (Phase 7c, `PHASE_7C_EVIDENCE_SPEC.md`) porte un garde-fou non négociable déjà testé : *"une Evidence est toujours rattachée à une Execution réelle — jamais une preuve orpheline"* (`execution_id` non nul). Autoriser une Evidence produite directement par une Activity, sans Execution, contredirait ce garde-fou existant. Conformément à la règle "ne jamais modifier la vision métier parce que l'implémentation est difficile, ni casser un mécanisme existant sans raison" : ce point est **différé**, non résolu silencieusement — voir "Ce qui reste volontairement non construit" ci-dessous.

## 4. Ce qui reste volontairement non construit

- `WorkflowDefinition`/`WorkflowInstance`/`Approval` (TD-009, inchangé).
- Toute référence directe `Mission → Requirement/Assessment/Test/Evidence/Deliverable` (voir NEEDS ADAPTATION ci-dessus) — sera ajoutée de façon additive (champ nullable, comme `workspace_id` sur `AssetNode`) quand `Strategy` ou la Phase 17 (Mission workspace) en démontrera le besoin réel.
- `Activity produces Evidence` (voir CONFLICT ci-dessus) — sa résolution (ex. assouplir le garde-fou `Evidence.execution_id` pour accepter une Activity comme second producteur possible) est différée à un incrément qui la traitera explicitement, jamais en silence.
- Aucun écran : comme les Phases 5/8a/9/10 (QualityEvent/Source Intelligence/ContentPlan/Integration Gateway), ce lot est domaine + persistance + store, sans UI — la Phase 17 (Mission workspace) exposera ces objets visuellement.

## 5. Vérification

Tests unitaires du store (`useMissionStore.test.ts`) : création Mission, changement de statut, création Activity rattachée, dépendance Activity→Activity, association Mission↔QualityEvent. Suite complète (`npx vitest run`, `npm run typecheck`, `npm run lint`) verte avant commit.
