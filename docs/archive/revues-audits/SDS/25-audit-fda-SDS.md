# Rapport d'audit — FDA (simulation) — SDS-VALIDAPHARM-2026-001

| | |
|---|---|
| **Référence** | AUDIT-FDA-VALIDAPHARM-2026-003 |
| **Version** | 01 (close) |
| **Type d'audit** | Simulation d'inspection FDA — référentiel : 21 CFR Part 11, FDA Data Integrity Guidance (2018) |
| **Document audité** | `22-SDS-outil.md` v02 (déjà amendée du constat Swissmedic MAJ-01) |
| **Statut** | Close — constat intégré en SDS v03 |

---

## Constat

### MAJ-01 — Fiabilité de l'horodatage de la piste d'audit non spécifiquement traitée

**Constat** : l'ensemble de la piste d'audit de l'outil (URS-NF-030, commits Git signés) repose sur des horodatages qui sont, en Phase 1, ceux de l'**horloge système locale du poste utilisateur** — jamais synchronisés ni vérifiés contre une source de temps de confiance (NTP, serveur externe). URS-NF-030 reconnaît déjà génériquement que la piste d'audit Phase 1 n'est "pas un audit trail Part 11 complet", mais **sans jamais nommer spécifiquement ce risque** (manipulation possible de l'horloge locale avant un commit) ni indiquer de remédiation prévue en Phase 3.

**Analyse** : 21 CFR 11.10(e) exige des horodatages "sécurisés" pour tout audit trail visé par Part 11. Un inspecteur FDA, en Phase 3 (quand Part 11 devient applicable), demandera explicitement comment ce risque est traité — le disclaimer générique actuel ("pas complet Part 11") ne suffit pas comme réponse à une question aussi précise ; il faut un acquiescement explicite du risque et un plan nommé.

**Sévérité** : Majeur — pas un défaut bloquant pour la Phase 1 (où la signature Part 11 n'est de toute façon pas engagée), mais un point de dette de conception à nommer maintenant pour ne pas le découvrir tardivement en Phase 3.

## Verdict

**Approuvable sous réserve** — un constat, de nature "dette documentée" plutôt que défaut fonctionnel Phase 1.

## Suite donnée

Intégré en SDS v03 : reconnaissance explicite du risque (horloge locale non synchronisée) dans la section sécurité technique, avec remédiation Phase 3 nommée (source de temps de confiance côté serveur lors du passage à l'architecture multi-utilisateur, cohérent avec la bascule serveur déjà prévue au cadrage §4 Phase 3).
