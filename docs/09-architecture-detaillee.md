# Architecture technique détaillée — ValidaPharm

| | |
|---|---|
| **Référence** | ARCH-VALIDAPHARM-2026-001 |
| **Version** | 03 (relais IA de production, test réseau vérifié, 24/08/2026) |
| **Statut** | En vigueur |
| **Documents de référence** | `22-SDS-outil.md` v12, `08-conventions-codage.md` v02, `00-cadrage-projet.md` |
| **Objet** | Consolider et compléter l'architecture technique de la spécification de conception technique (§2-§10) en un document de référence unique, et trancher les points laissés implicites — bibliothèques précises, stratégie hors-ligne, limites d'API — avant l'écriture du code |

---

## 1. Objet

La spécification de conception technique fixe les contrats d'interface et les principes (couches, connecteurs, sécurité). Ce document va un cran plus loin : il choisit les bibliothèques concrètes et détaille les mécanismes qu'elle laissait ouverts, en particulier ceux révélés par l'architecture web pure (23/08/2026). Rédigé de façon proactive avant le démarrage du code, pour éviter des décisions prises au fil de l'eau et non tracées.

## 2. Vue d'ensemble des couches et de leurs dépendances

```
presentation/  ──▶  logique-metier/  ──▶  (rien — fonctions pures, aucune dépendance sortante)
     │
     ▼
connecteurs/  ──▶  API GitHub / API Drive / API IA (HTTPS uniquement)
     │
     ▼
persistance/  ──▶  IndexedDB (navigateur)
```

`presentation/` orchestre: elle appelle `logique-metier/` pour les calculs/décisions, `connecteurs/` pour parler au réseau, `persistance/` pour le cache local. Aucune couche ne remonte vers `presentation/`.

## 3. Bibliothèques retenues (complète `08-conventions-codage.md` §2)

| Besoin | Choix | Justification |
|---|---|---|
| Gestion d'état | **Pinia** | Store officiel Vue 3, typé nativement (cohérent avec TypeScript strict), API simple à auditer (pas de boilerplate style Redux) |
| Routage | **Vue Router** | Standard de l'écosystème Vue, permet le découpage en écrans (Tableau de bord, Fiche Projet, Structure Système...) avec chargement différé (`import` dynamique) — réduit le poids initial du bundle |
| Cache local (IndexedDB) | **Dexie.js** | L'API IndexedDB native est bas niveau et sujette à erreur (callbacks, gestion de version manuelle) — inadapté à un contexte où l'auditabilité du code de persistance compte. Dexie fournit une API typée, basée sur des promesses, avec migrations de schéma explicites — s'intègre naturellement avec la garde de compatibilité descendante déjà spécifiée |
| PWA / Service Worker | **vite-plugin-pwa** (Workbox) | Génère le service worker et le manifeste PWA à partir de la config Vite déjà choisie — évite d'écrire à la main la logique de cache d'assets, terrain d'erreur classique |
| Appels HTTP | **`fetch` natif** | Aucune bibliothèque cliente HTTP tierce nécessaire — `fetch` suffit pour des appels REST simples vers GitHub/Drive/IA, une dépendance de moins à auditer |

Ces choix sont ajoutés comme dépendances validées dans `08-conventions-codage.md` §2 (voir amendement).

## 4. Stratégie hors-ligne et PWA

- **Assets applicatifs** (JS/CSS/HTML du bundle): mis en cache par le service worker (stratégie *cache-first*, régénéré à chaque déploiement via un hash de build) — répond au besoin de fonctionnement sans réseau pour la rédaction.
- **Données métier** (`project`, `section`...): jamais mises en cache par le service worker — gérées exclusivement par Dexie/IndexedDB (couche `persistance/`), pour garder une seule source de vérité locale et éviter une désynchronisation entre deux mécanismes de cache différents.
- **Détection de connectivité**: `navigator.onLine` + tentative réelle d'appel (le premier est peu fiable seul) avant de proposer une synchronisation — bascule visible cohérente avec le principe déjà appliqué au routeur IA.
- **Manifeste PWA**: nom, icônes, couleur de thème alignés sur la charte graphique (palette indigo).

## 5. Connecteur GitHub — stratégie d'appels API et limite de débit (complète)

**Point non couvert jusqu'ici, trouvé en détaillant l'architecture**: l'API GitHub impose une limite de **5000 requêtes/heure par jeton authentifié**. Un appel par fichier (`project`, chaque `section`, chaque `asset_node`...) exploserait ce quota dès qu'un client a quelques centaines d'enregistrements — pas un cas extrême, c'est le volume de référence déjà fixé (500 projets/5000 sections).

**Stratégie retenue**:
- **Chargement initial et resynchronisation complète**: un seul appel à l'API Git Trees (`GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1`) récupère l'arborescence complète du dépôt (chemins + SHA de chaque fichier) en une requête. Comparaison avec le cache Dexie local (par SHA) pour déterminer les fichiers réellement changés, puis récupération de leur contenu uniquement (API Blobs, un appel par fichier changé — pas par fichier total).
- **Écritures**: toujours via l'API Git Data (création de blob + arbre + commit + mise à jour de référence) pour permettre des écritures atomiques multi-fichiers en un nombre d'appels constant, indépendant du nombre de fichiers modifiés dans le même commit (répond à l'atomicité déjà exigée pour Structure Système).
- **Compteur de quota exposé**: l'API GitHub retourne l'en-tête `X-RateLimit-Remaining` sur chaque réponse — le connecteur l'expose à la Couche Présentation (même principe que le quota IA): avertissement avant épuisement, jamais un échec silencieux en cours de session.

## 6. Modèle de composants (Couche Présentation, complète)

- Un composant Vue par écran de l'inventaire, routé via Vue Router.
- Composants transverses réutilisables (badge de statut avec icône; modale de confirmation, U-xx) centralisés, jamais dupliqués écran par écran — cohérent avec le principe DRY et la charte graphique.
- État partagé (session utilisateur, `client_config`, jeton) dans un store Pinia dédié, jamais dupliqué dans plusieurs composants.

## 7. Déploiement (nouveau — non couvert avant le 23/08/2026)

- **Hébergement**: à confirmer par le test réseau prévu (voir échange du 23-24/08/2026) — candidat retenu par défaut: GitHub Pages (`*.github.io`), cohérent avec le reste de l'écosystème déjà autorisé.
- **Pipeline**: le portail de qualité (`quality-gate.yml`) valide chaque changement; un job de déploiement distinct (à ajouter) publie le build (`npm run build`) vers GitHub Pages uniquement depuis la branche principale, après succès du portail de qualité — jamais un déploiement direct sans passer par les vérifications.
- **Configuration par environnement**: aucun secret dans le bundle buildé (le jeton utilisateur est saisi à l'exécution, jamais injecté au build).

## 8. Sécurité complémentaire (précise)

- **Content-Security-Policy**: restreint les origines autorisées à `api.github.com`, `www.googleapis.com` (Drive), **le domaine du relais IA** (§10 ci-dessous — pas celui du/des fournisseur(s) IA eux-mêmes, jamais appelés directement depuis le navigateur, cf. §10), et l'origine du bundle lui-même — bloque toute exfiltration vers un domaine tiers non listé, y compris en cas de faille XSS (défense en profondeur, complète les mitigations déjà en place). *(corrigé v02 — la version v01 listait par erreur "les domaines des fournisseurs IA configurés", incohérent avec l'architecture à relais posée en §10; incohérence trouvée lors de la revue v02.)*
- **Aucun `eval`/`Function` dynamique** dans le code applicatif — imposé par la CSP et vérifiable par ESLint.

## 9. Nouveaux risques identifiés (à intégrer en AR)

| Risque | Mitigation |
|---|---|
| Épuisement du quota d'appels API GitHub en usage intensif | Stratégie Git Trees API + compteur exposé (§5 ci-dessus) |
| Relais IA introduisant un nouveau domaine externe non testé depuis le poste utilisateur | Test de joignabilité réseau du domaine du relais avant mise en production — voir §10 ci-dessous |
| Relais IA journalisant par erreur le contenu des échanges | Relais sans état, exigence explicite de conception — voir §10 ci-dessous |

## 10. Relais IA — masquage de la clé API (nouveau v02)

**Composant nouveau, non prévu dans l'architecture initiale**: le chat expert et le mode audit simulé appellent un fournisseur IA cloud payant (Claude par défaut). Exposer la clé d'API dans le bundle navigateur la rendrait publique (code client par construction accessible) — impossible à faire directement depuis une PWA sans installation. Un relais intermédiaire est donc nécessaire.

**Architecture retenue**: `navigateur (PWA) → relais serverless → fournisseur IA`. Le navigateur ne parle **jamais** directement au fournisseur — seul le relais l'appelle, côté serveur.

- **Hébergement**: Cloudflare Workers — cohérent avec la contrainte "zéro service à gérer" déjà retenue pour le reste de l'architecture (GitHub Pages, IndexedDB). Domaine retenu: sous-domaine `workers.dev` du compte Cloudflare de l'utilisateur (`soudjaymoursala.workers.dev`, déjà utilisé pour des Workers existants) — pas de domaine custom nécessaire.
- **Clé API**: stockée en secret du Worker (`wrangler secret put`), jamais dans le dépôt applicatif ni dans le bundle buildé.
- **Sans état**: aucune persistance du contenu de la requête ou de la réponse au-delà du traitement de l'appel en cours; pas de journalisation du corps des requêtes côté plateforme d'hébergement (à vérifier explicitement en configuration avant mise en production) — exigence explicite de conception.
- **CORS**: restreint strictement à l'origine exacte de la PWA déployée (domaine GitHub Pages retenu), jamais `*`.
- **Modèle par mode d'usage**: le relais transmet un paramètre de mode (chat normatif vs mode audit simulé) permettant de router vers un modèle différent selon l'usage — qualification de fiabilité séparée par mode. Configuration exacte des modèles en `22-SDS-outil.md` §11.
- **Test de joignabilité réseau**: **vérifié et clos le 24/08/2026** — le compte Cloudflare de l'utilisateur dispose déjà de Workers actifs, et un chargement explicite de leur URL `*.workers.dev` depuis le poste professionnel a été confirmé réussi, même méthode que le test déjà réalisé pour `api.github.com`/`*.github.io` (clos).

---
*Document vivant, version 03 — créé le 23/08/2026, en réponse à une demande proactive de l'utilisateur ("architecture complète et détaillée") avant le démarrage effectif du code. Complète la spécification de conception technique sans la contredire ; toute divergence future doit être répercutée dans les deux documents. **v02 (24/08/2026)**: §8 corrigé (incohérence CSP/relais), §10 nouveau (conception du relais IA). **v03 (24/08/2026)**: test de joignabilité réseau du relais vérifié et clos — Workers Cloudflare déjà actifs sur le poste professionnel de l'utilisateur, `*.workers.dev` confirmé accessible.*
