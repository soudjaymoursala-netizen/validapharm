# Phase 30 — Compliance Engine généralisé : factorisation du patron règle→blocage

**Statut** : Terminée (28/08/2026). **TD-028**. Deuxième des 3 chantiers P1 restants du plan `VISION_NORTH_STAR_CONVERGENCE.md`.

## 1. Contexte et découverte

`VISION_NORTH_STAR_CONVERGENCE.md` §3 (couche 14, "Compliance Engine") note :

> `verifierBlocageExport.ts` (un seul statut vérifié) — à généraliser

Aucun document source (Drive, package Target Architecture) ne précise l'ensemble des règles de conformité cibles au-delà de cet unique exemple. Construire de nouvelles règles métier sans grounding réel aurait constitué une fabrication, contraire à la discipline de ce plan.

Investigation du code existant : trois mécanismes de blocage **indépendants**, jamais factorisés, partagent exactement la même forme ("évaluer un ensemble de règles contre un contexte, retourner les règles bloquantes") :

1. `verifierBlocageExport.ts` (Phase 1) — un seul statut de `Section` (`propose_par_ia_non_valide`) bloque l'export.
2. `gardesFinalisation.ts` (garde-fous U-01/U-02/U-03, FDS §3.3) — plusieurs règles de liens obligatoires, filtrées par point de contrôle (`entree_en_verification`/`cloture_valide_en_interne`).
3. `useContentPlanStore.gelerContentPlan` (Phase 28, TD-026) — `readiness !== 'pret'` bloque le gel d'un `ContentPlan`.

La règle de trois est pleinement satisfaite : 3 implémentations réelles, indépendantes, jamais coordonnées entre elles, du même patron.

## 2. Décision de portée

`AskUserQuestion` soumise explicitement à l'utilisateur, 3 options :

1. **Factoriser le patron commun (recommandé)** — extraire un moteur générique et refactorer les 3 mécanismes existants pour le consommer, comportement strictement identique.
2. Passer directement au chantier 3 (Knowledge Graph) — laisser le Compliance Engine de côté, portée jugée trop floue sans nouvelle source.
3. Autre idée précise — une règle de conformité concrète fournie par l'utilisateur.

L'utilisateur choisit l'option 1.

## 3. Conception

### 3.1 Moteur générique (`logique-metier/conformite/evaluerReglesConformite.ts`)

```ts
export interface RegleConformite<TContexte, TCode extends string = string> {
  code: TCode
  bloque: (contexte: TContexte) => boolean
  message: string
}

export function evaluerReglesConformite<TContexte, TCode extends string = string>(
  contexte: TContexte,
  regles: readonly RegleConformite<TContexte, TCode>[],
): RegleConformite<TContexte, TCode>[]
```

Fonction pure : retourne les règles bloquantes **dans l'ordre de déclaration**, jamais un court-circuit au premier trouvé — nécessaire pour `gardesFinalisation` où plusieurs règles indépendantes (U-01 et U-02) peuvent s'appliquer simultanément au même contexte.

### 3.2 Refactor des 3 consommateurs — comportement strictement identique

- **`verifierBlocageExport.ts`** : une seule `RegleConformite` (`contenu_ia_non_valide`) dans un tableau. `verifierBlocageExport` reste `(section) => { bloque: false } | { bloque: true; motif: string }` — signature et comportement inchangés.
- **`gardesFinalisation.ts`** : 3 règles (`U-01`/`U-02`/`U-03`), chacune étendue d'un champ `pointDeControle` (non porté par `RegleConformite` lui-même — filtré avant l'appel au moteur générique). `evaluerGardesFinalisation(contexte, pointDeControle)` reste `MessageBlocageFinalisation[]` — signature et comportement inchangés.
- **`useContentPlanStore.gelerContentPlan`** : une règle `readiness_non_prete` remplace l'`if` inline. Le retour `{ erreur: 'donnees_non_pretes' }` reste identique.

Aucune des 3 signatures publiques n'a changé. Aucune nouvelle règle métier n'a été ajoutée à aucun des trois — le refactor est purement mécanique.

## 4. Tests

- `evaluerReglesConformite.test.ts` (nouveau) — 4 cas : aucune règle bloquante, une règle bloquante, plusieurs règles bloquantes simultanément (ordre de déclaration préservé, pas de court-circuit), aucune règle fournie.
- **Aucune suite de tests existante modifiée** : `verifierBlocageExport.test.ts` (5 cas), `gardesFinalisation.test.ts` (16 cas), `useContentPlanStore.test.ts` (11 cas) restent tous verts sans une seule ligne changée — preuve directe et la plus forte possible de non-régression comportementale.

Suite complète (649 tests, 92 fichiers), typecheck et lint : tous verts.

## 5. Vérification navigateur

Non applicable — refactor interne pur, aucun changement de comportement observable, aucun écran concerné.

## 6. Limites assumées

- Le moteur n'est branché sur aucun 4ᵉ consommateur dans ce lot — reste un outil disponible pour de futures règles de blocage, jamais imposé rétroactivement à un mécanisme qui n'en a pas besoin.
- Aucune nouvelle règle de conformité métier n'a été créée (ex. blocage d'export sur un critère autre que le statut de section) — resterait une fabrication sans source réelle pour la justifier.

## 7. Documentation alignée

- **URS/FS non modifiées** — ni l'une ni l'autre ne référence l'implémentation interne (`verifierBlocageExport.ts`/`gardesFinalisation.ts` par leur nom), seul le comportement observable compte, strictement inchangé.
- `docs/convergence/TECHNICAL_DECISIONS.md` — TD-028.
- `docs/convergence/CONVERGENCE_PLAN.md` — Phase 30 terminée, Phase 30 (Template Intelligence) renumérotée Phase 31.
- `docs/convergence/VISION_NORTH_STAR_CONVERGENCE.md` — item Compliance Engine de la liste P1 et §3 (couche 14) marqués terminés.
