# Rapport d'audit — FDA (simulation) — FS v07 (connecteurs QMS + Structure Système)

| | |
|---|---|
| **Référence** | AUDIT-FDA-VALIDAPHARM-2026-004 |
| **Version** | 01 (close) |
| **Statut** | Close — constat intégré en FS v08 |

---

## Constat

### MAJ-01 — Rappel de transfert de responsabilité non étendu aux données maîtresses d'actifs échangées avec SAP

**Constat** : URS-F-028ter/FS §4.3 imposent un rappel explicite de transfert de responsabilité réglementaire à l'export d'un **livrable**. Mais §4.10 (pull/push de données de nomenclature équipement via le connecteur SAP, URS-F-100septies) ne prévoit **aucun rappel équivalent** pour les données maîtresses d'actifs elles-mêmes — un `asset_node` (nom, code, statut de qualification) exporté/synchronisé vers SAP est aussi potentiellement une donnée réglementée une fois reprise dans le système du client, au même titre qu'un livrable.

**Analyse** : l'analyse "predicate rules" de l'URS §6 raisonne en termes de "livrables" — les données maîtresses d'actifs n'y sont pas explicitement couvertes, alors qu'elles peuvent tout autant alimenter un DMR/DHF côté client.

**Sévérité** : Majeur.

## Verdict

**Approuvable sous réserve.**

## Suite donnée

FS v08 : le pull/push de données `asset_node` via un connecteur QMS porte le même principe que URS-F-028ter (rappel de responsabilité au moment de l'échange), sans nouvel ID URS — élaboration explicite du périmètre déjà couvert par l'analyse predicate rules (URS §6), qui n'était pas limitée aux seuls "livrables" dans son intention mais ne le disait pas assez clairement.
