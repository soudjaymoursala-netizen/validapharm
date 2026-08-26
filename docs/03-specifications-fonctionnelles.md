# FS — Spécifications fonctionnelles de l'outil ValidaPharm

| | |
|---|---|
| **Référence** | FS-VALIDAPHARM-2026-001 |
| **Version** | 22 (ajout §4.13/URS-F-130 — exécution d'un Test approuvé, Phase 7b, 25/08/2026 — cohérent avec URS v32). Version 21 : ajout §4.12/URS-F-120 — chaîne de définition Requirement → TestObjective → TestCandidate → Test, Phase 7a, 25/08/2026 — cohérent avec URS v31). Version 20 : intégration des exigences manquantes, 25/08/2026 : ajout §4.6quater/URS-F-058 — Parameter/CriticalParameter/CPP/CQA, Phase 2, oublié au moment de son implémentation — et §4.11/URS-F-110 — Quality Events, Phase 5 — cohérent avec URS v30. Version 19 : ajout §4.10bis/URS-F-103, Phase 4. Version 18 : §4.6 corrigé, ajout §4.6bis/§4.6ter, Phase 1/3) |
| **Statut** | En rédaction |
| **Catégorie GAMP 5** | Catégorie 5 (sur mesure) pour le moteur de gabarits, le routeur IA et la synchronisation ; catégorie 3/4 pour les composants tiers (bibliothèques, modèle local) |
| **Documents de référence** | `01-URS-outil.md` v23, `02-analyse-de-risque-outil.md` v23, `00-cadrage-projet.md` v3, `13-revue-multi-experts-FS.md` v01, `14-audit-swissmedic-FS.md` v01, `15-audit-fda-FS.md` v01, `31-revue-multi-experts-FS-v06.md` v01, `32-audit-swissmedic-FS-v07.md` v01, `33-audit-fda-FS-v07.md` v01 (closes) |
| **Rédigé par** | — |
| **Vérifié par** | — |
| **Approuvé par** | — |

---

## 1. Objet et méthode

Ce document décrit **comment** l'outil ValidaPharm répond à chaque exigence de l'URS v22, à un niveau de conception fonctionnelle (pas d'implémentation détaillée — celle-ci relève de la Spécification de conception, §12). Il sert de pont entre l'URS et :
- le développement (chaque section ci-dessous doit pouvoir être implémentée sans retour à l'URS pour une clarification de fond) ;
- les tests OQ de l'outil (chaque comportement décrit ici doit être testable et correspondre à un ou plusieurs cas OQ) ;
- la matrice de traçabilité (§13).

Toute exigence URS n'ayant pas de section FS correspondante est un défaut de cette FS, à corriger avant que la FS puisse être considérée close. Réciproquement, toute capacité décrite ici sans exigence URS d'origine doit être questionnée (dérive de périmètre) — cf. principe fondateur n°6 du cadrage (rigueur en amont pour limiter les changements après conception).

Ce document ne couvre pas le contenu réglementaire détaillé de chaque type de gabarit (ex. ce que doit contenir un protocole IQ) — celui-ci reste porté par les gabarits eux-mêmes et leur propre traçabilité normative (catalogue URS §10).

## 2. Vue d'ensemble du système (Phase 1)

```
┌──────────────────────────────────────────────────────────────────────┐
│           ValidaPharm — application web pure, aucune installation       │
│           (PWA, navigateur uniquement — décision v11, 23/08/2026)        │
│                                                                          │
│  ┌─────────────┐ ┌──────────────┐ ┌────────────┐ ┌──────────────────┐ │
│  │ Gestion de   │ │ Moteur de     │ │ Routeur IA │ │ Bibliothèque de   │ │
│  │ projets      │ │ gabarits      │ │ multi-     │ │ normes            │ │
│  │ (§4.0)       │ │ (déterministe)│ │ fournisseurs│ │ (§4.5)            │ │
│  │              │ │ (§4.1)        │ │ (§4.4)      │ │                    │ │
│  └──────┬───────┘ └──────┬───────┘ └─────┬──────┘ └──────────────────┘ │
│         │                 │                │                            │
│  ┌──────▼─────────────────▼────────────────▼─────────────────────┐    │
│  │         Cache local navigateur (IndexedDB) — état applicatif     │   │
│  │   Projets · Sections · Liens · Documents · Workflows · Consent.  │   │
│  └──────────────────────────────┬───────────────────────────────┘    │
└─────────────────────────────────┼──────────────────────────────────────┘
                                   │ appels API HTTPS (aucun accès disque/Git natif)
                    ┌──────────────┴──────────────┐
                    ▼                              ▼
       API GitHub (dépôt dédié, privé)     API Google Drive
          — source de vérité —                — filet de secours —
                    │
                    ▼
        Fournisseurs IA (API externes, configurables par client)
   Claude (défaut) ⇄ OpenAI/ChatGPT ⇄ GitHub Copilot ⇄ DeepSeek ⇄ … ⇄ modèle local
```

**Décisions d'architecture structurantes :**
- Le moteur de gabarits fonctionne **entièrement en local**, sans dépendance réseau (répond à URS-NF-012).
- Le routeur IA est le seul composant ayant connaissance des fournisseurs cloud configurés ; il n'a **jamais accès par défaut** à la couche de données des livrables (répond à URS-F-031, mitige AR-R-06).
- La couche de données locale est le modèle pivot (§3), point de vérité pour l'IHM ; elle est synchronisée vers GitHub (API) puis vers le miroir Drive (API), jamais l'inverse (répond à URS-NF-010/011). **(v11 — architecture web pure, 23/08/2026)** Aucun accès disque ou Git natif : uniquement des appels API HTTPS, cohérent avec un poste de travail où seuls le navigateur et github.com sont autorisés.
- Chaque gabarit (structure de champs, calculs, libellés multilingues) est une donnée versionnée indépendamment du code du moteur de rendu — mécanisme d'extensibilité retenu pour répondre au principe fondateur n°6 du cadrage (répond à URS-REG-003).

## 3. Modèle de données pivot

```json
{
  "project": {
    "id": "uuid",
    "name": "string",
    "context": "string",
    "scope_in": "string",
    "scope_out": "string",
    "deadline": "ISO-8601 | null",
    "language_default": "fr | en | de",
    "client_id": "uuid | null",
    "sections": ["section_id", "..."],
    "documents": ["project_document_id", "..."],
    "links": [{ "from_section_id": "…", "to_section_id": "…", "created_by": "…", "created_at": "…" }],
    "audit_log": [{ "timestamp": "…", "actor": "…", "action": "création | modif_lien | ajout_section | retrait_section | …" }],
    "created_at": "ISO-8601",
    "updated_at": "ISO-8601"
  },
  "section": {
    "id": "uuid",
    "project_id": "uuid",
    "template_type": "ex: change_control | urs | dq | fat | ... (catalogue §10)",
    "template_engine_version": "semver",
    "owner_id": "identifiant utilisateur (mono-valeur Phase 1, prêt multi-utilisateur)",
    "shared_with": [{ "user_id": "…", "access_level": "lecture | édition" }],
    "language": "fr | en | de",
    "status": "brouillon_aide | propose_par_ia_non_valide | en_verification | en_approbation | valide_en_interne",
    "meta": { "ref": "…", "titre": "…", "version": "…", "site": "…" },
    "workflow": {
      "authors": ["user_id", "…"],
      "reviewers": [{ "user_id": "…", "avis": "…", "date": "…" }],
      "approver_final": "user_id | null"
    },
    "signatures": { "redacteur": {}, "verificateur": {}, "approbateur": {} },
    "revisions": [{ "version": "…", "date": "…", "auteur": "…", "motif": "…" }],
    "values": { "...champs du gabarit...": "..." },
    "tables": { "...tableaux dynamiques du gabarit...": [] },
    "generation_source": { "source_document_id": "uuid | null", "generated_fields": ["…"] },
    "audit_log": [{ "timestamp": "…", "actor": "…", "action": "création | modification | export | changement_statut | export_force | import" }],
    "created_at": "ISO-8601",
    "updated_at": "ISO-8601"
  },
  "project_document": {
    "id": "uuid",
    "project_id": "uuid",
    "filename": "string",
    "status": "reference_de_travail_non_maitre",
    "uploaded_at": "ISO-8601",
    "uploaded_by": "…"
  },
  "client": {
    "id": "uuid",
    "name": "string",
    "created_at": "ISO-8601"
  },
  "client_config": {
    "client_id": "uuid",
    "ai_provider": "claude | openai | copilot | deepseek | …",
    "ai_provider_conditions_acquittees": "{ fournisseur: string, date: ISO-8601 } | null (accusé de réception des conditions de traitement des données de ce fournisseur — ajouté v15, un par fournisseur activé, jamais un simple booléen global)",
    "ai_provider_reliability_qualification": { "date": "…", "resultat": "…", "qualification_test_set_id": "uuid", "qualification_test_set_version": "semver", "moteur_version_qualifiee": "string | null (identifiant de version de modèle exposé par le fournisseur au moment de cette qualification — ajouté v14)" },
    "export_template_id": "uuid | null",
    "consent_telemetry": { "granted": "bool", "date": "…", "revocable_at_any_time": true },
    "qms_connectors": [{ "id": "uuid", "connector_type": "veeva | sap | trackwise", "active": "bool", "tenant_ref": "…" }]
  },
  "export_template": {
    "id": "uuid",
    "client_id": "uuid (isolation stricte par client — URS-F-024 ; ajouté v17)",
    "format": "word | pdf | excel",
    "nom": "string",
    "mapping_checklist_valide": "bool (checklist de correspondance — bloc de rôles, historique des révisions — validée avant activation, URS-F-026)",
    "checksum_semantique_reference": "string | null (empreinte du contenu extrait du gabarit par défaut au moment de la dernière vérification d'équivalence, indépendante de la mise en forme — URS-F-025 ; null tant qu'aucune vérification n'a eu lieu)",
    "created_at": "ISO-8601",
    "updated_at": "ISO-8601"
  },
  "ai_chat_session_log": {
    "id": "uuid",
    "client_id": "uuid (une session hérite du fournisseur actif de ce client — ajouté v16)",
    "started_at": "ISO-8601",
    "ended_at": "ISO-8601 | null (renseigné à la fermeture du panneau ou à l'expiration d'inactivité)",
    "mode": "chat_normatif | audit_simule",
    "ai_provider": "string",
    "moteur_version": "string | null (dernière version de moteur observée dans une réponse de cette session)",
    "document_joint": "bool (au moins un message de la session a joint le contenu d'une section)"
  },
  "asset_hierarchy_schema": {
    "client_id": "uuid",
    "levels": [{ "key": "…", "label": { "fr": "…", "en": "…", "de": "…" }, "numbering_pattern": "…" }]
  },
  "asset_node": {
    "id": "uuid",
    "client_id": "uuid",
    "level_key": "référence à asset_hierarchy_schema.levels[].key",
    "name": "string",
    "code": "string (unique au sein du client — URS-F-100nonies)",
    "parent_id": "uuid | null (lien hiérarchique, arbre, sans cycle)",
    "associated_nodes": ["asset_node_id", "… (liens d'association libres, graphe)"],
    "source": "manuel | qms_pull",
    "qms_connector_id": "uuid | null",
    "periodic_qualification": { "applicable": "bool", "deadline": "ISO-8601 | null" },
    "qualification_status": "non_qualifie | en_cours_qualification_initiale | qualifie | qualifie_ecart_ouvert | requalification_requise | requalification_en_retard | suspendu | declasse",
    "audit_log": [{ "timestamp": "…", "actor": "…", "action": "création | modification | changement_statut | suppression | …" }],
    "created_at": "ISO-8601",
    "updated_at": "ISO-8601"
  }
}
```

`project.asset_links[]` et `section.asset_links[]` (ajoutés au modèle `project`/`section` déjà défini plus haut) : `[{ "asset_node_id": "uuid", "node_name_snapshot": "…", "node_code_snapshot": "…", "linked_at": "…" }]` — instantané capturé à la liaison (URS-F-100decies). `section.external_submission` (ajouté au modèle `section`) : `{ "connector_id": "uuid", "systeme": "…", "date": "…", "reference_externe": "…", "transaction_id": "uuid" } | null` (URS-F-092ter/quater).

Traçabilité vers l'URS : `project` répond à URS-F-000/000bis/000ter/000quater ; `section.status` répond à URS-F-010/011/012 ; `section.workflow` répond à URS-F-014 à 014quinquies ; `section.language` répond à URS-NF-040bis ; `section.shared_with` répond à URS-NF-022 ; `section.audit_log`/`project.audit_log` répondent à URS-NF-030/031 et URS-F-000sexies ; `client_config` répond à URS-F-023/024/032bis/032quater et URS-NF-051.

**Clarification ALCOA+ (ajoutée v04 — audit Swissmedic simulé, OBS-01)** : pour une section issue de §4.1bis, `revisions[]` DOIT distinguer explicitement l'entrée horodatant la génération par l'IA (motif "génération assistée", auteur = système + fournisseur utilisé) de l'entrée horodatant chaque validation humaine ultérieure section par section (motif "validation utilisateur", auteur = utilisateur) — jamais une seule entrée fusionnant les deux, pour rester cohérent avec le principe "Contemporaneous" d'ALCOA+ (cadrage, principe n°2).

**Clarification terminologique (ajoutée v03 — revue FS, E5)** : ce modèle distingue deux notions à ne jamais confondre en conception détaillée. Le **multi-client** (`client_config`, isolation des gabarits d'export et des fournisseurs IA par `client_id`) est une capacité **Must dès la Phase 1** — un même professionnel travaille pour plusieurs clients/organisations. Le **multi-utilisateur** (`owner_id`, `shared_with`, comptes/rôles multiples) est une capacité dont le modèle de données est préparé dès la Phase 1 mais dont l'**activation reste hors périmètre** jusqu'à la Phase 3 (URS §8). Un client (organisation externe) n'est jamais un utilisateur (compte humain) de l'outil.

**`client` (ajouté v12 — gap trouvé en conception, connecteur Drive)** : toutes les versions précédentes référençaient `client_id` (dans `project`, `client_config`, `asset_hierarchy_schema`, `asset_node`) comme s'appliquant à une entité `client` déjà modélisée — or aucune version antérieure de cette FS ne définissait cette entité elle-même (seulement ses réglages, `client_config`). Gap resté invisible tant qu'aucun écran ne nécessitait de créer/lister des clients ; révélé en construisant la configuration Drive par client (SDS §5bis/§7, qui exige l'isolation par `client_id`). `client` est volontairement minimal (identité seule — nom) : c'est `client_config` qui porte les réglages, pas l'inverse.

**`ai_chat_session_log` (ajouté v16 — gap trouvé en construisant le panneau Chat expert)** : URS-F-037 exige que chaque session de chat soit journalisée (horodatage début/fin, fournisseur, moteur exact, indication qu'un document a été joint), mais aucune entité de ce modèle ne pouvait porter cette information — `section.audit_log` est scopé à une section précise, or une session de chat peut se dérouler sans qu'aucun document ne soit jamais joint. Ajoutée comme entité de premier niveau, rattachée au `client_id` (le fournisseur actif d'une session dépend de `client_config`, propre au client).

**`export_template` (ajouté v17 — gap trouvé en analysant §4.3bis pour implémentation)** : `client_config.export_template_id` référençait une entité `export_template` depuis la toute première version de ce modèle sans jamais la définir elle-même — même nature de gap que `client` (v12), resté invisible tant qu'aucun écran n'avait besoin de créer/lister des gabarits d'export personnalisés. Volontairement minimal (identité, isolation par client, les deux garde-fous non négociables déjà exigés par le texte — checklist de mapping URS-F-026 et empreinte d'équivalence sémantique URS-F-025) : la représentation du contenu du gabarit personnalisé lui-même (DSL, emplacements, format de saisie) reste une décision de conception ouverte, non tranchée par cette version.

## 4. Spécifications fonctionnelles par module

### 4.0 Gestion de projets (répond à URS-F-000 à 000septies)

- Un Projet est créé avec nom, contexte, portée/hors-portée, délai (`project.deadline`, optionnel) — URS-F-000.
- Des sections peuvent être ajoutées/retirées à tout moment ; retirer une section ne la supprime pas (conservation pour piste d'audit), elle est marquée détachée du projet — URS-F-000bis.
- Un lien explicite entre deux sections est un objet `project.links[]` créé par action utilisateur (sélection source + cible + nature du lien libre) ; une **vue de traçabilité** affiche le graphe des liens du projet, générée à la volée depuis `project.links[]` — remplace le module "Cycle en V" manuel de la v1 — URS-F-000ter (Should Phase 1 pour la vue automatique ; le lien manuel est Must).
- La section "Documents" accepte le chargement de fichiers (PDF, Office, images), chacun marqué automatiquement `status: reference_de_travail_non_maitre` et horodaté — jamais promu "maître" par l'outil — URS-F-000quater.
- Toute fonction de génération assistée (§4.1bis, §4.6) reçoit, sur action explicite de l'utilisateur (cohérente avec URS-F-031), la liste des sections/documents du même projet comme contexte disponible à joindre — URS-F-000quinquies.
- Chaque création/modification d'un `project.links[]` ajoute une entrée à `project.audit_log` (qui, quand, quel lien) — URS-F-000sexies.
- La section "Contexte procédé" est un type de section du catalogue (famille A, catalogue §10), structurée avec des champs dédiés (description procédé, CPP, CQA, conditions opératoires, références de validation existantes) et liable via `project.links[]` aux sections OQ/PQ/Validation de procédé/DQ/ACFC du même projet — URS-F-000septies. **Règle de garde-fou (mitige AR-R-26)** : la finalisation (passage hors `brouillon_aide`) d'une section OQ, PQ ou Validation de procédé est bloquée tant qu'aucun lien vers une section Contexte procédé du même projet n'existe ; l'utilisateur peut forcer ce blocage explicitement, action alors journalisée (même mécanisme que URS-F-027).
- **(ajouté v03 — revue FS, E6/E7, symétrie avec la règle ci-dessus)** Une section IQ ne peut être finalisée sans lien vers une section "Plan de métrologie/étalonnage" (catalogue §10.L) du même projet — URS-F-000octies, mitige AR-R-35. Une section OQ ne peut être clôturée sans lien vers une section "Plan de maintenance préventive" (catalogue §10.M) du même projet — URS-F-000nonies, mitige AR-R-36. Ces deux blocages utilisent le même mécanisme de forçage journalisé que le Contexte procédé, pour ne pas introduire trois comportements différents.

### 4.1 Rédaction guidée de sections (répond à URS-F-001 à 009, 004bis)

- Une section est créée à partir d'un gabarit du catalogue (§10 de l'URS) ; le gabarit définit une structure déclarative (sections, champs, colonnes de tableau, formules) séparée du moteur de rendu — répond à URS-REG-003 et au mécanisme d'extensibilité du cadrage (principe n°6) — URS-F-001.
- Chaque section respecte une structure standard : en-tête (référence, version, statut), corps, historique des révisions, bloc de rôles — URS-F-002.
- Types de champs supportés : texte court, texte long, liste déroulante (mono/multi-valeur), date, nombre, tableau à lignes dynamiques (ajout/suppression sans perte des autres lignes) — URS-F-003.
- Les calculs réglementaires (IPR = S×O×D, MACO, niveaux de risque…) sont des fonctions pures, déterministes, jamais déléguées à l'IA générative, couvertes par des tests unitaires dédiés — URS-F-004, répond à URS-NF-001/002.
- Chaque section enregistre, dans ses métadonnées, `template_engine_version` : l'identifiant de version du moteur de calcul utilisé au moment de la saisie, permettant de tracer a posteriori quelle version a produit un résultat — URS-F-004bis.
- Chaque section affiche les références normatives associées au gabarit utilisé — URS-F-005.
- Le module de suggestions contextuelles (idées de tests, sections potentiellement manquantes selon le type d'équipement/catégorie GAMP) s'appuie sur les valeurs déjà saisies ; toute suggestion est affichée dans un panneau **distinct** du corps du document, jamais insérée automatiquement dans `values`/`tables` — URS-F-006/007, répond à URS-NF-003, mitige AR-R-13.
- Une section peut être dupliquée intégralement (nouvelle `id`, `revisions` réinitialisées, `generation_source.source_document_id` pointant vers la section dupliquée) — URS-F-008.
- Sauvegarde automatique locale déclenchée à chaque modification de champ (debounce court) — URS-F-009.
- Le passage au statut `valide_en_interne` verrouille le corps en écriture ; toute modification ultérieure crée une nouvelle entrée `revisions` avec incrémentation de version — répond à URS-F-012/013 (détaillé §4.2).

### 4.1bis Génération de brouillon par adaptation d'un document de référence (répond à URS-F-060 à 064)

- Un utilisateur peut initier une génération de brouillon complet pour une nouvelle section en joignant un document de référence (action explicite, cf. URS-F-031) et en précisant le contexte du nouveau cas — le moteur IA adapte structure, langage et raisonnement — URS-F-060.
- **Garde-fou non négociable** : chaque section du brouillon généré porte individuellement le statut `propose_par_ia_non_valide` ; il n'existe **aucune action "valider tout"** — chaque section doit être ouverte et explicitement validée/éditée une par une avant de pouvoir quitter ce statut — URS-F-061.
- Avant tout usage d'un document de référence pour cette fonction, une boîte de confirmation explicite ("confirmez-vous disposer du droit d'utiliser ce document comme base ?") est affichée et doit être acceptée — non journalisée comme preuve juridique de droit d'usage, mais comme action tracée dans `section.audit_log` — URS-F-062, mitige AR-R-18.
- Toute valeur numérique/tolérance/critère d'acceptation reprise du document source est marquée visuellement (surlignage distinct) dans le brouillon généré — URS-F-063, mitige AR-R-19.
- `section.generation_source.source_document_id` conserve la filiation vers le document source, visible dans l'historique — URS-F-064.
- **Garde-fou export** : tant qu'une section porte encore `propose_par_ia_non_valide`, l'export du livrable est bloqué par défaut (détaillé §4.3bis, URS-F-027).

### 4.2 Statuts et cycle de vie d'une section (répond à URS-F-010 à 013, 011bis)

- Statuts possibles : `brouillon_aide` (par défaut) → `propose_par_ia_non_valide` (uniquement issu de §4.1bis) → `en_verification` → `en_approbation` → `valide_en_interne`. Le passage direct de `brouillon_aide` à `valide_en_interne` reste possible (workflow simple, cohérent avec URS-F-010 "au choix de l'utilisateur").
- Le passage à `en_approbation` exige que les rôles rédacteur/vérificateur/approbateur (`section.signatures`) soient renseignés — URS-F-011.
- **Libellé affiché à l'utilisateur** pour le statut technique `valide_en_interne` : *"validé en interne — pas une signature électronique opposable"*, affiché systématiquement à l'écran et sur les exports, jamais raccourci — URS-F-011bis, mitige AR-R-14.
- Une fois `valide_en_interne`, toute tentative de modification directe du corps est refusée par l'interface ; seule une action "créer une nouvelle révision" est proposée, incrémentant `revisions[]` — URS-F-012.
- Aucune suppression, même partielle, de `revisions[]` n'est possible depuis l'interface — URS-F-013.

### 4.2bis Workflows de rédaction, revue et approbation (répond à URS-F-014 à 014quinquies)

- `section.workflow` porte trois sous-structures indépendantes dès la Phase 1 : `authors[]` (rédaction/co-rédaction), `reviewers[]` (revue), `approver_final` (approbation) — architecture posée même si l'activation de signature électronique reste hors périmètre (§8 URS) — URS-F-014.
- Ajout/retrait d'auteurs possible à tout moment sur une section ; chaque contribution (champ modifié, par qui, quand) est attribuable via `section.audit_log` — URS-F-014bis.
- Plusieurs relecteurs peuvent être assignés à `reviewers[]`, chacun soumettant un avis/commentaire distinct avant transmission à l'approbation — URS-F-014ter. **Clarification (ajoutée v03 — revue FS, E2)** : l'outil n'arbitre jamais automatiquement un désaccord entre relecteurs — tous les avis, y compris contradictoires, sont transmis tels quels à `approver_final`, dont le rôle inclut explicitement de trancher. Aucun mécanisme de résolution technique n'est introduit, pour ne pas alourdir le workflow Phase 1 (cohérent avec URS-NF-043).
- `approver_final` est un rôle typé distinct (ex. profil "QA"), non confondu avec `reviewers[]` — URS-F-014quater.
- Ces trois sous-workflows n'entraînent aucune activation de signature électronique en Phase 1 ; ils réutilisent le modèle de statuts existant (§4.2) — URS-F-014quinquies, cohérent avec URS-F-011bis.

### 4.3 Export et interopérabilité (répond à URS-F-020/021/022/028)

- Export Word : document HTML structuré encapsulé `.doc` (compatible Microsoft Word), incluant en-tête, statut affiché en toutes lettres, historique de révisions, bloc de rôles — URS-F-020.
- Export PDF : mise en page dédiée à l'impression navigateur, sans coupure de tableau en milieu de ligne.
- Export/Import JSON : sérialisation complète d'une ou plusieurs sections, réutilisable pour sauvegarde manuelle ou transfert entre postes — URS-F-021.
- Export CSV/XLSX pour les tableaux dynamiques (ex. registre AMDEC) — URS-F-022.
- Chaque export est produit dans la langue de rédaction de la section (`section.language`), avec un contenu strictement équivalent quelle que soit la langue — URS-F-028, répond à URS-NF-040.
- **(ajouté v04 — audit Swissmedic simulé, MIN-01, mitige AR-R-40)** Un test de non-régression de contenu — même principe que celui déjà exigé pour les gabarits d'export client (URS-F-025) — vérifie l'équivalence de contenu entre chaque paire de versions linguistiques d'un même gabarit, à chaque modification de gabarit. Traitement symétrique à celui de l'équivalence gabarit par défaut/personnalisé, pour ne pas laisser cette classe de risque à deux niveaux de rigueur différents — URS-F-028bis.
- **Garde-fou non négociable (ajouté v05 — audit FDA simulé, MAJ-FDA-01/02, mitige AR-R-41)** : lors de l'export d'une section `valide_en_interne` (quel que soit le format), un bandeau rappelle explicitement que la responsabilité de conformité et de conservation réglementaire (durée légale applicable selon la predicate rule concernée, ex. 21 CFR 820.180 pour les dispositifs médicaux — voir URS §6, analyse predicate rules) est transférée au système qualité du client dès la reprise formelle du livrable. ValidaPharm n'est jamais le système d'enregistrement officiel — URS-F-028ter.

### 4.3bis Gabarits d'export personnalisés — templates client (répond à URS-F-023 à 027)

- Un gabarit d'export personnalisé (Word/PDF/Excel) peut être associé à un `client_id` via `client_config.export_template_id`, en plus du gabarit par défaut — URS-F-023.
- Les gabarits personnalisés sont strictement isolés par client — aucune structure de données ne permet un mélange entre deux `client_id` — URS-F-024, mitige AR-R-18.
- Un test de non-régression de contenu (checksum sémantique du contenu extrait, indépendant de la mise en forme) vérifie l'équivalence entre gabarit par défaut et gabarit personnalisé à chaque modification de ce dernier — URS-F-025.
- Lors de la configuration d'un gabarit personnalisé, une checklist de mapping (bloc de rôles, historique des révisions) doit être validée avant activation — URS-F-026.
- **Garde-fou non négociable (mitige AR-R-13/R-19)** : l'export d'une section contenant au moins un champ/sous-section au statut `propose_par_ia_non_valide` est **bloqué par défaut**, quel que soit le gabarit utilisé. Un bouton "forcer l'export malgré l'avertissement" reste disponible ; son usage crée une entrée `export_force` dans `section.audit_log` — URS-F-027.

### 4.4 Chat expert / routeur IA multi-fournisseurs (répond à URS-F-030 à 037, 032bis à 032quater)

- Module de chat dans un panneau **séparé** de l'espace de rédaction — URS-F-030.
- Par défaut, le chat ne reçoit que le texte tapé par l'utilisateur ; l'ajout du contenu d'une section au contexte nécessite l'action explicite "joindre ce document à la question", avec confirmation affichée avant tout envoi — URS-F-031, mitige AR-R-06.
- Le routeur IA gère une liste de fournisseurs cloud configurables au niveau `client_config.ai_provider` (Claude par défaut ; OpenAI/ChatGPT, GitHub Copilot, DeepSeek, autres, ajoutables) — URS-F-032, URS-F-032bis.
- Avant l'activation d'un nouveau fournisseur pour un client, un rappel explicite des conditions de traitement des données (rétention, entraînement, localisation) est affiché et doit être acquitté — URS-F-032ter, mitige AR-R-22.
- **Garde-fou non négociable (nouveau v07, mitige AR-R-33)** : avant activation d'un nouveau fournisseur pour un usage réel, une qualification de fiabilité est réalisée sur un échantillon de questions-types du domaine pharma/DM, consignée dans `client_config.ai_provider_reliability_qualification` (date, résultat, échantillon utilisé). L'activation est bloquée tant que ce champ est vide — URS-F-032quater.
- **Garde-fou non négociable (ajouté v04 — audit Swissmedic simulé, MAJ-02, mitige AR-R-38)** : l'échantillon de questions-types (`qualification_test_set_id`) est un artefact versionné indépendant (`qualification_test_set_version`), jamais recréé ad hoc à chaque qualification. Toute re-qualification (URS-F-032quinquies) DOIT être exécutée avec le même `qualification_test_set_id` que la qualification initiale, sauf décision explicite et journalisée de faire évoluer le jeu de test — auquel cas les résultats antérieurs et postérieurs ne sont plus présentés comme directement comparables. Sans cette maîtrise, une re-qualification n'est pas défendable en audit — URS-F-032sexies.
- Si aucun fournisseur cloud configuré n'est joignable, bascule automatique vers un modèle local, avec indicateur visible du changement de moteur — URS-F-033, mitige AR-R-12.
- Avant tout envoi en mode cloud, un bandeau nomme explicitement le fournisseur actif — URS-F-034.
- Les réponses citent, quand pertinent, les normes/référentiels invoqués — URS-F-035.
- Chaque réponse porte un avertissement fixe rappelant la nature d'aide non opposable — URS-F-036, mitige AR-R-07.
- Chaque **session** de chat (pas le contenu échangé) est journalisée : horodatage début/fin, fournisseur et moteur exact utilisé, indication qu'un document a été joint ou non — URS-F-037.
- **Garde-fou non négociable (ajouté v03 — revue FS, E1, mitige AR-R-37, IPR=48 — le plus élevé trouvé lors de cette revue)** : à chaque session, la version de moteur journalisée (URS-F-037) est comparée à la version enregistrée dans `client_config.ai_provider_reliability_qualification`. Si elles diffèrent, une alerte visible signale qu'une re-qualification de fiabilité est recommandée avant de poursuivre un usage réel — une qualification initiale ne se présume jamais valide indéfiniment (dérive silencieuse possible côté fournisseur) — URS-F-032quinquies.

### 4.5 Bibliothèque de normes (répond à URS-F-040/041)

- Bibliothèque consultable des normes/référentiels cités par les gabarits, recherche par mot-clé.
- Association de documents normatifs propres à l'utilisateur, stockés au même titre que les documents de projet (statut "référence de travail").
- **Annotation CSA (ajoutée v05 — audit FDA simulé, MIN-FDA-01)** : module à risque résiduel faible (pas d'impact direct sur un calcul réglementaire ou une décision de qualification) — candidat à un test **non scripté/exploratoire** plutôt que scripté exhaustif, dans l'esprit de la doctrine FDA Computer Software Assurance. Décision de classement définitive renvoyée au VMP réécrit (§12), pour éviter de dupliquer la stratégie de vérification dans la FS.

### 4.6 Assistant de stratégie de qualification (répond à URS-F-050 à 055)

- Méthode ACFC **configurable par client** (`MethodProfileACFC` : questions Oui/Non définies par le client, conservées mot pour mot, versionnée et immuable — aucune valeur figée dans le code), alimentée manuellement ou depuis un Change Control joint (via URS-F-031) ; le verdict de criticité (critique/non_critique), combiné à la complexité, produit une conclusion parmi une liste fermée (Aucun impact / Revue documentaire / FAT / SAT / IQ / IQ+OQ / IQ+OQ+PQ / Autre) — URS-F-050. **(Corrigé v18 — Phase 1 de convergence architecturale, 25/08/2026)** Remplace la précédente description "grille de critères déterministe ASTM E2500/EudraLex Annexe 15 §43/ICH Q9", qui décrivait à tort un barème de critères pondérés fixe et universel ; confirmé sur 4 sources indépendantes (Ferring, Sanofi Marcy, Sanofi Lyon-Gerland, ISPE Baseline Guide) qu'il s'agit en réalité d'un questionnaire propre à chaque client, avec une règle de décision elle-même configurable ("au moins un Oui → critique" est la seule règle confirmée à ce jour, pas une règle universelle codée en dur).
- **Garde-fou non négociable (mitige AR-R-15/R-16)** : l'IA peut proposer des réponses aux questions de la méthode active à partir d'un Change Control joint, mais chaque réponse individuelle doit être validée/corrigée par l'utilisateur ; le verdict résulte exclusivement du calcul déterministe sur les réponses validées, jamais d'une génération libre — URS-F-050bis.
- La référence et la version du Change Control utilisé comme contexte sont affichées et conservées — URS-F-050ter.
- Tant qu'aucune méthode ACFC n'a été configurée pour un client, aucune question par défaut n'est proposée : l'écran l'indique explicitement et invite à saisir les questions réelles de la procédure du client — URS-F-050quater.

### 4.6quater Paramètres de procédé et attributs qualité — Parameter/CriticalParameter/CPP/CQA (répond à URS-F-058 à 058ter, nouveau v20 — Phase 2, requirement intégré v20 après coup)

- `Parameter` : entité de base, rattachable optionnellement à un nœud du référentiel d'actifs, sans notion de criticité intrinsèque — URS-F-058.
- **Garde-fou non négociable** : classer un `Parameter` comme important/critique pour le procédé ne crée jamais automatiquement un CPP — un CPP est une déclaration humaine explicite et séparée — URS-F-058bis.
- CPP/CQA contextuels : une déclaration existante n'est jamais mutée lors d'un changement de contexte (nouvelle recette/produit) — elle est désactivée explicitement (motif tracé) et une nouvelle est créée si applicable, historique préservé — URS-F-058ter.

### 4.6bis Impact Assessment / System Classification (répond à URS-F-056, nouveau v18 — Phase 3)

- Méthode configurable par client (`MethodProfileImpactAssessment` : questions Oui/Non définies par le client, conservées mot pour mot, versionnée et immuable — même principe que `MethodProfileACFC`), appliquée à chaque système **avant** toute analyse de risque ACFC (F2) — URS-F-056.
- Verdict strictement binaire (Direct Impact / Not Direct Impact), jamais un troisième niveau "impact indirect" — URS-F-056.
- Aucune question par défaut proposée tant qu'aucune méthode n'est configurée — même garde-fou que §4.6, URS-F-056ter.
- Un système Not Direct Impact n'est pas bloqué : seul le chemin de qualification complète ne s'applique pas — URS-F-056quater.

### 4.6ter Computer System Assessment (répond à URS-F-057, nouveau v18 — Phase 3)

- Évaluation d'un système informatisé selon 3 axes indépendants : catégorie GAMP5 (grille fixe à 5 valeurs, non modulable par client), pertinence GxP, pertinence ERES/Part 11 — chaque axe justifié par du texte libre — URS-F-057.
- Contrairement à la méthode ACFC ou Impact Assessment, aucun `MethodProfile` associé : la catégorie GAMP5 est sélectionnée, jamais configurée — URS-F-057bis.
- Avertissement renforcé systématique : "aide à la décision, non une décision de qualification" — URS-F-053.
- L'assistant est accessible directement depuis une section Change Control en cours de rédaction, en plus de son accès en module indépendant — URS-F-054.
- Lorsqu'une évaluation ACFC ou Computer System Assessment (catalogue §10.F) conclut à la nécessité d'un dossier complet, ses réponses pré-remplissent automatiquement les champs correspondants du gabarit cible (ex. section "Généralités" du CSV) — pas de double saisie — URS-F-055.

### 4.7 Vue portefeuille et opérations transverses (répond à URS-F-070 à 073)

- Tableau de bord agrégeant le statut de qualification de tous les projets — URS-F-070.
- Registre/inventaire des équipements et systèmes (nom, catégorie GAMP, statut, dates de revue périodique), alimentant le tableau de bord et le mini-outil "Revue périodique" (catalogue §10.I) — URS-F-071.
- Alertes/rappels automatiques sur échéance de revue périodique ou de délai de projet (`project.deadline`) — URS-F-072.
- Recherche transversale (mot-clé, équipement, norme citée) à travers tous les projets et sections — URS-F-073.

### 4.8 Analyse de documents et challenge de dossier (répond à URS-F-080 à 083)

**Principe directeur, non négociable** : cette famille de fonctions produit exclusivement des constats/extractions à vérifier, **jamais** un verdict "conforme/non conforme" attribué à l'outil — cohérent avec le principe fondateur n°1 du cadrage.

- Chargement d'un document d'ingénierie (PID, schéma) et extraction structurée proposée (ex. liste d'instruments/tags) à des fins de pré-remplissage — toujours soumise à validation humaine, jamais écrite directement dans `values`/`tables` — URS-F-080, mitige AR-R-29.
- Chargement d'un certificat (matière 3.1, FDA, étalonnage) et extraction structurée : type, mesures/valeurs, mentions réglementaires — y compris dans une langue différente de la langue de travail — URS-F-081.
- Pour un certificat en langue non maîtrisée, affichage des termes techniques identifiés avec leur équivalent dans la langue de travail (ex. lien entre une mention allemande et "certificat matière 3.1") — URS-F-081bis, mitige AR-R-31.
- Analyse d'un projet (ses `links[]`) pour signaler les écarts structurels détectables : exigence URS sans section/preuve liée, document attendu absent de la section "Documents". La détection structurelle (liens manquants) est **déterministe** (basée sur le graphe de liens) ; toute évaluation sémantique fine ("ce certificat couvre-t-il réellement cette exigence") reste une proposition IA soumise à validation — URS-F-082.
- **Garde-fou non négociable (mitige AR-R-30, le risque le plus élevé du registre)** : aucune fonction de cette famille ne produit de statut "conforme"/"non conforme" attribué à l'outil ; le résultat est systématiquement présenté avec le libellé "constat/proposition à vérifier", accompagné d'un rappel que cette détection n'est pas exhaustive — URS-F-083.

### 4.9 Connecteurs QMS tiers (répond à URS-F-090 à 092quater) *(nouveau v06)*

- `client_config.qms_connectors[]` porte, par client, la liste des connecteurs configurés (`connector_type: veeva | sap | trackwise`, statut actif/inactif) — pattern d'adaptateur enfichable, même principe que `client_config.ai_provider` — URS-F-090.
- Un connecteur de référence complet (**Veeva Vault**) est disponible en Phase 1 ; SAP/TrackWise suivent le même contrat d'interface mais restent Could — URS-F-090bis/ter.
- Aucune synchronisation continue : le pull et le push sont des actions **explicites**, déclenchées par un bouton, jamais un arrière-plan automatique — URS-F-090quater.
- **Pull** : depuis l'écran d'édition d'une section (ou de la fiche Projet), l'action "Importer depuis {connecteur}" ouvre une recherche dans le système tiers, puis applique les **mêmes garde-fous que la génération par adaptation** (§4.1bis). **(Clarifié v07 — revue FS-v06, E4)** Contrairement à §4.1bis qui génère une section entière, le pull s'applique typiquement **champ par champ** (ou groupe de champs) dans une section existante ou nouvelle — chaque champ importé porte individuellement le statut "proposé — non validé" jusqu'à validation, sans reclasser toute la section environnante. Confirmation de droit d'usage, signalement visuel, traçabilité de la filiation (`generation_source.qms_connector_id` en plus de `source_document_id`) — URS-F-091.
- **Push** : depuis une section `valide_en_interne`, l'action "Envoyer vers {connecteur}" déclenche une confirmation à **trois niveaux obligatoires** — client, système, tenant/organisation — avant tout envoi. **(Clarifié v07 — revue FS-v06, E3)** Cette confirmation affiche également un résumé du contenu transmis (référence, titre, statut, version) — pas seulement la destination, cohérent avec le niveau de transparence déjà appliqué au chat (URS-F-034) — URS-F-092bis, mitige AR-R-48.
- Après un push réussi, `section.external_submission = { système, date, référence_externe }` est renseigné et affiché en évidence sur la fiche du livrable — le statut interne ValidaPharm n'est jamais silencieusement inchangé — URS-F-092ter.
- Le push attend une confirmation de réception explicite du système cible avant d'être marqué réussi ; un identifiant de transaction unique (`external_submission.transaction_id`) garantit l'idempotence d'un retry après échec réseau — URS-F-092quater, mitige AR-R-50.

### 4.10 Structure Système — référentiel d'actifs (répond à URS-F-100 à 102quinquies) *(nouveau v06)*

- **Référentiel par client** (`asset_node`), jamais par projet — isolation stricte par `client_id`, même principe que URS-F-024 — URS-F-100, mitige AR-R-51.
- Hiérarchie configurable : `asset_hierarchy_schema` (par client) définit les niveaux et libellés (ex. Site > Zone > Système > Équipement, ou tout autre découpage propre au client) — aucune structure imposée par défaut — URS-F-100bis.
- Chaque `asset_node` porte un `parent_id` unique (lien hiérarchique, **arbre sans cycle**) et une liste `associated_nodes[]` (liens d'association libres, **graphe**, cycles acceptés — ex. une utilité desservant plusieurs systèmes) — les deux types de lien sont visuellement distincts dans toute vue — URS-F-100ter.
- Vue graphique globale du référentiel d'un client, même principe que la vue de traçabilité de projet (§4.0) — URS-F-100quater.
- À la création/modification d'un Projet, sélection d'un ou plusieurs `asset_node` existants (recherche/liste) — URS-F-100quinquies.
- Si le nœud recherché n'existe pas, création à la volée depuis ce même écran (nom, code, position dans la hiérarchie), sans interrompre la création du projet — URS-F-100sexies.
- Alimentation d'un nœud par pull depuis un connecteur QMS tiers (réutilise §4.9, URS-F-091) ou saisie manuelle, au choix — URS-F-100septies. **(Clarifié v08 — audit FDA simulé, MAJ-01)** Tout pull/push de données `asset_node` (pas seulement de livrables) porte le même rappel de transfert de responsabilité que URS-F-028ter — l'analyse "predicate rules" de l'URS §6 couvre aussi les données maîtresses d'actifs une fois reprises dans le système du client (ex. SAP), pas seulement les documents.
- **Garde-fou** : suppression d'un nœud référencé par au moins un projet → jamais silencieuse, le lien devient explicitement "orphelin" (affiché, jamais cassé sans trace) ; toute modification/suppression journalisée — URS-F-100octies. **(Clarifié v07 — revue FS-v06, E5)** Le **reparentage** d'un nœud (changement de `parent_id`) revalide l'absence de cycle avec la même rigueur qu'à la création, et est journalisé comme toute autre modification — les instantanés déjà capturés sur des livrables liés (URS-F-100decies) ne sont jamais affectés par un reparentage ultérieur.
- **Garde-fou** : le code d'un nœud est vérifié unique au sein du référentiel du client à la création/modification, rejet explicite en cas de doublon — URS-F-100nonies, mitige AR-R-53.
- **Garde-fou (data integrity)** : le lien projet↔nœud capture un **instantané** (`project.asset_links[].node_name_snapshot`, `node_code_snapshot`) au moment de la liaison — un renommage ultérieur du nœud ne modifie jamais le contenu déjà affiché/exporté d'un livrable existant ; le lien vif vers l'`asset_node.id` reste conservé pour la navigation — URS-F-100decies, mitige AR-R-52.

**Dossier vivant (répond à URS-F-101 à 101septies)**

- Depuis un `asset_node`, un onglet "Dossier vivant" liste tous les livrables (sections) qui le concernent, à travers tous les projets du client — URS-F-101.
- Lien section↔nœud **additif** : par défaut hérité des `asset_links[]` du projet ; affinable explicitement au niveau d'une section précise (`section.asset_links[]`) si un projet couvre plusieurs nœuds mais qu'un livrable n'en concerne qu'un sous-ensemble — URS-F-101bis.
- Filtre par défaut sur statut `valide_en_interne` (les brouillons sont accessibles via un filtre explicite "Inclure les brouillons", jamais affichés par défaut) — URS-F-101ter, mitige AR-R-54.
- Regroupement par famille de gabarit (catalogue §10), version courante mise en avant, historique de révisions (`revisions[]`) consultable par livrable — URS-F-101quater.
- Toute création/modification/retrait d'un lien section↔nœud journalisée (`section.audit_log`) — URS-F-101quinquies, mitige AR-R-55.
- Export PDF du dossier vivant (ou d'un sous-ensemble filtré) : synthèse chronologique de **toutes** les occurrences validées (pas seulement la version courante), listant pour chacune date de validation/type de protocole/référence/version — réutilise le moteur d'export (§4.3) — URS-F-101sexies.
- Cette synthèse porte les rappels standards (URS-F-011bis, URS-F-092ter si un livrable listé a été poussé vers un connecteur tiers) et un **bandeau explicite de périmètre** ("cet historique reflète les données saisies dans ValidaPharm depuis le {date de première saisie} — il ne préjuge pas de qualifications antérieures menées hors de l'outil") — URS-F-101septies, mitige AR-R-56.

**Statut de qualification et périodicité (répond à URS-F-102 à 102quinquies)**

- `asset_node.periodic_qualification = { applicable: bool, deadline: date | null }` — URS-F-102.
- `asset_node.qualification_status` ∈ liste fermée : Non qualifié / En cours de qualification initiale / Qualifié / Qualifié avec écart(s) ouvert(s) / Requalification requise / Requalification en retard / Suspendu — sous contrôle de changement / Déclassé — retiré — URS-F-102bis. *(Cf. note URS §4.10 : convention de fait, pas un standard normatif unique — adaptable si le client a sa propre nomenclature.)* **(Clarifié v08 — audit Swissmedic simulé, MAJ-01)** "Déclassé — retiré" est un état **terminal** : aucune transition automatique ou manuelle ne peut le faire revenir à "Qualifié" — un équipement redevenant en service nécessite un nouveau projet de (re)qualification créant explicitement une nouvelle entrée de statut. Les autres transitions restent libres mais journalisées (URS-F-102quinquies).
- Passage automatique à "Requalification requise"/"Requalification en retard" selon `periodic_qualification.deadline`, réutilisant le mécanisme d'alerte déjà posé (URS-F-072) — URS-F-102ter, mitige AR-R-57.
- **Garde-fou (avertissement, jamais blocage)** : sélectionner un nœud en statut "Requalification en retard" ou "Suspendu" à l'étape URS-F-100quinquies affiche un avertissement explicite, sans empêcher la sélection — URS-F-102quater, mitige AR-R-58.
- Tout changement de statut (automatique ou manuel) journalisé (`asset_node.audit_log`) — URS-F-102quinquies.

### 4.10bis Function / Process / ManufacturingContext (répond à URS-F-103 à 103ter, nouveau v19 — Phase 4)

- `Process` générique par client (type parmi fabrication/conditionnement/installation/digital/CSV/workflow documentaire/métier/EHS/logistique/support/autre), indépendant de la hiérarchie du référentiel d'actifs — URS-F-103.
- `Function` indépendante du type de `Process`, associable à plusieurs nœuds du référentiel et à plusieurs `Process` via des relations N:M dédiées, jamais un champ unique — URS-F-103bis.
- `ManufacturingContext` relie un nœud du référentiel à un `Process`, un produit et, le cas échéant, une recette/un format/une configuration. Un même nœud (ex. système numérique type SCADA) peut être rattaché à plusieurs `ManufacturingContext` distincts sans qu'aucune relation ne soit déduite comme universelle — URS-F-103ter.
- EXTEND pur : `asset_node`/`asset_hierarchy_schema` (§4.10) ne sont ni modifiés ni mutés par ce module.

### 4.11 Quality Events (répond à URS-F-110 à 110sexies, nouveau v20 — Phase 5)

- `QualityEvent` unique avec discriminant de type (Change Control/Déviation/Investigation/CAPA/Constat d'audit/Revue périodique) — aucune source ne documente de champs distincts par sous-type au-delà du nom, pas de duplication d'interface sans justification — URS-F-110.
- **Garde-fou non négociable** : `origine` (interne/externe/mixte) ; un événement externe/mixte est référencé (système, identifiant), jamais dupliqué comme contenu officiel — URS-F-110bis.
- **Garde-fou non négociable** : aucun mécanisme de blocage automatique basé sur le statut d'un événement externe — vérifié explicitement par test (un Change Control externe ouvert ne bloque jamais une opération indépendante sur le même équipement) — URS-F-110ter.
- Références optionnelles entre événements (ex. Déviation → Investigation → CAPA), jamais un workflow à étapes obligatoires — URS-F-110quater.
- Rattachement optionnel à un nœud du référentiel/`Process`/`ManufacturingContext` (§4.10/§4.10bis) — URS-F-110quinquies.
- Aucune classification/priorisation/clôture automatique par IA — URS-F-110sexies.

### 4.12 Chaîne de définition Requirement → TestObjective → TestCandidate → Test (répond à URS-F-120 à 120septies, nouveau v21 — Phase 7a)

- Périmètre strict de cette sous-étape : **définition** seulement (Requirement, TestObjective, TestCandidate, Test, Couverture) — ni exécution (`Execution`/`ExecutionStep`/`Measurement`, Phase 7b), ni preuve (`Evidence`, Phase 7c). Décomposition volontaire du domaine Test/Execution/Evidence en sous-phases distinctes, chacune commitée séparément — URS-F-120 à 120septies, cohérent avec le risque identifié pour ce domaine dans `docs/convergence/CONVERGENCE_PLAN.md`.
- `Requirement` : entité minimale (référence, titre, description), rattachement optionnel à un nœud du référentiel d'actifs ou à un `Process` — jamais une obligation — URS-F-120. N'existait dans aucune phase précédente ; ajoutée ici car intrinsèque à la chaîne de traçabilité que cette sous-phase établit.
- `TestObjective` rattaché à un `Requirement` unique — URS-F-120bis.
- `TestCandidate` avec statut explicite `propose | retenu | ecarte` — URS-F-120ter.
- **Garde-fou non négociable** : un `Test` ne peut être créé qu'à partir d'un `TestCandidate` au statut `retenu` — vérifié explicitement par test (tentative depuis un candidat `propose` → erreur typée, aucune création silencieuse) — URS-F-120quater.
- **Garde-fou non négociable** : écarter un candidat exige un `motif_ecart` tracé dans `audit_log` — jamais de suppression, cohérent avec la convention d'immutabilité déjà appliquée aux autres domaines (QualityEvent, ManufacturingContext) — URS-F-120quinquies.
- `TestStep` (`EtapeTest`) modélisé en tableau imbriqué dans `Test` plutôt qu'en table séparée — même logique que `Section.revisions[]` : pas de sur-normalisation sans besoin démontré.
- `Couverture` : entité N:M distincte et dédiée, déclarée explicitement (jamais déduite) entre un `Requirement` et un `Test` approuvé ; un même `Test` peut couvrir plusieurs `Requirement` — distinct du lien `TestObjective.requirement_id` qui ne capture que le requirement d'origine du test — URS-F-120sexies, idempotence vérifiée par test.
- Aucune génération, rétention ou approbation automatique par IA — URS-F-120septies.

### 4.13 Exécution d'un Test approuvé (répond à URS-F-130 à 130septies, nouveau v22 — Phase 7b)

- Garde-fou non négociable : `Execution` créée uniquement depuis un `Test` au statut `approuve` — URS-F-130. Un même `Test` peut être exécuté plusieurs fois (retest, plusieurs actifs) ; `asset_node_id` optionnel précise l'actif concerné.
- `ExecutionStep` : résultat constaté (conforme/non conforme/non applicable) par étape, référence `test_step_id` vers l'`EtapeTest` réellement présente dans le `Test` exécuté — vérifié explicitement (aucun résultat orphelin) — URS-F-130bis.
- `Measurement` : zéro-à-plusieurs mesures par étape, `valeur` en texte (pas de type numérique imposé, même choix que `Parameter`/`CPP`) — URS-F-130ter.
- **Garde-fou non négociable** : immutabilité post-clôture — une fois `Execution.statut = terminee`, plus aucun `ExecutionStep`/`Measurement`/`ExecutionEvent` ne peut être ajouté (ALCOA+) — vérifié explicitement par test — URS-F-130quater.
- **Garde-fou non négociable** : `cloturerExecution` exige un `verdict` explicite, jamais déduit des `ExecutionStep` — cohérent avec le principe fondateur n°1 — URS-F-130quinquies.
- `ExecutionEvent` : journal d'événements pendant l'exécution (anomalie/pause/reprise/commentaire), distinct du `QualityEvent` (§4.11) ; référence optionnelle `quality_event_id` vers un `QualityEvent` déjà existant, jamais créé automatiquement — vérifié explicitement (un `ExecutionStep` non conforme ne crée aucun `QualityEvent`) — URS-F-130sexies.
- Aucune génération/validation/clôture automatique par IA — URS-F-130septies.

## 5. Spécification des exigences non fonctionnelles

### 5.1 Fiabilité et qualité (répond à URS-NF-001/002/003/045/046/052)

- Tout calcul réglementaire est une fonction pure testée unitairement (cas limites : valeurs nulles, valeurs maximales, échelles 1-5 et 1-10) — URS-NF-001/002.
- Séparation visuelle stricte suggestion/contenu validé, déjà détaillée §4.1 — URS-NF-003.
- Détection de modification concurrente du même livrable dans deux onglets/sessions : verrouillage optimiste (horodatage de dernière lecture comparé à l'écriture), avertissement avant tout risque d'écrasement — URS-NF-045, mitige AR-R-23.
- **(ajouté v03 — revue FS, E5, mitige AR-R-34)** Cas distinct : conflit de fusion Git lorsque le même livrable est modifié hors-ligne sur deux postes différents avant synchronisation. Contrairement au cas ci-dessus (verrouillage applicatif en mémoire, même poste), ce cas n'est détectable qu'au moment de la synchronisation Git. L'outil DOIT présenter une interface de résolution assistée (comparaison champ par champ des deux versions divergentes) — jamais une fusion automatique silencieuse, jamais l'exposition de marqueurs de conflit Git bruts à l'utilisateur — URS-NF-045bis.
- Le schéma du modèle de données pivot (§3) est versionné indépendamment des gabarits, avec un script de migration testé à chaque évolution de schéma — URS-NF-046.
- **(ajouté v04 — audit Swissmedic simulé, MAJ-03, mitige AR-R-39)** Lorsqu'un défaut du moteur de calcul déterministe est corrigé, une requête exploitant `section.template_engine_version` DOIT permettre de lister toutes les sections `valide_en_interne` produites avec la ou les versions défectueuses, pour engager une revue d'impact rétrospective (CAPA) — le simple enregistrement de la version (URS-F-004bis) ne suffit pas sans ce mécanisme d'exploitation — URS-NF-046bis.
- Un test de charge (nombre de projets/sections simultanés représentatif d'un usage réel) est spécifié en OQ/PQ de l'outil pour vérifier que l'interface reste réactive à l'échelle — URS-NF-052. Volume de référence Phase 1 : 500 projets / 5000 sections par client.
- **(ajouté v10 — résorption de dette explicitement acceptée, cadrage §6ter)** Chargement du tableau de bord et ouverture d'une section restent sous 2 secondes perçues dans les limites du volume de référence ; au-delà, dégradation gracieuse (pagination, chargement progressif) plutôt que blocage — URS-NF-052bis.

### 5.2 Portabilité et continuité (répond à URS-NF-010/011/012/047/049)

- Le dépôt Git dédié est source de vérité exclusive ; toute divergence avec le miroir Drive se résout toujours en faveur de Git — URS-NF-010. **(v11 — architecture web pure)** Accès exclusivement via l'API GitHub, jamais un clone local ni un binaire `git` — un changement de poste ne requiert qu'une connexion (navigateur + jeton), pas d'installation.
- Miroir Drive déclenché après chaque session de travail ou sur action manuelle "Sauvegarder maintenant" — URS-NF-011.
- Toutes les fonctions de rédaction/gabarits fonctionnent sans réseau — URS-NF-012.
- Surveillance de l'usage du stockage local (quota navigateur), avertissement avant saturation — URS-NF-047.
- Point de restauration explicite en libre-service (au-delà de la sauvegarde automatique et de l'historique Git) permettant un retour à un état antérieur connu — URS-NF-049.
- **(ajouté v10 — résorption de dette explicitement acceptée, cadrage §6ter ; amendé v11 — architecture web pure)** Désinstallation par suppression du site depuis l'écran d'accueil (si installé en PWA) et effacement du stockage navigateur pour ce site — sans reliquat, sans exécutable — URS-NF-055.
- **(ajouté v10)** Rollback vers une version antérieure de l'application : si le `schema_version` des données (§3) est postérieur à ce que cette version sait lire, l'application refuse explicitement de démarrer (message dédié) plutôt que de risquer un accès incorrect silencieux — URS-NF-055bis, mitige AR-R-60.

### 5.3 Sécurité et confidentialité (répond à URS-NF-020 à 025, 044, 048, 051)

- Aucune donnée de section transmise à un tiers sans action explicite (détaillé §4.4) — URS-NF-020.
- Dépôt Git privé, accès restreint (C-03/C-04) — URS-NF-021.
- Modèle de données prêt pour le multi-utilisateur dès la Phase 1 (`owner_id`, `shared_with`) même si l'UI n'expose qu'un utilisateur — URS-NF-022.
- Partage lecture seule temporaire d'un projet à un tiers externe (auditeur), sans compte utilisateur complet — URS-NF-025, dépend de l'infrastructure multi-utilisateur (Phase 3).
- **Garde-fou technique non négociable** : aucun secret (clé API, jeton) en clair dans le dépôt Git ni le code source — scan de secrets avant chaque commit sur le dépôt de conception — URS-NF-044, mitige AR-R-24. **(amendé v11 — architecture web pure)** Le jeton d'exécution (GitHub/Drive/IA) utilisé par l'application déployée est stocké dans le navigateur (pas de configuration locale hors navigateur possible sans installation) — risque assumé et documenté, mitigé par la portée restreinte du jeton (URS-NF-044bis, AR-R-61), jamais présenté comme équivalent à un coffre-fort système natif.
- Quota/seuil configurable par fournisseur contre une consommation excessive imprévue d'un service cloud IA — URS-NF-048, mitige AR-R-25.
- **Garde-fou non négociable (nouveau v07)** : aucune télémétrie, statistique d'usage ou rapport d'erreur automatique transmis sans consentement explicite et distinct du consentement chat/IA (`client_config.consent_telemetry`), révocable à tout moment, état visible en permanence — URS-NF-051, mitige AR-R-32.

### 5.4 Traçabilité et audit (répond à URS-NF-030/031)

- Chaque modification est attribuable et horodatée via l'historique Git sur branche protégée contre la réécriture — piste d'audit raisonnable Phase 1, pas un audit trail Part 11 complet — URS-NF-030, mitige AR-R-10. **(amendé v11 — architecture web pure)** Attribution par jeton d'API authentifié, pas par signature cryptographique GPG/SSH locale (impossible sans binaire `git`) — limite Phase 1 assumée et documentée explicitement, pas présentée comme une signature qu'elle n'est pas.
- Historique complet des révisions consultable depuis l'interface, sans purge — URS-NF-031.
- **Politique de rétention explicite (clarifiée v03 — revue FS, E3)** : en Phase 1, `revisions[]` et tous les `audit_log[]` sont conservés indéfiniment, alignés sur la durée de vie du dépôt Git — aucune purge automatique, aucune durée de conservation limitée. L'URS ne fixe pas de durée légale de rétention (hors périmètre mono-utilisateur Phase 1) ; une politique de rétention formelle (alignée sur les exigences du SMQ du client final) devra être définie explicitement en Phase 3.

### 5.5 Utilisabilité et multilingue (répond à URS-NF-040 à 043, 050)

- Interface et gabarits disponibles en français, anglais, allemand dès la Phase 1 (chinois, arabe en phases ultérieures) — URS-NF-040.
- Langue configurable par utilisateur et/ou par projet (`section.language`, `project.language_default`) — URS-NF-040bis.
- **Garde-fou qualité non négociable** : chaque langue est validée par un expert du domaine natif de cette langue avant mise en service — jamais de traduction automatique non validée — URS-NF-040ter, mitige AR-R-28.
- L'architecture d'interface supporte nativement RTL (arabe) et CJK (chinois) dès la conception, même si ces langues sont livrées en phase ultérieure — URS-NF-040quater.
- Accessibilité clavier de base pour les fonctions critiques (navigation, saisie, export) — URS-NF-050.
- **(ajouté v10 — résorption de dette explicitement acceptée, cadrage §6ter)** Composants interactifs et contenu porteur de sens (statuts, alertes, messages système) exposent un nom/rôle accessible compatible lecteur d'écran standard, sur les mêmes parcours critiques que URS-NF-050 — URS-NF-050bis.

### 5.5bis Charte graphique et identité visuelle (répond à URS-NF-054 à 054quinquies) *(nouveau v09)*

- L'écran de travail porte une identité visuelle moderne, fluide et premium, distincte et jamais mélangée avec le registre strictement sobre/documentaire des livrables exportés — URS-NF-054/054bis. Détail de conception (palette, typographie, composants) en FDS §2bis.
- Toute information fonctionnelle portée par une couleur (statut de qualification, criticité) est systématiquement doublée d'un indicateur non-couleur (icône, libellé) — URS-NF-054ter, mitige AR-R-59.
- Contraste conforme WCAG 2.1 AA sur toute information porteuse de sens — URS-NF-054quater.
- Polices distinctes et intentionnelles entre écran (moderne) et export (classique à empattements) — URS-NF-054quinquies.

## 6. Règles métier transversales et garde-fous non négociables

Ces règles s'appliquent à travers tous les modules ci-dessus ; elles sont listées ici pour visibilité et doivent chacune faire l'objet d'un cas de test OQ dédié (pas seulement d'une vérification incidente au sein d'un autre test) :

| Règle | Modules concernés | Réf. URS | Réf. AR |
|---|---|---|---|
| Aucun calcul réglementaire n'est produit par l'IA générative | §4.1, §4.6 | URS-NF-001, F-050bis | AR-R-01, R-15, R-16 |
| Aucune suggestion/proposition IA n'est jamais écrite automatiquement dans le contenu officiel | §4.1, §4.1bis, §4.6, §4.8 | URS-NF-003, F-061 | AR-R-13, R-19 |
| Blocage par défaut de l'export tant qu'une section reste "proposé par IA — non validé" | §4.3bis | URS-F-027 | AR-R-13, R-19 |
| Blocage de la finalisation OQ/PQ/Validation de procédé sans lien vers un Contexte procédé | §4.0 | URS-F-000septies | AR-R-26 |
| **(v03)** Blocage de la finalisation IQ / clôture OQ sans lien vers Métrologie/Maintenance | §4.0 | URS-F-000octies, F-000nonies | AR-R-35, R-36 |
| Aucune fonction d'analyse/challenge de dossier ne produit de verdict de conformité | §4.8 | URS-F-083 | AR-R-30, R-31 |
| Le chat expert n'a jamais accès par défaut au contenu d'une section | §4.4 | URS-F-031 | AR-R-06 |
| Qualification de fiabilité obligatoire avant activation réelle d'un fournisseur IA | §4.4 | URS-F-032quater | AR-R-33 |
| **(v03)** Détection de dérive de version d'un fournisseur qualifié | §4.4 | URS-F-032quinquies | AR-R-37 |
| Consentement explicite et révocable requis pour toute télémétrie | §5.3 | URS-NF-051 | AR-R-32 |
| Isolation stricte des gabarits/fournisseurs par client | §4.3bis, §4.4 | URS-F-024, F-032bis | AR-R-18, R-22 |
| **(v06)** Confirmation à trois niveaux avant tout push vers un connecteur QMS tiers | §4.9 | URS-F-092bis | AR-R-48 |
| **(v06)** Isolation stricte du référentiel d'actifs par client | §4.10 | URS-F-100 | AR-R-51 |
| **(v06)** Instantané nom/code au lien projet↔nœud, jamais de modification silencieuse d'un livrable validé | §4.10 | URS-F-100decies | AR-R-52 |
| **(v06)** Avertissement (jamais blocage) à la sélection d'un nœud en statut dégradé | §4.10 | URS-F-102quater | AR-R-58 |

## 7. Mécanisme d'extensibilité (répond au principe fondateur n°6 du cadrage)

Pour limiter le coût des évolutions inévitables après le début de la conception (le principe n°6 vise à en réduire le *nombre*, pas à prétendre les éliminer) :

1. **Gabarits versionnés indépendamment du moteur** (URS-REG-003) : ajouter/modifier un mini-outil du catalogue §10 ne nécessite pas de nouvelle version du moteur de rendu, seulement une nouvelle définition déclarative de gabarit.
2. **Routeur IA à fournisseurs enfichables** : ajouter un nouveau fournisseur cloud (§4.4) est une opération de configuration (`client_config.ai_provider`), pas un développement dans le cœur de l'outil, sous réserve de la qualification de fiabilité (URS-F-032quater).
3. **Modèle de données pivot versionné indépendamment** (URS-NF-046) avec migration testée, pour absorber l'évolution du schéma sans perte de données existantes.
4. **Architecture d'interface multilingue anticipée** (URS-NF-040quater) pour absorber RTL/CJK sans refonte, même si ces langues arrivent en phase ultérieure.

## 8. Gestion des erreurs et cas limites

| Cas | Comportement attendu |
|---|---|
| Fermeture du navigateur sans sauvegarde manuelle | Dernière sauvegarde automatique locale conservée, rechargée à la réouverture (URS-F-009) |
| Perte de réseau en cours de session chat cloud | Bascule automatique vers modèle local, message explicite, aucune perte de la conversation en cours (URS-F-033) |
| Deux onglets modifient la même section | Verrouillage optimiste, avertissement avant écrasement, jamais de fusion automatique silencieuse (URS-NF-045) |
| Conflit de fusion Git entre deux postes modifiés hors-ligne | Interface de résolution assistée, comparaison champ par champ, jamais de fusion silencieuse ni de marqueurs Git bruts exposés (URS-NF-045bis) |
| Tentative d'export avec sections non validées | Blocage par défaut, message explicite listant les sections concernées, option de forçage journalisée (URS-F-027) |
| Tentative de finalisation OQ/PQ sans Contexte procédé lié | Blocage, message renvoyant vers la création/le lien du Contexte procédé (URS-F-000septies) |
| Tentative de finalisation IQ sans Plan de métrologie lié / clôture OQ sans Plan de maintenance lié | Blocage, message renvoyant vers la création/le lien manquant (URS-F-000octies/nonies) |
| Fournisseur IA non qualifié sélectionné | Activation refusée, message renvoyant vers le processus de qualification de fiabilité (URS-F-032quater) |
| Version de fournisseur IA différente de la version qualifiée | Alerte de re-qualification recommandée, usage non bloqué mais signalé (URS-F-032quinquies) |
| Re-qualification lancée avec un jeu de test différent de la qualification initiale | Résultats non présentés comme comparables, écart journalisé explicitement (URS-F-032sexies) |
| Défaut du moteur de calcul corrigé | Liste des sections validées avec la version défectueuse générée, revue d'impact déclenchée (URS-NF-046bis) |
| Import JSON de données corrompues/incompatibles | Rejet explicite avant toute écriture, aucune donnée existante altérée, message de diagnostic |
| Saturation imminente du stockage navigateur | Avertissement préventif avant blocage, proposition de synchronisation immédiate vers Git/Drive (URS-NF-047) |
| Consentement télémétrie révoqué en cours de session | Arrêt immédiat de toute transmission, sans perte de fonctionnalité de rédaction (URS-NF-051) |
| Push vers un connecteur QMS tiers échoue/timeout | Aucun succès affiché sans confirmation de réception ; retry idempotent via `transaction_id`, jamais de doublon côté système cible (URS-F-092quater) |
| Sélection d'un nœud en statut "Requalification en retard"/"Suspendu" | Avertissement explicite affiché, sélection non bloquée (URS-F-102quater) |
| Échéance de requalification dépassée | Statut basculé automatiquement en "Requalification en retard" (URS-F-102ter) |
| Suppression d'un nœud référencé par un projet | Lien marqué "orphelin", jamais cassé silencieusement (URS-F-100octies) |
| Code de nœud dupliqué à la création | Rejet explicite, message renvoyant vers le code existant (URS-F-100nonies) |

## 9. Interfaces externes

| Interface | Nature | Répond à |
|---|---|---|
| Dépôt Git dédié (GitHub, privé) | Lecture/écriture via API GitHub (HTTPS), jeton à portée restreinte — jamais de `git` local | URS-NF-010/021/030/044bis, C-03/C-04 |
| Google Drive (compte utilisateur) | Écriture miroir via API Drive uniquement, jamais lue comme source | URS-NF-011 |
| API(s) fournisseur(s) IA cloud | Requête/réponse texte, jamais de contenu de section sans action explicite | URS-F-030 à 037 |
| Modèle IA local | Fallback sans réseau | URS-F-033, NF-012 |
| Navigateur (stockage local) | Sauvegarde automatique, quota surveillé | URS-F-009, NF-047 |
| Export Word/PDF/CSV/XLSX | Génération de fichier, pas d'API tierce | URS-F-020/021/022 |
| Connecteur(s) QMS tiers (Veeva Vault référence, SAP/TrackWise extensibles) | Pull (lecture) et push (écriture) explicites, jamais automatiques, isolés par client | URS-F-090 à 092quater |

## 10. Contraintes de plateforme (reprises de l'URS §7)

- C-01 : Windows/Mac courants, **aucun droit d'administration requis, aucune installation** — application web pure (v11 — architecture web pure, 23/08/2026). Contrainte réelle ayant motivé ce choix : poste de travail professionnel dont l'IT bloque les logiciels/services non autorisés.
- C-02 : aucune dépendance à un service payant obligatoire pour les fonctions cœur.
- C-03/C-04 : dépôt Git privé sur GitHub, accès exclusivement via API (jamais un client `git` local) ; la confidentialité dépend de la sécurité du compte GitHub de l'utilisateur (2FA recommandée) et de la portée restreinte du jeton (URS-NF-044bis), hors périmètre de conception de l'outil au-delà de cette portée.
- C-05 *(nouveau v11)* : suppose `api.github.com` (pas seulement `github.com`) accessible depuis le réseau de l'utilisateur — hypothèse non vérifiée par l'outil, risque documenté en AR-R-62, à confirmer par l'utilisateur avant de s'engager sur cette architecture.

## 11. Hors périmètre de cette FS

- Authentification multi-utilisateur opérationnelle, signature électronique Part 11, application mobile (repris de l'URS §8). *(Intégration ERP/QMS tiers retirée de cette liste v06 — désormais couverte §4.9/§4.10, exclusion levée URS v16.)*
- Synchronisation continue/automatique (webhook temps réel) avec un connecteur QMS tiers — pull/push restent des actions explicites (URS-F-090quater).
- Détail de l'implémentation technique (choix de framework, schéma de base de données physique, algorithmes précis de synchronisation Git) — relève de la Spécification de conception (§12).
- Contenu réglementaire détaillé de chaque gabarit — relève des gabarits eux-mêmes (catalogue URS §10).

## 12. Suite de la cascade documentaire

Cette FS sert d'entrée à la **Spécification de conception**, elle-même scindée en :
- **FDS** (Functional Design Spec) — conception fonctionnelle détaillée (écrans, flux, algorithmes de haut niveau) ;
- **SDS** (Software Design Spec) — architecture technique (composants, schéma de données physique, choix technologiques) ;
- **HDS** (Hardware Design Spec) — hors périmètre, aucun matériel dédié en Phase 1.

Le Plan de validation (VMP) et les protocoles IQ/OQ/PQ de l'outil devront être révisés une fois cette FS approuvée, pour refléter le catalogue de gabarits réel (15 familles, §10 URS, incl. N. Connecteurs QMS et O. Structure Système), le registre de risques à jour (58 entrées), et la classification scripté/non scripté (doctrine FDA CSA, cf. annotation §4.5) des fonctions à faible risque résiduel.

## 13. Matrice de traçabilité URS → FS

| Exigence URS | Section FS |
|---|---|
| URS-F-000 à 000nonies | §4.0 |
| URS-F-001 à 009, 004bis | §4.1 |
| URS-F-060 à 064 | §4.1bis |
| URS-F-010 à 013, 011bis | §4.2 |
| URS-F-014 à 014quinquies | §4.2bis |
| URS-F-020 à 022, 028, 028bis, 028ter | §4.3 |
| URS-F-023 à 027 | §4.3bis |
| URS-F-030 à 037, 032bis à 032sexies | §4.4 |
| URS-F-040/041 | §4.5 |
| URS-F-050 à 055 | §4.6 |
| URS-F-070 à 073 | §4.7 |
| URS-F-080 à 083 | §4.8 |
| URS-NF-001/002/003/045/045bis/046/046bis/052 | §5.1 |
| URS-NF-010/011/012/047/049 | §5.2 |
| URS-NF-020 à 025, 044, 048, 051 | §5.3 |
| URS-NF-030/031 | §5.4 |
| URS-NF-040 à 043, 050 | §5.5 |
| URS-REG-001/002/003 | §2, §7 |
| C-01 à 04 | §10 |
| URS-F-090 à 092quater | §4.9 |
| URS-F-100 à 102quinquies | §4.10 |
| URS-NF-054 à 054quinquies | §5.5bis |
| URS-NF-052bis, 050bis, 055/055bis | §5.1, §5.5, §5.2 |
| URS-NF-010/030/044/044bis/055 amendés (architecture web pure) | §2, §5.2, §5.3, §5.4, §10 |

---
*Document vivant, version 11 — v06 intégrait les cinq besoins Structure Système/connecteurs QMS. v07 intégrait 3 clarifications de la revue multi-experts. v08 intégrait 2 constats d'audits Swissmedic et FDA simulés. v09 intègre la charte graphique et identité visuelle. v10 résorbe les trois gaps mineurs de la checklist §6ter. **v11 (23/08/2026, décision explicite de l'utilisateur) : architecture web pure sans installation** — contrainte réelle du poste de travail professionnel (IT bloque les logiciels non autorisés). Diagramme d'architecture (§2) et interfaces (§9) réécrits : API GitHub/Drive au lieu de Git local, cache navigateur (IndexedDB). URS-NF-010/030/044/055 amendés, URS-NF-044bis nouveau. Nouvelle contrainte de plateforme C-05 (dépendance à `api.github.com`, AR-R-62, non vérifiée). Couvre l'intégralité de l'URS v23. Prête pour la mise à jour de la FDS et de la SDS. **v12 (24/08/2026, gap trouvé en construisant le connecteur Drive)** : ajout de l'entité `client` (§3) — `client_id` était référencé partout (project, client_config, asset_hierarchy_schema, asset_node) sans jamais être lui-même modélisé comme entité ; nécessaire dès qu'un écran doit créer/lister des clients (config Drive par client, SDS §5bis/§7). **v13 (24/08/2026, gap trouvé en construisant l'export §4.3)** : `section.audit_log.action` documentait "création | modification | export | changement_statut | export_force" mais pas "import" — alors que URS-F-021 (export/import JSON, "transfert entre postes") exige une piste d'audit distincte pour un enregistrement recréé par import plutôt que rédigé (ALCOA+ "Attributable"/"Original", cadrage principe n°2) ; utiliser "création" pour un import aurait masqué cette origine. **v14 (24/08/2026, gap trouvé en construisant le routeur IA §4.4)** : ajout de `moteur_version_qualifiee` à `ai_provider_reliability_qualification` — URS-F-032quinquies exige de comparer "la version de moteur journalisée" à "la version enregistrée dans [la qualification]", mais le schéma ne portait que `qualification_test_set_version` (la version du **jeu de test**, pas celle du **moteur/modèle** évalué par ce jeu de test) : deux versions distinctes confondues sous un seul champ, rendant la comparaison exigée par F-032quinquies irréalisable telle quelle. **v15 (24/08/2026, gap trouvé en construisant l'écran de configuration IA)** : ajout de `ai_provider_conditions_acquittees` — URS-F-032ter exige un accusé de réception des conditions de traitement des données **avant activation** d'un nouveau fournisseur, mais rien dans `client_config` ne conservait la preuve que cet accusé avait eu lieu ; modélisé par fournisseur (pas un booléen global) car changer de fournisseur exige un nouvel accusé, les conditions différant d'un fournisseur à l'autre. **v16 (24/08/2026, gap trouvé en construisant le panneau Chat expert §4.4)** : ajout de l'entité `ai_chat_session_log` — URS-F-037 exige la journalisation de chaque session de chat (horodatage début/fin, fournisseur, moteur exact, document joint O/N), mais aucune entité existante ne pouvait porter cette information : `section.audit_log` est scopé à une section précise, or une session de chat peut se dérouler sans qu'aucun document ne soit jamais joint. **v17 (24/08/2026, gap trouvé en analysant §4.3bis pour implémentation)** : ajout de l'entité `export_template` — `client_config.export_template_id` référençait cette entité depuis la première version de ce modèle sans jamais la définir elle-même, même nature de gap que `client` (v12).*
