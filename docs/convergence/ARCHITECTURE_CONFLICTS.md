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
- **Recommendation** : **Option 2**. La contrainte réelle documentée porte sur l'installation **locale** sur le poste de travail — elle n'interdit pas un service **distant** accédé depuis le navigateur (GitHub lui-même en est la preuve : c'est déjà un service distant, pas un binaire installé). Le raisonnement du 23/08/2026 a probablement généralisé "pas d'installation locale" en "pas de serveur du tout", alors que rien dans la contrainte réelle ne l'impose. Ceci ouvre la voie à un backend léger sans remettre en cause la PWA existante ni la contrainte professionnelle réelle.
- **Decision Required** : **OUI.** C'est un arbitrage qui touche une décision que l'utilisateur a lui-même posée à plusieurs reprises comme non négociable — à ne pas trancher unilatéralement.

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
- **Decision Required** : NON au sens arbitrage — c'est déjà tranché par convergence de preuves. Reste une action documentaire à faire (corriger l'URS), déjà notée dans `docs/CONTEXTE-REPRISE-SESSION.md` §5.2 depuis le 25/08 matin.

---

## CONFLICT-003 — L'URS référence un "gabarit CSV" qui n'existe pas dans le catalogue implémenté

- **Current Decision (documentaire)** : `01-URS-outil.md` ligne 412 dit que le Computer System Assessment "pré-remplit la section Généralités du gabarit CSV".
- **Current Decision (code)** : `TemplateType` (`domaine/types.ts`) ne contient aucune entrée `csv` — seuls 11 gabarits existent, aucun n'est un dossier CSV complet.
- **Evidence** : confirmé en lisant directement `src/logique-metier/gabarits/catalogue/index.ts` et `domaine/types.ts` (déjà relevé dans le tableau de modules produit le 25/08 avant la lecture du package Target).
- **Impact** : Faible à court terme (rien ne dépend encore de ce gabarit), mais c'est un exemple concret du risque que la Target Architecture identifie explicitement : un document de conception peut affirmer une capacité qui n'a jamais été construite. Cette contradiction n'est pas entre Current et Target — elle est **interne à l'existant documentaire lui-même**, ce qui est un signal qu'il faut vérifier systématiquement chaque référence de l'URS contre le code avant de bâtir dessus (c'est précisément la méthode que ce livrable applique).
- **Options** : corriger l'URS pour refléter l'absence du gabarit, ou le créer.
- **Recommendation** : corriger l'URS pour l'instant (aligner la documentation sur la réalité), créer le vrai gabarit CSV quand le chantier CSV/CSVAssessment sera engagé (dépend de CONFLICT-002 résolu au préalable).
- **Decision Required** : NON — correction documentaire directe.

---

*Prochain livrable : `ARCHITECTURE_CHALLENGES.md` (challenge technique des décisions de la cible, au-delà des contradictions déjà identifiées ici).*
