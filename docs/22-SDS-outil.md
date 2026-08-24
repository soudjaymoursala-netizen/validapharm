# SDS — Spécification de conception technique (logicielle) de l'outil ValidaPharm

| | |
|---|---|
| **Référence** | SDS-VALIDAPHARM-2026-001 |
| **Version** | 12 (architecture détaillée — stratégie Git Trees API/quota, hébergement GitHub Pages confirmé, `09-architecture-detaillee.md`) |
| **Statut** | En rédaction |
| **Catégorie GAMP 5** | Catégorie 5 (sur mesure) |
| **Documents de référence** | `01-URS-outil.md` v23, `02-analyse-de-risque-outil.md` v24, `03-specifications-fonctionnelles.md` v11, `16-FDS-outil.md` v14, `08-conventions-codage.md` v02, `09-architecture-detaillee.md` v01, `23-revue-multi-experts-SDS.md` v01, `24-audit-swissmedic-SDS.md` v01, `25-audit-fda-SDS.md` v01, `36-revue-multi-experts-SDS-v04.md` v01, `37-audit-swissmedic-SDS-v05.md` v01, `38-audit-fda-SDS-v05.md` v01 (closes) |
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

## 10ter. Hors périmètre de cette SDS

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
| FS §2/§9/§10 (architecture web pure, API GitHub) | §2, §5, §5bis, §7, §10 |
| `09-architecture-detaillee.md` (bibliothèques, quota API, hébergement) | §5, §10, §10bis |

---
*Document vivant, version 12 — historique v02-v10 : voir corps du document. v11 (23/08/2026) : architecture web pure sans installation. **v12 (23-24/08/2026) : architecture détaillée** — stratégie Git Trees API pour éviter l'épuisement du quota GitHub (5000 req/h), trouvée en rédigeant `09-architecture-detaillee.md` avant tout code écrit (nouveau risque AR-R-63, mitigé dès la conception) ; hébergement GitHub Pages confirmé après vérification réseau réelle par l'utilisateur depuis son poste de travail (AR-R-62 clos) ; bibliothèques complémentaires actées (Pinia, Vue Router, Dexie.js, vite-plugin-pwa). Cascade de conception URS→FS→FDS→SDS complète, architecture entièrement vérifiée (réseau) et détaillée (bibliothèques, quotas, hébergement) — prête pour l'écriture du code.*
