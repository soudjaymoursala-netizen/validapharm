# TECHNICAL_DECISIONS — Registre des décisions techniques structurantes

| | |
|---|---|
| **Statut** | 6ᵉ livrable de la Phase 0. Chaque entrée précise si elle est **actée** (recommandation claire, pas d'arbitrage réel requis — le master prompt §"Quand demander une décision" dit d'avancer dans ce cas) ou **proposée** (arbitrage réel nécessaire, décision de l'utilisateur requise avant mise en œuvre). |

---

### TD-001 — Étendre le pattern serverless existant (Cloudflare Workers) plutôt qu'un backend "Modular Monolith"
- **Statut** : **ACTÉE (25/08/2026, décision explicite de l'utilisateur)** — résout CONFLICT-001. Version révisée et simplifiée par rapport à la première proposition (backend serveur générique), sur demande explicite de l'utilisateur de challenger la solution la plus simple ne compromettant pas l'objectif.
- **Context** : PWA 100% navigateur actuelle, contrainte réelle du poste professionnel (pas d'installation locale). La Target Architecture présuppose un backend (Modular Monolith, base relationnelle, recherche, workers asynchrones) pour porter Source Intelligence/Search/Integration Gateway.
- **Problem** : la première option envisagée (introduire un vrai backend serveur — base relationnelle + stockage objet + moteur de recherche) est plus lourde que ce que l'objectif exige réellement à l'échelle actuelle du projet (mono-utilisateur), et ouvre une nouvelle surface d'infrastructure à héberger/sécuriser/sauvegarder.
- **Decision** : ne pas construire de backend serveur "Modular Monolith". À la place, **étendre le pattern serverless déjà construit et validé** (relais Cloudflare Workers, URS-NF-044ter, déjà testé joignable depuis le poste professionnel de l'utilisateur — AR-R-64, clos) :
  - **OCR/Document Intelligence** : un second Worker sans état, relais vers une API cloud de vision/OCR (même pattern exact que le relais IA existant) — pas de pipeline serveur dédié.
  - **Recherche** : index plein texte calculé côté navigateur (IndexedDB) pour l'usage actuel ; si le volume l'impose un jour, les embeddings deviennent de simples fichiers JSON dans le dépôt Git (déjà source de vérité), comparés côté client — pas de base vectorielle serveur.
  - **Stockage des sources/preuves** : le dépôt Git dédié existant, pas un nouvel object storage.
  - **Traitement asynchrone** : Cloudflare Queues (même compte Cloudflare que le relais IA), suffisant à l'échelle mono-utilisateur actuelle — pas d'orchestrateur de jobs serveur.
- **Pros** : zéro serveur qui tourne en continu, zéro nouvelle base de données à héberger/sécuriser/sauvegarder, zéro nouvelle dépendance de compte (même Cloudflare, même GitHub déjà utilisés et validés), risque et coût minimaux.
- **Cons** : pas de moteur de requêtes relationnelles complexes multi-entités à grande échelle — accepté explicitement car aucun besoin réel ne le démontre aujourd'hui (cohérent avec le principe de la cible : "un service n'est extrait que si un besoin démontré existe").
- **Risk** : Faible — réutilise une brique déjà en production et déjà testée réseau.
- **Rejected Alternatives** : (a) rester 100% navigateur sans aucune extension serverless — rejeté, dégraderait trop l'ambition Document Intelligence/Search ; (b) backend serveur complet (Modular Monolith, base relationnelle, object storage dédié) — rejeté comme disproportionné à l'échelle actuelle du projet, réévaluable seulement si un besoin réel et démontré apparaît.
- **Impact** : Débloque les Phases 7-8 du `CONVERGENCE_PLAN.md` sans point d'arrêt.
- **Reversibility** : Élevée — une fonction serverless ponctuelle se remplace ou s'étend sans migration lourde ; si un vrai besoin de backend complet apparaît plus tard, rien de ce qui est construit ici ne devient un frein (le Git reste la source de vérité dans tous les cas).
- **Complément (25/08/2026, Phase 6, décision explicite de l'utilisateur)** : le Worker OCR est réellement construit (`workers/ocr-relay/`). Fournisseur retenu : **Azure AI Vision (Read API)** — meilleur niveau gratuit au moment de la décision (5000 transactions/mois contre 1000 chez Google Cloud Vision, vérifié par recherche le jour même), déjà approuvé par l'utilisateur au même titre que Google Cloud Vision. Architecture délibérément swappable (`FournisseurOcr` interface, un seul fichier à ajouter/changer pour basculer vers Google Cloud Vision). Déploiement réel (compte Cloudflare/Azure, secrets, test de joignabilité réseau équivalent à AR-R-64) **reste à faire par l'utilisateur** — non exécutable depuis cette session distante, voir `workers/ocr-relay/README.md`.

---

### TD-002 — Remplacer la grille ACFC codée en dur par un `MethodProfile` configurable
- **Statut** : **ACTÉE** (recommandation claire, aucun arbitrage réel — convergence de 3 sources indépendantes : repo, mémoire de session, Target Architecture).
- **Context** : `grilleCriticite.ts` code en dur 9 critères, viole une interdiction explicite du package (*"Ne pas hard-coder 6/7/9 questions ACFC"*).
- **Problem** : impossible d'accueillir un client réel avec ses propres questions (4 à 10 selon les entreprises réelles étudiées).
- **Options** : garder tel quel (rejeté) vs `MethodProfile` (questions mot pour mot, version, source, date d'effet, règle de décision configurable).
- **Pros/Cons** : `MethodProfile` demande une réécriture du module et de ses 11 tests, mais aucune autre partie du code n'en dépend (remplacement isolé, faible risque).
- **Risk** : Faible techniquement, élevé si non traité (violation documentée qui persiste).
- **Recommendation** : à implémenter en priorité, cf. `GAP.md`.
- **Rejected Alternatives** : garder la grille figée avec un simple "mode client" en paramètre — rejeté, ne résout pas le problème de fond (les questions elles-mêmes doivent être données, pas choisies parmi des jeux prédéfinis).
- **Impact** : Élevé et positif (débloque tout le futur module Assessment).
- **Reversibility** : Élevée — c'est un module isolé, changement sans effet de bord.

---

### TD-003 — Corriger l'URS v25 (fusion ACFC/CSA, modèle d'impact à 3 niveaux, référence au gabarit CSV inexistant)
- **Statut** : **ACTÉE**.
- **Context** : CONFLICT-002 et CONFLICT-003.
- **Problem** : l'URS actuelle contredit à la fois la Target Architecture et les normes réelles déjà étudiées (Ferring FSMP, ISPE Baseline Guide).
- **Options** : garder l'URS telle quelle (rejeté, contredit 3 sources) vs corriger (restructurer §10 famille F en 3 briques distinctes : Impact Assessment, Computer System Assessment, Risk Analysis/ACFC).
- **Recommendation** : corriger avant toute construction du futur module d'assessment.
- **Impact** : Documentaire, mais bloquant pour construire juste du premier coup.
- **Reversibility** : Élevée (changement de texte, pas de code).

---

### TD-004 — Séquencer le Source/Document Intelligence en 2 temps (structuration manuelle assistée d'abord, compréhension P&ID/schémas complexes ensuite)
- **Statut** : **ACTÉE** (recommandation de séquencement, pas d'arbitrage de fond).
- **Context** : CHALLENGE-001.
- **Recommendation** : phase 1 = OCR + structuration assistée avec validation humaine systématique ; phase 2 = compréhension de schémas techniques complexes, seulement après retour d'expérience réel.
- **Impact** : Réduit le risque de fausse confiance sur des extractions de schémas critiques (alarmes, interlocks).
- **Reversibility** : Élevée (c'est un ordre d'implémentation, pas une architecture figée).

---

### TD-005 — Extraire une interface `Connector` générique à partir de `GitHubConnector`/`DriveConnector`
- **Statut** : **ACTÉE**.
- **Context** : les deux connecteurs existants sont solides et testés mais chacun a sa propre forme d'erreurs, pas d'abstraction commune.
- **Recommendation** : ADAPT — extraire l'interface commune sans réécrire la logique interne déjà validée (contre `fetch` mocké + vérifications réelles en navigateur).
- **Impact** : Prépare l'arrivée future de connecteurs QMS tiers (Veeva/SAP, backlog #32) sans dette supplémentaire.
- **Reversibility** : Élevée.

---

### TD-006 — Migrer `Client` (plat) vers un scope hiérarchique `Organization/Workspace/Site`, en dernier dans l'ordre de convergence
- **Statut** : **ACTÉE sur le principe, mécanisme précis à détailler dans `CONVERGENCE_PLAN.md`.**
- **Context** : `client_id` est utilisé par la quasi-totalité des stores actuels — c'est la clé d'isolation la plus répandue du repository.
- **Problem** : migration à haut risque de régression si faite tôt ou en un seul commit.
- **Recommendation** : traiter en dernier dans l'ordre de convergence, `Client` devenant un cas particulier à un seul niveau d'`Organization` plutôt qu'un remplacement complet — migration progressive, jamais en un seul commit (cohérent avec l'interdiction explicite du package : *"Pas de Big Bang"*).
- **Impact** : Majeur si mal fait, mais différable sans bloquer le reste (aucun autre chantier prioritaire n'en dépend).
- **Reversibility** : Faible une fois engagée — raison pour la placer en dernier, quand tout le reste du modèle est stabilisé.

---

### TD-007 — Le moteur de raisonnement (Mission→Context→AI) s'orchestre côté navigateur, jamais un nouveau backend
- **Statut** : **ACTÉE** (revue panel E1-E7, 26/08/2026, `PHASE_13_17_REVUE_PANEL_MOTEUR_RAISONNEMENT.md` Question A).
- **Context** : la vision utilisateur (raisonnement multi-étapes : changement→impact→risque→requirement→test manquant, avec questions ciblées) demande un raisonnement outillé sur les stores du domaine, pas un simple prompt.
- **Problem** : un backend serveur avec état violerait TD-001 (extension serverless plutôt que backend complet, déjà actée) sans fait nouveau le justifiant.
- **Recommendation** : la boucle d'orchestration (appeler l'IA, lire son besoin d'information, interroger les stores Dexie/Pinia existants comme des "outils", redonner la réponse, recommencer) s'exécute entièrement dans le navigateur ; le relais Cloudflare reste un simple proxy sans état masquant la clé (URS-NF-044ter, inchangé). Conditions posées par E1/E4 : `AIRequest` trace chaque appel d'outil (jamais seulement le prompt/réponse final) ; la configuration du moteur (prompts, outils, version de modèle) est versionnée (`AIConfiguration`/`AIModelVersion`) pour rester reconstructible a posteriori.
- **Impact** : Structurant pour la Phase 15 — un seul nouveau module (`logique-metier/raisonnement/`), aucune nouvelle infrastructure d'hébergement.
- **Reversibility** : Élevée — pas de backend introduit, donc pas de dette d'hébergement à défaire si le choix est révisé plus tard.

---

### TD-008 — Les propositions de l'IA portent un état de confiance discret (5 états), jamais un score numérique
- **Statut** : **ACTÉE** (revue panel E1-E7, 26/08/2026, `PHASE_13_17_REVUE_PANEL_MOTEUR_RAISONNEMENT.md` Question B).
- **Context** : le moteur de raisonnement doit pouvoir distinguer ce qu'il sait, ce qu'il déduit, ce qu'il ignore et ce qui est en conflit entre sources — jamais une seule couleur de confiance globale.
- **Problem** : un score numérique (0-100 %) inviterait mécaniquement à fixer un seuil d'acceptation automatique — même erreur déjà interdite pour la promotion `Parameter`→`CPP` (§10 `01_ARCHITECTURE_MASTER_FINAL.md`) et contraire au principe fondateur n°1 (l'IA n'est jamais seule source de vérité).
- **Recommendation** : type discriminant fermé `connu | inféré | inconnu | conflit | a_verifier`, même pattern que `StatutKnowledgeItem`/`StatutTestCandidate` déjà en place.
- **Impact** : Structurant pour le type `AIResponse` (Phase 15) — condition non négociable, pas une option de configuration.
- **Reversibility** : Élevée à ce stade (rien n'est encore codé) ; deviendrait faible une fois des données réelles créées avec ce schéma.

---

### TD-009 — Domaine "Work" limité à `Mission`/`Activity` pour ce lot ; `WorkflowDefinition`/`WorkflowInstance`/`Approval` différés
- **Statut** : **ACTÉE** (revue panel E1-E7, 26/08/2026, `PHASE_13_17_REVUE_PANEL_MOTEUR_RAISONNEMENT.md` Question C).
- **Context** : le modèle cible nomme cinq entités dans le domaine "Work" (`Mission, Activity, Dependency, WorkflowDefinition, WorkflowInstance, WorkflowStep, Approval`).
- **Problem** : un workflow d'approbation générique construit sans cas réel pour le calibrer risquerait de fabriquer une mécanique ne correspondant à aucun processus qualité documenté (règle "ne jamais fabriquer de contenu réglementaire") — et un mécanisme d'approbation implicite existe déjà ailleurs (`QualityEvent`, `Confirmation`) tant qu'un besoin *générique transverse* n'est pas démontré.
- **Recommendation** : construire `Mission`/`Activity` (Phase 13) — suffisant pour que le moteur de raisonnement (TD-007) ait un objet à référencer. `WorkflowDefinition`/`WorkflowInstance`/`Approval` restent nommés dans le modèle cible mais non engagés, même statut documentaire que `8b`/`9-Generate-Render-Approve-Freeze` déjà différés dans `CONVERGENCE_PLAN.md`.
- **Impact** : Réduit le périmètre de la Phase 13 sans fermer la porte à un futur incrément dédié.
- **Reversibility** : Élevée — purement additif si un besoin réel de workflow générique apparaît plus tard.

---

### TD-010 — "Validation State" (état de validation vivant) : une vue calculée diagnostique, jamais un remplacement automatique de `qualification_status`
- **Statut** : **ACTÉE** (revue panel E1-E7, 26/08/2026, `REVUE_PANEL_VISION_VALIDATION_ENGINEERING.md` Point A, en réponse au document de vision "Validation Engineering Platform" de l'utilisateur).
- **Context** : la vision demande de savoir à tout moment "si un système est toujours dans un état validé et pourquoi", recalculé après un changement détecté (VALIDATED → CHANGE DETECTED → IMPACT ANALYSIS → REQUALIFICATION REQUIRED → ... → VALIDATED).
- **Problem** : `AssetNode.qualification_status` (Structure Système) est aujourd'hui un statut saisi manuellement. Le dériver *automatiquement* d'une analyse d'impact reviendrait à faire prendre une décision réglementaire par une simple logique déterministe sans confirmation humaine — même erreur déjà interdite pour `CriticalParameter → CPP` (invariant #8, principe fondateur n°1).
- **Recommendation** : "Validation State" est une **fonction de lecture pure/diagnostique** (candidat naturel : un nouvel outil du Reasoning Engine, Phase 15) qui répond "voici ce que je constate et pourquoi, avec citations vers le graphe" — jamais une écriture automatique de `qualification_status`. Le statut officiel reste un acte humain distinct, déjà tracé (même patron que `Confirmation`/`TestCandidate`).
- **Impact** : Oriente une future extension du Reasoning Engine (au-delà de Phase 15) — n'introduit aucune nouvelle entité stockée dans l'immédiat.
- **Reversibility** : Élevée — fonction de lecture pure, aucune migration de schéma engagée par cette décision elle-même.

---

### TD-011 — GxP-by-design (e-signature/RBAC) : limite assumée documentée, TD-001 non rouverte, aucun garde-fou de façade
- **Statut** : **ACTÉE** (revue panel E1-E7, 26/08/2026, `REVUE_PANEL_VISION_VALIDATION_ENGINEERING.md` Point B).
- **Context** : la vision liste electronic signatures/RBAC/segregation-of-duties comme propriétés attendues "dès l'architecture" — en tension directe avec TD-001 (25/08/2026, extension serverless plutôt que backend complet, PWA mono-utilisateur local, contrainte IT réelle).
- **Problem** : rouvrir TD-001 maintenant serait prématuré (aucun besoin réel multi-utilisateur démontré à ce jour). Mais fabriquer un **semblant** de RBAC/signature électronique purement local (ex. mot de passe par rôle stocké côté client) serait activement dangereux : cela fabriquerait une fausse preuve de conformité 21 CFR Part 11/Annexe 11, pire que son absence honnête.
- **Recommendation** : documenter explicitement cette limite (`00-cadrage-projet.md`) — l'outil, dans son état actuel, ne prétend pas satisfaire l'exigence e-signature/séparation des tâches multi-utilisateurs ; l'`audit_log` actuel (horodatage + acteur déclaré) est un premier niveau de traçabilité, pas une signature électronique réglementaire. Aucun RBAC/e-signature de façade construit. Un vrai service d'authentification serveur sera tranché quand un besoin réel (client multi-utilisateur) le démontrera.
- **Impact** : Aucun changement de code — clarification documentaire pure, protège contre une fausse assurance de conformité.
- **Reversibility** : Sans objet (décision documentaire) — TD-001 reste rouvrable plus tard sur besoin réel démontré.

---

### TD-012 — Prochaine capacité du Reasoning Engine : analyse d'impact de changement ancrée sur `QualityEvent`, pas un mode générique fourre-tout
- **Statut** : **ACTÉE** (revue panel E1-E7, 26/08/2026, `REVUE_PANEL_VISION_VALIDATION_ENGINEERING.md` Point C).
- **Context** : la vision détaille deux capacités IA non couvertes par les 4 outils actuels de Phase 15 : (1) analyse de qualité d'exigences (ambiguës/non-testables/doublons) ; (2) analyse d'impact de changement (Change → Composant → Requirement → Risk → Test → Evidence → Impact Assessment).
- **Problem** : construire les deux d'un coup répéterait l'erreur déjà évitée en Phase 13 (construire plusieurs capacités non éprouvées simultanément). La première (qualité d'exigences) suppose un texte source non structuré — relève de Source Intelligence (Phase 8a), pas du Reasoning Engine actuel qui lit des données déjà structurées.
- **Recommendation** : la prochaine capacité concrète du Reasoning Engine est une analyse d'impact de changement, directement câblable sur `QualityEvent` (Change Control, Phase 5)/`Requirement`/`Test`/`Evidence` déjà construits — prolonge exactement le scénario "changement de recette" déjà testé en Phase 15. L'analyse de qualité d'URS reste au backlog, dépendante de Source Intelligence, non engagée.
- **Impact** : Oriente le prochain incrément du Reasoning Engine après la Phase 17 (Mission workspace).
- **Reversibility** : Élevée — purement additif (nouveaux outils de lecture), aucune structure existante modifiée.

---

### TD-013 — Architecture Technique (PLC/SCADA/Server) : relations typées entre `AssetNode` existants, jamais une nouvelle entité d'équipement parallèle
- **Statut** : **ACTÉE** (revue panel E1-E7 condensée, 27/08/2026, `PHASE_18_ARCHITECTURE_TECHNIQUE_SPEC.md` §4, en réponse au document "VALIDAPHARM MASTER PRODUCT VISION / NORTH STAR").
- **Context** : la vision demande de modéliser Equipment/System/Subsystem/PLC/HMI/SCADA/Server/Database/Network/Software/Application/Interface et de tracer les relations belongs_to/controlled_by/connected_to/hosted_on/used_by entre eux.
- **Problem** : construire une nouvelle famille d'entités parallèle à `AssetNode` pour porter PLC/SCADA/Server dupliquerait un modèle d'équipement déjà générique et configurable — `AssetHierarchySchema.levels[]` (Phase 4/16) accepte déjà des niveaux nommés librement par le client (`level_key: string`, jamais une énumération figée dans le code), donc un client peut déjà créer des nœuds "PLC"/"SCADA"/"Serveur" sans aucun changement de code. Le vrai manquant est plus étroit : aucune relation *typée et dirigée* n'existe entre deux `AssetNode` (`associated_nodes[]` est un graphe libre non typé, incapable de distinguer "contrôlé par" de "connecté à").
- **Recommendation** : ajouter uniquement `RelationTechnique` (jointure explicite `AssetNode → AssetNode`, `type_relation: 'controle_par' | 'connecte_a' | 'heberge_sur'`, union de chaînes extensible sans migration), même pattern que `AssociationFonctionAssetNode`. Aucune nouvelle entité de nœud. Aucune détection de cycle (cohérent avec la tolérance déjà documentée d'`associated_nodes[]`).
- **Impact** : Structurant pour la Phase 18 — un seul ajout de table Dexie (v24), extension du Reasoning Engine avec un nouvel outil de traversal, aucune structure existante modifiée.
- **Reversibility** : Élevée — purement additif, aucune table existante modifiée, type de relation extensible sans migration future.

---

### TD-014 — Ingestion Office native : `jszip`+`DOMParser` pour la lecture `.docx`, Excel bloqué faute de librairie saine
- **Statut** : **ACTÉE** (recherche documentée, 27/08/2026, `PHASE_19_INGESTION_OFFICE_SPEC.md` §2, en réponse au chantier P0 "ingestion Office native" du plan `VISION_NORTH_STAR_CONVERGENCE.md`).
- **Context** : la vision exige de lire une procédure/un template `.docx`/`.xlsx` fournis directement par l'utilisateur — aucune librairie de parsing Office n'existait dans `package.json` avant cette phase.
- **Problem** : `mammoth` (candidat initial pour `.docx`) distingue son code Node de son code navigateur via le champ `browser` de son `package.json`, non appliqué par la résolution de modules de Vitest (SSR/Node) — installé et testé avec un `.docx` réel, l'erreur observée (`Could not find file in options`) a confirmé que le code exécuté en test n'était pas celui exécuté par la PWA réelle, malgré plusieurs tentatives de forcer la résolution (alias, `resolve.conditions`, `deps.inline`). `xlsx`/SheetJS (registre npm) porte une vulnérabilité haute (prototype pollution + ReDoS) sans correctif disponible sur npm (`npm audit`) ; `exceljs` introduit une dépendance transitive (`uuid`) avec une vulnérabilité modérée et une chaîne de dépendances datée.
- **Recommendation** : `.docx` — extraction directe du texte depuis `word/document.xml` avec `jszip` (dézippage, déjà 0 vulnérabilité) + `DOMParser` (API native, isomorphe Node/navigateur par construction, aucune ambiguïté de résolution). Excel — **aucune librairie installée** dans ce lot ; `xlsx_natif` n'est pas ajouté à `MethodeExtraction` tant qu'aucune solution saine n'est vérifiée (jamais une valeur de type sans implémentation réelle derrière). `docxtemplater`+`pizzip` (MIT, cœur gratuit, confirmé compatible navigateur) est retenu pour la future génération de documents au format client (Template Intelligence) — non installé dans ce lot, décision documentée par anticipation pour éviter une re-recherche.
- **Impact** : Structurant pour la Phase 19 — nouvelle dépendance `jszip` (production), `connecteurs/office/DocxNatifAdapter.ts`. Aucune capacité Excel dans ce lot (limite assumée, pas un oubli).
- **Reversibility** : Élevée — `jszip`+`DOMParser` est un choix additif ; réévaluer `mammoth` ou une librairie Excel reste possible sans migration si un correctif/une solution vérifiée apparaît.

---

*Dernier livrable de la Phase 0 : `CONVERGENCE_PLAN.md` (ordre de mise en œuvre synthétisant les 6 documents précédents). TD-007 à TD-009 ajoutées le 26/08/2026, hors Phase 0 — revue panel dédiée déclenchée par une clarification de vision produit de l'utilisateur. TD-010 à TD-012 ajoutées le 26/08/2026 — revue panel déclenchée par un second document de vision approfondi ("Validation Engineering Platform") accompagné d'un benchmark UX concurrent réel. TD-013 ajoutée le 27/08/2026 — revue panel déclenchée par un troisième document de vision ("MASTER PRODUCT VISION / NORTH STAR") et sa checklist d'audit de capacités associée, ouvrant le plan de convergence `VISION_NORTH_STAR_CONVERGENCE.md`. TD-014 ajoutée le 27/08/2026 — recherche de librairie d'ingestion Office (Phase 19), `mammoth` évalué puis abandonné (incompatibilité de résolution Node/navigateur), Excel bloqué faute de librairie saine (vulnérabilités non corrigées).*
