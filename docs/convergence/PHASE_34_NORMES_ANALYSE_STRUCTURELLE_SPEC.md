# Phase 34 — Bibliothèque de normes + analyse structurelle de dossier (§4.5/§4.8)

**Statut** : Terminée (28/08/2026). **TD-032**. Répond à URS-F-040 (§4.5) et à la moitié déterministe d'URS-F-082 + URS-F-083 (§4.8). Ajoute URS-F-041bis/083bis (limites assumées).

## 1. Contexte et découverte

Reprise "dans l'ordre" du backlog après la Phase 33. §4.5 (bibliothèque de normes, URS-F-040/041) et §4.8 (analyse de documents et challenge de dossier, URS-F-080 à 083) sont regroupées dans une seule tâche de backlog.

Investigation avant conception : §4.8 bundle en réalité **3 capacités distinctes de taille très inégale** :
1. Extraction structurée d'un document d'ingénierie (PID/schéma) — URS-F-080 (Could).
2. Extraction structurée d'un certificat, avec correspondance multilingue — URS-F-081/081bis (Should).
3. Détection d'écarts structurels dans un projet — URS-F-082/083 (Should + garde-fou Must).

## 2. Décision de portée (jugement autonome, non soumise à `AskUserQuestion`)

Contrairement aux découpages P1 (Phases 29-31, ordre soumis à l'utilisateur) ou au choix de portée de la Phase 33 (arbitrage produit réel sur la source du document de référence), ce découpage applique un principe déjà établi et jamais contesté dans cette session, plutôt que d'ouvrir un nouvel arbitrage produit :

- **Jamais une règle métier inventée sans grounding réel.** La moitié "document attendu absent de la section Documents" d'URS-F-082 nécessiterait une règle du type "le gabarit IQ attend un certificat d'étalonnage" — aucune source réelle (Google Drive, procédure client) ne confirme un tel mapping à ce jour. Coder une règle en dur ici reproduirait exactement l'erreur que ce projet a corrigée plusieurs fois (`MethodProfileACFC`/`MethodProfileImpactAssessment`/`MethodProfileRiskAssessment` — toujours configurables par client, jamais une grille universelle).
- **Scinder une capacité en sous-phases quand leurs tailles sont très inégales** (précédent : Source Intelligence 8a/8b, Phase 8a). URS-F-080/081/081bis nécessitent un nouveau pipeline d'extraction (upload + OCR/extraction texte) et une conception de prompt dédiée pour deux types de documents très différents (schémas techniques, certificats multilingues) — une capacité de taille comparable à une phase entière à elle seule.

**Portée retenue pour ce lot** :
- §4.5/URS-F-040 (Must) — implémenté en entier : déterministe, agrège des données déjà présentes dans le catalogue de gabarits, aucun risque de fabrication.
- §4.8/URS-F-082 — implémenté **uniquement pour sa moitié déterministe** ("exigence URS sans section/preuve liée") : s'appuie sur `project.links[]`, mécanisme déjà construit en Phases 1-3 pour les garde-fous de finalisation.
- §4.8/URS-F-083 (garde-fou) — implémenté et vérifié par test.
- Différés : URS-F-041 (Could), la moitié "document attendu" d'URS-F-082, URS-F-080/081/081bis.

## 3. Conception

### 3.1 Bibliothèque de normes (`logique-metier/bibliotheque-normes/rechercherNormes.ts`)

`listerNormesCatalogue()` agrège `DefinitionGabarit.normes_associees` de tous les gabarits du catalogue (`listerTousLesGabarits`, nouvel export de `gabarits/catalogue/index.ts`) — une entrée par norme distincte, avec la liste des gabarits qui la citent. `rechercherNormes(motCle)` filtre par sous-chaîne, insensible à la casse et aux accents (normalisation NFD) — une norme comme "EudraLex Annexe 15 §4" doit être trouvée en tapant "eudralex" sans accent.

Aucune norme n'est saisie ou dupliquée dans ce module : c'est une pure ré-indexation de données déjà présentes dans le catalogue.

Nouvel écran `BibliothequeNormes.vue` (route `/normes`, lien ajouté à `BarreLaterale.vue` sous "Mon travail") — champ de recherche, liste des normes avec les gabarits qui les citent.

### 3.2 Analyse structurelle (`logique-metier/analyse-projet/detecterEcartsStructurels.ts`)

`detecterEcartsStructurels(sections, liens)` — fonction pure, jamais un appel IA — signale chaque section de gabarit `urs` sans aucun lien (`project.links[]`, dans un sens ou l'autre) vers une autre section du projet.

**Décision de conception notable** : ce module n'est **pas** construit sur `evaluerReglesConformite` (Compliance Engine, Phase 30, TD-028) malgré la ressemblance apparente ("évaluer un ensemble de règles contre un contexte"). Le Compliance Engine retourne des règles **bloquantes** (`bloque: boolean`) — sémantiquement inadapté à un **constat non bloquant** (URS-F-083 l'exige explicitement : jamais un verdict, jamais un blocage). Les forcer dans le même moteur aurait été une fausse économie de réutilisation, contraire à la discipline du projet de ne réutiliser que quand la sémantique correspond réellement.

Chaque `EcartStructurel.message` est rédigé au format "Constat : … — à vérifier", jamais "conforme"/"non conforme" — vérifié explicitement par test.

`FicheProjet.vue` affiche une section "Analyse structurelle du dossier" listant les constats, avec lien direct vers chaque section concernée — visible uniquement s'il existe au moins un écart.

## 4. Tests

- `rechercherNormes.test.ts` (nouveau, 7 cas) : agrégation sans duplication, gabarits corrects par norme, tri alphabétique, mot-clé vide retourne le catalogue complet, recherche insensible casse, recherche insensible aux accents, mot-clé sans correspondance retourne un tableau vide.
- `detecterEcartsStructurels.test.ts` (nouveau, 6 cas) : section urs isolée signalée, section urs liée (`from` ou `to`) non signalée, section d'un autre gabarit jamais signalée même isolée, plusieurs sections isolées signalées indépendamment, message ne contient jamais "conforme"/"non conforme".
- `BarreLaterale.test.ts` : nouvelle route de test ajoutée + assertion sur le nouveau lien.

Suite complète (696 tests, 98 fichiers), typecheck et lint : tous verts.

## 5. Vérification navigateur

Vérifié avec un navigateur Chromium réel (Playwright) contre le serveur de développement :

- `/normes` : 10 normes distinctes listées (catalogue réel) ; recherche "eudralex" retourne les 5 entrées EudraLex du catalogue, insensible à la casse et à l'accent ; mot-clé sans correspondance affiche l'état vide.
- Fiche Projet : création d'une section `urs` isolée → constat affiché immédiatement ("cette exigence URS n'est reliée à aucune autre section du projet") ; ajout d'une 2ᵉ section `oq` non liée → le constat persiste (aucune régression, la section urs reste isolée).
- Aucune erreur console.

## 6. Limites assumées

- URS-F-041 (Could) : association de documents normatifs propres à l'utilisateur — nécessiterait l'écran générique de bibliothèque de documents de projet (URS-F-000quater), non construit au-delà du besoin ponctuel de la Phase 33.
- URS-F-082, moitié "document attendu absent" : aucune règle réelle et sourcée n'existe à ce jour — resterait une fabrication si codée en dur.
- URS-F-080/081/081bis (extraction PID/certificat, correspondance multilingue) : capacité distincte, non engagée dans ce lot — candidate à une phase dédiée future, avec son propre pipeline d'extraction et sa propre conception de prompt.

## 7. Documentation alignée

- `01-URS-outil.md` v62 — §4.5/URS-F-040 et §4.8/URS-F-082 (partiel) implémentées, ajout URS-F-041bis/083bis.
- `03-specifications-fonctionnelles.md` v52 — §4.5/§4.8 mises à jour.
- `docs/convergence/TECHNICAL_DECISIONS.md` — TD-032.
- `docs/convergence/CONVERGENCE_PLAN.md` — Phase 34 terminée.
