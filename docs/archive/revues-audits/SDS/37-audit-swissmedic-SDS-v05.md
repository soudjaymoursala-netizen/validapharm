# Rapport d'audit — Swissmedic (simulation) — SDS v05

| | |
|---|---|
| **Référence** | AUDIT-SWISSMEDIC-VALIDAPHARM-2026-006 |
| **Version** | 01 (close) |
| **Statut** | Close — constat intégré en SDS v06 |

---

## Constat

### MAJ-01 — Risque de désynchronisation entre le fichier de nœud et son index d'unicité

**Constat** : §8bis (v05) introduit un fichier d'index séparé (`asset_nodes_index/{client_id}.json`) pour l'unicité des codes. Si l'écriture du fichier `asset_node` et la mise à jour de l'index ne sont pas garanties atomiques (ex. interruption entre les deux), l'index et la réalité des nœuds peuvent diverger — un code pourrait apparaître libre dans l'index alors qu'il est utilisé (ou l'inverse).

**Sévérité** : Majeur.

## Suite donnée

SDS v06 : les deux écritures (fichier nœud + mise à jour d'index) sont incluses dans le **même commit Git atomique** (répond au principe déjà établi pour les autres écritures significatives, URS-NF-030) ; au démarrage, une vérification de cohérence légère (comparaison index ↔ liste réelle des fichiers `asset_nodes/*.json`) signale toute divergence sans bloquer l'application.
