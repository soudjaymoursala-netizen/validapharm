# Protocole OQ — Qualification opérationnelle de l'outil ValidaPharm

| | |
|---|---|
| **Référence** | OQ-VALIDAPHARM-2026-001 |
| **Version** | 01 (protocole — résultats non renseignés, développement non démarré) |
| **Document de référence** | VMP-VALIDAPHARM-2026-001, FS-VALIDAPHARM-2026-001, AR-VALIDAPHARM-2026-001 |
| **Rédigé par** | — |
| **Vérifié par** | — |
| **Approuvé par** | — |

---

> ⚠️ **DOCUMENT À REVOIR (audit de cohérence du 21/08/2026)** : protocole rédigé contre URS v01 ("13 gabarits" à OQ-01, registre de risques limité à R-01–R-13) — l'URS est en v20, le registre de risques compte 58 entrées, **et la FS/FDS/SDS sont réécrites (v08/v10/v06)** (voir `03-specifications-fonctionnelles.md`). À réviser avant exécution réelle — la condition qui bloquait cette révision (attente de la FS) est levée.

## 1. Objectif

Vérifier que chaque fonction de l'outil opère conformément à la spécification fonctionnelle, sur toute la plage prévue, avec un effort de test proportionné au risque identifié (AR-VALIDAPHARM-2026-001).

## 2. Prérequis

| Prérequis | Statut |
|---|---|
| IQ approuvé sans écart bloquant | Conforme / Non conforme |
| Jeu de données de test préparé (au moins un livrable de chaque type de gabarit) | Conforme / Non conforme |

## 3. Tests fonctionnels — Moteur de gabarits (risque R-01, R-02)

| Réf. test | Description | Critère d'acceptation | Résultat | Conforme | Exécuté par / Date |
|---|---|---|---|---|---|
| OQ-01 | Créer un livrable pour chacun des 13 gabarits | Chaque gabarit se charge, tous les champs définis sont saisissables | | | |
| OQ-02 | Saisir une valeur dans chaque type de champ (texte, texte long, liste, date, nombre, tableau dynamique) | Chaque type de champ enregistre correctement la saisie | | | |
| OQ-03 | Ajouter et supprimer des lignes dans un tableau dynamique (ex. AMDEC) | Ajout/suppression fonctionne sans perte des autres lignes | | | |
| OQ-04 | Calcul IPR (AMDEC) : tester les valeurs S=1,O=1,D=1 / S=5,O=5,D=5 / valeurs vides | IPR = 1, IPR = 125, IPR non calculé si valeurs vides (pas d'erreur) | | | |
| OQ-05 | Fermer l'outil sans sauvegarde manuelle puis rouvrir | Les données saisies sont conservées (sauvegarde automatique) | | | |

## 4. Tests fonctionnels — Statuts et cycle de vie (risque R-04, R-05, R-13)

| Réf. test | Description | Critère d'acceptation | Résultat | Conforme | Exécuté par / Date |
|---|---|---|---|---|---|
| OQ-10 | Créer un livrable en statut "brouillon d'aide" | Le statut est visible et distinct sur l'export | | | |
| OQ-11 | Engager le cycle "approuvé dans l'outil" sans renseigner les 3 rôles (rédacteur/vérificateur/approbateur) | Le passage au statut "approuvé" est bloqué tant que les 3 rôles ne sont pas renseignés | | | |
| OQ-12 | Approuver un livrable puis tenter de modifier son corps | La modification directe est refusée ; une nouvelle révision tracée est requise | | | |
| OQ-13 | Consulter l'historique des révisions d'un livrable modifié plusieurs fois | Toutes les versions antérieures restent consultables, aucune n'est supprimée | | | |
| OQ-14 | Vérifier qu'une suggestion contextuelle n'apparaît jamais directement dans le champ officiel du document | La suggestion reste dans un panneau séparé jusqu'à copie manuelle par l'utilisateur | | | |

## 5. Tests fonctionnels — Chat expert / routeur IA (risque R-06, R-07, R-12)

| Réf. test | Description | Critère d'acceptation | Résultat | Conforme | Exécuté par / Date |
|---|---|---|---|---|---|
| OQ-20 | Poser une question générale au chat expert, réseau disponible | Réponse fournie via le moteur cloud, avertissement affiché | | | |
| OQ-21 | Couper le réseau puis poser une question | Bascule automatique vers le moteur local, indicateur de changement visible | | | |
| OQ-22 | Ouvrir un livrable en cours de rédaction et poser une question au chat sans action explicite de partage | Le chat ne reçoit que la question, pas le contenu du livrable | | | |
| OQ-23 | Utiliser l'action explicite "joindre ce document à la question" | Une confirmation est affichée avant tout envoi du contenu | | | |
| OQ-24 | Vérifier la présence de l'avertissement "aide, pas avis opposable" sur chaque réponse | Avertissement systématiquement présent | | | |

## 6. Tests fonctionnels — Export et interopérabilité

| Réf. test | Description | Critère d'acceptation | Résultat | Conforme | Exécuté par / Date |
|---|---|---|---|---|---|
| OQ-30 | Exporter un livrable au format Word | Le fichier s'ouvre correctement dans Microsoft Word, contenu fidèle | | | |
| OQ-31 | Exporter un livrable au format PDF (impression) | Mise en page correcte, pas de coupure de tableau | | | |
| OQ-32 | Exporter puis réimporter l'ensemble des données au format JSON | Les données réimportées sont identiques aux données exportées | | | |

## 7. Tests fonctionnels — Synchronisation des données (risque R-03, R-09, R-10)

| Réf. test | Description | Critère d'acceptation | Résultat | Conforme | Exécuté par / Date |
|---|---|---|---|---|---|
| OQ-40 | Modifier un livrable puis déclencher une synchronisation vers Git | Un commit est créé, horodaté et attribué | | | |
| OQ-41 | Déclencher la synchronisation vers le miroir Drive | Le miroir Drive reflète l'état du dépôt Git à l'identique | | | |

## 8. Écarts

| N° | Description de l'écart | Analyse d'impact | Action corrective | Statut |
|---|---|---|---|---|
| | | | | |

## 9. Conclusion

Conclusion générale : ___________________________________________

Décision : ☐ Approuvé sans réserve ☐ Approuvé avec réserves (actions listées) ☐ Non approuvé

---
*Protocole version 01 — à exécuter après IQ approuvé.*
