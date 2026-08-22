# Revue multi-experts de la FDS — REV-FDS-VALIDAPHARM-2026-001

| | |
|---|---|
| **Référence** | REV-FDS-VALIDAPHARM-2026-001 |
| **Version** | 01 (close) |
| **Objet** | Revue contradictoire de `16-FDS-outil.md` v01 par le panel E1-E7 |
| **Documents en entrée** | FDS v01, FS v05, URS v10, AR v10 |
| **Statut** | Close — amendements intégrés en URS v11 / AR v11 / FDS v02 |

---

## Points soulevés et débat

### 1. E1 — Machine à états incomplète : aucun chemin de rejet

**Constat** : le diagramme §3.2 ne montre qu'un chemin heureux (`en_verification` → `en_approbation` → `valide_en_interne`). Rien ne décrit ce qui se passe si l'approbateur final **rejette** la section — retour à quel statut ? Le motif de rejet est-il capturé ?

**Débat** : E2 confirme que c'est un trou classique de conception de workflow qualité — un rejet sans capture de motif est inutilisable pour le rédacteur. Consensus : ajouter une transition explicite de rejet, à n'importe quelle étape de revue/approbation, retournant à `brouillon_aide` avec motif obligatoire dans `revisions[]`.

**Décision** : retenu — clarification FDS, pas de nouvelle exigence URS (complète un comportement déjà implicite dans URS-F-014quater "rôle d'approbateur qui tranche").

### 2. E5 — Flux de résolution de conflit de fusion Git absent de la FDS

**Constat** : URS-NF-045bis exige une interface de résolution assistée pour les conflits de fusion Git entre postes — un Must. La FDS, censée détailler l'expérience utilisateur au-delà de la FS, ne décrit ce flux nulle part.

**Débat** : pas de désaccord — omission reconnue par le rédacteur.

**Décision** : retenu — nouveau flux à ajouter en FDS §3.

### 3. E5 — Moment de sélection de la langue d'une section non spécifié

**Constat** : `section.language` existe dans le modèle (FS §3) mais la FDS ne précise jamais à quel moment de la création d'une section elle est choisie, ni si elle hérite par défaut de `project.language_default`.

**Décision** : retenu — clarification FDS §3.1.

### 4. E4 — Grille de décision de qualification non versionnée comme artefact

**Constat** : §5 de la FDS documente la grille déterministe (URS-F-050) comme une simple table de décision, sans préciser qu'elle doit elle-même être versionnée et testée comme n'importe quel calcul réglementaire (URS-NF-001) — au même titre que le moteur IPR.

**Débat** : E1 rappelle que c'est cohérent avec l'esprit de URS-NF-046bis (traçabilité de version pour revue d'impact) — le même raisonnement s'applique à la grille.

**Décision** : retenu — clarification FDS §5, pas de nouvelle exigence URS (URS-NF-001/046bis couvrent déjà "tout calcul réglementaire").

### 5. E3 — Alerte de revue d'impact CAPA trop faible (bandeau simple vs accusé de réception)

**Constat** : le message U-07 (défaut moteur corrigé, mitige AR-R-39, sévérité S=5) est actuellement conçu comme un bandeau d'information ordinaire, potentiellement ignorable sans action. Vu la sévérité du risque sous-jacent, un simple bandeau est insuffisant.

**Débat** : E2 soutient fermement — un signal de cette gravité doit forcer un accusé de réception explicite (ne peut être masqué qu'après action de l'utilisateur), pas juste être visible.

**Décision** : retenu — **nouvelle exigence URS** (élève le niveau de contrôle attendu, pas une simple précision de mise en forme).

### 6. E6 — Asymétrie non justifiée entre les trois blocages de liens (finalisation vs clôture)

**Constat** : le blocage Contexte procédé et le blocage Métrologie se déclenchent à la "finalisation" (entrée en `en_verification`), tandis que le blocage Maintenance se déclenche à la "clôture" (passage à `valide_en_interne`) — cohérent avec le texte URS (F-000nonies dit explicitement "clôture", aligné sur Annexe 15 §3.12), mais la FDS ne l'explique pas, risque d'être lu comme un bug plutôt qu'un choix délibéré.

**Décision** : retenu — ajout d'une note de justification explicite en FDS §3.3, pas de changement de comportement.

### 7. E2 — Aucune capture de motif obligatoire sur les actions de forçage d'un garde-fou

**Constat** : chaque garde-fou non négociable (export forcé, blocages de liens forcés) journalise l'action (`export_force`, etc.) avec horodatage/acteur, mais **aucun motif texte n'est exigé** de l'utilisateur au moment du forçage. Un journal d'audit qui dit seulement "forcé, par qui, quand" sans "pourquoi" est d'une valeur probante limitée en cas d'inspection réelle.

**Débat** : E3 et E4 soutiennent fortement ce point — c'est une lacune classique d'audit trail. Consensus unanime.

**Décision** : retenu — **nouvelle exigence URS** (renforce un garde-fou déjà Must, pas une simple précision).

## Point examiné et non retenu

**E7 — Rappels de maintenance préventive affichés directement sur la fiche Projet, en plus du tableau de bord.** Jugé redondant avec URS-F-072 (alertes déjà prévues au niveau du tableau de bord/vue portefeuille) — dupliquer l'affichage n'apporte pas de valeur proportionnée à la complexité ajoutée en Phase 1. **Non retenu.**

## Synthèse des amendements

| # | Origine | Type | Impact |
|---|---|---|---|
| 1 | E1 | Clarification | FDS §3.2 |
| 2 | E5 | Nouveau flux | FDS §3 |
| 3 | E5 | Clarification | FDS §3.1 |
| 4 | E4 | Clarification | FDS §5 |
| 5 | E3 | Nouvelle exigence | URS-NF-046ter, AR-R-42, FDS §7 |
| 6 | E6 | Clarification | FDS §3.3 |
| 7 | E2 | Nouvelle exigence | URS-F-027bis, AR-R-43, FDS §7 |

## Statut

Clôturé le 22/08/2026. URS passe en v11, AR en v11 (43 risques), FDS en v02.
