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

## Phase 10 — Integration Gateway générique (TD-005) + Connecteurs QMS tiers
- **Dependencies** : aucune dure, mais peu utile avant qu'un vrai connecteur QMS (Veeva, backlog #32) soit engagé.

## Phase 11 — Migration `Client` → `Organization/Workspace/Site` (TD-006)
- **Dependencies** : toutes les phases précédentes stabilisées — c'est la migration la plus risquée du plan (clé utilisée par la quasi-totalité des stores), elle vient délibérément en dernier.
- **Acceptance Criteria** : scénario obligatoire "Global + N sites" fonctionnel, aucune régression sur l'isolation par client déjà testée aujourd'hui.

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
| 8b, 9 (Generate/Render/Approve/Freeze), 10-11 | Non engagées | — | — |

**Discipline appliquée à partir de la Phase 1 (inspirée de BMAD — *Breakthrough Method for Agile AI-driven Development*, méthode agentique en deux piliers "Agentic Planning" + "Context-Engineered Development" ; adaptée ici sans installer son framework/CLI, la structure documentaire de ce dossier `convergence/` remplissant déjà un rôle équivalent) : chaque phase suit désormais explicitement un cycle Spec → Implémentation → Vérification (tests + typecheck + lint + navigateur réel si UI) → **Alignement documentaire** (URS/FS/FDS/AR corrigés si leur description du mécanisme devient inexacte) → Commit/Push → mise à jour de cette table. L'alignement documentaire n'est pas une étape optionnelle de fin de plan : c'est une porte de sortie de chaque phase, au même titre que les tests.
