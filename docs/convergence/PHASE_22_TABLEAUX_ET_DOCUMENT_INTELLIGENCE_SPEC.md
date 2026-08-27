# Phase 22 — Lecture de tableaux Word + repli Document Intelligence

*27/08/2026 — en réponse à la demande explicite de l'utilisateur : "Tu feras le 1 puis le 2 [...] essaye de voir dans tous les catalogues s'il y'a des outils pour parser lire et comprendre des tableaux ou des étapes sous tableau".*

## 1. Recherche de catalogue (avant toute conception)

npm est le seul écosystème pertinent (PWA 100% navigateur, TD-001). Candidats vérifiés :

| Candidat | Verdict | Preuve |
|---|---|---|
| `officeparser` (v4.2.0, oct. 2024) | Rejeté | Dépend de `decompress`/`rimraf`/filesystem — Node uniquement |
| `docx4js` | Rejeté | Dernière publication 2018 — même profil de risque que `xlsx`/`exceljs` (TD-014) |
| `mammoth` | Rejeté | Librairie déjà abandonnée en Phase 19 (TD-014) — pas de fait nouveau justifiant de rouvrir ce dossier |
| `docx`/`docx-templates` (dolanmiu) | Sans objet | Génération, pas lecture |
| Candidats OCR-table npm (Tesseract.js-based, wrappers Java/Python) | Rejetés | Node uniquement, ou nécessitent une reconstruction de structure de toute façon (même effort qu'écrire notre propre code) |

**Conclusion** : aucune librairie npm ne convient. La voie retenue est d'étendre notre propre code déjà vérifié (`jszip`+`DOMParser`, Phase 19), et de s'appuyer sur une **API Azure différente** (Document Intelligence, pas une librairie npm) pour le cas des scans.

## 2. Point 1 — `extraireTableauxDocx` (TD-019)

**Preuve de terrain** : lecture intégrale du manuel Markem-Imaje C350 (même corpus Drive que TD-017) déjà identifié comme genre non couvert — confirme que ses "étapes" sont en réalité des tableaux à 2-3 colonnes ("Previous achievement"/"Required time" en préconditions, numéro d'étape en première colonne, instruction en deuxième), répétés ~15 fois dans le document.

`extraireTableauxDocx` (`src/connecteurs/office/DocxNatifAdapter.ts`) parcourt `<w:body>` dans l'ordre, capturant pour chaque `<w:tbl>` de premier niveau sa grille de cellules (`lignes: string[][]`) et le texte du paragraphe non vide le plus proche qui le précède (`titreProchePrecedent`) — un fait de position, jamais une classification.

`proposerEtapesDepuisTableaux` (`src/logique-metier/procedures/parseurStructureProcedure.ts`) reconnaît une étape par une première cellule *exactement* numérique, combine `titreProchePrecedent` et les préconditions "Previous achievement"/"Required time" trouvées dans le même tableau en `contexteDetecte`. `proposerStructureProcedure` accepte maintenant un paramètre `tableaux` optionnel, additif aux étapes textuelles — chaque tableau garde sa propre numérotation d'origine (fidèle à la source, jamais un compteur global fabriqué).

## 3. Point 2 — `DocumentIntelligenceProvider` (TD-020)

Pour une SOP **scannée** avec des étapes en tableau, `extraireTableauxDocx` ne s'applique pas (pas de `.docx`). Azure AI Vision (Read API, fournisseur actuel) ne renvoie que des lignes de texte plates, sans structure. **Azure AI Document Intelligence** (modèle `prebuilt-layout`) reconstruit nativement la structure ligne/colonne/cellule, sur image *et* PDF — déjà anticipé dans le docstring de `FournisseurOcr` depuis TD-001 ("OCR/Document Intelligence").

`documentIntelligenceProvider.ts` (`workers/ocr-relay/src/fournisseurs/`) implémente `FournisseurOcr`, suivant le même patron (soumission asynchrone + sondage) qu'`AzureVisionProvider`. **Non câblé comme fournisseur actif** : `index.ts` reste sur Azure Vision — ajouter/remplacer un fournisseur est un choix de compte Azure (quota, coût) qui revient explicitement à l'utilisateur, jamais une bascule silencieuse.

**Limite transparente** : `learn.microsoft.com`/`azure.microsoft.com` étaient bloqués par le proxy réseau de cette session — le contrat REST est écrit d'après connaissance de formation, avec la même réserve que celle déjà écrite dans `azureVisionProvider.ts` ("à revérifier au déploiement réel"). `ocrHandler.ts` rejette aujourd'hui tout `Content-Type` non `image/*` — router un PDF vers ce fournisseur demanderait d'assouplir cette garde, non fait dans ce lot.

## 4. Test contre des documents PDF réels (Google Drive)

Deux SOP réelles au format PDF testées avec le parseur tel quel :

- **Ferring "SOP Qualif Balance.pdf"** (même contenu que SMP-PROC-016168 déjà utilisé pour TD-017) : les 9 sections canoniques toutes détectées correctement (objectif/perimetre/definitions/responsabilites/procedure/references/documentation×2), avec **3 sections `'autre'` parasites** au milieu — des lignes de données numériques dans un tableau de calibration (ex. "5 000 10 000") faussement reconnues comme en-têtes de premier niveau. Limite réelle découverte, jamais perdue silencieusement (toujours `'autre'`, jamais un mauvais canon), mais fragmente la section "Procédure".
- **Sanofi Lyon "LYON-QUAL-PGN-000198.pdf"** : premier essai sur le texte brut rendu par Google Drive — résultat très dégradé (4 sections, toutes `'autre'`, titres incohérents). **Cause identifiée et non fabriquée** : Google Drive échappe les points après un chiffre en début de ligne dans son rendu Markdown ("1\. OBJECTIF" au lieu de "1. OBJECTIF") — artefact propre à l'outil de prévisualisation utilisé pour cette session, pas au contenu réel du PDF ni à ce que produirait une vraie extraction PDF (`pdfjs-dist`, non installée). Une fois cet artefact neutralisé (simple substitution), les **9 sections canoniques sont toutes détectées dans le bon ordre**, avec des sous-structures secondaires correctement classées dans les annexes (un exemple de document imbriqué).

**Conclusion honnête sur ce test** : le parseur tient bien sur du texte PDF réel *une fois le texte proprement extrait* — mais ce test passe par le rendu de Google Drive, pas par une vraie extraction PDF en environnement de production (aucune librairie PDF n'est installée dans ce dépôt). Il valide la robustesse du **détecteur de sections**, pas encore un pipeline d'ingestion PDF réel — chantier distinct, non engagé (`pdfjs-dist` candidat identifié mais non installé).

## 5. Explicitement non construit (limite assumée)

- Aucune ingestion PDF réelle dans la PWA (aucune librairie installée) — testé uniquement via le rendu Google Drive, qui n'est pas représentatif du texte qu'une vraie extraction produirait.
- `DocumentIntelligenceProvider` n'est pas câblé comme fournisseur actif — décision de compte Azure qui revient à l'utilisateur.
- Assouplissement de `ocrHandler.ts` pour accepter un PDF non fait.
- Fragmentation par tableau de données numériques (Ferring) non corrigée — documentée, pas un échec silencieux.
- Tableau imbriqué dans une cellule non extrait (`extraireTableauxDocx`) — aucune preuve d'un tel cas dans les documents réels consultés.

## 6. Vérification

82 fichiers / 574 tests (dont 8 nouveaux sur `extraireTableauxDocx`, 4 sur `proposerEtapesDepuisTableaux`, 8 sur `DocumentIntelligenceProvider`), typecheck et lint verts. Validation manuelle supplémentaire (non committée, scripts jetables) sur le texte intégral réel de 2 SOP PDF distinctes.
