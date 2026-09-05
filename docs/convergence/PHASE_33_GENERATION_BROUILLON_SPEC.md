# — Génération de brouillon par adaptation d'un document de référence (§4.1bis)

**Statut**: Terminée (28/08/2026). ****. Répond au besoin spécifié en §4.1bis (documenté depuis la conception initiale, jamais construit), ajoute une limite assumée (voir §6).

## 1. Contexte et découverte

Reprise "dans l'ordre" du backlog après la (mode audit simulé). §4.1bis décrit la génération de brouillon par adaptation d'un document de référence — jamais construite jusqu'ici.

Investigation avant conception: la spécification (§4.1bis) suppose un "document de référence fourni par l'utilisateur, joint via le mécanisme existant de jonction de documents" — le mécanisme d'upload de documents de projet (entité `ProjectDocument`) est modélisé dans le domaine depuis la (v12) mais n'est consommé **nulle part** dans le code: aucun écran d'upload, aucun stockage de contenu ou de texte extrait.

## 2. Décision de portée

`AskUserQuestion` soumise explicitement à l'utilisateur, 3 options:

1. **Référence = section existante du projet (recommandé)** — réutilise le mécanisme déjà construit "joindre section" du chat expert, aucune nouvelle fonctionnalité d'upload.
2. Construire d'abord l'upload générique de documents comme prérequis — périmètre nettement plus large, deux chantiers en un.
3. Référence = texte collé directement par l'utilisateur — le plus simple techniquement.

L'utilisateur répond vouloir **les deux**: "L'utilisateur doit avoir le choix entre coller du texte ou uploader un fichier sous divers formats" — ni la seule référence-section (option 1), ni la seule saisie de texte (option 3), et sans construire l'écran générique complet (option 2 dans son intégralité).

## 3. Conception

### 3.1 `ProjectDocument` enfin consommé, minimalement

`extracted_text: string` ajouté au type (`domaine/types.ts`) — le texte collé directement ou extrait d'un fichier `.docx`/`.pdf` (réutilisation de `extraireTexteDocx`/`extraireTextePdf`, /23, aucune nouvelle dépendance). Un enregistrement réel est créé à chaque génération, lié au projet (`project.documents[]`, `project.audit_log`) — usage honnête et limité du type déjà modélisé: pas l'écran générique de bibliothèque de documents (listing, prévisualisation, suppression, tous types), qui reste backlog.

### 3.2 `genererBrouillonSection` (`logique-metier/generation-brouillon/genererBrouillonSection.ts`)

Fonction pure — même discipline que `proposerStructureProcedureParIA`: protocole de sortie contraint, une ligne par champ proposé:

```
CHAMP|<section_key>.<field_key>|<valeur proposée>
```

Limité aux champs scalaires du gabarit (`texte_court`/`texte_long`/`liste`/`date`/`nombre`) — jamais les lignes d'un `tableau_dynamique` (risque d'hallucination non maîtrisé sur un nombre de lignes/valeurs croisées non contraint, limite assumée §6).

**Garde-fou non négociable**: chaque valeur proposée est revalidée via `validerChamp` (§4.1/, la même fonction que la saisie manuelle) avant d'être acceptée — une option de liste inconnue, un nombre hors plage, une date invalide sont silencieusement rejetés, jamais un état que l'écran de saisie manuelle refuserait lui-même. Un champ inconnu/halluciné (`section_key.field_key` ne correspondant à rien dans le gabarit) est également ignoré.

`origineTechnique: boolean` par champ proposé — `true` si le champ est de type `nombre`: critère déterministe retenu pour "donnée technique/numérique", puisque dans ce moteur de gabarits un champ numérique EST par construction une valeur/tolérance/critère d'acceptation, jamais du texte libre.

### 3.3 `useSectionsStore.genererBrouillonIA`

Orchestration:
1. Refuse si `confirmationDroitUsage` n'est pas `true` — action tracée dans `section.audit_log`, jamais une preuve juridique.
2. Refuse si la section n'est pas `brouillon_aide`, ou si aucun gabarit n'est défini pour son `template_type`.
3. Crée le `ProjectDocument` (filiation du document de référence).
4. Appelle `genererBrouillonSection`.
5. Fusionne les valeurs proposées dans `section.values` — **une valeur déjà saisie par l'utilisateur n'est jamais écrasée**, seuls les champs encore vides sont renseignés.
6. `generation_source.generated_fields` liste uniquement les champs d'origine technique/numérique (pas tous les champs proposés) — c'est ce que l'écran utilise pour le surlignage distinct.
7. Statut → `propose_par_ia_non_valide`. Entrée `revisions` motif "génération assistée", auteur `système (${fournisseur})` (clarification ALCOA+, v04).

### 3.4 Interprétation retenue pour le garde-fou "section par section"

Le texte de la spécification ("chaque section doit être ouverte et explicitement validée/éditée une par une [...] jamais de validation globale en un clic") ne peut pas viser l'objet `Section` du domaine lui-même: une génération ne produit qu'**une** `Section`, avec **un seul** statut et **une seule** transition possible (`propose_par_ia_non_valide → brouillon_aide`, déjà câblée avant cette phase). La "section" visée est donc chaque `DefinitionSection` du gabarit (§4.1 — ex. "Généralités", "Tests").

`EditeurSection.vue` matérialise cette granularité par une checklist locale ("J'ai relu et validé « … »" par `DefinitionSection`), non persistée — recharger la page force une nouvelle relecture complète, cohérent avec l'esprit du garde-fou (aucune confirmation implicite d'une visite antérieure). Le bouton "Valider cette section" reste désactivé tant que la checklist n'est pas complète.

### 3.5 `RenduGabarit.vue`

Prop additif `champsSignales?: readonly string[]` — badge "⚠ donnée reprise du document de référence" sur les champs listés, jamais fusionné avec l'affichage normal. Composant générique inchangé pour tout le reste (règle de conception).

### 3.6 `EditeurSection.vue`

- Bloc "Génération de brouillon par adaptation" affiché uniquement pour une section `brouillon_aide` avec gabarit défini **et** projet rattaché à un client (le fournisseur IA est configuré par client — même garde déjà utilisée pour les gabarits d'export client).
- Choix coller/uploader (radio), extraction `.docx`/`.pdf` via les adaptateurs existants.
- Case de confirmation du droit d'usage (texte U-07 du dictionnaire de messages système).
- Bouton désactivé tant que le texte de référence est vide ou la confirmation non cochée.
- Bloc "Revue du brouillon proposé par IA" affiché pour une section `propose_par_ia_non_valide`: filiation du document, checklist de relecture (§3.4).

### 3.7 Corrections connexes trouvées en cours de conception

- `validerSectionIA` (`useSectionsStore.ts`) ne posait jamais l'entrée `revisions` motif "validation utilisateur" documentée depuis la clarification ALCOA+ (v04) — jamais réellement câblée faute de fonction produisant le statut `propose_par_ia_non_valide` jusqu'ici. Corrigé dans ce lot.

## 4. Tests

- `genererBrouillonSection.test.ts` (nouveau, 7 cas): champs valides acceptés et `origineTechnique` correctement dérivé; valeur de liste non reconnue rejetée; nombre hors plage rejeté; champ inconnu/halluciné ignoré; ligne pour un `tableau_dynamique` ignorée même hallucinée; ligne hors protocole ignorée; texte de réponse brut conservé intégralement.
- `sections.test.ts` (`useSectionsStore`, 6 nouveaux cas): refus sans confirmation; refus hors `brouillon_aide`; cas nominal complet (document créé, valeurs renseignées, `generation_source` correct, filiation résolvable, journal d'audit et revisions corrects); non-écrasement d'une valeur déjà saisie; refus sans gabarit défini; `validerSectionIA` pose bien l'entrée "validation utilisateur" sans toucher à l'entrée "génération assistée".
- `RenduGabarit.test.ts` (2 nouveaux cas): badge affiché uniquement sur les champs listés; aucun badge par défaut.

Suite complète (683 tests, 96 fichiers), typecheck et lint: tous verts.

## 5. Vérification navigateur

Vérifié avec un navigateur Chromium réel (Playwright) contre le serveur de développement: création d'un client puis d'un projet lié, ajout d'une section `contexte_procede`, formulaire de génération visible uniquement dans les conditions attendues, bouton désactivé sans confirmation puis activé, génération réussie (requête réseau interceptée portant le prompt engineered), section passée à `propose_par_ia_non_valide`, filiation du document de référence affichée, checklist de relecture bloquant puis débloquant le bouton de validation selon son état, retour à `brouillon_aide` avec entrée `revisions` "validation utilisateur" distincte — aucune erreur console.

## 6. Limites assumées

- Génération limitée aux champs scalaires du gabarit — jamais les lignes d'un `tableau_dynamique`.
- Aucun écran générique de bibliothèque de documents de projet — `ProjectDocument` reste consommé uniquement pour ce besoin ponctuel de §4.1bis.
- Le catalogue de gabarits actuel n'a aucun champ scalaire de type `nombre` au niveau section (les champs `nombre` existants sont tous des colonnes de `tableau_dynamique`, hors périmètre) — le mécanisme de signalement de donnée technique/numérique est réel et testé, mais ne se déclenchera dans la pratique que lorsqu'un futur gabarit ajoutera un champ scalaire numérique.

## 7. Documentation alignée

- `03-specifications-fonctionnelles.md` v51 — §4.1bis complétée, modèle `project_document.extracted_text`.
- `docs/convergence/TECHNICAL_DECISIONS.md` —.
- `docs/convergence/CONVERGENCE_PLAN.md` — terminée.
