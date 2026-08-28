# Phase 28 — Deliverable Intelligence : calcul de readiness `ContentPlan`

**Statut** : Terminée (28/08/2026). **TD-026**. Deuxième chantier P1 du plan `VISION_NORTH_STAR_CONVERGENCE.md`, engagé sur demande explicite de l'utilisateur de continuer après la Phase 27.

## 1. Contexte et découverte

Investigation de `09_DELIVERABLE_ENGINE.md` (Google Drive) — décrivant la vision cible du "Deliverable Engine" (Content Planner, hiérarchie d'autorité, 5 cas de configuration A-E, `DeliverableVersion`, états `readiness`, formats de sortie, liste des livrables prioritaires) — puis du code existant.

Le type domaine `ReadinessContentPlan` (`logique-metier/domaine/types.ts`), posé en Phase 9 (v26, réalignement sur `01_ARCHITECTURE_MASTER_FINAL.md` §26), porte un commentaire explicite :

> Fourni explicitement par l'appelant à la création, jamais calculé automatiquement par ce module (pas de mécanisme d'évaluation de complétude construit ici).

C'est un gap structurellement identique à celui découvert en Phase 27 pour le Context Engine (TD-025) : un mécanisme documenté depuis longtemps comme *devant* être calculé, mais jamais construit.

## 2. Décision de portée

Trois options soumises explicitement à l'utilisateur via `AskUserQuestion` :

1. **Calcul de readiness (recommandé)** — rendre `ContentPlan.readiness` réellement calculé depuis la chaîne de traçabilité déjà réelle et testée.
2. Détermination des livrables requis — construire un moteur déterminant quels types de livrables un contexte donné exige (plus large, plus ambigu, aucune donnée réelle de référence identifiée).
3. Autre chantier P1 (Compliance Engine généralisé / Risk-Impact Assessment client / Knowledge Graph).

L'utilisateur choisit l'option 1 — le plus petit incrément réel et le mieux borné des trois.

## 3. Conception

### 3.1 Vérification de source avant conception

Avant de fixer la sémantique de calcul, un agent dédié a relu intégralement `01_ARCHITECTURE_MASTER_FINAL.md` (12332 caractères, fichier Drive id `1eOuYS_UFJte87Mqvw-4gss8x_4978pUE`) pour vérifier le texte exact de §26.

**Résultat** : §26 ("Deliverable Engine") définit uniquement la **position** de l'étape "Readiness" dans le pipeline :

```text
Request
→ Resolve Method
→ Resolve Template
→ Resolve Example
→ Context Snapshot
→ Readiness
→ Content Plan
→ Generate
→ Validate
→ Review
→ Render
→ Approve
→ Freeze
```

Les états littéraux `READY`/`NEEDS_INFORMATION`/`NEEDS_REVIEW`/`BLOCKED` **n'apparaissent nulle part** dans ce document (recherche exhaustive du texte complet). Seul `NEEDS_REVIEW` apparaît, dans une section indépendante (§20, "Diagram Intelligence"), sans rapport avec `ContentPlan`.

**Conclusion honnête** : les 4 états `pret`/`besoin_information`/`besoin_revue`/`bloque` proviennent du type domaine déjà posé en Phase 9, pas de §26 lui-même. Cette phase construit le *calcul* de ces états déjà existants ; elle n'invente ni ne corrige leur sémantique, et ne prétend pas citer §26 pour autre chose que la position de l'étape dans le pipeline.

### 3.2 Algorithme

`construireReadinessContentPlan` (`src/logique-metier/deliverable/readinessContentPlan.ts`), fonction pure, sans effet de bord :

- Ancrée sur `ContentPlan.asset_node_id` : `null` → toujours `besoin_information` (rien à résoudre, jamais un `pret` deviné).
- Un `QualityEvent` non clôturé (`statut !== 'cloture'`) sur ce même `asset_node_id` → toujours `bloque`, quel que soit l'état de la chaîne de traçabilité par ailleurs.
- Sinon, résout tous les `Requirement` rattachés à ce nœud. Aucun `Requirement` → `besoin_information`.
- Pour chaque `Requirement` : résout ses `Couverture` → `Test` → `Execution` → `Evidence` :
  - Pas de `Test` couvrant → `besoin_revue`.
  - `Test` encore `brouillon` → `besoin_revue`.
  - `Test` approuvé sans aucune `Execution` → `besoin_information`.
  - `Execution` non `terminee` → `besoin_information`.
  - `Execution` `terminee` avec verdict `non_conforme` → `bloque`.
  - `Execution` `terminee` conforme (ou `conforme_avec_ecart`, qui n'est pas un blocage) sans `Evidence` associée → `besoin_revue`.
  - Chaîne complète → `pret`.
- Les signaux (un par `Requirement`, et par `Execution` si plusieurs) sont combinés par **sévérité pire-cas** (`bloque` > `besoin_information` > `besoin_revue` > `pret`) — jamais une moyenne, jamais le premier trouvé. Même style que `grilleDecision.ts`/`verifierBlocageExport.ts` (Phase 1), déjà établis dans le code base.

Résolution du même patron déjà éprouvé par l'outil `lister_requirements_pour_actif` du Reasoning Engine (Phase 15) et par `assemblerElementsContextSnapshot` du Context Engine (Phase 14) : ancrage sur `asset_node_id`, aucune nouvelle résolution inventée.

### 3.3 Câblage dans le store

`useContentPlanStore.ts` :

- `NouveauContentPlanInput.readiness` **retiré** — plus jamais fourni par l'appelant.
- `creerContentPlan` calcule `readiness` automatiquement via une nouvelle fonction interne `calculerReadiness(clientId, assetNodeId)`, qui recharge `requirements`/`couvertures`/`tests`/`executions`/`evidences`/`qualityEvents` pour le client et appelle `construireReadinessContentPlan`.
- Nouvelle fonction exportée `recalculerReadiness(clientId, contentPlanId)` : recharge la même donnée, recalcule, persiste et journalise (`audit_log`, action `recalcul readiness : <valeur>`). Refusée sur un plan `gele` (`erreur: 'deja_gele'`) ou introuvable (`erreur: 'introuvable'`) — même discipline de garde-fou que `gelerContentPlan`/`validerContentPlan`.
- Le garde-fou existant (`gelerContentPlan` exige `readiness === 'pret'`, URS-F-160septies) reste inchangé — désormais appuyé sur une valeur réellement calculée plutôt que déclarée par l'appelant.

**Changement d'API interne assumé** : `NouveauContentPlanInput.readiness` retiré est cassant, mais une recherche exhaustive dans le code (`grep -rn "creerContentPlan\|NouveauContentPlanInput\|readiness:"`) confirme qu'aucun autre appelant n'existe en dehors du store lui-même et de ses tests — aucun écran ne consomme `useContentPlanStore` (limite déjà documentée en Phase 9, toujours vraie).

## 4. Tests

- `readinessContentPlan.test.ts` — 14 cas : ancre nulle, aucun requirement, requirement non couvert, test brouillon, test sans exécution, exécution en cours, exécution non conforme (bloque), exécution conforme sans preuve, chaîne complète (prêt), `conforme_avec_ecart` n'est pas un blocage, `QualityEvent` ouvert bloque malgré une chaîne complète, `QualityEvent` clôturé ne bloque pas, `QualityEvent` sur un autre nœud ne bloque pas, plusieurs requirements → le pire état l'emporte.
- `useContentPlanStore.test.ts` — 11 cas (4 nouveaux) : cycle nominal avec readiness calculée réellement `pret` (chaîne semée), ancre nulle → `besoin_information` à la création, `recalculerReadiness` reflète une nouvelle `Evidence` apparue après coup, `recalculerReadiness` refusé sur un plan gelé, `recalculerReadiness` refusé sur un plan inconnu, isolation stricte : la traçabilité d'un autre client ne fuit jamais dans le calcul.

Suite complète, typecheck, lint : tous verts (voir commit).

## 5. Vérification navigateur

**Impossible dans ce lot** — aucun écran `ContentPlan` n'existe dans l'application (limite déjà documentée dans `PHASE_9_CONTENT_PLAN_SPEC.md`, jamais close depuis). Vérifié par recherche exhaustive (`grep -rn "useContentPlanStore"`) : seuls le store et ses tests le référencent, aucun composant `.vue`. Ce module reste donc couvert uniquement par sa suite de tests, cohérent avec la discipline déjà appliquée en Phase 9.

## 6. Limites assumées

- Aucun écran `ContentPlan` — hérité de Phase 9, non close par ce lot.
- La détermination de "quels types de livrables sont requis" pour un contexte donné (option 2 non retenue) reste hors périmètre.
- Le domaine "Deliverable" complet (`DeliverableRequest`/`ContentElement`/`DeliverableVersion`, `Generate → Validate → Review → Render → Approve → Freeze`) reste hors périmètre — limite déjà documentée en Phase 9, inchangée.
- La résolution "Example" (troisième niveau de la hiérarchie d'autorité de `09_DELIVERABLE_ENGINE.md`, après Method/Template) n'est pas construite.

## 7. Documentation alignée

- `01-URS-outil.md` v57 — §4.16/URS-F-160octies-nonies.
- `03-specifications-fonctionnelles.md` v47 — §4.16.
- `docs/convergence/TECHNICAL_DECISIONS.md` — TD-026.
- `docs/convergence/CONVERGENCE_PLAN.md` — Phase 28 terminée, Phase 28 (Template Intelligence) renumérotée Phase 29, nouvel item ouvert "Écran `ContentPlan`".
- `docs/convergence/VISION_NORTH_STAR_CONVERGENCE.md` — item Deliverable Intelligence de la liste P1 marqué terminé.
