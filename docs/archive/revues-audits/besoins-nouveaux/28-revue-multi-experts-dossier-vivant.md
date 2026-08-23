# Revue multi-experts — Dossier vivant d'un actif (documents liés à un nœud)

| | |
|---|---|
| **Référence** | REV-URS-VALIDAPHARM-2026-007 |
| **Version** | 01 (close) |
| **Objet** | Élicitation d'un besoin complémentaire à la Structure Système (REV-URS-006) : depuis un nœud du référentiel d'actifs, accéder directement aux livrables (rapports de qualification, etc.) qui le concernent, en parcourant la hiérarchie |
| **Statut** | Close — intégré en URS v18 / AR v18 |

---

## Déjà couvert ? Faisabilité ?

**Couvert** : partiellement. URS-F-100quinquies (v17) lie déjà un **projet** à un ou plusieurs nœuds. URS-F-073 (recherche transversale) permet une recherche par mot-clé/équipement, mais reste une fonction de recherche ponctuelle, pas une vue persistante "dossier" attachée au nœud. Le besoin exprimé est distinct : une **navigation** depuis la structure hiérarchique jusqu'au document, pas une recherche.

**Clarification obtenue** : la granularité doit être **par document**, pas seulement par projet — un projet couvrant plusieurs équipements (ex. une ligne de 3 machines) doit permettre à chaque livrable individuel d'être rattaché précisément au(x) bon(s) équipement(s), pas seulement hérité du lien global du projet.

**Faisabilité** : oui, directement. Réutilise le même mécanisme de lien déjà posé pour `project.links[]` et pour les liens projet↔nœud (URS-F-100quinquies), simplement étendu au niveau section.

## Débat du panel

### E5 (Architecte)

Le lien section↔nœud doit être **additif**, pas remplaçant : par défaut, une section hérite des nœuds liés à son projet (comportement actuel), et l'utilisateur peut **affiner** explicitement si une section précise ne concerne qu'un sous-ensemble des nœuds du projet. Pas d'obligation de ressaisie systématique — sinon la fonction serait trop lourde pour un usage courant.

**Décision** : retenu tel quel — c'est la clarification déjà obtenue de l'utilisateur.

### E4 (CSV)

Le "dossier vivant" ne doit **jamais** présenter un brouillon non validé comme s'il s'agissait du document officiel — quelqu'un qui cherche "le rapport de qualification de l'équipement X" doit tomber par défaut sur la dernière version **validée**, avec les brouillons/versions antérieures accessibles mais visuellement distincts (cohérent avec les garde-fous déjà établis sur le statut, URS-F-011bis).

**Décision** : retenu — filtre par défaut sur "validé en interne", historique complet accessible en un clic.

### E3 (QA Réglementaire)

Si plusieurs revalidations ont eu lieu dans le temps (ex. requalification suite à un changement), le dossier doit afficher clairement laquelle est la version courante et permettre de consulter les précédentes — pas une simple liste plate sans indication de fraîcheur.

**Décision** : retenu — regroupement par type de gabarit avec la version courante mise en avant, historique consultable par livrable (réutilise `revisions[]`, déjà existant).

### E6 (Métrologie) / E7 (Maintenance)

Constat positif, pas une nouvelle demande : la généralisation du lien section↔nœud (proposée par E5 ci-dessus) réalise en partie ce qu'E6/E7 avaient proposé lors de la revue précédente (REV-URS-006) — ancrer les sections Métrologie/Maintenance directement sur un nœud — sans nécessiter la refonte alors jugée disproportionnée. Une section Plan de métrologie peut désormais être directement rattachée à l'équipement concerné, consultable depuis son dossier vivant, **sans avoir eu à changer le mécanisme des garde-fous existants** (URS-F-000octies/nonies, qui restent basés sur `project.links[]`).

**Décision** : pas d'amendement — confirmation que le point précédemment reporté est en grande partie résolu par ce tour, sans effort supplémentaire.

## Point examiné et non retenu

**Interprétation "archiver".** L'utilisateur emploie ce terme, mais la clarification du besoin (navigation vers un document existant, pas une politique de conservation) indique qu'il s'agit d'un accès facilité, pas d'un mécanisme d'archivage formel distinct — celui-ci est déjà couvert par la politique de rétention (FS §5.4). **Non retenu comme nouvelle capacité**, confirmé qu'aucune ambiguïté ne subsiste.

## Synthèse des amendements

| # | Origine | Type | Impact |
|---|---|---|---|
| 1 | Panel | Nouvelle exigence (dossier vivant) | URS-F-101 |
| 2 | E5 | Nouvelle exigence (lien section↔nœud affinable) | URS-F-101bis |
| 3 | E4/E3 | Nouvelles exigences (filtre statut, historique) | URS-F-101ter/quater |
| 4 | Panel | Garde-fou (journalisation) | URS-F-101quinquies |
| — | Panel | Nouveaux risques | AR-R-54/R-55 |

## Statut

Clôturé le 22/08/2026. URS passe en v18, AR en v18 (55 risques). **FS/FDS/SDS portent désormais trois capacités en attente** (connecteurs QMS, Structure Système, dossier vivant) — à intégrer ensemble lors de la prochaine mise à jour de la cascade de conception.
