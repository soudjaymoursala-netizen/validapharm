# ValidaPharm

Outil d'aide à la rédaction de la documentation de validation/qualification GAMP 5 (Phase 1 : mono-utilisateur, **application web pure sans installation**).

Dépôt Git dédié, séparé de tout autre projet, conformément à `docs/00-cadrage-projet.md` §4. **Ce dépôt est le dépôt de conception** (code source, documentation) — cloné/travaillé normalement par un développeur. Il ne faut pas le confondre avec le dépôt Git _de données_ que l'application déployée gère à l'exécution, via l'API GitHub, pour le compte d'un client (voir Architecture ci-dessous).

## État au 24/08/2026

Documentation de conception complète et cohérente :

| Document               | Version                              |
| ---------------------- | ------------------------------------ |
| Cadrage                | voir `docs/00-cadrage-projet.md`     |
| URS                    | v25                                  |
| Analyse de risque (AR) | v26 — 67 entrées                     |
| FS                     | v11                                  |
| FDS                    | v14                                  |
| SDS                    | v13                                  |
| Conventions de codage  | voir `docs/08-conventions-codage.md` |
| Architecture détaillée (technique) | voir `docs/09-architecture-detaillee.md` |
| Architecture expliquée (non-technique) | voir `docs/10-architecture-expliquee.md` |

Conception (code) : démarre le 23/08/2026. Stack technique résolue (`08-conventions-codage.md`) : **TypeScript (strict) + Vue 3 + Vitest + ESLint/Prettier**, code auditable (bloc TSDoc `@requirement` sur chaque fonction métier, structure en couches strictes reflétant SDS §2, tests co-localisés).

Documents de qualification de l'outil lui-même (VMP, IQ/OQ/PQ — `docs/04` à `docs/07`) : à réécrire **après** la conception, contre la FS/FDS/SDS à jour (actuellement marqués "À REVOIR").

## Architecture (décision explicite du 23/08/2026)

**Application web pure (PWA), aucune installation** — contrainte réelle : le poste de travail professionnel de l'utilisateur bloque les logiciels/services non autorisés par l'IT (navigateur et `github.com` le sont, une application de bureau type Electron/Tauri ne le serait pas).

Conséquence directe sur l'implémentation : **aucun accès disque natif, aucun binaire `git`.** Tout le stockage passe par des appels API HTTPS :

- **GitHub** (API Contents/Git Data) — dépôt Git dédié par client, source de vérité, accédé avec un jeton à portée restreinte (jamais un accès large au compte GitHub de l'utilisateur).
- **Google Drive** (API) — miroir de sauvegarde, jamais lu comme source.
- **Cache local** (IndexedDB du navigateur) — performance et fonctionnement hors ligne.

Résolution de conflit : détection optimiste par comparaison de SHA (l'API GitHub rejette une écriture si le fichier distant a changé depuis la dernière lecture), jamais une fusion Git automatique — détail en SDS §5.

Détail complet, risques associés et compromis assumés (stockage du jeton dans le navigateur, dépendance à `api.github.com`) : `docs/00-cadrage-projet.md` §4/§5, `docs/22-SDS-outil.md` §2/§5/§7, `docs/02-analyse-de-risque-outil.md` (AR-R-61, AR-R-62).

## Structure du dépôt

```
docs/                        documents vivants (état courant, seule source de vérité)
  00-cadrage-projet.md
  01-URS-outil.md
  02-analyse-de-risque-outil.md
  03-specifications-fonctionnelles.md   (FS)
  16-FDS-outil.md                        (FDS)
  22-SDS-outil.md                        (SDS)
  08-conventions-codage.md               (choix de framework + charte de codage)
  04-plan-de-validation.md               (VMP — à revoir après conception)
  05-protocole-IQ-outil.md
  06-protocole-OQ-outil.md
  07-protocole-PQ-outil.md
  archive/                    comptes-rendus clos (revues multi-experts, audits) — voir docs/archive/README.md
prototype-initial/          prototype fonctionnel antérieur à la cascade de specs actuelle — voir prototype-initial/STATUT.md, ne pas reprendre tel quel
src/                         code de l'application (voir docs/08-conventions-codage.md §5)
  presentation/               composants Vue
  logique-metier/              fonctions pures (moteur de calcul, machine à états, résolution de conflit, ...)
  connecteurs/                 GitHub, Drive, IA — implémentations des contrats SDS §5/§5bis/§6/§6bis
  persistance/                 cache local (IndexedDB), migration de schéma
data/           schéma illustratif de la structure de données (SDS §3) — pas un dossier utilisé à l'exécution (aucun accès disque natif, voir Architecture ci-dessus)
config/         configuration locale non versionnée du dépôt de conception (secrets de développement — voir .gitignore)
scripts/hooks/  hooks Git (scan de secrets pre-commit — protège ce dépôt de conception)
scripts/setup.sh  installe le hook pre-commit
```

Seuls les documents à la racine de `docs/` font foi pour l'état courant. Tout ce qui est dans `docs/archive/` est un enregistrement clos, jamais mis à jour, conservé pour la piste d'audit (jamais supprimé).

## Installation locale (développement)

```
npm install
./scripts/setup.sh
npm run dev
```

`scripts/setup.sh` installe le hook `pre-commit` (scan de secrets sur ce dépôt de conception). `npm run lint` / `npm run typecheck` / `npm run test` / `npm run build` exécutent les mêmes vérifications que le portail de qualité CI.

## Portail de qualité (CI)

`.github/workflows/quality-gate.yml` : pipeline (SDS §4) — bloque la fusion vers la branche principale tant que lint, typecheck ou tests échouent.

## Publication

Dépôt GitHub privé dédié : `soudjaymoursala-netizen/validapharm`. Tout push reste soumis à autorisation explicite préalable (accordée le 23/08/2026 pour ce dépôt).
