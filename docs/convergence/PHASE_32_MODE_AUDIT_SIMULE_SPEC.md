# Mode audit simulé du chat expert

**Statut**: Terminée (28/08/2026). Répond à un besoin spécifié de longue date (§4.4bis, jamais construit), avec une limite assumée en plus (voir §7).

## 1. Contexte et découverte

Après synchronisation de 2 documents Google Drive de grounding dans `docs/couche-ia/` (questionnaire de méthodologie de raisonnement de l'utilisateur, liste des livrables CQV/CSV — sources pour la future spécialisation des agents, hors périmètre d'implémentation directe de ce lot), l'utilisateur demande de continuer "dans la liste logique des choses qu'il y a à faire". Reprise du prochain chantier en file: le mode audit simulé du chat expert (§4.4bis).

Investigation du code réel avant conception: `ModeUsageIA` (`src/connecteurs/ia/ProviderAdapter.ts`) porte déjà `'chat_normatif' | 'audit_simule'` — anticipé lors de la conception du relais de production (v25) — mais `'audit_simule'` n'était consommé **nulle part** hors de la déclaration de type et d'un commentaire de code. `PanneauChat.vue` codait en dur `const MODE_ACTUEL = 'chat_normatif' as const` avec un commentaire explicite renvoyant ce mode à un backlog séparé.

**Gap plus profond découvert en investigant plus loin**: le commentaire de tête de `RelayProviderAdapter.ts` affirme *"Le relais route déjà vers le bon fournisseur/modèle selon mode (chat_normatif | audit_simule) et la configuration serveur associée au client"* — mais aucun relais IA Worker n'existe dans `workers/` (seul `ocr-relay/` y est construit). Le comportement documenté par ce commentaire n'a jamais été implémenté.

## 2. Décision de portée

`AskUserQuestion` soumise explicitement à l'utilisateur, 3 options:

1. **Construction du prompt côté frontend (recommandé)** — le relais reste un passe-plat sans état identique aux deux modes (cohérent avec les principes déjà actés, architecture PWA-only sans backend), le débat contradictoire et la simulation de persona sont assemblés côté client avant l'envoi.
2. Construire un vrai relais Worker Cloudflare avec routage serveur par mode, conforme au commentaire de `RelayProviderAdapter.ts`.
3. Reporter ce chantier.

L'utilisateur répond "Fais la suite logique", entérinant l'option recommandée (1).

## 3. Grounding de la méthodologie de prompt

La spécification (§4.4bis) décrit la méthodologie attendue: *"débat contradictoire multi-angles (fonctionnel, réglementaire, sécurité, qualité) puis, si pertinent, simulation d'un ou plusieurs profils d'auditeur (Swissmedic, FDA, cabinet de conseil GxP, QA spécialisée)"*. Plutôt que d'inventer cette méthodologie, elle reproduit exactement 2 patrons déjà réellement utilisés pour la revue de ce projet lui-même (`docs/archive/revues-audits/`):

- **Revue multi-experts** (`NN-revue-multi-experts-<DOC>.md`) — experts nommés (E1-E4+), position par angle, argumentation contradictoire en cas de désaccord, résolu par consensus documenté ou "point ouvert soumis à l'utilisateur" pour un arbitrage de gouvernance.
- **Audit simulé par persona** (`NN-audit-<persona>-<DOC>.md`) — postures Swissmedic/FDA/cabinet de conseil GxP/QA spécialisée, findings classés Majeur (compromet la défendabilité, correction requise) / Mineur (faiblesse réelle, impact limité) / Observation (bonne pratique, non bloquant), structurés Constat/Analyse/Base réglementaire/Sévérité.

## 4. Conception

### 4.1 `construirePromptAuditSimule` (`logique-metier/audit-simule/construirePromptAuditSimule.ts`)

Fonction pure — aucun appel réseau, même discipline que `construirePrompt` du Reasoning Engine. Assemble:

1. Le débat contradictoire multi-angles (toujours présent, jamais conditionnel).
2. La simulation de persona(s) (uniquement si `entrees.personas.length > 0`), listant les profils sélectionnés et la structure Constat/Analyse/Base réglementaire/Sévérité.
3. Le rappel non négociable, toujours en fin de prompt.
4. La question de l'utilisateur, reproduite verbatim — jamais résumée ou modifiée.

### 4.2 Qualification de fiabilité indexée par mode

`ClientConfig.ai_provider_reliability_qualification` migré de `QualificationFiabiliteIA | null` vers `Record<ModeUsageIA, QualificationFiabiliteIA | null>`. `useClientConfigStore.enregistrerQualification` prend désormais `(clientId, mode, saisie)` — qualifier un mode ne touche jamais l'entrée de l'autre. `qualificationFiabilite.ts` (fonctions pures `peutActiverFournisseur`/`deriveVersionDetectee`) inchangé dans sa logique: les appelants sélectionnent désormais l'entrée du bon mode avant de les invoquer.

### 4.3 `usePanneauChatStore`

- `MessageChatAffiche` porte un champ `mode` (le message affiché sait quel mode l'a produit).
- `alerteDerive` devient une fonction `(mode: ModeUsageIA) => boolean` plutôt qu'une propriété calculée unique — compare la dérive de version pour le mode donné uniquement.
- `envoyerQuestion` gagne un 5ᵉ paramètre optionnel `questionAffichee` (par défaut égal à `question`): permet d'envoyer au fournisseur le prompt engineered tout en affichant la question brute dans l'historique.

### 4.4 `PanneauChat.vue`

- Bascule radio explicite `chat_normatif`/`audit_simule` (`modeActuel`, jamais activé implicitement).
- Cases à cocher persona (affichées uniquement en mode `audit_simule`).
- Bandeau de rappel non négociable affiché à chaque activation du mode (en plus du rappel intégré à la réponse du fournisseur — double garantie).
- `envoyer` construit le prompt engineered via `construirePromptAuditSimule` uniquement en mode `audit_simule`, passe la question brute en `questionAffichee`.
- Chaque message affiché porte un badge de mode.
- `chatStore.alerteDerive(modeActuel)` appelé comme fonction (suite au changement §4.3).

### 4.5 `ConfigurationIA.vue`

Sélecteur de mode pour la qualification de fiabilité — un radio group `chat_normatif`/`audit_simule` détermine quelle entrée du `Record` est affichée/éditée par le formulaire de qualification existant.

## 5. Tests

- `construirePromptAuditSimule.test.ts` (nouveau, 5 cas): aucune persona → section débat seule; rappel toujours présent; une persona → section simulation ajoutée en plus du débat (jamais à sa place); plusieurs personas → toutes listées; question reproduite verbatim.
- `clientConfig.test.ts`: fixtures migrées vers la forme par mode, 2 nouveaux cas (qualification d'un mode n'affecte jamais l'autre).
- `panneauChat.test.ts`: `alerteDerive` testé comme fonction par mode (3 cas, dont un cas "qualifié pour un mode, non qualifié pour l'autre → pas de fausse alerte côté non qualifié"), nouveau cas `envoyerQuestion` avec `questionAffichee` distincte (le message affiché conserve la question brute, jamais le prompt engineered, vérifié également côté corps de requête intercepté).

Suite complète (668 tests, 95 fichiers), typecheck et lint: tous verts.

## 6. Vérification navigateur

Vérifié avec un navigateur Chromium réel (Playwright) contre le serveur de développement:

- Bascule vers `audit_simule` → cases persona et bandeau de rappel apparaissent; bascule retour vers `chat_normatif` → disparaissent.
- Sélection de 2 personas (Swissmedic, FDA), envoi d'une question → la requête réseau interceptée porte le prompt engineered complet (section débat + section simulation avec les 2 personas + rappel non négociable) tandis que le message affiché dans l'historique reste la question brute, avec son badge de mode "Audit simulé".
- Aucune erreur console.

## 7. Limites assumées

- Aucune migration Dexie écrite pour le changement de forme de `ai_provider_reliability_qualification` (objet unique → `Record` par mode) — cohérent avec le statut alpha du projet (aucune donnée de production existante) et le précédent déjà établi pour d'autres changements de forme additifs de ce projet.
- Le relais IA reste un passe-plat sans état, strictement identique pour les deux modes — aucun routage serveur par mode n'est construit, malgré le commentaire de `RelayProviderAdapter.ts` qui l'affirmait à tort déjà en place. Un futur besoin réel de routage serveur par mode (ex. modèles fournisseur distincts par mode) resterait un nouveau chantier.

## 8. Documentation alignée

- `03-specifications-fonctionnelles.md` v50 — nouveau §4.4bis, mise à jour du modèle `client_config.ai_provider_reliability_qualification`.
- `docs/convergence/TECHNICAL_DECISIONS.md` — décision technique associée consignée.
- `docs/convergence/CONVERGENCE_PLAN.md` — ce chantier marqué terminé.
