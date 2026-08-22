# Revue multi-experts de la SDS — REV-SDS-VALIDAPHARM-2026-001

| | |
|---|---|
| **Référence** | REV-SDS-VALIDAPHARM-2026-001 |
| **Version** | 01 (close) |
| **Objet** | Revue contradictoire de `22-SDS-outil.md` v01 par le panel E1-E7 |
| **Documents en entrée** | SDS v01, FDS v04, URS v12, AR v13 |
| **Statut** | Close — amendements intégrés en URS v13 / AR v14 / SDS v02 |

---

## Points soulevés et débat

### 1. E1 — Isolation des secrets par client non spécifiée

**Constat** : §7 décrit un stockage de secrets "non versionné", générique. Mais l'isolation stricte par client est déjà Must (URS-F-024, pour les gabarits/fournisseurs) — rien ne garantit explicitement que la clé API du fournisseur d'un client A ne puisse jamais être utilisée pour un appel concernant un client B, au niveau du stockage technique lui-même.

**Décision** : retenu — clarification SDS §7 (élaboration technique de URS-NF-044 + URS-F-024 déjà combinés, pas de nouvel ID).

### 2. E2 — Atomicité/rollback de la migration de schéma non spécifiée

**Constat** : §3 décrit le déclenchement d'une migration mais rien sur ce qui se passe si elle échoue en cours d'exécution — risque de données dans un état intermédiaire incohérent, sans sauvegarde préalable ni mécanisme de retour arrière.

**Débat** : E4 confirme — c'est un point classique CSV : toute migration de données réglementées doit être précédée d'une sauvegarde vérifiable et prévoir un rollback testé.

**Décision** : retenu — **nouvelle exigence URS** (renforce URS-NF-046, qui exigeait une migration "testée" sans préciser l'atomicité).

### 3. E4 — Portail de qualité (CI gate) non concrétisé

**Constat** : §4 dit que les tests unitaires sont "exécutés... avant toute fusion de code" — une pratique déclarée, pas un mécanisme technique d'application. Ce point avait été explicitement repéré par l'audit du cabinet de conseil GxP sur la FDS et **renvoyé à la SDS** — c'est le moment de le concrétiser.

**Débat** : consensus — pour un système catégorie 5, la maîtrise des changements doit être **techniquement appliquée** (un pipeline qui bloque la fusion si les tests échouent), pas seulement une discipline déclarée.

**Décision** : retenu — **nouvelle exigence URS** (mécanisme de maîtrise des changements techniquement appliqué, pas seulement documenté).

### 4. E5 — Contrat d'erreur du `ProviderAdapter` non spécifié

**Constat** : §6 décrit l'interface `envoyerMessage()` mais ne précise pas le contrat d'erreur (timeout, quota dépassé, réponse malformée) — pourtant la bascule automatique vers le modèle local (URS-F-033) dépend entièrement de la capacité à détecter fiablement qu'un fournisseur cloud n'est "pas joignable".

**Décision** : retenu — clarification SDS §6 (élaboration technique de URS-F-033 déjà Must, pas de nouvel ID).

## Point examiné et non retenu

**E6/E7 — Traitement technique spécifique pour les types de gabarits Métrologie/Maintenance.** Examiné explicitement : aucun besoin technique distinct identifié à ce niveau — ces gabarits utilisent le même schéma générique `section`/`template_type` que tout autre gabarit du catalogue, sans particularité d'implémentation. **Non retenu**, confirmation que la conception générique suffit.

## Synthèse des amendements

| # | Origine | Type | Impact |
|---|---|---|---|
| 1 | E1 | Clarification | SDS §7 |
| 2 | E2 | Nouvelle exigence | URS-NF-046ter (renommé en quater si collision), AR-R-45, SDS §3 |
| 3 | E4 | Nouvelle exigence | URS-REG-004, AR-R-46, SDS §4 |
| 4 | E5 | Clarification | SDS §6 |

## Statut

Clôturé le 22/08/2026. URS passe en v13, AR en v14 (46 risques), SDS en v02.
