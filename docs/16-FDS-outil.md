# FDS — Spécification de conception fonctionnelle de l'outil ValidaPharm

| | |
|---|---|
| **Référence** | FDS-VALIDAPHARM-2026-001 |
| **Version** | 12 (dette explicitement acceptée résorbée : performance/capacité, lecteur d'écran, désinstallation/rollback — checklist §6ter) |
| **Statut** | En rédaction |
| **Catégorie GAMP 5** | Catégorie 5 (sur mesure) |
| **Documents de référence** | `01-URS-outil.md` v22, `02-analyse-de-risque-outil.md` v22, `03-specifications-fonctionnelles.md` v10, `17-revue-multi-experts-FDS.md` v01, `18-audit-swissmedic-FDS.md` v01, `19-audit-fda-FDS.md` v01, `20-audit-cabinet-conseil-GxP-FDS.md` v01, `21-audit-QA-specialises-FDS.md` v01 (closes) |
| **Rédigé par** | — |
| **Vérifié par** | — |
| **Approuvé par** | — |

---

## 1. Objet et méthode

La FS (v05) décrit **quoi** et **comment fonctionnellement** l'outil répond à chaque exigence URS. Cette FDS descend un niveau : elle décrit **l'expérience utilisateur et les algorithmes précis** — écrans, flux de navigation, machine à états complète, règles de validation champ par champ, formulation exacte des messages système — sans entrer dans l'implémentation technique (framework, base de données physique — relève de la SDS, §9).

Toute règle déjà énoncée en FS n'est pas reformulée ici sauf si elle nécessite une précision de niveau conception (ex. la FS dit "un bandeau nomme le fournisseur actif" ; la FDS précise le contenu exact et le déclenchement du bandeau).

## 2. Inventaire des écrans

| Écran | Rôle | Répond à |
|---|---|---|
| Tableau de bord / Vue portefeuille | Liste des projets, statuts agrégés, alertes | URS-F-070 à 073 |
| Fiche Projet | Contexte, portée, sections liées, vue de traçabilité, section Documents | URS-F-000 à 000nonies |
| Éditeur de section | Rédaction guidée d'un livrable (gabarit) | URS-F-001 à 009, 4.1bis |
| Panneau de suggestions | Idées de tests, sections manquantes — séparé du corps | URS-F-006/007 |
| Panneau Chat expert | Conversation, sélection fournisseur, bandeau d'avertissement | URS-F-030 à 037 |
| Bibliothèque de normes | Consultation/association de normes | URS-F-040/041 |
| Assistant de stratégie de qualification | Grille de critères, conclusion | URS-F-050 à 055 |
| Analyse de documents / Challenge de dossier | Chargement de document, constats affichés | URS-F-080 à 083 |
| Configuration client | Fournisseur IA, gabarit d'export, consentement télémétrie, qualification de fiabilité | `client_config` |
| Export | Choix de format, avertissements de blocage | URS-F-020 à 028ter |
| Journal d'anomalies *(ajouté v04 — audit QA spécialisés)* | Liste des anomalies constatées dans l'outil (hors moteur de calcul), statut de suivi | URS-NF-053 |
| Configuration des connecteurs QMS *(ajouté v05)* | Liste des connecteurs par client (Veeva/SAP/TrackWise), activation, tenant | URS-F-090 à 090ter |
| Structure Système *(ajouté v05)* | Arbre + graphe des `asset_node` d'un client, création/édition de nœud, vue graphique | URS-F-100 à 100quater |
| Dossier vivant d'un actif *(ajouté v05)* | Liste des livrables liés à un nœud, filtrable, export PDF | URS-F-101 à 101septies |
| Blocage d'incompatibilité de données *(ajouté v12)* | Écran plein affiché avant tout chargement si `schema_version` des données est postérieur à la version de l'application (message U-12) | URS-NF-055bis |

## 2bis. Charte graphique et identité visuelle *(ajouté v11 — répond à URS-NF-054 à 054quinquies, REV-URS-VALIDAPHARM-2026-010)*

**Principe directeur** : l'écran de travail et les livrables exportés obéissent à deux registres visuels volontairement distincts et jamais mélangés.
- **Écran de travail** : identité moderne, fluide, premium — c'est l'espace de rédaction quotidien, pas un document opposable.
- **Livrables exportés (Word/PDF)** : sobriété stricte, aucune trace de la personnalité visuelle de l'écran — ce sont eux qui sont présentés en audit (répond à URS-NF-054bis).

### Direction retenue : « Indigo premium + accents vifs »

**Palette — écran de travail**

| Rôle | Couleur | Usage |
|---|---|---|
| Fond principal (clair) | `#FFFFFF` / `#F7F7FB` | Fond de page, cartes |
| Fond principal (sombre, Should — non prioritaire Phase 1) | `#0B0E14` / `#12141C` | Mode sombre si implémenté *(clarifié v11 — revue FDS-charte, E7 : classé Should explicitement, pas laissé "optionnel" non tranché)* |
| Texte principal | `#0F1222` (clair) / `#EDEFF7` (sombre) | Corps de texte, titres — taille minimale équivalente 14px pour le corps *(ajouté v11 — revue FDS-charte, E4)* |
| Texte secondaire | `#5B5F73` (clair) / `#9BA0B8` (sombre) | Libellés, méta-informations |
| Marque (indigo) | `#4F46E5` | Actions primaires, liens, éléments actifs |
| Marque — survol | `#4338CA` | États hover/pressed |
| Marque — fond léger | `#EEF2FF` | Fonds de badges/sélections liés à la marque |
| Bordures | `#E4E4EE` (clair) / `#262A3A` (sombre) | Séparateurs, cadres de champs |

**Palette sémantique — `qualification_status` (répond à URS-NF-054ter/quater, mitige R-59)**

Chaque statut porte **une couleur ET une icône ET un libellé texte** — jamais la couleur seule. Contraste calculé (pas seulement visé) ≥ 4.5:1 (WCAG AA) sur fond blanc — **3 teintes sur 8 ont été corrigées suite à l'audit accessibilité dédié** (ratio initial < 4.5:1 pour Qualifié, Qualifié avec écart(s), Requalification requise — voir `docs/archive/revues-audits/charte-graphique/40-audit-accessibilite-charte-graphique.md`).

| Statut | Couleur | Icône (forme, pas seulement teinte) |
|---|---|---|
| Non qualifié | Gris `#6B7280` (ratio 4.83:1) | Cercle vide |
| En cours de qualification initiale | Bleu `#2563EB` (ratio 5.17:1) | Horloge |
| Qualifié | Vert `#15803D` (ratio 5.02:1 — *corrigé v11, audit accessibilité, initial `#16A34A` = 3.30:1*) | Coche |
| Qualifié avec écart(s) ouvert(s) | Ambre `#B45309` (ratio 5.03:1 — *corrigé v11, initial `#D97706` = 3.18:1*) | Point d'exclamation dans triangle |
| Requalification requise | Orange `#C2410C` (ratio 5.18:1 — *corrigé v11, initial `#EA580C` = 3.56:1*) | Flèche circulaire |
| Requalification en retard | Rouge `#DC2626` (ratio 4.83:1) | Triangle d'alerte plein |
| Suspendu — sous contrôle de changement | Violet `#7C3AED` (ratio 5.70:1) | Cadenas |
| Déclassé — retiré | Gris foncé `#374151` (ratio 10.29:1) | Croix dans cercle |

**Typographie (répond à URS-NF-054quinquies)**

| Contexte | Police | Justification |
|---|---|---|
| Écran de travail | Police système sans-serif moderne (ex. Inter, ou pile `system-ui` selon le framework retenu en SDS) | Lisibilité écran, cohérente avec l'identité "premium/fluide" |
| Documents exportés (Word/PDF) | Police classique à empattements (ex. Times New Roman / Georgia) | Cohérence avec l'usage réglementaire et l'attente visuelle d'un document officiel |

Le choix de police d'écran définitif reste ouvert au choix de framework (SDS §10) — cette FDS fixe l'intention (moderne, lisible, distincte de l'export), pas le fichier de police exact.

**Interactions (répond à URS-NF-054)**

- Transitions courtes (150-200ms), easing standard — jamais de rebond/overshoot prononcé (reste "premium sobre", pas "ludique enfantin").
- Retour visuel immédiat sur toute action (chargement, confirmation, erreur) — cohérent avec les messages système déjà spécifiés en §7.
- États vides (aucun projet, aucun nœud Structure Système) accueillants et orientés action (ex. bouton d'action visible directement), sans détourner l'attention d'un contexte professionnel.
- Densité d'information volontairement plus élevée qu'une application grand public (public professionnel expérimenté) — la fluidité vient de l'interaction, pas de l'espacement excessif.
- Coins arrondis modérés (≈8px), cohérents sur tous les composants (boutons, cartes, champs) — ni angles vifs (trop austère), ni très arrondis (trop ludique/enfantin).

**Accessibilité (répond à URS-NF-054ter/quater, R-59)**

- Aucune information fonctionnelle (statut, criticité, erreur/succès) n'est **jamais** encodée par la couleur seule — icône ou libellé texte systématiquement associé.
- Contraste texte/fond ≥ 4.5:1 pour le texte normal, ≥ 3:1 pour le texte large/les icônes porteuses de sens, sur les deux thèmes clair/sombre si le mode sombre est implémenté.
- La palette de statut ci-dessus a été choisie en évitant les paires rouge/vert isolées adjacentes sans distinction de forme (confusion deutéranopie/protanopie la plus fréquente) — chaque paire de statuts visuellement proches (ex. Ambre/Orange, Rouge/Violet) reste distinguable par l'icône associée.

**Clarifications de revue (v11 — revue multi-experts charte graphique)** :
- **E5** : la séparation écran/export (URS-NF-054bis) est garantie techniquement, pas seulement documentairement — aucun jeton de couleur/typographie de l'écran n'est importé par le moteur de génération d'export (détail SDS §7bis).
- **E3** : cette séparation ne couvre pas un contenu explicitement choisi par l'utilisateur (ex. capture d'écran insérée manuellement dans un livrable) — seule la génération automatique d'export est concernée par le principe de sobriété stricte.

## 3. Flux de navigation principaux

### 3.1 Création d'un projet et première section

```
Tableau de bord
   → [Nouveau projet] → Fiche Projet (nom, contexte, portée) créée, vide
   → [Ajouter une section] → Sélection dans le catalogue (§10 URS, familles A-M)
        → Langue de la section pré-remplie avec `project.language_default`, modifiable
          à la création uniquement (ajouté v02 — revue FDS, E5) — une fois la section
          créée, `section.language` est fixe (changer de langue en cours de rédaction
          équivaudrait à une re-rédaction, hors périmètre Phase 1)
   → Éditeur de section (statut initial : brouillon_aide)
   → Saisie des champs → sauvegarde auto continue
   → [Lier à une autre section] → sélection cible → lien créé, visible dans la vue de traçabilité
```

### 3.2 Cycle de vie d'une section — machine à états complète

```
                    ┌──────────────────┐
       (création)──▶│  brouillon_aide   │◀─────────────────────────────┐
                    └─────────┬─────────┘                              │
                               │ [Engager le cycle "validé en interne"]  │
                               │  garde : rôles renseignés (F-011)       │
                               │  garde : liens Contexte procédé/        │ [Rejet — motif
                               │  Métrologie/Maintenance requis           │  obligatoire]
                               ▼                                        │
                    ┌──────────────────┐                                │
                    │  en_verification  │────────────────────────────────┤
                    └─────────┬─────────┘  [Avis transmis à l'approbateur]
                               │ (F-014ter — pas d'arbitrage automatique) │
                               ▼                                        │
                    ┌──────────────────┐                                │
                    │  en_approbation   │────────────────────────────────┘
                    └─────────┬─────────┘
                               │ [Approbation par approver_final]
                               ▼
                    ┌──────────────────┐   [Créer une nouvelle révision]   ┌────────────────────┐
                    │ valide_en_interne │──────────────────────────────────▶│ (nouvelle section,  │
                    │   (verrouillé)    │                                   │  revisions[]+1)     │
                    └──────────────────┘                                   └──────────┬───────────┘
                                                                                        │
                                                                           reprend le cycle ci-dessus

     Chemin alternatif (§4.1bis) :
     (génération IA) ──▶ propose_par_ia_non_valide ──[validation section par section]──▶ brouillon_aide
```

**Chemin de rejet (ajouté v02 — revue FDS, E1)** : à tout moment durant `en_verification` ou `en_approbation`, un relecteur ou l'approbateur final peut rejeter la section — transition unique retour à `brouillon_aide`, avec **motif obligatoire** capturé dans `revisions[]` (`motif` déjà prévu dans le modèle FS §3, jusqu'ici jamais rendu obligatoire au niveau conception). Aucun statut "rejeté" distinct n'est introduit — le rejet ramène directement en rédaction, cohérent avec la priorité Phase 1 (URS-NF-043 : fiabilité du contenu avant automatisation du workflow).

**Règle de conception** : aucune transition n'est possible en dehors de ce diagramme — notamment, `propose_par_ia_non_valide` ne peut **jamais** transiter directement vers `en_verification`/`en_approbation`/`valide_en_interne` ; il doit obligatoirement repasser par `brouillon_aide` une fois toutes les sous-sections validées, pour garantir qu'aucun contenu IA n'entre dans le cycle d'approbation sans être devenu, techniquement, du contenu utilisateur validé.

### 3.3 Blocage de finalisation (garde-fous de liens)

À l'engagement du cycle "validé en interne" (transition `brouillon_aide` → `en_verification`), le système évalue dans l'ordre :
1. Si `template_type` ∈ {OQ, PQ, validation_procede} et aucun lien vers une section `contexte_procede` du projet → blocage, message U-01 (§7).
2. Si `template_type` = IQ et aucun lien vers une section `plan_metrologie` du projet → blocage, message U-02.
3. Si `template_type` = OQ (à la clôture, i.e. passage à `valide_en_interne`) et aucun lien vers une section `plan_maintenance` du projet → blocage, message U-03.
4. Si au moins une sous-section porte `propose_par_ia_non_valide` → blocage de l'export (pas de la transition de statut elle-même — l'export est bloqué séparément, §3.5).

**Justification de l'asymétrie des points 1-3 (ajoutée v02 — revue FDS, E6)** : les blocages Contexte procédé (point 1) et Métrologie (point 2) se déclenchent à la **finalisation** (entrée en `en_verification`), tandis que le blocage Maintenance (point 3) se déclenche à la **clôture** (passage à `valide_en_interne`). Ce n'est pas une incohérence : c'est un choix délibéré, aligné sur le texte URS-F-000nonies qui reprend explicitement Annexe 15 §3.12 (le plan de maintenance préventive est un livrable de clôture d'OQ, pas un prérequis de démarrage de sa vérification — contrairement au contexte procédé, nécessaire dès la conception des tests).

Chaque blocage propose un bouton "Forcer" avec **saisie d'un motif obligatoire** (ajouté v02 — revue FDS, E2, mitige AR-R-43), journalisé aux côtés de l'horodatage/acteur déjà prévus (§4.3bis FS) — sauf le blocage export IA-non-validé qui utilise son propre mécanisme de forçage déjà décrit en FS, désormais soumis à la même règle de motif obligatoire (voir §7, U-04).

### 3.4 Chat expert — flux détaillé

```
Ouverture du panneau Chat
   → Détection de connectivité (déjà en cache, rafraîchie avant chaque envoi)
   → Bandeau : "Fournisseur actif : {nom fournisseur} {[cloud] ou [local]}"
   → Si fournisseur cloud sélectionné mais version ≠ version qualifiée
        → Bandeau additionnel : "⚠ Ce fournisseur a changé de version depuis sa dernière
          qualification de fiabilité ({date}). Re-qualification recommandée avant usage réel."
   → Saisie de la question (texte libre)
   → [Joindre ce document à la question] (optionnel, action explicite)
        → Confirmation modale : "Le contenu de « {titre section} » sera transmis à {fournisseur}. Continuer ?"
   → [Envoyer]
   → Réponse affichée avec : citations (si pertinentes) + bandeau fixe "Aide, pas avis opposable"
   → Fin de session (fermeture panneau ou inactivité) → entrée journal (horodatage, fournisseur, moteur, document joint O/N)
```

### 3.5 Export — flux détaillé

```
[Exporter] (depuis Éditeur de section ou Fiche Projet pour export groupé)
   → Sélection format (Word / PDF / JSON / CSV-XLSX si tableaux dynamiques)
   → Vérification : sections ∈ sélection portant propose_par_ia_non_valide ?
        Oui → Modale de blocage, liste des sections concernées, bouton [Forcer l'export] (journalisé)
        Non → continue
   → Génération dans la langue de section (section.language)
   → Si statut = valide_en_interne → bandeau inclus dans le document exporté :
        "Validé en interne — pas une signature électronique opposable.
         La responsabilité de conservation réglementaire est transférée au système
         qualité du client dès la reprise formelle de ce document."
   → Téléchargement / sauvegarde locale
```

### 3.6 Résolution de conflit de fusion Git (ajouté v02 — revue FDS, E5, mitige AR-R-34)

```
Synchronisation vers Git (déclenchée manuellement ou après session)
   → Conflit détecté sur une section modifiée hors-ligne sur deux postes
   → Écran de résolution assistée (jamais de marqueurs Git bruts affichés) :
        Colonne gauche : version locale (ce poste)     Colonne droite : version distante (autre poste)
        Champ par champ divergent, avec horodatage de dernière modification de chaque côté
   → Pour chaque champ divergent : [Garder version locale] / [Garder version distante] / [Fusionner manuellement]
   → **(v03 — audit Swissmedic simulé, MAJ-01)** Pour un champ `tableau_dynamique` (ex. registre AMDEC) :
        résolution au niveau **ligne**, jamais au niveau du tableau entier — chaque ligne porte un
        identifiant stable ; les lignes non conflictuelles des deux côtés sont unies automatiquement
        (aucune perte), seules les lignes réellement en conflit (même identifiant, contenu divergent)
        passent par le choix local/distant/manuel décrit ci-dessus, cellule par cellule
   → [Confirmer la résolution] → nouvelle révision créée (revisions[]+1)
   → **(v03 — audit FDA simulé, MAJ-01)** Le motif de la révision n'est plus un texte générique :
        il capture, pour chaque champ/ligne en conflit, la décision retenue (locale / distante /
        valeur fusionnée) — cohérent avec le niveau de rigueur déjà appliqué au motif de forçage
        (§3.3/§7, URS-F-027bis)
   → jamais d'écrasement silencieux d'aucun des deux côtés
```

### 3.7 Journal d'anomalies (ajouté v04 — audit QA spécialisés, MAJ-01, mitige AR-R-44)

```
[Signaler une anomalie] (accessible depuis n'importe quel écran, bouton fixe)
   → Formulaire minimal : description (texte libre, obligatoire), écran/contexte concerné (pré-rempli)
   → [Enregistrer] → entrée créée, statut "ouvert", horodatée
Journal d'anomalies (écran dédié)
   → Liste triable/filtrable par statut (ouvert / en cours / clos)
   → [Changer le statut] → mise à jour, horodatée
```

Volontairement léger — pas un processus CAPA complet (celui-ci reste réservé au cas spécifique du moteur de calcul, §7 U-07) : une simple liste consultable, proportionnée à un usage mono-utilisateur Phase 1.

### 3.8 Connecteurs QMS tiers — flux pull/push (ajouté v05, répond à URS-F-090 à 092quater)

```
Configuration des connecteurs QMS (par client)
   → [Ajouter un connecteur] → type (Veeva Vault / SAP / TrackWise) + tenant + identifiants
   → Connecteur créé, inactif jusqu'à test de connexion réussi

Pull (depuis l'éditeur de section ou la fiche Projet)
   → [Importer depuis {connecteur}] → recherche dans le système tiers
   → Sélection d'un ou plusieurs champs/enregistrements à importer
   → Chaque champ importé prend le statut "proposé — non validé" (même traitement que §4.1bis FS)
   → Validation champ par champ obligatoire avant que le champ ne devienne du contenu officiel

Push (depuis une section valide_en_interne)
   → [Envoyer vers {connecteur}]
   → Modale de confirmation à trois niveaux : client + système + tenant, avec résumé du contenu
     transmis (référence, titre, statut, version) — ajouté v07, revue FS-v06 E3
   → [Confirmer] → envoi ; attente d'accusé de réception du système cible
   → Succès : section.external_submission renseigné, badge "En cours d'approbation externe —
     {système}, {date}" affiché en évidence sur la fiche du livrable
   → Échec réseau/timeout : aucun succès affiché, retry proposé avec le même transaction_id
     (idempotent, jamais de doublon côté système cible)
```

### 3.9 Structure Système — création, dossier vivant, statut (ajouté v05, répond à URS-F-100 à 102quinquies)

```
Configuration de la hiérarchie (ajouté v06 — revue FDS-v05, E5, préalable à tout usage)
   → À la première utilisation de la Structure Système d'un client : **(v10 — audit QA spécialisés)**
     un modèle par défaut est proposé (Site > Zone > Système > Équipement), entièrement
     modifiable/supprimable — réduit la friction de démarrage sans imposer de structure
   → Écran listant les niveaux (ajout/suppression/réordonnancement), libellé multilingue par niveau
        → **(v07 — audit Swissmedic simulé)** Suppression d'un niveau utilisé par au moins un
          nœud existant → bloquée, message explicite renvoyant vers un reclassement préalable
        → Renommage d'un niveau : ne casse aucune référence (les nœuds pointent vers la `key`
          technique du niveau, jamais vers son libellé affiché)
   → **(v09 — audit cabinet de conseil GxP)** La validation du schéma (unicité des `key` de
     niveau, cohérence structurelle) est un module de logique métier isolé et testable
     indépendamment de cet écran (§8bis)
   → [Enregistrer le schéma] → asset_hierarchy_schema du client créé/mis à jour

Structure Système (écran dédié, par client)
   → [Nouveau nœud] → sélection du niveau (selon asset_hierarchy_schema du client), nom, code
        → Vérification d'unicité du code → rejet explicite si doublon (message U-09)
        → [Lier à un parent] (arbre — vérification anti-cycle) et/ou
          [Associer à] (graphe libre — ex. une utilité desservant plusieurs systèmes)
   → Nœud créé, qualification_status par défaut = "Non qualifié"
   → [Marquer soumis à qualification périodique] → date limite de requalification saisie
        → statut basculé automatiquement en "Requalification requise"/"...en retard" selon échéance

Reparentage d'un nœud existant (ajouté v07, revue FS-v06 E5)
   → [Modifier le parent] → nouvelle vérification anti-cycle, journalisation, instantanés
     des livrables déjà liés non affectés
   → **(Clarifié v06 — revue FDS-v05, E5)** Le dossier vivant repose sur les liens directs
     section↔nœud/projet↔nœud, indépendants de la position hiérarchique — un reparentage
     ne modifie jamais le contenu d'un dossier vivant

Sélection d'un nœud à la création/liaison d'un projet
   → Recherche/liste des nœuds du client → sélection, ou [Créer à la volée] si absent
   → Si statut sélectionné = "Requalification en retard" ou "Suspendu" → avertissement
     explicite affiché (message U-10), sélection non bloquée

Dossier vivant (depuis la fiche d'un nœud)
   → Liste des livrables liés (hérités du projet + affinements section↔nœud), filtrée par
     défaut sur "validé en interne", regroupée par famille de gabarit, version courante
     en avant, historique par livrable accessible
   → [Inclure les brouillons] (filtre explicite, désactivé par défaut)
   → [Exporter en PDF] → synthèse chronologique complète (toutes occurrences validées),
     bandeau de périmètre des données couvertes, rappels standards (statut, transfert
     de responsabilité si applicable)
```

## 4. Détail du moteur de gabarits (déclaratif)

Un gabarit est défini par une structure JSON déclarative, versionnée indépendamment du moteur (URS-REG-003) :

```json
{
  "template_id": "change_control | urs | iq | ... (catalogue §10)",
  "template_version": "semver",
  "family": "A | B | C | D | E | F | G | H | I | J | K | L | M",
  "sections": [
    {
      "section_key": "string",
      "labels": { "fr": "…", "en": "…", "de": "…" },
      "fields": [
        {
          "field_key": "string",
          "type": "texte_court | texte_long | liste | date | nombre | tableau_dynamique",
          "required": "bool",
          "validation": "regex | plage | énumération | null",
          "calculated": "bool — si true, référence une formule du moteur (§5)"
        }
      ],
      "required_link_type": "contexte_procede | plan_metrologie | plan_maintenance | null"
    }
  ],
  "normes_associees": ["ref", "…"]
}
```

**Règle de conception** : le moteur de rendu ne connaît que ce schéma générique — ajouter un nouveau gabarit (ex. futur mini-outil "Validation du transport", catalogue §10 point restant) ne nécessite qu'un nouveau fichier de définition, jamais de modification du moteur.

## 5. Détail des algorithmes déterministes

| Algorithme | Formule/logique | Cas limites spécifiés |
|---|---|---|
| IPR (AMDEC/ICH Q9) | IPR = S × O × D | S,O,D ∈ [1,5] ou [1,10] selon échelle du gabarit ; valeurs vides → IPR non calculé, aucune erreur ; hors plage → rejet de saisie avant calcul |
| Grille de stratégie de qualification (URS-F-050) | Table de décision fermée : combinaison de réponses aux N critères ASTM E2500/Annexe 15 §43 → une conclusion parmi la liste fermée (§4.6 FS). **(Clarifié v02 — revue FDS, E4)** La table elle-même est un calcul réglementaire au sens URS-NF-001 : versionnée indépendamment (même principe que `template_engine_version`), couverte par des tests unitaires exhaustifs des combinaisons, et sa version est enregistrée dans les métadonnées de chaque section utilisant l'assistant. | Toute combinaison non couverte explicitement par la table → conclusion "Autre — à définir par l'expert", jamais d'extrapolation |
| Détection de dérive de version fournisseur (URS-F-032quinquies) | `session.engine_version ≠ qualification.version` → alerte | Absence de qualification préalable → activation bloquée en amont (pas un cas de "dérive", couvert par F-032quater) |
| Détection de liens manquants (§4.8 FS, F-082) | Parcours du graphe `project.links[]` ; pour chaque exigence-cible attendue par le gabarit (`required_link_type`), vérifie l'existence d'au moins un lien entrant du type requis | Lien existant mais vers une section non pertinente (erreur humaine) → non détectable algorithmiquement, reste sous constat IA non déterministe (F-082) |

## 6. Détail des règles de validation par type de champ

| Type de champ | Règle de saisie | Message d'erreur (gabarit générique) |
|---|---|---|
| Texte court | Longueur max définie par gabarit | "Ce champ ne peut dépasser {n} caractères." |
| Texte long | Aucune limite technique | — |
| Liste déroulante | Valeur ∈ énumération du gabarit | "Valeur non reconnue pour ce champ." |
| Date | Format ISO-8601, plage optionnelle définie par gabarit | "Date invalide ou hors plage autorisée." |
| Nombre | Plage définie par gabarit (ex. S/O/D ∈ [1,5]) | "Valeur hors plage ({min}-{max})." |
| Tableau dynamique | Ajout/suppression de ligne sans limite technique ; suppression demande confirmation si ligne non vide | "Confirmer la suppression de cette ligne ?" |

## 7. Formulation des messages système (garde-fous non négociables)

| Réf. | Déclencheur | Message exact |
|---|---|---|
| U-01 | Finalisation OQ/PQ/Validation de procédé sans Contexte procédé lié | "Cette section ne peut être finalisée sans lien vers une section Contexte procédé de ce projet." |
| U-02 | Finalisation IQ sans Plan de métrologie lié | "Cette section IQ ne peut être finalisée sans lien vers un Plan de métrologie/étalonnage de ce projet." |
| U-03 | Clôture OQ sans Plan de maintenance lié | "Cette section OQ ne peut être clôturée sans lien vers un Plan de maintenance préventive de ce projet." |
| U-04 | Export avec section(s) `propose_par_ia_non_valide` | "L'export est bloqué : {n} section(s) contiennent du contenu proposé par IA non validé. [Voir le détail] [Forcer l'export]" — **(v02)** le bouton [Forcer l'export] ouvre un champ de motif obligatoire (non vide) avant validation |
| U-05 | Activation fournisseur IA non qualifié | "Ce fournisseur ne peut être activé pour un usage réel : la qualification de fiabilité (échantillon versionné) est requise au préalable." |
| U-06 | Envoi cloud avec document joint | "Le contenu de « {titre} » sera transmis à {fournisseur}. Continuer ?" |
| U-07 | Défaut moteur corrigé | "{n} section(s) validées ont été produites avec la version {x} du moteur, aujourd'hui corrigée. Revue d'impact requise. [Voir la liste] [J'ai pris connaissance]" — **(v02 — revue FDS, E3, mitige AR-R-42)** modale bloquante (pas un bandeau ignorable) : le bouton "J'ai pris connaissance" est le seul moyen de la masquer, action journalisée avec horodatage |
| U-08 | Consentement télémétrie non accordé | Aucune télémétrie transmise ; état affiché en permanence dans Configuration client : "Télémétrie : non activée" / "activée depuis {date}" avec bouton de révocation immédiate |
| U-09 *(v05)* | Code de nœud dupliqué à la création | "Ce code est déjà utilisé par « {nom du nœud existant} ». Choisissez un code unique." |
| U-10 *(v05)* | Sélection d'un nœud en statut "Requalification en retard"/"Suspendu" | "⚠ Ce système/équipement est en statut « {statut} ». Vérifiez que cela est cohérent avec l'objet de ce projet avant de continuer. [J'ai compris, continuer]" — **(v06 — revue FDS-v05, E2)** clic actif requis pour masquer (non bloquant pour la sélection, mais jamais ignorable par un simple clic ailleurs). **(v08 — audit FDA simulé)** L'acquittement crée une entrée `project.audit_log` (qui, quand, quel nœud, quel statut au moment de l'acquittement) — valeur probante d'un avertissement de risque qualité réellement pris en compte |
| U-11 *(v05)* | Envoi push : confirmation | "Envoyer « {titre}, {référence} v{version} » vers {système} — {tenant} du client {client} ? [Annuler] [Confirmer]" |
| U-12 *(v12 — résorption de dette, URS-NF-055bis)* | Démarrage de l'application sur des données dont `schema_version` est postérieur à ce que cette version sait lire | Écran de blocage au démarrage (pas une simple modale sur l'écran principal, l'application ne doit pas exposer un état incohérent) : "Cette version de ValidaPharm ne peut pas ouvrir ces données — elles ont été créées ou migrées avec une version plus récente. Mettez à jour l'application avant de continuer, ou revenez à la version {x} pour les rouvrir." Aucune écriture n'a lieu avant confirmation de compatibilité. |

Chaque message est stocké comme ressource multilingue (fr/en/de dès Phase 1), jamais codé en dur dans une seule langue — cohérent avec URS-NF-040/040bis.

## 8. Accessibilité et multilingue — détail de conception

- Navigation clavier : ordre de tabulation logique par écran (haut→bas, gauche→droite), raccourcis `Ctrl+S` (sauvegarde manuelle immédiate) et `Échap` (fermeture de modale) sur toutes les vues — répond à URS-NF-050.
- RTL/CJK (URS-NF-040quater) : la mise en page utilise des propriétés logiques (`start`/`end` plutôt que `left`/`right`) dès la Phase 1, même si seuls FR/EN/DE sont livrés — pour ne pas nécessiter de refonte de layout à l'ajout de l'arabe/chinois.
- **Lecteur d'écran (ajouté v12 — résorption de dette, URS-NF-050bis)** : tout composant interactif (bouton, champ, lien) porte un nom accessible explicite (jamais une icône seule sans libellé programmatique) ; les badges de statut de qualification (FDS §2bis) exposent leur libellé texte complet, pas seulement leur icône visuelle ; toute confirmation/erreur affichée via les messages §7 est annoncée (zone dynamique de type live region) au moment de son apparition, pas seulement visible ; navigation par landmarks (zone principale, navigation, panneau latéral) sur les écrans à plusieurs zones (ex. Éditeur de section + Panneau de suggestions). Vérification par parcours manuel au lecteur d'écran standard (NVDA/VoiceOver) sur les parcours critiques URS-NF-050/050bis (navigation, saisie, export) — pas d'outil automatisé imposé, le choix d'outil dépend du framework retenu (SDS §10).
- **Performance perçue (ajouté v12 — résorption de dette, URS-NF-052bis)** : chargement du tableau de bord et ouverture d'une section restent sous 2 secondes perçues dans le volume de référence (500 projets/5000 sections, URS-NF-052) ; au-delà, chargement progressif ou pagination de la liste plutôt qu'un blocage — cohérent avec le principe "retour visuel immédiat" déjà posé en §2bis (aucune action sans feedback, même quand elle prend du temps).

## 8bis. Principe directeur pour la SDS (ajouté v04 — audit cabinet de conseil GxP, MAJ-01)

**Séparation logique métier / présentation, non négociable pour la SDS** : la logique testable de l'outil — moteur de calcul (§5), machine à états (§3.2), grille de décision de qualification, détection de liens manquants — DOIT être conçue comme un ensemble de fonctions/modules isolés, **testables indépendamment de toute interface graphique**. Aucun calcul ni transition d'état ne doit être écrit uniquement à l'intérieur d'un composant d'affichage. Ce principe n'est pas nouveau dans son intention (il découle directement de URS-NF-001/002, "tests unitaires dédiés"), mais devait être rendu explicite comme contrainte architecturale avant la rédaction de la SDS, pour ne pas devoir la corriger après coup.

## 9. Suite de la cascade documentaire

Cette FDS sert d'entrée à la **SDS** (architecture technique : choix de framework, schéma de base de données physique, contrats d'API précis avec Git/Drive/fournisseurs IA, mécanisme de résolution de conflit de fusion Git au niveau code). Aucun HDS (pas de matériel dédié) ni de Data Migration Plan (dépôt Git vierge, décision du 22/08/2026).

## 10. Matrice de traçabilité FS → FDS

| Section FS | Section FDS |
|---|---|
| §4.0 Gestion de projets | §2, §3.1, §3.3 |
| §4.1/4.1bis Rédaction/génération | §3.2, §4, §6 |
| §4.2/4.2bis Statuts/workflows | §3.2 |
| §4.3/4.3bis Export | §3.5, §7 (U-04) |
| §4.4 Chat expert | §3.4, §7 (U-05/U-06) |
| §4.6 Assistant qualification | §5 |
| §4.8 Analyse de documents | §5 |
| §5.1 Fiabilité (dérive moteur, conflit Git) | §3.6, §5, §7 (U-07) |
| §5.3 Sécurité (télémétrie) | §7 (U-08) |
| §5.5 Utilisabilité/multilingue | §8 |
| URS-NF-053 (journal d'anomalies) | §2, §3.7 |
| URS-F-090 à 092quater (connecteurs QMS) | §2, §3.8, §7 (U-11) |
| URS-F-100 à 102quinquies (Structure Système) | §2, §3.9, §7 (U-09/U-10) |
| URS-NF-054 à 054quinquies (charte graphique) | §2bis |
| URS-NF-052bis, 050bis, 055bis (perf/lecteur d'écran/rollback) | §8, §7 (U-12) |

---
*Document vivant, version 12 — v02-v04 : voir historique dans le corps du document. v05 intégrait les cinq besoins Structure Système/connecteurs QMS. v06 intégrait 3 clarifications de la revue multi-experts (REV-FDS-002). v07-v10 intègrent 4 constats d'audits (`AUDIT-SWISSMEDIC-005`, `AUDIT-FDA-005`, `AUDIT-CABINET-GXP-002`, `AUDIT-QA-SPECIALISES-002`). v11 intègre la charte graphique et identité visuelle (`REV-URS-VALIDAPHARM-2026-010`). **v12 résorbe les trois gaps mineurs actés comme dette explicitement acceptée au cadrage §6ter** : performance perçue chiffrée et lecteur d'écran détaillés en §8 ; écran et message U-12 de blocage au démarrage sur incompatibilité de schéma de données (protection réelle contre la corruption au rollback, mitige AR-R-60). FDS complète, prête pour la mise à jour de la SDS.*
