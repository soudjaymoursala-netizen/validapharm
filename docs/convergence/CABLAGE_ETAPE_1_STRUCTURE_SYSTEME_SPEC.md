# Câblage effectif de `Workspace` — Étape 1 : Structure Système (`AssetNode`)

*Revue panel E1-E7, 26/08/2026 — premier incrément du chantier "câblage effectif" annoncé dans `CONTEXTE-REPRISE-SESSION.md` §5.10 et priorisé explicitement par l'utilisateur.*

## Contexte

Phase 11 (`PHASE_11_ORGANIZATION_MIGRATION_SPEC.md`) a construit `Organization`/`Workspace` et la fonction pure `resoudreRegleEffective`, mais **aucun store métier existant ne les consomme**. Ce document couvre le premier store réellement câblé : `useStructureSystemeStore` (`AssetNode`/`AssetHierarchySchema`, référentiel d'actifs).

**Pourquoi ce store en premier** : un actif physique (équipement, ligne, salle) appartient naturellement à un site précis, pas à l'organisation entière — c'est le candidat le plus évident pour porter un `workspace_id` réel. Les autres ~41 entités `client_id` seront câblées dans des incréments ultérieurs séparés, un par un (jamais en bloc).

## E1 — Périmètre exact

- Ajouter `workspace_id: string | null` à `AssetNode` (nullable — `null` = nœud hérité non encore assigné à un site, ou assigné volontairement au périmètre global de l'organisation).
- `AssetHierarchySchema` (taxonomie des niveaux — Site/Bâtiment/Ligne/Équipement) **reste** keyed par `client_id` (= `Organization.id`) : la taxonomie des niveaux est une décision d'organisation, partagée par tous ses `Workspace`, pas une propriété par site. Aucun changement sur ce type.
- Garde-fou de création : si un `workspace_id` non-`null` est fourni à `creerNoeud`, il doit exister et appartenir à la même `Organization` que `clientId` — sinon erreur explicite, jamais un rattachement silencieux à un mauvais périmètre.
- Nouvelle fonction de lecture `noeudsVisiblesDepuisWorkspace(workspaceId, arbre)` : un nœud est visible depuis un `Workspace` s'il est assigné à ce `Workspace` **ou à l'un de ses ancêtres** (remontée d'arbre, même logique que `resoudreRegleEffective`), ou s'il n'a pas encore été assigné (`workspace_id === null`, pour ne jamais faire disparaître les données existantes/non migrées).
- **Hors périmètre explicite de cet incrément** : ne pas changer la portée de `codeDejaUtilise`/`introduitUnCycle` (unicité du code et détection de cycle restent à l'échelle de toute l'organisation, comme aujourd'hui) — aucune source ne justifie de les restreindre par site, et le faire serait un changement de comportement non demandé, potentiellement une régression de sécurité (deux sites pourraient alors réutiliser le même code pour deux actifs différents sans le savoir).

## E2 — Compatibilité ascendante (non-régression)

`workspace_id` est ajouté de façon strictement additive : tout nœud créé sans `workspace_id` explicite reçoit `null`, se comporte exactement comme avant (visible depuis n'importe quel `Workspace` de son organisation). Les 431 tests existants ne sont pas modifiés — seuls de nouveaux tests sont ajoutés.

## E3 — Garde-fous non négociables testés

1. `creerNoeud` avec un `workspace_id` inconnu → erreur explicite `workspace_introuvable`, aucune création.
2. `creerNoeud` avec un `workspace_id` d'une autre organisation → même erreur (jamais un rattachement croisé silencieux).
3. Scénario obligatoire **"Global + N sites"** : un nœud créé au niveau `global` est visible depuis Site A et Site B ; un nœud créé pour Site A n'est jamais visible depuis Site B ; un nœud legacy (`workspace_id: null`) reste visible partout.
4. Détection de cycle anti-boucle de l'arbre `Workspace` réutilisée telle quelle (`ancetresWorkspace`, extrait de `resoudreRegleEffective` sans dupliquer la logique).

## E4 — Réutilisation, pas de duplication

`ancetresWorkspace` (remontée d'arbre avec garde anti-cycle) est extrait de `resoudreRegleEffective` dans un module partagé `src/logique-metier/organisation/ancetresWorkspace.ts`, et `resoudreRegleEffective` est réécrit pour l'utiliser — une seule implémentation de la remontée d'arbre pour tout le domaine `Workspace`, testée une fois.

## E5 — Ce qui n'est PAS fait ici

- Pas d'écran de sélection de site dans Structure Système (aucun consommateur UI construit dans cet incrément — même discipline que tout le reste du projet).
- Pas de câblage d'un deuxième store dans ce commit (Test/Execution/Evidence, Quality Events, etc. restent pour des incréments séparés).
- Pas de changement de portée pour `codeDejaUtilise`/`introduitUnCycle` (voir E1).

## E6 — Documentation impactée

`03-specifications-fonctionnelles.md` §4.10 (Structure Système) complétée avec le nouveau champ et son comportement ; `CONVERGENCE_PLAN.md` et `CONTEXTE-REPRISE-SESSION.md` §5.10 mis à jour pour refléter ce premier incrément réalisé et pointer vers le suivant.

## E7 — Décision de conception

Visibilité par **héritage descendant uniquement** (un `Workspace` voit ses propres nœuds + ceux de ses ancêtres, jamais ceux de ses "cousins" ni de ses enfants) — cohérent avec `resoudreRegleEffective` (une règle définie au niveau global s'applique à tous les sites, une règle définie à un site ne s'applique qu'à lui). Un nœud créé pour un Site n'est donc jamais visible depuis un autre Site, ni depuis un Site enfant de ce Site à moins d'y être explicitement dupliqué — cette dernière nuance (visibilité descendante depuis un site vers ses propres sous-sites) n'est pas nécessaire ici car `AssetNode` n'a pas vocation à être partagé vers le bas (un équipement d'un site parent n'est pas automatiquement un équipement de son site enfant) ; seule la remontée (site → global) a un sens métier réel, documentée comme telle.
