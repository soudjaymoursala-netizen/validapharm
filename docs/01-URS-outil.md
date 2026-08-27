# URS — User Requirement Specification de l'outil ValidaPharm

| | |
|---|---|
| **Référence** | URS-VALIDAPHARM-2026-001 |
| **Version** | 50 (extension §4.26/URS-F-260quinquies à septies — Phase 21 (extension), 27/08/2026, TD-018 ; en réponse à la question explicite de l'utilisateur sur la couverture de "tous les types" de SOP — un 3ᵉ document réel du corpus Drive testé sans couverture (IMA "4915BRP", 0 section reconnue), puis à sa demande de maximiser la couverture sans IA avant tout repli : reconnaissance de section par mot-clé, sous-titre numéroté retenu comme contexte d'étape, repli ligne-par-ligne quand aucune puce/numéro n'est présent — voir URS-F-260septies pour la limite de fond qui subsiste). Version 49 (ajout §4.26/URS-F-260 à quater — Parseur déterministe de structure procédurale, Phase 21 de convergence architecturale, 27/08/2026, `docs/convergence/PHASE_21_PARSEUR_STRUCTURE_PROCEDURE_SPEC.md`, TD-017 ; en réponse à la question explicite de l'utilisateur sur la nécessité de l'IA pour lire/comprendre/suivre une procédure — détection de sections canoniques (objectif/périmètre/responsabilités/définitions/procédure/références/documentation/annexes) et d'étapes candidates par motif, calibrée sur 2 SOP réelles de clients différents lues intégralement dans Google Drive avant conception (Sanofi Lyon, Ferring International Center) ; aucun appel IA ; reste une proposition, jamais écrite sans confirmation humaine — voir URS-F-260quater). Version 48 (ajout §4.25/URS-F-250 à quater — Cerveau procédural, `Procedure`/`ProcedureStep`, Phase 20 de convergence architecturale, troisième phase du plan `docs/convergence/VISION_NORTH_STAR_CONVERGENCE.md`, 27/08/2026, `docs/convergence/PHASE_20_PROCEDURAL_KNOWLEDGE_SPEC.md`, TD-016 ; structuration versionnée d'une SOP par un humain, même patron que `SourceVersion` ; nouvel outil du Reasoning Engine `lister_etapes_procedure` ; aucune extraction automatique de structure par IA — point ouvert pour une décision produit ultérieure, voir URS-F-250quater). Version 47 : complément §4.15/URS-F-150nonies-decies — images incorporées d'un `.docx` (schémas/photos), Phase 19 complétée, 27/08/2026, TD-015 ; en réponse à une observation explicite de l'utilisateur : une SOP réelle n'est pas toujours du texte seul, et pas toujours un scan propre sans filigrane ; `extraireImagesDocx` combiné à l'OCR existant (§4.15) pour les images, aucune détection/correction automatique de filigrane — voir URS-F-150decies). Version 46 : extension §4.15/URS-F-150septies-octies — ingestion Office native (`.docx`), Phase 19 de convergence architecturale, deuxième phase du plan `docs/convergence/VISION_NORTH_STAR_CONVERGENCE.md`, 27/08/2026, `docs/convergence/PHASE_19_INGESTION_OFFICE_SPEC.md`, TD-014 ; extraction locale sans appel réseau via `jszip`+`DOMParser` — `mammoth` évalué puis abandonné, incompatible avec la résolution de modules des tests ; ingestion Excel bloquée faute de librairie saine — voir URS-F-150octies). Version 45 : ajout §4.24/URS-F-240 à quater — Architecture Technique, relations typées entre `AssetNode` (`controle_par`/`connecte_a`/`heberge_sur`), Phase 18 de convergence architecturale, première phase du plan `docs/convergence/VISION_NORTH_STAR_CONVERGENCE.md`, 27/08/2026, `docs/convergence/PHASE_18_ARCHITECTURE_TECHNIQUE_SPEC.md`, TD-013 ; répond au document "VALIDAPHARM MASTER PRODUCT VISION / NORTH STAR" ; aucune nouvelle entité d'équipement — réutilise `AssetNode`/`AssetHierarchySchema` déjà libres par client ; nouvel outil du Reasoning Engine `tracer_chaine_technique` — voir URS-F-240quater). Version 44 : ajout §4.23/URS-F-230 à quinquies — Mission workspace, Phase 17 de convergence architecturale, dernière phase du plan Phases 13-17, 27/08/2026, `docs/convergence/PHASE_17_MISSION_WORKSPACE_SPEC.md`, TD-010/TD-012 ; câble effectivement Mission/Activity (§4.19), ContextSnapshot (§4.20) et Reasoning Engine (§4.21) dans des écrans réels ; aucune section Assessment/Requirement/Test/Evidence rattachée à la Mission, aucun indicateur de "Validation State" — voir URS-F-230quinquies). Version 43 : ajout §4.22/URS-F-220 à quinquies — Coquille UX, sidebar/Accueil/mode dual, Phase 16 de convergence architecturale, 26/08/2026, `docs/convergence/PHASE_16_COQUILLE_UX_SPEC.md` ; répond à la critique UX explicite de l'utilisateur ; vérifié dans un navigateur réel, aucune erreur console ; aucune différenciation Expert/Assistant réelle sur les écrans existants — voir URS-F-220quinquies). Version 42 : ajout §4.21/URS-F-210 à sexies — Reasoning Engine, domaine AI, Phase 15 de convergence architecturale, 26/08/2026, `docs/convergence/PHASE_15_REASONING_ENGINE_SPEC.md`, TD-007/TD-008 ; protocole textuel d'appel d'outils entièrement côté navigateur — aucun support natif fournisseur, relais inchangé ; vérification de citation déterministe non négociable ; Risk/AIModelVersion/AIEvaluation explicitement non construits — voir URS-F-210sexies). Version 41 : ajout §4.20/URS-F-200 à quater — `ContextSnapshot` généralisé, domaine Context, Phase 14 de convergence architecturale, 26/08/2026, `docs/convergence/PHASE_14_CONTEXT_ENGINE_SPEC.md` ; généralise `resoudreRegleEffective`/`ancetresWorkspace`/`noeudsVisiblesDepuisWorkspace`, jusqu'ici câblés sur le seul store Structure Système ; résolution de méthode applicable/documents pertinents explicitement non construite — voir URS-F-200quater). Version 40 : ajout §4.19/URS-F-190 à quinquies — `Mission`/`Activity`, domaine Work, Phase 13 de convergence architecturale, 26/08/2026, `docs/convergence/PHASE_13_MISSION_ACTIVITY_SPEC.md`, TD-009 ; référence directe `Mission → Requirement/Assessment/Test/Evidence/Deliverable` et `Activity produces Evidence` explicitement non construites — voir URS-F-190quinquies). Version 39 : ajout URS-F-100undecies/duodecies — câblage effectif du premier store métier sur `Workspace` (§4.10, référentiel d'actifs), 26/08/2026, `docs/convergence/CABLAGE_ETAPE_1_STRUCTURE_SYSTEME_SPEC.md` ; ajout additif et rétrocompatible, aucune régression sur les 431 tests préexistants, premier incrément du chantier "câblage" annoncé en Phase 11). Version 38 : ajout §4.18/URS-F-180 — hiérarchie Organization/Workspace, Phase 11 de convergence architecturale, 25/08/2026 ; migration la plus risquée du plan TD-006, engagée sur demande explicite de l'utilisateur ; Organization.id préserve l'id du Client d'origine, aucune table existante modifiée). Version 37 : ajout §4.17/URS-F-170 — Integration Gateway générique, Phase 10 de convergence architecturale, 25/08/2026 ; connecteurs GitHub/Google Drive (ADAPT, TD-005), Veeva Vault (squelette vérifié par recherche web), SharePoint/dossier réseau/EDMS générique (type modélisé, adaptateur non implémenté faute de point d'accès concret), anticipés sur demande explicite de l'utilisateur). Version 36 : **réalignement des Phases 7a/7b/8a/9 sur le vrai modèle cible**, 25/08/2026 — Google Drive reconnecté en cours de session, lecture directe intégrale des 17 documents du package source jusqu'ici lus partiellement/de mémoire : §4.12/URS-F-120ter-quater — `TestCandidate` passe de 3 à 7 statuts réels (PROPOSED/NEEDS_INFORMATION/NEEDS_REVIEW/ACCEPTED/REJECTED/DUPLICATE/SUPERSEDED, `10_TEST_ENGINE.md`) ; §4.13/URS-F-130sexies — `ExecutionEvent` aligné sur le moteur de décision réel (continuer/action/retest/déviation/changement/arrêt/externe, §29/DEC-056) ; §4.15/URS-F-150 — `Source Intelligence` reconstruite sur la vraie chaîne `Source→SourceVersion→Extraction→ExtractionItem→KnowledgeItem` + `SourceLocation`/`Confirmation`/`KnowledgeRelation` (`03_DOMAIN_DATA_MODEL.md`) ; §4.16/URS-F-160sexies-septies — ajout de `readiness` sur `ContentPlan` (§26). Chaque correction testée explicitement, aucune régression. Version 35 : ajout §4.16/URS-F-160 — ContentPlan, planification d'un livrable, Phase 9 de convergence architecturale, 25/08/2026 ; ne couvre que la planification, la génération/le rendu du moteur de gabarits existant restent hors périmètre). Version 34 : ajout §4.15/URS-F-150 — Source/Document Intelligence, structuration assistée, Phase 8a de convergence architecturale, 25/08/2026 ; 8b — compréhension de schémas complexes — non engagée, TD-004). Version 33 : ajout §4.14/URS-F-140 — Evidence, dernière sous-étape de la Phase 7 de convergence architecturale, 25/08/2026 ; clôture la traçabilité Requirement→Test→Execution→Evidence). Version 32 : ajout §4.13/URS-F-130 — exécution d'un Test approuvé, Phase 7b de convergence architecturale, 25/08/2026). Version 31 : ajout §4.12/URS-F-120 — chaîne de définition Requirement → TestObjective → TestCandidate → Test, Phase 7a de convergence architecturale, 25/08/2026 ; moteur générique sous-jacent aux familles C/I du catalogue §10, jusqu'ici sans requirement dédié). Version 30 : intégration des exigences manquantes de la Target Architecture, 25/08/2026, en réponse à une question explicite de l'utilisateur : ajout §4.6quater/URS-F-058 — Parameter/CriticalParameter/CPP/CQA, Phase 2, oublié au moment de son implémentation — et §4.11/URS-F-110 — Quality Events, famille H, Phase 5, jusqu'ici sans requirement dédié malgré la mention catalogue. Version 29 : ajout §4.10bis/URS-F-103 — Function/Process/ManufacturingContext, Phase 4 de convergence architecturale, 25/08/2026, EXTEND pur du référentiel d'actifs §4.10 déjà existant. Version 28 : clôture des points ouverts de la convergence architecturale — correction d'une collision d'ID, URS-F-040 désignait à tort 2 exigences distinctes, §4.4bis renumérotée URS-F-039bis — et ajout §4.6bis/URS-F-056 — Impact Assessment/System Classification — et §4.6ter/URS-F-057 — Computer System Assessment —, désormais réellement implémentés (Phase 3 de convergence architecturale, 25/08/2026) ; aucun requirement n'existait encore pour ces 2 briques du catalogue §10, seulement une ligne descriptive. Version 27 : §4.6/URS-F-050 corrigé pour refléter la méthode ACFC réellement implémentée en Phase 1 — questionnaire Oui/Non configurable par client, jamais une grille de critères pondérés fixe ; ajout URS-F-050quater. Version 26 : correction famille F — séparation Impact Assessment/System Classification, Analyse de risque (ACFC/AMDEC/FRA), Computer System Assessment en 3 briques séquentielles distinctes, modèle d'impact binaire ; retrait de la référence à un gabarit CSV non implémenté — Phase 0 de convergence architecturale, 25/08/2026) |
| **Statut** | En rédaction |
| **Système concerné** | ValidaPharm (assistant de rédaction qualité CQV/CSV/QA — pharma & dispositifs médicaux) |
| **Catégorie GAMP 5 envisagée** | Catégorie 5 — Logiciel sur mesure (bespoke), avec composants de catégorie 3/4 (bibliothèques, éventuel LLM local) — confirmée par revue multi-experts |
| **Document de référence** | `00-cadrage-projet.md`, `REV-URS-VALIDAPHARM-2026-001` à `010` v01 (closes), `AUDIT-SWISSMEDIC-VALIDAPHARM-2026-001/002/003` v01, `AUDIT-FDA-VALIDAPHARM-2026-001/002/003` v01, `AUDIT-CABINET-GXP-VALIDAPHARM-2026-001` v01, `AUDIT-QA-SPECIALISES-VALIDAPHARM-2026-001` v01 (closes), `AR-VALIDAPHARM-2026-001` v26, `03-specifications-fonctionnelles.md` v11, `16-FDS-outil.md` v14, `22-SDS-outil.md` v12 |
| **Rédigé par** | — |
| **Vérifié par** | — |
| **Approuvé par** | — |

---

## 1. Objet

Ce document définit les exigences utilisateur de l'outil **ValidaPharm** lui-même, en tant que système à concevoir, développer et — à terme — valider selon une approche basée sur le risque (GAMP 5). Il constitue le point d'entrée de la traçabilité : chaque exigence ci-dessous devra être tracée vers une spécification fonctionnelle (FS), une implémentation, et un test de qualification (IQ/OQ/PQ de l'outil).

Ce document ne couvre pas le contenu réglementaire détaillé de chaque type de livrable (couvert par les gabarits eux-mêmes, §10) mais l'ensemble des capacités que l'outil doit offrir.

## 2. Contexte et justification métier

L'utilisateur (professionnel qualité/validation en pharma et dispositifs médicaux, exerçant pour son propre compte et/ou pour des clients) rédige régulièrement des livrables CQV/CSV/QA dans le cadre de projets (ex. achat d'un nouvel équipement, changement sur un équipement qualifié). L'outil vise à :
- réduire le temps de rédaction et fiabiliser le raisonnement technique/réglementaire,
- structurer systématiquement les livrables selon un canevas conforme aux normes applicables,
- organiser les livrables d'un même projet entre eux (traçabilité, cohérence),
- suggérer des idées de tests et des stratégies de qualification, toujours comme propositions soumises à décision humaine,
- fournir un point d'accès rapide à un chat expert du domaine,
- garantir qu'aucune donnée n'est perdue, quel que soit le poste de travail utilisé,
- poser, dès la conception, les bases d'un usage en équipe et d'une validation formelle de l'outil.

**Priorité de conception Phase 1** *(URS-NF-043)* : la fiabilité et le caractère défendable GMP du **contenu et du raisonnement** produits par l'outil priment sur l'automatisation du workflow d'approbation. Par défaut, tous les livrables restent au statut "brouillon d'aide" ; le cycle "validé en interne" reste disponible mais n'est pas requis pour l'usage courant.

## 3. Définitions et abréviations

| Terme | Définition |
|---|---|
| Projet | Conteneur regroupant les sections (livrables) relatives à un même sujet (ex. achat d'un équipement, gestion d'un changement) |
| Section | Instance d'un gabarit rattachée à un projet (ex. la section "URS" du projet "Nouvel isolateur") |
| Livrable / Document | Terme générique pour une section produite dans l'outil |
| Outil / Mini-outil | Regroupement des gabarits par famille (outil) et sous-type (mini-outil) — voir catalogue §10 |
| Gabarit / Module | Modèle structurel d'un type de document |
| Brouillon d'aide | Statut d'un livrable non approuvé formellement dans l'outil |
| Approuvé dans l'outil | Nom technique interne du statut (utilisé dans les exigences, le modèle de données et l'audit_log) d'un livrable dont le cycle de revue a été mené dans l'outil. **Libellé affiché à l'utilisateur** (seul texte visible à l'écran, cf. URS-F-011bis) : *"validé en interne — pas une signature électronique opposable"*. Ne constitue pas une signature électronique opposable. |
| Chat expert | Module conversationnel distinct, dédié aux questions normatives générales et à l'assistance contextuelle |
| Source de vérité | Le dépôt Git dédié, qui fait foi en cas de divergence avec la copie miroir |

## 4. Exigences fonctionnelles

### 4.0 Gestion de projets *(nouveau — Must, Phase 1)*

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-000 | Le système DOIT permettre de créer un Projet comme conteneur regroupant plusieurs sections liées entre elles, avec un nom, un contexte, une portée/hors-portée et un délai. | Must |
| URS-F-000bis | Le système DOIT permettre d'ajouter/retirer des sections à un Projet à tout moment, chaque section étant une instance d'un gabarit du catalogue (§10). | Must |
| URS-F-000ter | Le système DOIT permettre de lier explicitement une section à une ou plusieurs autres sections du même projet, et de visualiser ces liens sous forme de vue de traçabilité (cette vue remplace/généralise le module "Cycle en V/VMP" — voir §10.I). | Should (le lien manuel simple est Must Phase 1 ; la vue automatique peut être affinée en Phase 2) |
| URS-F-000quater | Le système DOIT permettre, au sein d'un projet, une section "Documents" pour charger des fichiers de référence (documentation technique fournisseur, manuels utilisateur, SOP, procédures internes du client). Ces documents DOIVENT être clairement identifiés comme références de travail, non comme documents maîtres du QMS du client, avec horodatage de chargement visible. | Must |
| URS-F-000quinquies | Toute génération assistée par IA (§4.1bis, §4.6) DOIT pouvoir s'appuyer, via l'action explicite déjà prévue (URS-F-031), sur les sections et documents déjà présents dans le même projet. | Should |
| URS-F-000sexies | Toute création/modification d'un lien entre sections DOIT être journalisée (qui, quand, quel lien) dans l'audit_log du projet. | Must |
| URS-F-000septies | *(nouveau v06)* Le système DOIT permettre de créer, au sein d'un projet, une section "Contexte procédé" structurée (description du procédé, paramètres critiques procédé — CPP, attributs qualité critiques produit — CQA, conditions opératoires visées, références aux validations de procédé existantes), liable aux autres sections (URS, ACFC, DQ, Protocoles, Validation de procédé). Sans cette section, les autres analyses risquent d'être mal informées (voir AR R-26). | Must |
| URS-F-000octies | *(nouveau v08 — revue FS, E6 Métrologie)* Le système DOIT bloquer la finalisation d'une section IQ tant qu'aucun lien vers une section "Plan de métrologie/étalonnage" (catalogue §10.L) du même projet n'existe. Cohérent avec le traitement déjà appliqué au Contexte procédé (URS-F-000septies) — même mécanisme de garde-fou. | Must |
| URS-F-000nonies | *(nouveau v08 — revue FS, E7 Maintenance)* Le système DOIT bloquer la clôture d'une section OQ tant qu'aucun lien vers une section "Plan de maintenance préventive" (catalogue §10.M, Annexe 15 §3.12) du même projet n'existe. Même mécanisme de garde-fou que URS-F-000septies/000octies. | Must |

### 4.1 Rédaction guidée de livrables

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-001 | Le système DOIT permettre de créer une section à partir d'un gabarit, parmi les types définis dans le catalogue des gabarits (§10 — outils et mini-outils). | Must |
| URS-F-002 | Le système DOIT structurer chaque livrable en sections conformes à la pratique du domaine (en-tête document, corps, historique des révisions, bloc d'approbation). | Must |
| URS-F-003 | Le système DOIT permettre la saisie de champs texte, texte long, listes déroulantes, dates, nombres, et tableaux à lignes dynamiques (ajout/suppression). | Must |
| URS-F-004 | Le système DOIT calculer automatiquement les valeurs dérivées définies par une norme (ex. IPR = S×O×D en AMDEC) sans intervention manuelle ni IA générative. | Must |
| URS-F-004bis | Le système DOIT enregistrer, dans les métadonnées de chaque livrable, l'identifiant de version du moteur de calcul utilisé. | Must |
| URS-F-005 | Le système DOIT permettre d'associer à chaque livrable une ou plusieurs références normatives affichées à l'utilisateur pendant la rédaction. | Must |
| URS-F-006 | Le système DEVRAIT adapter le contenu proposé au contexte du livrable sans jamais insérer automatiquement du texte non validé dans le corps final. | Should |
| URS-F-007 | Le système DEVRAIT proposer des idées de tests à titre de suggestions consultables séparément, jamais pré-remplies sans action explicite. | Should |
| URS-F-008 | Le système DOIT permettre de dupliquer une section existante. | Should |
| URS-F-009 | Le système DOIT empêcher la perte de données lors de la saisie (sauvegarde automatique locale). | Must |

### 4.1bis Génération de brouillon par adaptation d'un document de référence *(nouveau — Should, garde-fous Must)*

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-060 | Le système DEVRAIT permettre de générer un brouillon complet d'une section en s'appuyant sur un document de référence fourni par l'utilisateur (joint via URS-F-031, éventuellement issu du même projet via URS-F-000quinquies) et sur le contexte du nouveau cas, en adaptant la structure, le langage et le raisonnement du document de référence. | Should |
| URS-F-061 | Tout contenu généré par cette fonction DOIT rester au statut "proposé par IA — non validé" **section par section**, et NE DOIT PAS être considéré comme faisant partie du contenu officiel tant que l'utilisateur n'a pas explicitement validé/édité chaque section — jamais de validation globale en un clic. | Must |
| URS-F-062 | Avant d'utiliser un document de référence pour cette fonction, le système DOIT demander une confirmation explicite que l'utilisateur dispose du droit d'utiliser ce document comme base (propriété intellectuelle / confidentialité, notamment vis-à-vis d'un autre client). | Must |
| URS-F-063 | Toute donnée technique/numérique (valeur, tolérance, critère d'acceptation) reprise ou adaptée depuis le document de référence DOIT être visuellement signalée dans le brouillon généré. | Must |
| URS-F-064 | Le livrable généré DOIT conserver, dans ses métadonnées/historique, la référence du document source utilisé pour la génération. | Must |

### 4.2 Statuts et cycle de vie d'un livrable

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-010 | Le système DOIT permettre de marquer un livrable "brouillon d'aide" ou d'engager un cycle "approuvé dans l'outil", au choix de l'utilisateur. | Must |
| URS-F-011 | Le système DOIT exiger le renseignement des rôles rédacteur/vérificateur/approbateur avant le passage au statut "approuvé". | Must |
| URS-F-011bis | Le système DOIT afficher explicitement que le statut "approuvé dans l'outil" (libellé retenu : "validé en interne — pas une signature électronique opposable") ne constitue pas une signature électronique réglementaire (21 CFR Part 11 / Annexe 11) tant que l'authentification et la non-répudiation ne sont pas implémentées (Phase 3). | Must |
| URS-F-012 | Le système NE DOIT PAS permettre la modification du corps d'un livrable approuvé sans nouvelle révision tracée. | Must |
| URS-F-013 | Le système DOIT conserver l'intégralité de l'historique des versions (aucune suppression silencieuse). | Must |

### 4.2bis Workflows de rédaction, revue et approbation *(nouveau v06 — architecture anticipée dès la Phase 1, activation Phase 3)*

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-014 | Le système DOIT concevoir le cycle de vie d'un livrable comme trois workflows distincts — rédaction/co-rédaction, revue, approbation — même si l'activation de signatures formelles reste hors périmètre Phase 1 (§8). | Must |
| URS-F-014bis | Le workflow de rédaction/co-rédaction DOIT permettre d'ajouter/retirer des auteurs à tout moment sur une section donnée, avec attribution des contributions dans l'audit_log. | Must |
| URS-F-014ter | Le workflow de revue DOIT permettre plusieurs relecteurs, chacun pouvant émettre un avis/commentaire distinct, avant transmission au workflow d'approbation. | Should |
| URS-F-014quater | Le workflow d'approbation DOIT prévoir un rôle "Approbateur final" typé (ex. QA), distinct des autres rôles, cohérent avec une gouvernance qualité réelle. | Should |
| URS-F-014quinquies | Ces workflows DOIVENT être conçus comme une extension du modèle de statuts existant (URS-F-010/011), sans activation de signature électronique en Phase 1 (URS-F-011bis reste valable). | Must |

### 4.3 Export et interopérabilité

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-020 | Export Word (éditable) et PDF (impression). | Must |
| URS-F-021 | Export/import JSON de l'ensemble des données. | Must |
| URS-F-022 | Export CSV/XLSX pour AMDEC/registre de risques. | Should |
| URS-F-028 | *(nouveau v06)* Les exports DOIVENT être disponibles dans la langue de rédaction du livrable (cohérent avec URS-NF-040), avec un contenu équivalent quelle que soit la langue. | Should |
| URS-F-028bis | *(nouveau v09 — audit Swissmedic simulé, MIN-01)* Un test de non-régression de contenu (même principe que URS-F-025 pour les gabarits d'export client) DOIT vérifier l'équivalence de contenu entre les versions linguistiques d'un même gabarit — traitement symétrique à celui déjà exigé pour les gabarits personnalisés. | Should |
| URS-F-028ter | *(nouveau v10 — audit FDA simulé, MAJ-FDA-01/02)* Lors de l'export d'un livrable au statut "validé en interne", le système DOIT afficher un rappel explicite que la responsabilité de conformité et de conservation réglementaire (durée légale applicable selon la predicate rule concernée — ex. 21 CFR 820.180 pour les dispositifs médicaux) est transférée au système qualité du client dès la reprise formelle du livrable — ValidaPharm n'étant pas le système d'enregistrement officiel tant que cette reprise n'a pas eu lieu (voir §6, analyse predicate rules). | Must |

### 4.3bis Gabarits d'export personnalisés (templates client) *(nouveau — confirmé important par l'utilisateur)*

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-023 | Le système DEVRAIT permettre d'associer à un client/organisation un gabarit d'export personnalisé (Word/PDF/Excel) fourni par l'utilisateur, en plus du gabarit par défaut de l'outil. | Should |
| URS-F-024 | Le système DOIT permettre de gérer plusieurs gabarits d'export personnalisés, isolés par client/organisation — jamais de mélange entre deux clients (propriété intellectuelle du client). | Must |
| URS-F-025 | Lorsqu'un gabarit personnalisé est utilisé, le système DOIT produire un document dont le contenu est identique à celui produit avec le gabarit par défaut — seule la mise en forme diffère. Un test de non-régression DOIT vérifier cette équivalence de contenu. | Must |
| URS-F-026 | Lors de la configuration d'un gabarit personnalisé, le système DOIT permettre de vérifier que les éléments obligatoires (bloc de signatures, historique des révisions) sont bien mappés dans le template client. | Must |
| URS-F-027 | *(nouveau — REV-URS-002 §3.1)* Le système DOIT avertir explicitement, et bloquer par défaut, l'export d'un livrable contenant encore des sections au statut "proposé par IA — non validé" (URS-F-061), quel que soit le gabarit d'export utilisé (par défaut ou personnalisé). L'utilisateur DOIT pouvoir forcer l'export malgré l'avertissement, action alors journalisée. | Must |
| URS-F-027bis | *(nouveau v11 — revue FDS, E2)* Toute action de forçage d'un garde-fou non négociable (export forcé URS-F-027, blocages de liens forcés URS-F-000septies/octies/nonies) DOIT capturer un motif texte obligatoire de l'utilisateur avant validation, en plus de l'horodatage et de l'acteur déjà journalisés (URS-NF-030). Un journal d'audit "qui/quand" sans "pourquoi" a une valeur probante limitée en inspection. | Must |

### 4.4 Chat expert

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-030 | Le système DOIT fournir un module de chat séparé de l'espace de rédaction, dédié aux questions normatives et méthodologiques du domaine pharma/DM. | Must |
| URS-F-031 | Le chat expert NE DOIT PAS avoir accès par défaut au contenu des livrables ; l'accès à un document précis DOIT être une action explicite et visible. | Must |
| URS-F-032 | *(amendé v05)* Le système DOIT utiliser un ou plusieurs services cloud IA **configurables** (Claude par défaut) comme moteur principal quand le réseau le permet, avec possibilité de sélectionner/ajouter un autre fournisseur (ex. OpenAI/ChatGPT, GitHub Copilot, DeepSeek, autres) selon les contraintes du client. | Must |
| URS-F-032bis | *(nouveau v05)* Le choix du fournisseur cloud DOIT être configurable au niveau client/organisation (cohérent avec l'isolation par client URS-F-024), pas seulement comme réglage global de l'outil — pour respecter les contraintes contractuelles propres à chaque client (ex. accord de traitement des données déjà en place avec un fournisseur donné). | Must |
| URS-F-032ter | *(nouveau v05)* Avant d'activer un nouveau fournisseur cloud pour un client, le système DOIT afficher un rappel explicite que les conditions de traitement des données (rétention, entraînement sur les données, localisation) diffèrent selon le fournisseur, et nécessitent une vérification préalable par l'utilisateur. | Must |
| URS-F-032quater | *(nouveau v07 — auto-challenge)* Avant d'activer un nouveau fournisseur cloud pour un usage réel (pas seulement ses conditions de traitement des données, URS-F-032ter), une **qualification de la fiabilité de ses réponses** sur un échantillon de questions-types du domaine pharma/DM DOIT être réalisée et consignée — la fiabilité d'un fournisseur ne se présume pas identique à celle d'un autre. | Must |
| URS-F-032quinquies | *(nouveau v08 — revue FS, E1)* Le système DOIT détecter un changement de version du modèle/moteur sous-jacent d'un fournisseur actif depuis la dernière qualification de fiabilité consignée (en comparant la version journalisée par session, URS-F-037, à la version qualifiée), et alerter l'utilisateur qu'une re-qualification est recommandée avant de poursuivre un usage réel. Une qualification initiale ne se présume pas valide indéfiniment (dérive silencieuse côté fournisseur). | Must |
| URS-F-032sexies | *(nouveau v09 — audit Swissmedic simulé, MAJ-02)* L'échantillon de questions-types utilisé pour la qualification de fiabilité (URS-F-032quater) DOIT être versionné comme artefact contrôlé indépendant, distinct et stable dans le temps, pour garantir la comparabilité entre la qualification initiale et toute re-qualification ultérieure (URS-F-032quinquies). Sans cette maîtrise, une re-qualification n'est pas défendable en audit. | Must |
| URS-F-033 | Le système DOIT basculer automatiquement sur un modèle local si aucun fournisseur cloud configuré n'est accessible, en informant l'utilisateur du changement de moteur. | Must |
| URS-F-034 | Le système DOIT afficher explicitement, avant tout envoi, que le contenu peut être transmis à un service tiers en mode cloud — en nommant le fournisseur actif. | Must |
| URS-F-035 | Le chat expert DOIT citer, quand c'est pertinent, les normes/référentiels sur lesquels s'appuie sa réponse. | Should |
| URS-F-036 | Le chat expert DOIT afficher un avertissement rappelant qu'il s'agit d'une aide et non d'un avis réglementaire opposable. | Must |
| URS-F-037 | *(amendé v05)* Le système DOIT journaliser chaque session de chat expert (horodatage début/fin, **fournisseur et moteur exact utilisé** — cloud nommé ou local, document joint ou non), sans jamais journaliser le contenu échangé. | Must |
| URS-F-038 | *(nouveau v24 — suggestion d'un ingénieur logiciel externe consulté par l'utilisateur, 24/08/2026)* Le chat expert DOIT proposer un **mode audit simulé**, invocable explicitement par l'utilisateur, appliquant au document ou à la question en cours la même méthodologie de challenge que celle utilisée pour la production des livrables projet ValidaPharm eux-mêmes : débat contradictoire multi-angles (fonctionnel, réglementaire, sécurité, qualité) puis, si pertinent, simulation d'un ou plusieurs profils d'auditeur (Swissmedic, FDA, cabinet de conseil GxP, QA spécialisée). Priorité donnée aux documents produits dans l'outil et aux questions portant sur des informations destinées à figurer dans un document de sortie (périmètre confirmé par l'utilisateur, 24/08/2026) — pas un mode de conversation libre sans lien avec un livrable. | Must |
| URS-F-039 | *(nouveau v24)* Le mode audit simulé (URS-F-038) DOIT rester strictement consultatif : il émet un avis argumenté, il ne modifie jamais un document ni ne prend de décision à la place de l'utilisateur, qui reste seul responsable du contenu final — cohérent avec le principe déjà retenu pour le chat expert (URS-F-030/031) et avec le classement de risque GAMP 5 visé (l'IA assiste, elle ne décide pas). | Must |
| URS-F-039bis | *(nouveau v24, renumérotée v28 — collision d'ID trouvée en clôturant les points ouverts de la convergence architecturale, 25/08/2026 : cet ID était identique à URS-F-040 de §4.5 "Bibliothèque de normes", un ID ne doit jamais désigner deux exigences distinctes)* Le mode audit simulé (URS-F-038) DOIT afficher, à chaque activation, un rappel explicite qu'une simulation de persona réglementaire (ex. "Swissmedic", "FDA") **ne constitue en aucun cas un audit réglementaire réel ni un avis opposable** — pour prévenir tout faux sentiment de conformité chez l'utilisateur final. Ce rappel est distinct et complémentaire de l'avertissement général du chat expert (URS-F-036). | Must |
| URS-F-038bis | *(nouveau v25 — `REV-URS-VALIDAPHARM-2026-010`, E1/E3)* Le mode audit simulé (URS-F-038) PEUT utiliser un modèle distinct de celui du chat expert normatif (URS-F-030) ; si c'est le cas, la qualification de fiabilité déjà exigée par fournisseur/version (URS-F-032quater/quinquies) DOIT être menée **séparément pour chaque mode d'usage** — les deux modes n'ont pas le même profil de risque, une qualification unique ne couvre pas les deux. L'avertissement de divulgation à un tiers (URS-F-034) et le rappel des conditions de traitement des données (URS-F-032ter) s'appliquent explicitement à l'activation du mode audit simulé, au même titre qu'au chat de base. | Must |

### 4.5 Bibliothèque de normes

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-040 | Bibliothèque consultable des normes/référentiels utilisés par les gabarits. | Must |
| URS-F-041 | Association de documents normatifs propres à l'utilisateur à la bibliothèque. | Could |

### 4.6 Assistant de stratégie de qualification *(nouveau)*

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-050 | Le système DOIT évaluer la criticité d'un composant/fonction via une **méthode ACFC configurable par client** (questions Oui/Non définies par le client, conservées mot pour mot, aucune valeur figée dans le code — cohérent avec F2 du catalogue §10), à partir d'un contexte saisi manuellement ou d'un Change Control existant chargé/joint (via URS-F-031). Le verdict de criticité, combiné à une évaluation de complexité (catalogue/spécifique), propose une conclusion parmi une liste fermée : Aucun impact / Revue documentaire / FAT / SAT / IQ / IQ+OQ / IQ+OQ+PQ (requalification complète) / Autre — à définir par l'expert. *(Corrigé v27 — Phase 1 de convergence architecturale, 25/08/2026 : remplace la précédente description "grille de critères déterministe ASTM E2500/EudraLex Annexe 15 §43/ICH Q9", qui décrivait à tort un barème de critères pondérés fixe. Vérifié sur 4 sources indépendantes — Ferring, Sanofi Marcy, Sanofi Lyon-Gerland, ISPE Baseline Guide — qu'il s'agit en réalité d'un questionnaire Oui/Non propre à chaque client, cohérent avec F2.)* | Should |
| URS-F-050bis | L'IA PEUT aider à proposer les réponses aux questions de la méthode ACFC active à partir d'un Change Control joint, mais chaque réponse DOIT être validée/corrigée par l'utilisateur avant que le verdict ne soit calculé — jamais d'automatisme silencieux. Le verdict final résulte uniquement du moteur déterministe appliqué à la méthode configurée, jamais d'une génération libre. | Must |
| URS-F-050ter | Lorsque la proposition s'appuie sur un Change Control joint, le système DOIT indiquer la référence et la version du Change Control utilisé comme contexte. | Must |
| URS-F-050quater | *(nouveau v27)* Tant qu'aucune méthode ACFC n'a été configurée pour un client, le système NE DOIT proposer aucune question par défaut (aucune "méthode ValidaPharm" fabriquée) ; il DOIT indiquer explicitement l'absence de configuration et inviter à saisir les questions réelles de la procédure du client. | Must |
| URS-F-053 | Le système DOIT afficher, pour ce mode, un avertissement renforcé rappelant que la proposition est une aide à la décision et non une décision de qualification, à valider par un expert qualité qualifié. | Must |
| URS-F-054 | Cet assistant DOIT être accessible depuis le contexte d'un Change Control en cours de rédaction (pas seulement comme module indépendant). | Should |
| URS-F-055 | *(nouveau — délimitation ACFC / Computer System Assessment vs CSV)* Lorsqu'une évaluation ACFC ou Computer System Assessment conclut à la nécessité d'un dossier de qualification/validation complet, ses réponses DOIVENT pré-remplir les champs correspondants du gabarit cible (ex. section "Généralités" du CSV), sans nécessiter de double saisie. | Should |

### 4.6bis Impact Assessment / System Classification *(nouveau v27 — Phase 3 de convergence architecturale, 25/08/2026)*

Brique F1 du catalogue §10, en amont de l'ACFC (F2) — jamais fusionnée avec elle (URS v26, CONFLICT-002).

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-056 | Le système DOIT évaluer si un système entre dans le périmètre GMP qualifiable ("Direct Impact") via une **méthode configurable par client** (questions Oui/Non définies par le client, conservées mot pour mot, aucune valeur figée dans le code — même principe que URS-F-050/F2), appliquée à chaque système avant toute Analyse de risque (F2). Verdict strictement binaire : Direct Impact / Not Direct Impact — aucun troisième niveau "impact indirect" (confirmé sur source réelle : ISPE Baseline Guide 2ᵉ édition retire ce concept de sa 1ʳᵉ édition). | Should |
| URS-F-056bis | La règle de décision (ex. "au moins un Oui → Direct Impact") est elle-même une donnée de la méthode, jamais une règle universelle codée en dur — même principe que URS-F-050. | Must |
| URS-F-056ter | Tant qu'aucune méthode Impact Assessment n'a été configurée pour un client, le système NE DOIT proposer aucune question par défaut — même garde-fou que URS-F-050quater. | Must |
| URS-F-056quater | Un système classé Not Direct Impact n'est pas bloqué : il reste utilisable, seul le chemin de qualification complète (F2/F3) ne s'applique pas — cohérent avec le principe "non-blocking by default" du package Target Architecture (DEC-002). | Should |

### 4.6ter Computer System Assessment *(nouveau v27 — Phase 3 de convergence architecturale, 25/08/2026)*

Brique F3 du catalogue §10, distincte de F1 et F2 (URS v26, CONFLICT-002) — dédiée aux systèmes informatisés.

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-057 | Le système DOIT permettre d'évaluer un système informatisé selon : sa **catégorie GAMP5** (1 Infrastructure, 2 Firmware, 3 Logiciel standard non configuré, 4 Logiciel configurable, 5 Sur mesure — grille normative fixe, PIC/S PI 011-3, **non modulable par client**), sa pertinence GxP, et sa pertinence ERES/Part 11 — chaque évaluation justifiée par du texte libre. | Should |
| URS-F-057bis | Contrairement à la méthode ACFC (F2) ou Impact Assessment (F1), la catégorie GAMP5 n'est **jamais** configurable par client : elle est sélectionnée parmi les 5 valeurs fixes, jamais saisie librement. | Must |

### 4.6quater Paramètres de procédé et attributs qualité — Parameter/CriticalParameter/CPP/CQA *(nouveau v29 — Phase 2 de convergence architecturale, 25/08/2026 ; requirement manquant, trouvé en réponse à une question explicite de l'utilisateur sur l'intégration des exigences de la Target Architecture dans l'URS)*

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-058 | Le système DOIT permettre de définir un `Parameter` (paramètre de procédé/produit), rattachable optionnellement à un nœud du référentiel d'actifs (§4.10), sans qu'aucune notion de criticité ne lui soit intrinsèque. | Should |
| URS-F-058bis | *(garde-fou, Must)* Le système DOIT permettre de classer un `Parameter` comme important ou critique **pour le procédé**, mais cette classification NE DOIT JAMAIS créer automatiquement un CPP (Critical Process Parameter) — un CPP est une déclaration humaine explicite et séparée, jamais dérivée d'un score de criticité. | Must |
| URS-F-058ter | Le système DOIT permettre de déclarer un CPP ou un CQA (Critical Quality Attribute) de façon contextuelle (ex. un même paramètre peut être CPP pour un produit/une recette donnée et ne pas l'être pour un autre) — un changement de contexte NE DOIT JAMAIS muter silencieusement une déclaration existante : l'ancienne reste consultable, désactivée explicitement si elle ne s'applique plus, et une nouvelle est créée si nécessaire. | Must |

### 4.7 Vue portefeuille et opérations transverses *(nouveau — issu de la revue littéraire eQMS/Kneat/ValGenesis)*

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-070 | Le système DEVRAIT fournir un tableau de bord agrégeant le statut de qualification de tous les projets/équipements. | Should |
| URS-F-071 | Le système DEVRAIT fournir un registre/inventaire des équipements et systèmes (nom, catégorie GAMP, statut de qualification, date de dernière/prochaine revue périodique), alimentant le tableau de bord et le mini-outil Revue périodique (catalogue §10.I). | Should |
| URS-F-072 | Le système DEVRAIT émettre des alertes/rappels automatiques (revue périodique arrivant à échéance, délai de projet approchant — champ délai déjà prévu en URS-F-000). | Should |
| URS-F-073 | Le système DEVRAIT permettre une recherche transversale (mot-clé, équipement, norme citée) à travers tous les projets et livrables. | Should |

### 4.8 Analyse de documents et challenge de dossier *(nouveau v06)*

**Principe directeur** : cette famille de fonctions ne rentre pas en conflit avec le principe fondateur n°1 (l'IA n'est jamais seule source de vérité sur une conformité) — elle produit exclusivement des **constats/extractions à vérifier**, jamais un verdict "conforme/non conforme" attribué à l'outil. La décision reste entièrement humaine.

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-080 | Le système DEVRAIT permettre de charger un document technique d'ingénierie (PID, schéma électrique, plan) et d'en extraire une proposition structurée d'éléments pertinents (ex. liste d'instruments/tags), à des fins d'aide à la rédaction (ex. pré-remplissage de l'IQ) — proposition toujours soumise à validation humaine. | Could |
| URS-F-081 | Le système DEVRAIT permettre de charger un certificat (ex. certificat matière 3.1, certificat FDA, certificat d'étalonnage) et d'en extraire une identification structurée : type de certificat, mesures/valeurs rapportées, mentions réglementaires présentes — y compris lorsque le certificat est rédigé dans une langue différente de la langue de travail de l'utilisateur. | Should |
| URS-F-081bis | *(nouveau)* Pour un certificat rédigé dans une langue non maîtrisée par l'utilisateur, le système DOIT indiquer les termes techniques identifiés avec leur équivalent dans la langue de travail (ex. faire le lien entre une mention allemande et "certificat matière 3.1" ou "rugosité de surface"), pour aider l'utilisateur à retrouver l'information même sans maîtriser cette langue. | Should |
| URS-F-082 | Le système DEVRAIT permettre d'analyser un projet (ses sections liées, notamment la matrice de traçabilité) et de signaler les écarts structurels détectables : exigence URS sans section/preuve liée, document attendu absent de la section "Documents". La détection d'écarts structurels (liens manquants) PEUT être déterministe (basée sur les liens du modèle de données) ; toute évaluation sémantique plus fine ("ce certificat couvre-t-il réellement cette exigence") DOIT rester une proposition IA soumise à validation humaine. | Should |
| URS-F-083 | *(garde-fou, Must)* Aucune fonction d'analyse de document ou de challenge de dossier NE DOIT produire de verdict de conformité final attribué à l'outil — le résultat est systématiquement présenté comme "constat/proposition à vérifier", jamais comme "conforme"/"non conforme" tranché par l'outil. Cohérent avec le principe fondateur n°1. | Must |

### 4.9 Connecteurs QMS tiers *(nouveau v16 — REV-URS-005, décision utilisateur du 22/08/2026 de lever l'exclusion Phase 1)*

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-090 | Le système DOIT permettre de configurer, par client (`client_config`, cohérent avec l'isolation URS-F-024), une connexion à un ou plusieurs systèmes qualité tiers, via un pattern d'adaptateur enfichable (même principe que le routeur IA, URS-F-032) — architecture Must Phase 1. | Must |
| URS-F-090bis | Un connecteur de référence complet (Veeva Vault) DOIT être disponible dès la Phase 1. | Should |
| URS-F-090ter | Des connecteurs additionnels (SAP, TrackWise, autres) PEUVENT être ajoutés sans refonte de l'architecture, via le même pattern d'adaptateur. | Could |
| URS-F-090quater | Aucune synchronisation continue/automatique (webhook temps réel) n'est prévue en Phase 1 — le pull et le push restent des actions explicites et ponctuelles déclenchées par l'utilisateur ; un système tiers ne devient jamais une seconde source de vérité silencieuse (cohérent avec URS-NF-010). | Must |
| URS-F-091 | Le système DOIT permettre d'importer (pull) une donnée de référence depuis un connecteur QMS tiers configuré, pour alimenter une section — le contenu importé DOIT être soumis aux mêmes garde-fous que la génération par adaptation (URS-F-060bis à 064) : validation section par section obligatoire, confirmation du droit d'usage, signalement visuel des données techniques reprises, traçabilité de la filiation (`qms_connector_id` en plus de `source_document_id`). | Should |
| URS-F-092 | Le système DOIT permettre d'exporter (push) un livrable "validé en interne" vers un connecteur QMS tiers configuré, pour poursuite de son cycle d'approbation dans ce système. | Should |
| URS-F-092bis | *(garde-fou, Must)* Le push NE DOIT JAMAIS être automatique ou silencieux — confirmation explicite obligatoire du client, du système cible **et du tenant/organisation exact** avant tout envoi (double vérification renforcée par rapport à URS-F-034/062, compte tenu du risque de contamination croisée entre clients via un mauvais tenant). | Must |
| URS-F-092ter | *(garde-fou, Must)* Une fois un livrable poussé avec succès, le système DOIT afficher une méta-donnée visible ("en cours d'approbation externe — {système}, {date}, {référence externe}") — le statut interne ValidaPharm ne doit jamais rester silencieusement inchangé une fois la responsabilité d'approbation transférée au système cible. | Must |
| URS-F-092quater | *(garde-fou, Must)* Le push DOIT attendre une confirmation de réception explicite du système cible avant d'être marqué réussi côté ValidaPharm ; en cas d'échec réseau, un identifiant de transaction unique garantit qu'un retry ne crée jamais de doublon dans le système cible (idempotence). | Must |

### 4.10 Structure Système — référentiel d'actifs hiérarchique et flexible *(nouveau v17 — REV-URS-006, besoin exprimé par l'utilisateur)*

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-100 | Le système DOIT permettre de créer, par client, un référentiel d'actifs (systèmes, équipements, utilités, locaux, ou tout autre niveau défini par le client) **partagé entre tous les projets de ce client** — pas un référentiel par projet. Isolation stricte par client, même principe que URS-F-024. | Must |
| URS-F-100bis | La structure de hiérarchie (nombre de niveaux, libellés, règles de numérotation/codification) DOIT être configurable par client — aucune hiérarchie imposée par défaut par l'outil. | Must |
| URS-F-100ter | Chaque nœud DOIT pouvoir porter un **lien hiérarchique principal** (parent unique, formant un arbre — aucun cycle toléré sur ce lien) ET des **liens d'association multiples non hiérarchiques** (formant un graphe libre, cycles possibles et acceptables — ex. une utilité desservant plusieurs systèmes). Les deux types de lien sont distincts et ne doivent jamais être confondus dans la vue graphique. | Must |
| URS-F-100quater | Une vue graphique globale DOIT permettre de visualiser les connexions (hiérarchiques et d'association) entre systèmes, équipements, utilités et locaux d'un même client — même principe que la vue de traçabilité des sections de projet (URS-F-000ter). | Should |
| URS-F-100quinquies | À la création ou modification d'un Projet, le système DOIT permettre de sélectionner un ou plusieurs nœuds existants du référentiel d'actifs du client comme objet(s) du projet. | Must |
| URS-F-100sexies | Si le système/équipement concerné n'existe pas encore dans le référentiel, le système DOIT permettre de le créer manuellement à la volée depuis le contexte de création du projet, sans interrompre le flux. | Must |
| URS-F-100septies | Le référentiel d'actifs DOIT pouvoir être alimenté soit par pull depuis un connecteur QMS tiers configuré (ex. SAP — nomenclature équipement/emplacement fonctionnel), réutilisant le mécanisme et les garde-fous déjà définis en URS-F-091, soit par saisie manuelle — au choix, nœud par nœud. | Should |
| URS-F-100octies | *(garde-fou, Must)* Toute suppression ou modification d'un nœud DOIT être journalisée. La suppression d'un nœud référencé par au moins un projet NE DOIT JAMAIS être silencieuse ni casser le lien du projet — le lien devient explicitement "orphelin" et visible, jamais supprimé sans trace. | Must |
| URS-F-100nonies | *(garde-fou, Must — E2)* Le code/numérotation d'un nœud DOIT être unique au sein du référentiel d'un même client — vérifié à la création et à toute modification d'un nœud, rejet explicite en cas de doublon. | Must |
| URS-F-100decies | *(garde-fou, Must — E3)* Le lien entre un projet et un nœud du référentiel DOIT capturer un instantané (nom/code au moment de la liaison) pour la fidélité des exports/livrables déjà validés — un renommage ultérieur du nœud ne doit jamais modifier silencieusement le contenu affiché d'un livrable existant. Le lien vif vers l'identifiant du nœud reste par ailleurs conservé pour la navigation et la vue graphique. | Must |
| URS-F-100undecies | *(nouveau v39 — câblage Workspace étape 1, 26/08/2026, `docs/convergence/CABLAGE_ETAPE_1_STRUCTURE_SYSTEME_SPEC.md`)* Chaque nœud du référentiel d'actifs DOIT pouvoir être rattaché à un `Workspace` (site) précis de l'organisation du client (§4.18) — un nœud non rattaché reste visible depuis tout `Workspace` de cette organisation (compatibilité ascendante, aucune régression sur les référentiels existants). | Should |
| URS-F-100duodecies | *(garde-fou non négociable, Must)* Un nœud rattaché à un `Workspace` DOIT être visible depuis ce `Workspace` et depuis chacun de ses ancêtres dans l'arbre (héritage descendant, même principe que URS-F-180quinquies) — jamais depuis un `Workspace` "cousin" ni un `Workspace` d'une autre organisation. Tenter de rattacher un nœud à un `Workspace` inconnu ou appartenant à une autre organisation DOIT être rejeté explicitement, jamais silencieux. | Must |
| URS-F-101 | *(nouveau v18 — REV-URS-007, besoin exprimé par l'utilisateur)* Depuis un nœud du référentiel d'actifs, le système DOIT permettre d'accéder à un "dossier vivant" listant tous les livrables (sections) qui le concernent, à travers tous les projets du client — répond au besoin de retrouver le rapport de qualification d'un équipement en parcourant la structure hiérarchique jusqu'à lui. | Should |
| URS-F-101bis | *(nouveau v18 — E5)* Chaque section DOIT pouvoir être liée individuellement à un ou plusieurs nœuds du référentiel, en plus du lien global hérité de son projet (URS-F-100quinquies) — affinement optionnel, pour le cas où un projet concerne plusieurs nœuds mais qu'une section précise n'en concerne qu'un sous-ensemble. Par défaut, une section hérite des nœuds de son projet sans action supplémentaire de l'utilisateur. | Should |
| URS-F-101ter | *(nouveau v18 — E4)* Le dossier vivant DOIT, par défaut, afficher uniquement les livrables au statut "validé en interne", avec un filtre explicite pour inclure les brouillons/versions en cours — jamais présenter un brouillon non validé comme le document officiel par défaut. | Must |
| URS-F-101quater | *(nouveau v18 — E3)* Le dossier vivant DOIT regrouper les livrables par famille de gabarit (catalogue §10) avec la version courante mise en avant, l'historique de révisions (`revisions[]`) restant consultable pour chaque livrable listé. | Should |
| URS-F-101quinquies | *(garde-fou, Must)* Toute création/modification/retrait d'un lien section↔nœud DOIT être journalisé — même principe que URS-F-000sexies pour les liens entre sections. | Must |
| URS-F-101sexies | *(nouveau v19 — REV-URS-008, besoin exprimé par l'utilisateur)* Le système DOIT permettre d'exporter le dossier vivant d'un nœud (ou un sous-ensemble filtré) au format PDF, sous forme de synthèse — réutilise le moteur d'export déjà existant (URS-F-020). | Should |
| URS-F-101septies | *(nouveau v19 — E4/E3)* Cette synthèse DOIT lister chronologiquement **toutes** les occurrences validées dans le temps (pas seulement la version courante), avec pour chacune : date de validation, type de protocole, référence et version. Elle DOIT porter les mêmes rappels que tout export standard (URS-F-011bis, et URS-F-092ter si applicable) ainsi qu'un bandeau explicite précisant la période/le périmètre couvert par les données saisies dans l'outil — pour ne jamais laisser croire à une complétude historique totale si une qualification antérieure à l'adoption de ValidaPharm existe hors de l'outil. | Must |
| URS-F-102 | *(nouveau v20 — REV-URS-009, besoin exprimé par l'utilisateur)* Chaque nœud du référentiel d'actifs DOIT pouvoir être marqué "soumis à qualification périodique" (oui/non) et, si oui, porter une date limite de requalification. | Must |
| URS-F-102bis | *(nouveau v20 — recherche + panel)* Chaque nœud DOIT porter un statut de qualification choisi dans une liste fermée standardisée : Non qualifié / En cours de qualification initiale / Qualifié / Qualifié avec écart(s) ouvert(s) / Requalification requise / Requalification en retard / Suspendu — sous contrôle de changement / Déclassé — retiré. *(Note : convention de fait issue des pratiques eQMS/plans de validation courants — aucun texte normatif unique n'impose cette liste précise ; à confirmer/adapter si le client a déjà sa propre nomenclature interne.)* | Must |
| URS-F-102ter | *(nouveau v20 — E5)* Le passage à "Requalification requise"/"Requalification en retard" DOIT être dérivé automatiquement de la date limite (URS-F-102) lorsqu'elle approche ou est dépassée — pas seulement positionné manuellement. Réutilise le mécanisme d'alerte déjà existant (URS-F-072). | Must |
| URS-F-102quater | *(garde-fou, Must — E3)* Lors de la sélection d'un nœud à la création/liaison d'un projet (URS-F-100quinquies), si son statut est "Requalification en retard" ou "Suspendu", un avertissement explicite DOIT être affiché — sans jamais bloquer la sélection, la décision de poursuite restant sous responsabilité humaine (cohérent avec le principe fondateur n°1). | Must |
| URS-F-102quinquies | *(garde-fou, Must — E4)* Tout changement de statut d'un nœud, automatique ou manuel, DOIT être journalisé (qui/quand/ancien statut/nouveau statut). | Must |

### 4.10bis Function / Process / ManufacturingContext *(nouveau v28 — Phase 4 de convergence architecturale, 25/08/2026)*

Étend le référentiel d'actifs (§4.10) sans le modifier : `AssetNode` et sa hiérarchie restent inchangés.

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-103 | Le système DOIT permettre de définir un `Process` générique par client (type parmi : fabrication, conditionnement, installation, digital, CSV, workflow documentaire, métier, EHS, logistique, support, autre), indépendant de la hiérarchie du référentiel d'actifs. | Should |
| URS-F-103bis | Le système DOIT permettre de définir une `Function` (ex. production, mesure, contrôle, alarme, interlock, nettoyage, EHS, support) indépendante du type de `Process`, et de l'associer à plusieurs nœuds du référentiel d'actifs et à plusieurs `Process` — jamais une relation 1:1. | Should |
| URS-F-103ter | Le système DOIT permettre de rattacher un nœud du référentiel d'actifs à un `Process`, un produit et, le cas échéant, une recette/un format via un `ManufacturingContext` explicite. Un même nœud (ex. un système numérique type SCADA) DOIT pouvoir être rattaché à plusieurs `ManufacturingContext` distincts (plusieurs procédés/produits/recettes) sans qu'aucune relation ne soit déduite comme universelle. | Should |

### 4.11 Quality Events — Change Control, Déviation, Investigation, CAPA, Constat d'audit, Revue périodique *(nouveau v29 — Phase 5 de convergence architecturale, 25/08/2026 ; famille H du catalogue §10, jusqu'ici sans requirement dédié — gap trouvé en intégrant les exigences de la Target Architecture)*

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-110 | Le système DOIT permettre de consigner un événement qualité parmi : Change Control, Déviation, Investigation, CAPA, Constat d'audit, Revue périodique — chacun avec un titre, une description, un statut (ouvert/en cours/clôturé) et un journal d'audit. | Should |
| URS-F-110bis | *(garde-fou non négociable, Must)* Un événement qualité DOIT porter une origine explicite (interne à l'outil / externe / mixte). Un événement d'origine externe ou mixte est **référencé** (système source, identifiant), jamais dupliqué comme contenu officiel dans l'outil. | Must |
| URS-F-110ter | *(garde-fou non négociable, Must)* Un événement qualité externe ou mixte NE DOIT JAMAIS bloquer automatiquement une activité indépendante de l'outil — aucun mécanisme de verrouillage basé sur le statut d'un événement externe. | Must |
| URS-F-110quater | Le système DOIT permettre de référencer un événement qualité à un autre (ex. Déviation → Investigation → CAPA, Constat d'audit → CAPA), **sans jamais rendre cette chaîne obligatoire** — un événement peut se clôturer sans aucune référence sortante. | Should |
| URS-F-110quinquies | Un événement qualité PEUT être rattaché, de façon optionnelle, à un nœud du référentiel d'actifs, un `Process` ou un `ManufacturingContext` (§4.10/§4.10bis) — jamais une obligation (ex. un CAPA organisationnel ne concerne aucun système précis). | Should |
| URS-F-110sexies | *(garde-fou, Must)* Aucune fonction IA de ce module ne DOIT classifier, prioriser ou clôturer automatiquement un événement qualité — cohérent avec le principe fondateur n°1. | Must |

### 4.12 Chaîne de définition Requirement → TestObjective → TestCandidate → Test *(nouveau v31 — Phase 7a de convergence architecturale, 25/08/2026 ; moteur générique sous-jacent aux familles C — Protocoles FAT/SAT/IQ/OQ/PQ — et I — VMP + traçabilité —, jusqu'ici sans requirement dédié malgré des protocoles déjà décrits dans le catalogue §10)*

Cette section couvre exclusivement la **définition** de la chaîne de traçabilité (quelle exigence est couverte par quel test, à quelle étape) — ni l'exécution d'un test (Phase 7b, à venir), ni la preuve/Evidence associée (Phase 7c, à venir), ni aucune génération IA. Décomposition volontaire en sous-étapes, jamais livrée en un seul commit, conformément au risque identifié pour ce domaine dans `docs/convergence/CONVERGENCE_PLAN.md`.

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-120 | Le système DOIT permettre de consigner une exigence (`Requirement`) — référence, titre, description — rattachable optionnellement à un nœud du référentiel d'actifs ou à un `Process` (§4.10/§4.10bis), jamais une obligation. | Should |
| URS-F-120bis | Le système DOIT permettre de décliner une exigence en un ou plusieurs objectifs de test (`TestObjective`), chacun rattaché à une exigence unique. | Should |
| URS-F-120ter | *(corrigé v36, réalignement sur `10_TEST_ENGINE.md` après lecture directe du package source)* Le système DOIT permettre de proposer un ou plusieurs candidats de test (`TestCandidate`) pour un objectif de test, avec un statut explicite parmi : proposé / besoin d'information / besoin de revue / accepté / rejeté / doublon / remplacé (PROPOSED/NEEDS_INFORMATION/NEEDS_REVIEW/ACCEPTED/REJECTED/DUPLICATE/SUPERSEDED) — remplace le modèle à 3 états (proposé/retenu/écarté) fabriqué en 7a faute de source disponible à l'époque. | Should |
| URS-F-120quater | *(garde-fou non négociable, Must ; corrigé v36)* Un test formel (`Test`) NE DOIT JAMAIS être créé à partir d'un candidat qui n'est pas au statut "accepté" — jamais depuis un candidat proposé, en attente, rejeté, doublon ou remplacé. | Must |
| URS-F-120quinquies | *(garde-fou non négociable, Must)* Écarter un candidat de test DOIT toujours porter un motif tracé dans le journal d'audit — jamais une suppression silencieuse. | Must |
| URS-F-120sexies | Le système DOIT permettre de rattacher un test approuvé à une ou plusieurs exigences par une déclaration explicite de couverture (`Couverture`), jamais déduite automatiquement — un même test PEUT couvrir plusieurs exigences distinctes. | Should |
| URS-F-120septies | *(garde-fou, Must)* Aucune fonction IA de ce module ne DOIT générer, retenir ou approuver automatiquement un test ou une couverture — cohérent avec le principe fondateur n°1. | Must |

### 4.13 Exécution d'un Test approuvé *(nouveau v32 — Phase 7b de convergence architecturale, 25/08/2026 ; suite directe de §4.12, spec `docs/convergence/PHASE_7B_EXECUTION_SPEC.md`)*

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-130 | *(garde-fou non négociable, Must)* Une exécution (`Execution`) NE DOIT être créée qu'à partir d'un `Test` au statut approuvé — jamais depuis un test en brouillon. | Must |
| URS-F-130bis | Le système DOIT permettre de consigner, pour chaque étape d'un test en cours d'exécution, un résultat constaté (conforme / non conforme / non applicable) et une observation. | Should |
| URS-F-130ter | Le système DOIT permettre de consigner zéro à plusieurs mesures (valeur, unité) rattachées à un résultat d'étape. | Should |
| URS-F-130quater | *(garde-fou non négociable, Must)* Une fois une exécution clôturée, aucun résultat d'étape ni mesure NE DOIT plus pouvoir y être ajouté — immutabilité post-clôture, cohérente avec les principes d'intégrité des données déjà retenus par ce projet. Toute correction nécessaire passe par un nouvel événement d'exécution, jamais par une réécriture. | Must |
| URS-F-130quinquies | *(garde-fou non négociable, Must)* La clôture d'une exécution DOIT exiger un verdict (conforme / non conforme / conforme avec écart) fourni explicitement par l'utilisateur — ce verdict NE DOIT JAMAIS être déduit ou calculé automatiquement à partir des résultats d'étapes, cohérent avec le principe fondateur n°1. | Must |
| URS-F-130sexies | *(corrigé v36, réalignement sur `01_ARCHITECTURE_MASTER_FINAL.md` §29/DEC-056 après lecture directe du package source)* Le système DOIT permettre de consigner un événement survenu pendant l'exécution — décision face à un résultat inattendu (continuer / action / retest / déviation / changement / arrêt / externe) ou simple commentaire — avec une référence optionnelle vers un événement qualité (`QualityEvent`, §4.11) déjà existant — cette référence NE DOIT JAMAIS être créée automatiquement (cohérent avec DEC-002/DEC-055, §4.11). | Should |
| URS-F-130septies | *(garde-fou, Must)* Aucune fonction IA de ce module ne DOIT générer, valider ou clôturer automatiquement une exécution. | Must |

### 4.14 Evidence — preuve rattachée à une exécution *(nouveau v33 — Phase 7c de convergence architecturale, 25/08/2026 ; dernière sous-étape de la Phase 7, spec `docs/convergence/PHASE_7C_EVIDENCE_SPEC.md`)*

**Traçabilité complète démontrée à l'issue de cette section** : Requirement → Test → Execution → Evidence (Acceptance Criteria de la Phase 7 du plan de convergence).

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-140 | Le système DOIT permettre de consigner une preuve (`Evidence`) rattachée à une exécution en cours, de type native (constat direct, sans document source) ou document (renvoie à un fichier externe). | Should |
| URS-F-140bis | *(garde-fou non négociable, Must)* Une `Evidence` NE DOIT être créée que pour une exécution non encore clôturée — immutabilité post-clôture, cohérente avec §4.13/URS-F-130quater. | Must |
| URS-F-140ter | Une `Evidence` PEUT être rattachée à un résultat d'étape précis, qui DOIT appartenir à l'exécution référencée — pas de résultat orphelin. | Should |
| URS-F-140quater | Pour une preuve de type document, le système DOIT permettre d'enregistrer une localisation (`EvidenceLocation`) — un pointeur déclaratif (système + référence) vers où le document réside, jamais le contenu du fichier lui-même (aucun stockage de fichier binaire construit dans ce périmètre). | Could |
| URS-F-140quinquies | Le système DOIT permettre de déclarer explicitement qu'une preuve substantie une exigence donnée (`ProvenanceLink`), jamais déduit automatiquement — une même preuve pouvant appuyer une exigence au-delà de la couverture générique du test dont elle provient. | Should |
| URS-F-140sexies | *(garde-fou, Must)* Aucune fonction IA de ce module ne DOIT générer ou qualifier automatiquement une preuve. | Must |

### 4.15 Source/Document Intelligence — structuration assistée *(nouveau v34 — Phase 8a de convergence architecturale, 25/08/2026 ; spec `docs/convergence/PHASE_8A_SOURCE_INTELLIGENCE_SPEC.md` ; séquencement TD-004, sous-phase 8b — compréhension de schémas techniques complexes — non engagée ; **réaligné v36** sur `03_DOMAIN_DATA_MODEL.md` après lecture directe du package source, Google Drive reconnecté en cours de session ; **étendu v46**, Phase 19, TD-014 ; **complété v47**, images incorporées, TD-015)*

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-150 | *(réaligné v36, étendu v46)* Le système DOIT permettre de référencer une source documentaire (`Source`, document ou image), avec une ou plusieurs localisations déclaratives (`SourceLocation`), une ou plusieurs révisions (`SourceVersion`, numérotées séquentiellement), et d'y rattacher une exécution d'extraction (`Extraction`, via OCR, ingestion Office native, ou saisie manuelle) produisant un ou plusieurs fragments de texte brut (`ExtractionItem`) — immutables une fois enregistrés. | Should |
| URS-F-150bis | *(garde-fou non négociable, Must)* Toute interprétation structurée d'un `ExtractionItem` (`KnowledgeItem`) DOIT être créée au statut "à valider" (NEEDS_REVIEW) — jamais "validé" à la création, quel que soit le contenu. | Must |
| URS-F-150ter | *(garde-fou non négociable, Must ; réaligné v36)* Le passage d'un `KnowledgeItem` au statut "validé" ou "rejeté" DOIT toujours résulter d'une action humaine explicite et tracée, via un enregistrement `Confirmation` distinct et auditable — jamais automatique. | Must |
| URS-F-150quater | Le système DOIT permettre de consigner un désaccord explicite entre deux `KnowledgeItem` (`Conflict`), qui DOIT rester visible et ouvert tant qu'aucune résolution explicite n'est fournie — jamais résolu automatiquement. | Should |
| URS-F-150quinquies | *(garde-fou, Must)* Aucune fonction IA de ce module ne DOIT générer un contenu interprété ni valider/résoudre automatiquement un `KnowledgeItem`/`Conflict` — la structuration reste assistée, jamais autonome. | Must |
| URS-F-150sexies | *(nouveau v36, réalignement)* Le système DOIT permettre de déclarer un lien explicite non conflictuel entre deux `KnowledgeItem` (`KnowledgeRelation`) — jamais déduit automatiquement, idempotent. | Should |
| URS-F-150septies | *(nouveau v46 — Phase 19, TD-014)* Le système DOIT permettre d'extraire le texte brut d'un document `.docx` fourni directement par l'utilisateur (procédure/SOP, template), entièrement côté navigateur, sans appel réseau — *(garde-fou, Must)* un fichier illisible ou d'un format inattendu DOIT être signalé explicitement (jamais un crash ni un résultat silencieusement vide). | Must |
| URS-F-150octies | **Limite assumée** : aucune ingestion Excel native n'est construite (`xlsx_natif` absent de `MethodeExtraction`) — aucune bibliothèque de parsing `.xlsx` saine n'a été retenue à ce jour (`xlsx`/SheetJS : vulnérabilité haute sans correctif sur npm ; `exceljs` : dépendance transitive vulnérable), TD-014. Ne pas réintroduire ces bibliothèques telles quelles sans correctif vérifié. | — |
| URS-F-150nonies | *(nouveau v47 — Phase 19 complétée, TD-015 ; répond à une observation explicite de l'utilisateur : une SOP réelle n'est pas toujours du texte seul)* Le système DOIT permettre d'extraire les images incorporées (schémas, photos, diagrammes) d'un document `.docx` fourni par l'utilisateur — *(garde-fou, Must)* un format d'image non exploitable par l'OCR (ex. dessin vectoriel EMF/WMF) DOIT être signalé explicitement à l'appelant, jamais silencieusement omis. | Must |
| URS-F-150decies | **Limite assumée (TD-015)** : aucune détection ni correction automatique de filigrane ou de scan dégradé n'est construite — une SOP scannée avec filigrane peut dégrader la qualité de l'OCR existant (§4.15) ; le filet de sécurité est la validation humaine déjà non négociable de tout `KnowledgeItem` (URS-F-150bis), jamais un algorithme de correction non prouvé. Aucune reconstruction de la position des images dans le flux du document (liste plate, pas de mise en page). | — |

### 4.16 ContentPlan — planification d'un livrable *(nouveau v35 — Phase 9 de convergence architecturale, 25/08/2026 ; spec `docs/convergence/PHASE_9_CONTENT_PLAN_SPEC.md` ; ne couvre que la planification, pas la génération/le rendu/l'approbation finale du livrable ; **réaligné v36** après lecture directe du package source)*

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-160 | Le système DOIT permettre de planifier un livrable (`ContentPlan`) : gabarit visé, contexte d'actif/procédé optionnel, profil de méthode résolu optionnel. | Should |
| URS-F-160bis | *(garde-fou non négociable, Must)* Le contexte résolu au moment de la planification (`context_snapshot`) DOIT être figé une seule fois à la création et rester immutable ensuite, même si le profil de méthode référencé évolue ultérieurement. | Must |
| URS-F-160ter | *(garde-fou non négociable, Must)* Un `ContentPlan` DOIT être validé avant de pouvoir être gelé — aucun passage direct de brouillon à gelé. | Must |
| URS-F-160quater | *(garde-fou non négociable, Must)* Une fois gelé, un `ContentPlan` NE DOIT plus pouvoir être modifié — immutabilité totale, cohérente avec §4.13/URS-F-130quater. | Must |
| URS-F-160quinquies | *(garde-fou, Must)* Aucune fonction IA de ce module ne DOIT générer, valider ou geler automatiquement un `ContentPlan`. | Must |
| URS-F-160sexies | *(nouveau v36, réalignement sur `01_ARCHITECTURE_MASTER_FINAL.md` §26)* Un `ContentPlan` DOIT porter un indicateur de complétude des données (`readiness` : prêt / besoin d'information / besoin de revue / bloqué — READY/NEEDS_INFORMATION/NEEDS_REVIEW/BLOCKED), distinct du statut de validation du plan lui-même. | Should |
| URS-F-160septies | *(garde-fou non négociable, Must ; nouveau v36)* Un `ContentPlan` dont `readiness` n'est pas "prêt" NE DOIT JAMAIS pouvoir être gelé, même déjà validé. | Must |

### 4.17 Integration Gateway — connecteurs documentaires génériques *(nouveau v37 — Phase 10 de convergence architecturale, 25/08/2026 ; spec `docs/convergence/PHASE_10_INTEGRATION_GATEWAY_SPEC.md` ; anticipe Veeva Vault, SharePoint/EDMS génériques, dossier réseau et Google Drive, sur demande explicite de l'utilisateur)*

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-170 | Le système DOIT permettre de configurer un connecteur documentaire (`Connector`) parmi : GitHub, Google Drive, Veeva Vault, SharePoint, dossier réseau, EDMS générique — chacun avec une configuration typée propre à son type. | Should |
| URS-F-170bis | Le système DOIT permettre de suivre une tentative de synchronisation (`SyncJob`) avec un statut explicite (en attente / indisponible / nouvelle tentative / échec / réussi) et le nombre de tentatives. | Should |
| URS-F-170ter | *(garde-fou non négociable, Must)* Un `SyncJob` indisponible ou en échec NE DOIT JAMAIS bloquer une activité métier indépendante — vérifié explicitement par test, cohérent avec DEC-002/DEC-055 déjà appliqué à `QualityEvent` (§4.11). | Must |
| URS-F-170quater | Le système DOIT permettre de référencer un document externe (`ExternalReference`) via un connecteur — jamais dupliquer son contenu comme contenu officiel, même principe que `EvidenceLocation`/`SourceLocation` (§4.14/§4.15). | Should |
| URS-F-170quinquies | *(garde-fou, Must)* Aucune synchronisation ni résolution de conflit ne DOIT être automatique par IA dans ce module. | Must |

### 4.18 Organization/Workspace — hiérarchie organisationnelle *(nouveau v38 — Phase 11 de convergence architecturale, 25/08/2026 ; spec `docs/convergence/PHASE_11_ORGANIZATION_MIGRATION_SPEC.md` ; migration la plus risquée du plan, TD-006, engagée sur demande explicite de l'utilisateur)*

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-180 | Le système DOIT permettre de migrer un `Client` existant vers une `Organization`, avec un `Workspace` racine de type `global` créé automatiquement. | Should |
| URS-F-180bis | *(garde-fou non négociable, Must)* L'`id` de l'`Organization` migrée DOIT être strictement égal à l'`id` du `Client` d'origine — aucune des tables existantes indexées par `client_id` n'est renommée ni migrée dans ce périmètre. | Must |
| URS-F-180ter | *(garde-fou non négociable, Must)* La migration d'un `Client` DOIT être idempotente — la migrer deux fois ne DOIT jamais dupliquer l'`Organization` ni son `Workspace` racine. | Must |
| URS-F-180quater | Le système DOIT permettre de créer un `Workspace` enfant (site) sous un `Workspace` existant de la même `Organization` — arbre auto-référencé, sans profondeur figée (Global/Site/Facility/Area sont des niveaux du même arbre, pas des types distincts). | Should |
| URS-F-180quinquies | *(garde-fou non négociable, Must)* La résolution d'une règle effective pour un `Workspace` DOIT toujours retourner l'origine exacte (le `Workspace` où la règle a été trouvée) — jamais une valeur sans provenance traçable. Un `Workspace` sans règle propre hérite silencieusement de son parent ; un `Workspace` avec sa propre règle la voit toujours prévaloir (override explicite). | Must |
| URS-F-180sexies | *(garde-fou, Must)* Aucune migration de `Client` ne DOIT être déclenchée automatiquement/silencieusement (ex. au démarrage) — toujours un acte explicite et tracé. | Must |
| URS-F-180septies | **Limite assumée** : la réécriture des tables existantes pour interroger explicitement par `Workspace`/site (ex. "toutes les données du site X uniquement") reste un chantier ultérieur, phase par phase, non engagé ici — cohérent avec l'interdiction explicite d'un "Big Bang" (TD-006). | — |

### 4.19 Mission/Activity — domaine Work *(nouveau v40 — Phase 13 de convergence architecturale, 26/08/2026 ; spec `docs/convergence/PHASE_13_MISSION_ACTIVITY_SPEC.md` ; TD-009 (revue panel `PHASE_13_17_REVUE_PANEL_MOTEUR_RAISONNEMENT.md`) — `Mission`/`Activity` seulement, `WorkflowDefinition`/`WorkflowInstance`/`Approval` différés sur besoin réel démontré)*

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-190 | Le système DOIT permettre de créer une `Mission` — conteneur de travail contextualisé, optionnellement ancré sur un `Workspace` et/ou un `AssetNode` existants — avec un statut de cycle de vie (`ouverte`/`en_cours`/`cloturee`) et un journal d'audit. | Should |
| URS-F-190bis | Le système DOIT permettre de créer une `Activity` toujours rattachée à une `Mission` existante (jamais orpheline), avec son propre statut (`a_faire`/`en_cours`/`terminee`/`bloquee`) et journal d'audit. | Should |
| URS-F-190ter | Le système DOIT permettre d'exprimer une dépendance d'ordre attendu entre deux `Activity` de la même `Mission` — *(garde-fou, Must)* cette dépendance n'est jamais un verrou bloquant : aucun changement de statut d'une `Activity` dépendante n'est empêché par l'état de sa dépendance, même discipline que DEC-002/055 déjà appliquée à `QualityEvent`/`Connector`. | Must |
| URS-F-190quater | Le système DOIT permettre d'associer une `Mission` à un ou plusieurs `QualityEvent` existants (ex. Mission ouverte en réponse à un Change Control) — *(garde-fou, Must)* association optionnelle, jamais une étape obligatoire à la création d'une `Mission`. | Must |
| URS-F-190quinquies | **Limite assumée** : aucune référence directe `Mission → Requirement/Assessment/Test/Evidence/Deliverable` n'est construite dans ce périmètre — ce rôle appartient à l'entité cible `Strategy` (non construite, non persistée), ajoutée de façon additive sur besoin réel démontré. De même, `Activity produces Evidence` (matrice cible) n'est pas construit : contredirait le garde-fou non négociable déjà testé d'`Evidence` (Phase 7c — jamais une preuve orpheline, `execution_id` non nul) ; résolution différée, jamais résolue en silence. | — |

### 4.20 Context Engine — `ContextSnapshot` généralisé *(nouveau v41 — Phase 14 de convergence architecturale, 26/08/2026 ; spec `docs/convergence/PHASE_14_CONTEXT_ENGINE_SPEC.md`)*

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-200 | Le système DOIT permettre d'assembler et de figer un `ContextSnapshot` (site et/ou `AssetNode` d'ancrage, éléments de contexte résolus) pour toute ancre donnée (`Workspace` ou `AssetNode` précis). | Should |
| URS-F-200bis | *(garde-fou non négociable, Must)* Un `ContextSnapshot`, une fois créé, ne DOIT jamais pouvoir être modifié — aucune fonction de mise à jour n'existe (immutabilité, invariant #12 de `03_DOMAIN_DATA_MODEL.md`) ; un nouveau besoin de contexte crée un nouveau `ContextSnapshot`. | Must |
| URS-F-200ter | Lorsque l'ancre est un `AssetNode` précis, le système DOIT résoudre les éléments de contexte exactement sur ce nœud (jamais ses descendants) ; lorsque l'ancre est un `Workspace`, le système DOIT résoudre tous les `AssetNode` visibles depuis ce site (héritage descendant déjà établi, §4.18/§4.10). | Should |
| URS-F-200quater | **Limite assumée** : la résolution de la "méthode applicable" (`MethodProfileACFC`/`MethodProfileImpactAssessment`) et des "documents pertinents" (`Source`/`SourceVersion`) n'est PAS construite dans ce périmètre — ces entités n'ont aujourd'hui aucun rattachement `Workspace`/`AssetNode` ; les y ajouter sans cas réel démontré fabriquerait une résolution non éprouvée. | — |

### 4.21 Reasoning Engine — domaine AI *(nouveau v42 — Phase 15 de convergence architecturale, 26/08/2026 ; spec `docs/convergence/PHASE_15_REASONING_ENGINE_SPEC.md` ; TD-007/TD-008)*

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-210 | Le système DOIT permettre d'exécuter une invocation du moteur de raisonnement (`AIRequest`) qui interroge le fournisseur IA existant en boucle, appelle des outils de lecture (`Requirement`, `Test` via `Couverture`, `Evidence` via `Execution`, `KnowledgeItem`), et journalise chaque appel d'outil (`AIResponse.trace_appels_outils`). | Should |
| URS-F-210bis | *(garde-fou non négociable, Must)* Le contenu d'une `AIResponse` ne DOIT jamais être écrit directement dans `Requirement`/`Test`/`KnowledgeItem` par une fonction du moteur de raisonnement — toute application à ces entités requiert une confirmation humaine explicite hors de ce périmètre (même principe que `Confirmation`, Phase 8a). | Must |
| URS-F-210ter | *(garde-fou non négociable, Must)* Une `AIResponse` taguée `connu` DONT une citation ne correspond à aucun objet réellement obtenu par un appel d'outil pendant la session, ou dont la liste de citations est vide, DOIT être automatiquement rétrogradée à `a_verifier` — jamais l'IA seule ne décide qu'elle "sait" (principe fondateur n°1, invariant #8 de `03_DOMAIN_DATA_MODEL.md`). | Must |
| URS-F-210quater | *(garde-fou, Must)* La boucle d'orchestration DOIT respecter un plafond d'itérations strict et s'arrêter explicitement (jamais silencieusement) si ce plafond est atteint sans réponse finale. Un modèle qui ne respecte pas le protocole d'appel d'outils DOIT dégrader gracieusement vers une réponse `a_verifier`, jamais un crash ni une confiance fabriquée. | Must |
| URS-F-210quinquies | `AIConfiguration` (ensemble d'outils disponibles) DOIT être versionnée et immuable — une `AIRequest` référence toujours la configuration exacte utilisée (reproductibilité, invariant #4). | Should |
| URS-F-210sexies | **Limite assumée** : `Risk`/`Hazard`/`Control` (domaine Quality cible) ne sont pas des outils de ce périmètre — non construits dans ce projet à ce jour. `AIModelVersion`/`AIEvaluation` (entités cible séparées) ne sont pas construites — `AIResponse.version_moteur` (champ nullable) suffit à ce stade. Aucun support natif d'appel d'outils côté fournisseur (function calling) : le protocole est entièrement textuel et interprété côté navigateur (le relais reste un simple proxy sans état, TD-007). | — |

### 4.22 Coquille UX — sidebar, Accueil, mode dual *(nouveau v43 — Phase 16 de convergence architecturale, 26/08/2026 ; spec `docs/convergence/PHASE_16_COQUILLE_UX_SPEC.md`)*

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-220 | Le système DOIT présenter une navigation partagée (`BarreLaterale`) groupée par intention (Accueil, Mon travail, Mon site, Clients & configuration) sur tous les écrans, plutôt qu'un bandeau de navigation reconstruit indépendamment par chaque écran. | Should |
| URS-F-220bis | Le système DOIT présenter un écran d'accueil "Que voulez-vous faire ?" à la racine (`/`), remplaçant l'ancienne redirection directe vers le Tableau de bord (déplacé vers `/tableau-de-bord`, même nom de route, aucune régression des liens existants). | Should |
| URS-F-220ter | Le système DOIT mémoriser, côté navigateur uniquement (jamais en base), le dernier client visité, pour proposer un accès direct à ses outils (Structure Système, Stratégie de qualification, Assistant IA, Miroir Drive) depuis la barre latérale — *(garde-fou, Must)* tant qu'aucun client n'a été visité, la barre latérale DOIT inviter explicitement à en choisir un, jamais un lien cassé ou un outil sans contexte. | Must |
| URS-F-220quater | Le système DOIT permettre de basculer entre Mode Expert et Mode Assistant, préférence mémorisée côté navigateur. | Could |
| URS-F-220quinquies | **Limite assumée** : dans ce périmètre, aucune différenciation comportementale réelle n'existe entre Mode Expert et Mode Assistant sur les écrans déjà construits — cette différenciation suppose la Phase 17 (Mission workspace), non encore construite. Aucun écran existant n'est supprimé ni son bandeau de navigation ad hoc retiré (nettoyage cosmétique différé). Aucun concept de "client actif" n'est persisté côté domaine/serveur. | — |

### 4.23 Mission workspace *(nouveau v44 — Phase 17 de convergence architecturale, 27/08/2026 ; spec `docs/convergence/PHASE_17_MISSION_WORKSPACE_SPEC.md` ; dernière phase du plan Phases 13-17, TD-010/TD-012)*

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-230 | Le système DOIT présenter, par client, un écran de liste des `Mission` (§4.19) avec création (titre, description, ancre optionnelle `Workspace`/`AssetNode`), et un Mission workspace dédié par `Mission` permettant de créer des `Activity` rattachées et de changer le statut de la `Mission` et de chaque `Activity`. | Should |
| URS-F-230bis | Depuis le Mission workspace, le système DOIT permettre de lier une dépendance d'ordre attendu entre deux `Activity` de la même `Mission`, et d'associer la `Mission` à un `QualityEvent` existant du client — *(garde-fou, Must)* toujours de façon non bloquante et non obligatoire, même discipline que §4.19/URS-F-190ter/quater. | Must |
| URS-F-230ter | Depuis le Mission workspace, le système DOIT permettre d'assembler un `ContextSnapshot` (§4.20) ancré sur le `Workspace`/`AssetNode` de la `Mission`, et d'afficher les éléments du dernier `ContextSnapshot` assemblé. | Should |
| URS-F-230quater | Depuis le Mission workspace, le système DOIT permettre d'invoquer le Reasoning Engine (§4.21) scopé à la `Mission` (historique des invocations précédentes affiché) — *(garde-fou non négociable, Must)* l'état de confiance de chaque réponse DOIT être présenté avec un style visuel dédié, jamais les jetons de `qualification_status`, pour ne jamais laisser croire qu'une réponse IA constitue un état de qualification (TD-010). | Must |
| URS-F-230quinquies | **Limite assumée** : aucune section Assessment/Requirement/Test/Evidence/Deliverable n'est directement rattachée au Mission workspace (appartient à `Strategy`, non construite — §4.19/URS-F-190quinquies). Aucun indicateur de "Validation State" n'est construit ici (TD-010/TD-012 : capacité différée, distincte de cette phase — le prochain incrément réel du Reasoning Engine est une analyse d'impact de changement ancrée sur `QualityEvent`). Aucune suppression de `Mission`/`Activity` n'est possible (cohérent avec l'absence de suppression ailleurs pour les entités à audit trail). | — |

### 4.24 Architecture Technique — relations typées entre `AssetNode` *(nouveau v45 — Phase 18 de convergence architecturale, 27/08/2026 ; première phase du plan `docs/convergence/VISION_NORTH_STAR_CONVERGENCE.md`, spec `docs/convergence/PHASE_18_ARCHITECTURE_TECHNIQUE_SPEC.md`, TD-013 ; répond au document "VALIDAPHARM MASTER PRODUCT VISION / NORTH STAR" et à sa checklist d'audit de capacités associée)*

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-240 | Le système DOIT permettre de créer une relation typée et dirigée (`controle_par`, `connecte_a`, `heberge_sur`) entre deux `AssetNode` existants du même client — *(garde-fou, Must)* les deux nœuds DOIVENT exister et appartenir au même client, rejeté explicitement sinon (jamais silencieusement toléré). | Must |
| URS-F-240bis | Le système DOIT permettre de tracer, depuis un `AssetNode` donné, la chaîne complète des relations techniques sortantes (ex. Equipment contrôlé par un PLC, connecté à un SCADA, hébergé sur un serveur), dans l'ordre de découverte. | Should |
| URS-F-240ter | Le moteur de raisonnement (§4.21) DOIT disposer d'un outil de traversée de cette chaîne, dont le résultat (nœuds atteints) est vérifiable par la garde de citation déterministe déjà existante (URS-F-210ter) — un `AssetNode` cité DOIT désormais pouvoir être résolu comme objet connu, même discipline que `Requirement`/`Test`/`Evidence`/`KnowledgeItem`. | Should |
| URS-F-240quater | **Limite assumée** : aucune nouvelle entité d'équipement (`Equipment`/`System`/`PLC`/`HMI`/`SCADA`/`Server`/`Database`/`Network`/`Software`) n'est créée — ces objets sont des `AssetNode` existants avec un `level_key` approprié, `AssetHierarchySchema.levels[]` étant déjà libre par client (TD-013). Aucune détection de cycle sur ces relations (même tolérance documentée qu'`AssetNode.associated_nodes[]`). Aucun écran dédié dans ce lot (domaine + persistance + store + outil de raisonnement seulement, même discipline que les Phases 5/8a/9/10/13). | — |

### 4.25 Cerveau procédural — `Procedure`/`ProcedureStep` *(nouveau v48 — Phase 20 de convergence architecturale, 27/08/2026 ; troisième phase du plan `docs/convergence/VISION_NORTH_STAR_CONVERGENCE.md`, spec `docs/convergence/PHASE_20_PROCEDURAL_KNOWLEDGE_SPEC.md`, TD-016)*

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-250 | Le système DOIT permettre de créer une `Procedure` (SOP/WI) structurée en `ProcedureStep` ordonnées (description, caractère obligatoire ou non, condition et responsable optionnels) — `reference` stable à travers les révisions, `numero_version` auto-incrémenté par référence (même patron que `SourceVersion`, §4.15). | Should |
| URS-F-250bis | *(garde-fou non négociable, Must)* Une `Procedure` DOIT être immuable une fois créée — une nouvelle révision de la même `reference` DOIT créer une nouvelle `Procedure`, jamais une mutation de l'existante (répond à R-21, `02-analyse-de-risque-outil.md` : ne jamais confondre une révision obsolète avec la version applicable). | Must |
| URS-F-250ter | Le moteur de raisonnement (§4.21) DOIT disposer d'un outil résolvant, pour une `reference` donnée, la version la plus récente (`numero_version` le plus élevé, jamais une version arbitraire) et listant ses étapes dans l'ordre — un `ProcedureStep` cité DOIT être vérifiable par la garde de citation déterministe existante (URS-F-210ter), même discipline que les autres objets citables. | Should |
| URS-F-250quater | **Limite assumée** : aucune structuration automatique par IA — `ProcedureStep` est toujours saisi par un humain ayant lu la procédure (assisté par l'ingestion Office native, §4.15), même discipline que `KnowledgeItem.valeur_interpretee` (garde-fou URS-F-150quinquies). Aucun suivi d'exécution/conformité (`ProcedureExecution`) — différé, même discipline que §4.19/URS-F-190quinquies (Workflow). Aucun écran dédié, aucun lien direct `Procedure`↔`Mission`/`Activity` dans ce lot. | — |

### 4.26 Parseur déterministe de structure procédurale *(nouveau v49 — Phase 21 de convergence architecturale, 27/08/2026 ; quatrième phase du plan `docs/convergence/VISION_NORTH_STAR_CONVERGENCE.md`, spec `docs/convergence/PHASE_21_PARSEUR_STRUCTURE_PROCEDURE_SPEC.md`, TD-017 ; en réponse à la question explicite de l'utilisateur sur la nécessité de l'IA pour lire/comprendre/suivre une procédure)*

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-260 | Le système DOIT pouvoir segmenter le texte brut d'une SOP (issu de l'ingestion Office native §4.15 ou de l'OCR §4.15) en sections à rôle sémantique connu (objectif, périmètre, responsabilités, définitions, procédure, références, gestion des écarts, documentation, annexes), en reconnaissant les libellés numérotés propres à chaque client (ex. "OBJECTIF" ou "But", "CHAMP D'APPLICATION" ou "Domaine d'application") — sans appel à un modèle IA. | Should |
| URS-F-260bis | Un en-tête numéroté de premier niveau reconnu comme tel mais absent du dictionnaire de libellés connus DOIT être classé dans une catégorie "autre" — jamais silencieusement écarté. L'absence totale d'en-tête reconnaissable DOIT retourner un résultat vide, jamais une erreur. | Must |
| URS-F-260ter | Le système DOIT proposer, à partir du corps de la section "procédure", des étapes candidates (description, condition détectée si présente, responsable détecté si présent) — condition et responsable DOIVENT rester `null` plutôt que d'être devinés en l'absence de motif clair. | Should |
| URS-F-260quater | **Limite assumée** : le résultat de ce parseur (`PropositionStructureProcedure`) est une proposition en mémoire, jamais persistée — aucune écriture dans `Procedure`/`ProcedureStep` (§4.25) sans confirmation humaine explicite via les fonctions existantes du store (même garde-fou que URS-F-250quater). Ce parseur cible le genre "SOP qualité" à en-têtes numérotés ; sur un genre différent (ex. instruction technique illustrée par tableaux d'étapes), il peut sur-segmenter en sections "autre" — limite documentée, pas un échec silencieux. Aucun repli IA-assisté ni écran de revue construits dans ce lot. | — |
| URS-F-260quinquies | *(TD-018)* Le système DOIT reconnaître un en-tête de section par la présence d'un mot-clé fort à l'intérieur du titre (ex. "Procedures" dans "PLC Procedures") lorsque le titre complet ne correspond à aucune entrée exacte du dictionnaire — essayé seulement après la correspondance exacte, jamais à sa place. | Should |
| URS-F-260sexies | *(TD-018)* Le système DOIT reconnaître un sous-titre numéroté à deux ou trois niveaux (ex. "2.1 Pre-requisites") comme un contexte à attacher aux étapes qui suivent — jamais comme une nouvelle section ni comme une étape en tant que telle. Le système DOIT utiliser en priorité les lignes à puce/numéro explicites comme étapes candidates ; si une section "procédure" n'en contient aucune, chaque ligne non vide DOIT devenir une étape candidate à la place, plutôt que de renvoyer une liste vide. | Should |
| URS-F-260septies | **Limite de fond, non close par cette extension** : une couverture déterministe de "tous les types" de SOP reste hors de portée d'un système de règles — les frontières sémantiques d'un document en langage naturel ne sont pas un ensemble fini de motifs syntaxiques. Cette extension répond au genre "procédure numérotée sans plan qualité" (vérifié sur un 3ᵉ document réel, IMA "4915BRP"), pas au genre "instruction technique illustrée par tableaux d'étapes" (URS-F-260quater). Le repli IA-assisté reste la seule façon de fermer réellement cet écart — point ouvert distinct, non engagé. | — |

## 5. Exigences non fonctionnelles

### 5.1 Fiabilité et qualité

| ID | Exigence | Priorité |
|---|---|---|
| URS-NF-001 | Tout calcul réglementaire DOIT être déterministe, testé unitairement, jamais délégué à l'IA générative. | Must |
| URS-NF-002 | Comportement identique et reproductible pour une même saisie. | Must |
| URS-NF-003 | Toute suggestion IA DOIT être visuellement distincte du contenu validé. | Must |
| URS-NF-045 | *(nouveau v05 — revue technique E5)* Le système DOIT détecter et gérer le cas d'une modification concurrente du même livrable dans deux onglets/sessions du même poste (ex. verrouillage optimiste, avertissement avant écrasement). | Must |
| URS-NF-046 | *(nouveau v05 — revue technique E5)* Le modèle de données pivot DOIT être versionné indépendamment des gabarits (au-delà d'URS-REG-003), avec un mécanisme de migration testé permettant l'évolution du schéma sans perte des données existantes. | Must |
| URS-NF-046bis | *(nouveau v09 — audit Swissmedic simulé, MAJ-03)* Lorsqu'un défaut est corrigé dans le moteur de calcul déterministe, le système DOIT permettre d'identifier, via `template_engine_version` (URS-F-004bis), les sections déjà "validé en interne" produites avec la version défectueuse, pour engager une revue d'impact rétrospective (CAPA). Le simple enregistrement de la version (déjà couvert par F-004bis) ne suffit pas sans mécanisme d'exploitation à cette fin. | Must |
| URS-NF-046ter | *(nouveau v11 — revue FDS, E3)* L'alerte de revue d'impact rétrospective (URS-NF-046bis) DOIT nécessiter un accusé de réception explicite de l'utilisateur avant de pouvoir être masquée — un bandeau simplement visible mais ignorable est insuffisant compte tenu de la sévérité du risque associé (AR-R-39, S=5). | Must |
| URS-NF-046quater | *(nouveau v13 — revue SDS, E2)* Toute migration du schéma de données pivot (URS-NF-046) DOIT être précédée d'une sauvegarde vérifiable de l'état antérieur, et DOIT prévoir un mécanisme de retour arrière testé en cas d'échec en cours d'exécution — une migration "testée" au sens de URS-NF-046 inclut nécessairement ce cas d'échec, pas seulement le cas nominal. | Must |
| URS-NF-052 | *(nouveau v07 — auto-challenge, précisé v22)* L'interface DOIT rester réactive (temps de réponse perçu acceptable) jusqu'à un volume de référence — un test de charge correspondant DOIT être spécifié en OQ/PQ de l'outil. Volume de référence Phase 1 : jusqu'à 500 projets et 5000 sections par client. | Should |
| URS-NF-052bis | *(nouveau v22 — checklist de complétude §6ter)* Chargement de l'écran principal (tableau de bord) et ouverture d'une section DOIVENT rester sous 2 secondes perçues sur un poste de travail standard, dans les limites du volume de référence (URS-NF-052). Au-delà de ce volume, l'outil DOIT dégrader gracieusement (ex. pagination, chargement progressif) plutôt que devenir inutilisable ou se bloquer silencieusement. | Should |
| URS-NF-053 | *(nouveau v12 — audit QA spécialisés, MAJ-01)* Un journal d'anomalies léger DOIT permettre de consigner toute anomalie constatée dans l'outil (au-delà du cas spécifique du moteur de calcul déjà couvert par URS-NF-046bis/046ter) — description, statut de suivi (ouvert/en cours/clos), horodatage — consultable par l'utilisateur. Proportionné à la Phase 1 mono-utilisateur : pas un processus CAPA complet, un suivi minimal auditable. | Must |
| URS-NF-045bis | *(nouveau v08 — revue FS, E5)* Le système DOIT détecter un conflit de fusion Git sur les fichiers de données structurées résultant d'une modification hors-ligne du même livrable sur deux postes différents, et présenter une interface de résolution assistée — jamais une fusion automatique silencieuse au niveau des champs, et jamais l'exposition de marqueurs de conflit Git bruts à l'utilisateur. Distinct de URS-NF-045 (conflit multi-onglets du même poste). | Must |

### 5.2 Portabilité et continuité

| ID | Exigence | Priorité |
|---|---|---|
| URS-NF-010 | Récupération intégrale des données depuis n'importe quel poste, via le dépôt Git dédié. | Must |
| URS-NF-030 | Chaque modification DOIT être attribuable et horodatée, via l'historique Git et protégé contre la réécriture (branche principale protégée, dès la Phase 1). **(amendé v23 — architecture web pure sans installation, décision explicite du 23/08/2026)** L'attribution se fait par l'API GitHub (jeton authentifié), pas par signature cryptographique GPG/SSH locale (impossible sans binaire `git` installé) — limite Phase 1 assumée, distincte de l'audit trail Part 11 complet (Phase 3), documentée explicitement plutôt que présentée comme une signature qu'elle n'est pas. | Must |
| URS-NF-011 | Copie miroir Drive maintenue comme filet de secours. | Must |
| URS-NF-012 | Fonctionnement sans réseau pour toutes les fonctions de rédaction/gabarits. | Must |
| URS-NF-047 | *(nouveau v05 — revue technique E5)* Le système DOIT surveiller l'usage de sa capacité de stockage local et avertir l'utilisateur avant d'atteindre les limites du navigateur. | Should |
| URS-NF-049 | *(nouveau v05 — revue technique E5)* Le système DOIT offrir un point de restauration explicite en libre-service (au-delà de la synchronisation automatique et de l'historique Git), permettant de revenir à un état antérieur connu. | Should |
| URS-NF-055 | *(nouveau v22 — checklist de complétude §6ter, amendé v23 — architecture web pure)* La désinstallation de l'outil DOIT être réalisable sans reliquat : suppression du site depuis l'écran d'accueil s'il est installé en PWA, et effacement du stockage du navigateur (IndexedDB, cache) pour ce site — aucun exécutable, aucune modification de configuration système, cohérent avec l'architecture web pure sans installation. | Should |
| URS-NF-055bis | *(nouveau v22 — checklist de complétude §6ter)* Un rollback vers une version antérieure de l'application (retour à un tag Git antérieur) DOIT être possible sans corrompre les données existantes. Si la version antérieure de l'application ne sait pas lire le `schema_version` courant des données (URS-NF-046), elle DOIT refuser explicitement de démarrer plutôt que de risquer une lecture/écriture incorrecte silencieuse — le mécanisme de migration (URS-NF-046quater) protège la montée de version, celui-ci protège symétriquement la rétrogradation. | Must |

### 5.3 Sécurité et confidentialité

| ID | Exigence | Priorité |
|---|---|---|
| URS-NF-020 | Aucune donnée de livrable transmise à un tiers sans action explicite. | Must |
| URS-NF-021 | Dépôt Git dédié privé, accès restreint. | Must |
| URS-NF-022 | Modèle de données prêt pour la gestion d'accès multi-utilisateur dès la Phase 1 (UI mono-utilisateur). | Must |
| URS-NF-023 | (Phase multi-utilisateur) Identifiants d'authentification hachés, jamais en clair. | Must (phase ultérieure) |
| URS-NF-024 | (Phase multi-utilisateur) Journalisation inaltérable des accès et actions significatives. | Must (phase ultérieure) |
| URS-NF-025 | *(nouveau v05 — point F de la revue littéraire)* Le système DEVRAIT permettre de partager un projet en lecture seule et temporaire avec un tiers externe (ex. auditeur), sans lui octroyer un compte utilisateur complet. | Should (Phase 3, nécessite l'infrastructure multi-utilisateur) |
| URS-NF-044 | *(nouveau v05 — revue technique E5, amendé v23)* Aucun secret (clé API, jeton d'authentification) NE DOIT être stocké en clair dans le dépôt Git ni dans le code source. **(amendé v23)** En architecture web pure sans installation (pas de mécanisme de configuration locale hors navigateur), le jeton GitHub/Drive/IA est stocké dans le stockage du navigateur — jamais en clair dans le code, jamais transmis à un tiers autre que son API cible. | Must |
| URS-NF-044bis | *(nouveau v23 — décision explicite du 23/08/2026, architecture web pure)* Le jeton d'accès GitHub utilisé par l'application DOIT être à portée restreinte (scope limité au dépôt dédié uniquement, jamais un jeton à portée large sur l'ensemble du compte GitHub de l'utilisateur) — limite le dommage en cas de compromission du poste ou du navigateur. | Must |
| URS-NF-044ter | *(nouveau v25 — `REV-URS-VALIDAPHARM-2026-010`, E4/E5)* Le relais serverless intermédiaire entre le navigateur et le fournisseur IA cloud (nécessaire pour masquer la clé API) ne DOIT jamais persister le contenu d'une requête ou d'une réponse au-delà du traitement de l'appel en cours (fonctionnement sans état) — sans quoi il dupliquerait, hors du dépôt Git, une donnée qui doit rester sous le contrôle du dépôt (URS-NF-021). Cette absence d'état est ce qui permet de traiter le relais comme un composant d'infrastructure (comme l'hébergement), pas comme un nouveau composant applicatif à qualifier séparément. | Must |
| URS-NF-048 | *(nouveau v05 — revue technique E5, lié à URS-F-032)* Le système DOIT intégrer un garde-fou technique (quota/seuil configurable par fournisseur) contre une consommation excessive imprévue d'un service cloud IA (maîtrise des coûts). | Must |
| URS-NF-051 | *(nouveau v07 — auto-challenge)* Aucune télémétrie, statistique d'usage ou rapport d'erreur automatique NE DOIT être transmis à un service tiers sans consentement explicite et distinct du consentement chat/IA (URS-F-034). | Must |

### 5.4 Traçabilité et audit

| ID | Exigence | Priorité |
|---|---|---|
| URS-NF-031 | Historique complet des révisions d'un livrable consultable. | Must |
| URS-NF-032 | (Phase Part 11) Signature électronique conforme 21 CFR Part 11/Annexe 11. | Must (phase ultérieure) |

### 5.5 Utilisabilité

| ID | Exigence | Priorité |
|---|---|---|
| URS-NF-040 | *(amendé v06)* Interface disponible en plusieurs langues (français, anglais, allemand dès la Phase 1 ; chinois, arabe en phases ultérieures), avec un vocabulaire adapté au domaine qualité/validation pharma dans chaque langue — pas une traduction littérale. | Must |
| URS-NF-040bis | *(nouveau v06)* Le choix de la langue DOIT être configurable par utilisateur et/ou par projet. | Should |
| URS-NF-040ter | *(nouveau v06)* Chaque langue ajoutée DOIT être validée par un expert du domaine natif de cette langue avant mise en service — pas de traduction automatique non validée. | Must |
| URS-NF-040quater | *(nouveau v06, technique)* L'architecture logicielle DOIT supporter nativement les mises en page bidirectionnelles (RTL pour l'arabe) et les jeux de caractères CJK (chinois) dès la conception de l'interface, même si ces langues sont livrées en phase ultérieure. | Should |
| URS-NF-041 | Utilisable sans formation préalable pour un professionnel du domaine. | Should |
| URS-NF-042 | Temps de rédaction significativement réduit vs Word manuel. | Should |
| URS-NF-043 | *(nouveau)* La priorité de conception Phase 1 est la fiabilité et le caractère défendable GMP du contenu et du raisonnement produits, avant l'automatisation du workflow d'approbation (voir §2). | Must |
| URS-NF-050 | *(nouveau v05 — revue technique E5)* Le système DOIT offrir une accessibilité clavier de base pour les fonctions critiques (navigation, saisie, export). | Should |
| URS-NF-050bis | *(nouveau v22 — checklist de complétude §6ter)* Les composants interactifs et le contenu porteur de sens fonctionnel (statuts, alertes, messages système) DOIVENT exposer un nom/rôle accessible compatible avec un lecteur d'écran standard (ex. NVDA/VoiceOver), sur les mêmes parcours critiques que URS-NF-050 (navigation, saisie, export). | Should |

### 5.6 Charte graphique et identité visuelle *(nouveau v21 — REV-URS-VALIDAPHARM-2026-010)*

| ID | Exigence | Priorité |
|---|---|---|
| URS-NF-054 | L'écran de travail DOIT véhiculer une identité visuelle moderne, fluide et premium (micro-interactions soignées, retours visuels immédiats, transitions douces) — critère explicite de l'utilisateur, distinct du ton strictement documentaire des livrables exportés (voir URS-NF-054bis). | Must |
| URS-NF-054bis | Les livrables exportés (Word/PDF, destinés à un usage réglementaire opposable) DOIVENT conserver une présentation sobre et strictement documentaire, indépendamment du style de l'écran de travail — l'identité visuelle "premium/ludique" de l'outil ne DOIT jamais se propager dans le contenu exporté. | Must |
| URS-NF-054ter | Toute information fonctionnelle portée par une couleur (notamment `qualification_status`, criticité IPR/AMDEC) NE DOIT JAMAIS être encodée par la couleur seule — un second indicateur (icône, libellé texte, motif) DOIT toujours l'accompagner, pour rester lisible en cas de daltonisme. | Must |
| URS-NF-054quater | Le contraste texte/fond de toute information porteuse de sens fonctionnel DOIT atteindre un niveau reconnu (référence : WCAG 2.1 niveau AA), y compris pour les couleurs de statut. | Should |
| URS-NF-054quinquies | L'écran de travail et les documents exportés DOIVENT utiliser des familles de polices distinctes et intentionnelles : une police système moderne pour l'écran, une police classique à empattements pour les documents exportés, cohérente avec l'usage réglementaire de ces derniers. | Should |

### 5.7 Modularité et protection de la propriété intellectuelle *(nouveau v24 — suggestion d'un ingénieur logiciel externe consulté par l'utilisateur, 24/08/2026)*

| ID | Exigence | Priorité |
|---|---|---|
| URS-NF-056 | Le code applicatif DOIT être organisé en modules à faible couplage et forte cohésion (séparation présentation / logique métier / connecteurs / persistance, déjà actée en `08-conventions-codage.md`), pour la maintenabilité et la testabilité — l'ajout ou le remplacement d'un module ne DOIT pas nécessiter de modifier les autres. | Must |
| URS-NF-057 | *(mise en garde documentée, pas une exigence technique testable)* L'organisation modulaire du code (URS-NF-056) NE DOIT PAS être présentée comme garantissant l'impossibilité de récupérer le code source complet en cas de livraison de l'application à un client : dans une PWA servie par le navigateur, le code JavaScript exécuté côté client reste, par construction, techniquement accessible (inspection navigateur, téléchargement des fichiers déployés) — la minification/l'obfuscation (activées en production, voir SDS) rendent le code difficile à lire, pas impossible à extraire. Ce constat DOIT être communiqué explicitement à l'utilisateur pour éviter un faux sentiment de protection. | Must |
| URS-NF-058 | La protection effective de la propriété intellectuelle en cas de livraison à un tiers DOIT reposer en priorité sur un mécanisme contractuel (licence d'usage, cession ou non-cession de droits, clause de confidentialité/NDA) et non sur la seule protection technique du code — point hors périmètre de conception logicielle, à traiter par l'utilisateur avec un conseil juridique avant toute livraison. | Should |

## 6. Exigences réglementaires et de conformité

| ID | Exigence | Priorité |
|---|---|---|
| URS-REG-001 | Conception basée sur le risque, cohérente avec GAMP 5. | Must |
| URS-REG-002 | Livrables de qualification de l'outil produits en parallèle du code. | Must |
| URS-REG-003 | Gabarits versionnés indépendamment du code applicatif. | Should |
| URS-REG-004 | *(nouveau v13 — revue SDS, E4)* La maîtrise des changements de la logique métier (moteur de calcul, machine à états, grilles de décision) DOIT être techniquement appliquée — un mécanisme automatisé DOIT bloquer l'intégration d'une modification de code dont les tests unitaires associés échouent, pas seulement une pratique déclarée reposant sur la discipline du développeur. Point identifié lors de l'audit du cabinet de conseil GxP sur la FDS, explicitement renvoyé à la SDS pour concrétisation. | Must |

Clarification de périmètre normatif : EN/IEC 62304 ne s'applique pas à ValidaPharm (outil interne, non intégré à un dispositif médical) — le cadre applicable est GAMP 5.

**Analyse des "predicate rules" applicables (ajoutée v10 — audit FDA simulé, MAJ-FDA-01)** : question distincte de la clarification EN/IEC 62304 ci-dessus — quelle règle de fond (21 CFR 211 pour les BPF médicament, 21 CFR 820 pour les dispositifs médicaux) s'applique aux **enregistrements produits par l'outil** une fois utilisés par le client, indépendamment du statut de l'outil lui-même ? Conclusion retenue : **tant qu'un livrable reste dans ValidaPharm** (quel que soit son statut interne, y compris "validé en interne"), **aucune predicate rule ne s'applique à l'outil** — ValidaPharm n'est pas le système d'enregistrement officiel du client, il produit des brouillons/propositions (cohérent avec URS §8, "brouillon d'aide" ≠ enregistrement GxP officiel). La predicate rule (211 ou 820 selon le cas) ne s'active qu'au moment où le client reprend formellement le livrable dans son propre système qualité (eQMS, DHF, DMR) — à ce moment, la responsabilité de conformité et de conservation légale (ex. 21 CFR 820.180 : durée de vie du dispositif, minimum 2 ans) devient celle du système qualité du client, pas de ValidaPharm.

**Référence complémentaire (ajoutée v07 — auto-challenge)** : l'**ISPE GAMP AI Guide (juillet 2025)** — guide dédié à l'usage de l'intelligence artificielle dans des systèmes GxP, publié en complément de GAMP 5 (2ᵉ édition, 2022) — DOIT être utilisé comme référence de fond pour la conception du routeur IA, du chat expert et des assistants (§4.1bis, §4.4, §4.6, §4.8), en complément des principes ICH Q9 déjà cités. Identifié tardivement (audit d'auto-challenge du 21/08/2026) alors qu'il avait été repéré dès la recherche initiale sur GAMP 5 — non exploité jusqu'ici, corrigé.

## 7. Contraintes

- C-01 : Fonctionnement sur postes Windows/Mac habituels, sans droits d'administration complexes.
- C-02 : Pas de dépendance à un service payant obligatoire pour les fonctions cœur.
- C-03 : Dépôt Git dédié hébergé sur GitHub, en dépôt privé.
- C-04 : La confidentialité du dépôt dépend de la sécurité du compte GitHub de l'utilisateur (2FA recommandée) — hors périmètre de conception de l'outil.

## 8. Hors périmètre (Phase 1)

- Authentification multi-utilisateur opérationnelle.
- Signature électronique Part 11.
- Application mobile.
- *(retiré v16)* ~~Intégration ERP/QMS tiers~~ — exclusion levée le 22/08/2026, voir §4.9. Restent hors périmètre : synchronisation continue/automatique (webhook temps réel) et connecteurs autres que Veeva Vault/SAP/TrackWise.
- Génération de texte libre par IA sans encadrement par gabarit.
- Un livrable "brouillon d'aide" n'est pas, et ne doit jamais être présenté comme, un enregistrement GxP officiel tant qu'il n'a pas été formellement repris dans le système qualité réel de l'organisation.

## 9. Critères d'acceptation globaux de la Phase 1

1. Un Projet peut être créé, avec au moins deux sections liées entre elles et une section Documents opérationnelle.
2. Les gabarits du catalogue (§10) sont rejouables sans erreur et exportables Word/PDF/JSON.
3. Aucune donnée perdue après fermeture/réouverture sur le même poste.
4. *(amendé v23 — architecture web pure)* Données retrouvées à l'identique en se connectant depuis un second poste (navigateur + jeton, aucune installation) ; commits attribués par jeton API vérifiables dans l'historique GitHub (pas une signature cryptographique GPG/SSH, voir URS-NF-030).
5. Sauvegarde miroir Drive à jour après une session.
6. Chat expert cloud/local avec bascule visible, sessions journalisées.
7. Aucun calcul réglementaire, ni aucune conclusion de la grille de stratégie de qualification, généré par l'IA générative sans validation humaine explicite.
8. *(ajouté v06)* Une section "Contexte procédé" peut être créée et liée à une section OQ/PQ/Validation de procédé du même projet.
9. *(ajouté v06)* L'architecture des workflows (rédaction/co-rédaction, revue, approbation) est en place, même si l'activation de signature reste hors périmètre Phase 1.
10. *(ajouté v06)* L'interface et les gabarits sont utilisables en français, anglais et allemand, chaque langue ayant été validée par un expert natif du domaine.
11. *(ajouté v06)* Aucune fonction d'analyse de document, de certificat ou de challenge de dossier ne produit de verdict "conforme"/"non conforme" attribué à l'outil — uniquement des constats à vérifier.
12. *(ajouté v07)* Aucune télémétrie ou donnée d'usage n'est transmise sans consentement explicite et révocable de l'utilisateur, avec état du consentement visible à tout moment.
13. *(ajouté v07)* Chaque fournisseur IA connectable (Claude par défaut, extension possible OpenAI/Copilot/DeepSeek…) est qualifié à la fois sur le traitement des données (déjà couvert v05) et sur sa fiabilité/qualité de réponse, avant activation pour un usage réel.
14. *(ajouté v08 — revue FS)* Une section IQ ne peut être finalisée sans lien vers un Plan de métrologie ; une section OQ ne peut être clôturée sans lien vers un Plan de maintenance — même mécanisme que le Contexte procédé (critère 8).
15. *(ajouté v08 — revue FS)* Un changement de version d'un fournisseur IA actif depuis sa dernière qualification de fiabilité déclenche une alerte de re-qualification, visible avant tout usage réel.
16. *(ajouté v08 — revue FS)* Un conflit de fusion Git entre deux postes ayant modifié le même livrable hors-ligne est détecté et présenté via une interface de résolution assistée, jamais par une fusion silencieuse ni par l'exposition de marqueurs Git bruts.
17. *(ajouté v09 — audit Swissmedic simulé)* L'échantillon de questions-types de qualification de fiabilité IA est versionné et stable entre qualification initiale et re-qualification.
18. *(ajouté v09 — audit Swissmedic simulé)* Une correction de défaut du moteur de calcul permet d'identifier les sections déjà validées produites avec la version défectueuse, en vue d'une revue d'impact.
19. *(ajouté v09 — audit Swissmedic simulé)* L'équivalence de contenu entre versions linguistiques d'un même gabarit est vérifiée par un test de non-régression dédié.
20. *(ajouté v10 — audit FDA simulé)* L'export d'un livrable "validé en interne" rappelle explicitement le transfert de responsabilité de conservation réglementaire vers le système qualité du client.
21. *(ajouté v11 — revue FDS)* L'alerte de revue d'impact CAPA (défaut moteur corrigé) exige un accusé de réception explicite avant de pouvoir être masquée.
22. *(ajouté v11 — revue FDS)* Toute action de forçage d'un garde-fou non négociable capture un motif texte obligatoire, journalisé aux côtés de l'horodatage et de l'acteur.
23. *(ajouté v12 — audit QA spécialisés)* Un journal d'anomalies léger permet de consigner et suivre toute anomalie constatée dans l'outil, au-delà du cas spécifique du moteur de calcul.
24. *(ajouté v13 — revue SDS)* Toute migration de schéma est précédée d'une sauvegarde vérifiable et dispose d'un mécanisme de retour arrière testé.
25. *(ajouté v13 — revue SDS)* Un mécanisme automatisé bloque l'intégration d'une modification de la logique métier dont les tests unitaires échouent.
26. *(ajouté v16)* Un connecteur QMS tiers (Veeva Vault) peut être configuré par client, avec pull de donnée de référence et push d'un livrable validé, jamais sans confirmation explicite (client + système + tenant).
27. *(ajouté v16)* Un push réussi affiche une méta-donnée visible de suivi externe ; un pull respecte les mêmes garde-fous que la génération par adaptation (URS-F-060bis à 064).
28. *(ajouté v17)* Un référentiel d'actifs hiérarchique, partagé par client, peut être créé avec une hiérarchie configurable, sélectionné à la création d'un projet, et alimenté par pull SAP ou saisie manuelle.
29. *(ajouté v17)* Un renommage d'un nœud du référentiel ne modifie jamais silencieusement un livrable déjà lié (instantané conservé) ; deux nœuds d'un même client ne peuvent jamais porter le même code.
30. *(ajouté v18)* Depuis un nœud du référentiel, un dossier vivant liste ses livrables (filtré par défaut sur "validé en interne"), avec possibilité de lien section↔nœud plus fin que le lien de projet.
31. *(ajouté v19)* Le dossier vivant d'un nœud est exportable en PDF, historique chronologique complet, avec bandeau de périmètre des données couvertes.
32. *(ajouté v20)* Un nœud peut être marqué "soumis à qualification périodique" avec date limite ; son statut de qualification (liste fermée standardisée) est dérivé automatiquement de cette date le cas échéant, journalisé, et déclenche un avertissement (non bloquant) à la sélection si "Requalification en retard" ou "Suspendu".

## 10. Catalogue des gabarits (outils et mini-outils) *(nouveau — issu de la lecture ASTM E2500 / EudraLex Annexe 15 / ICH Q9)*

Restructuration des gabarits en familles ("outils") et sous-types ("mini-outils"), suite à l'identification d'écarts par rapport aux normes de référence (voir REV-CATALOGUE-VALIDAPHARM-2026-001).

| Outil | Mini-outils | Statut |
|---|---|---|
| A. Cadrage | Contexte (section de projet), **URS** *(nouveau)* | URS nouveau à développer |
| B. Conception | **DQ / Revue de conception** *(nouveau)* | Nouveau |
| C. Protocoles | FAT, SAT, IQ, OQ, PQ | Existant, regroupé |
| D. Validation de procédé | **Classique (3 lots)**, **vérification continue**, **hybride** *(nouveau)* | Nouveau — écart majeur identifié (Annexe 15 §5) |
| E. Validation de nettoyage | — | Existant, inchangé |
| F1. Impact Assessment / System Classification *(nouveau v26 — brique séparée de F2/F3)* | Questionnaire à 6-9 questions (variable par client) appliqué à **chaque système**, verdict binaire Direct Impact / Not Direct Impact — détermine si le système entre dans le périmètre GMP qualifiable, en amont de toute analyse de risque | Nouveau — brique manquante identifiée en Phase 0 de convergence (25/08/2026) |
| F2. Analyse de risque | ICH Q9 générique, AMDEC/FMEA/FMECA, **ACFC — Analyse de Criticité des Fonctions et Composants** *(questionnaire de 4 à 10 questions par composant/fonction — variable selon le site, jamais universel — déterminant la criticité vis-à-vis du produit et de la sécurité patient ; méthode configurable parmi d'autres pour cette étape, pas la seule)* — s'applique uniquement aux systèmes classés Direct Impact par F1 | Existant + extensions |
| F3. Computer System Assessment | Évaluation dédiée aux systèmes informatisés (catégorie GAMP, pertinence GxP/ERES/Part 11) — brique distincte de F1 et F2, jamais fusionnée avec elles | Existant + extensions |
| G. Systèmes informatisés | CSV, Data Integrity | Existant, inchangé |
| H. Changements & non-conformités | Change Control, Déviation, Investigation, CAPA, Constat d'audit *(Déviation/Investigation/Constat d'audit ajoutés v29 — Phase 5 de convergence architecturale, 25/08/2026 : `QualityEvent`, gap trouvé en intégrant les exigences de la Target Architecture, absents jusqu'ici alors que la Revue périodique — famille I — appartient au même objet générique)* | Existant + extensions |
| I. Pilotage projet | VMP + traçabilité (fusion du Cycle en V), **Rapport de synthèse/clôture** *(nouveau)*, **Revue périodique** *(nouveau, léger)* | Restructuré |
| J. Assistants IA transverses | Assistant de stratégie de qualification (§4.6), Génération par adaptation (§4.1bis), Gabarits d'export client (§4.3bis) | Nouveau |
| K. Sélection et qualification fournisseur *(nouveau v05)* | Évaluation/audit fournisseur — étape amont, souvent antérieure à l'URS et la DQ dans un projet d'achat d'équipement | Nouveau — issu de l'expertise métier |
| L. Métrologie *(nouveau v06)* | Plan de métrologie/étalonnage (liste d'instruments, fréquences, tolérances, certificats), lié à l'IQ | Nouveau |
| M. Maintenance *(nouveau v06)* | Plan de maintenance préventive, lié à la clôture de l'OQ (Annexe 15 §3.12) | Nouveau |
| N. Connecteurs QMS tiers *(nouveau v16)* | Configuration de connexion (§4.9) : Veeva Vault (référence, Should Phase 1), SAP/TrackWise (Could, extensibles via le même pattern) | Nouveau — décision utilisateur de lever l'exclusion Phase 1 |
| O. Structure Système / référentiel d'actifs *(nouveau v17)* | Référentiel hiérarchique et flexible par client (§4.10) : systèmes, équipements, utilités, locaux, hiérarchie configurable, alimentable par pull SAP ou saisie manuelle | Nouveau — besoin exprimé par l'utilisateur |

**F1/F2/F3 clarifiés et corrigés (25/08/2026 — Phase 0 de convergence architecturale, `docs/convergence/ARCHITECTURE_CONFLICTS.md` CONFLICT-002/003)** : la note du 21/08/2026 disait à tort qu'ACFC et Computer System Assessment étaient "fusionnés en un seul mini-outil" et décrivait un modèle d'impact à 3 niveaux ("direct/indirect/aucun"). Trois sources indépendantes contredisent cette fusion : le document réel Ferring "Project Master Plan for Migrating FSMP Automation Systems to a DCS" (System Impact Assessment → Computerized System Assessment → Risk Analysis, trois étapes séquentielles distinctes), l'ISPE Baseline Guide: Commissioning and Qualification 2ᵉ édition (System Classification ≠ System Risk Assessment, jamais fusionnés, modèle **binaire** Direct/Not Direct Impact, la notion "Indirect Impact" étant explicitement retirée de la pratique de référence), et le package Target Architecture v5.0 lui-même (`CriticalityAssessment`/`ImpactAssessment`/`CSVAssessment`/`GxPAssessment` comme types distincts partageant seulement un moteur commun).

Séquence corrigée, désormais actée :
1. **F1 — Impact Assessment / System Classification** : questionnaire binaire appliqué à **chaque système** (pas à chaque composant), verdict Direct Impact / Not Direct Impact. Un système Not Direct Impact est simplement commissionné (vérification technique) ; un système Direct Impact passe aux étapes suivantes.
2. **F2 — Analyse de risque (Risk Analysis)** : appliquée uniquement aux systèmes classés Direct Impact par F1. L'ACFC en est une méthode possible parmi d'autres (avec AMDEC/FMEA/FRA), jamais la seule — questionnaire de 4 à 10 questions selon le client, jamais universel, avec la règle "au moins un Oui → critique" elle-même configurable par méthode client (pas une règle ValidaPharm universelle).
3. **F3 — Computer System Assessment** : brique distincte, applicable aux systèmes informatisés, répond à "catégorie GAMP ? pertinence GxP/ERES/Part 11 ?".

**Gap trouvé en corrigeant ce point** : l'ancienne note faisait référence à un "gabarit CSV existant" — vérification faite (`docs/convergence/CURRENT_ARCHITECTURE.md`), ce gabarit **n'existe pas** dans le catalogue implémenté (`TemplateType` n'a pas d'entrée `csv`). La référence est retirée ; le gabarit CSV complet reste à construire quand le chantier F3/CSV sera engagé.

**Point restant, priorité basse** : pertinence de mini-outils dédiés Validation du transport / Validation de l'emballage / Validation des méthodes analytiques (identifiés dans l'Annexe 15 mais non demandés explicitement par l'utilisateur — proposés en Should).

## 11. Traçabilité (à compléter au fil du projet)

| Exigence URS | Réf. FS | Réf. implémentation | Réf. test (IQ/OQ/PQ outil) | Statut |
|---|---|---|---|---|
| URS-F-000 | — | — | — | À faire |
| ... | | | | |

*Ce tableau sera complété au fur et à mesure de la conception détaillée (FS) et du développement.*

---
*Document vivant, version 25 — v06-v13 : voir historique complet dans le corps du document et les REV/AUDIT associés. v16 connecteurs QMS tiers. v17 Structure Système (référentiel d'actifs, arbre + graphe). v18 dossier vivant d'un actif. v19 export PDF de l'historique de qualification. v20 statut de qualification standardisé par nœud. v21 (23/08/2026) : charte graphique et identité visuelle. v22 (23/08/2026) résorbe les trois gaps mineurs de la checklist §6ter (performance/capacité, lecteur d'écran, désinstallation/rollback). **v23 (23/08/2026, décision explicite de l'utilisateur) : architecture web pure sans installation** — contrainte réelle du poste de travail professionnel (IT bloque les logiciels non autorisés, seuls le navigateur et github.com le sont). URS-NF-030 amendé (attribution par API GitHub, pas de signature GPG/SSH locale — limite Phase 1 assumée) ; URS-NF-044 amendé + URS-NF-044bis nouveau (jeton à portée restreinte, stockage navigateur) ; URS-NF-055 amendé (désinstallation = effacement du stockage navigateur, plus de "dossier applicatif local"). Résout au passage une incohérence latente : le diagramme d'architecture SDS §2 disait déjà "API GitHub" mais SDS §5 décrivait des mécanismes (signature GPG/SSH, driver de fusion Git local) qui supposaient un accès Git natif — jamais détectée jusqu'ici. FS/FDS/SDS mis à jour en conséquence. v24 (24/08/2026) : mode audit simulé dans le chat expert (URS-F-038/039/040) et clarification protection de la PI du code (URS-NF-056/057/058), suggestions d'un ingénieur logiciel externe consulté par l'utilisateur. **v25 (24/08/2026, `REV-URS-VALIDAPHARM-2026-010`) : relais IA de production** — URS-F-038bis (qualification de fiabilité séparée par mode d'usage chat/audit simulé, divulgation explicite) et URS-NF-044ter (relais serverless sans état) nouveaux, en réponse au point ouvert laissé par `CONTEXTE-REPRISE-SESSION.md`.*
