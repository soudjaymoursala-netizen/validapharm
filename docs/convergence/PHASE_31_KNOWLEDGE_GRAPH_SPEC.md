# Knowledge Graph générique: parcours factorisé après un deuxième cas réel

**Statut**: Terminée (28/08/2026). Troisième et dernier des 3 chantiers P1 restants du plan `VISION_NORTH_STAR_CONVERGENCE.md`.

## 1. Contexte et découverte

`VISION_NORTH_STAR_CONVERGENCE.md` §3 (couche 5, "Knowledge Graph") note:

> Jointures typées ad hoc (`Couverture`, `ProvenanceLink`…) — pas de graphe générique interrogeable

Avant toute conception, investigation du code réel pour vérifier si une généralisation était justifiée. Résultat: **un seul consommateur réel** existait pour le patron "parcours de graphe" — `chaineTechniqueDepuis` (`logique-metier/architecture-technique/chaineTechnique.ts`), un parcours en largeur des `RelationTechnique` sortantes depuis un `AssetNode`. La règle de trois (satisfaite pour le Compliance Engine) **n'était pas satisfaite ici** — généraliser sur un seul cas aurait été une abstraction spéculative, contraire à la discipline du projet.

## 2. Décision de portée

`AskUserQuestion` soumise explicitement à l'utilisateur, 3 options:

1. **Laisser en backlog (recommandé)** — documenter le point ouvert sans construire, aucun 2ᵉ cas d'usage réel ne démontre le besoin.
2. Créer un 2ᵉ cas réel puis factoriser — `KnowledgeRelation` (réaligné sur le vrai modèle cible) partage exactement la même forme `{source, cible, type}` que `RelationTechnique`, mais n'a jamais eu de fonction de traversée ni d'outil Reasoning Engine.
3. Autre idée précise.

L'utilisateur choisit l'option 2 — la portée la plus large des trois, acceptée explicitement.

## 3. Conception

### 3.1 Parcours générique (`logique-metier/graphe/parcourirGraphe.ts`)

```ts
export function parcourirGraphe<TArete, TNoeud extends { id: string }>(
  noeudDepartId: string,
  aretes: readonly TArete[],
  noeuds: readonly TNoeud[],
  idSource: (arete: TArete) => string,
  idCible: (arete: TArete) => string,
): EtapeParcoursGraphe<TArete, TNoeud>[]
```

Paramétré par des **accesseurs** (`idSource`/`idCible`), jamais figé sur un nom de champ littéral — `RelationTechnique` porte `noeud_source_id`/`noeud_cible_id`, `KnowledgeRelation` porte `knowledge_item_source_id`/`knowledge_item_cible_id`: deux formes littérales différentes pour une sémantique identique. Même algorithme de parcours en largeur que l'original (aucune détection de cycle, un `visites` défensif évite seulement une boucle infinie d'exécution), extrait mot pour mot depuis `chaineTechniqueDepuis`.

### 3.2 Refactor de `chaineTechniqueDepuis` — comportement strictement identique

`chaineTechniqueDepuis` délègue désormais à `parcourirGraphe` et remappe `{ arete, noeud }` vers `{ relation, noeud }` (son nom de champ original). **Signature publique inchangée, comportement inchangé** — la suite de tests existante (`chaineTechnique.test.ts`) n'a subi aucune modification et reste verte, preuve directe de non-régression.

### 3.3 Deuxième cas réel: `relationsConnaissanceDepuis` (`logique-metier/graphe/relationsConnaissance.ts`)

Nouveau, consomme `parcourirGraphe` pour tracer les `KnowledgeRelation` sortantes depuis un `KnowledgeItem` — même structure que `chaineTechniqueDepuis` (remappe `{ arete, noeud }` vers `{ relation, item }`).

### 3.4 Nouvel outil du Reasoning Engine: `tracer_relations_connaissance`

- `DonneesOutilsRaisonnement` étendu de `knowledgeRelations: readonly KnowledgeRelation[]`.
- `tracerRelationsConnaissance(knowledgeItemId, donnees)` — fonction pure, même sémantique que `tracerChaineTechnique`.
- `CATALOGUE_OUTILS_RAISONNEMENT` étendu, nouveau `case` dans `executerOutil`.
- `useReasoningEngineStore.executerRaisonnement` charge `db.knowledgeRelations` et le passe dans `donnees`.
- `TypeObjetCitable` **inchangé** — `'knowledge_item'` couvrait déjà ce cas depuis l'origine, les résultats de cet outil sont des `KnowledgeItem`, déjà citables.

## 4. Tests

- `parcourirGraphe.test.ts` (nouveau) — 5 cas: chaîne linéaire, nœud sans arête sortante, cycle (aucune boucle infinie), arête vers un nœud inconnu, embranchement.
- `relationsConnaissance.test.ts` (nouveau) — 3 cas: chaîne tracée, aucune relation sortante, cycle sans boucle infinie.
- `outilsRaisonnement.test.ts` — 2 nouveaux cas (`tracerRelationsConnaissance` + `executerOutil` avec `tracer_relations_connaissance`), fixture `donnees` étendue de `knowledgeRelations`.
- **Aucune modification** de `chaineTechnique.test.ts` (4 cas, tous verts) — preuve directe de non-régression du refactor.
- `boucleRaisonnement.test.ts`: fixtures `DonneesOutilsRaisonnement` étendues du champ requis `knowledgeRelations: []` (changement mécanique, aucune modification de comportement testé).

Suite complète (660 tests, 94 fichiers), typecheck et lint: tous verts.

## 5. Vérification navigateur

Non construite dans ce lot — même discipline que `tracer_chaine_technique`: domaine + persistance (aucune nouvelle table, `knowledgeRelations` existait déjà) + fonction pure + outil de raisonnement seulement.

## 6. Limites assumées

- Aucun écran dédié.
- Aucune traversée croisée entre les deux domaines de graphe (Architecture Technique / Knowledge) — resterait une fabrication sans cas réel pour la justifier.
- Les autres jointures typées ad hoc du dépôt (`Couverture`, `ProvenanceLink`, `AssociationFonctionAssetNode`…) ne sont pas généralisées — aucun 3ᵉ cas réel ne le justifie à ce jour; `parcourirGraphe` reste disponible pour un futur cas homogène par paire de types (arête reliant deux entités du même type de part et d'autre).

## 7. Documentation alignée

- `03-specifications-fonctionnelles.md` v49 — §4.15.
- `docs/convergence/TECHNICAL_DECISIONS.md` — décision technique associée consignée.
- `docs/convergence/CONVERGENCE_PLAN.md` — ce chantier marqué terminé, le chantier suivant (Template Intelligence) renuméroté en conséquence.
- `docs/convergence/VISION_NORTH_STAR_CONVERGENCE.md` — item Knowledge Graph de la liste P1 et §3 (couche 5) marqués terminés; **les 3 chantiers P1 du plan Vision North Star sont désormais clos**.
