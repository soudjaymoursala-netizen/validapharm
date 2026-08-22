# Revue multi-experts de la FS v06 — connecteurs QMS + Structure Système

| | |
|---|---|
| **Référence** | REV-FS-VALIDAPHARM-2026-002 |
| **Version** | 01 (close) |
| **Objet** | Revue contradictoire des sections §4.9/§4.10 ajoutées en FS v06 (connecteurs QMS tiers, Structure Système) |
| **Statut** | Close — amendements intégrés en FS v07 (clarifications, aucun nouvel ID URS) |

---

## Points soulevés

### 1. E5 — Reparentage d'un nœud non spécifié

**Constat** : §4.10 décrit la création d'un nœud avec `parent_id`, mais rien ne décrit ce qui se passe si un nœud est **déplacé** dans la hiérarchie (changement de `parent_id` après coup) — cas réaliste (une entreprise réorganise sa nomenclature). Faut-il journaliser, contrôler l'absence de cycle à chaque reparentage (pas seulement à la création) ?

**Décision** : retenu — clarification : tout reparentage revalide l'absence de cycle (même contrôle qu'à la création) et est journalisé au même titre que toute modification de nœud (URS-F-100octies déjà Must). Les instantanés déjà capturés (URS-F-100decies) ne sont jamais affectés par un reparentage — un livrable déjà lié reste fidèle à ce qu'il était au moment du lien.

### 2. E3 — Contenu exact non visible avant confirmation de push

**Constat** : §4.9 exige une confirmation à trois niveaux (client/système/tenant) avant tout push, mais ne précise pas que l'utilisateur voit le **contenu exact** qui sera transmis avant de confirmer — la confirmation porte sur la destination, pas sur ce qui part.

**Décision** : retenu — clarification : la confirmation affiche un résumé du contenu (référence, titre, statut, version) en plus de la destination — cohérent avec le niveau de transparence déjà appliqué au chat (URS-F-034).

### 3. E4 — Granularité du pull non explicite

**Constat** : §4.9 dit que le pull "réutilise les mêmes garde-fous que la génération par adaptation" (§4.1bis), mais celle-ci génère une section entière depuis un document de référence — alors qu'un pull QMS importe typiquement des **champs précis** dans une section existante (ex. remplir les caractéristiques techniques d'un équipement depuis SAP). Le parallèle est juste dans l'esprit (statut `propose_par_ia_non_valide`, validation obligatoire) mais la granularité diffère.

**Décision** : retenu — clarification explicite : le pull s'applique champ par champ (ou groupe de champs), chaque champ importé porte individuellement le statut "proposé — non validé" jusqu'à confirmation, sans exiger que toute la section environnante soit reclassée.

## Point non retenu

**E2 — Restriction de rôle pour modifier manuellement le statut de qualification d'un nœud.** Jugé disproportionné en Phase 1 mono-utilisateur (même limite déjà reconnue et documentée ailleurs, ex. VMP §5) — à réexaminer explicitement en Phase 3 (multi-utilisateur, rôles réels).

## Statut

Clôturé le 22/08/2026. Trois clarifications intégrées en FS v07, aucun nouvel ID URS/AR (élaborations d'exigences déjà Must).
