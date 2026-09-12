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
| `GestionClients.vue` | ⬜ | ⬜ |
| `FicheClient.vue` | ⬜ | ⬜ |
| `ConfigurationClient.vue` | ⬜ | ⬜ |
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

1. `GestionClients.vue` — chantier fonctionnel puis UI (créer/archiver un
   client réel via le client de test QA, vérifier les cas limites :
   nom vide, doublon, désarchivage).
2. Puis `FicheClient.vue`, dans l'ordre de la liste en §3.
3. Mettre à jour ce fichier après **chaque** chantier terminé (pas
   seulement en fin de session) — voir la règle en §1.

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
