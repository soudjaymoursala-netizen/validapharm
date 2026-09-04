# Phase 34 — Bibliothèque de normes + analyse structurelle de dossier (§4.5/§4.8)

**Statut** : Terminée (28/08/2026). **TD-032**. Répond au besoin spécifié en §4.5 et à la moitié déterministe de celui spécifié en §4.8, avec des limites assumées en plus (voir §6).

## 1. Contexte et découverte

Reprise "dans l'ordre" du backlog après la Phase 33. §4.5 (bibliothèque de normes) et §4.8 (analyse de documents et challenge de dossier) sont regroupées dans une seule tâche de backlog.

Investigation avant conception : §4.8 bundle en réalité **3 capacités distinctes de taille très inégale** :
1. Extraction structurée d'un document d'ingénierie (PID/schéma) — priorité Could.
2. Extraction structurée d'un certificat, avec correspondance multilingue — priorité Should.
3. Détection d'écarts structurels dans un projet — priorité Should + garde-fou Must.

## 2. Décision de portée (jugement autonome, non soumise à `AskUserQuestion`)

Contrairement aux découpages P1 (Phases 29-31, ordre soumis à l'utilisateur) ou au choix de portée de la Phase 33 (arbitrage produit réel sur la source du document de référence), ce découpage applique un principe déjà établi et jamais contesté dans cette session, plutôt que d'ouvrir un nouvel arbitrage produit :

- **Jamais une règle métier inventée sans grounding réel.** La moitié "document attendu absent de la section Documents" de ce besoin nécessiterait une règle du type "le gabarit IQ attend un certificat d'étalonnage" — aucune source réelle (Google Drive, procédure client) ne confirme un tel mapping à ce jour. Coder une règle en dur ici reproduirait exactement l'erreur que ce projet a corrigée plusieurs fois (`MethodProfileACFC`/`MethodProfileImpactAssessment`/`MethodProfileRiskAssessment` — toujours configurables par client, jamais une grille universelle).
- **Scinder une capacité en sous-phases quand leurs tailles sont très inégales** (précédent : Source Intelligence 8a/8b, Phase 8a). Les capacités d'extraction PID/certificat nécessitent un nouveau pipeline d'extraction (upload + OCR/extraction texte) et une conception de prompt dédiée pour deux types de documents très différents (schémas techniques, certificats multilingues) — une capacité de taille comparable à une phase entière à elle seule.

**Portée retenue pour ce lot** :
- §4.5, volet Must — implémenté en entier : déterministe, agrège des données déjà présentes dans le catalogue de gabarits, aucun risque de fabrication.
- §4.8 — implémenté **uniquement pour sa moitié déterministe** ("exigence URS sans section/preuve liée") : s'appuie sur `project.links[]`, mécanisme déjà construit en Phases 1-3 pour les garde-fous de finalisation.
- §4.8, garde-fou — implémenté et vérifié par test.
- Différés : le volet Could de §4.5, la moitié "document attendu" de §4.8, l'extraction PID/certificat de §4.8.

## 3. Conception

### 3.1 Bibliothèque de normes (`logique-metier/bibliotheque-normes/rechercherNormes.ts`)

`listerNormesCatalogue()` agrège `DefinitionGabarit.normes_associees` de tous les gabarits du catalogue (`listerTousLesGabarits`, nouvel export de `gabarits/catalogue/index.ts`) — une entrée par norme distincte, avec la liste des gabarits qui la citent. `rechercherNormes(motCle)` filtre par sous-chaîne, insensible à la casse et aux accents (normalisation NFD) — une norme comme "EudraLex Annexe 15 §4" doit être trouvée en tapant "eudralex" sans accent.

Aucune norme n'est saisie ou dupliquée dans ce module : c'est une pure ré-indexation de données déjà présentes dans le catalogue.

Nouvel écran `BibliothequeNormes.vue` (route `/normes`, lien ajouté à `BarreLaterale.vue` sous "Mon travail") — champ de recherche, liste des normes avec les gabarits qui les citent.

### 3.2 Analyse structurelle (`logique-metier/analyse-projet/detecterEcartsStructurels.ts`)

`detecterEcartsStructurels(sections, liens)` — fonction pure, jamais un appel IA — signale chaque section de gabarit `urs` sans aucun lien (`project.links[]`, dans un sens ou l'autre) vers une autre section du projet.

**Décision de conception notable** : ce module n'est **pas** construit sur `evaluerReglesConformite` (Compliance Engine, Phase 30, TD-028) malgré la ressemblance apparente ("évaluer un ensemble de règles contre un contexte"). Le Compliance Engine retourne des règles **bloquantes** (`bloque: boolean`) — sémantiquement inadapté à un **constat non bloquant** (la spécification l'exige explicitement, §4.8 : jamais un verdict, jamais un blocage). Les forcer dans le même moteur aurait été une fausse économie de réutilisation, contraire à la discipline du projet de ne réutiliser que quand la sémantique correspond réellement.

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

- Volet Could de §4.5 : association de documents normatifs propres à l'utilisateur — nécessiterait l'écran générique de bibliothèque de documents de projet, non construit au-delà du besoin ponctuel de la Phase 33.
- §4.8, moitié "document attendu absent" : aucune règle réelle et sourcée n'existe à ce jour — resterait une fabrication si codée en dur.
- Extraction PID/certificat, correspondance multilingue (§4.8) : capacité distincte, non engagée dans ce lot — candidate à une phase dédiée future, avec son propre pipeline d'extraction et sa propre conception de prompt.

## 7. Documentation alignée

- `03-specifications-fonctionnelles.md` v52 — §4.5/§4.8 mises à jour.
- `docs/convergence/TECHNICAL_DECISIONS.md` — TD-032.
- `docs/convergence/CONVERGENCE_PLAN.md` — Phase 34 terminée.
