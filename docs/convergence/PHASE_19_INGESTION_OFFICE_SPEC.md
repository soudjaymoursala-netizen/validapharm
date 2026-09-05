# Ingestion Office native (lecture .docx)

*27/08/2026 — deuxième phase du plan `docs/convergence/VISION_NORTH_STAR_CONVERGENCE.md`, priorité P0. Complétée le même jour (§6/§7) suite à une observation explicite de l'utilisateur: une SOP réelle n'est pas toujours du texte seul (schémas/photos incorporés) ni toujours un `.docx` propre (scan avec ou sans filigrane) — l'ingestion doit être robuste à ces deux réalités.*

## 1. Ce qui existe déjà (Comprendre)

- OCR image (`connecteurs/ocr/OcrRelayAdapter.ts`): seul mécanisme d'ingestion de document à ce jour, nécessite un relais réseau et ne lit qu'une image/scan.
- `Source → SourceVersion → Extraction → ExtractionItem → KnowledgeItem`: la chaîne de structuration existe, mais `Extraction.methode` (`MethodeExtraction`) ne connaissait que `'ocr_azure' | 'saisie_manuelle'` — aucune ingestion native d'un fichier Office.
- Aucune librairie de parsing/génération Word/Excel/PDF dans `package.json` avant cette phase (constaté lors de l'audit du 27/08/2026).

## 2. Comparer — recherche de librairie

Recherche menée sur le registre npm (`registry.npmjs.org`) le 27/08/2026, faute d'accès à `sheetjs.com`/`docs.sheetjs.com` (bloqués par le proxy de sortie de cette session):

| Candidat | Rôle envisagé | License | Verdict |
|---|---|---|---|
| `mammoth` (1.12.1) | Lecture `.docx` → texte | BSD-2-Clause | **Retenu puis abandonné** — voir §3 |
| `xlsx` / SheetJS (0.18.5, npm) | Lecture/écriture `.xlsx` | Apache-2.0 | **Rejeté** — `npm audit`: vulnérabilité haute (prototype pollution + ReDoS), **aucun correctif disponible** sur le registre npm (SheetJS distribue les versions corrigées via son propre CDN, non vérifiable depuis cette session, réseau bloqué) |
| `exceljs` (4.x) | Lecture/écriture `.xlsx` (alternative) | MIT | **Rejeté pour l'instant** — dépendance transitive `uuid` avec vulnérabilité modérée (bornes de buffer), chaîne de dépendances datée (`glob`/`fstream`/`inflight` dépréciés) |
| `docxtemplater` + `pizzip` | Génération `.docx` à partir d'un template client | MIT (cœur), modules payants pour images/HTML/graphiques | **Retenu pour une phase future** (Template Intelligence, génération) — confirmé compatible navigateur (Vue/React/Angular cités explicitement), préserve la structure du template (tableaux, en-têtes/pieds de page) |
| `pdf-lib` (1.17.1) | Génération/modification PDF | MIT | Non retenu dans ce lot — PDF est une priorité plus basse dans la checklist (N6) que Word/Excel, aucun besoin réel démontré à ce stade |

**Décision retenue pour la lecture `.docx` (ce lot)**: ni `mammoth`. En l'installant et en écrivant un test réel (docx minimal mais valide construit avec `jszip`), la suite a révélé que `mammoth` distingue son code Node de son code navigateur via le champ `browser` de son `package.json` — un mécanisme propre aux bundlers (webpack/browserify) que la résolution de modules de Vitest (SSR, Node) n'applique pas. Forcer cette résolution (alias explicites, `conditions`, `deps.inline`) a été tenté et n'a pas fonctionné de façon fiable: le code testé n'aurait jamais été garanti celui réellement exécuté par la PWA en production. `mammoth` a donc été désinstallé.

**Solution retenue**: extraction directe du texte depuis `word/document.xml` (paragraphes `<w:p>`, runs `<w:t>`) avec `jszip` (dézippage, déjà utilisé en test) + `DOMParser` (API native du navigateur, disponible aussi sous jsdom) — isomorphe par construction, sans aucune ambiguïté Node/navigateur. Moins riche que `mammoth` (pas de conversion HTML/styles), mais suffisant pour l'objectif de cette phase: lire le **texte** d'une procédure ou d'un gabarit fourni par l'utilisateur.

## 3. Identifier / Proposer

- `MethodeExtraction` étendu: `'ocr_azure' | 'docx_natif' | 'saisie_manuelle'` — `'xlsx_natif'` volontairement absent (aucune librairie retenue, voir tableau §2; ne jamais fabriquer une valeur sans implémentation réelle derrière).
- `connecteurs/office/DocxNatifAdapter.ts` (`extraireTexteDocx(fichier: ArrayBuffer): Promise<{ texte: string }>`): dézippe le `.docx`, lit `word/document.xml`, concatène le texte des runs par paragraphe (séparateur `\n`) — jamais d'appel réseau (contrairement à l'OCR).
- `connecteurs/office/erreurs.ts` (`DocumentInvalideError`): même discipline que `connecteurs/ocr/erreurs.ts` — un fichier illisible ou d'un format inattendu ne lève jamais une exception générique.

## 3bis. Robustesse de lecture (complément du 27/08/2026)

Constat direct de l'utilisateur: une SOP réelle n'est pas toujours du texte seul, et pas toujours un `.docx` propre.

- `extraireImagesDocx(fichier: ArrayBuffer): Promise<ImageIncorporeeDocx[]>` (`connecteurs/office/DocxNatifAdapter.ts`): extrait chaque fichier `word/media/*` — schéma, photo, diagramme incorporé au `.docx`. Type MIME résolu pour les formats raster (`png`/`jpg`/`jpeg`/`gif`/`bmp`/`tif`/`tiff`); un format non raster (EMF/WMF, typique d'un schéma collé depuis Visio/PowerPoint) est retourné avec `contentType: null` — **jamais silencieusement omis**, l'appelant voit qu'une image existe même si elle n'est pas encore exploitable par l'OCR.
- **Combinaison prévue avec l'OCR existant**: chaque image extraite est destinée à être transmise à `OcrRelayAdapter.extraireTexte(donnees, contentType)`, produisant sa propre `Extraction` sur la même `SourceVersion` que le texte natif (`docx_natif`) — le modèle admet déjà plusieurs `Extraction` par version (`Extraction produces ExtractionItem 1:N`), aucune modification de schéma nécessaire.
- **SOP scannée avec ou sans filigrane**: un scan entier (pas un `.docx`) relève déjà de l'OCR existant (`ocr_azure`), pas de cette phase. Un filigrane ("COPIE CONTRÔLÉE"/"DRAFT") peut dégrader la reconnaissance — **aucune détection/correction automatique n'est construite ici, et il ne faut jamais en prétendre une sans preuve technique réelle**. Le filet de sécurité reste la validation humaine déjà non négociable de tout `KnowledgeItem` (`a_valider` à la création): un texte dégradé par un filigrane doit être visible et corrigé à cette étape.

## 4. Explicitement non construit (limite assumée)

- Aucune ingestion Excel native (`xlsx_natif`) — bloquée par l'absence de librairie propre à ce jour. Ne pas réintroduire `xlsx`/SheetJS tel quel sans correctif vérifié.
- Aucune génération de document dans ce lot (lecture seulement) — la génération au format client réel (Template Intelligence, `docxtemplater`) est une phase distincte, déjà pré-choisie mais non engagée.
- Aucun wiring dans un écran ni dans `useSourceIntelligenceStore` — même discipline que l'OCR, qui n'est pas non plus appelé depuis une UI à ce jour; les adaptateurs sont prêts à être invoqués par un futur écran (même rôle que `OcrRelayAdapter`).
- Aucune conservation du formatage/styles/tableaux dans le texte natif — texte brut uniquement, suffisant pour la lecture d'une procédure; la structure fine (tableaux, champs) reste un besoin de la future Template Intelligence.
- Aucune reconstruction de l'ordre texte/image dans le flux du document (les images sont retournées en liste plate, pas positionnées relativement aux paragraphes) — suffisant pour ne pas perdre l'information, pas pour reconstituer la mise en page exacte.
- Aucune détection/correction de filigrane ou de scan dégradé — limite assumée et documentée, jamais un algorithme fabriqué sans preuve.

## 5. Vérification

Tests sur un `.docx` réellement valide construit avec `jszip` (texte simple, plusieurs paragraphes, images incorporées raster et non raster, absence d'image, fichier non-zip). Suite complète (`npx vitest run`, `npm run typecheck`, `npm run lint`) verte avant commit. `npm audit`: 0 vulnérabilité sur les dépendances ajoutées (`jszip`).
