# Protocole PQ — Qualification des performances de l'outil ValidaPharm

| | |
|---|---|
| **Référence** | PQ-VALIDAPHARM-2026-001 |
| **Version** | 01 (protocole — résultats non renseignés, développement non démarré) |
| **Document de référence** | VMP-VALIDAPHARM-2026-001, AR-VALIDAPHARM-2026-001 |
| **Rédigé par** | — |
| **Vérifié par** | — |
| **Approuvé par** | — |

---

> ⚠️ **DOCUMENT À REVOIR (audit de cohérence du 21/08/2026)** : protocole rédigé contre URS v01/AR v01 — l'URS est en v20, **et les documents de spécification et de conception de l'outil ont depuis été réécrits** (voir `03-specifications-fonctionnelles.md`). À réviser avant exécution réelle — la condition qui bloquait cette révision est levée.

## 1. Objectif

Vérifier que l'outil fonctionne de manière reproductible dans les conditions réelles d'utilisation de l'utilisateur (usage courant, plusieurs sessions, plusieurs postes), sur une période d'observation représentative.

## 2. Prérequis

| Prérequis | Statut |
|---|---|
| OQ approuvé sans écart bloquant | Conforme / Non conforme |
| Période d'observation définie (recommandé : minimum 2 à 4 semaines d'usage réel) | Conforme / Non conforme |

## 3. Protocole d'observation

| Réf. test | Description | Critère d'acceptation | Résultat | Conforme | Date |
|---|---|---|---|---|---|
| PQ-01 | Rédiger au moins un livrable réel de chaque type de gabarit dans le cadre d'un usage professionnel courant | Chaque gabarit est utilisé au moins une fois sans blocage fonctionnel | | | |
| PQ-02 | Changer de poste de travail en cours de période d'observation, cloner le dépôt Git dédié sur le second poste | L'intégralité des données est retrouvée à l'identique, aucune perte constatée | | | |
| PQ-03 | Vérifier l'état du miroir Drive à l'issue de la période d'observation | Le miroir reflète fidèlement le dernier état du dépôt Git | | | |
| PQ-04 | Recenser tout incident de perte de données sur la période | Zéro incident de perte de données constaté | | | |
| PQ-05 | Recenser l'usage du chat expert (nombre de bascules cloud/local constatées, pertinence perçue des réponses) | Bascule cloud/local fonctionnelle à chaque occurrence constatée ; aucune réponse du chat retrouvée intégrée sans validation dans un livrable | | | |
| PQ-06 | Estimer le temps de rédaction d'un livrable type (ex. Change Control) avec l'outil, en comparaison d'une rédaction Word manuelle équivalente | Gain de temps perçu et si possible mesuré, documenté qualitativement | | | |
| PQ-07 | Vérifier qu'aucun calcul réglementaire (IPR, MACO, niveau de risque) n'a été produit ou modifié par le chat expert au cours de la période | Confirmation par revue des livrables produits | | | |

## 4. Écarts

| N° | Description de l'écart | Analyse d'impact | Action corrective | Statut |
|---|---|---|---|---|
| | | | | |

## 5. Conclusion

Conclusion générale : ___________________________________________

Décision : ☐ Outil approuvé pour mise en service ("approuvé dans l'outil") ☐ Approuvé pour usage "aide à la rédaction" uniquement ☐ Non approuvé, actions correctives requises

---
*Protocole version 01 — à exécuter après OQ approuvé. Sa clôture favorable, avec IQ et OQ, permet la rédaction du rapport de validation final de l'outil.*
