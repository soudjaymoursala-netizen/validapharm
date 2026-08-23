# Revue multi-experts — Connecteurs QMS tiers (Veeva Vault, SAP, TrackWise)

| | |
|---|---|
| **Référence** | REV-URS-VALIDAPHARM-2026-005 |
| **Version** | 01 (close) |
| **Objet** | Élicitation et revue collégiale d'un nouveau besoin exprimé par l'utilisateur : connecter ValidaPharm à des systèmes qualité tiers (Veeva Vault, SAP, TrackWise), en pull (import de données de référence) et en push (envoi d'un livrable validé vers le circuit d'approbation du système cible) |
| **Statut** | Close — intégré en URS v16 / AR v16 |

---

## Déjà couvert ? Faisabilité ?

**Couvert** : non — explicitement exclu (URS §8, "Intégration ERP/QMS tiers", Hors périmètre Phase 1). Décision utilisateur du 22/08/2026 : lever cette exclusion, intégrer maintenant.

**Faisabilité technique** : oui, sans refonte. L'architecture SDS dispose déjà d'un pattern d'adaptateur enfichable (`ProviderAdapter`, §6) pour le routeur IA multi-fournisseurs — le même principe s'étend naturellement à un `QMSConnector` (interface commune, une implémentation par système cible).

## Débat du panel

### E1 (Fournisseur/IA-GAMP5-Part11)

Le **push vers Veeva pour approbation** change en fait favorablement la position du principe "validé en interne ≠ signature Part 11 opposable" (URS-F-011bis) : si le système cible (Veeva Vault) porte sa propre gouvernance de signature électronique conforme Part 11/Annexe 11, ValidaPharm n'a plus besoin de prétendre à cette conformité lui-même — il produit le contenu, le système cible porte la signature réglementaire. C'est une réalisation naturelle du principe déjà posé (URS-F-028ter, transfert de responsabilité à l'export) plutôt qu'une contradiction. **Point favorable, pas un risque nouveau de fond.**

### E5 (Architecte logiciel)

Trois systèmes cibles très différents (Veeva = gestion documentaire qualité, SAP = ERP/données équipement, TrackWise = événements qualité/CAPA) — chacun avec son propre modèle de données et authentification. Construire les trois intégrations complètes en Phase 1 est disproportionné (même logique que "Claude par défaut, extensible" pour les fournisseurs IA). **Proposition** : le **pattern adaptateur** est Must Phase 1 (architecture) ; un **connecteur de référence complet** (Veeva Vault, le plus directement pertinent pour un usage QA pharma) est Should Phase 1 ; SAP/TrackWise restent Could, ajoutables sans refonte via le même pattern.

**Débat** : E4 soutient ce séquencement — cohérent avec le principe fondateur n°6 (extensibilité par conception plutôt que tout construire d'un coup).

**Décision** : retenu.

### E4 (CSV)

Le **pull** de données de référence pose le même risque que la génération par adaptation existante (URS-F-060 à 064, document de référence joint manuellement) — sauf que la source est ici une API externe, pas un fichier chargé par l'utilisateur. Les mêmes garde-fous doivent s'appliquer : validation section par section, signalement visuel des données reprises, traçabilité de la filiation. **Ne pas réinventer un mécanisme parallèle.**

**Décision** : retenu — le pull réutilise explicitement le mécanisme F-060bis à F-064 existant, avec la source `qms_connector_id` en plus de `source_document_id`.

### E2 (Qualité/SMQ)

Le **push** ne doit jamais être un envoi silencieux — cohérent avec les garde-fous déjà posés (F-034 pour le chat, F-062 pour la génération par adaptation) : confirmation explicite du système cible, du contenu exact transmis, avant tout envoi. Par ailleurs, une fois le livrable poussé vers Veeva, ValidaPharm doit clairement marquer que ce livrable est désormais "en cours d'approbation externe" — pas rester silencieusement à son ancien statut interne, qui deviendrait trompeur.

**Décision** : retenu — nouveau statut d'affichage (pas un nouveau statut technique du modèle `section.status`, une méta-donnée `external_submission` indiquant système/date/référence externe).

### E3 (QA Réglementaire)

Risque de contamination croisée entre clients via un mauvais choix de connecteur/tenant au moment du push — même famille de risque que R-18 (document de référence) et R-24 (isolation gabarits/fournisseurs), mais avec une conséquence plus grave ici : un envoi vers le **mauvais tenant Veeva** enverrait un document confidentiel d'un client vers l'espace qualité d'un autre. Exige une confirmation à deux niveaux (client + système + tenant) avant tout push, pas une simple confirmation de contenu.

**Décision** : retenu — garde-fou renforcé.

### E5 (technique, complément) — Fiabilité du push

Que se passe-t-il si l'API du système cible est indisponible ou renvoie une erreur en cours de push ? Sans accusé de réception explicite du système cible, un push pourrait échouer silencieusement (livrable jamais reçu, utilisateur pensant qu'il l'est) ou être envoyé en double (retry naïf sans idempotence).

**Décision** : retenu — le push exige une confirmation de réception explicite du système cible avant que ValidaPharm ne marque l'envoi comme réussi ; retry idempotent (identifiant de transaction unique) en cas d'échec réseau.

## Point examiné et non retenu

**Synchronisation bidirectionnelle continue (webhook temps réel avec Veeva/SAP).** Rejeté pour la Phase 1 — complexité et surface de risque disproportionnées (gestion d'état distribué, résolution de conflit entre deux systèmes de vérité). Le pull et le push restent des actions **explicites et ponctuelles**, jamais un flux automatique continu. Cohérent avec Git = source de vérité exclusive de l'outil (URS-NF-010) : un système tiers ne devient jamais une seconde source de vérité silencieuse.

## Synthèse des amendements

| # | Origine | Type | Impact |
|---|---|---|---|
| 1 | E5 | Nouvelles exigences (architecture + connecteur de référence) | URS-F-090 à 090quater |
| 2 | E4 | Nouvelle exigence (réutilisation garde-fous F-060bis) | URS-F-091 |
| 3 | E2/E3 | Nouvelles exigences (garde-fous push) | URS-F-092 à 092quater |
| — | Panel | Nouveaux risques | AR-R-48 à R-50 |

## Statut

Clôturé le 22/08/2026. URS passe en v16, AR en v16 (50 risques). **FS/FDS/SDS non encore mises à jour pour cette capacité** — à intégrer avant que ces documents de conception puissent être considérés à jour (banni explicitement dans chacun en attendant).
