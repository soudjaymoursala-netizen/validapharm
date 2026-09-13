# Chantier « pages » (fonctionnel + UI) — recap de continuité

**Ce fichier est la mémoire de ce chantier précis.** Il ne remplace pas
`docs/CONTEXTE-REPRISE-SESSION.md` (état global du projet) — il sert
uniquement à ce que n'importe quelle session Claude (même sur un autre
compte, même après une perte de contexte) puisse reprendre exactement là
où la précédente s'est arrêtée, sans re-poser de questions déjà tranchées.

**Règle pour toute nouvelle session qui reprend ce chantier** : lire ce
fichier en entier avant d'agir, en particulier la section « Reste à faire »
qui fait foi sur l'ordre et l'état d'avancement — ne pas repartir de zéro,
ne pas re-choisir un ordre différent sans dire pourquoi.

---

## 1. Objectif et méthode (décidés par l'utilisateur le 12/09/2026)

- Reprendre l'app **écran par écran, en partant de la page de connexion
  (`Login.vue`)**, dans l'ordre listé en §3.
- Pour **chaque écran**, mener deux chantiers distincts et les livrer
  séparément (deux commits/PR, pas mélangés) :
  1. **Chantier fonctionnel** — bugs réels, comportements cassés ou
     incohérents, edge cases non gérés, trouvés en exerçant l'écran avec
     de vraies données (pas de simple lecture de code).
  2. **Chantier esthétique / UI** — refonte visuelle propre et moderne
     (espacement, hiérarchie visuelle, cohérence avec le reste de l'app,
     responsive, états vides/chargement/erreur soignés), sans changer le
     comportement fonctionnel.
- **Client de test dédié** : voir §2 — à ne jamais confondre avec
  FERRING PHARMACEUTICAL (client réel de l'utilisateur). Supprimable
  définitivement par l'utilisateur à la fin de l'ensemble du chantier.
- **Agents** : recourir à des sous-agents en parallèle quand un écran s'y
  prête (ex. un agent sur le chantier fonctionnel, un autre sur le
  chantier esthétique du même écran, en simultané) — décidé au cas par
  cas selon la taille de l'écran, pas systématique sur les petits écrans.
- **Git** : push CLI direct impossible depuis ce sandbox (pas
  d'identifiants configurés) — tout passe par l'édition/upload GitHub web
  UI, piloté via navigateur (méthode déjà utilisée pour les PR
  précédentes, ex. #34 à #38). Une PR par chantier fini, CI « Quality gate »
  attendue avant merge, comme pour le reste du dépôt.
- **Mise à jour de ce fichier** : à chaque fin de chantier (fonctionnel ou
  esthétique) sur un écran, mettre à jour §4 (dernières tâches réalisées)
  et §3 (cocher l'écran/le chantier terminé) **avant** de passer à l'écran
  suivant — jamais en fin de session seulement, pour rester fiable même en
  cas de coupure brutale.

---

## 2. Client de test

**Créé le 12/09/2026** : nom exact `QA — Chantier Pages (test, à
supprimer)`, secteur non renseigné, `clientId` =
`a25ae104-6117-451c-b80d-7ca9cf13f2d1`. Aucun projet ni structure système
encore créés dessus à ce stade — à faire dès qu'un écran testé en a besoin
(ex. `FicheProjet.vue`, `StructureSysteme.vue`). Ne jamais toucher aux
données de FERRING PHARMACEUTICAL pour ces tests.

---

## 3. Liste des écrans et état d'avancement

Ordre de traitement : `Login.vue` en premier (imposé explicitement par
l'utilisateur), puis le reste de l'app dans l'ordre du parcours normal
d'un utilisateur (connexion → accueil → gestion clients → structure/process
→ projets/missions → reste). Cet ordre pourra être ajusté en cours de route
si un écran s'avère bloquant pour en tester un autre (ex. il faut un projet
créé pour tester `FicheProjet.vue`).

Légende : ⬜ pas commencé · 🔧 fonctionnel en cours · 🎨 UI en cours · ✅ fait

| Écran | Fonctionnel | UI |
|---|---|---|
| `Login.vue` | ✅ | ✅ |
| `AccueilQueVoulezVousFaire.vue` | ✅ | ✅ |
| `GestionClients.vue` | ✅ | ✅ |
| `FicheClient.vue` | ✅ | ✅ |
| `ConfigurationClient.vue` | ✅ | ✅ |
| `StructureSysteme.vue` | ⬜ | ⬜ |
| `SuiviPeriodicite.vue` | ⬜ | ⬜ |
| `Process.vue` | ⬜ | ⬜ |
| `RevueStructureProcedure.vue` | ⬜ | ⬜ |
| `TemplatesFormulaires.vue` | ⬜ | ⬜ |
| `TableauDeBord.vue` | ⬜ | ⬜ |
| `FicheProjet.vue` | ⬜ | ⬜ |
| `ListeMissions.vue` | ⬜ | ⬜ |
| `MissionWorkspace.vue` | ⬜ | ⬜ |
| `AssistantStrategieQualification.vue` | ⬜ | ⬜ |
| `AssistantCreationLivrable.vue` | ⬜ | ⬜ |
| `EditeurSection.vue` | ⬜ | ⬜ |
| `DefinitionTests.vue` | ⬜ | ⬜ |
| `ExecutionTests.vue` | ⬜ | ⬜ |
| `RiskAssessmentAmdec.vue` | ⬜ | ⬜ |
| `ImpactAssessment.vue` | ⬜ | ⬜ |
| `ComputerSystemAssessment.vue` | ⬜ | ⬜ |
| `JournalAnomalies.vue` | ⬜ | ⬜ |
| `ResolutionConflit.vue` | ⬜ | ⬜ |
| `DossierVivantActif.vue` | ⬜ | ⬜ |
| `BlocageIncompatibilite.vue` | ⬜ | ⬜ |
| `SourceIntelligence.vue` | ⬜ | ⬜ |
| `ContentPlan.vue` | ⬜ | ⬜ |
| `PanneauChat.vue` | ⬜ | ⬜ |
| `RechercheGlobale.vue` | ⬜ | ⬜ |
| `ConfigurationConnecteursQMS.vue` | ⬜ | ⬜ |
| `ConfigurationDrive.vue` | ⬜ | ⬜ |
| `ConfigurationIA.vue` | ⬜ | ⬜ |
| `Parametres.vue` | ⬜ | ⬜ |
| `ParametresCritiques.vue` | ⬜ | ⬜ |
| `Profil.vue` | ⬜ | ⬜ |
| `AdminUtilisateurs.vue` | ⬜ | ⬜ |
| `BibliothequeNormes.vue` | ✅ *(hors chantier — déjà traité début septembre : bug preview PDF, imports 0-octet, OAuth Drive)* | ⬜ *(non couvert par les chantiers précédents, reste à faire si jugé utile)* |

---

## 4. Dernières tâches réalisées (log, plus récent en haut)

- **13/09/2026** — `ConfigurationClient.vue` **terminé** (fonctionnel + UI),
  3 commits sur `main` (2 fonctionnel dont 1 sur des stores partagés, 1
  esthétique), CI verte sur les trois :
  - Fonctionnel (`caa1f53` + `eae65ad`) : même famille de bug que les
    écrans précédents, mais trouvée à **quatre endroits distincts** sur cet
    écran — `enregistrer()`/`effacer()` (dépôt GitHub), `enregistrerRelais()`/
    `effacerRelais()` (Relais IA) ne capturaient jamais les exceptions de
    connectivité, et le `onMounted` enchaînait trois `charger()` (GitHub,
    Relais IA, Authentification) **sans isolation** : un échec sur le
    premier bloquait le chargement des deux suivants, laissant croire que
    toute la configuration avait disparu. Corrigé à deux niveaux :
    1. Écran — chaque action et chaque `charger()` du `onMounted` isolés
       dans leur propre `try/catch`, avec un message affiché plutôt qu'un
       échec silencieux (formulaire gardé intact avec la saisie en cours).
    2. **Stores partagés** (`useConnexionGitHubStore.charger()`,
       `useConnexionRelaisIAStore.charger()`) — ajout d'un `catch` interne
       manquant, sur le même principe que `useClientsStore.chargerClients()`
       déjà en place. Ces deux stores sont aussi appelés par
       `MissionWorkspace.vue`/`RevueStructureProcedure.vue`/`EditeurSection.vue`
       (hors chantier pour l'instant) — corrigés au niveau store plutôt
       qu'au niveau écran pour que ces écrans futurs en bénéficient déjà
       sans repasser dessus. 3 tests ajoutés dans un nouveau fichier
       `ConfigurationClient.test.ts` (aucun test n'existait avant sur cet
       écran) — dont un qui mocke directement `useConnexionGitHubStore().charger`
       pour prouver l'isolation réelle du `onMounted`, indépendamment du
       correctif interne au store.
  - UI (commit `4531bae`, contenu identique au commit local `41eac02`) :
    trouvé en comparant un rendu réel de l'écran — tous les boutons («
    Enregistrer », « Effacer », « Tester la connexion ») apparaissaient
    visuellement identiques (fond neutre), alors que `tokens.css` définit
    une hiérarchie globale (`button[type="submit"]` violet/primaire, le
    reste neutre/bordé). Cause : une règle locale scoped `button {...}` /
    `button:disabled {...}` sur cet écran masquait la règle globale pour
    tout l'écran. Corrigé par **suppression** de cette règle locale
    redondante plutôt que par ajout — laisse la hiérarchie globale
    s'appliquer normalement (vérifié visuellement en local,
    `localhost:5173/configuration`, route non protégée via
    `ROUTES_SANS_GARDE`).
- **12/09/2026** — `FicheClient.vue` **terminé** (fonctionnel + UI), 2
  commits sur `main`, CI verte sur les deux :
  - Fonctionnel (`2325909`) : même défaut exact que `GestionClients.vue` —
    `enregistrer()` (édition des infos client) ignorait le résultat de
    `modifierClient` et ne capturait jamais les exceptions de connectivité ;
    un échec refermait quand même le formulaire, perdant la saisie sans
    message. Corrigé avec le même motif (bandeau d'erreur, libellés
    métier). 2 tests ajoutés (5/5 passent).
  - UI (`f5173ff`) : écran déjà bien conçu (cartes/ombres/hover cohérents
    avec l'Accueil), bénéficie aussi automatiquement du correctif de focus
    global. Seul écart trouvé : le secteur s'affichait en texte brut ici
    contre un badge coloré dans `GestionClients.vue` pour le même concept
    — aligné.
- **12/09/2026** — `GestionClients.vue` **terminé** (fonctionnel + UI), 3
  commits sur `main` (le 3e touche un fichier partagé), CI verte sur les
  trois :
  - Fonctionnel (`505b336`) : les 4 actions serveur de l'écran (créer,
    archiver, désarchiver, supprimer définitivement un client) ignoraient
    totalement le résultat retourné par `useClientsStore` (union
    `Client | {erreur}`) et ne capturaient jamais les exceptions de
    connectivité levées par `AuthApiClient` — même défaut que `Login.vue`,
    mais ici sur des actions plus sensibles. Le cas le plus net : un échec
    de création (ex. conflit serveur) fermait quand même le formulaire et
    effaçait le brouillon saisi, exactement comme un succès. Corrigé avec
    des messages d'erreur (bandeau formulaire pour la création, bandeau de
    page pour les 3 autres) et des libellés humains pour les codes métier
    connus du Worker (`deja_archive`/`deja_actif`/etc.). 3 tests ajoutés
    (5/5 passent).
  - UI (`58f2f70` + `7204c81`) : trouvé en testant réellement le survol/focus
    dans le navigateur, pas seulement en relisant le code —
    1. `tokens.css` (partagé, `7204c81`) : la Phase 41 déjà en place ne
       couvrait que `input`/`select`/`textarea`, jamais `button`/`a` — ajout
       d'une base globale `button:focus-visible, a:focus-visible`
       (sélecteurs nus, toujours dominés par une règle scoped plus
       spécifique déjà écrite ailleurs). Corrige d'un coup tous les
       boutons/liens de **toute l'app** qui n'avaient encore aucun style de
       focus propre, pas seulement cet écran — donc les futurs écrans du
       chantier n'auront normalement plus ce problème à corriger un par un.
    2. `GestionClients.vue` (`58f2f70`) : « Archiver » (fond rouge) et
       « Supprimer définitivement » (contour rouge) passaient en texte/
       bordure violet de marque au survol (règle globale `button:hover`) —
       perdait le sens d'action dangereuse juste avant le clic. Corrigé +
       contraste texte/fond fixé au repos pour « Archiver ». Ombre/élévation
       au survol des lignes clients ajoutée, cohérente avec
       `.accueil__carte`/`.accueil__bloc`.
  - Suite complète revalidée après le changement partagé (`tokens.css`) :
    157/158 fichiers, seul l'échec `.docx` préexistant (indépendant de ce
    chantier, déjà connu) subsiste.
- **12/09/2026** — `AccueilQueVoulezVousFaire.vue` **terminé** (fonctionnel
  + UI), 2 commits sur `main`, CI verte sur les deux :
  - Fonctionnel (`e06620f`) : la ligne « Conflit(s) non résolu(s) » restait
    un texte statique alors que sa voisine « Information(s) non
    validée(s) » est un lien vers Source Intelligence du client actif —
    même écran, même action possible (`resoudreConflit`) — incohérence
    corrigée, même motif appliqué aux deux lignes. 2 tests ajoutés (9/9
    passent).
  - UI (`0950568`) : les 6 liens/cartes de l'écran (reprise de travail,
    stats clients, à vérifier, projets récents, raccourcis épinglés,
    cartes d'action) n'avaient aucun `:focus-visible` propre — anneau bleu
    par défaut du navigateur au clavier au lieu du halo violet de marque
    utilisé partout ailleurs. Corrigé pour les 6.
  - **Point noté mais volontairement non corrigé** (à trancher par
    l'utilisateur si jugé utile un jour, pas un bug au sens strict) : les
    compteurs « Information(s) non validée(s) »/« Conflit(s) non
    résolu(s) » sont agrégés **globalement, tous clients confondus**
    (`db.knowledgeItems`/`db.conflicts` sans filtre `client_id`), alors que
    le lien n'ouvre que le client actif — sur un compte gérant plusieurs
    clients, le nombre affiché peut ne pas correspondre à ce qu'on voit
    après avoir cliqué. Comportement délibéré d'origine (un test existant,
    `agrège les informations non validées et les conflits ouverts réels`,
    l'encode explicitement sans client actif défini) — pas retouché pour
    ne pas relitiger un choix produit au passage d'un chantier UI/bugs.
- **12/09/2026** — `Login.vue` **terminé** (fonctionnel + UI), 2 commits
  sur `main`, CI verte sur les deux :
  - Fonctionnel (`bd779d1`) : seul écran de l'app à appeler une méthode du
    client API sans capturer les erreurs de connectivité
    (`IndisponibleAuthError`/`TimeoutAuthError`/`ReponseInvalideAuthError`,
    levées par `AuthApiClient` plutôt que renvoyées) — un Worker
    injoignable pendant une tentative de connexion échouait donc en
    silence total. Ajout aussi d'une redirection immédiate si une session
    est déjà active. 2 tests ajoutés (6/6 passent).
  - UI (`4ca50e5`) : le lien « Configurer » du bandeau d'info retombait sur
    le bleu par défaut du navigateur (`#0000EE`, seul lien de toute l'app
    dans ce cas) — corrigé avec la couleur de marque, cohérent avec
    `.lien-retour` (tokens.css) qui documente déjà ce même problème résolu
    ailleurs.
- **12/09/2026** — Client de test QA créé (§2). Fichier de suivi créé, à la
  demande explicite de l'utilisateur, avant tout travail sur les écrans.
  Chantier OAuth Drive (refresh token) clos et vérifié juste avant (voir
  `docs/CONTEXTE-REPRISE-SESSION.md` et PR #38 + commit de correction
  `APP_URL`).

---

## 5. Reste à faire (prochaine action immédiate)

1. `StructureSysteme.vue` — chantier fonctionnel puis UI, avec le
   client de test QA (`a25ae104-6117-451c-b80d-7ca9cf13f2d1`) ; probable
   besoin de créer une structure système dessus si aucune n'existe encore
   (voir §2 — rien créé sur ce client pour l'instant).
2. Puis `SuiviPeriodicite.vue`, dans l'ordre de la liste en §3.
3. Mettre à jour ce fichier après **chaque** chantier terminé (pas
   seulement en fin de session) — voir la règle en §1.
4. **Piste ouverte, à surveiller sur les écrans suivants** : le même bug
   fonctionnel trouvé deux fois de suite (`GestionClients.vue`,
   `FicheClient.vue`) — un appel à une méthode de store qui renvoie
   `Entité | {erreur}` (ou peut lever une exception de connectivité) dont
   le résultat n'est jamais vérifié — vaut la peine d'être cherché
   systématiquement (`grep` du nom de la méthode de store appelée) sur
   chaque nouvel écran plutôt que redécouvert au cas par cas.
5. **Piste ouverte, à surveiller sur les écrans suivants** : la Phase 41 et
   son extension `button:focus-visible, a:focus-visible` (`tokens.css`,
   commit `7204c81`) couvrent déjà tous les boutons/liens nus — sur les
   prochains écrans, vérifier d'abord si le focus clavier est déjà correct
   grâce à cette base globale avant de chercher un correctif UI à faire
   soi-même (peut réduire, voire annuler, le chantier UI de certains
   écrans simples).

**Méthodologie validée sur les 2 premiers écrans, à reproduire** : lire le
code de l'écran et de ses stores/dépendances en entier avant de juger s'il
y a un bug (ne pas se fier à une simple lecture superficielle) ; comparer
au reste du code base pour repérer les incohérences (grep les conventions
établies — ex. `.lien-retour`, `catch (e) { erreur.value = ... }`) plutôt
que d'inventer une préférence esthétique personnelle ; écrire un test avant
de considérer un correctif fonctionnel terminé ; vérifier
`prettier --check`/`eslint`/`vue-tsc --noEmit`/`vitest run` sur les
fichiers touchés avant de committer ; un commit par chantier (jamais
fonctionnel + UI mélangés dans le même commit) ; pousser via l'upload
GitHub (édition CLI bloquée dans ce sandbox), attendre la CI verte avant de
passer à l'écran suivant.
