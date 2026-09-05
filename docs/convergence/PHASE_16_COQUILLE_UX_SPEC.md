# Coquille UX (sidebar + Accueil + mode dual)

*26/08/2026 — répond à la critique UX explicite de l'utilisateur ("c'est bof et pas intuitif ni pro") et à la vision d'un accueil "Que voulez-vous faire ?" plutôt qu'une liste de modules.*

## 1. Ce qui existe déjà (Comprendre)

- Chaque écran construit son **propre bandeau de navigation ad hoc** (`<header><RouterLink>...`) — aucune coquille partagée. C'est la cause directe de la critique UX.
- La quasi-totalité des écrans utiles (Structure Système, Assistant stratégie de qualification, Panneau Chat, Configuration Drive/IA) sont **scindés par `clientId`** (route `/clients/:clientId/...`) — `GestionClients.vue` est aujourd'hui le seul point d'entrée réel vers ces écrans (liste de clients, un lien par client vers chaque outil).
- Aucun concept de "client actif" ne survit d'une navigation à l'autre — chaque écran reçoit son `clientId` par un paramètre de route explicite, jamais mémorisé.
- `Organization`/`Workspace` n'ont toujours aucun écran de gestion ni câblage de navigation réel (déjà noté à l'époque: "aucun consommateur réel construit dans ce périmètre").

## 2. Comparer — la contrainte réelle qui façonne la coquille

Un sidebar "par intention" présuppose de pouvoir pointer directement vers un outil (Structure Système, Qualité, Assistant IA). Mais ces outils exigent un `clientId` que la coquille, par nature transverse à tous les écrans, ne connaît pas nativement. Deux options:
- **Fabriquer un concept global de "client actif" côté backend/domaine** — prématuré, aucun cas réel ne le demande encore, contraire à la discipline déjà appliquée jusqu'ici.
- **Mémoriser côté navigateur** (préférence UI, pas une entité métier) le dernier client visité, pour que la sidebar propose un accès direct — réversible, non intrusif, jamais persisté en base.

**Décision retenue**: la seconde option — `useClientActifStore` (Pinia, persistance `localStorage`, jamais Dexie) mémorise le dernier `clientId` visité sur un écran scindé par client; la sidebar l'utilise pour proposer un accès direct aux outils, ou invite à choisir un client si aucun n'a encore été visité. C'est une commodité de navigation, pas une nouvelle donnée métier.

## 3. Identifier / Proposer — périmètre retenu

**Construit dans ce lot**:
- `BarreLaterale.vue`: navigation groupée par intention (Accueil / Mon travail / Clients / outils du client actif / Configuration), jamais une simple liste plate d'écrans.
- `CoquilleApplication.vue`: coquille partagée (sidebar + zone de contenu) enveloppant `RouterView` — remplace l'affichage nu actuel dans `App.vue`, uniquement pour l'état `pret` (jamais pour `BlocageIncompatibilite`, un écran de blocage au démarrage qui ne doit rien montrer d'autre).
- `AccueilQueVoulezVousFaire.vue`: nouvel écran "Que voulez-vous faire ?" à la racine (`/`), cartes d'action vers les capacités réellement construites (nouveau projet, mes projets, mes clients) — jamais une fonctionnalité aspirationnelle non construite.
- `useClientActifStore`: mémorise le dernier `clientId` visité (localStorage), mis à jour par un garde de navigation (`router.afterEach`) sur toute route portant un paramètre `clientId` — jamais une nouvelle table Dexie.
- **Mode Expert / Mode Assistant**: bascule dans la sidebar (`useModeAffichageStore`, localStorage) — persistée et réellement fonctionnelle comme préférence, mais **sans effet comportemental sur les écrans existants dans ce lot** (voir limite assumée ci-dessous): "coexistants sur le même moteur" signifie qu'aucun nouveau moteur n'est créé pour le mode Assistant, pas que les écrans déjà construits changent d'apparence aujourd'hui.
- Route `tableau-de-bord` déplacée de `/` vers `/tableau-de-bord` (le nom de route ne change pas — toutes les références existantes par nom restent valides, changement non cassant vérifié).

**Explicitement non construit ici (limite assumée)**:
- Aucune différenciation comportementale réelle entre Mode Expert et Mode Assistant sur les écrans existants — la vision (Context → Analyze → Generate → Review → Export en mode Assistant) suppose un futur Mission workspace, qui n'existe pas encore. Fabriquer une différence cosmétique sans substance serait mentir sur l'état d'avancement.
- Aucun concept de "client actif" persisté côté domaine/serveur — uniquement une mémoire de navigation côté navigateur (voir §2).
- Aucun écran existant supprimé ni son bandeau de navigation ad hoc retiré — la coquille s'ajoute, elle ne remplace pas encore les liens internes de chaque écran (nettoyage cosmétique différé, non requis pour l'acceptation de cette phase).
- Aucun écran de gestion `Organization`/`Workspace` — toujours hors périmètre (déjà relevé ainsi).

## 4. Vérification

Tests composants (`@vue/test-utils`, même outillage que `RenduGabarit.test.ts`): `BarreLaterale.vue` (groupes affichés, lien direct vers un client actif mémorisé, invite à choisir un client si aucun mémorisé), `AccueilQueVoulezVousFaire.vue` (cartes d'action présentes et fonctionnelles). Tests unitaires: `useClientActifStore` (mémorisation, persistance localStorage, isolation), `useModeAffichageStore` (bascule, persistance). Suite complète (`npx vitest run`, `npm run typecheck`, `npm run lint`) verte avant commit. Vérification manuelle dans un navigateur réel (démarrage de l'app, navigation Accueil → Clients → outil client → retour) avant de considérer la phase terminée, conformément à la discipline "tester dans un vrai navigateur pour tout changement UI" déjà établie.
