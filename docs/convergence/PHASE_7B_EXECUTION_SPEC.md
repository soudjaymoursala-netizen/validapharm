# PHASE 7b — Execution : revue panel avant implémentation

| | |
|---|---|
| **Statut** | Spec de phase (étape "Agentic Planning", même discipline que `PHASE_5_QUALITY_EVENTS_SPEC.md`). Rédigée **avant** tout code, panel collégial E1-E7 (`00-cadrage-projet.md` §6bis). |
| **Sources** | `GAP.md` ligne "Test / Execution / Evidence" (seule source locale nommant précisément `Execution → ExecutionStep → Measurement → ExecutionEvent`) ; `CONVERGENCE_PLAN.md` Phase 7 (risque élevé, séquencement obligatoire) ; Phase 7a déjà livrée (`Test`/`EtapeTest`) comme fondation directe ; principes ALCOA+/intégrité des données déjà actés dans le projet (lecture MHRA GXP Data Integrity, tâche #36) ; principe fondateur n°1 (aucun verdict de conformité automatique attribué par l'outil). |

**Limite déclarée d'emblée** : contrairement à la Phase 5, aucun document du package Target lu jusqu'ici ne détaille les champs de `Execution`/`ExecutionStep`/`Measurement`/`ExecutionEvent` au-delà de leurs noms (`GAP.md` les cite mais ne les définit pas). Cette spec ne fabrique donc pas de détails absents des sources : elle s'appuie sur (a) les 4 noms d'entités confirmés par `GAP.md`, (b) la structure déjà actée de `Test`/`EtapeTest` (Phase 7a) que l'Execution doit exécuter, et (c) des principes déjà écrits ailleurs dans ce projet (ALCOA+, principe fondateur n°1, garde-fous non négociables déjà appliqués aux phases précédentes) plutôt que sur une source neuve non vérifiée.

---

## 1. Constat déclencheur

Phase 7a a livré la chaîne de **définition** (Requirement→TestObjective→TestCandidate→Test). Elle s'arrête volontairement à un `Test` approuvé, sans aucune notion d'exécution réelle. `GAP.md` nomme explicitement la suite : `Execution → ExecutionStep → Measurement → ExecutionEvent`. Sans cette brique, un `Test` approuvé reste un document mort — aucune traçabilité "ce test a-t-il été joué, quand, par qui, avec quel résultat" n'existe.

## 2. Revue panel (E1-E7)

- **E1 (Fournisseur/IA-GAMP5/Part11)** : aucune fonction de ce module ne doit calculer ou attribuer un verdict de conformité automatique. Le système peut agréger un **indicateur** (ex. "3/5 étapes conformes") mais la clôture d'une `Execution` avec un verdict (conforme/non conforme/conforme avec écart) reste **toujours** une action humaine explicite — jamais déduite silencieusement des résultats d'étapes. Aucune génération IA dans cet incrément (cohérent avec Phase 2/5).
- **E2 (Qualité/SMQ)** : une anomalie constatée pendant l'exécution (résultat non conforme, incident) ne doit **pas** créer automatiquement un `QualityEvent` — cohérent avec DEC-002/DEC-055 déjà appliqués en Phase 5 (aucun couplage bloquant/automatique entre modules). `ExecutionEvent` peut référencer *optionnellement* un `QualityEvent` déjà existant ou créé séparément par l'utilisateur, jamais l'inverse.
- **E3 (QA Réglementaire, intégrité des données)** : une fois une `Execution` clôturée, ses `ExecutionStep`/`Measurement` ne doivent **jamais** être modifiés a posteriori (ALCOA+ : un enregistrement d'exécution est un fait daté, pas un brouillon éditable). Une correction nécessaire après clôture passe par un nouvel `ExecutionEvent` de type déviation/commentaire, jamais par une réécriture — même logique que l'audit_log déjà utilisé partout (jamais de mutation silencieuse de l'historique).
- **E4 (CSV)** : une `Execution` hérite implicitement du contexte du `Test` qu'elle exécute (via `test_id`), avec la possibilité de préciser sur quel `AssetNode` précis elle a eu lieu (`asset_node_id` optionnel) — un même `Test` approuvé (ex. protocole IQ générique) pouvant être exécuté sur plusieurs équipements distincts.
- **E5 (Architecte logiciel)** : 4 entités distinctes, pas une fusion :
  - `Execution` = l'instance d'exécution d'un `Test` (un `Test` peut être exécuté plusieurs fois — retest après échec, exécution sur plusieurs actifs).
  - `ExecutionStep` = le résultat constaté pour une `EtapeTest` précise, dans le cadre d'une `Execution` donnée — référence `test_step_id` (l'`id` de l'`EtapeTest` embarqué dans `Test.etapes`), jamais dupliqué en texte libre.
  - `Measurement` = zéro-à-plusieurs valeurs mesurées rattachées à un `ExecutionStep` (une étape peut produire 0, 1 ou plusieurs mesures numériques/textuelles — ex. 3 points de température) ; entité séparée plutôt que champ unique sur `ExecutionStep`, car le nombre de mesures par étape n'est pas fixe.
  - `ExecutionEvent` = un journal d'événements *pendant* l'exécution (anomalie, pause, reprise, commentaire) — distinct du `QualityEvent` (Phase 5) qui est l'objet de gestion qualité formel ; un `ExecutionEvent` peut référencer un `QualityEvent` existant par un `quality_event_id` optionnel, sans jamais en créer un automatiquement.
- **E6 (Métrologie)** : `Measurement` est délibérément générique (`valeur` en texte, `unite` optionnelle) plutôt que strictement numérique — cohérent avec le choix déjà fait pour `Parameter`/`CPP` (Phase 2) de ne pas figer un type de valeur unique sans source le justifiant. Le lien vers un instrument de métrologie qualifié (tâche #31, non engagée) n'est pas fabriqué ici.
- **E7 (Maintenance)** : sans objet direct — aucun champ maintenance spécifique requis par les sources disponibles pour ce module.

## 3. Garde-fous non négociables retenus (testés explicitement)

1. Une `Execution` ne peut être créée qu'à partir d'un `Test` au statut `approuve` (jamais un `Test` en `brouillon`) — cohérent avec la logique déjà appliquée en 7a (Test créé seulement depuis un candidat `retenu`).
2. Une fois `Execution.statut = 'terminee'`, plus aucun `ExecutionStep`/`Measurement`/`ExecutionEvent` ne peut être ajouté à cette exécution — immutabilité post-clôture (ALCOA+).
3. `cloturerExecution` exige un `verdict` explicite fourni par l'appelant — jamais calculé/déduit automatiquement à partir des `ExecutionStep`.
4. Un `ExecutionStep` ne peut référencer qu'un `test_step_id` qui existe réellement dans `Test.etapes` du test exécuté — pas de résultat orphelin.
5. Le lien `ExecutionEvent.quality_event_id` est optionnel et jamais renseigné automatiquement par le système.

## 4. Décision de conception retenue

```text
Execution {
  id, client_id
  test_id, asset_node_id: string | null
  executant
  statut: planifiee | en_cours | terminee
  verdict: conforme | non_conforme | conforme_avec_ecart | null   // null tant que non clôturée, jamais déduit
  date_debut, date_fin: string | null
  audit_log, created_at, updated_at
}

ExecutionStep {
  id, client_id, execution_id
  test_step_id            // référence EtapeTest.id
  resultat: conforme | non_conforme | non_applicable
  observation
  horodatage
}

Measurement {
  id, client_id, execution_step_id
  libelle, valeur, unite: string | null
  horodatage
}

ExecutionEvent {
  id, client_id, execution_id
  type: anomalie | pause | reprise | commentaire
  description
  quality_event_id: string | null   // optionnel, jamais créé automatiquement
  horodatage, actor
}
```

## 5. Périmètre exclu (reporté à 7c ou au-delà)

`Evidence`/`EvidenceLocation`/`ProvenanceLink` (preuve documentaire/fichier attachée à une `Execution` ou un `ExecutionStep`) : Phase 7c, non engagée ici. Cette sous-étape 7b ne couvre que la traçabilité structurée du résultat, pas le fichier de preuve associé.

## 6. Tests obligatoires

- Garde-fou 1 (Execution seulement depuis Test approuvé) et 2 (immutabilité post-clôture) et 3 (verdict jamais déduit) et 4 (test_step_id doit appartenir au Test) — chacun avec un test dédié.
- Scénario nominal complet : Test approuvé → Execution → plusieurs ExecutionStep avec Measurement → clôture avec verdict.
- Vérification explicite qu'un `ExecutionStep` non conforme ne crée **aucun** `QualityEvent` automatiquement (cohérent avec E2/DEC-002).
- Isolation stricte par client (même pattern que toutes les phases précédentes).

---

*Ce document sert de spec de phase — l'implémentation qui suit s'y conforme sans redécider en cours de route ; toute déviation par rapport à ce document doit être justifiée dans le commit.*
