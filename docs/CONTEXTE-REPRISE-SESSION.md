# Contexte de reprise — à lire en premier dans une nouvelle session

Ce fichier n'est pas un livrable projet (pas d'ID de traçabilité) : c'est un **aide-mémoire de continuité**, réécrit intégralement le 25/08/2026 à la demande explicite de l'utilisateur, pour servir d'état complet du projet à l'instant T — utilisable par une autre session Claude (y compris un autre compte) ou par l'utilisateur lui-même s'il a besoin de tout reconstituer sans se souvenir du détail.

**Instruction pour la prochaine session Claude** : lis ce fichier en entier avant d'agir. Il complète (ne remplace pas) les documents vivants de `docs/`, qui restent la source de vérité pour le contenu métier normatif. Ce fichier remplace intégralement la version précédente (rédigée le 24/08/2026) — ne pas se fier à l'historique Git de ce fichier pour retrouver un état antérieur pertinent, tout ce qui compte encore est repris ci-dessous.

---

## 1. Qu'est-ce que ValidaPharm — vision et objectif

ValidaPharm est un outil d'aide à la rédaction de livrables qualité **CQV / CSV / QA** pour l'industrie pharmaceutique et les dispositifs médicaux (URS, DQ, FAT/SAT/IQ/OQ/PQ, AMDEC, plans de validation, etc.).

**But** : gagner du temps de rédaction, structurer les livrables conformément aux normes du domaine, avec un niveau de rigueur compatible avec un usage professionnel réel — jusqu'à l'objectif final assumé dès le cadrage : **un outil lui-même validable selon une approche GAMP 5**, utilisable soit pour approuver directement des documents dans l'outil, soit comme simple aide à la rédaction (au choix de l'utilisateur, par document).

Contexte personnel de l'utilisateur : il travaille dans l'industrie pharma (Ferring Pharmaceuticals notamment, cf. les documents réels utilisés en formation) et construit cet outil pour un usage professionnel réel, pas comme projet de loisir.

### Principes non négociables (posés dès le cadrage, jamais remis en cause depuis)

1. **L'IA générative n'est jamais seule source de vérité.** Elle assiste, propose, suggère — elle ne décide jamais d'une conformité, d'un calcul (IPR, MACO...) ni d'une approbation. Tout calcul réglementaire reste déterministe (code), jamais délégué à un LLM.
2. **Traçabilité totale.** Toute donnée créée/modifiée est horodatée, attribuée à un auteur, versionnée. Rien n'est écrasé silencieusement (principe ALCOA+ appliqué à l'outil lui-même — voir §5 pour ce que ça signifie concrètement, approfondi en détail en phase de recherche le 24-25/08/2026).
3. **Zéro perte de données au changement de machine.** Git dédié = source de vérité ; miroir Google Drive = filet de secours, jamais automatisé (voir §3).
4. **Séparation stricte contenu métier / IA cloud.** Le contenu des livrables ne part jamais vers une API cloud sans action explicite de l'utilisateur.
5. **Dégradation gracieuse.** Si l'environnement ne permet pas l'accès à l'API cloud, l'outil continue de fonctionner en basculant sur un modèle local (Ollama).
6. **Élicitation rigoureuse en amont, extensibilité par conception.** La cascade URS → FS → FDS → SDS vise à faire émerger les besoins le plus tôt possible, tout en gardant l'outil architecturé pour l'extension (gabarits versionnés indépendamment du code, etc.).

Le cadrage complet (vision, architecture par phases, sécurité, trajectoire de validation GAMP5) est dans `docs/00-cadrage-projet.md` — ce fichier-ci ne le duplique pas, il en donne juste l'essentiel pour se réorienter vite.

---

## 2. Comment l'utilisateur et Claude travaillent ensemble

- L'utilisateur s'exprime en français, tutoiement naturel. **Toujours répondre en français** — erreur déjà commise et corrigée une fois (une question posée en anglais a dû être reformulée).
- Posture attendue de Claude : **expert technique/méthodologique proactif, pas seulement exécutant.** L'utilisateur n'est pas nécessairement l'expert sur tous les sujets couverts (ex. finesses réglementaires GxP/DM) — c'est explicitement le rôle de Claude de signaler les gaps, incohérences, meilleures alternatives **avant d'exécuter**, même sans qu'on le demande. Règle durable stockée dans `~/.claude/CLAUDE.md`.
- **Choisir toujours la rigueur, jamais la facilité** ("ne choisi jamais la facilité, choisi l'efficacité") — répété plusieurs fois par l'utilisateur comme principe cadre. Concrètement : ne jamais deviner/fabriquer un contenu réglementaire (grille de criticité, table normative, seuils) — soit le lire dans une vraie source, soit le dire explicitement et proposer un provisoire clairement étiqueté comme tel, soit poser la question à l'utilisateur.
- **Zéro complaisance en continu** (méthodologie détaillée en `00-cadrage-projet.md` §6quater) : appliquer l'esprit "montrez-moi la preuve" / pas de conformité cosmétique à chaque incrément, pas seulement lors d'un audit formel différé.
- **Ne jamais s'arrêter trop tôt sur une recherche.** L'utilisateur a explicitement recadré une fois ("avant de te dire ok tu t'es arrêté à ce document tu en as pas lu d'autres ?") après une recherche jugée trop superficielle — depuis, systématiquement explorer plusieurs dossiers/sources avant de conclure qu'un sujet est couvert, et être transparent sur ce qui a été lu à 100% vs partiellement.
- **Ne pas mélanger des notions distinctes** — thème central de la soirée du 24-25/08/2026 (voir §5) : chaque concept réglementaire (ACFC, AMDEC, Impact Assessment, GAMP, Data Integrity...) doit être compris et présenté séparément, avec ses propres sources, jamais fusionné par raccourci.
- **Ne jamais fabriquer de contenu réglementaire.** Rappelé plusieurs fois cette session : si une table numérique (ex. grille criticité×complexité) est illisible dans un PDF extrait, le dire plutôt que de deviner les valeurs.
- L'utilisateur alterne entre deux modes de travail bien distincts, à ne pas confondre :
  - **Mode construction** : avancer le code dans l'ordre logique du catalogue de mini-outils (URS §10), avec tests réels (unitaires + navigateur via Playwright) avant de passer au suivant.
  - **Mode instruction/recherche** : pas de code, lecture de normes/guides réels (Google Drive de l'utilisateur), pour que Claude maîtrise le métier avant de concevoir les prochains modules. **C'est le mode actif à la reprise de cette session** (voir §5 et §6).
- Sur les fichiers Google Drive à vérifier : **toujours ouvrir et lire le contenu réel avant de le classer pertinent/non pertinent** — ne jamais se fier au seul titre du fichier (consigne explicite de l'utilisateur, respectée en trouvant qu'un fichier "CSV x IA" était en fait une feuille de route personnelle, pas une norme).

---

## 3. Règles durables déjà actées (ne pas re-décider, juste appliquer)

- **GitHub fait référence exclusive** pour toute action de Claude sur ce projet. **Google Drive est un miroir de confort pour l'utilisateur uniquement**, synchronisé **seulement sur demande explicite** — jamais en tâche de fond. L'automatisation (Routines Claude Code Remote, interface Routines claude.ai) a été testée et confirmée **techniquement impossible** sur ce compte. Ne pas retenter.
- **Ne jamais toucher au dépôt `app-comores-transport`** — ancien emplacement de travail, vidé de tout contenu ValidaPharm. Le seul dépôt de travail est `soudjaymoursala-netizen/validapharm`, cloné en local dans `/home/user/validapharm`.
- **Contrainte réelle du poste de travail professionnel de l'utilisateur** : l'IT bloque l'installation de logiciels non autorisés. Accessibles : `github.com`, `api.github.com`, `*.github.io`, Claude web. Pas Claude desktop. → **PWA 100% navigateur, zéro installation**, persistance via API GitHub (+ Drive en miroir manuel), cache local IndexedDB (Dexie.js).
- **Méthodologie d'audit/montée en maturité** (prompt maître fourni par l'utilisateur, conservé verbatim dans `docs/audit/PROMPT-MAITRE-AUDIT-MATURITE.md`, décision détaillée en `00-cadrage-projet.md` §6quater) : pas d'audit formel complet maintenant (reporté à quand il y aura une IA/sécurité/infra réelles à auditer) ; sa mentalité (zéro complaisance, corriger réellement les gaps, pas de conformité cosmétique) s'applique **dès maintenant, en continu**.
- **Processus de revue** (`00-cadrage-projet.md` §6bis/§6ter) : chaque évolution substantielle des documents passe par un panel de débat contradictoire multi-angles (E1-E7) et, quand pertinent, jusqu'à 4 personas d'audit simulés (Swissmedic, FDA, cabinet de conseil GxP, QA spécialisées) — à appliquer proportionnellement au sujet, pas systématiquement.

---

## 4. État du code et des documents de conception (vérifié le 25/08/2026)

### Documents de conception — versions actuelles

| Document | Version actuelle |
|---|---|
| Cadrage | `docs/00-cadrage-projet.md`, notes de cohérence jusqu'au 24/08/2026 |
| URS | **v25** (`01-URS-outil.md`) |
| Analyse de risque (AR) | **v27** (`02-analyse-de-risque-outil.md`) |
| FS | **v17** (`03-specifications-fonctionnelles.md`) — ajout entité `export_template` |
| FDS | **v14** (`16-FDS-outil.md`) |
| SDS | **v14** (`22-SDS-outil.md`) |
| Conventions de codage | `docs/08-conventions-codage.md` v02 |
| Architecture détaillée | `docs/09-architecture-detaillee.md` v03 |

VMP + protocoles IQ/OQ/PQ de l'outil lui-même (`docs/04` à `07`) : toujours reportés après la conception (code), marqués "À REVOIR".

### Code — état vérifié le 25/08/2026

- Dépôt : `soudjaymoursala-netizen/validapharm`, branche de travail **`claude/contexte-reprise-session-tin77u`**, à jour avec `origin`, working tree propre.
- **PR #1 ouverte** : "Relais IA de production : conception, correction CSP et clôture réseau" — https://github.com/soudjaymoursala-netizen/validapharm/pull/1 — accumule tous les incréments depuis son ouverture, jamais mergée.
- **282 tests, 39 fichiers de test, tous verts** (`npx vitest run`, vérifié le 25/08/2026).
- Toolchain : TypeScript strict + Vue 3 + Pinia + Vue Router + Dexie.js (IndexedDB) + Vitest + ESLint/Prettier. Structure en couches stricte (`presentation/` / `logique-metier/` / `connecteurs/` / `persistance/`), imposée par une règle ESLint.
- **Modules construits et testés (unitaire + navigateur réel via Playwright quand pertinent)**, dans l'ordre logique du catalogue :
  - Fondations : modèle de données pivot, garde de compatibilité de schéma, machine à états du cycle de vie d'une section, garde-fous de finalisation (U-01/U-02/U-03), calcul IPR (S×O×D), persistance Dexie (schéma v1→v5, migrations vérifiées sans perte de données).
  - Écrans : Tableau de bord, Fiche Projet, Éditeur de section, Blocage d'incompatibilité (U-12), Configuration client (GitHub + Drive), Résolution de conflit champ par champ, Gestion des clients, Configuration IA par client, Panneau Chat expert, Assistant de stratégie de qualification, Structure Système.
  - Connecteurs réels : GitHub (lecture/écriture groupée/résolution de conflit par SHA), Drive (miroir), IA (ProviderAdapter — relais Cloudflare Workers + Ollama local, bascule automatique).
  - Moteur de gabarits déclaratif (FDS §4) — catalogue complet des 13 gabarits de l'URS (contexte_procede, DQ, plan_metrologie, URS, FAT, SAT, IQ, OQ, PQ, validation_procede, plan_maintenance, + 2 autres).
  - Export/import de section : JSON, Word (.doc HTML), impression/PDF, CSV par tableau dynamique.
  - Chat expert + routeur IA (§4.4, mode `chat_normatif` uniquement pour l'instant — le mode "audit simulé" reste à faire, tâche #28).
  - Structure Système — fondation référentiel d'actifs (§4.10) : hiérarchie configurable par client, CRUD de nœuds, détection de cycle, unicité de code, journal d'audit par nœud.
  - Assistant de stratégie de qualification (§4.6) : moteur déterministe sur une grille de criticité **provisoire** (9 critères, explicitement étiquetée comme telle dans l'écran) — **à ne pas confondre avec le futur "vrai" outil ACFC**, voir §5 et §6.
- **Backlog explicite restant (tâches #27 à #32, jamais commencées)** :
  - #27 — Gabarits d'export personnalisés par client (§4.3bis, URS-F-023 à 026) — décision de conception "DSL de contenu" volontairement laissée ouverte, documentée dans la FS v17.
  - #28 — Mode audit simulé (§4.4bis, URS-F-038 à 040) + qualification séparée par mode — **bloqué par une décision d'architecture non tranchée** : faut-il une qualification/consentement séparés par mode de chat (normatif vs audit simulé) ? Lié à #29.
  - #29 — Génération de brouillon par adaptation IA (§4.1bis, URS-F-060 à 064) — bloqué par la même question que #28.
  - #30 — Bibliothèque de normes + analyse de documents/challenge de dossier (§4.5/§4.8).
  - #31 — Structure Système : dossier vivant + suivi de périodicité (§4.10 suite, URS-F-101 à 102quinquies).
  - #32 — Connecteurs QMS tiers (Veeva Vault pull/push, §4.9, URS-F-090 à 092quater).

---

## 5. Phase actuelle (24-25/08/2026) : pause construction, montée en compétence métier — et une remise en question d'architecture majeure

Le 24/08/2026 au soir, l'utilisateur a **explicitement arrêté la construction** ("On va s'arrêter là aujourd'hui pour la construction de l'outil") pour que Claude s'instruise en profondeur sur le métier réel, à partir de vrais documents (Google Drive de l'utilisateur : SOP/procédures/protocoles réels de Ferring et Sanofi, normes publiques PIC/S/EudraLex/WHO/ISO/ASTM/ISPE). Consigne explicite répétée : **lire les normes à 100%, littéralement**, pas de survol ; ne jamais mélanger des notions distinctes ; être exhaustif dans la recherche avant de conclure.

### 5.1 Ce qui a été appris et confirmé — synthèse condensée

**Quatre notions distinctes, confirmées séparément sur des sources primaires réelles, jamais à fusionner :**

1. **ACFC (Analyse de Criticité des Fonctions et des Composants)** — questionnaire binaire Oui/Non appliqué **par fonction/composant** (6 à 10 questions selon le site : 6 chez Ferring, 10 chez Sanofi Marcy, 4 chez Sanofi Lyon-Gerland, 8 dans le "System Classification" de l'ISPE Baseline Guide sous un autre nom). **Règle universelle confirmée sur 4 sources indépendantes** : au moins un "Oui" → l'élément est critique, jamais pondéré/moyenné.
2. **AMDEC/FMEA** — outil différent : score numérique **par mode de défaillance** (pas par composant), Sévérité × Occurrence × Détection = IPR/RPN — déjà implémenté fidèlement dans le code (`calculerIPR.ts`, tâche #4).
3. **Impact Assessment / System Classification** — étape **en amont** de l'ACFC, pas la même chose : détermine si un système est GMP-pertinent ("Direct Impact") ou non, via un questionnaire à part (7 questions chez Ferring, 8 dans l'ISPE Baseline Guide), avec la même règle "au moins un Oui → Direct Impact". Un système Direct Impact est ensuite qualifié ; un système non-Direct-Impact est seulement commissionné (vérification technique simple, sans supervision Assurance Qualité).
4. **Catégorisation GAMP5** — grille normative fixe à 5 catégories (1 Infrastructure, 2 Firmware, 3 Logiciel standard non configuré, 4 Logiciel configurable, 5 Sur mesure), issue de PIC/S PI 011-3 — **non modulable par client**, contrairement aux 3 notions précédentes qui le sont.

**Data Integrity / ALCOA+** approfondi séparément (PIC/S PI_041, WHO Annexe 5, MHRA GXP DI Guidance, FDA DI Q&A) : gouvernance des données, approche par les risques appliquée à la criticité des données, définitions ALCOA+ complètes, exigences de piste d'audit, distinction "true copy" vs original vs summary report. Comparaison croisée entre régulateurs faite (PIC/S vs WHO vs MHRA vs FDA — nuances mineures, principes convergents).

**Dispositifs médicaux (ISO 13485:2016, lu intégralement clauses 1-8)** : QMS bâti sur ISO 9001, avec gestion des risques via **ISO 14971** (distincte d'ICH Q9, côté pharma) et un cycle de "design controls" (§7.3) dont le vocabulaire "vérification"/"validation" **ne veut pas dire la même chose** qu'en qualification d'équipement pharma (IQ/OQ/PQ) — piège de confusion identifié et documenté.

**Document le plus significatif trouvé** : le "Project Master Plan for Migrating FSMP Automation Systems to a DCS" (Ferring Swiss Manufacturing Plant, document réel 2025, produit Pentasa®) donne noir sur blanc la séquence réelle et la définit sans ambiguïté : **System Impact Assessment (tout système, verdict Direct/Not Direct Impact) → Computerized System Assessment (catégorie GAMP, pertinence GxP/ERES) → Risk Analysis (ACFC et/ou FRA et/ou FMEA, seulement pour les systèmes Direct Impact) → Design Review → C&Q → Data Integrity Assessment.**

**Découverte la plus importante pour l'architecture de l'outil** : l'ISPE Baseline Guide: Commissioning and Qualification (2ᵉ édition, 2019 — référence consensus de l'industrie, co-écrite par Amgen/Pfizer/GSK/Merck/J&J/AbbVie) **retire explicitement le concept de "Component Criticality Assessment"** (= ACFC littéralement traduit) de sa 1ʳᵉ édition, au motif que le "System Risk Assessment" intégré produit directement les "Critical Design Elements" sans questionnaire de criticité séparé par composant. **Conséquence pour ValidaPharm : ACFC est UNE méthode possible pour l'étape "analyse de risque", pas LA méthode canonique à coder en dur.** Le même guide retire aussi la notion "Indirect Impact" (le modèle est binaire Direct/Not Direct, jamais ternaire) et le "V-Model" comme représentation du cycle de qualification.

### 5.2 Deux erreurs concrètes trouvées dans l'URS actuelle (v25), pas encore corrigées

Repérées lors du "challenge" du projet demandé par l'utilisateur le 25/08/2026, à traiter en premier à la reprise :

1. **`01-URS-outil.md` ligne 412** : mentionne un modèle "impact direct/indirect/aucun" — trois niveaux, alors que la référence actuelle (ISPE Baseline Guide 2ᵉ éd.) n'en connaît que deux (Direct Impact / Not Direct Impact). À corriger.
2. **`01-URS-outil.md` lignes 399-410** : dit qu'ACFC et Computer System Assessment sont "fusionnés en un seul mini-outil" — contredit à la fois le document Ferring FSMP (trois étapes séquentielles distinctes : System Impact Assessment, Computerized System Assessment, Risk Analysis) et la structure de l'ISPE Baseline Guide (System Classification ≠ System Risk Assessment, jamais fusionnés). À corriger : restructurer en 3 briques séquentielles distinctes dans le catalogue famille F.

### 5.3 La remise en question d'architecture de l'utilisateur — non résolue, c'est le sujet de la prochaine session de travail

L'utilisateur a soulevé un point de fond avant la pause construction : **l'URS actuelle ne définit nulle part les données d'entrée et de sortie de chaque mini-outil** (ACFC, AMDEC, Impact Assessment, Computer System Assessment, protocoles...). Question posée explicitement : pour chaque module, quelles sont les données d'entrée (fixes ? modulables par client ? qui les fournit ?) et quelles sont les données de sortie (le livrable rempli, au format demandé) ?

Diagnostic déjà posé (validé par l'utilisateur, à formaliser dans l'URS/FS) :
- Le moteur de gabarits existant (`definitionGabarit.ts`) résout déjà la moitié **sortie** du problème (schéma déclaratif générique, jamais besoin de modifier le moteur pour un nouveau gabarit).
- Rien ne résout la moitié **entrée** : chaque mini-outil de type "questionnaire/grille" doit séparer clairement une **Définition** (les questions/critères, propres à chaque client — jamais codées en dur, contrairement à ce qui a été fait pour la grille provisoire du §4.6) d'une **Instance** (une exécution de cette définition contre un composant/fonction réel réel, rattaché à un nœud de la Structure Système déjà construite en §4.10).
- Certains éléments sont fixes/normatifs (ex. la grille des 5 catégories GAMP5, la règle d'agrégation "au moins un Oui → critique") et ne doivent jamais être rendus "modulables" ; d'autres sont structurellement propres à chaque client (les questions ACFC elles-mêmes, les échelles AMDEC S/O/D) et ne doivent jamais être codés en dur. Trancher, module par module, lequel est lequel — c'est exactement l'objet de la session de travail que l'utilisateur veut mener ensuite : **"bosser plus intelligemment, module par module depuis le début jusqu'à la fin pour définir les données d'entrée et de sorties qu'on veut. Modulable ou non."**

**C'est le sujet de travail prioritaire annoncé pour la reprise** (message de l'utilisateur du 24/08 au soir, toujours valable) — pas encore commencé au moment de la rédaction de ce fichier.

### 5.4 Sources lues cette phase — état de couverture (25/08/2026)

Lues **intégralement** (texte primaire, pas résumé) : ASTM E2500-20, EudraLex Annexe 11, EudraLex Annexe 15, PIC/S PI_041, PIC/S PI 006-4 (49 p.), WHO Annexe 5, MHRA GXP Data Integrity Guidance, FDA Data Integrity Q&A, ISO 13485:2016 (clauses 1-8), Ferring FSMP Project Master Plan, 2 papiers Antaes Consulting, présentation webinaire GAMP Data Integrity by Design.

Lues **partiellement**, à continuer : ISPE Baseline Guide: Commissioning and Qualification (chapitres 1 à 5 sur 14 lus intégralement — Introduction, URS, System Classification, System Risk Assessment, début DR/DQ ; chapitres 6-14 et annexes restants), Guide BPF France/ANSM (table des matières complète + Chapitre 1 "Système Qualité Pharmaceutique" lus intégralement sur ~9 chapitres de la Partie I + Parties II/III/IV, document de ~400 pages).

Pas encore ouverts : Vocabulaire Qualité, ISO 10004, Annexe 15 PIC/S (projet de modification, version 2026 en consultation).

Le fichier de tâches interne de la session liste ces lectures individuellement (tâches #33 à #42) — utile pour reprendre précisément là où c'est resté en suspens si l'utilisateur veut continuer l'exhaustivité à 100 % de ces documents avant de reprendre la construction.

---

## 6. Prochaines étapes (dans l'ordre annoncé par l'utilisateur)

1. **Terminer les lectures en cours** si l'utilisateur le souhaite (ISPE Baseline Guide chapitres 6-14 + annexes, Guide BPF France restant, 3 documents jamais ouverts) — non bloquant pour la suite.
2. **Corriger les deux erreurs identifiées dans l'URS v25** (§5.2 ci-dessus) — modèle binaire Direct/Not Direct, séparation ACFC / Computer System Assessment / Risk Analysis en 3 briques distinctes.
3. **Le chantier principal annoncé** : reprendre le catalogue de mini-outils de l'URS §10 **module par module, du début à la fin**, et pour chacun trancher explicitement : quelles sont les données d'entrée, sont-elles figées (normatives) ou modulables (propres au client), quelles sont les données de sortie, sous quel format. Formaliser ça dans l'URS/FS avant de reprendre le code — pas l'inverse.
4. Une fois ce travail de définition fait, reprendre la construction (probablement en commençant par le "vrai" outil ACFC/Impact Assessment/Risk Analysis, qui remplacera à terme la grille provisoire du §4.6 — celle-ci reste explicitement étiquetée "provisoire" dans l'écran tant que ce travail n'est pas fait).
5. Backlog déjà connu et non urgent : tâches #27 à #32 listées en §4.

---

## 7. Repères pratiques

- Dépôt local : `/home/user/validapharm`, remote `origin` = `https://github.com/soudjaymoursala-netizen/validapharm`.
- Branche de travail active : `claude/contexte-reprise-session-tin77u` (pas `main`) — c'est elle qui porte la PR #1 ouverte.
- PR ouverte : #1, https://github.com/soudjaymoursala-netizen/validapharm/pull/1 — jamais mergée, continuer à y committer.
- Tests : `npx vitest run` — 282 tests, 39 fichiers, tous verts au 25/08/2026.
- Toute action risquée (push, suppression, écrasement, merge de PR) reste soumise à confirmation explicite au cas par cas.
- Fichiers Google Drive de référence utilisés cette phase : dossier `01 - Metiers Pharma / 00 - Normes et guidline GMP / Guide et normes CQV-CSV` (sous-dossiers `CSV`, `CQV`, `PIC/S`) — c'est là que se trouvent les normes réelles téléchargées par l'utilisateur, à explorer en premier pour toute future recherche normative.

---
*Fichier de continuité, pas un livrable projet — à réécrire entièrement (pas juste amender) la prochaine fois qu'un état des lieux complet est demandé, plutôt que de laisser les deux versions coexister.*
