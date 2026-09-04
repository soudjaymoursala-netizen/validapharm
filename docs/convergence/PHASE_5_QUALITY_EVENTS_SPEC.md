# PHASE 5 — Quality Events : revue panel avant implémentation

| | |
|---|---|
| **Statut** | Spec de phase (étape "Agentic Planning" du cycle de convergence, `CONVERGENCE_PLAN.md` §"Suivi d'avancement"). Rédigée **avant** tout code, conformément au processus de revue collégiale déjà établi (`00-cadrage-projet.md` §6bis, panel E1-E7), appliqué ici explicitement au design d'une phase de code plutôt qu'à une seule révision documentaire — première fois que ce panel est mobilisé sous cette forme dans le chantier de convergence. |
| **Sources** | `03_DOMAIN_DATA_MODEL.md` (liste des entités : `QualityEvent, ChangeControl, Deviation, CAPA, Investigation, AuditFinding, Incident, PeriodicReview`), `02_DECISION_LEDGER_FROM_CONVERSATION.md` (DEC-002, DEC-055), catalogue de gabarits famille H/I. |

---

## 1. Constat déclencheur

Famille H de l'URS (§10) : *"H. Changements & non-conformités \| Change Control, CAPA \| Existant, inchangé"* — seulement 2 des 6 types nommés par le package Target (`ChangeControl`, `CAPA`), sans `Deviation`/`Investigation`/`AuditFinding`. `PeriodicReview` existe déjà, mais classé en **famille I** ("Pilotage projet — Revue périodique"), pas en H. Aucune des deux briques n'a de données d'entrée/sortie définies dans le code (`GAP.md`, ligne "Quality Events" : Total).

## 2. Revue panel (E1-E7, `00-cadrage-projet.md` §6bis)

- **E1 (Fournisseur/IA-GAMP5/Part11)** : aucune fonction de ce module ne doit laisser l'IA classifier automatiquement un `QualityEvent` (sévérité, type, clôture) — cohérent avec le principe fondateur n°1 déjà appliqué partout ailleurs. Pas de génération IA dans cet incrément (comme pour Parameter/CPP/CQA, Phase 2).
- **E2 (Qualité/SMQ)** : les 6 types ne sont pas 6 silos indépendants — un `Deviation` peut déclencher une `Investigation`, qui peut déboucher sur une `CAPA` ; un `AuditFinding` peut aussi déboucher sur une `CAPA` ; un `ChangeControl` peut être indépendant ou lui-même issu d'une `CAPA`. Cette chaîne n'est **jamais obligatoire** (une déviation mineure peut se clôturer sans investigation ni CAPA) — donc modélisée comme des références optionnelles entre événements, pas un workflow figé à étapes obligatoires.
- **E3 (QA Réglementaire)** : le principe non négociable de la cible (DEC-002 : *"Un workflow externe ne bloque pas automatiquement ValidaPharm"* ; DEC-055 : *"External Deviation/Change ne bloque pas une activité indépendante"*) est l'exigence centrale de cette phase. Un `QualityEvent` DOIT porter une origine `interne`/`externe`/`mixte` ; un événement externe est référencé (numéro/système source), jamais dupliqué comme contenu officiel, et ne doit **jamais** bloquer par construction une activité qui n'en dépend pas réellement (aucun garde-fou de blocage automatique à écrire dans ce module).
- **E4 (CSV)** : un `QualityEvent` peut concerner un système informatisé (ex. Change Control sur un SCADA) — rattachable *optionnellement* à un `AssetNode`/`Process`/`ManufacturingContext` (Phase 4), jamais obligatoire (un CAPA organisationnel ne concerne aucun système précis).
- **E5 (Architecte logiciel)** : aucune source lue (package Target ou repo) ne documente de champs distincts par sous-type au-delà du nom — contrairement à l'Assessment générique (Phase 3) où `CSVAssessment` avait un mécanisme réellement différent (catégorie GAMP5 fixe vs questionnaire configurable), rien ne justifie ici 6 formes de données différentes. Décision : **un seul type `QualityEvent` avec un discriminant `type`**, plus une table de références optionnelles entre événements (`ReferenceQualityEvent`) pour la chaîne Deviation→Investigation→CAPA/AuditFinding→CAPA — pas 6 interfaces dupliquées sans justification.
- **E6 (Métrologie)/E7 (Maintenance)** : sans objet direct à ce stade — aucun champ métrologie/maintenance spécifique n'est requis par les sources lues pour ce module ; ne pas fabriquer de lien qui n'est pas demandé.

## 3. Gap documentaire trouvé et à corriger (alignement, porte de sortie de phase)

Famille H de l'URS doit être complétée (Deviation/Investigation/AuditFinding absents) et `PeriodicReview` doit être référencé comme faisant partie du même objet `QualityEvent` que Change Control/CAPA (même s'il reste listé en famille I pour la navigation utilisateur — pas une contradiction si explicité).

## 4. Décision de conception retenue

```text
QualityEvent {
  id, client_id
  type: change_control | deviation | capa | investigation | audit_finding | periodic_review
  titre, description
  origine: interne | externe | mixte
  reference_externe: { systeme, identifiant } | null   // si externe/mixte, jamais dupliqué comme contenu officiel
  asset_node_id | process_id | manufacturing_context_id: optionnels, jamais obligatoires
  statut: ouvert | en_cours | cloture
  audit_log, created_at, updated_at
}

ReferenceQualityEvent {
  id, client_id
  quality_event_source_id, quality_event_cible_id   // ex. Deviation -> Investigation
  created_at
}
```

## 5. Tests obligatoires (scénario `11_USE_CASES_70_SCENARIOS.md` "external deviation/change")

Un `QualityEvent` d'origine `externe` référencé par un autre module (ex. Structure Système) ne doit **jamais** empêcher une opération indépendante sur ce module — testé explicitement (aucun code de blocage n'existe dans ce module, le test vérifie l'absence de couplage bloquant).

---

*Ce document sert de spec de phase — l'implémentation qui suit s'y conforme sans redécider en cours de route ; toute déviation par rapport à ce document doit être justifiée dans le commit.*
