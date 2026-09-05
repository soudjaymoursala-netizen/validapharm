# Context Engine généralisé (`ContextSnapshot`)

*26/08/2026 — suite du lot précédent, plan révisé issu de la clarification de vision produit (`docs/convergence/PHASE_13_17_REVUE_PANEL_MOTEUR_RAISONNEMENT.md`).*

## 1. Ce qui existe déjà (Comprendre)

- `resoudreRegleEffective<T>` (`logique-metier/organisation/resolutionEffective.ts`): déjà générique — résout n'importe quelle règle `T` par remontée d'arbre `Workspace`. Exposé via `useOrganizationStore.resoudreRegle`, mais **non consommé par aucune fonctionnalité réelle** à ce jour (seulement son propre test).
- `ancetresWorkspace`: remontée pure de l'arbre `Workspace`.
- `noeudsVisiblesDepuisWorkspace` (câblage étape 1): jusqu'ici une fonction **interne à `useStructureSystemeStore`**, pas réutilisable ailleurs — c'est le "câblé sur un seul store" que `CONVERGENCE_PLAN.md` identifie.
- `ContentPlan.context_snapshot`: un simple **`string`** figé à la création — une simplification assumée à l'époque ("ne couvre que la première moitié du pipeline"), jamais une entité structurée.
- Sources de vérité cible (`03_DOMAIN_DATA_MODEL.md`, domaine "Context": `ContextView, ContextSnapshot, Applicability, Effectivity, Override`; `02_DECISION_LEDGER_FROM_CONVERSATION.md`: *"Context = faits du cas"* → `ContextSnapshot`; invariants #4 "Effective configuration is deterministic and traceable" et #12 "ContextSnapshot is immutable"; `04_RELATIONSHIP_MATRIX_FINAL.md`: `ContextSnapshot includes Versioned Objects N:M`).

## 2. Comparer — ce qui est réellement résoluble aujourd'hui

`CONVERGENCE_PLAN.md` énonçait: *"assemble automatiquement site/process/méthode applicable/documents/historique pertinents pour un objet donné."* Vérification champ par champ avant de construire:

| Élément visé | Résoluble aujourd'hui ? | Pourquoi |
|---|---|---|
| Site (`Workspace`) effectif | **Oui** | `ancetresWorkspace` déjà construit et testé. |
| `AssetNode` pertinents | **Oui** | `noeudsVisiblesDepuisWorkspace` déjà construit (à généraliser, voir §3). |
| `ManufacturingContext` pertinents | **Oui** | `ManufacturingContext.asset_node_id` existe déjà. |
| Historique (`QualityEvent`) pertinent | **Oui** | `QualityEvent.asset_node_id` existe déjà. |
| "Méthode applicable" (`MethodProfileACFC`/`MethodProfileImpactAssessment`) | **Non** | Ces entités n'ont **aucun rattachement** `Workspace`/`AssetNode` à ce jour (seulement `client_id`) — aucune résolution Scope+Applicability+Effectivity n'existe pour elles. Les y ajouter maintenant, sans cas réel démontrant le besoin, fabriquerait un mécanisme non éprouvé. |
| "Documents pertinents" (`Source`/`SourceVersion`) | **Non** | `Source` n'a **aucun rattachement** `AssetNode`/`Workspace` à ce jour (seulement `client_id`/`type`/`titre`). Même raisonnement. |

## 3. Identifier / Proposer — périmètre retenu

**Construit dans ce lot**:
- `ContextSnapshot` — enregistrement immuable (`id`, `client_id`, `workspace_id` nullable, `asset_node_id` nullable, `created_at`) — jamais de fonction de mise à jour exposée (invariant #12), même traitement que `ContentPlan.context_snapshot` mais désormais une vraie entité structurée plutôt qu'un `string`.
- `ContextSnapshotItem` — jointure explicite et **polymorphe** (`type_objet: 'asset_node' | 'manufacturing_context' | 'quality_event'`, `objet_id`) réalisant "`ContextSnapshot` includes Versioned Objects N:M" — un seul type de jointure générique plutôt qu'une jointure dédiée par type cible, cohérent avec l'invariant #5 ("N:M relationships needing context/provenance are explicit objects") et le pattern déjà utilisé pour `ExternalReference` (pointeur générique).
- **Refactor sans régression**: `noeudsVisiblesDepuisWorkspace` extrait de `useStructureSystemeStore` vers une fonction pure `logique-metier/organisation/noeudsVisiblesDepuisWorkspace.ts` (même traitement que l'extraction d'`ancetresWorkspace`) — le store délègue désormais à cette fonction, signature et comportement inchangés, tests existants inchangés.
- `assemblerElementsContextSnapshot` (fonction pure, `logique-metier/contexte/assemblageContextSnapshot.ts`): étant donné une ancre (`workspaceId` et/ou `assetNodeId`) et les données déjà chargées (`AssetNode[]`, `ManufacturingContext[]`, `QualityEvent[]`), retourne la liste des éléments pertinents. Si `assetNodeId` est fourni, résolution exacte sur ce nœud (pas ses descendants); sinon résolution par visibilité `Workspace` (site).
- `useContextEngineStore`: persiste le résultat de l'assemblage en un `ContextSnapshot` + ses `ContextSnapshotItem`, immuable une fois créé.

**Explicitement non construit ici** (voir tableau §2, différé sur besoin réel démontré — même discipline que Strategy/Evidence):
- Résolution de "méthode applicable" par site (nécessiterait d'étendre `MethodProfileACFC`/`MethodProfileImpactAssessment` avec un rattachement `Workspace` — non fait).
- Résolution de "documents pertinents" (nécessiterait d'étendre `Source`/`SourceVersion` avec un rattachement `AssetNode` — non fait).
- Aucun écran, comme pour les domaines déjà construits sans UI: ce lot est domaine + persistance + store, sans UI — Reasoning Engine et Mission workspace consommeront `ContextSnapshot`.
- `ContentPlan.context_snapshot` (`string`) n'est **pas migré** vers le nouveau `ContextSnapshot` structuré dans ce lot — un changement de type sur une entité déjà en production dans ce projet serait une extension de périmètre non demandée; à faire quand un consommateur réel du nouveau format existera.

## 4. Vérification

Tests: refactor `noeudsVisiblesDepuisWorkspace` (tests existants `structureSysteme.test.ts` restent verts sans modification) + nouveau test dédié de la fonction pure extraite + tests de `assemblerElementsContextSnapshot` (site seul, ancre précise, aucune règle de méthode/document fabriquée) + tests `useContextEngineStore` (création, immutabilité — aucune fonction de mise à jour n'existe). Suite complète (`npx vitest run`, `npm run typecheck`, `npm run lint`) verte avant commit.
