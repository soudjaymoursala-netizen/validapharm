# SDS — Spécification de conception technique (logicielle) de l'outil ValidaPharm

| | |
|---|---|
| **Référence** | SDS-VALIDAPHARM-2026-001 |
| **Version** | 10 (résolution du choix de framework — TypeScript + Vue, `08-conventions-codage.md`) |
| **Statut** | En rédaction |
| **Catégorie GAMP 5** | Catégorie 5 (sur mesure) |
| **Documents de référence** | `01-URS-outil.md` v22, `02-analyse-de-risque-outil.md` v22, `03-specifications-fonctionnelles.md` v10, `16-FDS-outil.md` v13, `08-conventions-codage.md` v01, `23-revue-multi-experts-SDS.md` v01, `24-audit-swissmedic-SDS.md` v01, `25-audit-fda-SDS.md` v01, `36-revue-multi-experts-SDS-v04.md` v01, `37-audit-swissmedic-SDS-v05.md` v01, `38-audit-fda-SDS-v05.md` v01 (closes) |
| **Rédigé par** | — |
| **Vérifié par** | — |
| **Approuvé par** | — |

---

## 1. Objet et méthode

La FDS (v04) décrit le comportement fonctionnel détaillé : écrans, flux, machine à états, algorithmes, messages. Cette SDS descend au niveau **technique** : choix d'architecture logicielle, schéma de données physique, contrats d'interface précis, mécanismes d'implémentation des garde-fous — sans être un document de code. Elle applique en particulier le principe directeur posé en FDS §8bis (séparation logique métier/présentation) comme contrainte structurante de toute l'architecture.

## 2. Architecture technique globale

```
┌───────────────────────────────────────────────────────────────────┐
│                     Application (navigateur, locale-first)          │
│                                                                       │
│  ┌─────────────────────────┐        ┌───────────────────────────┐  │
│  │   Couche Présentation     │        │   Couche Logique métier    │  │
│  │   (écrans, composants UI) │◀──────▶│   (modules purs, testables │  │
│  │   — FDS §2, §3            │  appel │   indépendamment de l'UI)  │  │
│  │                            │  de    │   — FDS §8bis              │  │
│  │                            │ fonction│  • Moteur de calcul (§4)  │  │
│  │                            │        │  • Machine à états (§5)   │  │
│  │                            │        │  • Grille de qualification│  │
│  │                            │        │  • Détection de liens     │  │
│  │                            │        │  • Résolution de conflit  │  │
│  └─────────────────────────┘        └──────────────┬────────────┘  │
│                                                        │              │
│                                       ┌────────────────▼──────────┐  │
│                                       │  Couche Persistance locale │  │
│                                       │  (lecture/écriture fichiers│  │
│                                       │   structurés, §3)          │  │
│                                       └────────────────┬──────────┘  │
└────────────────────────────────────────────────────────┼────────────┘
                                                            │
                          ┌─────────────────────────────────┼─────────────────────┐
                          ▼                                 ▼                      ▼
                 Connecteur Git (§5)              Connecteur Drive (§5)   Routeur IA (§6)
                 API GitHub (commits signés,           API Drive             API fournisseurs
                 branche protégée)                  (miroir, écriture)     cloud + modèle local
```

**Règle de conception (répond à FDS §8bis)** : la Couche Logique métier n'importe **jamais** de composant de présentation. Chaque module (moteur de calcul, machine à états, grille de qualification, détection de liens, résolution de conflit) expose une interface fonction-pure (entrée → sortie, sans effet de bord sur l'UI), testable par appel direct dans les tests unitaires sans instancier d'écran.

## 3. Schéma de données physique

Un fichier structuré par enregistrement (répond à URS-NF-046, cadrage §4 Phase 1) :

```
/data
  /projects/{project_id}.json        — objet `project` (FDS/FS §3)
  /sections/{section_id}.json        — objet `section`
  /documents/{project_document_id}.json
  /client_configs/{client_id}.json
  /schema_version.json               — { "version": "semver", "migrated_at": "…" }
  /anomalies/{anomaly_id}.json        — journal d'anomalies (URS-NF-053)
  /asset_hierarchy_schemas/{client_id}.json   — niveaux (`key` technique + libellés), ajouté v04
  /asset_nodes/{node_id}.json                 — objet `asset_node` (FS §3), ajouté v04
```

- Chaque écriture significative = un commit Git (répond à URS-NF-030) ; le message de commit encode `{type} {ref} {action}` (ex. `section a1b2 changement_statut: en_verification→en_approbation`).
- Migration de schéma (URS-NF-046) : un script de migration versionné accompagne toute évolution de `schema_version`, exécuté à l'ouverture si `schema_version` du dépôt < version attendue par l'application, avant tout accès aux données.
- **Atomicité de la migration (ajoutée v02 — revue SDS, E2, mitige AR-R-45, URS-NF-046quater)** : avant toute exécution, une sauvegarde intégrale de l'état courant (`/data`) est créée et vérifiée (checksum) ; si la migration échoue à n'importe quelle étape, un mécanisme de retour arrière restaure automatiquement cette sauvegarde, et l'application refuse de démarrer sur un état partiellement migré (message explicite, pas de démarrage silencieux sur données incohérentes). Le retour arrière lui-même est couvert par un test dédié (échec simulé en cours de migration).
- **Garde de compatibilité descendante (ajoutée v09 — résorption de dette, URS-NF-055bis, mitige AR-R-60)** : symétriquement, si `schema_version` du dépôt est **postérieur** à la version maximale que l'application sait lire (cas d'un rollback vers une version antérieure de l'application après une migration), l'application refuse explicitement de démarrer — écran dédié (FDS §7, message U-12), **avant tout accès en lecture ou écriture** à `/data`. Cette vérification est la première opération effectuée à l'ouverture, avant même la vérification `<` ci-dessus.

## 4. Moteur de calcul et logique métier (module isolé)

- Fonctions pures, sans état partagé, une fonction par calcul réglementaire (ex. `calculerIPR(s, o, d): number`, `evaluerGrilleQualification(reponses): Conclusion`).
- Chaque fonction porte sa propre version sémantique (`template_engine_version`, `qualification_test_set_version`), incrémentée à toute modification de logique — jamais de correction silencieuse.
- Suite de tests unitaires dédiée par fonction, exécutée en local et avant toute fusion de code (référence FDS §8bis) — cas limites systématiques : valeurs nulles, valeurs aux bornes, combinaisons non couvertes par une grille fermée.
- **Portail de qualité technique (ajouté v02 — revue SDS, E4, mitige AR-R-46, URS-REG-004)** : la maîtrise des changements n'est pas une pratique déclarée mais **appliquée automatiquement** — un pipeline d'intégration continue exécute la suite de tests unitaires de la Couche Logique métier à chaque proposition de modification, et **bloque techniquement** toute fusion vers la branche principale protégée tant qu'un test échoue. Aucune procédure de contournement manuel de ce blocage n'est prévue en Phase 1.

## 5. Connecteur Git — implémentation de la synchronisation et de la résolution de conflit

- Commits signés (GPG/SSH) sur la branche principale protégée (répond à URS-NF-030, AR-R-10).
- **Résolution de conflit (implémente FDS §3.6)** : **(ajouté v03 — audit Swissmedic simulé, MAJ-01, mitige AR-R-34)** en amont, un driver de fusion Git personnalisé est configuré sur tous les fichiers `sections/*.json` (`.gitattributes` : `merge=validapharm-json`), désactivant la fusion automatique par ligne de Git. **Tout** conflit textuel sur un tel fichier — y compris ceux que Git résoudrait normalement sans le signaler — est systématiquement traité par le mécanisme applicatif ci-dessous, jamais par la fusion par défaut de Git. À la détection d'un conflit de fusion sur un fichier `sections/{id}.json`, le connecteur :
  1. Charge les deux versions divergentes (locale, distante) en mémoire, jamais directement les marqueurs Git bruts.
  2. Pour les champs scalaires (`values`, `meta`) : calcule un diff champ par champ.
  3. Pour les champs `tableau_dynamique` : diff au niveau ligne, par identifiant stable de ligne — union automatique des lignes non conflictuelles, isolement des lignes réellement en conflit.
  4. Transmet ce diff structuré à la Couche Présentation (écran de résolution, FDS §3.6) — le connecteur ne résout jamais lui-même un conflit sans décision utilisateur explicite.
  5. À la confirmation, écrit une nouvelle révision avec, pour motif, le détail structuré des décisions prises champ par champ/ligne par ligne (répond à l'amendement FDA sur la FDS, §3.6).

## 5bis. Connecteur Drive — contrat d'interface (ajouté v08, répond à URS-NF-010/011/047, trouvé manquant lors de la revue de cohérence du 23/08/2026)

- Interface (`DriveConnector`) : `miroir(snapshotGit): Confirmation` — un seul point d'entrée, pas de logique métier propre. Le connecteur Drive **n'est jamais une source de vérité, jamais lu par l'application** (répond à URS-NF-010, §3 FS "toute divergence se résout en faveur de Git").
- Déclenchement : après chaque session de travail (heuristique : inactivité ou fermeture de l'application) et sur action manuelle "Sauvegarder maintenant" (URS-NF-011) — jamais en continu, pour rester cohérent avec le principe local-first (pas de dépendance réseau permanente).
- `miroir()` copie l'état courant du dépôt Git local vers le dossier Drive dédié du client — une copie de fichiers, pas une fusion : en cas d'écriture concurrente côté Drive (ex. modification manuelle accidentelle par l'utilisateur dans l'explorateur Drive), le prochain miroir **écrase** le contenu Drive sans tentative de fusion, cohérent avec "jamais lu comme source" (à afficher explicitement à l'utilisateur avant le premier miroir, pour éviter une surprise).
- Contrat d'erreur typé (même principe que §6/§6bis) : `TimeoutError`, `QuotaDepasseError` (quota de stockage Drive), `AuthentificationError` — un échec de miroir **n'est jamais silencieux** : indicateur visible tant que le dernier miroir réussi date de plus d'une session (répond à URS-NF-047, alerte de saturation).
- Secrets/jeton d'accès Drive isolés par `client_id`, même mécanisme que les autres connecteurs (§7).

## 6. Routeur IA — contrats d'interface

- Interface commune à tous les fournisseurs (`ProviderAdapter`) : `envoyerMessage(contexte, question): Reponse` — chaque fournisseur (Claude, OpenAI, Copilot, DeepSeek, modèle local) implémente cet adaptateur, aucune logique de routage ne dépend du fournisseur spécifique au-delà du choix de l'adaptateur actif (`client_config.ai_provider`).
- **Contrat d'erreur (ajouté v02 — revue SDS, E5)** : `envoyerMessage()` DOIT lever une exception typée distincte pour chaque cas (`TimeoutError`, `QuotaExceededError`, `ReponseInvalideError`, `IndisponibleError`) — jamais une exception générique. Le routeur intercepte spécifiquement `TimeoutError`/`IndisponibleError` pour déclencher la bascule automatique vers le modèle local (URS-F-033) ; les autres cas sont remontés à l'UI sans bascule automatique (ex. quota dépassé ≠ fournisseur indisponible, ne doit pas déclencher un changement de fournisseur silencieux).
- Le routeur ne transmet **jamais** le contenu d'une section sans un indicateur explicite `contenu_joint: true` fourni par la Couche Présentation suite à confirmation utilisateur (répond à URS-F-031).
- Détection de version de fournisseur : chaque réponse d'API porte (quand le fournisseur l'expose) un identifiant de version de modèle, comparé à `client_config.ai_provider_reliability_qualification.qualification_test_set_version` associé — écart → indicateur transmis à l'UI pour l'alerte URS-F-032quinquies.

## 6bis. Connecteur QMS — contrats d'interface (ajouté v04, répond à URS-F-090 à 092quater)

- Interface commune (`QMSConnectorAdapter`) : `pull(recherche): DonneesTierces`, `push(livrable, cible): Confirmation` — même pattern que `ProviderAdapter` (§6). Chaque système (Veeva, SAP, TrackWise) implémente cet adaptateur ; le connecteur de référence Phase 1 est Veeva Vault.
- `push()` exige un identifiant de transaction (`transaction_id`, UUID) transmis dans la requête. **(Renforcé v06 — audit FDA simulé, MAJ-01)** Ce `transaction_id` est généré et **persisté localement avant** le premier appel réseau — jamais régénéré à chaque tentative. Tout retry (manuel ou automatique après timeout/perte de la confirmation) réutilise ce même identifiant jusqu'à confirmation de réception explicite du système cible ou abandon explicite de l'utilisateur — sans cela, un premier envoi réussi côté serveur mais dont la confirmation se perd créerait un doublon au retry malgré le mécanisme d'idempotence. Le système cible (s'il supporte l'idempotence, sinon vérification applicative par recherche préalable du `transaction_id`) ne crée jamais de doublon (répond à URS-F-092quater, mitige AR-R-50).
- `push()` ne retourne `Confirmation` (succès) qu'après accusé de réception explicite du système cible — un timeout ou une erreur HTTP ne marque jamais un envoi comme réussi par défaut (répond à URS-F-092quater).
- Secrets par connecteur isolés par `client_id`, même mécanisme que les secrets fournisseur IA (§7).
- Contrat d'erreur typé (même principe que §6) : `TimeoutError`, `TenantInvalideError`, `AuthentificationError`, `ReponseInvalideError` — la Couche Présentation affiche un message distinct par type d'erreur, jamais un message générique "échec".

## 7. Sécurité technique

- Secrets (clés API fournisseurs, jeton Git) stockés exclusivement dans une configuration locale **non versionnée** (répond à URS-NF-044) — jamais dans un fichier suivi par Git.
- **(ajouté v02 — revue SDS, E1)** Le stockage de secrets est **isolé par `client_id`** — la clé API du fournisseur configuré pour un client A n'est jamais accessible ni utilisée lors d'un appel concernant un client B, y compris techniquement (pas seulement par convention applicative). Élaboration technique de URS-NF-044 combiné à l'isolation stricte déjà exigée par URS-F-024.
- Scan de secrets automatique avant chaque commit (hook pre-commit), rejet du commit si un pattern de clé/jeton est détecté dans un fichier suivi.
- Quota configurable par fournisseur (URS-NF-048) implémenté au niveau du routeur IA — compteur d'appels/coût estimé, seuil configurable par `client_config`, blocage des nouveaux appels au-delà du seuil avec message explicite.
- **Fiabilité de l'horodatage — risque reconnu explicitement (ajouté v03 — audit FDA simulé, MAJ-01)** : en Phase 1, les horodatages de la piste d'audit (commits Git, `revisions[]`, `audit_log[]`) reposent sur l'horloge système locale du poste, non synchronisée ni vérifiée contre une source de temps de confiance — une manipulation de l'horloge locale avant un commit n'est pas détectée. C'est une limite Phase 1 assumée (au-delà du disclaimer générique déjà porté par URS-NF-030), cohérente avec l'absence de signature Part 11 opposable à ce stade. **Remédiation Phase 3 nommée** : lors de la bascule vers l'architecture serveur (cadrage §4), les horodatages seront générés côté serveur par une source de temps de confiance (NTP synchronisé), indépendante de l'horloge des postes clients.

## 8. Journal d'anomalies — implémentation

- `/data/anomalies/{id}.json` : `{ id, description, contexte, statut, created_at, updated_at }`.
- Écran Journal d'anomalies (FDS §3.7) lit directement ce répertoire, sans dépendance au moteur de calcul ni au connecteur Git au-delà de la persistance standard.

## 7bis. Charte graphique — implémentation technique (ajouté v07, répond à URS-NF-054 à 054quinquies, FDS §2bis)

- La palette, la typographie et les rayons/espacements de la FDS §2bis sont implémentés comme des **jetons de conception versionnés** (design tokens — variables CSS (`:root` custom properties), consommées par les composants Vue (Single File Components), jamais des valeurs codées en dur dispersées dans les composants — *(v10 — framework résolu)*. Une modification de teinte ou de police se fait à un seul endroit.
- Le mapping `qualification_status → {couleur, icône, libellé}` (FDS §2bis) est une **fonction pure isolée** (même principe que le moteur de calcul, §4) : `presenterStatut(qualification_status): { couleur, icone, libelle }` — testable indépendamment de l'UI, garantit qu'aucun statut n'est jamais rendu sans son icône/libellé associé (mitige AR-R-59).
- Un test automatisé de contraste (calcul du ratio WCAG entre chaque couleur de statut et son fond associé, seuils définis en FDS §2bis) fait partie de la suite de tests de la Couche Logique métier (§9) — le portail de qualité (§4) bloque toute modification de palette qui ferait descendre un contraste sous le seuil requis.
- Les deux registres visuels (écran vs export) ne partagent techniquement aucun jeton : le moteur de génération d'export (Word/PDF, §3) n'importe jamais les jetons de couleur/typographie de l'écran de travail — séparation physique, pas seulement une convention (répond à URS-NF-054bis).

## 8bis. Structure Système — implémentation technique (ajouté v04, répond à URS-F-100 à 102quinquies)

- `asset_node.parent_id` (lien hiérarchique) : validation anti-cycle implémentée comme fonction pure isolée (`validerAbsenceDeCycle(nodeId, nouveauParentId): boolean`), appelée à la création **et** à tout reparentage — testable indépendamment de l'UI (§8bis FDS/principe cabinet GxP).
- `asset_node.associated_nodes[]` (liens d'association) : aucune contrainte de cycle — structure de graphe libre, pas d'arbre.
- Unicité du code (URS-F-100nonies) : **(clarifié v05 — revue SDS-v04, E5 ; renforcé v06 — audit Swissmedic simulé, MAJ-01)** le stockage étant fichier-par-enregistrement (§3), l'unicité n'est pas une contrainte de base de données mais un fichier d'index dédié `/data/asset_nodes_index/{client_id}.json`. L'écriture du fichier nœud et la mise à jour de l'index sont incluses dans le **même commit Git atomique** — jamais deux écritures séparées pouvant diverger en cas d'interruption. Au démarrage, une vérification de cohérence légère (index ↔ fichiers réels) signale toute divergence sans bloquer l'application.
- Suppression d'un niveau de `asset_hierarchy_schema` utilisé par au moins un `asset_node.level_key` existant : bloquée au niveau de la couche logique (fonction pure `niveauUtilise(clientId, levelKey): boolean`), pas seulement un message d'interface.
- Dérivation automatique de `qualification_status` (URS-F-102ter) : **(clarifié v05 — revue SDS-v04, E3)** vérification de `periodic_qualification.deadline` à l'ouverture de l'application **et** à chaque lecture/affichage d'un `asset_node` (dossier vivant, sélection de projet, etc.) — jamais un minuteur d'arrière-plan (irréaliste pour une application locale-first sans serveur, cohérent avec cadrage §4 Phase 1) — jamais une saisie manuelle silencieusement obsolète.
- Machine à états minimale de `qualification_status` : "Déclassé — retiré" est un état terminal (aucune transition sortante autorisée par la fonction de transition), toutes les autres transitions passent par la même fonction pure, journalisées.
- Instantané projet↔nœud (URS-F-100decies) : `node_name_snapshot`/`node_code_snapshot` copiés au moment de la liaison, jamais recalculés depuis `asset_node` courant — garantit qu'un renommage ultérieur ne modifie aucun livrable déjà lié.

## 8ter. Performance et capacité — implémentation technique (ajouté v09, répond à URS-NF-052/052bis)

- Volume de référence Phase 1 : 500 projets / 5000 sections par client (URS-NF-052). Les listes (tableau de bord, inventaire d'un référentiel Structure Système, dossier vivant) sont **paginées ou virtualisées** au-delà d'un seuil d'affichage (ex. 100 lignes) — jamais un rendu intégral de la liste complète en mémoire du navigateur.
- Recherche/filtrage (ex. recherche de nœud par code, filtrage du dossier vivant) s'appuie sur un **index en mémoire construit au chargement**, pas un balayage linéaire répété à chaque frappe — condition nécessaire pour tenir la cible de réactivité perçue (URS-NF-052bis) au volume de référence.
- Le framework est fixé (TypeScript + Vue 3, §10) ; le choix de bibliothèque de virtualisation exacte reste une décision d'implémentation locale, sans impact sur la contrainte de conception fixée ici (pas de rendu/balayage intégral au-delà du seuil).
- Un test de performance (temps de chargement du tableau de bord et d'ouverture d'une section, mesuré au volume de référence) fait partie de la suite de tests avant mise en service (OQ/PQ de l'outil, URS-NF-052) — pas du portail de qualité en continu (mesure dépendante de la machine d'exécution, moins fiable en CI qu'un test fonctionnel).

## 9. Stratégie de test (implémentation du principe FDS §8bis)

| Couche | Type de test | Portée |
|---|---|---|
| Logique métier (moteur de calcul, machine à états, grille, détection de liens, résolution de conflit, anti-cycle Structure Système, dérivation de statut, garde de compatibilité descendante) | Unitaire, exhaustif, automatisé | Chaque fonction pure, tous les cas limites identifiés en FDS §5/§6/§3.9, dont le refus de démarrage sur schéma trop récent (mitige AR-R-60) |
| Connecteur Git/Drive/IA/QMS tiers | Test d'intégration, mocké en CI, réel en OQ | Contrats d'interface (§5, §5bis, §6, §6bis) |
| Couche Présentation | Test fonctionnel/exploratoire (candidats identifiés en FS §4.5, doctrine CSA) | Écrans à faible risque résiduel |
| Charte graphique (`presenterStatut`, contraste) | Unitaire, exhaustif, automatisé | Fonction pure de mapping statut→couleur/icône/libellé, ratios de contraste WCAG (§7bis, mitige AR-R-59) |
| Accessibilité lecteur d'écran (URS-NF-050bis) | Exploratoire (parcours manuel NVDA/VoiceOver) | Parcours critiques uniquement (navigation, saisie, export) — choix délibéré, proportionné à la Phase 1 |
| Performance/capacité (URS-NF-052bis) | Mesure au volume de référence, hors portail de qualité continu | Temps de chargement tableau de bord et ouverture de section (§8ter) |

## 10. Choix de framework/langage — résolu (ajouté v10, décision explicite du 23/08/2026)

**TypeScript (mode strict) + Vue 3 + Vitest + ESLint/Prettier.** Décision et justification détaillées dans `08-conventions-codage.md`, qui fixe également la structure de dossiers (miroir strict des couches §2), la règle de traçabilité code↔exigence (bloc TSDoc `@requirement`), et les règles de test — répond à la demande explicite de l'utilisateur du 23/08/2026 (code auditable, commenté, structuré pour la testabilité QA). Sans impact sur les contrats d'interface déjà fixés ici (§5, §5bis, §6, §6bis) : ce choix ne fait que les implémenter.

## 10bis. Hors périmètre de cette SDS

- HDS (pas de matériel dédié) et Data Migration Plan (dépôt vierge, décision du 22/08/2026).

## 11. Matrice de traçabilité FDS → SDS

| Section FDS | Section SDS |
|---|---|
| §2/§3 Écrans et flux | §2 (Couche Présentation) |
| §3.6 Résolution de conflit Git | §5 |
| §3.7 Journal d'anomalies | §8 |
| §4 Moteur de gabarits | §3 (schéma), §4 |
| §5 Algorithmes déterministes | §4 |
| §7 Messages système | §2 (Couche Présentation, hors périmètre technique détaillé) |
| §8bis Principe directeur | §2, §9 |
| URS-NF-046quater (atomicité migration) | §3 |
| URS-REG-004 (portail de qualité) | §4 |
| §3.8 FDS (connecteurs QMS) | §3, §6bis |
| §3.9 FDS (Structure Système) | §3, §8bis |
| §2bis FDS (charte graphique) | §7bis |
| FS §2/§5.2 (miroir Drive, URS-NF-010/011/047) | §5bis |
| FS §5.1/§5.2/§5.5 (perf/rollback/lecteur d'écran) | §8ter, §3, §9 |

---
*Document vivant, version 10 — v02 revue multi-experts (REV-SDS-001). v03 audits Swissmedic/FDA (driver de fusion Git, horodatage). v04 cinq besoins Structure Système/connecteurs QMS. v05 revue multi-experts (REV-SDS-002) : index d'unicité de code, dérivation de statut à la lecture. v06 intègre 2 constats d'audits Swissmedic et FDA simulés (`AUDIT-SWISSMEDIC-006`, `AUDIT-FDA-006`). v07 intègre la charte graphique et identité visuelle (`REV-URS-VALIDAPHARM-2026-010`). v08 ajoute le contrat d'interface du connecteur Drive (§5bis). v09 résorbe les trois gaps mineurs actés comme dette explicitement acceptée au cadrage §6ter. **v10 : le choix de framework est résolu** (TypeScript + Vue 3 + Vitest + ESLint/Prettier, `08-conventions-codage.md`, décision explicite du 23/08/2026) — §10 réécrit, jetons de conception précisés (variables CSS + Vue SFC). Cascade de conception URS→FS→FDS→SDS complète et cohérente, framework fixé, avant le démarrage effectif de l'écriture du code le 23/08/2026 — plus aucun gap connu.*
