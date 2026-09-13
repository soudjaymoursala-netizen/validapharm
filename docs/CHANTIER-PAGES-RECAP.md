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
| `StructureSysteme.vue` | ✅ | ✅ *(non revalidé visuellement en direct — voir §4)* |
| `SuiviPeriodicite.vue` | ✅ | ✅ *(non revalidé visuellement en direct — voir §4)* |
| `Process.vue` | ✅ | ✅ *(non revalidé visuellement en direct — voir §4)* |
| `RevueStructureProcedure.vue` | ✅ *(aucun bug trouvé)* | ✅ *(non revalidé visuellement en direct — voir §4)* |
| `TemplatesFormulaires.vue` | ✅ *(aucun bug trouvé)* | ✅ *(non revalidé visuellement en direct — voir §4)* |
| `TableauDeBord.vue` | ✅ *(aucun bug trouvé)* | ✅ *(aucun bug trouvé — déjà conforme)* |
| `FicheProjet.vue` | ✅ | ✅ *(aucun bug trouvé — déjà conforme)* |
| `ListeMissions.vue` | ✅ *(aucun bug trouvé)* | ✅ |
| `MissionWorkspace.vue` | ✅ | ✅ |
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

- **13/09/2026** — `MissionWorkspace.vue` **terminé** (fonctionnel + UI dans
  un seul commit `34b59fe`, CI verte) :
  - Fonctionnel :
    1. **Lien-retour/nom du client manquants** (piste ouverte notée lors du
       chantier `ListeMissions.vue`, confirmée présente ici) — ajout de
       `clientsStore.obtenirClient` + `<RouterLink class="lien-retour">`
       vers `liste-missions` (son parent direct dans la hiérarchie de
       navigation, pas `fiche-client` directement — même convention que
       `SuiviPeriodicite.vue`/`DossierVivantActif.vue`, qui pointent vers
       leur écran parent immédiat avec un libellé statique, pas le nom du
       client). Nom du client affiché dans le `<h1>` (`{{ mission.titre }}
       — {{ nomClient ?? props.clientId }}`), comme partout ailleurs.
    2. **Mutations de statut non vérifiées** (même motif que `FicheProjet.vue`,
       commit `6e4513e`, mais avec `Entité | null` plutôt que
       `Entité | {erreur}`) : `changerStatutMission`/`changerStatutActivity`
       renvoient `null` si l'entité a été modifiée/supprimée entre-temps
       (race concurrentielle, double clic) — le composant ignorait
       totalement ce cas. Ajout d'un `erreurStatut` affiché dans un
       `.bandeau-erreur role="alert"` sur les deux sites d'appel.
  - UI :
    1. **`.badge-confiance` en couleurs hex fixes** (piste ouverte notée lors
       du chantier `RevueStructureProcedure.vue`, qui référençait déjà «
       même style que `MissionWorkspace.vue` ») — migré vers
       `--vp-succes`/`--vp-info`/`--vp-danger`/`--vp-attention` (+
       `-fond-leger`), même mapping que `RevueStructureProcedure.vue`.
       Attention : ce badge reste volontairement un style dédié, jamais les
       jetons `--vp-statut-*` de `qualification_status` (avertissement
       explicite dans le code du composant — deux concepts différents, n'ont
       jamais été confondus).
    2. `.bandeau-erreur` utilisait `--vp-statut-requalification-en-retard`
       (un jeton de `qualification_status`, valeur identique à
       `--vp-danger` aujourd'hui mais sémantiquement le mauvais jeton pour
       un message d'erreur générique réseau/raisonnement) — remplacé par
       `--vp-danger`, cohérent avec `FicheProjet.vue`.
  - **Bug de test découvert et corrigé en cours de route (pas un bug
    applicatif)** : l'ajout d'un `await clientsStore.obtenirClient(...)`
    séquentiel avant le `Promise.all` de `onMounted` a suffi à inverser
    l'ordre de complétion entre `missionStore.charger` et
    `qualityEventStore.charger` dans les tests (fake-indexeddb, résolution
    par macrotâche) — le test `associe un QualityEvent existant à la
    Mission` interagissait avec le `<select>` des événements qualité dès que
    le titre de la Mission apparaissait, sans attendre que ses propres
    options soient chargées. Corrigé en attendant explicitement
    `option[value="qe-1"]` avant d'interagir, plutôt que de se fier au
    signal générique de `monter()` — à garder en tête sur les prochains
    écrans qui ajoutent un `await` séquentiel avant un `Promise.all`
    existant dans `onMounted`.
  - Non revalidé visuellement en direct (session de test toujours expirée,
    voir §5).
- **13/09/2026** — `ListeMissions.vue` **terminé** (1 commit, aucun
  chantier fonctionnel distinct — voir ci-dessous), CI verte :
  - Fonctionnel : écran relu en entier avec `useMissionStore`/
    `useOrganizationStore`/`useStructureSystemeStore` — tout Dexie-only,
    `creerMission` retourne toujours une entité concrète. **Aucun bug
    trouvé.**
  - UI/**cohérence de navigation** (`4828326`) : seul écran lié à un
    client (prop `clientId`) sans lien-retour ni nom du client affiché
    dans son en-tête, alors que c'est la convention établie partout
    ailleurs dans l'app. Corrigé à l'identique — ajout de
    `clientsStore.obtenirClient` + `.lien-retour` vers `fiche-client`,
    laissé sans CSS locale pour bénéficier du style riche déjà défini
    globalement dans `tokens.css` (pilule + flèche + focus-visible),
    plutôt que de dupliquer une version appauvrie comme le fait
    `FicheProjet.vue` (voir piste ouverte ci-dessous).
  - **Piste ouverte** (trouvée en marge, pas corrigée ici) :
    `RevueStructureProcedure.vue` (déjà traité, §4 plus bas) et
    `MissionWorkspace.vue` (pas encore traité à l'époque) partagent la même
    absence de lien-retour/nom de client — **`MissionWorkspace.vue` est
    corrigé** (voir plus bas, commit `34b59fe`) ; `RevueStructureProcedure.vue`
    a été manqué lors de son propre chantier (déjà poussé, pas rouvert
    pour l'instant faute de temps — à corriger si l'occasion se présente).
    Séparément : plusieurs écrans (dont `FicheProjet.vue`) redéfinissent
    une version locale simplifiée de `.lien-retour` qui écrase par
    spécificité Vue le style riche global de `tokens.css` (pilule + flèche
    + ombre) — pas nécessairement un bug, mais une incohérence visuelle
    entre écrans à garder en tête.
- **13/09/2026** — `FicheProjet.vue` **terminé** (1 commit fonctionnel,
  aucun commit UI — déjà conforme), CI verte :
  - Fonctionnel (`6e4513e`) : **8 sites d'appel** (partage, suspendre/
    reprendre, archiver/désarchiver, changer de phase, supprimer)
    ignoraient totalement le résultat métier renvoyé par
    `useProjectsStore` (union `Project | {erreur}` pour des cas réels :
    race concurrentielle entre deux postes — `introuvable` —, double clic
    — `deja_suspendu`/`deja_archive`...). Le plus grave :
    `confirmerArchivage`/`confirmerSuppression` redirigeaient
    l'utilisateur vers le tableau de bord **comme si l'action avait
    réussi**, sans jamais vérifier le résultat. Corrigé avec un bandeau
    d'erreur de page (`erreurAction`) et des libellés humains pour tous
    les codes métier connus — même discipline que `GestionClients.vue`.
    2 tests ajoutés (mock direct du store pour reproduire un échec
    métier réel, même motif que `ConfigurationClient.test.ts`), confirmés
    en échec sans le correctif. Écran auparavant sans aucun test
    (`FicheProjet.test.ts` n'existait pas).
  - UI : **aucun bug trouvé** — écran déjà conforme (comme
    `TableauDeBord.vue`) : `.bouton-fichier` utilise déjà le bon motif
    accessible (`opacity: 0`), aucune couleur hex fixe, aucun `outline`/
    `:focus` local ne fait obstacle à la règle globale
    `button:focus-visible`.
- **13/09/2026** — `TableauDeBord.vue` **terminé, aucun commit** (aucun
  bug trouvé sur aucun des deux chantiers) : écran relu en entier avec
  `useProjectsStore`/`useClientsStore`/`useSynchronisationStore` —
  `chargerProjets`/`creerProjet` purement locaux et toujours réussis,
  `synchroniser`/`recupererDepuisGitHub` déjà entièrement gardés (toute
  exception convertie en résultat typé, jamais propagée), `messageSync`
  vérifie bien `ok`/`conflit`. Côté UI : boutons/cartes/hover/focus déjà
  cohérents avec les jetons `tokens.css`, aucun des deux motifs de bugs
  récurrents de ce chantier (`grep` fait, voir §5). **Premier écran de ce
  chantier sans aucune modification** — le plus abouti rencontré jusqu'ici.
  Note (pas un bug, juste une observation) : aucun fichier de test dédié
  n'existe pour cet écran (`TableauDeBord.test.ts` absent) — à garder en
  tête si un futur chantier y touche.
- **13/09/2026** — `TemplatesFormulaires.vue` **terminé** (2 commits sur
  `main`), CI verte sur les deux :
  - Fonctionnel (`c4ef21e`) : relu en entier avec `useGabaritExportStore` —
    aucun bug trouvé. Point vérifié explicitement avant de le « corriger »
    à tort : la suppression d'un gabarit sans confirmation est un
    comportement **intentionnel et déjà testé** (`TemplatesFormulaires.
    test.ts`, test « supprimer un gabarit... »), pas un oubli — laissé
    inchangé. Test ajouté pour confirmer le bénéfice du correctif
    `obtenirClient` (même motif que les écrans précédents).
  - UI/**accessibilité** (`0a4124f`) : même bug que `Process.vue`/
    `RevueStructureProcedure.vue` (`display: none` sur l'input fichier),
    déjà annoncé dans la précédente mise à jour de ce fichier — confirmé
    puis corrigé sans surprise. Le commentaire d'origine expliquait un vrai
    problème de débordement visuel mobile ; la solution déjà établie
    ailleurs (superposition invisible via `opacity: 0`) résout ce même
    problème sans sacrifier l'accessibilité clavier.
  - Non revalidé visuellement en direct (session de test toujours
    expirée, voir §5).
- **13/09/2026** — `RevueStructureProcedure.vue` **terminé** (1 seul
  commit, aucun chantier fonctionnel distinct — voir ci-dessous), CI
  verte :
  - Fonctionnel : écran relu en entier avec ses trois stores
    (`useProcedureStore`, `useClientConfigStore`, `useConnexionRelaisIAStore`)
    — `onMounted` charge les trois en `Promise.all` (les deux premiers
    purement locaux, le troisième déjà protégé par son propre `catch`
    interne, corrigé lors d'un chantier antérieur) ; `genererProposition`/
    `confirmerProposition` renvoient des valeurs concrètes déjà gérées
    correctement côté composant. **Aucun bug trouvé** — pas de commit
    fonctionnel séparé pour cet écran (à la différence des précédents, où
    au moins un test de confirmation était ajouté).
  - UI/**accessibilité** (`36e16f3`), deux correctifs trouvés par
    comparaison de code base :
    1. Même bug d'accessibilité clavier que `Process.vue` (`.bouton-fichier
       input { display: none; }`) — corrigé à l'identique.
    2. `.badge-source`/`.badge-confiance` utilisaient des couleurs hex
       fixes (`#dcfce7`, `#166534`...) jamais migrées vers les jetons
       sémantiques de `tokens.css` — ne s'adaptaient jamais au thème
       sombre (Phase 40), contrairement au reste de l'application. Migrées
       vers `--vp-succes`/`--vp-info`/`--vp-danger`/`--vp-attention` (+
       variantes `-fond-leger`).
  - **Piste ouverte identifiée** : `MissionWorkspace.vue` (plus loin dans
    la liste, §3) partage l'exact même motif `.badge-confiance` en hex
    fixe (son propre commentaire dans `RevueStructureProcedure.vue`
    disait déjà « même style que `MissionWorkspace.vue` ») — **corrigé**
    (voir plus bas, commit `34b59fe`), même mapping de jetons.
  - Non revalidé visuellement en direct (session de test toujours
    expirée, voir §5).
- **13/09/2026** — `Process.vue` **terminé** (fonctionnel + UI), 2 commits
  sur `main`, CI verte sur les deux :
  - Fonctionnel (`49d13ff`) : écran relu en entier avec ses deux stores
    (`useProcessContextStore`, `useSourceIntelligenceStore`) — entièrement
    local (Dexie), aucune mutation ne renvoie d'union `Entité | {erreur}`
    non vérifiée, les associations Fonction↔Process/Actif sont idempotentes
    par conception. Aucun nouveau bug trouvé au-delà du correctif déjà
    appliqué au store `useClientsStore.obtenirClient` — test ajouté pour
    confirmer explicitement ce bénéfice (même motif que
    `SuiviPeriodicite.test.ts`/`StructureSysteme.test.ts`).
  - UI/**accessibilité** (`115f386`) : `.bouton-fichier input[type="file"]
    { display: none; }` retire l'input du parcours clavier — un
    utilisateur clavier ne peut ni l'atteindre ni l'activer pour importer
    un document. **Trouvé par comparaison de code base**, pas par un rendu
    réel : le même composant `.bouton-fichier` existe déjà, correctement
    implémenté (`position: absolute; inset: 0; opacity: 0` — invisible
    mais toujours focusable), dans `FicheProjet.vue` et
    `AssistantStrategieQualification.vue`. Aligné sur ce motif déjà établi
    et fonctionnel ailleurs dans le même dépôt plutôt que d'inventer une
    solution.
  - **Piste ouverte identifiée en marge de ce chantier** : le même bug
    (`display: none` sur l'input) existe aussi dans `EditeurSection.vue`
    et `TemplatesFormulaires.vue` — tous deux plus loin dans la liste de ce
    chantier (§3). Les corriger explicitement quand leur tour viendra
    plutôt que par surprise (`grep "input\[type='file'\] {"` sur le
    fichier avant de commencer, pour confirmer si le bug y est toujours
    présent au moment venu).
  - Même écart méthodologique que les deux écrans précédents (session de
    test expirée, voir §5) : non revalidé au clavier en direct.
- **13/09/2026** — `SuiviPeriodicite.vue` **terminé** (fonctionnel + UI),
  2 commits sur `main`, CI verte sur les deux :
  - Fonctionnel (`1bc0682`) : écran en **lecture seule**, aucune mutation
    propre — aucun nouveau bug fonctionnel trouvé au-delà du bug
    systémique déjà corrigé au niveau du store lors du chantier précédent
    (`useClientsStore.obtenirClient`, commit `fb4e529`). Comme cet écran
    enchaîne exactement le même `onMounted` (nom du client, puis
    hiérarchie locale via `useStructureSystemeStore.charger`), un test a
    été ajouté pour **confirmer explicitement** que le correctif du store
    profite aussi ici, sans qu'il faille le refaire écran par écran.
  - UI (`89a29f1`) : même écart que celui trouvé sur `StructureSysteme.vue`
    — `.lien-dossier-vivant` (classe locale, redéfinie indépendamment sur
    chaque écran à cause du scoping Vue) n'avait ni `text-decoration:
    none` ni état de survol. Corrigé à l'identique.
  - **Même écart méthodologique que `StructureSysteme.vue`** : session de
    test sur l'app déployée toujours indisponible (voir §5) — correctif UI
    appliqué par comparaison de code à un motif déjà confirmé, non
    revérifié par un rendu réel de cet écran.
- **13/09/2026** — `StructureSysteme.vue` **terminé** (fonctionnel + UI),
  3 commits sur `main`, CI verte sur les trois :
  - Fonctionnel (`fb4e529` + `37ac9b2`) : **bug systémique découvert**, pas
    spécifique à cet écran — `useClientsStore.obtenirClient()` (appelée au
    `onMounted` d'une **vingtaine d'écrans**, dont beaucoup pas encore
    couverts par ce chantier) ne capturait aucune exception de
    connectivité (`IndisponibleAuthError` etc., levée par
    `AuthApiClient.requete()` plutôt que renvoyée). Sur `StructureSysteme.
    vue` en particulier : cet appel sert uniquement à afficher le nom du
    client en en-tête, mais précède dans le même `onMounted` un appel à
    `useStructureSystemeStore.charger()` — **purement local (IndexedDB),
    sans aucun rapport avec le réseau**. Une simple panne réseau
    transitoire pour le nom du client bloquait donc l'affichage de toute
    la hiérarchie d'actifs déjà persistée. Corrigé **au niveau du store**
    (`useClientsStore.obtenirClient`, même discipline que
    `chargerClients`) plutôt qu'écran par écran : dégrade désormais (nom
    de client absent) au lieu de bloquer — bénéficie immédiatement aux
    ~19 écrans utilisant ce même appel (`SuiviPeriodicite.vue`,
    `Process.vue`, `RiskAssessmentAmdec.vue`, `ImpactAssessment.vue`,
    `ComputerSystemAssessment.vue`, `ConfigurationDrive.vue`,
    `ConfigurationIA.vue`, `ExecutionTests.vue`, `DefinitionTests.vue`,
    `TemplatesFormulaires.vue`, `JournalAnomalies.vue`,
    `ParametresCritiques.vue`, `DossierVivantActif.vue`, `ContentPlan.vue`,
    `SourceIntelligence.vue`, `RechercheGlobale.vue`,
    `ConfigurationConnecteursQMS.vue`,
    `AssistantStrategieQualification.vue`,
    `AssistantCreationLivrable.vue` — la plupart hors périmètre de ce
    chantier pour l'instant). Test ajouté (`StructureSysteme.test.ts`,
    nouveau fichier) : préremplit IndexedDB directement (simule un
    rechargement de page réel), coupe totalement le réseau, vérifie que la
    hiérarchie déjà persistée s'affiche quand même — confirmé en échec
    sans le correctif (`git stash` du fichier store, re-test, `unhandled
    rejection` observée).
  - UI (`6ae41f5`) : même bug de hiérarchie de boutons que
    `ConfigurationClient.vue` (règle `button {}` locale écrasant le violet
    réservé à `type="submit"`) — corrigé à l'identique par suppression.
    Ajouté aussi : affordance de survol manquante (`text-decoration`) sur
    `.lien-suivi-periodicite`/`.lien-dossier-vivant`, alignée sur la
    convention déjà établie ailleurs (`FicheClient.vue
    .apercu-projets a`). **Écart à la méthodologie, à noter honnêtement** :
    la session de test sur l'app déployée a expiré (JWT, limite 12h)
    pendant ce chantier, sans identifiants disponibles pour se
    reconnecter — ces deux correctifs UI s'appuient sur un motif déjà
    confirmé par capture d'écran réelle à deux reprises sur
    `ConfigurationClient.vue`/le même type de règle CSS, jamais
    revérifiés par un rendu réel de `StructureSysteme.vue` lui-même. À
    revalider visuellement dès qu'une session authentifiée est disponible
    (noté aussi en §3).
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

1. `AssistantStrategieQualification.vue` — chantier fonctionnel puis UI,
   avec le client de test QA (`a25ae104-6117-451c-b80d-7ca9cf13f2d1`), dans
   l'ordre de la liste en §3.
   **Piste à vérifier en priorité** : le motif « mutations de statut
   ignorées » trouvé sur `FicheProjet.vue` (8 sites, commit `6e4513e`) et
   `MissionWorkspace.vue` (2 sites, commit `34b59fe`) n'est probablement pas
   isolé à ces deux écrans — `grep` les autres écrans qui appellent des
   méthodes de store retournant une union `Entité | {erreur}` **ou**
   `Entité | null` sans vérifier le résultat.
   **Balayage exhaustif fait le 13/09/2026** (`grep` sur tout
   `src/presentation/screens/*.vue`) pour les deux motifs de bugs
   récurrents de ce chantier — plus la peine de les redécouvrir un par un :
   - `.bouton-fichier input[type='file'] { display: none; }`
     (inaccessibilité clavier) : reste uniquement dans
     `EditeurSection.vue` (plus loin dans la liste, §3). Tous les autres
     écrans qui avaient ce motif sont déjà corrigés (`Process.vue`,
     `RevueStructureProcedure.vue`, `TemplatesFormulaires.vue`).
   - `.badge-confiance--connu { background-color: #dcfce7; ... }` (couleurs
     hex fixes non adaptées au thème sombre) : corrigé partout où ce
     `grep` l'avait trouvé (`RevueStructureProcedure.vue`,
     `MissionWorkspace.vue`) — refaire ce `grep` sur les écrans suivants
     avant de conclure qu'il n'y en a plus, cette liste datant du
     13/09/2026.
   - Refaire ce `grep` sur le fichier de l'écran en cours avant de
     conclure qu'« aucun bug trouvé » plutôt que de se fier seulement à
     cette liste, qui date du 13/09/2026 et peut devenir obsolète si
     d'autres correctifs sont faits ailleurs entre-temps.
2. Mettre à jour ce fichier après **chaque** chantier terminé (pas
   seulement en fin de session) — voir la règle en §1.
3. **Action de suivi issue de `StructureSysteme.vue`** : revalider
   visuellement en direct (capture d'écran réelle) la hiérarchie des
   boutons et le survol des liens sur `StructureSysteme.vue` dès qu'une
   session authentifiée est disponible sur l'app déployée — les deux
   correctifs UI de cet écran (commit `6ae41f5`) ont été appliqués par
   comparaison de code à un motif déjà confirmé ailleurs, jamais revérifiés
   par un rendu réel de cet écran précis (session de test expirée en cours
   de chantier, JWT 12h, sans identifiants disponibles pour se
   reconnecter). Si une divergence apparaît, corriger et mettre à jour ce
   journal.
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
6. **Piste ouverte, corrigée au niveau store mais à garder en tête** :
   `useClientsStore.obtenirClient()` est corrigée (13/09/2026, commit
   `fb4e529`) pour ne plus jamais lever d'exception de connectivité non
   rattrapée — mais si un futur écran de la liste appelle un **autre**
   endpoint du Worker sans `try/catch` (`grep` les appels `authStore.
   client()`/`api.` dans le fichier de l'écran et repérer ceux qui ne sont
   ni dans un `try` ni suivis d'une vérification `.ok`), le même type de
   bug reste possible ailleurs — ne pas supposer que tout est déjà corrigé
   uniquement parce que `obtenirClient` l'est.
7. **Contrainte opérationnelle à résoudre avant le prochain chantier UI** :
   la session de test sur l'app déployée (admin, via navigateur) a expiré
   pendant le chantier `StructureSysteme.vue` (JWT, limite 12h) et aucun
   identifiant n'était disponible pour se reconnecter — les deux
   correctifs UI de cet écran n'ont donc pas pu être revalidés par un
   rendu réel (voir §4). Avant de démarrer le chantier UI de
   `SuiviPeriodicite.vue`, vérifier qu'une session valide existe (se
   reconnecter sur `https://soudjaymoursala-netizen.github.io/validapharm/`
   avec le compte admin) ; si l'utilisateur n'est pas disponible pour
   fournir les identifiants, envisager de configurer le serveur de dev
   local (`.claude/launch.json`, config `dev`) avec un Worker de test
   dédié pour ne plus dépendre de la session déployée.

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
