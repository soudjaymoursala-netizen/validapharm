# Revue multi-experts — Structure Système / Référentiel d'actifs

| | |
|---|---|
| **Référence** | REV-URS-VALIDAPHARM-2026-006 |
| **Version** | 01 (close) |
| **Objet** | Élicitation et revue collégiale d'un nouveau besoin : une section "Structure Système" — référentiel hiérarchique et flexible des systèmes/équipements/utilités/locaux d'un client, partagé entre ses projets, sélectionnable à la création d'un projet, alimentable manuellement ou depuis SAP |
| **Statut** | Close — intégré en URS v17 / AR v17 |

---

## Déjà couvert ? Faisabilité ?

**Couvert** : partiellement, et de façon insuffisante. URS-F-071 (§4.7, Vue portefeuille) offre déjà un "registre/inventaire des équipements et systèmes" — mais c'est une **liste plate**, sans hiérarchie, sans liens configurables, sans sélection à la création de projet. Le besoin exprimé est structurellement différent : un référentiel hiérarchique et partagé, avec une taxonomie configurable par client — un vrai nouveau module, pas une extension de F-071.

**Faisabilité** : oui. Le pattern de liens déjà établi pour `project.links[]` (graphe, URS-F-000ter) est directement réutilisable pour un graphe d'actifs. Le mécanisme de pull déjà posé pour les connecteurs QMS (URS-F-091, réutilisant lui-même les garde-fous de la génération par adaptation) s'applique tel quel à un pull SAP de nomenclature équipement.

## Clarifications obtenues de l'utilisateur (avant débat)

1. Relations mixtes : certains éléments strictement hiérarchiques (un seul parent), d'autres partagés/associés à plusieurs systèmes (typiquement les utilités).
2. Hiérarchie configurable par client (niveaux, libellés, numérotation) — pas de structure imposée par l'outil.
3. Référentiel partagé par client, réutilisé à travers tous ses projets (pas un référentiel par projet).

## Débat du panel

### E5 (Architecte logiciel)

Ce référentiel introduit un **troisième niveau de donnée** (au-dessus du projet, au niveau du client) — comme `client_config`, mais avec une structure bien plus riche. **Isolation stricte par client obligatoire** (même principe que URS-F-024) : rien ne doit permettre qu'un référentiel d'un client soit visible ou mélangé avec celui d'un autre. Par ailleurs, le modèle mixte (parent hiérarchique unique + liens d'association multiples libres) crée un risque technique réel de **cycle** (A parent de B, B associé à A d'une façon qui referme la boucle) — la contrainte d'absence de cycle doit s'appliquer strictement au lien hiérarchique (un arbre), mais peut rester libre pour les liens d'association (un graphe, où les cycles n'ont pas de sens négatif — une utilité peut légitimement "desservir" plusieurs systèmes sans notion de hiérarchie).

**Décision** : retenu — isolation client (nouvelle exigence), contrainte anti-cycle sur le lien hiérarchique uniquement (précision de conception intégrée à l'exigence de structure, pas un ID séparé).

### E3 (QA Réglementaire)

Si un projet référence un nœud du référentiel (ex. "Système 12, ligne de conditionnement"), et que ce nœud est ensuite renommé ou recodifié dans le référentiel (évolution normale d'un référentiel vivant), un livrable déjà "validé en interne" qui cite ce système ne doit **jamais** changer silencieusement de contenu affiché. C'est le même principe que "document de référence non maître" (URS-F-000quater) appliqué ici au nom/code d'un actif.

**Décision** : retenu — **nouvelle exigence** : le lien projet→nœud capture un instantané (nom/code au moment de la liaison) pour la fidélité des exports, tout en conservant le lien vif vers l'identifiant du nœud pour la navigation/vue graphique.

### E2 (Qualité/SMQ)

Si la numérotation/codification est configurable par client, rien n'empêche aujourd'hui deux nœuds de porter le même code par erreur de saisie — confusion potentielle sur le système réellement visé dans un livrable.

**Décision** : retenu — **nouvelle exigence** d'unicité de code, vérifiée à la création/modification d'un nœud au sein du référentiel d'un même client.

### E6 (Métrologie) / E7 (Maintenance)

Proposition : puisque ce référentiel existe désormais, les plans de métrologie/maintenance (catalogue §10.L/M) devraient-ils s'attacher directement à un **nœud du référentiel** plutôt qu'à un lien générique entre sections de projet (mécanisme actuel URS-F-000octies/nonies) ?

**Débat** : E5 et le rédacteur objectent — c'est une refonte architecturale non négligeable (les gabarits L/M sont déjà conçus autour du lien `project.links[]`), pour un gain incertain en Phase 1 où un projet correspond généralement à un seul système. **Reporté explicitement**, à réévaluer une fois le référentiel en usage réel (retour d'expérience nécessaire avant de trancher).

**Décision** : non retenu pour l'instant — noté comme piste d'évolution Phase 2/3.

### E4 (CSV)

Ce référentiel devient une donnée maîtresse dont dépendent les projets — un nœud erroné (ex. mauvais code équipement) pourrait affecter plusieurs projets simultanément. Faut-il un mécanisme de revue d'impact rétrospective, comme pour le moteur de calcul (URS-NF-046bis) ?

**Débat** : le rédacteur note que le garde-fou de l'instantané (E3, ci-dessus) limite déjà fortement ce risque — un projet déjà validé ne serait pas rétroactivement affecté par une correction de nœud, puisqu'il porte sa propre copie figée. Le risque résiduel (une erreur découverte *avant* validation, sur un projet en cours) est couvert par le journal d'anomalies déjà existant (URS-NF-053).

**Décision** : non retenu — déjà suffisamment couvert par les mécanismes existants (instantané + journal d'anomalies).

## Synthèse des amendements

| # | Origine | Type | Impact |
|---|---|---|---|
| 1 | Panel | Nouvelle famille de fonctions | URS-F-100 à 100decies |
| 2 | E5 | Garde-fou (isolation) | URS-F-100 (clause d'isolation intégrée) |
| 3 | E3 | Nouvelle exigence (instantané) | URS-F-100decies |
| 4 | E2 | Nouvelle exigence (unicité) | URS-F-100nonies |
| — | Panel | Nouveaux risques | AR-R-51 à R-53 |

## Statut

Clôturé le 22/08/2026. URS passe en v17, AR en v17 (53 risques). Nouvelle famille catalogue §10.O. **FS/FDS/SDS restent à compléter** pour cette capacité, en plus des connecteurs QMS déjà en attente (REV-URS-005).
