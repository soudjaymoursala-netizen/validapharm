# Revue multi-experts — Export PDF de l'historique de qualification d'un actif

| | |
|---|---|
| **Référence** | REV-URS-VALIDAPHARM-2026-008 |
| **Version** | 01 (close) |
| **Objet** | Extension du dossier vivant (REV-URS-007) : export PDF de synthèse listant l'historique de qualification/validation d'un nœud (dates, protocoles, références/numéros) |
| **Statut** | Close — intégré en URS v19 / AR v19 |

---

## Déjà couvert ? Faisabilité ?

**Couvert** : non. Le dossier vivant (URS-F-101) reste une vue de navigation, pas un export. URS-F-020 exporte un livrable individuel, pas une synthèse agrégée par nœud. Besoin distinct mais mineur en complexité.

**Faisabilité** : oui, directe — réutilise le moteur d'export déjà existant (URS-F-020, mécanisme Word/PDF) appliqué à la liste du dossier vivant plutôt qu'à un seul livrable.

## Débat (léger, vu la portée contenue de l'ajout)

### E4 (CSV)

Une "synthèse d'historique" doit lister **toutes** les occurrences validées dans le temps (ex. les 3 requalifications successives d'un OQ), pas seulement la version courante déjà mise en avant dans la vue dossier vivant (URS-F-101quater) — sinon ce n'est pas un historique, juste un état courant.

**Décision** : retenu — l'export liste chronologiquement toutes les versions validées, pas seulement la dernière.

### E3 (QA Réglementaire)

L'export doit porter les mêmes rappels que tout export standard : "validé en interne — pas une signature électronique opposable" (URS-F-011bis) et, le cas échéant, l'indicateur "en cours d'approbation externe" si un livrable listé a été poussé vers un connecteur QMS tiers (URS-F-092ter) — pour ne jamais laisser croire qu'une ligne de l'historique a un statut réglementaire qu'elle n'a pas.

**Décision** : retenu.

### E3 (complément) — Risque de fausse complétude

Un équipement peut avoir été qualifié pour la première fois **avant** l'adoption de ValidaPharm (historique papier ou autre système) — l'export listera alors un historique qui semble complet mais ne reflète que ce qui a été saisi dans l'outil. Risque réel de mauvaise interprétation en audit ("où sont les qualifications antérieures ?").

**Décision** : retenu — **nouveau risque**, mitigé par un bandeau explicite sur l'export précisant la période/le périmètre couvert par les données ValidaPharm.

## Synthèse des amendements

| # | Origine | Type | Impact |
|---|---|---|---|
| 1 | Panel | Nouvelle exigence (export) | URS-F-101sexies |
| 2 | E4/E3 | Nouvelle exigence (contenu de l'export) | URS-F-101septies |
| — | E3 | Nouveau risque | AR-R-56 |

## Statut

Clôturé le 22/08/2026. URS passe en v19, AR en v19 (56 risques). Quatrième capacité en attente pour FS/FDS/SDS.
