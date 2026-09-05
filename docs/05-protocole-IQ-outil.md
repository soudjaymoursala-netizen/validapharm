# Protocole IQ — Qualification d'installation de l'outil ValidaPharm

| | |
|---|---|
| **Référence** | IQ-VALIDAPHARM-2026-001 |
| **Version** | 01 (protocole — résultats non renseignés, développement non démarré) |
| **Document de référence** | VMP-VALIDAPHARM-2026-001 |
| **Rédigé par** | — |
| **Vérifié par** | — |
| **Approuvé par** | — |

---

> ⚠️ **DOCUMENT À REVOIR (audit de cohérence du 21/08/2026)**: protocole rédigé contre URS v01 ("13 gabarits" à IQ-03) — l'URS est en v20, catalogue élargi (15 familles), **et les documents de spécification et de conception de l'outil ont depuis été réécrits** (voir `03-specifications-fonctionnelles.md`). À réviser avant exécution réelle — la condition qui bloquait cette révision est levée.

## 1. Objectif

Vérifier que l'outil ValidaPharm est correctement installé/déployé sur un poste de travail, conformément à la spécification fonctionnelle, avant tout test opérationnel.

## 2. Portée

Poste de travail cible de l'utilisateur (Windows/Mac), dépôt Git dédié, connexion au compte Google Drive de sauvegarde.

## 3. Prérequis

| Prérequis | Statut | Commentaire |
|---|---|---|
| Dépôt Git dédié créé et accessible | Conforme / Non conforme / N/A | |
| Navigateur compatible installé sur le poste | Conforme / Non conforme / N/A | |
| Accès au compte Google Drive de sauvegarde configuré | Conforme / Non conforme / N/A | |
| Documentation de spécification fonctionnelle disponible | Conforme / Non conforme / N/A | |

## 4. Tests d'installation

| Réf. test | Description | Critère d'acceptation | Résultat obtenu | Conforme | Exécuté par / Date |
|---|---|---|---|---|---|
| IQ-01 | Cloner le dépôt Git dédié sur le poste | Le clonage s'effectue sans erreur, la structure de fichiers attendue est présente | | | |
| IQ-02 | Ouvrir l'outil dans le navigateur cible | L'interface se charge sans erreur console, tous les modules/gabarits apparaissent dans le menu | | | |
| IQ-03 | Vérifier la présence des 13 gabarits définis dans l'URS | Les 13 types de documents sont listés et accessibles | | | |
| IQ-04 | Vérifier la configuration de la sauvegarde locale | Une modification de test est conservée après rechargement de la page | | | |
| IQ-05 | Vérifier la configuration de la synchronisation vers le miroir Drive | Un fichier de test synchronisé apparaît dans le dossier Drive dédié | | | |
| IQ-06 | Vérifier l'absence de modification non autorisée du code source par rapport à la version de référence taguée | Comparaison conforme (checksum ou diff Git contre le tag de référence) | | | |
| IQ-07 | Vérifier la disponibilité du mode local du chat expert en l'absence de réseau | Le chat bascule et reste fonctionnel réseau coupé | | | |

## 5. Écarts

| N° | Description de l'écart | Analyse d'impact | Action corrective | Statut |
|---|---|---|---|---|
| | | | | |

## 6. Conclusion

Conclusion générale: ___________________________________________

Décision: ☐ Approuvé sans réserve ☐ Approuvé avec réserves (actions listées) ☐ Non approuvé

---
*Protocole version 01 — à exécuter après développement et approbation du Plan de validation.*
