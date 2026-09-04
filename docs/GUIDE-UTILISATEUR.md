# Guide utilisateur ValidaPharm — référence complète

> Document de référence pratique, distinct des documents réglementaires numérotés
> (`00-cadrage-projet.md`, `03-specifications-fonctionnelles.md`, etc.) : il explique **comment utiliser
> l'outil**, écran par écran, champ par champ, sans reformuler les exigences. En cas
> de divergence entre ce guide et le comportement réel de l'application, le code
> source fait foi — ce document doit être mis à jour en conséquence.
>
> Toutes les captures de libellés, placeholders et messages ci-dessous sont recopiées
> mot pour mot depuis le code source de l'application (`src/presentation/screens/`
> et `src/presentation/composants/`) à la date de rédaction.

---

## Sommaire

0. [Comprendre l'outil avant de commencer](#0-comprendre-loutil-avant-de-commencer)
1. [Premier lancement : connexion au dépôt GitHub et au relais IA](#1-premier-lancement--connexion-au-dépôt-github-et-au-relais-ia)
2. [Authentification et profil local](#2-authentification-et-profil-local)
3. [Gérer les clients](#3-gérer-les-clients)
4. [Tableau de bord et projets](#4-tableau-de-bord-et-projets)
5. [Fiche projet](#5-fiche-projet)
6. [Éditeur de section — le cœur du travail](#6-éditeur-de-section--le-cœur-du-travail)
7. [Miroir Google Drive (sauvegarde manuelle)](#7-miroir-google-drive-sauvegarde-manuelle)
8. [Missions et espace de travail](#8-missions-et-espace-de-travail)
9. [Structure Système (référentiel d'actifs)](#9-structure-système-référentiel-dactifs)
10. [Dossier vivant d'un actif](#10-dossier-vivant-dun-actif)
11. [Connecteurs QMS](#11-connecteurs-qms)
12. [Journal d'anomalies (événements qualité)](#12-journal-danomalies-événements-qualité)
13. [Stratégie de qualification (ACFC)](#13-stratégie-de-qualification-acfc)
14. [Impact Assessment](#14-impact-assessment)
15. [Computer System Assessment (GAMP5)](#15-computer-system-assessment-gamp5)
16. [Paramètres critiques (CPP/CQA)](#16-paramètres-critiques-cppcqa)
17. [Risk Assessment / AMDEC](#17-risk-assessment--amdec)
18. [Exigences et tests](#18-exigences-et-tests)
19. [Exécution de tests](#19-exécution-de-tests)
20. [Ingestion documentaire (Source Intelligence)](#20-ingestion-documentaire-source-intelligence)
21. [Plans de livrable (Content Plan)](#21-plans-de-livrable-content-plan)
22. [Procédures (structuration de SOP)](#22-procédures-structuration-de-sop)
23. [Chat expert / Assistant IA](#23-chat-expert--assistant-ia)
24. [Bibliothèque de normes](#24-bibliothèque-de-normes)
25. [Configuration IA par client](#25-configuration-ia-par-client)
26. [Résolution de conflit de synchronisation](#26-résolution-de-conflit-de-synchronisation)
27. [Écran de blocage d'incompatibilité](#27-écran-de-blocage-dincompatibilité)
28. [Glossaire des statuts (annexe)](#28-glossaire-des-statuts-annexe)
29. [Parcours type de bout en bout](#29-parcours-type-de-bout-en-bout)

---

## 0. Comprendre l'outil avant de commencer

**ValidaPharm est une PWA (Progressive Web App) sans serveur central pour les
données métier, mais avec une authentification réelle multi-utilisateur**
(Worker Cloudflare dédié + base D1) : toute l'application — à l'exception de
l'écran de connexion lui-même et de « Configuration client » — exige désormais
une session valide avant d'être accessible ([§2.1](#21-se-connecter)). Trois
idées à comprendre avant de commencer :

1. **Vos données de projet vivent d'abord dans le navigateur** (base locale
   IndexedDB). Rien n'est envoyé nulle part tant que vous ne cliquez pas
   explicitement sur « Synchroniser vers GitHub ».
2. **GitHub est la source de vérité.** Un dépôt GitHub dédié stocke la copie
   officielle de vos projets/sections au format JSON. Vous vous « connectez » à ce
   dépôt via un jeton d'accès (PAT), configuré une seule fois pour toute
   l'installation (écran [§1](#1-premier-lancement--connexion-au-dépôt-github-et-au-relais-ia)).
3. **Google Drive n'est jamais une source de vérité**, seulement un miroir de
   sauvegarde manuel, par client, qui **écrase** son contenu à chaque sauvegarde
   ([§7](#7-miroir-google-drive-sauvegarde-manuelle)).

Il existe par ailleurs un **« Profil local »** ([§2.3](#23-le-profil-local-verrou-de-confirmation)),
distinct du compte de connexion ci-dessus : un enregistrement local par
appareil (nom, prénom, email, « visa »/initiales), stocké haché sur cet
appareil, qui sert uniquement à signer vos créations et archivages d'une
identité lisible (« créé par », « archivé par »). Ce n'est **pas** un compte,
ni une authentification, ni une signature électronique réglementaire — et il
ne conditionne plus l'archivage : confirmer un archivage ou une suppression
définitive redemande désormais votre vrai mot de passe de connexion
([§3](#3-gérer-les-clients)).

**Navigation générale (barre latérale)** :
- Si vous êtes connecté, un bandeau affiche le prénom et le nom du compte
  courant avec un lien **« Se déconnecter »**.
- **Accueil** → « Que voulez-vous faire ? » (`/`)
- **Mon espace** → Profil (le profil local, [§2.3](#23-le-profil-local-verrou-de-confirmation)),
  Paramètres (préférences d'affichage de cet appareil — thème clair/sombre/
  système et police — jamais une donnée de projet ; écran non détaillé plus
  loin dans ce guide), Guides & normes (Bibliothèque de normes) ; en Mode
  Expert uniquement, Configuration GitHub ; si le compte connecté a le rôle
  admin, Gestion des comptes ([§2.2](#22-gestion-des-comptes-admin)).
- **Mon travail** → Mes clients, Tous mes projets (Tableau de bord).
- Dès qu'un client est actif (dernier client visité), ses outils apparaissent
  regroupés par intention :
  - **Le site** — Vue d'ensemble (Fiche client), Architecture (Structure
    Système), Process, Procédures, Templates & Formulaires, Projets
    (Tableau de bord filtré), Missions.
  - **Qualité & ingénierie** — Stratégie de qualification, Impact Assessment,
    Computer System Assessment, Risk Assessment (AMDEC), Paramètres
    critiques, Exigences et tests, Exécution de tests, Journal d'anomalies.
  - **Connaissance & IA** — Ingestion documentaire, Plans de livrable,
    Assistant IA.
  - **Configuration du site** — Connecteurs QMS, Miroir Drive, IA du client.

Un bouton **« Mode Expert » / « Mode Assistant »** apparaît en haut de la barre
latérale. En Mode Assistant, la barre latérale ne montre plus, dans les
groupes ci-dessus, qu'un sous-ensemble jugé essentiel à un parcours guidé
(Templates & Formulaires, Risk Assessment, Paramètres critiques, Exigences et
tests, Exécution de tests, Journal d'anomalies, Ingestion documentaire, Plans
de livrable, Connecteurs QMS, Miroir Drive, IA du client et Configuration
GitHub disparaissent) ; le Mode Expert affiche toujours la liste complète.
Aucun écran lui-même ne change de comportement selon le mode : seule la liste
de liens proposée diffère.

---

## 1. Premier lancement : connexion au dépôt GitHub et au relais IA

**Écran** : « Configuration client » — route `/configuration` (menu « Configuration
GitHub »).

Cet écran configure **deux connexions globales à toute l'installation** (un seul
dépôt et un seul relais IA, jamais un par client) :

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

- Succès : « Connexion réussie — branche « {branche} » au commit {7 premiers
  caractères du SHA}. »
- Échec : « Échec de connexion : {message} »

### 1.2 Relais IA

> Rappel affiché : « Le navigateur ne contacte jamais un fournisseur d'IA
> directement : toutes les requêtes passent par ce relais serverless unique, qui
> détient la clé du fournisseur configuré côté serveur. »

| Champ | Type | Obligatoire | Placeholder |
|---|---|---|---|
| URL du relais | URL | oui | `https://relais.exemple.workers.dev` |
| Jeton d'accès | mot de passe | oui | — |

Mêmes boutons « Effacer » / « Enregistrer » (affiche aussi brièvement
« ✓ Enregistré. » ; pas de test de connexion sur ce bloc).

C'est ce relais qui est utilisé partout où l'IA intervient (chat expert,
génération de brouillon, raisonnement de mission, etc.) — voir les sections
correspondantes pour la configuration **par client** du fournisseur choisi
([§25](#25-configuration-ia-par-client)).

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

## 2. Authentification et profil local

Depuis l'ajout de l'authentification réelle multi-utilisateur (Worker
Cloudflare + base D1), il ne faut pas confondre deux mécanismes distincts et
non substituables :

- **La session de connexion** ([§2.1](#21-se-connecter)-[§2.2](#22-gestion-des-comptes-admin)) :
  un compte réel, email + mot de passe, vérifiés côté serveur, avec un rôle
  (« admin » ou « utilisateur »). C'est elle qui protège désormais tout
  l'accès à l'application (garde de routeur globale), et son mot de passe qui
  est redemandé pour confirmer un archivage ou une suppression définitive
  ([§3](#3-gérer-les-clients)).
- **Le profil local** ([§2.3](#23-le-profil-local-verrou-de-confirmation)) :
  un enregistrement local par appareil (nom, prénom, email, visa), distinct du
  compte de connexion, qui sert uniquement à signer les créations et
  archivages d'une identité lisible — ce n'est ni une authentification, ni un
  second mot de passe de garde.

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

Chaque compte listé affiche son nom, son email, un badge de rôle
(admin/utilisateur) et un badge de statut (actif/desactive), avec deux
actions : **« Promouvoir admin » / « Rétrograder »** et **« Désactiver » /
« Réactiver »**. Le premier compte admin de l'installation est créé en dehors
de cette interface (`/auth/bootstrap-admin`).

### 2.3 Le profil local (verrou de confirmation)

**Écran** : « Profil » — route `/profil-local`.

> Texte affiché à l'écran : « Ce mot de passe est un **verrou local de
> confirmation** — requis pour archiver un client ou un projet — jamais une
> authentification, une session, ou une signature électronique réglementaire. Il
> est stocké haché sur cet appareil uniquement et n'offre aucune protection contre
> quelqu'un ayant déjà accès à ce navigateur. »

Ce texte affiché à l'écran n'a pas été mis à jour depuis l'ajout de
l'authentification réelle ci-dessus ([§2.1](#21-se-connecter)) : dans les
faits, ce profil **ne conditionne plus** l'archivage — voir [§3](#3-gérer-les-clients),
la confirmation d'archivage redemande désormais votre vrai mot de passe de
connexion, jamais celui de ce profil. Ce profil sert aujourd'hui uniquement à
signer vos créations et archivages d'une identité lisible.

Champs (mode création ou modification) :

| Champ | Type | Obligatoire | Détail |
|---|---|---|---|
| Prénom | texte | non | — |
| Nom | texte | non | — |
| Email | email | oui | — |
| Visa (initiales) | texte | oui | placeholder `ex. QLD` |
| Mot de passe actuel | mot de passe | oui, **seulement si un profil existe déjà** | requis pour toute modification |
| Nouveau mot de passe / Mot de passe | mot de passe | oui | minimum 8 caractères |
| Confirmer le mot de passe | mot de passe | oui | doit être identique au précédent |

Messages d'erreur possibles :
- « Le mot de passe doit contenir au moins 8 caractères. »
- « La confirmation ne correspond pas au mot de passe saisi. »
- « Mot de passe actuel incorrect. » (en modification)

Bouton **« Enregistrer »** (crée ou remplace le profil), **« Modifier le profil »**
(rouvre le formulaire pré-rempli), **« Annuler »** (uniquement si un profil
existe déjà). Confirmation après enregistrement : « Profil enregistré. »

Techniquement, le mot de passe est haché en local par PBKDF2-SHA-256
(100 000 itérations, sel aléatoire) via l'API Web Crypto du navigateur — il n'est
**jamais** transmis à GitHub ni à un service tiers.

---

## 3. Gérer les clients

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

Les outils plus spécialisés (Missions, les Assessments, Exigences et tests,
Exécution de tests, Ingestion documentaire, Plans de livrable, Connecteurs
QMS, Miroir Drive, IA du client, Assistant IA, Journal d'anomalies…) restent
accessibles depuis la barre latérale dès ce client devenu « actif » — par
exemple en visitant sa Fiche client ou une de ses branches
([§0](#0-comprendre-loutil-avant-de-commencer)).

### Archiver un client
Bouton **« Archiver »** (rouge) sur chaque ligne de « Mes clients » → ouvre la
modale de confirmation (voir encadré ci-dessous). **Un client archivé n'est
jamais supprimé** : il disparaît de la liste principale mais reste consultable
dans une section dépliable **« Afficher les clients archivés (N) »** (le
bouton devient « Masquer les clients archivés (N) » une fois dépliée), avec la
mention « archivé le {date} par {identité} » et un bouton **« Désarchiver »**.

> **Comment fonctionne la confirmation d'archivage** (identique pour un client et
> pour un projet) :
> 1. Le nom exact de l'élément est rappelé à l'écran : « Cette action archive
>    « {nom} » — les données ne sont jamais supprimées, l'élément reste
>    restaurable depuis les archives. »
> 2. Vous devez **retaper le nom exact** dans le champ « Retapez le nom pour
>    confirmer » (erreur si différent : « Le nom saisi ne correspond pas. »).
> 3. Vous devez saisir **votre mot de passe de connexion** (celui du compte
>    utilisé pour vous connecter, [§2.1](#21-se-connecter) — ce n'est plus
>    celui du profil local ; erreur si incorrect : « Mot de passe
>    incorrect. »).
> 4. Bouton final **« Archiver »** (rouge) ou **« Annuler »**.
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

## 4. Tableau de bord et projets

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
  lien **« Résoudre le conflit »** (voir [§26](#26-résolution-de-conflit-de-synchronisation)).
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

Atteint depuis la branche « Projets » d'une Fiche client ([§3](#3-gérer-les-clients)),
cet écran filtre automatiquement sur ce client : une bannière « Projets
filtrés pour {client} » apparaît, avec un lien **« Voir tous les projets »**
pour revenir à la vue portefeuille complète (état vide alors : « Aucun projet
actif pour ce client — créez-en un avec le bouton ci-dessus. »).

### Archiver un projet
Comme pour un client, une section dépliable **« Afficher les projets archivés
(N) »** liste les projets archivés avec « archivé le {date} par {identité} »
(voir [§5](#5-fiche-projet) pour le bouton d'archivage lui-même, situé sur la
Fiche Projet — pas sur le Tableau de bord).

---

## 5. Fiche projet

**Écran** : route `/projets/:projectId`.

### En-tête
Nom du projet, échéance si renseignée, et bouton **« Archiver ce projet »**
(rouge, en haut à droite) — ouvre la même modale de double confirmation que pour
un client ([§3](#3-gérer-les-clients)). Après archivage, vous êtes redirigé vers
le Tableau de bord.

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

### Sections
- **« Ajouter une section »** → formulaire : Titre (obligatoire), Gabarit
  (liste déroulante parmi les 11 types du catalogue), puis choix entre
  **« Créer la section vierge »** (modèle vide) et **« À partir d'un
  document »** (vous amène directement à l'éditeur, panneau de génération de
  brouillon par adaptation déjà ouvert, [§6.5](#65-génération-de-brouillon-par-adaptation-ia)).
- **« Importer une section (JSON) »** : reprend un export JSON existant — crée
  toujours une nouvelle section, jamais un écrasement. Erreur affichée si le
  fichier n'est pas un export JSON valide.
- Si le projet n'a encore aucune section, un « guide de démarrage » propose ces
  deux mêmes options sous forme de grandes cartes.
- Chaque section listée affiche son titre, son type de gabarit et une pastille
  de statut colorée (voir [§28](#28-glossaire-des-statuts-annexe)).

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

## 6. Éditeur de section — le cœur du travail

**Écran** : route `/projets/:projectId/sections/:sectionId`.

C'est l'écran où se rédige effectivement le contenu d'un livrable (URS, DQ, IQ,
etc.) et où se déroule tout son cycle de vie.

### 6.1 Contenu
Si un gabarit déclaratif existe pour le type de la section (la majorité des 11
types du catalogue), un formulaire structuré s'affiche (champs propres au
gabarit). Sinon, un simple champ **« Contenu »** (zone de texte libre) sert de
repli. Le contenu est verrouillé (non modifiable) dès que la section est
**« Validée en interne »**. Une sauvegarde automatique s'effectue en continu
(léger délai de 400 ms après chaque frappe pour le repli texte libre).

### 6.2 Cycle de vie et statuts
Une section suit une machine à états stricte, jamais un simple champ libre :

| Statut technique | Libellé affiché à l'écran | Action pour y arriver |
|---|---|---|
| `brouillon_aide` | **Brouillon (aide à la rédaction)** | statut initial |
| `propose_par_ia_non_valide` | **Proposé par l'IA — non validé** | via génération de brouillon par adaptation IA ([§6.5](#65-génération-de-brouillon-par-adaptation-ia)) |
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
  explicitement relue (voir [§6.6](#66-revue-obligatoire-dun-brouillon-proposé-par-lia)). Message
  rappel : « Relisez chaque section ci-dessus avant de pouvoir valider. »
- **En vérification** : « Transmettre à l'approbation » ou « Rejeter » (motif de
  rejet obligatoire).
- **En approbation** : « Approuver » ou « Rejeter » (motif obligatoire).
- **Validé en interne** : plus aucune action de cycle ; message affiché :
  « Section verrouillée (validée en interne — pas une signature électronique
  opposable). Nouvelle révision : backlog. »

### 6.3 Garde-fous de finalisation (blocages)
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

### 6.4 Liens vers d'autres sections
Bloc « Lier à » (liste déroulante des autres sections du même projet non encore
liées) + bouton **« Lier »**. Chaque section déjà liée peut être « Déliée »
(sauf si la section courante est déjà validée en interne).

### 6.5 Génération de brouillon par adaptation IA
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

### 6.6 Revue obligatoire d'un brouillon proposé par l'IA
Une fois un brouillon généré, la section passe automatiquement au statut
« Proposé par l'IA — non validé ». Une checklist apparaît :
« Relisez explicitement chaque section ci-dessus avant de pouvoir valider —
aucune validation globale en un clic n'est possible. » Une case à cocher
« J'ai relu et validé « {titre de la sous-section} » » doit être cochée pour
**chaque** sous-section du gabarit avant que le bouton de validation ne
s'active. Cette checklist n'est **jamais mémorisée** : recharger la page force
une relecture complète.

### 6.7 Workflow (rédacteur, relecteurs, approbateur)
Visible tant que la section n'est pas verrouillée.
- **« Identifiant approbateur final »** (texte) + bouton « Assigner ».
- **« Identifiant relecteur »** + **« Avis »** (deux champs texte) + bouton
  « Ajouter l'avis ». Compteur « Avis relecteurs : N » et liste des avis déjà
  saisis.

### 6.8 Export
- **« Exporter en JSON »**, **« Exporter en Word (.doc) »**, **« Imprimer /
  Exporter en PDF »** (déclenche l'impression navigateur), et un bouton par
  tableau dynamique du gabarit : « Exporter « {nom du tableau} » en CSV ».
- Si un blocage d'export existe (ex. section pas assez complète), un message
  s'affiche avec un bouton **« Forcer l'export malgré l'avertissement »**.
- **Gabarit d'export personnalisé** (si le projet a un client) : sélection d'un
  gabarit `.docx` déjà importé (« — Gabarit par défaut — » sinon), export en
  `.docx` réel via ce gabarit, et import d'un nouveau gabarit client (nom +
  fichier `.docx`) — refusé si les balises obligatoires (bloc de signatures,
  historique des révisions) sont manquantes, avec le détail exact des balises
  manquantes affiché.

Chaque export réussi journalise automatiquement l'événement dans l'audit trail
de la section.

### 6.9 Assistant contextuel de section
Visible dès qu'un projet est rattaché à un client, quel que soit le statut de
la section. Distinct du Chat expert ([§23](#23-chat-expert--assistant-ia)) et
de la génération de brouillon ci-dessus ([§6.5](#65-génération-de-brouillon-par-adaptation-ia)) :
pose une question sur cette section précise, à laquelle l'assistant répond en
voyant son contenu actuel, avec les mêmes outils de traçabilité que le
Reasoning Engine des Missions ([§8](#8-missions-et-espace-de-travail)).

> Rappel affiché : « Pose une question sur cette section précise — l'assistant
> voit son contenu actuel et dispose des mêmes outils de traçabilité que le
> Reasoning Engine. Fournisseur actuel : {fournisseur}. Jamais une écriture
> automatique dans la section — une réponse, jamais une action. »

Champ **question** (zone de texte, placeholder `ex. Quels risques ne sont pas
encore couverts par un test pour cet actif ?`) + bouton **« Poser la
question »** (libellé « Réflexion en cours… » pendant l'appel). Chaque échange
affiche la question posée, la réponse, et le même badge de confiance que les
Missions ([§8](#8-missions-et-espace-de-travail)) : « Connu (vérifié) »,
« Inféré », « Inconnu », « Conflit », « À vérifier ». Historique local à cette
visite de l'écran — jamais rechargé depuis une visite précédente. Toute
erreur est affichée explicitement, jamais silencieuse.

---

## 7. Miroir Google Drive (sauvegarde manuelle)

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
l'état courant.

---

## 8. Missions et espace de travail

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
  changement immédiat.
- **Activités** : ajout (Titre obligatoire + Description), chaque activité a son
  propre statut (« À faire » / « En cours » / « Terminée » / « Bloquée »). Dès
  qu'il y a au moins deux activités, un formulaire **« Lier »** permet de
  déclarer une dépendance (« {activité} dépend de {activité} ») — **cette
  dépendance est informative uniquement**, elle ne bloque jamais un changement
  de statut.
- **Événements qualité associés** : rattachement optionnel (jamais obligatoire)
  d'un ou plusieurs événements qualité déjà créés ([§12](#12-journal-danomalies-événements-qualité)).
- **Contexte** : bouton **« Assembler le contexte »** qui génère un instantané
  (« Context Snapshot ») du contexte réel (site, actif, procédés, événements
  qualité liés), puis affiche un narratif en quatre volets : « Où », « Quoi »,
  « Comment », « Pourquoi / Impact ».
- **Raisonnement** : champ « Objectif du raisonnement » (obligatoire) + bouton
  **« Raisonner »** qui invoque l'IA à partir du dernier contexte assemblé.
  Chaque réponse affiche un **badge de confiance** :
  « Connu (vérifié) », « Inféré », « Inconnu », « Conflit », « À vérifier », plus
  la liste des outils éventuellement appelés. Toute erreur (relais injoignable,
  quota…) est affichée explicitement, jamais silencieuse.

---

## 9. Structure Système (référentiel d'actifs)

**Écran** : route `/clients/:clientId/structure-systeme`.

Référentiel hiérarchique et configurable des actifs d'un client (sites, zones,
systèmes, équipements…) — **aucune structure n'est imposée par défaut**.

### Hiérarchie configurable
Formulaire d'ajout d'un niveau : **Clé du niveau** (`ex. site`), **Libellé**
(`ex. Site`), **Motif de numérotation** (`ex. S-{n}`, facultatif) → bouton
« Ajouter le niveau ».

### Nœuds du référentiel
Formulaire de création : **Niveau** (obligatoire, parmi ceux définis
ci-dessus), **Nom** (obligatoire), **Code** (obligatoire, unique pour ce
client), **Nœud parent** (optionnel, « — racine — » sinon) → bouton « Créer le
nœud ». Erreurs possibles : « Ce code est déjà utilisé par un autre nœud de ce
client. » ou « Ce rattachement créerait un cycle — refusé. »

Chaque nœud listé affiche nom, code, niveau, parent, et — si son échéance de
requalification est dépassée — un badge d'alerte « ⚠ échéance de requalification
dépassée » (purement visuel, recalculé à l'affichage).

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

## 10. Dossier vivant d'un actif

**Écran** : route `/clients/:clientId/structure-systeme/:noeudId/dossier-vivant`
(lien « Dossier vivant » depuis chaque nœud de Structure Système).

Écran **100 % consultatif** (aucun formulaire) : agrège tout ce qui est déjà
explicitement rattaché à cet actif — jamais de donnée fabriquée.

> Bandeau permanent : « Agrégation en lecture seule des données déjà rattachées
> à cet actif — aucune donnée fabriquée, uniquement ce qui a été explicitement
> lié. »

Sections affichées : Identité (code, niveau, statut de qualification, échéance),
Chaîne technique, Évaluations rattachées (ACFC, Impact Assessment, Computer
System Assessment, Risk Assessment/AMDEC), Missions ancrées sur cet actif,
Journal d'anomalies rattachées. Un dernier bloc, **« Périmètre non couvert par
cet écran »**, précise : « Les sections de projet (DQ/FAT/SAT/IQ/OQ/PQ…) ne
portent aujourd'hui aucun lien direct vers un nœud Structure Système — seul le
lien section↔section (garde-fous de finalisation) existe. Ce dossier vivant
n'agrège donc pas encore les livrables de gabarit ; retrouvez-les depuis la
fiche du projet concerné. »

---

## 11. Connecteurs QMS

**Écran** : route `/clients/:clientId/connecteurs-qms`.

> Avertissement permanent : « Configuration uniquement. Les adaptateurs Veeva
> Vault, SharePoint, dossier réseau et EDMS générique ne sont pas encore
> implémentés — aucun test de connexion réel n'est possible depuis cet écran
> pour ces types. »

Formulaire : **Nom du connecteur** (obligatoire), **Type** (obligatoire, parmi :
GitHub, Google Drive, Veeva Vault, SharePoint, Dossier réseau, EDMS générique),
puis des champs propres à chaque type (owner/repo/branche/jeton pour GitHub ;
identifiant de dossier/jeton pour Drive ; DNS/utilisateur/mot de passe pour
Veeva Vault ; URL de site/jeton pour SharePoint ; chemin pour dossier réseau ;
URL/jeton pour EDMS générique). Le bouton **« Créer le connecteur »** reste
désactivé tant que les champs obligatoires du type choisi ne sont pas remplis.

Chaque connecteur listé porte un badge « actif »/« inactif » et deux boutons :
**« Activer »/« Désactiver »** et **« Supprimer »**.

---

## 12. Journal d'anomalies (événements qualité)

**Écran** : route `/clients/:clientId/anomalies`.

> Avertissement permanent : « Change Control, Déviation, CAPA, Investigation,
> Constat d'audit, Revue périodique. Un événement externe référencé n'est
> jamais un verrou sur un autre module (DEC-002/DEC-055). »

Formulaire de création :

| Champ | Type | Obligatoire | Options |
|---|---|---|---|
| Type | liste | oui | Change Control, Déviation / anomalie, CAPA, Investigation, Constat d'audit, Revue périodique |
| Titre | texte | oui | — |
| Description | zone de texte | non | — |
| Origine | liste | non (défaut Interne) | Interne, Externe, Mixte |
| Nœud Structure Système (optionnel) | liste | non | — aucun — + nœuds |
| Référence externe — système / identifiant | texte | non | `ex. QMS client` |

Filtres disponibles : par type, par statut (« — tous — », Ouvert, En cours,
Clôturé). Chaque événement listé affiche son type, un badge de statut coloré,
son origine, l'actif lié éventuel, sa référence externe éventuelle, et peut être
**référencé** vers un autre événement (menu « — référencer depuis — » + bouton
« Référencer ») — par exemple pour relier une Déviation à une Investigation puis
à une CAPA. Ces références ne forment jamais un enchaînement obligatoire : une
déviation mineure peut être close sans investigation ni CAPA.

---

## 13. Stratégie de qualification (ACFC)

**Écran** : route `/clients/:clientId/strategie-qualification`.

Détermine, via une méthode ACFC (approche basée sur la criticité fonctionnelle)
**propre à chaque client**, si un composant/fonction est « critique » ou « non
critique », puis en déduit une conclusion de stratégie de qualification. Bandeau
permanent : « Aide à la décision, non une décision de qualification. »

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

Bouton « Enregistrer cette version » (le versionnage préserve l'historique —
une nouvelle version n'écrase jamais la précédente).

### Évaluer un composant/fonction
**« Composant/fonction évalué »** (obligatoire) + **« Nœud Structure Système »**
(optionnel), puis une réponse **oui / non / inconnu / sans objet** pour chaque
question de la méthode active. Dès que toutes les questions ont une réponse, un
verdict s'affiche automatiquement : **« Verdict ACFC : Critique »** ou
**« Verdict ACFC : Non critique »** (règle fixe : au moins un « oui » → critique).
Bouton « Enregistrer cette évaluation ».

### Évaluation de la complexité et conclusion
Une fois un verdict obtenu : choix radio **« Catalogue »** (système sans
adaptation) ou **« Spécifique »** (système fait à façon ou hautement configuré).
La conclusion finale de stratégie se calcule automatiquement à partir du
croisement verdict × complexité, avec la version de la grille de décision
utilisée affichée à titre de traçabilité.

---

## 14. Impact Assessment

**Écran** : route `/clients/:clientId/impact-assessment`.

Détermine si un système relève d'un **« Direct Impact »** (impact direct sur la
qualité produit/patient), en amont de l'ACFC. Bandeau permanent : « Aide à la
décision, non une décision de classification. »

Même logique que la Stratégie de qualification : **aucune question par défaut**,
méthode configurable par client (Source, Origine, Questions mot pour mot,
versionnée), puis évaluation d'un « Système évalué » avec réponses
**oui / non / inconnu / sans objet** à chaque question. Verdict strictement
binaire dès que le questionnaire est complet : **« Direct Impact »** (au moins
un « oui ») ou **« Not Direct Impact »**.

---

## 15. Computer System Assessment (GAMP5)

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

## 16. Paramètres critiques (CPP/CQA)

**Écran** : route `/clients/:clientId/parametres-critiques`.

> Rappel permanent : « Un CPP ou un CQA n'est jamais promu automatiquement à
> partir d'une classification de criticité — toujours une déclaration humaine
> explicite et séparée (ICH Q8/Q9/Q10). »

Trois blocs indépendants :

1. **Paramètres** : Nom (obligatoire), Description, Unité (`ex. °C`), Nœud
   Structure Système optionnel.
2. **Classification de criticité** (« indicatif, ne crée ni CPP ni CQA ») :
   Paramètre + Niveau (Important / Critique) + Contexte optionnel +
   Justification (obligatoire).
3. **CPP** (Critical Process Parameter) : Paramètre + Contexte (obligatoire) +
   Justification (obligatoire). Désactivation possible avec un motif obligatoire.
4. **CQA** (Critical Quality Attribute) : Nom + Description + Contexte
   (obligatoire) + Justification (obligatoire) — un CQA n'a **pas besoin**
   d'être rattaché à un Paramètre existant. Désactivation avec motif obligatoire.

---

## 17. Risk Assessment / AMDEC

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
défaillance, Cause potentielle, Contrôle actuel, puis Sévérité/Occurrence/
Détectabilité **initiales** (nombres, facultatifs). L'IPR initial (S×O×D) et un
verdict (« Acceptable » / « Action requise ») sont calculés automatiquement.

### Action résiduelle
Tant que l'IPR résiduel n'est pas renseigné, chaque ligne propose un
mini-formulaire : Recommandation, Responsable, S/O/D résiduelles. Une fois
enregistré, l'IPR résiduel et son verdict s'affichent en remplacement du
formulaire (cycle « évaluation initiale → action → évaluation résiduelle »).

---

## 18. Exigences et tests

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
   attendu). Bouton « Approuver » pour passer de « Brouillon » à « Approuvé ».
5. **Couverture** : déclaration explicite qu'un test **approuvé** couvre une
   exigence donnée — jamais automatique.

---

## 19. Exécution de tests

**Écran** : route `/clients/:clientId/executions`.

> Rappel permanent : « Le verdict n'est jamais déduit des résultats d'étape —
> toujours une décision explicite à la clôture. Immutable après clôture. »

- **Démarrer une exécution** : choix d'un test **approuvé** (obligatoire, sinon
  « Ce test doit être approuvé avant de pouvoir être exécuté. »), Nœud
  optionnel → bouton « Démarrer l'exécution ».
- **Par étape** : résultat (Conforme / Non conforme / Non applicable) +
  observation → « Enregistrer le résultat ». **Une fois enregistré, un résultat
  d'étape n'est plus modifiable** (traçabilité ALCOA+). Des mesures numériques
  (libellé, valeur, unité) peuvent ensuite y être ajoutées.
- **Événements** pendant l'exécution : Commentaire, Action, Retest, Déviation,
  Changement, Arrêt, Externe → « Consigner ».
- **Preuves** : Native (observation directe, fait foi sans fichier) ou Document
  (avec référence GitHub chemin/commit) → « Enregistrer la preuve ».
- **Clôture** : choix du verdict — **Conforme / Non conforme / Conforme avec
  écart** — bouton « Clôturer l'exécution ». Après clôture, plus aucun
  résultat/mesure ne peut être ajouté (« Ce test est déjà clôturé »).

---

## 20. Ingestion documentaire (Source Intelligence)

**Écran** : route `/clients/:clientId/ingestion-documentaire`.

> Rappel permanent : « Un `KnowledgeItem` naît toujours `à valider` — jamais
> validé automatiquement. Aucun appel IA réel : la valeur interprétée est
> toujours saisie par l'utilisateur. »

Chaîne complète, en sept blocs séquentiels :

1. **Sources** : Type (Document/Image), Titre (obligatoire).
2. **Localisation de source** : Source, Système (GitHub/Drive/Externe),
   Référence.
3. **Extractions** : Version de source, Méthode (Saisie manuelle / OCR Azure /
   Word natif / PDF natif).
4. **Éléments extraits** (« Ajouter l'élément (immutable) ») : Extraction,
   Contenu (obligatoire), Position (numéro auto-incrémenté).
5. **Éléments de connaissance** : Élément extrait, Libellé (obligatoire),
   Valeur interprétée (saisie manuelle, jamais générée automatiquement) — naît
   toujours au statut **« À valider »**, puis boutons « Valider » / « Rejeter ».
6. **Relations** entre éléments de connaissance (Depuis / Vers / Type de
   relation libre, `ex. précise`).
7. **Conflits** entre éléments de connaissance (Depuis / Vers / Description) —
   résolution ultérieure via un champ « Résolution » obligatoire + bouton
   « Résoudre ». Seuls les conflits ouverts restent affichés.

---

## 21. Plans de livrable (Content Plan)

**Écran** : route `/clients/:clientId/plans-livrable`.

> Rappel permanent : « `readiness` est recalculé à la demande, jamais en tâche
> de fond. Un plan ne peut être gelé que s'il est déjà validé ET que ses
> données sont prêtes — jamais l'un sans l'autre. »

Formulaire de création : **Gabarit** (obligatoire, un des 11 types du
catalogue), Nœud Structure Système optionnel, Procédé optionnel, Type de profil
de méthode optionnel (ACFC ou Impact Assessment) + sa référence, **Note de
contexte** (figée définitivement dès la création — non modifiable ensuite).

Chaque plan affiche son statut (Brouillon → Validé → Gelé) et son readiness
(« Prêt » / « Besoin d'information » / « Besoin de revue » / « Bloqué »),
recalculé uniquement sur clic « Recalculer readiness ». Boutons « Valider »
(depuis Brouillon) puis « Geler » (depuis Validé, refusé tant que le readiness
n'est pas « Prêt » — message « Les données ne sont pas encore prêtes »).

---

## 22. Procédures (structuration de SOP)

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
   facultatifs.
4. Métadonnées obligatoires avant confirmation : **Référence**, **Titre**,
   **Date d'effet**.
5. **« Confirmer et créer la procédure »** (seules les étapes cochées
   « Retenir » sont conservées) ou **« Annuler »**.

Aucune proposition n'est jamais écrite en base sans cette confirmation
explicite. La liste des procédures déjà créées pour le client s'affiche en bas
d'écran, avec leur référence, version et étapes.

---

## 23. Chat expert / Assistant IA

**Écran** : route `/clients/:clientId/chat`.

Disclaimer permanent : « Aide, pas avis opposable. »

- **Mode** : « Chat normatif » ou « Audit simulé ». En mode Audit simulé, un
  second bandeau non masquable rappelle : « Débat contradictoire multi-angles
  et, si des profils sont sélectionnés, simulation de persona(s) d'auditeur.
  Cette simulation ne constitue en aucun cas un audit réglementaire réel ni un
  avis opposable. » — personas disponibles (facultatifs, plusieurs choix
  possibles) : Swissmedic, FDA, Cabinet de conseil GxP, QA spécialisée.
- **Question** (obligatoire) + **« Joindre ce document à la question »**
  (menu déroulant listant les sections disponibles de ce client, action
  toujours explicite, jamais automatique). Joindre un document ouvre une
  confirmation : « Le contenu de « {titre} » sera transmis à {fournisseur}.
  Continuer ? »
- La session se ferme automatiquement après 5 minutes d'inactivité (consignée
  au journal, jamais le contenu échangé) ; un bouton « Rouvrir une session »
  permet de continuer.
- Un bandeau d'alerte apparaît si le fournisseur IA a changé de version depuis
  sa dernière qualification de fiabilité (« re-qualification recommandée avant
  usage réel »).

---

## 24. Bibliothèque de normes

**Écran** : route `/normes`.

> Introduction : « Normes et référentiels cités par les gabarits du catalogue —
> recherche par mot-clé. »

Un unique champ **« Rechercher une norme »** (`ex. EudraLex, ICH Q9, ASTM`),
recherche réactive (insensible à la casse et aux accents). Chaque résultat
affiche le nom de la norme et la liste des gabarits qui la citent. **Écran
purement consultatif** : aucune norme personnalisée ne peut être ajoutée depuis
cet écran, seules celles déjà référencées par les gabarits du catalogue
apparaissent.

---

## 25. Configuration IA par client

**Écran** : route `/clients/:clientId/ia`.

- **Fournisseur** : Claude, OpenAI, Copilot, DeepSeek (cloud) ou « Modèle local
  (Ollama) », choix radio → « Changer de fournisseur ». Changer de fournisseur
  réinitialise l'accusé de conditions et la qualification déjà enregistrés (ils
  sont propres à l'ancien fournisseur).
- **Conditions de traitement des données** (fournisseurs cloud uniquement) :
  bouton d'acquittement explicite : « J'ai vérifié et j'accepte les conditions
  de traitement des données de « {fournisseur} » ».
- **Qualification de fiabilité** (fournisseurs cloud uniquement, **une par
  mode d'usage** — chat normatif et audit simulé ne partagent jamais la même
  qualification) : Date, Résultat, Identifiant de l'échantillon, Version de
  l'échantillon (tous obligatoires), Version de moteur qualifiée (facultative).
  Tant qu'aucune qualification n'existe pour le mode choisi, un message bloque
  visuellement l'activation en usage réel : « Ce fournisseur ne peut être
  activé pour un usage réel : la qualification de fiabilité (échantillon
  versionné) est requise au préalable. »
- Pour le modèle local : aucune de ces deux étapes n'est requise (aucune donnée
  ne quitte le poste).

---

## 26. Résolution de conflit de synchronisation

**Écran** : route `/resolution-conflit` (atteint via le lien « Résoudre le
conflit » affiché après une synchronisation en conflit, [§4](#4-tableau-de-bord-et-projets)).

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
résolution. » Aucune écriture n'est jamais silencieuse.

---

## 27. Écran de blocage d'incompatibilité

Cet écran n'est **pas** une route accessible normalement : il remplace
**l'application entière** au démarrage si vos données locales ont été créées ou
migrées par une version plus récente de ValidaPharm que celle actuellement
utilisée. Aucune action n'est possible depuis cet écran ; le message affiché
est : « Cette version de ValidaPharm ne peut pas ouvrir ces données — elles ont
été créées ou migrées avec une version plus récente. Mettez à jour l'application
avant de continuer, ou revenez à la version {x} pour les rouvrir. » La seule
solution est de mettre à jour l'application, ou de revenir à la version indiquée.

---

## 28. Glossaire des statuts (annexe)

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

### Verdicts d'assessment
- **ACFC** : Critique / Non critique.
- **Impact Assessment** : Direct Impact / Not Direct Impact.
- **Risk Assessment / AMDEC** : Acceptable / Action requise.
- **Exécution de test** : Conforme / Non conforme / Conforme avec écart.

### Badges de confiance IA (Missions, Procédures)
Connu (vérifié) · Inféré · Inconnu · Conflit · À vérifier — jamais confondus
visuellement avec un statut de qualification.

### Gabarits du catalogue (pipeline de qualification)
Contexte procédé · URS · DQ · FAT · SAT · IQ · OQ · PQ · Validation procédé,
plus deux pistes de support non séquentielles : Plan de métrologie et Plan de
maintenance.

---

## 29. Parcours type de bout en bout

Un enchaînement minimal, du premier lancement jusqu'à l'archivage d'un projet :

1. **Se connecter** (`/connexion`) — email + mot de passe d'un compte créé par
   un admin → redirection vers l'accueil (ou la page demandée). (§2.1)
2. **Configuration GitHub, relais IA et authentification** (`/configuration`,
   atteignable même sans être connecté) — owner, repo, branche, jeton →
   « Enregistrer » → « Tester la connexion » ; URL du relais IA ; URL du
   Worker d'authentification. (§1)
3. **Profil local** (`/profil-local`, optionnel) — nom, prénom, email, visa,
   mot de passe → « Enregistrer ». Sert uniquement à signer vos créations et
   archivages d'une identité lisible — n'est plus requis pour pouvoir
   archiver. (§2.3)
4. **Créer un client** (`/clients`) — nom, adresse, secteur, détails →
   « Créer le client ». (§3)
5. **Créer un projet** (`/tableau-de-bord`) — nom, client rattaché, contexte,
   portée → redirection automatique vers la fiche projet. (§4)
6. **Ajouter des sections** depuis la fiche projet, en suivant le pipeline
   recommandé (Contexte procédé → URS → DQ → …), ou importer un document de
   référence pour générer un brouillon adapté. (§5, §6.5)
7. **Uploader les documents de référence** utiles (manuels, SOP fournisseur…)
   dans la section « Documents » de la fiche projet — toujours « référence de
   travail, non maître ». (§5)
8. **Rédiger, faire relire et faire approuver** chaque section en suivant son
   cycle de statut (Brouillon → En vérification → En approbation → Validé en
   interne), en liant les sections requises pour lever les garde-fous de
   finalisation. (§6)
9. **Exporter** les livrables finalisés (JSON, Word, PDF, gabarit client) selon
   le besoin. (§6.8)
10. **Synchroniser vers GitHub** régulièrement (« Synchroniser vers GitHub »
    depuis le Tableau de bord) pour que le dépôt fasse foi ; résoudre tout
    conflit détecté champ par champ. (§4, §26)
11. **Sauvegarder manuellement vers Drive** si ce mécanisme est configuré pour
    le client. (§7)
12. **Archiver le projet** une fois le dossier clos, en retapant son nom exact
    et en saisissant votre mot de passe de connexion — jamais une suppression
    définitive (réservée aux admins, sur un client déjà archivé). (§5, §3)
