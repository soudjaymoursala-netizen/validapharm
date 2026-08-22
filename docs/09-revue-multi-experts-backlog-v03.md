# Revue multi-experts du backlog URS v03

| | |
|---|---|
| **Référence** | REV-URS-VALIDAPHARM-2026-002 |
| **Version** | 01 |
| **Document revu** | URS-VALIDAPHARM-2026-001 v03, AR-VALIDAPHARM-2026-001 v03 |
| **Panel** | E1 Fournisseur/IA-GAMP5-Part11, E2 Qualité/SMQ pharma, E3 QA Réglementaire, E4 Expert CSV |

---

## 1. Méthode

Les besoins de ce backlog (gestion de projets, assistant de stratégie de qualification, gabarits d'export client, génération par adaptation, catalogue de gabarits élargi) ont été débattus par les 4 experts **au fil de leur élicitation** avec l'utilisateur — le détail de chaque échange contradictoire figure dans la conversation source. Ce document (a) **consolide** les décisions déjà actées, et (b) ajoute une **passe de cohérence transversale** entre les nouvelles fonctions, qu'une revue point par point ne peut pas capturer.

## 2. Consolidation des décisions déjà actées

| Thème | Décision | Exigences URS concernées |
|---|---|---|
| Gestion de projets | Must, Phase 1 — conteneur Projet, sections liées, section Documents non-maître | URS-F-000 à 000sexies |
| Assistant de stratégie de qualification | Grille déterministe (jamais l'IA seule pour la conclusion), IA limitée à l'extraction assistée validée par l'utilisateur | URS-F-050 à 054 |
| Gabarits d'export client | Isolation stricte par client, contenu identique au gabarit par défaut (testé), checklist des éléments obligatoires | URS-F-023 à 026 |
| Génération par adaptation | Validation section par section obligatoire, confirmation IP avant usage, signalement des données techniques reprises, traçabilité de la source | URS-F-060 à 064 |
| Catalogue de gabarits | Ajout URS, DQ, Validation de procédé, VMP autonome, ACFC, Computer System Assessment (délimité vs CSV) | Catalogue §10 |
| Priorité Phase 1 | Contenu/raisonnement GMP avant workflow d'approbation | URS-NF-043 |

## 3. Passe de cohérence transversale (nouveau — cette revue)

### 3.1 Interaction génération par adaptation (F-060) × export personnalisé (F-023)

- **E4 (CSV)** — point soulevé : rien dans l'URS actuelle n'empêche qu'un livrable contenant encore des sections au statut "proposé par IA — non validé" (URS-F-061) soit exporté — y compris vers un gabarit client (F-023), où la mise en forme spécifique du client pourrait ne pas reprendre le marquage visuel distinctif prévu par URS-NF-003. Un tel export pourrait donner l'apparence d'un document entièrement validé alors qu'il ne l'est pas.
- **E3 (Réglementaire)** : confirme le risque — c'est exactement le type de défaut qui transforme un garde-fou interne (bon) en faille au moment où le document sort de l'outil (mauvais). Exige un contrôle bloquant ou, a minima, un avertissement explicite au moment de l'export.
- **E1 (Fournisseur)** : facile à implémenter — un contrôle avant génération du fichier d'export, indépendant du gabarit (par défaut ou personnalisé), qui vérifie s'il reste des sections non validées.
- **E2 (Qualité)** : d'accord, précise que l'avertissement doit être configurable (bloquant par défaut, avec possibilité de forcer l'export en connaissance de cause si l'utilisateur veut partager un brouillon explicitement en l'état).

**Décision — AMENDEMENT (URS-F-027, nouveau)** : *"Le système DOIT avertir explicitement, et bloquer par défaut, l'export d'un livrable contenant encore des sections au statut 'proposé par IA — non validé', quel que soit le gabarit d'export utilisé (par défaut ou personnalisé). L'utilisateur DOIT pouvoir forcer l'export malgré l'avertissement, l'action étant alors journalisée."* Priorité Must.

### 3.2 Interaction assistant de stratégie de qualification (F-050) × Projet (F-000)

- **E4** : l'assistant devrait pouvoir s'appuyer non seulement sur un Change Control joint, mais sur l'ensemble des sections liées du même Projet (ex. Contexte, URS) pour une évaluation plus complète.
- **E1** : déjà couvert par URS-F-000quinquies ("les sections et documents déjà présents dans le même projet") — pas d'amendement nécessaire, juste une clarification de lecture croisée entre §4.0 et §4.6.

**Décision** : pas de nouvel amendement, ajout d'une note de renvoi entre URS-F-050 et URS-F-000quinquies.

### 3.3 Catalogue de gabarits — nouveaux types sans gabarit détaillé

- **E2** : signale que l'ajout de URS, DQ, Validation de procédé et VMP autonome au catalogue (§10) ouvre des types de livrables sans que leur structure interne (sections, champs) soit encore définie — contrairement aux 13 gabarits historiques déjà détaillés dans la v1 de l'outil.
- **E3 / E4** : d'accord, ce n'est pas un défaut de l'URS (qui reste au niveau des exigences, pas de la conception détaillée), mais un point à ne pas perdre : ces 4 nouveaux types devront être spécifiés en détail lors de la FS/conception, avec le même niveau de rigueur normative que les gabarits existants (citations ASTM E2500/Annexe 15 déjà disponibles dans cette session).

**Décision** : pas d'amendement URS — action de suivi notée pour la phase de conception détaillée (FS), pas bloquante pour l'approbation de l'URS.

## 4. Mise à jour de l'analyse de risque

Ajout d'un renvoi : URS-F-027 (nouveau) devient une mesure de maîtrise supplémentaire de **R-13** (suggestion IA confondue avec le contenu officiel) et de **R-19** (donnée obsolète recopiée sans révision) — les deux risques voient leur détectabilité améliorée par ce contrôle à l'export, dernier filet avant qu'un document ne quitte l'outil.

## 5. Statut

Revue close. 1 nouvel amendement (URS-F-027) intégré à URS v04. Aucun point ouvert restant nécessitant un arbitrage utilisateur — le backlog v03 est considéré traité dans son ensemble (conditionné au point mineur du catalogue §10 : mini-outils Transport/Emballage/Méthodes analytiques, priorité basse, non bloquant).

---
*Revue version 01, close le 21/08/2026.*
