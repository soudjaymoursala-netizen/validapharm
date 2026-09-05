# — Écran de revue de structure procédurale + déclenchement du repli

*27/08/2026 — clôture du dernier point ouvert laissé par ("aucun déclenchement automatique ni écran de revue construits dans ce lot"), sur accord explicite de l'utilisateur ("D'accord continue").*

## 1. Pourquoi maintenant (Comprendre)

Après les -24, deux briques existent mais restent isolées: le parseur déterministe (-22, couverture testée sur 5 documents réels de 4 genres) et le repli IA-assisté (vérifié par ancrage déterministe). Aucun appelant ne les orchestre, et aucun humain ne peut encore voir ni confirmer une proposition — le garde-fou ("aucune écriture sans confirmation humaine explicite") reste vrai en théorie mais n'a aucun point d'entrée réel dans l'application.

## 2. Ce qui existe déjà, réutilisé plutôt que réinventé

- `proposerStructureProcedure` (-22) et `proposerStructureProcedureParIA`: les deux fonctions pures restent inchangées, appelées telles quelles.
- `extraireTexteDocx`/`extraireTableauxDocx` et `extraireTextePdf`: réutilisés tels quels pour l'import de fichier dans l'écran.
- `construireAdaptateursIA`/`adaptateurAvecBascule` (`useProcedureStore` n'a pas besoin de connaître la bascule cloud/local — le même patron que `MissionWorkspace.vue` §raisonner est reproduit à l'identique).
- Style `.badge-confiance`/`LIBELLES_CONFIANCE` (établi par `MissionWorkspace.vue`): dupliqué à l'identique dans `RevueStructureProcedure.vue` (les styles Vue `scoped` ne se partagent pas entre composants sans feuille de style commune — dupliquer un court bloc CSS reste plus simple et plus sûr qu'introduire une dépendance de style inter-composants pour ce seul usage).
- `useProcedureStore.creerProcedure`/`ajouterEtape`: seul chemin d'écriture, jamais contourné.

## 3. Conception — pourquoi un déclenchement conditionnel plutôt que systématique

Appeler systématiquement le repli IA après le déterministe gaspillerait un appel réseau (coût, latence) même quand le déterministe a déjà trouvé une structure exploitable — et, plus grave, mélangerait silencieusement deux provenances dans une même proposition (une section détectée par motif à côté d'une étape inférée par IA), rendant la traçabilité de chaque élément ambiguë pour l'humain qui doit confirmer.

`proposerStructureProcedureAvecRepli(texte, tableaux, provider)` (`src/logique-metier/procedures/proposerStructureProcedureAvecRepli.ts`) tranche: le parseur déterministe est toujours essayé en premier; le repli IA n'est invoqué que si celui-ci ne retourne **strictement rien** (zéro section ET zéro étape). Le résultat est un type discriminé:

```ts
type PropositionAvecSource =
  | { source: 'deterministe'; sections: SectionDetectee[]; etapesProposees: EtapeProposee[] }
  | { source: 'ia'; sections: SectionDetecteeIA[]; etapesProposees: EtapeProposeeIA[]; texteReponseBrute: string }
```

`source` désigne toujours sans ambiguïté la provenance de la **totalité** du résultat — jamais un mélange implicite.

## 4. Implémentation

- **`useProcedureStore` étendu**: `derniereProposition` (état d'écran en attente, jamais persisté), `genererProposition(texte, tableaux, provider)` (délègue à `proposerStructureProcedureAvecRepli`, stocke le résultat), `annulerProposition` (efface sans rien écrire), `confirmerProposition(clientId, procedureInput, etapesRetenues)` (crée la `Procedure` puis chaque étape retenue dans l'ordre fourni par l'appelant — jamais l'ordre brut de la proposition, l'écran ayant pu réordonner/exclure des éléments — puis efface `derniereProposition`).
- **`RevueStructureProcedure.vue`** (nouvel écran, route `/clients/:clientId/procedures`, nom de route `revue-structure-procedure`, lien sidebar "Procédures" entre "Assistant IA" et "Miroir Drive"):
  - Zone de saisie: import de fichier (`.docx`/`.pdf`, réutilise les adaptateurs existants) ou collage de texte brut.
  - Génération: construit le `ProviderAdapter` (même patron que `MissionWorkspace.vue`), appelle `genererProposition`.
  - Revue: sections détectées affichées avec leur libellé d'origine et leur canon; étapes affichées sous forme éditable (case à cocher "Retenir", description modifiable, obligatoire/condition/responsable modifiables) — badge de confiance IA affiché par élément quand `source === 'ia'`.
  - Confirmation: formulaire de métadonnées (référence/titre/date d'effet) puis `confirmerProposition` avec uniquement les étapes retenues.
  - Liste des procédures déjà créées pour le client affichée en bas d'écran (preuve visuelle que la confirmation persiste réellement).

## 5. Explicitement non construit (limite assumée)

- Aucune réconciliation entre une nouvelle proposition et une `Procedure` existante de même référence — confirmer crée toujours une nouvelle version (`numero_version` auto-incrémenté, comportement déjà existant de `creerProcedure`), jamais une fusion.
- Aucune sauvegarde de brouillon d'édition entre deux sessions — `derniereProposition` est un état en mémoire, perdu si l'écran est quitté sans confirmer (cohérent avec "jamais persistée telle quelle").
- Aucune détection automatique de doublon entre étapes retenues.

## 6. Vérification

- Suite complète verte (85 fichiers / 589 tests), typecheck et lint propres.
- Tests dédiés: `proposerStructureProcedureAvecRepli.test.ts` (3, orchestration du seuil de déclenchement), `useProcedureStore.test.ts` (3 nouveaux: génération sans persistance, annulation sans écriture, confirmation avec ordre respecté).
- **Vérification navigateur réelle** (Playwright, Chromium préinstallé de l'environnement): (1) chemin déterministe complet — création d'un client, saisie de texte à en-têtes numérotés, génération, confirmation, `Procedure`/`ProcedureStep` réellement visibles dans la liste persistée de l'écran; (2) annulation — proposition générée puis annulée, aucune procédure créée; (3) repli IA sans fournisseur cloud configuré — erreur réseau affichée proprement à l'utilisateur (`RelayProviderAdapter` échoue en 404), jamais un plantage silencieux, même discipline que `PanneauChat`/`MissionWorkspace`.
