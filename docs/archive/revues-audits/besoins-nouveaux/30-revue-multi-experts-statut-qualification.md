# Revue multi-experts — Statut de qualification et périodicité de requalification

| | |
|---|---|
| **Référence** | REV-URS-VALIDAPHARM-2026-009 |
| **Version** | 01 (close) |
| **Objet** | Extension du référentiel d'actifs (Structure Système) : marquage "soumis à qualification périodique" avec date limite, et statut de qualification standardisé par nœud |
| **Statut** | Close — intégré en URS v20 / AR v20 |

---

## Recherche préalable — terminologie standard

L'utilisateur a explicitement demandé des "statuts standards de l'industrie pharma". Recherche effectuée : il n'existe **pas** de liste de statuts imposée par un texte normatif unique (contrairement, par exemple, aux catégories GAMP 5) — mais une convention de fait, largement partagée entre plans directeurs de validation et plateformes eQMS (Kneat, TrackWise, ValGenesis — déjà identifiées dans la revue littéraire du projet), s'articule autour du cycle de vie qualification/requalification décrit par EudraLex Annexe 15 et les guidances FDA de validation de procédé : qualification initiale → maintien de l'état qualifié → requalification périodique ou déclenchée par événement (remplacement de composant critique, déplacement, mise à jour logicielle, écart de calibration) → déclassement en fin de vie.

**Liste proposée** (huit statuts, cohérente avec cette convention) :

| Statut | Sens |
|---|---|
| Non qualifié | Aucune qualification n'a été menée, ou qualification invalidée |
| En cours de qualification initiale | DQ/IQ/OQ/PQ en cours pour la première fois |
| Qualifié | État qualifié actif |
| Qualifié avec écart(s) ouvert(s) | Qualifié mais un écart/CAPA reste ouvert |
| Requalification requise | Échéance de requalification approchant ou atteinte |
| Requalification en retard | Échéance dépassée sans requalification menée |
| Suspendu / sous contrôle de changement | Temporairement hors état qualifié, changement en cours |
| Déclassé / retiré | Fin de vie, retiré du parc qualifié |

## Déjà couvert ? Faisabilité ?

**Couvert** : partiellement. URS-F-072 (§4.7) prévoit déjà des alertes sur échéance de revue périodique — mais génériquement, sans champ dédié sur le nœud lui-même, et sans statut standardisé. Le référentiel d'actifs (§4.10, v17) n'a pas encore de champ de statut.

**Faisabilité** : oui — extension directe du modèle de nœud déjà posé, réutilise le mécanisme d'alerte déjà existant (F-072) plutôt que d'en créer un nouveau.

## Débat du panel

### E3 (QA Réglementaire)

Un nœud en statut "Requalification en retard" ou "Suspendu" sélectionné pour un nouveau projet est un signal fort — l'utilisateur doit en être averti explicitement au moment de la sélection (URS-F-100quinquies), sans pour autant bloquer (la décision de poursuivre sous risque documenté reste une décision humaine, cohérente avec la philosophie du projet : l'outil avertit, ne décide jamais à la place de l'expert).

**Décision** : retenu — garde-fou d'avertissement (pas de blocage).

### E5 (Architecte)

Le statut ne doit pas être purement déclaratif : le passage à "Requalification requise"/"Requalification en retard" DOIT être **dérivé automatiquement** de la date limite renseignée, dès qu'elle approche ou est dépassée — sinon le champ devient une simple donnée manuelle de plus, aussi peu fiable que si elle n'existait pas. Réutilise le mécanisme d'alerte déjà posé (URS-F-072).

**Décision** : retenu.

### E4 (CSV)

Tout changement de statut, qu'il soit automatique (dérivation par date) ou manuel, DOIT être journalisé — qui/quand/ancien statut/nouveau statut. C'est une donnée de décision qualité, pas un champ anodin.

**Décision** : retenu.

## Point examiné et non retenu

**Blocage strict de la création de projet sur un équipement "Requalification en retard".** Rejeté — cohérent avec le principe déjà établi (l'outil avertit, jamais ne bloque une décision métier légitime, ex. un projet peut précisément *être* la requalification en retard elle-même). Un blocage serait contre-productif.

## Synthèse des amendements

| # | Origine | Type | Impact |
|---|---|---|---|
| 1 | Panel | Nouvelle exigence (périodicité + date limite) | URS-F-102 |
| 2 | Recherche + panel | Nouvelle exigence (statut standardisé, liste fermée) | URS-F-102bis |
| 3 | E5 | Nouvelle exigence (dérivation automatique) | URS-F-102ter |
| 4 | E3 | Garde-fou (avertissement, pas blocage) | URS-F-102quater |
| 5 | E4 | Garde-fou (journalisation) | URS-F-102quinquies |
| — | Panel | Nouveaux risques | AR-R-57/R-58 |

## Statut

Clôturé le 22/08/2026. URS passe en v20, AR en v20 (58 risques). Cinquième capacité en attente pour FS/FDS/SDS.
