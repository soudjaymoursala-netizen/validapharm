# PHASE 7c — Evidence: revue panel avant implémentation

| | |
|---|---|
| **Statut** | Spec de phase (même discipline que `PHASE_5_QUALITY_EVENTS_SPEC.md` et `PHASE_7B_EXECUTION_SPEC.md`). Rédigée **avant** tout code, panel collégial E1-E7 (`00-cadrage-projet.md` §6bis). Dernière sous-étape — l'Acceptance Criteria elle-même (`CONVERGENCE_PLAN.md`) est démontré à l'issue de cette sous-étape. |
| **Sources** | `GAP.md` ligne "Test / Execution / Evidence": *"`Evidence` traçable et éventuellement native (sans document source)"* — seule phrase source locale, aucun détail de champs. (`Requirement`/`Test`) et 7b (`Execution`/`ExecutionStep`) déjà livrées, fondation directe. Pattern déjà établi deux fois dans ce projet pour la déclaration explicite non déduite: `Couverture` (7a) et `ReferenceQualityEvent`. |

**Limite déclarée d'emblée (comme en 7b)**: aucune source disponible ici ne détaille les champs d'`Evidence`/`EvidenceLocation`/`ProvenanceLink` au-delà des noms. Cette spec ne fabrique donc pas de mécanisme non justifié: elle s'appuie sur (a) la seule phrase source (`GAP.md`), (b) l'architecture réelle déjà actée du projet (dépôt Git dédié = source de vérité exclusive, miroir Drive, aucun stockage de fichier binaire natif dans ce dépôt de conception), et (c) le pattern de déclaration explicite déjà retenu deux fois (`Couverture`, `ReferenceQualityEvent`). Une limitation assumée est documentée explicitement en §5 plutôt que comblée par une invention.

---

## 1. Constat déclencheur

 s'arrête à un `ExecutionStep` constaté (conforme/non conforme) et une `Execution` clôturée avec verdict. Rien ne trace *la preuve* qui substantie ce constat — un simple champ `observation` en texte libre ne suffit pas pour un dossier de validation opposable. `GAP.md` nomme `Evidence` comme la brique manquante, avec une nuance explicite: une preuve peut être **native** (l'observation directe de l'exécutant fait foi, sans fichier source — ex. une lecture d'instrument retranscrite) ou renvoyer à un **document** externe (ex. un export capteur, une capture d'écran).

## 2. Revue panel (E1-E7)

- **E1 (Fournisseur/IA-GAMP5/Part11)**: aucune génération ou qualification automatique d'une preuve par IA — cohérent avec le principe fondateur n°1, déjà appliqué à toutes les phases précédentes.
- **E2 (Qualité/SMQ)**: une `Evidence` doit toujours être rattachée à une `Execution` réelle — pas de preuve orpheline flottant sans contexte d'exécution. Elle peut préciser un `ExecutionStep` particulier (preuve d'une étape précise) ou rester au niveau de l'`Execution` entière (preuve globale, ex. un rapport de clôture).
- **E3 (QA Réglementaire, intégrité des données)**: cohérent avec le garde-fou d'immutabilité déjà retenu en 7b (ALCOA+) — une `Evidence` créée n'est jamais modifiée, seule une nouvelle `Evidence`/un nouvel `ExecutionEvent` peut compléter le dossier. Une `Evidence` ne peut être ajoutée qu'à une `Execution` non encore clôturée ou lors de sa clôture — pas après (même garde-fou d'immutabilité post-clôture que 7b, pour rester cohérent).
- **E4 (CSV) / E6 (Métrologie) / E7 (Maintenance)**: sans champ spécifique requis par les sources disponibles — pas de fabrication.
- **E5 (Architecte logiciel)** — décision structurante, 3 entités:
  - `Evidence`: le fait de preuve lui-même — `type: native | document`, rattaché à une `Execution` (obligatoire) et optionnellement un `ExecutionStep` précis.
  - `EvidenceLocation`: **uniquement** pour une `Evidence` de type `document` — pointeur vers où le document réside (`systeme: github | drive | externe` + `reference`), jamais le contenu binaire lui-même. Cohérent avec l'architecture déjà actée (§5bis: dépôt Git dédié = source de vérité, Drive = miroir) — ce projet ne stocke aucun fichier binaire dans ce dépôt de conception, une `EvidenceLocation` est donc un pointeur, pas un stockage.
  - `ProvenanceLink`: **décision de conception explicite, documentée ici plutôt que devinée en silence** — la traçabilité Execution→Test→Requirement existe déjà par les clés étrangères (`Evidence.execution_id` → `Execution.test_id` → `Couverture`/`TestObjective.requirement_id`). `ProvenanceLink` n'est donc pas nécessaire pour *retrouver* cette chaîne. Sa raison d'être retenue ici: permettre qu'une `Evidence` substantie **explicitement** une `Requirement` précise au-delà de la couverture générique du test (même logique que `Couverture` face à `TestObjective.requirement_id` en 7a — une preuve peut appuyer une exigence que le test n'a pas été conçu à l'origine pour couvrir). Lien explicite, jamais déduit, N:M `Evidence`↔`Requirement`.
- Aucune IA dans ce module (garde-fou, cohérent avec toutes les phases précédentes).

## 3. Garde-fous non négociables retenus (testés explicitement)

1. Une `Evidence` ne peut être créée que pour une `Execution` réelle et non clôturée (immutabilité post-clôture, même règle qu'en 7b pour `ExecutionStep`/`Measurement`/`ExecutionEvent`).
2. Si `execution_step_id` est fourni, il DOIT appartenir à l'`Execution` référencée (pas de résultat orphelin — même garde-fou que 7b pour `test_step_id`).
3. `EvidenceLocation` ne peut être créée que pour une `Evidence` de type `document` existante.
4. `ProvenanceLink` (Evidence↔Requirement) est une déclaration explicite et idempotente — jamais déduite (même garde-fou que `Couverture`).
5. Aucune génération/qualification automatique par IA.

## 4. Décision de conception retenue

```text
Evidence {
  id, client_id
  execution_id, execution_step_id: string | null
  type: native | document
  titre, description
  horodatage, actor
}

EvidenceLocation {
  id, client_id, evidence_id
  systeme: github | drive | externe
  reference
}

ProvenanceLink {
  id, client_id
  evidence_id, requirement_id
  created_at
}
```

## 5. Limite assumée (à ne pas fabriquer au-delà)

Aucune capacité d'upload/stockage de fichier binaire réel n'est construite dans cet incrément — `EvidenceLocation` est un pointeur déclaratif (chaîne de caractères), jamais un flux de fichier. Construire un vrai stockage de document (upload, aperçu, téléchargement) reste un chantier distinct, non engagé ici, cohérent avec le stub déjà existant et non consommé `ProjectDocument` (`status: 'reference_de_travail_non_maitre'`).

## 6. Tests obligatoires — démonstration de l'Acceptance Criteria

Scénario complet et unique couvrant `Requirement → TestObjective → TestCandidate → Test → Couverture → Execution → ExecutionStep → Evidence → ProvenanceLink`, avec une fonction d'interrogation (`preuvesPourRequirement`) démontrant la traçabilité complète Requirement→Test→Execution→Evidence exigée par `CONVERGENCE_PLAN.md` pour clore la. Plus chaque garde-fou listé en §3, testé individuellement, et l'isolation stricte par client (même pattern que toutes les phases précédentes).

---

*Ce document sert de spec de phase — l'implémentation qui suit s'y conforme sans redécider en cours de route; toute déviation par rapport à ce document doit être justifiée dans le commit.*
