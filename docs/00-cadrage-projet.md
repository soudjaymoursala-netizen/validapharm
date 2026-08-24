# ValidaPharm — Cadrage du projet (v2)

Statut : **cadrage validé avec l'utilisateur** — base pour la conception détaillée et, plus tard, le dossier de validation de l'outil (GAMP 5).
Ce document est désormais hébergé et poussé sur le dépôt GitHub privé dédié `soudjaymoursala-netizen/validapharm` (accès accordé et premier push le 23/08/2026) : il n'est plus local uniquement, tout push reste néanmoins soumis à autorisation explicite au cas par cas.

**Note de cohérence (23/08/2026)** : les décisions structurantes de ce document restent valides, à une exception structurante près (voir architecture ci-dessous). Pour le détail exhaustif et à jour des exigences, se référer à `01-URS-outil.md` (v23 au 23/08/2026) qui fait foi en cas de divergence de détail avec ce document de cadrage. **La cascade de conception est désormais complète et intégralement à jour** : FS (v11), FDS (v14), SDS (v11) couvrent l'intégralité de l'URS v23, y compris les cinq besoins ajoutés après la clôture initiale de la cascade, la charte graphique/identité visuelle, les trois gaps mineurs de la checklist §6ter, et **l'architecture web pure sans installation** (voir ci-dessous). L'exclusion "Intégration ERP/QMS tiers" du §8 URS a été levée le 22/08/2026 sur décision explicite de l'utilisateur.

**Architecture — décision structurante du 23/08/2026** : l'application est livrée exclusivement comme **PWA (navigateur, aucune installation)**, jamais comme application de bureau (Electron/Tauri écartés) — contrainte réelle du poste de travail professionnel de l'utilisateur (IT bloque les logiciels non autorisés ; navigateur et `github.com` le sont). Conséquence directe : plus aucun accès disque natif ni binaire `git` — tout passe par l'API GitHub/Drive (HTTPS). Ceci a nécessité une réécriture substantielle de la SDS §2/§5/§7 (driver de fusion Git local et signature GPG/SSH abandonnés, remplacés par une détection de conflit par SHA côté API et une attribution par jeton) et a révélé/résolu deux points au passage : (1) une incohérence latente jamais détectée — le diagramme SDS §2 disait déjà "API GitHub" depuis l'origine, mais SDS §5 décrivait des mécanismes Git natifs incompatibles ; (2) un bénéfice inattendu — l'horodatage de la piste d'audit (R-47, accepté comme limite Phase 1 depuis l'audit FDA simulé) est désormais assigné côté serveur GitHub, résolvant un risque qui devait initialement attendre la Phase 3. En contrepartie, deux nouveaux risques assumés et documentés : stockage du jeton d'accès dans le navigateur (R-61, mitigé par une portée restreinte) et dépendance non vérifiée à `api.github.com` depuis le poste de l'utilisateur (R-62 — **à confirmer par l'utilisateur avant de s'engager plus loin sur cette architecture**).

**Dépôt dédié créé le 22/08/2026, poussé sur GitHub le 23/08/2026** (`soudjaymoursala-netizen/validapharm`, `/home/user/validapharm` en local) : documentation de conception (`docs/`, réorganisée en documents vivants + `docs/archive/`) + environnement de conception (toolchain TypeScript/Vue validé de bout en bout, hook de scan de secrets, portail qualité CI) + prototype initial rapatrié (`prototype-initial/`). Ce dépôt fait foi comme source de vérité pour la conception ; `app-comores-transport` ne contient plus aucun contenu ValidaPharm. **La conception (code) démarre le 23/08/2026.** Les documents de qualification de l'outil lui-même (VMP + protocoles IQ/OQ/PQ) seront réécrits contre cette conception à jour **après** la conception (registre de risques : 62 entrées). **Plus aucun gap connu dans la checklist §6ter, hormis la vérification C-05 (`api.github.com`) restant à la charge de l'utilisateur.**

---

## 1. Vision

ValidaPharm est un outil d'aide à la rédaction de livrables qualité **CQV / CSV / QA** pour la pharma et les dispositifs médicaux. *(Note de cohérence : la liste des livrables couverts a été considérablement étendue depuis la rédaction initiale de ce document — voir le catalogue complet des outils/mini-outils à jour dans `01-URS-outil.md` §10, qui fait foi.)*

**But :** gagner du temps de rédaction, suggérer des idées de tests, produire des livrables structurés conformes aux normes — avec un niveau de fiabilité compatible avec un usage professionnel réel, jusqu'à l'objectif final : **un outil lui-même validable selon une approche GAMP 5**, utilisable soit pour approuver directement des documents, soit comme simple aide à la rédaction (au choix de l'utilisateur, par document).

## 2. Principes non négociables

1. **L'IA générative n'est jamais seule source de vérité.** Elle assiste, propose, suggère — elle ne décide jamais d'une conformité, d'un calcul (IPR, MACO...) ou d'une approbation. Tout calcul réglementaire reste déterministe (code), jamais délégué à un LLM.
2. **Traçabilité totale.** Toute donnée créée/modifiée est horodatée, attribuée à un auteur, versionnée. Rien n'est écrasé silencieusement (principe ALCOA+ appliqué à l'outil lui-même).
3. **Zéro perte de données au changement de machine.** Git dédié = source de vérité ; miroir Google Drive = filet de secours.
4. **Séparation stricte contenu métier / IA cloud.** Le contenu des livrables (documents en cours de rédaction, données produit/procédé) ne part jamais vers une API cloud sans action explicite de l'utilisateur. Le chat expert cloud répond aux questions normatives générales, pas au contenu confidentiel.
5. **Dégradation gracieuse.** Si l'environnement ne permet pas l'accès à l'API cloud (réseau restreint, site client...), l'outil continue de fonctionner : rédaction guidée + chat expert basculent sur un modèle local.
6. **Élicitation rigoureuse en amont, extensibilité par conception.** L'objectif de la cascade documentaire (URS → FS → DS/FDS/SDS) est de minimiser au maximum les ajouts de besoins après le début de la conception — chaque round de revue multi-experts vise à faire émerger et traiter les besoins le plus tôt possible. Cela n'empêche pas que l'outil doive être **architecturé pour l'extensibilité** (ex. gabarits/mini-outils versionnés indépendamment du code — URS-REG-003, catalogue §10 de l'URS) : la rigueur en amont réduit le *nombre* de changements après conception, l'extensibilité réduit le *coût* de ceux qui restent malgré tout nécessaires. La FS devra documenter explicitement le(s) mécanisme(s) d'extension retenu(s).

## 3. Décisions de cadrage (validées)

| Sujet | Décision |
|---|---|
| Moteur de rédaction | Pas de génération IA "libre" : rédaction guidée par templates + connaissances du domaine, avec prise en compte intelligente du contexte (ex. type d'équipement, catégorie GAMP, produit) pour adapter le contenu proposé. |
| Chat expert | Un chat séparé, expert du domaine (normes pharma/DM), branché par défaut sur l'API Claude, **et configurable vers d'autres fournisseurs cloud (OpenAI/ChatGPT, GitHub Copilot, DeepSeek, autres) selon les contraintes de chaque client** *(généralisé en v05 de l'URS — voir URS-F-032 et suivants)* ; bascule automatique vers un modèle local (Ollama) si l'environnement ne permet pas le cloud. |
| Déploiement | Mono-utilisateur d'abord, **architecture pensée dès le départ pour évoluer vers le multi-utilisateur** (comptes, rôles, partage de documents entre utilisateurs). Pas de perte de données au changement de PC. |
| Stockage | Dépôt Git privé **dédié** (nouveau repo, séparé de l'app transport) comme source de vérité, avec **miroir/sauvegarde automatique vers Google Drive**. **(précisé v3, 23/08/2026)** Accès exclusivement via **API GitHub** (HTTPS) depuis l'application web — jamais de `git` local ni d'application installée, contrainte du poste de travail de l'utilisateur (IT bloque les logiciels non autorisés ; navigateur et github.com le sont). Cache local dans le navigateur (IndexedDB) pour la performance et le fonctionnement hors ligne. |
| Ambition réglementaire | Cible finale = outil validable GAMP 5. Chaque document produit peut être marqué "brouillon d'aide à la rédaction" ou "approuvé dans l'outil", au choix de l'utilisateur. On documente et structure dès maintenant en vue de la validation future de l'outil (voir §6). |

## 4. Architecture cible (par phases)

### Phase 1 — Fondations solides, mono-utilisateur, locale-first
- Application **web pure (PWA), aucune installation** (navigateur, sans dépendance serveur obligatoire pour la logique applicative) mais avec **modèle de données déjà multi-utilisateur** (chaque enregistrement a un `owner_id`, des métadonnées de partage, un journal d'événements) même si l'UI n'expose qu'un seul utilisateur. **(précisé v3, 23/08/2026, décision explicite de l'utilisateur)** : choix dicté par une contrainte réelle — poste de travail professionnel dont l'IT bloque l'installation de logiciels/services non autorisés (une application de bureau type Electron/Tauri aurait été bloquée ; le navigateur et github.com sont, eux, déjà autorisés).
- Stockage : fichiers structurés (JSON/YAML, un fichier = un document ou un enregistrement) dans le repo Git dédié, **écrit exclusivement via l'API GitHub** (jamais un binaire `git` local — inaccessible sur un poste verrouillé). Chaque modification = commit (auteur, date, message) via l'API → **l'historique Git devient la première brique de la piste d'audit**, avec une nuance assumée : l'attribution se fait par jeton d'API authentifié, pas par signature cryptographique GPG/SSH locale (voir SDS §5, URS-NF-030 amendé).
- Synchronisation : appel API Drive (miroir, pas source de vérité) après chaque session ou action manuelle — même contrainte "aucune installation", cohérent avec le connecteur Git. **(précisé v4, 24/08/2026, décision explicite de l'utilisateur — s'applique aussi à la conduite du projet elle-même, pas seulement à l'application déployée)** : GitHub reste la référence exclusive pour toute action de conception (lecture, écriture, décision) ; Google Drive est un miroir de confort pour l'utilisateur, jamais consulté ni utilisé comme source. La synchronisation vers Drive n'est **pas automatisée** — testé et confirmé le 24/08/2026 : ni l'automatisation programmable (routine liée à une session) ni les connecteurs de l'interface claude.ai ne permettent de combiner accès GitHub + Google Drive dans une même tâche planifiée sur ce compte (GitHub s'attache par dépôt à une session, pas comme connecteur générique). La synchronisation Drive se fait donc **à la demande explicite de l'utilisateur** uniquement, jamais en tâche de fond silencieuse.
- Le moteur de templates de la v1 (actuel, dans ce repo) sert de **référence conceptuelle** pour les formulaires/documents (structure de gabarits, types de champs) — pas de reprise de code ni de données. **Décision confirmée (22/08/2026)** : la Phase 1 démarre sur un **dépôt Git dédié vierge**, sans migration de données depuis la v1 (dont le modèle pivot n'a de toute façon aucun équivalent pour `project_id`, workflows, langue, etc. — voir FS §3). Aucun Data Migration/Conversion Plan n'est donc nécessaire comme document de conception.

### Phase 2 — Intelligence contextuelle + chat expert
- Ajout d'un module de suggestions contextuelles (idées de tests IQ/OQ/PQ selon le type d'équipement, alertes "il manque probablement telle section selon telle norme") — reste des **suggestions affichées séparément**, jamais insérées automatiquement dans le document sans validation utilisateur.
- Chat expert dans un panneau séparé, avec bascule cloud/local, et **jamais d'accès direct au contenu du document en cours** sauf si l'utilisateur choisit explicitement "poser une question sur ce document".

### Phase 3 — Multi-utilisateur réel + Part 11 / validation de l'outil
- Bascule vers une application serveur (backend + base de données) quand le besoin multi-utilisateur devient concret : comptes, mots de passe (hashés, jamais en clair), rôles (Rédacteur / Vérificateur / Approbateur / Admin / Lecteur), partage sélectif de documents entre utilisateurs.
- Signature électronique conforme 21 CFR Part 11 / Annexe 11 pour les documents "approuvés dans l'outil".
- Piste d'audit inaltérable en base (au-delà de l'historique Git) : qui a vu/modifié/approuvé quoi, quand.
- Dossier de validation de l'outil lui-même (voir §6).

## 5. Sécurité, confidentialité, propriété intellectuelle

- Dépôt Git **privé** dédié, accès restreint.
- **(ajouté v3, 23/08/2026)** L'accès au dépôt se fait via un jeton d'API GitHub (PAT à portée restreinte au dépôt dédié) — jamais de mot de passe. Le stockage de ce jeton **dans le navigateur** est un risque assumé et documenté (surface XSS), pas simplement ignoré — voir AR-R-61, mitigation en SDS §7.
- Aucune donnée métier (procédés, formules, résultats) envoyée à une API cloud sans action explicite et consciente de l'utilisateur ; le chat expert par défaut ne voit que la question posée, pas le document.
- Sauvegarde Drive chiffrée par les mécanismes natifs du compte Google de l'utilisateur (pas de duplication vers un tiers additionnel).
- Dès la Phase 3 : gestion des mots de passe avec hachage fort (bcrypt/argon2), sessions expirables, principe du moindre privilège par rôle.
- Journal d'accès (qui a ouvert quel document, quand) prévu dès la conception du modèle de données, activé en Phase 3.

## 6. Trajectoire vers un outil "validable GAMP 5"

Pour qu'un outil soit crédible comme validable GAMP 5, la meilleure preuve est de commencer **maintenant** à produire, avec la même rigueur qu'on exige des livrables qu'il génère :

1. **URS de l'outil lui-même** (ce que l'outil doit faire ; catégorie GAMP confirmée par revue multi-experts : **catégorie 5**, logiciel sur mesure — voir URS §en-tête et AR §5).
2. **Analyse de risque de l'outil** (ICH Q9 appliqué à l'outil : que se passe-t-il si un calcul d'IPR est faux ? si une donnée est perdue ? si le chat expert donne une info erronée ?).
3. **Plan de validation** (quelles qualifications IQ/OQ/PQ pour l'outil lui-même, quels tests automatisés, quels critères d'acceptation).
4. Développement piloté par ces exigences (traçabilité exigence → code → test).

C'est un excellent cas d'usage "dogfooding" : **on peut utiliser ValidaPharm lui-même pour rédiger son propre dossier de validation**, une fois le module URS/RA disponible.

## 6bis. Processus de revue et d'audit des livrables (décision de gouvernance, 21/08/2026)

Chaque livrable majeur du projet (URS, AR, FS, puis DS/FDS/SDS, VMP, protocoles IQ/OQ/PQ) suit désormais un processus à deux niveaux avant d'être considéré close :

1. **Élicitation et revue collégiale** — panel multi-experts élargi (E1 Fournisseur/IA-GAMP5-Part11, E2 Qualité/SMQ, E3 QA Réglementaire, E4 CSV, E5 Architecte logiciel, E6 Métrologie, E7 Maintenance). Rôle : faire émerger les besoins et challenger le document par consensus/débat contradictoire entre profils métier.
2. **Audit contradictoire par simulation d'inspecteur/expert externe** — désormais **quatre passes distinctes et complémentaires**, chacune avec son propre référentiel et sa propre sensibilité :
   - **Swissmedic** (Suisse) — PIC/S PI 041, Annexe 11 EU GMP, ICH Q9/Q10, GAMP 5, ISPE GAMP AI Guide. Sensibilité : maîtrise documentaire, rigueur CSV classique, gestion du risque qualité.
   - **FDA** (États-Unis) — 21 CFR Part 11 (électronique/signatures), 21 CFR Part 820 (dispositifs médicaux, si applicable), FDA Data Integrity Guidance (2018), FDA Computer Software Assurance / CSA (approche de test proportionnée au risque, moins documentaire que GAMP5 classique sur les fonctions à faible risque). Sensibilité : analyse des "predicate rules" applicables, philosophie de validation basée sur le risque distincte de l'approche européenne.
   - **Société spécialisée en conception de logiciels GxP** *(nouveau, 22/08/2026)* — pas un inspecteur réglementaire mais un cabinet de conseil technique (type intégrateur CSV/GAMP5). Sensibilité : qualité d'ingénierie logicielle au service de la validation — séparation des responsabilités (logique métier testable indépendamment de l'IHM), maîtrise des changements (contrôle des versions, portes de qualité avant mise en production), maintenabilité à long terme. Challenge la faisabilité et la pérennité de la conception, pas seulement sa conformité.
   - **QA spécialisés** *(nouveau, 22/08/2026)* — profils qualité pharma externes, distincts des sièges E2/E3 du panel collégial (qui débattent en amont) : ici en posture d'audit a posteriori sur le dossier déjà produit. Sensibilité : opérabilité réelle du système qualité autour de l'outil — gestion des anomalies/incidents en exploitation, formation/habilitation des utilisateurs, revue périodique.

Ces quatre audits ne sont pas redondants : ils appliquent des référentiels et des philosophies différents (deux réglementaires, un technique/ingénierie, un opérationnel/QA), donc trouvent des angles morts différents — cohérent avec l'expérience déjà observée sur la FS et la FDS (chaque tour de revue a trouvé des défauts que le précédent n'avait pas vus).

Chaque audit produit un rapport classé par sévérité (Majeur/Mineur/Observation) avec un verdict explicite (approuvable / non approuvable en l'état), et ses constats substantiels sont intégrés en amendements URS/AR/document concerné, comme pour toute revue.

## 6ter. Checklist de complétude par domaine (décision de gouvernance, 23/08/2026)

**Origine** : constat que le processus de revue/audit (§6bis) est rigoureux mais **réactif** — il challenge en profondeur ce qui est déjà écrit, mais ne garantit pas qu'un domaine entier n'a simplement jamais été abordé (ex. la charte graphique/UX, absente de toute la cascade jusqu'au 23/08/2026 malgré 20 versions d'URS). Sur demande explicite de l'utilisateur, généralisée à toute la conduite du projet : **à chaque jalon documentaire majeur (URS, FS, FDS, SDS, et toute révision substantielle), passer explicitement en revue les domaines standards ci-dessous et statuer couvert / partiellement couvert / non couvert / sans objet pour chacun — sans attendre que l'utilisateur les soulève.**

| Domaine | Sous-thèmes typiques | Statut au 23/08/2026 |
|---|---|---|
| Fonctionnel métier | gabarits, workflows, calculs réglementaires | Couvert (cœur de l'URS/FS/FDS/SDS) |
| UI/UX & charte graphique | couleurs, polices, composants, interactions, responsive | **Couvert (23/08/2026)** — URS-NF-054 à 054quinquies, FDS §2bis, SDS §7bis ; revue multi-experts + audit accessibilité dédiés |
| Sécurité & accès | authentification, sessions, chiffrement, journalisation | Partiel : secrets/chiffrement couverts (URS-NF-044, SDS §7) ; authentification/sessions explicitement hors Phase 1 (cadrage §5) |
| Performance & capacité | temps de réponse, volumétrie, dégradation | **Couvert (23/08/2026)** — cibles chiffrées : volume de référence 500 projets/5000 sections, <2s perçues (URS-NF-052/052bis, FDS §8, SDS §8ter : pagination/virtualisation, index en mémoire). Le choix technique exact reste ouvert au framework (SDS §10), mais la contrainte de conception est fixée. |
| Internationalisation | langues, formats date/nombre/devise, RTL | Couvert (URS-NF-040 et suivants, FDS §8) |
| Accessibilité | contraste, clavier, lecteurs d'écran | **Couvert (23/08/2026)** — contraste des statuts (URS-NF-054quater), clavier (URS-NF-050), lecteur d'écran (URS-NF-050bis, FDS §8 : noms accessibles, live regions, landmarks) |
| Conformité réglementaire | GAMP5, ALCOA+, Part 11, predicate rules | Couvert (cœur du projet) |
| Opérations & support | sauvegarde, restauration, montée de version, désinstallation | **Couvert (23/08/2026)** — sauvegarde/migration (SDS §3), miroir Drive contractualisé (SDS §5bis), désinstallation par suppression du dossier local (URS-NF-055), et surtout garde de compatibilité descendante empêchant la corruption de données au rollback (URS-NF-055bis, SDS §3, mitige AR-R-60 — trouvé en traitant ce point) |
| Données & interopérabilité | QMS tiers, export, formats | Couvert (URS §4.9, FS/FDS/SDS §6bis) |

Cette checklist elle-même est un document vivant : à mettre à jour à chaque jalon, pas seulement relue passivement.

## 7. Prochaines étapes proposées

1. Créer le nouveau dépôt Git privé dédié (nom à définir) + structure de dossiers (Phase 1).
2. Définir le modèle de données pivot (schéma JSON d'un document : métadonnées, propriétaire, statut brouillon/approuvé, historique).
3. Rédiger l'URS de l'outil (premier livrable réel, avec le futur module "URS" de l'outil lui-même) pour cadrer précisément le périmètre fonctionnel avant de coder la Phase 1.
4. Mettre en place la synchronisation Git → sauvegarde Drive.

---
*Document vivant — à mettre à jour à chaque décision de cadrage.*
