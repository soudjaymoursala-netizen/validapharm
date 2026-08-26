import Dexie, { type EntityTable } from 'dexie'
import type {
  AiChatSessionLog,
  AssetHierarchySchema,
  AssetNode,
  AssociationFonctionAssetNode,
  AssociationFonctionProcess,
  Client,
  ClientConfig,
  ClassificationCriticiteParametre,
  Conflict,
  CPP,
  CQA,
  Extraction,
  EvaluationACFC,
  EvaluationCSVAssessment,
  EvaluationImpactAssessment,
  Evidence,
  EvidenceLocation,
  Execution,
  ExecutionEvent,
  ExecutionStep,
  FonctionActif,
  KnowledgeItem,
  ManufacturingContext,
  Measurement,
  MethodProfileACFC,
  MethodProfileImpactAssessment,
  Parameter,
  Couverture,
  Process,
  ProvenanceLink,
  Project,
  ProjectDocument,
  QualityEvent,
  ReferenceQualityEvent,
  Requirement,
  Section,
  Source,
  Test,
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
  extractions!: EntityTable<Extraction, 'id'>
  knowledgeItems!: EntityTable<KnowledgeItem, 'id'>
  conflicts!: EntityTable<Conflict, 'id'>

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
  }
}

/**
 * Instance unique utilisée par l'application réelle (stores Pinia). Les
 * tests instancient leur propre `ValidaPharmDatabase` (nom de base isolé)
 * plutôt que d'importer ce singleton, pour ne jamais partager d'état entre
 * tests.
 */
export const db = new ValidaPharmDatabase()
