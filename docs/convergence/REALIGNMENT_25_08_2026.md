# Réalignement de plusieurs étapes antérieures sur le vrai modèle cible (25/08/2026)

| | |
|---|---|
| **Déclencheur** | Reconnexion de l'accès Google Drive en cours de session (le connecteur MCP Google Drive s'était déconnecté puis reconnecté). Les, 7b, 8a et 9 avaient été construites **sans cet accès**, sur la base de `GAP.md` seul (qui ne fait que nommer les entités du domaine Test/Execution/Evidence et Deliverable Engine, sans les détailler) — chaque spec de phase (`PHASE_7B_EXECUTION_SPEC.md`, `PHASE_8A_SOURCE_INTELLIGENCE_SPEC.md`, `PHASE_9_CONTENT_PLAN_SPEC.md`) déclarait explicitement cette limite. |
| **Action** | Sur demande explicite de l'utilisateur ("relis d'abord tout le reste du drive... puis s'il n'y a plus de gap continue"), lecture intégrale et directe des 17 documents du dossier `10- Architecture détaillée` (`00_README_AND_GOVERNANCE.md` à `15_FINAL_LITERAL_VERIFICATION.md`, `INDEX.md`, `VERIFICATION_RESULT.json`) — jusqu'ici lus une seule fois en tout début de chantier de convergence, dont le détail précis n'était plus disponible dans le contexte au moment de construire 7a/7b/8a/9. |
| **Constat** | Aucune décision déjà actée n'était contredite (pas de fabrication détectée) — mais plusieurs entités/statuts avaient été **simplifiés faute de source disponible**, documenté à chaque fois dans la spec de phase correspondante comme une limite assumée. Ce document corrige ces simplifications maintenant que la source réelle est disponible. |

---

## 1. — `TestCandidate`

- **Avant**: statut à 3 états (`propose | retenu | ecarte`), fabriqué faute de source.
- **Réel** (`10_TEST_ENGINE.md`): 7 états — PROPOSED/NEEDS_INFORMATION/NEEDS_REVIEW/ACCEPTED/REJECTED/DUPLICATE/SUPERSEDED.
- **Corrigé**: `propose | besoin_information | besoin_revue | accepte | rejete | doublon | remplace`. `retenirTestCandidate`/`ecarterTestCandidate` renommés `accepterTestCandidate`/`rejeterTestCandidate`; ajout de `marquerBesoinInformation`/`marquerBesoinRevue`/`marquerDoublon`/`marquerRemplace`. `motif_ecart` renommé `motif_rejet`; ajout `duplique_de_id`/`remplace_par_id`.
- **Non corrigé, documenté comme limite persistante**: `Coverage` (le vrai modèle couvre aussi Risk/Function/Parameter/Alarm/Interlock, pas seulement `Requirement`) reste volontairement scopée à `Requirement` — `Risk` n'existe pas comme entité distincte dans ce codebase (le risque est porté par les `Assessment`), et étendre à `Function`/`Parameter` sans un besoin réel démontré serait une abstraction prématurée. Backlog si un besoin réel apparaît.

## 2. — `ExecutionEvent`

- **Avant**: `type: 'anomalie' | 'pause' | 'reprise' | 'commentaire'`, fabriqué faute de source.
- **Réel** (`01_ARCHITECTURE_MASTER_FINAL.md` §29): `ExecutionEvent → Assessment → Decision → Continue/Action/Retest/Deviation/Change/Stop/External`.
- **Corrigé**: `type: 'continuer' | 'action' | 'retest' | 'deviation' | 'changement' | 'arret' | 'externe' | 'commentaire'` — `commentaire` conservé en plus des 7 décisions réelles pour une observation qui n'appelle aucune décision.

## 3. — Source Intelligence

- **Avant**: `Source → Extraction → KnowledgeItem` + `Conflict`, fabriqué faute de source (`Source` portait directement `systeme`/`reference`, `Extraction` portait directement `contenu_brut`).
- **Réel** (`03_DOMAIN_DATA_MODEL.md`, domaines "Source Intelligence" et "Knowledge"): `Source, SourceVersion, SourceLocation, Extraction, ExtractionItem` / `KnowledgeItem, KnowledgeRelation, Conflict, Confirmation`.
- **Corrigé**: chaîne complète `Source → SourceVersion → Extraction → ExtractionItem → KnowledgeItem`. `SourceLocation` extrait de `Source` (une source peut avoir plusieurs localisations). `SourceVersion` ajouté (numérotation séquentielle). `ExtractionItem` remplace `Extraction.contenu_brut` (une extraction peut produire plusieurs fragments). `Confirmation` ajouté comme enregistrement auditable distinct de la validation/rejet (en plus de `KnowledgeItem.statut`/`valide_par`, gardés en dénormalisé). `KnowledgeRelation` ajouté (lien explicite non conflictuel, distinct de `Conflict`).
- **Non corrigé, documenté comme limite persistante**: `Diagram`/`DiagramNode`/`DiagramEdge` restent hors périmètre (8b, non engagée, per — confirmé plutôt que contredit par cette lecture). Le N:M réel `ExtractionItem↔KnowledgeItem` reste simplifié en N:1 (`KnowledgeItem.extraction_item_id` unique).

## 4. — `ContentPlan`

- **Avant**: `statut: brouillon | valide | gele` seul.
- **Réel** (`01_ARCHITECTURE_MASTER_FINAL.md` §26, `09_DELIVERABLE_ENGINE.md`): `Readiness: READY | NEEDS_INFORMATION | NEEDS_REVIEW | BLOCKED`, un concept distinct du statut de validation du plan lui-même.
- **Corrigé**: ajout de `readiness: 'pret' | 'besoin_information' | 'besoin_revue' | 'bloque'`, fourni explicitement par l'appelant. Nouveau garde-fou: `gelerContentPlan` exige `readiness = pret` en plus de `statut = valide`.
- **Non corrigé, documenté comme limite persistante**: `DeliverableRequest`/`ContentElement`/`DeliverableVersion` (domaine "Deliverable" complet) et la résolution "Example" restent hors périmètre — un `ContentPlan` seul ne prétend pas couvrir tout le pipeline `Request → Resolve Method/Template/Example → Context Snapshot → Readiness → Content Plan → Generate → Validate → Review → Render → Approve → Freeze`, seulement sa première portion.

## 5. Ce qui n'a PAS changé

- à 6: non ré-auditées dans ce passage (hors périmètre de la demande utilisateur, qui portait sur "la suite" après la découverte). Un écart mineur a été repéré en lisant `07_RULES_METHODS_DECISION_ENGINE.md` (réponses ACFC réelles: `YES | NO | UNKNOWN | N/A | NOT_ASSESSED`, potentiellement plus riches que l'implémentation actuelle) — **non corrigé ici**, hors périmètre de cette session de réalignement, à vérifier dans un futur audit dédié si un besoin réel se présente.
- (`Evidence`/`EvidenceLocation`/`ProvenanceLink`): confirmée conforme au domaine réel (`03_DOMAIN_DATA_MODEL.md` nomme exactement ces 3 entités) — aucune correction nécessaire.
- Architecture technique globale (PWA/IndexedDB/Workers serverless plutôt que le "Relational System of Record + Object Storage + Search + Async Workers" du modèle cible, `12_TECHNICAL_SECURITY_LEGACY.md` §34): écart assumé et déjà tranché par, cohérent avec la contrainte IT réelle du poste de l'utilisateur — le package source lui-même prévient explicitement que ces choix techniques viennent après le GAP et peuvent diverger de la cible logique.

## 6. Méthode suivie

Conforme à `14_MASTER_PROMPT_FOR_CLAUDE.md` ("Quand demander une décision: seulement si deux règles sont réellement incompatibles... Sinon, applique la cible et avance"): chaque correction ci-dessus a été appliquée directement, testée explicitement (aucune régression sur la suite existante), puis documentée — sans redemander confirmation phase par phase, conformément à l'instruction explicite de l'utilisateur de "continuer une fois qu'il n'y a plus de gap".
