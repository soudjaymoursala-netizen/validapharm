# CONVERGENCE_PLAN — Ordre de mise en œuvre

| | |
|---|---|
| **Statut** | 7ᵉ et dernier livrable de la Phase 0 (`14_MASTER_PROMPT_FOR_CLAUDE.md`). Synthétise `GAP.md`, `CURRENT_ARCHITECTURE.md`, `LEGACY_MAPPING.md`, `ARCHITECTURE_CONFLICTS.md`, `ARCHITECTURE_CHALLENGES.md`, `TECHNICAL_DECISIONS.md`. À partir d'ici, l'implémentation progressive (étape 9 de la séquence obligatoire) peut commencer, phase par phase. |
| **Écart à l'ordre par défaut du package** | L'ordre suggéré par le master prompt (§56 : *Domain Model → Data Model → Relationships → Context → Sources → Methods/Rules → Assessment → Workflow → Test → Execution → Evidence → Deliverables → AI → Integrations → UI*) est **réordonné ci-dessous**, comme le package l'autorise explicitement (*"cet ordre peut être modifié si l'audit démontre qu'une autre séquence est techniquement plus sûre"*). Raison du réordonnancement : les livrables de Phase 0 ont fait émerger un chantier isolé, sans dépendance, déjà identifié par 3 sources convergentes (TD-002) — il n'y a aucune raison technique de le faire attendre derrière Domain/Data Model globaux qui, eux, touchent tout le repository. |

---

## Phase 0bis — Corrections documentaires (prérequis, avant tout code)
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

## Phase 1 — Method/Template/Example générique + remplacement ACFC (TD-002)
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

## Phase 2 — Parameter / CriticalParameter / CPP / CQA distincts
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

## Phase 3 — Moteur d'Assessment générique (CriticalityAssessment/ImpactAssessment/CSVAssessment/GxPAssessment)
- **Objective** : remplacer l'assistant fermé §4.6 par un moteur d'assessment générique, dont la stratégie de qualification devient un type parmi d'autres.
- **Current State** : un seul assistant, sortie fermée.
- **Target State** : 4 types d'assessment distincts partageant un moteur commun, rattachables à un nœud réel de Structure Système.
- **Dependencies** : Phase 1 (MethodProfile), Phase 2 (Parameter/CPP), Phase 0bis (URS corrigée).
- **Migration** : nouvelle entité `Assessment` générique + 4 sous-types.
- **Risk** : Moyen.
- **Tests** : scénarios obligatoires "Criticality" au complet (§11_USE_CASES).
- **Rollback** : l'assistant §4.6 actuel reste en service jusqu'à bascule.
- **Acceptance Criteria** : les 3 briques d'Impact Assessment/CSV Assessment/Risk Analysis (Phase 0bis) sont réellement 3 modules distincts dans le code, pas seulement dans la documentation.

---

## Phase 4 — Extension de Structure Système : `Function` + `Process`/`ManufacturingContext`
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

## Phase 5 — Quality Events (Change Control, CAPA, Deviation, Investigation, Audit Finding, Periodic Review)
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

## Phase 6 — Extension serverless (Cloudflare Workers) pour OCR/recherche — **RÉSOLU, plus de point d'arrêt**
- **Objective** : préparer la brique technique dont les Phases 7-8 ont besoin, sans backend serveur complet.
- **Current State** : 100% navigateur ; un relais Cloudflare Workers déjà en production pour l'IA (URS-NF-044ter).
- **Target State** (décidé le 25/08/2026, `TECHNICAL_DECISIONS.md` TD-001) : un second Worker sans état pour l'OCR/Document Intelligence (relais vers une API cloud de vision, même pattern que le relais IA) ; recherche calculée côté navigateur (IndexedDB), puis JSON versionnés dans Git si le volume l'exige un jour ; dépôt Git comme seul stockage des sources ; Cloudflare Queues pour le traitement asynchrone léger. Pas de base relationnelle serveur, pas d'object storage dédié.
- **Dependencies** : aucune — réutilise l'infrastructure Cloudflare/GitHub déjà en place et déjà testée réseau (AR-R-64, clos).
- **Migration** : ajout d'un nouveau Worker sans état, à côté du relais IA existant ; aucune migration de données requise.
- **Risk** : Faible — pattern déjà éprouvé dans ce même projet.
- **Tests** : joignabilité réseau du nouveau Worker (même méthode qu'AR-R-64), tests unitaires du contrat du Worker.
- **Rollback** : trivial (suppression du Worker, aucune donnée n'y est stockée).
- **Acceptance Criteria** : un document envoyé au Worker OCR revient structuré, sans qu'aucune donnée métier ne soit conservée côté Worker au-delà de la requête (cohérent avec le relais IA existant, sans état).

---

## Phase 7 — Test / Execution / Evidence engine
- **Objective** : remplacer les tableaux libres FAT/SAT/IQ/OQ/PQ par de vraies entités traçables.
- **Dependencies** : Phase 3 (Assessment/Requirement/Risk doivent exister pour que la couverture de test ait un sens).
- **Risk** : Élevé (chantier long, cf. `GAP.md`) — à séquencer en sous-étapes, jamais en un seul commit.
- **Acceptance Criteria** : traçabilité Requirement→Test→Execution→Evidence démontrable sur au moins un cas réel.

## Phase 8 — Source/Document Intelligence (séquencé selon TD-004)
- **Dependencies** : Phase 6 tranchée (l'hébergement de cette capacité en dépend directement).
- **Acceptance Criteria** : structuration assistée validée par un humain avant tout `KnowledgeItem`, seuil `NEEDS_REVIEW` strict par défaut sur les diagrammes complexes.

## Phase 9 — Deliverable Engine complet (ContentPlan, provenance, versionnement)
- **Dependencies** : Phases 1-3 (Method/Assessment) pour que le Content Planner ait des règles réelles à appliquer.
- **Migration** : ADAPT du moteur de gabarits existant (KEEP), ajout de la couche amont.

## Phase 10 — Integration Gateway générique (TD-005) + Connecteurs QMS tiers
- **Dependencies** : aucune dure, mais peu utile avant qu'un vrai connecteur QMS (Veeva, backlog #32) soit engagé.

## Phase 11 — Migration `Client` → `Organization/Workspace/Site` (TD-006)
- **Dependencies** : toutes les phases précédentes stabilisées — c'est la migration la plus risquée du plan (clé utilisée par la quasi-totalité des stores), elle vient délibérément en dernier.
- **Acceptance Criteria** : scénario obligatoire "Global + N sites" fonctionnel, aucune régression sur l'isolation par client déjà testée aujourd'hui.

---

## Ce qui reste volontairement "OPEN" (non planifié ici)

Conformément à `13_TRACEABILITY_ACCEPTANCE.md` : le framework exact, le schéma SQL physique si un backend est retenu (Phase 6), le fournisseur OCR/parseur, le modèle IA exact pour le multimodal, l'infrastructure d'hébergement du backend, les tests de charge/pentest/sauvegarde-restauration ne sont **pas** tranchés dans ce plan — ils viennent après le GAP, comme le package le précise lui-même.

---

*Fin de la Phase 0. Les 7 livrables (`GAP.md`, `CURRENT_ARCHITECTURE.md`, `LEGACY_MAPPING.md`, `ARCHITECTURE_CONFLICTS.md`, `ARCHITECTURE_CHALLENGES.md`, `TECHNICAL_DECISIONS.md`, `CONVERGENCE_PLAN.md`) sont produits. TD-001/Phase 6 est résolu (25/08/2026, extension serverless plutôt que backend complet) — plus aucun point d'arrêt : toutes les phases (0bis à 11) peuvent être engagées dans l'ordre proposé.*
