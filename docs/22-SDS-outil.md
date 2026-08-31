# SDS — Spécification de conception technique (logicielle) de l'outil ValidaPharm

| | |
|---|---|
| **Référence** | SDS-VALIDAPHARM-2026-001 |
| **Version** | 17 (§4.31/URS-F-310 — archivage protégé de client/projet, verrou local par mot de passe PBKDF2-SHA-256, nouvelle table `profilLocal`, 31/08/2026, TD-033 — §3bis/§7 mis à jour) |
| **Version précédente** | 16 (rattrapage documentaire Phases 12-34 de convergence architecturale — Reasoning Engine, Context Engine, Organization/Workspace, Knowledge Graph, ~70 nouvelles tables Dexie — audit croisé URS/FS/FDS/SDS, 28/08/2026, §12) |
| **Statut** | En rédaction |
| **Catégorie GAMP 5** | Catégorie 5 (sur mesure) |
| **Documents de référence** | `01-URS-outil.md` v62, `02-analyse-de-risque-outil.md` v28, `03-specifications-fonctionnelles.md` v52, `16-FDS-outil.md` v16, `08-conventions-codage.md` v02, `09-architecture-detaillee.md` v03, `23-revue-multi-experts-SDS.md` v01, `24-audit-swissmedic-SDS.md` v01, `25-audit-fda-SDS.md` v01, `36-revue-multi-experts-SDS-v04.md` v01, `37-audit-swissmedic-SDS-v05.md` v01, `38-audit-fda-SDS-v05.md` v01 (closes) — `docs/convergence/PHASE_13_*` à `PHASE_34_*` pour le détail exhaustif de chaque phase |
| **Rédigé par** | — |
| **Vérifié par** | — |
| **Approuvé par** | — |

---

## 1. Objet et méthode

La FDS (v04) décrit le comportement fonctionnel détaillé : écrans, flux, machine à états, algorithmes, messages. Cette SDS descend au niveau **technique** : choix d'architecture logicielle, schéma de données physique, contrats d'interface précis, mécanismes d'implémentation des garde-fous — sans être un document de code. Elle applique en particulier le principe directeur posé en FDS §8bis (séparation logique métier/présentation) comme contrainte structurante de toute l'architecture.

## 2. Architecture technique globale

**(réécrite v11 — architecture web pure sans installation, décision explicite du 23/08/2026)** Application web pure (PWA) : aucun binaire installé, aucun accès disque natif, aucun `git` local — contrainte réelle d'un poste de travail professionnel dont l'IT bloque les logiciels/services non autorisés (navigateur et `github.com` le sont).

```
┌───────────────────────────────────────────────────────────────────┐
│                Application (navigateur uniquement, PWA)             │
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
│                                       │  Couche Persistance         │  │
│                                       │  Cache local (IndexedDB) —  │  │
│                                       │  aucun accès disque natif,  │  │
│                                       │  §3                         │  │
│                                       └────────────────┬──────────┘  │
└────────────────────────────────────────────────────────┼────────────┘
                                                            │ appels API HTTPS uniquement
                          ┌─────────────────────────────────┼─────────────────────┐
                          ▼                                 ▼                      ▼
              Connecteur GitHub (§5)              Connecteur Drive (§5bis)   Routeur IA (§6)
              API GitHub (Contents/Git Data,          API Drive              API fournisseurs
              jeton à portée restreinte,           (miroir, écriture)      cloud + modèle local
              branche protégée)
```

**Règle de conception (répond à FDS §8bis)** : la Couche Logique métier n'importe **jamais** de composant de présentation. Chaque module (moteur de calcul, machine à états, grille de qualification, détection de liens, résolution de conflit) expose une interface fonction-pure (entrée → sortie, sans effet de bord sur l'UI), testable par appel direct dans les tests unitaires sans instancier d'écran.

**Aucun connecteur n'exécute de binaire `git` ni n'accède au disque en dehors du stockage navigateur** — tout accès à GitHub/Drive passe par leurs API HTTPS respectives (répond à URS-NF-030/044).

## 3. Schéma de données physique

**(clarifié v11 — architecture web pure)** L'arborescence ci-dessous décrit la structure logique des enregistrements — à la fois les chemins de fichiers dans le dépôt GitHub dédié (source de vérité, lus/écrits via l'API GitHub, jamais un système de fichiers local monté) et les clés du cache local IndexedDB (miroir de performance/hors-ligne, jamais la source de vérité). Un fichier structuré par enregistrement (répond à URS-NF-046, cadrage §4 Phase 1) :

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
- **Atomicité de la migration (ajoutée v02 — revue SDS, E2, mitige AR-R-45, URS-NF-046quater)** : avant toute exécution, une sauvegarde intégrale de l'état courant (`/data`) est créée et vérifiée (checksum) ; si la migration échoue à n'importe quelle étape, un mécanisme de retour arrière restaure automatiquement cette sauvegarde, et l'application refuse de démarrer sur un état partiellement migré (message explicite, pas de démarrage silencieux sur données incohérentes). Le retour arrière lui-même est couvert par un test dédié (échec simulé en cours de migration). **(clarifié v11 — architecture web pure)** La "sauvegarde" est une référence Git créée via l'API (tag/branche pointant sur le SHA du commit précédant la migration) — un simple pointeur, aucune copie de fichiers nécessaire ; le retour arrière ré-écrit la branche principale sur ce SHA via l'API.
- **Garde de compatibilité descendante (ajoutée v09 — résorption de dette, URS-NF-055bis, mitige AR-R-60)** : symétriquement, si `schema_version` du dépôt est **postérieur** à la version maximale que l'application sait lire (cas d'un rollback vers une version antérieure de l'application après une migration), l'application refuse explicitement de démarrer — écran dédié (FDS §7, message U-12), **avant tout accès en lecture ou écriture** à `/data`. Cette vérification est la première opération effectuée à l'ouverture, avant même la vérification `<` ci-dessus.

### 3bis. Schéma de données — domaines ajoutés Phases 12 à 34 (ajouté v16)

**(vérifié le 28/08/2026 par inspection directe du cache IndexedDB de l'application déployée, pas seulement par lecture du code)** Le schéma physique n'est plus limité aux domaines listés en §3 (v11, ~5 tables) : le cache local Dexie compte aujourd'hui 74 tables. Domaines ajoutés depuis, par phase (voir FS pour le détail fonctionnel de chacun, `docs/convergence/PHASE_*.md` pour le détail de conception) :

| Domaine | Tables (noms Dexie réels) | Phase(s) |
|---|---|---|
| Assessment générique | `evaluationsACFC`, `evaluationsImpactAssessment`, `evaluationsCSVAssessment`, `methodProfilesACFC`, `methodProfilesImpactAssessment` | 1, 3 |
| Paramètres | `parameters`, `classificationsCriticiteParametre`, `cpps`, `cqas` | 2 |
| Quality Events | `qualityEvents`, `referencesQualityEvent`, `associationsMissionQualityEvent` | 5 |
| Structure Système — Architecture Technique | `relationsTechniques` | 18 |
| Test/Execution/Evidence | `requirements`, `couvertures`, `tests`, `testObjectives`, `testCandidates`, `executions`, `executionSteps`, `executionEvents`, `measurements`, `evidences`, `evidenceLocations`, `provenanceLinks` | 7a/7b/7c |
| Source/Document Intelligence | `sources`, `sourceVersions`, `sourceLocations`, `extractions`, `extractionItems`, `knowledgeItems`, `knowledgeRelations`, `confirmations`, `conflicts` | 8a, 31 |
| Deliverable Engine | `contentPlans` | 9 |
| Integration Gateway | `connectors`, `syncJobs`, `externalReferences` | 10 |
| Organisation | `organizations`, `workspaces` | 11 |
| Work | `missions`, `activities`, `dependencies` | 13 |
| Context | `contextSnapshots`, `contextSnapshotItems` | 14 |
| AI (Reasoning Engine) | `aiRequests`, `aiResponses`, `citationsAIResponse` | 15 |
| Procédures | `procedures`, `procedureSteps` | 20 |
| Risk Assessment | `methodProfilesRiskAssessment`, `risksAssessment` | 29 |
| Gabarits d'export client | `gabaritsExportClient` | 26 |
| Contexte procédé | `processes`, `fonctionsActif`, `associationsFonctionAssetNode`, `associationsFonctionProcess`, `manufacturingContexts` | 4 |
| Documents projet | `projectDocuments` | (préexistant, enfin consommé Phase 33) |
| Profil local (verrou d'archivage) | `profilLocal` | §4.31, 31/08/2026, TD-033 |

**Non couvert par cette liste** : les entités du domaine Manufacturing du package d'architecture cible (`Product`/`Material`/`Recipe`/`Format`/`Configuration`/`Batch`) n'ont aucune table correspondante — absence non documentée comme différée dans l'URS/FS, contrairement au reste des écarts de ce projet (à signaler explicitement plutôt qu'à faire apparaître comme couvert par accident de similarité de nom).

## 4. Moteur de calcul et logique métier (module isolé)

- Fonctions pures, sans état partagé, une fonction par calcul réglementaire (ex. `calculerIPR(s, o, d): number`, `evaluerGrilleQualification(reponses): Conclusion`).
- Chaque fonction porte sa propre version sémantique (`template_engine_version`, `qualification_test_set_version`), incrémentée à toute modification de logique — jamais de correction silencieuse.
- Suite de tests unitaires dédiée par fonction, exécutée en local et avant toute fusion de code (référence FDS §8bis) — cas limites systématiques : valeurs nulles, valeurs aux bornes, combinaisons non couvertes par une grille fermée.
- **Portail de qualité technique (ajouté v02 — revue SDS, E4, mitige AR-R-46, URS-REG-004)** : la maîtrise des changements n'est pas une pratique déclarée mais **appliquée automatiquement** — un pipeline d'intégration continue exécute la suite de tests unitaires de la Couche Logique métier à chaque proposition de modification, et **bloque techniquement** toute fusion vers la branche principale protégée tant qu'un test échoue. Aucune procédure de contournement manuel de ce blocage n'est prévue en Phase 1.

## 5. Connecteur GitHub — implémentation de la synchronisation et de la résolution de conflit (réécrite v11 — architecture web pure)

**Abandon du driver de fusion Git local et de la signature GPG/SSH** : ces deux mécanismes (versions v03-v10 de ce document) supposaient un accès Git natif — incompatible avec un poste où seul le navigateur est autorisé. Remplacés par les mécanismes ci-dessous, strictement équivalents en garantie (aucun écrasement silencieux, motif structuré par décision) mais implémentés au niveau API.

- Interface (`GitHubConnector`) : `lire(chemin): { contenu, sha }`, `ecrire(chemin, contenu, shaAttendu): Confirmation` — chaque écriture transmet le `sha` lu au moment de la dernière lecture (concurrence optimiste). Écritures sur la branche principale protégée (répond à URS-NF-030, AR-R-10).
- **Attribution (répond à URS-NF-030 amendé)** : chaque commit créé via l'API est attribué à l'utilisateur authentifié par son jeton — attribution fiable mais **pas une signature cryptographique GPG/SSH locale**, limite Phase 1 assumée et documentée (ne jamais présenter ces commits comme "signés" dans l'UI ou l'export).
- **Résolution de conflit (implémente FDS §3.6, mitige AR-R-34)** : `ecrire()` échoue (HTTP 409) si le `sha` distant a changé depuis la dernière lecture — c'est le **seul** déclencheur de conflit, aucune fusion automatique de contenu n'est jamais tentée côté API ni côté client. À la détection :
  1. Le connecteur recharge la version distante actuelle et la compare à la version locale en mémoire — jamais de fusion textuelle brute.
  2. Pour les champs scalaires (`values`, `meta`) : diff champ par champ.
  3. Pour les champs `tableau_dynamique` : diff au niveau ligne, par identifiant stable de ligne — union automatique des lignes non conflictuelles, isolement des lignes réellement en conflit.
  4. Transmet ce diff structuré à la Couche Présentation (écran de résolution, FDS §3.6) — le connecteur ne résout jamais lui-même un conflit sans décision utilisateur explicite.
  5. À la confirmation, réécrit avec le `sha` distant à jour et un motif structuré détaillant les décisions prises champ par champ/ligne par ligne (répond à l'amendement FDA sur la FDS, §3.6).
- Contrat d'erreur typé (même principe que §6/§6bis/§5bis) : `ConflitShaError` (409, déclenche §5 point 1 ci-dessus), `TimeoutError`, `AuthentificationError`, `PorteeInsuffisanteError` (jeton sans les permissions requises), `QuotaApiDepasseError` (voir ci-dessous) — jamais une exception générique.
- **Stratégie d'appels (ajoutée v12, mitige AR-R-63, détaillée dans `09-architecture-detaillee.md` §5)** : l'API GitHub limite à 5000 requêtes/heure par jeton — un appel par enregistrement épuiserait ce quota bien avant le volume de référence (500 projets/5000 sections, URS-NF-052). Le connecteur **ne lit/n'écrit jamais fichier par fichier en boucle** : chargement/resynchronisation via l'API Git Trees (`recursive=1`, un seul appel pour l'arborescence complète avec SHA de chaque fichier, comparaison au cache local pour ne récupérer que les blobs changés) ; écritures groupées via l'API Git Data (blob+arbre+commit en un nombre d'appels constant, indépendant du nombre de fichiers modifiés). Le quota restant (en-tête `X-RateLimit-Remaining`) est exposé à la Couche Présentation, avec avertissement avant épuisement — jamais un échec silencieux en cours de session.

## 5bis. Connecteur Drive — contrat d'interface (ajouté v08, répond à URS-NF-010/011/047, trouvé manquant lors de la revue de cohérence du 23/08/2026)

- Interface (`DriveConnector`) : `miroir(snapshotGit): Confirmation` — un seul point d'entrée, pas de logique métier propre. Le connecteur Drive **n'est jamais une source de vérité, jamais lu par l'application** (répond à URS-NF-010, §3 FS "toute divergence se résout en faveur de Git").
- Déclenchement : après chaque session de travail (heuristique : inactivité ou fermeture de l'application) et sur action manuelle "Sauvegarder maintenant" (URS-NF-011) — jamais en continu, pour rester cohérent avec le principe local-first (pas de dépendance réseau permanente).
- `miroir()` lit l'état courant depuis l'API GitHub et l'écrit dans le dossier Drive dédié du client via l'API Drive — une copie, pas une fusion : en cas d'écriture concurrente côté Drive (ex. modification manuelle accidentelle par l'utilisateur dans l'explorateur Drive), le prochain miroir **écrase** le contenu Drive sans tentative de fusion, cohérent avec "jamais lu comme source" (à afficher explicitement à l'utilisateur avant le premier miroir, pour éviter une surprise). **(clarifié v11)** Comme le connecteur GitHub, aucun accès disque natif — uniquement des appels API HTTPS.
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

- **(réécrite v11 — architecture web pure, mitige AR-R-61)** Secrets (clés API fournisseurs, jeton GitHub, jeton Drive) stockés exclusivement dans le stockage du navigateur (répond à URS-NF-044) — jamais dans un fichier suivi par Git, jamais transmis à un tiers autre que son API cible. **Risque assumé et documenté** (pas un coffre-fort système natif, surface XSS) — mitigé par la portée restreinte du jeton GitHub (URS-NF-044bis, dépôt dédié uniquement) et par le fait qu'aucun secret n'est jamais accessible en dehors du contexte d'origine du navigateur (isolation native par origine).
- **(ajouté v02 — revue SDS, E1)** Le stockage de secrets est **isolé par `client_id`** — la clé API du fournisseur configuré pour un client A n'est jamais accessible ni utilisée lors d'un appel concernant un client B, y compris techniquement (pas seulement par convention applicative). Élaboration technique de URS-NF-044 combiné à l'isolation stricte déjà exigée par URS-F-024.
- Scan de secrets automatique avant chaque commit sur le **dépôt de conception** (hook pre-commit, `scripts/hooks/pre-commit`), rejet du commit si un pattern de clé/jeton est détecté dans un fichier suivi — protège le code source, distinct des secrets d'exécution ci-dessus qui ne sont jamais commités nulle part.
- Quota configurable par fournisseur (URS-NF-048) implémenté au niveau du routeur IA — compteur d'appels/coût estimé, seuil configurable par `client_config`, blocage des nouveaux appels au-delà du seuil avec message explicite.
- **Fiabilité de l'horodatage — risque largement résolu par effet de bord (ajouté v03 — audit FDA simulé, MAJ-01 ; réévalué v11 — architecture web pure, AR-R-47)** : la remédiation "Phase 3, horodatage serveur" prévue à l'origine est en réalité disponible **dès la Phase 1** grâce au choix de l'API GitHub — un commit créé via l'API est horodaté par les serveurs GitHub, indépendamment de l'horloge du poste client, **à condition que le connecteur n'envoie jamais de date `author`/`committer` explicite dans la requête de création de commit** (l'API l'accepterait sinon, ce qui réintroduirait la faiblesse). Règle d'implémentation non négociable : `GitHubConnector.ecrire()` ne transmet jamais de champ de date — laisse systématiquement GitHub assigner l'horodatage serveur. Limite résiduelle assumée : ceci authentifie le moment de réception par GitHub, pas une preuve cryptographique au sens Part 11 complet (toujours hors périmètre Phase 1).
- **Verrou local d'archivage — dérogation étroite et documentée (ajouté v17 — 31/08/2026, §4.31/URS-F-310, TD-033)** : `logique-metier/securite/verrouLocal.ts` implémente un mot de passe local (PBKDF2-SHA-256, 100 000 itérations, sel aléatoire par profil, Web Crypto API) requis pour archiver un `Client`/`Project`. **Ce n'est pas un mécanisme d'authentification** : il est vérifié uniquement côté client, aucun secret serveur n'intervient, et le hachage stocké dans `profilLocal` (IndexedDB) reste lisible par quiconque a déjà accès au navigateur via les DevTools — même modèle de risque que les jetons d'API déjà documentés ci-dessus, jamais présenté comme une protection supérieure. Explicitement hors du champ interdit par TD-011 (aucun rôle, aucune session, un seul enregistrement local par installation, jamais qualifié de signature électronique dans l'UI ou l'export).

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
- Unicité du code (URS-F-100nonies) : **(clarifié v05 — revue SDS-v04, E5 ; renforcé v06 — audit Swissmedic simulé, MAJ-01)** le stockage étant fichier-par-enregistrement (§3), l'unicité n'est pas une contrainte de base de données mais un fichier d'index dédié `/data/asset_nodes_index/{client_id}.json`. L'écriture du fichier nœud et la mise à jour de l'index sont incluses dans le **même commit atomique** — jamais deux écritures séparées pouvant diverger en cas d'interruption. **(clarifié v11 — architecture web pure)** Réalisé via l'API Git Data de GitHub (arbre multi-fichiers assemblé puis un seul appel de création de commit) — pas deux appels séparés à l'API Contents, qui casserait l'atomicité. Au démarrage, une vérification de cohérence légère (index ↔ fichiers réels) signale toute divergence sans bloquer l'application.
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

**(précisé v11 — architecture web pure)** Livré comme **PWA (Progressive Web App)**, jamais comme application de bureau empaquetée (Electron/Tauri écartés) — une application de bureau nécessite une installation, bloquée par l'IT sur le poste de travail professionnel de l'utilisateur ; seul le navigateur est garanti disponible sans droits d'administration. Corollaire : aucun accès disque natif, aucun binaire `git` — tous les connecteurs (§5, §5bis, §6bis) sont exclusivement des appels API HTTPS.

**Bibliothèques complémentaires retenues (ajouté v12, détail dans `09-architecture-detaillee.md` §3)** : Pinia (état), Vue Router (navigation), Dexie.js (cache IndexedDB typé), vite-plugin-pwa (service worker/manifeste).

## 10bis. Hébergement — résolu (ajouté v12, vérifié le 24/08/2026)

**GitHub Pages** (`*.github.io`), confirmé par un test réseau réel effectué par l'utilisateur depuis le poste de travail professionnel concerné (mitige AR-R-62, clos) — cohérent avec le reste de l'écosystème déjà autorisé (`api.github.com`). Déploiement automatisé depuis la branche principale, uniquement après succès du portail de qualité (§4) — jamais un déploiement direct non vérifié. Aucun secret dans le bundle buildé (le jeton est saisi à l'exécution par l'utilisateur, jamais injecté au build), répond à URS-NF-044/044bis.

**Déploiement effectivement construit (26/08/2026)** : jobs `deploy-pages-build`/`deploy-pages-deploy` **dans `.github/workflows/quality-gate.yml`** (pas un fichier séparé), dépendants (`needs:`) du job `quality-gate` — ne s'exécutent jamais sur une pull_request, uniquement sur `push` vers `main` et seulement après son succès. **Correction du 26/08/2026** : la première version utilisait un déclenchement `workflow_run` inter-fichiers (un `deploy-pages.yml` séparé écoutant la fin de `quality-gate.yml`) — mécanisme qui s'est révélé peu fiable en conditions réelles (un second push n'a jamais redéclenché le workflow séparé, sans erreur explicite) ; remplacé par des jobs `needs:` au sein du même fichier, garantis par GitHub Actions. `vite.config.ts` fixe `base` via la variable d'environnement `BASE_PATH` (`/validapharm/` uniquement dans ce job, racine `/` inchangée en local et en test). Vue Router étant en mode `history`, GitHub Pages ne réécrivant aucune route côté serveur : redirection SPA standard (`public/404.html` + décodage dans `index.html`, pattern rafgraph/spa-github-pages) ajoutée pour que l'accès direct ou le rafraîchissement d'une route profonde (ex. `/clients/:clientId/...`) fonctionne. Aucune variable d'environnement requise au build (confirmé : le jeton GitHub/la config IA/Drive sont saisis à l'exécution, jamais au build). **Limite constatée (26/08/2026)** : `administration` n'est pas un scope de permission valide pour `GITHUB_TOKEN` — le demander (`enablement: true` sur `configure-pages`, censé activer Pages automatiquement au premier déploiement) invalide silencieusement tout le fichier de workflow (aucun job ne se lance, conclusion `failure`). Pages doit donc être activé une fois manuellement par l'utilisateur (Settings → Pages → Source : "GitHub Actions") avant le premier déploiement automatisé — même catégorie de geste que tout autre réglage administratif du dépôt (ex. l'encart "About"), non automatisable depuis l'outil. **Bug corrigé (26/08/2026, constaté par l'utilisateur : page blanche après premier déploiement réussi)** : `createWebHistory()` était appelé sans argument dans `src/presentation/router/index.ts` — Vue Router ne lit jamais automatiquement le `base` de Vite, il faut le lui passer explicitement (`createWebHistory(import.meta.env.BASE_URL)`). Sans ça, le routeur cherchait les routes à la racine du domaine plutôt que sous `/validapharm/` : aucune route ne correspondait, `RouterView` ne rendait rien, sans la moindre erreur console (silencieux par construction de Vue Router — pas de route matchée n'est pas une erreur). Diagnostiqué via les DevTools navigateur (IndexedDB opérationnelle, `<div id="app">` monté mais vide, aucun chunk de route jamais requêté).

## 10ter. Hors périmètre de cette SDS

- HDS (pas de matériel dédié) et Data Migration Plan (dépôt vierge, décision du 22/08/2026).

## 10quater. Relais IA de production et plafond de dépense — résolu (ajouté v13, `REV-URS-VALIDAPHARM-2026-010`, 24/08/2026)

Complète le routeur IA (§6) et la sécurité technique (§7) : conception détaillée en `09-architecture-detaillee.md` §10.

- **Relais** : Cloudflare Workers, endpoint HTTPS unique, sans état (aucune persistance du contenu — répond à URS-NF-044ter), clé API en secret du Worker. Le `ProviderAdapter` (§6) appelle ce relais plutôt que le fournisseur IA directement — le fournisseur n'est donc jamais dans la liste des origines CSP du navigateur (corrige `09-architecture-detaillee.md` §8 v01).
- **Modèle par mode d'usage (répond à URS-F-038bis)** : le relais accepte un paramètre `mode` (`chat_normatif` | `audit_simule`) et route vers un modèle configuré indépendamment pour chacun côté `client_config` — un chat normatif à forte volumétrie n'a pas le même profil coût/qualité qu'un mode audit simulé à faible volumétrie mais où la qualité du débat contradictoire multi-angles est la valeur du produit. Chaque combinaison (mode × modèle) suit la qualification de fiabilité déjà exigée (URS-F-032quater), consignée séparément par mode.
- **Plafond de dépense (répond à AR-R-65, complète le quota applicatif déjà spécifié §7)** : deux niveaux de garde-fou, pas un seul — (1) quota applicatif déjà décrit §7 (URS-NF-048, seuil configurable par `client_config`, blocage des nouveaux appels) ; (2) plafond de dépense configuré **côté tableau de bord du fournisseur IA lui-même** (ex. limite mensuelle + alerte de consommation), indépendant de l'application — un défaut de conception ou un contournement du garde-fou applicatif ne peut alors pas produire une facture illimitée. Le second niveau DOIT être configuré avant toute mise en production, pas seulement documenté.
- **Test de joignabilité réseau (AR-R-64)** : porte exclusivement sur le domaine du relais (`*.workers.dev`), pas sur celui du fournisseur — **vérifié et clos le 24/08/2026** par l'utilisateur depuis son poste professionnel (Workers déjà actifs sur ce compte, chargement de leur URL confirmé réussi).

## 6ter. Reasoning Engine — protocole d'appel d'outils et vérification de citation (ajouté v16 — Phases 13 à 17/27, `docs/convergence/PHASE_15_REASONING_ENGINE_SPEC.md`, `PHASE_27_CONTEXT_ENGINE_ENRICHI_SPEC.md`)

**Découverte de conception structurante (Phase 15)** : le relais IA de production (§10quater) n'a pas de code serveur dans ce dépôt (seul `workers/ocr-relay/` y figure) — aucun function-calling natif fournisseur n'est donc possible. Le protocole d'appel d'outils est **entièrement textuel et orchestré côté navigateur** (TD-007), le relais restant un simple proxy sans état.

- `executerBoucleRaisonnement()` (`src/logique-metier/raisonnement/boucleRaisonnement.ts`) : boucle plafonnée (`maxIterations`, défaut 6 — jamais une boucle sans limite, arrêt explicite avec `arretPourLimite: true` si le plafond est atteint sans réponse finale). À chaque tour : `construirePrompt()` reconstruit l'intégralité du contexte (catalogue d'outils + transcript + narratif de `ContextSnapshot` s'il existe, Phase 27) — la conversation n'est jamais portée par une session côté serveur, cohérent avec le relais sans état.
- Catalogue d'outils (`CATALOGUE_OUTILS_RAISONNEMENT`) : 7 outils de lecture seule à ce jour (`lister_requirements_pour_actif`, `lister_tests_pour_requirement`, `lister_evidence_pour_test`, `lister_knowledge_items_valides`, `tracer_chaine_technique` — Phase 18, `lister_etapes_procedure` — Phase 20, `tracer_relations_connaissance` — Phase 31), tous des fonctions pures opérant sur des données déjà chargées par l'appelant (`useReasoningEngineStore`), jamais un accès direct à la base. Un nom d'outil inconnu ou des paramètres manquants ne lèvent jamais d'exception — résultat explicite que le modèle peut lire et corriger au tour suivant (dégradation gracieuse).
- **Vérification de citation déterministe, non négociable (répond au principe fondateur n°1)** : `verifierConfiance()` — une réponse taguée `connu` sans citation, ou dont une citation ne correspond à aucun id réellement obtenu par un appel d'outil (ou par le narratif de contexte, Phase 27) pendant cette session de raisonnement, est automatiquement rétrogradée à `a_verifier`. L'IA seule ne décide jamais qu'elle "sait".
- `EtatConfianceIA` : `connu | inféré | inconnu | conflit | a_verifier` — jamais un score numérique de confiance (TD-008), cohérent avec l'interdiction déjà actée de promotion automatique `Parameter`→`CPP` par score (§8bis FDS/analogie).
- **Architecture volontairement plate, pas multi-agents** : un seul type d'orchestration existe à ce jour — une boucle unique appelant des outils de lecture. Il n'existe ni agents spécialisés par domaine (Context/Quality/Risk/Test...), ni composant Reviewer/Critic distinct de la vérification de citation ci-dessus, ni mécanisme de résolution de divergence entre plusieurs points de vue — à documenter explicitement comme un écart vis-à-vis de toute future spécification d'architecture agentique multi-agents, pas à présumer couvert par ce composant.
- Narratif de `ContextSnapshot` (Phase 27, `construirePrompt` étendu) : sérialisé et injecté dans le prompt, ses identifiants ajoutés à `idsConnus` dès le premier tour avec la même garantie qu'un appel d'outil (données déjà résolues à l'assemblage du snapshot) — jamais une confiance accrue sur la seule affirmation du modèle.
- Persistance : `AIRequest`/`AIResponse` (+ `CitationAIResponse`) écrits pour chaque invocation du Reasoning Engine (traçabilité input/output complète) — **différent du chat expert standard** (§6, §10quater), qui ne journalise que les métadonnées de session (`AiChatSessionLog`, horodatage/fournisseur/moteur, jamais le contenu) par choix de conception vie privée (URS-F-037). Cette asymétrie est volontaire, pas un oubli : le Reasoning Engine appelle des outils sur des données du client, le chat expert échange du texte libre.

## 6quater. Context Engine — `ContextSnapshot` généralisé (ajouté v16 — Phase 14/27, `docs/convergence/PHASE_14_CONTEXT_ENGINE_SPEC.md`)

- Généralise `resoudreRegleEffective`/`ancetresWorkspace`/`noeudsVisiblesDepuisWorkspace` (§6quinquies ci-après), jusqu'ici câblés sur le seul store Structure Système, en un assemblage de `ContextSnapshot`/`ContextSnapshotItem` réutilisable par tout consommateur (Mission workspace, Reasoning Engine).
- `assemblerElementsContextSnapshot()` résout les éléments pertinents pour une Mission donnée (AssetNode/ManufacturingContext/Procedure/QualityEvent) — jamais un chargement intégral de la base client (répond au principe "ne pas simplement charger toute la base", cohérent avec §8ter perf).
- `construireNarratifContexte()` (Phase 27) réorganise ces éléments déjà résolus en 4 facettes narratives OÙ/QUOI/COMMENT/POURQUOI-IMPACT (`AssetNode`/`ManufacturingContext`/`Procedure`/`QualityEvent`) — aucune nouvelle résolution, une réorganisation pure. Fondé sur le modèle Context=FACTS/Method=HOW/Rules-Risk-Requirements-History=WHY du package d'architecture cible (§1 §5.23 de `CONTEXTE-REPRISE-SESSION.md`).
- **Limite assumée** : résolution de "méthode applicable"/"documents pertinents" pour un `ContextSnapshot` non construite ; la facette COMMENT reste vide en pratique tant qu'aucune `Procedure` n'est rattachée à un `AssetNode` (aucun rattachement construit à ce jour).

## 6quinquies. Organisation multi-tenant — `Organization`/`Workspace` (ajouté v16 — Phase 11, `docs/convergence/PHASE_11_ORGANIZATION_MIGRATION_SPEC.md`, TD-006)

- **Décision structurante** : `Organization.id` reprend exactement l'`id` du `Client` migré — aucune des ~25 tables indexées par `client_id` n'a été réécrite ou renommée ; `client_id` continue de référencer la même valeur, désormais celle d'une `Organization`. `Client` devient un cas particulier d'`Organization` à un seul `Workspace`. Migration explicite (`migrerClient`/`migrerTousLesClients`), jamais automatique.
- `Workspace` : arbre auto-référencé (`parent_workspace_id`), un seul discriminant `type: 'global' | 'site'` — pas de types rigides Global/Site/Facility/Area, cohérent avec `AssetHierarchySchema` (profondeur de hiérarchie jamais figée d'avance).
- `resoudreRegleEffective()` (`src/logique-metier/organisation/resolutionEffective.ts`) implémente "Scope + Applicability + Effectivity + Inheritance/Override" : remonte l'arbre `Workspace` depuis un point donné, retourne la première règle trouvée avec son `workspaceIdOrigine` (traçabilité de provenance systématique) ou `null` — garde anti-cycle incluse.
- **Câblage effectif, état réel (Phase "câblage étape 1", 26/08/2026)** : sur les ~42 stores métier indexés par `client_id`, **un seul** (`AssetNode`/Structure Système) consomme réellement `workspace_id` à ce jour — additif et rétrocompatible (`workspace_id: string | null`, `null` = nœud legacy visible partout). Les ~41 autres stores continuent de filtrer uniquement par `client_id` brut. Ce chantier reste explicitement en pause depuis le 26/08/2026 (priorité donnée à la clarification de vision Mission/Context/Reasoning Engine), pas terminé.

## 6sexies. Knowledge Graph générique (ajouté v16 — Phase 31, `docs/convergence/PHASE_31_KNOWLEDGE_GRAPH_SPEC.md`)

`parcourirGraphe()` — parcours en largeur générique paramétré par accesseurs `idSource`/`idCible`, jamais figé sur un nom de champ littéral. Deux consommateurs réels démontrés avant généralisation (règle de trois) : `chaineTechniqueDepuis` (`RelationTechnique`, Phase 18, refactor comportement-identique) et `relationsConnaissanceDepuis` (`KnowledgeRelation`, Phase 8a/31, second cas réel). Consommé uniquement par le Reasoning Engine (outils `tracer_chaine_technique`/`tracer_relations_connaissance`) — aucun écran de visualisation de graphe.

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
| FS §2/§9/§10 (architecture web pure, API GitHub) | §2, §5, §5bis, §7, §10 |
| `09-architecture-detaillee.md` (bibliothèques, quota API, hébergement, relais IA) | §5, §10, §10bis, §10quater |
| FDS §3.10 (Mission workspace) | §6ter, §6quater |
| FDS §3.11 (repli structuration procédurale) | §6ter (protocole/vérification d'ancrage réutilise le même patron) |
| FDS §3.12 (correctif tableau_dynamique) | §3bis (persistance), §4 (portail de qualité — test de régression ajouté) |
| URS-F-190 à 230 (Work/Context/AI/Coquille UX/Mission workspace) | §3bis, §6ter, §6quater |
| URS-F-180 (Organization/Workspace) | §3bis, §6quinquies |
| URS-F-150undecies (Knowledge Graph) | §3bis, §6sexies |
| URS-F-240 (Architecture Technique) | §3bis (table `relationsTechniques`), §6sexies — **aucun écran, gap ouvert (voir FDS §2/§12)** |

## 12. Écarts documentaires connus (ajouté v16 — audit du 28/08/2026)

Cette SDS (comme la FDS) a été rattrapée le 28/08/2026 après un écart de traçabilité constaté : les Phases 12 à 34 de convergence architecturale (Mission/Activity, Context Engine, Reasoning Engine, Organization/Workspace, Architecture Technique, cerveau procédural, Risk Assessment autonome, Knowledge Graph, gabarits d'export client...) avaient été committées, testées et intégrées à l'URS/FS sans jamais être redescendues dans ce document ni dans la FDS — un écart de traçabilité GAMP5 non déclaré d'environ 20 phases, trouvé par audit croisé des 4 documents entre eux (aucun des deux ne se déclarait explicitement "en retard"). Le présent rattrapage (§3bis, §6ter à §6sexies) comble le contenu technique manquant mais **ne reproduit pas le niveau de détail complet de chaque spec de phase individuelle** (`docs/convergence/PHASE_13_*` à `PHASE_31_*`) — celles-ci restent la référence pour le détail exhaustif de chaque mécanisme, cohérent avec la façon dont l'URS/FS les citent déjà.

**Écarts qui restent ouverts après ce rattrapage** (à ne pas confondre avec "couverts") :
- URS-F-240 (relations techniques `AssetNode`) : exigence Must sans aucun écran, non refermé depuis la Phase 18 (27/08/2026).
- Le relais IA de production (chat expert, Reasoning Engine) n'a pas son code dans ce dépôt — seul `workers/ocr-relay/` y figure (§10quater ne décrit que le relais IA générique, pas cette absence de code source versionné).
- Le câblage `Workspace` (§6quinquies) reste à un seul store sur ~42, en pause.
- Les entités `Product`/`Material`/`Recipe`/`Configuration`/`Batch` du domaine Manufacturing de l'architecture cible n'ont aucune contrepartie construite (§3bis).
- Aucune architecture multi-agents (Agent Central + agents spécialisés + Reviewer/Critic actif) n'existe — le Reasoning Engine (§6ter) est une boucle unique d'appel d'outils en lecture seule.

---
*Document vivant, version 16 (28/08/2026) : rattrapage documentaire Phases 12-34 de convergence architecturale — §3bis (schéma de données), §6ter (Reasoning Engine), §6quater (Context Engine), §6quinquies (Organization/Workspace), §6sexies (Knowledge Graph), §12 (écarts connus, dont ceux qui restent ouverts). Trouvé et comblé suite à un audit croisé URS/FS/FDS/SDS du 28/08/2026 ayant constaté que ce document était figé vers la Phase 11-12 malgré une URS/FS à jour jusqu'à la Phase 34. Historique v02-v10 : voir corps du document. v11 (23/08/2026) : architecture web pure sans installation. v12 (23-24/08/2026) : architecture détaillée — stratégie Git Trees API pour éviter l'épuisement du quota GitHub (5000 req/h) ; hébergement GitHub Pages confirmé après vérification réseau réelle (AR-R-62 clos) ; bibliothèques complémentaires actées (Pinia, Vue Router, Dexie.js, vite-plugin-pwa). v13 (24/08/2026) : relais IA de production — conception du relais (Cloudflare Workers, sans état, §10quater), routage de modèle par mode d'usage, plafond de dépense à deux niveaux. v14 (24/08/2026) : test de joignabilité réseau du relais vérifié et clos (AR-R-64). v15 (26/08/2026) : déploiement GitHub Pages effectivement construit (§10bis passe de décision documentée à mécanisme réel).*
