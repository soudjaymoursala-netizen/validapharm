# CONVERGENCE_PLAN — Ordre de mise en œuvre

| | |
|---|---|
| **Statut** | 7ᵉ et dernier livrable de la Phase 0 (`14_MASTER_PROMPT_FOR_CLAUDE.md`). Synthétise `GAP.md`, `CURRENT_ARCHITECTURE.md`, `LEGACY_MAPPING.md`, `ARCHITECTURE_CONFLICTS.md`, `ARCHITECTURE_CHALLENGES.md`, `TECHNICAL_DECISIONS.md`. À partir d'ici, l'implémentation progressive (étape 9 de la séquence obligatoire) peut commencer, phase par phase. |
| **Écart à l'ordre par défaut du package** | L'ordre suggéré par le master prompt (§56 : *Domain Model → Data Model → Relationships → Context → Sources → Methods/Rules → Assessment → Workflow → Test → Execution → Evidence → Deliverables → AI → Integrations → UI*) est **réordonné ci-dessous**, comme le package l'autorise explicitement (*"cet ordre peut être modifié si l'audit démontre qu'une autre séquence est techniquement plus sûre"*). Raison du réordonnancement : les livrables de Phase 0 ont fait émerger un chantier isolé, sans dépendance, déjà identifié par 3 sources convergentes (TD-002) — il n'y a aucune raison technique de le faire attendre derrière Domain/Data Model globaux qui, eux, touchent tout le repository. |

---

## Phase 0bis — Corrections documentaires (prérequis, avant tout code) — **TERMINÉE (25/08/2026)**
- **Objective** : aligner l'URS sur les faits déjà établis, sans toucher au code.
- **Current State** : URS v25 contient une fusion ACFC/CSA erronée et un modèle d'impact à 3 niveaux (CONFLICT-002), et référence un gabarit CSV inexistant (CONFLICT-003).
- **Target State** : URS corrigée — 3 briques distinctes (Impact Assessment, Computer System Assessment, Risk Analysis), modèle binaire, référence au gabarit CSV retirée jusqu'à sa construction réelle.
- **Dependencies** : aucune.
- **Migration** : édition de `01-URS-outil.md`, nouvelle version (v26).
- **Risk** : Faible.
- **Tests** : aucun (documentaire).
- **Rollback** : trivial (git revert).
- **Acceptance Criteria** : les 3 lignes identifiées dans CONFLICT-002/003 ne contredisent plus le package Target ni les sources normatives réelles déjà étudiées.

---

## Phase 1 — Method/Template/Example générique + remplacement ACFC (TD-002) — **TERMINÉE (25/08/2026, commit `a8f7f83`)**
- **Objective** : remplacer `grilleCriticite.ts`/`grilleDecision.ts` par un vrai `MethodProfile` configurable (questions mot pour mot, version, source, règle de décision), sans attendre le reste du modèle de domaine.
- **Current State** : grille de 9 critères codée en dur, moteur de décision fermé (§4.6).
- **Target State** : `MethodProfile` par client (Origin CLIENT_PROCEDURE/USER_DEFINED/VALIDAPHARM_DEFAULT), questions en données, règle de décision configurable, dimensions de criticité indépendantes (Quality ≠ HSE ≠ Data Integrity...).
- **Dependencies** : aucune — module isolé, confirmé dans `LEGACY_MAPPING.md`.
- **Migration** : nouvelle entité `MethodProfile`/`DecisionRule`/`Question` ; `AssistantStrategieQualification.vue` consomme le profil au lieu de la grille en dur ; 11 tests existants réécrits pour couvrir N configurations (6/7/9/N questions, scénarios obligatoires `11_USE_CASES_70_SCENARIOS.md`).
- **Risk** : Faible.
- **Tests** : couverture des scénarios "6/7/9/N questions", "Quality critical/HSE non-critical" et inverse, "réponse Unknown" (tous listés explicitement dans les scénarios obligatoires de la cible).
- **Rollback** : garder l'ancien module en parallèle jusqu'à validation, puis suppression.
- **Acceptance Criteria** : un client peut définir ses propres questions ACFC sans toucher au code ; la règle "au moins un Oui → critique" est elle-même configurable par méthode, pas universelle.

---

## Phase 2 — Parameter / CriticalParameter / CPP / CQA distincts — **TERMINÉE (25/08/2026, commit `c6391ca`)**
- **Objective** : poser le modèle de paramètres avant de construire l'Assessment générique (Phase 3), pour ne pas répéter l'erreur "criticité = CPP automatique" que la cible interdit explicitement (§22).
- **Current State** : triplet S/O/D dans le gabarit DQ uniquement.
- **Target State** : `Parameter`, `ImportantParameter`, `CriticalParameter`, `CPP`, `CQA` comme types distincts, jamais de promotion automatique.
- **Dependencies** : Phase 1 (le `MethodProfile` doit déjà exister pour que la future Assessment s'appuie dessus).
- **Migration** : extension de `domaine/types.ts`, le gabarit DQ consomme les nouveaux types au lieu du triplet actuel.
- **Risk** : Moyen — le gabarit DQ est déjà utilisé, ne pas casser son rendu existant.
- **Tests** : scénario obligatoire "Critical Parameter sans CPP", "CQA/CPP context change".
- **Rollback** : le triplet S/O/D actuel reste fonctionnel jusqu'à bascule complète.
- **Acceptance Criteria** : un paramètre peut être marqué critique sans devenir un CPP automatiquement.

---

## Phase 3 — Moteur d'Assessment générique (CriticalityAssessment/ImpactAssessment/CSVAssessment/GxPAssessment) — **TERMINÉE PARTIELLEMENT (25/08/2026)**
- **Objective** : remplacer l'assistant fermé §4.6 par un moteur d'assessment générique, dont la stratégie de qualification devient un type parmi d'autres.
- **Current State** : un seul assistant, sortie fermée.
- **Target State** : 4 types d'assessment distincts partageant un moteur commun, rattachables à un nœud réel de Structure Système.
- **Dependencies** : Phase 1 (MethodProfile), Phase 2 (Parameter/CPP), Phase 0bis (URS corrigée).
- **Migration** : nouvelle entité `Assessment` générique + 4 sous-types.
- **Risk** : Moyen.
- **Tests** : scénarios obligatoires "Criticality" au complet (§11_USE_CASES).
- **Rollback** : l'assistant §4.6 actuel reste en service jusqu'à bascule.
- **Acceptance Criteria** : les 3 briques d'Impact Assessment/CSV Assessment/Risk Analysis (Phase 0bis) sont réellement 3 modules distincts dans le code, pas seulement dans la documentation. **Atteint** pour ces 3 briques (F1/F2/F3). `GxPAssessment` (4ᵉ type nommé dans `03_DOMAIN_DATA_MODEL.md` du package Target) reste **non implémenté** : aucune source lue ne détaille son périmètre au-delà de ce que `CSVAssessment` couvre déjà (pertinence GxP/ERES) — le construire aurait exigé de fabriquer un contenu non sourcé. Rouvrir ce point si une source réelle en précise le contenu.

---

## Phase 4 — Extension de Structure Système : `Function` + `Process`/`ManufacturingContext` — **TERMINÉE (25/08/2026)**
- **Objective** : donner un sens fonctionnel et contextuel aux nœuds d'actifs déjà modélisés.
- **Current State** : `AssetNode` sans notion de fonction ni de contexte produit/procédé.
- **Target State** : `Function` comme entité séparée (relation N:M avec Equipment/DigitalSystem/Process), `ManufacturingContext` explicite.
- **Dependencies** : aucune dépendance dure sur les phases précédentes, mais logiquement postérieure car les Assessments (Phase 3) sont plus utiles une fois rattachés à un vrai contexte.
- **Migration** : EXTEND pur, `AssetNode` et sa hiérarchie ne sont pas touchés (déjà solides, `LEGACY_MAPPING.md`).
- **Risk** : Faible.
- **Tests** : scénarios obligatoires "Equipment multi-process", "SCADA multi-process", "multi-produit/recette/format".
- **Rollback** : trivial (ajout pur).
- **Acceptance Criteria** : un même équipement numérique peut être rattaché à 2 contextes produit/procédé différents sans qu'une relation soit faussement déduite comme universelle.

---

## Phase 5 — Quality Events (Change Control, CAPA, Deviation, Investigation, Audit Finding, Periodic Review) — **TERMINÉE (25/08/2026, précédée d'une revue panel E1-E7 explicite : `PHASE_5_QUALITY_EVENTS_SPEC.md`)**
- **Objective** : combler la famille H de l'URS, aujourd'hui entièrement vide.
- **Current State** : rien.
- **Target State** : `QualityEvent` + 6 sous-types, non-bloquant par défaut (INTERNAL/EXTERNAL/MIXED).
- **Dependencies** : aucune dépendance dure — peut être avancée ou reculée dans le calendrier sans casser le reste.
- **Migration** : nouveau module, additif.
- **Risk** : Faible.
- **Tests** : scénarios "external deviation/change ne bloque pas une activité indépendante".
- **Rollback** : trivial.
- **Acceptance Criteria** : un Change Control externe référencé par `ExternalReference` ne bloque jamais une activité qui n'en dépend pas réellement.

---

## Phase 6 — Extension serverless (Cloudflare Workers) pour OCR/recherche — **CODE TERMINÉ (25/08/2026) ; déploiement réel à faire par l'utilisateur**
- **Objective** : préparer la brique technique dont les Phases 7-8 ont besoin, sans backend serveur complet.
- **Current State** : 100% navigateur ; un relais Cloudflare Workers déjà en production pour l'IA (URS-NF-044ter).
- **Target State** (décidé le 25/08/2026, `TECHNICAL_DECISIONS.md` TD-001) : un second Worker sans état pour l'OCR/Document Intelligence (relais vers une API cloud de vision, même pattern que le relais IA) ; recherche calculée côté navigateur (IndexedDB), puis JSON versionnés dans Git si le volume l'exige un jour ; dépôt Git comme seul stockage des sources ; Cloudflare Queues pour le traitement asynchrone léger. Pas de base relationnelle serveur, pas d'object storage dédié.
- **Dependencies** : aucune — réutilise l'infrastructure Cloudflare/GitHub déjà en place et déjà testée réseau (AR-R-64, clos).
- **Migration** : ajout d'un nouveau Worker sans état, à côté du relais IA existant ; aucune migration de données requise.
- **Risk** : Faible — pattern déjà éprouvé dans ce même projet.
- **Tests** : joignabilité réseau du nouveau Worker (même méthode qu'AR-R-64), tests unitaires du contrat du Worker.
- **Rollback** : trivial (suppression du Worker, aucune donnée n'y est stockée).
- **Acceptance Criteria** : un document envoyé au Worker OCR revient structuré, sans qu'aucune donnée métier ne soit conservée côté Worker au-delà de la requête (cohérent avec le relais IA existant, sans état). **Code livré et testé** (`workers/ocr-relay/`, 25/08/2026) ; **déploiement réel et vérification en conditions réelles restent à faire par l'utilisateur** (voir `workers/ocr-relay/README.md` et TD-001).

---

## Phase 7 — Test / Execution / Evidence engine — **TERMINÉE (25/08/2026)**
- **Objective** : remplacer les tableaux libres FAT/SAT/IQ/OQ/PQ par de vraies entités traçables.
- **Dependencies** : Phase 3 (Assessment/Requirement/Risk doivent exister pour que la couverture de test ait un sens).
- **Risk** : Élevé (chantier long, cf. `GAP.md`) — séquencé en 3 sous-étapes, chacune commitée séparément, jamais en un seul commit.
- **Acceptance Criteria** : traçabilité Requirement→Test→Execution→Evidence démontrable sur au moins un cas réel — **démontrée** (test dédié `useEvidenceStore.test.ts`, scénario complet `Requirement → TestObjective → TestCandidate → Test → Couverture → Execution → ExecutionStep → Evidence → ProvenanceLink`).
- **Sous-étape 7a — Terminée (25/08/2026)** : chaîne de définition `Requirement → TestObjective → TestCandidate → Test` + `Couverture` (N:M Requirement↔Test). `Requirement` n'existait dans aucune entité préexistante — ajouté ici car intrinsèque à cette sous-étape. Garde-fous testés explicitement : un `Test` ne peut être créé que depuis un `TestCandidate` retenu ; écarter un candidat exige un motif tracé (jamais de suppression silencieuse) ; `Couverture` est une déclaration explicite et idempotente, jamais déduite. Voir `01-URS-outil.md` §4.12/URS-F-120, `03-specifications-fonctionnelles.md` §4.12.
- **Sous-étape 7b — Terminée (25/08/2026)** : `Execution → ExecutionStep → Measurement` + `ExecutionEvent`. Précédée d'une revue panel E1-E7 explicite (`docs/convergence/PHASE_7B_EXECUTION_SPEC.md`), `GAP.md` étant la seule source locale nommant ces 4 entités sans les détailler — les champs ont été déduits des principes déjà actés du projet (ALCOA+, principe fondateur n°1) plutôt que fabriqués. Garde-fous testés explicitement : `Execution` créée uniquement depuis un `Test` approuvé ; immutabilité totale après clôture (ALCOA+) ; verdict de clôture toujours explicite, jamais déduit des résultats d'étapes ; un `ExecutionEvent` ne crée jamais automatiquement de `QualityEvent` (DEC-002), même en cas de résultat non conforme. Voir `01-URS-outil.md` §4.13/URS-F-130, `03-specifications-fonctionnelles.md` §4.13.
- **Sous-étape 7c — Terminée (25/08/2026)** : `Evidence` + `EvidenceLocation` (pointeur déclaratif, jamais un stockage de fichier réel) + `ProvenanceLink` (N:M Evidence↔Requirement explicite, même logique que `Couverture`). Précédée d'une revue panel E1-E7 explicite (`docs/convergence/PHASE_7C_EVIDENCE_SPEC.md`) — limite assumée et documentée : aucune capacité d'upload/stockage de fichier binaire n'est construite dans ce périmètre. Garde-fous testés explicitement : `Evidence` uniquement pour une `Execution` non clôturée ; `execution_step_id` doit appartenir à l'exécution ; `EvidenceLocation` uniquement pour une `Evidence` de type `document` ; `ProvenanceLink` idempotent. Voir `01-URS-outil.md` §4.14/URS-F-140, `03-specifications-fonctionnelles.md` §4.14.

## Phase 8 — Source/Document Intelligence (séquencé selon TD-004) — **8a TERMINÉE (25/08/2026) ; 8b non engagée**
- **Dependencies** : Phase 6 tranchée (l'hébergement de cette capacité en dépend directement).
- **Acceptance Criteria** : structuration assistée validée par un humain avant tout `KnowledgeItem`, seuil `NEEDS_REVIEW` strict par défaut sur les diagrammes complexes — **démontré pour 8a** (`useSourceIntelligenceStore.test.ts` : aucun chemin ne permet une création directe à `valide`).
- **Sous-phase 8a — Terminée (25/08/2026)** : `Source → Extraction → KnowledgeItem` + `Conflict`, précédée d'une revue panel E1-E7 (`docs/convergence/PHASE_8A_SOURCE_INTELLIGENCE_SPEC.md`). Décision de conception documentée : le mot "Evidence" utilisé par `GAP.md` pour ce pipeline est porté par `Extraction.contenu_brut` (texte brut immutable), pas par un objet séparé — pour éviter toute collision avec l'`Evidence` de traçabilité Test/Execution (Phase 7c), qui est un concept distinct. Aucun appel IA réel construit : `valeur_interpretee` toujours fournie par l'appelant. Garde-fous testés : `KnowledgeItem` toujours `a_valider` à la création ; validation/rejet toujours humains et tracés ; `Conflict` reste `ouvert` tant que non résolu explicitement. Voir `01-URS-outil.md` §4.15/URS-F-150, `03-specifications-fonctionnelles.md` §4.15.
- **Sous-phase 8b — Non engagée** : compréhension de schémas techniques complexes (P&ID, schémas électriques, diagrammes Oui/Non) — TD-004 : "seulement après retour d'expérience réel" sur 8a.

## Phase 9 — Deliverable Engine complet (ContentPlan, provenance, versionnement) — **ContentPlan (planification) TERMINÉ (25/08/2026) ; Generate/Render/Approve/Freeze non engagés**
- **Dependencies** : Phases 1-3 (Method/Assessment) pour que le Content Planner ait des règles réelles à appliquer.
- **Migration** : ADAPT du moteur de gabarits existant (KEEP), ajout de la couche amont.
- **Réalisé (25/08/2026)** : `ContentPlan` (`Request → Resolve → Context Snapshot → Content Plan`), précédé d'une revue panel E1-E7 (`docs/convergence/PHASE_9_CONTENT_PLAN_SPEC.md`). Garde-fous testés : `context_snapshot` figé et immutable dès la création ; passage obligatoire par `valide` avant `gele` ; immutabilité totale après `gele`. Voir `01-URS-outil.md` §4.16/URS-F-160, `03-specifications-fonctionnelles.md` §4.16.
- **Non engagé, documenté comme tel** : `Generate → Validate → Review → Render → Approve → Freeze` (intégration avec `DefinitionGabarit`/`RenduGabarit.vue`, KEEP, et le cycle de vie de `Section`) — chantier distinct, plus risqué (tests existants du moteur de rendu à préserver, per `GAP.md`). Résolution "Example" (Method/Template/**Example**) non fabriquée, aucune source locale ne la détaillant.

## Phase 10 — Integration Gateway générique (TD-005) + Connecteurs QMS tiers — **TERMINÉE (25/08/2026)**
- **Dependencies** : aucune dure, mais peu utile avant qu'un vrai connecteur QMS (Veeva, backlog #32) soit engagé — engagée sur demande explicite de l'utilisateur, anticipant Veeva Vault, SharePoint/EDMS génériques, dossier réseau, et réutilisant Google Drive/GitHub déjà connectés.
- **Réalisé (25/08/2026)** : `Connector`/`SyncJob`/`ExternalReference` génériques, précédés d'une revue panel E1-E7 (`docs/convergence/PHASE_10_INTEGRATION_GATEWAY_SPEC.md`). Interface `ConnecteurDocumentaire` (même pattern swappable que `FournisseurOcr`, Phase 6) avec adaptateurs concrets `github`/`google_drive` (ADAPT, TD-005 — enveloppent `GitHubConnector`/`DriveConnector` sans réécrire leur logique validée) et `veeva_vault` (squelette basé sur le flux d'authentification réel, vérifié par recherche web — session ID + header `Authorization` — non testé en conditions réelles). Garde-fou testé explicitement : un `SyncJob` indisponible/en échec ne bloque jamais une opération métier indépendante (DEC-002/055). `sharepoint`/`dossier_reseau`/`edms_generique` : types reconnus et modélisés, adaptateur non implémenté (aucun point d'accès concret/source vérifiée disponible). Voir `01-URS-outil.md` §4.17/URS-F-170, `03-specifications-fonctionnelles.md` §4.17.
- **Backlog #32** (Veeva Vault pull/push complet, câblage UI) reste à faire — cette phase construit la fondation générique et le squelette Veeva, pas l'écran de configuration ni le pull réel vers `AssetNode`.

## Phase 11 — Migration `Client` → `Organization/Workspace/Site` (TD-006) — **TERMINÉE (25/08/2026)**
- **Dependencies** : toutes les phases précédentes stabilisées — c'est la migration la plus risquée du plan (clé utilisée par la quasi-totalité des stores), elle vient délibérément en dernier.
- **Acceptance Criteria** : scénario obligatoire "Global + N sites" fonctionnel, aucune régression sur l'isolation par client déjà testée aujourd'hui — **démontré** (`useOrganizationStore.test.ts`, scénario dédié : Site A hérite d'une règle globale, Site B la voit prévalue par sa propre règle ; 419 tests préexistants inchangés + 12 nouveaux = 431/431).
- **Réalisé (25/08/2026)** : `Organization`/`Workspace`, précédés d'une revue panel E1-E7 explicite (`docs/convergence/PHASE_11_ORGANIZATION_MIGRATION_SPEC.md`). **Décision structurante** : `Organization.id` reprend exactement l'`id` du `Client` migré — aucune des ~25 tables existantes indexées par `client_id` n'a besoin d'être réécrite dans cet incrément (leur `client_id` référence désormais `Organization.id`, valeur identique), ce qui évite tout Big Bang et satisfait directement le critère d'acceptation de non-régression. `Workspace` modélisé en arbre auto-référencé (`parent_workspace_id`) avec un seul discriminant `type: 'global' | 'site'` plutôt que 4 types rigides Global/Site/Facility/Area — Facility/Area deviennent de simples nœuds plus profonds dans l'arbre, cohérent avec le principe déjà acté pour `AssetHierarchySchema` (pas de profondeur de hiérarchie figée). Fonction pure `resoudreRegleEffective` (Scope + Applicability + Effectivity + Inheritance/Override, DEC-061) : remonte l'arbre depuis un `Workspace` donné, retourne la première règle trouvée avec son `workspaceIdOrigine` (traçabilité de provenance systématique), ou `null` si aucune. Garde-fous testés explicitement : `migrerClient`/`migrerTousLesClients` idempotents, jamais automatiques (toujours un appel explicite) ; `client_introuvable` explicite si le `Client` source n'existe pas ; `creerWorkspaceSite` refuse une `Organization` ou un parent inconnu, et refuse un parent n'appartenant pas à la même `Organization` ; le résolveur détecte un cycle dans l'arbre et retourne `null` plutôt qu'une boucle infinie. Voir `01-URS-outil.md` §4.18/URS-F-180 à 180septies, `03-specifications-fonctionnelles.md` §4.18.
- **Périmètre exclu, documenté comme tel** : aucune des ~25 tables existantes n'est réécrite pour référencer `Workspace` (le câblage `Workspace`-par-`Workspace` des stores métier reste un chantier ultérieur, phase par phase, hors de cet incrément) ; pas d'écran de gestion `Organization`/`Workspace` (pas de consommateur UI réel à ce stade) ; pas de champ `Effectivity`/date de prise d'effet sur `Workspace` lui-même (le résolveur ne traite que Scope + Inheritance/Override pour l'instant).

## Phase 12 — Câblage effectif de `Workspace` dans les stores métier existants (priorisé explicitement par l'utilisateur, 26/08/2026) — **étape 1/~42 TERMINÉE (26/08/2026)**
- **Dependencies** : Phase 11 (`Organization`/`Workspace`/`resoudreRegleEffective`).
- **Méthode** : store par store, jamais en bloc — chaque incrément a sa propre spec, ses propres tests, son propre commit. Voir `CONTEXTE-REPRISE-SESSION.md` (tête de fichier + §5.10) pour le détail des points de méthode (pas de Big Bang, ajout non destructif, test "Global + N sites" dédié par store).
- **Étape 1 — Structure Système (`AssetNode`) — Terminée (26/08/2026)** : précédée d'une revue panel E1-E7 (`docs/convergence/CABLAGE_ETAPE_1_STRUCTURE_SYSTEME_SPEC.md`). `AssetNode.workspace_id: string | null` ajouté de façon additive (compatibilité ascendante totale). Fonction pure `ancetresWorkspace` extraite de `resoudreRegleEffective` (réutilisation, une seule implémentation de la remontée d'arbre) — `resoudreRegleEffective` réécrit pour la consommer, sans changement de comportement (4 tests existants inchangés). Nouvelle fonction `noeudsVisiblesDepuisWorkspace` (héritage descendant : visible depuis son propre `Workspace` et tous ses ancêtres, jamais un "cousin"). Garde-fous testés : `creerNoeud` avec un `workspace_id` inconnu ou d'une autre organisation → rejet explicite ; scénario obligatoire "Global + N sites" démontré pour ce store précis ; nœud legacy (`workspace_id: null`) reste visible partout (non-régression). **Hors périmètre assumé** : `codeDejaUtilise`/`introduitUnCycle` restent à l'échelle de toute l'organisation (pas de changement de portée non demandé). Voir `01-URS-outil.md` URS-F-100undecies/duodecies (v39), `03-specifications-fonctionnelles.md` §4.10 (v29). 438/438 tests (431 préexistants inchangés + 7 nouveaux).
- **Étapes suivantes (2 à ~42)** : non engagées — un store par incrément, ordre à confirmer au fil de l'eau (le candidat suivant n'est pas fixé à l'avance).

---

## Clarification de vision produit (26/08/2026) — d'où viennent les Phases 13-17

L'utilisateur a clarifié explicitement que sa vision (« Que voulez-vous faire ? » plutôt qu'une liste de modules, raisonnement contextuel changement→impact→risque→test, IA capable de dire « je ne sais pas ») n'est **pas** une nouvelle direction : elle correspond mot pour mot au domaine **Work** (`Mission, Activity, WorkflowDefinition, WorkflowInstance, Approval`) et au domaine **AI** (`AIRequest, AIResponse, AIConfiguration, AIEvaluation`) déjà nommés dans `03_DOMAIN_DATA_MODEL.md`, jamais engagés jusqu'ici — le moteur construit en Phases 0bis-12 en est la matière première, pas ce qu'il faut remplacer. Une revue panel E1-E7 dédiée (`docs/convergence/PHASE_13_17_REVUE_PANEL_MOTEUR_RAISONNEMENT.md`) a tranché les 3 points bloquants avant d'engager le code — voir TD-007 à TD-009 dans `TECHNICAL_DECISIONS.md`.

## Phase 13 — Domaine Work : `Mission` / `Activity` — **Terminée (26/08/2026)**
- **Dependencies** : Organization/Workspace (Phase 11), Requirement/Test/Assessment déjà construits (Phase 7/3).
- **Décision d'entrée** : TD-009 — `Mission`/`Activity` seulement ; `WorkflowDefinition`/`WorkflowInstance`/`Approval` différés sur besoin réel démontré (même statut que 8b/9-Generate-Render-Approve-Freeze).
- **Portée réellement construite** (spec détaillée `docs/convergence/PHASE_13_MISSION_ACTIVITY_SPEC.md`) : `Mission` (conteneur contextualisé, ancre optionnelle `workspace_id`/`asset_node_id`), `Activity` (rattachée 1:N à une `Mission`), `Dependency` (`Activity → Activity`, ordre attendu jamais un verrou), `AssociationMissionQualityEvent` (`Mission ↔ QualityEvent` N:M). Domaine + persistance (Dexie v21) + store Pinia (`useMissionStore`) uniquement — aucun écran (comme les Phases 5/8a/9/10), la Phase 17 (Mission workspace) exposera ces objets visuellement.
- **Divergences identifiées et différées explicitement** (jamais résolues en silence) : la référence directe `Mission → Requirement/Assessment/Test/Evidence/Deliverable` évoquée initialement ici appartient en réalité à l'entité cible `Strategy` (non construite) ; `Activity produces Evidence` (matrice cible) contredit le garde-fou non négociable déjà testé d'`Evidence` (Phase 7c, jamais une preuve orpheline). Voir spec §3.

## Phase 14 — Context Engine généralisé — **Terminée (26/08/2026)**
- **Dependencies** : Phase 13, `resoudreRegleEffective`/`ancetresWorkspace` (Phase 11/12).
- **Portée réellement construite** (spec détaillée `docs/convergence/PHASE_14_CONTEXT_ENGINE_SPEC.md`) : `ContextSnapshot` (immuable) + `ContextSnapshotItem` (jointure polymorphe `asset_node`/`manufacturing_context`/`quality_event`) ; `noeudsVisiblesDepuisWorkspace` extrait de `useStructureSystemeStore` en fonction pure réutilisable (sans régression) ; `assemblerElementsContextSnapshot` (fonction pure) résout par ancre précise (`AssetNode`) ou par site (`Workspace`) ; `useContextEngineStore` persiste, aucune mise à jour possible (immutabilité).
- **Divergences identifiées et différées explicitement** : la résolution de "méthode applicable" (`MethodProfileACFC`/`MethodProfileImpactAssessment`) et de "documents pertinents" (`Source`/`SourceVersion`) n'a pas été construite — ces entités n'ont aujourd'hui aucun rattachement `Workspace`/`AssetNode`, les fabriquer sans cas réel serait une résolution non éprouvée. Voir spec §2/§3.

## Phase 15 — Reasoning Engine (domaine AI) — **Terminée (26/08/2026)**
- **Dependencies** : Phase 14 (ContextSnapshot), relais IA existant (Phase Chat expert), Source Intelligence (Phase 8a).
- **Décisions d'entrée** : TD-007 (orchestration côté navigateur, relais reste un simple proxy sans état, jamais un nouveau backend) et TD-008 (états de confiance discrets `connu|inféré|inconnu|conflit|a_verifier`, jamais un score numérique).
- **Contrainte technique découverte en conception** (spec `docs/convergence/PHASE_15_REASONING_ENGINE_SPEC.md` §2) : le relais IA est un simple proxy texte à un seul tour, son code serveur n'est pas dans ce dépôt — aucun appel d'outils natif possible sans le modifier. Le protocole d'appel d'outils est donc entièrement textuel (`APPEL_OUTIL:`/`REPONSE_FINALE:`), défini et interprété côté navigateur — confirme TD-007 plutôt que de le remettre en cause.
- **Portée réellement construite** : `AIConfiguration`/`AIRequest`/`AIResponse` (avec `trace_appels_outils` embarquée) + `CitationAIResponse` (jointure polymorphe) ; 4 outils de lecture (`Requirement`, `Test` via `Couverture`, `Evidence` via `Execution`, `KnowledgeItem`) ; boucle d'orchestration avec plafond d'itérations strict et dégradation gracieuse ; **vérification de citation déterministe non négociable** (rétrograde `connu`→`a_verifier` si citation non vérifiée ou absente — ajout par rapport au plan initial, justifié spec §4). Testé de bout en bout sur le scénario réel retenu (changement de recette) avec un fournisseur IA simulé.
- **Garde-fou non négociable vérifié** : aucune fonction n'écrit une `AIResponse` dans `Requirement`/`Test`/`KnowledgeItem` (test de régression dédié) — cohérent avec le principe fondateur n°1.
- **Divergences identifiées et différées explicitement** : `Risk`/`Hazard`/`Control` (non construits) exclus des outils ; `AIModelVersion`/`AIEvaluation` (entités cible séparées) non construites — `AIResponse.version_moteur` suffit à ce stade.

## Phase 16 — Coquille UX (sidebar + Accueil + mode dual) — **Terminée (26/08/2026)**
- **Dependencies** : Phases 13-15 éprouvées sur au moins un cas réel avant d'investir dans l'habillage.
- **Contrainte réelle découverte en conception** (spec `docs/convergence/PHASE_16_COQUILLE_UX_SPEC.md` §2) : la quasi-totalité des écrans utiles sont scindés par `clientId`, que la coquille ne connaît pas nativement — plutôt que de fabriquer un concept global de "client actif" côté domaine, `useClientActifStore` le mémorise côté navigateur (`localStorage`, jamais Dexie), commodité de navigation réversible.
- **Portée réellement construite** : `BarreLaterale.vue` (navigation groupée par intention : Accueil/Mon travail/Mon site/Clients & configuration) + `CoquilleApplication.vue` (enveloppe `RouterView`, jamais l'écran de blocage au démarrage) + `AccueilQueVoulezVousFaire.vue` (nouvel écran racine, `tableau-de-bord` déplacé sans casser aucune référence existante par nom) + `useModeAffichageStore` (bascule Expert/Assistant persistée). Vérifié dans un navigateur réel (Playwright) : démarrage, navigation, mémorisation du client actif après visite d'un outil client, aucune erreur console.
- **Divergences identifiées et différées explicitement** : aucune différenciation comportementale réelle entre Mode Expert et Mode Assistant sur les écrans existants (suppose la Phase 17) ; aucun bandeau de navigation ad hoc retiré des écrans existants (nettoyage cosmétique différé) ; aucun concept de "client actif" persisté côté domaine.

## Second document de vision — "Validation Engineering Platform" (26/08/2026)

L'utilisateur a transmis un document de vision approfondi (21 sections : Digital Validation Model, graphe de traçabilité, Continuous Validation State, GxP-by-design, benchmark ValGenesis/Kneat/Veeva/MasterControl) accompagné d'un échantillon UX/UI concurrent réel (`Sample_UXUI.docx`, 14 captures). Une seconde revue panel E1-E7 (`docs/convergence/REVUE_PANEL_VISION_VALIDATION_ENGINEERING.md`) a confirmé que l'architecture déjà construite (Phases 0bis-16) reste alignée sans remise en cause, et tranché 3 points avant la Phase 17 : **TD-010** ("Validation State" = vue calculée diagnostique, jamais un remplacement automatique de `qualification_status`), **TD-011** (tension GxP e-signature/RBAC vs. TD-001 documentée comme limite assumée, TD-001 non rouverte, aucun garde-fou de façade), **TD-012** (prochaine capacité du Reasoning Engine après la Phase 17 : analyse d'impact de changement ancrée sur `QualityEvent`, pas un mode générique).

## Phase 17 — Mission workspace — **Terminée (27/08/2026)**
- **Dependencies** : Phase 16.
- **Portée initialement décrite** : écran d'une Mission ouverte (contexte, scope, assessment, risques, requirements, stratégie, tests, evidence, livrables, historique). Vérification champ par champ (spec `docs/convergence/PHASE_17_MISSION_WORKSPACE_SPEC.md` §2) : `Assessment`/`Requirement`/`Test`/`Evidence` existent comme entités mais aucune référence directe `Mission → ces entités` n'a jamais été construite (Phase 13, appartient à `Strategy`, non construite) ; `Risk` n'existe pas. Construire ces sections aurait fabriqué des liens absents du modèle de données réel.
- **Portée réellement construite** : `ListeMissions.vue` (liste + création de `Mission` par client) et `MissionWorkspace.vue` — Activités (création, statut, dépendances), association à des `QualityEvent` existants, assemblage/affichage d'un `ContextSnapshot` (Phase 14), invocation du Reasoning Engine (Phase 15) scopée à la Mission avec historique et badge d'état de confiance visuellement distinct de `qualification_status` (TD-010). Extraction du pattern de construction d'adaptateur IA (jusqu'ici câblé en dur dans `usePanneauChatStore`) en module partagé `construireAdaptateursIA.ts`, réutilisé par les deux stores sans régression. Lien "Missions" ajouté à `BarreLaterale.vue`.
- **Divergences identifiées et différées explicitement** : aucune section Assessment/Requirement/Test/Evidence/Deliverable rattachée à la Mission (appartient à `Strategy`, non construite). Aucun indicateur de "Validation State" (TD-010/TD-012 : la prochaine capacité réelle du Reasoning Engine est une analyse d'impact de changement ancrée sur `QualityEvent`, pas un habillage du Mission workspace). Aucune suppression de `Mission`/`Activity`.
- **Bug trouvé et corrigé pendant la vérification navigateur réel** : `raisonner()` (section Raisonnement) n'attrapait aucune erreur du fournisseur IA (`ProviderAdapter.envoyerMessage`) — un relais/local injoignable provoquait un rejet de promesse non géré, sans aucun retour visible pour l'utilisateur (seule une trace console). Corrigé par un bandeau d'erreur dédié (`erreurRaisonnement`, `.bandeau-erreur`, `role="alert"`), même discipline déjà établie et testée dans `usePanneauChatStore`/`PanneauChat.vue` — jamais un échec silencieux d'un appel IA. Test de régression dédié ajouté.
- Vérifié : 7 tests composants dédiés (`MissionWorkspace.test.ts`) + 1 (`ListeMissions.test.ts`), suite complète 77 fichiers/515 tests verte, typecheck et lint propres, vérification manuelle en navigateur réel (Playwright : création client/Mission/Activity, assemblage de contexte, invocation du raisonnement y compris le cas d'échec réseau ci-dessus, aucune erreur console non gérée).

## Vision North Star — "MASTER PRODUCT VISION" + Capability & Gap Assessment Checklist (27/08/2026)

L'utilisateur a transmis un troisième document de vision ("VALIDAPHARM MASTER PRODUCT VISION / NORTH STAR", 53 sections) accompagné d'une checklist d'audit de capacités (~500 items, catégories A à AJ). Compte-rendu et audit du logiciel réel publiés (artefact du 27/08/2026), consolidés dans `docs/convergence/VISION_NORTH_STAR_CONVERGENCE.md` : interprétation, mapping sur les 15 couches cibles, roadmap de convergence en 4 priorités (P0 bloquant à P3 amélioration continue). TD-013 tranchée en ouverture (voir ci-dessous, Phase 18). Ce plan de convergence est un chantier multi-phases ouvert, pas clos par une seule session — chaque phase suit la discipline déjà en place (Spec → revue panel si nouveau domaine → Implémentation → Vérification → Documentation → Commit/Push).

## Phase 18 — Architecture Technique (relations typées `AssetNode`) — **Terminée (27/08/2026)**
- **Dependencies** : Phase 17, aucune nouvelle dépendance externe (contrairement aux autres chantiers P0 du plan Vision North Star).
- **Portée réellement construite** (spec `docs/convergence/PHASE_18_ARCHITECTURE_TECHNIQUE_SPEC.md`, TD-013) : `RelationTechnique` (`controle_par`/`connecte_a`/`heberge_sur`, jointure `AssetNode → AssetNode`), fonction pure `chaineTechniqueDepuis` (parcours en largeur), extension de `useStructureSystemeStore` (`creerRelationTechnique`, `chaineTechniqueDepuisNoeud`), nouvel outil `tracer_chaine_technique` du Reasoning Engine (extension de `DonneesOutilsRaisonnement`/`TypeObjetCitable` avec `asset_node`, testé de bout en bout avec citation vérifiable).
- **Correction par rapport à l'audit initial** : aucune nouvelle entité d'équipement (`Equipment`/`PLC`/`SCADA`/`Server`) n'a été nécessaire — `AssetHierarchySchema.levels[]` était déjà libre par client, seule la relation typée manquait (TD-013).
- **Divergences identifiées et différées explicitement** : aucune détection de cycle sur `RelationTechnique` (même tolérance qu'`associated_nodes[]`) ; aucun écran dédié (domaine + persistance + store + outil de raisonnement seulement, même discipline que les Phases 5/8a/9/10/13) ; aucune extension `Database`/`Network` au-delà des 3 types de relation nommés.
- Vérifié : suite complète 78 fichiers/527 tests verte, typecheck et lint propres. Aucune vérification navigateur (pas d'écran dans ce lot).

## Phase 19 — Ingestion Office native (lecture `.docx`) — **Terminée (27/08/2026)**
- **Dependencies** : Phase 18, aucune (recherche de librairie menée dans cette même phase, TD-014).
- **Portée réellement construite** (spec `docs/convergence/PHASE_19_INGESTION_OFFICE_SPEC.md`, TD-014) : `connecteurs/office/DocxNatifAdapter.ts` (`extraireTexteDocx`, dézippage `jszip` + extraction de texte via `DOMParser` sur `word/document.xml`, entièrement local), `MethodeExtraction` étendu (`docx_natif`).
- **Recherche documentée** : `mammoth` installé, testé sur un `.docx` réel construit avec `jszip`, puis **abandonné** — son champ `browser` de `package.json` (redirection Node/navigateur) n'est pas appliqué par la résolution de modules de Vitest, le code testé n'aurait jamais été celui exécuté en production. `xlsx`/SheetJS (npm) : vulnérabilité haute sans correctif. `exceljs` : dépendance transitive vulnérable. `docxtemplater`+`pizzip` retenus par anticipation pour une future phase de génération (Template Intelligence), non installés dans ce lot.
- **Divergences identifiées et différées explicitement** : aucune ingestion Excel native (bloquée faute de librairie saine — limite assumée, pas un oubli) ; aucun wiring dans un écran ni dans `useSourceIntelligenceStore` (même discipline que l'OCR, Phase 6) ; texte brut uniquement, aucune conservation de formatage/tableaux.
- **Complétée le même jour (TD-015)** suite à une observation explicite de l'utilisateur : une SOP réelle n'est pas toujours du texte seul (schémas/photos incorporés), et pas toujours un scan propre (avec ou sans filigrane). `extraireImagesDocx` (nouveau) extrait chaque image de `word/media/*`, typée MIME pour les formats raster ou explicitement `contentType: null` pour un format non raster (EMF/WMF) — jamais silencieusement omise. Destinée à être combinée avec l'OCR existant (Phase 6) pour produire une `Extraction` distincte par image sur la même `SourceVersion` (modèle Phase 8a déjà 1:N, aucune migration). Filigrane/scan dégradé : **aucune détection/correction automatique construite** — le filet de sécurité reste la validation humaine non négociable de tout `KnowledgeItem`, jamais un algorithme non prouvé.
- Vérifié : suite complète 79 fichiers/536 tests verte, typecheck et lint propres, `npm audit` : 0 vulnérabilité sur les dépendances ajoutées.

## Phase 20 — Cerveau procédural (Procedure/ProcedureStep) — **Terminée (27/08/2026)**
- **Dependencies** : Phase 19 (`extraireTexteDocx`/`extraireImagesDocx` pour lire une vraie SOP).
- **Portée réellement construite** (spec `docs/convergence/PHASE_20_PROCEDURAL_KNOWLEDGE_SPEC.md`, TD-016) : `Procedure` (`reference` stable + `numero_version` auto-incrémenté, même patron que `SourceVersion`, immuable), `ProcedureStep` (description/obligatoire/condition/responsable), `useProcedureStore`, nouvel outil `lister_etapes_procedure` du Reasoning Engine (résout toujours la version la plus récente d'une référence).
- **Décision de portée (TD-016)** : la structuration reste un acte humain (même discipline que `KnowledgeItem.valeur_interpretee`) — aucune extraction automatique de structure depuis un texte libre n'est construite. C'est un point ouvert explicitement identifié pour la prochaine session, pas une lacune silencieuse.
- **Divergences identifiées et différées explicitement** : aucun suivi d'exécution/conformité (`ProcedureExecution`, même discipline que TD-009) ; aucun écran dédié (même discipline que les Phases 5/8a/9/10/13/18) ; aucun lien direct `Procedure`↔`Mission`/`Activity`.
- Vérifié : suite complète 80 fichiers/547 tests verte, typecheck et lint propres.

## Phase 21 — Parseur déterministe de structure procédurale — **Terminée (27/08/2026)**
- **Dependencies** : Phase 20 (`Procedure`/`ProcedureStep`, destination de toute confirmation humaine).
- **Contexte** : l'utilisateur, en réponse au point ouvert de la Phase 20, confirme vouloir "tout faire d'abord sans l'IA" et signale que les SOP suivent en général un plan bien défini (objectif/scope/responsabilité/process) — en suggérant de vérifier sur des exemples réels dans Google Drive.
- **Portée réellement construite** (spec `docs/convergence/PHASE_21_PARSEUR_STRUCTURE_PROCEDURE_SPEC.md`, TD-017) : deux SOP pharma réelles de deux clients différents lues intégralement depuis Google Drive avant conception (Sanofi Lyon, Ferring International Center) — confirment un même enchaînement sémantique sous un vocabulaire différent. `detecterSections`/`proposerStructureProcedure` (`src/logique-metier/procedures/parseurStructureProcedure.ts`) : détection déterministe (zéro IA) de sections canoniques et d'étapes candidates (condition/responsable par motif).
- **Décision de portée (TD-017)** : reste une proposition en mémoire — aucune écriture dans `Procedure`/`ProcedureStep` sans confirmation humaine (garde-fou TD-016 inchangé). Un repli IA-assisté reste un point ouvert séparé, à engager seulement si un cas réel le réclame.
- **Divergences identifiées et différées explicitement** : décomposition multi-niveaux (sous-sections "N.M") non éclatée automatiquement ; genre "instruction technique illustrée" (contre-exemple Markem-Imaje, même corpus Drive) non couvert correctement — sur-segmentation assumée plutôt que perte silencieuse ; aucun écran de revue.
- Vérifié : suite complète 81 fichiers/554 tests verte, typecheck et lint propres.

**Extension du même jour (TD-018)** — en réponse à la question de l'utilisateur ("couvre-t-il tous les types de SOP ?") puis à sa demande explicite de maximiser la couverture sans IA avant tout repli : un 3ᵉ document réel (IMA "4915BRP"/"LA1028BRP") testé sans couverture (0/0) a motivé 3 extensions déterministes — reconnaissance de section par mot-clé, sous-titre numéroté retenu comme contexte d'étape (`contexteDetecte`), repli ligne-par-ligne quand aucune puce/numéro explicite n'existe (puces/numéros restant prioritaires quand présents). Retesté sans régression sur Sanofi/Ferring, désormais 3 sections + étapes contextualisées sur le document IMA. Le genre "instruction technique illustrée" (Markem-Imaje) reste hors couverture — limite de fond non close, confirmée : une couverture déterministe de "tous les types" de SOP est hors de portée d'un système de règles par construction. Vérifié : suite complète 81 fichiers/557 tests verte, typecheck et lint propres. URS v50 (§4.26/URS-F-260quinquies à septies), FS v40.

## Phase 22 — Lecture de tableaux Word + fournisseur Document Intelligence disponible — **Terminée (27/08/2026)**
- **Dependencies** : Phase 21/21bis (parseur déterministe existant, à compléter).
- **Contexte** : l'utilisateur demande "essaye de voir dans tous les catalogues s'il y'a des outils pour parser lire et comprendre des tableaux ou des étapes sous tableau" (genre Markem-Imaje, laissé hors couverture par TD-017/TD-018), puis explicitement "Tu feras le 1 [tableaux Word] puis le 2 [repli Document Intelligence]" et de tester sur des procédures PDF réelles du Drive.
- **Portée réellement construite** (spec `docs/convergence/PHASE_22_TABLEAUX_ET_DOCUMENT_INTELLIGENCE_SPEC.md`, TD-019/TD-020) : recherche de catalogue npm sans résultat sain (`officeparser` Node uniquement, `docx4js` non maintenu depuis 2018, `mammoth` déjà abandonné) → `extraireTableauxDocx`/`proposerEtapesDepuisTableaux` (code maison, `jszip`+`DOMParser`), calibrés sur le manuel Markem-Imaje réel. `DocumentIntelligenceProvider` (Azure, modèle `prebuilt-layout`) rendu disponible pour le cas d'un scan/PDF, suivant le patron `FournisseurOcr` déjà pluggable — non câblé comme fournisseur actif (décision de compte Azure réservée à l'utilisateur).
- **Test contre des PDF réels du Drive** : Ferring "SOP Qualif Balance.pdf" — 9 sections détectées correctement, 3 sections `'autre'` parasites dues à des données de tableau numériques (limite découverte, non corrigée). Sanofi "LYON-QUAL-PGN-000198.pdf" — échec initial dû à un artefact d'échappement Markdown du rendu Google Drive (non représentatif d'une vraie extraction PDF), résolu une fois neutralisé : les 9 sections canoniques toutes détectées.
- **Limite honnête** : aucune ingestion PDF réelle dans la PWA (testé via le rendu Drive, pas un pipeline de production) — voir ligne de suivi dédiée.
- Vérifié : suite complète 82 fichiers/574 tests verte, typecheck et lint propres.

## Phase 23 — Ingestion PDF native — **Terminée (27/08/2026)**
- **Dependencies** : Phase 22 (`DocumentIntelligenceProvider`, dont le repli scanné devient réellement exploitable une fois un PDF natif aussi ingéré).
- **Contexte** : l'utilisateur demande "Fais les deux [ingestion PDF + repli IA]. Tu trouves pas des sop en pdf dans Google drive ? Ouvre tous les docs pharma il y'a sûrement un pdf" — fermer la limite "aucune ingestion PDF réelle" signalée en Phase 22.
- **Portée réellement construite** (spec `docs/convergence/PHASE_23_INGESTION_PDF_SPEC.md`, TD-021) : recherche élargie dans Drive fait remonter un 4ᵉ genre réel de SOP ("PB1D_Operation.pdf", manuel Nordson, en-têtes en gras sans numérotation), confirmant la limite de fond sur un document indépendant supplémentaire. `pdfjs-dist` retenu et **testé réellement** (pas présumé) : le build principal échoue en test (`DOMMatrix is not defined`), le build `legacy` fonctionne identiquement en test et production — même logique de parsing des deux côtés, seule l'URL du worker/des polices diffère (configuration d'environnement, pas une divergence de code comme `mammoth`, TD-014). `extraireTextePdf` (`src/connecteurs/pdf/PdfNatifAdapter.ts`), `MethodeExtraction` étendu (`pdf_natif`).
- **Bug réel trouvé et corrigé pendant la construction du test** : troncature de texte sur une `MediaBox` trop étroite dans le PDF de test construit à la main — élargie, comportement vérifié.
- **Limite honnête** : aucune extraction de structure de tableau depuis un PDF natif, aucun wiring écran/store.
- Vérifié : suite complète 83 fichiers/577 tests verte, typecheck et lint propres, `npm audit` 0 vulnérabilité.

---

## Ce qui reste volontairement "OPEN" (non planifié ici)

Conformément à `13_TRACEABILITY_ACCEPTANCE.md` : le framework exact, le modèle IA exact pour le multimodal, les tests de charge/pentest/sauvegarde-restauration ne sont **pas** tranchés dans ce plan (*mise à jour 25/08/2026 : le fournisseur OCR/parseur, lui, est désormais tranché — Azure AI Vision, décision explicite de l'utilisateur, TD-001*) — ils viennent après le GAP, comme le package le précise lui-même. *(Mise à jour 25/08/2026, clôture des points ouverts)* Le "schéma SQL physique si un backend est retenu" mentionné initialement ici est devenu **sans objet** : TD-001 (25/08/2026) a tranché qu'aucun backend relationnel n'est retenu (extension serverless à la place) — il n'y a donc pas de schéma SQL à concevoir tant que ce choix n'est pas révisé sur besoin réel démontré.

---

*Fin de la Phase 0. Les 7 livrables (`GAP.md`, `CURRENT_ARCHITECTURE.md`, `LEGACY_MAPPING.md`, `ARCHITECTURE_CONFLICTS.md`, `ARCHITECTURE_CHALLENGES.md`, `TECHNICAL_DECISIONS.md`, `CONVERGENCE_PLAN.md`) sont produits. TD-001/Phase 6 est résolu (25/08/2026, extension serverless plutôt que backend complet) — plus aucun point d'arrêt : toutes les phases (0bis à 11) peuvent être engagées dans l'ordre proposé.*

## Suivi d'avancement (mis à jour à chaque phase terminée)

| Phase | Statut | Commit | Docs sources mis à jour en conséquence |
|---|---|---|---|
| 0bis | Terminée (25/08/2026) | `fc08890` | `01-URS-outil.md` v26 |
| 1 | Terminée (25/08/2026) | `a8f7f83` | `01-URS-outil.md` v27, `03-specifications-fonctionnelles.md` v18, `16-FDS-outil.md` v15, `02-analyse-de-risque-outil.md` v28 |
| 2 | Terminée (25/08/2026) | `c6391ca` | Aucune correction de doc réglementaire requise (Phase 2 est un ajout pur, sans description contradictoire préexistante) |
| 3 | Terminée partiellement (25/08/2026) | voir historique git de la branche | `GAP.md`, `ARCHITECTURE_CONFLICTS.md` (CONFLICT-002 marqué résolu, GxPAssessment noté non implémenté) |
| 4 | Terminée (25/08/2026) | voir historique git de la branche | `01-URS-outil.md` v29 (§4.10bis/URS-F-103), `03-specifications-fonctionnelles.md` v19 |
| 5 | Terminée (25/08/2026) | `2605667` | `01-URS-outil.md` v30 (§4.11/URS-F-110 + backfill §4.6quater/URS-F-058 pour la Phase 2, oublié à l'époque), `03-specifications-fonctionnelles.md` v20 |
| 6 | Code terminé (25/08/2026) ; déploiement réel par l'utilisateur | voir historique git de la branche | `TECHNICAL_DECISIONS.md` (TD-001 complété : fournisseur Azure AI Vision), `workers/ocr-relay/README.md` |
| 7a | Terminée (25/08/2026) | voir historique git de la branche | `01-URS-outil.md` v31 (§4.12/URS-F-120), `03-specifications-fonctionnelles.md` v21 |
| 7b | Terminée (25/08/2026) | voir historique git de la branche | `01-URS-outil.md` v32 (§4.13/URS-F-130), `03-specifications-fonctionnelles.md` v22, `docs/convergence/PHASE_7B_EXECUTION_SPEC.md` |
| 7c | Terminée (25/08/2026) | voir historique git de la branche | `01-URS-outil.md` v33 (§4.14/URS-F-140), `03-specifications-fonctionnelles.md` v23, `docs/convergence/PHASE_7C_EVIDENCE_SPEC.md` |
| 8a | Terminée (25/08/2026) | voir historique git de la branche | `01-URS-outil.md` v34 (§4.15/URS-F-150), `03-specifications-fonctionnelles.md` v24, `docs/convergence/PHASE_8A_SOURCE_INTELLIGENCE_SPEC.md` |
| 9 (ContentPlan) | Terminée (25/08/2026) | voir historique git de la branche | `01-URS-outil.md` v35 (§4.16/URS-F-160), `03-specifications-fonctionnelles.md` v25, `docs/convergence/PHASE_9_CONTENT_PLAN_SPEC.md` |
| **Réalignement 7a/7b/8a/9** | **Terminé (25/08/2026)** | voir historique git de la branche | Google Drive reconnecté en cours de session → lecture directe intégrale du package source (17 documents) → correction de simplifications faites faute de source disponible au moment de 7a/7b/8a/9. `01-URS-outil.md` v36, `03-specifications-fonctionnelles.md` v26, `docs/convergence/REALIGNMENT_25_08_2026.md` (détail exhaustif de ce qui a changé et de ce qui ne l'a délibérément pas été) |
| 10 | Terminée (25/08/2026) | voir historique git de la branche | `01-URS-outil.md` v37 (§4.17/URS-F-170), `03-specifications-fonctionnelles.md` v27, `docs/convergence/PHASE_10_INTEGRATION_GATEWAY_SPEC.md` |
| 11 (Organization/Workspace) | Terminée (25/08/2026) | voir historique git de la branche | `01-URS-outil.md` v38 (§4.18/URS-F-180), `03-specifications-fonctionnelles.md` v28, `docs/convergence/PHASE_11_ORGANIZATION_MIGRATION_SPEC.md` |
| 12 (câblage Workspace) — étape 1/~42 (Structure Système) | Terminée (26/08/2026) | voir historique git de la branche | `01-URS-outil.md` v39 (URS-F-100undecies/duodecies), `03-specifications-fonctionnelles.md` v29, `docs/convergence/CABLAGE_ETAPE_1_STRUCTURE_SYSTEME_SPEC.md` |
| **Revue panel Moteur de raisonnement** | **Terminée (26/08/2026)** | — (documentaire) | `docs/convergence/PHASE_13_17_REVUE_PANEL_MOTEUR_RAISONNEMENT.md`, `TECHNICAL_DECISIONS.md` (TD-007 à TD-009) |
| 13 (Mission/Activity) | **Terminée (26/08/2026)** | voir historique git de la branche | `01-URS-outil.md` v40 (§4.19/URS-F-190 à quinquies), `03-specifications-fonctionnelles.md` v30, `docs/convergence/PHASE_13_MISSION_ACTIVITY_SPEC.md` |
| 14 (Context Engine — ContextSnapshot) | **Terminée (26/08/2026)** | voir historique git de la branche | `01-URS-outil.md` v41 (§4.20/URS-F-200 à quater), `03-specifications-fonctionnelles.md` v31, `docs/convergence/PHASE_14_CONTEXT_ENGINE_SPEC.md` |
| 15 (Reasoning Engine — domaine AI) | **Terminée (26/08/2026)** | voir historique git de la branche | `01-URS-outil.md` v42 (§4.21/URS-F-210 à sexies), `03-specifications-fonctionnelles.md` v32, `docs/convergence/PHASE_15_REASONING_ENGINE_SPEC.md` |
| 16 (Coquille UX) | **Terminée (26/08/2026)** | voir historique git de la branche | `01-URS-outil.md` v43 (§4.22/URS-F-220 à quinquies), `03-specifications-fonctionnelles.md` v33, `docs/convergence/PHASE_16_COQUILLE_UX_SPEC.md` |
| **Second document de vision + revue panel** | **Terminée (26/08/2026)** | — (documentaire) | `docs/convergence/REVUE_PANEL_VISION_VALIDATION_ENGINEERING.md`, `TECHNICAL_DECISIONS.md` (TD-010 à TD-012) |
| 17 (Mission workspace) | **Terminée (27/08/2026)** | voir historique git de la branche | `01-URS-outil.md` v44 (§4.23/URS-F-230 à quinquies), `03-specifications-fonctionnelles.md` v34, `docs/convergence/PHASE_17_MISSION_WORKSPACE_SPEC.md` |
| **Vision North Star + Capability & Gap Assessment Checklist** | **Terminée (27/08/2026)** | — (documentaire) | `docs/convergence/VISION_NORTH_STAR_CONVERGENCE.md`, `TECHNICAL_DECISIONS.md` (TD-013) |
| 18 (Architecture Technique — relations typées `AssetNode`) | **Terminée (27/08/2026)** | voir historique git de la branche | `01-URS-outil.md` v45 (§4.24/URS-F-240 à quater), `03-specifications-fonctionnelles.md` v35, `docs/convergence/PHASE_18_ARCHITECTURE_TECHNIQUE_SPEC.md` |
| 19 (Ingestion Office native — lecture `.docx` + images incorporées) | **Terminée (27/08/2026)** | voir historique git de la branche | `01-URS-outil.md` v47 (§4.15/URS-F-150septies-decies), `03-specifications-fonctionnelles.md` v37, `docs/convergence/PHASE_19_INGESTION_OFFICE_SPEC.md`, `TECHNICAL_DECISIONS.md` (TD-014/TD-015) |
| 20 (Cerveau procédural — Procedure/ProcedureStep) | **Terminée (27/08/2026)** | voir historique git de la branche | `01-URS-outil.md` v48 (§4.25/URS-F-250 à quater), `03-specifications-fonctionnelles.md` v38, `docs/convergence/PHASE_20_PROCEDURAL_KNOWLEDGE_SPEC.md`, `TECHNICAL_DECISIONS.md` (TD-016) |
| 21 (Parseur déterministe de structure procédurale, + extension TD-018) | **Terminée (27/08/2026)** | voir historique git de la branche | `01-URS-outil.md` v50 (§4.26/URS-F-260 à septies), `03-specifications-fonctionnelles.md` v40, `docs/convergence/PHASE_21_PARSEUR_STRUCTURE_PROCEDURE_SPEC.md`, `TECHNICAL_DECISIONS.md` (TD-017/TD-018) |
| 22 (Lecture de tableaux Word + fournisseur Document Intelligence disponible) | **Terminée (27/08/2026)** | voir historique git de la branche | `01-URS-outil.md` v51 (§4.27/URS-F-270 à quater), `03-specifications-fonctionnelles.md` v41, `docs/convergence/PHASE_22_TABLEAUX_ET_DOCUMENT_INTELLIGENCE_SPEC.md`, `TECHNICAL_DECISIONS.md` (TD-019/TD-020) |
| 23 (Ingestion PDF native) | **Terminée (27/08/2026)** | voir historique git de la branche | `01-URS-outil.md` v52 (§4.28/URS-F-280 à quater), `03-specifications-fonctionnelles.md` v42, `docs/convergence/PHASE_23_INGESTION_PDF_SPEC.md`, `TECHNICAL_DECISIONS.md` (TD-021) |
| 8b, 9 (Generate/Render/Approve/Freeze), 12 (étapes 2 à ~42) | Non engagées | — | — |
| 24 (Template Intelligence généralisée — génération `docxtemplater`, ingestion Excel) | Non engagée — chantier P0 suivant du plan Vision North Star, voir `VISION_NORTH_STAR_CONVERGENCE.md` §4 | — | — |
| Repli IA-assisté pour la structuration procédurale (documents hors couverture du parseur déterministe/tableaux) | **Engagé sur demande explicite de l'utilisateur** ("Fais les deux") — 4 genres réels de SOP maintenant testés (Sanofi, Ferring, IMA, Markem-Imaje, Nordson), couverture déterministe jugée suffisamment poussée pour concevoir le repli | — | — |
| Ingestion PDF réelle dans la PWA (`pdfjs-dist` candidat identifié) | **Non engagée** — nécessaire pour que le repli Document Intelligence (Phase 22) soit exploitable sur un vrai scan/PDF, chantier séparé | — | — |

**Discipline appliquée à partir de la Phase 1 (inspirée de BMAD — *Breakthrough Method for Agile AI-driven Development*, méthode agentique en deux piliers "Agentic Planning" + "Context-Engineered Development" ; adaptée ici sans installer son framework/CLI, la structure documentaire de ce dossier `convergence/` remplissant déjà un rôle équivalent) : chaque phase suit désormais explicitement un cycle Spec → Implémentation → Vérification (tests + typecheck + lint + navigateur réel si UI) → **Alignement documentaire** (URS/FS/FDS/AR corrigés si leur description du mécanisme devient inexacte) → Commit/Push → mise à jour de cette table. L'alignement documentaire n'est pas une étape optionnelle de fin de plan : c'est une porte de sortie de chaque phase, au même titre que les tests.
