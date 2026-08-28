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
  ProjectDocument,
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
 * Configuration de connexion au dépôt GitHub dédié (URS-NF-044) —
 * enregistrement unique, pas par client : SDS §3 décrit un seul dépôt de
 * données pour l'ensemble de l'installation locale (`/data/projects/...`),
 * pas un dépôt par client.
 */
export interface EnregistrementConnexionGitHub {
  id: 'unique'
  owner: string
  repo: string
  branche: string
  jeton: string
}

/**
 * SHA de branche connu après la dernière synchronisation réussie —
 * nécessaire à la détection de conflit optimiste (SDS §5) : chaque
 * `ecrireGroupe` doit connaître le SHA sur lequel il se base.
 */
export interface EnregistrementEtatSynchronisation {
  id: 'unique'
  shaBrancheConnue: string | null
  derniereSynchronisation: string | null
}

/**
 * Configuration de connexion au miroir Google Drive (SDS §5bis) — une par
 * client (`client_id`), jamais globale : contrairement à GitHub (un seul
 * dépôt pour toute l'installation), Drive est explicitement "le dossier
 * dédié du client" et les secrets sont isolés par `client_id` (SDS §7).
 */
export interface EnregistrementConnexionDrive {
  client_id: string
  dossierId: string
  jeton: string
}

/** Horodatage du dernier miroir Drive réussi par client (URS-NF-047 : alerte si > 1 session). */
export interface EnregistrementEtatMiroirDrive {
  client_id: string
  dernierMiroirReussi: string | null
}

/**
 * Configuration de connexion au relais IA (SDS §10quater) — enregistrement
 * unique, pas par client : un seul relais serverless pour toute
 * l'installation (même raisonnement que GitHub, SDS §3) ; c'est
 * `client_config.ai_provider` (par client) qui détermine quel fournisseur
 * le relais sélectionne pour une requête donnée, pas l'URL du relais
 * elle-même.
 */
export interface EnregistrementConnexionRelaisIA {
  id: 'unique'
  relayUrl: string
  jeton: string
}

/**
 * Configuration de connexion au relais OCR (TD-001, `docs/convergence/
 * TECHNICAL_DECISIONS.md`) — même principe que le relais IA :
 * enregistrement unique, pas par client, un seul Worker serverless pour
 * toute l'installation.
 */
export interface EnregistrementConnexionRelaisOCR {
  id: 'unique'
  relayUrl: string
  jeton: string
}

/**
 * Cache local IndexedDB (SDS §3) — miroir de performance/hors-ligne,
 * jamais la source de vérité (le dépôt GitHub dédié l'est). Une table par
 * type d'enregistrement, alignée sur l'arborescence `/data` documentée en
 * SDS §3.
 *
 * @requirement SDS §3, URS-NF-046, URS-NF-012
 */
export class ValidaPharmDatabase extends Dexie {
  clients!: EntityTable<Client, 'id'>
  projects!: EntityTable<Project, 'id'>
  sections!: EntityTable<Section, 'id'>
  projectDocuments!: EntityTable<ProjectDocument, 'id'>
  clientConfigs!: EntityTable<ClientConfig, 'client_id'>
  schemaVersion!: EntityTable<EnregistrementVersionSchema, 'id'>
  connexionGitHub!: EntityTable<EnregistrementConnexionGitHub, 'id'>
  etatSynchronisation!: EntityTable<EnregistrementEtatSynchronisation, 'id'>
  connexionDrive!: EntityTable<EnregistrementConnexionDrive, 'client_id'>
  etatMiroirDrive!: EntityTable<EnregistrementEtatMiroirDrive, 'client_id'>
  connexionRelaisIA!: EntityTable<EnregistrementConnexionRelaisIA, 'id'>
  connexionRelaisOCR!: EntityTable<EnregistrementConnexionRelaisOCR, 'id'>
  aiChatSessionLogs!: EntityTable<AiChatSessionLog, 'id'>
  assetHierarchySchemas!: EntityTable<AssetHierarchySchema, 'client_id'>
  assetNodes!: EntityTable<AssetNode, 'id'>
  methodProfilesACFC!: EntityTable<MethodProfileACFC, 'id'>
  evaluationsACFC!: EntityTable<EvaluationACFC, 'id'>
  parameters!: EntityTable<Parameter, 'id'>
  classificationsCriticiteParametre!: EntityTable<ClassificationCriticiteParametre, 'id'>
  cpps!: EntityTable<CPP, 'id'>
  cqas!: EntityTable<CQA, 'id'>
  methodProfilesImpactAssessment!: EntityTable<MethodProfileImpactAssessment, 'id'>
  evaluationsImpactAssessment!: EntityTable<EvaluationImpactAssessment, 'id'>
  evaluationsCSVAssessment!: EntityTable<EvaluationCSVAssessment, 'id'>
  processes!: EntityTable<Process, 'id'>
  fonctionsActif!: EntityTable<FonctionActif, 'id'>
  associationsFonctionAssetNode!: EntityTable<AssociationFonctionAssetNode, 'id'>
  associationsFonctionProcess!: EntityTable<AssociationFonctionProcess, 'id'>
  manufacturingContexts!: EntityTable<ManufacturingContext, 'id'>
  qualityEvents!: EntityTable<QualityEvent, 'id'>
  referencesQualityEvent!: EntityTable<ReferenceQualityEvent, 'id'>
  requirements!: EntityTable<Requirement, 'id'>
  testObjectives!: EntityTable<TestObjective, 'id'>
  testCandidates!: EntityTable<TestCandidate, 'id'>
  tests!: EntityTable<Test, 'id'>
  couvertures!: EntityTable<Couverture, 'id'>
  executions!: EntityTable<Execution, 'id'>
  executionSteps!: EntityTable<ExecutionStep, 'id'>
  measurements!: EntityTable<Measurement, 'id'>
  executionEvents!: EntityTable<ExecutionEvent, 'id'>
  evidences!: EntityTable<Evidence, 'id'>
  evidenceLocations!: EntityTable<EvidenceLocation, 'id'>
  provenanceLinks!: EntityTable<ProvenanceLink, 'id'>
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
  organizations!: EntityTable<Organization, 'id'>
  workspaces!: EntityTable<Workspace, 'id'>
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
  relationsTechniques!: EntityTable<RelationTechnique, 'id'>
  procedures!: EntityTable<Procedure, 'id'>
  procedureSteps!: EntityTable<ProcedureStep, 'id'>
  gabaritsExportClient!: EntityTable<GabaritExportClient, 'id'>
  methodProfilesRiskAssessment!: EntityTable<MethodProfileRiskAssessment, 'id'>
  risksAssessment!: EntityTable<RiskAssessment, 'id'>

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
     * Réalignement Phase 8a (25/08/2026) sur le vrai modèle cible après
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
     * Phase 11 (`docs/convergence/PHASE_11_ORGANIZATION_MIGRATION_SPEC.md`) —
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
     * Phase 13 (`docs/convergence/PHASE_13_MISSION_ACTIVITY_SPEC.md`) —
     * domaine "Work" : `Mission`/`Activity` seulement (TD-009).
     */
    this.version(21).stores({
      missions: 'id, client_id, workspace_id, asset_node_id, statut',
      associationsMissionQualityEvent: 'id, client_id, mission_id, quality_event_id',
      activities: 'id, client_id, mission_id, statut',
      dependencies: 'id, client_id, activity_source_id, activity_cible_id',
    })
    /**
     * Phase 14 (`docs/convergence/PHASE_14_CONTEXT_ENGINE_SPEC.md`) —
     * domaine "Context" : `ContextSnapshot` généralisé, réutilisable par
     * toute `Mission` (jusqu'ici câblé sur le seul store Structure Système).
     */
    this.version(22).stores({
      contextSnapshots: 'id, client_id, workspace_id, asset_node_id',
      contextSnapshotItems: 'id, client_id, context_snapshot_id, type_objet, objet_id',
    })
    /**
     * Phase 15 (`docs/convergence/PHASE_15_REASONING_ENGINE_SPEC.md`) —
     * domaine "AI" : `AIConfiguration`/`AIRequest`/`AIResponse` +
     * `CitationAIResponse` (jointure polymorphe). TD-007/TD-008.
     */
    this.version(23).stores({
      aiConfigurations: 'id, client_id, version',
      aiRequests: 'id, client_id, mission_id, context_snapshot_id, ai_configuration_id',
      aiResponses: 'id, client_id, ai_request_id, etat_confiance',
      citationsAIResponse: 'id, client_id, ai_response_id, type_objet_cite, objet_id',
    })
    /**
     * Phase 18 (`docs/convergence/PHASE_18_ARCHITECTURE_TECHNIQUE_SPEC.md`,
     * TD-013) — domaine "Architecture Technique" : relation typée et
     * dirigée entre deux `AssetNode` existants (aucune nouvelle entité
     * d'équipement, voir TD-013).
     */
    this.version(24).stores({
      relationsTechniques: 'id, client_id, type_relation, noeud_source_id, noeud_cible_id',
    })
    /**
     * Phase 20 (`docs/convergence/PHASE_20_PROCEDURAL_KNOWLEDGE_SPEC.md`,
     * TD-016) — domaine "Procedure" : structuration humaine versionnée
     * d'une SOP (`reference`+`numero_version`, même patron que
     * `SourceVersion`), aucune extraction automatique de structure.
     */
    this.version(25).stores({
      procedures: 'id, client_id, reference, numero_version',
      procedureSteps: 'id, client_id, procedure_id, ordre',
    })
    /**
     * Phase 26 (`docs/convergence/PHASE_26_GABARITS_EXPORT_CLIENT_SPEC.md`,
     * TD-024) — gabarits d'export `.docx` personnalisés par client
     * (URS-F-023 à 026), isolés par `client_id`.
     */
    this.version(26).stores({
      gabaritsExportClient: 'id, client_id, nom',
    })
    /**
     * Phase 29 (`docs/convergence/PHASE_29_RISK_ASSESSMENT_AMDEC_SPEC.md`,
     * TD-027) — Risk Assessment (AMDEC) autonome, méthodologie versionnée
     * par client, corrigeant la dette "AMDEC non autonome" documentée
     * depuis `CURRENT_ARCHITECTURE.md`/`LEGACY_MAPPING.md`.
     */
    this.version(27).stores({
      methodProfilesRiskAssessment: 'id, client_id, created_at',
      risksAssessment: 'id, client_id, method_profile_id, asset_node_id, parameter_id, created_at',
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
