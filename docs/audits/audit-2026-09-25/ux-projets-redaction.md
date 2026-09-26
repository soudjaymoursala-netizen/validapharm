# Audit UX : projets et rédaction de livrables (ValidaPharm)

Testé dans Chromium (Playwright) à 1400 px et 375 px, avec les comptes admin et consultant (lecteur). Le parcours complet a été fait : projet `ux2-Qualification autoclave A1` → section URS → saisie → vérification → approbation → « validée en interne » → exports JSON, Word, CSV et PDF. En plus : une section IQ (garde-fou de liaison, IA), l'assistant guidé, les templates, les plans, les normes, la résolution de conflit, l'archivage et le partage.
Captures : `scratchpad/ux-projets/shots/` · scripts : `scratchpad/ux-projets/s*.mjs` · exports : `scratchpad/ux-projets/dl/`.

## Synthèse
- Le parcours va bien jusqu'au bout. Mais **le tableau dynamique perd des caractères pendant la saisie** (bloquant), et **rien n'indique à l'utilisateur si son travail est enregistré**.
- Le **workflow de vérification et d'approbation est flou**. Un message d'erreur parle d'un « rédacteur » qu'aucun champ ne permet de saisir. « Rejeter » et « Forcer » sans motif ne donnent aucun retour. « Approuver » verrouille la section sans confirmation. Toutes les traces du workflow disparaissent une fois la section validée.
- Les **exports ne sont pas prêts à livrer** : codes internes (`non_fonctionnelle`, `must`) à la place des libellés, fichiers nommés par UUID, CSV mal lu par Excel en français.
- **L'éditeur de section** est nettement moins soigné que la fiche projet : colonne étroite, tableau tronqué, panneaux IA plus visibles que le contenu, références internes de spécification (§4.1bis, tâche #118) affichées.
- Aucune erreur console ni réseau pendant les parcours.

---

## Constats (du plus au moins impactant)

### 1. BLOQUANT : le tableau dynamique perd des caractères pendant la saisie
- **Écran** : `/projets/:id/sections/:id` (tableau « Exigences » de l'URS, valable pour tous les tableaux de gabarit).
- **Description** : la saisie « URS-002 » puis Tab puis « Traçabilité des cycles » est enregistrée « **ilité des cycles** ». Le début de la frappe est perdu. Au premier essai (remplissage rapide), la Description entière avait disparu après rechargement. Cause observée : chaque cellule s'enregistre sur `change` (quand on la quitte). L'enregistrement déclenche `recharger()`, qui redessine le tableau **pendant que l'utilisateur tape dans la cellule suivante**, et la valeur en cours est écrasée.
- **Reproduction** : section URS → « Ajouter une ligne » → taper un identifiant → Tab → taper vite une description → Tab → recharger la page.
- **Preuve** : sortie de `s7.mjs` (« B après reload : `URS-002 | ilité des cycles` ») ; `shots/s10-valide.png` (ligne 2 tronquée) ; `dl/…-exigences.csv`.
- **Recommandation** : `composants/RenduGabarit.vue` + `EditeurSection.vue` (`majTableGabarit` → `recharger()`). Ne pas réaffecter `section` quand la valeur vient d'une frappe locale, ou garder un état local du tableau et ne fusionner que la réponse du serveur. Ajouter un test e2e « saisie en rafale sur deux cellules ».

### 2. MAJEUR : aucun indicateur de sauvegarde, et la saisie en cours est perdue en quittant la page
- **Écran** : éditeur de section.
- **Description** : aucun « Enregistrement… » ni « Enregistré à 14:02 » n'apparaît, alors que cinq PUT partent pendant la saisie. Le texte tapé dans une cellule sans la quitter est perdu au F5 ou à la fermeture de l'onglet, sans avertissement (`beforeunload`).
- **Reproduction** : taper « (D) » dans une cellule puis F5 : le texte disparaît.
- **Preuve** : sortie de `s6.mjs` (« indicateur sauvegarde ? false ») et de `s7.mjs` (test D).
- **Recommandation** : un indicateur d'état persistant près du titre (Modifications non enregistrées / Enregistrement… / Enregistré · heure / Échec, réessayer), une sauvegarde temporisée sur `input` (pas seulement `change`), et un garde `beforeunload` / `onBeforeRouteLeave` tant qu'une écriture est en attente.

### 3. MAJEUR : « Approuver » verrouille la section sans confirmation
- **Écran** : éditeur, statut « En approbation ».
- **Description** : un seul clic sur « Approuver » passe la section en « Validé en interne » et la verrouille (« nouvelle révision : backlog »). Aucune modale ni aucun récapitulatif. C'est l'action la plus lourde du cycle.
- **Reproduction** : amener une section en approbation → « Approuver ».
- **Preuve** : `s10.mjs` (« Dialog de confirmation à l'approbation ? aucun ») ; `shots/s10-en-approbation.png` → `s10-valide.png`.
- **Recommandation** : une modale de confirmation qui récapitule l'approbateur, les avis et le verrouillage à venir, avec la mention « pas une signature électronique opposable ». Réutiliser le motif de `ModaleConfirmationArchivage.vue`.

### 4. MAJEUR : workflow déclaratif, sans lien avec les comptes ni séparation des rôles
- **Écran** : bloc Workflow de l'éditeur.
- **Description** : « Identifiant approbateur final » et « Identifiant relecteur » + « Avis » sont du texte libre (`qa-1`, `revu-1`). Le rédacteur (admin) les saisit lui-même, puis transmet et approuve seul. Les boutons « Transmettre » et « Approuver » s'affichent pour tout éditeur, quel que soit l'approbateur désigné. L'utilisateur peut croire à un vrai circuit de relecture.
- **Preuve** : `shots/s10-en-approbation.png` ; `dl/…json` (`"approver_final": "qa-1"`, avis `revu-1` daté, saisi par le rédacteur).
- **Recommandation** : choisir les relecteurs et l'approbateur parmi les utilisateurs du projet (liste déroulante). N'activer « Approuver » que pour l'approbateur désigné, ou afficher clairement « Saisie déclarative : l'avis n'est pas émis par le relecteur lui-même ».

### 5. MAJEUR : le contenu reste modifiable « En vérification » et « En approbation »
- **Écran** : éditeur.
- **Description** : après l'ajout d'un avis favorable, le tableau reste modifiable. On peut changer le contenu après la relecture, et l'avis reste affiché comme s'il portait sur la version actuelle.
- **Preuve** : `s10.mjs` (« Tableau éditable en vérification ? true »).
- **Recommandation** : verrouiller le contenu pendant ces deux statuts, ou marquer les avis « antérieurs à la dernière modification » et exiger une nouvelle relecture.

### 6. MAJEUR : messages de blocage incompréhensibles ou figés
- **Écran** : bloc Workflow.
- **Description** : (a) « Le rédacteur et l'approbateur final doivent être renseignés » alors qu'**aucun champ “rédacteur” n'existe**, et le message n'indique pas quel champ remplir. (b) Le message de blocage reste affiché après d'autres actions : « Au moins un avis de relecteur est requis… » reste visible après un clic sur « Rejeter ». (c) Il n'est pas relié au champ concerné (`aria-describedby`, focus).
- **Preuve** : `shots/s8-engager.png`, `shots/s9-rejeter.png`.
- **Recommandation** : message U-13 (`i18n/messages.ts`) → « Désignez l'approbateur final (champ ci-dessus) », avec focus sur le champ. Effacer le message à chaque nouvelle action.

### 7. MAJEUR : « Rejeter » et « Forcer » sans motif ne donnent aucun retour
- **Écran** : éditeur (En vérification ; blocage de l'IQ).
- **Description** : les deux boutons ont l'air actifs. Sans motif, le clic ne fait rien : pas de message, pas de focus sur le champ. Le champ « Motif de rejet » est aligné à côté de « Transmettre », ce qui mélange deux décisions opposées.
- **Preuve** : `shots/s9-rejeter.png`, `shots/s16-iq-forcer.png` (texte identique avant et après le clic).
- **Recommandation** : message en ligne « Un motif est obligatoire » avec focus sur le champ (ou bouton désactivé avec explication). Regrouper « Rejeter + motif » dans un bloc distinct, séparé visuellement de l'action positive.

### 8. MAJEUR : les exports Word et CSV contiennent des codes internes
- **Écran** : Export (éditeur).
- **Description** : dans le `.doc` comme dans le `.csv`, Type, Priorité et Critique sortent en `non_fonctionnelle`, `must`, `oui` au lieu de « Non fonctionnelle », « Doit (Must) », « Oui ». Le Word n'inclut ni les avis des relecteurs ni la date d'approbation, et « Référence : — » s'affiche sans qu'aucun champ Référence ne soit visible dans l'éditeur.
- **Preuve** : `dl/8ef2a60c-…doc`, `dl/…-exigences.csv` ; sortie de `s11.mjs`.
- **Recommandation** : `logique-metier/export/genererExportWord.ts` et l'export CSV (`EditeurSection.vue` l. ~497) doivent traduire les valeurs d'options via la définition du gabarit. Ajouter les champs Référence et Version dans l'éditeur, et un tableau « Relecture / approbation » dans le Word.

### 9. MAJEUR : fichiers exportés mal nommés et mal formatés
- **Description** : les noms de fichiers sont des UUID (`8ef2a60c-f7b5-….doc`) dès que `meta.ref` est vide, ce qui est toujours le cas faute de champ pour le remplir. Le « Word (.doc) » est en réalité du HTML : Word affiche un avertissement de format. Le CSV utilise la virgule sans BOM UTF-8 : Excel en français affiche tout dans une seule colonne et casse les accents (« Priorité », « °C »).
- **Preuve** : `file dl/*` (« HTML document », « UTF-8 text » sans BOM).
- **Recommandation** : nom du type `{type}_{titre-slug}_v{version}.docx`. CSV avec `;` + BOM, ou choix du séparateur. Remplacer le libellé par « Word (HTML compatible) », ou proposer le `.docx` réel par défaut (le moteur de gabarit existe déjà).

### 10. MAJEUR : tableau dynamique tronqué, colonnes et bouton « Supprimer » hors de vue
- **Écran** : éditeur, 1400 px et 375 px.
- **Description** : la colonne de contenu est bloquée à 640 px alors que l'écran laisse environ 400 px vides à droite. Le tableau fait 965 px (1006 px sur mobile) : « Priorité », « Critique » et « Supprimer » ne sont atteignables que par un défilement horizontal discret. La Description, simple champ sur une ligne, coupe le texte (« 121 °( »).
- **Preuve** : `shots/s6-ligne-remplie.png`, `shots/s10-valide.png`, `shots/s19-editeur.png` ; mesures de `s11.mjs` (`table-scroll sw=966 cw=640`).
- **Recommandation** : élargir la colonne de l'éditeur à la largeur disponible. Descriptions en `textarea` qui s'agrandit. Sur mobile, présenter chaque ligne comme une carte. Indicateur visible de défilement horizontal (`RenduGabarit.vue`).

### 11. MAJEUR : hiérarchie de l'éditeur, le contenu est noyé et le cycle de vie n'est pas lisible
- **Écran** : éditeur.
- **Description** : le contenu du livrable (un tableau) occupe environ 150 px, puis suivent environ 1500 px de panneaux IA, assistant, liens et liens structurels. Le Workflow et le bouton « Engager le cycle » sont tout en bas. Le statut n'est qu'une ligne de texte grise (« URS — statut : … »), sans badge ni étapes. La mise en page est brute comparée à la fiche projet : libellés alignés en bas à gauche de textareas, deux titres « Exigences / Exigences ».
- **Preuve** : `shots/s5-editeur.png`, `shots/s6-ligne-remplie.png`.
- **Recommandation** : un bandeau d'en-tête fixe avec des étapes (Brouillon → Vérification → Approbation → Validé), une pastille de statut (`PastilleStatutSection.vue`) et l'action suivante. Panneaux IA et liens repliés ou en colonne latérale. Réutiliser les cartes de `FicheProjet.vue`.

### 12. MAJEUR : garde-fou de liaison déclenché dès « Engager », sans raccourci pour le résoudre
- **Écran** : éditeur d'une section IQ.
- **Description** : « Cette section IQ ne peut être finalisée sans lien vers un Plan de métrologie… » apparaît dès l'entrée en vérification, pas à la finalisation. Aucun bouton « Lier maintenant » ou « Créer le Plan de métrologie ». Le bloc « Lier à » se trouve environ 600 px plus haut, et sa liste ne contient aucun Plan de métrologie. Seule issue visible : « Forcer ».
- **Preuve** : `shots/s16-iq-engager.png`.
- **Recommandation** : afficher les prérequis dès le brouillon (liste à cocher), avec des actions directes : lier une section existante ou créer la section manquante (préremplie avec le bon gabarit).

### 13. MAJEUR : après validation, plus aucune trace du workflow
- **Écran** : éditeur, statut « Validé en interne ».
- **Description** : le bloc Workflow disparaît entièrement : approbateur, avis et date d'approbation ne sont plus visibles. Il reste « Section verrouillée … Nouvelle révision : backlog. », un jargon qui mène à une impasse (pas de bouton de nouvelle révision).
- **Preuve** : `shots/s10-valide.png`.
- **Recommandation** : garder un récapitulatif en lecture seule (qui a rédigé, relu et approuvé, et quand). Remplacer « backlog » par un texte clair (« La création d'une nouvelle révision n'est pas encore disponible ») ou par l'action elle-même.

### 14. MAJEUR : un lecteur voit « Créer cette section » actif, et le clic ne fait rien
- **Écran** : `/projets/:id` connecté en consultant (partagé en lecture).
- **Description** : le bandeau « Lecture seule » s'affiche bien, mais le bouton « Créer cette section » du pipeline reste actif. Le clic ne produit rien : ni message ni navigation.
- **Preuve** : `shots/s13-lecteur-creer.png`, sortie de `s13.mjs`.
- **Recommandation** : masquer ou désactiver le bouton quand l'utilisateur ne peut pas modifier (`PipelineQualification.vue`, prop `peutModifier`).

### 15. MAJEUR (accessibilité) : la modale d'archivage ne gère pas le focus
- **Écran** : `/projets/:id` → « Archiver ce projet ».
- **Description** : `role=dialog aria-modal=true` est présent, mais le focus reste sur le bouton de la page. Tab parcourt la page derrière (focus arrivé sur « DQ »), et Échap ne ferme pas la modale.
- **Preuve** : sortie de `s20.mjs` ; `shots/s20-modale-archiver.png`.
- **Recommandation** : `ModaleConfirmationArchivage.vue` (et `ModaleSuppressionDefinitive.vue`) : focus sur le premier champ à l'ouverture, focus bloqué dans la modale, fermeture par Échap, retour du focus sur le déclencheur.

### 16. MINEUR : créer une section vierge ne mène pas à l'éditeur
- **Écran** : `/projets/:id` → « Ajouter une section » → « Créer la section vierge ».
- **Description** : l'utilisateur reste sur la fiche, sans message de succès. Il doit repérer la section dans la liste, environ 1500 px plus bas. À l'inverse, la création d'un projet et le mode « À partir d'un document » redirigent. « Créer cette section » (pipeline) ouvre seulement le formulaire, sans créer.
- **Preuve** : sortie de `s4.mjs` (« pas de redirection »).
- **Recommandation** : rediriger vers l'éditeur de la nouvelle section (`FicheProjet.vue`). Depuis le pipeline, préremplir le titre et le gabarit.

### 17. MINEUR : références internes de spécification affichées
- **Description** : « (§4.1bis) », « (§4.21) », « (§4.8) » et « (tâche #118) » apparaissent dans les titres et les textes d'aide.
- **Preuve** : `shots/s5-editeur.png`, `shots/s3-form-section.png`.
- **Recommandation** : les supprimer : `FicheProjet.vue` l. 542 et 653 ; `EditeurSection.vue` l. 799, 872 et 970.

### 18. MINEUR : libellé de statut incohérent
- **Description** : le pipeline affiche « **Validée** en interne » (abrégé, au féminin), alors que la liste et l'éditeur affichent « Validé en interne — pas une signature électronique opposable ». Le guide exige ce libellé complet partout.
- **Preuve** : sortie de `s12.mjs` (pipeline « URS / Validée en interne »).
- **Recommandation** : `PipelineQualification.vue` l. 90 doit utiliser le libellé de statut commun.

### 19. MINEUR : fiche projet, sections repoussées en bas de page et pipeline tronqué
- **Description** : Contexte, Phase et Partage (lecture rare) passent avant Progression et Sections (usage quotidien). Les sections commencent vers 1500 px à 1400 px de large. Le pipeline est coupé à droite (« Validatio / Non démarr ») à 1400 px et déborde à 375 px. Le bouton « Suspendre » n'a aucune explication.
- **Preuve** : `shots/s2-fiche.png`, `shots/s3-form-section.png`, `shots/s19-fiche.png`.
- **Recommandation** : placer Progression et Sections juste sous l'en-tête. Replier Contexte et Partage. Pipeline qui passe à la ligne ou défile avec des indicateurs. Infobulle sur « Suspendre ».

### 20. MINEUR : contrastes des boutons actifs et désactivés
- **Description** : « Ajouter une section » ouvert, ou au focus, affiche un texte bleu foncé sur fond bleu, illisible. Les boutons désactivés (« Lier », « Poser la question », « Générer le brouillon ») sont en blanc sur violet pâle, sous 4,5:1, et sans raison indiquée.
- **Preuve** : `shots/s3-form-section.png`, `shots/s8-engager.png`.
- **Recommandation** : corriger l'état `:active` / `[aria-expanded=true]` du bouton principal. Pour les boutons désactivés, un texte d'aide (« Choisissez une section »).

### 21. MINEUR : partage accepté avec une adresse sans compte, sans confirmation
- **Écran** : bloc Partage.
- **Description** : `inconnu-ux2@exemple.com` est ajouté sans avertissement ; aucun message de succès. Le champ email et le niveau d'accès n'ont pas de libellé.
- **Preuve** : `shots/s12-partage.png`, sortie de `s12.mjs`.
- **Recommandation** : avertir « aucun compte avec cette adresse », afficher un message de confirmation, ajouter des `label`s visibles ou `aria-label`.

### 22. MINEUR (accessibilité) : champs sans nom accessible
- **Description** : les cellules du tableau dynamique (5 champs par ligne, sans libellé), le sélecteur de phase, l'email et le niveau de partage, la question de l'assistant, le « Nom du gabarit à importer », et sur `/normes` un champ texte, un mot de passe et deux boutons sans nom.
- **Preuve** : sortie `A11Y` de `s2`, `s6` et `s17.mjs`.
- **Recommandation** : `aria-label="{colonne} ligne {n}"` dans `RenduGabarit.vue`, et des `label`s pour les autres champs.

### 23. MINEUR : assistant guidé, pastilles muettes et étapes vides en série
- **Écran** : `/projets/:id/assistant-livrable`.
- **Description** : 9 pastilles numérotées, sans intitulé ni `aria-current`. Pour un client sans données, les étapes 3 à 8 disent chacune « Aucun … pour l'instant » : six clics « Suivant » sans rien à faire, et aucun lien pour créer le contexte manquant.
- **Preuve** : `shots/s17-assistant.png`, sortie de `s18.mjs`.
- **Recommandation** : intitulés courts sous chaque pastille, `aria-current="step"`, regrouper les étapes vides (« 6 sources de contexte vides — les renseigner / continuer »), et un lien vers chaque écran source (`AssistantCreationLivrable.vue`).

### 24. MINEUR : IA non configurée, l'utilisateur ne l'apprend qu'après avoir tout rempli
- **Écran** : éditeur (génération par adaptation, assistant contextuel).
- **Description** : les panneaux sont affichés et utilisables et annoncent « Fournisseur actuel : Assistant IA ». Ce n'est qu'après avoir rempli le texte, le nom et la case de droits qu'apparaît « Relais IA non configuré : renseignez son URL dans Configuration › Relais IA », sans lien.
- **Preuve** : `shots/s15-gen-erreur.png`, `shots/s15-assistant-erreur.png`.
- **Recommandation** : vérifier la configuration au chargement, afficher un bandeau avec un lien vers `/configuration`, et désactiver les champs.

### 25. AMÉLIORATION : formulaire de création de projet et mobile
- **Description** : aucune marque de champ obligatoire sur « Nom du projet ». La bulle de validation native est la seule indication, et elle s'affiche dans la langue du navigateur. Aucun champ « échéance », alors que la fiche prévoit d'en afficher une. À 375 px, le bouton de menu flottant recouvre le contenu.
- **Preuve** : `shots/s1-tdb-form-vide.png`, `shots/s19-iq-workflow.png`.
- **Recommandation** : astérisque et `aria-required`, message de validation en français, champ échéance dans `TableauDeBord.vue`, marge haute de `main` sur mobile.

---
*Données créées : projets `ux2-Qualification autoclave A1` (sections `ux2-URS autoclave`, validée ; `ux2-IQ autoclave`, brouillon, dont le champ Conclusion a été rempli par erreur avec du texte de test) et `ux2-Projet à archiver` (suspendu, modale d'archivage fermée sans archiver). Partages ajoutés sur le projet ux2 : consultant et inconnu-ux2@exemple.com, en lecture. Le projet P-200 n'a pas été modifié.*
