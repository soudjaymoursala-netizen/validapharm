# Guide utilisateur ValidaPharm — référence complète

> Document de référence pratique, distinct des documents réglementaires numérotés
> (`00-cadrage-projet.md`, `03-specifications-fonctionnelles.md`, etc.) : il explique **comment utiliser
> l'outil**, écran par écran, champ par champ, sans reformuler les exigences. En cas
> de divergence entre ce guide et le comportement réel de l'application, le code
> source fait foi — ce document doit être mis à jour en conséquence.
>
> Toutes les captures de libellés, placeholders et messages ci-dessous sont recopiées
> mot pour mot depuis le code source de l'application (`src/presentation/screens/`
> et `src/presentation/composants/`) à la date de rédaction. Révision complète du
> 06/09/2026 : mise à jour de toutes les fonctionnalités ajoutées depuis la version
> précédente (import/extraction Process, catégorisation des procédures, assistant
> guidé de création de livrable et ses liens structurels, recherche globale, suivi
> de périodicité, navigation mobile) et correction des sections devenues obsolètes
> (l'ancien « profil local » a été remplacé par un vrai profil de compte).

---

## Sommaire

0. [Comprendre l'outil avant de commencer](#0-comprendre-loutil-avant-de-commencer)
1. [Premier lancement : connexion au dépôt GitHub, au relais IA et au Worker d'authentification](#1-premier-lancement--connexion-au-dépôt-github-au-relais-ia-et-au-worker-dauthentification)
2. [Authentification et votre compte](#2-authentification-et-votre-compte)
3. [Accueil — reprendre où vous en étiez](#3-accueil--reprendre-où-vous-en-étiez)
4. [Gérer les clients](#4-gérer-les-clients)
5. [Tableau de bord et projets](#5-tableau-de-bord-et-projets)
6. [Fiche projet](#6-fiche-projet)
7. [Éditeur de section — le cœur du travail](#7-éditeur-de-section--le-cœur-du-travail)
8. [Assistant guidé de création de livrable](#8-assistant-guidé-de-création-de-livrable)
9. [Miroir Google Drive (sauvegarde manuelle)](#9-miroir-google-drive-sauvegarde-manuelle)
10. [Missions et espace de travail](#10-missions-et-espace-de-travail)
11. [Structure Système (référentiel d'actifs)](#11-structure-système-référentiel-dactifs)
12. [Suivi de périodicité](#12-suivi-de-périodicité)
13. [Dossier vivant d'un actif](#13-dossier-vivant-dun-actif)
14. [Connecteurs QMS](#14-connecteurs-qms)
15. [Journal d'anomalies (événements qualité)](#15-journal-danomalies-événements-qualité)
16. [Stratégie de qualification (ACFC)](#16-stratégie-de-qualification-acfc)
17. [Impact Assessment](#17-impact-assessment)
18. [Computer System Assessment (GAMP5)](#18-computer-system-assessment-gamp5)
19. [Paramètres critiques (CPP/CQA)](#19-paramètres-critiques-cppcqa)
20. [Risk Assessment / AMDEC](#20-risk-assessment--amdec)
21. [Exigences et tests](#21-exigences-et-tests)
22. [Exécution de tests](#22-exécution-de-tests)
23. [Ingestion documentaire (Source Intelligence)](#23-ingestion-documentaire-source-intelligence)
24. [Plans de livrable (Content Plan)](#24-plans-de-livrable-content-plan)
25. [Procédures (structuration de SOP)](#25-procédures-structuration-de-sop)
26. [Process (procédés du site)](#26-process-procédés-du-site)
27. [Templates & Formulaires](#27-templates--formulaires)
28. [Chat expert / Assistant IA](#28-chat-expert--assistant-ia)
29. [Bibliothèque de normes](#29-bibliothèque-de-normes)
30. [Configuration IA par client](#30-configuration-ia-par-client)
31. [Recherche globale](#31-recherche-globale)
32. [Paramètres d'affichage](#32-paramètres-daffichage)
33. [Résolution de conflit de synchronisation](#33-résolution-de-conflit-de-synchronisation)
34. [Écran de blocage d'incompatibilité](#34-écran-de-blocage-dincompatibilité)
35. [Glossaire des statuts (annexe)](#35-glossaire-des-statuts-annexe)
36. [Parcours type de bout en bout](#36-parcours-type-de-bout-en-bout)

---

## 0. Comprendre l'outil avant de commencer

**ValidaPharm est une PWA (Progressive Web App) sans serveur central pour les
données métier, mais avec une authentification réelle multi-utilisateur**
(Worker Cloudflare dédié + base D1) : toute l'application — à l'exception de
l'écran de connexion lui-même et de « Configuration client » — exige une
session valide avant d'être accessible ([§2.1](#21-se-connecter)). Quatre
idées à comprendre avant de commencer :

1. **Vos données de projet vivent d'abord dans le navigateur** (base locale
   IndexedDB). Rien n'est envoyé nulle part tant que vous ne cliquez pas
   explicitement sur « Synchroniser vers GitHub ».
2. **GitHub est la source de vérité.** Un dépôt GitHub dédié stocke la copie
   officielle de vos projets/sections au format JSON. Vous vous « connectez » à ce
   dépôt via un jeton d'accès (PAT), configuré une seule fois pour toute
   l'installation (écran [§1](#1-premier-lancement--connexion-au-dépôt-github-au-relais-ia-et-au-worker-dauthentification)).
3. **Google Drive n'est jamais une source de vérité**, seulement un miroir de
   sauvegarde manuel, par client, qui **écrase** son contenu à chaque sauvegarde
   ([§9](#9-miroir-google-drive-sauvegarde-manuelle)).
4. **Les comptes clients (« Clients ») sont hébergés côté serveur** (base D1,
   même Worker que l'authentification) : c'est ce qui permet à un administrateur
   de voir réellement tous les clients de l'organisation, quel que soit
   l'appareil utilisé — contrairement aux projets/sections, qui restent locaux à
   chaque appareil tant qu'ils ne sont pas synchronisés vers GitHub.

### Navigation générale (barre latérale)

- Si vous êtes connecté, un bandeau affiche le prénom et le nom du compte
  courant avec un lien **« Se déconnecter »**.
- Un champ **« Rechercher… »** (icône loupe) est toujours visible en haut de la
  barre latérale, sous le bascule Mode Expert/Mode Assistant — il ouvre l'écran
  de [recherche globale](#31-recherche-globale) sur la requête saisie.
- **Accueil** → « Que voulez-vous faire ? » (`/`), voir [§3](#3-accueil--reprendre-où-vous-en-étiez).
- **Mon espace** → Profil ([§2.3](#23-mon-profil)), Paramètres (préférences
  d'affichage de cet appareil, [§32](#32-paramètres-daffichage)), Guides & normes
  (Bibliothèque de normes, [§29](#29-bibliothèque-de-normes)) ; en Mode Expert
  uniquement, Configuration GitHub ; si le compte connecté a le rôle admin,
  Gestion des comptes ([§2.2](#22-gestion-des-comptes-admin)).
- **Mon travail** → Mes clients, Tous mes projets (Tableau de bord).
- Dès qu'un client est actif (dernier client visité), ses outils apparaissent
  regroupés par intention :
  - **Le site** — Vue d'ensemble (Fiche client), Architecture (Structure
    Système), Suivi de périodicité, Process, Procédures, Templates &
    Formulaires, Projets (Tableau de bord filtré), Missions.
  - **Qualité & ingénierie** — Stratégie de qualification, Impact Assessment,
    Computer System Assessment, Risk Assessment (AMDEC), Paramètres
    critiques, Exigences et tests, Exécution de tests, Journal d'anomalies.
  - **Connaissance & IA** — Ingestion documentaire, Plans de livrable,
    Assistant IA.
  - **Configuration du site** — Connecteurs QMS, Miroir Drive, IA du client.
- Chaque lien d'un outil de client porte, au survol, un bouton **épingle**
  (icône punaise) — **« Épingler {nom de l'outil} »** / **« Désépingler… »** —
  qui l'ajoute à un bloc **« Raccourcis épinglés »** affiché sur l'écran
  Accueil ([§3](#3-accueil--reprendre-où-vous-en-étiez)), pour retrouver en un
  clic les outils que vous utilisez le plus souvent pour un client donné (un
  même outil épinglé pour deux clients différents reste deux raccourcis
  distincts). Purement une commodité de navigation locale à l'appareil,
  jamais une donnée de projet.

Un bouton **« Mode Expert » / « Mode Assistant »** apparaît en haut de la barre
latérale. En Mode Assistant, la barre latérale ne montre plus, dans les
groupes ci-dessus, qu'un sous-ensemble jugé essentiel à un parcours guidé
(Suivi de périodicité, Templates & Formulaires, Risk Assessment, Paramètres
critiques, Exigences et tests, Exécution de tests, Journal d'anomalies,
Ingestion documentaire, Plans de livrable, Connecteurs QMS, Miroir Drive, IA du
client et Configuration GitHub disparaissent) ; le Mode Expert affiche toujours
la liste complète. Aucun écran lui-même ne change de comportement selon le
mode : seule la liste de liens proposée diffère.

### Navigation mobile (écran étroit)

Sous environ 768px de large (téléphone, petite tablette), la barre latérale
n'est plus affichée en permanence : un bouton **hamburger** (trois barres)
apparaît en haut à gauche de l'écran. Le cliquer ouvre la barre latérale en
tiroir superposé, avec un fond assombri derrière ; cliquer sur ce fond, ou de
nouveau sur le bouton (devenu une icône de fermeture ✕), referme le tiroir. Le
tiroir se referme aussi automatiquement dès que vous naviguez vers un autre
écran. Au-dessus de ce seuil de largeur, la barre latérale reste affichée en
permanence comme décrit ci-dessus — aucun écran de l'application ne change de
comportement fonctionnel selon la largeur, seule la présentation de la
navigation s'adapte.

---

## 1. Premier lancement : connexion au dépôt GitHub, au relais IA et au Worker d'authentification

**Écran** : « Configuration client » — route `/configuration` (menu « Configuration
GitHub »).

Cet écran configure **trois connexions globales à toute l'installation** (un seul
dépôt, un seul relais IA, un seul Worker d'authentification, jamais un par client) :

> Le dépôt GitHub ([§1.1](#11-dépôt-github-dédié)) et le Relais IA
> ([§1.2](#12-relais-ia)) sont enregistrés **côté serveur** (Worker/D1) —
> configurés une fois par un admin, ils sont aussitôt disponibles pour
> tous les comptes de l'organisation, sur n'importe quel appareil/navigateur
> (corrige un bug signalé : ces réglages n'étaient auparavant sauvegardés
> que dans le navigateur, retrouvés vides à chaque nouvel appareil). Seul un
> admin peut les modifier ; tout compte connecté peut les lire et les
> utiliser. L'URL du Worker d'authentification ([§1.3](#13-authentification-comptes-réels))
> reste elle seule strictement locale au poste — elle sert justement à
> indiquer où se connecter, avant même toute session.

### 1.1 Dépôt GitHub dédié

> Rappel affiché à l'écran : « Utilisez un jeton d'accès personnel (PAT) à portée
> strictement restreinte à ce seul dépôt — jamais un jeton donnant accès à
> l'ensemble de votre compte GitHub. »

| Champ | Type | Obligatoire | Placeholder |
|---|---|---|---|
| Propriétaire (owner) | texte | oui | `ex. acme-corp` |
| Dépôt | texte | oui | `ex. validapharm-data` |
| Branche | texte | non (défaut `main`) | `main` |
| Jeton d'accès personnel | mot de passe | oui | — |

Boutons : **« Effacer »** (vide tout et réinitialise), **« Enregistrer »** (sauve
la connexion, affiche brièvement « ✓ Enregistré. »), **« Tester la connexion »**
(désactivé tant que rien n'est enregistré ; devient « Test en cours… » pendant
l'appel).

- Succès : « Connexion réussie — branche « {branche ou « main »} » au commit
  {7 premiers caractères du SHA}. »
- Échec : « Échec de connexion : {message} »

Enregistrement réservé à un admin (paramètre partagé par toute
l'installation) — un compte non-admin qui tente d'enregistrer voit
« Réservé à un administrateur (paramètre partagé par toute
l'installation). » à la place de la confirmation.

### 1.2 Relais IA

> Rappel affiché : « Le navigateur ne contacte jamais un fournisseur d'IA
> directement : toutes les requêtes passent par ce relais serverless unique, qui
> détient la clé du fournisseur configuré côté serveur. »

| Champ | Type | Obligatoire | Placeholder |
|---|---|---|---|
| URL du relais | URL | oui | `https://relais.exemple.workers.dev` |
| Jeton d'accès | mot de passe | oui | — |

Mêmes boutons « Effacer » / « Enregistrer » (affiche aussi brièvement
« ✓ Enregistré. » ; pas de test de connexion sur ce bloc) — même
réservation à un admin que le dépôt GitHub ci-dessus.

C'est ce relais qui est utilisé partout où l'IA intervient (chat expert,
génération de brouillon, raisonnement de mission, structuration de procédure,
etc.) — voir les sections correspondantes pour la configuration **par client**
du fournisseur choisi ([§30](#30-configuration-ia-par-client)).

Code serveur réel de ce relais : `workers/ia-relay/` (Cloudflare Worker,
architecture swappable — voir `workers/ia-relay/README.md`), câblé sur
ChatGPT (OpenAI). **Déployé et vérifié en conditions réelles depuis le
07/09/2026** (Worker `validapharm-ia-relay`, connecté au dépôt GitHub —
redéploiement automatique à chaque mise à jour du code de ce relais).
L'URL du Worker et le jeton d'accès choisi lors du déploiement sont
exactement ce qui se saisit dans ce bloc.

### 1.3 Authentification (comptes réels)

> Rappel affiché : « Worker Cloudflare + base D1 dédiés aux comptes/rôles/
> clients de l'organisation — remplace le verrou local par une vraie session.
> Aucun jeton fixe à saisir ici : la session s'obtient en se connectant sur
> l'écran « Se connecter ». »

| Champ | Type | Obligatoire | Placeholder |
|---|---|---|---|
| URL du Worker d'authentification | URL | oui | `https://auth.exemple.workers.dev` |

Bouton **« Enregistrer »** (affiche brièvement « ✓ Enregistré. » ; pas de
bouton « Effacer » ni de test de connexion sur ce bloc).

Cet écran entier reste accessible même si vous n'êtes pas connecté — avec « Se
connecter » lui-même, ce sont les deux seules routes exclues de la garde de
session, puisqu'il faut pouvoir indiquer où se connecter avant de pouvoir vous
connecter. Voir [§2.1](#21-se-connecter) pour l'écran de connexion.

---

## 2. Authentification et votre compte

Un compte réel (email + mot de passe, vérifiés côté serveur, avec un rôle
« admin » ou « utilisateur ») protège tout l'accès à l'application (garde de
routeur globale). C'est ce compte, et son mot de passe, qui est redemandé pour
confirmer un archivage ou une suppression définitive ([§4](#4-gérer-les-clients)).

### 2.1 Se connecter

**Écran** : « Se connecter » — route `/connexion`.

Si aucun Worker d'authentification n'est configuré sur cet appareil, un
bandeau le rappelle : « Aucun Worker d'authentification configuré sur cet
appareil. » avec un lien **« Configurer »** vers « Configuration client »
([§1.3](#13-authentification-comptes-réels)).

| Champ | Type | Obligatoire |
|---|---|---|
| Email | email | oui |
| Mot de passe | mot de passe | oui |

Bouton **« Se connecter »** (libellé « Connexion… » pendant l'appel). Messages
d'erreur possibles :
- « Email ou mot de passe incorrect. »
- « Worker d'authentification non configuré — voir « Configuration client »
  ci-dessous. »
- « Une erreur inattendue est survenue. »

Rappel affiché : « Aucune inscription libre — un administrateur crée votre
compte (« Gestion des comptes »). »

Une fois connecté, vous êtes redirigé vers la page initialement demandée (ou
l'accueil). Toute route de l'application, sauf cet écran et « Configuration
client », vous ramène ici tant qu'aucune session valide n'existe.

### 2.2 Gestion des comptes (admin)

**Écran** : « Gestion des comptes » — route `/admin/utilisateurs`, réservé au
rôle admin (redirection automatique vers l'accueil pour tout autre rôle).

Rappel affiché : « Aucune inscription libre — seul un admin crée un compte. La
désactivation empêche immédiatement toute nouvelle connexion. »

Bouton **« Nouveau compte »** → formulaire :

| Champ | Type | Obligatoire | Détail |
|---|---|---|---|
| Prénom | texte | oui | — |
| Nom | texte | oui | — |
| Email | email | oui | — |
| Mot de passe initial | mot de passe | oui | minimum 8 caractères |
| Rôle | liste (Utilisateur / Admin) | — | défaut Utilisateur |

Boutons **« Annuler »** / **« Créer le compte »**. Erreurs possibles : « Cet
email est déjà utilisé par un autre compte. », « Adresse email invalide. »,
« Le mot de passe doit contenir au moins 8 caractères. », « Le nom est
obligatoire. », « Le prénom est obligatoire. »

À la création, un email est envoyé automatiquement à la personne avec
l'adresse de connexion, son email et le mot de passe initial saisi
ci-dessus. Si l'envoi échoue (ex. service d'email non configuré), le compte
est tout de même créé — communiquez alors les identifiants vous-même.

Chaque compte listé affiche son nom, son email, un badge de rôle
(admin/utilisateur) et un badge de statut (actif/desactive), avec deux
actions : **« Promouvoir admin » / « Rétrograder »** et **« Désactiver » /
« Réactiver »**. Le premier compte admin de l'installation est créé en dehors
de cette interface (`/auth/bootstrap-admin`).

### 2.3 Mon profil

**Écran** : « Mon profil » — route `/profil`.

> Cet écran a remplacé l'ancien « Profil local » (verrou de confirmation
> pré-authentification réelle) : depuis que l'archivage/la suppression
> définitive redemandent le vrai mot de passe de connexion
> ([§4](#4-gérer-les-clients)), un profil local séparé n'avait plus de rôle
> de garde-fou. Cet écran expose désormais votre identité et votre mot de
> passe **réels**, ceux du compte utilisé pour vous connecter.

Bloc « Identité » (lecture seule par défaut) :
- Prénom, Nom, Email (identifiant), Rôle (badge « Administrateur » ou
  « Utilisateur »).
- Bouton **« Modifier nom / prénom »** → formulaire (Prénom, Nom, tous deux
  obligatoires) avec boutons **« Annuler »** / **« Enregistrer »**. Erreur
  possible : « Le nom et le prénom sont obligatoires. » ; confirmation
  affichée 3 secondes : « ✓ Enregistré. »

Bloc « Mot de passe » :

| Champ | Type | Obligatoire |
|---|---|---|
| Mot de passe actuel | mot de passe | oui |
| Nouveau mot de passe | mot de passe | oui, minimum 8 caractères |
| Confirmer le nouveau mot de passe | mot de passe | oui |

Bouton **« Changer le mot de passe »** (libellé « Changement en cours… »
pendant l'appel). Erreurs possibles : « Le nouveau mot de passe doit contenir
au moins 8 caractères. », « La confirmation ne correspond pas au nouveau mot
de passe saisi. », ou l'erreur renvoyée par le serveur (ex. mot de passe
actuel incorrect). Confirmation affichée 3 secondes : « ✓ Mot de passe
changé. »

Rappel en bas de page : « La gestion des comptes (création, désactivation,
changement de rôle) se fait sur l'écran « Gestion des comptes », réservé aux
administrateurs. »

La création, la désactivation et le changement de rôle d'un compte restent
réservés à un administrateur ([§2.2](#22-gestion-des-comptes-admin)) — cet
écran ne permet de modifier que votre propre identité et votre propre mot de
passe.

---

## 3. Accueil — reprendre où vous en étiez

**Écran** : « Que voulez-vous faire ? » — route `/`.

Répond directement à « Où en étais-je et qu'est-ce que je dois faire
maintenant ? » plutôt que d'être un tableau de bord générique — chaque bloc
s'appuie sur des données réelles déjà persistées, jamais une suggestion
fabriquée ni un pourcentage de progression inventé. Sous-titre affiché :
« Choisissez une action pour démarrer, ou reprenez là où vous en étiez. »

- **« Continuer mon travail »** (affiché seulement si un projet actif existe) :
  carte vers ce projet (le plus récemment modifié), avec son client (ou
  « Sans client ») et, si des sections existent, « {validées}/{total}
  section(s) validée(s) ».
- **« Mes clients »** : nombre réel de clients actifs et de clients archivés,
  liens vers « Mes clients ».
- **« À vérifier »** (mis en évidence visuellement si au moins un élément) :
  - « Information(s) extraite(s) non validée(s) » — nombre réel d'éléments de
    connaissance encore « à valider » ([§23](#23-ingestion-documentaire-source-intelligence)),
    cliquable vers l'écran d'ingestion si un client est actif.
  - « Conflit(s) non résolu(s) » — nombre réel de conflits ouverts entre
    éléments de connaissance.
  - État vide : « Rien à vérifier pour l'instant. »
- **« Mes projets »** : les 5 projets actifs les plus récents, lien « Voir
  tous mes projets ». État vide : « Aucun projet actif pour l'instant. »
- **« Raccourcis épinglés »** : vos outils épinglés depuis la barre latérale
  ([§0](#0-comprendre-loutil-avant-de-commencer)), chacun avec un bouton de
  désépinglage. État vide : « Aucun raccourci épinglé — épinglez un outil
  depuis la navigation d'un site pour le retrouver ici. »
- Deux cartes d'action : **« Gérer mes clients »** (vers « Mes clients ») et
  **« Configurer la connexion GitHub »** (vers « Configuration client »).

Si le chargement des clients échoue (incident réseau du Worker
d'authentification), un message dédié s'affiche — « Impossible de charger vos
clients pour l'instant ({message}). » — sans empêcher le reste de l'écran
(sections, informations à vérifier, tout local) de s'afficher normalement.

---

## 4. Gérer les clients

**Écran** : « Mes clients » — route `/clients`.

Un « client » (ou « site ») est l'entité racine à laquelle sont rattachés tous
les outils spécialisés (Structure Système, Missions, Assessments, etc.).

### Créer un client
Bouton **« Nouveau client »** → formulaire :

| Champ | Type | Obligatoire | Détail |
|---|---|---|---|
| Nom de l'entreprise | texte | oui | — |
| Adresse | texte | non | — |
| Secteur | liste déroulante | non | « — non renseigné — », **Pharmaceutique**, Dispositif médical, Autre |
| Détails (produits fabriqués, contexte industriel…) | zone de texte | non | — |

Boutons « Annuler » / « Créer le client ».

État vide : « Aucun client actif pour l'instant — créez le premier avec le bouton
ci-dessus. »

### Fiche client (accéder aux outils)
Chaque ligne de la liste des clients actifs affiche son nom et, s'il est
renseigné, un badge de secteur ; cliquer dessus ouvre sa **Fiche client**
(route `/clients/:clientId`) — cet écran ne propose plus un lien par outil,
ligne par ligne. La Fiche client expose :
- Un bouton **« Modifier les informations »** qui rouvre le même formulaire
  que ci-dessus (nom, adresse, secteur, détails).
- Cinq « branches » sous forme de cartes, chacune vers un outil : **Architecture**
  (Structure Système), **Process**, **Procédures**, **Templates & Formulaires**,
  **Projets** (Tableau de bord filtré sur ce client).
- Un aperçu **« Projets récents »** (jusqu'à 5) si ce client a déjà des projets.

Les outils plus spécialisés (Suivi de périodicité, Missions, les Assessments,
Exigences et tests, Exécution de tests, Ingestion documentaire, Plans de
livrable, Connecteurs QMS, Miroir Drive, IA du client, Assistant IA, Journal
d'anomalies…) restent accessibles depuis la barre latérale dès ce client
devenu « actif » — par exemple en visitant sa Fiche client ou une de ses
branches ([§0](#0-comprendre-loutil-avant-de-commencer)).

### Archiver un client
Bouton **« Archiver »** (rouge) sur chaque ligne de « Mes clients » → ouvre la
modale de confirmation (voir encadré ci-dessous). **Un client archivé n'est
jamais supprimé** : il disparaît de la liste principale mais reste consultable
dans une section dépliable **« Afficher les clients archivés (N) »** (le
bouton devient « Masquer les clients archivés (N) » une fois dépliée), avec
la mention « archivé le {date} par {identité} » et un bouton **« Désarchiver »**
(sans confirmation).

> **Comment fonctionne la confirmation d'archivage** (identique pour un client et
> pour un projet) :
> 1. Le nom exact de l'élément est rappelé à l'écran : « Cette action archive
>    « {nom} » — les données ne sont jamais supprimées, l'élément reste
>    restaurable depuis les archives. »
> 2. Vous devez **retaper le nom exact** dans le champ « Retapez le nom pour
>    confirmer » (erreur si différent : « Le nom saisi ne correspond pas. »).
> 3. Vous devez saisir **votre mot de passe de connexion** (celui du compte
>    utilisé pour vous connecter, [§2.1](#21-se-connecter) — vérifié
>    réellement côté serveur ; erreur si incorrect : « Mot de passe
>    incorrect. »).
> 4. Bouton final **« Archiver »** (rouge, libellé « Vérification… » pendant
>    l'appel) ou **« Annuler »**.
>
> Ni le nom retapé ni le mot de passe ne constituent une preuve d'identité
> opposable — ce sont deux garde-fous contre un clic accidentel, pas une
> signature électronique.

### Suppression définitive (admin uniquement)
Sur un client déjà archivé, un compte admin voit en plus un bouton **«
Supprimer définitivement »**, qui ouvre une seconde modale, plus stricte :
retaper le nom exact, saisir une **justification obligatoire** (zone de
texte, placeholder `ex. Client fermé, demande écrite du 04/09/2026`), puis
votre mot de passe de connexion. Bandeau d'avertissement affiché : « Action
**irréversible** — « {nom} » et toutes ses données seront définitivement
supprimés, jamais restaurables. Tracée dans le journal d'audit (qui vous a
supprimé quoi, quand, pourquoi). » Erreurs possibles : « Le nom saisi ne
correspond pas. », « La justification est obligatoire pour une suppression
définitive. », « Mot de passe incorrect. » Bouton final **« Supprimer
définitivement »** (libellé « Vérification… » pendant l'appel) ou
**« Annuler »**.

---

## 5. Tableau de bord et projets

**Écran** : « Tableau de bord » — route `/tableau-de-bord` (accessible aussi
via la carte « Voir mes projets » de l'accueil).

En-tête : nombre de projets actifs, boutons « Clients », « Configuration »,
**« Nouveau projet »**.

### Synchronisation GitHub
Deux boutons toujours visibles :
- **« Synchroniser vers GitHub »** (devient « Synchronisation… ») : pousse l'état
  local (projets + sections) vers le dépôt.
- **« Récupérer depuis GitHub »** : rapatrie l'état distant vers la base locale.

Messages possibles après une synchronisation :
- Succès : « {n} fichier(s) synchronisé(s). »
- Conflit : « Conflit détecté : la branche distante a changé depuis la dernière
  synchronisation. Vos modifications locales n'ont PAS été écrasées ni envoyées
  — ouvrez la résolution de conflit pour comparer champ par champ. » avec un
  lien **« Résoudre le conflit »** (voir [§33](#33-résolution-de-conflit-de-synchronisation)).
- Erreur : message brut renvoyé par le connecteur GitHub (ex. jeton invalide,
  réseau indisponible).

### Créer un projet
Formulaire (bouton « Nouveau projet ») :

| Champ | Type | Obligatoire |
|---|---|---|
| Nom du projet | texte | oui |
| Client | liste déroulante (option « — aucun — » possible) | non |
| Contexte | zone de texte | non |
| Portée — inclus | zone de texte | non |
| Portée — exclus | zone de texte | non |

À la création, vous êtes redirigé automatiquement vers la Fiche Projet.

### Liste des projets
Chaque ligne affiche le nom du projet, le nom du client rattaché (le cas
échéant) et le nombre de sections. État vide : « Aucun projet actif pour
l'instant — créez le premier avec le bouton ci-dessus. »

Atteint depuis la branche « Projets » d'une Fiche client ([§4](#4-gérer-les-clients)),
cet écran filtre automatiquement sur ce client : une bannière « Projets
filtrés pour {client} » apparaît, avec un lien **« Voir tous les projets »**
pour revenir à la vue portefeuille complète (état vide alors : « Aucun projet
actif pour ce client — créez-en un avec le bouton ci-dessus. »).

### Archiver un projet
Comme pour un client, une section dépliable **« Afficher les projets archivés
(N) »** liste les projets archivés avec « archivé le {date} par {identité} »
(voir [§6](#6-fiche-projet) pour le bouton d'archivage lui-même, situé sur la
Fiche Projet — pas sur le Tableau de bord).

---

## 6. Fiche projet

**Écran** : route `/projets/:projectId`.

### En-tête
Nom du projet, échéance si renseignée, et bouton **« Archiver ce projet »**
(rouge) — ouvre la même modale de double confirmation que pour un client
([§4](#4-gérer-les-clients)). Après archivage, vous êtes redirigé vers le
Tableau de bord.

### Contexte
Rappel en lecture seule des trois champs saisis à la création (Contexte, Portée
incluse, Portée exclue) — un tiret `—` s'affiche si un champ est vide.

### Partage du projet
Rappel affiché : « Lecture toujours ouverte à tous. Seuls le créateur et les
personnes partagées en édition peuvent modifier ce projet — une convention
d'affichage, pas une frontière de sécurité réelle (l'accès au dépôt Git reste
au niveau du client). » Affiche « Créé par : {identité} ».

Formulaire d'ajout d'un partage : email (obligatoire) + niveau d'accès
(**lecture** / **édition**) → bouton **« Partager »**. Chaque partage déjà
accordé peut être retiré (« Retirer »). État vide : « Pas encore partagé avec
personne d'autre. »

Si vous n'êtes ni le créateur ni une personne partagée en édition, un message
« Lecture seule — vous n'êtes ni créateur ni partagé en édition. » remplace
les actions de modification du reste de l'écran (sections, documents, partage
inclus).

### Progression du dossier de qualification (pipeline guidé)
Un bandeau **« Prochaine étape recommandée »** indique la première étape du
pipeline standard qui n'est pas encore « Validée en interne », avec un bouton
**« Créer cette section »** si elle n'existe pas encore. Le pipeline principal,
dans l'ordre : **Contexte procédé → URS → DQ → FAT → SAT → IQ → OQ → PQ →
Validation procédé**, plus deux pistes de support non séquentielles :
**Plan de métrologie** et **Plan de maintenance**. La progression n'est jamais
simulée : elle reflète uniquement les sections réellement créées.

Le gabarit **CSV (dossier de validation de système informatisé)** n'appartient
volontairement pas à ce pipeline : un système informatisé suit un cycle de
validation distinct de celui de l'équipement physique qu'il pilote (Annexe 11
« Systèmes informatisés » du Guide BPF/EudraLex), même quand cet équipement
est déjà qualifié séparément. Structure calquée sur cette même Annexe 11 —
Généralités (nom du système, catégorie GAMP 5, pertinences GxP et ERES/21 CFR
Part 11, fournisseur), Validation et cycle de vie, puis Sécurité/intégrité des
données/continuité opérationnelle. Les champs de « Généralités » portent
volontairement les mêmes noms qu'une évaluation Computer System Assessment
([§18](#18-computer-system-assessment-gamp5)) pour permettre un futur
pré-remplissage automatique — non câblé pour l'instant : la saisie reste
entièrement manuelle.

### Sections
- **« Assistant guidé »** (lien) : ouvre l'[assistant guidé de création de
  livrable](#8-assistant-guidé-de-création-de-livrable), qui rassemble le
  contexte réel du site (architecture, process, procédures, risques, méthode,
  précédents) avant de créer la section — recommandé dès que ce contexte
  existe pour le client.
- **« Ajouter une section »** → formulaire direct (sans passer par
  l'assistant) : Titre (obligatoire), Gabarit (liste déroulante parmi les 12
  types du catalogue), puis choix entre **« Créer la section vierge »**
  (modèle vide) et **« À partir d'un document »** (vous amène directement à
  l'éditeur, panneau de génération de brouillon par adaptation déjà ouvert,
  [§7.5](#75-génération-de-brouillon-par-adaptation-ia)).
- **« Importer une section (JSON) »** : reprend un export JSON existant — crée
  toujours une nouvelle section, jamais un écrasement. Erreur affichée si le
  fichier n'est pas un export JSON valide.
- Si le projet n'a encore aucune section, un « guide de démarrage » propose ces
  deux mêmes options (Construire manuellement / Importer une section JSON)
  sous forme de grandes cartes.
- Chaque section listée affiche son titre, son type de gabarit et une pastille
  de statut colorée (voir [§35](#35-glossaire-des-statuts-annexe)).

### Documents
Section dédiée à l'import de fichiers de référence (documentation fournisseur,
manuels, SOP…) « sous n'importe quel format ».

> Rappel affiché : « Fichiers de référence (documentation fournisseur, manuels,
> SOP…) sous n'importe quel format — toujours des références de travail, jamais
> des documents maîtres du QMS. »

- Bouton **« Importer un document »** (sélecteur de fichier, sans restriction de
  type ni de taille imposée par l'écran). En cas d'échec : « Échec du
  chargement du document — réessayez. »
- Chaque document listé affiche : son nom de fichier, la mention **« Référence
  de travail — non maître »**, la date de chargement et l'identité de la
  personne qui l'a chargé.
- Boutons par document : **« Télécharger »** (récupère le fichier tel que
  chargé, désactivé si le contenu binaire est absent) et **« Supprimer »**.
- État vide : « Aucun document chargé pour l'instant. »

Ces documents sont stockés uniquement en local (IndexedDB) — ils ne sont
**jamais synchronisés vers GitHub** ni vers le miroir Drive.

### Analyse structurelle du dossier
Section affichée uniquement si des écarts sont détectés (ex. une section liée
manquante). Rappel : « Constats déterministes, jamais un verdict de conformité —
à vérifier par l'utilisateur. » Chaque écart pointe directement vers la section
concernée.

---

## 7. Éditeur de section — le cœur du travail

**Écran** : route `/projets/:projectId/sections/:sectionId`.

C'est l'écran où se rédige effectivement le contenu d'un livrable (URS, DQ, IQ,
etc.) et où se déroule tout son cycle de vie.

### 7.1 Contenu
Si un gabarit déclaratif existe pour le type de la section (la majorité des 11
types du catalogue), un formulaire structuré s'affiche (champs propres au
gabarit). Sinon, un simple champ **« Contenu »** (zone de texte libre) sert de
repli. Le contenu est verrouillé (non modifiable) dès que la section est
**« Validée en interne »**. Une sauvegarde automatique s'effectue en continu
(léger délai de 400 ms après chaque frappe pour le repli texte libre).

### 7.2 Cycle de vie et statuts
Une section suit une machine à états stricte, jamais un simple champ libre :

| Statut technique | Libellé affiché à l'écran | Action pour y arriver |
|---|---|---|
| `brouillon_aide` | **Brouillon (aide à la rédaction)** | statut initial |
| `propose_par_ia_non_valide` | **Proposé par l'IA — non validé** | via génération de brouillon par adaptation IA ([§7.5](#75-génération-de-brouillon-par-adaptation-ia)) |
| `en_verification` | **En vérification** | bouton « Engager le cycle « validé en interne » » depuis Brouillon, ou « Valider cette section » depuis Proposé par l'IA |
| `en_approbation` | **En approbation** | bouton « Transmettre à l'approbation » depuis En vérification |
| `valide_en_interne` | **Validé en interne — pas une signature électronique opposable** | bouton « Approuver » depuis En approbation |

Ce dernier libellé (« pas une signature électronique opposable ») est **toujours**
affiché en entier, à l'écran comme sur les exports — jamais raccourci, pour ne
jamais laisser croire à une validation réglementaire opposable.

Actions disponibles selon le statut courant :
- **Brouillon** : « Engager le cycle « validé en interne » ».
- **Proposé par l'IA — non validé** : « Valider cette section (contenu proposé
  par IA) », désactivé tant que chaque sous-section du gabarit n'a pas été
  explicitement relue (voir [§7.6](#76-revue-obligatoire-dun-brouillon-proposé-par-lia)). Message
  rappel : « Relisez chaque section ci-dessus avant de pouvoir valider. »
- **En vérification** : « Transmettre à l'approbation » ou « Rejeter » (motif de
  rejet obligatoire).
- **En approbation** : « Approuver » ou « Rejeter » (motif obligatoire).
- **Validé en interne** : plus aucune action de cycle ; message affiché :
  « Section verrouillée (validée en interne — pas une signature électronique
  opposable). Nouvelle révision : backlog. »

### 7.3 Garde-fous de finalisation (blocages)
Certaines transitions sont bloquées tant que des conditions ne sont pas
remplies. Messages exacts, avec un champ **« Motif du forçage (obligatoire) »**
et un bouton **« Forcer »** permettant de passer outre en cas d'exception
justifiée :
- « Le rédacteur et l'approbateur final doivent être renseignés avant de
  poursuivre. »
- « Au moins un avis de relecteur est requis avant de transmettre cette section
  à l'approbation. »
- « Un motif est obligatoire pour rejeter cette section. »
- « Cette section est verrouillée (validée en interne) — son corps ne peut plus
  être modifié directement ; créez une nouvelle révision pour la faire évoluer. »
- « Cette action n'est pas autorisée dans l'état actuel de cette section. »
- Selon le type de gabarit, un lien vers une autre section est parfois exigé
  avant finalisation (ex. une section OQ ne peut être clôturée sans lien vers un
  Plan de maintenance de ce projet ; une IQ sans lien vers un Plan de
  métrologie ; toute section sans lien vers un Contexte procédé). Voir « Liens
  vers d'autres sections » ci-dessous — c'est la façon normale de satisfaire ces
  garde-fous, « Forcer » restant réservé aux exceptions.

### 7.4 Liens vers d'autres sections
Bloc « Lier à » (liste déroulante des autres sections du même projet non encore
liées) + bouton **« Lier »**. Chaque section déjà liée peut être « Déliée »
(sauf si la section courante est déjà validée en interne).

### 7.4bis Liens structurels (procédure, actif)
Distinct du bloc précédent : deux liens **réels**, indexés, retrouvables
**depuis la fiche de la procédure ou le dossier vivant de l'actif** — jamais
un simple texte d'audit. Posés automatiquement lorsque la section est créée
depuis l'[assistant guidé](#8-assistant-guidé-de-création-de-livrable), ou
manuellement ici pour une section créée en dehors de l'assistant :
- **Procédure** : si liée, affiche sa référence et son titre, avec un bouton
  **« Délier »** ; sinon, un sélecteur **« Lier à une procédure »** + bouton
  **« Lier »**.
- **Actif (nœud Structure Système)** : si lié, affiche son nom/code sous forme
  de lien cliquable vers son [dossier vivant](#13-dossier-vivant-dun-actif),
  avec un bouton **« Délier »** ; sinon, un sélecteur **« Lier à un nœud
  Structure Système »** + bouton **« Lier »**.

Les deux liens sont indépendants l'un de l'autre et facultatifs ; comme pour
le contenu de la section, ils deviennent non modifiables une fois la section
validée en interne.

### 7.5 Génération de brouillon par adaptation IA
Visible uniquement pour une section en statut « Brouillon », avec un gabarit
défini et un projet rattaché à un client.

> « Adapte un document de référence (structure, langage, raisonnement) au
> contexte du nouveau cas — le résultat reste au statut « proposé par IA — non
> validé » tant que chaque section du gabarit n'a pas été relue explicitement. »

Deux modes de fourniture du document de référence :
- **« Coller le texte »** : zone de texte + champ **« Nom du document de
  référence »** (placeholder `ex. IQ ligne A11 (2024)`).
- **« Uploader un fichier (.docx, .pdf) »** : extraction automatique du texte à
  l'import (compteur de caractères extraits affiché).

Champ **« Contexte du nouveau cas »** (zone de texte).

Case à cocher obligatoire (message système, personnalisé avec le titre du
document) : « Confirmez-vous disposer du droit d'utiliser « {titre} » comme base
pour cette génération (propriété intellectuelle / confidentialité, notamment
vis-à-vis d'un autre client) ? »

Bouton **« Générer le brouillon »** (désactivé sans texte de référence ou sans
la confirmation ci-dessus ; libellé « Génération en cours… » pendant l'appel).

### 7.6 Revue obligatoire d'un brouillon proposé par l'IA
Une fois un brouillon généré, la section passe automatiquement au statut
« Proposé par l'IA — non validé ». Une checklist apparaît :
« Relisez explicitement chaque section ci-dessus avant de pouvoir valider —
aucune validation globale en un clic n'est possible. » Une case à cocher
« J'ai relu et validé « {titre de la sous-section} » » doit être cochée pour
**chaque** sous-section du gabarit avant que le bouton de validation ne
s'active. Cette checklist n'est **jamais mémorisée** : recharger la page force
une relecture complète.

### 7.7 Workflow (rédacteur, relecteurs, approbateur)
Visible tant que la section n'est pas verrouillée.
- **« Identifiant approbateur final »** (texte) + bouton « Assigner ».
- **« Identifiant relecteur »** + **« Avis »** (deux champs texte) + bouton
  « Ajouter l'avis ». Compteur « Avis relecteurs : N » et liste des avis déjà
  saisis.

### 7.8 Export
- **« Exporter en JSON »**, **« Exporter en Word (.doc) »**, **« Imprimer /
  Exporter en PDF »** (déclenche l'impression navigateur), et un bouton par
  tableau dynamique du gabarit : « Exporter « {nom du tableau} » en CSV ».
- Si un blocage d'export existe (ex. section pas assez complète), un message
  s'affiche avec un bouton **« Forcer l'export malgré l'avertissement »**.
- **Gabarit d'export personnalisé** (si le projet a un client) : sélection d'un
  gabarit `.docx` déjà importé (« — Gabarit par défaut — » sinon, ou depuis la
  bibliothèque dédiée, [§27](#27-templates--formulaires)), export en `.docx`
  réel via ce gabarit, et import d'un nouveau gabarit client (nom + fichier
  `.docx`) — refusé si les balises obligatoires (bloc de signatures,
  historique des révisions) sont manquantes, avec le détail exact des balises
  manquantes affiché.

Chaque export réussi journalise automatiquement l'événement dans l'audit trail
de la section.

### 7.9 Assistant contextuel de section
Visible dès qu'un projet est rattaché à un client, quel que soit le statut de
la section. Distinct du Chat expert ([§28](#28-chat-expert--assistant-ia)) et
de la génération de brouillon ci-dessus ([§7.5](#75-génération-de-brouillon-par-adaptation-ia)) :
pose une question sur cette section précise, à laquelle l'assistant répond en
voyant son contenu actuel, avec les mêmes outils de traçabilité que le
Reasoning Engine des Missions ([§10](#10-missions-et-espace-de-travail)).

> Rappel affiché : « Pose une question sur cette section précise — l'assistant
> voit son contenu actuel et dispose des mêmes outils de traçabilité que le
> Reasoning Engine. Fournisseur actuel : {fournisseur}. Jamais une écriture
> automatique dans la section — une réponse, jamais une action. »

Champ **question** (zone de texte, placeholder `ex. Quels risques ne sont pas
encore couverts par un test pour cet actif ?`) + bouton **« Poser la
question »** (libellé « Réflexion en cours… » pendant l'appel). Chaque échange
affiche la question posée, la réponse, et le même badge de confiance que les
Missions ([§10](#10-missions-et-espace-de-travail)) : « Connu (vérifié) »,
« Inféré », « Inconnu », « Conflit », « À vérifier ». Historique local à cette
visite de l'écran — jamais rechargé depuis une visite précédente. Toute
erreur est affichée explicitement, jamais silencieuse.

---

## 8. Assistant guidé de création de livrable

**Écran** : route `/projets/:projectId/assistant-livrable` (bouton « Assistant
guidé » depuis la Fiche projet, [§6](#6-fiche-projet)).

Un livrable n'est jamais créé dans un silo : cet assistant en 9 étapes
rassemble le contexte réellement disponible pour ce client (architecture,
process, procédures, risques, méthode, précédents) avant de vous amener à la
rédaction — rien n'est jamais généré automatiquement sans revue humaine.
Un fil d'étapes numéroté (1 à 9) en haut de l'écran indique votre position, et
des boutons **« Précédent »** / **« Suivant »** permettent de circuler
librement entre les étapes déjà atteintes.

1. **Quel type de livrable ?** — Titre du livrable (obligatoire, texte,
   placeholder `ex. OQ Malaxeur M-300`) et Gabarit (obligatoire, liste
   déroulante parmi les 12 types du catalogue). Le bouton « Suivant » reste
   désactivé tant que les deux ne sont pas renseignés.
2. **Contexte du projet** — rappel en lecture seule du Contexte, de la Portée
   incluse et de la Portée exclue saisis à la création du projet.
3. **Architecture associée** — liste des nœuds Structure Système de ce
   client. S'il en existe au moins un, un sélecteur **« Nœud lié
   (facultatif) »** permet d'en choisir un — libellé exact affiché : « lien
   structurel réel, retrouvable depuis son dossier vivant ». État vide :
   « Aucun actif défini pour ce site pour l'instant. »
4. **Process associé** — liste des process du client ([§26](#26-process-procédés-du-site)),
   simple rappel informatif (pas de sélection à cette étape). État vide :
   « Aucun process défini pour ce site pour l'instant. »
5. **Procédure applicable** — s'il en existe au moins une pour ce client, un
   sélecteur **« Procédure liée (facultatif) »** (option affichée
   `[catégorie] Référence — Titre`) — libellé exact affiché : « lien
   structurel réel, retrouvable depuis la fiche procédure ». État vide :
   « Aucune procédure enregistrée pour ce site pour l'instant. »
6. **Risques pertinents** — nombre d'évaluations AMDEC enregistrées pour ce
   client et combien nécessitent une action (verdict « Action requise »,
   [§20](#20-risk-assessment--amdec)). État vide : « Aucune évaluation de
   risque enregistrée pour ce site pour l'instant. »
7. **Méthode en vigueur** — rappel de la version de méthode ACFC active
   ([§16](#16-stratégie-de-qualification-acfc)) et/ou AMDEC active
   ([§20](#20-risk-assessment--amdec)) pour ce client. État vide : « Aucune
   méthodologie configurée pour ce site pour l'instant. »
8. **Précédents pertinents** — autres sections du **même type de gabarit**
   déjà créées chez ce client, dans d'autres projets (« {titre} — projet «
   {nom du projet} » »). Chargé automatiquement en passant de l'étape 7 à
   l'étape 8. État vide : « Aucun autre livrable de ce type chez ce client
   pour l'instant. »
9. **Génération** — rappel : « La procédure et le nœud Structure Système
   sélectionnés deviennent des liens structurels réels du livrable
   (retrouvables depuis leurs propres fiches) ; le reste du contexte assemblé
   ci-dessus est tracé dans le journal d'audit du livrable. La rédaction
   elle-même reste entièrement sous contrôle humain. » Deux boutons créent
   réellement la section : **« Démarrer d'un gabarit vierge »** ou
   **« Démarrer à partir d'un document »** (vous amène directement à
   l'éditeur avec le panneau de génération de brouillon par adaptation déjà
   ouvert, [§7.5](#75-génération-de-brouillon-par-adaptation-ia)).

**Ce qui est réellement persisté** à la création : la procédure et le nœud
Structure Système sélectionnés (étapes 3 et 5) deviennent des **liens
structurels réels** de la section (`procedure_id`/`asset_node_id`), éditables
ensuite depuis l'éditeur de section
([§7.4bis](#74bis-liens-structurels-procédure-actif)) — retrouvables depuis la
fiche de la procédure ([§25](#25-procédures-structuration-de-sop)) et depuis le
dossier vivant de l'actif ([§13](#13-dossier-vivant-dun-actif)). La méthode
(ACFC/AMDEC) et les précédents consultés n'ont pas de champ structurel dédié :
ils sont uniquement journalisés en texte dans l'audit trail de la section
créée, sous la forme « contexte_assemble : {liste des éléments considérés,
séparés par des virgules} ».

---

## 9. Miroir Google Drive (sauvegarde manuelle)

**Écran** : route `/clients/:clientId/drive`.

Configure, **par client**, un dossier Google Drive dédié servant uniquement de
sauvegarde miroir manuelle de l'état GitHub.

| Champ | Type | Obligatoire |
|---|---|---|
| Identifiant du dossier Drive | texte | oui (`ex. 1a2B3c…`) |
| Jeton d'accès | mot de passe | oui |

Boutons : « Effacer », « Enregistrer », « Tester la connexion » (désactivé sans
connexion enregistrée), **« Sauvegarder maintenant »** (désactivé sans connexion
enregistrée ou pendant un miroir déjà en cours).

> **Avertissement permanent affiché** : « Le miroir Drive n'est jamais une
> source de vérité et n'est jamais fusionné : chaque sauvegarde **écrase** le
> contenu du dossier Drive avec l'état actuel de GitHub. Toute modification
> faite manuellement dans ce dossier Drive sera perdue à la prochaine
> sauvegarde. »

Le déclenchement est strictement manuel (pas d'automatisme en fin de session à
ce jour). La ligne « Dernier miroir réussi : {date} » (ou « jamais ») indique
l'état courant. Succès : « {n} fichier(s) miroité(s). »

---

## 10. Missions et espace de travail

**Écrans** : « Liste des missions » (`/clients/:clientId/missions`) et
« Mission Workspace » (`/clients/:clientId/missions/:missionId`).

Une **Mission** est un conteneur de travail contextualisé (ex. une inspection à
préparer, un changement à instruire). Elle ne remplace ni les Assessments ni les
livrables de gabarit, qui restent gérés ailleurs.

### Créer une mission
| Champ | Type | Obligatoire |
|---|---|---|
| Titre | texte | oui |
| Description | zone de texte | non |
| Site (optionnel) | liste déroulante des sites/workspaces | non |
| Actif ancré (optionnel) | liste déroulante des nœuds Structure Système | non |

Bouton **« Créer »** → redirection automatique vers l'espace de travail de la
mission créée. Statut initial toujours **« Ouverte »**.

### Dans l'espace de travail d'une mission
- **Statut de la mission** : sélecteur « Ouverte » / « En cours » / « Clôturée »,
  changement immédiat, journalisé dans l'audit trail de la mission.
- **Activités** : ajout (Titre obligatoire + Description), chaque activité a son
  propre statut (« À faire » / « En cours » / « Terminée » / « Bloquée »),
  également journalisé. Dès qu'il y a au moins deux activités, un formulaire
  **« Lier »** permet de déclarer une dépendance (« {activité} dépend de
  {activité} ») — **cette dépendance est informative uniquement**, elle ne
  bloque jamais un changement de statut.
- **Événements qualité associés** : rattachement optionnel (jamais obligatoire)
  d'un ou plusieurs événements qualité déjà créés ([§15](#15-journal-danomalies-événements-qualité)).
- **Contexte** : bouton **« Assembler le contexte »** qui génère un instantané
  (« Context Snapshot ») du contexte réel (site, actif, procédés, événements
  qualité liés), puis affiche un narratif en quatre volets : « Où », « Quoi »,
  « Comment », « Pourquoi / Impact » (chaque volet n'apparaît que s'il contient
  des faits ; message si le snapshot est vide : « Aucun élément de contexte
  résolu. »).
- **Raisonnement** : champ « Objectif du raisonnement » (obligatoire) + bouton
  **« Raisonner »** (libellé « Raisonner… » pendant l'appel) qui invoque l'IA à
  partir du dernier contexte assemblé. Si le fournisseur configuré pour ce
  client est un fournisseur cloud, l'appel bascule automatiquement vers le
  modèle local si le relais cloud est indisponible — jamais un échec silencieux,
  la réponse affiche alors qu'une bascule a eu lieu. Chaque réponse affiche un
  **badge de confiance** : « Connu (vérifié) », « Inféré », « Inconnu »,
  « Conflit », « À vérifier », plus la liste des outils éventuellement appelés.
  Toute erreur (relais injoignable, quota…) est affichée explicitement, jamais
  silencieuse.

---

## 11. Structure Système (référentiel d'actifs)

**Écran** : route `/clients/:clientId/structure-systeme`.

Référentiel hiérarchique et configurable des actifs d'un client (sites, zones,
systèmes, équipements…) — **aucune structure n'est imposée par défaut**. Un
lien **« Suivi de périodicité »** en haut de l'écran mène à la vue agrégée de
toutes les échéances de requalification de ce client
([§12](#12-suivi-de-périodicité)).

### Hiérarchie configurable
Formulaire d'ajout d'un niveau : **Clé du niveau** (`ex. site`), **Libellé**
(`ex. Site`), **Motif de numérotation** (`ex. S-{n}`, facultatif) → bouton
« Ajouter le niveau ».

### Import Excel de la hiérarchie
Sélecteur de fichier `.xlsx` — la première ligne du tableau contient les
en-têtes de niveau (dans l'ordre de la hiérarchie configurable ci-dessus), avec
une colonne « Code » optionnelle ; chaque ligne suivante décrit un chemin
depuis la racine (les valeurs répétées d'une ligne à l'autre ne créent le nœud
qu'une seule fois). Succès : « {n} nœud(s) créé(s). », avec le détail des
lignes ignorées le cas échéant (case vide au milieu de la ligne, code déjà
utilisé). Échecs possibles : fichier illisible, grille vide, colonne de niveau
inconnue, ordre des colonnes incohérent.

### Import d'un export SAP (arborescence)
Second sélecteur de fichier `.xlsx`, pour un format différent : un rapport SAP
arborescent (ex. transaction IH01/IH03) téléchargé « vers feuille de calcul ».
La profondeur de chaque nœud est détectée depuis sa position dans le fichier
(jamais imposée) — deux nœuds peuvent être imbriqués à des profondeurs
différentes selon la branche, la hiérarchie configurable ci-dessus doit donc
compter au moins autant de niveaux que la profondeur maximale réellement
présente dans le fichier (jamais un niveau fabriqué à la volée : import
refusé sinon, avec le nombre de niveaux manquants indiqué). Les nœuds créés
peuvent ensuite être réorganisés (reparentage, voir ci-dessous). Succès :
« {n} nœud(s) créé(s). », avec le détail des lignes ignorées le cas échéant
(code déjà utilisé, ancêtre attendu introuvable à ce stade du fichier, forme
de ligne inattendue). Échecs possibles : fichier illisible, grille vide,
profondeur insuffisante.

### Import d'un export SAP au format .htm/.html
Troisième sélecteur de fichier, pour le même rapport SAP téléchargé
« Enregistrer comme fichier HTML » plutôt que « vers feuille de calcul ».
Mêmes règles et mêmes messages que l'import `.xlsx` ci-dessus (profondeur
détectée depuis le fichier, jamais imposée) — seule la lecture diffère : la
profondeur est ici déterminée depuis la position de colonne réelle encodée
dans le fichier HTML lui-même, jamais depuis le rendu visuel de l'arbre
(traits `|`/`-`), qui s'est avéré ne pas toujours refléter fidèlement la
profondeur réelle (un nœud et son enfant unique peuvent partager le même
rendu visuel).

### Nœuds du référentiel
Formulaire de création : **Niveau** (obligatoire, parmi ceux définis
ci-dessus), **Nom** (obligatoire), **Code** (obligatoire, unique pour ce
client), **Nœud parent** (optionnel, « — racine — » sinon) → bouton « Créer le
nœud ». Erreurs possibles : « Ce code est déjà utilisé par un autre nœud de ce
client. » ou « Ce rattachement créerait un cycle — refusé. »

Chaque nœud listé affiche nom, code, niveau, parent, un lien **« Dossier
vivant »** ([§13](#13-dossier-vivant-dun-actif)) et — si son échéance de
requalification est dépassée — un badge d'alerte « ⚠ échéance de requalification
dépassée » (purement visuel, recalculé à l'affichage — le même calcul, sur
l'ensemble des nœuds d'un coup, alimente l'écran Suivi de périodicité,
[§12](#12-suivi-de-périodicité)).

**Reparenter** : sélection d'un nouveau parent + bouton « Reparenter » (mêmes
refus possibles pour cycle).

**Qualification d'un nœud** (édition manuelle uniquement, jamais automatique) :
- **Statut de qualification** : Non qualifié · En cours de qualification
  initiale · Qualifié · Qualifié — écart ouvert · Requalification requise ·
  Requalification en retard · Suspendu · Déclassé.
- **Requalification périodique** (case à cocher) → si cochée, un champ
  **Échéance** (date) apparaît.
- Bouton « Enregistrer » par nœud.

### Relations techniques
Déclare une relation typée et dirigée entre deux nœuds (ex. « le PLC-01 contrôle
l'Isolateur-02 ») pour tracer une chaîne technique complète.

| Champ | Options |
|---|---|
| Nœud source | tous les nœuds |
| Type de relation | « est contrôlé par », « est connecté à », « est hébergé sur » |
| Nœud cible | tous les nœuds |

Bouton « Créer la relation ». Erreurs : « L'un des deux nœuds sélectionnés est
introuvable. » ou « Les deux nœuds doivent appartenir au même client. »
(contrairement à la hiérarchie, **les cycles sont acceptés** ici).

Un sélecteur **« Tracer la chaîne technique depuis »** un nœud donné affiche la
séquence complète de relations sortantes.

---

## 12. Suivi de périodicité

**Écran** : route `/clients/:clientId/suivi-periodicite` (lien « Suivi de
périodicité » depuis Structure Système, [§11](#11-structure-système-référentiel-dactifs),
et depuis la barre latérale une fois un client actif).

Tableau agrégé, **tous nœuds confondus** de ce client, des actifs soumis à
requalification périodique — comble le manque laissé par le seul badge par
ligne de Structure Système, noyé dans la liste complète de tous les nœuds
(qualifiés ou non, périodiques ou non). Écran de **lecture seule** : l'édition
du statut ou de l'échéance reste sur Structure Système, jamais de transition
automatique fabriquée par l'outil.

Rappel affiché : « Actifs soumis à requalification périodique pour ce client,
triés par urgence. Écran de lecture seule — modifiez le statut ou l'échéance
depuis Structure Système. »

Quatre compteurs en tête d'écran : **en retard**, **à échéance proche** (≤ 90
jours), **sans échéance renseignée**, **à jour**. La liste elle-même trie les
nœuds soumis à périodicité dans cet ordre de priorité (en retard d'abord,
puis échéance la plus proche), avec pour chacun :
- son nom et son code,
- un badge de statut (« En retard », « Échéance proche », « Échéance non
  renseignée » ou « À jour »),
- le détail de l'échéance : « {date} — en retard de {n} jour(s) » ou
  « {date} — dans {n} jour(s) », ou « Échéance non renseignée »,
- un lien **« Dossier vivant »** vers la fiche complète de l'actif
  ([§13](#13-dossier-vivant-dun-actif)).

Les nœuds pour lesquels la requalification périodique n'est pas applicable
n'apparaissent jamais dans cette liste. État vide : « Aucun actif n'est soumis
à requalification périodique pour ce client pour l'instant — activez «
Requalification périodique » sur un nœud depuis Structure Système. »

---

## 13. Dossier vivant d'un actif

**Écran** : route `/clients/:clientId/structure-systeme/:noeudId/dossier-vivant`
(lien « Dossier vivant » depuis chaque nœud de Structure Système ou depuis le
Suivi de périodicité).

Écran **100 % consultatif** (aucun formulaire) : agrège tout ce qui est déjà
explicitement rattaché à cet actif — jamais de donnée fabriquée.

> Bandeau permanent : « Agrégation en lecture seule des données déjà rattachées
> à cet actif — aucune donnée fabriquée, uniquement ce qui a été explicitement
> lié. »

Sections affichées : Identité (code, niveau, statut de qualification, échéance),
Chaîne technique, Évaluations rattachées (ACFC, Impact Assessment, Computer
System Assessment, Risk Assessment/AMDEC), Missions ancrées sur cet actif,
Journal d'anomalies rattachées, et **Livrables liés** — les sections de projet
explicitement liées à ce nœud (`asset_node_id`), posées depuis l'assistant
guidé ([§8](#8-assistant-guidé-de-création-de-livrable)) ou depuis l'éditeur de
section ([§7.4bis](#74bis-liens-structurels-procédure-actif)), chacune avec un
lien direct vers son éditeur. État vide de ce dernier bloc : « Aucun livrable
explicitement lié à cet actif pour l'instant — le lien se pose depuis
l'assistant guidé de création ou depuis l'éditeur de la section. »

Un dernier bloc, **« Périmètre non couvert par cet écran »**, précise : «
Seules les sections de projet (DQ/FAT/SAT/IQ/OQ/PQ…) explicitement liées à ce
nœud (assistant guidé ou éditeur de section) apparaissent ci-dessus — aucun
lien n'est déduit automatiquement (ex. via la chaîne technique ou le procédé
associé). »

---

## 14. Connecteurs QMS

**Écran** : route `/clients/:clientId/connecteurs-qms`.

> Avertissement permanent : « Configuration uniquement. Les adaptateurs Veeva
> Vault, SharePoint, dossier réseau et EDMS générique ne sont pas encore
> implémentés — aucun test de connexion réel n'est possible depuis cet écran
> pour ces types. »

Formulaire : **Nom du connecteur** (obligatoire, `ex. Veeva Vault site
Rennes`), **Type** (obligatoire, parmi : GitHub, Google Drive, Veeva Vault,
SharePoint, Dossier réseau, EDMS générique), puis des champs propres à chaque
type (owner/repo/branche/jeton pour GitHub ; identifiant de dossier/jeton pour
Drive ; DNS/utilisateur/mot de passe pour Veeva Vault ; URL de site/jeton pour
SharePoint ; chemin pour dossier réseau ; URL/jeton pour EDMS générique). Le
bouton **« Créer le connecteur »** reste désactivé tant que les champs
obligatoires du type choisi ne sont pas remplis. Si un type non implémenté est
choisi, un rappel apparaît : « Type reconnu et modélisé — adaptateur non
implémenté (configuration consignée, aucune connexion réelle possible pour
l'instant). »

Chaque connecteur listé porte un badge « actif »/« inactif » et deux boutons :
**« Activer »/« Désactiver »** et **« Supprimer »**. État vide : « Aucun
connecteur configuré pour l'instant. »

---

## 15. Journal d'anomalies (événements qualité)

**Écran** : route `/clients/:clientId/anomalies`.

> Avertissement permanent : « Change Control, Déviation, CAPA, Investigation,
> Constat d'audit, Revue périodique. Un événement externe référencé n'est
> jamais un verrou sur un autre module. »

Formulaire de création :

| Champ | Type | Obligatoire | Options |
|---|---|---|---|
| Type | liste | oui | Change Control, Déviation / anomalie, CAPA, Investigation, Constat d'audit, Revue périodique |
| Titre | texte | oui | — |
| Description | zone de texte | non | — |
| Origine | liste | non (défaut Interne) | Interne, Externe, Mixte |
| Nœud Structure Système (optionnel) | liste | non | — aucun — + nœuds |
| Référence externe — système (optionnel) | texte | non | `ex. QMS client` |
| Référence externe — identifiant (si un système est saisi) | texte | non | — |

Filtres disponibles : par type, par statut (« — tous — », Ouvert, En cours,
Clôturé). Chaque événement listé affiche son type, un badge de statut coloré,
son origine, l'actif lié éventuel, sa référence externe éventuelle, et peut être
**référencé** vers un autre événement (menu « — référencer depuis — » + bouton
« Référencer ») — par exemple pour relier une Déviation à une Investigation puis
à une CAPA. Ces références ne forment jamais un enchaînement obligatoire : une
déviation mineure peut être close sans investigation ni CAPA ; n'importe quel
événement peut en référencer un autre existant, sans contrainte de type.

---

## 16. Stratégie de qualification (ACFC)

**Écran** : route `/clients/:clientId/strategie-qualification`.

Détermine, via une méthode ACFC (approche basée sur la criticité fonctionnelle)
**propre à chaque client**, si un composant/fonction est « critique » ou « non
critique », puis en déduit une conclusion de stratégie de qualification. Bandeau
permanent : « Aide à la décision, non une décision de qualification. »
L'accès direct depuis une section « Change Control » en cours de rédaction
reste hors périmètre (ce type de gabarit n'existe pas encore dans le
catalogue).

### Configurer la méthode
Aucune question n'est proposée par défaut tant qu'aucune méthode n'est
configurée pour le client : « Aucune méthode ACFC n'est configurée pour ce
client. Aucune question n'est proposée par défaut — saisissez les questions
réelles de la procédure du client, mot pour mot. »

| Champ | Type | Obligatoire |
|---|---|---|
| Source (`ex. "Procédure interne QD-00098219"`) | texte | oui |
| Origine | liste (Procédure client / Défini avec l'utilisateur / Baseline ValidaPharm) | — |
| Questions (une par ligne, mot pour mot) | lignes de texte, import `.txt` possible (une question par ligne) | au moins une |

Chaque ligne de question a son propre bouton **« Retirer »** (désactivé s'il
n'en reste qu'une) ; bouton **« + Ajouter une question »**. Bouton
« Enregistrer cette version » (le versionnage préserve l'historique — une
nouvelle version n'écrase jamais la précédente ; « Annuler » referme le
formulaire sans enregistrer si un profil existe déjà).

### Évaluer un composant/fonction
**« Composant/fonction évalué »** (obligatoire, `ex. Vanne de régulation
V-101`) + **« Nœud Structure Système »** (optionnel), puis une réponse
**oui / non / inconnu / sans objet** pour chaque question de la méthode
active. Dès que toutes les questions ont une réponse, un verdict s'affiche
automatiquement : **« Verdict ACFC : Critique »** ou **« Verdict ACFC : Non
critique »** (règle fixe : au moins un « oui » → critique). Bouton
« Enregistrer cette évaluation » ; confirmation : « Évaluation enregistrée. »

### Évaluation de la complexité et conclusion
Une fois un verdict obtenu : choix radio **« Catalogue — système sans
adaptation particulière du fournisseur »** ou **« Spécifique — système fait à
façon ou hautement configuré »**. La conclusion finale se calcule
automatiquement à partir du croisement verdict × complexité (non critique +
catalogue → Revue documentaire ; non critique + spécifique → FAT ; critique +
catalogue → IQ+OQ ; critique + spécifique → IQ+OQ+PQ ; complexité manquante →
toujours « Autre — à définir par l'expert », jamais une extrapolation), avec la
version de la grille de décision utilisée affichée à titre de traçabilité.

---

## 17. Impact Assessment

**Écran** : route `/clients/:clientId/impact-assessment`.

Détermine si un système relève d'un **« Direct Impact »** (impact direct sur la
qualité produit/patient), en amont de l'ACFC. Bandeau permanent : « Aide à la
décision, non une décision de classification. »

Même logique que la Stratégie de qualification : **aucune question par défaut**,
méthode configurable par client (Source, Origine, Questions mot pour mot,
versionnée, import `.txt` possible), puis évaluation d'un « Système évalué »
(texte, `ex. Isolateur de remplissage STICK002`) avec un nœud Structure
Système optionnel, et réponses **oui / non / inconnu / sans objet** à chaque
question. Verdict strictement binaire dès que le questionnaire est complet :
**« Direct Impact »** (au moins un « oui ») ou **« Not Direct Impact »**.
Confirmation à l'enregistrement : « Évaluation enregistrée. »

---

## 18. Computer System Assessment (GAMP5)

**Écran** : route `/clients/:clientId/csv-assessment`.

Évalue un système informatisé selon la grille **GAMP5, fixe et non
configurable** (contrairement à l'ACFC/Impact Assessment). Bandeau permanent :
« Aide à la décision, non une décision de classification. »

| Champ | Type | Obligatoire |
|---|---|---|
| Système évalué | texte (`ex. SCADA ligne STICK002`) | oui |
| Nœud Structure Système (optionnel) | liste | non |
| Catégorie GAMP5 | 5 boutons radio : Catégorie 1 — Infrastructure · Catégorie 2 — Firmware · Catégorie 3 — Logiciel standard non configuré · Catégorie 4 — Logiciel configurable · Catégorie 5 — Sur mesure | oui |
| Justification de la catégorie | zone de texte | oui |
| Pertinence GxP | oui/non | oui |
| Pertinence ERES / 21 CFR Part 11 | oui/non | oui |
| Justification de la pertinence GxP/ERES | zone de texte | oui |

Bouton « Enregistrer cette évaluation » désactivé tant que tous ces champs ne
sont pas remplis.

---

## 19. Paramètres critiques (CPP/CQA)

**Écran** : route `/clients/:clientId/parametres-critiques`.

> Rappel permanent : « Un CPP ou un CQA n'est jamais promu automatiquement à
> partir d'une classification de criticité — toujours une déclaration humaine
> explicite et séparée (ICH Q8/Q9/Q10). »

Quatre blocs indépendants :

1. **Paramètres** : Nom (obligatoire, `ex. Température`), Description, Unité
   (`ex. °C`), Nœud Structure Système optionnel.
2. **Classification de criticité** (« indicatif, ne crée ni CPP ni CQA ») :
   Paramètre (obligatoire) + Niveau (obligatoire — Important / Critique) +
   Contexte optionnel + Justification (obligatoire).
3. **CPP** (Critical Process Parameter) : Paramètre (obligatoire) + Contexte
   (obligatoire, `ex. Recette lot A`) + Justification (obligatoire).
   Désactivation possible avec un motif texte obligatoire (non vide).
4. **CQA** (Critical Quality Attribute) : Nom (obligatoire, `ex. Stérilité`) +
   Description + Contexte (obligatoire) + Justification (obligatoire) — un
   CQA n'a **pas besoin** d'être rattaché à un Paramètre existant.
   Désactivation avec motif obligatoire (non vide).

États vides propres à chaque bloc : « Aucun paramètre pour l'instant. »,
« Aucune classification pour l'instant. », « Aucun CPP actif pour l'instant. »,
« Aucun CQA actif pour l'instant. »

---

## 20. Risk Assessment / AMDEC

**Écran** : route `/clients/:clientId/risk-assessment`.

> Rappel permanent : « L'IPR est calculé mais jamais autoritatif à lui seul — le
> verdict reste une aide à la décision, cohérent avec la méthodologie AMDEC du
> client (ICH Q9). »

### Configurer le profil de méthode
| Champ | Type | Obligatoire | Défaut |
|---|---|---|---|
| Source | texte (`ex. Processus_AMDEC.xlsx`) | oui | — |
| Origine | liste | — | Défini avec l'utilisateur |
| Échelle minimale | nombre | oui | 1 |
| Échelle maximale | nombre | oui | 5 |
| Seuil d'action (IPR) | nombre | oui | 50 |

### Créer une ligne AMDEC
Étape du processus (obligatoire), Mode de défaillance (obligatoire), Effet de la
défaillance, Cause potentielle, Contrôle actuel, Nœud Structure Système
optionnel, Paramètre optionnel ([§19](#19-paramètres-critiques-cppcqa)), puis
Sévérité/Occurrence/Détectabilité **initiales** (nombres, facultatifs). L'IPR
initial (S×O×D) et un verdict (« Acceptable » / « Action requise ») sont
calculés automatiquement.

### Action résiduelle
Tant que l'IPR résiduel n'est pas renseigné, chaque ligne propose un
mini-formulaire : Recommandation, Responsable, S/O/D résiduelles. Une fois
enregistré, l'IPR résiduel et son verdict s'affichent en remplacement du
formulaire (cycle « évaluation initiale → action → évaluation résiduelle »,
sans re-saisie possible ensuite depuis cet écran).

---

## 21. Exigences et tests

**Écran** : route `/clients/:clientId/tests`.

> Rappel permanent : « Chaîne de définition Requirement → Objectif de test →
> Candidat → Test, avec couverture explicite — jamais déduite
> automatiquement. »

Chaîne en cinq étapes, chacune avec son propre formulaire :

1. **Exigences** : Référence (obligatoire, `ex. URS-001`), Titre (obligatoire),
   Description, Nœud Structure Système optionnel.
2. **Objectifs de test** : rattachés à une exigence, Titre obligatoire.
3. **Candidats de test** : rattachés à un objectif, Titre obligatoire. Statuts
   possibles : Proposé, Besoin d'information, Besoin de revue, Accepté, Rejeté,
   Doublon, Remplacé. Actions « Accepter », « Rejeter » (motif obligatoire),
   « Besoin d'information » (motif obligatoire).
4. **Tests** : créé uniquement à partir d'un candidat déjà **« Accepté »**
   (sinon message « Ce candidat doit être accepté avant de pouvoir créer un
   test. »). Titre obligatoire + au moins une étape (Action + Résultat
   attendu, ligne « Étapes » avec bouton **« Retirer »** par étape et **«
   + Ajouter une étape »**). Bouton « Approuver » pour passer de « Brouillon »
   à « Approuvé ».
5. **Couverture** : déclaration explicite qu'un test **approuvé** couvre une
   exigence donnée — jamais automatique.

---

## 22. Exécution de tests

**Écran** : route `/clients/:clientId/executions`.

> Rappel permanent : « Le verdict n'est jamais déduit des résultats d'étape —
> toujours une décision explicite à la clôture. Immutable après clôture. »

- **Démarrer une exécution** : choix d'un test **approuvé** (obligatoire, sinon
  « Ce test doit être approuvé avant de pouvoir être exécuté. » ou « Test
  introuvable. »), Nœud optionnel → bouton « Démarrer l'exécution ». Une fois
  démarrée : « Démarrée le {date}, exécutant {identité} ».
- **Par étape** : résultat (Conforme / Non conforme / Non applicable) +
  observation → « Enregistrer le résultat ». **Une fois enregistré, un résultat
  d'étape n'est plus modifiable** (traçabilité ALCOA+). Des mesures numériques
  (libellé, valeur, unité) peuvent ensuite y être ajoutées via « + Mesure ».
- **Événements** pendant l'exécution : Commentaire, Action, Retest, Déviation,
  Changement, Arrêt, Externe → description + « Consigner ».
- **Preuves** : Native (observation directe, fait foi sans fichier) ou Document
  (avec référence GitHub chemin/commit, champ affiché seulement dans ce cas) →
  Titre + Description + « Enregistrer la preuve ».
- **Clôture** : choix du verdict — **Conforme / Non conforme / Conforme avec
  écart** — bouton « Clôturer l'exécution ». Après clôture, plus aucun
  résultat/mesure ne peut être ajouté (« Ce test est déjà clôturé »). Une fois
  terminée, une exécution affiche : « {titre} — verdict : {verdict}
  (clôturée le {date}) ».

---

## 23. Ingestion documentaire (Source Intelligence)

**Écran** : route `/clients/:clientId/ingestion-documentaire`.

> Rappel permanent : « Un `KnowledgeItem` naît toujours `à valider` — jamais
> validé automatiquement. Aucun appel IA réel : la valeur interprétée est
> toujours saisie par l'utilisateur. »

Chaîne complète, en sept blocs séquentiels — chaque niveau dépend strictement
du précédent (`Source → SourceVersion → Extraction → ExtractionItem →
KnowledgeItem`, jamais de raccourci) :

1. **Sources** : Type (Document/Image), Titre (obligatoire, `ex. Manuel
   AC-104`). Bouton par source : « + Nouvelle version ».
2. **Localisation de source** : Source (obligatoire), Système (GitHub/Drive/
   Externe), Référence (obligatoire).
3. **Extractions** : Version de source (obligatoire), Méthode (Saisie manuelle
   / OCR Azure / Word natif / PDF natif — les deux dernières lisent le fichier
   localement, sans appel réseau).
4. **Éléments extraits** (« Ajouter l'élément (immutable) ») : Extraction
   (obligatoire), Contenu (obligatoire), Position (numéro auto-incrémenté).
5. **Éléments de connaissance** : Élément extrait (obligatoire), Libellé
   (obligatoire), Valeur interprétée (saisie manuelle, jamais générée
   automatiquement) — bouton **« Créer (à valider) »**, naît toujours au
   statut « À valider », puis boutons **« Valider »** / **« Rejeter »**
   (disparaissent une fois le statut changé).
6. **Relations** entre éléments de connaissance (Depuis / Vers / Type de
   relation libre, `ex. précise`) — bouton « Déclarer la relation », jamais
   créées automatiquement.
7. **Conflits** entre éléments de connaissance (Depuis / Vers / Description) —
   bouton « Déclarer le conflit », résolution ultérieure via un champ
   « Résolution » obligatoire + bouton « Résoudre ». Seuls les conflits ouverts
   restent affichés (« Aucun conflit ouvert. » sinon), jamais auto-résolus.

---

## 24. Plans de livrable (Content Plan)

**Écran** : route `/clients/:clientId/plans-livrable`.

> Rappel permanent : « `readiness` est recalculé à la demande, jamais en tâche
> de fond. Un plan ne peut être gelé que s'il est déjà validé ET que ses
> données sont prêtes — jamais l'un sans l'autre. »

Formulaire de création : **Gabarit** (obligatoire, un des 12 types du
catalogue), Nœud Structure Système optionnel, Procédé optionnel, Type de profil
de méthode optionnel (ACFC ou Impact Assessment) + sa référence, **Note de
contexte** (figée définitivement dès la création — non modifiable ensuite,
même si le profil de méthode référencé évolue).

Chaque plan affiche son statut (Brouillon → Validé → Gelé) et son readiness
(« Prêt » / « Besoin d'information » / « Besoin de revue » / « Bloqué »),
recalculé uniquement sur clic « Recalculer readiness ». Boutons « Valider »
(depuis Brouillon) puis « Geler » (depuis Validé, refusé tant que le readiness
n'est pas « Prêt » — message « Les données ne sont pas encore prêtes »).
Autres messages d'erreur possibles : « Plan introuvable. », « Ce plan est déjà
gelé. »

---

## 25. Procédures (structuration de SOP)

**Écran** : route `/clients/:clientId/procedures`.

> Texte d'introduction : « Collez le texte d'une SOP ou importez un fichier
> `.docx`/`.pdf` — une structure est proposée automatiquement (déterministe
> d'abord, IA seulement si aucune section ni étape n'est trouvée), à revoir et
> confirmer avant toute création réelle. »

1. Coller le texte ou importer un fichier `.docx`/`.pdf` (extraction
   automatique).
2. Bouton **« Générer la proposition »** : un parseur déterministe tente
   d'abord d'extraire sections et étapes ; l'IA n'intervient qu'en repli, si
   rien n'a été trouvé (badge « Parseur déterministe » ou « Repli IA »).
3. Chaque étape proposée est éditable : case « Retenir » (cochée par défaut),
   description modifiable, case « Obligatoire », Condition et Responsable
   facultatifs, badge de confiance IA le cas échéant.
4. Métadonnées obligatoires avant confirmation : **Référence**, **Titre**,
   **Date d'effet**, et **Catégorie** — **CQV (Qualification/Validation)**,
   **CSV (Systèmes informatisés)** ou **Production** (défaut Production) : ces
   trois familles ont un périmètre et un cycle d'approbation distincts,
   jamais mélangées visuellement dans la liste ci-dessous.
5. **« Confirmer et créer la procédure »** (seules les étapes cochées
   « Retenir » sont conservées) ou **« Annuler »**.

Aucune proposition n'est jamais écrite en base sans cette confirmation
explicite. La liste des procédures déjà créées pour le client s'affiche en bas
d'écran, **groupée par catégorie** (avec le nombre de procédures par groupe),
chacune avec sa référence, sa version et ses étapes. Si des livrables ont été
explicitement liés à une procédure (assistant guidé, [§8](#8-assistant-guidé-de-création-de-livrable),
ou éditeur de section, [§7.4bis](#74bis-liens-structurels-procédure-actif)),
un bloc **« Livrables liés »** apparaît sous la procédure concernée, avec un
lien direct vers l'éditeur de chaque section.

---

## 26. Process (procédés du site)

**Écran** : route `/clients/:clientId/process`.

> Rappels affichés : « Un site peut définir autant de process que nécessaire.
> Une fonction peut être utilisée dans plusieurs process, et un même
> équipement peut porter plusieurs fonctions — jamais une relation 1:1
> imposée. » et « Import de document optionnel — le texte est extrait tel
> quel (jamais par IA) pour relecture et édition avant création ; rien n'est
> jamais créé automatiquement. »

### Section « Process »
- Import optionnel d'un document `.pdf`/`.docx` (label devient « Extraction en
  cours… » pendant l'extraction) : le texte extrait alimente uniquement le
  champ Description, à relire et éditer — jamais un Process créé
  automatiquement depuis le texte extrait. Message après import : « Texte
  extrait de « {fichier} » — relisez et éditez avant de créer le process. »
  Le document importé est conservé comme Source ([§23](#23-ingestion-documentaire-source-intelligence))
  dès l'extraction, même si le formulaire n'est finalement jamais soumis.
- Formulaire : Nom (obligatoire, `ex. Compression`), Description, Type (liste :
  Fabrication, Conditionnement, Utilités / installations, Digital, CSV, Flux
  documentaire, Métier / affaires, EHS, Logistique, Support, Autre) → bouton
  « Créer le process ».
- Chaque process listé affiche son nom, son type, et « — importé de « {source}
  » » le cas échéant. État vide : « Aucun process pour l'instant. »

### Section « Fonctions »
> Rappel : « Ce qui doit être réalisé/protégé/fourni (production, mesure,
> contrôle, alarme, interlock…) — indépendant de l'implémentation
> physique/digitale, portée séparément par l'Architecture. »

- Formulaire : Nom (obligatoire, `ex. Régulation de température`), Description
  → bouton « Créer la fonction ».
- Chaque fonction listée affiche ses rattachements existants (« — process :
  … », « — actifs : … »). État vide : « Aucune fonction pour l'instant. »

### Rattacher une fonction (si au moins une fonction existe)
Deux sélecteurs indépendants — **Fonction** puis **à un process** (bouton
« Rattacher au process ») et **Fonction** puis **à un actif (Structure
Système)** (bouton « Rattacher à l'actif ») — chacun désactivé tant que sa
cible n'est pas choisie. Une fonction peut être rattachée à plusieurs process
et à plusieurs actifs (relations N:M, jamais 1:1).

---

## 27. Templates & Formulaires

**Écran** : route `/clients/:clientId/templates`.

Bibliothèque autonome et consultable des gabarits `.docx` du client — le même
mécanisme (import vérifié par balises obligatoires, suppression) que le
panneau d'export de l'éditeur de section ([§7.8](#78-export)), avec un point
d'entrée dédié pour parcourir/gérer la bibliothèque indépendamment d'une
section précise.

> Rappel affiché : « Modèles officiels, formulaires, ou anciens protocoles
> réutilisables comme structure — un livrable créé depuis une section peut
> être généré directement dans l'un de ces gabarits. Import `.docx`
> uniquement, vérifié pour les balises obligatoires (bloc de signatures,
> historique des révisions) avant acceptation. »

- Champ texte (nom du gabarit, `ex. QD-0007 Protocole OQ`, sans lequel
  l'import est refusé : « Donnez un nom au gabarit avant de l'importer. »).
- Sélecteur de fichier **« Choisir un fichier (.docx) »**.
- Refus si des balises obligatoires manquent : « Gabarit refusé — balises
  obligatoires manquantes : {liste}. » Les trois balises exigées, exactes :
  `redacteurs`, `approbateur_final`, `historique_revisions`.
- Chaque gabarit importé listé avec un bouton **« Supprimer »** (sans
  confirmation). État vide : « Aucun template importé pour l'instant —
  importez-en un ci-dessus, ou utilisez le gabarit par défaut de chaque type
  de livrable depuis l'éditeur de section. »

Isolation stricte par client — jamais de mélange de gabarits entre deux
clients.

---

## 28. Chat expert / Assistant IA

**Écran** : route `/clients/:clientId/chat`.

Disclaimer permanent : « Aide, pas avis opposable. »

- **Mode** : « Chat normatif » ou « Audit simulé ». En mode Audit simulé, un
  second bandeau non masquable rappelle : « Débat contradictoire multi-angles
  et, si des profils sont sélectionnés, simulation de persona(s) d'auditeur.
  Cette simulation ne constitue en aucun cas un audit réglementaire réel ni un
  avis opposable. » — personas disponibles (facultatifs, plusieurs choix
  possibles) : Swissmedic, FDA, Cabinet de conseil GxP, QA spécialisée. C'est
  toujours la question **brute** qui s'affiche dans l'historique — jamais le
  prompt réellement enrichi envoyé au fournisseur en mode audit simulé.
- **Question** (obligatoire) + **« Joindre ce document à la question »**
  (menu déroulant listant les sections disponibles de ce client, action
  toujours explicite, jamais automatique). Joindre un document ouvre une
  confirmation : « Le contenu de « {titre} » sera transmis à {fournisseur}.
  Continuer ? » (boutons « Annuler » / « Continuer »).
- La session se ferme automatiquement après 5 minutes d'inactivité (consignée
  au journal, jamais le contenu échangé) ; un bouton « Rouvrir une session »
  permet de continuer.
- Un bandeau d'alerte apparaît si le fournisseur IA a changé de version depuis
  sa dernière qualification de fiabilité (« re-qualification recommandée avant
  usage réel »).

---

## 29. Bibliothèque de normes

**Écran** : route `/normes` (global à l'installation, pas par client).

### Documents normatifs importés
> Rappel : « Normes/guidelines/méthodes propres à votre organisation, importées
> ici et consultables par l'assistant contextuel de section. »

Contrairement au bloc précédent, cette bibliothèque est réellement
alimentable, par trois voies, chacune avec sa **Catégorie** (Norme / Guideline
/ Méthode / Autre) :
- **Téléversement direct** : fichier `.docx`, `.pdf`, `.txt` ou `.md`.
- **Depuis le dépôt GitHub dédié** (celui configuré en [§1.1](#11-dépôt-github-dédié)) :
  Préfixe de chemin (`ex. normes/`) + bouton « Lister » (seuls les fichiers
  `.md`/`.txt` sont importables par cette voie — un fichier binaire lu ainsi
  serait corrompu), puis bouton « Importer » par résultat.
- **Depuis Google Drive** (configuration dédiée à cette bibliothèque,
  distincte du miroir Drive par client, [§9](#9-miroir-google-drive-sauvegarde-manuelle)) :
  Identifiant du dossier Drive + Jeton d'accès → « Enregistrer » / « Tester la
  connexion » (« Connexion réussie — {n} fichier(s) trouvé(s). » ou « Échec de
  connexion : {message} »), puis « Lister les fichiers » et « Importer » par
  résultat. Cette connexion Drive est elle aussi globale à l'installation et
  enregistrée côté serveur (même mécanisme que le dépôt GitHub/Relais IA,
  [§1](#1-premier-lancement--connexion-au-dépôt-github-au-relais-ia-et-au-worker-dauthentification))
  — réservé à un admin, disponible ensuite sur tout appareil/navigateur.

Section « Documents importés » : filtre par catégorie (« Toutes » ou une des
quatre), liste avec source et bouton **« Supprimer »** par document. État vide :
« Aucun document importé. » Cette bibliothèque est globale à l'installation
(jamais scopée par client, contrairement aux Documents d'un projet,
[§6](#6-fiche-projet)) — une norme s'applique indépendamment du client.

---

## 30. Configuration IA par client

**Écran** : route `/clients/:clientId/ia`.

- **Fournisseur** : Claude, OpenAI, Copilot, DeepSeek (cloud) ou « Modèle local
  (Ollama) », choix radio → « Changer de fournisseur ». Changer de fournisseur
  réinitialise l'accusé de conditions et la qualification déjà enregistrés (ils
  sont propres à l'ancien fournisseur).
- **Conditions de traitement des données** (fournisseurs cloud uniquement) :
  bouton d'acquittement explicite : « J'ai vérifié et j'accepte les conditions
  de traitement des données de « {fournisseur} » ». Une fois acquittées :
  « Conditions acquittées pour « {fournisseur} » le {date/heure}. »
- **Qualification de fiabilité** (fournisseurs cloud uniquement, **une par
  mode d'usage** — chat normatif et audit simulé ne partagent jamais la même
  qualification) : Date, Résultat (`ex. favorable`), Identifiant de
  l'échantillon (`ex. echantillon-pharma-fr-v1`), Version de l'échantillon
  (`ex. 1.0.0`) — tous obligatoires — Version de moteur qualifiée (facultative,
  `ex. claude-sonnet-5`). Tant qu'aucune qualification n'existe pour le mode
  choisi, un message bloque visuellement l'activation en usage réel : « Ce
  fournisseur ne peut être activé pour un usage réel : la qualification de
  fiabilité (échantillon versionné) est requise au préalable. » Une fois
  qualifié : « Qualifié le {date} — résultat : {résultat} (version moteur
  {version}). »
- Pour le modèle local : aucune de ces deux étapes n'est requise (aucune donnée
  ne quitte le poste) — message affiché : « Le modèle local ne transmet aucune
  donnée à un tiers : ni accusé de conditions de traitement, ni qualification
  de fiabilité cloud ne s'appliquent. »

---

## 31. Recherche globale

**Écran** : route `/recherche` (champ « Rechercher… » toujours visible en haut
de la barre latérale, [§0](#0-comprendre-loutil-avant-de-commencer)).

Avec 25+ écrans par client, retrouver une section, un document, une procédure,
un process ou un élément de connaissance déjà créés exigeait auparavant de
deviner le bon écran. Recherche par sous-chaîne (jamais floue, jamais
approximative), **scopée au client actif** pour tout le contenu (sections,
documents, procédures, process, connaissances — même isolation stricte que
partout ailleurs dans l'outil), **globale** seulement pour retrouver un
client.

Champ **« Rechercher un livrable, un document, une procédure… »** — recherche
réactive dès la frappe (léger délai de 200 ms). Si un client est actif, le
sous-titre rappelle : « Sections, documents, procédures, process et
connaissances du site « {nom du client} » — plus vos clients, pour changer de
site. » Sans client actif : « Aucun site actif — seuls vos clients sont
cherchables ici. Ouvrez la fiche d'un client pour rechercher aussi dans son
contenu. »

Les résultats sont groupés par type (Sections, Documents, Procédures, Process,
Connaissances, puis Clients), chacun avec son icône et son compteur ; cliquer
sur un résultat mène directement à l'écran correspondant. États : « Commencez
à taper pour rechercher. » (champ vide), « Aucun résultat pour « {requête} ».
» (aucune correspondance), sinon « {n} résultat(s) » en tête de liste.

---

## 32. Paramètres d'affichage

**Écran** : « Paramètres » — route `/parametres`.

Rappel affiché : « Préférences d'affichage de cet appareil — jamais une
donnée de projet. »

Deux réglages, chacun appliqué immédiatement au choix d'une option (pas de
bouton « Enregistrer ») :
- **Thème** : Système (suit votre appareil) / Clair / Sombre.
- **Police** : Système (sans empattement) / Serif.

Note en bas de page : « La langue de l'interface (actuellement français
uniquement) et une densité d'affichage réglable ne sont pas encore
disponibles ici — à la différence de la langue d'un livrable (réglable projet
par projet), aucun mécanisme de traduction de l'interface n'existe encore
dans l'outil. »

---

## 33. Résolution de conflit de synchronisation

**Écran** : route `/resolution-conflit` (atteint via le lien « Résoudre le
conflit » affiché après une synchronisation en conflit, [§5](#5-tableau-de-bord-et-projets)).

Pour chaque enregistrement modifié à la fois localement et sur GitHub depuis la
dernière synchronisation, et pour chaque champ qui diverge réellement, trois
choix radio :
1. **« Garder local — {valeur locale} »**
2. **« Garder distant — {valeur distante} »** (présélectionné par défaut)
3. **« Fusionner manuellement »** + champ de saisie libre

Le bouton **« Confirmer la résolution et synchroniser »** reste désactivé tant
qu'une décision n'a pas été prise pour **chaque** champ divergent (y compris une
valeur non vide pour tout choix « Fusionner manuellement »). Si la branche
distante change de nouveau pendant la résolution, un message invite à relancer :
« La branche distante a de nouveau changé pendant la résolution — relancez la
résolution. » Aucune écriture n'est jamais silencieuse. Succès : « Résolution
appliquée et synchronisée ({n} fichier(s)). », puis retour automatique au
Tableau de bord. État initial (avant tout conflit détecté) : « Aucun conflit de
contenu détecté entre l'état local et l'état distant. »

---

## 34. Écran de blocage d'incompatibilité

Cet écran n'est **pas** une route accessible normalement : il remplace
**l'application entière** au démarrage si vos données locales ont été créées ou
migrées par une version plus récente de ValidaPharm que celle actuellement
utilisée. Aucune action n'est possible depuis cet écran ; le message affiché
est : « Cette version de ValidaPharm ne peut pas ouvrir ces données — elles ont
été créées ou migrées avec une version plus récente. Mettez à jour l'application
avant de continuer, ou revenez à la version {x} pour les rouvrir. » La seule
solution est de mettre à jour l'application, ou de revenir à la version indiquée.

---

## 35. Glossaire des statuts (annexe)

### Statuts d'une section
| Statut | Libellé complet affiché |
|---|---|
| `brouillon_aide` | Brouillon (aide à la rédaction) |
| `propose_par_ia_non_valide` | Proposé par l'IA — non validé |
| `en_verification` | En vérification |
| `en_approbation` | En approbation |
| `valide_en_interne` | Validé en interne — pas une signature électronique opposable |

### Statut d'archivage (client et projet)
| Statut | Signification |
|---|---|
| `actif` | visible dans la liste principale |
| `archive` | masqué de la liste principale, restaurable, jamais supprimé |

### Statut de qualification d'un nœud Structure Système
Non qualifié · En cours de qualification initiale · Qualifié · Qualifié — écart
ouvert · Requalification requise · Requalification en retard · Suspendu ·
Déclassé.

### Statut de périodicité d'un nœud (Suivi de périodicité, calculé à l'affichage)
En retard · Échéance proche (≤ 90 jours) · Échéance non renseignée · À jour ·
Non applicable (n'apparaît jamais dans la liste du Suivi de périodicité).

### Catégories de procédure
CQV (Qualification/Validation) · CSV (Systèmes informatisés) · Production.

### Verdicts d'assessment
- **ACFC** : Critique / Non critique.
- **Impact Assessment** : Direct Impact / Not Direct Impact.
- **Risk Assessment / AMDEC** : Acceptable / Action requise.
- **Exécution de test** : Conforme / Non conforme / Conforme avec écart.

### Readiness d'un plan de livrable (Content Plan)
Prêt · Besoin d'information · Besoin de revue · Bloqué. Statut du plan
lui-même (distinct) : Brouillon → Validé → Gelé.

### Statuts de mission et d'activité
- **Mission** : Ouverte · En cours · Clôturée.
- **Activité** : À faire · En cours · Terminée · Bloquée.

### Badges de confiance IA (Missions, Éditeur de section, Procédures)
Connu (vérifié) · Inféré · Inconnu · Conflit · À vérifier — jamais confondus
visuellement avec un statut de qualification.

### Gabarits du catalogue (pipeline de qualification)
Contexte procédé · URS · DQ · FAT · SAT · IQ · OQ · PQ · Validation procédé,
plus deux pistes de support non séquentielles : Plan de métrologie et Plan de
maintenance.

---

## 36. Parcours type de bout en bout

Un enchaînement minimal, du premier lancement jusqu'à l'archivage d'un projet :

1. **Se connecter** (`/connexion`) — email + mot de passe d'un compte créé par
   un admin → redirection vers l'accueil (ou la page demandée). (§2.1)
2. **Configuration GitHub, relais IA et authentification** (`/configuration`,
   atteignable même sans être connecté) — owner, repo, branche, jeton →
   « Enregistrer » → « Tester la connexion » ; URL du relais IA ; URL du
   Worker d'authentification. (§1)
3. **Créer un client** (`/clients`) — nom, adresse, secteur, détails →
   « Créer le client ». (§4)
4. **Définir l'architecture et les process** du site — nœuds Structure
   Système (import Excel ou manuel), process et fonctions — pour que
   l'assistant guidé (étape 6 ci-dessous) ait un contexte réel à afficher.
   (§11, §26)
5. **Créer un projet** (`/tableau-de-bord`) — nom, client rattaché, contexte,
   portée → redirection automatique vers la fiche projet. (§5)
6. **Ajouter des sections** depuis la fiche projet, de préférence via
   l'**assistant guidé** (rassemble architecture/process/procédures/risques/
   méthode/précédents et pose les liens structurels procédure/actif), ou
   directement, ou en important un document de référence pour générer un
   brouillon adapté. (§6, §7.5, §8)
7. **Uploader les documents de référence** utiles (manuels, SOP fournisseur…)
   dans la section « Documents » de la fiche projet — toujours « référence de
   travail, non maître ». (§6)
8. **Rédiger, faire relire et faire approuver** chaque section en suivant son
   cycle de statut (Brouillon → En vérification → En approbation → Validé en
   interne), en liant les sections requises pour lever les garde-fous de
   finalisation. (§7)
9. **Exporter** les livrables finalisés (JSON, Word, PDF, gabarit client) selon
   le besoin. (§7.8)
10. **Synchroniser vers GitHub** régulièrement (« Synchroniser vers GitHub »
    depuis le Tableau de bord) pour que le dépôt fasse foi ; résoudre tout
    conflit détecté champ par champ. (§5, §33)
11. **Suivre les échéances** de requalification périodique du site depuis le
    Suivi de périodicité, et retrouver à tout moment un livrable, une
    procédure ou un document via la recherche globale. (§12, §31)
12. **Sauvegarder manuellement vers Drive** si ce mécanisme est configuré pour
    le client. (§9)
13. **Archiver le projet** une fois le dossier clos, en retapant son nom exact
    et en saisissant votre mot de passe de connexion — jamais une suppression
    définitive (réservée aux admins, sur un client déjà archivé). (§6, §4)
