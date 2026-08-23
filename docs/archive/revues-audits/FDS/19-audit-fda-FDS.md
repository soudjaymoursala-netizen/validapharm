# Rapport d'audit — FDA (simulation) — FDS-VALIDAPHARM-2026-001

| | |
|---|---|
| **Référence** | AUDIT-FDA-VALIDAPHARM-2026-002 |
| **Version** | 01 (close) |
| **Type d'audit** | Simulation d'inspection FDA — référentiel : 21 CFR Part 11, FDA Data Integrity Guidance (2018), FDA Computer Software Assurance |
| **Document audité** | `16-FDS-outil.md` v02 (déjà amendée du constat Swissmedic MAJ-01) |
| **Statut** | Close — constat intégré en URS v12 / AR v12 / FDS v03 |

---

## Constat

### MAJ-01 — Motif générique et non probant sur la résolution de conflit Git

**Constat** : §3.6 précise que la résolution d'un conflit crée une nouvelle révision avec un motif **fixe et générique** : *"résolution de conflit de fusion"*. Ce motif ne capture pas **quelle décision a été prise pour chaque champ divergent** (locale, distante, ou fusion manuelle) — contrairement au motif de rejet (§3.2) ou de forçage (§3.3/§7), tous deux rendus obligatoires et spécifiques suite aux amendements de la revue multi-experts (E1, E2).

**Analyse** : un enregistrement d'audit qui dit seulement "un conflit a été résolu" sans dire comment, alors que l'écran de résolution (§3.6) demande justement à l'utilisateur de faire ce choix champ par champ, est incomplet au sens de la FDA Data Integrity Guidance (2018) — le principe "Complete" d'ALCOA+ veut que l'enregistrement capture toutes les données pertinentes à l'action, pas seulement son occurrence. C'est la même classe de défaut que celle déjà corrigée pour le forçage de garde-fou (URS-F-027bis) — laissée de côté ici par inattention, pas par choix.

**Sévérité** : Majeur — incohérence directe avec un principe déjà appliqué ailleurs dans le même document.

## Verdict

**Approuvable sous réserve** — un seul constat, mais qui révèle une inconsistance interne entre deux mécanismes d'audit trail du même document (motif spécifique exigé pour le forçage, motif générique toléré pour la résolution de conflit) — pas cohérent avec le principe "un seul niveau de rigueur pour une même classe de risque" déjà établi lors des revues précédentes.

## Suite donnée

Intégré en FDS v03 : l'enregistrement de résolution de conflit capture, pour chaque champ/ligne en conflit, la décision retenue (locale/distante/valeur fusionnée) — plus de motif générique.
