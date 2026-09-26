# Audit UX : exécution, qualité, missions et intégrations (ValidaPharm)

Captures : `SP = /tmp/claude-0/-home-user-validapharm/71f0c0b0-cc6a-5bb6-92ad-4f0b44957792/scratchpad/ux-execution/shots`. Scripts : `ux-execution/p1…p12.mjs`. Client : PharmaTest SA (fd3b1875…). Données `ux4-` créées : URS-001, un objectif, un candidat, le test OQ-001 (approuvé), une couverture, 1 exécution clôturée et 1 exécution en cours, la déviation « ux4 DEV Seuil alarme AL-101 décalé », la mission « ux4 Requalification alarme AL-101 » (3 activités), aucun connecteur.

## Synthèse
Le parcours de bout en bout fonctionne (exigence → test approuvé → exécution → clôture → anomalie → mission avec dépendances), sans erreur console sur un client réel. En revanche, les garde-fous GxP reposent sur le texte, pas sur l'interface :
- **Actions irréversibles en un clic.** Clôturer une exécution, enregistrer un résultat d'étape, approuver un test ou changer le statut d'une anomalie se fait en un clic, sans confirmation.
- **Aucune alerte d'incohérence.** On peut clôturer « Conforme » malgré une étape non conforme et une déviation consignée.
- **Saisie invalide acceptée.** Une mesure « abc » est enregistrée.
- **Pas de retour à l'utilisateur.** Beaucoup d'actions ne font rien, sans message.
- **Accessibilité et tablette.** Les listes déroulantes d'exécution et de mission n'ont ni libellé ni valeur visible. Les preuves ne se joignent pas depuis une tablette. La fiche mission déborde en largeur à 375 px.

## Constats

### 1. [Bloquant] Clôture d'exécution en un clic, sans confirmation ni contrôle de cohérence
- **Route :** `/executions`.
- **Constat :** le verdict « Conforme » est accepté alors que l'étape 1 est « Non conforme », qu'une « Déviation » est consignée et qu'une étape n'a pas de résultat. Aucune boîte de dialogue (0 dialogue intercepté). Aucun motif de verdict, aucune e-signature. L'enregistrement devient immuable.
- **Reproduire :** démarrer OQ-001, mettre l'étape 1 en Non conforme, consigner une Déviation, choisir le verdict Conforme, cliquer « Clôturer l'exécution ».
- **Preuve :** `SP/p5/01-avant-cloture.png`, `SP/p5/02-apres-cloture.png` ; détail immuable dans la sortie de `p6.mjs` (1re version).
- **Recommandation :** ouvrir une modale de clôture (`ExecutionTests.vue`, fonction de clôture l.264) qui :
  - récapitule les étapes NC, les étapes vides et les déviations ;
  - exige une justification quand le verdict est incohérent avec ces éléments (sans jamais le déduire) ;
  - dit clairement que l'action est irréversible ;
  - demande une ressaisie ou une signature ;
  - utilise un bouton de style « danger » dédié.

### 2. [Majeur] Un résultat d'étape est définitif dès le premier clic
- **Route :** `/executions`.
- **Constat :** après « Enregistrer le résultat », les contrôles de l'étape disparaissent. Aucune confirmation, aucune correction ni annotation tracée possible, alors que l'exécution n'est pas encore clôturée. Une erreur de sélection sur tablette est donc permanente.
- **Preuve :** `SP/p4/01-etape1-nc.png`.
- **Recommandation :** afficher une confirmation légère (résumé du résultat, « Confirmer ») ou permettre une ré-saisie tracée (ancienne valeur, motif, auteur) tant que l'exécution est ouverte (`ExecutionTests.vue`).

### 3. [Majeur] Mesure : la valeur est un texte libre, « abc » est accepté
- **Route :** `/executions`, étape, « + Mesure ».
- **Constat :** le champ Valeur est `type="text"` sans `inputmode`. La mesure « Pression de déclenchement = abc bar » est enregistrée, puis figée dans l'enregistrement immuable.
- **Preuve :** sortie de `p5.mjs` (« Mesures : … = abc bar ») et `SP/p5/01-avant-cloture.png`.
- **Recommandation :** utiliser `inputmode="decimal"` et valider le format numérique (virgule française acceptée). Afficher une erreur en ligne (`ExecutionTests.vue` l.372). Proposer aussi une unité par défaut et une plage attendue quand le test la définit.

### 4. [Majeur] Actions sans aucun retour (échec silencieux)
- **Routes :** `/executions` et `/anomalies`.
- **Constat :** les clics suivants ne produisent ni message ni mise en évidence du champ manquant :
  - « Enregistrer le résultat » sans résultat choisi ;
  - « Enregistrer la preuve » sans titre ;
  - « Clôturer l'exécution » sans verdict ;
  - « Référencer » d'une anomalie alors que la liste est vide.
- **Reproduire :** cliquer ces boutons sur une carte d'exécution ou d'anomalie vide.
- **Preuve :** sortie de `p4.mjs` (texte identique avant et après) et `SP/p4/03-cloture-sans-verdict.png` ; sortie de `p7.mjs` (« Référencer » reste actif avec 0 option).
- **Recommandation :** remplacer les `if (!x) return` (`ExecutionTests.vue` l.147, 202, 225, 264) par un message d'erreur relié au champ (`aria-describedby`, `role="alert"`). Désactiver « Référencer » quand la liste est vide et expliquer pourquoi (`JournalAnomalies.vue`).

### 5. [Majeur] Carte d'exécution : listes déroulantes vides et 10 champs sans libellé
- **Route :** `/executions`.
- **Constat :** les listes Résultat, type d'Événement, type de Preuve et Verdict s'affichent **vides** : la valeur `''` ne correspond à aucune option, donc « — choisir — » n'apparaît pas. Elles n'ont ni `<label>` ni `aria-label`. Les champs Observation, Description et Titre n'ont qu'un placeholder. L'audit compte 10 contrôles sans nom accessible (WCAG 1.3.1, 3.3.2, 4.1.2). Au clavier, on entend seulement « liste déroulante ».
- **Preuve :** `SP/p3/01-demarree.png` ; sortie de `p3.mjs` (« CHAMPS SANS LABEL: 10 »).
- **Recommandation :** ajouter des libellés visibles, par exemple « Résultat de l'étape 1 », « Type d'événement », « Type de preuve », « Verdict final ». Mettre une option vide `value=""` libellée « — choisir — ». Grouper chaque étape dans un `fieldset` avec une `legend` (`ExecutionTests.vue`).

### 6. [Majeur] Preuves : impossible de joindre un fichier ou une photo, pas de rattachement à une étape
- **Route :** `/executions`, « Preuves ».
- **Constat :** le type « Document » ne demande qu'une « Référence GitHub (chemin/commit) » saisie à la main. Il n'y a ni `input type=file` ni capture caméra. La preuve est rattachée à l'exécution, pas à l'étape. Sur tablette, le consultant ne peut pas joindre sa photo de l'écran HMI.
- **Preuve :** `SP/p4/02-preuve.png` ; sortie de `p4.mjs` (champs : Titre, Description, Référence GitHub).
- **Recommandation :** ajouter un bouton « Joindre une photo/fichier » (`accept="image/*,application/pdf" capture="environment"`), un sélecteur « Étape concernée », et calculer l'empreinte et l'horodatage automatiquement (`ExecutionTests.vue`).

### 7. [Majeur] Pas de lien entre une déviation d'exécution et le journal d'anomalies
- **Routes :** `/executions` → `/anomalies`.
- **Constat :**
  - Une « Déviation » consignée pendant l'exécution n'apparaît pas dans le journal d'anomalies.
  - Il n'existe pas de bouton « Déclarer un écart » sur une étape non conforme.
  - Le formulaire d'anomalie ne propose aucun champ « Exécution / test d'origine ».
  - La liste « — référencer depuis — » est vide.
  - La fiche anomalie n'affiche ni numéro (DEV-00x), ni auteur, ni date.

  L'utilisateur doit tout ressaisir et la traçabilité se perd.
- **Preuve :** `SP/p6/02-anomalie-creee.png` ; sortie de `p7.mjs`.
- **Recommandation :** ajouter un bouton « Ouvrir un écart » sur les étapes NC et sur les événements de type Déviation, qui pré-remplit l'anomalie (titre, exécution, étape, actif). Dans la fiche anomalie, afficher un lien retour, un identifiant, l'auteur et la date (`ExecutionTests.vue`, `JournalAnomalies.vue`).

### 8. [Majeur] Statut d'anomalie : changement immédiat au `change` d'une liste, clôture réversible sans motif
- **Route :** `/anomalies`.
- **Constat :** choisir « Clôturé » dans la liste de la carte enregistre immédiatement, sans confirmation. On peut remettre « Ouvert » juste après, sans motif et sans historique visible.
- **Reproduire :** carte anomalie, choisir Clôturé, puis Ouvert.
- **Preuve :** sortie de `p12.mjs` (« ANOMALIE apres cloture puis reouverture: … Ouvert ») et `SP/p7/01-statut-en-cours.png`.
- **Recommandation :** remplacer la liste par des boutons d'action explicites (« Démarrer le traitement », « Clôturer… ») :
  - la clôture ouvre une modale qui demande la justification ou l'efficacité CAPA ;
  - la réouverture exige un motif ;
  - la fiche affiche l'historique des statuts (`JournalAnomalies.vue` l.248).

### 9. [Majeur] Missions : les dépendances et la clôture ne sont pas contrôlées
- **Route :** `/missions/:id`.
- **Constat :**
  - L'activité A3 peut passer « Terminée » alors que son prérequis A2 est « À faire », sans alerte.
  - La mission peut passer « Clôturée » avec 2 activités « À faire », sans confirmation.
  - Une fois clôturée, la mission reste éditable (« Ajouter » et « Lier » restent actifs).
  - Une dépendance créée ne peut pas être supprimée.

  Point positif : les messages d'auto-dépendance et de cycle sont clairs.
- **Preuve :** `SP/p9/01-dependances.png`, `SP/p9/02-a3-terminee.png`, `SP/p9/03-raisonner-contexte.png`.
- **Recommandation :**
  - avertir, voire bloquer avec dérogation motivée, quand un prérequis n'est pas terminé ;
  - afficher un badge « Bloquée par A2 » ;
  - demander confirmation à la clôture de la mission, avec la liste des activités ouvertes ;
  - passer la mission clôturée en lecture seule ;
  - ajouter une action « retirer la dépendance ».

  Fichier : `MissionWorkspace.vue` l.233 et l.273.

### 10. [Majeur] Fiche mission : débordement horizontal à 375 px
- **Route :** `/missions/:id` en 375 px.
- **Constat :** `scrollWidth` = 612 px pour une largeur visible de 375 px. Les lignes « Titre / Description / Ajouter » et « Activité dépendante / dépend de / Activité requise / Lier » ne passent pas à la ligne, et les boutons sortent de l'écran. `/executions`, `/anomalies` et `/tests` ne débordent pas.
- **Preuve :** `SP/p12/03-mission-375.png` ; sortie de `p12.mjs`.
- **Recommandation :** utiliser `flex-wrap: wrap` ou une grille en une colonne sous 600 px pour ces rangées (`MissionWorkspace.vue`, styles).

### 11. [Majeur] Horodatages au format américain dans un écran GxP en français
- **Route :** `/executions`.
- **Constat :** l'écran affiche « Démarrée le 9/25/2026, 8:06:51 PM » et « clôturée le 9/25/2026, 8:07:43 PM ». Le code appelle `toLocaleString()` sans locale, donc le format dépend du navigateur. Une date comme 05/06 devient ambiguë, ce qui nuit à la lisibilité ALCOA+.
- **Preuve :** `SP/p3/01-demarree.png`, `SP/p5/02-apres-cloture.png`.
- **Recommandation :** utiliser un formateur partagé en `fr-FR` (ou ISO 8601) qui indique le fuseau horaire (`ExecutionTests.vue` l.78, à généraliser).

### 12. [Majeur] Approbation d'un test et acceptation d'un candidat en un clic, sans identité ni date affichées
- **Route :** `/tests`.
- **Constat :** « Approuver » fait passer le test de Brouillon à Approuvé immédiatement (0 dialogue). La liste n'affiche que « Approuvé (2 étape(s)) », sans approbateur ni date. Les étapes du test approuvé ne sont pas consultables. « Accepter », « Rejeter » et « Besoin d'information » sur un candidat fonctionnent de la même façon.
- **Preuve :** `SP/p2/02-test-cree.png`, `SP/p2/04-couverture.png`.
- **Recommandation :**
  - demander confirmation avec un récapitulatif des étapes ;
  - afficher « Approuvé par X le … » ;
  - rendre le test dépliable pour voir ses étapes ;
  - exiger un motif pour « Rejeter ».

  Fichier : `DefinitionTests.vue`.

### 13. [Mineur] Conception des tests : 5 formulaires empilés, pas de « suite logique »
- **Route :** `/tests`.
- **Constat :** créer un test exécutable demande 5 formulaires et une vingtaine d'interactions. Chaque formulaire oblige à re-sélectionner le parent. La couverture redemande l'exigence déjà connue par la chaîne objectif → candidat → test. Après l'approbation, rien ne propose « Exécuter ce test ». Aucun message de succès n'apparaît : l'élément est simplement ajouté en bas.
- **Preuve :** `SP/p1/02-exig-creee.png`, `SP/p2/04-couverture.png`.
- **Recommandation :**
  - après chaque création, pré-sélectionner l'élément dans le formulaire suivant et y placer le focus ;
  - proposer la couverture pré-remplie avec l'exigence d'origine ;
  - ajouter un lien « Exécuter » vers `/executions?test=…` ;
  - afficher une confirmation toast accessible (`aria-live`).

### 14. [Mineur] Étapes de test : champs identifiés par leur seul placeholder
- **Route :** `/tests`, bloc « Étapes ».
- **Constat :** les champs « Action » et « Résultat attendu » n'ont qu'un placeholder, qui disparaît dès la saisie. Le bouton « Retirer » n'a pas de contexte (quelle étape ?). Les étapes ne sont pas numérotées.
- **Preuve :** `SP/p1/01-exig-vide.png`.
- **Recommandation :** ajouter des libellés visibles ou `aria-label="Action de l'étape n"`, numéroter les étapes, et nommer le bouton `aria-label="Retirer l'étape n"` (`DefinitionTests.vue`).

### 15. [Mineur] Boutons désactivés sans explication
- **Routes :** `/anomalies`, `/connecteurs-qms`, `/drive`.
- **Constat :** les boutons suivants sont grisés, sans indication du ou des champs manquants :
  - « Créer l'événement » ;
  - « Créer le connecteur » ;
  - « Tester la connexion » et « Sauvegarder maintenant » sur Drive (actifs seulement après « Enregistrer », ce qui n'est pas dit).
- **Preuve :** `SP/p6/01-anomalie-vide.png`, `SP/p10/01-drive-actions.png` ; sortie de `p10.mjs`.
- **Recommandation :** marquer les champs requis (astérisque et `aria-required`), et afficher sous le bouton « Renseignez le type et le titre » ou « Enregistrez d'abord la configuration ».

### 16. [Mineur] Drive : erreur technique en anglais
- **Route :** `/drive`.
- **Constat :** « Tester la connexion » avec un faux jeton affiche « Échec de connexion : Failed to fetch ». Le prérequis GitHub du miroir n'est signalé qu'après un clic sur « Sauvegarder maintenant ».
- **Preuve :** `SP/p10/02-drive-test-faux.png`.
- **Recommandation :** traduire le message en cause probable et action à mener (« Impossible de joindre Google Drive : vérifiez le jeton et l'identifiant du dossier »), et afficher le prérequis GitHub dès le chargement, avec un lien vers la configuration (`ConfigurationDrive.vue` l.129).

### 17. [Mineur] Chat IA : question perdue et badge « en ligne » trompeur
- **Route :** `/chat`.
- **Constat :** sans relais, la question envoyée disparaît : le champ est vidé et aucune bulle n'est affichée. Le badge « ● Assistant IA CLOUD » reste vert, car il se base sur `navigator.onLine` et non sur la configuration du relais. « Configuration › Relais IA » est écrit en texte, pas en lien. La zone de saisie n'a pas de libellé (placeholder seul).
- **Preuve :** `SP/p11/02-chat-envoi.png`.
- **Recommandation :** garder la question dans le champ en cas d'échec, passer le badge en état « non configuré » quand le relais manque, rendre la mention cliquable, et ajouter un `aria-label` au champ (`PanneauChat.vue` l.241).

### 18. [Mineur] Configuration IA : lisibilité et message d'état
- **Route :** `/ia`.
- **Constat :**
  - Les boutons radio des fournisseurs sont centrés, avec le libellé sous le bouton, ce qui rend l'association peu claire.
  - Le bouton d'acquittement affiche l'identifiant brut « openai ».
  - Un message rouge de type erreur s'affiche d'entrée pour un simple état (qualification requise).
  - « Résultat » est un texte libre (« ex. favorable ») au lieu d'une liste Favorable/Défavorable.
  - La validation native s'affiche en anglais.
- **Preuve :** `SP/p11/01-ia.png`.
- **Recommandation :** aligner chaque radio avec son libellé sur une ligne, afficher le nom lisible du fournisseur, présenter l'état comme une information (neutre ou avertissement) avec les étapes restantes, et proposer une liste fermée pour le résultat (`ConfigurationIA.vue`).

### 19. [Mineur] Connecteurs QMS : secrets demandés pour un adaptateur non implémenté
- **Route :** `/connecteurs-qms`, type « Veeva Vault ».
- **Constat :** l'écran annonce « adaptateur non implémenté », mais demande quand même DNS, nom d'utilisateur et **mot de passe**. L'utilisateur risque de stocker un secret qui ne servira à rien.
- **Preuve :** `SP/p10/03-qms-veeva-form.png`.
- **Recommandation :** pour les types non implémentés, désactiver les champs de secret (ou n'enregistrer que le nom et le type) et ajouter un badge « Bientôt disponible » dans la liste des types (`ConfigurationConnecteursQMS.vue`).

### 20. [Mineur] Validation native du navigateur en anglais, champs requis non signalés
- **Routes :** `/tests`, `/ia`.
- **Constat :** l'infobulle « Please fill out this field » apparaît au lieu d'un message en français, et aucun astérisque ne signale les champs obligatoires.
- **Preuve :** `SP/p1/01-exig-vide.png`, `SP/p11/01-ia.png`.
- **Recommandation :** utiliser `novalidate` avec des messages en français affichés en ligne, ou `setCustomValidity` en français, et une légende « * obligatoire ».

### 21. [Mineur] Procédures : écran sans contexte client, catégories brutes
- **Route :** `/procedures`.
- **Constat :**
  - Le titre est « Structuration de procédure », sans nom de client, contrairement aux autres écrans.
  - Aucune liste des procédures ni révisions existantes n'est visible.
  - Les sections sont typées avec des clés brutes « (objectif) » et « (procedure) ».
  - Les sous-étapes « 2.1 / 2.2 » ne sont pas détectées : « Aucune étape proposée ».
- **Preuve :** `SP/p11/03-procedure-proposition.png`, `SP/sweep/05-procedures.png`.
- **Recommandation :** utiliser un titre « Procédures — {client} », afficher la liste des SOP et révisions avant l'outil de structuration, traduire les types de section, et reconnaître les numérotations x.y comme des étapes (`RevueStructureProcedure.vue`).

### 22. [Amélioration] Cibles tactiles trop petites pour un usage terrain sur tablette
- **Routes :** `/executions`, `/missions/:id`, `/anomalies`, `/tests` (1024 et 375 px).
- **Constat :** tous les contrôles mesurés font moins de 44 px de haut (environ 34 px) : 18 sur 18 dans l'exécution, 15 sur 15 dans une mission. Le bouton « + Mesure » passe sur deux lignes. Le minimum WCAG 2.2 (24 px) est respecté, mais c'est juste pour un usage avec des gants ou debout.
- **Preuve :** sortie de `p12.mjs`, `SP/p12/01-exec-1024.png`, `SP/p5/01-avant-cloture.png`.
- **Recommandation :** prévoir un mode « terrain » ou une hauteur minimale de 44 px pour les contrôles de `.carte-execution`, et donner une largeur minimale à « + Mesure » (`white-space: nowrap`).

### 23. [Amélioration] La clôture n'est pas mise en avant visuellement
- **Route :** `/executions`.
- **Constat :** « Clôturer l'exécution » a le même style secondaire que « Consigner » ou « Enregistrer la preuve ». La section Clôture n'est pas séparée du reste. L'avertissement « étapes sans résultat » (orange, 14 px) est la seule alerte.
- **Preuve :** `SP/p3/01-demarree.png`.
- **Recommandation :** isoler la clôture dans un encadré distinct (bordure, icône cadenas, texte « Action définitive »), avec un bouton principal de style danger, qui ouvre la modale du constat 1.

### 24. [Amélioration] Identifiant client inexistant : formulaires actifs et UUID dans le titre
- **Route :** toutes celles du périmètre, avec un `clientId` inconnu.
- **Constat :** le titre affiche « Exigences et tests — 45110690-… », les formulaires restent utilisables et la console montre des 404 en série. Rien n'indique que le client n'existe pas.
- **Preuve :** `SP/sweep/01-tests.png` ; sortie de `sweep.mjs`.
- **Recommandation :** ajouter un garde de route (ou un état « Client introuvable ») qui renvoie vers la liste des clients (`router/index.ts`).

## Erreurs console
- Aucune erreur sur PharmaTest SA pendant les parcours, hormis `net::ERR_CERT_AUTHORITY_INVALID` lors du test Drive avec un faux jeton (attendu, sans relais réel).
- Sur un `clientId` inconnu : des 404 en série (voir constat 24).
