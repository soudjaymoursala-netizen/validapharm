# Audit UX/UI : entrée, navigation et administration de ValidaPharm

Captures : `/tmp/claude-0/-home-user-validapharm/71f0c0b0-cc6a-5bb6-92ad-4f0b44957792/scratchpad/ux-entree/shots/` (notées `shots/…` ci-dessous). Scripts : `ux-entree/s1.mjs` à `s16.mjs` (helper `h.mjs`, calcul de contraste `contraste.js`).
Tests : Chromium (Playwright), en admin et en consultant, en 1400 px et en 375 px, en thème clair et sombre. Panne serveur simulée par `page.route` (le Worker n'a pas été arrêté). Données créées : compte `ux1-testeur@validapharm.local` (désactivé), clients « ux1-Client Démo » (×2, dont 1 archivé).

## Synthèse
La base est propre : écrans aérés, aucun débordement horizontal à 375 px, labels présents, garde de l'archivage client (nom retapé + mot de passe), et protection « dernier administrateur ». Aucune erreur console en usage nominal.
Les défauts qui pèsent le plus sur l'utilisateur sont :
- **l'accessibilité clavier** : le focus est invisible dans la barre latérale et sur les cartes. Il n'y a pas de lien d'évitement (58 tabulations avant le contenu). Le tiroir mobile laisse les liens masqués focusables.
- **la panne serveur** : les écrans affichent des états vides trompeurs (« créez le premier ») et les boutons de création restent actifs.
- **l'administration** : aucune confirmation ni aucun retour pour désactiver ou rétrograder un compte, doublons de clients acceptés sans avertissement, et aucun parcours en cas de mot de passe oublié.

Viennent ensuite : 404 et client inconnu non gérés, recherche qui ne trouve pas les projets, et libellés incohérents (« Configuration… », « Tous mes projets » / « Tableau de bord »).

---

## Constats (par impact décroissant)

### 1. Focus clavier invisible dans la barre latérale, la bascule de mode et les cartes
- **Gravité : majeur (bloquant pour un utilisateur au clavier), WCAG 2.4.7 et 1.4.11**
- **Écran** : toutes les routes (barre latérale), `/` (cartes).
- **Description** : le style global `button:focus-visible, a:focus-visible` remplace le contour par un halo `0 0 0 3px var(--vp-marque-fond-leger)`, soit rgb(238,236,251). Sur fond blanc ou lavande, le contraste est d'environ 1,1:1 et le halo est invisible. Sur les liens de la barre latérale, l'ombre calculée est même transparente. Le focus sur « Mode Assistant », « Profil » ou « Choisissez un client… » ne laisse aucune trace visible. Sur la carte « Configurer la connexion GitHub », seule une bordure à peine teintée apparaît.
- **Reproduction** : se connecter, aller sur `/`, appuyer sur Tab 3 fois (Mode Assistant), puis 13 fois (lien « Choisissez un client »), puis 21 fois (carte GitHub).
- **Preuve** : `shots/kb-focus-3.png`, `shots/kb-focus-13.png`, `shots/kb-focus-21.png`. Sortie de `s7.mjs` : `outline=none … shadow=rgba(0,0,0,0)` sur les liens de la barre latérale.
- **Recommandation** : dans `styles/tokens.css` (lignes 293-297), remplacer le halo par un anneau contrasté d'au moins 3:1, par exemple `outline: 2px solid var(--vp-marque); outline-offset: 2px`. Vérifier que les règles `scoped` de `BarreLaterale.vue` (liens, `.sidebar__bascule-mode button`) et de `AccueilQueVoulezVousFaire.vue` (`.accueil__carte:focus-visible`) ne l'écrasent pas.

### 2. Serveur injoignable : états vides trompeurs et création toujours possible
- **Gravité : majeur (risque de doublons et de données incohérentes dans un contexte GxP)**
- **Écran** : bandeau de `CoquilleApplication.vue`, `/clients`, `/tableau-de-bord`, `/admin/utilisateurs`.
- **Description** : le bandeau dit « N'enregistrez rien de nouveau ». Pourtant, sous ce bandeau :
  - `/clients` affiche « Aucun client actif pour l'instant — créez le premier avec le bouton ci-dessus », avec « Nouveau client » actif.
  - `/tableau-de-bord` affiche « 0 projet(s) actif(s) » et « Aucun projet actif — créez le premier », avec « Nouveau projet » actif.
  - `/admin/utilisateurs` affiche une liste vide sans aucun message, « Nouveau compte » reste actif, et une exception n'est pas gérée : `[pageerror] Worker d'authentification injoignable.` et un avertissement Vue sur le hook `mounted`.

  Par ailleurs, le bandeau n'a pas d'icône, son texte rouge sur rose est à 4,41:1, et il défile avec la page.
- **Reproduction** : se connecter, bloquer les requêtes vers `localhost:8787`, puis ouvrir `/clients`, `/tableau-de-bord` et `/admin/utilisateurs`.
- **Preuve** : `shots/panne1400-_clients.png`, `shots/panne375-_clients.png`, `shots/panne1400-_tableau-de-bord.png`, `shots/panne1400-_admin_utilisateurs.png`. Sortie de `s5.mjs`.
- **Recommandation** : quand `connectivite.serveurInjoignable` est vrai, remplacer les états vides par un état d'erreur (« Impossible de charger les clients — Réessayer ») et désactiver les boutons de création avec une explication. Dans `AdminUtilisateurs.vue`, entourer `charger()` d'un try/catch et afficher une erreur `role="alert"`. Rendre le bandeau collant (`position: sticky`), lui ajouter une icône et foncer le rouge du texte.

### 3. Aucun parcours en cas de mot de passe oublié
- **Gravité : majeur**
- **Écran** : `/connexion`, `/admin/utilisateurs`.
- **Description** : l'écran de connexion n'a pas de lien « Mot de passe oublié ». Côté administration, seules deux actions existent par compte (« Promouvoir admin / Rétrograder » et « Désactiver / Réactiver ») : l'administrateur ne peut ni réinitialiser un mot de passe, ni corriger un e-mail. Un consultant qui oublie son mot de passe est bloqué. Le pied de page de la connexion renvoie vers « « Gestion des comptes » », un écran que seul un administrateur peut ouvrir.
- **Reproduction** : ouvrir `/connexion`, puis `/admin/utilisateurs` en admin.
- **Preuve** : `shots/a1400-connexion-vierge.png`, `shots/flux-apres-desactivation.png`.
- **Recommandation** : ajouter dans `AdminUtilisateurs.vue` une action « Réinitialiser le mot de passe », qui génère un mot de passe provisoire à changer à la connexion suivante et qui est tracée. Sur `Login.vue`, ajouter « Mot de passe oublié ? Contactez votre administrateur » et remplacer la mention « Gestion des comptes » par ce texte.

### 4. Actions sur les comptes sans confirmation ni retour, et libellés bruts
- **Gravité : majeur**
- **Écran** : `/admin/utilisateurs`.
- **Description** :
  - « Désactiver », « Rétrograder » et « Promouvoir admin » s'exécutent immédiatement au clic, sans modale : aucune boîte de dialogue ne s'ouvre après « Désactiver ».
  - Aucun message de succès ne s'affiche, ni après une création, ni après une modification.
  - « Réactiver » est stylé en rouge comme une action dangereuse, ce qui est un contresens.
  - Les badges affichent des codes internes (« desactive » sans accent, « admin », « utilisateur ») alors que `/profil` affiche « Administrateur » et « Utilisateur ».
  - Sur les lignes longues, la mise en page change : les boutons passent à la ligne.
- **Reproduction** : créer un compte `ux1-…`, puis cliquer sur « Désactiver ».
- **Preuve** : `shots/flux-apres-desactivation.png`, `shots/flux-apres-creation-compte.png`, `shots/a1400-_profil.png`. Sortie de `s9.mjs` : « modale après Désactiver ? 0 ».
- **Recommandation** : réutiliser le motif de `ModaleConfirmationArchivage.vue` pour « Désactiver » et « Rétrograder », en citant la conséquence. Ajouter un message `role="status"` (« Compte de X désactivé »). Utiliser un style neutre ou primaire pour « Réactiver ». Faire correspondre les codes à des libellés (Administrateur / Utilisateur, Actif / Désactivé). Mettre la liste en grille pour aligner les colonnes.

### 5. Tiroir mobile : liens masqués focusables, Échap inopérant, bouton de fermeture sur le logo
- **Gravité : majeur (WCAG 2.4.3 et 2.4.11)**
- **Écran** : toutes les routes à 375 px (`CoquilleApplication.vue` et `BarreLaterale.vue`).
- **Description** :
  - Tiroir fermé, la tabulation entre dans la navigation hors écran : « Se déconnecter » à x = -108 et « Mode Expert » à x = -308. Le focus disparaît.
  - La touche Échap ne ferme pas le tiroir (`aria-expanded` reste à `true`).
  - Tiroir ouvert, le bouton « × » chevauche le logo « VP ».
  - Le symbole « ≡ » du hamburger est minuscule et il n'y a ni barre d'en-tête, ni titre de page.
  - Une ombre grise permanente borde le côté gauche de l'écran.
- **Reproduction** : en 375 px, sur `/clients/<id>`, ouvrir le menu, appuyer sur Échap, fermer le menu, puis appuyer sur Tab.
- **Preuve** : `shots/m375-tiroir-ouvert.png`, `shots/m375-_clients.png`. Sortie de `s3.mjs`.
- **Recommandation** : quand le tiroir est fermé, appliquer `visibility: hidden` ou `inert` à la `<nav>`. Ajouter la fermeture par Échap, piéger le focus dans le tiroir ouvert et rendre le focus au bouton à la fermeture. Décaler le bouton « × » hors du logo. Ajouter une barre supérieure mobile (logo et titre de page) avec une icône hamburger en SVG d'au moins 20 px. Supprimer l'ombre quand le tiroir est fermé.

### 6. Pas de lien d'évitement, titre d'onglet figé, focus non géré après navigation
- **Gravité : majeur (WCAG 2.4.1, 2.4.2 et 2.4.3)**
- **Écran** : toutes les routes.
- **Description** : 58 tabulations sont nécessaires avant d'atteindre le contenu de la fiche client, et 14 sur l'accueil. Le `<title>` reste « ValidaPharm » sur toutes les routes. Après une navigation, le focus reste sur le lien de la barre latérale. Sur `/clients`, deux éléments portent `aria-current="page"` (« Mes clients » et l'invite « Choisissez un client »).
- **Reproduction** : sur `/clients/<id>`, appuyer sur Tab jusqu'au contenu. Lire `document.title` sur plusieurs routes.
- **Preuve** : sortie de `s15.mjs` (« Tabs avant le contenu (fiche client): 58 ») et de `s7.mjs` (titres et `aria-current`).
- **Recommandation** : ajouter un lien « Aller au contenu » dans `CoquilleApplication.vue`. Définir `document.title` à partir de `meta.titre` dans un `router.afterEach` de `router/index.ts`, au format « Mes clients — ValidaPharm ». Après une navigation, déplacer le focus sur le `<h1>` (avec `tabindex="-1"`). Retirer l'état actif de `.sidebar__invite`.

### 7. Doublons de clients acceptés sans avertissement
- **Gravité : majeur (ambiguïté dans les données en contexte GxP)**
- **Écran** : `/clients`.
- **Description** : créer deux fois « ux1-Client Démo » réussit en silence. La liste montre ensuite deux lignes identiques, impossibles à distinguer. Après la création, aucun message ne s'affiche et l'application ne redirige pas vers la fiche du nouveau client.
- **Reproduction** : cliquer sur « Nouveau client », saisir « ux1-Client Démo », cliquer sur « Créer ». Recommencer.
- **Preuve** : `shots/cli-doublon-client.png`. Sortie de `s10.mjs` (« nb ux1: 2 »).
- **Recommandation** : dans `GestionClients.vue` (et côté serveur), vérifier les doublons (nom normalisé) et afficher une alerte bloquante ou à confirmer. Après la création, naviguer vers `/clients/:id` ou afficher « Client créé » et mettre la nouvelle ligne en évidence.

### 8. Route inconnue : page blanche ; client inexistant affiché comme un vrai client
- **Gravité : majeur**
- **Écran** : `/<route inconnue>`, `/clients/:clientId` avec un id invalide.
- **Description** : `/nimporte-quoi` affiche la barre latérale et une zone de contenu vide (avertissement Vue Router R0004). `/clients/00000000-…` renvoie une erreur HTTP 404 mais affiche l'UUID comme titre, avec « Modifier les informations » et toutes les tuiles d'outils actives.
- **Reproduction** : ouvrir ces deux URL.
- **Preuve** : `shots/div-404.png`, `shots/div-client-inconnu.png`.
- **Recommandation** : ajouter une route `/:pathMatch(.*)*` vers un écran « Page introuvable » avec des liens de retour. Dans `FicheClient.vue`, afficher l'état « Client introuvable ou archivé » quand l'API répond 404, sans afficher les outils.

### 9. Modale d'archivage : focus non déplacé, Échap inopérant, aucun retour après archivage
- **Gravité : majeur (WCAG 2.4.3 et 4.1.2)**
- **Écran** : `/clients` (`ModaleConfirmationArchivage.vue`).
- **Description** :
  - À l'ouverture, le focus reste sur le bouton « Archiver » de la liste, derrière le voile.
  - Échap ne ferme pas la modale.
  - `role="dialog" aria-modal="true"` sont présents, mais sans `aria-labelledby`.
  - Le bouton « Archiver » reste actif tant que le nom retapé ne correspond pas.
  - Après l'archivage : aucun message de succès, et le focus retombe sur `BODY`.
- **Reproduction** : cliquer sur « Archiver » sur un client `ux1-…`, appuyer sur Échap, puis archiver avec le bon nom et le bon mot de passe.
- **Preuve** : `shots/cli-modale-archivage.png`, `shots/cli2-nom-approx.png`. Sorties de `s10.mjs` et `s11.mjs`.
- **Recommandation** : au montage, placer le focus dans le premier champ, piéger le focus, fermer avec Échap et rendre le focus à l'élément déclencheur. Relier le titre par `aria-labelledby`. Désactiver « Archiver » tant que le nom ne correspond pas exactement, en l'indiquant sous le champ. Après succès, afficher « Client archivé — restaurable depuis les archives », avec `role="status"`. Appliquer le même traitement à `ModaleSuppressionDefinitive.vue`.

### 10. La recherche globale ne trouve pas les projets
- **Gravité : majeur**
- **Écran** : `/recherche` et champ de la barre latérale.
- **Description** : chercher « P-200 » donne « 0 résultat(s) » alors que le projet « Qualification presse P-200 » existe et s'affiche sur l'accueil. Le sous-titre ne mentionne pas les projets. Le nombre de résultats n'est pas annoncé aux lecteurs d'écran (aucune région `aria-live`).
- **Reproduction** : dans la barre latérale, saisir « P-200 » puis appuyer sur Entrée.
- **Preuve** : `shots/act-recherche-p200.png`, `shots/act-recherche-pharma.png`. Sortie de `s8.mjs`.
- **Recommandation** : indexer les projets (et les livrables par référence) dans `RechercheGlobale.vue`. Mettre le compteur dans un `role="status"`. Pour une recherche sans résultat, proposer des pistes : « Essayez le nom du client, ou parcourez Tous mes projets ».

### 11. Épinglage invisible au clavier et au toucher
- **Gravité : majeur (la fonction annoncée sur l'accueil est introuvable)**
- **Écran** : barre latérale (outils du site actif), accueil (« Raccourcis épinglés »).
- **Description** : l'accueil dit « épinglez un outil depuis la navigation ». Or le bouton d'épinglage a `opacity: 0` et n'apparaît qu'au survol de la souris. Au clavier, le bouton reçoit le focus mais reste invisible (opacité 0 mesurée). Sur mobile, sans survol, il est introuvable.
- **Reproduction** : sur `/clients/<id>`, donner le focus au bouton « Épingler Architecture ».
- **Preuve** : `shots/pin-focus-epingle.png`. Sortie de `s15.mjs` (« opacity= 0 »).
- **Recommandation** : dans `BarreLaterale.vue` (vers la ligne 804), ajouter `.sidebar__lien-epinglable:focus-within .sidebar__bouton-epingle` et une requête `@media (hover: none)` qui passent l'opacité à 1.

### 12. « Configuration » : quatre libellés, trois sujets, ordre inadapté au premier lancement
- **Gravité : mineur**
- **Écran** : `/configuration`, barre latérale, `/`, `/tableau-de-bord`.
- **Description** :
  - La même page porte quatre noms : « Configuration GitHub » (barre latérale), « Configuration client » (h1), « Configuration » (bouton du tableau de bord) et « Configurer la connexion GitHub » (carte de l'accueil).
  - Elle contient en réalité trois sujets : GitHub, relais IA et Authentification. « Configuration client » se confond avec « Configuration du site » (outils par client).
  - La section Authentification, indispensable pour se connecter la première fois, est placée en dernier.
  - Une URL sans schéma (`localhost:8787`) est acceptée avec « ✓ Enregistré ».
  - Après l'enregistrement, aucun lien ne ramène vers « Se connecter ». Sans session, le bouton de retour « ← Tableau de bord » mène à la connexion.
  - Le vocabulaire « Worker », « D1 », « PAT » est technique pour un consultant.
- **Reproduction** : sans session, cliquer sur « Configurer » depuis `/connexion`.
- **Preuve** : `shots/a1400-configuration.png`, `shots/m375-_configuration.png`, `shots/a1400-_tableau-de-bord.png`. Sortie de `s16.mjs`.
- **Recommandation** : choisir un libellé unique, par exemple « Connexions & serveurs ». Sans session, placer « Authentification » en premier et afficher « Enregistré — Se connecter → » après la sauvegarde. Valider que l'URL commence par `https?://`. Vulgariser les textes d'aide dans `ConfigurationClient.vue`.

### 13. Navigation : un libellé de menu ne correspond pas au titre de la page
- **Gravité : mineur**
- **Écran** : barre latérale, `/`, `/tableau-de-bord`.
- **Description** : « Tous mes projets » (barre latérale) et « Voir tous mes projets » (accueil) mènent à un h1 « Tableau de bord ». On y trouve des boutons « Clients » et « Configuration » qui doublonnent la barre latérale, et des actions GitHub sans explication. Les icônes sont ambiguës : la même silhouette sert à Profil, Gestion des comptes, Mes clients et Vue d'ensemble, et le même engrenage à Paramètres et Configuration GitHub.
- **Preuve** : `shots/a1400-_tableau-de-bord.png`, `shots/a1400-_.png`.
- **Recommandation** : renommer le h1 « Mes projets » (ou le menu « Tableau de bord »). Retirer les doublons de navigation de l'en-tête. Ajouter une phrase d'aide, ou regrouper la synchronisation GitHub dans un menu « ⋯ ». Choisir des icônes distinctes dans `IconeSvg.vue` (bâtiment pour les clients, groupe pour les comptes, clé pour la configuration).

### 14. « Mes clients » : hiérarchie visuelle et mise en page de l'en-tête
- **Gravité : mineur**
- **Écran** : `/clients` (1400 px et 375 px).
- **Description** :
  - Chaque ligne porte un bouton plein rouge « Archiver » qui domine visuellement le nom du client, seule action utile au quotidien.
  - Rien n'indique que la ligne est cliquable (pas de chevron).
  - L'en-tête est désaligné : le h1 est décalé à droite du bouton retour. À 375 px, « Mes clients » passe sur deux lignes, coincé entre les deux boutons.
  - Le conteneur est étroit (environ 510 px) comparé aux autres écrans.
  - Un client sans secteur affiche une pastille vide.
- **Preuve** : `shots/a1400-_clients.png`, `shots/m375-_clients.png`, `shots/cli-doublon-client.png` (pastille vide à côté de « audit-sec-Client outsider »).
- **Recommandation** : dans `GestionClients.vue`, déplacer « Archiver » dans un menu « ⋯ » ou le passer en bouton secondaire. Ajouter un chevron et une indication au survol sur la ligne. Mettre le h1 sous le bouton retour, comme sur `/profil`. Ne pas afficher la pastille si le secteur est vide.

### 15. Liste des clients archivés : date ISO brute et colonne du nom écrasée
- **Gravité : mineur (lisibilité de la traçabilité)**
- **Écran** : `/clients`, « Afficher les clients archivés ».
- **Description** : la ligne affiche « archivé le 2026-09-25T19:57:16.681Z par test-local@validapharm.local », soit une date UTC brute et un e-mail au lieu du nom. Le nom du client s'étale sur 3 lignes et « Supprimer définitivement » sur 2.
- **Preuve** : `shots/cli2-archives.png`.
- **Recommandation** : formater la date avec `Intl.DateTimeFormat('fr-FR', {dateStyle:'medium', timeStyle:'short'})` en heure locale et afficher le nom de l'auteur. Passer la ligne en disposition verticale sur deux niveaux.

### 16. Consultant renvoyé sans explication depuis `/admin/utilisateurs`
- **Gravité : mineur**
- **Écran** : `/admin/utilisateurs` (rôle consultant).
- **Description** : la route redirige en silence vers `/`. Un lien partagé ou un favori semble « ne rien faire ».
- **Preuve** : sortie de `s12.mjs` (« /admin/utilisateurs -> http://localhost:5173/ »), `shots/cons1400-_admin_utilisateurs.png`.
- **Recommandation** : dans la garde de `router/index.ts`, rediriger avec un paramètre qui déclenche le message « Accès réservé aux administrateurs », ou afficher un écran 403.

### 17. Bascule Mode Expert / Assistant : état non exposé, effet silencieux
- **Gravité : mineur**
- **Écran** : barre latérale.
- **Description** : les deux boutons n'ont pas `aria-pressed` : l'état n'est porté que par la couleur. Passer en Mode Assistant masque sans prévenir « Configuration GitHub » et une dizaine d'outils du site (Suivi de périodicité, Templates, AMDEC, Exécution de tests…). L'explication n'apparaît que si un site est actif.
- **Preuve** : `shots/act-mode-assistant.png`. Sortie de `s8.mjs` (navigation avant et après, `aria-pressed=null`).
- **Recommandation** : dans `BarreLaterale.vue`, ajouter `aria-pressed`, ou utiliser un `radiogroup` avec `aria-checked`. Ajouter un `title` ou une infobulle qui explique chaque mode, et un message `role="status"` au changement (« Mode Assistant : 11 outils avancés masqués »).

### 18. Mise en page incohérente entre les écrans
- **Gravité : mineur**
- **Écran** : `/`, `/tableau-de-bord`, `/clients`, `/profil`, `/parametres`, `/recherche`, `/admin/utilisateurs`.
- **Description** : le contenu commence à x = 325, 363, 491, 523 ou 555 selon l'écran, avec des largeurs de 510 à 1035 px. Le bouton retour existe sur Clients, Profil, Comptes et Configuration, mais pas sur Paramètres, Recherche ni le Tableau de bord. Sa cible varie : Accueil sur Clients et Comptes, Tableau de bord sur Configuration.
- **Preuve** : `shots/a1400-_clients.png`, `shots/a1400-_profil.png`, `shots/a1400-_parametres.png`, `shots/a1400-_recherche.png`.
- **Recommandation** : créer un gabarit de page commun (en-tête avec fil d'Ariane, h1 et actions), avec des largeurs normalisées via des variables `--vp-largeur-contenu-*`. Remplacer les boutons retour par un fil d'Ariane cohérent.

### 19. Contrastes limites, surtout en thème sombre
- **Gravité : mineur (WCAG 1.4.3)**
- **Écran** : `/admin/utilisateurs`, bandeau de panne, barre latérale et fiche client en thème sombre.
- **Description** :
  - En thème clair, « Désactiver » (rouge sur #F5F5FA) est à 4,44:1 et le texte du bandeau de panne à 4,41:1.
  - En thème sombre, le lien actif de la barre latérale et les pastilles (#8B7FFF sur #262A44) sont à 4,39:1.
  - Toujours en sombre, « Désactiver », « Réactiver » et « desactive » sont à 3,73:1, et les initiales « PS » de l'avatar du site actif à 2,66:1.
- **Preuve** : sorties de `s6.mjs` et `s14.mjs`, `shots/div-sombre_admin_utilisateurs.png`, `shots/div-sombre_.png`.
- **Recommandation** : dans `tokens.css`, foncer `--vp-danger` sur fond clair (#B91C1C) et l'éclaircir en sombre (#F87171). Éclaircir la couleur de marque des états actifs en sombre (environ #A99FFF). Utiliser un texte foncé sur l'avatar rose en thème sombre.

### 20. Connexion : jargon, focus perdu après une erreur, aucune aide à la saisie
- **Gravité : mineur**
- **Écran** : `/connexion`.
- **Description** : le message « Aucun Worker d'authentification configuré sur cet appareil » est technique. Après une erreur d'identifiants, le focus retombe sur `BODY`. Les champs n'ont ni `aria-invalid` ni `aria-describedby` vers le message. Il n'y a pas de bouton pour afficher le mot de passe. Six échecs consécutifs donnent toujours le même message, sans délai ni information.
- **Preuve** : `shots/a1400-connexion-vierge.png`, `shots/login-mauvais-mdp.png`. Sortie de `s4.mjs`.
- **Recommandation** : dans `Login.vue`, écrire « Serveur de connexion non configuré sur cet appareil — Configurer ». Après une erreur, remettre le focus sur le mot de passe avec `aria-invalid="true"` et `aria-describedby` vers le message. Ajouter un bouton « Afficher » dans le champ mot de passe.

### 21. Règles de mot de passe non affichées
- **Gravité : mineur**
- **Écran** : `/profil`, `/admin/utilisateurs` (champ « Mot de passe initial »).
- **Description** : `minlength=8` n'est connu qu'au moment de l'envoi, par la bulle native du navigateur (en anglais dans ce Chromium : « Please lengthen this text to 8 characters… »). Rien n'est indiqué sous le champ. Sur `/profil`, la non-concordance entre le nouveau mot de passe et sa confirmation n'est pas vérifiée en direct.
- **Preuve** : sorties de `s9.mjs` et `s13.mjs`, `shots/div-profil-mdp.png`, `shots/flux-form-compte.png`.
- **Recommandation** : afficher « 8 caractères minimum » sous chaque champ (`aria-describedby`), valider en français côté application et contrôler la concordance au fil de la saisie (`Profil.vue`, `AdminUtilisateurs.vue`).

### 22. « Se déconnecter » : cible trop petite et peu visible
- **Gravité : mineur (WCAG 2.5.8)**
- **Écran** : barre latérale (toutes les routes, notamment à 375 px).
- **Description** : la cible mesure 87×14 px, en texte gris de petite taille à côté du nom. Aucune confirmation n'est demandée, et le rôle de l'utilisateur n'est pas affiché dans la barre latérale.
- **Preuve** : sortie de `s2.mjs` (« BUTTON "Se déconnecter" 87x14 »), `shots/m375-tiroir-ouvert.png`.
- **Recommandation** : dans `BarreLaterale.vue`, prévoir un bloc utilisateur (avatar, nom, rôle) ouvrant un menu avec Profil et Se déconnecter, et une zone d'au moins 24 px de haut (44 px en tactile).

### 23. Mobile : ligne projet du tableau de bord écrasée
- **Gravité : amélioration**
- **Écran** : `/tableau-de-bord` à 375 px.
- **Description** : dans la ligne projet, le titre se coupe en « Qualification presse P- / 200 » et le client en « PharmaTest / SA », car « 0 section(s) » et le chevron gardent leur largeur. Les deux boutons GitHub occupent un bloc entier au-dessus de la liste.
- **Preuve** : `shots/m375-_tableau-de-bord.png`.
- **Recommandation** : sous 480 px, placer le compteur de sections sous le titre (`flex-wrap`) et regrouper les actions GitHub dans un menu.

### 24. Micro-rédaction : pluriels « (s) » et textes internes visibles
- **Gravité : amélioration**
- **Écran** : `/tableau-de-bord`, `/recherche`, `/`, `/parametres`.
- **Description** : on lit « 1 projet(s) actif(s) », « 0 section(s) », « 1 résultat(s) », « 0/1 section(s) validée(s) ». Paramètres affiche une note de feuille de route en italique (« aucun mécanisme de traduction n'existe encore… »). La police « Serif » ne propose aucun aperçu. Changer de thème ne donne aucun retour, ce qui est acceptable car l'effet est immédiat.
- **Preuve** : `shots/a1400-_tableau-de-bord.png`, `shots/a1400-_parametres.png`, `shots/act-recherche-pharma.png`.
- **Recommandation** : utiliser une fonction de pluriel (`Intl.PluralRules`) et retirer les notes de développement de `Parametres.vue`.

### 25. Accueil : cartes d'action hétérogènes
- **Gravité : amélioration**
- **Écran** : `/`.
- **Description** : « Raccourcis épinglés » occupe une ligne à lui seul, en tiers de largeur, avec un vide à droite. Les deux grandes cartes du bas (« Gérer mes clients », « Configurer la connexion GitHub ») sont des actions de configuration placées sous le contenu de travail, et reprennent « Mes clients » plus haut. La carte « À vérifier » vide garde la même taille que les cartes remplies.
- **Preuve** : `shots/a1400-_.png`, `shots/m375-_.png`.
- **Recommandation** : dans `AccueilQueVoulezVousFaire.vue`, disposer les cartes en grille 3×2 sans trou. Réduire les cartes vides à une ligne. Remplacer la carte GitHub par une alerte contextuelle, affichée seulement si GitHub n'est pas configuré.

---

### Points positifs relevés
- Aucun débordement horizontal à 375 px sur les 9 routes testées ; labels associés aux champs ; `lang="fr"`.
- Archivage client protégé par le nom retapé et le mot de passe, et restaurable. Rétrograder le dernier administrateur est refusé avec un message clair.
- Accès non authentifié redirigé vers `/connexion?redirect=…`. Le bouton « Réessayer » du bandeau de panne fonctionne.
- Aucune erreur console en usage nominal. Message d'échec de connexion générique, qui ne révèle pas si l'e-mail existe.
