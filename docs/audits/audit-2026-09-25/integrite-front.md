# Audit front ValidaPharm : correction et intégrité des données (GxP / ALCOA+)

Date : 25/09/2026. Périmètre : `src/presentation/**`, `src/logique-metier/**`, `src/connecteurs/auth/AuthApiClient.ts`, avec lecture croisée de `workers/auth-worker/src/routeur.ts` quand une règle existe des deux côtés.

**Méthode.** Recherche ciblée (grep) puis lecture ligne par ligne. Deux fichiers Vitest temporaires ont servi de preuves : `auditPreuves.test.ts` (P1 à P9) et `auditPreuves2.test.ts` (Q1 à Q3). Ils sont conservés dans ce dossier `scratchpad/audit-front/`. Chacun a été copié dans `src/presentation/screens/`, exécuté contre le faux Worker (`fauxWorkerAuth`), puis supprimé. Les 13 tests passent : **chaque assertion constate le défaut**. Aucun fichier du dépôt n'a été modifié. `git status --short` est vide à la fin.

Sorties utiles des preuves :
```
[P1] évaluations créées : 2
[P2] texte après navigation vers B : … — Nom client-a … Évaluation — Source-A (v1)
[P2] évaluation de client-b rattachée au profil : profil-client-a
[P3] erreur remontée hors écran : Error: Échec de la création de l'évaluation Impact Assessment : non_autorise
[P4bis] création profil sans question : true
[P5] readiness : pret
[P7] verdict_residuel = "acceptable" pour S=O=D=5 (IPR 125)
[P8] import : true valide_en_interne
[P9] statut : valide_en_interne — acteurs audit : [ 'redacteur.fictif@client.com' ]
[P9] reviewers : [{"userId":"relecteur.fictif@client.com","avis":"RAS",…}]
[P9] signatures : {"redacteur":{},"verificateur":{},"approbateur":{}}
[Q1] tables : {} | values : {"contenu":"texte"} | entrées "modification" : 1
[Q2] profils : 0 | estConnecte : true | serveurInjoignable : false
[Q3] versions en base : [ 'v1', 'v1' ]
```

---

## A. Constats vérifiés

### C1 — CRITIQUE : l'audit des sections attribue toutes les actions au propriétaire de la section
- **Où :** `src/presentation/stores/useSectionsStore.ts:267` (création : `actor: input.owner_id`, et `owner_id` vient du navigateur), `:501` (export), `:530` (contexte assemblé), `:593` et `:620` (modification), `:816` et `:825` (transitions et révisions, y compris l'approbation). Même défaut dans `useSynchronisationStore.ts:380` (projet : dernier acteur connu ou `'utilisateur'`) et `:418-423`.
- **Constat :** chaque entrée `audit_log` ou `revisions` prend `section.owner_id` comme acteur, jamais l'utilisateur connecté. Les droits Worker (`routeur.ts:8098-8116`) permettent pourtant à un admin, au créateur du projet ou à un partagé « édition » de modifier la section. `gererCreerSection` (`routeur.ts:8898-8915`) enregistre `ownerId` tel quel.
- **Preuve :** P9. L'admin connecté crée une section avec `owner_id: 'redacteur.fictif@client.com'`, puis enchaîne vérification, avis, rejet, re-vérification et **approbation**. L'audit ne contient qu'un acteur : `redacteur.fictif@client.com`.
- **Impact :** l'exigence ALCOA+ « Attributable » est violée. Une approbation apparaît comme faite par le rédacteur. La piste d'audit du livrable est inexploitable en inspection.
- **Correctif :** ne plus écrire `actor`, `timestamp`, `owner_id` ni `revisions[].auteur` côté navigateur. Le Worker (`gererCreerSection`, `gererRemplacerSection`) doit ajouter lui-même l'entrée d'audit avec `utilisateur.email` et `horodatage()`, et fixer `ownerId = utilisateur.email` à la création. À défaut, et au minimum, utiliser `identifiantActeurCourant()` dans le store.

### C2 — CRITIQUE : un avis de relecteur peut être saisi au nom d'un tiers, et n'importe quel éditeur peut approuver
- **Où :** `EditeurSection.vue:707-727` (identifiant du relecteur en texte libre), `useSectionsStore.ts:649-667`, `:685-695` et `:800-834`. `machine-etats/transitionSection.ts:118-124` ne purge rien au rejet.
- **Constats :**
  1. `ajouterAvisRelecteur(sectionId, userId, avis)` : le `userId` est tapé dans un champ, donc on peut signer au nom d'un autre.
  2. `approuver` ne vérifie pas que l'utilisateur est `workflow.approver_final`, ni qu'il est différent de l'auteur (pas de séparation des tâches). `signatures.*` n'est jamais renseigné.
  3. Un rejet ramène la section en `brouillon_aide` sans vider `workflow.reviewers`. Au cycle suivant, `auMoinsUnAvisRelecteur` est déjà vrai.
- **Preuve :** P9 passe par rejet → re-vérification → `transmettreApprobation` **sans nouvel avis**, puis `approuver` par l'admin alors que l'approbateur désigné est `approbateur@client.com`. Résultat : `valide_en_interne`, signatures vides. `sections.test.ts:246-263` fige d'ailleurs ce comportement (avis `'revu-1'` en texte libre).
- **Impact :** faux avis de relecture et approbation sans l'approbateur désigné. C'est incompatible avec une validation GxP et avec l'esprit de 21 CFR Part 11 (signature liée à l'identité).
- **Correctif :** avis toujours au nom du compte connecté (supprimer le champ identifiant). Au Worker, `approuver` réservé à `approver_final`, refusé si l'utilisateur figure dans `authors`, et `signatures.approbateur = {user, horodatage serveur}` renseigné. À chaque rejet, archiver les avis du cycle (champ `cycle`) et ne compter que ceux du cycle courant.

### C3 — CRITIQUE : l'historique, le statut et les signatures d'une section sont entièrement fournis par le navigateur
- **Où :** `useSectionsStore.ts:182-195` (`ecrireSection` = PUT de la section complète) et `routeur.ts:8951-8958` (`gererRemplacerSection` : `{...corps}` enregistré tel quel). Import : `logique-metier/export/analyserImportJSON.ts:46-122` et `useSectionsStore.ts:455-486`. Restauration GitHub : `useSynchronisationStore.ts:239-250` et `routeur.ts:9015-9050`.
- **Constat :** tout appel `PUT /sections/:id` peut réécrire `auditLog`, `revisions`, `status` (par exemple `valide_en_interne`) et `signatures`. Aucune vérification « ajout seulement » ni transition validée côté serveur. L'import JSON accepte un fichier modifiable à la main avec `status: 'valide_en_interne'`, un `owner_id` quelconque et un `audit_log` fabriqué. `workflow`, `signatures` et `revisions` ne sont même pas validés : ils peuvent arriver `undefined`, ce qui donne une section corrompue. Tous les horodatages viennent de l'horloge du poste (`new Date().toISOString()`).
- **Preuve :** P8 (`ok: true`, statut conservé, `workflow` indéfini). Pour le PUT, la preuve est la lecture de `routeur.ts:8957`.
- **Impact :** un historique immuable n'existe pas en pratique. Une section « validée » peut apparaître dans un projet sans aucun cycle de relecture ni d'approbation.
- **Correctif :**
  - Côté Worker, `gererRemplacerSection` doit refuser toute modification de `status`, `signatures`, `revisions` et `auditLog` : il conserve l'existant et ajoute lui-même l'entrée d'audit.
  - Les transitions passent par une route dédiée `POST /sections/:id/transition`, qui rejoue `appliquerTransition` côté serveur.
  - L'import force `status: 'brouillon_aide'`, vide `signatures`, et valide `workflow`/`revisions`. L'historique importé est conservé dans un champ distinct en lecture seule.

### C4 — CRITIQUE : deux écritures simultanées sur une section en perdent une en silence, avec son entrée d'audit
- **Où :** `useSectionsStore.ts:583-598` et `:606-624` (lecture, modification puis écriture complète) ; `routeur.ts:8957` (aucun contrôle de version ni d'`updatedAt`). `RenduGabarit.vue:93` et `:119` déclenchent une sauvegarde à chaque `change`.
- **Preuve :** Q1. `Promise.all([mettreAJourTable(...), mettreAJourValeurs(...)])` : les deux promesses réussissent, mais en base `tables = {}` et il n'y a qu'**une** entrée « modification ». La table est perdue sans message.
- **Impact :** perte de saisie (modifier une cellule de tableau puis un champ texte dans l'aller-retour réseau suffit) et historique incomplet. Même effet entre deux utilisateurs : la dernière écriture gagne. ALCOA+ « jamais d'écrasement silencieux » n'est pas respecté.
- **Correctif :** contrôle optimiste. Le client envoie `updatedAt` (ou un numéro de version) lu ; le Worker renvoie 409 s'il diffère, et le store relit puis rejoue le changement. Mieux : des routes partielles (`PATCH /sections/:id/values`, `/tables/:cle`) fusionnées côté serveur, qui ajoutent l'audit. Côté front, sérialiser les sauvegardes d'une même section (file d'attente dans le store).

### C5 — CRITIQUE : changer de client sur la même route garde les données du client précédent, et les écritures partent au mauvais client
- **Où :** `CoquilleApplication.vue:70` (`<RouterView />` sans `:key`). Les 22 écrans à `props.clientId` (tous sauf `FicheClient.vue`) chargent uniquement dans `onMounted`, par exemple `ImpactAssessment.vue:34-44`, `DefinitionTests.vue`, `StructureSysteme.vue:181-185`. Les stores sont des singletons non indexés par client.
- **Scénario réel :** ouvrir la fiche du client B, puis un outil de B (lien de `FicheClient`), puis le même outil du client actif A dans la barre latérale (`BarreLaterale.vue:259-265`). Vue Router réutilise alors le composant.
- **Preuve :** P2. Après `push('/clients/client-b/impact-assessment')`, l'écran affiche encore « Nom client-a » et « Source-A ». L'évaluation enregistrée est créée **dans client-b avec `methodProfileId = profil-client-a`**.
- **Aggravant :** les `charger()` n'ont aucun garde contre une réponse tardive (un chargement lent de A qui arrive après celui de B écrase B).
- **Impact :** mélange de données entre clients (confidentialité), et évaluations ou couvertures rattachées à la méthode d'un autre client. Combiné à M6, cela donne un « prêt » injustifié.
- **Correctif :** `<RouterView :key="$route.fullPath" />`, ou `watch(() => props.clientId, recharger)` dans chaque écran. Dans chaque store, mémoriser `clientIdCharge` et un jeton de requête (`const req = ++seq; … if (req !== seq) return`). Refuser toute écriture si `clientIdCharge !== clientId`.

### M1 — MAJEURE : environ 60 gestionnaires d'écriture laissent passer l'exception, et aucun gestionnaire global ne l'affiche
- **Où :** `src/presentation/main.ts:8` (pas d'`app.config.errorHandler`, pas de `onErrorCaptured`). Exemples : `ImpactAssessment.vue:106-115`, `ComputerSystemAssessment.vue:66-79`, `ParametresCritiques.vue:41-163`, `SourceIntelligence.vue:60-178`, `Process.vue:114-158`, `DefinitionTests.vue:53-227`, `MissionWorkspace.vue:113-176`, `JournalAnomalies.vue:89-124`, `EditeurSection.vue:287-302`, `:351`, `:359`, `:545-587`, `:709` et `:721`. Sauvegarde automatique : `EditeurSection.vue:341-342` (`void sectionsStore.mettreAJourValeurs(...)`).
- **Constat :** les stores lèvent `Error` quand `!resultat.ok` (119 cas), mais les gestionnaires n'ont ni `try/catch` ni message à l'écran. Le message soigné de `ecrireSection` (« Modification refusée : … lecture ») n'est donc jamais affiché.
- **Preuve :** P3. Un 403 à l'enregistrement produit une erreur visible seulement dans la console, sans aucun `role="alert"`, et le formulaire reste tel quel.
- **Impact :** l'utilisateur croit avoir enregistré, ou reclique (voir M2). La sauvegarde automatique en échec (réseau, droits) perd la saisie sans prévenir.
- **Correctif :** envelopper chaque action dans un utilitaire `executerAction(fn, refErreur)` qui affiche un message lisible. Ajouter un `app.config.errorHandler` qui pousse un bandeau global. Pour la sauvegarde automatique, afficher « Non enregistré — nouvel essai » et réessayer.

### M2 — MAJEURE : double soumission possible (évaluations, projets, résultats d'étape en double)
- **Où :** aucun garde « envoi en cours » : `ImpactAssessment.vue:106-115` et `:238-244` ; `AssistantStrategieQualification.vue:134` ; `RiskAssessmentAmdec.vue:86` ; `TableauDeBord.vue:97-106` ; `ExecutionTests.vue:145-160` et `:346` (et le Worker n'interdit pas deux résultats pour une même étape) ; `ParametresCritiques.vue` ; `SourceIntelligence.vue`.
- **Preuve :** P1. Deux clics dans le même tick créent **2 évaluations** Impact en base.
- **Impact :** doublons dans des enregistrements réglementaires, par exemple deux résultats pour une même étape d'exécution.
- **Correctif :** un drapeau `enCours` par formulaire (`:disabled`, retour immédiat s'il est levé). Côté Worker, une clé d'idempotence (`Idempotency-Key`) ou une contrainte d'unicité, par exemple (execution, test_step) pour les résultats d'étape.

### M3 — MAJEURE : une session expirée n'est pas détectée et les écrans s'affichent vides sans alerte
- **Où :** `workers/auth-worker/src/jwt.ts:12` (JWT de 12 h) ; `useAuthStore.ts:38-49` (session relue depuis IndexedDB sans vérifier `exp`) ; `router/index.ts:264-276` ; `AuthApiClient.ts:3553` (un 401 compte comme « joignable »). Aucune gestion de 401 dans le front.
- **Preuve :** Q2. Avec un jeton invalide : `profils = 0`, `estConnecte = true`, `serveurInjoignable = false`.
- **Impact :** l'écran reproduit exactement le cas signalé en §37 (« Aucune méthode n'est configurée », qui pousse à recréer une méthode, voir M7), mais le bandeau ne s'affiche pas. Les écritures échouent avec `non_authentifie` (M1).
- **Correctif :** dans `AuthApiClient.requete`, sur 401 `non_authentifie`, prévenir l'application (`onSessionExpiree`) : `deconnecter()` puis redirection vers `/connexion?redirect=…`. Décoder `exp` au chargement de la session et la purger si elle est expirée.

### M4 — MAJEURE : le verdict AMDEC résiduel est deviné, et favorable, quand le profil figé est introuvable
- **Où :** `useRiskAssessmentStore.ts:328-332` : échelle 1-5 par défaut et `seuilAction = profilFige?.seuil_action ?? Infinity`.
- **Preuve :** P7. Profil `profil-disparu` avec S=O=D=5 : IPR 125 et **`verdict_residuel: 'acceptable'`**.
- **Impact :** viole « jamais un verdict deviné ». Un risque maximal est déclaré acceptable.
- **Correctif :** si `profilFige` est absent, renvoyer `{ erreur: 'profil_introuvable' }` (ou `verdictResiduel: null` avec `iprResiduel: null`) et afficher « Méthode de la ligne introuvable : verdict non calculable ».

### M5 — MAJEURE : les verdicts ACFC, Impact et AMDEC sont calculés dans le navigateur et le Worker ne les recalcule pas
- **Où :** Worker `routeur.ts:2807-2840` (ACFC), `:3288-3320` (Impact), `:3568-3620` et `:3646-3700` (AMDEC). Le commentaire en `:2725-2729` dit que « la logique métier reste côté store ».
- **Constat :** le Worker persiste `verdict`, `iprInitial` et `verdictResiduel` fournis. Il ne vérifie ni leur cohérence avec `reponses` ou les notes, ni que `methodProfileVersion` correspond à `methodProfileId`, ni que ce profil existe pour ce client.
- **Impact :** un client modifié, un bug front (M4, C5) ou un appel API direct peut enregistrer « non critique » alors qu'une réponse est « oui ». L'intégrité du verdict repose sur la confiance dans le poste.
- **Correctif :** porter `conclusionQuestionnaireOuiNon`, `calculerIPR` et `evaluerVerdictRiskAssessment` dans le Worker (module partagé). Le serveur recalcule, rejette si le verdict diffère (409 `verdict_incoherent`), et résout profil et version depuis `methodProfileId`.

### M6 — MAJEURE : readiness « prêt » quand une couverture pointe vers un test inexistant ou d'un autre client
- **Où :** `logique-metier/deliverable/readinessContentPlan.ts:76-92` et Worker `routeur.ts:5886-5899` (même règle : `testsCouvrants` vide, donc aucune dégradation). `gererCreerCouverture` (`routeur.ts:4595-4623`) ne vérifie ni l'existence ni le client du test, et `void acteur` ne laisse aucune attribution.
- **Preuve :** P5 (`'pret'`). Scénario réel via C5 : l'écran Définition des tests de B affiche encore les tests de A, et la couverture ainsi créée rend B « prêt ».
- **Impact :** un plan de livrable peut être gelé alors qu'une exigence n'a aucun test exécuté.
- **Correctif :** côté Worker et front, si un `testId` couvrant est introuvable, retourner `besoin_information` avec la raison « test couvrant introuvable ». Valider `testId` et `requirementId` (même client) à la création de la couverture, et enregistrer `createdBy`.

### M7 — MAJEURE : numéro de version de méthode calculé par le client, d'où des doublons « v1 »
- **Où :** `useMethodProfileACFCStore.ts:201-203`, `useImpactAssessmentStore.ts:204-206`, `useRiskAssessmentStore.ts:249-251` (`v${profils.length + 1}`). En cas d'échec, `charger` vide la liste (par exemple `useImpactAssessmentStore.ts:191` et `:197`).
- **Preuve :** Q3. Chargement en échec (401) puis nouvelle version : versions en base `['v1', 'v1']`. Deux utilisateurs simultanés produisent le même résultat.
- **Impact :** `profilActif` devient ambigu (égalité au tri) et les évaluations référencent une « v1 » qui n'est pas unique. La traçabilité des versions de méthode est perdue.
- **Correctif :** numérotation attribuée par le Worker (max + 1 dans une transaction, contrainte `UNIQUE(client_id, version)`). Côté front, interdire la création tant que le dernier chargement n'a pas réussi.

### M8 — MAJEURE : qualification IA et acquittement des conditions sans attribution ni historique, et échecs ignorés
- **Où :** `useClientConfigStore.ts:161-171` (`enregistrer` : `if (resultat.ok) …` sinon rien, et retour muet si le relais est absent) ; `:189-228` (lecture, modification puis écriture complète, date `new Date()` locale) ; `ConfigurationIA.vue:92-105` (aucun message). Worker `routeur.ts:7906-7929` (`void acteur`, écrasement sans journal).
- **Impact :** le contrôle qui autorise l'« usage réel » de l'IA (`peutActiverFournisseur`) repose sur un enregistrement sans auteur, sans horodatage serveur et sans historique, écrasable par n'importe quel compte ayant accès au client. Un échec d'enregistrement ne laisse aucune trace à l'écran.
- **Correctif :** le Worker ajoute `qualifiePar`, `acquittePar` et l'horodatage serveur, et consigne l'audit (`consignerAudit`) avec l'avant/après. Le store lève une erreur et l'écran l'affiche. Ajouter un contrôle de version (voir C4).

### M9 — MAJEURE : connecteurs QMS et connexion Drive — échecs ignorés, suppression en un clic sans trace
- **Où :** `useConnecteursQMSStore.ts:125` et `:135` (`if (!resultat.ok) return`) ; `ConfigurationConnecteursQMS.vue:277-279` (aucune confirmation) ; Worker `routeur.ts:6262-6278` (suppression sans `consignerAudit`) ; `useConnexionDriveStore.ts:104-108` et `ConfigurationDrive.vue:48-51` (enregistrement de la connexion Drive : échec muet).
- **Impact :** faux succès, et suppression définitive d'une configuration d'intégration sans confirmation ni trace (contrairement aux gabarits et documents normatifs, qui sont journalisés).
- **Correctif :** lever une erreur et l'afficher, ajouter `window.confirm` ou `ModaleConfirmationArchivage`, et ajouter `consignerAudit('suppression_connecteur', …)` côté Worker.

### M10 — MAJEURE : seuil d'action AMDEC non borné, qui peut rendre tous les verdicts « acceptables »
- **Où :** `RiskAssessmentAmdec.vue:53-69` (contrôle uniquement `min < max`) ; Worker `routeur.ts:3515-3525` (`estNombre` seulement).
- **Constat :** avec une échelle 1-5, l'IPR maximal vaut 125. Un seuil de 200, ou `echelleMin` à 0 ou négatif, est accepté, et alors **toute** ligne est « Acceptable » (voir `evaluerVerdictRiskAssessment.ts`).
- **Impact :** une configuration erronée produit des verdicts favorables systématiques, sans alerte.
- **Correctif :** exiger des entiers, `echelleMin ≥ 1` et `echelleMin³ < seuil ≤ echelleMax³`, côté front et Worker, avec un message explicite.

### M11 — MAJEURE : l'action résiduelle AMDEC écrase la précédente, et l'écran efface `dateCible` et `actionsMenees`
- **Où :** `RiskAssessmentAmdec.vue:147-155` (envoie toujours `dateCible: null` et `actionsMenees: null`) ; Worker `routeur.ts:3684-3700` (remplacement des champs, audit « action résiduelle enregistrée » sans valeurs).
- **Impact :** chaque nouvel enregistrement fait disparaître la recommandation, les notes, l'IPR et le verdict résiduels précédents, sans avant/après dans l'audit. Des champs saisis ailleurs sont remis à `null`.
- **Correctif :** conserver l'historique des actions résiduelles (liste datée et attribuée) ou mettre l'avant/après dans `auditLog`. Ne transmettre que les champs réellement saisis (PATCH) et refuser l'effacement implicite.

### m1 — MINEURE : liens `Project.sections[]` et `documents[]` non vérifiés
- **Où :** `useSectionsStore.ts:276-279`, `:340-347`, `:473-480` ; `useProjectDocumentsStore.ts:136-139`.
- **Constat :** le résultat de `ajouterSectionProjet` / `ajouterDocumentProjet` est jeté.
- **Impact :** `TableauDeBord.vue:269` (`projet.sections.length`) sous-compte les sections, et la cohérence du projet (synchronisation GitHub) n'est plus assurée, sans aucun message.
- **Correctif :** vérifier `resultat.ok` et, sinon, lever « Section créée mais non rattachée au projet — réessayez ». Mieux : laisser le Worker faire le rattachement dans `POST /sections`.

### m2 — MINEURE : un nouvel essai après l'échec de la localisation crée une preuve en double
- **Où :** `ExecutionTests.vue:222-257`.
- **Constat :** la preuve est créée, puis la localisation échoue. Le brouillon est volontairement conservé « pour ne retenter que la référence », mais le bouton relance `enregistrerPreuve`, ce qui crée une **seconde** preuve.
- **Correctif :** mémoriser `preuveCreeeId[executionId]` et, au nouvel essai, n'appeler que `ajouterLocalisation`.

### m3 — MINEURE : codes techniques bruts et dates ISO à l'écran
- **Constat :** 119 messages `Échec … : ${resultat.erreur}` dans les stores, affichés tels quels par 28 écrans (`e instanceof Error ? e.message`). Exemples :
  - `BibliothequeNormes.vue:83`, `:112`, `:148`, `:184` (« Échec de l'import : non_authentifie », « corps_invalide »…) ;
  - `AdminUtilisateurs.vue:158-159` (`{{ u.role }}` / `{{ u.statut }}` : « utilisateur », « desactive ») ;
  - `SourceIntelligence.vue:216` (`s.type` : « document »/« image ») et `:379` (`r.type` libre) ;
  - dates : `DossierVivantActif.vue:193-229` (`created_at.slice(0, 10)`, date UTC au format ISO, décalée d'un jour la nuit) et `FicheProjet.vue:371` (`deadline` ISO).
- **Correctif :** une table `messageErreurServeur(code)` en français (sur le modèle de `LIBELLES_ERREUR` d'`AdminUtilisateurs`), des libellés pour rôle, statut et type, et un `formaterDateFr()` basé sur `toLocaleDateString('fr-FR')`.

### m4 — MINEURE : verdict favorable sur un questionnaire vide, et règle inconnue qui renvoie `undefined`
- **Où :** `assessment/moteurQuestionsOuiNon.ts:36-45` (aucune question donne `'negatif'`), `acfc/evaluerVerdictACFC.ts:30-45` et `evaluerVerdictImpactAssessment.ts` (un `switch` sans `default` renvoie `undefined`). Le Worker accepte `questions: []` (`routeur.ts:2744-2750`).
- **Preuve :** P4 (`'non_critique'` et `'non_impact_direct'` pour `[]`, `undefined` pour une règle inconnue) et P4bis (profil sans question créé, 201).
- **Correctif :** retourner `null` si `questionIds.length === 0` ou si la règle est inconnue (`default: return null`). Le Worker exige au moins une question.

### m5 — MINEURE : `calculerIPR` accepte `NaN` et les notes non entières
- **Où :** `moteur-calcul/calculerIPR.ts:49-54`. `NaN < min` et `NaN > max` sont tous deux faux, donc `calcule: true` et `valeur: NaN`, ce qui donne `'acceptable'`.
- **Preuve :** P6. Aujourd'hui, la note initiale est protégée par la validation native du formulaire (`step="1"`), ce qui n'est pas une garantie de la fonction pure.
- **Correctif :** `if (!Number.isInteger(v)) return { calcule: false, raison: 'valeur_hors_plage', champ }`.

### m6 — MINEURE : la ressaisie du mot de passe à l'archivage n'est vérifiée que dans le navigateur
- **Où :** `composants/ModaleConfirmationArchivage.vue:40-60` ; `AuthApiClient.ts:3185-3191` (`POST /projects/:id/archiver` avec le seul JWT).
- **Impact :** la « confirmation par mot de passe » peut être contournée par un appel direct. Ce n'est pas une ré-authentification au sens de Part 11.
- **Correctif :** envoyer le mot de passe (ou un jeton de ré-authentification court) au Worker, qui le vérifie avant d'archiver, de supprimer ou de désarchiver.

### m7 — MINEURE : le fournisseur IA historique `claude` est affiché comme `openai` sans le dire
- **Où :** `ConfigurationIA.vue:79-88`.
- **Constat :** l'écran montre un fournisseur différent de la valeur enregistrée. Cliquer « Changer » réinitialise alors la qualification (`definirFournisseur`).
- **Correctif :** afficher « Fournisseur enregistré : claude (plus proposé) — choisissez-en un » au lieu d'une présélection silencieuse.

### m8 — AMÉLIORATION : code mort et identité de repli fabriquée
- **Où :** paramètres `actor` et `identiteDeclaree` acceptés puis ignorés (`void`) : `useProjectsStore.ts:337-461`, `useNormativeDocumentsStore.ts:216` et `:245`, `useProjectDocumentsStore.ts:124-147`. `BibliothequeNormes.vue:48-50` et `identite/identiteLocale.ts:23-25` se rabattent sur `'utilisateur-local-phase1'`.
- **Risque :** un futur appelant peut croire l'attribution transmise alors qu'elle ne l'est pas.
- **Correctif :** retirer ces paramètres. `identifiantActeurCourant()` doit lever une erreur hors session plutôt que fabriquer une identité.

### m9 — AMÉLIORATION : clôture d'exécution (irréversible) sans confirmation ni alerte d'incohérence
- **Où :** `ExecutionTests.vue:262-270` et `:436-448`.
- **Constat :** on peut clôturer « Conforme » alors qu'une étape est « Non conforme », sans avertissement ni confirmation, alors que l'enregistrement devient immuable.
- **Correctif :** une modale de confirmation, plus l'alerte « N étape(s) non conforme(s) : confirmez le verdict ». Le verdict reste explicite (décision conservée).

### m10 — AMÉLIORATION : les zones critiques sans test, et les tests qui figent des défauts
- **Constat :** aucun test ne couvre l'attribution des actions de section, la concurrence (C4), le changement de `clientId` (C5), la double soumission, l'expiration de session, les réponses tardives de `charger()` ni les messages d'erreur des gestionnaires. `useSectionsStore.ts`, `useClientConfigStore.ts`, `useStructureSystemeStore.ts` et `numeroVersion.ts` n'ont pas de test du même nom (certains sont couverts par `sections.test.ts`, `clientConfig.test.ts`, `structureSysteme.test.ts`). `sections.test.ts:246-263` **fige** l'avis en texte libre (C2).
- **Correctif :** reprendre les preuves P1 à P9 et Q1 à Q3 comme tests de non-régression une fois les correctifs faits.

---

## B. À confirmer (plausible d'après le code, non démontré)

- **A1 — EditeurSection, texte qui revient en arrière (majeure si confirmé).** `EditeurSection.vue:182-198` et `:336-344` ; `useSectionsStore.chargerSectionsDuProjet` n'a aucun garde de séquence. Si `recharger()` lit la liste avant la fin d'une sauvegarde automatique, ou qu'une réponse de liste plus ancienne arrive en dernier, le champ revient à l'ancien texte. La frappe suivante réenregistre alors le texte ancien plus la nouvelle frappe, et la saisie intermédiaire est perdue. Test à écrire avec des délais de réponse contrôlés.
- **A2 — StructureSysteme, brouillons périmés.** `StructureSysteme.vue:153-179` : `statutChoisi` et la périodicité ne sont initialisés qu'une fois par nœud. Après un changement fait par un autre utilisateur puis un rechargement, enregistrer la périodicité réécrit l'ancien statut de qualification.
- **A3 — Réponses toutes « sans objet ».** Elles donnent « non critique » / « non impact direct ». C'est une décision de méthode à faire confirmer par l'utilisateur (on pourrait préférer `null`).
- **A4 — ClientConfig, retour aux valeurs par défaut.** `useClientConfigStore.ts:145-159` : si la lecture renvoie un refus 4xx autre que « non trouvé », `configParDefaut` est fusionné puis réécrit, ce qui efface acquittement, qualifications et consentement. Il faut vérifier quelles réponses de `GET /client-config` sont possibles.
- **A5 — Dossier vivant.** `DossierVivantActif.vue` agrège plusieurs stores globaux (C5) : risque d'afficher des évaluations d'un autre nœud ou client après une navigation rapide. Non testé.

---

## C. Tableau récapitulatif (trié par gravité)

| # | Gravité | Emplacement principal | Constat | Preuve |
|---|---|---|---|---|
| C1 | Critique | `useSectionsStore.ts:267,593,620,816,825` | Audit des sections attribué à `owner_id`, pas à l'acteur réel | P9 |
| C2 | Critique | `EditeurSection.vue:713-727`, `transitionSection.ts:118` | Avis au nom d'un tiers, approbation sans l'approbateur, avis réutilisés après rejet, signatures vides | P9 |
| C3 | Critique | `routeur.ts:8951-8958`, `analyserImportJSON.ts:46-122` | Statut, historique et signatures écrits par le navigateur ; import d'une section déjà validée | P8, lecture |
| C4 | Critique | `useSectionsStore.ts:583-624` | Écritures concurrentes : table et audit perdus sans message | Q1 |
| C5 | Critique | `CoquilleApplication.vue:70`, 22 écrans | Changement de client non rechargé, écritures croisées entre clients | P2 |
| M1 | Majeure | `main.ts:8`, environ 60 gestionnaires | Exceptions d'écriture non gérées, aucun message | P3 |
| M2 | Majeure | `ImpactAssessment.vue:106`, `ExecutionTests.vue:346`… | Double soumission : doublons | P1 |
| M3 | Majeure | `useAuthStore.ts:38`, `AuthApiClient.ts:3553` | Session expirée : écrans vides, pas de bandeau | Q2 |
| M4 | Majeure | `useRiskAssessmentStore.ts:328-332` | Verdict résiduel deviné « acceptable » | P7 |
| M5 | Majeure | `routeur.ts:2807,3288,3568,3646` | Verdicts clients non recalculés par le serveur | lecture |
| M6 | Majeure | `readinessContentPlan.ts:76-92`, `routeur.ts:4595` | « Prêt » avec un test couvrant inexistant | P5 |
| M7 | Majeure | 3 stores, `prochaineVersion()` | Doublons de version de méthode | Q3 |
| M8 | Majeure | `useClientConfigStore.ts:161-228`, `routeur.ts:7906` | Qualification IA sans auteur ni historique, échec muet | lecture |
| M9 | Majeure | `useConnecteursQMSStore.ts:125,135`, `routeur.ts:6262` | Échecs muets, suppression sans confirmation ni trace | lecture |
| M10 | Majeure | `RiskAssessmentAmdec.vue:53-69` | Seuil AMDEC non borné : tout « acceptable » | raisonnement |
| M11 | Majeure | `RiskAssessmentAmdec.vue:147-155`, `routeur.ts:3684` | Action résiduelle écrasée, champs remis à `null` | lecture |
| m1 | Mineure | `useSectionsStore.ts:278,342,475` | Rattachement au projet non vérifié | lecture |
| m2 | Mineure | `ExecutionTests.vue:222-257` | Preuve dupliquée au nouvel essai | lecture |
| m3 | Mineure | 28 écrans, `AdminUtilisateurs.vue:158` | Codes bruts, dates ISO/UTC | lecture |
| m4 | Mineure | `moteurQuestionsOuiNon.ts:36`, `routeur.ts:2744` | Verdict favorable sans question, `undefined` pour une règle inconnue | P4, P4bis |
| m5 | Mineure | `calculerIPR.ts:52` | `NaN` et notes non entières acceptés | P6 |
| m6 | Mineure | `ModaleConfirmationArchivage.vue:40` | Ré-authentification seulement côté navigateur | lecture |
| m7 | Mineure | `ConfigurationIA.vue:79-88` | Fournisseur remplacé en silence à l'affichage | lecture |
| m8 | Amélioration | `useProjectsStore.ts:337-461`… | Paramètres morts, identité de repli fabriquée | lecture |
| m9 | Amélioration | `ExecutionTests.vue:262` | Clôture sans confirmation ni alerte | lecture |
| m10 | Amélioration | tests | Zones critiques non testées, tests qui figent C2 | inventaire |
| A1-A5 | À confirmer | voir section B | Retour en arrière de l'éditeur, brouillons périmés, « sans objet », valeurs par défaut ClientConfig, dossier vivant | — |

**Priorités proposées :**
1. C3, C1 et C2 ensemble : le Worker devient seul auteur de l'audit, des transitions et des signatures des sections.
2. C4 : contrôle de version.
3. C5 : `:key` sur le `RouterView` plus un garde de client dans les stores.
4. M1 et M2 : utilitaire d'action commun et `errorHandler` global.
5. M3, M4, M6 et M7.

**État du dépôt :** `git status --short` est vide. Les deux tests temporaires ont été supprimés du dépôt après exécution. Leurs sources sont dans `scratchpad/audit-front/` (`auditPreuves.test.ts`, `auditPreuves2.test.ts`).
