# Repli IA-assisté de structuration procédurale

*27/08/2026 — second volet de "Fais les deux" (ingestion PDF; repli IA). Point resté ouvert depuis un lot précédent, formellement engagé après que la couverture déterministe a été testée sur 4 genres réels distincts (5 documents: Sanofi, Ferring×2, IMA, Markem-Imaje, Nordson).*

## 1. Pourquoi maintenant (Comprendre)

Ce point restait explicitement ouvert: "l'extraction automatique de structure par IA... représente un saut d'ambition réel... à trancher explicitement avec l'utilisateur avant de l'engager". L'utilisateur a tranché en deux temps: d'abord "tout faire d'abord sans l'IA", puis, une fois la couverture déterministe démontrée insuffisante sur un 4ᵉ genre réel indépendant (Nordson), "Fais les deux [PDF + repli IA]" — le repli est maintenant explicitement autorisé, pas décidé unilatéralement.

## 2. Ce qui existe déjà, réutilisé plutôt que réinventé

- `ProviderAdapter`/`envoyerAvecBascule` (`connecteurs/ia/`, `routeur-ia/`): contrat fournisseur IA déjà éprouvé (chat expert, §4.4) — `envoyerMessage(mode, contexte, question)` retourne `{ texte, version_moteur, citations }`. Réutilisé tel quel, aucune nouvelle interface fournisseur.
- `EtatConfianceIA`: les 5 états existants suffisent — pas de nouvel état inventé pour ce lot.
- **Principe non négociable inchangé**: `Procedure`/`ProcedureStep` restent une structure saisie/confirmée par un humain — ce repli produit une *proposition*, jamais une écriture directe.

## 3. Conception — pourquoi pas le mécanisme de citation du Reasoning Engine

Le Reasoning Engine vérifie qu'une citation résout vers un **objet du domaine déjà obtenu par appel d'outil** — mécanisme conçu pour interroger des données existantes, pas pour proposer une structure encore inexistante. Rien à citer ici: la garantie doit porter sur autre chose — que le modèle **recopie** le texte source plutôt que de l'halluciner ou de le reformuler.

**Vérification déterministe d'ancrage** (nouvelle, propre à ce lot): chaque section/étape proposée est comparée (texte normalisé — casse, espaces) au document source. Présente → `'infere'` (le regroupement reste une déduction du modèle, jamais vérifié point par point — jamais `'connu'`, réservé à une citation vers un objet déjà persisté). Absente → `'a_verifier'`, jamais un état plus confiant sur la seule affirmation du modèle — même philosophie que la vérification de citation, appliquée ici au texte plutôt qu'à un identifiant d'objet.

**Protocole de sortie contraint** (`SECTION|<canon>|<titre>` / `ETAPE|<description>`, une ligne = un marqueur) plutôt que du JSON libre — même discipline que le protocole texte de `boucleRaisonnement.ts`: un format contraint se parse déterministiquement et échoue proprement (ligne ignorée) plutôt que de planter sur une sortie malformée.

## 4. Implémentation

`proposerStructureProcedureParIA(texte, provider)` (`src/logique-metier/procedures/proposerStructureProcedureIA.ts`): construit le prompt (consigne explicite de recopier le texte source mot pour mot), appelle `provider.envoyerMessage('chat_normatif'...)`, parse la réponse ligne à ligne, vérifie l'ancrage de chaque élément, retourne `PropositionStructureProcedureIA { sections, etapesProposees, texteReponseBrute }` — `texteReponseBrute` jamais rejetée même si le parsing échoue (traçabilité minimale, même discipline qu'`AIResponse.texte`).

Un canon renvoyé par le modèle mais absent de la liste connue est replié sur `'autre'` — jamais une catégorie fabriquée acceptée telle quelle.

## 5. Explicitement non construit (limite assumée)

- Aucun déclenchement automatique — un futur appelant décide quand invoquer ce repli (ex. le parseur déterministe ne trouve aucune section). Non câblé dans ce lot.
- Aucun écran de revue humaine — même discipline que le parseur déterministe: domaine d'abord, écran quand un cas d'usage réel le réclame.
- Aucune détection avancée de reformulation partielle (paraphrase proche mais non identique) — la vérification est un ancrage de sous-chaîne normalisée, pas une similarité sémantique floue; un texte légèrement reformulé sera honnêtement marqué `'a_verifier'`, jamais accepté à tort.

## 6. Vérification

84 fichiers / 583 tests (6 nouveaux: transmission du contenu joint, ancrage réussi → `'infere'`, hallucination/reformulation → `'a_verifier'`, insensibilité casse/espaces sans faux positif, canon inconnu → `'autre'`, ligne malformée ignorée sans plantage + réponse brute conservée), typecheck et lint verts.
