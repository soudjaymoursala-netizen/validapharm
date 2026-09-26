# Évaluation UX : évaluations et référentiel technique (ValidaPharm)

Parcours testé dans Chromium (1400 px et 375 px), client dédié « ux3-Laboratoire Évaluations » (id 8d7272fd-3d8d-4104-9bc6-d43efe3dec20). Données créées : 3 niveaux (Site → Ligne → Équipement), 4 nœuds, une relation, une périodicité en retard, une méthode ACFC v1 (3 questions), une méthode Impact v1 (2 questions), des évaluations avec « Inconnu », une évaluation CSV (GAMP 4), un paramètre et un CPP, un profil AMDEC 1–5 avec seuil 40, une ligne AMDEC avec son risque initial et résiduel, un process et une fonction.
Captures : `ux-evaluations/captures/` (chemin complet : `/tmp/claude-0/-home-user-validapharm/71f0c0b0-cc6a-5bb6-92ad-4f0b44957792/scratchpad/ux-evaluations/captures/`). Scripts : `s02` à `s11` dans le même dossier.

## Synthèse
La règle « jamais un verdict deviné » est bien appliquée à l'affichage : « Inconnu » sans « Oui » donne « À compléter » en ACFC comme en Impact, et c'est repris dans le Dossier vivant. En revanche, plusieurs failles fragilisent l'intégrité et la traçabilité :
- sur l'écran Impact, on peut modifier une réponse après l'enregistrement : le verdict affiché ne correspond plus à celui enregistré, alors que « Évaluation enregistrée. » reste affiché ;
- la conclusion ACFC (IQ+OQ+PQ, etc.) n'est jamais sauvegardée ;
- une ligne AMDEC sans notes plante sans aucun message ;
- un refus d'accès est présenté comme « Aucune méthode configurée ».
Le guidage entre écrans est faible : pas d'historique ACFC, un Dossier vivant sans liens et incomplet pour l'AMDEC, un arbre d'actifs affiché en liste plate. Côté accessibilité, le point principal concerne les groupes de boutons radio des questionnaires.

## Constats (par impact utilisateur)

### 1. Bloquant : une ligne AMDEC sans notes S/O/D échoue sans message
- **Écran** : `/clients/:id/risk-assessment`
- **Description** : le guide (§20) indique que S/O/D initiales sont facultatives. Si on crée une ligne en laissant ces trois champs vides, on obtient `POST …/risk-assessment/evaluations` → **400 `corps_invalide`**, suivi d'une exception non gérée (`[pageerror] Échec de la création de l'évaluation Risk Assessment : corps_invalide`) et d'un `[Vue warn] Unhandled error`. Rien ne s'affiche : le formulaire reste rempli et aucune ligne n'est créée.
- **Reproduction** : configurer un profil, remplir Étape et Mode de défaillance, laisser S/O/D vides, cliquer « Créer la ligne ».
- **Preuve** : `captures/06d-amdec-residuel-vide.png` (formulaire « ux3-Sans notes » toujours rempli, aucune ligne créée), sortie de `s06d.mjs`.
- **Recommandation** : dans `RiskAssessmentAmdec.vue` (`creerEvaluation`), convertir `''` en `null` pour `severiteInitiale`, `occurrenceInitiale` et `detectabiliteInitiale` (un `v-model.number` sur un champ vide renvoie `''`). Encadrer l'appel au store d'un `try/catch` qui renseigne `erreurCreation`.

### 2. Majeur : après l'enregistrement, le verdict affiché peut différer du verdict enregistré (Impact, et ACFC par le même mécanisme)
- **Écran** : `/impact-assessment`, `/strategie-qualification`
- **Description** : une fois l'évaluation enregistrée (« À compléter »), les boutons radio restent modifiables. Si l'on coche « Oui », l'écran affiche « Verdict : **Direct Impact** » juste au-dessus de « Évaluation enregistrée. », alors que l'historique indique « À compléter ». Dans un contexte GxP, l'écran laisse croire qu'un verdict a été enregistré alors qu'il ne l'a pas été.
- **Reproduction** : Impact → répondre Inconnu / Non → Enregistrer → changer Q1 en « Oui ».
- **Preuve** : `captures/05-impact-apres-save-modifie.png`.
- **Recommandation** : dans `ImpactAssessment.vue` et `AssistantStrategieQualification.vue`, passer le questionnaire en lecture seule (`disabled`) dès que `evaluationEnregistree` est vrai. Sinon, au premier changement, masquer la confirmation et proposer « Enregistrer comme nouvelle évaluation ».

### 3. Majeur : la conclusion de stratégie (complexité × verdict) n'est jamais enregistrée
- **Écran** : `/strategie-qualification`, Dossier vivant
- **Description** : le bouton « Enregistrer cette évaluation » se trouve dans l'étape 1, avant le choix Catalogue / Spécifique. La conclusion « IQ+OQ+PQ » (table de décision 0.2.0-provisoire) s'affiche, mais `enregistrerEvaluation` n'envoie ni la complexité ni la conclusion. Après rechargement, tout est perdu, et le Dossier vivant n'affiche que « ACFC — … : Critique ». C'est pourtant le livrable principal de l'écran.
- **Reproduction** : répondre « Oui » à une question → Enregistrer → choisir « Spécifique » → recharger la page, puis ouvrir le Dossier vivant du PLC.
- **Preuve** : `captures/04-acfc-conclusion.png`, `captures/08-dossier-plc.png`.
- **Recommandation** : placer l'enregistrement après l'étape complexité (ou ajouter un enregistrement de la conclusion) et persister `complexite`, `conclusion` et la version de la table. Afficher cette conclusion dans le Dossier vivant.

### 4. Majeur : l'écran ACFC n'a ni historique ni bouton « Nouvelle évaluation »
- **Écran** : `/strategie-qualification`
- **Description** : après l'enregistrement, le seul bouton visible est « Configurer une nouvelle version des questions ». Aucune liste « Évaluations enregistrées » n'apparaît, même après rechargement, alors qu'Impact et CSV en ont une, avec un bouton « Nouvelle évaluation ». Le consultant ne sait pas que faire ensuite et ne peut pas relire ses évaluations ACFC ailleurs que dans le Dossier vivant.
- **Preuve** : `captures/04-acfc-inconnu-enregistre.png`. Sortie `s04` : « boutons visibles: ['Configurer une nouvelle version des questions'] », « contient historique ? false ».
- **Recommandation** : reprendre dans `AssistantStrategieQualification.vue` le bloc « Évaluations enregistrées » et le bouton « Nouvelle évaluation » d'`ImpactAssessment.vue`.

### 5. Majeur : un refus d'accès (404) est présenté comme « Aucune méthode configurée », et l'enregistrement échoue sans message
- **Écran** : `/strategie-qualification` et `/risk-assessment`, avec le compte `consultant@…` sur un client auquel il n'a pas accès
- **Description** : les appels `GET /clients/:id`, `…/acfc` et `…/structure-systeme` renvoient **404**. L'écran affiche pourtant « Aucune méthode ACFC n'est configurée pour ce client » et invite à en saisir une. Le titre montre l'UUID brut. « Enregistrer cette version » provoque `POST …/acfc/profils` → 404, sans aucun message d'erreur.
- **Preuve** : `captures/10-consultant-strategie-qualification.png`, `captures/10-consultant-risk-assessment.png`, `captures/11-consultant-acfc-save.png`, sortie de `s11.mjs`.
- **Recommandation** : distinguer « introuvable ou accès refusé » de « liste vide » dans les stores (méthode ACFC, Impact, risque). Afficher un état d'erreur explicite (« Vous n'avez pas accès à ce client ») à la place du formulaire de configuration, et un `bandeau-erreur` quand l'enregistrement échoue.

### 6. Majeur : le Dossier vivant ne montre pas le résultat AMDEC et ne propose aucun lien
- **Écran** : `/structure-systeme/:noeudId/dossier-vivant`
- **Description** : la ligne AMDEC apparaît sous la forme « Risk Assessment / AMDEC (2026-09-25) », sans mode de défaillance, IPR ni verdict initial ou résiduel. Aucune évaluation n'est cliquable : le seul lien de la page est « ← Structure Système ». La chaîne technique (« ux3-PLC-01 ») n'est pas cliquable non plus. Il n'y a pas de section Paramètres / CPP / CQA, alors qu'un paramètre peut être rattaché à un nœud.
- **Preuve** : `captures/08-dossier-iso.png`, `captures/08-dossier-plc.png`.
- **Recommandation** : dans `DossierVivantActif.vue`, afficher pour l'AMDEC « mode — IPR initial X (verdict) → IPR résiduel Y (verdict) ». Faire de chaque évaluation un lien vers son écran, de chaque nœud de la chaîne un lien vers son dossier, et ajouter un bloc « Paramètres critiques rattachés ».

### 7. Majeur : le Dossier vivant n'indique pas une requalification en retard
- **Écran** : Dossier vivant, comparé à Structure Système et au Suivi de périodicité
- **Description** : l'isolateur affiche « Statut : Qualifié — Échéance 2026-01-15 » sans aucune alerte. Pour le même actif, la Structure affiche « ⚠ échéance de requalification dépassée » et le Suivi « En retard de 253 jour(s) ». La fiche censée être la plus complète est la seule muette.
- **Preuve** : `captures/08-dossier-iso.png` et `captures/08-suivi.png`.
- **Recommandation** : réutiliser `echeanceDepassee` (le calcul de `StructureSysteme.vue` et `SuiviPeriodicite.vue`) pour afficher le même badge, avec texte et icône, dans le bloc Identité.

### 8. Majeur : une nouvelle version de méthode repart d'un formulaire vide, et la méthode active n'est pas consultable
- **Écran** : ACFC, Impact (même principe pour le profil AMDEC)
- **Description** : « Configurer une nouvelle version des questions » ouvre Source et Questions vides : il faut tout ressaisir pour corriger une coquille, avec un risque de transcription contraire au « mot pour mot ». Aucun écran ne montre la méthode active (origine, date, liste des questions) ni l'historique des versions.
- **Preuve** : `captures/05-nouvelle-version-form.png`, `captures/10-acfc-nouvelle-version.png`. Sortie : `source= "" Q1= "" nb lignes= 2`.
- **Recommandation** : préremplir le brouillon avec la version active et ajouter un bloc repliable « Méthode active vN — source, origine, date, questions » ainsi que la liste des versions précédentes (`AssistantStrategieQualification.vue`, `ImpactAssessment.vue`, `RiskAssessmentAmdec.vue`).

### 9. Majeur (accessibilité) : les questionnaires ACFC et Impact ne forment pas de vrais groupes radio
- **Écran** : ACFC, Impact (CSV : attribut `name` manquant également)
- **Description** : les boutons radio n'ont pas d'attribut `name` (12 sur 12 en ACFC, 8 sur 8 en Impact, 8 sur 8 en CSV) et ceux d'ACFC et d'Impact ne sont pas dans un `fieldset` : la question est un `<p>`. Au clavier, chaque option devient un arrêt de tabulation (4 par question), les flèches ne fonctionnent pas et un lecteur d'écran n'annonce pas la question. Critères WCAG 1.3.1 et 4.1.2.
- **Preuve** : séquence Tab relevée par `s04` : `oui > non > inconnu > sans_objet > oui > …`. Sortie `s09` : `radiosSansNom:12, radiosHorsFieldset:12`.
- **Recommandation** : `<fieldset><legend>{{ question }}</legend>` avec `:name="question.id"` pour chaque question, dans `AssistantStrategieQualification.vue` (l. 253-260) et `ImpactAssessment.vue` (l. 222-229). Ajouter aussi `name` dans `ComputerSystemAssessment.vue`.

### 10. Majeur : l'AMDEC n'indique ni l'échelle ni le seuil, et n'affiche pas les notes S/O/D
- **Écran** : `/risk-assessment`
- **Description** : une fois le profil enregistré (1–5, seuil 40), l'échelle et le seuil n'apparaissent plus nulle part. Les champs S/O/D n'affichent ni plage ni aide, et l'IPR n'est pas calculé en direct. Une note hors échelle (7) est bloquée par l'infobulle native **en anglais** « Value must be less than or equal to 5. ». Chaque ligne affiche « IPR initial : 45 — Verdict : Action requise » sans les valeurs S/O/D ni le seuil de référence, et l'effet, la cause et le contrôle saisis ne sont pas affichés. Il n'y a pas de vue tabulaire pour comparer les lignes.
- **Preuve** : `captures/06d-amdec-residuel.png`. Sortie `s10` : `indication échelle dans le formulaire: false`.
- **Recommandation** : rappeler « Échelle 1–5 · seuil d'action IPR ≥ 40 » sous le titre et dans les libellés (« Sévérité (1–5) »). Afficher l'IPR calculé en direct et un message français personnalisé hors échelle. Présenter les lignes sous forme de tableau (Étape, Mode, S, O, D, IPR, Verdict, puis S′, O′, D′, IPR′, Verdict′), avec le détail repliable (effet, cause, contrôle).

### 11. Majeur : le formulaire d'action résiduelle n'a pas de libellés et ne donne aucun retour
- **Écran** : `/risk-assessment`, carte d'une ligne
- **Description** : Recommandation, Responsable et S/O/D résiduelles ne sont identifiés que par un placeholder, qui disparaît à la saisie. Il n'y a pas de `min`/`max`. Un clic sur « Enregistrer l'action résiduelle » avec des champs vides ne fait rien et n'affiche rien. Dans le code, `erreurAction` est unique et s'afficherait sur toutes les cartes à la fois. Le guide annonce aussi qu'aucune ressaisie n'est possible ensuite, mais rien ne prévient l'utilisateur avant l'enregistrement.
- **Preuve** : `captures/06d-amdec-residuel-vide.png`. Sortie `s06d` : « résiduel vide -> nb alerts visibles: 0 ».
- **Recommandation** : ajouter des `<label>` visibles, les bornes du profil, une validation avec message propre à chaque ligne (`erreurAction[e.id]`) et une confirmation « Définitif : l'IPR résiduel ne pourra plus être modifié ».

### 12. Majeur : Structure Système en liste plate alphabétique, peu lisible comme arbre
- **Écran** : `/structure-systeme`
- **Description** :
  - Les nœuds sont triés par nom (Isolateur, Ligne, PLC, Site) : la hiérarchie Site → Ligne → Équipement n'est pas visible.
  - Le niveau est affiché par sa clé brute (« equipement ») et non par son libellé « Équipement ». C'est le cas aussi dans le Dossier vivant et le Suivi.
  - Le sélecteur « Reparenter » n'a pas de libellé et s'affiche vide au lieu d'indiquer le parent actuel.
  - Les boutons « Enregistrer » (×4), « Reparenter » (×4), « Modifier » et « Supprimer » (×3) ont tous le même nom accessible.
  - À 375 px, le bouton « Reparenter » déborde de sa carte.
- **Preuve** : `captures/03b-apres-relation.png`, `captures/09-375-structure-systeme.png`. Sortie `s09` : `nonLab: [file, file, select-one ×4]`, `dup: Enregistrer 4, Reparenter 4…`.
- **Recommandation** : dans `StructureSysteme.vue` (l. 542-600), rendre la liste en arbre indenté (`role="tree"` ou listes imbriquées) et afficher le libellé du niveau. Initialiser `parentChoisi` avec le parent actuel et donner au sélecteur le libellé « Nouveau parent ». Rendre les noms uniques, par exemple `aria-label="Enregistrer la qualification de {nom}"`.

### 13. Mineur : les verdicts n'ont aucune distinction visuelle
- **Écran** : ACFC, Impact, AMDEC, Dossier vivant
- **Description** : « À compléter », « Critique », « Direct Impact », « Action requise » et « Acceptable » s'affichent tous en simple texte gras identique. On ne distingue pas d'un coup d'œil un verdict bloquant d'un verdict favorable, ni un « à compléter » d'un verdict réel.
- **Preuve** : `captures/04-acfc-inconnu-enregistre.png`, `captures/05-impact-historique.png`, `captures/06d-amdec-residuel.png`.
- **Recommandation** : créer un composant `BadgeVerdict` (icône, texte et couleur, sans que la couleur porte seule l'information) réutilisé sur les 4 écrans et dans `DossierVivantActif.vue`, avec un style « à compléter » bien distinct.

### 14. Mineur : libellés incohérents entre les écrans
- **Description** :
  - Réponse « Sans_objet » en ACFC, « Sans objet » en Impact : le code brut est affiché, avec `{{ opt }}` dans `AssistantStrategieQualification.vue` l. 258.
  - Barre latérale « Architecture » contre titre « Structure Système ».
  - « SITE ACTIF » pour un client.
  - Titres de section « 1. Évaluation ACFC — … », « Évaluation — … » et « Nouvelle ligne AMDEC — … ».
  - « ux3-SOP IA-002 v3 (v1) » mélange la version de la procédure et celle de la méthode.
  - Le lien retour « ← Clients » sur les écrans d'évaluation ramène à la liste des clients plutôt qu'à la fiche du client.
- **Preuve** : `captures/04-acfc-inconnu.png`, `captures/05-impact-apres-save-modifie.png`, `captures/02-structure-systeme.png`.
- **Recommandation** : utiliser un dictionnaire commun de libellés de réponses dans `i18n/libellesVerdictQuestionnaire.ts`, afficher « Méthode v1 — source : … » et faire pointer le retour vers `/clients/:id`.

### 15. Mineur : l'Impact Assessment n'a pas d'import `.txt`
- **Description** : le formulaire ACFC propose « Importer un fichier texte (une question par ligne) », celui d'Impact non. Le guide §17 annonce pourtant « import .txt possible ».
- **Preuve** : `captures/02-impact-assessment.png` comparée à `captures/02-strategie-qualification.png`.
- **Recommandation** : reprendre `importerQuestionsTexte` dans `ImpactAssessment.vue`, ou corriger le guide.

### 16. Mineur : les historiques Impact et CSV sont peu exploitables, et « À compléter » ne propose pas de suite
- **Description** : chaque entrée se réduit à une ligne « nom — verdict », sans date, auteur, version de méthode ni réponses. Une entrée « À compléter » ne propose pas de reprendre l'évaluation pour lever l'inconnu.
- **Preuve** : `captures/05-impact-historique.png`, `captures/06c-csv.png`.
- **Recommandation** : présenter un tableau (Date, Auteur, Élément, Nœud, Méthode vN, Verdict) avec une ligne dépliable pour les réponses, et une action « Réévaluer (nouvelle entrée) » préremplie sur les lignes « À compléter ».

### 17. Mineur : aucune aide à l'enchaînement Impact → ACFC → CSV → AMDEC
- **Description** : un verdict « Direct Impact » ou « Critique » ne propose aucune étape suivante (par exemple « Évaluer la criticité ACFC de ce système » avec le nœud prérempli). Le consultant doit connaître l'ordre de la démarche et ressaisir le système et le nœud sur chaque écran.
- **Preuve** : `captures/05-impact-historique.png`, `captures/04-acfc-conclusion.png`.
- **Recommandation** : ajouter un appel à l'action contextuel après le verdict (lien avec `?noeud=` pour préremplir), et depuis le Dossier vivant, des liens « Évaluer cet actif : Impact / ACFC / CSV / AMDEC ».

### 18. Mineur : le motif de numérotation n'a aucun effet visible
- **Description** : les niveaux ont été créés avec les motifs `S-{n}`, `L-{n}` et `EQ-{n}`, mais le champ Code reste vide après le choix du niveau, pour les 5 nœuds créés.
- **Preuve** : sortie `s03` : « code pré-rempli pour … = (vide) ».
- **Recommandation** : proposer le prochain code selon le motif dans `StructureSysteme.vue`, ou expliquer à quoi sert ce champ.

### 19. Mineur : la chaîne technique tracée omet le nœud de départ
- **Description** : « Tracer la chaîne depuis ux3-Isolateur ISO-01 » affiche « 1. est contrôlé par ux3-PLC-01 », sans sujet. Le Dossier vivant affiche la même chose.
- **Preuve** : `captures/03b-apres-relation.png`, `captures/08-dossier-iso.png`.
- **Recommandation** : afficher « ISO-01 → est contrôlé par → PLC-01 → … » avec des liens vers les dossiers.

### 20. Mineur : les formulaires refusent sans rien expliquer
- **Description** :
  - Enregistrer une méthode ACFC sans question ne produit ni message ni focus : seul le rappel initial reste affiché.
  - En CSV, le bouton « Enregistrer cette évaluation » reste désactivé sans indiquer ce qui manque.
  - Aucun champ obligatoire n'est signalé : 8 champs `required` sans indication sur Structure, 10 sur Paramètres critiques.
- **Preuve** : sortie `s04` (« save sans questions »), `captures/06c-csv-avant.png`, sortie `s09` (`requisSansIndication`).
- **Recommandation** : marquer les champs obligatoires (« * » et légende), afficher la liste des champs manquants près du bouton désactivé et un message d'erreur quand il n'y a aucune question.

### 21. Mineur : dates au format ISO
- **Description** : « 2026-01-15 », « (2026-09-25) » dans le Dossier vivant et le Suivi, au lieu de « 15/01/2026 ».
- **Preuve** : `captures/08-dossier-iso.png`, `captures/08-suivi.png`.
- **Recommandation** : utiliser un formateur `Intl.DateTimeFormat('fr-FR')` commun.

### 22. Mineur (accessibilité) : badges de périodicité
- **Description** :
  - Le badge « En retard » (rouge #DC2626 sur #FEF2F2, 12,5 px) a un contraste de **4,41:1**, sous le seuil AA de 4,5:1.
  - Le badge « ⚠ échéance dépassée » de la Structure porte `role="alert"` dans chaque ligne de liste : il est annoncé à chaque rendu, comme une interruption.
- **Preuve** : sortie `s08` (`contraste<4.5 suivi`), `captures/08-suivi.png`, `StructureSysteme.vue` l. 548.
- **Recommandation** : foncer la teinte (par exemple #B91C1C) et retirer `role="alert"` au profit d'un simple texte.

### 23. Mineur (responsive) : le bouton de menu mobile chevauche le contenu à 375 px
- **Description** : sur l'écran AMDEC, le bouton « ≡ » se superpose au bandeau ICH Q9.
- **Preuve** : `captures/06d-amdec-375.png`.
- **Recommandation** : réserver un espace en haut de page, ou intégrer le bouton dans un en-tête fixe (`CoquilleApplication.vue`).

### 24. Amélioration : Process et fonctions sans visibilité côté actif
- **Description** : une fonction peut être rattachée à un actif depuis Process, mais ce lien n'apparaît ni dans la Structure ni dans le Dossier vivant.
- **Preuve** : sortie `s09` (formulaire « Rattacher à l'actif »), `captures/09-process.png`, `captures/08-dossier-iso.png`.
- **Recommandation** : ajouter une section « Fonctions / process portés » au Dossier vivant.

## Points positifs observés
- Aucune question par défaut et rappel clair tant qu'aucune méthode n'est configurée.
- « À compléter — réponse « Inconnu » à lever » bien affiché et repris dans le Dossier vivant.
- Échelle AMDEC min ≥ max refusée avec un message explicite.
- Code de nœud en doublon refusé avec un message clair.
- Aucune erreur console pendant le parcours nominal (hors constats 1 et 5).
- Pas de défilement horizontal de la page à 375 px sur les 9 routes.
