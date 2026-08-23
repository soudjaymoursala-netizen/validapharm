# Revue multi-experts de la FDS v05 — connecteurs QMS + Structure Système

| | |
|---|---|
| **Référence** | REV-FDS-VALIDAPHARM-2026-002 |
| **Version** | 01 (close) |
| **Statut** | Close — amendements intégrés en FDS v06 (clarifications, aucun nouvel ID URS) |

---

## Points soulevés

### 1. E5 — Flux de configuration de la hiérarchie (`asset_hierarchy_schema`) absent

**Constat** : §3.9 montre la création d'un nœud "selon `asset_hierarchy_schema` du client", mais aucun flux ne décrit **comment** ce schéma est configuré par un client pour la première fois (niveaux, libellés) — pourtant Must (URS-F-100bis).

**Décision** : retenu — flux ajouté : à la première utilisation de la Structure Système d'un client (ou modification ultérieure), un écran de configuration liste les niveaux (ajout/suppression/réordonnancement), avec libellé multilingue par niveau.

### 2. E5 — Effet du reparentage sur le dossier vivant non précisé

**Constat** : le dossier vivant est-il affecté par un déplacement de nœud dans la hiérarchie ?

**Décision** : retenu — clarification : le dossier vivant repose sur les liens directs section↔nœud/projet↔nœud, indépendants de la position hiérarchique — un reparentage ne modifie jamais le contenu d'un dossier vivant.

### 3. E2 — Avertissement de statut dégradé (U-10) : acquittement actif requis

**Constat** : U-10 ne bloque pas (décision déjà actée), mais rien n'empêche qu'il soit ignoré par un clic ailleurs sans lecture réelle.

**Décision** : retenu — clarification : U-10 exige un clic actif ("J'ai compris, continuer") pour être masqué, sans pour autant empêcher la sélection — différent d'un blocage, mais garantit une prise de connaissance active plutôt qu'un simple bandeau ignorable en passant.

## Statut

Clôturé le 22/08/2026. Trois clarifications intégrées en FDS v06, aucun nouvel ID URS.
