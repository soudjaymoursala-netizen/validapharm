# — Context Engine enrichi: narratif + grounding réel

*27/08/2026 — premier chantier P1 ("critique") engagé du plan `VISION_NORTH_STAR_CONVERGENCE.md` §4, sur demande explicite de l'utilisateur d'entamer le prochain chantier après la.*

## 1. Pourquoi maintenant (Comprendre)

`VISION_NORTH_STAR_CONVERGENCE.md` §4 liste "Context Engine enrichi (narratif WHY/WHAT/WHERE/HOW/IMPACT)" comme premier item P1. En creusant l'implémentation réelle avant toute conception (discipline de ce projet: jamais fabriquer sans avoir vérifié le code existant), un fait structurant a été découvert: `useReasoningEngineStore.executerRaisonnement` reçoit un `contextSnapshotId`, mais ne l'utilise **que** pour le persister sur `AIRequest.context_snapshot_id` — aucune fonction ne résout ce snapshot en texte injecté dans le prompt envoyé au fournisseur IA (`construirePrompt`). Le Context Engine et le Reasoning Engine sont donc déconnectés en pratique, malgré un câblage apparent dans `MissionWorkspace.vue` (bouton "Assembler le contexte" à côté du formulaire de raisonnement).

**Recherche du concept source**: la formulation exacte "narratif WHY/WHAT/WHERE/HOW/IMPACT" n'a été retrouvée dans aucun document Google Drive relu pour cette phase — le document "MASTER PRODUCT VISION / NORTH STAR" cité par `VISION_NORTH_STAR_CONVERGENCE.md` semble avoir été transmis directement par l'utilisateur lors d'un tour de conversation antérieur non conservé dans Drive. Le concept le plus proche réellement localisé (dossier `10- Architecture détaillée`, package déjà lu intégralement) provient de `01_ARCHITECTURE_MASTER_FINAL.md` et `04_RELATIONSHIP_MATRIX_FINAL.md`: Context = FACTS, Method/SOP = HOW, Rules/Risk/Requirements/History = WHY/CONSEQUENCES — utilisé comme fondement de la conception plutôt qu'inventé depuis le seul intitulé du plan.

## 2. Décision de portée soumise à l'utilisateur

Trois options ont été présentées explicitement (jamais décidées unilatéralement, la portée touchant un mécanisme déjà validé):
1. **Narratif + grounding réel** — organiser le contexte en facettes ET l'injecter réellement dans le prompt du Reasoning Engine.
2. Narratif seul (UI/traçabilité) — sans toucher au Reasoning Engine.
3. Reporter et démarrer un autre chantier P1.

L'utilisateur a choisi l'option 1, acceptant explicitement le changement de comportement du moteur de raisonnement.

## 3. Ce qui existe déjà, réutilisé plutôt que réinventé

- `assemblerElementsContextSnapshot`: reste l'unique mécanisme de résolution — ce lot ne résout **aucun** nouvel objet, il réorganise ce qui est déjà résolu.
- `construirePrompt`/`executerBoucleRaisonnement`: étendus par des paramètres **optionnels**, jamais réécrits — rétrocompatibilité totale vérifiée par la suite de tests existante (aucune régression).
- Vérification de citation déterministe (`idsConnus`): réutilisée telle quelle, seulement enrichie en amont.

## 4. Implémentation

- **`narratifContexteSnapshot.ts`** (nouveau, `src/logique-metier/contexte/`): `construireNarratifContexte(items, assetNodes, manufacturingContexts, qualityEvents)` répartit chaque `ContextSnapshotItem` déjà résolu dans l'une de 4 facettes (`ou`/`quoi`/`comment`/`pourquoiImpact`) selon `type_objet`; `comment` reste **toujours vide** — `Procedure` n'a aucun rattachement `AssetNode`/`Workspace` (limite déjà actée). `serialiserNarratifContexte` produit le texte prêt à injecter (sections vides omises). `idsNarratifContexte` liste les identifiants représentés.
- **`construirePrompt`** (étendu): nouveau paramètre optionnel `narratifContexte?: string`, préfixé avant `Objectif:` quand fourni et non vide.
- **`executerBoucleRaisonnement`** (étendu): nouveau paramètre optionnel `narratifContexte?: NarratifContexteSnapshot`. Ses identifiants sont ajoutés à `idsConnus` **avant le premier tour** — même garantie qu'un identifiant obtenu par un appel d'outil (données déterministes déjà résolues au moment de l'assemblage du `ContextSnapshot`), jamais une confiance accrue sur la seule affirmation du modèle.
- **`useReasoningEngineStore.executerRaisonnement`** (étendu): quand `contextSnapshotId` est fourni, charge `manufacturingContexts`/`qualityEvents`/`contextSnapshotItems` (les deux premiers n'étaient pas chargés du tout jusqu'ici), construit le narratif, le transmet à `executerBoucleRaisonnement`.
- **`MissionWorkspace.vue`**: la liste plate `<ul>{{ type_objet }}: {{ objet_id }}</ul>` est remplacée par un rendu en 4 facettes nommées (Où/Quoi/Comment/Pourquoi-Impact).

### Gap corrigé au passage

`MissionWorkspace.vue`'s `assemblerContexte` codait en dur `manufacturingContexts: []` — `useProcessContextStore` n'était jamais importé sur cet écran. Corrigé: la facette QUOI est désormais réellement peuplée quand des `ManufacturingContext` existent pour le nœud d'ancrage.

## 5. Explicitement non construit (limite assumée)

- Aucune résolution de `Procedure` dans la facette COMMENT — limite déjà actée, non revisitée ici sans nouvelle preuve.
- **Aucun écran de création pour `ManufacturingContext` ni `QualityEvent`** dans toute l'application — gap **préexistant**, découvert en préparant la vérification navigateur de cette phase, ni introduit ni corrigé par ce lot (aurait élargi la portée bien au-delà du Context Engine). Les facettes QUOI et POURQUOI/IMPACT sont donc vérifiées uniquement par test unitaire de la fonction pure, jamais en conditions d'écran réel.
- Aucune UI dédiée pour visualiser le narratif hors de `MissionWorkspace.vue`.

## 6. Vérification

- Suite complète verte (88 fichiers / 612 tests, 10 nouveaux), typecheck et lint propres.
- **Vérification navigateur réelle** (Playwright) — limitée à la facette OÙ (seule atteignable via écran, voir limite ci-dessus): création d'un client, d'un niveau de hiérarchie et d'un `AssetNode` via Structure Système, création d'une `Mission` ancrée sur ce nœud, assemblage du contexte → la facette "Où" affiche correctement `"Ligne A12 (SYS-A12) — statut de qualification: non_qualifie"` (texte produit par `construireNarratifContexte`, confirmant la chaîne complète résolution → narratif → affichage); déclenchement d'un raisonnement (aucun fournisseur configuré) → erreur réseau affichée proprement, aucune erreur console autre que l'échec réseau attendu.
