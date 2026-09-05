# — Cerveau procédural (Procedure/ProcedureStep)

*27/08/2026 — troisième phase du plan `docs/convergence/VISION_NORTH_STAR_CONVERGENCE.md`, priorité P0.*

## 1. Ce qui existe déjà (Comprendre)

- `SourceVersion`: révision numérotée séquentiellement (`numero_version`) par `source_id`, immuable — patron déjà validé pour "ne jamais mélanger silencieusement des versions".
- `MethodProfileACFC`: méthode versionnée, immuable, appliquée pas à pas par un moteur déterministe — le patron le plus proche de ce que la vision demande pour une SOP (§12-15), mais limité à un questionnaire Oui/Non.
- `extraireTexteDocx`/`extraireImagesDocx`: une SOP réelle peut désormais être lue (texte + images incorporées).
- R-21 (`02-analyse-de-risque-outil.md`): risque déjà identifié — confondre un document de référence obsolète avec le document maître. Toute nouvelle entité versionnée doit répondre à ce risque par construction (jamais un champ mutable qui perdrait l'historique).
- Reasoning Engine: 5 outils de lecture (`lister_requirements_pour_actif`, `lister_tests_pour_requirement`, `lister_evidence_pour_test`, `lister_knowledge_items_valides`, `tracer_chaine_technique`).

## 2. Comparer — ce que la vision demande (§12-15) et ce qui est réaliste dans ce lot

La vision décrit une chaîne ambitieuse: lire une SOP → identifier automatiquement étapes/conditions/exceptions/responsabilités → les appliquer → vérifier la conformité. **Décision de portée**: la sous-étape "identifier automatiquement" (extraction de structure depuis du texte libre par IA) n'est **pas engagée dans ce lot** — elle suppose un protocole de suggestion IA avec confirmation humaine explicite (garde-fou non négociable déjà appliqué à `KnowledgeItem`) qui n'a pas encore été conçu ni vérifié. Construire une "extraction automatique" non éprouvée maintenant reviendrait à fabriquer une capacité, contraire à la discipline "ne jamais fabriquer".

**Ce qui est construit dans ce lot**: la structuration elle-même — un humain qui a lu une SOP (assistée par `extraireTexteDocx`) saisit ses étapes dans un modèle structuré, versionné, immuable, exactement le rôle déjà tenu par `MethodProfileACFC` pour l'ACFC. C'est un prérequis nécessaire, pas un remplacement, à toute extraction assistée future: sans structure de destination, aucune suggestion IA n'aurait où se poser.

**Explicitement différé**: le suivi d'exécution (quelles étapes ont été réellement suivies pour une `Mission`/`Activity` donnée, vérification de conformité post-exécution) — même discipline que (Workflow différé): construire la structure d'abord, le suivi d'exécution quand un cas réel le réclame.

## 3. Identifier / Proposer

- `Procedure`: `reference` (identifiant stable, ex. "SOP-QA-012") + `numero_version` (auto-incrémenté par référence, même patron que `SourceVersion`) + `titre` + `effective_date` + `source_id` (optionnel, lien vers la `Source` d'origine si la procédure a été ingérée via) — immuable une fois créée, jamais mutée (une nouvelle révision crée une nouvelle `Procedure`).
- `ProcedureStep`: `procedure_id` + `ordre` + `description` + `obligatoire` (booléen) + `condition` (texte libre optionnel) + `responsable` (texte libre optionnel) — immuable, rattaché à une version précise de `Procedure` (jamais partagé entre versions, pour ne jamais laisser une étape "flotter" entre deux révisions).
- `useProcedureStore`: `charger`, `creerProcedure` (résout `numero_version` en cherchant le maximum existant pour cette `reference`, même logique que `creerSourceVersion`), `ajouterEtape`, `etapesDeProcedure`, `derniereVersion(reference)`.
- Nouvel outil du Reasoning Engine: `lister_etapes_procedure` (paramètre `reference`) — résout automatiquement la version la **plus récente** de cette référence (jamais une version arbitraire), retourne ses étapes dans l'ordre. Étend `DonneesOutilsRaisonnement` avec `procedures`/`procedureSteps`, et `TypeObjetCitable` avec `'procedure_step'`.

## 4. Revue panel (E1-E7, condensée)

- **E1 (Fournisseur/IA-GAMP5-Part11)**: aucune extraction IA de structure dans ce lot (voir §2) — le seul ajout au Reasoning Engine est un outil de lecture supplémentaire, même garde-fou de citation déterministe.
- **E2 (Qualité/SMQ)**: répond directement à R-21 (`02-analyse-de-risque-outil.md`) — `numero_version` empêche de confondre une révision obsolète avec la version applicable; jamais de mutation d'une version déjà créée.
- **E3 (QA Réglementaire)**: traçabilité de la révision par `effective_date`+`numero_version`, cohérent avec le principe "applicabilité historique" de la vision (§14, "Rev.04 → Rev.05").
- **E4 (CSV)**: ajout pur de tables Dexie (v25), aucune table existante modifiée.
- **E5 (Architecte logiciel)**: réutilise le patron `SourceVersion` (numérotation séquentielle) plutôt que d'inventer un mécanisme de version distinct — cohérent avec la discipline "étendre, jamais dupliquer".
- **E6 (Métrologie)** / **E7 (Maintenance)**: sans objet pour cette phase.

**Décision technique associée**:, voir `TECHNICAL_DECISIONS.md`.

## 5. Explicitement non construit (limite assumée)

- Aucune extraction automatique de structure depuis un texte libre (SOP brute) — la structuration reste un acte humain, même discipline que `KnowledgeItem.valeur_interpretee`. Point explicitement laissé ouvert pour une décision produit ultérieure (voir §7).
- Aucun suivi d'exécution/conformité (`ProcedureExecution`) — différé, même discipline que.
- Aucun écran dédié — domaine + persistance + store + outil de raisonnement seulement, même discipline que les autres domaines construits sans écran.
- Aucun lien direct `Procedure` ↔ `Mission`/`Activity` dans ce lot — un rattachement viendra naturellement avec le suivi d'exécution différé.

## 6. Vérification

Tests sur `useProcedureStore` (création, auto-incrémentation de version par référence, isolation par client), sur la résolution de la dernière version par le Reasoning Engine, et sur la citation vérifiable d'un `ProcedureStep`. Suite complète (`npx vitest run`, `npm run typecheck`, `npm run lint`) verte avant commit.

## 7. Point ouvert pour la prochaine session

L'extraction automatique de structure (SOP brute → étapes suggérées) est le prolongement naturel de cette phase et le cœur de la vision (§15), mais représente un saut d'ambition réel (nouveau protocole de suggestion IA avec confirmation humaine, prompt dédié, risque de fabrication si mal cadré) — à trancher explicitement avec l'utilisateur avant de l'engager, plutôt que product-décidé unilatéralement.
