# Phase 23 — Ingestion PDF native

*27/08/2026 — en réponse à la demande explicite de l'utilisateur : "Fais les deux [ingestion PDF + repli IA]. Tu trouves pas des sop en pdf dans Google drive ?"*

## 1. Preuve de terrain (avant conception)

Recherche élargie dans Google Drive (`mimeType = 'application/pdf'`) : le corpus contient de vraies SOP/manuels PDF au-delà de ceux déjà lus — notamment un **quatrième genre** distinct, jamais rencontré jusqu'ici : "PB1D_Operation.pdf" (manuel opérateur Nordson ProBlue, fondeur de colle thermofusible). Structure réelle : en-têtes en **gras, sans aucune numérotation** ("**To fill the tank**", "**Starting the Melter**"), étapes numérotées en dessous ("1\. Open the tank lid."). Ni le dictionnaire de sections (TD-017), ni le repli mot-clé (TD-018) ne peuvent s'y accrocher — `RE_TITRE_NUMEROTE` exige un chiffre en tête de ligne, absent ici par construction. Confirme, sur un quatrième document réel indépendant, que la limite de fond documentée en TD-017/TD-018 tient : la couverture déterministe de "tous les types" de SOP est hors de portée d'un système de règles.

## 2. Recherche de librairie PDF (avant conception)

`pdfjs-dist` (Mozilla, actif, version 6.2.108, **0 vulnérabilité `npm audit`**) — seul candidat crédible pour un parsing PDF côté navigateur, déjà identifié comme candidat en Phase 22.

**Test réel du candidat, pas une lecture de documentation** :
- Le build principal (`pdfjs-dist/build/pdf.mjs`) échoue à l'import dans l'environnement de test (`jsdom`) : `DOMMatrix is not defined` — une API Canvas absente de jsdom (mais présente dans un vrai navigateur).
- Le build `legacy` (`pdfjs-dist/legacy/build/pdf.mjs`, explicitement documenté par Mozilla pour les environnements sans Canvas complet) importe et exécute **sans erreur** dans les deux environnements.
- **Différence assumée avec l'échec de `mammoth` (TD-014)** : `mammoth` avait deux implémentations *comportementalement différentes* selon Node/navigateur (celle testée en Node n'acceptait même pas un `ArrayBuffer`). Ici, `getDocument`/`getTextContent` sont exactement le même code dans les deux environnements — seule l'URL du script worker et des polices standard diffère (résolue en navigateur via `import.meta.url`, pattern Vite natif ; en test via un chemin de fichier Node explicite, injecté en paramètre) — une configuration d'environnement, jamais une divergence de logique. Le même code testé est donc bien celui exécuté par la PWA, contrairement à `mammoth`.

## 3. Implémentation

`extraireTextePdf(fichier, config?)` (`src/connecteurs/pdf/PdfNatifAdapter.ts`) : ouvre le PDF via `pdfjs-dist` (build `legacy`), extrait le texte page par page (`getTextContent`), joint les pages. `config.workerSrc`/`config.standardFontDataUrl` optionnels, avec un défaut basé sur `import.meta.url` (résolution Vite native en navigateur réel) — permet à un test de substituer une résolution Node sans changer le code de production.

**Test rigoureux** : construction d'un PDF *réellement valide* à la main (table `xref` à offsets exacts calculés, pas approximés) — même discipline que les fixtures `.docx` construites via `jszip` en Phase 19. Un bug réel a été trouvé et corrigé pendant la construction du test : le premier `MediaBox` choisi (300 unités de large) tronquait le texte extrait pour une ligne longue — élargi, comportement corrigé et vérifié, pas une supposition.

`MethodeExtraction` (domaine) étend `'ocr_azure' | 'docx_natif' | 'saisie_manuelle'` avec `'pdf_natif'`.

## 4. Explicitement non construit (limite assumée)

- Aucun wiring écran/store (même discipline que l'ingestion Office native, Phase 19) — domaine + connecteur d'abord, écran quand un cas d'usage réel le réclame.
- Aucune ingestion de tableau PDF natif (contrairement à `extraireTableauxDocx` pour `.docx`, Phase 22) — `getTextContent` de `pdfjs-dist` ne reconstruit pas de structure ligne/colonne ; un PDF scanné avec tableaux reste couvert par le repli `DocumentIntelligenceProvider` (Phase 22, TD-020, non activé), un PDF **natif** (texte réel, pas un scan) avec tableaux n'est, à ce stade, pas mieux couvert que le texte plat qu'il produit.
- Avertissement cosmétique en environnement de test (`Unable to load font data`, chargement des métriques de police standard via `file://` dans Node) — non bloquant, le texte est extrait correctement malgré l'avertissement (vérifié par test) ; en navigateur réel, la résolution `import.meta.url` fonctionne sans cet avertissement.

## 5. Vérification

83 fichiers / 577 tests (3 nouveaux sur `extraireTextePdf` : extraction mono-page, multi-pages dans l'ordre, fichier invalide → `DocumentPdfInvalideError`), typecheck et lint verts. `npm audit` : 0 vulnérabilité (`pdfjs-dist` ajouté).
