# Rapport d'audit — Swissmedic (simulation) — SDS-VALIDAPHARM-2026-001

| | |
|---|---|
| **Référence** | AUDIT-SWISSMEDIC-VALIDAPHARM-2026-003 |
| **Version** | 01 (close) |
| **Type d'audit** | Simulation d'inspection GxP — référentiel : PIC/S PI 041, Annexe 11, ICH Q9/Q10, GAMP 5 |
| **Document audité** | `22-SDS-outil.md` v02 |
| **Statut** | Close — constat intégré en SDS v03 |

---

## Constat

### MAJ-01 — Risque de fusion Git automatique silencieuse en amont de la résolution de conflit applicative

**Constat** : §5 décrit la résolution de conflit **une fois qu'un conflit Git a été détecté**. Mais Git, par défaut, fusionne automatiquement deux fichiers texte modifiés sur des lignes différentes **sans jamais signaler de conflit**, même si le résultat casse la cohérence sémantique d'un fichier JSON structuré (ex. deux lignes ajoutées au même tableau `tableau_dynamique`, à des positions différentes du fichier, fusionnées sans erreur syntaxique mais avec un JSON résultant potentiellement incohérent au niveau métier — ex. deux valeurs incompatibles pour un même champ situées sur des lignes distinctes du fichier). Le mécanisme décrit en §5 ne s'active donc que pour les conflits que Git détecte lui-même — pas pour les fusions silencieuses "réussies" mais sémantiquement fausses.

**Analyse** : c'est un angle mort classique de la gestion de version appliquée à des données structurées (par opposition à du code source, où une fusion syntaxiquement valide est presque toujours sémantiquement correcte). Un registre AMDEC fusionné silencieusement de travers ne déclencherait jamais l'écran de résolution assistée — l'utilisateur ne saurait jamais qu'une fusion automatique douteuse a eu lieu.

**Sévérité** : Majeur.

## Verdict

**Approuvable sous réserve** — un constat, mais touchant directement la fiabilité du mécanisme déjà identifié comme risque prioritaire (AR-R-34).

## Suite donnée

Intégré en SDS v03 : un driver de fusion Git personnalisé (`merge=union` désactivé, `merge=binary` ou équivalent) force **tout** conflit textuel sur un fichier `sections/*.json` à être traité comme un conflit applicatif — jamais de fusion automatique silencieuse par Git, même syntaxiquement valide.
