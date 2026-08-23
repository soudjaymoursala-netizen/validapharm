# Rapport d'audit — Cabinet de conseil GxP/CSV (simulation) — FDS-VALIDAPHARM-2026-001

| | |
|---|---|
| **Référence** | AUDIT-CABINET-GXP-VALIDAPHARM-2026-001 |
| **Version** | 01 (close) |
| **Type d'audit** | Simulation de revue d'un intégrateur/cabinet de conseil spécialisé conception logicielle GxP (pas un inspecteur réglementaire — angle ingénierie au service de la validation) |
| **Document audité** | `16-FDS-outil.md` v03 |
| **Statut** | Close — constat intégré en FDS v04 (principe directeur, pas de nouvel ID URS) |

---

## Constat

### MAJ-01 — Séparation logique métier / présentation non explicitée comme principe de conception

**Constat** : la FDS décrit en détail les écrans (§2), les flux (§3) et les algorithmes déterministes (§5), mais ne pose nulle part le principe architectural selon lequel la **logique métier testable** (calculs, machine à états, grilles de décision, détection de liens manquants) doit être **isolée de la couche de présentation** (écrans, messages). URS-NF-001/002 exigent des tests unitaires sur les calculs, mais rien ne garantit que la conception qui sera retenue en SDS permette effectivement de tester ces calculs indépendamment de l'interface graphique.

**Analyse** : c'est un principe de base de l'ingénierie logicielle testable, particulièrement critique pour un système GAMP 5 catégorie 5 où la défendabilité repose sur des tests unitaires exhaustifs (VMP §3, point 1). Sans ce principe explicite en amont de la SDS, le risque concret est une architecture où les calculs sont mêlés au code d'interface, rendant les tests unitaires "propres" (sans dépendance UI) difficiles voire impossibles à écrire — ce qui dégraderait silencieusement la rigueur de test déjà promise ailleurs dans le dossier.

**Sévérité** : Majeur — pas un défaut de la FDS elle-même (qui reste au bon niveau d'abstraction), mais une lacune de principe directeur à transmettre explicitement à la SDS avant qu'elle ne soit rédigée, pour ne pas devoir la corriger après coup.

## Point examiné, non retenu

**Portes de qualité (CI gate) empêchant la fusion de code non testé.** Point réel et pertinent, mais relève de la SDS (choix d'outillage technique, pipeline) et de futures procédures opérationnelles de développement — pas de la FDS qui reste au niveau fonctionnel. Noté pour attention explicite lors de la rédaction de la SDS plutôt que traité ici.

## Verdict

**Approuvable sous réserve** — un principe directeur à ajouter, pas un défaut fonctionnel de la FDS.

## Suite donnée

Intégré en FDS v04 : nouveau principe directeur explicite (§11bis) à respecter par la SDS.
