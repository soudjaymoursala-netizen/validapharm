# Rapport d'audit — Swissmedic (simulation) — FDS-VALIDAPHARM-2026-001

| | |
|---|---|
| **Référence** | AUDIT-SWISSMEDIC-VALIDAPHARM-2026-002 |
| **Version** | 01 (close) |
| **Type d'audit** | Simulation d'inspection GxP — référentiel : PIC/S PI 041, Annexe 11, ICH Q9/Q10, GAMP 5 |
| **Document audité** | `16-FDS-outil.md` v02 |
| **Statut** | Close — constat intégré en URS v12 / AR v12 / FDS v03 |

---

## Constat

### MAJ-01 — Granularité de résolution de conflit Git indéfinie pour les tableaux dynamiques

**Constat** : §3.6 de la FDS spécifie une résolution de conflit "champ par champ" (`[Garder version locale] / [Garder version distante] / [Fusionner manuellement]`). Cette granularité fonctionne pour un champ scalaire (texte, date, nombre) mais **aucune règle n'est définie pour un champ de type `tableau_dynamique`** (ex. registre AMDEC) — qui est en réalité une collection de lignes, chacune avec ses propres cellules. Un conflit sur un tableau AMDEC modifié sur deux postes (ex. ajout de lignes différentes de chaque côté) ne peut pas être résolu par un simple choix "locale/distante/manuelle" au niveau du tableau entier sans risquer une perte de lignes ajoutées légitimement d'un côté ou de l'autre.

**Analyse** : c'est précisément le type de structure (AMDEC, registre de risques) où une résolution mal conçue causerait la perte silencieuse d'une ligne d'analyse de risque — un scénario direct pour AR-R-34 (déjà identifié) mais dont la sévérité réelle dépend entièrement de cette granularité, non encore précisée.

**Sévérité** : Majeur.

## Verdict

**Approuvable sous réserve** — un seul constat, de portée limitée à un type de champ, mais avec un impact potentiel réel sur l'intégrité d'un registre de risques. Le reste de la FDS (machine à états, garde-fous, messages) est cohérent et suffisamment détaillé.

## Suite donnée

Intégré en FDS v03 : règle de résolution au niveau ligne pour les tableaux dynamiques (union par défaut des lignes non conflictuelles, résolution champ par champ uniquement sur les lignes réellement en conflit — identifiées par un identifiant de ligne stable).
