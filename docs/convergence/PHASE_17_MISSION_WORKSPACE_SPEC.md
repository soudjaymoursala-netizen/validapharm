# — Mission workspace

*26/08/2026 — dernière phase du plan -17, enrichie des clarifications à (`REVUE_PANEL_VISION_VALIDATION_ENGINEERING.md`).*

## 1. Ce qui existe déjà (Comprendre)

- `Mission`/`Activity`/`Dependency`/`AssociationMissionQualityEvent`: domaine + persistance + `useMissionStore` — **aucun écran**, aucune façon de créer une `Mission` aujourd'hui.
- `ContextSnapshot`/`ContextSnapshotItem`: `useContextEngineStore.assemblerSnapshot` — jamais invoqué depuis une UI.
- `AIRequest`/`AIResponse`/`CitationAIResponse`: `useReasoningEngineStore.executerRaisonnement` — jamais invoqué depuis une UI.
- `usePanneauChatStore.construireAdaptateurs`: le pattern déjà établi pour construire un `ProviderAdapter` (relais cloud + Ollama local) à partir de `useClientConfigStore`/`useConnexionRelaisIAStore` — à réutiliser ici, jamais réinventer un second mécanisme de construction d'adaptateur.
- `BarreLaterale.vue`: groupe "Mon site" avec liens directs vers les outils du client actif — `Missions` doit y être ajouté.

## 2. Comparer — portée réaliste du "Mission workspace" décrit dans le plan

`CONVERGENCE_PLAN.md` décrivait: *"écran d'une Mission ouverte (contexte, scope, assessment, risques, requirements, stratégie, tests, evidence, livrables, historique)"*. Vérification champ par champ: `Assessment`/`Requirement`/`Test`/`Evidence` existent déjà comme entités mais **aucune référence directe** `Mission → Assessment/Requirement/Test/Evidence` n'a été construite (§3, NEEDS ADAPTATION — ce rôle appartient à `Strategy`, non construite). `Risk` n'existe pas. Construire ces sections maintenant fabriquerait des liens qui n'existent nulle part dans le modèle de données réel.

**Périmètre retenu pour ce lot** — uniquement ce qui est réellement câblable avec l'existant: `Mission` (création, statut), `Activity` (création, statut, dépendances), association à des `QualityEvent` existants, assemblage d'un `ContextSnapshot` (ancré sur `Mission.workspace_id`/`asset_node_id`), et invocation du Reasoning Engine scopée à la Mission (historique des `AIRequest`/`AIResponse` affiché). Conformément à /, **aucun indicateur de "Validation State"** n'est construit ici — cette capacité vient après cette phase, sur `QualityEvent` (analyse d'impact de changement), pas comme un habillage du Mission workspace.

## 3. Identifier / Proposer — ce qui est construit

- `ListeMissions.vue` (`/clients/:clientId/missions`): liste des `Mission` du client, création (titre, description, ancre optionnelle `workspace_id`/`asset_node_id` choisie parmi les `Workspace`/`AssetNode` existants du client) — lien vers chaque Mission workspace.
- `MissionWorkspace.vue` (`/clients/:clientId/missions/:missionId`):
  - En-tête: titre, statut (`ouverte`/`en_cours`/`cloturee`), changement de statut.
  - Activités: liste, création, changement de statut, ajout de dépendance (source→cible parmi les activités de cette Mission) — *(garde-fou, déjà vérifié)* jamais un verrou bloquant.
  - Associations `QualityEvent`: liste des événements déjà associés, association d'un événement existant du client — jamais une étape obligatoire.
  - Contexte: bouton "Assembler le contexte" (ancré sur `workspace_id`/`asset_node_id` de la Mission), affichage du dernier `ContextSnapshot` assemblé et de ses éléments, groupés par type.
  - Raisonnement: champ objectif + bouton "Raisonner" (réutilise `construireAdaptateurs`-équivalent, mode `chat_normatif`), affiche la réponse avec **état de confiance visuellement distinct** (badge dédié, jamais les jetons `--vp-statut-*` de `qualification_status` — cohérent avec: ne jamais confondre les deux concepts, y compris visuellement), citations résolues en libellés lisibles, trace des appels d'outils (dépliable), et historique des invocations précédentes de cette Mission.
- `BarreLaterale.vue`: ajout du lien "Missions" dans le groupe "Mon site".
- Route ajoutées, aucune route existante modifiée.

**Explicitement non construit (limite assumée)**:
- Aucune section Assessment/Requirement/Test/Evidence/Deliverable directement rattachée à la Mission (voir §2 — appartient à `Strategy`, non construite).
- Aucun indicateur de "Validation State" (capacité différée, distincte de cette étape).
- Aucune suppression de `Mission`/`Activity` (non demandé, cohérent avec l'absence de fonction de suppression ailleurs dans le projet pour les entités à audit trail).

## 4. Vérification

Tests composants (`@vue/test-utils`): `ListeMissions.vue` (création, navigation), `MissionWorkspace.vue` (création d'Activity, dépendance, association QualityEvent, assemblage de contexte, invocation du raisonnement avec fournisseur simulé — état de confiance et citations affichés correctement). Suite complète (`npx vitest run`, `npm run typecheck`, `npm run lint`) verte avant commit. Vérification manuelle dans un navigateur réel (créer une Mission, une Activity, raisonner) avant de considérer la phase terminée.
