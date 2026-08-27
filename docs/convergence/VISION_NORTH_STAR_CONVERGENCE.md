# Vision North Star — plan de convergence

*27/08/2026 — en réponse au document "VALIDAPHARM MASTER PRODUCT VISION / NORTH STAR" et à la "CAPABILITY & GAP ASSESSMENT CHECKLIST" transmis par l'utilisateur.*

## 0. Ce que ce document est, et n'est pas

Le document de vision (§53) demande 30 livrables d'architecture avant tout code. Produire 30 documents séparés et exhaustifs pour un plan qui va s'exécuter sur des dizaines de phases serait plus coûteux que le pilotage qu'ils sont censés servir — et c'est exactement le piège que la Règle 39 ("ne jamais construire un MVP incompatible avec le North Star") prévient sans l'imposer. Ce document consolide donc, en un seul endroit, la substance des points 1 à 27 (interprétation, état actuel, architecture cible, gap, priorités, roadmap), au même niveau de rigueur que `GAP.md`/`TECHNICAL_DECISIONS.md`/`CONVERGENCE_PLAN.md` produits en Phase 0 — et renvoie vers l'audit détaillé déjà livré (compte-rendu + artefact publié le 27/08/2026) pour le détail catégorie par catégorie de la checklist.

**Ce que ce document N'EST PAS** : un audit ligne par ligne des ~500 items de la checklist avec preuve fichier individuelle (§AJ du document 2). Cet audit exhaustif reste un chantier dédié, engageable domaine par domaine sur demande — voir §7.

## 1. Interprétation — la vision en une phrase

> Construire un système capable de connaître la réalité technique d'une entreprise pharmaceutique, comprendre ses processus et son architecture, comprendre le contexte d'un projet, lire et suivre les procédures du client (fournies ou découvertes), raisonner sur les impacts/risques/requirements/stratégies, puis produire le livrable dans le format exact attendu par le client, puis vérifier le résultat.

Trois "cerveaux" distincts, réunis par un seul raisonnement :

| Cerveau | Contenu | État actuel |
|---|---|---|
| **Métier** | Process, Equipment, System, PLC, SCADA, Server, CPP, CQA, Requirement, Risk | Partiel — solide sur Process/CPP/CQA/Requirement, quasi nul sur PLC/SCADA/Server |
| **Procédural** | SOP, WI, règle, condition, étape obligatoire, exception, responsabilité | Quasi absent |
| **Documentaire/client** | Word, Excel, PDF, template, questions, tableaux, numbering, signatures | Catalogue fermé propre à ValidaPharm, jamais au format exact d'un client |

Le principe central (vision §19/§45) : le moteur de raisonnement produit un **résultat sémantique**, indépendant du format ; un moteur documentaire séparé traduit ce résultat dans la structure exacte voulue par chaque client. Ce principe existe déjà, testé, à petite échelle (`MethodProfileACFC`/`EvaluationACFC`, Phase 1) — voir §4.

**Distinction imposée par la vision, appliquée strictement dans tout ce document** : NORTH STAR (les 15 couches de §38, sans compromis) ≠ CURRENT STATE (vérifié sur le code réel) ≠ MVP (le plus petit sous-ensemble qui prouve la boucle complète) ≠ INTERMEDIATE STATE (une étape entre les deux, jamais présentée comme l'un ou l'autre).

## 2. État actuel — synthèse (détail complet : audit publié le 27/08/2026)

Catégories de la checklist déjà vérifiées sur le code réel (types, moteurs, `package.json`) :

- **Solide et réutilisable** : Process/Parameter/CPP/CQA (Phase 2/4, jamais de promotion automatique), traçabilité Requirement→Test→Execution→Evidence (Phase 7a-7c, testée de bout en bout), garde-fous Human-in-the-loop (aucune `AIResponse` n'écrit directement dans le domaine métier), discipline provenance/confiance (`EtatConfianceIA`, Phase 15 — déjà exactement FACT/INFERENCE/ASSUMPTION/UNKNOWN), orchestrateur IA textuel avec trace et vérification de citation déterministe (Phase 15).
- **Précédent validé à généraliser, pas à réinventer** : `MethodProfileACFC`/`EvaluationACFC` (Phase 1, TD-002) sépare déjà résultat sémantique et rendu, avec un nombre de questions configurable par client, jamais figé dans le code.
- **Quasi absent** : Procedure Ingestion/Execution générique (aucune SOP n'est structurée en règles), Template Intelligence généralisée (le catalogue de gabarits est fermé, écrit en TypeScript par ValidaPharm), génération dans le format natif exact d'un client (l'export "Word" actuel est un HTML encapsulé en `.doc`, jamais un vrai OOXML ; aucun Excel, aucun PDF réel ; `package.json` ne contient aucune librairie de parsing/génération Office).
- **Correction par rapport à l'audit initial** : en creusant le modèle de données réel, la couche "Technical Architecture" (PLC/SCADA/Server) n'exige pas de nouvelles entités de nœud — `AssetNode`/`AssetHierarchySchema` (Phase 4/16) acceptent déjà des niveaux de hiérarchie nommés librement par le client (`level_key: string`, non contraint à une énumération) : un client peut d'ores et déjà créer des nœuds de type "PLC"/"SCADA"/"Serveur". Le vrai manquant, plus étroit qu'estimé initialement, est la **relation typée et dirigée** entre ces nœuds (contrôlé-par / connecté-à / hébergé-sur) — voir Phase 18 ci-dessous.

## 3. Architecture cible — mapping sur les 15 couches (§38)

| Couche vision | Équivalent / manquant dans ce dépôt |
|---|---|
| 1-2 Data sources / Ingestion | OCR image (Azure AI Vision, Phase 6) — manque parsing Office natif |
| 3-4 Document Intelligence / Knowledge extraction | `Source→SourceVersion→Extraction→ExtractionItem→KnowledgeItem` (Phase 8a) — faits plats, pas de structuration règle/condition |
| 5 Knowledge Graph | Jointures typées ad hoc (`Couverture`, `ProvenanceLink`…) — pas de graphe générique interrogeable |
| 6 Context Engine | `ContextSnapshot` (Phase 14) — liste d'objets résolus, pas un narratif WHY/WHAT/WHERE/HOW/IMPACT |
| 7 Process Engine | `Process`/`Parameter`/`CPP`/`CQA` (Phase 2/4) — solide |
| 8 Technical Architecture Engine | `AssetNode` + (à ajouter) relations typées — Phase 18 |
| 9 Procedural Knowledge Engine | Absent — futur chantier P0 |
| 10 Template Intelligence Engine | `MethodProfileACFC` (précédent étroit) — à généraliser |
| 11 Reasoning Engine | Boucle textuelle à appel d'outils (Phase 15) — 4 outils, à étendre |
| 12 Deliverable Engine | Absent (`ContentPlan` planifie un livrable déjà décidé, ne détermine pas lesquels sont nécessaires) |
| 13 Document Generation Engine | Word (HTML-trick)/CSV/JSON — pas de sortie au format client |
| 14 Compliance Engine | `verifierBlocageExport.ts` (un seul statut vérifié) — à généraliser |
| 15 Review/Approval | Statuts de section + `Confirmation` — solide |

## 4. Roadmap de convergence (priorités P0-P3, cf. audit du 27/08/2026)

**P0 — bloquants architecturaux** (sans eux aucun scénario complet de la vision n'est démontrable) :
1. **Phase 18 — Architecture Technique** (relations typées AssetNode↔AssetNode) — **Terminée**, voir `PHASE_18_ARCHITECTURE_TECHNIQUE_SPEC.md`.
2. **Phase 19 — Ingestion Office native** (lecture `.docx`) — **Terminée**, voir `PHASE_19_INGESTION_OFFICE_SPEC.md`/TD-014. Excel reste bloqué faute de librairie saine (limite assumée, pas un oubli).
3. Cerveau procédural (Procedure Ingestion + Execution) — non engagée. Peut désormais s'appuyer sur une SOP `.docx` réellement lue (Phase 19), ou une SOP saisie/collée en texte en attendant une couverture Excel/PDF.
4. Template Intelligence généralisée + génération au format client réel — non engagée. `docxtemplater`+`pizzip` pré-choisis (TD-014), non installés.

**P1 — critique** : Context Engine enrichi (narratif WHY/WHAT/WHERE/HOW/IMPACT), Deliverable Intelligence, Compliance Engine généralisé, Risk/Impact Assessment à méthodologie client généralisée, Knowledge Graph générique.

**P2 — important** : extension des outils du Reasoning Engine (Process/Architecture/Procédure/Template comme outils appelables), proactivité, génération de tests contextualisée.

**P3 — amélioration continue** : Procedure Discovery (optionnelle selon la vision elle-même), extension systématique de la discipline provenance/confiance aux futurs moteurs.

Chaque item ci-dessus, quand il est engagé, suit la discipline déjà en place depuis la Phase 1 : Spec → (revue panel E1-E7 si nouveau domaine) → Implémentation → Vérification (tests + typecheck + lint + navigateur réel si UI) → Alignement documentaire (URS/FS) → Commit/Push → mise à jour de la table de suivi de `CONVERGENCE_PLAN.md`.

## 5. Pourquoi commencer par la Phase 18

Parmi les 4 chantiers P0, l'Architecture Technique est la seule à ne nécessiter **aucune nouvelle dépendance externe** ni recherche préalable (contrairement à l'ingestion Office, qui exige un choix de librairie documenté) — c'est un ajout de domaine pur (types + Dexie + store + fonction pure), suivant exactement le patron déjà validé et testé des jointures typées existantes (`Couverture`, `ContextSnapshotItem`). Elle débloque directement :
- le scénario TEST 6 de la checklist (tracer Equipment→PLC→SCADA→Server) ;
- une partie de la catégorie V (CSV/CSA Intelligence, qui suppose de savoir *quoi* évaluer avant de savoir *comment*) ;
- un nouvel outil concret pour le Reasoning Engine, renforçant l'AF/AG déjà le mieux positionné du dépôt.

## 6. Ce qui reste délibérément hors de cette phase

- Aucune notion de "Software"/"Application"/"Database"/"Network" comme entités séparées : ce sont, comme PLC/SCADA/Server, des `AssetNode` avec un `level_key` approprié — aucune nouvelle entité n'est nécessaire pour elles non plus.
- Aucune détection de cycle sur les relations techniques : `associated_nodes[]` (graphe libre) tolère déjà les cycles par conception documentée ; les relations typées suivent la même tolérance, pour ne pas imposer une contrainte que la vision ne demande pas.
- Aucun écran dédié dans ce lot (même discipline que les Phases 5/8a/9/10/13 : domaine + persistance + store + outil de raisonnement d'abord, écran quand un cas d'usage réel le réclame).

## 7. Prochaine étape après la Phase 19

Chantier P0 suivant : le cerveau procédural (Procedure Ingestion + Execution — item 3 du §4). Peut s'appuyer sur `extraireTexteDocx` (Phase 19) pour lire une SOP réelle fournie par l'utilisateur, en généralisant le patron déjà validé de `MethodProfileACFC` (versionné, immuable, appliqué pas à pas) à une entité `Procedure` structurant le texte en étapes/conditions/exceptions/responsabilités.
