# ValidaPharm

Outil d'aide à la rédaction de la documentation de validation/qualification GAMP 5 pour l'industrie pharmaceutique (CQV/CSV/QA) — **application web pure (PWA), sans installation**, multi-utilisateur avec rôles admin/utilisateur réellement vérifiés côté serveur.

Dépôt Git dédié, séparé de tout autre projet, conformément à `docs/00-cadrage-projet.md` §4. **Ce dépôt est le dépôt de conception** (code source, documentation) — cloné/travaillé normalement par un développeur. Il ne faut pas le confondre avec les dépôts Git _de données_ que l'application déployée gère à l'exécution, un par client, via l'API GitHub (voir Architecture ci-dessous).

## Documentation de conception

Cascade de spécifications vivantes, seule source de vérité pour l'état courant (en cas de divergence de détail, la FS fait foi) :

| Document                               | Référence                                  |
| -------------------------------------- | ------------------------------------------ |
| Cadrage                                | `docs/00-cadrage-projet.md`                |
| Analyse de risque (AR, ICH Q9)         | `docs/02-analyse-de-risque-outil.md`       |
| FS (spécifications fonctionnelles)     | `docs/03-specifications-fonctionnelles.md` |
| FDS (conception fonctionnelle)         | `docs/16-FDS-outil.md`                     |
| SDS (conception technique)             | `docs/22-SDS-outil.md`                     |
| Conventions de codage                  | `docs/08-conventions-codage.md`            |
| Architecture détaillée (technique)     | `docs/09-architecture-detaillee.md`        |
| Architecture expliquée (non-technique) | `docs/10-architecture-expliquee.md`        |
| Guide utilisateur (écran par écran)    | `docs/GUIDE-UTILISATEUR.md`                |

Historique complet de l'implémentation, phase par phase (chantier de convergence architecturale lancé fin août 2026, ~40 phases livrées à ce jour) : `docs/convergence/CONVERGENCE_PLAN.md`. Comptes-rendus de revues multi-experts et audits réglementaires simulés (Swissmedic/FDA) ayant fait évoluer ces documents : `docs/archive/` (enregistrements clos, jamais mis à jour).

Documents de qualification de l'outil lui-même (VMP, IQ/OQ/PQ — `docs/04` à `docs/07`) : à réécrire contre la FS/FDS/SDS actuelles (marqués "À REVOIR").

## Fonctionnalités principales

- **Gestion multi-client** : fiche client (Architecture/Process/Procédures/Templates & Formulaires/Projets), rôles admin/utilisateur, partage de projet.
- **Structure Système** : référentiel d'actifs hiérarchique (Site/Bâtiment/Système/Équipement...), relations techniques typées, dossier vivant avec suivi de périodicité.
- **Qualification** : stratégie de qualification (ACFC configurable par méthode), Impact Assessment, Computer System Assessment (GAMP5), Risk Assessment (AMDEC), paramètres critiques (CPP/CQA).
- **Rédaction** : éditeur de section par gabarit déclaratif (DQ/IQ/OQ/PQ/FAT/SAT/plans...), génération de brouillon assistée par IA, export Word (gabarits client personnalisés)/JSON/CSV/PDF.
- **Tests & preuves** : chaîne Requirement → Test Design Engine → Exécution → Evidence, Journal d'anomalies (Quality Events).
- **Intelligence documentaire** : ingestion PDF/Word/OCR, structuration déterministe de SOP (repli IA si besoin), Knowledge Graph, Bibliothèque de normes.
- **Chat expert IA** : multi-fournisseur (Claude/OpenAI/Copilot/DeepSeek ou modèle local Ollama), mode audit simulé, qualification de fiabilité obligatoire avant activation réelle par fournisseur/mode d'usage.
- **Connecteurs QMS tiers** : écran de configuration (Veeva/SAP/TrackWise...).

## Architecture

**Application web pure (PWA), aucune installation** — contrainte réelle : le poste de travail professionnel de l'utilisateur bloque les logiciels/services non autorisés par l'IT (navigateur et `github.com` le sont, une application de bureau type Electron/Tauri ne le serait pas). Conséquence directe : aucun accès disque natif, aucun binaire `git` — tout le stockage passe par des appels API HTTPS :

- **Cloudflare Worker + D1** (`workers/auth-worker/`) — comptes utilisateurs, rôles, roster `Client` de l'organisation, journal d'audit : les seules données qui exigent structurellement un point de vérité serveur.
- **GitHub** (API Contents/Git Data) — dépôt Git dédié par client, source de vérité pour `Project`/`Section`/gabarits/dossiers vivants, accédé avec un jeton à portée restreinte (jamais un accès large au compte GitHub de l'utilisateur).
- **Google Drive** (API) — miroir de sauvegarde, jamais lu comme source.
- **Cache local** (IndexedDB du navigateur) — performance et fonctionnement hors ligne pour les données GitHub.
- **Cloudflare Worker OCR** (`workers/ocr-relay/`) — relais serverless sans état pour l'extraction de texte depuis un document scanné.
- **Relais IA** — le navigateur ne contacte jamais un fournisseur d'IA directement ; un relais serverless détient la clé du fournisseur configuré côté serveur.

Résolution de conflit (données GitHub) : détection optimiste par comparaison de SHA, jamais une fusion Git automatique. Détail complet, risques et compromis assumés : `docs/00-cadrage-projet.md` §4/§5, `docs/22-SDS-outil.md`, `docs/02-analyse-de-risque-outil.md`.

## Structure du dépôt

```
docs/                        documentation vivante (voir tableau ci-dessus)
  convergence/                historique d'implémentation phase par phase (CONVERGENCE_PLAN.md = index)
  couche-ia/                  méthodologie de raisonnement métier (grounding du Reasoning Engine)
  audit/                      référence contractuelle de méthodologie d'audit
  archive/                    comptes-rendus clos (revues multi-experts, audits) — voir docs/archive/README.md
prototype-initial/          prototype fonctionnel antérieur à la cascade de specs actuelle — voir prototype-initial/STATUT.md, ne pas reprendre tel quel
src/                         code de l'application (voir docs/08-conventions-codage.md §5)
  presentation/               composants Vue, écrans, stores Pinia
  logique-metier/              fonctions pures (moteur de calcul, machine à états, moteur de gabarits, assessments, ...)
  connecteurs/                 GitHub, Drive, IA, authentification — implémentations des contrats SDS
  persistance/                 cache local (IndexedDB), migration de schéma
workers/
  auth-worker/                 Cloudflare Worker + D1 — comptes/rôles/clients/audit (voir workers/auth-worker/README.md)
  ocr-relay/                   Cloudflare Worker — relais OCR sans état
data/           schéma illustratif de la structure de données (SDS §3) — pas un dossier utilisé à l'exécution
config/         configuration locale non versionnée du dépôt de conception (secrets de développement — voir .gitignore)
scripts/hooks/  hooks Git (scan de secrets pre-commit — protège ce dépôt de conception)
scripts/setup.sh  installe le hook pre-commit
```

Seuls les documents à la racine de `docs/` (et `docs/convergence/`, `docs/couche-ia/`) font foi pour l'état courant. Tout ce qui est dans `docs/archive/` est un enregistrement clos, jamais mis à jour, conservé pour la piste d'audit (jamais supprimé).

## Installation locale (développement)

```
npm install
./scripts/setup.sh
npm run dev
```

`scripts/setup.sh` installe le hook `pre-commit` (scan de secrets sur ce dépôt de conception). `npm run lint` / `npm run format` / `npm run typecheck` / `npx vitest run` exécutent les mêmes vérifications que le portail de qualité CI.

Le Worker d'authentification (`workers/auth-worker/`) et le relais OCR (`workers/ocr-relay/`) se déploient séparément sur Cloudflare — voir leurs `README.md` respectifs.

## Portail de qualité (CI)

`.github/workflows/quality-gate.yml` : lint, format, typecheck, tests — bloque la fusion vers la branche principale tant qu'une étape échoue. Un push sur `main` déclenche également le déploiement automatique de la PWA sur GitHub Pages.

## Publication

Dépôt GitHub privé dédié : `soudjaymoursala-netizen/validapharm`. Tout push reste soumis à autorisation explicite préalable.
