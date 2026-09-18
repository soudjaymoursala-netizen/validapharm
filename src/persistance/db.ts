import Dexie, { type EntityTable } from 'dexie'
import type {
  Activity,
  AIConfiguration,
  AIRequest,
  AIResponse,
  AiChatSessionLog,
  AssetHierarchySchema,
  AssetNode,
  AssociationFonctionAssetNode,
  AssociationFonctionProcess,
  AssociationMissionQualityEvent,
  Client,
  ClientConfig,
  CitationAIResponse,
  ClassificationCriticiteParametre,
  Confirmation,
  Conflict,
  Connector,
  ContentPlan,
  ContextSnapshot,
  ContextSnapshotItem,
  CPP,
  CQA,
  Dependency,
  Extraction,
  ExtractionItem,
  EvaluationACFC,
  EvaluationCSVAssessment,
  EvaluationImpactAssessment,
  Evidence,
  EvidenceLocation,
  Execution,
  ExecutionEvent,
  ExecutionStep,
  ExternalReference,
  FonctionActif,
  GabaritExportClient,
  KnowledgeItem,
  KnowledgeRelation,
  ManufacturingContext,
  Measurement,
  MethodProfileACFC,
  MethodProfileImpactAssessment,
  Mission,
  Organization,
  Parameter,
  Couverture,
  Procedure,
  ProcedureStep,
  Process,
  ProvenanceLink,
  Project,
  QualityEvent,
  ReferenceQualityEvent,
  RelationTechnique,
  Requirement,
  RiskAssessment,
  MethodProfileRiskAssessment,
  Section,
  Source,
  SourceLocation,
  SourceVersion,
  SyncJob,
  Test,
  Workspace,
  TestCandidate,
  TestObjective,
} from '../logique-metier/domaine/types'

export interface EnregistrementVersionSchema {
  id: 'unique'
  version: string
  migrated_at: string
}

/**
 * Profil utilisateur local (§4.31) — enregistrement
 * unique, pas par client (un seul poste, un seul utilisateur local, même
 * raisonnement que `EnregistrementConnexionGitHub`). Porte le verrou de
 * confirmation (mot de passe haché, jamais en clair — voir
 * `logique-metier/securite/verrouLocal.ts`) requis pour archiver un
 * client/projet, et l'identité déclarative (email/visa) écrite dans
 * `archived_by` — **pas** un compte, **pas** une authentification de
 * session, **pas** une signature électronique.
 */
export interface EnregistrementProfilLocal {
  id: 'unique'
  /** Ajoutés (§8.1 du prompt maître, écran Profil) — `null` pour un profil créé avant cette version. */
  nom: string | null
  prenom: string | null
  email: string
  visa: string
  motDePasseHash: string
  motDePasseSel: string
  created_at: string
  updated_at: string
}

/**
 * SHA de branche connu après la dernière synchronisation réussie —
 * nécessaire à la détection de conflit optimiste : chaque
 * `ecrireGroupe` doit connaître le SHA sur lequel il se base.
 */
export interface EnregistrementEtatSynchronisation {
  id: 'unique'
  shaBrancheConnue: string | null
  derniereSynchronisation: string | null
}

/**
 * Configuration de connexion au miroir Google Drive — une par
 * client (`client_id`), jamais globale : contrairement à GitHub (un seul
 * dépôt pour toute l'installation), Drive est explicitement "le dossier
 * dédié du client" et les secrets sont isolés par `client_id`.
 */
export interface EnregistrementConnexionDrive {
  client_id: string
  dossierId: string
  jeton: string
}

/** Horodatage du dernier miroir Drive réussi par client (alerte si > 1 session). */
export interface EnregistrementEtatMiroirDrive {
  client_id: string
  dernierMiroirReussi: string | null
}

/**
 * Configuration de connexion au relais OCR — même principe que le relais
 * IA : enregistrement unique, pas par client, un seul Worker serverless
 * pour toute l'installation.
 */
export interface EnregistrementConnexionRelaisOCR {
  id: 'unique'
  relayUrl: string
  jeton: string
}

// Le dépôt GitHub dédié (`EnregistrementConnexionGitHub`), le relais IA
// (`EnregistrementConnexionRelaisIA`) et la connexion Drive en lecture pour
// la bibliothèque de normes (`EnregistrementConnexionDriveLectureNormes`)
// vivaient ici — paramètres globaux à l'installation, jamais partagés
// entre appareils/postes puisque IndexedDB est strictement local au
// navigateur (signalé par l'utilisateur : configuration retrouvée vide
// après connexion depuis un autre poste). Migrés vers le Worker/D1
// (`parametres_installation`, voir `useConnexionGitHubStore`/
// `useConnexionRelaisIAStore`/`useNormativeDocumentsStore`), tables retirées
// ci-dessous (version 32).

/**
 * Configuration de connexion au Worker d'authentification — même principe
 * que le relais IA/OCR : enregistrement unique, pas par client, un seul
 * Worker serverless pour toute l'installation. Contrairement aux autres
 * relais,
 * ne porte jamais de jeton d'accès permanent : le jeton de session
 * (`useAuthStore`) est obtenu dynamiquement via `/auth/login`, jamais
 * stocké ici.
 */
export interface EnregistrementConnexionAuthentification {
  id: 'unique'
  relayUrl: string
}

/**
 * Session d'authentification persistée — jeton JWT + copie du
 * profil public de l'utilisateur connecté, pour survivre à un rechargement
 * de page sans devoir se reconnecter à chaque fois. Le jeton expire côté
 * serveur (12h, `workers/auth-worker/src/jwt.ts`) — une copie expirée ici
 * échoue simplement au premier appel authentifié, `useAuthStore` renvoie
 * alors vers l'écran de connexion.
 */
export interface EnregistrementSessionAuthentification {
  id: 'unique'
  jeton: string
  utilisateur: {
    id: string
    email: string
    nom: string
    prenom: string
    role: 'admin' | 'utilisateur'
    statut: 'actif' | 'desactive'
    createdAt: string
  }
}

/** Forme de `NormativeDocument` telle qu'enregistrée en IndexedDB avant la version 33 (voir migration ci-dessous). */
export interface DocumentNormatifAncien {
  id: string
  category: string
  titre: string
  filename: string
  source: string
  source_ref: string | null
  extracted_text: string
  content: Blob | null
  mime_type: string
  uploaded_at: string
  uploaded_by: string
}

/**
 * Documents capturés depuis l'ancienne table `normativeDocuments` juste
 * avant sa suppression (version 33) — vide sur un navigateur déjà passé par
 * cette version (la montée de version IndexedDB ne s'exécute qu'une seule
 * fois par origine). Muté (jamais réassigné) pour rester la même référence
 * que celle remplie par `upgrade()` plus bas. Consommé et envoyé au serveur
 * par `migrerDocumentsLocauxVersServeur` (`useNormativeDocumentsStore`) au
 * premier chargement de l'écran Bibliothèque de normes.
 */
export const documentsNormatifsAMigrer: DocumentNormatifAncien[] = []

/**
 * Structure Système (référentiel d'actifs) capturée depuis les anciennes
 * tables locales `assetHierarchySchemas`/`assetNodes`/`relationsTechniques`
 * juste avant leur suppression (version 34, Phase 1 du chantier de
 * migration D1, docs/CHANTIER-MIGRATION-D1-RECAP.md) — même filet de
 * sécurité que `documentsNormatifsAMigrer` : vide sur un navigateur déjà
 * passé par cette version. Consommé et envoyé au serveur par
 * `migrerStructureSystemeLocaleVersServeur` (`useStructureSystemeStore`) au
 * premier chargement de l'écran Structure Système.
 */
export const assetHierarchySchemasAMigrer: AssetHierarchySchema[] = []
export const assetNodesAMigrer: AssetNode[] = []
export const relationsTechniquesAMigrer: RelationTechnique[] = []

/**
 * Organization/Workspace capturés depuis les anciennes tables locales
 * `organizations`/`workspaces` juste avant leur suppression (version 35,
 * Phase 2 du chantier de migration D1, docs/CHANTIER-MIGRATION-D1-RECAP.md)
 * — même filet de sécurité que `assetHierarchySchemasAMigrer` ci-dessus :
 * vide sur un navigateur déjà passé par cette version. Consommé et envoyé
 * au serveur par `migrerOrganisationsLocalesVersServeur`
 * (`useOrganizationStore`) au premier `charger()`.
 */
export const organizationsAMigrer: Organization[] = []
export const workspacesAMigrer: Workspace[] = []

/**
 * `Project` capturés depuis l'ancienne table locale `projects` juste avant
 * sa suppression (version 36, Phase 3a du chantier de migration D1,
 * docs/CHANTIER-MIGRATION-D1-RECAP.md) — même filet de sécurité que
 * `organizationsAMigrer` ci-dessus : vide sur un navigateur déjà passé par
 * cette version. Consommé et envoyé au serveur par
 * `migrerProjetsLocauxVersServeur` (`useProjectsStore`) au premier
 * `chargerProjets()`.
 */
export const projectsAMigrer: Project[] = []

/**
 * `Section` capturées depuis l'ancienne table locale `sections` juste avant
 * sa suppression (version 37, Phase 3b du chantier de migration D1,
 * docs/CHANTIER-MIGRATION-D1-RECAP.md) — même filet de sécurité que
 * `projectsAMigrer` ci-dessus : vide sur un navigateur déjà passé par
 * cette version. Consommé et envoyé au serveur par
 * `migrerSectionsLocalesVersServeur` (`useSectionsStore`) au premier
 * `chargerSectionsDuProjet()`.
 */
export const sectionsAMigrer: Section[] = []

/**
 * Forme de `ProjectDocument` telle qu'enregistrée en IndexedDB avant la
 * version 38 (voir migration ci-dessous) — `content`/`mime_type`
 * remplacés côté serveur par `has_binary_content` (le contenu binaire
 * vivant désormais dans R2, jamais préchargé), même transformation que
 * `DocumentNormatifAncien` à la migration 0003.
 */
export interface ProjectDocumentAncien {
  id: string
  project_id: string
  filename: string
  status: string
  uploaded_at: string
  uploaded_by: string
  extracted_text: string
  content: Blob | null
  mime_type: string
}

/**
 * `ProjectDocument` capturés depuis l'ancienne table locale
 * `projectDocuments` juste avant sa suppression (version 38, Phase 3c du
 * chantier de migration D1, docs/CHANTIER-MIGRATION-D1-RECAP.md) — même
 * filet de sécurité que `sectionsAMigrer` ci-dessus : vide sur un
 * navigateur déjà passé par cette version. Consommé et envoyé au serveur
 * par `migrerDocumentsLocauxVersServeur` (`useProjectDocumentsStore`) au
 * premier `charger()`.
 */
export const projectDocumentsAMigrer: ProjectDocumentAncien[] = []

/**
 * `MethodProfileACFC`/`EvaluationACFC` capturés depuis les anciennes
 * tables locales `methodProfilesACFC`/`evaluationsACFC` juste avant leur
 * suppression (version 39, Phase 4a du chantier de migration D1,
 * docs/CHANTIER-MIGRATION-D1-RECAP.md) — même filet de sécurité que
 * `projectDocumentsAMigrer` ci-dessus : vide sur un navigateur déjà passé
 * par cette version. La forme de ces deux types n'a pas changé (D1 ne
 * fait que remplacer IndexedDB comme lieu de stockage, jamais le
 * contrat), contrairement à `ProjectDocumentAncien` ci-dessus — inutile
 * d'introduire un type "Ancien" séparé ici. Consommés et envoyés au
 * serveur par `migrerAcfcLocalVersServeur` (`useMethodProfileACFCStore`)
 * au premier `charger()`.
 */
export const methodProfilesACFCAMigrer: MethodProfileACFC[] = []
export const evaluationsACFCAMigrer: EvaluationACFC[] = []

/**
 * Filet de sécurité de migration locale pour `Parameter`/
 * `ClassificationCriticiteParametre`/`CPP`/`CQA` (Target Architecture §10,
 * Phase 4b du chantier de migration D1,
 * docs/CHANTIER-MIGRATION-D1-RECAP.md) — même principe que
 * `methodProfilesACFCAMigrer` ci-dessus : ces 4 types n'ont pas changé de
 * forme, D1 ne fait que remplacer IndexedDB comme lieu de stockage, donc
 * pas de type "Ancien" séparé ici non plus. Consommés et envoyés au
 * serveur par `migrerParametersLocalVersServeur` (`useParameterStore`) au
 * premier `charger()`.
 */
export const parametersAMigrer: Parameter[] = []
export const classificationsCriticiteParametreAMigrer: ClassificationCriticiteParametre[] = []
export const cppsAMigrer: CPP[] = []
export const cqasAMigrer: CQA[] = []

/**
 * Filet de sécurité de migration locale pour `MethodProfileImpactAssessment`/
 * `EvaluationImpactAssessment`/`EvaluationCSVAssessment` (F1/F3 du
 * catalogue §10, Phase 4c du chantier de migration D1,
 * docs/CHANTIER-MIGRATION-D1-RECAP.md) — même principe que
 * `parametersAMigrer` ci-dessus : formes domaine inchangées, pas de type
 * "Ancien". Consommés et envoyés au serveur par
 * `migrerImpactAssessmentLocalVersServeur`/`migrerCsvAssessmentLocalVersServeur`
 * (`useImpactAssessmentStore`/`useCSVAssessmentStore`) au premier `charger()`.
 */
export const methodProfilesImpactAssessmentAMigrer: MethodProfileImpactAssessment[] = []
export const evaluationsImpactAssessmentAMigrer: EvaluationImpactAssessment[] = []
export const evaluationsCSVAssessmentAMigrer: EvaluationCSVAssessment[] = []

/**
 * Filet de sécurité de migration locale pour `MethodProfileRiskAssessment`/
 * `RiskAssessment` (AMDEC, Target Architecture §10, Phase 4d du chantier
 * de migration D1, docs/CHANTIER-MIGRATION-D1-RECAP.md) — même principe
 * que `methodProfilesImpactAssessmentAMigrer` ci-dessus : formes domaine
 * inchangées, pas de type "Ancien". Consommés et envoyés au serveur par
 * `migrerRiskAssessmentLocalVersServeur` (`useRiskAssessmentStore`) au
 * premier `charger()`.
 */
export const methodProfilesRiskAssessmentAMigrer: MethodProfileRiskAssessment[] = []
export const risksAssessmentAMigrer: RiskAssessment[] = []

/**
 * Filet de sécurité de migration locale pour `Process`/`FonctionActif`/
 * `AssociationFonctionAssetNode`/`AssociationFonctionProcess`/
 * `ManufacturingContext` (Target Architecture §4/§5/§7, Phase 5a du
 * chantier de migration D1, docs/CHANTIER-MIGRATION-D1-RECAP.md) — même
 * principe que `methodProfilesRiskAssessmentAMigrer` ci-dessus : formes
 * domaine inchangées, pas de type "Ancien". Consommés et envoyés au
 * serveur par `migrerProcessContextLocalVersServeur`
 * (`useProcessContextStore`) au premier `charger()`.
 */
export const processesAMigrer: Process[] = []
export const fonctionsActifAMigrer: FonctionActif[] = []
export const associationsFonctionAssetNodeAMigrer: AssociationFonctionAssetNode[] = []
export const associationsFonctionProcessAMigrer: AssociationFonctionProcess[] = []
export const manufacturingContextsAMigrer: ManufacturingContext[] = []

/**
 * QualityEvent/ReferenceQualityEvent : migrés vers le Worker/D1 (URS
 * catalogue §10 famille H/I, Phase 5b du chantier de migration D1) — même
 * principe que `processesAMigrer` ci-dessus : formes domaine inchangées,
 * pas de type "Ancien". Consommés et envoyés au serveur par
 * `migrerQualityEventsLocalVersServeur` (`useQualityEventStore`) au premier
 * `charger()`.
 */
export const qualityEventsAMigrer: QualityEvent[] = []
export const referencesQualityEventAMigrer: ReferenceQualityEvent[] = []

/**
 * Requirement/TestObjective/TestCandidate/Test/Couverture : migrés vers
 * le Worker/D1 (Target Architecture, domaine "Test", Phase 6a du chantier
 * de migration D1) — même principe que `qualityEventsAMigrer` ci-dessus :
 * formes domaine inchangées, pas de type "Ancien". Consommés et envoyés
 * au serveur par `migrerTestDefinitionLocalVersServeur`
 * (`useTestDefinitionStore`) au premier `charger()`.
 */
export const requirementsAMigrer: Requirement[] = []
export const testObjectivesAMigrer: TestObjective[] = []
export const testCandidatesAMigrer: TestCandidate[] = []
export const testsAMigrer: Test[] = []
export const couverturesAMigrer: Couverture[] = []

/**
 * Execution/ExecutionStep/Measurement/ExecutionEvent : migrés vers le
 * Worker/D1 (Target Architecture, domaine "Execution", Phase 6b du
 * chantier de migration D1) — même principe que `requirementsAMigrer`
 * ci-dessus : formes domaine inchangées, pas de type "Ancien". Consommés
 * et envoyés au serveur par `migrerExecutionsLocalVersServeur`
 * (`useExecutionStore`) au premier `charger()`.
 */
export const executionsAMigrer: Execution[] = []
export const executionStepsAMigrer: ExecutionStep[] = []
export const measurementsAMigrer: Measurement[] = []
export const executionEventsAMigrer: ExecutionEvent[] = []

/**
 * Evidence/EvidenceLocation/ProvenanceLink : migrés vers le Worker/D1
 * (Target Architecture, domaine "Evidence", Phase 6c du chantier de
 * migration D1) — même principe que `executionsAMigrer` ci-dessus :
 * formes domaine inchangées, pas de type "Ancien". Consommés et envoyés
 * au serveur par `migrerEvidencesLocalVersServeur` (`useEvidenceStore`)
 * au premier `charger()`.
 */
export const evidencesAMigrer: Evidence[] = []
export const evidenceLocationsAMigrer: EvidenceLocation[] = []
export const provenanceLinksAMigrer: ProvenanceLink[] = []

/**
 * Cache local IndexedDB — miroir de performance/hors-ligne,
 * jamais la source de vérité (le dépôt GitHub dédié l'est). Une table par
 * type d'enregistrement, alignée sur l'arborescence `/data` documentée dans
 * la conception interne.
 *
 * @requirement Cache local IndexedDB
 */
export class ValidaPharmDatabase extends Dexie {
  clients!: EntityTable<Client, 'id'>
  clientConfigs!: EntityTable<ClientConfig, 'client_id'>
  schemaVersion!: EntityTable<EnregistrementVersionSchema, 'id'>
  etatSynchronisation!: EntityTable<EnregistrementEtatSynchronisation, 'id'>
  connexionDrive!: EntityTable<EnregistrementConnexionDrive, 'client_id'>
  etatMiroirDrive!: EntityTable<EnregistrementEtatMiroirDrive, 'client_id'>
  connexionRelaisOCR!: EntityTable<EnregistrementConnexionRelaisOCR, 'id'>
  aiChatSessionLogs!: EntityTable<AiChatSessionLog, 'id'>
  sources!: EntityTable<Source, 'id'>
  sourceVersions!: EntityTable<SourceVersion, 'id'>
  sourceLocations!: EntityTable<SourceLocation, 'id'>
  extractions!: EntityTable<Extraction, 'id'>
  extractionItems!: EntityTable<ExtractionItem, 'id'>
  knowledgeItems!: EntityTable<KnowledgeItem, 'id'>
  confirmations!: EntityTable<Confirmation, 'id'>
  knowledgeRelations!: EntityTable<KnowledgeRelation, 'id'>
  conflicts!: EntityTable<Conflict, 'id'>
  contentPlans!: EntityTable<ContentPlan, 'id'>
  connectors!: EntityTable<Connector, 'id'>
  syncJobs!: EntityTable<SyncJob, 'id'>
  externalReferences!: EntityTable<ExternalReference, 'id'>
  missions!: EntityTable<Mission, 'id'>
  associationsMissionQualityEvent!: EntityTable<AssociationMissionQualityEvent, 'id'>
  activities!: EntityTable<Activity, 'id'>
  dependencies!: EntityTable<Dependency, 'id'>
  contextSnapshots!: EntityTable<ContextSnapshot, 'id'>
  contextSnapshotItems!: EntityTable<ContextSnapshotItem, 'id'>
  aiConfigurations!: EntityTable<AIConfiguration, 'id'>
  aiRequests!: EntityTable<AIRequest, 'id'>
  aiResponses!: EntityTable<AIResponse, 'id'>
  citationsAIResponse!: EntityTable<CitationAIResponse, 'id'>
  procedures!: EntityTable<Procedure, 'id'>
  procedureSteps!: EntityTable<ProcedureStep, 'id'>
  gabaritsExportClient!: EntityTable<GabaritExportClient, 'id'>
  profilLocal!: EntityTable<EnregistrementProfilLocal, 'id'>
  connexionAuthentification!: EntityTable<EnregistrementConnexionAuthentification, 'id'>
  sessionAuthentification!: EntityTable<EnregistrementSessionAuthentification, 'id'>

  constructor(nomBaseDeDonnees = 'validapharm') {
    super(nomBaseDeDonnees)
    this.version(1).stores({
      projects: 'id, client_id, updated_at',
      sections: 'id, project_id, template_type, status, updated_at',
      projectDocuments: 'id, project_id',
      clientConfigs: 'client_id',
      schemaVersion: 'id',
      connexionGitHub: 'id',
      etatSynchronisation: 'id',
    })
    this.version(2).stores({
      clients: 'id, name',
      connexionDrive: 'client_id',
      etatMiroirDrive: 'client_id',
    })
    this.version(3).stores({
      connexionRelaisIA: 'id',
    })
    this.version(4).stores({
      aiChatSessionLogs: 'id, client_id, started_at',
    })
    this.version(5).stores({
      assetHierarchySchemas: 'client_id',
      assetNodes: 'id, client_id, parent_id, code',
    })
    this.version(6).stores({
      methodProfilesACFC: 'id, client_id, created_at',
      evaluationsACFC: 'id, client_id, method_profile_id, created_at',
    })
    this.version(7).stores({
      parameters: 'id, client_id, asset_node_id',
      classificationsCriticiteParametre: 'id, client_id, parameter_id, created_at',
      cpps: 'id, client_id, parameter_id, actif',
      cqas: 'id, client_id, actif',
    })
    this.version(8).stores({
      methodProfilesImpactAssessment: 'id, client_id, created_at',
      evaluationsImpactAssessment: 'id, client_id, method_profile_id, created_at',
      evaluationsCSVAssessment: 'id, client_id, asset_node_id, created_at',
    })
    this.version(9).stores({
      processes: 'id, client_id',
      fonctionsActif: 'id, client_id',
      associationsFonctionAssetNode: 'id, client_id, function_id, asset_node_id',
      associationsFonctionProcess: 'id, client_id, function_id, process_id',
      manufacturingContexts: 'id, client_id, asset_node_id, process_id',
    })
    this.version(10).stores({
      qualityEvents: 'id, client_id, type, origine, statut, asset_node_id',
      referencesQualityEvent: 'id, client_id, quality_event_source_id, quality_event_cible_id',
    })
    this.version(11).stores({
      connexionRelaisOCR: 'id',
    })
    this.version(12).stores({
      requirements: 'id, client_id, asset_node_id, process_id',
      testObjectives: 'id, client_id, requirement_id',
      testCandidates: 'id, client_id, test_objective_id, statut',
      tests: 'id, client_id, test_candidate_id, statut',
      couvertures: 'id, client_id, requirement_id, test_id',
    })
    this.version(13).stores({
      executions: 'id, client_id, test_id, statut',
      executionSteps: 'id, client_id, execution_id, test_step_id',
      measurements: 'id, client_id, execution_step_id',
      executionEvents: 'id, client_id, execution_id, quality_event_id',
    })
    this.version(14).stores({
      evidences: 'id, client_id, execution_id, execution_step_id',
      evidenceLocations: 'id, client_id, evidence_id',
      provenanceLinks: 'id, client_id, evidence_id, requirement_id',
    })
    this.version(15).stores({
      sources: 'id, client_id',
      extractions: 'id, client_id, source_id',
      knowledgeItems: 'id, client_id, extraction_id, statut',
      conflicts: 'id, client_id, knowledge_item_source_id, knowledge_item_cible_id, statut',
    })
    this.version(16).stores({
      contentPlans: 'id, client_id, template_id, asset_node_id, process_id, statut',
    })
    /**
     * Réalignement (25/08/2026) sur le vrai modèle cible après
     * lecture directe du package source : Source → SourceVersion →
     * Extraction → ExtractionItem → KnowledgeItem, pas Source → Extraction
     * → KnowledgeItem. `extractions`/`knowledgeItems` redéclarés avec leurs
     * nouveaux index ; aucune donnée réelle n'existait encore sur ce schéma
     * pré-version (chantier introduit dans cette même session).
     */
    this.version(17).stores({
      sourceVersions: 'id, client_id, source_id',
      sourceLocations: 'id, client_id, source_id',
      extractions: 'id, client_id, source_version_id',
      extractionItems: 'id, client_id, extraction_id',
      knowledgeItems: 'id, client_id, extraction_item_id, statut',
      confirmations: 'id, client_id, knowledge_item_id',
      knowledgeRelations: 'id, client_id, knowledge_item_source_id, knowledge_item_cible_id',
    })
    this.version(18).stores({
      connectors: 'id, client_id, type, actif',
      syncJobs: 'id, client_id, connector_id, statut',
      externalReferences: 'id, client_id, connector_id',
    })
    /**
     * `organizations.id` reprend l'`id` du `Client` migré : aucune des
     * tables `client_id` existantes n'est renommée ni migrée ici.
     */
    this.version(19).stores({
      organizations: 'id',
      workspaces: 'id, organization_id, parent_workspace_id, type',
    })
    /**
     * Câblage Workspace, étape 1 (`CABLAGE_ETAPE_1_STRUCTURE_SYSTEME_SPEC.md`)
     * — ajout additif de `workspace_id` sur `assetNodes`, indexé pour les
     * lectures par site. Les nœuds existants (créés avant cette version)
     * conservent `workspace_id: undefined`, traité comme `null` par le
     * store (nœud non assigné, visible partout — aucune régression).
     */
    this.version(20).stores({
      assetNodes: 'id, client_id, parent_id, code, workspace_id',
    })
    /**
     * Domaine "Work" : `Mission`/`Activity` seulement.
     */
    this.version(21).stores({
      missions: 'id, client_id, workspace_id, asset_node_id, statut',
      associationsMissionQualityEvent: 'id, client_id, mission_id, quality_event_id',
      activities: 'id, client_id, mission_id, statut',
      dependencies: 'id, client_id, activity_source_id, activity_cible_id',
    })
    /**
     * Domaine "Context" : `ContextSnapshot` généralisé, réutilisable par
     * toute `Mission` (jusqu'ici câblé sur le seul store Structure Système).
     */
    this.version(22).stores({
      contextSnapshots: 'id, client_id, workspace_id, asset_node_id',
      contextSnapshotItems: 'id, client_id, context_snapshot_id, type_objet, objet_id',
    })
    /**
     * Domaine "AI" : `AIConfiguration`/`AIRequest`/`AIResponse` +
     * `CitationAIResponse` (jointure polymorphe).
     */
    this.version(23).stores({
      aiConfigurations: 'id, client_id, version',
      aiRequests: 'id, client_id, mission_id, context_snapshot_id, ai_configuration_id',
      aiResponses: 'id, client_id, ai_request_id, etat_confiance',
      citationsAIResponse: 'id, client_id, ai_response_id, type_objet_cite, objet_id',
    })
    /**
     * Domaine "Architecture Technique" : relation typée et
     * dirigée entre deux `AssetNode` existants (aucune nouvelle entité
     * d'équipement).
     */
    this.version(24).stores({
      relationsTechniques: 'id, client_id, type_relation, noeud_source_id, noeud_cible_id',
    })
    /**
     * Domaine "Procedure" : structuration humaine versionnée
     * d'une SOP (`reference`+`numero_version`, même patron que
     * `SourceVersion`), aucune extraction automatique de structure.
     */
    this.version(25).stores({
      procedures: 'id, client_id, reference, numero_version',
      procedureSteps: 'id, client_id, procedure_id, ordre',
    })
    /**
     * Gabarits d'export `.docx` personnalisés par client,
     * isolés par `client_id`.
     */
    this.version(26).stores({
      gabaritsExportClient: 'id, client_id, nom',
    })
    /**
     * Risk Assessment (AMDEC) autonome, méthodologie versionnée
     * par client, corrigeant la dette "AMDEC non autonome" documentée
     * depuis `CURRENT_ARCHITECTURE.md`/`LEGACY_MAPPING.md`.
     */
    this.version(27).stores({
      methodProfilesRiskAssessment: 'id, client_id, created_at',
      risksAssessment: 'id, client_id, method_profile_id, asset_node_id, parameter_id, created_at',
    })
    /**
     * §4.31 — profil utilisateur local (verrou de
     * confirmation pour l'archivage de client/projet) + champs additifs
     * `statut`/`archived_at`/`archived_by` sur `clients`/`projects` (non
     * indexés : le volume par installation reste modeste, filtrage
     * client-side comme le reste de l'application — cohérent avec
     * `chargerClients`/`chargerProjets`, jamais de requête indexée sur ces
     * tables). Les enregistrements `Client`/`Project` créés avant cette
     * version n'ont pas ces champs : traités comme `statut: 'actif'` côté
     * store (valeur absente ≠ `'archive'`), même garantie de non-régression
     * que `workspace_id` (v20) ou `readiness` (v16→28).
     */
    this.version(28).stores({
      profilLocal: 'id',
    })
    /**
     * Authentification réelle multi-utilisateur (Cloudflare Worker + D1) :
     * enregistrement de l'URL du Worker, même patron que
     * `connexionRelaisIA`/`connexionRelaisOCR`. `clients` reste déclarée
     * ci-dessus pour compatibilité descendante (anciens enregistrements
     * locaux jamais purgés automatiquement, ALCOA+) mais n'est plus lue
     * par `useClientsStore` — D1 devient la source de vérité (nécessaire
     * pour qu'un admin voie réellement tous les clients de
     * l'organisation, structurellement impossible avec un stockage
     * seulement local). Limite assumée : les clients créés avant cette
     * version restent dans cette table, invisibles de l'application tant
     * qu'ils n'ont pas été recréés côté Worker — aucun outil de migration
     * automatique n'existe dans ce lot (voir `workers/auth-worker/README.md`).
     */
    this.version(29).stores({
      connexionAuthentification: 'id',
      sessionAuthentification: 'id',
    })
    /**
     * Bibliothèque de normes — documents importés (téléversement direct,
     * GitHub, Google Drive), globaux à l'installation (jamais scopés par
     * client, contrairement à `projectDocuments`). Indexé par `category`
     * pour le filtrage à l'écran et par `source` pour distinguer l'origine.
     *
     * `connexionDriveLectureNormes` : enregistrement unique, distinct de
     * `connexionDrive` (miroir d'écriture par client) — la bibliothèque de
     * normes est globale à l'installation, pas scopée par client, et lit un
     * dossier Drive au lieu d'y écrire (`DriveReaderConnector`, jamais
     * `DriveConnector`).
     */
    this.version(30).stores({
      normativeDocuments: 'id, category, source',
      connexionDriveLectureNormes: 'id',
    })
    /**
     * Liens structurels réels Section↔Procedure / Section↔AssetNode
     * (tâche #118) — remplace l'assistant guidé de création de livrable qui
     * ne traçait la procédure/le nœud considérés que dans `Section.audit_log`
     * (texte non exploitable pour une navigation retour). Indexés pour
     * permettre l'inverse (« quels livrables pour cette procédure/cet
     * actif ? ») depuis `RevueStructureProcedure.vue`/`DossierVivantActif.vue`.
     * Sections créées avant cette version : champ absent traité comme `null`
     * côté store, même garantie de non-régression que `workspace_id`/
     * `readiness`/`statut` (notes de version précédentes).
     */
    this.version(31).stores({
      sections: 'id, project_id, template_type, status, updated_at, procedure_id, asset_node_id',
    })

    // Dépôt GitHub dédié, Relais IA, Drive de lecture pour la bibliothèque
    // de normes : migrés vers le Worker/D1 (`parametres_installation`) —
    // un stockage seulement local par navigateur ne survivait jamais à un
    // changement d'appareil/poste (signalé par l'utilisateur). `null`
    // supprime réellement ces tables locales, jamais un simple retrait de
    // leur déclaration (qui les aurait laissées orphelines en IndexedDB).
    this.version(32).stores({
      connexionGitHub: null,
      connexionRelaisIA: null,
      connexionDriveLectureNormes: null,
    })

    // Documents normatifs (Bibliothèque de normes) : migrés vers le Worker
    // (D1 pour les métadonnées, R2 pour le texte extrait/contenu binaire)
    // — même limite déjà corrigée pour la connexion GitHub/Relais IA/Drive
    // ci-dessus, cette fois sur les documents eux-mêmes (constaté par
    // l'utilisateur : import fait sur un poste, invisible sur un autre).
    //
    // La transaction de montée de version a encore accès à l'ancienne table
    // au moment où `upgrade()` s'exécute (avant sa suppression physique) —
    // on capture donc son contenu ici plutôt que de le perdre silencieusement :
    // seul un navigateur qui exécute réellement cette montée de version
    // (jamais encore ouvert avec le code ≥ v33) a des documents à récupérer.
    // Consommé et envoyé au serveur par `migrerDocumentsLocauxVersServeur`
    // (`useNormativeDocumentsStore`) au premier chargement de l'écran.
    this.version(33)
      .stores({
        normativeDocuments: null,
      })
      .upgrade(async (tx) => {
        const anciens = await tx.table<DocumentNormatifAncien>('normativeDocuments').toArray()
        documentsNormatifsAMigrer.push(...anciens)
      })

    // Structure Système (référentiel d'actifs) : migrée vers le Worker/D1
    // (Phase 1 du chantier de migration D1, docs/CHANTIER-MIGRATION-D1-RECAP.md)
    // — même limite déjà corrigée pour les documents normatifs ci-dessus,
    // cette fois sur la hiérarchie et les nœuds eux-mêmes. Capture avant
    // suppression physique (même technique que la version 33) : seul un
    // navigateur qui exécute réellement cette montée de version a des
    // données à récupérer (ex. la hiérarchie FERRING PHARMACEUTICAL déjà
    // configurée). Consommé et envoyé au serveur par
    // `migrerStructureSystemeLocaleVersServeur` (`useStructureSystemeStore`)
    // au premier chargement de l'écran Structure Système.
    this.version(34)
      .stores({
        assetHierarchySchemas: null,
        assetNodes: null,
        relationsTechniques: null,
      })
      .upgrade(async (tx) => {
        const [schemas, noeuds, relations] = await Promise.all([
          tx.table<AssetHierarchySchema>('assetHierarchySchemas').toArray(),
          tx.table<AssetNode>('assetNodes').toArray(),
          tx.table<RelationTechnique>('relationsTechniques').toArray(),
        ])
        assetHierarchySchemasAMigrer.push(...schemas)
        assetNodesAMigrer.push(...noeuds)
        relationsTechniquesAMigrer.push(...relations)
      })

    // Organization/Workspace : migrés vers le Worker/D1 (Phase 2 du
    // chantier de migration D1, docs/CHANTIER-MIGRATION-D1-RECAP.md) —
    // même technique de capture avant suppression physique que la version
    // 34 ci-dessus. Consommé et envoyé au serveur par
    // `migrerOrganisationsLocalesVersServeur` (`useOrganizationStore`).
    this.version(35)
      .stores({
        organizations: null,
        workspaces: null,
      })
      .upgrade(async (tx) => {
        const [organizations, workspaces] = await Promise.all([
          tx.table<Organization>('organizations').toArray(),
          tx.table<Workspace>('workspaces').toArray(),
        ])
        organizationsAMigrer.push(...organizations)
        workspacesAMigrer.push(...workspaces)
      })

    // Project : migré vers le Worker/D1 (Phase 3a du chantier de migration
    // D1, docs/CHANTIER-MIGRATION-D1-RECAP.md) — même technique de capture
    // avant suppression physique que la version 35 ci-dessus. `sections`
    // (Phase 3b, version 37 ci-dessous) et `projectDocuments` (Phase 3c,
    // version 38 ci-dessous) continuent de référencer le même id de
    // projet, désormais côté serveur plutôt que dans cette table.
    // Consommé et envoyé au serveur par `migrerProjetsLocauxVersServeur`
    // (`useProjectsStore`).
    this.version(36)
      .stores({
        projects: null,
      })
      .upgrade(async (tx) => {
        const projects = await tx.table<Project>('projects').toArray()
        projectsAMigrer.push(...projects)
      })

    // Section : migrée vers le Worker/D1 (Phase 3b du chantier de
    // migration D1, docs/CHANTIER-MIGRATION-D1-RECAP.md) — même technique
    // de capture avant suppression physique que la version 36 ci-dessus.
    // `projectDocuments` (Phase 3c, version 38 ci-dessous) continue de
    // référencer le même id de projet, désormais côté serveur. Consommé
    // et envoyé au serveur par `migrerSectionsLocalesVersServeur`
    // (`useSectionsStore`).
    this.version(37)
      .stores({
        sections: null,
      })
      .upgrade(async (tx) => {
        const sections = await tx.table<Section>('sections').toArray()
        sectionsAMigrer.push(...sections)
      })

    // ProjectDocument : migré vers le Worker/D1+R2 (Phase 3c du chantier
    // de migration D1, docs/CHANTIER-MIGRATION-D1-RECAP.md) — même
    // technique de capture avant suppression physique que la version 37
    // ci-dessus. Consommé et envoyé au serveur par
    // `migrerDocumentsLocauxVersServeur` (`useProjectDocumentsStore`).
    this.version(38)
      .stores({
        projectDocuments: null,
      })
      .upgrade(async (tx) => {
        const projectDocuments = await tx.table<ProjectDocumentAncien>('projectDocuments').toArray()
        projectDocumentsAMigrer.push(...projectDocuments)
      })

    // ACFC : migré vers le Worker/D1 (Phase 4a du chantier de migration
    // D1, docs/CHANTIER-MIGRATION-D1-RECAP.md) — même technique de
    // capture avant suppression physique que la version 38 ci-dessus.
    this.version(39)
      .stores({
        methodProfilesACFC: null,
        evaluationsACFC: null,
      })
      .upgrade(async (tx) => {
        const profils = await tx.table<MethodProfileACFC>('methodProfilesACFC').toArray()
        methodProfilesACFCAMigrer.push(...profils)
        const evaluations = await tx.table<EvaluationACFC>('evaluationsACFC').toArray()
        evaluationsACFCAMigrer.push(...evaluations)
      })

    // Parameter/ClassificationCriticiteParametre/CPP/CQA : migrés vers le
    // Worker/D1 (Target Architecture §10, Phase 4b du chantier de
    // migration D1, docs/CHANTIER-MIGRATION-D1-RECAP.md) — même technique
    // de capture avant suppression physique que la version 39 ci-dessus.
    this.version(40)
      .stores({
        parameters: null,
        classificationsCriticiteParametre: null,
        cpps: null,
        cqas: null,
      })
      .upgrade(async (tx) => {
        const parametres = await tx.table<Parameter>('parameters').toArray()
        parametersAMigrer.push(...parametres)
        const classifications = await tx
          .table<ClassificationCriticiteParametre>('classificationsCriticiteParametre')
          .toArray()
        classificationsCriticiteParametreAMigrer.push(...classifications)
        const cpps = await tx.table<CPP>('cpps').toArray()
        cppsAMigrer.push(...cpps)
        const cqas = await tx.table<CQA>('cqas').toArray()
        cqasAMigrer.push(...cqas)
      })

    // MethodProfileImpactAssessment/EvaluationImpactAssessment/
    // EvaluationCSVAssessment : migrés vers le Worker/D1 (F1/F3 du
    // catalogue §10, Phase 4c du chantier de migration D1,
    // docs/CHANTIER-MIGRATION-D1-RECAP.md) — même technique de capture
    // avant suppression physique que la version 40 ci-dessus.
    this.version(41)
      .stores({
        methodProfilesImpactAssessment: null,
        evaluationsImpactAssessment: null,
        evaluationsCSVAssessment: null,
      })
      .upgrade(async (tx) => {
        const profils = await tx
          .table<MethodProfileImpactAssessment>('methodProfilesImpactAssessment')
          .toArray()
        methodProfilesImpactAssessmentAMigrer.push(...profils)
        const evaluationsImpact = await tx
          .table<EvaluationImpactAssessment>('evaluationsImpactAssessment')
          .toArray()
        evaluationsImpactAssessmentAMigrer.push(...evaluationsImpact)
        const evaluationsCsv = await tx
          .table<EvaluationCSVAssessment>('evaluationsCSVAssessment')
          .toArray()
        evaluationsCSVAssessmentAMigrer.push(...evaluationsCsv)
      })

    // MethodProfileRiskAssessment/RiskAssessment (AMDEC) : migrés vers le
    // Worker/D1 (Target Architecture §10, Phase 4d du chantier de
    // migration D1, docs/CHANTIER-MIGRATION-D1-RECAP.md) — même technique
    // de capture avant suppression physique que la version 41 ci-dessus.
    this.version(42)
      .stores({
        methodProfilesRiskAssessment: null,
        risksAssessment: null,
      })
      .upgrade(async (tx) => {
        const profils = await tx
          .table<MethodProfileRiskAssessment>('methodProfilesRiskAssessment')
          .toArray()
        methodProfilesRiskAssessmentAMigrer.push(...profils)
        const evaluations = await tx.table<RiskAssessment>('risksAssessment').toArray()
        risksAssessmentAMigrer.push(...evaluations)
      })

    // Process/FonctionActif/AssociationFonctionAssetNode/
    // AssociationFonctionProcess/ManufacturingContext : migrés vers le
    // Worker/D1 (Target Architecture §4/§5/§7, Phase 5a du chantier de
    // migration D1, docs/CHANTIER-MIGRATION-D1-RECAP.md) — même technique
    // de capture avant suppression physique que la version 42 ci-dessus.
    this.version(43)
      .stores({
        processes: null,
        fonctionsActif: null,
        associationsFonctionAssetNode: null,
        associationsFonctionProcess: null,
        manufacturingContexts: null,
      })
      .upgrade(async (tx) => {
        const processes = await tx.table<Process>('processes').toArray()
        processesAMigrer.push(...processes)
        const fonctions = await tx.table<FonctionActif>('fonctionsActif').toArray()
        fonctionsActifAMigrer.push(...fonctions)
        const associationsFonctionAssetNode = await tx
          .table<AssociationFonctionAssetNode>('associationsFonctionAssetNode')
          .toArray()
        associationsFonctionAssetNodeAMigrer.push(...associationsFonctionAssetNode)
        const associationsFonctionProcess = await tx
          .table<AssociationFonctionProcess>('associationsFonctionProcess')
          .toArray()
        associationsFonctionProcessAMigrer.push(...associationsFonctionProcess)
        const manufacturingContexts = await tx
          .table<ManufacturingContext>('manufacturingContexts')
          .toArray()
        manufacturingContextsAMigrer.push(...manufacturingContexts)
      })

    // QualityEvent/ReferenceQualityEvent : migrés vers le Worker/D1 (URS
    // catalogue §10 famille H/I, Phase 5b du chantier de migration D1,
    // docs/CHANTIER-MIGRATION-D1-RECAP.md) — même technique de capture
    // avant suppression physique que la version 43 ci-dessus.
    this.version(44)
      .stores({
        qualityEvents: null,
        referencesQualityEvent: null,
      })
      .upgrade(async (tx) => {
        const evenements = await tx.table<QualityEvent>('qualityEvents').toArray()
        qualityEventsAMigrer.push(...evenements)
        const references = await tx.table<ReferenceQualityEvent>('referencesQualityEvent').toArray()
        referencesQualityEventAMigrer.push(...references)
      })

    // Requirement/TestObjective/TestCandidate/Test/Couverture : migrés
    // vers le Worker/D1 (Target Architecture, domaine "Test", Phase 6a du
    // chantier de migration D1, docs/CHANTIER-MIGRATION-D1-RECAP.md) —
    // même technique de capture avant suppression physique que la
    // version 44 ci-dessus.
    this.version(45)
      .stores({
        requirements: null,
        testObjectives: null,
        testCandidates: null,
        tests: null,
        couvertures: null,
      })
      .upgrade(async (tx) => {
        const requirements = await tx.table<Requirement>('requirements').toArray()
        requirementsAMigrer.push(...requirements)
        const testObjectives = await tx.table<TestObjective>('testObjectives').toArray()
        testObjectivesAMigrer.push(...testObjectives)
        const testCandidates = await tx.table<TestCandidate>('testCandidates').toArray()
        testCandidatesAMigrer.push(...testCandidates)
        const tests = await tx.table<Test>('tests').toArray()
        testsAMigrer.push(...tests)
        const couvertures = await tx.table<Couverture>('couvertures').toArray()
        couverturesAMigrer.push(...couvertures)
      })

    // Execution/ExecutionStep/Measurement/ExecutionEvent : migrés vers le
    // Worker/D1 (Target Architecture, domaine "Execution", Phase 6b du
    // chantier de migration D1, docs/CHANTIER-MIGRATION-D1-RECAP.md) —
    // même technique de capture avant suppression physique que la
    // version 45 ci-dessus.
    this.version(46)
      .stores({
        executions: null,
        executionSteps: null,
        measurements: null,
        executionEvents: null,
      })
      .upgrade(async (tx) => {
        const executions = await tx.table<Execution>('executions').toArray()
        executionsAMigrer.push(...executions)
        const executionSteps = await tx.table<ExecutionStep>('executionSteps').toArray()
        executionStepsAMigrer.push(...executionSteps)
        const measurements = await tx.table<Measurement>('measurements').toArray()
        measurementsAMigrer.push(...measurements)
        const executionEvents = await tx.table<ExecutionEvent>('executionEvents').toArray()
        executionEventsAMigrer.push(...executionEvents)
      })

    // Evidence/EvidenceLocation/ProvenanceLink : migrés vers le
    // Worker/D1 (Target Architecture, domaine "Evidence", Phase 6c du
    // chantier de migration D1, docs/CHANTIER-MIGRATION-D1-RECAP.md) —
    // même technique de capture avant suppression physique que la
    // version 46 ci-dessus.
    this.version(47)
      .stores({
        evidences: null,
        evidenceLocations: null,
        provenanceLinks: null,
      })
      .upgrade(async (tx) => {
        const evidences = await tx.table<Evidence>('evidences').toArray()
        evidencesAMigrer.push(...evidences)
        const evidenceLocations = await tx.table<EvidenceLocation>('evidenceLocations').toArray()
        evidenceLocationsAMigrer.push(...evidenceLocations)
        const provenanceLinks = await tx.table<ProvenanceLink>('provenanceLinks').toArray()
        provenanceLinksAMigrer.push(...provenanceLinks)
      })
  }
}

/**
 * Instance unique utilisée par l'application réelle (stores Pinia). Les
 * tests instancient leur propre `ValidaPharmDatabase` (nom de base isolé)
 * plutôt que d'importer ce singleton, pour ne jamais partager d'état entre
 * tests.
 */
export const db = new ValidaPharmDatabase()
