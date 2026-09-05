# — Risk Assessment (AMDEC) autonome: méthodologie client généralisée

**Statut**: Terminée (28/08/2026). ****. Premier des 3 chantiers P1 restants du plan `VISION_NORTH_STAR_CONVERGENCE.md`, engagé après une `AskUserQuestion` où l'utilisateur a choisi explicitement l'ordre: "commence par 1 [Risk Assessment] puis 2 [Compliance Engine] et 3 [Knowledge Graph] sans t'arrêter sauf besoin d'une décision".

## 1. Contexte et découverte

Trois documents indépendants du dépôt documentent la même dette technique:

- `CURRENT_ARCHITECTURE.md` (Current Technical Debt #2): *"AMDEC non autonome — le calcul IPR n'existe que comme sous-section du gabarit DQ, pas comme module de risque indépendant."*
- `LEGACY_MAPPING.md` (fiche `calculerIPR.ts`): *"Target Equivalent: logique de scoring d'un futur RiskAssessment/AMDEC, avec Parameter/CriticalParameter en amont"* — statut final **KEEP** (le calcul) + **EXTEND** (le rattachement).
- `VISION_NORTH_STAR_CONVERGENCE.md` §3 (couche 14, Compliance Engine) et la roadmap P1 citent "Risk/Impact Assessment à méthodologie client généralisée" comme restant.

`calculerIPR.ts` (S×O×D = IPR) est correct et déjà testé — la dette n'est jamais dans le calcul, seulement dans son absence de point d'ancrage autonome.

## 2. Recherche de grounding réel

Avant toute conception, recherche Google Drive (`fullText contains 'AMDEC' or fullText contains 'FMEA'`). Résultat pertinent: **`Processus_AMDEC.xlsx`** (fichier Drive id `1ejISitTe3e00QSzAiFzp84P6-xsAj3Li`) — un modèle AMDEC générique (non spécifique pharma, exemple "location de voiture"), lu intégralement.

Structure confirmée par ce document réel:

| Colonne du modèle | Correspondance dans ce lot |
|---|---|
| Étape du processus | `etape_processus` |
| Mode de défaillance potentiel | `mode_defaillance` |
| Effet de défaillance potentiel | `effet_defaillance` |
| SEV | `severite_initiale` |
| Cause potentielle | `cause_potentielle` |
| OCC | `occurrence_initiale` |
| Contrôle du processus actuel | `controle_actuel` |
| DET | `detectabilite_initiale` |
| RPN | `ipr_initial` (= IPR, formule identique à `calculerIPR`) |
| Recommandations | `recommandation` |
| Resp. et date cible | `responsable`/`date_cible` |
| Actions menées | `actions_menees` |
| SEV/OCC/DET/RPN (après action) | `*_residuelle`/`ipr_residuel` |

**Fait structurant découvert**: le modèle réel confirme un cycle en **deux temps** — évaluation initiale, puis action, puis évaluation résiduelle (risque résiduel après mitigation). Ce cycle n'existait nulle part dans le dépôt avant ce lot: `calculerIPR.ts` imbriqué dans le gabarit DQ ne capture qu'un score unique, sans notion d'action ni de risque résiduel.

## 3. Conception

### 3.1 Domaine (`logique-metier/domaine/types.ts`)

- `MethodProfileRiskAssessment`: `echelle_min`/`echelle_max`/`seuil_action` configurables par client, `version`/`effective_date`/`source`/`origin` — même patron d'immuabilité versionnée que `MethodProfileACFC`/`MethodProfileImpactAssessment`. Mécanisme délibérément distinct (numérique plutôt que questionnaire Oui/Non): type volontairement séparé, jamais fusionné, même discipline que `EvaluationCSVAssessment` vis-à-vis du moteur Oui/Non générique.
- `RiskAssessment`: une ligne AMDEC, rattachable optionnellement à un `AssetNode` et/ou à un `Parameter` déjà classifié ("en amont" par `LEGACY_MAPPING.md`). `method_profile_version` fige l'échelle/le seuil utilisés — reproductibilité historique même principe que `EvaluationACFC`.

### 3.2 Moteur de décision (`logique-metier/risque/evaluerVerdictRiskAssessment.ts`)

Fonction pure: compare un `ResultatIPR` (déjà calculé par `calculerIPR`, **KEEP**, réutilisé tel quel — aucune seconde implémentation) au seuil d'action. `null` explicite si l'IPR n'est pas calculable (valeurs incomplètes ou hors plage) — jamais un verdict deviné ou un `'acceptable'` par défaut.

### 3.3 Store (`useRiskAssessmentStore.ts`)

- `creerNouvelleVersion`/`creerEvaluation`: même patron exact que `useImpactAssessmentStore` (tri par numéro de version, jamais `created_at`).
- Nouvelle fonction `enregistrerActionResiduelle(clientId, riskAssessmentId, input)`: enregistre recommandation/responsable/date cible/actions menées, recalcule S/O/D et IPR résiduels via l'échelle/le seuil du `MethodProfile` **fixé à la création de l'évaluation** (pas le profil actif courant, qui a pu changer entretemps) — refusée sur un `RiskAssessment` introuvable.

### 3.4 Persistance

Schéma Dexie v27: `methodProfilesRiskAssessment` (`id, client_id, created_at`), `risksAssessment` (`id, client_id, method_profile_id, asset_node_id, parameter_id, created_at`).

## 4. Tests

- `evaluerVerdictRiskAssessment.test.ts` — 5 cas: IPR sous le seuil, IPR au seuil (inclusif), IPR au-dessus, IPR non calculé (valeurs incomplètes), IPR non calculé (hors plage).
- `useRiskAssessmentStore.test.ts` — 9 cas: aucun profil configuré, création de version (immuabilité), IPR sous/au-dessus du seuil, valeurs S/O/D incomplètes (verdict `null`), enregistrement d'action résiduelle (cycle complet), `RiskAssessment` inconnu, isolation stricte par client.

Suite complète (645 tests, 91 fichiers), typecheck et lint: tous verts.

## 5. Vérification navigateur

**Impossible dans ce lot** — aucun écran construit, même discipline que les (Quality Events), 8a (Source Intelligence), 9 (ContentPlan), 13 (Mission/Activity) et 28 (Deliverable readiness): domaine + persistance + store seulement, un consommateur visuel réel viendrait sur besoin démontré plutôt que spéculativement.

## 6. Limites assumées

- Aucun écran `RiskAssessment` — cohérent avec la discipline "domaine avant écran" déjà appliquée à plusieurs reprises dans ce plan.
- Aucune promotion automatique d'un `Parameter` vers `CPP`/`CQA` à partir d'un verdict AMDEC — reste une déclaration humaine explicite et séparée (garde-fou déjà établi, jamais affaibli).
- Le rattachement du gabarit DQ existant (colonne IPR imbriquée) à ce nouveau module autonome n'est pas construit — les deux coexistent sans lien automatique dans ce lot; `calculerIPR.ts`/le gabarit DQ restent inchangés et testés sans régression.
- `Processus_AMDEC.xlsx` est un modèle générique, pas un document AMDEC pharma réel d'un client — contrairement à ACFC/Impact Assessment (calibrés sur Ferring/Sanofi/ISPE réels), aucune source pharma spécifique n'a été identifiée pour ce module; l'échelle/le seuil restent donc entièrement à la charge du client au moment de la configuration, jamais une valeur par défaut ValidaPharm.

## 7. Documentation alignée

- `03-specifications-fonctionnelles.md` v48 — §4.6quinquies.
- `docs/convergence/TECHNICAL_DECISIONS.md` —.
- `docs/convergence/CONVERGENCE_PLAN.md` — terminée, (Template Intelligence) renumérotée.
- `docs/convergence/VISION_NORTH_STAR_CONVERGENCE.md` — item Risk Assessment (AMDEC) de la liste P1 marqué terminé.
