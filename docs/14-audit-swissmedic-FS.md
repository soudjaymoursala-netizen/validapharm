# Rapport d'audit — Swissmedic (simulation) — FS-VALIDAPHARM-2026-001

| | |
|---|---|
| **Référence** | AUDIT-SWISSMEDIC-VALIDAPHARM-2026-001 |
| **Version** | 01 (close) |
| **Type d'audit** | Simulation d'inspection GxP — systèmes informatisés (référentiel : PIC/S PI 041, Annexe 11 EU GMP, ICH Q9/Q10, GAMP 5, ISPE GAMP AI Guide) |
| **Document audité** | `03-specifications-fonctionnelles.md` v03 |
| **Documents consultés** | URS v08, AR v08, `13-revue-multi-experts-FS.md` |
| **Auditeur** | Claude, en posture d'inspecteur Swissmedic (simulation demandée par l'utilisateur) |
| **Statut** | Close — constats intégrés en URS v09 / AR v09 / FS v04 |

---

## Préambule méthodologique

Cet audit se distingue délibérément de la revue collégiale multi-experts (`13-revue-multi-experts-FS.md`) : il adopte une posture contradictoire d'inspecteur, cherchant les défauts que l'équipe de conception, même exigeante, tend à ne pas voir sur son propre travail — cohérence interne du document, défendabilité en audit réel, rigueur data integrity (ALCOA+), maîtrise documentaire. Les constats sont classés selon une échelle standard d'inspection : **Majeur** (compromet la défendabilité ou la maîtrise du système, correction requise avant approbation), **Mineur** (faiblesse réelle mais d'impact limité, correction recommandée), **Observation** (bonne pratique à considérer, non bloquant).

## Constats

### MAJ-01 — Défaut de maîtrise documentaire : incohérences de version internes au document audité

**Constat** : l'en-tête de la FS v03 référence URS v08 et AR v08. Or le corps du document contient encore, non corrigés :
- §1, ligne 18 : *"chaque exigence de l'URS v07"* — référence à une version dépassée.
- §12, ligne 357 : *"registre de risques à jour (33 entrées)"* — l'AR compte 37 entrées depuis la v08 (R-34 à R-37).

**Base réglementaire** : la maîtrise documentaire (contrôle de version, cohérence interne) est un prérequis de base de tout système qualité GxP (ICH Q10 §4.2 "Document Management") ; un document dont l'en-tête et le corps se contredisent sur l'état de référence ne peut pas être considéré comme maîtrisé, indépendamment de la qualité de son contenu technique.

**Sévérité** : Majeur — pas sur le fond technique, mais sur la forme : un tel écart, trouvé en inspection réelle, génère systématiquement une observation formelle et jette un doute sur la rigueur du processus de revue documentaire (ici, la revue REV-FS-001 elle-même a laissé passer ce défaut de propagation).

### MAJ-02 — Absence de maîtrise du jeu de test de qualification de fiabilité IA

**Constat** : URS-F-032quater/quinquies (mitigeant AR-R-33/R-37) reposent sur un "échantillon de questions-types du domaine pharma/DM" pour qualifier puis re-qualifier un fournisseur IA. La FS ne précise nulle part que cet échantillon doit lui-même être un **artefact versionné et contrôlé**, distinct et stable dans le temps.

**Analyse** : sans cette maîtrise, une re-qualification déclenchée par URS-F-032quinquies pourrait être exécutée avec un échantillon de questions différent (même partiellement) de celui de la qualification initiale — rendant toute comparaison "avant/après" non probante. Le mécanisme entier, présenté comme le garde-fou le plus élevé trouvé lors de la revue précédente (AR-R-37, IPR=48), reposerait alors sur une fondation non défendable en audit.

**Base réglementaire** : PIC/S PI 041 (validation des systèmes informatisés basés sur l'IA) et l'ISPE GAMP AI Guide (déjà cité en URS §6) exigent la traçabilité et la reproductibilité des jeux de données/tests utilisés pour qualifier un composant IA.

**Sévérité** : Majeur.

### MAJ-03 — Absence de mécanisme de revue rétrospective en cas de défaut corrigé du moteur de calcul

**Constat** : le VMP (§8) exige une ré-exécution des tests avant mise à jour du moteur de calcul en cas d'évolution — c'est une mesure **prospective**. Aucun document (FS incluse) ne décrit de mécanisme pour identifier, lorsqu'un défaut est découvert et corrigé dans le moteur de calcul déterministe, les sections déjà passées au statut `valide_en_interne` avec la version défectueuse (`template_engine_version` le permettrait techniquement, mais aucune exigence ne mandate son exploitation à cette fin).

**Analyse** : c'est un point classique d'inspection CSV — la capacité de retracer *a posteriori* quels enregistrements ont été produits par une version défectueuse d'un composant est au cœur de toute action corrective (CAPA) crédible. Le champ `template_engine_version` existe déjà dans le modèle de données (§3) mais n'est exploité, dans la FS actuelle, qu'à des fins de traçabilité descriptive — pas comme déclencheur d'une revue d'impact.

**Base réglementaire** : ICH Q9 (gestion du risque tout au long du cycle de vie), Annexe 11 §10 (gestion des incidents et actions correctives sur systèmes informatisés).

**Sévérité** : Majeur.

### MIN-01 — Rigueur inégale : équivalence de contenu multilingue non testée, contrairement aux gabarits d'export client

**Constat** : URS-F-025 impose un test de non-régression de contenu explicite pour vérifier l'équivalence entre gabarit d'export par défaut et gabarit personnalisé. URS-F-028 affirme une équivalence de contenu équivalente entre langues d'export, mais **aucun mécanisme de test comparable n'est prévu**.

**Analyse** : c'est la même classe de risque (un contenu réputé équivalent mais non vérifié systématiquement) traitée avec deux niveaux de rigueur différents sans justification apparente — le même type d'incohérence que celle relevée par E6/E7 lors de la revue précédente (traitement asymétrique de deux exigences analogues).

**Sévérité** : Mineur.

### OBS-01 — ALCOA+ : horodatage de génération IA vs horodatage de validation humaine non explicitement distingués

**Constat** : `section.generation_source` capture la filiation vers un document source (§4.1bis), mais le modèle de données ne précise pas si `revisions[]` distingue l'horodatage de la **génération** par l'IA de celui de la **validation** humaine ultérieure — un point pertinent au regard du principe "Contemporaneous" d'ALCOA+, potentiellement sensible pour un auditeur data integrity.

**Sévérité** : Observation (le principe cadrage n°2 "ALCOA+ appliqué à l'outil" existe déjà ; ce point est une clarification de mise en œuvre, pas un défaut de conception).

## Points examinés, non retenus comme constats

- **Absence de RBAC (contrôle d'accès par rôle) détaillé** : conforme, car explicitement différé Phase 3 et déjà documenté comme tel (URS §8, FS §5.3). Pas un constat — c'est une limite assumée et déclarée, ce qu'un inspecteur accepte lorsqu'elle est explicite.
- **Contenu du champ `signatures` non détaillé** : relève légitimement de la Spécification de conception (FS §11 le dit explicitement) — pas un constat.

## Verdict

**Non approuvable en l'état** (2 constats Majeurs de fond + 1 constat Majeur de forme). Aucun des trois n'est bloquant pour la poursuite de la cascade documentaire — mais tous doivent être corrigés avant que cette FS puisse servir de base incontestée à la conception détaillée. Cohérent avec le statut actuel du document ("En rédaction", non encore approuvé) — ce constat confirme qu'il ne devait effectivement pas encore l'être.

## Suites données

Intégrées en URS v09 (URS-F-032sexies, URS-NF-046bis, URS-F-028bis), AR v09 (R-38, R-39, R-40) et FS v04 (corrections MAJ-01 à MIN-01/OBS-01).
