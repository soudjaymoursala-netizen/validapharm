# Revue du lot v05 : besoins issus de la revue littéraire eQMS et de la revue technique développeur

| | |
|---|---|
| **Référence** | REV-URS-VALIDAPHARM-2026-003 |
| **Version** | 01 |
| **Document revu** | URS-VALIDAPHARM-2026-001 v05, AR-VALIDAPHARM-2026-001 v05 |
| **Panel** | E1 Fournisseur/IA-GAMP5-Part11, E2 Qualité/SMQ pharma, E3 QA Réglementaire, E4 Expert CSV, **E5 Architecte logiciel/Lead développeur senior (nouveau pour ce tour, angle purement technique)** |

---

## 1. Origine du lot

Sur demande explicite de l'utilisateur, deux recherches complémentaires ont précédé ce tour :
- **Revue littéraire** sur les besoins courants des logiciels qualité pharma (eQMS) et des outils de gestion du cycle de vie de validation comparables (Kneat, ValGenesis) — points A à F.
- **Revue technique développeur (E5)**, indépendante des enjeux GMP, portant sur la robustesse d'ingénierie du logiciel — points 1 à 7.
- Un besoin complémentaire de l'utilisateur : généraliser le routeur IA à plusieurs fournisseurs cloud configurables (pas uniquement Claude), pour s'adapter aux contraintes de chaque client (Copilot, ChatGPT, DeepSeek, etc.).

## 2. Passage en revue par le panel

### 2.1 Points A-D (vue portefeuille) et le point de recherche transversale
- **E2 (Qualité)** : cohérent avec un usage professionnel réel dès qu'on dépasse 2-3 projets simultanés — confirme l'intérêt.
- **E4 (CSV)** : le registre d'équipements (B) est la bonne fondation technique pour rattacher enfin le mini-outil "Revue périodique" (catalogue §10.I), qui restait orphelin depuis son ajout en v03.
- **E1** : faisable — ces fonctions consomment les données déjà structurées par le modèle pivot (projets, sections, statuts), pas de nouvelle source de données à créer.

**Décision** : intégré tel quel (URS-F-070 à 073), priorité Should — fonctions utiles mais non bloquantes pour la Phase 1 minimale.

### 2.2 Point E (qualification fournisseur) et point F (partage lecture seule externe)
- **E3 (Réglementaire)** : confirme que l'évaluation fournisseur est un vrai déclencheur amont dans beaucoup de projets d'achat d'équipement — bien vu.
- **E4** : le partage lecture seule externe (audit) est cohérent avec le principe de moindre privilège — un compte utilisateur complet serait disproportionné pour un accès ponctuel d'audit.

**Décision** : intégrés — E comme nouveau mini-outil (catalogue §10.K), F comme URS-NF-025 (Should, Phase 3 — dépend de l'infrastructure multi-utilisateur).

### 2.3 Revue technique E5 (points 1-7)
- **E5** : détaille chaque point (voir §3 pour le résumé). Insiste particulièrement sur le point 1 (secrets) comme le plus critique — "c'est le genre d'oubli qui cause de vraies fuites en production", et sur le point 2 (conflit multi-onglets) comme risque de perte de données silencieuse, donc contraire au principe ALCOA+ déjà acté dans le cadrage.
- **E4 (CSV)** : confirme que le point 1 (secrets) est également un enjeu GxP indirect — une fuite de clé API pourrait compromettre l'intégrité du routeur IA (usage frauduleux, contournement des garde-fous).
- **E1** : les points 3 (migration de schéma) et 6 (restauration) sont de bonnes pratiques d'ingénierie standard, pas de désaccord.

**Décision** : tous intégrés (URS-NF-044 à 050), priorités Must pour 1, 2, 3, 5 (sécurité/intégrité directe), Should pour 4, 6, 7 (hygiène/confort).

### 2.4 Généralisation multi-fournisseurs du routeur IA
- **E3 (Réglementaire)** — point le plus substantiel de ce tour : chaque fournisseur cloud IA a ses propres conditions de traitement des données (rétention, entraînement sur les données, localisation). Le passage d'un fournisseur unique (Claude, déjà "friendly" GAMP5/Part11 par construction du projet) à plusieurs fournisseurs configurables **réintroduit une hétérogénéité de risque** qu'il faut border explicitement, faute de quoi un client pourrait se retrouver routé vers un fournisseur dont les conditions ne respectent pas son propre accord de traitement des données.
- **E1** : techniquement, le routeur IA (déjà conçu comme couche d'abstraction en FS §6) s'adapte sans refonte majeure — chaque fournisseur devient un connecteur interchangeable derrière une interface commune, cohérent avec le principe d'extensibilité (cadrage §2.6).
- **E4** : la journalisation de session (URS-F-037) doit identifier précisément quel fournisseur/modèle a traité chaque session, pas seulement "cloud/local" — sinon impossible de vérifier après coup qu'un client n'a jamais été routé vers un fournisseur non autorisé pour lui.
- **E2** : demande que la configuration du fournisseur soit documentée au niveau client (comme les gabarits d'export personnalisés, URS-F-024) pour une gouvernance cohérente.

**Décision** : URS-F-032 amendé (multi-fournisseur, Claude par défaut) + URS-F-032bis (configuration par client) + URS-F-032ter (garde-fou : rappel des conditions de traitement avant activation) + URS-F-037 amendé (journalisation du fournisseur exact). Nouveau risque AR R-22.

## 3. Synthèse des risques ajoutés à l'AR (v05)

| ID | Risque | IPR | Mesure |
|---|---|---|---|
| R-22 | Fournisseur cloud activé sans vérification des conditions de traitement | 30 | URS-F-032ter |
| R-23 | Conflit multi-onglets, écrasement silencieux | 27 | URS-NF-045 |
| R-24 | Fuite de secret via commit Git | 30 | URS-NF-044 |
| R-25 | Consommation excessive imprévue (coût) | 12 | URS-NF-048 |

## 4. Statut

Revue close. Tous les points du lot v05 (A-F, 1-7, multi-fournisseur) intégrés à URS v05 et AR v05. Aucun point ouvert bloquant restant à ce stade.

---
*Revue version 01, close le 21/08/2026.*
