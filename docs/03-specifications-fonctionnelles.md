# FS — Spécifications fonctionnelles de l'outil ValidaPharm

| | |
|---|---|
| **Référence** | FS-VALIDAPHARM-2026-001 |
| **Version** | 54 (ajout §4.10/URS-F-100terdecies-quaterdecies — import d'architecture depuis un fichier `.xlsx`, Phase 36, 03/09/2026 — cohérent avec URS v66 ; lecteur natif minimal `jszip`+`DOMParser` (`XlsxNatifAdapter`), résolution partielle de TD-014 ; planification pure `preparerImportHierarchie` déduplique les ancêtres partagés, rejette une colonne de niveau inconnue plutôt que de l'inventer, TD-042). Version 53 (ajout §4.31/URS-F-310 à quinquies — archivage protégé de client/projet, 31/08/2026 — cohérent avec URS v63 ; profil local (email/visa/mot de passe haché PBKDF2-SHA-256) + double confirmation (nom + mot de passe), jamais une suppression physique, jamais une authentification/signature électronique — dérogation étroite et documentée au cadrage §5, hors du champ interdit par TD-011, TD-033). Version 52 (implémentation partielle §4.5/URS-F-040, §4.8/URS-F-082 — bibliothèque de normes et analyse structurelle de dossier, Phase 34, 28/08/2026 — cohérent avec URS v62 ; `rechercherNormes` (agrégation déterministe de `normes_associees`, recherche insensible casse/accents), `detecterEcartsStructurels` (section `urs` isolée, jamais un appel IA, jamais un verdict de conformité) ; URS-F-041/080/081/081bis et la moitié "document attendu" d'URS-F-082 différés faute de grounding réel ou nécessitant leur propre conception, TD-032). Version 51 (implémentation §4.1bis/URS-F-060 à 064, ajout URS-F-064bis — génération de brouillon par adaptation d'un document de référence, Phase 33, 28/08/2026 — cohérent avec URS v61 ; `genererBrouillonSection` (fonction pure, protocole de sortie contraint, chaque valeur revalidée via `validerChamp` avant écriture), `project_document.extracted_text` (type modélisé depuis v12, jamais persisté avant ce lot), génération limitée aux champs scalaires du gabarit, jamais un tableau dynamique, TD-031). Version 50 (implémentation §4.4bis/URS-F-038 à 039bis — mode audit simulé du chat expert, Phase 32, 28/08/2026 — cohérent avec URS v60 ; `construirePromptAuditSimule` (débat contradictoire multi-angles + simulation de persona, fonction pure côté client, grounded sur `docs/archive/revues-audits/`), bascule de mode/personas/bandeau de rappel dans `PanneauChat.vue`, `client_config.ai_provider_reliability_qualification` indexé par `ModeUsageIA` (URS-F-038bis), TD-030). Version 49 (ajout §4.15/URS-F-150undecies — Knowledge Graph : parcours générique `parcourirGraphe` + outil `tracer_relations_connaissance`, Phase 31, 28/08/2026 — cohérent avec URS v59 ; deuxième cas réel démontré (`KnowledgeRelation`) avant généralisation, `chaineTechniqueDepuis` (Phase 18) refactoré pour consommer le même utilitaire, comportement identique, TD-029). Version 48 (ajout §4.6quinquies/URS-F-059 à sexies — Risk Assessment (AMDEC) autonome, Phase 29, 28/08/2026 — cohérent avec URS v58 ; `MethodProfileRiskAssessment`/`RiskAssessment`, réutilise `calculerIPR.ts` tel quel, échelle/seuil configurables par client, cycle initial→action→résiduel calé sur un modèle AMDEC réel (Google Drive), TD-027). Version 47 (extension §4.16/URS-F-160octies-nonies — Deliverable Intelligence : calcul automatique de `readiness`, Phase 28, 28/08/2026 — cohérent avec URS v57 ; `construireReadinessContentPlan` résout la chaîne réelle Requirement→Couverture→Test→Execution→Evidence + QualityEvent bloquant, `NouveauContentPlanInput.readiness` retiré, `recalculerReadiness` ajouté, TD-026). Version 46 (ajout §4.20bis/URS-F-201 à quater — Context Engine enrichi, Phase 27, 27/08/2026 — cohérent avec URS v56 ; narratif OÙ/QUOI/COMMENT/POURQUOI-IMPACT injecté réellement dans le prompt du Reasoning Engine, TD-025). Version 45 (implémentation §4.3bis/URS-F-023 à 026 — Gabarits d'export personnalisés client, Phase 26, 27/08/2026 — cohérent avec URS v55 ; génération `.docx` réelle via `docxtemplater`+`pizzip`, équivalence de contenu garantie par construction (`construireDonneesExportGabarit` partagée), gabarit refusé à l'import si balises obligatoires non mappées, entité `gabarit_export_client` corrigeant le modèle spéculatif `export_template` (v17), TD-024). Version 44 (ajout §4.30/URS-F-300 à quater — Écran de revue de structure procédurale + déclenchement du repli, Phase 25, 27/08/2026 — cohérent avec URS v54 ; orchestration déterministe-puis-IA (`proposerStructureProcedureAvecRepli`) et écran `RevueStructureProcedure.vue`, clôturant le point ouvert de TD-022, TD-023). Version 43 (ajout §4.29/URS-F-290 à quater — Repli IA-assisté de structuration procédurale, Phase 24, 27/08/2026 — cohérent avec URS v53 ; point ouvert depuis TD-016 explicitement engagé, réutilise `ProviderAdapter`, vérification déterministe d'ancrage, TD-022). Version 42 (ajout §4.28/URS-F-280 à quater — Ingestion PDF native, Phase 23, 27/08/2026 — cohérent avec URS v52 ; `pdfjs-dist` build `legacy`, testé réellement, calibré sur un 4ᵉ genre réel de SOP, TD-021). Version 41 (ajout §4.27/URS-F-270 à quater — Lecture de tableaux Word + fournisseur Document Intelligence disponible, Phase 22, 27/08/2026 — cohérent avec URS v51 ; recherche de catalogue npm sans résultat sain, code maison retenu, calibré sur le manuel Markem-Imaje réel ; fournisseur Azure rendu disponible mais non activé, TD-019/TD-020). Version 40 (extension §4.26/URS-F-260quinquies à septies — Phase 21 (extension), 27/08/2026 — cohérent avec URS v50 ; réponse à la question de l'utilisateur sur la couverture de "tous les types" de SOP, un 3ᵉ document réel testé sans couverture puis demande de maximiser la couverture sans IA avant tout repli, TD-018). Version 39 (ajout §4.26/URS-F-260 à quater — Parseur déterministe de structure procédurale, Phase 21, quatrième phase du plan `docs/convergence/VISION_NORTH_STAR_CONVERGENCE.md`, 27/08/2026 — cohérent avec URS v49 ; réponse à la question explicite de l'utilisateur sur la nécessité de l'IA, calibré sur 2 SOP réelles de clients différents lues intégralement dans Google Drive, TD-017). Version 38 (ajout §4.25/URS-F-250 à quater — Cerveau procédural, `Procedure`/`ProcedureStep`, Phase 20, troisième phase du plan `docs/convergence/VISION_NORTH_STAR_CONVERGENCE.md`, 27/08/2026 — cohérent avec URS v48 ; structuration humaine versionnée, aucune extraction automatique par IA — point ouvert). Version 37 : complément §4.15/URS-F-150nonies-decies — images incorporées d'un `.docx`, Phase 19 complétée, 27/08/2026 — cohérent avec URS v47 ; `extraireImagesDocx` combiné à l'OCR existant, aucune détection/correction de filigrane, TD-015). Version 36 : extension §4.15/URS-F-150septies-octies — ingestion Office native (`.docx`), Phase 19, deuxième phase du plan `docs/convergence/VISION_NORTH_STAR_CONVERGENCE.md`, 27/08/2026 — cohérent avec URS v46 ; `jszip`+`DOMParser`, `mammoth` évalué puis abandonné, Excel bloqué faute de librairie saine, TD-014). Version 35 : ajout §4.24/URS-F-240 à quater — Architecture Technique, relations typées entre `AssetNode`, Phase 18, première phase du plan `docs/convergence/VISION_NORTH_STAR_CONVERGENCE.md`, 27/08/2026 — cohérent avec URS v45 ; aucune nouvelle entité d'équipement, nouvel outil `tracer_chaine_technique` du Reasoning Engine). Version 34 : ajout §4.23/URS-F-230 à quinquies — Mission workspace, Phase 17, dernière phase du plan Phases 13-17, 27/08/2026 — cohérent avec URS v44 ; câble Mission/Activity/ContextSnapshot/Reasoning Engine dans des écrans réels). Version 33 : ajout §4.22/URS-F-220 à quinquies — Coquille UX, sidebar/Accueil/mode dual, Phase 16, 26/08/2026 — cohérent avec URS v43 ; vérifié dans un navigateur réel). Version 32 : ajout §4.21/URS-F-210 à sexies — Reasoning Engine, domaine AI, Phase 15, 26/08/2026 — cohérent avec URS v42). Version 31 : ajout §4.20/URS-F-200 à quater — ContextSnapshot généralisé, domaine Context, Phase 14, 26/08/2026 — cohérent avec URS v41). Version 30 : ajout §4.19/URS-F-190 à quinquies — Mission/Activity, domaine Work, Phase 13, 26/08/2026 — cohérent avec URS v40). Version 29 : ajout §4.10 câblage Workspace étape 1 — URS-F-100undecies/duodecies, 26/08/2026 — cohérent avec URS v39, premier incrément réel du chantier de câblage annoncé en Phase 11). Version 28 : ajout §4.18/URS-F-180 — Organization/Workspace, Phase 11, 25/08/2026 — cohérent avec URS v38). Version 27 : ajout §4.17/URS-F-170 — Integration Gateway générique, Phase 10, 25/08/2026 — cohérent avec URS v37). Version 26 : **réalignement des Phases 7a/7b/8a/9 sur le vrai modèle cible**, 25/08/2026, cohérent avec URS v36 — Google Drive reconnecté en cours de session, lecture directe intégrale du package source). Version 25 : ajout §4.16/URS-F-160 — ContentPlan, planification d'un livrable, Phase 9, 25/08/2026 — cohérent avec URS v35). Version 24 : ajout §4.15/URS-F-150 — Source/Document Intelligence, structuration assistée, Phase 8a, 25/08/2026 — cohérent avec URS v34). Version 23 : ajout §4.14/URS-F-140 — Evidence, dernière sous-étape de la Phase 7, 25/08/2026 — cohérent avec URS v33). Version 22 : ajout §4.13/URS-F-130 — exécution d'un Test approuvé, Phase 7b, 25/08/2026 — cohérent avec URS v32). Version 21 : ajout §4.12/URS-F-120 — chaîne de définition Requirement → TestObjective → TestCandidate → Test, Phase 7a, 25/08/2026 — cohérent avec URS v31). Version 20 : intégration des exigences manquantes, 25/08/2026 : ajout §4.6quater/URS-F-058 — Parameter/CriticalParameter/CPP/CQA, Phase 2, oublié au moment de son implémentation — et §4.11/URS-F-110 — Quality Events, Phase 5 — cohérent avec URS v30. Version 19 : ajout §4.10bis/URS-F-103, Phase 4. Version 18 : §4.6 corrigé, ajout §4.6bis/§4.6ter, Phase 1/3) |
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
    "uploaded_by": "…",
    "extracted_text": "string (texte extrait .docx/.pdf ou collé directement — ajouté v50/Phase 33, URS-F-060 ; ce type était modélisé depuis v12 mais jamais persisté avant §4.1bis)"
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
    "ai_provider_reliability_qualification": "{ chat_normatif: {…} | null, audit_simule: {…} | null } (indexé par mode d'usage depuis v50/Phase 32, URS-F-038bis — chaque entrée : { date, resultat, qualification_test_set_id, qualification_test_set_version, moteur_version_qualifiee: string | null (identifiant de version de modèle exposé par le fournisseur au moment de cette qualification — ajouté v14) } ; avant v50, un objet unique partagé entre modes)",
    "export_template_id": "uuid | null",
    "consent_telemetry": { "granted": "bool", "date": "…", "revocable_at_any_time": true },
    "qms_connectors": [{ "id": "uuid", "connector_type": "veeva | sap | trackwise", "active": "bool", "tenant_ref": "…" }]
  },
  "gabarit_export_client": {
    "id": "uuid",
    "client_id": "uuid (isolation stricte par client — URS-F-024 ; ajouté v17, forme corrigée v18/Phase 26 selon l'implémentation réelle)",
    "nom": "string",
    "fichier": "ArrayBuffer (.docx brut — portée réellement livrée limitée à ce format, URS-F-023)",
    "tags_trouves": "string[] (noms des balises docxtemplater détectées dans le gabarit à l'import, toutes portées de boucle confondues)",
    "created_at": "ISO-8601"
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

**`export_template` (ajouté v17 — gap trouvé en analysant §4.3bis pour implémentation)** : `client_config.export_template_id` référençait une entité `export_template` depuis la toute première version de ce modèle sans jamais la définir elle-même — même nature de gap que `client` (v12), resté invisible tant qu'aucun écran n'avait besoin de créer/lister des gabarits d'export personnalisés. Volontairement minimal à l'époque (identité, isolation par client, les deux garde-fous non négociables déjà exigés par le texte — checklist de mapping URS-F-026 et empreinte d'équivalence sémantique URS-F-025) : la représentation du contenu du gabarit personnalisé lui-même (DSL, emplacements, format de saisie) restait une décision de conception ouverte, non tranchée par cette version.

**`gabarit_export_client` (corrigé v18 — Phase 26 de convergence architecturale, 27/08/2026, TD-024) : forme réelle substituée au modèle spéculatif `export_template` (v17)**, une fois l'implémentation réellement conçue. Deux écarts assumés par rapport à la conception v17 : (1) `mapping_checklist_valide` (booléen persistant) n'existe pas — un gabarit dont les balises obligatoires (`redacteurs`/`approbateur_final`/`historique_revisions`) ne sont pas mappées est **refusé à l'import**, jamais enregistré à l'état "invalide en attente de correction" ; sa seule présence en base atteste déjà la validation (`tags_trouves` conserve la preuve du contrôle effectué). (2) `checksum_semantique_reference` (empreinte comparée à chaque modification) n'existe pas — l'équivalence de contenu exigée par URS-F-025 est garantie **par construction** : `construireDonneesExportGabarit` (`logique-metier/export/donneesExportGabarit.ts`) est l'unique source de données consommée par les deux renderers (HTML par défaut et `.docx` personnalisé, `connecteurs/office/GenerationDocxAdapter.ts`), rendant une divergence de contenu structurellement impossible plutôt que détectée après coup par comparaison de checksum. `format` (`word | pdf | excel`) est retiré : seul `.docx` est réellement livré dans ce lot (limite honnête, voir §4.3bis/URS-F-023).

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

### 4.1bis Génération de brouillon par adaptation d'un document de référence (répond à URS-F-060 à 064, implémenté v50, Phase 33, TD-031)

- Un utilisateur peut initier une génération de brouillon complet pour une nouvelle section en joignant un document de référence (action explicite, cf. URS-F-031 — collé directement ou uploadé `.docx`/`.pdf`, texte extrait par les mêmes adaptateurs que les Phases 19/22/23) et en précisant le contexte du nouveau cas — le moteur IA adapte structure, langage et raisonnement (`genererBrouillonSection`, fonction pure côté client, même discipline que le Reasoning Engine) — URS-F-060.
- **Garde-fou non négociable** : chaque section du brouillon généré porte individuellement le statut `propose_par_ia_non_valide` ; il n'existe **aucune action "valider tout"** — chaque section doit être ouverte et explicitement validée/éditée une par une avant de pouvoir quitter ce statut — URS-F-061. **Interprétation retenue à l'implémentation** : la "section" de ce garde-fou désigne chaque `DefinitionSection` du gabarit (§4.1, "Généralités", "Tests"…), pas l'objet `Section` lui-même (qui reste un seul statut, une seule transition possible `propose_par_ia_non_valide → brouillon_aide`) — l'écran matérialise cette granularité par une case à cocher "J'ai relu et validé « … »" par `DefinitionSection`, le bouton de validation restant désactivé tant qu'elles ne sont pas toutes cochées ; volontairement non persisté (recharger la page force une relecture complète).
- Avant tout usage d'un document de référence pour cette fonction, une boîte de confirmation explicite ("confirmez-vous disposer du droit d'utiliser ce document comme base ?") est affichée et doit être acceptée — non journalisée comme preuve juridique de droit d'usage, mais comme action tracée dans `section.audit_log` — URS-F-062, mitige AR-R-18.
- Toute valeur numérique/tolérance/critère d'acceptation reprise du document source est marquée visuellement (surlignage distinct) dans le brouillon généré — URS-F-063, mitige AR-R-19. **Critère déterministe retenu** : un champ de type `nombre` du moteur de gabarits (FDS §4) EST par construction une valeur/tolérance/critère d'acceptation dans ce modèle — jamais du texte libre — donc tout champ `nombre` renseigné par cette génération est signalé, sans jugement supplémentaire de l'IA sur ce qui est "technique".
- `section.generation_source.source_document_id` conserve la filiation vers le document source (un `project_document` réel, `extracted_text` porte le texte de référence), visible dans l'historique — URS-F-064.
- **Garde-fou export** : tant qu'une section porte encore `propose_par_ia_non_valide`, l'export du livrable est bloqué par défaut (détaillé §4.3bis, URS-F-027).
- **Garde-fou non négociable, non écrasement** : une valeur déjà saisie manuellement par l'utilisateur dans un champ n'est jamais recouverte par une proposition IA — seuls les champs encore vides sont renseignés par la génération.
- **Garde-fou non négociable, aucune valeur inventée** : chaque valeur proposée par l'IA est revalidée contre la définition du champ (`validerChamp`, §4.1/FDS §6 — la même fonction que l'écran de saisie manuelle) avant d'être écrite ; une valeur de liste non reconnue, une date hors format, un nombre hors plage sont silencieusement rejetés — jamais un état que la saisie manuelle refuserait elle-même.
- Voir URS-F-064bis pour les limites assumées de cet incrément (portée scalaire uniquement, pas d'écran générique de bibliothèque de documents).

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

### 4.3bis Gabarits d'export personnalisés — templates client (répond à URS-F-023 à 027, **implémenté v18/Phase 26**, TD-024)

- Un gabarit d'export `.docx` personnalisé peut être associé à un `client_id` (`gabarit_export_client`), en plus du gabarit par défaut — URS-F-023. **Portée réellement livrée** : `.docx` uniquement (`docxtemplater`+`pizzip`) — PDF/Excel restent hors périmètre de ce lot.
- Les gabarits personnalisés sont strictement isolés par client (table `gabaritsExportClient`, indexée par `client_id`) — aucune structure de données ne permet un mélange entre deux clients — URS-F-024, mitige AR-R-18.
- L'équivalence de contenu entre gabarit par défaut et gabarit personnalisé (URS-F-025) est garantie **par construction** plutôt que vérifiée après coup par checksum : `construireDonneesExportGabarit` est l'unique source de données consommée par les deux renderers — les deux ne peuvent structurellement pas diverger sur les valeurs, seule la mise en forme du gabarit client diffère.
- Lors de l'import d'un gabarit personnalisé, les balises `docxtemplater` obligatoires (`redacteurs`/`approbateur_final` — bloc de rôles ; `historique_revisions`) sont vérifiées (`verifierGabaritExportClient`) — un gabarit qui ne les mappe pas est **refusé à l'import**, jamais enregistré en attente de correction — URS-F-026.
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
- **Garde-fou non négociable (ajouté v03 — revue FS, E1, mitige AR-R-37, IPR=48 — le plus élevé trouvé lors de cette revue)** : à chaque session, la version de moteur journalisée (URS-F-037) est comparée à la version enregistrée dans `client_config.ai_provider_reliability_qualification`, **pour le mode d'usage de cette session** (voir §4.4bis) — chaque mode compare sa propre qualification, jamais celle de l'autre. Si elles diffèrent, une alerte visible signale qu'une re-qualification de fiabilité est recommandée avant de poursuivre un usage réel — une qualification initiale ne se présume jamais valide indéfiniment (dérive silencieuse possible côté fournisseur) — URS-F-032quinquies.

### 4.4bis Mode audit simulé (répond à URS-F-038 à 039bis, 038bis, 039ter — implémenté v50, Phase 32, TD-030)

- Le panneau Chat expert propose une bascule explicite entre deux modes : `chat_normatif` (comportement §4.4, inchangé) et `audit_simule` — jamais activé implicitement, jamais le mode par défaut d'une nouvelle session — URS-F-038.
- En mode `audit_simule`, le texte réellement envoyé au fournisseur IA n'est jamais la question brute de l'utilisateur : `construirePromptAuditSimule` (`logique-metier/audit-simule/`, fonction pure, aucun appel réseau) construit un prompt engineered qui applique systématiquement un **débat contradictoire multi-angles** (fonctionnel, réglementaire, sécurité, qualité — synthèse par consensus argumenté ou point ouvert explicite si la question relève d'un arbitrage de gouvernance) et, si l'utilisateur sélectionne un ou plusieurs profils, une **simulation de persona d'auditeur** (Swissmedic, FDA, cabinet de conseil GxP, QA spécialisée) structurée en Constat/Analyse/Base réglementaire/Sévérité (Majeur/Mineur/Observation) — URS-F-038. Cette méthodologie n'est pas inventée : elle reproduit les 2 patrons réels déjà utilisés pour la revue de ce projet lui-même (`docs/archive/revues-audits/` — revue multi-experts pour le débat contradictoire, audit-persona pour la simulation).
- La question brute de l'utilisateur, jamais le prompt engineered, reste ce qui s'affiche dans l'historique du panneau — chaque message affiché porte aussi le mode qui l'a produit.
- **Garde-fou non négociable** : le mode audit simulé reste strictement consultatif — il n'écrit jamais dans un document, ne modifie jamais un statut, ne prend aucune décision à la place de l'utilisateur — URS-F-039.
- **Garde-fou non négociable** : à chaque activation du mode audit simulé, un bandeau dédié rappelle explicitement qu'une simulation de persona **ne constitue en aucun cas un audit réglementaire réel ni un avis opposable** — affiché côté écran en plus du même rappel intégré à la fin de la réponse du fournisseur (double garantie, jamais une seule des deux) — URS-F-039bis.
- **Garde-fou non négociable** : `client_config.ai_provider_reliability_qualification` est indexé par mode d'usage (`{ chat_normatif, audit_simule }`, chacun `QualificationFiabiliteIA | null`) — qualifier un mode ne qualifie jamais l'autre, les deux modes n'ayant pas le même profil de risque — URS-F-038bis.
- **Limite assumée** : le relais IA reste un simple passe-plat sans état masquant la clé API, strictement identique pour les deux modes — aucun routage serveur par mode n'est construit, malgré un commentaire de code antérieur (`RelayProviderAdapter`) suggérant à tort que ce routage existait déjà — URS-F-039ter.

### 4.5 Bibliothèque de normes (répond à URS-F-040/041, implémentation partielle v51, Phase 34, TD-032)

- Bibliothèque consultable des normes/référentiels cités par les gabarits, recherche par mot-clé — `rechercherNormes`/`listerNormesCatalogue` (`logique-metier/bibliotheque-normes/`), fonction pure, agrégation déterministe de `DefinitionGabarit.normes_associees` déjà porté par chaque gabarit du catalogue (FDS §4) — aucune norme saisie ou dupliquée séparément, recherche insensible à la casse et aux accents — URS-F-040.
- **Limite assumée** : URS-F-041 (association de documents normatifs propres à l'utilisateur, Could) reste backlog — nécessiterait un écran générique d'upload de documents de projet (URS-F-000quater), non construit au-delà du besoin ponctuel de §4.1bis (Phase 33) — voir URS-F-041bis.
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

### 4.6quinquies Risk Assessment (AMDEC) autonome (répond à URS-F-059 à sexies, nouveau v48 — Phase 29, TD-027)

- `MethodProfileRiskAssessment` : échelle S/O/D (`echelle_min`/`echelle_max`) et seuil d'action **configurables par client**, versionné et immuable — même patron que `MethodProfileACFC`/`MethodProfileImpactAssessment` (Phase 1/3), mécanisme numérique plutôt que questionnaire Oui/Non, d'où un type volontairement distinct — URS-F-059.
- `RiskAssessment` (ligne AMDEC) : étape de procédé, mode de défaillance, effet, cause potentielle, contrôle actuel, S/O/D initiaux, rattachable optionnellement à un `AssetNode` (§4.10) et/ou à un `Parameter` déjà existant (§4.6quater) — URS-F-059.
- `calculerIPR` (URS-F-004, Phase 1) réutilisé tel quel pour l'IPR initial et résiduel — aucune seconde implémentation ; `evaluerVerdictRiskAssessment` (nouveau, fonction pure) compare l'IPR au seuil d'action de la méthode fixée au moment de l'évaluation (`method_profile_version`) — URS-F-059bis.
- **Garde-fou non négociable** : IPR non calculable (valeurs S/O/D incomplètes) → `verdict_initial`/`verdict_residuel` restent `null`, jamais une valeur par défaut optimiste — vérifié explicitement par test — URS-F-059ter.
- `enregistrerActionResiduelle` : recommandation, responsable, date cible, actions menées, puis nouveaux S/O/D et IPR résiduels — cycle en deux temps confirmé par un modèle AMDEC réel (`Processus_AMDEC.xlsx`, Google Drive : Étape/Mode de défaillance/Effet/SEV/Cause/OCC/Contrôle actuel/DET/RPN, puis Recommandations/Resp. et date cible/Actions menées/SEV-OCC-DET-RPN résiduels) — absent de tout module existant avant ce lot (le gabarit DQ ne capture qu'un score initial) — URS-F-059quater.
- **Garde-fou non négociable** : une évaluation figée référence `method_profile_version` — une révision ultérieure de l'échelle/du seuil ne modifie jamais rétroactivement une évaluation déjà produite — URS-F-059quinquies.
- **Limite assumée** : aucun écran construit dans ce lot (`useRiskAssessmentStore` seul, domaine + persistance + store, même discipline que les Phases 5/8a/9/13) ; aucune promotion automatique d'un `Parameter` vers `CPP`/`CQA` (§4.6quater) à partir d'un verdict AMDEC — reste une déclaration humaine séparée — URS-F-059sexies.

### 4.7 Vue portefeuille et opérations transverses (répond à URS-F-070 à 073)

- Tableau de bord agrégeant le statut de qualification de tous les projets — URS-F-070.
- Registre/inventaire des équipements et systèmes (nom, catégorie GAMP, statut, dates de revue périodique), alimentant le tableau de bord et le mini-outil "Revue périodique" (catalogue §10.I) — URS-F-071.
- Alertes/rappels automatiques sur échéance de revue périodique ou de délai de projet (`project.deadline`) — URS-F-072.
- Recherche transversale (mot-clé, équipement, norme citée) à travers tous les projets et sections — URS-F-073.

### 4.8 Analyse de documents et challenge de dossier (répond à URS-F-080 à 083, implémentation partielle v51, Phase 34, TD-032)

**Principe directeur, non négociable** : cette famille de fonctions produit exclusivement des constats/extractions à vérifier, **jamais** un verdict "conforme/non conforme" attribué à l'outil — cohérent avec le principe fondateur n°1 du cadrage.

- Chargement d'un document d'ingénierie (PID, schéma) et extraction structurée proposée (ex. liste d'instruments/tags) à des fins de pré-remplissage — toujours soumise à validation humaine, jamais écrite directement dans `values`/`tables` — URS-F-080, mitige AR-R-29. **Non implémenté dans ce lot** — voir URS-F-083bis.
- Chargement d'un certificat (matière 3.1, FDA, étalonnage) et extraction structurée : type, mesures/valeurs, mentions réglementaires — y compris dans une langue différente de la langue de travail — URS-F-081. **Non implémenté dans ce lot** — voir URS-F-083bis.
- Pour un certificat en langue non maîtrisée, affichage des termes techniques identifiés avec leur équivalent dans la langue de travail (ex. lien entre une mention allemande et "certificat matière 3.1") — URS-F-081bis, mitige AR-R-31. **Non implémenté dans ce lot.**
- Analyse d'un projet (ses `links[]`) pour signaler les écarts structurels détectables : exigence URS sans section/preuve liée, document attendu absent de la section "Documents". La détection structurelle (liens manquants) est **déterministe** (basée sur le graphe de liens) ; toute évaluation sémantique fine ("ce certificat couvre-t-il réellement cette exigence") reste une proposition IA soumise à validation — URS-F-082. **Implémenté partiellement** : `detecterEcartsStructurels` (`logique-metier/analyse-projet/`, fonction pure, aucun appel IA) signale une section de gabarit `urs` sans aucun lien (`project.links[]`, dans un sens ou l'autre) vers une autre section du projet — affiché dans la Fiche Projet. La moitié "document attendu absent de la section Documents" n'est pas implémentée — voir URS-F-083bis.
- **Garde-fou non négociable (mitige AR-R-30, le risque le plus élevé du registre)** : aucune fonction de cette famille ne produit de statut "conforme"/"non conforme" attribué à l'outil ; le résultat est systématiquement présenté avec le libellé "constat/proposition à vérifier", accompagné d'un rappel que cette détection n'est pas exhaustive — URS-F-083. Vérifié explicitement par test sur `detecterEcartsStructurels` : le message ne contient jamais "conforme"/"non conforme".

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

**Câblage Workspace, étape 1 (répond à URS-F-100undecies/duodecies, nouveau v29 — 26/08/2026)**

Premier incrément du chantier "câblage effectif" de la Phase 11 (`docs/convergence/CABLAGE_ETAPE_1_STRUCTURE_SYSTEME_SPEC.md`) : `asset_node.workspace_id : string | null` — un actif appartient à un site précis (`Workspace`) de l'organisation du client, `null` signifiant "non encore assigné" (compatibilité ascendante totale, aucune régression sur les 431 tests préexistants) — URS-F-100undecies. Garde-fou : `creerNoeud` avec un `workspace_id` inconnu, ou appartenant à une autre organisation, est rejeté explicitement (`workspace_introuvable`) — URS-F-100duodecies. Lecture par héritage descendant : `noeudsVisiblesDepuisWorkspace(workspaceId)` retourne les nœuds assignés à ce `Workspace` ou à l'un de ses ancêtres (remontée d'arbre via `ancetresWorkspace`, extraite de `resoudreRegleEffective` pour éviter toute duplication de logique), plus tous les nœuds legacy non assignés — un actif de Site A n'est jamais visible depuis Site B, un actif "global" est visible depuis tous les sites. **Limite assumée, documentée comme telle** : `codeDejaUtilise`/`introduitUnCycle` restent à l'échelle de toute l'organisation (pas par site) — aucune source ne justifie de restreindre cette portée, et le faire serait un changement de comportement non demandé. Aucun écran de sélection de site construit dans cet incrément (pas de consommateur UI, même discipline que le reste du projet).

**Import d'architecture depuis un fichier Excel (répond à URS-F-100terdecies/quaterdecies, nouveau v54 — Phase 36, 03/09/2026)**

Résolution partielle de TD-014 (Excel bloqué pour l'ingestion documentaire générale, faute de librairie saine) — `XlsxNatifAdapter.extraireGrilleXlsx` (`jszip`+`DOMParser`, même patron que `DocxNatifAdapter`) lit uniquement `xl/worksheets/sheet1.xml`/`xl/sharedStrings.xml`, jamais une formule évaluée, jamais une librairie Excel généraliste — URS-F-100terdecies. Planification pure `preparerImportHierarchie` : une colonne par niveau (ordre du schéma, correspondance par `key`/libellé insensible casse/accents), colonne "Code" optionnelle appliquée au nœud le plus profond de la ligne, ancêtres partagés entre lignes dédupliqués (créés une seule fois). Garde-fous, jamais silencieux : colonne sans niveau correspondant → import entier rejeté (jamais un niveau fabriqué) ; case vide entre deux cases remplies → ligne rejetée ; code explicite déjà utilisé (existant ou dans le même lot) → ligne rejetée — URS-F-100quaterdecies. Écriture en un seul lot (`bulkPut`), `asset_node.source = 'import_fichier'` (nouvelle valeur, distincte de `'manuel'`/`'qms_pull'`) pour tracer la provenance. Vérifié dans un navigateur réel (import de 4 lignes → 5 nœuds, dédoublonnage d'un bâtiment et d'une ligne partagés, code explicite et codes générés automatiquement, aucune erreur console). **Limite assumée** : une seule feuille lue (la première), aucune résolution multi-feuilles.

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
- `TestCandidate` avec statut explicite `propose | besoin_information | besoin_revue | accepte | rejete | doublon | remplace` (7 états — **réaligné v26** sur `10_TEST_ENGINE.md` après lecture directe du package source ; remplace le modèle à 3 états fabriqué en 7a faute de source disponible à l'époque) — URS-F-120ter. `duplique_de_id`/`remplace_par_id` tracent explicitement quel candidat pour `doublon`/`remplace`.
- **Garde-fou non négociable** : un `Test` ne peut être créé qu'à partir d'un `TestCandidate` au statut `accepte` — vérifié explicitement par test (tentative depuis un candidat `propose` → erreur typée, aucune création silencieuse) — URS-F-120quater.
- **Garde-fou non négociable** : rejeter un candidat exige un `motif_rejet` tracé dans `audit_log` — jamais de suppression, cohérent avec la convention d'immutabilité déjà appliquée aux autres domaines (QualityEvent, ManufacturingContext) — URS-F-120quinquies.
- `TestStep` (`EtapeTest`) modélisé en tableau imbriqué dans `Test` plutôt qu'en table séparée — même logique que `Section.revisions[]` : pas de sur-normalisation sans besoin démontré.
- `Couverture` : entité N:M distincte et dédiée, déclarée explicitement (jamais déduite) entre un `Requirement` et un `Test` approuvé ; un même `Test` peut couvrir plusieurs `Requirement` — distinct du lien `TestObjective.requirement_id` qui ne capture que le requirement d'origine du test — URS-F-120sexies, idempotence vérifiée par test.
- Aucune génération, rétention ou approbation automatique par IA — URS-F-120septies.

### 4.13 Exécution d'un Test approuvé (répond à URS-F-130 à 130septies, nouveau v22 — Phase 7b)

- Garde-fou non négociable : `Execution` créée uniquement depuis un `Test` au statut `approuve` — URS-F-130. Un même `Test` peut être exécuté plusieurs fois (retest, plusieurs actifs) ; `asset_node_id` optionnel précise l'actif concerné.
- `ExecutionStep` : résultat constaté (conforme/non conforme/non applicable) par étape, référence `test_step_id` vers l'`EtapeTest` réellement présente dans le `Test` exécuté — vérifié explicitement (aucun résultat orphelin) — URS-F-130bis.
- `Measurement` : zéro-à-plusieurs mesures par étape, `valeur` en texte (pas de type numérique imposé, même choix que `Parameter`/`CPP`) — URS-F-130ter.
- **Garde-fou non négociable** : immutabilité post-clôture — une fois `Execution.statut = terminee`, plus aucun `ExecutionStep`/`Measurement`/`ExecutionEvent` ne peut être ajouté (ALCOA+) — vérifié explicitement par test — URS-F-130quater.
- **Garde-fou non négociable** : `cloturerExecution` exige un `verdict` explicite, jamais déduit des `ExecutionStep` — cohérent avec le principe fondateur n°1 — URS-F-130quinquies.
- `ExecutionEvent` : journal d'événements pendant l'exécution — décision face à un résultat inattendu (`continuer`/`action`/`retest`/`deviation`/`changement`/`arret`/`externe`, **réaligné v26** sur `01_ARCHITECTURE_MASTER_FINAL.md` §29/DEC-056 après lecture directe du package source) ou simple `commentaire` — distinct du `QualityEvent` (§4.11) ; référence optionnelle `quality_event_id` vers un `QualityEvent` déjà existant, jamais créé automatiquement — vérifié explicitement (un `ExecutionStep` non conforme ne crée aucun `QualityEvent`) — URS-F-130sexies.
- Aucune génération/validation/clôture automatique par IA — URS-F-130septies.

### 4.14 Evidence — preuve rattachée à une exécution (répond à URS-F-140 à 140sexies, nouveau v23 — Phase 7c, dernière sous-étape de la Phase 7)

- `Evidence` : `type native` (constat direct de l'exécutant, sans document source) ou `document` (renvoie à un fichier externe) — URS-F-140.
- **Garde-fou non négociable** : immutabilité post-clôture, même règle que `ExecutionStep`/`Measurement` (§4.13) — URS-F-140bis.
- `execution_step_id` optionnel, DOIT appartenir à l'exécution référencée si fourni — vérifié explicitement — URS-F-140ter.
- `EvidenceLocation` : pointeur déclaratif (système `github`/`drive`/`externe` + référence) pour une preuve de type `document` uniquement — jamais un stockage de fichier réel (limite assumée, cohérente avec le stub `ProjectDocument` non consommé) — URS-F-140quater.
- `ProvenanceLink` : déclaration explicite et idempotente Evidence↔Requirement, même logique que `Couverture` (§4.12) — URS-F-140quinquies.
- Aucune génération/qualification automatique par IA — URS-F-140sexies.
- **Traçabilité complète démontrée par test** : `Requirement → TestObjective → TestCandidate → Test → Couverture → Execution → ExecutionStep → Evidence → ProvenanceLink`, interrogeable via `preuvesPourRequirement` — clôt l'Acceptance Criteria de la Phase 7 (`CONVERGENCE_PLAN.md`).

### 4.15 Source/Document Intelligence — structuration assistée (répond à URS-F-150 à 150decies, nouveau v24 — Phase 8a, TD-004 ; **réaligné v26** sur `03_DOMAIN_DATA_MODEL.md` après lecture directe du package source ; **étendu v36**, Phase 19, TD-014 ; **complété v37**, images incorporées, TD-015)

- `Source` (document/image) → `SourceLocation` (pointeur déclaratif, 0..N par Source) et `SourceVersion` (révision numérotée séquentiellement, 0..N par Source) → `Extraction` (exécution d'extraction sur une version précise, OCR via le relais Phase 6, ingestion Office native, ou saisie manuelle) → `ExtractionItem` (fragment de texte brut, immutable, 0..N par Extraction) → `KnowledgeItem` (interprétation structurée candidate) — URS-F-150. Remplace la chaîne simplifiée `Source → Extraction → KnowledgeItem` fabriquée en 8a faute de source disponible à l'époque.
- **Garde-fou non négociable** : `KnowledgeItem` toujours créé au statut `a_valider` (NEEDS_REVIEW) — vérifié explicitement par test, aucun chemin ne permet une création directe à `valide` — URS-F-150bis.
- **Garde-fou non négociable** : `validerKnowledgeItem`/`rejeterKnowledgeItem` créent un enregistrement `Confirmation` auditable distinct (decision `confirme`/`rejete`, validateur, horodatage), en plus de la mise à jour dénormalisée de `KnowledgeItem.statut`/`valide_par` — URS-F-150ter.
- `Conflict` : désaccord explicite entre deux `KnowledgeItem`, reste `ouvert` tant qu'aucune `resolution` n'est fournie — vérifié explicitement par test — URS-F-150quater.
- Aucun appel IA réel dans ce module : `valeur_interpretee` est toujours fournie par l'appelant (humain, ou une couche de suggestion câblée séparément plus tard) — URS-F-150quinquies.
- `KnowledgeRelation` : lien explicite non conflictuel entre deux `KnowledgeItem` (ex. l'un précise l'autre), jamais déduit, idempotent — distinct de `Conflict` — URS-F-150sexies.
- **Limite assumée** : sous-phase 8b (compréhension de schémas techniques complexes — `Diagram`/`DiagramNode`/`DiagramEdge`, P&ID/électrique) non engagée, per TD-004 ("seulement après retour d'expérience réel").
- `MethodeExtraction` étendu (Phase 19, TD-014) : `'ocr_azure' | 'docx_natif' | 'saisie_manuelle'` — `connecteurs/office/DocxNatifAdapter.ts` (`extraireTexteDocx`) dézippe un `.docx` (`jszip`) et extrait le texte des paragraphes/runs `word/document.xml` via `DOMParser`, entièrement côté navigateur, aucun appel réseau (contrairement à l'OCR) — URS-F-150septies.
- **Décision technique documentée** : `mammoth` (candidat initial) distingue son code Node de son code navigateur via le champ `browser` de son `package.json`, non appliqué par la résolution de modules de Vitest — installé, testé sur un `.docx` réel, puis abandonné après confirmation que le code testé n'était pas celui exécuté en production. `jszip`+`DOMParser` est isomorphe par construction (TD-014).
- **Limite assumée** : aucune ingestion Excel native (`xlsx_natif` absent) — `xlsx`/SheetJS (registre npm) porte une vulnérabilité haute sans correctif, `exceljs` une dépendance transitive vulnérable — TD-014, URS-F-150octies. `connecteurs/office/DocxNatifAdapter.ts` n'est câblé dans aucun écran ni dans `useSourceIntelligenceStore` dans ce lot, même discipline que l'OCR (Phase 6).
- **Robustesse de lecture (TD-015, complément 27/08/2026)** : une SOP réelle n'est pas toujours du texte seul (observation explicite de l'utilisateur) — `extraireImagesDocx` (`connecteurs/office/DocxNatifAdapter.ts`) extrait chaque fichier `word/media/*` d'un `.docx` (schéma, photo, diagramme incorporé), avec son type MIME pour les formats raster (`png`/`jpeg`/`gif`/`bmp`/`tiff`) — un format non raster (EMF/WMF, schéma Visio collé) est retourné avec `contentType: null`, jamais silencieusement omis — URS-F-150nonies.
- Chaque image extraite est destinée à être transmise à `OcrRelayAdapter.extraireTexte` (§4.15, Phase 6), produisant sa propre `Extraction` sur la même `SourceVersion` que le texte natif — le modèle Phase 8a admet déjà plusieurs `Extraction` par version, aucune modification de schéma.
- **Limite assumée (TD-015)** : aucune détection/correction automatique de filigrane ou de scan dégradé — le filet de sécurité reste la validation humaine déjà non négociable de tout `KnowledgeItem` (URS-F-150bis). Aucune reconstruction de la position des images dans le flux du document (liste plate) — URS-F-150decies.
- **Nouvel outil du Reasoning Engine (§4.21, Phase 31, TD-029)** : `tracer_relations_connaissance` (paramètre `knowledge_item_id`) — trace les `KnowledgeRelation` (URS-F-150sexies) sortantes depuis un `KnowledgeItem`, même sémantique que `tracer_chaine_technique` (§4.24). Second consommateur réel du parcours en largeur générique `parcourirGraphe` (`logique-metier/graphe/`), factorisé depuis `chaineTechniqueDepuis` (Phase 18) — refactor comportement-identique de ce dernier, aucune de ses suites de tests existantes modifiée. Étend `DonneesOutilsRaisonnement` avec `knowledgeRelations` — `TypeObjetCitable` inchangé (`knowledge_item` déjà existant depuis Phase 8a couvre la citation des résultats) — URS-F-150undecies.

### 4.16 ContentPlan — planification d'un livrable (répond à URS-F-160 à 160nonies, nouveau v25 — Phase 9 ; **réaligné v26** ; **étendu v47 — Phase 28, TD-026**)

- `ContentPlan` : gabarit visé (`template_id`, référence le `TemplateType` existant, moteur de rendu KEEP), contexte d'actif/procédé optionnel, profil de méthode résolu optionnel (`method_profile_id`/`method_profile_type`, pas de type `Method` générique unifié — cohérent avec la décision Phase 3) — URS-F-160.
- **Garde-fou non négociable** : `context_snapshot` figé une seule fois à la création (JSON), immutable ensuite — vérifié explicitement (modifier le profil de méthode référencé après coup ne modifie jamais le snapshot déjà pris) — URS-F-160bis.
- **Garde-fou non négociable** : cycle de vie `brouillon → valide → gele`, un `ContentPlan` ne peut être gelé qu'après avoir été validé — URS-F-160ter.
- **Garde-fou non négociable** : immutabilité totale après `gele`, même règle que `Execution` (§4.13) — URS-F-160quater.
- Aucune génération/validation/gel automatique par IA — URS-F-160quinquies.
- `readiness` : `pret | besoin_information | besoin_revue | bloque` (READY/NEEDS_INFORMATION/NEEDS_REVIEW/BLOCKED) — reflète si les données résolues sont suffisantes pour générer, distinct de `statut` qui reflète le cycle de vie de validation du plan lui-même — URS-F-160sexies.
- **Garde-fou non négociable** : `gelerContentPlan` exige `readiness = pret`, en plus de `statut = valide` — vérifié explicitement par test (un plan validé mais `besoin_information` ne peut jamais être gelé) — URS-F-160septies.
- **`readiness` calculé automatiquement (nouveau v47 — Phase 28, TD-026)** : `construireReadinessContentPlan` (`logique-metier/deliverable/readinessContentPlan.ts`), fonction pure, résout la chaîne déjà réelle et testée `Requirement → Couverture → Test → Execution → Evidence` (§4.12-§4.14) ancrée sur `ContentPlan.asset_node_id`, plus une vérification de `QualityEvent` non clôturé sur ce même nœud (toujours bloquant, quel que soit l'état de la chaîne par ailleurs). Combine plusieurs signaux (un par `Requirement` pertinent) par sévérité pire-cas (`bloque` > `besoin_information` > `besoin_revue` > `pret`), jamais une moyenne ni le premier trouvé. `asset_node_id` null ou aucun `Requirement` rattaché → toujours `besoin_information`, jamais un `pret` deviné faute de données. `creerContentPlan` calcule `readiness` à la création (**remplace la saisie manuelle par l'appelant, `NouveauContentPlanInput.readiness` retiré**) ; `recalculerReadiness(clientId, contentPlanId)` permet de recalculer à la demande sur un plan non gelé (nouvelle action tracée dans `audit_log`, refuse un plan déjà `gele` ou introuvable) — URS-F-160octies/160nonies.
  - **Précision de source** : `01_ARCHITECTURE_MASTER_FINAL.md` §26 ("Deliverable Engine") définit uniquement la position de l'étape "Readiness" dans le pipeline (`... → Context Snapshot → Readiness → Content Plan → ...`) — il ne définit pas les états `READY`/`NEEDS_INFORMATION`/`NEEDS_REVIEW`/`BLOCKED` eux-mêmes littéralement (recherche exhaustive dans le document : absents du texte). Ces 4 états sont ceux du type domaine `ReadinessContentPlan` déjà posé en Phase 9 (v26) ; ce lot en construit le calcul, il n'en invente pas la sémantique.
- **Limite assumée** : ne couvre que `Request → Resolve → Context Snapshot → Content Plan` — `Generate → Validate → Review → Render → Approve → Freeze` (intégration avec `DefinitionGabarit`/`RenduGabarit.vue` et le cycle de vie de `Section`) reste un chantier distinct, non engagé ici. La résolution "Example" (Method/Template/Example) n'est pas fabriquée dans ce périmètre, `DeliverableRequest`/`ContentElement`/`DeliverableVersion` (domaine "Deliverable" complet) non plus. **Toujours aucun écran `ContentPlan`** (limite déjà documentée en Phase 9) — vérification en navigateur réel impossible dans ce lot, seule la suite de tests/typecheck/lint couvre ce module.

### 4.17 Integration Gateway — connecteurs documentaires génériques (répond à URS-F-170 à 170quinquies, nouveau v27 — Phase 10)

- `Connector` : configuration typée par type (`github | google_drive | veeva_vault | sharepoint | dossier_reseau | edms_generique`) — URS-F-170.
- `SyncJob` : une tentative de synchronisation, statut `en_attente | indisponible | nouvelle_tentative | echec | reussi`, compteur `tentative` — URS-F-170bis.
- **Garde-fou non négociable** : aucun code de ce module ne conditionne une opération métier indépendante (ex. `declarerReference`) au statut d'un `SyncJob` — vérifié explicitement par test (un `SyncJob` en échec/indisponible n'empêche jamais une déclaration de référence) — URS-F-170ter, cohérent avec DEC-002/055 déjà appliqué à `QualityEvent` (§4.11).
- `ExternalReference` : pointeur vers un document externe (identifiant + libellé), jamais son contenu dupliqué — même principe que `EvidenceLocation`/`SourceLocation` (§4.14/§4.15) — URS-F-170quater.
- Aucune synchronisation/résolution automatique par IA — URS-F-170quinquies.
- **Interface générique `ConnecteurDocumentaire`** (`tester()`/`listerDocuments()`/`lireDocument()`, même pattern swappable que `FournisseurOcr`, Phase 6) : implémentations concrètes pour `github`/`google_drive` (ADAPT, TD-005 — enveloppent `GitHubConnector`/`DriveConnector` déjà existants et testés, sans réécrire leur logique validée ; le connecteur Drive reste volontairement écriture seule, `listerDocuments`/`lireDocument` y lèvent `OperationNonSupporteeError`, cohérent avec URS-NF-010) et pour `veeva_vault` (squelette basé sur le flux d'authentification réel et vérifié par recherche web le 25/08/2026 — session ID + header `Authorization` — **non testé en conditions réelles**, chemins d'endpoints à revérifier avant déploiement, même limite que le relais OCR Azure, Phase 6).
- **Limite assumée** : `sharepoint`/`dossier_reseau`/`edms_generique` sont des types reconnus et modélisés (config + store) mais **sans adaptateur concret implémenté** — un dossier réseau n'est pas accessible depuis un navigateur sans relais serveur (aucun point d'accès concret fourni), et aucune source vérifiée n'est disponible pour SharePoint/EDMS générique dans cette session. `AssetNode.qms_connector_id` (déjà présent, Structure Système) référence désormais un `Connector` de ce domaine.

### 4.18 Organization/Workspace — hiérarchie organisationnelle (répond à URS-F-180 à 180septies, nouveau v28 — Phase 11, migration la plus risquée du plan TD-006)

- **Décision structurante** : `Organization.id` reprend exactement l'`id` du `Client` migré — aucune des ~25 tables existantes indexées par `client_id` n'a été modifiée dans cet incrément (vérifié : les 419 tests préexistants restent verts sans modification). `Client` devient ainsi littéralement "un cas particulier à un seul niveau d'Organization" (TD-006), sans Big Bang — URS-F-180/180bis.
- **Garde-fou non négociable** : `migrerClient` est idempotente — migrer deux fois le même client ne duplique jamais l'`Organization` ni son `Workspace` racine — vérifié explicitement par test — URS-F-180ter.
- `Workspace` : arbre auto-référencé (`parent_workspace_id`), un seul type discriminant `global | site` — cohérent avec le principe déjà retenu pour `AssetHierarchySchema` ("Global et site ne sont pas des modèles différents"). `Facility`/`Area` ne sont pas des types distincts fabriqués sans source : ce sont simplement des `Workspace` plus profonds dans l'arbre — URS-F-180quater.
- **Garde-fou non négociable** : `resoudreRegleEffective` (fonction pure, `logique-metier/organisation/resolutionEffective.ts`) remonte l'arbre depuis le `Workspace` demandé et retourne toujours l'origine exacte (`workspaceIdOrigine`) de la règle trouvée — jamais une valeur sans provenance. Un site sans règle propre hérite silencieusement du parent ; un site avec sa propre règle la voit toujours prévaloir — **scénario obligatoire "Global + N sites" démontré par test** (un global + 2 sites, l'un hérite, l'autre surcharge explicitement) — URS-F-180quinquies.
- Aucune migration automatique/silencieuse (ex. au démarrage) — toujours un appel explicite (`migrerClient`/`migrerTousLesClients`) — URS-F-180sexies.
- **Limite assumée** : la réécriture des ~25 tables existantes pour interroger explicitement par `Workspace`/site reste un chantier ultérieur, phase par phase, non engagé ici (TD-006, "jamais un Big Bang") — URS-F-180septies. Pas d'écran de gestion Organization/Workspace (aucun consommateur réel construit dans ce périmètre). L'effectivity (date d'entrée en vigueur d'une règle) n'est pas ajoutée à `Workspace` — elle appartient aux objets de règles concrets, à câbler quand un premier cas d'usage réel se présentera.

### 4.19 Mission/Activity — domaine Work (répond à URS-F-190 à quinquies, nouveau v29 — Phase 13, TD-009)

- `Mission` : conteneur de travail contextualisé — `workspace_id`/`asset_node_id` optionnels (même pattern que `AssetNode.workspace_id`/`QualityEvent.asset_node_id`), statut de cycle de vie (`ouverte`/`en_cours`/`cloturee`), journal d'audit — URS-F-190.
- `Activity` : toujours rattachée à une `Mission` (`mission_id` obligatoire, jamais orpheline), statut propre (`a_faire`/`en_cours`/`terminee`/`bloquee`) — URS-F-190bis.
- **Garde-fou non négociable** : `Dependency` (`Activity → Activity`) exprime un ordre attendu, jamais un verrou — aucune fonction du store `useMissionStore` n'empêche de faire changer le statut d'une `Activity` dont une dépendance n'est pas `terminee` (même discipline DEC-002/055 que `QualityEvent`/`Connector`), vérifié par test de régression dédié — URS-F-190ter.
- `AssociationMissionQualityEvent` : relation N:M optionnelle `Mission ↔ QualityEvent` (jointure explicite, même pattern que `ReferenceQualityEvent`/`Couverture`) — jamais une étape obligatoire à la création d'une `Mission` — URS-F-190quater.
- **Limite assumée** : aucune référence directe `Mission → Requirement/Assessment/Test/Evidence/Deliverable` construite ici — ce rôle appartient à l'entité cible `Strategy` (non construite, non persistée : `strategie-qualification/grilleDecision.ts` reste une fonction déterministe pure). `Activity produces Evidence` (matrice cible) non plus : contredirait le garde-fou non négociable déjà testé d'`Evidence` (Phase 7c — jamais une preuve orpheline, `execution_id` non nul). Les deux points sont différés explicitement, jamais résolus en silence — URS-F-190quinquies. Aucun écran (comme les Phases 5/8a/9/10) : domaine + persistance + store seulement, la Phase 17 (Mission workspace) exposera ces objets visuellement.

### 4.20 Context Engine — `ContextSnapshot` généralisé (répond à URS-F-200 à quater, nouveau v31 — Phase 14)

- `ContextSnapshot` : enregistrement immuable (`workspace_id`/`asset_node_id` nullables, ancre fournie à l'assemblage) — **aucune fonction de mise à jour exposée** par `useContextEngineStore` (invariant #12 : "ContextSnapshot is immutable") — URS-F-200bis.
- `ContextSnapshotItem` : jointure explicite et polymorphe (`type_objet: 'asset_node' | 'manufacturing_context' | 'quality_event'`, `objet_id`) réalisant "`ContextSnapshot` includes Versioned Objects N:M" — un seul type de jointure générique, cohérent avec l'invariant #5 et le pattern `ExternalReference` — URS-F-200.
- `assemblerElementsContextSnapshot` (fonction pure, `logique-metier/contexte/assemblageContextSnapshot.ts`) : ancre précise (`assetNodeId`) → résolution exacte sur ce nœud ; ancre de site (`workspaceId`) → résolution par visibilité (`noeudsVisiblesDepuisWorkspace`, extrait de `useStructureSystemeStore` en fonction pure réutilisable sans régression, mêmes tests verts) — URS-F-200ter.
- **Limite assumée** : ni la "méthode applicable" (`MethodProfileACFC`/`MethodProfileImpactAssessment`, aucun rattachement `Workspace`/`AssetNode` à ce jour) ni les "documents pertinents" (`Source`/`SourceVersion`, Phase 8a, aucun rattachement `AssetNode` à ce jour) ne sont résolus dans ce périmètre — les construire sans cas réel démontré fabriquerait une résolution non éprouvée — URS-F-200quater. `ContentPlan.context_snapshot` (Phase 9, `string`) n'est pas migré vers ce nouveau `ContextSnapshot` structuré dans ce lot. Aucun écran (comme les Phases 5/8a/9/10/13).

### 4.20bis Context Engine enrichi — narratif + grounding réel (répond à URS-F-201 à quater, nouveau v46 — Phase 27, TD-025)

- `construireNarratifContexte` (fonction pure, `logique-metier/contexte/narratifContexteSnapshot.ts`) : réorganise les `ContextSnapshotItem` déjà résolus (aucune nouvelle résolution) en quatre facettes — `ou` (`asset_node`), `quoi` (`manufacturing_context`), `comment` (toujours vide, voir limite ci-dessous), `pourquoiImpact` (`quality_event`) — URS-F-201.
- `serialiserNarratifContexte`/`idsNarratifContexte` : texte prêt à injecter dans le prompt (sections vides omises) et identifiants des faits représentés, respectivement.
- `useReasoningEngineStore.executerRaisonnement` (Phase 15, étendu) : quand `contextSnapshotId` est fourni, résout ses `ContextSnapshotItem`, construit le narratif, l'injecte dans `construirePrompt` (nouveau paramètre optionnel) — le fournisseur IA voit désormais réellement le contexte assemblé, jamais seulement une trace persistée sur `AIRequest.context_snapshot_id` — URS-F-201bis.
- `executerBoucleRaisonnement` (Phase 15, étendu) : les identifiants du narratif sont ajoutés à `idsConnus` dès le premier tour, avec la même garantie qu'un identifiant obtenu par un appel d'outil (données déterministes déjà résolues au moment de l'assemblage du `ContextSnapshot`) — une citation vers un fait du narratif reste `'connu'`, jamais rétrogradée faute d'appel d'outil explicite — URS-F-201ter.
- `MissionWorkspace.vue` : la liste plate d'éléments de contexte est remplacée par un rendu en quatre facettes (Où/Quoi/Comment/Pourquoi-Impact) ; corrige au passage un gap préexistant (`manufacturingContexts` codé en dur à `[]` lors de l'assemblage — `useProcessContextStore` n'était pas importé).
- **Limite assumée** : la facette `comment` (procédure applicable) reste vide — `Procedure` (§4.25) n'a aucun rattachement `AssetNode`/`Workspace`. Les facettes `quoi`/`pourquoiImpact` sont vérifiées uniquement par test unitaire — aucun écran de création n'existe pour `ManufacturingContext`/`QualityEvent` (gap préexistant, non introduit par ce lot, non corrigé ici) — URS-F-201quater.

### 4.21 Reasoning Engine — domaine AI (répond à URS-F-210 à sexies, nouveau v32 — Phase 15, TD-007/TD-008)

- **Contrainte technique décisive** : le relais IA (`ProviderAdapter.envoyerMessage`) est un simple proxy texte à un seul tour, son code serveur n'est pas dans ce dépôt — impossible d'y ajouter un appel d'outils natif sans toucher un système hors dépôt. Le protocole d'appel d'outils (`APPEL_OUTIL:`/`REPONSE_FINALE:`, JSON strict) est donc entièrement textuel, construit et interprété côté navigateur (`logique-metier/raisonnement/protocoleRaisonnement.ts`), la conversation reconstruite à chaque tour (le relais reste sans état, TD-007) — URS-F-210sexies.
- 4 outils de lecture (fonctions pures, `logique-metier/raisonnement/outilsRaisonnement.ts`) : `lister_requirements_pour_actif`, `lister_tests_pour_requirement` (via `Couverture`), `lister_evidence_pour_test` (via `Execution`), `lister_knowledge_items_valides`. `Risk` absent : non construit dans ce projet — URS-F-210, URS-F-210sexies.
- **Garde-fou non négociable** : `verifierConfiance` (`boucleRaisonnement.ts`) rétrograde automatiquement `connu` → `a_verifier` si citations vides ou si une citation ne correspond à aucun id réellement obtenu par un appel d'outil pendant la session — vérifié par test de régression dédié — URS-F-210ter.
- **Garde-fou** : plafond d'itérations strict (défaut 6) — arrêt explicite (`arretPourLimite: true`) si atteint sans réponse finale ; dégradation gracieuse (texte brut, `a_verifier`) si le modèle ne respecte pas le protocole — jamais un crash — URS-F-210quater.
- `AIConfiguration` versionnée et immuable (`useReasoningEngineStore.assurerConfiguration`, idempotent) — URS-F-210quinquies.
- **Garde-fou non négociable** : aucune fonction de `useReasoningEngineStore` n'écrit le contenu d'une `AIResponse` dans `Requirement`/`Test`/`KnowledgeItem` — vérifié par test de régression dédié — URS-F-210bis. `AIRequest`/`AIResponse` immuables (aucune fonction de mise à jour exposée).
- Scénario réel de vérification (spec §5) : changement de recette sur un `AssetNode` portant des `Requirement` couverts par des `Test` exécutés produisant de l'`Evidence` — testé de bout en bout avec un fournisseur IA simulé, aucun appel réseau réel. Aucun écran (comme les Phases 5/8a/9/10/13/14).

### 4.22 Coquille UX — sidebar, Accueil, mode dual (répond à URS-F-220 à quinquies, nouveau v33 — Phase 16)

- **Contrainte réelle qui façonne la coquille** : la quasi-totalité des écrans utiles sont scindés par `clientId` (`/clients/:clientId/...`), et la coquille (transverse à tous les écrans) ne connaît nativement aucun client. Plutôt que de fabriquer un concept global de "client actif" côté domaine (prématuré), `useClientActifStore` (Pinia, `localStorage`, jamais Dexie) mémorise le dernier `clientId` visité — mis à jour par un garde `router.afterEach` sur toute route portant ce paramètre — URS-F-220ter.
- `BarreLaterale.vue` : navigation groupée par intention (Accueil / Mon travail / Mon site / Clients & configuration) — remplace le bandeau ad hoc reconstruit par chaque écran comme point d'entrée transverse, sans le retirer des écrans existants (nettoyage cosmétique différé) — URS-F-220.
- `AccueilQueVoulezVousFaire.vue` : nouvel écran à la racine (`/`), cartes d'action vers des capacités réellement construites (projets, clients, configuration GitHub) — `tableau-de-bord` déplacé vers `/tableau-de-bord` (même nom de route, aucune régression vérifiée : toutes les références existantes utilisent le nom, jamais le chemin) — URS-F-220bis.
- `useModeAffichageStore` : bascule Mode Expert/Mode Assistant dans la `BarreLaterale`, préférence persistée (`localStorage`) — URS-F-220quater.
- **Limite assumée** : aucune différenciation comportementale entre les deux modes sur les écrans existants (suppose la Phase 17) ; aucun concept de "client actif" persisté côté domaine ; aucun écran existant supprimé — URS-F-220quinquies.
- **Vérifié dans un navigateur réel** (Playwright, pas seulement les tests unitaires) : démarrage, navigation Accueil → Tableau de bord, bascule de mode, mémorisation du client actif après visite d'un outil client puis retour à l'Accueil — aucune erreur console.

### 4.23 Mission workspace (répond à URS-F-230 à quinquies, nouveau v34 — Phase 17, dernière phase du plan Phases 13-17, TD-010/TD-012)

- `ListeMissions.vue` (`/clients/:clientId/missions`) : liste des `Mission` du client, création (titre, description, ancre optionnelle `Workspace`/`AssetNode` choisie parmi les entités existantes du client) — URS-F-230.
- `MissionWorkspace.vue` (`/clients/:clientId/missions/:missionId`) : en-tête (titre, changement de statut), section Activités (création, changement de statut, ajout de dépendance source→cible parmi les activités de la Mission) — URS-F-230.
- **Garde-fou vérifié** : la dépendance entre `Activity` et l'association `QualityEvent` restent non bloquantes — aucun test ne montre de changement de statut empêché par une dépendance non terminée, même discipline que §4.19 — URS-F-230bis.
- Section Contexte : bouton "Assembler le contexte" invoque `useContextEngineStore.assemblerSnapshot` ancré sur `Mission.workspace_id`/`asset_node_id`, affichage des éléments du dernier `ContextSnapshot` groupés par type — URS-F-230ter.
- Section Raisonnement : réutilise le pattern de construction d'adaptateur déjà établi par `usePanneauChatStore.construireAdaptateurs()`, désormais extrait en module partagé `construireAdaptateursIA.ts` (`construireAdaptateursIA`/`adaptateurAvecBascule`) pour éviter un second mécanisme — invoque `useReasoningEngineStore.executerRaisonnement` scopé à la Mission (`mission_id`), historique des invocations précédentes affiché — URS-F-230quater.
- **Garde-fou non négociable vérifié** : l'état de confiance de chaque `AIResponse` est affiché avec un badge dédié (`.badge-confiance--*`), volontairement distinct des jetons `--vp-statut-*` de `qualification_status` — jamais un habillage qui laisserait croire qu'une réponse IA constitue un état de qualification (TD-010) — URS-F-230quater.
- **Limite assumée** : aucune section Assessment/Requirement/Test/Evidence/Deliverable rattachée à la Mission (appartient à `Strategy`, non construite — §4.19). Aucun indicateur de "Validation State" — cette capacité, quand elle sera construite, sera une analyse d'impact de changement ancrée sur `QualityEvent`, pas un habillage du Mission workspace (TD-010/TD-012). Aucune suppression de `Mission`/`Activity` — URS-F-230quinquies.
- Vérifié : suite de tests composants dédiée (`ListeMissions.test.ts`, `MissionWorkspace.test.ts` — création/dépendance/association/assemblage de contexte/raisonnement avec fournisseur IA simulé), suite complète verte, typecheck et lint propres.

### 4.24 Architecture Technique — relations typées entre `AssetNode` (répond à URS-F-240 à quater, nouveau v35 — Phase 18, première phase du plan `docs/convergence/VISION_NORTH_STAR_CONVERGENCE.md`, TD-013)

- **Décision structurante** : aucune nouvelle entité `Equipment`/`System`/`PLC`/`HMI`/`SCADA`/`Server`/`Database`/`Network`/`Software` n'est créée — `AssetHierarchySchema.levels[]` (Phase 4/16) accepte déjà des niveaux nommés librement par le client (`level_key: string`, jamais une énumération figée), un client peut donc déjà créer des nœuds "PLC"/"SCADA"/"Serveur" sans changement de code. Seule manquait une relation *typée et dirigée* entre deux `AssetNode` — `associated_nodes[]` étant un graphe libre non typé, incapable de distinguer "contrôlé par" de "connecté à" — URS-F-240quater.
- `RelationTechnique` (`type_relation: 'controle_par' | 'connecte_a' | 'heberge_sur'`, union de chaînes extensible sans migration) : jointure explicite `AssetNode → AssetNode`, même pattern que `AssociationFonctionAssetNode` — pas de journal d'audit propre, un enregistrement de relation de fait — URS-F-240.
- **Garde-fou vérifié** : `useStructureSystemeStore.creerRelationTechnique` rejette explicitement (`noeud_introuvable`/`clients_differents`) une relation vers un nœud inexistant ou d'un autre client — jamais silencieusement tolérée, même discipline que `creerNoeud`/`workspace_introuvable` — URS-F-240.
- **Aucune détection de cycle** (choix documenté) : `associated_nodes[]` tolère déjà les cycles par conception ; imposer une contrainte plus stricte aux relations typées créerait une incohérence entre deux mécanismes de graphe du même domaine — URS-F-240quater.
- `chaineTechniqueDepuis` (fonction pure, `logique-metier/architecture-technique/chaineTechnique.ts`) : parcours en largeur des relations sortantes depuis un `AssetNode` de départ, retourne la chaîne résolue dans l'ordre de découverte (scénario réel testé : Equipment→PLC→SCADA→Server) — URS-F-240bis.
- Nouvel outil du Reasoning Engine (§4.21) : `tracer_chaine_technique` (paramètre `asset_node_id`) — étend `DonneesOutilsRaisonnement` avec `assetNodes`/`relationsTechniques`, et `TypeObjetCitable` avec `asset_node` : une citation d'`AssetNode` est désormais vérifiable par la garde de citation déterministe existante (URS-F-210ter), testé de bout en bout avec un fournisseur IA simulé — URS-F-240ter.
- **Limite assumée** : aucun écran dédié dans ce lot — domaine + persistance + store + outil de raisonnement seulement, même discipline que les Phases 5/8a/9/10/13. Aucune extension à `Database`/`Network` au-delà des 3 types de relation nommés — ajout futur sur besoin réel démontré — URS-F-240quater.
- Vérifié : tests unitaires de la fonction pure (chaîne, nœud isolé, cycle sans boucle infinie), tests du store (création, garde-fous client croisé/nœud introuvable, traversal), tests de l'outil de raisonnement (résolution + citation `asset_node`), suite complète (78 fichiers/527 tests) verte, typecheck et lint propres.

### 4.25 Cerveau procédural — `Procedure`/`ProcedureStep` (répond à URS-F-250 à quater, nouveau v38 — Phase 20, troisième phase du plan `docs/convergence/VISION_NORTH_STAR_CONVERGENCE.md`, TD-016)

- **Décision de portée (TD-016)** : la structuration d'une SOP en étapes reste un acte humain — `useProcedureStore.ajouterEtape` ne fait jamais qu'enregistrer ce qu'un appelant fournit, même discipline que `KnowledgeItem.valeur_interpretee` (§4.15). Aucune extraction automatique de structure depuis un texte libre n'est construite dans ce lot : un protocole de suggestion IA + confirmation humaine explicite serait nécessaire avant de l'engager, et n'a pas encore été conçu ni vérifié — point ouvert, à trancher explicitement avec l'utilisateur (spec §7) — URS-F-250quater.
- `Procedure` (`reference` stable + `numero_version` auto-incrémenté par référence, même patron que `SourceVersion`, §4.15) — **immuable une fois créée** : `useProcedureStore.creerProcedure` incrémente toujours `numero_version` plutôt que de muter une version existante, vérifié explicitement par test (répond à R-21, `02-analyse-de-risque-outil.md`) — URS-F-250, URS-F-250bis.
- `ProcedureStep` (`procedure_id`, `ordre`, `description`, `obligatoire`, `condition`/`responsable` optionnels) — rattaché à une version précise, jamais partagé entre révisions — URS-F-250.
- Nouvel outil du Reasoning Engine (§4.21) : `lister_etapes_procedure` (paramètre `reference`) — résout toujours la version la plus récente (`numero_version` le plus élevé, jamais une version arbitraire, même logique que `useProcedureStore.derniereVersion`), retourne ses étapes dans l'ordre. Étend `DonneesOutilsRaisonnement` avec `procedures`/`procedureSteps`, et `TypeObjetCitable` avec `procedure_step` — testé de bout en bout avec un fournisseur IA simulé, citation vérifiable par la garde déterministe existante — URS-F-250ter.
- **Limite assumée** : aucun suivi d'exécution/conformité (`ProcedureExecution`) — différé, même discipline que TD-009 (§4.19, Workflow). Aucun écran dédié, aucun lien direct `Procedure`↔`Mission`/`Activity` dans ce lot — URS-F-250quater.
- Vérifié : tests du store (création versionnée, isolation par client, garde-fous procédure introuvable/autre client, ordre des étapes), tests de l'outil de raisonnement (résolution de la dernière version, citation `procedure_step`), suite complète (80 fichiers/547 tests) verte, typecheck et lint propres.

### 4.26 Parseur déterministe de structure procédurale (répond à URS-F-260 à quater, nouveau v39 — Phase 21, quatrième phase du plan `docs/convergence/VISION_NORTH_STAR_CONVERGENCE.md`, TD-017)

- **Preuve de terrain avant conception** : deux SOP pharma réelles de deux clients différents lues intégralement depuis Google Drive (Sanofi Lyon "LYON-QUAL-PGN-000198", Ferring International Center "SMP-PROC-016168") — même enchaînement sémantique (objectif → périmètre → responsabilités → définitions → procédure → références → historique/annexes) sous un vocabulaire différent par client. Un troisième document réel (SOP équipement Markem-Imaje, tableaux d'étapes illustrés) confirme la limite du genre couvert — voir spec §2.
- `detecterSections(texte)` (`src/logique-metier/procedures/parseurStructureProcedure.ts`) : reconnaît un en-tête numéroté de premier niveau ("N. Titre"/"N Titre", jamais confondu avec une sous-section "N.M Titre"), le résout contre un dictionnaire de variantes lexicales connues. Un en-tête de forme reconnue mais absent du dictionnaire est classé `'autre'` — jamais silencieusement écarté. Aucun en-tête reconnu → tableau vide, jamais une erreur — URS-F-260, URS-F-260bis.
- `proposerStructureProcedure(texte)` : extrait, du corps de la section canonique `'procedure'`, des étapes candidates (lignes à puce/numérotées) avec condition ("si/sauf/dans le cas où...") et responsable ("Rôle : ...") détectés par motif — `null` si aucun motif clair, jamais deviné — URS-F-260ter.
- **Garde-fou inchangé (TD-016)** : le résultat (`PropositionStructureProcedure`) est une structure en mémoire, jamais persistée — aucune écriture dans `Procedure`/`ProcedureStep` (§4.25) sans confirmation humaine explicite via `useProcedureStore`. Aucun appel IA dans ce lot — URS-F-260quater.
- **Limite assumée** : décomposition fine multi-niveaux (sous-sections "N.M") non éclatée automatiquement — traitée comme texte de sous-topic, confirmation humaine requise. Genre "instruction technique illustrée" (Markem-Imaje) non couvert correctement — sur-segmentation possible en sections `'autre'`, choix assumé de favoriser le rappel sur la précision. Aucun écran de revue, aucun repli IA-assisté construits dans ce lot — URS-F-260quater.
- Vérifié : tests sur les deux lexiques réels (Sanofi, Ferring), non-confusion sous-section/section, en-tête inconnu classé `'autre'`, absence totale d'en-tête → tableau vide, extraction d'étapes avec condition/responsable détectés ou `null`. Suite complète (81 fichiers/554 tests) verte, typecheck et lint propres.

**Extension du même jour (TD-018)** : en réponse à la question explicite de l'utilisateur ("un parseur capable de couvrir tous les types de SOP ?"), un 3ᵉ document réel du corpus Drive (IMA "4915BRP"/"LA1028BRP", procédures Back-up/Restore PLC/PC) testé sans couverture (0 section, 0 étape) — puis à sa demande de maximiser la couverture sans IA avant tout repli : (1) reconnaissance de section par mot-clé quand le titre complet ne correspond à aucune entrée exacte ("PLC Procedures" contient "Procedures" → `procedure`) ; (2) sous-titre numéroté ("2.1 Pre-requisites") retenu comme `contexteDetecte` (nouveau champ d'`EtapeProposee`) plutôt qu'ignoré ou mal classé ; (3) repli ligne-par-ligne quand une section "procédure" ne contient aucune puce/numéro explicite (comportement à puces/numéros inchangé et prioritaire quand ils existent). Retesté sans régression sur Sanofi/Ferring, puis sur le document IMA (désormais 3 sections + étapes avec contexte). **Limite de fond non close** : le genre "instruction technique illustrée" (Markem-Imaje) reste hors couverture — une couverture déterministe de "tous les types" de SOP est, par construction, hors de portée d'un système de règles — URS-F-260quinquies à septies. Vérifié : 10 tests (3 nouveaux), suite complète (81 fichiers/557 tests) verte, typecheck et lint propres.

### 4.27 Lecture de tableaux Word + fournisseur Document Intelligence disponible (répond à URS-F-270 à quater, nouveau v41 — Phase 22, TD-019/TD-020)

- **Recherche de catalogue npm avant conception** : `officeparser` (Node uniquement), `docx4js` (non maintenu depuis 2018), `mammoth` (déjà abandonné en Phase 19), `docx`/`docx-templates` (génération, pas lecture) — aucun candidat sain. Code maison retenu, sur la base déjà vérifiée `jszip`+`DOMParser`.
- `extraireTableauxDocx(fichier)` (`src/connecteurs/office/DocxNatifAdapter.ts`) : parcourt `<w:body>` dans l'ordre, capture chaque `<w:tbl>` de premier niveau en grille de cellules (`lignes: string[][]`) et le texte du paragraphe non vide le plus proche qui le précède (`titreProchePrecedent`). Calibré sur la structure réelle du manuel Markem-Imaje C350 (lu intégralement dans Google Drive) — URS-F-270.
- `proposerEtapesDepuisTableaux(tableaux)` (`src/logique-metier/procedures/parseurStructureProcedure.ts`) : une étape par ligne dont la première cellule est exactement un numéro, `contexteDetecte` combinant `titreProchePrecedent` et les préconditions "Previous achievement"/"Required time" trouvées dans le même tableau — jamais fabriquées si absentes. `proposerStructureProcedure` accepte un paramètre `tableaux` optionnel, additif aux étapes textuelles, chaque tableau gardant sa propre numérotation — URS-F-270bis.
- `DocumentIntelligenceProvider` (`workers/ocr-relay/src/fournisseurs/`) : implémente `FournisseurOcr` (modèle Azure `prebuilt-layout`, reconstruit la structure de tableau sur image et PDF), même patron que `AzureVisionProvider`. **Non câblé comme fournisseur actif** — décision de compte Azure réservée à l'utilisateur — URS-F-270ter.
- **Test contre 2 SOP PDF réelles du corpus Drive** : Ferring "SOP Qualif Balance.pdf" — 9 sections canoniques correctement détectées, avec 3 sections `'autre'` parasites dues à des lignes de données numériques dans un tableau de calibration (limite découverte, jamais un mauvais canon). Sanofi "LYON-QUAL-PGN-000198.pdf" — échec initial dû à un artefact d'échappement Markdown propre au rendu Google Drive ("1\. OBJECTIF" au lieu de "1. OBJECTIF"), sans rapport avec le contenu réel du PDF ; une fois neutralisé, les 9 sections canoniques sont toutes détectées dans le bon ordre. **Limite honnête** : ce test valide le détecteur de sections sur du texte réel, pas un pipeline d'ingestion PDF réel (aucune librairie PDF installée) — URS-F-270quater.
- Vérifié : 82 fichiers/574 tests (8 nouveaux sur `extraireTableauxDocx`, 4 sur `proposerEtapesDepuisTableaux`, 8 sur `DocumentIntelligenceProvider`), typecheck et lint propres.

### 4.28 Ingestion PDF native (répond à URS-F-280 à quater, nouveau v42 — Phase 23, TD-021)

- **Preuve de terrain** : recherche élargie dans Google Drive (`mimeType = 'application/pdf'`) fait remonter un 4ᵉ genre réel de SOP — "PB1D_Operation.pdf" (manuel Nordson), en-têtes en **gras sans aucune numérotation**, hors de portée de `RE_TITRE_NUMEROTE` (exige un chiffre en tête de ligne) — confirme la limite de fond (§4.26/URS-F-260septies) sur un document indépendant supplémentaire.
- **Recherche/test de librairie** : `pdfjs-dist` (0 vulnérabilité `npm audit`) — le build principal échoue à l'import en test (`DOMMatrix is not defined`, API Canvas absente de `jsdom`) ; le build `legacy` (documenté par Mozilla pour ces environnements) importe et exécute sans erreur des deux côtés. Différence assumée avec l'échec de `mammoth` (TD-014) : ici la logique de parsing est identique en test et en production, seule l'URL du worker/des polices diffère (injectée en paramètre, défaut `import.meta.url` natif Vite) — jamais une divergence de code comme chez `mammoth`.
- `extraireTextePdf(fichier, config?)` (`src/connecteurs/pdf/PdfNatifAdapter.ts`) : texte extrait page par page, pages jointes dans l'ordre — URS-F-280, URS-F-280bis.
- Testé sur un PDF réellement valide construit à la main (table `xref` à offsets exacts) — un bug réel trouvé et corrigé pendant la construction du test (troncature de texte sur une `MediaBox` trop étroite, avant élargissement) — URS-F-280ter.
- **Limites assumées** : aucune extraction de structure de tableau depuis un PDF natif (texte plat uniquement) ; aucun wiring écran/store — URS-F-280quater.
- Vérifié : 83 fichiers/577 tests (3 nouveaux), typecheck et lint propres, `npm audit` 0 vulnérabilité (`pdfjs-dist` ajouté).

### 4.29 Repli IA-assisté de structuration procédurale (répond à URS-F-290 à quater, nouveau v43 — Phase 24, TD-022)

- **Point ouvert engagé, pas décidé unilatéralement** : TD-016 (Phase 20) laissait ce repli explicitement ouvert. L'utilisateur l'a tranché en deux temps — "tout faire d'abord sans l'IA" (TD-017), puis "Fais les deux [PDF + repli IA]" une fois la couverture déterministe démontrée insuffisante sur un 4ᵉ genre réel (Nordson, TD-021) — 5 documents réels testés au total avant d'engager ce lot.
- `proposerStructureProcedureParIA(texte, provider)` (`src/logique-metier/procedures/proposerStructureProcedureIA.ts`) : réutilise `ProviderAdapter` (§4.4, aucune nouvelle interface fournisseur), un prompt exigeant explicitement la recopie mot pour mot du texte source, un protocole de sortie contraint (`SECTION|.../ETAPE|...`) parsé déterministiquement — URS-F-290.
- **Vérification déterministe d'ancrage**, jamais une confiance sur la seule affirmation du modèle : chaque section/étape est comparée (texte normalisé) au document source — présente → `EtatConfianceIA` `'infere'` ; absente (reformulation ou hallucination) → `'a_verifier'` — URS-F-290bis.
- La réponse brute du modèle est toujours conservée (`texteReponseBrute`), même en cas d'échec de parsing ; une ligne malformée est ignorée sans interrompre le traitement — URS-F-290ter.
- **Garde-fou inchangé (TD-016)** : jamais une écriture directe dans `Procedure`/`ProcedureStep` sans confirmation humaine. **Limites assumées** : ancrage par sous-chaîne normalisée, pas une similarité sémantique floue ; aucun déclenchement automatique ni écran de revue dans ce lot — URS-F-290quater.
- Vérifié : 84 fichiers/583 tests (6 nouveaux : transmission du contenu joint, ancrage réussi, hallucination détectée, insensibilité casse/espaces sans faux positif, canon inconnu replié sur `'autre'`, ligne malformée ignorée + réponse brute conservée), typecheck et lint propres.

### 4.30 Écran de revue de structure procédurale + déclenchement du repli (répond à URS-F-300 à quater, nouveau v44 — Phase 25, TD-023)

- **Clôture du dernier point ouvert de TD-022** : le parseur déterministe (§4.26-§4.27) et le repli IA (§4.29) existaient comme fonctions isolées, sans orchestration ni point d'entrée humain — l'utilisateur confirme explicitement ("D'accord continue") vouloir clore ce point.
- `proposerStructureProcedureAvecRepli(texte, tableaux, provider)` (`src/logique-metier/procedures/proposerStructureProcedureAvecRepli.ts`) : essaie toujours le parseur déterministe en premier ; n'invoque le repli IA que si celui-ci ne retourne strictement aucune section ni étape. Retourne un type discriminé `PropositionAvecSource` (`source: 'deterministe' | 'ia'`) — jamais un mélange implicite des deux provenances dans un même résultat — URS-F-300.
- `useProcedureStore` étendu : `genererProposition`/`annulerProposition`/`confirmerProposition` — seule `confirmerProposition` écrit réellement (délègue à `creerProcedure`/`ajouterEtape` déjà existants), dans l'ordre fourni par l'appelant (l'écran a pu réordonner/exclure des éléments avant confirmation).
- Nouvel écran `RevueStructureProcedure.vue` (route `/clients/:clientId/procedures`, lien sidebar "Procédures") : import `.docx`/`.pdf` (réutilise §4.15/§4.28) ou collage de texte, génération, revue éditable des sections/étapes (case à cocher "Retenir" par étape), formulaire de métadonnées, confirmation — URS-F-300bis.
- Badge de confiance IA par élément affiché avec le même style dédié que `MissionWorkspace.vue` (§4.23, TD-010) — jamais confondu avec un statut de qualification — URS-F-300ter.
- **Garde-fou inchangé (TD-016)** : aucune écriture sans confirmation humaine explicite. **Limites assumées** : aucune réconciliation avec une `Procedure` existante de même référence (confirmer crée toujours une nouvelle version) ; aucune sauvegarde de brouillon entre sessions — URS-F-300quater.
- Vérifié : 85 fichiers/589 tests, typecheck et lint propres. **Vérification navigateur réelle** (Playwright, Chromium préinstallé) : chemin déterministe complet (création client → génération → confirmation → `Procedure`/`ProcedureStep` visibles), annulation (aucune écriture), repli IA sans fournisseur configuré (erreur réseau affichée proprement, jamais un plantage silencieux).

### 4.31 Archivage protégé de client/projet (répond à URS-F-310 à quinquies, nouveau v63 — 31/08/2026, TD-033)

- **Demande explicite de l'utilisateur** : pouvoir supprimer un client/projet, protégé par un mot de passe, nécessitant un « système d'identification avec mail/visa et un mot de passe ». Deux décisions de gouvernance déjà actées (cadrage §5 « jamais de mot de passe » ; TD-011, RBAC/e-signature de façade interdite) rendaient une implémentation littérale dangereuse — soumis à `AskUserQuestion` avant conception, l'utilisateur tranche : double garde (nom + mot de passe) et archivage (jamais une suppression physique).
- `logique-metier/securite/verrouLocal.ts` : `hacherMotDePasse`/`verifierMotDePasse`/`genererSel` — PBKDF2-SHA-256 (100 000 itérations, sel aléatoire, Web Crypto API `crypto.subtle`). Jamais un hachage simple, jamais un mot de passe en clair stocké ou comparé.
- `useProfilLocalStore`/`ProfilLocal.vue` (route `/profil-local`, lien sidebar "Profil local") : enregistrement unique par installation (`EnregistrementProfilLocal` — email, visa, hash, sel), même patron qu'`EnregistrementConnexionGitHub`. Modifier un profil existant exige de resaisir le mot de passe actuel — URS-F-310bis.
- `ModaleConfirmationArchivage.vue` (composant réutilisé par `GestionClients.vue` et `FicheProjet.vue`) : double garde — (1) retaper le nom exact du client/projet, (2) mot de passe du profil local — les deux vérifiées avant toute écriture ; affiche une invite claire à configurer le profil si aucun n'existe, plutôt qu'un blocage silencieux — URS-F-310ter. Charge explicitement `profilLocalStore` dans son propre `onMounted` (pas seulement dans `ProfilLocal.vue`) : un état Pinia ne survit pas à une navigation complète, un écran qui n'a jamais visité `/profil-local` doit quand même voir le profil réel.
- `Client`/`Project` gagnent `statut: 'actif' | 'archive'` + `archived_at`/`archived_by` (déclaratif, jamais vérifié cryptographiquement — même limite qu'`EntreeJournalAudit.actor`). `archiverClient`/`archiverProjet`/`desarchiverClient`/`desarchiverProjet` dans les stores existants — **aucune fonction de suppression physique n'est ajoutée** (ni `db.clients.delete` ni `db.projects.delete`) — URS-F-310. `GestionClients.vue`/`TableauDeBord.vue` filtrent par défaut sur les éléments actifs, avec une section repliable "Afficher les archivés".
- **Garde-fou non négociable, présenté sans ambiguïté dans l'UI et le code (TD-033/TD-011)** : ce mot de passe n'est jamais qualifié d'authentification, de session, ou de signature électronique — texte explicite sur `ProfilLocal.vue` et `ModaleConfirmationArchivage.vue` : « jamais une authentification, une session, ou une signature électronique réglementaire » — URS-F-310quater.
- **Limite assumée** : aucune protection contre un accès déjà obtenu au navigateur (hachage inspectable via IndexedDB/DevTools) ; aucun rôle, aucun compte multi-utilisateur, aucune session expirable — hors périmètre Phase 1, non rouvert — URS-F-310quinquies.
- Vérifié : 743 tests (suite complète), typecheck et lint propres. **Vérification navigateur réelle** (Playwright) : tentative d'archivage sans profil → invite claire, aucune écriture ; profil configuré ; mauvais nom → refusé ; mauvais mot de passe → refusé ; les deux corrects → client archivé (disparaît de la liste active, persiste après reload, réapparaît dans les archives, désarchivage fonctionnel) ; même parcours vérifié côté projet (redirection vers le tableau de bord après archivage) — aucune erreur console. Un bug réel trouvé et corrigé pendant cette vérification : la modale n'appelait initialement jamais `profilLocalStore.charger()`, affichant à tort "aucun profil configuré" après un rechargement de page.

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
| URS-F-038 à 039bis, 038bis, 039ter | §4.4bis |
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
