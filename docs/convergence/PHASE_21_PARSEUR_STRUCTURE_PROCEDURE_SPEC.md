# Phase 21 — Parseur déterministe de structure procédurale

*27/08/2026 — en réponse directe à la demande utilisateur ("Objectif de la SOP, scope, responsabilité, process...") et à la décision de trancher le point ouvert de la Phase 20 en commençant par le chemin sans IA.*

## 1. Ce qui existe déjà (Comprendre)

- `Procedure`/`ProcedureStep` (Phase 20, TD-016) : structure de destination versionnée, immuable, saisie humaine.
- `extraireTexteDocx` (Phase 19, TD-014) : produit déjà le texte brut d'une SOP `.docx` ; l'OCR (Phase 6) produit le texte brut d'une SOP scannée. Les deux alimentent ce parseur de la même façon (texte brut en entrée, indépendamment de la source).
- Question explicite de l'utilisateur : "as-tu forcément besoin de l'IA pour la lecture, la compréhension et le suivi d'une procédure ?" — réponse apportée : lecture (déterministe/OCR), suivi (CRUD sur données déjà structurées) n'en ont pas besoin ; seule la compréhension (structuration) est ambiguë selon le document, et peut être traitée d'abord par des règles avant de réserver l'IA en repli.

## 2. Comparer — preuve de terrain avant conception (jamais déclaratif)

Avant d'écrire une seule règle, deux SOP réelles de deux clients pharma différents ont été lues intégralement depuis Google Drive :

- **Sanofi Lyon, "LYON-QUAL-PGN-000198"** ("Qualification des équipements et des systèmes") : sommaire numéroté "1. OBJECTIF / 2. CHAMP D'APPLICATION / 3. RESPONSABILITES / 4. REFERENCES / 5. DEFINITIONS ET ACRONYMES / 6. DESCRIPTION / 7. GESTION DES ECARTS ET DES EXCURSIONS / 8. DOCUMENTATION / 9. ANNEXES".
- **Ferring International Center, "SMP-PROC-016168"** ("FSMP - Maitrise des pesées") : sommaire numéroté "1 But / 2 Domaine d'application / 3 Abréviations / Définitions / 4 Responsabilités / 5 Procédure / 6 Références / 7 Suppléments / 8 Historique".

**Constat** : deux entreprises différentes, deux formats de numérotation différents (point après le numéro ou non), un vocabulaire différent pour la même idée ("OBJECTIF" vs "But", "CHAMP D'APPLICATION" vs "Domaine d'application", "DESCRIPTION" vs "Procédure") — mais **le même enchaînement sémantique**, exactement celui décrit par l'utilisateur (objectif → périmètre → responsabilité → définitions → corps de procédure → références → historique/annexes). C'est une preuve directe, pas une supposition, que ce noyau sémantique est un invariant du genre "SOP qualité pharma", robuste à la variation lexicale par client.

**Contre-exemple consulté, tout aussi réel** : "SOP-Standard Operating Procedures-SL C350.docx" (Markem-Imaje) est une instruction technique d'équipement organisée en chapitres illustrés à base de tableaux d'étapes ("Previous achievement / Required time / Étape"), sans aucune section "Objectif/Champ d'application" — un genre documentaire complètement différent. Ce parseur ne le couvre pas correctement (voir §5) ; ce n'est pas caché, c'est une limite assumée en connaissance de cause.

## 3. Identifier / Proposer

- `SectionCanoniqueProcedure` : rôle sémantique (`objectif|perimetre|responsabilites|definitions|procedure|references|gestion_ecarts|documentation|annexes|autre`), indépendant du libellé client exact.
- `detecterSections(texte)` : repère les en-têtes numérotés de premier niveau ("N. Titre" ou "N Titre", jamais confondu avec une sous-section "N.M Titre"), les résout contre un dictionnaire de variantes lexicales connues (français/anglais, les deux styles de numérotation observés), et route tout en-tête de forme reconnue mais non répertorié vers `'autre'` — **jamais silencieusement perdu**. Aucun en-tête reconnu du tout → tableau vide (jamais une erreur, jamais une section inventée).
- `proposerStructureProcedure(texte)` : en plus des sections, extrait du corps de la section canonique `'procedure'` des étapes candidates (lignes à puce ou numérotées), avec détection par motif (jamais devinée) d'une clause conditionnelle ("si/sauf/dans le cas où...") et d'un responsable en tête de ligne ("Rôle : ...").
- **Garde-fou non négociable, inchangé depuis TD-016** : le résultat est une `PropositionStructureProcedure`, jamais persisté. Aucune fonction de ce lot n'écrit dans `Procedure`/`ProcedureStep` — la confirmation humaine explicite via `useProcedureStore.creerProcedure`/`ajouterEtape` reste l'unique chemin d'écriture.

## 4. Revue (condensée)

- **E1 (IA/GAMP5-Part11)** : zéro appel IA dans ce lot — 100% règles déterministes, testées sur du texte réel. Réduit d'autant la surface où l'IA serait nécessaire, conformément à la demande explicite de l'utilisateur.
- **E2 (Qualité/SMQ)** : ne contourne pas TD-016 — la structuration proposée reste soumise à confirmation humaine avant tout enregistrement, même discipline que `KnowledgeItem.valeur_interpretee`.
- **E3 (QA Réglementaire)** : le dictionnaire de sections est directement dérivé de deux SOP réelles de deux clients différents, pas d'une liste théorique — traçable à l'évidence (§2).
- **E4 (CSV)** : aucun changement de schéma Dexie — `PropositionStructureProcedure` est une structure en mémoire, jamais persistée.
- **E5 (Architecte logiciel)** : fonctions pures, sans accès base, réutilisables par un futur écran de revue — même patron que `chaineTechniqueDepuis` (Phase 18).

**Décision technique associée** : TD-017, voir `TECHNICAL_DECISIONS.md`.

## 5. Explicitement non construit (limite assumée)

- **Décomposition fine multi-niveaux** : la numérotation à deux niveaux ("6.1", "6.2.1"...) observée dans les deux SOP réelles est traitée comme du texte de sous-topic à l'intérieur de sa section parente, jamais éclatée automatiquement en étapes distinctes — une vraie décomposition étape-par-étape à ce niveau de détail resterait, à ce stade, une supposition non vérifiée sur une structure trop hétérogène d'un client à l'autre (Sanofi : sous-sections thématiques longues ; Ferring : sous-sections mêlant exigences et procédure). Un humain lit la section et confirme les étapes réelles.
- **Genre "instruction technique illustrée"** (Markem-Imaje et assimilés) : non couvert correctement — le détecteur peut sur-segmenter en sections `'autre'` à partir des lignes de tableau numérotées. Choix assumé de favoriser le rappel (rien n'est perdu silencieusement) sur la précision, puisque le résultat est une proposition soumise à revue humaine, jamais une vérité auto-validée.
- **Aucun écran de revue** — la fonction est prête à être appelée par un futur écran de confirmation humaine (Phase future, quand le cas d'usage le réclame), même discipline que les Phases 5/8a/9/10/13/18/20.
- **Aucun repli IA** — TD-016/TD-017 laissent la porte ouverte à un repli IA-assisté pour les documents que ce parseur ne structure pas (tableau `frontieres.length === 0` ou une majorité de sections `'autre'`), mais son déclenchement (prompt, garde-fou de confirmation) reste un chantier séparé, à engager seulement si l'usage réel montre que la couverture déterministe est insuffisante.

## 6. Vérification

Tests sur `detecterSections`/`proposerStructureProcedure` (`src/logique-metier/procedures/parseurStructureProcedure.test.ts`) : reconnaissance des deux lexiques réels (Sanofi, Ferring), non-confusion sous-section/section, en-tête de forme reconnue mais inconnu classé en `'autre'`, absence totale d'en-tête → tableau vide, extraction d'étapes avec condition/responsable détectés ou `null` si absent. Suite complète (`npx vitest run` — 81 fichiers/554 tests, `npm run typecheck`, `npm run lint`) verte avant commit.

## 7. Prochaine étape

Le repli IA-assisté (documents non couverts par ce parseur) reste un point ouvert distinct — à engager seulement si un cas réel le réclame, jamais par anticipation. Item suivant du plan de convergence (§4 de `VISION_NORTH_STAR_CONVERGENCE.md`) : Template Intelligence généralisée (génération au format client réel).
