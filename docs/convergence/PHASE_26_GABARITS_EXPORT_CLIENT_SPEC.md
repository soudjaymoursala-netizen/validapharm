# Gabarits d'export personnalisés client (Template Intelligence, 1ʳᵉ brique réelle)

*27/08/2026 — implémente §4.3bis (gabarits d'export personnalisés client), déjà spécifié depuis longtemps mais jamais construit; premier chantier P0 réellement livré du plan `VISION_NORTH_STAR_CONVERGENCE.md` (item "Template Intelligence Engine", couche 10/15).*

## 1. Pourquoi maintenant (Comprendre)

`export_template_id` existait sur `ClientConfig` depuis les toutes premières versions du modèle de données (`ClientConfig`, depuis la spécification fonctionnelle v12) — un champ stocké, jamais lu, jamais écrit ailleurs qu'à `null`. `genererExportWord.ts` produit un document HTML encapsulé `.doc` (technique volontaire), identique pour tous les clients: aucun client ne peut recevoir un livrable dans **son propre** gabarit Word. Ce besoin était déjà spécifié en détail (§4.3bis); ce lot construit enfin le mécanisme.

## 2. Ce qui existe déjà, réutilisé plutôt que réinventé

- `docxtemplater`+`pizzip`: pré-choisis **par anticipation**, sans être installés — recherche re-vérifiée ici (registre npm réel, `npm audit` réel) plutôt que présumée toujours valable: 0 vulnérabilité, licences MIT confirmées, dépendances uniques (`@xmldom/xmldom` pour `docxtemplater`, `pako` pour `pizzip`).
- `genererExportWord.ts` (HTML `.doc`): refactoré pour consommer une nouvelle fonction de construction de données partagée, jamais réécrit dans sa logique de rendu.
- `EditeurSection.vue`: écran d'export existant (§4.3), étendu plutôt que dupliqué.
- Patron d'isolation stricte par `client_id` déjà établi (`AssetNode`, `Procedure`): reproduit à l'identique pour `GabaritExportClient`.

## 3. Conception — équivalence de contenu par construction, pas par vérification a posteriori

La spécification (§4.3bis) exige que le gabarit personnalisé produise un contenu identique au gabarit par défaut. Deux approches possibles: (a) générer les deux documents puis comparer un checksum du contenu extrait (option envisagée dans la spécification fonctionnelle v17, avant implémentation réelle); (b) construire les données une seule fois et les faire consommer par les deux renderers, rendant une divergence structurellement impossible.

**(b) retenue**: `construireDonneesExportGabarit(section, definition, langue)` (`src/logique-metier/export/donneesExportGabarit.ts`) est la **seule** fonction qui lit `Section`/`DefinitionGabarit` — `genererExportWord` (HTML) et `genererDocxPersonnalise` (`.docx` réel) consomment toutes deux sa sortie, jamais `Section` directement. Aucun test de non-régression de contenu n'est nécessaire pour *garantir* l'équivalence (elle est structurelle); un test existe néanmoins pour vérifier que le refactor n'a pas changé le rendu HTML existant (non-régression classique).

## 4. Implémentation

- **`donneesExportGabarit.ts`** (nouveau): `DonneesExportGabarit` (titre/référence/version/statut/responsabilité transférée/rédacteurs/approbateur final/sections+champs+tableaux ou contenu générique/historique des révisions), `construireDonneesExportGabarit`.
- **`genererExportWord.ts`** (refactoré, sortie HTML inchangée — vérifié par la suite de tests existante, aucune régression): consomme désormais `DonneesExportGabarit`.
- **`GenerationDocxAdapter.ts`** (nouveau, `connecteurs/office/`): `genererDocxPersonnalise(gabaritDocx, donnees)` (ouvre le `.docx` client avec `pizzip`, remplace les balises avec `docxtemplater`, régénère un `.docx` réel réouvrable); `verifierGabaritExportClient(gabaritDocx)` (liste les balises présentes via `Docxtemplater.getTags` — API réelle non déclarée dans les types publiés de la librairie, castée explicitement avec commentaire justificatif, jamais masquée).
- **Bug réel trouvé et corrigé pendant la construction du test**: le comportement par défaut de `docxtemplater` pour une balise absente des données au moment du rendu est d'écrire littéralement le texte `"undefined"` dans le document généré — jamais une erreur, jamais une chaîne vide. `nullGetter: () => ''` neutralise ce défaut (une balise sans valeur produit une cellule vide).
- **`GabaritExportClient`** (nouveau type domaine) + table Dexie `gabaritsExportClient` (version 26 du schéma) + `useGabaritExportStore` (`importerGabarit` — refuse le gabarit si les balises obligatoires `redacteurs`/`approbateur_final`/`historique_revisions` sont absentes; `charger`/`supprimerGabarit`, isolation stricte par `client_id`).
- **`EditeurSection.vue`** étendu: import d'un gabarit `.docx` (nom + fichier), sélection du gabarit à utiliser (par défaut ou personnalisé), bouton "Exporter en Word (gabarit client.docx)" produisant un vrai fichier `.docx` téléchargeable.

## 5. Explicitement non construit (limite assumée)

- PDF/Excel personnalisés (la spécification mentionne les trois formats): aucune librairie de génération saine identifiée à ce jour pour ces deux formats — même discipline que pour Excel (bloqué faute de librairie saine). Non fabriqué sans preuve.
- Aucune fidélité structurelle complète pour un tableau dynamique dans le gabarit client (une ligne = une chaîne de cellules jointes par `" | "`) — l'export CSV dédié existant reste le chemin de fidélité complète pour un tableau.
- Aucune détection de balise **superflue** (un gabarit qui référence un champ hors `DonneesExportGabarit`, ex. une faute de frappe) — seule l'absence des balises **obligatoires** est vérifiée (le besoin ne demande que cela); une balise inconnue produit une cellule vide grâce à `nullGetter`, jamais un plantage.
- Aucun écran de gestion dédié (lister/renommer/supprimer les gabarits d'un client en dehors de l'écran d'édition d'une section) — l'import se fait directement depuis `EditeurSection.vue`, cohérent avec la taille du besoin actuel.

## 6. Vérification

- Suite complète verte (87 fichiers / 602 tests, 19 nouveaux: 9 sur `GenerationDocxAdapter`, 4 sur `useGabaritExportStore`, 6 sur `useProcedureStore`/`proposerStructureProcedureAvecRepli` déjà comptés), typecheck et lint propres, `npm audit` 0 vulnérabilité sur `docxtemplater`/`pizzip`.
- **Vérification navigateur réelle** (Playwright, Chromium préinstallé): (1) chemin complet — création client/projet/section, import d'un gabarit `.docx` réel (balises obligatoires présentes), sélection, export, téléchargement d'un `.docx` réellement réouvrable dont les balises ont été correctement substituées par les valeurs réelles de la section, aucune erreur console; (2) rejet — import d'un gabarit sans les balises obligatoires, message d'erreur explicite affiché, gabarit non enregistré.
