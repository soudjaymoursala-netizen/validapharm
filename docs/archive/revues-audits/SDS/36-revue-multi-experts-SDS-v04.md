# Revue multi-experts de la SDS v04 — connecteurs QMS + Structure Système

| | |
|---|---|
| **Référence** | REV-SDS-VALIDAPHARM-2026-002 |
| **Version** | 01 (close) |
| **Statut** | Close — amendements intégrés en SDS v05, aucun nouvel ID URS |

---

## Points soulevés

### 1. E5 — Mécanisme d'unicité de code non réaliste sur stockage fichier

**Constat** : §8bis évoque un "index sur `client_id` + `code`" — mais le schéma physique (§3) est un fichier JSON par enregistrement, pas une base de données avec contrainte d'unicité native. Un "index" au sens base de données n'existe pas ici tel quel.

**Décision** : retenu — clarification technique : un fichier `/data/asset_nodes_index/{client_id}.json` maintient la liste des codes déjà utilisés pour ce client, mis à jour de façon transactionnelle (même commit Git que la création du nœud) — vérifié avant toute écriture d'un nouveau nœud.

### 2. E3 — "Vérification périodique" imprécise pour une application côté client

**Constat** : §8bis dit que la dérivation de statut est vérifiée "à l'ouverture et périodiquement" — une application locale-first sans serveur ne peut pas garantir une vérification périodique en arrière-plan fiable (l'onglet peut être fermé, l'ordinateur en veille).

**Décision** : retenu — clarification : la vérification a lieu à l'ouverture de l'application **et** à chaque lecture/affichage d'un `asset_node` (dossier vivant, sélection de projet, etc.) — pas un minuteur d'arrière-plan, cohérent avec l'architecture locale-first déjà posée (cadrage §4 Phase 1).

## Statut

Clôturé le 22/08/2026. SDS v05, aucun nouvel ID URS.
