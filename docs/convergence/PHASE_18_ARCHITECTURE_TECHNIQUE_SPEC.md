# Architecture Technique (relations typées)

*27/08/2026 — première phase du plan de convergence "Vision North Star" (`VISION_NORTH_STAR_CONVERGENCE.md`), priorité P0.*

## 1. Ce qui existe déjà (Comprendre)

- `AssetNode`: nœud d'un arbre configurable par client (`level_key: string`, libre — validé contre `AssetHierarchySchema.levels[]` définis par le client, jamais une énumération figée dans le code). Un client peut donc **déjà** créer des nœuds "PLC", "SCADA", "Serveur", "Base de données" sans aucun changement de code.
- `associated_nodes: string[]` sur `AssetNode`: graphe libre, non typé, cycles tolérés par conception documentée (`03_DOMAIN_DATA_MODEL.md`).
- `AssociationFonctionAssetNode`/`AssociationFonctionProcess`/`ManufacturingContext`: relient déjà un `AssetNode` à un `Process` (relation "used_by" du §10 de la vision, déjà couverte).

## 2. Comparer — ce qui manque réellement

La vision (§8, checklist D14-D20) demande de répondre à: *quel équipement, contrôlé par quel PLC, connecté à quel SCADA, hébergé sur quel serveur, utilisé par quel process* — une chaîne de relations **typées et dirigées**, pas une simple association. `associated_nodes[]` ne porte aucun type de relation (impossible de distinguer "contrôlé par" de "connecté à"). Aucune nouvelle entité de nœud n'est nécessaire (voir §1) — seule la relation typée manque.

## 3. Identifier / Proposer

- `TypeRelationTechnique`: `'controle_par' | 'connecte_a' | 'heberge_sur'` — les trois relations explicitement nommées dans l'exemple de chaîne du §8/§10 de la vision (Equipment→PLC→SCADA→Server). Type extensible (union de chaînes, pas un enum figé): un futur besoin réel (ex. `'utilise_donnees_de'` pour une base de données) s'ajoute sans migration de schéma.
- `RelationTechnique`: jointure explicite `AssetNode → AssetNode`, même pattern que `AssociationFonctionAssetNode` (pas de journal d'audit propre — c'est un enregistrement de relation, pas une entité à cycle de vie; même choix que les autres jointures N:M du projet).
- **Garde-fou**: les deux nœuds d'une relation doivent appartenir au même client — vérifié à la création, jamais silencieusement toléré (même discipline que `creerNoeud`/`workspace_introuvable`).
- **Pas de détection de cycle**: `associated_nodes[]` tolère déjà les cycles par conception; imposer une contrainte plus stricte aux relations typées créerait une incohérence entre deux mécanismes de graphe du même domaine, sans qu'aucune exigence de la vision ne le demande.
- `chaineTechniqueDepuis` (fonction pure, `logique-metier/architecture-technique/chaineTechnique.ts`): parcours en largeur des relations sortantes depuis un nœud de départ, retourne la liste résolue `{ relation, noeud }` dans l'ordre de découverte — réutilisable par un futur écran et par le Reasoning Engine.
- Extension du store `useStructureSystemeStore` (pas un nouveau store: la relation est purement `AssetNode↔AssetNode`, elle appartient au domaine déjà propriétaire de `AssetNode`): état `relationsTechniques`, `charger` les inclut, `creerRelationTechnique`, `chaineTechniqueDepuis`.
- Nouvel outil du Reasoning Engine: `tracer_chaine_technique` (paramètre `asset_node_id`), résultat la chaîne résolue — étend `DonneesOutilsRaisonnement` avec `assetNodes`/`relationsTechniques`, et `TypeObjetCitable` avec `'asset_node'` (une citation d'`AssetNode` doit désormais pouvoir être vérifiée, même discipline non négociable qu'avant).

## 4. Revue panel (E1-E7, condensée — domaine de données pur, risque réglementaire faible)

- **E1 (Fournisseur/IA-GAMP5-Part11)**: aucune nouvelle surface IA — le Reasoning Engine gagne un outil de *lecture* de plus, même garde-fou de vérification de citation déterministe déjà en place, étendu sans modification de sa logique.
- **E2 (Qualité/SMQ)**: aucun impact sur les statuts de qualification existants (`AssetNode.qualification_status` inchangé) — une relation technique ne modifie jamais l'état de qualification d'un nœud.
- **E3 (QA Réglementaire)**: la traçabilité de la relation (qui l'a créée, quand) est portée par `created_at` — suffisant pour une relation de fait (pas un enregistrement à approbation), cohérent avec `AssociationFonctionAssetNode`.
- **E4 (CSV)**: aucune modification de schéma destructive — Dexie v24 est un ajout pur de table, aucune table existante modifiée.
- **E5 (Architecte logiciel)**: validé — réutilise `AssetNode` plutôt que de dupliquer un modèle d'équipement parallèle (voir §2), cohérent avec la discipline "étendre, jamais dupliquer" déjà appliquée ailleurs dans le projet.
- **E6 (Métrologie)**: sans objet — aucune mesure/instrument concerné par cette phase.
- **E7 (Maintenance)**: sans objet — aucun plan de maintenance concerné.

**Décision technique associée**: voir `TECHNICAL_DECISIONS.md`.

## 5. Explicitement non construit (limite assumée)

- Aucune nouvelle entité `Equipment`/`System`/`PLC`/`SCADA`/`Server`/`Database`/`Network`/`Software`: ce sont des `AssetNode` avec un `level_key` approprié (§1).
- Aucune détection de cycle sur `RelationTechnique` (§3).
- Aucun écran dédié — domaine + persistance + store + outil de raisonnement seulement (même discipline que les autres domaines construits sans écran).
- Aucune extension aux couches Database/Network au-delà des 3 types de relation nommés — ajout futur sur besoin réel démontré, jamais anticipé sans preuve.

## 6. Vérification

Tests unitaires sur la fonction pure de traversal (chaîne simple, nœud isolé, relations de types différents depuis le même nœud), tests du store (création de relation, garde-fou client croisé, `chaineTechniqueDepuis`), tests de l'outil de raisonnement (résolution correcte, citation d'`AssetNode` vérifiable). Suite complète (`npx vitest run`, `npm run typecheck`, `npm run lint`) verte avant commit.
