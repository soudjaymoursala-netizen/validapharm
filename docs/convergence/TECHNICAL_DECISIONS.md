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

*Dernier livrable de la Phase 0 : `CONVERGENCE_PLAN.md` (ordre de mise en œuvre synthétisant les 6 documents précédents).*
