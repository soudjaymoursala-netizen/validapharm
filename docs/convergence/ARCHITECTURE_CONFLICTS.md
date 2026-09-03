# ARCHITECTURE_CONFLICTS — Contradictions non masquées

| | |
|---|---|
| **Statut** | 4ᵉ livrable de la Phase 0. Règle appliquée : *"Ne cache aucune contradiction"* (master prompt §54). Une contradiction reste visible avec ses deux côtés documentés jusqu'à décision explicite — elle n'est jamais résolue silencieusement. |

---

## CONFLICT-001 — Architecture 100% navigateur vs "Modular Monolith" serveur de la cible

- **Current Decision** : PWA 100% navigateur, IndexedDB local, GitHub API comme unique persistance distante, **zéro serveur applicatif** — décision structurante du 23/08/2026 (`00-cadrage-projet.md`), justifiée par une contrainte réelle : l'IT du poste de travail professionnel de l'utilisateur bloque l'installation de logiciels non autorisés.
- **Target Decision** : `UI → API/Application → Use Cases → Domain Modules → Relational System of Record + Object Storage + Search + Async Workers + AI Gateway + Integration Gateway`, "Modular Monolith First" (`12_TECHNICAL_SECURITY_LEGACY.md`, `01_ARCHITECTURE_MASTER_FINAL.md` §34) — ceci présuppose un **backend serveur** avec base relationnelle, stockage objet, moteur de recherche et workers asynchrones.
- **Evidence** : `00-cadrage-projet.md` §4 ("Application web pure (PWA), aucune installation... aucun accès disque natif ni binaire git... tout passe par l'API GitHub/Drive") vs le package Target qui décrit explicitement une couche applicative serveur.
- **Impact** : Majeur. Le Source/Document Intelligence (OCR, parsing multimodal), la recherche sémantique, les workers asynchrones et un vrai `Connector`/`SyncJob` avec retry fiable sont, en pratique, très difficiles à livrer à un niveau de qualité GxP **uniquement** dans un navigateur (mémoire limitée, pas de traitement long en arrière-plan garanti, pas de vrai moteur de recherche vectoriel côté client à l'échelle).
- **Options** :
  1. **Rester 100% navigateur** — dégrader fortement les ambitions de Source Intelligence/recherche de la cible, ou les repousser indéfiniment.
  2. **Hybride** — garder le noyau GxP (documents, workflow, traçabilité) côté navigateur tel qu'aujourd'hui, ajouter un backend serveur **distant** (pas installé sur le poste de l'utilisateur) uniquement pour les capacités qui l'exigent réellement (OCR/parsing, recherche, AI Gateway côté serveur).
  3. **Reconstruire entièrement** vers un vrai Modular Monolith serveur, en levant la contrainte initiale.
- **Recommendation** : **Option 2**, sous sa forme la plus légère possible. La contrainte réelle documentée porte sur l'installation **locale** sur le poste de travail — elle n'interdit pas un service **distant** accédé depuis le navigateur (GitHub lui-même en est la preuve : c'est déjà un service distant, pas un binaire installé). Le raisonnement du 23/08/2026 a probablement généralisé "pas d'installation locale" en "pas de serveur du tout", alors que rien dans la contrainte réelle ne l'impose.
- **Decision Required** : **RÉSOLU le 25/08/2026.** Sur demande explicite de l'utilisateur de chercher une solution plus simple sans compromettre l'objectif, la décision retenue n'est pas un backend "Modular Monolith" mais une **extension du pattern serverless déjà construit et validé** (relais Cloudflare Workers, déjà utilisé pour l'IA, déjà testé joignable depuis le poste professionnel) : un second Worker sans état pour l'OCR/Document Intelligence, une recherche calculée côté navigateur (IndexedDB, puis JSON versionnés dans Git si le volume l'exige), le dépôt Git comme seul stockage des sources, Cloudflare Queues pour le traitement asynchrone léger. Zéro nouveau serveur permanent, zéro nouvelle base de données à héberger. Détail complet dans `TECHNICAL_DECISIONS.md` TD-001.

---

## CONFLICT-002 — Fusion ACFC/Computer System Assessment et modèle d'impact à 3 niveaux (URS v25) vs types d'Assessment distincts (Target)

- **Current Decision** : `01-URS-outil.md` lignes 399-412 — ACFC et Computer System Assessment sont dits "fusionnés en un seul mini-outil", et le modèle d'impact est décrit comme "direct/indirect/aucun" (3 niveaux).
- **Target Decision** : `CriticalityAssessment`, `ImpactAssessment`, `CSVAssessment`, `GxPAssessment` sont des **types distincts** partageant seulement un moteur d'assessment configurable commun (`01_ARCHITECTURE_MASTER_FINAL.md` §13). Rien dans le package Target n'évoque un modèle d'impact à 3 niveaux — l'esprit général de "types distincts, jamais fusionnés silencieusement" contredit directement la fusion actée dans l'URS.
- **Evidence** : déjà documenté dans `GAP.md` ligne "Assessment générique" ; confirmé indépendamment par la lecture normative de la veille (Ferring FSMP Project Master Plan : System Impact Assessment → Computerized System Assessment → Risk Analysis sont trois étapes séquentielles distinctes, jamais fusionnées) et par l'ISPE Baseline Guide (System Classification binaire Direct/Not-Direct, "Indirect Impact" explicitement retiré de la pratique de référence).
- **Impact** : Moyen-élevé — si le futur module d'assessment est construit sur la base de l'URS actuelle (fusionnée, 3 niveaux), il faudra le refaire une deuxième fois pour se conformer à la fois à la cible et aux normes réelles déjà étudiées.
- **Options** :
  1. Garder l'URS telle quelle et construire l'assessment fusionné.
  2. Corriger l'URS (3 étapes distinctes, modèle binaire) avant toute construction.
- **Recommendation** : **Option 2**, sans ambiguïté. Trois sources indépendantes convergent (Target Architecture, document Ferring réel, guide ISPE de référence) contre une seule (l'URS actuelle, déjà identifiée comme erronée avant même la lecture de ce package).
- **Decision Required** : NON au sens arbitrage — c'est déjà tranché par convergence de preuves.
- **Statut** : **RÉSOLU.** Correction documentaire faite en Phase 0bis (URS v26, commit `fc08890`). Distinction réellement codée en Phase 3 (25/08/2026) : `EvaluationACFC` (CriticalityAssessment, Phase 1), `MethodProfileImpactAssessment`/`EvaluationImpactAssessment` (ImpactAssessment, F1), `EvaluationCSVAssessment` (CSVAssessment, F3) sont 3 tables Dexie et 3 stores Pinia distincts, pas de fusion. `GxPAssessment` (4ᵉ type du package) reste **non implémenté, volontairement** : aucune source lue à ce jour (URS, Ferring FSMP, ISPE Baseline Guide) ne détaille son périmètre au-delà de ce que couvre déjà `CSVAssessment` (pertinence GxP/ERES) — le construire maintenant obligerait à fabriquer un contenu non sourcé, ce que le projet interdit. Reporté tant qu'une source réelle n'en précise pas le contenu.

---

## CONFLICT-003 — L'URS référence un "gabarit CSV" qui n'existe pas dans le catalogue implémenté

- **Current Decision (documentaire)** : `01-URS-outil.md` ligne 412 dit que le Computer System Assessment "pré-remplit la section Généralités du gabarit CSV".
- **Current Decision (code)** : `TemplateType` (`domaine/types.ts`) ne contient aucune entrée `csv` — seuls 11 gabarits existent, aucun n'est un dossier CSV complet.
- **Evidence** : confirmé en lisant directement `src/logique-metier/gabarits/catalogue/index.ts` et `domaine/types.ts` (déjà relevé dans le tableau de modules produit le 25/08 avant la lecture du package Target).
- **Impact** : Faible à court terme (rien ne dépend encore de ce gabarit), mais c'est un exemple concret du risque que la Target Architecture identifie explicitement : un document de conception peut affirmer une capacité qui n'a jamais été construite. Cette contradiction n'est pas entre Current et Target — elle est **interne à l'existant documentaire lui-même**, ce qui est un signal qu'il faut vérifier systématiquement chaque référence de l'URS contre le code avant de bâtir dessus (c'est précisément la méthode que ce livrable applique).
- **Options** : corriger l'URS pour refléter l'absence du gabarit, ou le créer.
- **Recommendation** : corriger l'URS pour l'instant (aligner la documentation sur la réalité), créer le vrai gabarit CSV quand le chantier CSV/CSVAssessment sera engagé (dépend de CONFLICT-002 résolu au préalable).
- **Decision Required** : NON — correction documentaire directe.
- **Statut (25/08/2026, clôture des points ouverts)** : correction documentaire faite (Phase 0bis). Condition de déclenchement de la construction réelle du gabarit ("quand CSVAssessment sera engagé") **désormais remplie** (Phase 3, `EvaluationCSVAssessment`). **Reste néanmoins ouvert, volontairement** : construire le contenu réel d'un dossier CSV (sections/champs d'un dossier de validation de système informatisé — au-delà de la simple catégorisation GAMP5/pertinence GxP déjà codée) exigerait de sourcer un contenu normatif réel (structure GAMP5 d'un dossier CSV) non encore recherché cette session — le fabriquer maintenant violerait l'interdiction de ne jamais inventer de contenu réglementaire. Backlog dédié créé (tâche #55) plutôt que de le construire à la légère.

---

## CONFLICT-004 — Authentification multi-utilisateur (comptes/rôles/permissions) du prompt narratif du 03/09/2026 vs. mono-utilisateur PWA + jeton GitHub personnel

- **Current Decision** : mono-utilisateur assumé depuis le cadrage (`00-cadrage-projet.md` §4/§5, "jamais un mot de passe"), confirmé par 3 sources indépendantes du 03/09/2026 : l'audit domaine ("Multi-user/auth/RBAC/permissions: **absent**, by explicit design"), l'audit IA ("no user authentication or RBAC anywhere... single personal GitHub token is the entire security/identity model"), et TD-011/TD-033 qui interdisent explicitement une façade RBAC/e-signature et documentent le verrou local comme n'étant *pas* un mécanisme d'authentification.
- **Target Decision** : `PROMPT_MAITRE_FINAL_VALIDAPHARM_VISION_PARCOURS_ARCHITECTURE_CLAUDE.md` §7-9 (narratif reçu le 03/09/2026) décrit une page publique "Se connecter / Créer un compte", des comptes email/mot de passe, des rôles, permissions, statut de compte, audit des actions sensibles. Le package `10- Architecture détaillée` (source d'autorité supérieure par construction, §"règle de priorité" de `00_README_AND_GOVERNANCE.md`) est plus mesuré : §33 liste Identity/Authentication/Authorization/RBAC comme des capacités à *prévoir*, pas à construire immédiatement, et §31 confirme "Core ne dépend pas du cloud... aucun cloud obligatoire" — cohérent avec CONFLICT-001 déjà résolu (extension serverless légère, pas un backend applicatif complet).
- **Evidence** : le narratif du 03/09 est une reformulation libre de la même vision (aucune nouvelle décision DEC-XXX qu'il contienne n'est absente du package structuré) — il n'a donc pas plus d'autorité que le package déjà audité, et le package structuré lui-même ne demande pas une authentification immédiate, seulement une architecture qui n'interdit pas d'y arriver un jour.
- **Impact** : Élevé si mal interprété — construire un vrai système de comptes/mots de passe maintenant violerait directement TD-011 ("RBAC/signature électronique de façade interdite") et le cadrage §5, sans qu'aucun besoin réel ne l'ait déclenché (le projet reste, à ce jour, utilisé par un seul consultant sur son propre poste).
- **Options** :
  1. Construire l'authentification multi-utilisateur maintenant, en levant TD-011.
  2. Ne rien construire — le mono-utilisateur reste la réalité d'usage actuelle, l'authentification reste dans la colonne "à prévoir" du package tant qu'un besoin réel (plusieurs consultants sur un même dossier client, ou un déploiement au-delà d'un seul utilisateur) n'apparaît pas.
  3. Préparer le terrain sans construire : vérifier que le modèle de données (déjà fait — `owner_id`/`shared_with`/`workflow.reviewers` existent sur `Section` depuis la Phase 0, jamais câblés à une vérification réelle) ne bloquera pas une authentification future, sans construire la façade maintenant.
- **Recommendation** : **Option 2/3 combinées** — même logique que CONFLICT-002/CONFLICT-003 (ne pas construire par anticipation sans besoin réel démontré), et cohérent avec TD-011 qui reste non rouverte. Le modèle de données a déjà les champs déclaratifs nécessaires (`Section.owner_id`/`shared_with`/`workflow.reviewers`, confirmé par l'audit domaine) — rien à ajouter tant qu'aucune vérification réelle ne doit s'y accrocher.
- **Risk si ignoré** : construire une authentification de façade non vérifiée créerait exactement le risque que TD-011 a nommé dès le 27/08/2026 — une fausse preuve de conformité 21 CFR Part 11/Annexe 11, pire que son absence honnête.
- **Decision Required** : **OUI, mais pas maintenant** — à soumettre explicitement à l'utilisateur seulement si/quand un besoin réel de multi-utilisateur apparaît (plusieurs consultants, déploiement client). Tant que ce n'est pas le cas, TD-011 reste la position par défaut de ce projet et ce conflit reste documenté-mais-non-résolu, pas silencieusement tranché.
- **Statut (03/09/2026)** : **RÉSOLU.** L'utilisateur confirme que ce n'est pas une aspiration vague mais un vrai modèle commercial (vente à une entreprise, un compte par employé, projets partageables). Décision retenue (TD-043, `TECHNICAL_DECISIONS.md`) : authentification via OAuth GitHub (identité réelle, pas une façade — cohérent avec TD-011), partage `owner_id`/`shared_with` appliqué en **convention UX** (choisi explicitement par l'utilisateur, pas une frontière de sécurité réelle) plutôt qu'un service intermédiaire qui aurait rouvert CONFLICT-001. Voir Phase 37 (`CONVERGENCE_PLAN.md`) pour l'implémentation.

---

*Prochain livrable : `ARCHITECTURE_CHALLENGES.md` (challenge technique des décisions de la cible, au-delà des contradictions déjà identifiées ici).*
