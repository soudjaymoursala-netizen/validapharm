# — Reasoning Engine (domaine AI)

*26/08/2026 — suite de l'étape précédente, décisions d'entrée déjà tranchées par la revue panel (`PHASE_13_17_REVUE_PANEL_MOTEUR_RAISONNEMENT.md`): (orchestration côté navigateur, relais reste un simple proxy sans état) et (états de confiance discrets, jamais un score numérique).*

## 1. Ce qui existe déjà (Comprendre)

- `ProviderAdapter.envoyerMessage(mode, contexte, question) → Reponse { texte, version_moteur, citations }` — un appel **à un seul tour**, sans notion d'outil ni d'historique de conversation. Le corps du relais serverless (Cloudflare Worker) **n'est pas dans ce dépôt** — seule son URL est configurée (`EnregistrementConnexionRelaisIA`). Conséquence directe et vérifiée: **impossible d'étendre le protocole du relais** pour un appel d'outils natif (function calling côté fournisseur) sans toucher un système hors de ce dépôt — ce qui confirme et renforce plutôt que de le remettre en cause.
- `envoyerAvecBascule` (routeur IA, Phase Chat expert): bascule cloud→local sur `TimeoutError`/`IndisponibleError`, réutilisable tel quel par le moteur de raisonnement (aucune modification).
- `ContextSnapshot`/`ContextSnapshotItem`: assemblage de contexte réutilisable par une `Mission`.
- `Mission`/`Activity`.
- Entités déjà persistées et réellement exploitables comme "outils" de lecture: `Requirement` (`asset_node_id`), `Couverture` (`Requirement↔Test`), `Test`, `Execution` (`test_id`), `Evidence` (`execution_id`), `KnowledgeItem` (`statut`). **`Risk`/`Hazard`/`Control`** (domaine Quality cible) ne sont **pas construits** — absents des outils de ce lot (voir §3).

## 2. Comparer — la contrainte technique décisive

Le plan initial (`CONVERGENCE_PLAN.md`) prévoyait une "boucle d'orchestration lisant les stores existants... comme des outils". Un appel d'outils fiable suppose normalement un support natif côté fournisseur (function calling Claude/OpenAI). Or:

- Le relais est un **simple proxy texte** (`{texte, version_moteur, citations}`), son code serveur n'est pas modifiable ici (l'a déjà acté).
- Construire un nouveau canal d'appel d'outils natif reviendrait soit à modifier un système hors dépôt, soit à fabriquer un nouveau backend — **interdit par /**.

**Décision de conception (dans le périmètre déjà tranché précédemment, pas une nouvelle décision de panel)**: le protocole d'appel d'outils est **entièrement textuel, défini et interprété côté navigateur** — le modèle est instruit (dans le texte de la question) de répondre soit par un appel d'outil (`APPEL_OUTIL: {...}`), soit par une réponse finale structurée (`REPONSE_FINALE: {...}`); l'orchestrateur reconstruit la conversation en concaténant le transcript à chaque tour (le relais reste sans état). Si le modèle ne respecte pas le format (réponse libre), **dégradation gracieuse**: le texte brut devient la réponse finale, état de confiance forcé à `a_verifier`, jamais un crash ni une réponse fabriquée (cohérent avec la dégradation A3 déjà actée précédemment).

## 3. Identifier / Proposer — périmètre retenu

**Construit dans ce lot**:
- Domaine AI (`03_DOMAIN_DATA_MODEL.md`): `AIConfiguration` (versionnée — condition E4 du panel), `AIRequest` (objectif, `mission_id`/`context_snapshot_id` optionnels, `ai_configuration_id`), `AIResponse` (`texte`, `etat_confiance: EtatConfianceIA`, `trace_appels_outils` embarquée — condition E1 du panel: traçabilité des appels d'outils, `version_moteur`), `CitationAIResponse` (jointure polymorphe vers `requirement`/`test`/`evidence`/`knowledge_item`, même pattern que `ContextSnapshotItem`). **`AIModelVersion`/`AIEvaluation`** (entités cible séparées) non construites ici: `AIResponse.version_moteur` (simple champ nullable, déjà ce que `Reponse.version_moteur` fournit) suffit à ce stade — les construire en entités versionnées séparées sans consommateur réel serait prématuré.
- 4 outils de lecture (fonctions pures, `logique-metier/raisonnement/outilsRaisonnement.ts`): `lister_requirements_pour_actif`, `lister_tests_pour_requirement` (via `Couverture`), `lister_evidence_pour_test` (via `Execution`), `lister_knowledge_items_valides`. **`Risk`** explicitement exclu: n'existe pas encore comme entité construite.
- Protocole textuel d'appel d'outils + parseur robuste (`logique-metier/raisonnement/protocoleRaisonnement.ts`), dégradation gracieuse si non respecté.
- Boucle d'orchestration (`logique-metier/raisonnement/boucleRaisonnement.ts`): plafond d'itérations strict (défaut 6 — même discipline que le "hard budget cap" documenté pour les boucles agentiques dans *Software Engineering: Standing on the Shoulders of Giants*, ch. 13.7.3, lu pour inspiration sur ce chantier) pour ne jamais tourner indéfiniment.
- **Vérification de citation déterministe (non négociable, ajout par rapport au plan initial, justifié §4)**: une réponse taguée `connu` DONT une citation ne correspond à aucun objet réellement obtenu par un appel d'outil pendant la session, ou dont la liste de citations est vide, est automatiquement rétrogradée à `a_verifier` — jamais l'IA seule ne décide qu'elle "sait".
- **Garde-fou non négociable (repris du plan)**: aucune fonction de ce lot n'écrit le contenu d'une `AIResponse` dans `Requirement`/`Test`/`KnowledgeItem` — vérifié par test de régression dédié (même principe que `Confirmation`).
- `useReasoningEngineStore`: charge les données nécessaires, exécute la boucle, persiste `AIRequest`/`AIResponse`/`CitationAIResponse` — immuables une fois créés (aucune fonction de mise à jour).

**Explicitement non construit ici**:
- Aucun écran, comme pour les domaines déjà construits sans UI — Mission workspace exposera le raisonnement visuellement.
- Aucune généralisation au-delà du scénario réel unique retenu pour la vérification (§5) — changement de recette impactant des `Requirement`/`Test` liés à un `AssetNode`.
- Le support natif d'appel d'outils par fournisseur (function calling) — hors de portée sans modifier un système hors dépôt (§2).

## 4. Justification de la vérification de citation déterministe

Cette garde n'était pas explicitement actée par le panel, mais découle directement des principes déjà établis: le principe fondateur n°1 (`00-cadrage-projet.md`, "l'IA générative n'est jamais seule source de vérité") et l'invariant #8 de `03_DOMAIN_DATA_MODEL.md` ("AI output is not canonical by confidence alone"). Sans cette vérification, `etat_confiance: 'connu'` ne serait qu'une auto-déclaration du modèle — fixe la taxonomie mais ne dit pas qui la vérifie; cette lecture s'inspire aussi du principe générateur/évaluateur documenté dans *Software Engineering: Standing on the Shoulders of Giants* (ch. 13.7.2, inspiré des GAN et de l'ingénierie Anthropic): un vérificateur distinct du générateur, ici **déterministe** (pas une seconde IA) — le plus simple mécanisme qui referme la boucle sans fabriquer de nouvelle dépendance.

## 5. Scénario réel de vérification

Changement de recette: un `AssetNode` (ex. granulateur) porte des `Requirement` existants, eux-mêmes couverts par des `Test` exécutés produisant de l'`Evidence`. Le moteur, interrogé sur l'impact d'un changement, appelle `lister_requirements_pour_actif` puis `lister_tests_pour_requirement`/`lister_evidence_pour_test`, cite les objets réellement trouvés, et ne peut jamais écrire directement dans `Requirement`/`Test`. Testé de bout en bout avec un fournisseur IA simulé (déterministe, scénarisé) — aucun appel réseau réel dans les tests, cohérent avec la discipline offline-first déjà du projet.

## 6. Vérification

Tests: parseur (formats valides/invalides/dégradation gracieuse), outils de lecture (jointures correctes, isolation par client), boucle d'orchestration (appel d'outil → réponse finale, plafond d'itérations, rétrogradation de confiance sur citation non vérifiée ou absente), store (persistance, immutabilité, isolation par client, absence de toute fonction d'écriture directe dans Requirement/Test/KnowledgeItem). Suite complète (`npx vitest run`, `npm run typecheck`, `npm run lint`) verte avant commit.
