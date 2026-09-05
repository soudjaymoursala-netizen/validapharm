# LEGACY_MAPPING — Classification de chaque composant existant

| | |
|---|---|
| **Statut** | 3ᵉ livrable, après `GAP.md` et `CURRENT_ARCHITECTURE.md`. |
| **Règle appliquée** | `UNKNOWN` n'est jamais transformé automatiquement en `REPLACE` (§10 du master prompt). Chaque composant est classé selon sa valeur métier démontrée, pas selon son ancienneté. |

Statuts possibles: `KEEP` · `ADAPT` · `EXTEND` · `REFACTOR` · `MIGRATE` · `REPLACE` · `DEPRECATE` · `UNKNOWN`.

---

### Moteur de gabarits déclaratif (`DefinitionGabarit`, `RenduGabarit.vue`)
- **Purpose**: rendu générique d'un document structuré (sections/champs/colonnes) sans jamais modifier le moteur pour ajouter un gabarit.
- **Current Consumers**: les 11 gabarits du catalogue, l'écran Éditeur de section.
- **Data**: `DefinitionGabarit` (schéma statique par fichier TypeScript).
- **Business Value**: élevée — c'est la fondation qui permet d'ajouter un livrable sans toucher au code de rendu.
- **Target Equivalent**: la moitié "Template = Structure" du triplet Method/Template/Example (§25), et la brique "Render" du Deliverable Engine (§26).
- **Migration Strategy**: aucune migration de structure requise; devient la couche de rendu sous un futur `ContentPlan`/`DeliverableVersion`.
- **Dependencies**: `validerChamp.ts`, `evaluerColonneCalculee.ts`.
- **Risk**: faible.
- **Regression Risk**: faible si on l'encapsule plutôt que de le modifier.
- **Final Status**: **KEEP**.

### Machine à états de section (`transitionSection.ts`, `gardesFinalisation.ts`)
- **Purpose**: cycle de vie brouillon→approuvé avec garde-fous de liens obligatoires.
- **Current Consumers**: tous les écrans de section.
- **Data**: `Section.status`, `Section.audit_log`.
- **Business Value**: élevée — comportement réglementaire déjà testé (U-01/U-02/U-03).
- **Target Equivalent**: un cas particulier de `WorkflowDefinition`/`WorkflowInstance` (§17, package Master Architecture).
- **Migration Strategy**: **ADAPT**, pas remplacer — garder ce workflow figé comme instance historique valide pendant que le moteur `Workflow` générique se construit à côté; ne migrer que si un vrai besoin de workflow paramétrable par client apparaît.
- **Dependencies**: `useSectionsStore.ts`.
- **Risk**: moyen si remplacé trop tôt (perte de garde-fous déjà validés).
- **Regression Risk**: élevé si touché sans étendre la couverture de test existante.
- **Final Status**: **ADAPT** (garder tel quel, construire à côté).

### Grille de criticité ACFC (`grilleCriticite.ts`, `grilleDecision.ts`)
- **Purpose**: simuler une évaluation de criticité pour alimenter l'assistant de stratégie de qualification (§4.6).
- **Current Consumers**: `AssistantStrategieQualification.vue`.
- **Data**: 9 critères codés en dur, `NiveauCriticite`, `ConclusionStrategieQualification`.
- **Business Value**: faible en l'état (explicitement provisoire dans le code et l'écran), mais le *besoin* qu'il sert (aide à la décision de stratégie de qualification) est réel et validé.
- **Target Equivalent**: `MethodProfile` + `CriticalityAssessment` + `DecisionRule` configurables (§07, §12, §24 du package).
- **Migration Strategy**: **REPLACE** — c'est la seule instruction explicite et sans ambiguïté du master prompt sur un composant existant (*"Ne pas hard-coder 6/7/9 questions ACFC"*). Le remplacement doit conserver le besoin (aide à la décision) en changeant le mécanisme (données codées en dur → `MethodProfile` versionné par client).
- **Dependencies**: aucun autre module n'en dépend (bonne nouvelle — remplacement isolé).
- **Risk**: faible techniquement (peu de dépendants), élevé si on ne le remplace pas (violation documentée d'une règle explicite de la cible).
- **Regression Risk**: faible — 11 tests actuels, tous réécrits nécessairement avec le nouveau modèle.
- **Final Status**: **REPLACE** (priorité la plus haute, cf. `GAP.md`). **Exécuté le 25/08/2026 (commit `a8f7f83`)**: `grilleCriticite.ts` supprimé, remplacé par `MethodProfileACFC`/`EvaluationACFC` (`src/logique-metier/acfc/`, `useMethodProfileACFCStore`); `grilleDecision.ts` adapté au verdict binaire plutôt que remplacé (conservé, cf. sa propre entrée ci-dessous si présente).

### Calcul IPR (`calculerIPR.ts`)
- **Purpose**: S×O×D → IPR, seul calcul réglementaire déterministe du repo.
- **Current Consumers**: gabarit DQ (colonne calculée).
- **Data**: nombre 1-125.
- **Business Value**: élevée — formule normative, jamais à réinventer.
- **Target Equivalent**: logique de scoring d'un futur `RiskAssessment`/AMDEC, avec `Parameter`/`CriticalParameter` en amont.
- **Migration Strategy**: **KEEP** le calcul lui-même; **EXTEND** son point d'ancrage (aujourd'hui uniquement dans DQ, demain rattachable à un vrai module AMDEC autonome).
- **Dependencies**: `dq.ts`.
- **Risk**: faible.
- **Regression Risk**: faible.
- **Final Status**: **KEEP** (calcul) + **EXTEND** (rattachement).

### Structure Système (`AssetHierarchySchema`, `AssetNode`, détection de cycle, unicité de code)
- **Purpose**: référentiel hiérarchique et flexible d'actifs par client.
- **Current Consumers**: écran Structure Système, futur rattachement des modules d'évaluation (ACFC/Impact Assessment) à un nœud réel.
- **Data**: hiérarchie configurable + nœuds avec `audit_log`.
- **Business Value**: élevée — c'est déjà, sans le savoir, la meilleure approximation du modèle `Asset` de la cible dans tout le repo.
- **Target Equivalent**: `System/Subsystem/Equipment/Component` (§18 du master prompt, §6 du Master Architecture).
- **Migration Strategy**: **EXTEND** — ajouter `Function` comme entité séparée reliée en N:M, ajouter `ManufacturingContext` par-dessus; ne pas toucher à ce qui existe (cycle/unicité déjà testés et corrects).
- **Dependencies**: `useStructureSystemeStore.ts`, `useClientsStore.ts`.
- **Risk**: faible.
- **Regression Risk**: faible si extension additive.
- **Final Status**: **EXTEND**.

### Connecteurs GitHub / Drive
- **Purpose**: source de vérité (GitHub) + miroir de confort (Drive).
- **Current Consumers**: orchestrateurs de synchronisation, écrans de configuration client.
- **Data**: jeton d'accès, SHA de résolution de conflit.
- **Business Value**: élevée — c'est l'ossature de persistance de tout l'outil.
- **Target Equivalent**: `Connector` + `SyncJob` + `ExternalReference` génériques (§32 du package).
- **Migration Strategy**: **ADAPT** — extraire une interface `Connector` commune à partir des deux implémentations concrètes existantes, sans réécrire leur logique interne (déjà testée contre `fetch` mocké et vérifiée en navigateur réel).
- **Dependencies**: `useConnexionGitHubStore.ts`, `useConnexionDriveStore.ts`, `useSynchronisationStore.ts`, `useMiroirDriveStore.ts`.
- **Risk**: faible.
- **Regression Risk**: moyen si l'abstraction casse la gestion d'erreurs typées déjà fine.
- **Final Status**: **ADAPT**.

### Routeur IA / ProviderAdapter
- **Purpose**: bascule cloud/local, qualification de fiabilité par client.
- **Current Consumers**: chat expert (§4.4).
- **Data**: configuration IA par client, journal de session (jamais le contenu des messages).
- **Business Value**: élevée — déjà conforme aux règles de gouvernance IA de la cible sans avoir été conçu pour.
- **Target Equivalent**: `AI Gateway` (§45 du master prompt, §30 du Master Architecture).
- **Migration Strategy**: **KEEP**, étendre seulement les champs manquants (confidence, grounding explicite) quand un vrai besoin de génération IA de contenu (backlog #29) l'exigera.
- **Dependencies**: `envoyerAvecBascule.ts`, `qualificationFiabilite.ts`.
- **Risk**: faible.
- **Regression Risk**: faible.
- **Final Status**: **KEEP**.

### Export/import de section
- **Purpose**: JSON/Word/CSV/PDF, import JSON pour transfert entre postes.
- **Current Consumers**: tous les écrans de section.
- **Data**: contenu de section complet.
- **Business Value**: élevée — fonctionnalité de base attendue par tout utilisateur.
- **Target Equivalent**: sortie du `Deliverable Engine` (§26-27), une fois `ContentPlan`/`DeliverableVersion` construits par-dessus.
- **Migration Strategy**: **KEEP** les formats de sortie; **EXTEND** avec la traçabilité de provenance (quelles sources/versions ont produit ce document) quand le Deliverable Engine existera.
- **Dependencies**: `genererExportWord.ts`, `genererExportCSV.ts`, `genererExportJSON.ts`, `analyserImportJSON.ts`.
- **Risk**: faible.
- **Regression Risk**: faible.
- **Final Status**: **KEEP**.

### Résolution de conflit champ par champ
- **Purpose**: comparer deux versions d'une section et laisser l'utilisateur choisir champ par champ.
- **Current Consumers**: synchronisation GitHub.
- **Business Value**: moyenne-élevée — répond à un vrai risque de perte de données en environnement multi-poste.
- **Target Equivalent**: proche de la logique `Conflict` du package (§37 du master prompt), mais appliquée aux sections plutôt qu'aux `KnowledgeItem`.
- **Migration Strategy**: **KEEP**, réutilisable tel quel comme brique technique si un futur `Conflict` générique (source documentaire) est construit.
- **Dependencies**: `diffChamps.ts`.
- **Risk**: faible.
- **Regression Risk**: faible.
- **Final Status**: **KEEP**.

### Entité Client / ClientConfig
- **Purpose**: isolation des données et de la configuration par client.
- **Current Consumers**: tous les modules.
- **Business Value**: élevée — clé d'isolation utilisée partout.
- **Target Equivalent**: sous-ensemble d'`Organization`/`Workspace` (§3 du Master Architecture) — la cible veut une hiérarchie, l'existant est plat.
- **Migration Strategy**: **MIGRATE** à terme (pas urgent) — `Client` peut devenir un cas particulier d'`Organization` à un seul niveau plutôt qu'être remplacé; migration de `client_id` vers un `scope_id` résolu, progressive et non bloquante.
- **Dependencies**: quasiment tous les stores.
- **Risk**: élevé si fait trop tôt et mal (clé utilisée partout); élevé aussi si jamais fait (bloque le multi-site, scénario obligatoire de la cible).
- **Regression Risk**: élevé — à séquencer avec précaution, jamais en un seul commit.
- **Final Status**: **MIGRATE** (mais en dernier, pas en premier — dépend de tout le reste).

### Moteur de templates v1 (ancien prototype, jamais reconduit)
- **Purpose**: ancienne référence conceptuelle mentionnée au cadrage.
- **Current Consumers**: aucun — décision explicite du 22/08/2026 de ne reprendre ni code ni données.
- **Business Value**: nulle en l'état (déjà remplacé par le moteur de gabarits actuel, largement supérieur).
- **Target Equivalent**: aucun besoin de mapping, déjà couvert.
- **Migration Strategy**: rien à faire.
- **Final Status**: **DEPRECATE** (déjà fait, à documenter pour mémoire seulement).

---

## Composants construits depuis le 25/08/2026, classés le 03/09/2026

Ces composants n'existaient pas lors du premier passage et sont classés ici pour la première fois, sur la base des 3 audits indépendants du 03/09/2026.

### Reasoning Engine (`boucleRaisonnement.ts`, `useReasoningEngineStore.ts`, `outilsRaisonnement.ts`)
- **Purpose**: boucle multi-tour à appel d'outils, grounded sur Requirements/Tests/Evidence/KnowledgeItems/AssetNodes/Procedures, avec vérification déterministe de citation (une affirmation `connu` sans citation résolue est rétrogradée `a_verifier`).
- **Business Value**: élevée — c'est la brique la plus proche du "Reasoning Engine" cible (§11 du master prompt), et elle est déjà gouvernée (aucune écriture directe dans le domaine métier).
- **Target Equivalent**: Reasoning Engine + une partie du Reviewer (§62 du master prompt).
- **Migration Strategy**: **EXTEND** — outils supplémentaires (Process/Architecture/Procédure/Template comme outils appelables, déjà en P2 de `VISION_NORTH_STAR_CONVERGENCE.md`), pas de remplacement.
- **Final Status**: **KEEP/EXTEND**.

### Quality Events (`useQualityEventStore.ts`, `JournalAnomalies.vue`)
- **Purpose**: Change Control/Deviation/CAPA/Investigation/Audit Finding/Periodic Review, cross-référencés, non-bloquants par design.
- **Business Value**: élevée — seul point du repo qui alimente réellement une porte de blocage inter-module (readiness `ContentPlan`, voir ci-dessous).
- **Target Equivalent**: `QualityEvent` (§16, §41 du master prompt) — correspondance quasi exacte.
- **Migration Strategy**: **KEEP** — statut simple 3 valeurs (`ouvert/en_cours/cloture`), pas un state-machine complexe, conforme au principe "jamais un workflow figé à étapes obligatoires" du package.
- **Final Status**: **KEEP**.

### Readiness `ContentPlan` (`readinessContentPlan.ts`)
- **Purpose**: calcule `READY/NEEDS_INFORMATION/NEEDS_REVIEW/BLOCKED` en parcourant la chaîne réelle Requirement→Couverture→Test→Execution→Evidence, et bloque sur tout `QualityEvent` ouvert sur le même `asset_node_id`.
- **Business Value**: élevée — c'est une vraie porte de revue (§45/§62 du master prompt: "Le système ne doit pas produire silencieusement un document incomplet").
- **Target Equivalent**: la partie "Readiness Check" du pipeline Deliverable Engine (§45 du master prompt).
- **Migration Strategy**: **EXTEND** vers l'objet `DeliverableVersion` unifié plutôt que remplacer — le calcul lui-même est correct et testé.
- **Final Status**: **KEEP/EXTEND**.

### Risk Assessment AMDEC autonome (`useRiskAssessmentStore.ts`)
- **Purpose**: méthodologie AMDEC (S×O×D→IPR, seuil configurable par client) autonome, calquée sur un modèle réel trouvé dans Drive.
- **Business Value**: élevée — ferme un gap identifié dès l'origine (`calculerIPR.ts` n'existait qu'attaché au gabarit DQ).
- **Target Equivalent**: `RiskAssessment` (§14, §59 du master prompt).
- **Migration Strategy**: **EXTEND** — la connexion Risk→Requirement/Test (confirmée absente par l'audit domaine §8 du 03/09) reste à construire; c'est la limite actuelle la plus concrète de ce module.
- **Final Status**: **KEEP/EXTEND**.

### Knowledge Graph générique (`parcourirGraphe.ts`)
- **Purpose**: parcours BFS générique de graphe à arêtes typées, factorisé après 2 cas réels indépendants (Architecture Technique, Knowledge).
- **Business Value**: moyenne-élevée — infrastructure réutilisable, pas un cas d'usage isolé.
- **Target Equivalent**: composant transverse au Context Engine/Knowledge Graph (§47, master prompt).
- **Migration Strategy**: **KEEP** — règle de trois déjà respectée avant de généraliser, cohérent avec la discipline anti-sur-ingénierie du projet.
- **Final Status**: **KEEP**.

### Compliance Engine généralisé (`evaluerReglesConformite.ts`)
- **Purpose**: factorisation pure du patron règle→blocage, déjà répété 3 fois indépendamment avant d'être généralisé.
- **Business Value**: moyenne — réduction de duplication, comportement identique aux 3 call sites d'origine.
- **Target Equivalent**: approche générique des `DecisionRule`/`ApplicabilityRules` (§07 du package).
- **Migration Strategy**: **KEEP**.
- **Final Status**: **KEEP**.

### Source/Document Intelligence natif (DOCX/PDF/OCR)
- **Purpose**: parsing DOCX natif (texte/tableaux/images), PDF natif (`pdfjs-dist`), OCR Azure Vision réel (relais Cloudflare), chaîne Source→Extraction→KnowledgeItem→Confirmation gouvernée.
- **Business Value**: élevée — pilier majeur de la cible (§08/§20), passé de "Total (gap)" à "largement construit" en 9 jours.
- **Target Equivalent**: Document Intelligence pipeline (§08, §20 du master prompt) — texte/tableau seulement, pas diagramme (assumé, CHALLENGE-001).
- **Migration Strategy**: **EXTEND** — Excel reste bloqué (aucune librairie saine), diagram intelligence reste hors périmètre par choix assumé.
- **Final Status**: **KEEP/EXTEND**.

---

*Aucun composant classé `UNKNOWN` dans cette passe — chaque élément du repository a une utilisation et une valeur métier clairement identifiables. Prochain livrable: `ARCHITECTURE_CONFLICTS.md`.*
