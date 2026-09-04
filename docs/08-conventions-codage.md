# Conventions de codage — ValidaPharm

| | |
|---|---|
| **Référence** | CONV-CODAGE-VALIDAPHARM-2026-001 |
| **Version** | 02 (architecture web pure sans installation — API GitHub) |
| **Statut** | En vigueur — s'applique à partir du démarrage de la conception (23/08/2026) |
| **Documents de référence** | `22-SDS-outil.md` v11 §10, `00-cadrage-projet.md` |
| **Décidé par** | Décision explicite de l'utilisateur, 23/08/2026 : code auditable, commenté, structuré pour permettre au QA de tester correctement ; architecture web pure sans installation (contrainte du poste de travail professionnel) |

---

## 1. Objet

Ce document résout le point laissé ouvert en SDS §10 ("choix définitif de framework/langage") et fixe les règles de codage qui garantissent que le code produit est **auditable** — lisible et vérifiable par un QA ou un auditeur externe sans devoir deviner l'intention, au même titre que les livrables documentaires produits par l'outil lui-même.

## 2. Stack technique retenue

| Choix | Décision |
|---|---|
| Langage | TypeScript, mode `strict` activé |
| Framework UI | Vue 3 (Composition API) |
| Tests | Vitest |
| Qualité automatique | ESLint + Prettier, exécutés par le portail de qualité (SDS §4) |
| Build | Vite |

**Justification** (répond à SDS §10, sans impact sur les contrats d'interface déjà fixés en SDS §5/§5bis/§6/§6bis) : écosystème mature pour une application à état riche (éditeur de sections, référentiel Structure Système en arbre+graphe), typage statique fort utile à l'auditabilité (contrat de fonction explicite, erreurs détectées avant même les tests), structure de composants Vue plus prescriptive que des alternatives plus libres — aide à la lisibilité pour un lecteur qui découvre le code.

**Livré exclusivement comme PWA (répond à SDS §10, amendé v02, 23/08/2026)** : jamais une application de bureau empaquetée (Electron/Tauri écartés) — installation impossible sur un poste dont l'IT bloque les logiciels non autorisés. Conséquence directe : aucune API Node (`fs`, `child_process`, accès disque natif) n'est utilisable nulle part dans `src/` — uniquement `fetch`/API navigateur standard et IndexedDB. Cette contrainte est vérifiable par lecture du code (aucun `import` de module Node dans `src/`), pas seulement déclarée.

## 3. Langue du code

**Mixte assumée**, cohérente avec le vocabulaire déjà mixte des identifiants de domaine dans FS/FDS/SDS (ex. `qualification_status`, `asset_node`) :
- **Domaine métier** (fonctions/types qui implémentent une exigence FS/FDS/SDS) : nommage **français** — ex. `calculerIPR`, `validerAbsenceDeCycle`, `presenterStatut`, `QualificationStatus`.
- **Infrastructure technique** (composants génériques, hooks/composables, utilitaires transverses sans lien direct avec une exigence métier) : nommage **anglais**, conforme aux conventions de l'écosystème TS/Vue — ex. `useDebounce`, `formatDate`.
- En cas de doute sur la catégorie d'un élément : privilégier le français si l'élément porte un ID d'exigence en commentaire (§4), l'anglais sinon.

## 4. Commentaires et traçabilité (règle centrale, répond à la demande explicite du 23/08/2026)

- **Chaque fonction de la Couche Logique métier** (SDS §2, dossier `src/logique-metier/`) porte un bloc TSDoc :
  - Une phrase sur ce qu'elle fait (pas une paraphrase du nom — ce que le nom ne dit pas).
  - `@param`/`@returns` typés et documentés.
  - **`@requirement`** : la ou les référence(s) de spécification qu'elle implémente (ex. `@requirement FDS §3.9`) — permet à un QA ou un auditeur de retrouver instantanément la spécification correspondante depuis le code, et inversement depuis la matrice de traçabilité (FDS §10, SDS §11) vers le code.
  - Toute contrainte ou cas limite non évident (ex. pourquoi un ordre de vérification précis, pourquoi une valeur ne peut jamais être `null` à cet endroit) — jamais un commentaire qui répète ce que le code dit déjà.
- **Composants de présentation** (`src/presentation/`) : commentaire d'en-tête bref (rôle de l'écran, référence à l'écran FDS §2 correspondant) ; pas de TSDoc exhaustif par méthode, sauf logique non triviale locale à l'écran.
- **Aucun commentaire de complaisance** ("// increment i") — un commentaire qui n'ajoute rien à la lecture du code est retiré en revue.

## 5. Structure des dossiers (reflète strictement SDS §2)

```
src/
  presentation/       Composants Vue — n'importe JAMAIS de logique métier directement,
                       appelle les fonctions de logique-metier/ via leur interface publique
  logique-metier/      Fonctions pures, testables indépendamment de l'UI (SDS §2, principe FDS §8bis)
    moteur-calcul/         calculerIPR, evaluerGrilleQualification, ...
    machine-etats/         transitions de statut (section, qualification_status)
    structure-systeme/     validerAbsenceDeCycle, niveauUtilise, presenterStatut
    resolution-conflit/    diff structuré sur conflit de SHA (SDS §5)
  connecteurs/         GitHub (API), Drive (API), IA (ProviderAdapter), QMS (QMSConnectorAdapter) —
                       contrats SDS §5/§5bis/§6/§6bis, exclusivement des appels API HTTPS
  persistance/         Cache local (IndexedDB, SDS §3), migration de schéma
tests/                 Miroir de la structure src/ — voir §6
```

**Règle bloquante** (vérifiée par le linting, pas seulement à la revue) : aucun fichier de `logique-metier/` ou `connecteurs/` n'importe quoi que ce soit de `presentation/`.

## 6. Tests (répond à SDS §9, "le QA test puisse faire son boulot correctement")

- Chaque fonction de `logique-metier/` a son fichier de test **à côté** du fichier source (`calculerIPR.ts` + `calculerIPR.test.ts`), pas dans un dossier `tests/` séparé qui se désynchronise avec le temps.
- Nom de test descriptif de ce qui est vérifié, pas générique (`test('IPR = S×O×D pour des valeurs nominales')`, jamais `test('test1')`).
- Cas limites systématiques (valeurs nulles, valeurs aux bornes, combinaisons non couvertes) — cohérent avec SDS §4/§9.
- Un test qui échoue bloque la fusion (portail de qualité, SDS §4) — jamais de test marqué `skip`/`todo` fusionné sans justification documentée dans le message de commit.

## 7. Qualité automatique

- ESLint : mode strict, `any` interdit, règle d'import restreignant `logique-metier/`/`connecteurs/` à ne jamais importer `presentation/` (§5).
- TypeScript : `tsconfig.app.json` (qui couvre tout `src/`) n'inclut **pas** les types Node — toute tentative d'utiliser une API Node (`fs`, `child_process`, `Buffer`...) échoue au typecheck, pas seulement au linting. Double vérification de la contrainte "aucun accès disque natif" (§2).
- Prettier : formatage automatique, pas de débat de style en revue de code.
- Les deux sont exécutés par le portail de qualité CI (`quality-gate.yml`, SDS §4) — bloquant, pas indicatif.

---
*Document vivant, version 02 — v01 créé le 23/08/2026, résout le point ouvert de SDS §10. **v02 (23/08/2026) confirme la livraison en PWA exclusive** (Electron/Tauri écartés, contrainte du poste de travail professionnel) et renomme les connecteurs/dossiers en conséquence (GitHub au lieu de Git local). Toute évolution de ces conventions suit le même processus de revue que les autres documents de conception.*
