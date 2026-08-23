# ValidaPharm

Outil d'aide à la rédaction de la documentation de validation/qualification GAMP 5 (Phase 1 : local-first, mono-utilisateur).

Dépôt Git dédié, séparé de tout autre projet, conformément à `docs/00-cadrage-projet.md` §4.

## État au 22/08/2026

Documentation de conception complète et cohérente :

| Document | Version |
|---|---|
| Cadrage | voir `docs/00-cadrage-projet.md` |
| URS | v20 |
| Analyse de risque (AR) | v20 — 58 entrées |
| FS | v08 |
| FDS | v10 |
| SDS | v06 |

Conception (code) : démarre le 23/08/2026. Choix définitif de framework/langage différé à l'implémentation (SDS §10), sans impact sur les contrats d'interface déjà fixés (`ProviderAdapter`, `QMSConnectorAdapter`, moteur de calcul, machine à états, résolution de conflit).

Documents de qualification de l'outil lui-même (VMP, IQ/OQ/PQ — `docs/04` à `docs/07`) : à réécrire **après** la conception, contre la FS/FDS/SDS à jour (actuellement marqués "À REVOIR").

## Structure du dépôt

```
docs/                        documents vivants (état courant, seule source de vérité)
  00-cadrage-projet.md
  01-URS-outil.md
  02-analyse-de-risque-outil.md
  03-specifications-fonctionnelles.md   (FS)
  16-FDS-outil.md                        (FDS)
  22-SDS-outil.md                        (SDS)
  04-plan-de-validation.md               (VMP — à revoir après conception)
  05-protocole-IQ-outil.md
  06-protocole-OQ-outil.md
  07-protocole-PQ-outil.md
  archive/                    comptes-rendus clos (revues multi-experts, audits) — voir docs/archive/README.md
prototype-initial/          prototype fonctionnel antérieur à la cascade de specs actuelle — voir prototype-initial/STATUT.md, ne pas reprendre tel quel
data/           persistance fichier-par-enregistrement (SDS §3)
config/         configuration locale non versionnée (secrets — voir .gitignore)
scripts/hooks/  hooks Git (scan de secrets pre-commit — SDS §7)
scripts/setup.sh  installe les hooks locaux + le driver de fusion JSON
.gitattributes  driver de fusion applicatif sur data/sections/*.json (SDS §5)
```

Seuls les documents à la racine de `docs/` font foi pour l'état courant. Tout ce qui est dans `docs/archive/` est un enregistrement clos, jamais mis à jour, conservé pour la piste d'audit (jamais supprimé).

## Installation locale

```
./scripts/setup.sh
```

Installe le hook `pre-commit` (scan de secrets) et configure le driver de fusion Git `validapharm-json` requis par `.gitattributes` (résolution de conflit applicative, jamais la fusion par ligne par défaut de Git — SDS §5, audit Swissmedic simulé MAJ-01).

## Portail de qualité (CI)

`.github/workflows/quality-gate.yml` : squelette de pipeline (SDS §4) — bloque la fusion vers la branche principale tant que la suite de tests unitaires de la Couche Logique métier échoue. Le contenu réel des jobs sera complété une fois le framework choisi.

## Contrainte de publication

Ce dépôt reste **local uniquement** jusqu'à instruction explicite contraire — aucun push vers un hébergeur distant sans autorisation.
