// @vitest-environment node
//
// Ce Worker n'a aucun besoin du DOM (pur backend) — le reste du dépôt
// impose `environment: 'jsdom'` en config racine (pour les tests Vue), ce
// qui shadow les classes globales `Blob`/`File`/`FormData` par celles de
// jsdom : incompatibles avec le `Request`/`fetch` natif de Node (undici),
// constaté ici précisément (contenu binaire d'un document normatif
// corrompu en "undefined" au lieu des octets réels, une fois passé par un
// `FormData` construit avec le `File` global de jsdom). `node` restaure
// les classes natives Node, seules réellement compatibles entre elles.
import { afterEach, describe, expect, test, vi } from 'vitest'
import { EnvoyeurEmailMemoire } from './notifications/envoyeurEmail'
import { ACFCRepoMemoire } from './repos/acfcRepo'
import { AuditRepoMemoire } from './repos/auditRepo'
import { ClientsRepoMemoire } from './repos/clientsRepo'
import { ContentPlanRepoMemoire } from './repos/contentPlanRepo'
import { ContextSnapshotRepoMemoire } from './repos/contextSnapshotRepo'
import { CSVAssessmentRepoMemoire } from './repos/csvAssessmentRepo'
import { DocumentsNormatifsRepoMemoire } from './repos/documentsNormatifsRepo'
import { EvidenceRepoMemoire } from './repos/evidenceRepo'
import { AiChatSessionLogRepoMemoire } from './repos/aiChatSessionLogRepo'
import { ClientConfigRepoMemoire } from './repos/clientConfigRepo'
import { ConnexionDriveRepoMemoire } from './repos/connexionDriveRepo'
import { EtatMiroirDriveRepoMemoire } from './repos/etatMiroirDriveRepo'
import { ExecutionRepoMemoire } from './repos/executionRepo'
import { GabaritExportClientRepoMemoire } from './repos/gabaritExportClientRepo'
import { ImpactAssessmentRepoMemoire } from './repos/impactAssessmentRepo'
import { IntegrationRepoMemoire } from './repos/integrationRepo'
import { KnowledgeEngineRepoMemoire } from './repos/knowledgeEngineRepo'
import { MissionRepoMemoire } from './repos/missionRepo'
import { OrganisationRepoMemoire } from './repos/organisationRepo'
import { ParametersRepoMemoire } from './repos/parametersRepo'
import { ParametresInstallationRepoMemoire } from './repos/parametresInstallationRepo'
import { ProcedureRepoMemoire } from './repos/procedureRepo'
import { ProjectDocumentsRepoMemoire } from './repos/projectDocumentsRepo'
import { ProcessContextRepoMemoire } from './repos/processContextRepo'
import { ProjectsRepoMemoire } from './repos/projectsRepo'
import { QualityEventRepoMemoire } from './repos/qualityEventRepo'
import { ReasoningEngineRepoMemoire } from './repos/reasoningEngineRepo'
import { RiskAssessmentRepoMemoire } from './repos/riskAssessmentRepo'
import { TestDefinitionRepoMemoire } from './repos/testDefinitionRepo'
import { SectionsRepoMemoire } from './repos/sectionsRepo'
import { StockageBinaireRepoMemoire } from './repos/stockageBinaireRepo'
import { StructureSystemeRepoMemoire } from './repos/structureSystemeRepo'
import { UtilisateursRepoMemoire } from './repos/utilisateursRepo'
import { LimiteurConnexion } from './limiteurConnexion'
import { routerRequete, type Contexte } from './routeur'

const ORIGINE = 'https://validapharm.example'
const JETON_BOOTSTRAP = 'jeton-bootstrap-test'
const SECRET_JWT = 'secret-jwt-test'
const URL_APPLICATION = 'https://validapharm.pages.dev'
const GOOGLE_OAUTH_CLIENT_ID = 'client-oauth-test.apps.googleusercontent.com'
const GOOGLE_OAUTH_CLIENT_SECRET = 'secret-oauth-test'

function nouveauContexte(options: { sansOAuthGoogle?: boolean } = {}): Contexte {
  return {
    utilisateursRepo: new UtilisateursRepoMemoire(),
    clientsRepo: new ClientsRepoMemoire(),
    parametresInstallationRepo: new ParametresInstallationRepoMemoire(),
    documentsNormatifsRepo: new DocumentsNormatifsRepoMemoire(),
    stockageBinaireRepo: new StockageBinaireRepoMemoire(),
    structureSystemeRepo: new StructureSystemeRepoMemoire(),
    organisationRepo: new OrganisationRepoMemoire(),
    projectsRepo: new ProjectsRepoMemoire(),
    sectionsRepo: new SectionsRepoMemoire(),
    projectDocumentsRepo: new ProjectDocumentsRepoMemoire(),
    acfcRepo: new ACFCRepoMemoire(),
    parametersRepo: new ParametersRepoMemoire(),
    impactAssessmentRepo: new ImpactAssessmentRepoMemoire(),
    csvAssessmentRepo: new CSVAssessmentRepoMemoire(),
    riskAssessmentRepo: new RiskAssessmentRepoMemoire(),
    processContextRepo: new ProcessContextRepoMemoire(),
    qualityEventRepo: new QualityEventRepoMemoire(),
    testDefinitionRepo: new TestDefinitionRepoMemoire(),
    executionRepo: new ExecutionRepoMemoire(),
    evidenceRepo: new EvidenceRepoMemoire(),
    knowledgeEngineRepo: new KnowledgeEngineRepoMemoire(),
    contentPlanRepo: new ContentPlanRepoMemoire(),
    integrationRepo: new IntegrationRepoMemoire(),
    missionRepo: new MissionRepoMemoire(),
    contextSnapshotRepo: new ContextSnapshotRepoMemoire(),
    reasoningEngineRepo: new ReasoningEngineRepoMemoire(),
    procedureRepo: new ProcedureRepoMemoire(),
    gabaritExportClientRepo: new GabaritExportClientRepoMemoire(),
    aiChatSessionLogRepo: new AiChatSessionLogRepoMemoire(),
    connexionDriveRepo: new ConnexionDriveRepoMemoire(),
    etatMiroirDriveRepo: new EtatMiroirDriveRepoMemoire(),
    clientConfigRepo: new ClientConfigRepoMemoire(),
    auditRepo: new AuditRepoMemoire(),
    secretJwt: SECRET_JWT,
    jetonBootstrap: JETON_BOOTSTRAP,
    corsOrigin: ORIGINE,
    envoyeurEmail: new EnvoyeurEmailMemoire(),
    urlApplication: URL_APPLICATION,
    googleOAuthClientId: options.sansOAuthGoogle ? '' : GOOGLE_OAUTH_CLIENT_ID,
    googleOAuthClientSecret: options.sansOAuthGoogle ? '' : GOOGLE_OAUTH_CLIENT_SECRET,
  }
}

interface UtilisateurJson {
  id: string
  email: string
  nom: string
  prenom: string
  role: string
  statut: string
  createdAt: string
  motDePasseHash: undefined
}

interface ClientJson {
  id: string
  name: string
  statut: string
  archivedAt: string | null
  archivedBy: string | null
  details: string | null
  secteur: string | null
}

interface EntreeAuditJson {
  id: string
  action: string
  targetType: string
  targetId: string
  justification: string | null
  timestamp: string
}

// Le corps JSON des réponses du Worker varie selon l'endpoint — chaque
// test n'accède qu'aux champs propres à la réponse qu'il vient de
// recevoir ; les champs non pertinents pour un endpoint donné restent
// simplement inaccédés à l'exécution (jamais `any` : chaque champ garde
// une forme précise).
interface CorpsReponse {
  erreur: string
  /** Réponse relayée du relais IA (`/relais-ia`). */
  texte: string
  jeton: string
  ok: boolean
  valide: boolean
  authorized: boolean
  auditId: string
  utilisateur: UtilisateurJson
  utilisateurs: UtilisateurJson[]
  emailEnvoye: boolean
  client: ClientJson
  clients: ClientJson[]
  entrees: EntreeAuditJson[]
  parametre: {
    cle: string
    valeur: Record<string, string>
    updatedAt: string
    updatedBy: string
  } | null
  document: DocumentNormatifJson
  documents: DocumentNormatifJson[]
  resultats: { id: string; hasBinaryContent: boolean; corrige: boolean }[]
  urlAutorisation: string
  expiresIn: number
  schema: { clientId: string; levels: NiveauHierarchieJson[] }
  noeud: AssetNodeJson
  noeuds: AssetNodeJson[]
  relationsTechniques: RelationTechniqueJson[]
  relation: RelationTechniqueJson
  organization: OrganizationJson | null
  workspace: WorkspaceJson
  workspaceRacine: WorkspaceJson
  workspaces: WorkspaceJson[]
  projet: ProjectJson
  projects: ProjectJson[]
  section: SectionJson
  sections: SectionJson[]
  documentProjet: ProjectDocumentJson
  documentsProjet: ProjectDocumentJson[]
  profil: MethodProfileACFCJson
  profils: MethodProfileACFCJson[]
  evaluation: EvaluationACFCJson
  evaluations: EvaluationACFCJson[]
  parametreProcede: ParameterJson
  parametresProcede: ParameterJson[]
  classification: ClassificationCriticiteParametreJson
  classifications: ClassificationCriticiteParametreJson[]
  cpp: CPPJson
  cpps: CPPJson[]
  cqa: CQAJson
  cqas: CQAJson[]
  evaluationCsv: EvaluationCSVAssessmentJson
  evaluationsCsv: EvaluationCSVAssessmentJson[]
  profilImpact: MethodProfileImpactAssessmentJson
  profilsImpact: MethodProfileImpactAssessmentJson[]
  evaluationImpact: EvaluationImpactAssessmentJson
  evaluationsImpact: EvaluationImpactAssessmentJson[]
  profilRisque: MethodProfileRiskAssessmentJson
  profilsRisque: MethodProfileRiskAssessmentJson[]
  evaluationRisque: RiskAssessmentJson
  evaluationsRisque: RiskAssessmentJson[]
  process: ProcessJson
  processes: ProcessJson[]
  fonction: FonctionActifJson
  fonctions: FonctionActifJson[]
  associationFonctionAssetNode: AssociationFonctionAssetNodeJson
  associationsFonctionAssetNode: AssociationFonctionAssetNodeJson[]
  associationFonctionProcess: AssociationFonctionProcessJson
  associationsFonctionProcess: AssociationFonctionProcessJson[]
  manufacturingContext: ManufacturingContextJson
  manufacturingContexts: ManufacturingContextJson[]
  evenement: QualityEventJson
  evenements: QualityEventJson[]
  reference: ReferenceQualityEventJson
  references: ReferenceQualityEventJson[]
  requirement: RequirementJson
  requirements: RequirementJson[]
  testObjective: TestObjectiveJson
  testObjectives: TestObjectiveJson[]
  testCandidate: TestCandidateJson
  testCandidates: TestCandidateJson[]
  test: TestJson
  tests: TestJson[]
  couverture: CouvertureJson
  couvertures: CouvertureJson[]
  execution: ExecutionJson
  executions: ExecutionJson[]
  executionStep: ExecutionStepJson
  executionSteps: ExecutionStepJson[]
  measurement: MeasurementJson
  measurements: MeasurementJson[]
  executionEvent: ExecutionEventJson
  executionEvents: ExecutionEventJson[]
  evidence: EvidenceJson
  evidences: EvidenceJson[]
  evidenceLocation: EvidenceLocationJson
  evidenceLocations: EvidenceLocationJson[]
  provenanceLink: ProvenanceLinkJson
  provenanceLinks: ProvenanceLinkJson[]
  source: SourceJson
  sources: SourceJson[]
  sourceLocation: SourceLocationJson
  sourceLocations: SourceLocationJson[]
  sourceVersion: SourceVersionJson
  sourceVersions: SourceVersionJson[]
  extraction: ExtractionJson
  extractions: ExtractionJson[]
  extractionItem: ExtractionItemJson
  extractionItems: ExtractionItemJson[]
  knowledgeItem: KnowledgeItemJson
  knowledgeItems: KnowledgeItemJson[]
  confirmation: ConfirmationJson
  confirmations: ConfirmationJson[]
  knowledgeRelation: KnowledgeRelationJson
  knowledgeRelations: KnowledgeRelationJson[]
  conflict: ConflictJson
  conflicts: ConflictJson[]
  contentPlan: ContentPlanJson
  contentPlans: ContentPlanJson[]
  raisons: string[]
  connectors: ConnectorJson[]
  connector: ConnectorJson
  syncJobs: SyncJobJson[]
  syncJob: SyncJobJson
  externalReferences: ExternalReferenceJson[]
  externalReference: ExternalReferenceJson
  missions: MissionJson[]
  mission: MissionJson
  activities: ActivityJson[]
  activity: ActivityJson
  dependencies: DependencyJson[]
  dependency: DependencyJson
  associationsQualityEvent: AssociationMissionQualityEventJson[]
  association: AssociationMissionQualityEventJson
  contextSnapshots: ContextSnapshotJson[]
  contextSnapshot: ContextSnapshotJson
  contextSnapshotItems: ContextSnapshotItemJson[]
  configurations: AIConfigurationJson[]
  configuration: AIConfigurationJson
  requests: AIRequestJson[]
  request: AIRequestJson
  responses: AIResponseJson[]
  response: AIResponseJson
  citations: CitationAIResponseJson[]
  procedures: ProcedureJson[]
  procedure: ProcedureJson
  procedureSteps: ProcedureStepJson[]
  etape: ProcedureStepJson
  gabarits: GabaritExportClientJson[]
  gabarit: GabaritExportClientJson
  aiChatSessionLogs: AiChatSessionLogJson[]
  aiChatSessionLog: AiChatSessionLogJson
  connexionDrive: ConnexionDriveJson | null
  etatMiroirDrive: EtatMiroirDriveJson | null
  clientConfig: ClientConfigJson | null
}

interface RequirementJson {
  id: string
  clientId: string
  reference: string
  titre: string
  description: string
  assetNodeId: string | null
  processId: string | null
  auditLog: { timestamp: string; actor: string; action: string }[]
  createdAt: string
  updatedAt: string
}

interface TestObjectiveJson {
  id: string
  clientId: string
  requirementId: string
  titre: string
  description: string
  createdAt: string
  updatedAt: string
}

interface TestCandidateJson {
  id: string
  clientId: string
  testObjectiveId: string
  riskAssessmentId: string | null
  titre: string
  description: string
  statut: string
  motifRejet: string | null
  dupliqueDeId: string | null
  remplaceParId: string | null
  auditLog: { timestamp: string; actor: string; action: string }[]
  createdAt: string
  updatedAt: string
}

interface TestJson {
  id: string
  clientId: string
  testCandidateId: string
  titre: string
  description: string
  etapes: { id: string; ordre: number; action: string; resultatAttendu: string }[]
  statut: string
  auditLog: { timestamp: string; actor: string; action: string }[]
  createdAt: string
  updatedAt: string
}

interface CouvertureJson {
  id: string
  clientId: string
  requirementId: string
  testId: string
  createdAt: string
}

interface ExecutionJson {
  id: string
  clientId: string
  testId: string
  assetNodeId: string | null
  executant: string
  statut: string
  verdict: string | null
  dateDebut: string
  dateFin: string | null
  auditLog: { timestamp: string; actor: string; action: string }[]
  createdAt: string
  updatedAt: string
}

interface ExecutionStepJson {
  id: string
  clientId: string
  executionId: string
  testStepId: string
  resultat: string
  observation: string
  horodatage: string
}

interface MeasurementJson {
  id: string
  clientId: string
  executionStepId: string
  libelle: string
  valeur: string
  unite: string | null
  horodatage: string
}

interface ExecutionEventJson {
  id: string
  clientId: string
  executionId: string
  type: string
  description: string
  qualityEventId: string | null
  horodatage: string
  actor: string
}

interface EvidenceJson {
  id: string
  clientId: string
  executionId: string
  executionStepId: string | null
  type: string
  titre: string
  description: string
  horodatage: string
  actor: string
}

interface EvidenceLocationJson {
  id: string
  clientId: string
  evidenceId: string
  systeme: string
  reference: string
}

interface ProvenanceLinkJson {
  id: string
  clientId: string
  evidenceId: string
  requirementId: string
  createdAt: string
}

interface SourceJson {
  id: string
  clientId: string
  type: string
  titre: string
  createdAt: string
}

interface SourceLocationJson {
  id: string
  clientId: string
  sourceId: string
  systeme: string
  reference: string
}

interface SourceVersionJson {
  id: string
  clientId: string
  sourceId: string
  numeroVersion: number
  createdAt: string
}

interface ExtractionJson {
  id: string
  clientId: string
  sourceVersionId: string
  methode: string
  horodatage: string
}

interface ExtractionItemJson {
  id: string
  clientId: string
  extractionId: string
  contenu: string
  position: number
}

interface KnowledgeItemJson {
  id: string
  clientId: string
  extractionItemId: string
  libelle: string
  valeurInterpretee: string
  statut: string
  validePar: string | null
  auditLog: { timestamp: string; actor: string; action: string }[]
  createdAt: string
  updatedAt: string
}

interface ConfirmationJson {
  id: string
  clientId: string
  knowledgeItemId: string
  decision: string
  confirmePar: string
  horodatage: string
}

interface KnowledgeRelationJson {
  id: string
  clientId: string
  knowledgeItemSourceId: string
  knowledgeItemCibleId: string
  type: string
  createdAt: string
}

interface ConflictJson {
  id: string
  clientId: string
  knowledgeItemSourceId: string
  knowledgeItemCibleId: string
  description: string
  statut: string
  resolution: string | null
  createdAt: string
}

interface ContentPlanJson {
  id: string
  clientId: string
  templateId: string
  assetNodeId: string | null
  processId: string | null
  methodProfileId: string | null
  methodProfileType: string | null
  contextSnapshot: string
  readiness: string
  statut: string
  auditLog: { timestamp: string; actor: string; action: string }[]
  createdAt: string
  updatedAt: string
}

interface ConnectorJson {
  id: string
  clientId: string
  nom: string
  actif: boolean
  type: string
  config: string
  createdAt: string
}

interface SyncJobJson {
  id: string
  clientId: string
  connectorId: string
  statut: string
  tentative: number
  derniereErreur: string | null
  createdAt: string
  updatedAt: string
}

interface ExternalReferenceJson {
  id: string
  clientId: string
  connectorId: string
  identifiantExterne: string
  libelle: string
  createdAt: string
}

interface MissionJson {
  id: string
  clientId: string
  workspaceId: string | null
  assetNodeId: string | null
  titre: string
  description: string
  statut: string
  auditLog: { timestamp: string; actor: string; action: string }[]
  createdAt: string
  updatedAt: string
}

interface ActivityJson {
  id: string
  clientId: string
  missionId: string
  titre: string
  description: string
  statut: string
  auditLog: { timestamp: string; actor: string; action: string }[]
  createdAt: string
  updatedAt: string
}

interface DependencyJson {
  id: string
  clientId: string
  activitySourceId: string
  activityCibleId: string
  createdAt: string
}

interface AssociationMissionQualityEventJson {
  id: string
  clientId: string
  missionId: string
  qualityEventId: string
  createdAt: string
}

interface ContextSnapshotJson {
  id: string
  clientId: string
  workspaceId: string | null
  assetNodeId: string | null
  createdAt: string
}

interface ContextSnapshotItemJson {
  id: string
  clientId: string
  contextSnapshotId: string
  typeObjet: string
  objetId: string
}

interface AIConfigurationJson {
  id: string
  clientId: string
  version: string
  outilsDisponibles: string[]
  createdAt: string
}

interface AIRequestJson {
  id: string
  clientId: string
  missionId: string | null
  contextSnapshotId: string | null
  aiConfigurationId: string
  objectif: string
  createdAt: string
}

interface AIResponseJson {
  id: string
  clientId: string
  aiRequestId: string
  texte: string
  etatConfiance: string
  traceAppelsOutils: {
    outil: string
    parametres: Record<string, string>
    resultat: string
    horodatage: string
  }[]
  versionMoteur: string | null
  createdAt: string
}

interface CitationAIResponseJson {
  id: string
  clientId: string
  aiResponseId: string
  typeObjetCite: string
  objetId: string
}

interface ProcedureJson {
  id: string
  clientId: string
  reference: string
  numeroVersion: number
  titre: string
  effectiveDate: string
  categorie: string
  sourceId: string | null
  createdAt: string
}

interface ProcedureStepJson {
  id: string
  clientId: string
  procedureId: string
  ordre: number
  description: string
  obligatoire: boolean
  condition: string | null
  responsable: string | null
  createdAt: string
}

interface GabaritExportClientJson {
  id: string
  clientId: string
  nom: string
  tagsTrouves: string[]
  createdAt: string
}

interface AiChatSessionLogJson {
  id: string
  clientId: string
  startedAt: string
  endedAt: string | null
  mode: string
  aiProvider: string
  moteurVersion: string | null
  documentJoint: boolean
}

interface ConnexionDriveJson {
  clientId: string
  dossierId: string
  jeton: string
}

interface EtatMiroirDriveJson {
  clientId: string
  dernierMiroirReussi: string | null
}

interface QualificationFiabiliteIAJson {
  date: string
  resultat: string
  qualificationTestSetId: string
  qualificationTestSetVersion: string
  moteurVersionQualifiee: string | null
}

interface ClientConfigJson {
  clientId: string
  aiProvider: string
  aiProviderConditionsAcquittees: { fournisseur: string; date: string } | null
  aiProviderReliabilityQualification: {
    chat_normatif: QualificationFiabiliteIAJson | null
    audit_simule: QualificationFiabiliteIAJson | null
  }
  exportTemplateId: string | null
  consentTelemetry: { granted: boolean; date: string | null; revocableAtAnyTime: boolean }
}

interface QualityEventJson {
  id: string
  clientId: string
  type: string
  titre: string
  description: string
  origine: string
  referenceExterne: { systeme: string; identifiant: string } | null
  assetNodeId: string | null
  processId: string | null
  manufacturingContextId: string | null
  statut: string
  auditLog: { timestamp: string; actor: string; action: string }[]
  createdAt: string
  updatedAt: string
}

interface ReferenceQualityEventJson {
  id: string
  clientId: string
  qualityEventSourceId: string
  qualityEventCibleId: string
  createdAt: string
}

interface ProcessJson {
  id: string
  clientId: string
  nom: string
  description: string
  type: string
  sourceId: string | null
  auditLog: { timestamp: string; actor: string; action: string }[]
  createdAt: string
  updatedAt: string
}

interface FonctionActifJson {
  id: string
  clientId: string
  nom: string
  description: string
  auditLog: { timestamp: string; actor: string; action: string }[]
  createdAt: string
  updatedAt: string
}

interface AssociationFonctionAssetNodeJson {
  id: string
  clientId: string
  functionId: string
  assetNodeId: string
  createdAt: string
}

interface AssociationFonctionProcessJson {
  id: string
  clientId: string
  functionId: string
  processId: string
  createdAt: string
}

interface ManufacturingContextJson {
  id: string
  clientId: string
  assetNodeId: string
  processId: string
  produit: string
  recette: string | null
  format: string | null
  configuration: string | null
  createdAt: string
  updatedAt: string
}

interface MethodProfileRiskAssessmentJson {
  id: string
  clientId: string
  version: string
  effectiveDate: string
  source: string
  origin: string
  echelleMin: number
  echelleMax: number
  seuilAction: number
  createdAt: string
}

interface RiskAssessmentJson {
  id: string
  clientId: string
  methodProfileId: string
  methodProfileVersion: string
  assetNodeId: string | null
  parameterId: string | null
  etapeProcessus: string
  modeDefaillance: string
  effetDefaillance: string
  causePotentielle: string
  controleActuel: string
  severiteInitiale: number | null
  occurrenceInitiale: number | null
  detectabiliteInitiale: number | null
  iprInitial: number | null
  verdictInitial: string | null
  recommandation: string | null
  responsable: string | null
  dateCible: string | null
  actionsMenees: string | null
  severiteResiduelle: number | null
  occurrenceResiduelle: number | null
  detectabiliteResiduelle: number | null
  iprResiduel: number | null
  verdictResiduel: string | null
  auditLog: { timestamp: string; actor: string; action: string }[]
  createdAt: string
  updatedAt: string
}

interface MethodProfileImpactAssessmentJson {
  id: string
  clientId: string
  version: string
  effectiveDate: string
  source: string
  origin: string
  questions: { id: string; texte: Record<string, string> }[]
  decisionRule: string
  createdAt: string
}

interface EvaluationImpactAssessmentJson {
  id: string
  clientId: string
  methodProfileId: string
  methodProfileVersion: string
  assetNodeId: string | null
  nomElement: string
  reponses: Record<string, string>
  verdict: string | null
  auditLog: { timestamp: string; actor: string; action: string }[]
  createdAt: string
  updatedAt: string
}

interface EvaluationCSVAssessmentJson {
  id: string
  clientId: string
  assetNodeId: string | null
  nomSysteme: string
  categorieGamp5: number
  justificationCategorie: string
  pertinenceGxp: boolean
  pertinenceEresPart11: boolean
  justificationPertinence: string
  auditLog: { timestamp: string; actor: string; action: string }[]
  createdAt: string
  updatedAt: string
}

interface ParameterJson {
  id: string
  clientId: string
  assetNodeId: string | null
  nom: string
  description: string
  unite: string | null
  auditLog: { timestamp: string; actor: string; action: string }[]
  createdAt: string
  updatedAt: string
}

interface ClassificationCriticiteParametreJson {
  id: string
  clientId: string
  parameterId: string
  niveau: string
  contexte: string | null
  justification: string
  auditLog: { timestamp: string; actor: string; action: string }[]
  createdAt: string
}

interface CPPJson {
  id: string
  clientId: string
  parameterId: string
  contexte: string
  justification: string
  actif: boolean
  auditLog: { timestamp: string; actor: string; action: string }[]
  createdAt: string
  updatedAt: string
}

interface CQAJson {
  id: string
  clientId: string
  nom: string
  description: string
  contexte: string
  justification: string
  actif: boolean
  auditLog: { timestamp: string; actor: string; action: string }[]
  createdAt: string
  updatedAt: string
}

interface MethodProfileACFCJson {
  id: string
  clientId: string
  version: string
  effectiveDate: string
  source: string
  origin: string
  questions: { id: string; texte: Record<string, string>; famille?: string }[]
  decisionRule: string
  createdAt: string
}

interface EvaluationACFCJson {
  id: string
  clientId: string
  methodProfileId: string
  methodProfileVersion: string
  assetNodeId: string | null
  nomElement: string
  reponses: Record<string, string>
  verdict: string | null
  auditLog: { timestamp: string; actor: string; action: string }[]
  createdAt: string
  updatedAt: string
}

interface SectionJson {
  id: string
  projectId: string
  templateType: string
  templateEngineVersion: string
  ownerId: string
  sharedWith: { userId: string; accessLevel: string }[]
  language: string
  status: string
  meta: { ref: string; titre: string; version: string; site?: string }
  workflow: {
    authors: string[]
    reviewers: { userId: string; avis: string; date: string }[]
    approverFinal: string | null
  }
  signatures: {
    redacteur: { userId?: string; date?: string }
    verificateur: { userId?: string; date?: string }
    approbateur: { userId?: string; date?: string }
  }
  revisions: { version: string; date: string; auteur: string; motif: string }[]
  values: Record<string, string | number | null>
  tables: Record<string, Record<string, string | number | null>[]>
  generationSource: { sourceDocumentId: string | null; generatedFields: string[] }
  procedureId: string | null
  assetNodeId: string | null
  auditLog: { timestamp: string; actor: string; action: string }[]
  createdAt: string
  updatedAt: string
}

interface ProjectJson {
  id: string
  name: string
  context: string
  scopeIn: string
  scopeOut: string
  deadline: string | null
  languageDefault: string
  clientId: string | null
  sections: string[]
  documents: string[]
  links: { fromSectionId: string; toSectionId: string; createdBy: string; createdAt: string }[]
  statut: string
  phase: string
  ownerId: string
  sharedWith: { userId: string; accessLevel: string }[]
  archivedAt: string | null
  archivedBy: string | null
  auditLog: { timestamp: string; actor: string; action: string }[]
  createdAt: string
  updatedAt: string
}

interface OrganizationJson {
  id: string
  nom: string
  createdAt: string
}

interface WorkspaceJson {
  id: string
  organizationId: string
  type: string
  nom: string
  parentWorkspaceId: string | null
  createdAt: string
}

interface NiveauHierarchieJson {
  key: string
  label: Record<string, string>
  numberingPattern: string
}

interface AssetNodeJson {
  id: string
  clientId: string
  workspaceId: string | null
  levelKey: string
  name: string
  code: string
  parentId: string | null
  associatedNodes: string[]
  source: string
  qmsConnectorId: string | null
  qualificationStatus: string
  periodicQualification: { applicable: boolean; deadline: string | null }
  auditLog: { timestamp: string; actor: string; action: string }[]
  createdAt: string
  updatedAt: string
}

interface RelationTechniqueJson {
  id: string
  clientId: string
  typeRelation: string
  noeudSourceId: string
  noeudCibleId: string
  createdAt: string
}

interface DocumentNormatifJson {
  id: string
  category: string
  titre: string
  filename: string
  source: string
  sourceRef: string | null
  extractedText: string
  mimeType: string
  hasBinaryContent: boolean
  uploadedAt: string
  uploadedBy: string
}

interface ProjectDocumentJson {
  id: string
  projectId: string
  filename: string
  status: string
  extractedText: string
  mimeType: string
  hasBinaryContent: boolean
  uploadedAt: string
  uploadedBy: string
}

async function requete(
  ctx: Contexte,
  method: string,
  chemin: string,
  options: { body?: unknown; jeton?: string } = {},
): Promise<{ status: number; corps: CorpsReponse }> {
  const reponse = await routerRequete(
    new Request(`https://relais.workers.dev${chemin}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(options.jeton ? { Authorization: `Bearer ${options.jeton}` } : {}),
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    }),
    ctx,
  )
  const corps = await reponse.json().catch(() => null)
  return { status: reponse.status, corps }
}

async function bootstrapAdmin(
  ctx: Contexte,
  email = 'admin@pharmatech.example',
): Promise<{ jeton: string; utilisateur: UtilisateurJson }> {
  const { corps } = await requete(ctx, 'POST', '/auth/bootstrap-admin', {
    body: {
      email,
      motDePasse: 'CoffreFort!2026',
      nom: 'Lead',
      prenom: 'Quentin',
      jetonBootstrap: JETON_BOOTSTRAP,
    },
  })
  return corps
}

describe('routerRequete — vérification de connexion (/sante)', () => {
  test('GET /sante -> 200 { ok: true }, sans jeton (avant toute connexion)', async () => {
    const ctx = nouveauContexte()
    const { status, corps } = await requete(ctx, 'GET', '/sante')
    expect(status).toBe(200)
    expect(corps).toEqual({ ok: true })
  })
})

describe('routerRequete — CORS', () => {
  test('OPTIONS -> 204 avec en-têtes CORS', async () => {
    const ctx = nouveauContexte()
    const reponse = await routerRequete(
      new Request('https://relais.workers.dev/auth/login', { method: 'OPTIONS' }),
      ctx,
    )
    expect(reponse.status).toBe(204)
    expect(reponse.headers.get('Access-Control-Allow-Origin')).toBe(ORIGINE)
  })

  // Régression : PUT (utilisé par /parametres-installation/:cle) absent de
  // cette liste fait échouer silencieusement le preflight CORS du
  // navigateur — la requête PUT réelle n'est alors jamais envoyée, sans
  // aucune erreur visible côté UI (constaté par l'utilisateur : clic sur
  // « Enregistrer » sans aucune réaction).
  test('OPTIONS -> Access-Control-Allow-Methods inclut PUT', async () => {
    const ctx = nouveauContexte()
    const reponse = await routerRequete(
      new Request('https://relais.workers.dev/parametres-installation/github', {
        method: 'OPTIONS',
      }),
      ctx,
    )
    expect(reponse.headers.get('Access-Control-Allow-Methods')).toContain('PUT')
  })

  test('route inconnue -> 404', async () => {
    const ctx = nouveauContexte()
    const { status } = await requete(ctx, 'GET', '/inconnu')
    expect(status).toBe(404)
  })
})

describe('routerRequete — bootstrap-admin', () => {
  test('crée le premier admin avec le bon jeton de bootstrap', async () => {
    const ctx = nouveauContexte()
    const { status, corps } = await bootstrapAdmin(ctx).then((c) => ({ status: 201, corps: c }))
    expect(status).toBe(201)
    expect(corps.utilisateur.role).toBe('admin')
    expect(corps.jeton).toBeTruthy()
  })

  test('refuse un mauvais jeton de bootstrap', async () => {
    const ctx = nouveauContexte()
    const { status, corps } = await requete(ctx, 'POST', '/auth/bootstrap-admin', {
      body: {
        email: 'x@example.com',
        motDePasse: 'CoffreFort!2026',
        nom: 'A',
        prenom: 'B',
        jetonBootstrap: 'mauvais',
      },
    })
    expect(status).toBe(403)
    expect(corps.erreur).toBe('jeton_invalide')
  })

  test('refuse un second bootstrap une fois un compte déjà créé', async () => {
    const ctx = nouveauContexte()
    await bootstrapAdmin(ctx)
    const { status, corps } = await requete(ctx, 'POST', '/auth/bootstrap-admin', {
      body: {
        email: 'second@example.com',
        motDePasse: 'CoffreFort!2026',
        nom: 'A',
        prenom: 'B',
        jetonBootstrap: JETON_BOOTSTRAP,
      },
    })
    expect(status).toBe(403)
    expect(corps.erreur).toBe('deja_initialise')
  })

  test('refuse un mot de passe trop court', async () => {
    const ctx = nouveauContexte()
    const { status, corps } = await requete(ctx, 'POST', '/auth/bootstrap-admin', {
      body: {
        email: 'x@example.com',
        motDePasse: 'court',
        nom: 'A',
        prenom: 'B',
        jetonBootstrap: JETON_BOOTSTRAP,
      },
    })
    expect(status).toBe(400)
    expect(corps.erreur).toBe('mot_de_passe_trop_court')
  })
})

describe('routerRequete — login/me', () => {
  test('login avec les bons identifiants renvoie un jeton, /auth/me le confirme', async () => {
    const ctx = nouveauContexte()
    await bootstrapAdmin(ctx)

    const { status, corps } = await requete(ctx, 'POST', '/auth/login', {
      body: { email: 'admin@pharmatech.example', motDePasse: 'CoffreFort!2026' },
    })
    expect(status).toBe(200)
    expect(corps.jeton).toBeTruthy()

    const me = await requete(ctx, 'GET', '/auth/me', { jeton: corps.jeton })
    expect(me.status).toBe(200)
    expect(me.corps.utilisateur.email).toBe('admin@pharmatech.example')
    expect(me.corps.utilisateur.motDePasseHash).toBeUndefined()
  })

  test('login avec un mauvais mot de passe -> 401, message générique', async () => {
    const ctx = nouveauContexte()
    await bootstrapAdmin(ctx)
    const { status, corps } = await requete(ctx, 'POST', '/auth/login', {
      body: { email: 'admin@pharmatech.example', motDePasse: 'mauvais' },
    })
    expect(status).toBe(401)
    expect(corps.erreur).toBe('identifiants_invalides')
  })

  test('login avec un email inconnu -> 401, même message générique (pas de fuite d’existence)', async () => {
    const ctx = nouveauContexte()
    const { status, corps } = await requete(ctx, 'POST', '/auth/login', {
      body: { email: 'inconnu@example.com', motDePasse: 'peu importe' },
    })
    expect(status).toBe(401)
    expect(corps.erreur).toBe('identifiants_invalides')
  })

  test('/auth/me sans jeton -> 401', async () => {
    const ctx = nouveauContexte()
    const { status } = await requete(ctx, 'GET', '/auth/me')
    expect(status).toBe(401)
  })

  test('un compte désactivé ne peut plus se connecter', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    await ctx.utilisateursRepo.mettreAJour(admin.utilisateur.id, { statut: 'desactive' })

    const { status } = await requete(ctx, 'POST', '/auth/login', {
      body: { email: 'admin@pharmatech.example', motDePasse: 'CoffreFort!2026' },
    })
    expect(status).toBe(401)
  })
})

describe('routerRequete — change-password / verify-password', () => {
  test('changer le mot de passe exige le mot de passe actuel correct', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)

    const echec = await requete(ctx, 'POST', '/auth/change-password', {
      jeton: admin.jeton,
      body: { motDePasseActuel: 'mauvais', nouveauMotDePasse: 'NouveauMdp!99' },
    })
    expect(echec.status).toBe(401)

    const succes = await requete(ctx, 'POST', '/auth/change-password', {
      jeton: admin.jeton,
      body: { motDePasseActuel: 'CoffreFort!2026', nouveauMotDePasse: 'NouveauMdp!99' },
    })
    expect(succes.status).toBe(200)

    const relogin = await requete(ctx, 'POST', '/auth/login', {
      body: { email: 'admin@pharmatech.example', motDePasse: 'NouveauMdp!99' },
    })
    expect(relogin.status).toBe(200)
  })

  test('verify-password confirme ou infirme sans changer le mot de passe (re-authentification pour archivage)', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)

    const valide = await requete(ctx, 'POST', '/auth/verify-password', {
      jeton: admin.jeton,
      body: { motDePasse: 'CoffreFort!2026' },
    })
    expect(valide.corps.valide).toBe(true)

    const invalide = await requete(ctx, 'POST', '/auth/verify-password', {
      jeton: admin.jeton,
      body: { motDePasse: 'mauvais' },
    })
    expect(invalide.corps.valide).toBe(false)
  })
})

describe('routerRequete — administration des comptes (admin uniquement)', () => {
  test('un admin peut créer un utilisateur non-admin', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)

    const { status, corps } = await requete(ctx, 'POST', '/admin/utilisateurs', {
      jeton: admin.jeton,
      body: {
        email: 'employe@pharmatech.example',
        motDePasse: 'MotDePasse!1',
        nom: 'Dupont',
        prenom: 'Alice',
        role: 'utilisateur',
      },
    })
    expect(status).toBe(201)
    expect(corps.utilisateur.role).toBe('utilisateur')
  })

  test('la création envoie un email de bienvenue avec les identifiants', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const envoyeur = ctx.envoyeurEmail as EnvoyeurEmailMemoire

    const { status, corps } = await requete(ctx, 'POST', '/admin/utilisateurs', {
      jeton: admin.jeton,
      body: {
        email: 'employe@pharmatech.example',
        motDePasse: 'MotDePasse!1',
        nom: 'Dupont',
        prenom: 'Alice',
        role: 'utilisateur',
      },
    })
    expect(status).toBe(201)
    expect(corps.emailEnvoye).toBe(true)
    expect(envoyeur.envoyes).toHaveLength(1)
    expect(envoyeur.envoyes[0]?.destinataire).toBe('employe@pharmatech.example')
    expect(envoyeur.envoyes[0]?.texte).toContain('MotDePasse!1')
    expect(envoyeur.envoyes[0]?.texte).toContain(URL_APPLICATION)
  })

  test('un utilisateur non-admin ne peut pas créer de compte (403)', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const cree = await requete(ctx, 'POST', '/admin/utilisateurs', {
      jeton: admin.jeton,
      body: {
        email: 'employe@pharmatech.example',
        motDePasse: 'MotDePasse!1',
        nom: 'Dupont',
        prenom: 'Alice',
        role: 'utilisateur',
      },
    })
    const loginEmploye = await requete(ctx, 'POST', '/auth/login', {
      body: { email: 'employe@pharmatech.example', motDePasse: 'MotDePasse!1' },
    })

    const tentative = await requete(ctx, 'POST', '/admin/utilisateurs', {
      jeton: loginEmploye.corps.jeton,
      body: {
        email: 'autre@pharmatech.example',
        motDePasse: 'MotDePasse!1',
        nom: 'X',
        prenom: 'Y',
        role: 'utilisateur',
      },
    })
    expect(cree.status).toBe(201)
    expect(tentative.status).toBe(403)
  })

  test('un admin peut désactiver un compte et changer son rôle', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const cree = await requete(ctx, 'POST', '/admin/utilisateurs', {
      jeton: admin.jeton,
      body: {
        email: 'employe@pharmatech.example',
        motDePasse: 'MotDePasse!1',
        nom: 'Dupont',
        prenom: 'Alice',
        role: 'utilisateur',
      },
    })

    const modifie = await requete(
      ctx,
      'PATCH',
      `/admin/utilisateurs/${cree.corps.utilisateur.id}`,
      {
        jeton: admin.jeton,
        body: { role: 'admin', statut: 'desactive' },
      },
    )
    expect(modifie.status).toBe(200)
    expect(modifie.corps.utilisateur.role).toBe('admin')
    expect(modifie.corps.utilisateur.statut).toBe('desactive')
  })

  test('jamais zéro admin actif : le dernier admin ne peut être ni rétrogradé ni désactivé (409)', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const me = await requete(ctx, 'GET', '/auth/me', { jeton: admin.jeton })
    const idAdmin = me.corps.utilisateur.id

    for (const body of [{ role: 'utilisateur' }, { statut: 'desactive' }]) {
      const refus = await requete(ctx, 'PATCH', `/admin/utilisateurs/${idAdmin}`, {
        jeton: admin.jeton,
        body,
      })
      expect(refus.status).toBe(409)
      expect(refus.corps.erreur).toBe('dernier_admin')
    }
    expect((await ctx.utilisateursRepo.parId(idAdmin))?.role).toBe('admin')

    // Avec un second admin actif, la rétrogradation redevient possible.
    const second = await requete(ctx, 'POST', '/admin/utilisateurs', {
      jeton: admin.jeton,
      body: {
        email: 'second-admin@pharmatech.example',
        motDePasse: 'MotDePasse!1',
        nom: 'N',
        prenom: 'P',
        role: 'admin',
      },
    })
    expect(second.status).toBe(201)
    const retrogradation = await requete(ctx, 'PATCH', `/admin/utilisateurs/${idAdmin}`, {
      jeton: admin.jeton,
      body: { role: 'utilisateur' },
    })
    expect(retrogradation.status).toBe(200)
  })

  test('lister les utilisateurs est réservé à un admin', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const { status, corps } = await requete(ctx, 'GET', '/admin/utilisateurs', {
      jeton: admin.jeton,
    })
    expect(status).toBe(200)
    expect(corps.utilisateurs).toHaveLength(1)
  })
})

describe('routerRequete — clients (D1 = source de vérité)', () => {
  async function creerUtilisateurEtLogin(
    ctx: Contexte,
    adminJeton: string,
    email: string,
  ): Promise<string> {
    await requete(ctx, 'POST', '/admin/utilisateurs', {
      jeton: adminJeton,
      body: { email, motDePasse: 'MotDePasse!1', nom: 'N', prenom: 'P', role: 'utilisateur' },
    })
    const login = await requete(ctx, 'POST', '/auth/login', {
      body: { email, motDePasse: 'MotDePasse!1' },
    })
    return login.corps.jeton
  }

  test('un utilisateur crée un client, le voit, un autre utilisateur non partagé ne le voit pas', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const jetonA = await creerUtilisateurEtLogin(ctx, admin.jeton, 'a@pharmatech.example')
    const jetonB = await creerUtilisateurEtLogin(ctx, admin.jeton, 'b@pharmatech.example')

    const creation = await requete(ctx, 'POST', '/clients', {
      jeton: jetonA,
      body: { name: 'PharmaTech Solutions', secteur: 'pharmaceutique' },
    })
    expect(creation.status).toBe(201)
    const clientId = creation.corps.client.id

    const listeA = await requete(ctx, 'GET', '/clients', { jeton: jetonA })
    expect(listeA.corps.clients.map((c) => c.id)).toContain(clientId)

    const listeB = await requete(ctx, 'GET', '/clients', { jeton: jetonB })
    expect(listeB.corps.clients.map((c) => c.id)).not.toContain(clientId)

    const obtenirB = await requete(ctx, 'GET', `/clients/${clientId}`, { jeton: jetonB })
    expect(obtenirB.status).toBe(404)
  })

  test('un admin voit tous les clients de l’organisation, quel que soit le créateur', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const jetonA = await creerUtilisateurEtLogin(ctx, admin.jeton, 'a@pharmatech.example')
    await requete(ctx, 'POST', '/clients', { jeton: jetonA, body: { name: 'Client A' } })

    const listeAdmin = await requete(ctx, 'GET', '/clients', { jeton: admin.jeton })
    expect(listeAdmin.corps.clients).toHaveLength(1)
  })

  test('partager un client rend le client visible et éditable pour le bénéficiaire', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const jetonA = await creerUtilisateurEtLogin(ctx, admin.jeton, 'a@pharmatech.example')
    const jetonB = await creerUtilisateurEtLogin(ctx, admin.jeton, 'b@pharmatech.example')

    const creation = await requete(ctx, 'POST', '/clients', {
      jeton: jetonA,
      body: { name: 'Client A' },
    })
    const clientId = creation.corps.client.id

    // Récupérer l'id utilisateur B via /auth/me.
    const meB = await requete(ctx, 'GET', '/auth/me', { jeton: jetonB })
    const idB = meB.corps.utilisateur.id

    await requete(ctx, 'PATCH', `/clients/${clientId}`, {
      jeton: jetonA,
      body: { sharedWith: [idB] },
    })

    const obtenirB = await requete(ctx, 'GET', `/clients/${clientId}`, { jeton: jetonB })
    expect(obtenirB.status).toBe(200)

    const modifierB = await requete(ctx, 'PATCH', `/clients/${clientId}`, {
      jeton: jetonB,
      body: { details: 'Ajouté par B' },
    })
    expect(modifierB.status).toBe(200)
    expect(modifierB.corps.client.details).toBe('Ajouté par B')
  })

  test('archiver un client trace archived_at/archived_by', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const creation = await requete(ctx, 'POST', '/clients', {
      jeton: admin.jeton,
      body: { name: 'C' },
    })
    const clientId = creation.corps.client.id

    const archive = await requete(ctx, 'PATCH', `/clients/${clientId}`, {
      jeton: admin.jeton,
      body: { statut: 'archive' },
    })
    expect(archive.corps.client.statut).toBe('archive')
    expect(archive.corps.client.archivedAt).toBeTruthy()
    expect(archive.corps.client.archivedBy).toBe('admin@pharmatech.example')
  })

  test('archiver un client déjà archivé -> 409 deja_archive ; désarchiver un client déjà actif -> 409 deja_actif', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const creation = await requete(ctx, 'POST', '/clients', {
      jeton: admin.jeton,
      body: { name: 'C' },
    })
    const clientId = creation.corps.client.id

    const desarchivageInutile = await requete(ctx, 'PATCH', `/clients/${clientId}`, {
      jeton: admin.jeton,
      body: { statut: 'actif' },
    })
    expect(desarchivageInutile.status).toBe(409)
    expect(desarchivageInutile.corps.erreur).toBe('deja_actif')

    await requete(ctx, 'PATCH', `/clients/${clientId}`, {
      jeton: admin.jeton,
      body: { statut: 'archive' },
    })
    const archivageInutile = await requete(ctx, 'PATCH', `/clients/${clientId}`, {
      jeton: admin.jeton,
      body: { statut: 'archive' },
    })
    expect(archivageInutile.status).toBe(409)
    expect(archivageInutile.corps.erreur).toBe('deja_archive')
  })

  test('suppression définitive : refusée sans justification, réservée à un admin, tracée en audit', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const jetonA = await creerUtilisateurEtLogin(ctx, admin.jeton, 'a@pharmatech.example')
    const creation = await requete(ctx, 'POST', '/clients', { jeton: jetonA, body: { name: 'C' } })
    const clientId = creation.corps.client.id

    const parNonAdmin = await requete(ctx, 'DELETE', `/clients/${clientId}`, {
      jeton: jetonA,
      body: { justification: 'peu importe' },
    })
    expect(parNonAdmin.status).toBe(403)

    const sansJustification = await requete(ctx, 'DELETE', `/clients/${clientId}`, {
      jeton: admin.jeton,
      body: { justification: '   ' },
    })
    expect(sansJustification.status).toBe(400)
    expect(sansJustification.corps.erreur).toBe('justification_obligatoire')

    // Mot de passe vérifié par le serveur (audit du 25/09/2026, M6).
    const sansMotDePasse = await requete(ctx, 'DELETE', `/clients/${clientId}`, {
      jeton: admin.jeton,
      body: { justification: 'Client fermé, RGPD, demande écrite du 04/09/2026' },
    })
    expect(sansMotDePasse.status).toBe(403)
    expect(sansMotDePasse.corps.erreur).toBe('mot_de_passe_incorrect')

    const suppression = await requete(ctx, 'DELETE', `/clients/${clientId}`, {
      jeton: admin.jeton,
      body: {
        justification: 'Client fermé, RGPD, demande écrite du 04/09/2026',
        motDePasse: 'CoffreFort!2026',
      },
    })
    expect(suppression.status).toBe(200)

    const disparu = await requete(ctx, 'GET', `/clients/${clientId}`, { jeton: admin.jeton })
    expect(disparu.status).toBe(404)

    const audit = await requete(ctx, 'GET', '/admin/audit', { jeton: admin.jeton })
    const entree = audit.corps.entrees.find((e) => e.action === 'suppression_definitive_client')
    expect(entree).toBeDefined()
    expect(entree?.justification).toContain('RGPD')
    expect(entree?.targetId).toBe(clientId)
  })
})

describe('routerRequete — Structure Système (référentiel d’actifs, D1 = source de vérité)', () => {
  async function creerClientDeTest(ctx: Contexte, jeton: string): Promise<string> {
    const creation = await requete(ctx, 'POST', '/clients', { jeton, body: { name: 'Ferring' } })
    return creation.corps.client.id
  }

  test('GET sur un client sans schéma configuré -> levels vide, jamais 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/structure-systeme`, {
      jeton: admin.jeton,
    })
    expect(obtenir.status).toBe(200)
    expect(obtenir.corps.schema).toEqual({ clientId, levels: [] })
    expect(obtenir.corps.noeuds).toEqual([])
    expect(obtenir.corps.relationsTechniques).toEqual([])
  })

  test('enregistrer le schéma de hiérarchie puis le relire', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const enregistrement = await requete(
      ctx,
      'PUT',
      `/clients/${clientId}/structure-systeme/schema`,
      {
        jeton: admin.jeton,
        body: {
          levels: [
            {
              key: 'site',
              label: { fr: 'Site', en: 'Site', de: 'Standort' },
              numberingPattern: 'S-{n}',
            },
          ],
        },
      },
    )
    expect(enregistrement.status).toBe(200)
    expect(enregistrement.corps.schema.levels).toHaveLength(1)

    const relecture = await requete(ctx, 'GET', `/clients/${clientId}/structure-systeme`, {
      jeton: admin.jeton,
    })
    expect(relecture.corps.schema.levels[0]?.key).toBe('site')
  })

  test('créer un nœud : id/audit_log/horodatages dérivés côté serveur, jamais acceptés depuis le corps', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/structure-systeme/noeuds`, {
      jeton: admin.jeton,
      body: { levelKey: 'site', name: 'Site SMP', code: 'SMP', parentId: null },
    })
    expect(creation.status).toBe(201)
    expect(creation.corps.noeud.clientId).toBe(clientId)
    expect(creation.corps.noeud.source).toBe('manuel')
    expect(creation.corps.noeud.auditLog).toEqual([
      { timestamp: expect.any(String), actor: 'admin@pharmatech.example', action: 'création' },
    ])

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/structure-systeme`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.noeuds.map((n) => n.id)).toContain(creation.corps.noeud.id)
  })

  test('créer un nœud sans champ obligatoire -> corps_invalide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/structure-systeme/noeuds`, {
      jeton: admin.jeton,
      body: { levelKey: 'site', name: 'Site SMP' },
    })
    expect(creation.status).toBe(400)
    expect(creation.corps.erreur).toBe('corps_invalide')
  })

  test('création en lot (import de hiérarchie) : plusieurs nœuds en une seule requête, source import_fichier', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const lot = await requete(ctx, 'POST', `/clients/${clientId}/structure-systeme/noeuds/lot`, {
      jeton: admin.jeton,
      body: {
        action: 'création (import SAP)',
        noeuds: [
          {
            id: 'id-site-genere-cote-client',
            levelKey: 'site',
            name: 'Site SMP',
            code: 'SMP',
            parentId: null,
          },
          {
            id: 'id-zone-generee-cote-client',
            levelKey: 'zone',
            name: 'Zone PRD',
            code: 'SMP-PRD',
            parentId: 'id-site-genere-cote-client',
          },
        ],
      },
    })
    expect(lot.status).toBe(201)
    expect(lot.corps.noeuds).toHaveLength(2)
    expect(lot.corps.noeuds.every((n) => n.source === 'import_fichier')).toBe(true)
    expect(lot.corps.noeuds[0]?.auditLog[0]?.action).toBe('création (import SAP)')
    // L'id fourni par le client est bien conservé (nécessaire pour que le
    // chaînage parent_id calculé par la planification pure côté store
    // reste cohérent) — jamais régénéré côté serveur pour ce chemin précis.
    expect(lot.corps.noeuds[0]?.id).toBe('id-site-genere-cote-client')
    expect(lot.corps.noeuds[1]?.parentId).toBe('id-site-genere-cote-client')
  })

  test('reparenter un nœud (PATCH) : parentId mis à jour, entrée ajoutée à audit_log', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const parent = await requete(ctx, 'POST', `/clients/${clientId}/structure-systeme/noeuds`, {
      jeton: admin.jeton,
      body: { levelKey: 'site', name: 'Site', code: 'S1', parentId: null },
    })
    const enfant = await requete(ctx, 'POST', `/clients/${clientId}/structure-systeme/noeuds`, {
      jeton: admin.jeton,
      body: { levelKey: 'zone', name: 'Zone', code: 'Z1', parentId: null },
    })

    const modification = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/structure-systeme/noeuds/${enfant.corps.noeud.id}`,
      { jeton: admin.jeton, body: { parentId: parent.corps.noeud.id, action: 'modification' } },
    )
    expect(modification.status).toBe(200)
    expect(modification.corps.noeud.parentId).toBe(parent.corps.noeud.id)
    expect(modification.corps.noeud.auditLog).toHaveLength(2)

    const statutInvente = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/structure-systeme/noeuds/${enfant.corps.noeud.id}`,
      { jeton: admin.jeton, body: { qualificationStatus: 'presque_qualifie', action: 'statut' } },
    )
    expect(statutInvente.status).toBe(400)
  })

  test('créer une relation technique entre deux nœuds du même client', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const a = await requete(ctx, 'POST', `/clients/${clientId}/structure-systeme/noeuds`, {
      jeton: admin.jeton,
      body: { levelKey: 'systeme', name: 'A', code: 'A', parentId: null },
    })
    const b = await requete(ctx, 'POST', `/clients/${clientId}/structure-systeme/noeuds`, {
      jeton: admin.jeton,
      body: { levelKey: 'systeme', name: 'B', code: 'B', parentId: null },
    })

    const relation = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/structure-systeme/relations-techniques`,
      {
        jeton: admin.jeton,
        body: {
          typeRelation: 'alimente',
          noeudSourceId: a.corps.noeud.id,
          noeudCibleId: b.corps.noeud.id,
        },
      },
    )
    expect(relation.status).toBe(201)
    expect(relation.corps.relation.noeudSourceId).toBe(a.corps.noeud.id)
  })

  describe('création de nœuds via pull QMS (Integration Gateway, AssetNode.qms_connector_id câblé)', () => {
    async function creerConnectorDeTest(ctx: Contexte, jeton: string, clientId: string) {
      const creation = await requete(ctx, 'POST', `/clients/${clientId}/connectors`, {
        jeton,
        body: {
          nom: 'GitHub dépôt normes',
          type: 'github',
          config: { owner: 'client', repo: 'depot', branche: null, jeton: 'x' },
        },
      })
      return creation.corps.connector.id as string
    }

    test('crée les nœuds sous le parent choisi, source qms_pull et qmsConnectorId renseignés', async () => {
      const ctx = nouveauContexte()
      const admin = await bootstrapAdmin(ctx)
      const clientId = await creerClientDeTest(ctx, admin.jeton)
      const connectorId = await creerConnectorDeTest(ctx, admin.jeton, clientId)
      const parent = await requete(ctx, 'POST', `/clients/${clientId}/structure-systeme/noeuds`, {
        jeton: admin.jeton,
        body: { levelKey: 'dossier', name: 'Documents importés', code: 'DOC', parentId: null },
      })

      const pull = await requete(
        ctx,
        'POST',
        `/clients/${clientId}/structure-systeme/noeuds/pull-qms`,
        {
          jeton: admin.jeton,
          body: {
            connectorId,
            noeuds: [
              {
                levelKey: 'document',
                name: 'docs/urs.md',
                code: 'qms:sha-1',
                parentId: parent.corps.noeud.id,
              },
              {
                levelKey: 'document',
                name: 'docs/fds.md',
                code: 'qms:sha-2',
                parentId: parent.corps.noeud.id,
              },
            ],
          },
        },
      )
      expect(pull.status).toBe(201)
      expect(pull.corps.noeuds).toHaveLength(2)
      expect(
        pull.corps.noeuds.every(
          (n) =>
            n.source === 'qms_pull' &&
            n.qmsConnectorId === connectorId &&
            n.parentId === parent.corps.noeud.id,
        ),
      ).toBe(true)
      expect(pull.corps.noeuds[0]?.auditLog[0]?.action).toBe('création (pull QMS)')

      const liste = await requete(ctx, 'GET', `/clients/${clientId}/structure-systeme`, {
        jeton: admin.jeton,
      })
      expect(liste.corps.noeuds.map((n) => n.id)).toEqual(
        expect.arrayContaining(pull.corps.noeuds.map((n) => n.id)),
      )
    })

    test('connecteur introuvable -> connecteur_introuvable, aucun nœud créé', async () => {
      const ctx = nouveauContexte()
      const admin = await bootstrapAdmin(ctx)
      const clientId = await creerClientDeTest(ctx, admin.jeton)

      const pull = await requete(
        ctx,
        'POST',
        `/clients/${clientId}/structure-systeme/noeuds/pull-qms`,
        {
          jeton: admin.jeton,
          body: {
            connectorId: 'inconnu',
            noeuds: [{ levelKey: 'document', name: 'x', code: 'x', parentId: null }],
          },
        },
      )
      expect(pull.status).toBe(404)
      expect(pull.corps.erreur).toBe('connecteur_introuvable')
    })

    test("connecteur appartenant à un autre client -> connecteur_introuvable (jamais distingué d'un connecteur inexistant)", async () => {
      const ctx = nouveauContexte()
      const admin = await bootstrapAdmin(ctx)
      const clientA = await creerClientDeTest(ctx, admin.jeton)
      const clientB = await creerClientDeTest(ctx, admin.jeton)
      const connectorDeA = await creerConnectorDeTest(ctx, admin.jeton, clientA)

      const pull = await requete(
        ctx,
        'POST',
        `/clients/${clientB}/structure-systeme/noeuds/pull-qms`,
        {
          jeton: admin.jeton,
          body: {
            connectorId: connectorDeA,
            noeuds: [{ levelKey: 'document', name: 'x', code: 'x', parentId: null }],
          },
        },
      )
      expect(pull.status).toBe(404)
      expect(pull.corps.erreur).toBe('connecteur_introuvable')
    })

    test('nœud sans champ obligatoire dans le lot -> corps_invalide', async () => {
      const ctx = nouveauContexte()
      const admin = await bootstrapAdmin(ctx)
      const clientId = await creerClientDeTest(ctx, admin.jeton)
      const connectorId = await creerConnectorDeTest(ctx, admin.jeton, clientId)

      const pull = await requete(
        ctx,
        'POST',
        `/clients/${clientId}/structure-systeme/noeuds/pull-qms`,
        { jeton: admin.jeton, body: { connectorId, noeuds: [{ levelKey: 'document' }] } },
      )
      expect(pull.status).toBe(400)
      expect(pull.corps.erreur).toBe('corps_invalide')
    })

    test('non authentifié -> 401', async () => {
      const ctx = nouveauContexte()
      const admin = await bootstrapAdmin(ctx)
      const clientId = await creerClientDeTest(ctx, admin.jeton)
      const connectorId = await creerConnectorDeTest(ctx, admin.jeton, clientId)

      const pull = await requete(
        ctx,
        'POST',
        `/clients/${clientId}/structure-systeme/noeuds/pull-qms`,
        { body: { connectorId, noeuds: [] } },
      )
      expect(pull.status).toBe(401)
    })
  })

  test('un utilisateur non lié au client se voit refuser tout accès (404 générique)', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const { corps: b } = await requete(ctx, 'POST', '/admin/utilisateurs', {
      jeton: admin.jeton,
      body: {
        email: 'b@pharmatech.example',
        motDePasse: 'MotDePasse!1',
        nom: 'N',
        prenom: 'P',
        role: 'utilisateur',
      },
    })
    void b
    const login = await requete(ctx, 'POST', '/auth/login', {
      body: { email: 'b@pharmatech.example', motDePasse: 'MotDePasse!1' },
    })
    const jetonB = login.corps.jeton

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/structure-systeme`, {
      jeton: jetonB,
    })
    expect(obtenir.status).toBe(404)
  })

  test('non authentifié -> 401', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/structure-systeme`)
    expect(obtenir.status).toBe(401)
  })
})

describe('routerRequete — ACFC (méthode configurable par client, Phase 4a du chantier de migration D1)', () => {
  async function creerClientDeTest(ctx: Contexte, jeton: string): Promise<string> {
    const creation = await requete(ctx, 'POST', '/clients', { jeton, body: { name: 'Ferring' } })
    return creation.corps.client.id
  }

  test('GET sans profil configuré -> listes vides, jamais 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/acfc`, { jeton: admin.jeton })
    expect(obtenir.status).toBe(200)
    expect(obtenir.corps.profils).toEqual([])
    expect(obtenir.corps.evaluations).toEqual([])
  })

  test('créer un profil : id/effectiveDate/createdAt dérivés côté serveur', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/acfc/profils`, {
      jeton: admin.jeton,
      body: {
        version: 'v1',
        source: 'Procédure interne QP-042',
        origin: 'procedure_client',
        questions: [{ id: 'q-1', texte: { fr: 'Le composant a-t-il un contact produit ?' } }],
        decisionRule: 'au_moins_un_oui_critique',
      },
    })
    expect(creation.status).toBe(201)
    expect(creation.corps.profil.clientId).toBe(clientId)
    expect(creation.corps.profil.id).toEqual(expect.any(String))
    expect(creation.corps.profil.effectiveDate).toEqual(expect.any(String))
    expect(creation.corps.profil.questions).toHaveLength(1)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/acfc`, { jeton: admin.jeton })
    expect(liste.corps.profils.map((p) => p.id)).toContain(creation.corps.profil.id)
  })

  test('créer un profil sans champ obligatoire -> corps_invalide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/acfc/profils`, {
      jeton: admin.jeton,
      body: { version: 'v1' },
    })
    expect(creation.status).toBe(400)
    expect(creation.corps.erreur).toBe('corps_invalide')
  })

  test('créer une évaluation : id/audit_log/horodatages dérivés côté serveur, jamais acceptés depuis le corps', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const profil = await requete(ctx, 'POST', `/clients/${clientId}/acfc/profils`, {
      jeton: admin.jeton,
      body: {
        version: 'v1',
        source: 'Procédure interne QP-042',
        origin: 'procedure_client',
        questions: [{ id: 'q-1', texte: { fr: 'Contact produit ?' } }],
        decisionRule: 'au_moins_un_oui_critique',
      },
    })

    const evaluation = await requete(ctx, 'POST', `/clients/${clientId}/acfc/evaluations`, {
      jeton: admin.jeton,
      body: {
        methodProfileId: profil.corps.profil.id,
        methodProfileVersion: profil.corps.profil.version,
        assetNodeId: null,
        nomElement: 'Vanne à membrane V-101',
        reponses: { 'q-1': 'oui' },
        verdict: 'critique',
      },
    })
    expect(evaluation.status).toBe(201)
    expect(evaluation.corps.evaluation.clientId).toBe(clientId)
    expect(evaluation.corps.evaluation.verdict).toBe('critique')
    expect(evaluation.corps.evaluation.auditLog).toEqual([
      { timestamp: expect.any(String), actor: 'admin@pharmatech.example', action: 'création' },
    ])

    const verdictInvente = await requete(ctx, 'POST', `/clients/${clientId}/acfc/evaluations`, {
      jeton: admin.jeton,
      body: {
        methodProfileId: profil.corps.profil.id,
        methodProfileVersion: profil.corps.profil.version,
        assetNodeId: null,
        nomElement: 'Vanne V-102',
        reponses: { 'q-1': 'oui' },
        verdict: 'tres_critique',
      },
    })
    expect(verdictInvente.status).toBe(400)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/acfc`, { jeton: admin.jeton })
    expect(liste.corps.evaluations.map((e) => e.id)).toContain(evaluation.corps.evaluation.id)
  })

  test('migration locale : idempotente, l’existant côté serveur gagne toujours', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const profilLocal = {
      id: 'profil-local-1',
      clientId,
      version: 'v1',
      effectiveDate: '2026-01-01T00:00:00.000Z',
      source: 'Ancienne procédure',
      origin: 'procedure_client',
      questions: [{ id: 'q-1', texte: { fr: 'Contact produit ?' } }],
      decisionRule: 'au_moins_un_oui_critique',
      createdAt: '2026-01-01T00:00:00.000Z',
    }

    const premiere = await requete(ctx, 'POST', `/clients/${clientId}/acfc/migration-locale`, {
      jeton: admin.jeton,
      body: { profils: [profilLocal], evaluations: [] },
    })
    expect(premiere.status).toBe(200)

    const rejouee = await requete(ctx, 'POST', `/clients/${clientId}/acfc/migration-locale`, {
      jeton: admin.jeton,
      body: { profils: [{ ...profilLocal, source: 'Tentative d’écrasement' }], evaluations: [] },
    })
    expect(rejouee.status).toBe(200)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/acfc`, { jeton: admin.jeton })
    expect(liste.corps.profils).toHaveLength(1)
    expect(liste.corps.profils[0]?.source).toBe('Ancienne procédure')
  })

  test('non authentifié -> 401', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/acfc`)
    expect(obtenir.status).toBe(401)
  })
})

describe('routerRequete — Parameter/ClassificationCriticiteParametre/CPP/CQA (Target Architecture §10, Phase 4b du chantier de migration D1)', () => {
  async function creerClientDeTest(ctx: Contexte, jeton: string): Promise<string> {
    const creation = await requete(ctx, 'POST', '/clients', { jeton, body: { name: 'Ferring' } })
    return creation.corps.client.id
  }

  test('GET sans rien configuré -> listes vides, jamais 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/parameters`, {
      jeton: admin.jeton,
    })
    expect(obtenir.status).toBe(200)
    expect(obtenir.corps.parametresProcede).toEqual([])
    expect(obtenir.corps.classifications).toEqual([])
    expect(obtenir.corps.cpps).toEqual([])
    expect(obtenir.corps.cqas).toEqual([])
  })

  test('créer un paramètre : id/auditLog/horodatages dérivés côté serveur', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/parameters/parametres`, {
      jeton: admin.jeton,
      body: {
        nom: 'Température de stérilisation',
        description: 'Température du cycle autoclave',
        unite: '°C',
        assetNodeId: null,
      },
    })
    expect(creation.status).toBe(201)
    expect(creation.corps.parametreProcede.clientId).toBe(clientId)
    expect(creation.corps.parametreProcede.id).toEqual(expect.any(String))
    expect(creation.corps.parametreProcede.auditLog).toEqual([
      { timestamp: expect.any(String), actor: 'admin@pharmatech.example', action: 'création' },
    ])

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/parameters`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.parametresProcede.map((p) => p.id)).toContain(
      creation.corps.parametreProcede.id,
    )
  })

  test('créer un paramètre sans champ obligatoire -> corps_invalide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/parameters/parametres`, {
      jeton: admin.jeton,
      body: { nom: 'Sans description' },
    })
    expect(creation.status).toBe(400)
    expect(creation.corps.erreur).toBe('corps_invalide')
  })

  test('classifier un paramètre ne crée jamais de CPP/CQA (garde-fou §10)', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const parametre = await requete(ctx, 'POST', `/clients/${clientId}/parameters/parametres`, {
      jeton: admin.jeton,
      body: { nom: 'Pression chambre', description: 'Pression du cycle', unite: 'bar' },
    })

    const classification = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/parameters/classifications`,
      {
        jeton: admin.jeton,
        body: {
          parameterId: parametre.corps.parametreProcede.id,
          niveau: 'critique',
          contexte: 'Cycle de stérilisation terminale',
          justification: 'Impact direct sur la stérilité du produit',
        },
      },
    )
    expect(classification.status).toBe(201)
    expect(classification.corps.classification.niveau).toBe('critique')

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/parameters`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.cpps).toEqual([])
    expect(liste.corps.cqas).toEqual([])
  })

  test('déclarer un CPP puis le désactiver : historique conservé, jamais muté ni supprimé', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const parametre = await requete(ctx, 'POST', `/clients/${clientId}/parameters/parametres`, {
      jeton: admin.jeton,
      body: { nom: 'Pression chambre', description: 'Pression du cycle', unite: 'bar' },
    })

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/parameters/cpps`, {
      jeton: admin.jeton,
      body: {
        parameterId: parametre.corps.parametreProcede.id,
        contexte: 'Recette produit A',
        justification: 'Paramètre critique du procédé de stérilisation',
      },
    })
    expect(creation.status).toBe(201)
    expect(creation.corps.cpp.actif).toBe(true)

    const desactivation = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/parameters/cpps/${creation.corps.cpp.id}`,
      { jeton: admin.jeton, body: { motif: 'Changement de recette produit' } },
    )
    expect(desactivation.status).toBe(200)
    expect(desactivation.corps.cpp.actif).toBe(false)
    expect(desactivation.corps.cpp.auditLog).toHaveLength(2)
    expect(desactivation.corps.cpp.auditLog[1]?.action).toContain('Changement de recette produit')
  })

  test('déclarer un CQA puis le désactiver', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/parameters/cqas`, {
      jeton: admin.jeton,
      body: {
        nom: 'Stérilité',
        description: 'Absence de micro-organismes viables',
        contexte: 'Produit stérile injectable',
        justification: 'Exigence pharmacopée',
      },
    })
    expect(creation.status).toBe(201)
    expect(creation.corps.cqa.actif).toBe(true)

    const desactivation = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/parameters/cqas/${creation.corps.cqa.id}`,
      { jeton: admin.jeton, body: { motif: 'Attribut retiré du dossier qualité' } },
    )
    expect(desactivation.status).toBe(200)
    expect(desactivation.corps.cqa.actif).toBe(false)
  })

  test('migration locale : idempotente, l’existant côté serveur gagne toujours', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const parametreLocal = {
      id: 'parametre-local-1',
      clientId,
      assetNodeId: null,
      nom: 'Ancien paramètre',
      description: 'Description locale',
      unite: null,
      auditLog: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }

    const premiere = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/parameters/migration-locale`,
      {
        jeton: admin.jeton,
        body: { parametresProcede: [parametreLocal] },
      },
    )
    expect(premiere.status).toBe(200)

    const rejouee = await requete(ctx, 'POST', `/clients/${clientId}/parameters/migration-locale`, {
      jeton: admin.jeton,
      body: { parametresProcede: [{ ...parametreLocal, nom: 'Tentative d’écrasement' }] },
    })
    expect(rejouee.status).toBe(200)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/parameters`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.parametresProcede).toHaveLength(1)
    expect(liste.corps.parametresProcede[0]?.nom).toBe('Ancien paramètre')
  })

  test('non authentifié -> 401', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/parameters`)
    expect(obtenir.status).toBe(401)
  })
})

describe('routerRequete — Impact Assessment / System Classification (F1 du catalogue §10, Phase 4c du chantier de migration D1)', () => {
  async function creerClientDeTest(ctx: Contexte, jeton: string): Promise<string> {
    const creation = await requete(ctx, 'POST', '/clients', { jeton, body: { name: 'Ferring' } })
    return creation.corps.client.id
  }

  test('GET sans profil configuré -> listes vides, jamais 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/impact-assessment`, {
      jeton: admin.jeton,
    })
    expect(obtenir.status).toBe(200)
    expect(obtenir.corps.profilsImpact).toEqual([])
    expect(obtenir.corps.evaluationsImpact).toEqual([])
  })

  test('créer un profil : id/effectiveDate/createdAt dérivés côté serveur', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/impact-assessment/profils`, {
      jeton: admin.jeton,
      body: {
        version: 'v1',
        source: 'Ferring FSMP',
        origin: 'procedure_client',
        questions: [{ id: 'q-1', texte: { fr: 'Le système est-il en contact direct produit ?' } }],
        decisionRule: 'au_moins_un_oui_impact_direct',
      },
    })
    expect(creation.status).toBe(201)
    expect(creation.corps.profilImpact.clientId).toBe(clientId)
    expect(creation.corps.profilImpact.id).toEqual(expect.any(String))
    expect(creation.corps.profilImpact.effectiveDate).toEqual(expect.any(String))
    expect(creation.corps.profilImpact.questions).toHaveLength(1)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/impact-assessment`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.profilsImpact.map((p) => p.id)).toContain(creation.corps.profilImpact.id)
  })

  test('créer un profil sans champ obligatoire -> corps_invalide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/impact-assessment/profils`, {
      jeton: admin.jeton,
      body: { version: 'v1' },
    })
    expect(creation.status).toBe(400)
    expect(creation.corps.erreur).toBe('corps_invalide')
  })

  test('créer une évaluation : id/audit_log/horodatages dérivés côté serveur', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const profil = await requete(ctx, 'POST', `/clients/${clientId}/impact-assessment/profils`, {
      jeton: admin.jeton,
      body: {
        version: 'v1',
        source: 'Ferring FSMP',
        origin: 'procedure_client',
        questions: [{ id: 'q-1', texte: { fr: 'Contact produit ?' } }],
        decisionRule: 'au_moins_un_oui_impact_direct',
      },
    })

    const evaluation = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/impact-assessment/evaluations`,
      {
        jeton: admin.jeton,
        body: {
          methodProfileId: profil.corps.profilImpact.id,
          methodProfileVersion: profil.corps.profilImpact.version,
          assetNodeId: null,
          nomElement: 'Ligne de remplissage L-201',
          reponses: { 'q-1': 'oui' },
          verdict: 'impact_direct',
        },
      },
    )
    expect(evaluation.status).toBe(201)
    expect(evaluation.corps.evaluationImpact.clientId).toBe(clientId)
    expect(evaluation.corps.evaluationImpact.verdict).toBe('impact_direct')
    expect(evaluation.corps.evaluationImpact.auditLog).toEqual([
      { timestamp: expect.any(String), actor: 'admin@pharmatech.example', action: 'création' },
    ])

    const verdictInvente = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/impact-assessment/evaluations`,
      {
        jeton: admin.jeton,
        body: {
          methodProfileId: profil.corps.profilImpact.id,
          methodProfileVersion: profil.corps.profilImpact.version,
          assetNodeId: null,
          nomElement: 'Ligne L-202',
          reponses: { 'q-1': 'oui' },
          verdict: 'impact_indirect',
        },
      },
    )
    expect(verdictInvente.status).toBe(400)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/impact-assessment`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.evaluationsImpact.map((e) => e.id)).toContain(
      evaluation.corps.evaluationImpact.id,
    )
  })

  test('migration locale : idempotente, l’existant côté serveur gagne toujours', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const profilLocal = {
      id: 'profil-impact-local-1',
      clientId,
      version: 'v1',
      effectiveDate: '2026-01-01T00:00:00.000Z',
      source: 'Ancienne procédure',
      origin: 'procedure_client',
      questions: [{ id: 'q-1', texte: { fr: 'Contact produit ?' } }],
      decisionRule: 'au_moins_un_oui_impact_direct',
      createdAt: '2026-01-01T00:00:00.000Z',
    }

    const premiere = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/impact-assessment/migration-locale`,
      { jeton: admin.jeton, body: { profilsImpact: [profilLocal], evaluationsImpact: [] } },
    )
    expect(premiere.status).toBe(200)

    const rejouee = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/impact-assessment/migration-locale`,
      {
        jeton: admin.jeton,
        body: {
          profilsImpact: [{ ...profilLocal, source: 'Tentative d’écrasement' }],
          evaluationsImpact: [],
        },
      },
    )
    expect(rejouee.status).toBe(200)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/impact-assessment`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.profilsImpact).toHaveLength(1)
    expect(liste.corps.profilsImpact[0]?.source).toBe('Ancienne procédure')
  })

  test('non authentifié -> 401', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/impact-assessment`)
    expect(obtenir.status).toBe(401)
  })
})

describe('routerRequete — Computer System Assessment (F3 du catalogue §10, Phase 4c du chantier de migration D1)', () => {
  async function creerClientDeTest(ctx: Contexte, jeton: string): Promise<string> {
    const creation = await requete(ctx, 'POST', '/clients', { jeton, body: { name: 'Ferring' } })
    return creation.corps.client.id
  }

  test('GET sans rien configuré -> liste vide, jamais 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/csv-assessment`, {
      jeton: admin.jeton,
    })
    expect(obtenir.status).toBe(200)
    expect(obtenir.corps.evaluationsCsv).toEqual([])
  })

  test('créer une évaluation : id/audit_log/horodatages dérivés côté serveur', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/csv-assessment/evaluations`, {
      jeton: admin.jeton,
      body: {
        assetNodeId: null,
        nomSysteme: 'MES ligne A',
        categorieGamp5: 4,
        justificationCategorie: 'Logiciel paramétrable, pas de code sur mesure',
        pertinenceGxp: true,
        pertinenceEresPart11: true,
        justificationPertinence: 'Enregistrements électroniques réglementaires',
      },
    })
    expect(creation.status).toBe(201)
    expect(creation.corps.evaluationCsv.clientId).toBe(clientId)
    expect(creation.corps.evaluationCsv.categorieGamp5).toBe(4)
    expect(creation.corps.evaluationCsv.auditLog).toEqual([
      { timestamp: expect.any(String), actor: 'admin@pharmatech.example', action: 'création' },
    ])

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/csv-assessment`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.evaluationsCsv.map((e) => e.id)).toContain(creation.corps.evaluationCsv.id)

    for (const invalide of [
      { categorieGamp5: 7 },
      { categorieGamp5: 2 },
      { pertinenceGxp: 'oui' },
    ]) {
      const refus = await requete(ctx, 'POST', `/clients/${clientId}/csv-assessment/evaluations`, {
        jeton: admin.jeton,
        body: {
          assetNodeId: null,
          nomSysteme: 'MES ligne B',
          categorieGamp5: 4,
          justificationCategorie: 'x',
          pertinenceGxp: true,
          pertinenceEresPart11: true,
          justificationPertinence: 'x',
          ...invalide,
        },
      })
      expect(refus.status).toBe(400)
    }
  })

  test('créer une évaluation sans champ obligatoire -> corps_invalide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/csv-assessment/evaluations`, {
      jeton: admin.jeton,
      body: { nomSysteme: 'MES ligne A' },
    })
    expect(creation.status).toBe(400)
    expect(creation.corps.erreur).toBe('corps_invalide')
  })

  test('migration locale : idempotente, l’existant côté serveur gagne toujours', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const evaluationLocale = {
      id: 'evaluation-csv-locale-1',
      clientId,
      assetNodeId: null,
      nomSysteme: 'Ancien système',
      categorieGamp5: 3,
      justificationCategorie: 'Justification locale',
      pertinenceGxp: true,
      pertinenceEresPart11: false,
      justificationPertinence: 'Justification pertinence',
      auditLog: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }

    const premiere = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/csv-assessment/migration-locale`,
      { jeton: admin.jeton, body: { evaluationsCsv: [evaluationLocale] } },
    )
    expect(premiere.status).toBe(200)

    const rejouee = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/csv-assessment/migration-locale`,
      {
        jeton: admin.jeton,
        body: { evaluationsCsv: [{ ...evaluationLocale, nomSysteme: 'Tentative d’écrasement' }] },
      },
    )
    expect(rejouee.status).toBe(200)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/csv-assessment`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.evaluationsCsv).toHaveLength(1)
    expect(liste.corps.evaluationsCsv[0]?.nomSysteme).toBe('Ancien système')
  })

  test('non authentifié -> 401', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/csv-assessment`)
    expect(obtenir.status).toBe(401)
  })
})

describe('routerRequete — Risk Assessment / AMDEC (Target Architecture §10, Phase 4d du chantier de migration D1)', () => {
  async function creerClientDeTest(ctx: Contexte, jeton: string): Promise<string> {
    const creation = await requete(ctx, 'POST', '/clients', { jeton, body: { name: 'Ferring' } })
    return creation.corps.client.id
  }

  test('GET sans profil configuré -> listes vides, jamais 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/risk-assessment`, {
      jeton: admin.jeton,
    })
    expect(obtenir.status).toBe(200)
    expect(obtenir.corps.profilsRisque).toEqual([])
    expect(obtenir.corps.evaluationsRisque).toEqual([])
  })

  test('créer un profil : id/effectiveDate/createdAt dérivés côté serveur', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/risk-assessment/profils`, {
      jeton: admin.jeton,
      body: {
        version: 'v1',
        source: 'Processus_AMDEC.xlsx',
        origin: 'procedure_client',
        echelleMin: 1,
        echelleMax: 5,
        seuilAction: 50,
      },
    })
    expect(creation.status).toBe(201)
    expect(creation.corps.profilRisque.clientId).toBe(clientId)
    expect(creation.corps.profilRisque.id).toEqual(expect.any(String))
    expect(creation.corps.profilRisque.effectiveDate).toEqual(expect.any(String))
    expect(creation.corps.profilRisque.echelleMax).toBe(5)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/risk-assessment`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.profilsRisque.map((p) => p.id)).toContain(creation.corps.profilRisque.id)
  })

  test('créer un profil sans champ obligatoire -> corps_invalide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/risk-assessment/profils`, {
      jeton: admin.jeton,
      body: { version: 'v1' },
    })
    expect(creation.status).toBe(400)
    expect(creation.corps.erreur).toBe('corps_invalide')
  })

  test('créer une évaluation : id/audit_log/horodatages dérivés côté serveur, résiduel nul', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const profil = await requete(ctx, 'POST', `/clients/${clientId}/risk-assessment/profils`, {
      jeton: admin.jeton,
      body: {
        version: 'v1',
        source: 'Processus_AMDEC.xlsx',
        origin: 'procedure_client',
        echelleMin: 1,
        echelleMax: 5,
        seuilAction: 50,
      },
    })

    const evaluation = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/risk-assessment/evaluations`,
      {
        jeton: admin.jeton,
        body: {
          methodProfileId: profil.corps.profilRisque.id,
          methodProfileVersion: profil.corps.profilRisque.version,
          assetNodeId: null,
          parameterId: null,
          etapeProcessus: 'Remplissage',
          modeDefaillance: 'Sous-dosage',
          effetDefaillance: 'Produit non conforme',
          causePotentielle: 'Dérive du capteur de débit',
          controleActuel: 'Contrôle en ligne toutes les 30 min',
          severiteInitiale: 4,
          occurrenceInitiale: 3,
          detectabiliteInitiale: 2,
          iprInitial: 24,
          verdictInitial: 'acceptable',
        },
      },
    )
    expect(evaluation.status).toBe(201)
    expect(evaluation.corps.evaluationRisque.clientId).toBe(clientId)
    expect(evaluation.corps.evaluationRisque.iprInitial).toBe(24)
    expect(evaluation.corps.evaluationRisque.verdictInitial).toBe('acceptable')
    expect(evaluation.corps.evaluationRisque.iprResiduel).toBeNull()
    expect(evaluation.corps.evaluationRisque.verdictResiduel).toBeNull()

    const severiteTexte = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/risk-assessment/evaluations`,
      {
        jeton: admin.jeton,
        body: {
          methodProfileId: profil.corps.profilRisque.id,
          methodProfileVersion: profil.corps.profilRisque.version,
          assetNodeId: null,
          parameterId: null,
          etapeProcessus: 'Remplissage',
          modeDefaillance: 'Sur-dosage',
          effetDefaillance: '',
          causePotentielle: '',
          controleActuel: '',
          severiteInitiale: '4',
          occurrenceInitiale: 3,
          detectabiliteInitiale: 2,
          iprInitial: 24,
          verdictInitial: 'acceptable',
        },
      },
    )
    expect(severiteTexte.status).toBe(400)

    const profilInverse = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/risk-assessment/profils`,
      {
        jeton: admin.jeton,
        body: {
          version: 'v2',
          source: 'Profil inversé',
          origin: 'defini_utilisateur',
          echelleMin: 5,
          echelleMax: 1,
          seuilAction: 50,
        },
      },
    )
    expect(profilInverse.status).toBe(400)

    const residuelInvente = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/risk-assessment/evaluations/${evaluation.corps.evaluationRisque.id}/action-residuelle`,
      { jeton: admin.jeton, body: { verdictResiduel: 'a_surveiller' } },
    )
    expect(residuelInvente.status).toBe(400)
    expect(evaluation.corps.evaluationRisque.auditLog).toEqual([
      { timestamp: expect.any(String), actor: 'admin@pharmatech.example', action: 'création' },
    ])

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/risk-assessment`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.evaluationsRisque.map((e) => e.id)).toContain(
      evaluation.corps.evaluationRisque.id,
    )
  })

  test('créer une évaluation sans champ obligatoire -> corps_invalide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/risk-assessment/evaluations`,
      { jeton: admin.jeton, body: { methodProfileId: 'profil-1' } },
    )
    expect(creation.status).toBe(400)
    expect(creation.corps.erreur).toBe('corps_invalide')
  })

  test('enregistrer l’action résiduelle : deuxième temps du cycle AMDEC, sans muter l’initial', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const profil = await requete(ctx, 'POST', `/clients/${clientId}/risk-assessment/profils`, {
      jeton: admin.jeton,
      body: {
        version: 'v1',
        source: 'Processus_AMDEC.xlsx',
        origin: 'procedure_client',
        echelleMin: 1,
        echelleMax: 5,
        seuilAction: 50,
      },
    })
    const evaluation = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/risk-assessment/evaluations`,
      {
        jeton: admin.jeton,
        body: {
          methodProfileId: profil.corps.profilRisque.id,
          methodProfileVersion: profil.corps.profilRisque.version,
          assetNodeId: null,
          parameterId: null,
          etapeProcessus: 'Remplissage',
          modeDefaillance: 'Sous-dosage',
          effetDefaillance: 'Produit non conforme',
          causePotentielle: 'Dérive du capteur de débit',
          controleActuel: 'Contrôle en ligne toutes les 30 min',
          severiteInitiale: 4,
          occurrenceInitiale: 4,
          detectabiliteInitiale: 4,
          iprInitial: 64,
          verdictInitial: 'action_requise',
        },
      },
    )

    const action = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/risk-assessment/evaluations/${evaluation.corps.evaluationRisque.id}/action-residuelle`,
      {
        jeton: admin.jeton,
        body: {
          recommandation: 'Recalibrer le capteur de débit',
          responsable: 'Ingénieur procédé',
          dateCible: '2026-12-01',
          actionsMenees: 'Recalibration effectuée le 2026-11-15',
          severiteResiduelle: 4,
          occurrenceResiduelle: 2,
          detectabiliteResiduelle: 2,
          iprResiduel: 16,
          verdictResiduel: 'acceptable',
        },
      },
    )
    expect(action.status).toBe(200)
    expect(action.corps.evaluationRisque.iprResiduel).toBe(16)
    expect(action.corps.evaluationRisque.verdictResiduel).toBe('acceptable')
    // L'initial ne bouge jamais lors de l'enregistrement de l'action résiduelle.
    expect(action.corps.evaluationRisque.iprInitial).toBe(64)
    expect(action.corps.evaluationRisque.verdictInitial).toBe('action_requise')
    expect(action.corps.evaluationRisque.auditLog).toHaveLength(2)
    expect(action.corps.evaluationRisque.auditLog[1]).toEqual({
      timestamp: expect.any(String),
      actor: 'admin@pharmatech.example',
      action: 'action résiduelle enregistrée',
    })
  })

  test('enregistrer l’action résiduelle sur une évaluation introuvable -> 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const action = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/risk-assessment/evaluations/id-inconnu/action-residuelle`,
      { jeton: admin.jeton, body: { recommandation: 'x' } },
    )
    expect(action.status).toBe(404)
  })

  test('migration locale : idempotente, l’existant côté serveur gagne toujours', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const profilLocal = {
      id: 'profil-risque-local-1',
      clientId,
      version: 'v1',
      effectiveDate: '2026-01-01T00:00:00.000Z',
      source: 'Ancien classeur AMDEC',
      origin: 'procedure_client',
      echelleMin: 1,
      echelleMax: 5,
      seuilAction: 50,
      createdAt: '2026-01-01T00:00:00.000Z',
    }

    const premiere = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/risk-assessment/migration-locale`,
      { jeton: admin.jeton, body: { profilsRisque: [profilLocal], evaluationsRisque: [] } },
    )
    expect(premiere.status).toBe(200)

    const rejouee = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/risk-assessment/migration-locale`,
      {
        jeton: admin.jeton,
        body: {
          profilsRisque: [{ ...profilLocal, source: 'Tentative d’écrasement' }],
          evaluationsRisque: [],
        },
      },
    )
    expect(rejouee.status).toBe(200)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/risk-assessment`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.profilsRisque).toHaveLength(1)
    expect(liste.corps.profilsRisque[0]?.source).toBe('Ancien classeur AMDEC')
  })

  test('non authentifié -> 401', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/risk-assessment`)
    expect(obtenir.status).toBe(401)
  })
})

describe('routerRequete — Process/FonctionActif/ManufacturingContext (Target Architecture §4/§5/§7, Phase 5a du chantier de migration D1)', () => {
  async function creerClientDeTest(ctx: Contexte, jeton: string): Promise<string> {
    const creation = await requete(ctx, 'POST', '/clients', { jeton, body: { name: 'Ferring' } })
    return creation.corps.client.id
  }

  test('GET sans rien configuré -> listes vides, jamais 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/process-context`, {
      jeton: admin.jeton,
    })
    expect(obtenir.status).toBe(200)
    expect(obtenir.corps.processes).toEqual([])
    expect(obtenir.corps.fonctions).toEqual([])
    expect(obtenir.corps.associationsFonctionAssetNode).toEqual([])
    expect(obtenir.corps.associationsFonctionProcess).toEqual([])
    expect(obtenir.corps.manufacturingContexts).toEqual([])
  })

  test('créer un process : id/audit_log/horodatages dérivés côté serveur', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/process-context/processes`, {
      jeton: admin.jeton,
      body: { nom: 'Granulation', description: 'x', type: 'manufacturing', sourceId: null },
    })
    expect(creation.status).toBe(201)
    expect(creation.corps.process.clientId).toBe(clientId)
    expect(creation.corps.process.id).toEqual(expect.any(String))
    expect(creation.corps.process.auditLog).toEqual([
      { timestamp: expect.any(String), actor: 'admin@pharmatech.example', action: 'création' },
    ])

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/process-context`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.processes.map((p) => p.id)).toContain(creation.corps.process.id)
  })

  test('créer un process sans champ obligatoire -> corps_invalide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/process-context/processes`, {
      jeton: admin.jeton,
      body: { nom: 'Granulation' },
    })
    expect(creation.status).toBe(400)
    expect(creation.corps.erreur).toBe('corps_invalide')
  })

  test('créer une fonction : id/audit_log dérivés côté serveur', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/process-context/fonctions`, {
      jeton: admin.jeton,
      body: { nom: 'Mesure de pression', description: 'x' },
    })
    expect(creation.status).toBe(201)
    expect(creation.corps.fonction.clientId).toBe(clientId)
    expect(creation.corps.fonction.auditLog).toHaveLength(1)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/process-context`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.fonctions.map((f) => f.id)).toContain(creation.corps.fonction.id)
  })

  test('associer une fonction à un nœud d’actif : id/created_at dérivés côté serveur', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const fonction = await requete(ctx, 'POST', `/clients/${clientId}/process-context/fonctions`, {
      jeton: admin.jeton,
      body: { nom: 'Mesure de pression', description: 'x' },
    })

    const association = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/process-context/associations-fonction-asset-node`,
      { jeton: admin.jeton, body: { functionId: fonction.corps.fonction.id, assetNodeId: 'n1' } },
    )
    expect(association.status).toBe(201)
    expect(association.corps.associationFonctionAssetNode.functionId).toBe(
      fonction.corps.fonction.id,
    )
    expect(association.corps.associationFonctionAssetNode.assetNodeId).toBe('n1')

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/process-context`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.associationsFonctionAssetNode).toHaveLength(1)
  })

  test('associer une fonction à un process : id/created_at dérivés côté serveur', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const fonction = await requete(ctx, 'POST', `/clients/${clientId}/process-context/fonctions`, {
      jeton: admin.jeton,
      body: { nom: 'Mesure de pression', description: 'x' },
    })
    const process = await requete(ctx, 'POST', `/clients/${clientId}/process-context/processes`, {
      jeton: admin.jeton,
      body: { nom: 'Granulation', description: 'x', type: 'manufacturing', sourceId: null },
    })

    const association = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/process-context/associations-fonction-process`,
      {
        jeton: admin.jeton,
        body: { functionId: fonction.corps.fonction.id, processId: process.corps.process.id },
      },
    )
    expect(association.status).toBe(201)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/process-context`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.associationsFonctionProcess).toHaveLength(1)
  })

  test('créer un manufacturing context : id/horodatages dérivés côté serveur', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const process = await requete(ctx, 'POST', `/clients/${clientId}/process-context/processes`, {
      jeton: admin.jeton,
      body: { nom: 'Coating', description: 'x', type: 'manufacturing', sourceId: null },
    })

    const creation = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/process-context/manufacturing-contexts`,
      {
        jeton: admin.jeton,
        body: {
          assetNodeId: 'n1',
          processId: process.corps.process.id,
          produit: 'Produit A',
          recette: 'R02',
          format: null,
          configuration: null,
        },
      },
    )
    expect(creation.status).toBe(201)
    expect(creation.corps.manufacturingContext.produit).toBe('Produit A')

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/process-context`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.manufacturingContexts.map((c) => c.id)).toContain(
      creation.corps.manufacturingContext.id,
    )
  })

  test('créer un manufacturing context sans champ obligatoire -> corps_invalide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/process-context/manufacturing-contexts`,
      { jeton: admin.jeton, body: { assetNodeId: 'n1' } },
    )
    expect(creation.status).toBe(400)
    expect(creation.corps.erreur).toBe('corps_invalide')
  })

  test('migration locale : idempotente, l’existant côté serveur gagne toujours', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const processLocal = {
      id: 'process-local-1',
      clientId,
      nom: 'Ancien nom',
      description: 'x',
      type: 'manufacturing',
      sourceId: null,
      auditLog: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }

    const premiere = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/process-context/migration-locale`,
      { jeton: admin.jeton, body: { processes: [processLocal] } },
    )
    expect(premiere.status).toBe(200)

    const rejouee = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/process-context/migration-locale`,
      {
        jeton: admin.jeton,
        body: { processes: [{ ...processLocal, nom: 'Tentative d’écrasement' }] },
      },
    )
    expect(rejouee.status).toBe(200)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/process-context`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.processes).toHaveLength(1)
    expect(liste.corps.processes[0]?.nom).toBe('Ancien nom')
  })

  test('non authentifié -> 401', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/process-context`)
    expect(obtenir.status).toBe(401)
  })
})

describe('routerRequete — QualityEvent/ReferenceQualityEvent (URS catalogue §10 famille H/I, Phase 5b du chantier de migration D1)', () => {
  async function creerClientDeTest(ctx: Contexte, jeton: string): Promise<string> {
    const creation = await requete(ctx, 'POST', '/clients', { jeton, body: { name: 'Ferring' } })
    return creation.corps.client.id
  }

  test('GET sans rien configuré -> listes vides, jamais 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/quality-events`, {
      jeton: admin.jeton,
    })
    expect(obtenir.status).toBe(200)
    expect(obtenir.corps.evenements).toEqual([])
    expect(obtenir.corps.references).toEqual([])
  })

  test('créer un événement : id/statut/audit_log/horodatages dérivés côté serveur', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/quality-events/evenements`, {
      jeton: admin.jeton,
      body: {
        type: 'deviation',
        titre: 'Écart température',
        description: 'x',
        origine: 'interne',
        referenceExterne: null,
        assetNodeId: null,
        processId: null,
        manufacturingContextId: null,
      },
    })
    expect(creation.status).toBe(201)
    expect(creation.corps.evenement.clientId).toBe(clientId)
    expect(creation.corps.evenement.id).toEqual(expect.any(String))
    expect(creation.corps.evenement.statut).toBe('ouvert')
    expect(creation.corps.evenement.auditLog).toEqual([
      { timestamp: expect.any(String), actor: 'admin@pharmatech.example', action: 'création' },
    ])

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/quality-events`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.evenements.map((e) => e.id)).toContain(creation.corps.evenement.id)
  })

  test('créer un événement sans champ obligatoire -> corps_invalide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/quality-events/evenements`, {
      jeton: admin.jeton,
      body: { type: 'deviation' },
    })
    expect(creation.status).toBe(400)
    expect(creation.corps.erreur).toBe('corps_invalide')
  })

  test('type, origine ou statut hors domaine -> corps_invalide (jamais un libellé affiché vide)', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const base = {
      titre: 'Écart',
      description: '',
      referenceExterne: null,
      assetNodeId: null,
      processId: null,
      manufacturingContextId: null,
    }

    const typeInvente = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/quality-events/evenements`,
      {
        jeton: admin.jeton,
        body: { ...base, type: 'incident_majeur', origine: 'interne' },
      },
    )
    expect(typeInvente.status).toBe(400)

    const origineInventee = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/quality-events/evenements`,
      { jeton: admin.jeton, body: { ...base, type: 'deviation', origine: 'production' } },
    )
    expect(origineInventee.status).toBe(400)

    const valide = await requete(ctx, 'POST', `/clients/${clientId}/quality-events/evenements`, {
      jeton: admin.jeton,
      body: { ...base, type: 'deviation', origine: 'interne' },
    })
    const statutInvente = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/quality-events/evenements/${valide.corps.evenement.id}/statut`,
      { jeton: admin.jeton, body: { statut: 'archive' } },
    )
    expect(statutInvente.status).toBe(400)
  })

  test('changer le statut d’un événement : audit_log accumulé, jamais réécrit', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const creation = await requete(ctx, 'POST', `/clients/${clientId}/quality-events/evenements`, {
      jeton: admin.jeton,
      body: {
        type: 'capa',
        titre: 'CAPA X',
        description: 'x',
        origine: 'externe',
        referenceExterne: null,
        assetNodeId: null,
        processId: null,
        manufacturingContextId: null,
      },
    })

    const changement = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/quality-events/evenements/${creation.corps.evenement.id}/statut`,
      { jeton: admin.jeton, body: { statut: 'en_cours' } },
    )
    expect(changement.status).toBe(200)
    expect(changement.corps.evenement.statut).toBe('en_cours')
    expect(changement.corps.evenement.auditLog).toHaveLength(2)
  })

  test('changer le statut d’un événement inexistant -> 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const changement = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/quality-events/evenements/inconnu/statut`,
      { jeton: admin.jeton, body: { statut: 'clos' } },
    )
    expect(changement.status).toBe(404)
  })

  test('référencer un événement externe sans le bloquer ni le dupliquer', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const source = await requete(ctx, 'POST', `/clients/${clientId}/quality-events/evenements`, {
      jeton: admin.jeton,
      body: {
        type: 'deviation',
        titre: 'Écart',
        description: 'x',
        origine: 'interne',
        referenceExterne: { systeme: 'SAP-QM', identifiant: 'CC-2026-042' },
        assetNodeId: null,
        processId: null,
        manufacturingContextId: null,
      },
    })
    const cible = await requete(ctx, 'POST', `/clients/${clientId}/quality-events/evenements`, {
      jeton: admin.jeton,
      body: {
        type: 'capa',
        titre: 'CAPA',
        description: 'x',
        origine: 'externe',
        referenceExterne: null,
        assetNodeId: null,
        processId: null,
        manufacturingContextId: null,
      },
    })

    const reference = await requete(ctx, 'POST', `/clients/${clientId}/quality-events/references`, {
      jeton: admin.jeton,
      body: { sourceId: source.corps.evenement.id, cibleId: cible.corps.evenement.id },
    })
    expect(reference.status).toBe(201)
    expect(reference.corps.reference.qualityEventSourceId).toBe(source.corps.evenement.id)
    expect(reference.corps.reference.qualityEventCibleId).toBe(cible.corps.evenement.id)

    // Un Change Control externe ouvert référençant un événement n'empêche
    // jamais la création d'un ManufacturingContext indépendant — garde-fou
    // central du domaine QualityEvent, aucun blocage n'existe par design.
    const manufacturingContext = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/process-context/manufacturing-contexts`,
      {
        jeton: admin.jeton,
        body: {
          assetNodeId: 'n1',
          processId: 'p1',
          produit: 'Produit A',
          recette: null,
          format: null,
          configuration: null,
        },
      },
    )
    expect(manufacturingContext.status).toBe(201)
  })

  test('migration locale : idempotente, l’existant côté serveur gagne toujours', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const evenementLocal = {
      id: 'evenement-local-1',
      clientId,
      type: 'deviation',
      titre: 'Ancien titre',
      description: 'x',
      origine: 'interne',
      referenceExterne: null,
      assetNodeId: null,
      processId: null,
      manufacturingContextId: null,
      statut: 'ouvert',
      auditLog: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }

    const premiere = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/quality-events/migration-locale`,
      { jeton: admin.jeton, body: { evenements: [evenementLocal] } },
    )
    expect(premiere.status).toBe(200)

    const rejouee = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/quality-events/migration-locale`,
      {
        jeton: admin.jeton,
        body: { evenements: [{ ...evenementLocal, titre: 'Tentative d’écrasement' }] },
      },
    )
    expect(rejouee.status).toBe(200)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/quality-events`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.evenements).toHaveLength(1)
    expect(liste.corps.evenements[0]?.titre).toBe('Ancien titre')
  })

  test('non authentifié -> 401', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/quality-events`)
    expect(obtenir.status).toBe(401)
  })
})

describe('routerRequete — Requirement/TestObjective/TestCandidate/Test/Couverture (Target Architecture, domaine "Test", Phase 6a du chantier de migration D1)', () => {
  async function creerClientDeTest(ctx: Contexte, jeton: string): Promise<string> {
    const creation = await requete(ctx, 'POST', '/clients', { jeton, body: { name: 'Ferring' } })
    return creation.corps.client.id
  }

  test('GET sans rien configuré -> listes vides, jamais 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/test-definition`, {
      jeton: admin.jeton,
    })
    expect(obtenir.status).toBe(200)
    expect(obtenir.corps.requirements).toEqual([])
    expect(obtenir.corps.testObjectives).toEqual([])
    expect(obtenir.corps.testCandidates).toEqual([])
    expect(obtenir.corps.tests).toEqual([])
    expect(obtenir.corps.couvertures).toEqual([])
  })

  test('créer un requirement : id/audit_log/horodatages dérivés côté serveur', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/test-definition/requirements`,
      {
        jeton: admin.jeton,
        body: {
          reference: 'REQ-1',
          titre: 'Débit stable',
          description: 'x',
          assetNodeId: null,
          processId: null,
        },
      },
    )
    expect(creation.status).toBe(201)
    expect(creation.corps.requirement.clientId).toBe(clientId)
    expect(creation.corps.requirement.auditLog).toEqual([
      { timestamp: expect.any(String), actor: 'admin@pharmatech.example', action: 'création' },
    ])

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/test-definition`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.requirements.map((r) => r.id)).toContain(creation.corps.requirement.id)
  })

  test('créer un requirement sans champ obligatoire -> corps_invalide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/test-definition/requirements`,
      { jeton: admin.jeton, body: { reference: 'REQ-1' } },
    )
    expect(creation.status).toBe(400)
    expect(creation.corps.erreur).toBe('corps_invalide')
  })

  async function creerRequirementDeTest(ctx: Contexte, jeton: string, clientId: string) {
    const creation = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/test-definition/requirements`,
      {
        jeton,
        body: { reference: 'REQ-1', titre: 'Débit stable', description: 'x' },
      },
    )
    return creation.corps.requirement
  }

  test('créer un test objective : id/horodatages dérivés côté serveur', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const requirement = await creerRequirementDeTest(ctx, admin.jeton, clientId)

    const creation = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/test-definition/test-objectives`,
      {
        jeton: admin.jeton,
        body: { requirementId: requirement.id, titre: 'Objectif', description: 'x' },
      },
    )
    expect(creation.status).toBe(201)
    expect(creation.corps.testObjective.requirementId).toBe(requirement.id)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/test-definition`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.testObjectives.map((o) => o.id)).toContain(creation.corps.testObjective.id)
  })

  async function creerTestObjectiveDeTest(
    ctx: Contexte,
    jeton: string,
    clientId: string,
    requirementId: string,
  ) {
    const creation = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/test-definition/test-objectives`,
      { jeton, body: { requirementId, titre: 'Objectif', description: 'x' } },
    )
    return creation.corps.testObjective
  }

  test('créer un test candidate : statut "propose" par défaut, dérivé côté serveur', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const requirement = await creerRequirementDeTest(ctx, admin.jeton, clientId)
    const objectif = await creerTestObjectiveDeTest(ctx, admin.jeton, clientId, requirement.id)

    const creation = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/test-definition/test-candidates`,
      {
        jeton: admin.jeton,
        body: { testObjectiveId: objectif.id, titre: 'Candidat', description: 'x' },
      },
    )
    expect(creation.status).toBe(201)
    expect(creation.corps.testCandidate.statut).toBe('propose')
    expect(creation.corps.testCandidate.riskAssessmentId).toBeNull()
  })

  test('créer des candidats en lot depuis une analyse de risque : id/statut/audit_log dérivés côté serveur', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const requirement = await creerRequirementDeTest(ctx, admin.jeton, clientId)
    const objectif = await creerTestObjectiveDeTest(ctx, admin.jeton, clientId, requirement.id)

    const creation = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/test-definition/test-candidates/depuis-risques`,
      {
        jeton: admin.jeton,
        body: {
          candidats: [
            {
              testObjectiveId: objectif.id,
              riskAssessmentId: 'risque-1',
              titre: 'Candidat depuis risque',
              description: 'x',
            },
          ],
        },
      },
    )
    expect(creation.status).toBe(201)
    expect(creation.corps.testCandidates).toHaveLength(1)
    expect(creation.corps.testCandidates[0]?.statut).toBe('propose')
    expect(creation.corps.testCandidates[0]?.riskAssessmentId).toBe('risque-1')
    expect(creation.corps.testCandidates[0]?.id).toEqual(expect.any(String))
  })

  async function creerTestCandidateDeTest(
    ctx: Contexte,
    jeton: string,
    clientId: string,
    testObjectiveId: string,
  ) {
    const creation = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/test-definition/test-candidates`,
      { jeton, body: { testObjectiveId, titre: 'Candidat', description: 'x' } },
    )
    return creation.corps.testCandidate
  }

  test('changer le statut d’un test candidate : audit_log accumulé, jamais réécrit', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const requirement = await creerRequirementDeTest(ctx, admin.jeton, clientId)
    const objectif = await creerTestObjectiveDeTest(ctx, admin.jeton, clientId, requirement.id)
    const candidat = await creerTestCandidateDeTest(ctx, admin.jeton, clientId, objectif.id)

    const changement = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/test-definition/test-candidates/${candidat.id}/statut`,
      { jeton: admin.jeton, body: { statut: 'accepte' } },
    )
    expect(changement.status).toBe(200)
    expect(changement.corps.testCandidate.statut).toBe('accepte')
    expect(changement.corps.testCandidate.auditLog).toHaveLength(2)

    const statutInvente = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/test-definition/test-candidates/${candidat.id}/statut`,
      { jeton: admin.jeton, body: { statut: 'valide_par_ia' } },
    )
    expect(statutInvente.status).toBe(400)
  })

  test('changer le statut d’un test candidate inexistant -> 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const changement = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/test-definition/test-candidates/inconnu/statut`,
      { jeton: admin.jeton, body: { statut: 'rejete', motifRejet: 'hors périmètre' } },
    )
    expect(changement.status).toBe(404)
  })

  test('créer un Test depuis un candidat non accepté -> candidat_non_accepte', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const requirement = await creerRequirementDeTest(ctx, admin.jeton, clientId)
    const objectif = await creerTestObjectiveDeTest(ctx, admin.jeton, clientId, requirement.id)
    const candidat = await creerTestCandidateDeTest(ctx, admin.jeton, clientId, objectif.id)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/test-definition/tests`, {
      jeton: admin.jeton,
      body: {
        testCandidateId: candidat.id,
        titre: 'Test débit',
        description: 'x',
        etapes: [{ ordre: 1, action: 'Démarrer', resultatAttendu: 'Débit stable' }],
      },
    })
    expect(creation.status).toBe(400)
    expect(creation.corps.erreur).toBe('candidat_non_accepte')
  })

  test('créer un Test depuis un candidat accepté puis l’approuver', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const requirement = await creerRequirementDeTest(ctx, admin.jeton, clientId)
    const objectif = await creerTestObjectiveDeTest(ctx, admin.jeton, clientId, requirement.id)
    const candidat = await creerTestCandidateDeTest(ctx, admin.jeton, clientId, objectif.id)
    await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/test-definition/test-candidates/${candidat.id}/statut`,
      {
        jeton: admin.jeton,
        body: { statut: 'accepte' },
      },
    )

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/test-definition/tests`, {
      jeton: admin.jeton,
      body: {
        testCandidateId: candidat.id,
        titre: 'Test débit',
        description: 'x',
        etapes: [{ ordre: 1, action: 'Démarrer', resultatAttendu: 'Débit stable' }],
      },
    })
    expect(creation.status).toBe(201)
    expect(creation.corps.test.statut).toBe('brouillon')
    expect(creation.corps.test.etapes).toHaveLength(1)

    const approbation = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/test-definition/tests/${creation.corps.test.id}/approuver`,
      { jeton: admin.jeton },
    )
    expect(approbation.status).toBe(200)
    expect(approbation.corps.test.statut).toBe('approuve')
    expect(approbation.corps.test.auditLog).toHaveLength(2)
  })

  test('déclarer une couverture : idempotente', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const requirement = await creerRequirementDeTest(ctx, admin.jeton, clientId)
    const objectif = await creerTestObjectiveDeTest(ctx, admin.jeton, clientId, requirement.id)
    const candidat = await creerTestCandidateDeTest(ctx, admin.jeton, clientId, objectif.id)
    await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/test-definition/test-candidates/${candidat.id}/statut`,
      {
        jeton: admin.jeton,
        body: { statut: 'accepte' },
      },
    )
    const test = await requete(ctx, 'POST', `/clients/${clientId}/test-definition/tests`, {
      jeton: admin.jeton,
      body: { testCandidateId: candidat.id, titre: 'Test débit', description: 'x', etapes: [] },
    })

    const premiere = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/test-definition/couvertures`,
      {
        jeton: admin.jeton,
        body: { requirementId: requirement.id, testId: test.corps.test.id },
      },
    )
    expect(premiere.status).toBe(201)

    const seconde = await requete(ctx, 'POST', `/clients/${clientId}/test-definition/couvertures`, {
      jeton: admin.jeton,
      body: { requirementId: requirement.id, testId: test.corps.test.id },
    })
    expect(seconde.status).toBe(200)
    expect(seconde.corps.couverture.id).toBe(premiere.corps.couverture.id)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/test-definition`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.couvertures).toHaveLength(1)
  })

  test('migration locale : idempotente, l’existant côté serveur gagne toujours', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const requirementLocal = {
      id: 'requirement-local-1',
      clientId,
      reference: 'REQ-LOCAL',
      titre: 'Ancien titre',
      description: 'x',
      assetNodeId: null,
      processId: null,
      auditLog: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }

    const premiere = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/test-definition/migration-locale`,
      { jeton: admin.jeton, body: { requirements: [requirementLocal] } },
    )
    expect(premiere.status).toBe(200)

    const rejouee = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/test-definition/migration-locale`,
      {
        jeton: admin.jeton,
        body: { requirements: [{ ...requirementLocal, titre: 'Tentative d’écrasement' }] },
      },
    )
    expect(rejouee.status).toBe(200)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/test-definition`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.requirements).toHaveLength(1)
    expect(liste.corps.requirements[0]?.titre).toBe('Ancien titre')
  })

  test('non authentifié -> 401', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/test-definition`)
    expect(obtenir.status).toBe(401)
  })
})

describe('routerRequete — Execution/ExecutionStep/Measurement/ExecutionEvent (Target Architecture, domaine "Execution", Phase 6b du chantier de migration D1)', () => {
  async function creerClientDeTest(ctx: Contexte, jeton: string): Promise<string> {
    const creation = await requete(ctx, 'POST', '/clients', { jeton, body: { name: 'Ferring' } })
    return creation.corps.client.id
  }

  /** Chaîne complète Requirement→TestObjective→TestCandidate(accepté)→Test(approuvé), avec une étape, prête à être exécutée. */
  async function creerTestApprouveDeTest(
    ctx: Contexte,
    jeton: string,
    clientId: string,
  ): Promise<TestJson> {
    const requirement = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/test-definition/requirements`,
      { jeton, body: { reference: 'REQ-1', titre: 'Débit stable', description: 'x' } },
    )
    const objectif = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/test-definition/test-objectives`,
      {
        jeton,
        body: {
          requirementId: requirement.corps.requirement.id,
          titre: 'Objectif',
          description: 'x',
        },
      },
    )
    const candidat = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/test-definition/test-candidates`,
      {
        jeton,
        body: { testObjectiveId: objectif.corps.testObjective.id, titre: 'C', description: 'x' },
      },
    )
    await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/test-definition/test-candidates/${candidat.corps.testCandidate.id}/statut`,
      { jeton, body: { statut: 'accepte' } },
    )
    const test = await requete(ctx, 'POST', `/clients/${clientId}/test-definition/tests`, {
      jeton,
      body: {
        testCandidateId: candidat.corps.testCandidate.id,
        titre: 'Test débit',
        description: 'x',
        etapes: [{ ordre: 1, action: 'Démarrer', resultatAttendu: 'Débit stable' }],
      },
    })
    await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/test-definition/tests/${test.corps.test.id}/approuver`,
      { jeton },
    )
    return test.corps.test
  }

  test('GET sans rien configuré -> listes vides, jamais 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/executions`, {
      jeton: admin.jeton,
    })
    expect(obtenir.status).toBe(200)
    expect(obtenir.corps.executions).toEqual([])
    expect(obtenir.corps.executionSteps).toEqual([])
    expect(obtenir.corps.measurements).toEqual([])
    expect(obtenir.corps.executionEvents).toEqual([])
  })

  test('démarrer une exécution depuis un Test approuvé : id/statut/audit_log dérivés côté serveur', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const test = await creerTestApprouveDeTest(ctx, admin.jeton, clientId)

    const demarrage = await requete(ctx, 'POST', `/clients/${clientId}/executions`, {
      jeton: admin.jeton,
      body: { testId: test.id, assetNodeId: 'granulateur-01' },
    })
    expect(demarrage.status).toBe(201)
    expect(demarrage.corps.execution.statut).toBe('en_cours')
    expect(demarrage.corps.execution.verdict).toBeNull()
    expect(demarrage.corps.execution.auditLog).toEqual([
      { timestamp: expect.any(String), actor: 'admin@pharmatech.example', action: 'démarrage' },
    ])
  })

  test('démarrer une exécution depuis un Test non approuvé -> test_non_approuve', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const requirement = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/test-definition/requirements`,
      { jeton: admin.jeton, body: { reference: 'REQ-1', titre: 'Débit stable', description: 'x' } },
    )
    const objectif = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/test-definition/test-objectives`,
      {
        jeton: admin.jeton,
        body: {
          requirementId: requirement.corps.requirement.id,
          titre: 'Objectif',
          description: 'x',
        },
      },
    )
    const candidat = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/test-definition/test-candidates`,
      {
        jeton: admin.jeton,
        body: { testObjectiveId: objectif.corps.testObjective.id, titre: 'C', description: 'x' },
      },
    )
    await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/test-definition/test-candidates/${candidat.corps.testCandidate.id}/statut`,
      { jeton: admin.jeton, body: { statut: 'accepte' } },
    )
    const test = await requete(ctx, 'POST', `/clients/${clientId}/test-definition/tests`, {
      jeton: admin.jeton,
      body: {
        testCandidateId: candidat.corps.testCandidate.id,
        titre: 'Test débit',
        description: 'x',
        etapes: [],
      },
    })

    const demarrage = await requete(ctx, 'POST', `/clients/${clientId}/executions`, {
      jeton: admin.jeton,
      body: { testId: test.corps.test.id, assetNodeId: null },
    })
    expect(demarrage.status).toBe(400)
    expect(demarrage.corps.erreur).toBe('test_non_approuve')
  })

  test('démarrer une exécution depuis un Test inconnu -> test_introuvable', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const demarrage = await requete(ctx, 'POST', `/clients/${clientId}/executions`, {
      jeton: admin.jeton,
      body: { testId: 'inconnu', assetNodeId: null },
    })
    expect(demarrage.status).toBe(404)
    expect(demarrage.corps.erreur).toBe('test_introuvable')
  })

  test('enregistrer un résultat d’étape : immutable, jamais réécrit', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const test = await creerTestApprouveDeTest(ctx, admin.jeton, clientId)
    const demarrage = await requete(ctx, 'POST', `/clients/${clientId}/executions`, {
      jeton: admin.jeton,
      body: { testId: test.id, assetNodeId: null },
    })
    const executionId = demarrage.corps.execution.id
    const testStepId = test.etapes[0]?.id

    const resultat = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/executions/${executionId}/etapes`,
      { jeton: admin.jeton, body: { testStepId, resultat: 'conforme', observation: 'RAS' } },
    )
    expect(resultat.status).toBe(201)
    expect(resultat.corps.executionStep.resultat).toBe('conforme')
    expect(resultat.corps.executionStep.testStepId).toBe(testStepId)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/executions`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.executionSteps.map((e) => e.id)).toContain(resultat.corps.executionStep.id)
  })

  test('enregistrer un résultat d’étape sur une étape inconnue -> etape_inconnue', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const test = await creerTestApprouveDeTest(ctx, admin.jeton, clientId)
    const demarrage = await requete(ctx, 'POST', `/clients/${clientId}/executions`, {
      jeton: admin.jeton,
      body: { testId: test.id, assetNodeId: null },
    })

    const resultat = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/executions/${demarrage.corps.execution.id}/etapes`,
      {
        jeton: admin.jeton,
        body: { testStepId: 'inconnue', resultat: 'conforme', observation: '' },
      },
    )
    expect(resultat.status).toBe(400)
    expect(resultat.corps.erreur).toBe('etape_inconnue')
  })

  test('enregistrer un résultat d’étape sur une exécution inconnue -> execution_introuvable', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const resultat = await requete(ctx, 'POST', `/clients/${clientId}/executions/inconnue/etapes`, {
      jeton: admin.jeton,
      body: { testStepId: 'x', resultat: 'conforme', observation: '' },
    })
    expect(resultat.status).toBe(404)
    expect(resultat.corps.erreur).toBe('execution_introuvable')
  })

  test('ajouter une mesure à une étape d’exécution', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const test = await creerTestApprouveDeTest(ctx, admin.jeton, clientId)
    const demarrage = await requete(ctx, 'POST', `/clients/${clientId}/executions`, {
      jeton: admin.jeton,
      body: { testId: test.id, assetNodeId: null },
    })
    const resultat = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/executions/${demarrage.corps.execution.id}/etapes`,
      {
        jeton: admin.jeton,
        body: { testStepId: test.etapes[0]?.id, resultat: 'conforme', observation: '' },
      },
    )

    const mesure = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/execution-steps/${resultat.corps.executionStep.id}/mesures`,
      { jeton: admin.jeton, body: { libelle: 'F0 sonde froide', valeur: '15.4', unite: 'min' } },
    )
    expect(mesure.status).toBe(201)
    expect(mesure.corps.measurement.valeur).toBe('15.4')
  })

  test('ajouter une mesure à une étape d’exécution inconnue -> etape_execution_introuvable', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const mesure = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/execution-steps/inconnue/mesures`,
      { jeton: admin.jeton, body: { libelle: 'x', valeur: '1', unite: null } },
    )
    expect(mesure.status).toBe(404)
    expect(mesure.corps.erreur).toBe('etape_execution_introuvable')
  })

  test('consigner un événement d’exécution — quality_event_id optionnel jamais créé automatiquement', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const test = await creerTestApprouveDeTest(ctx, admin.jeton, clientId)
    const demarrage = await requete(ctx, 'POST', `/clients/${clientId}/executions`, {
      jeton: admin.jeton,
      body: { testId: test.id, assetNodeId: null },
    })

    const evenement = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/executions/${demarrage.corps.execution.id}/evenements`,
      {
        jeton: admin.jeton,
        body: { type: 'commentaire', description: 'RAS', qualityEventId: null },
      },
    )
    expect(evenement.status).toBe(201)
    expect(evenement.corps.executionEvent.type).toBe('commentaire')
    expect(evenement.corps.executionEvent.qualityEventId).toBeNull()
  })

  test('clôturer une exécution : verdict toujours fourni explicitement, jamais déduit', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const test = await creerTestApprouveDeTest(ctx, admin.jeton, clientId)
    const demarrage = await requete(ctx, 'POST', `/clients/${clientId}/executions`, {
      jeton: admin.jeton,
      body: { testId: test.id, assetNodeId: null },
    })

    const cloture = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/executions/${demarrage.corps.execution.id}/cloturer`,
      { jeton: admin.jeton, body: { verdict: 'conforme' } },
    )
    expect(cloture.status).toBe(200)
    expect(cloture.corps.execution.statut).toBe('terminee')
    expect(cloture.corps.execution.verdict).toBe('conforme')
    expect(cloture.corps.execution.auditLog).toHaveLength(2)

    const recloture = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/executions/${demarrage.corps.execution.id}/cloturer`,
      { jeton: admin.jeton, body: { verdict: 'non_conforme' } },
    )
    expect(recloture.status).toBe(400)
    expect(recloture.corps.erreur).toBe('execution_deja_cloturee')
  })

  test('valeurs hors domaine refusées : un enregistrement d’exécution immuable ne doit jamais porter un verdict/résultat/type inventé', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const test = await creerTestApprouveDeTest(ctx, admin.jeton, clientId)
    const demarrage = await requete(ctx, 'POST', `/clients/${clientId}/executions`, {
      jeton: admin.jeton,
      body: { testId: test.id, assetNodeId: null },
    })
    const executionId = demarrage.corps.execution.id

    const etape = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/executions/${executionId}/etapes`,
      {
        jeton: admin.jeton,
        body: { testStepId: test.etapes[0]?.id, resultat: 'peut-etre', observation: '' },
      },
    )
    expect(etape.status).toBe(400)
    expect(etape.corps.erreur).toBe('corps_invalide')

    const evenement = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/executions/${executionId}/evenements`,
      { jeton: admin.jeton, body: { type: 'inconnu', description: 'x', qualityEventId: null } },
    )
    expect(evenement.status).toBe(400)

    const preuve = await requete(ctx, 'POST', `/clients/${clientId}/evidences`, {
      jeton: admin.jeton,
      body: { executionId, executionStepId: null, type: 'video', titre: 'x', description: '' },
    })
    expect(preuve.status).toBe(400)

    const cloture = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/executions/${executionId}/cloturer`,
      { jeton: admin.jeton, body: { verdict: 'banane' } },
    )
    expect(cloture.status).toBe(400)
    expect(cloture.corps.erreur).toBe('corps_invalide')

    const encoreOuverte = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/executions/${executionId}/cloturer`,
      { jeton: admin.jeton, body: { verdict: 'conforme_avec_ecart' } },
    )
    expect(encoreOuverte.status).toBe(200)
  })

  test('migration locale : idempotente, l’existant côté serveur gagne toujours', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const executionLocale = {
      id: 'execution-locale-1',
      clientId,
      testId: 'test-x',
      assetNodeId: null,
      executant: 'local',
      statut: 'en_cours',
      verdict: null,
      dateDebut: '2026-01-01T00:00:00.000Z',
      dateFin: null,
      auditLog: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }

    const premiere = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/executions/migration-locale`,
      { jeton: admin.jeton, body: { executions: [executionLocale] } },
    )
    expect(premiere.status).toBe(200)

    const rejouee = await requete(ctx, 'POST', `/clients/${clientId}/executions/migration-locale`, {
      jeton: admin.jeton,
      body: { executions: [{ ...executionLocale, statut: 'terminee' }] },
    })
    expect(rejouee.status).toBe(200)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/executions`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.executions).toHaveLength(1)
    expect(liste.corps.executions[0]?.statut).toBe('en_cours')
  })

  test('non authentifié -> 401', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/executions`)
    expect(obtenir.status).toBe(401)
  })
})

describe('routerRequete — Evidence/EvidenceLocation/ProvenanceLink (Target Architecture, domaine "Evidence", Phase 6c du chantier de migration D1)', () => {
  async function creerClientDeTest(ctx: Contexte, jeton: string): Promise<string> {
    const creation = await requete(ctx, 'POST', '/clients', { jeton, body: { name: 'Ferring' } })
    return creation.corps.client.id
  }

  /** Chaîne complète jusqu'à une Execution en cours, avec une étape, prête à recevoir une Evidence. */
  async function creerExecutionEnCoursDeTest(
    ctx: Contexte,
    jeton: string,
    clientId: string,
  ): Promise<{ executionId: string; requirementId: string }> {
    const requirement = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/test-definition/requirements`,
      { jeton, body: { reference: 'REQ-1', titre: 'Débit stable', description: 'x' } },
    )
    const objectif = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/test-definition/test-objectives`,
      {
        jeton,
        body: {
          requirementId: requirement.corps.requirement.id,
          titre: 'Objectif',
          description: 'x',
        },
      },
    )
    const candidat = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/test-definition/test-candidates`,
      {
        jeton,
        body: { testObjectiveId: objectif.corps.testObjective.id, titre: 'C', description: 'x' },
      },
    )
    await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/test-definition/test-candidates/${candidat.corps.testCandidate.id}/statut`,
      { jeton, body: { statut: 'accepte' } },
    )
    const test = await requete(ctx, 'POST', `/clients/${clientId}/test-definition/tests`, {
      jeton,
      body: {
        testCandidateId: candidat.corps.testCandidate.id,
        titre: 'Test débit',
        description: 'x',
        etapes: [{ ordre: 1, action: 'Démarrer', resultatAttendu: 'Débit stable' }],
      },
    })
    await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/test-definition/tests/${test.corps.test.id}/approuver`,
      { jeton },
    )
    const demarrage = await requete(ctx, 'POST', `/clients/${clientId}/executions`, {
      jeton,
      body: { testId: test.corps.test.id, assetNodeId: null },
    })
    return {
      executionId: demarrage.corps.execution.id,
      requirementId: requirement.corps.requirement.id,
    }
  }

  test('GET sans rien configuré -> listes vides, jamais 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/evidences`, {
      jeton: admin.jeton,
    })
    expect(obtenir.status).toBe(200)
    expect(obtenir.corps.evidences).toEqual([])
    expect(obtenir.corps.evidenceLocations).toEqual([])
    expect(obtenir.corps.provenanceLinks).toEqual([])
  })

  test('enregistrer une preuve native : id/horodatage/actor dérivés côté serveur', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const { executionId } = await creerExecutionEnCoursDeTest(ctx, admin.jeton, clientId)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/evidences`, {
      jeton: admin.jeton,
      body: {
        executionId,
        executionStepId: null,
        type: 'native',
        titre: 'Observation directe',
        description: 'Cycle sans alarme',
      },
    })
    expect(creation.status).toBe(201)
    expect(creation.corps.evidence.actor).toBe('admin@pharmatech.example')
    expect(creation.corps.evidence.horodatage).toEqual(expect.any(String))

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/evidences`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.evidences.map((e) => e.id)).toContain(creation.corps.evidence.id)
  })

  test('enregistrer une preuve sur une exécution inconnue -> execution_introuvable', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/evidences`, {
      jeton: admin.jeton,
      body: {
        executionId: 'inconnue',
        executionStepId: null,
        type: 'native',
        titre: 'x',
        description: '',
      },
    })
    expect(creation.status).toBe(404)
    expect(creation.corps.erreur).toBe('execution_introuvable')
  })

  test('enregistrer une preuve sur une exécution clôturée -> execution_deja_cloturee', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const { executionId } = await creerExecutionEnCoursDeTest(ctx, admin.jeton, clientId)
    await requete(ctx, 'PATCH', `/clients/${clientId}/executions/${executionId}/cloturer`, {
      jeton: admin.jeton,
      body: { verdict: 'conforme' },
    })

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/evidences`, {
      jeton: admin.jeton,
      body: { executionId, executionStepId: null, type: 'native', titre: 'x', description: '' },
    })
    expect(creation.status).toBe(400)
    expect(creation.corps.erreur).toBe('execution_deja_cloturee')
  })

  test('enregistrer une preuve avec un executionStepId inconnu -> etape_inconnue', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const { executionId } = await creerExecutionEnCoursDeTest(ctx, admin.jeton, clientId)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/evidences`, {
      jeton: admin.jeton,
      body: {
        executionId,
        executionStepId: 'etape-inconnue',
        type: 'native',
        titre: 'x',
        description: '',
      },
    })
    expect(creation.status).toBe(400)
    expect(creation.corps.erreur).toBe('etape_inconnue')
  })

  test('ajouter une localisation à une Evidence de type document', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const { executionId } = await creerExecutionEnCoursDeTest(ctx, admin.jeton, clientId)
    const preuve = await requete(ctx, 'POST', `/clients/${clientId}/evidences`, {
      jeton: admin.jeton,
      body: {
        executionId,
        executionStepId: null,
        type: 'document',
        titre: 'Export capteur',
        description: '',
      },
    })

    const localisation = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/evidences/${preuve.corps.evidence.id}/localisations`,
      { jeton: admin.jeton, body: { systeme: 'drive', reference: '/preuves/export.csv' } },
    )
    expect(localisation.status).toBe(201)
    expect(localisation.corps.evidenceLocation.reference).toBe('/preuves/export.csv')
  })

  test('ajouter une localisation à une Evidence de type native -> type_non_document', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const { executionId } = await creerExecutionEnCoursDeTest(ctx, admin.jeton, clientId)
    const preuve = await requete(ctx, 'POST', `/clients/${clientId}/evidences`, {
      jeton: admin.jeton,
      body: { executionId, executionStepId: null, type: 'native', titre: 'x', description: '' },
    })

    const localisation = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/evidences/${preuve.corps.evidence.id}/localisations`,
      { jeton: admin.jeton, body: { systeme: 'drive', reference: '/inutile' } },
    )
    expect(localisation.status).toBe(400)
    expect(localisation.corps.erreur).toBe('type_non_document')
  })

  test('ajouter une localisation à une Evidence inconnue -> evidence_introuvable', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const localisation = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/evidences/inconnue/localisations`,
      { jeton: admin.jeton, body: { systeme: 'drive', reference: '/x' } },
    )
    expect(localisation.status).toBe(404)
    expect(localisation.corps.erreur).toBe('evidence_introuvable')
  })

  test('déclarer une provenance : idempotente', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const { executionId, requirementId } = await creerExecutionEnCoursDeTest(
      ctx,
      admin.jeton,
      clientId,
    )
    const preuve = await requete(ctx, 'POST', `/clients/${clientId}/evidences`, {
      jeton: admin.jeton,
      body: { executionId, executionStepId: null, type: 'native', titre: 'x', description: '' },
    })

    const premiere = await requete(ctx, 'POST', `/clients/${clientId}/provenance-links`, {
      jeton: admin.jeton,
      body: { evidenceId: preuve.corps.evidence.id, requirementId },
    })
    expect(premiere.status).toBe(201)

    const seconde = await requete(ctx, 'POST', `/clients/${clientId}/provenance-links`, {
      jeton: admin.jeton,
      body: { evidenceId: preuve.corps.evidence.id, requirementId },
    })
    expect(seconde.status).toBe(200)
    expect(seconde.corps.provenanceLink.id).toBe(premiere.corps.provenanceLink.id)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/evidences`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.provenanceLinks).toHaveLength(1)
  })

  test('migration locale : idempotente, l’existant côté serveur gagne toujours', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const evidenceLocale = {
      id: 'evidence-locale-1',
      clientId,
      executionId: 'exec-x',
      executionStepId: null,
      type: 'native',
      titre: 'Ancien titre',
      description: '',
      horodatage: '2026-01-01T00:00:00.000Z',
      actor: 'local',
    }

    const premiere = await requete(ctx, 'POST', `/clients/${clientId}/evidences/migration-locale`, {
      jeton: admin.jeton,
      body: { evidences: [evidenceLocale] },
    })
    expect(premiere.status).toBe(200)

    const rejouee = await requete(ctx, 'POST', `/clients/${clientId}/evidences/migration-locale`, {
      jeton: admin.jeton,
      body: { evidences: [{ ...evidenceLocale, titre: 'Tentative d’écrasement' }] },
    })
    expect(rejouee.status).toBe(200)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/evidences`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.evidences).toHaveLength(1)
    expect(liste.corps.evidences[0]?.titre).toBe('Ancien titre')
  })

  test('non authentifié -> 401', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/evidences`)
    expect(obtenir.status).toBe(401)
  })
})

describe('routerRequete — Source/SourceLocation/SourceVersion/Extraction/ExtractionItem/KnowledgeItem/Confirmation/KnowledgeRelation/Conflict (Target Architecture, domaines "Source Intelligence" et "Knowledge", Phase 7a du chantier de migration D1)', () => {
  async function creerClientDeTest(ctx: Contexte, jeton: string): Promise<string> {
    const creation = await requete(ctx, 'POST', '/clients', { jeton, body: { name: 'Ferring' } })
    return creation.corps.client.id
  }

  /** Chaîne complète jusqu'à un ExtractionItem, prête à recevoir un KnowledgeItem. */
  async function creerExtractionItemDeTest(
    ctx: Contexte,
    jeton: string,
    clientId: string,
  ): Promise<{
    sourceId: string
    sourceVersionId: string
    extractionId: string
    extractionItemId: string
  }> {
    const source = await requete(ctx, 'POST', `/clients/${clientId}/sources`, {
      jeton,
      body: { type: 'document', titre: 'SOP-001' },
    })
    const version = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/sources/${source.corps.source.id}/versions`,
      { jeton },
    )
    const extraction = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/source-versions/${version.corps.sourceVersion.id}/extractions`,
      { jeton, body: { methode: 'saisie_manuelle' } },
    )
    const item = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/extractions/${extraction.corps.extraction.id}/items`,
      { jeton, body: { contenu: 'Le débit doit rester stable', position: 0 } },
    )
    return {
      sourceId: source.corps.source.id,
      sourceVersionId: version.corps.sourceVersion.id,
      extractionId: extraction.corps.extraction.id,
      extractionItemId: item.corps.extractionItem.id,
    }
  }

  test('GET sans rien configuré -> listes vides, jamais 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/knowledge-engine`, {
      jeton: admin.jeton,
    })
    expect(obtenir.status).toBe(200)
    expect(obtenir.corps.sources).toEqual([])
    expect(obtenir.corps.sourceLocations).toEqual([])
    expect(obtenir.corps.sourceVersions).toEqual([])
    expect(obtenir.corps.extractions).toEqual([])
    expect(obtenir.corps.extractionItems).toEqual([])
    expect(obtenir.corps.knowledgeItems).toEqual([])
    expect(obtenir.corps.confirmations).toEqual([])
    expect(obtenir.corps.knowledgeRelations).toEqual([])
    expect(obtenir.corps.conflicts).toEqual([])
  })

  test('créer une Source, puis lui ajouter une localisation', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/sources`, {
      jeton: admin.jeton,
      body: { type: 'document', titre: 'SOP-001' },
    })
    expect(creation.status).toBe(201)
    expect(creation.corps.source.titre).toBe('SOP-001')

    const localisation = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/sources/${creation.corps.source.id}/localisations`,
      { jeton: admin.jeton, body: { systeme: 'github', reference: 'procedures/SOP-001.docx' } },
    )
    expect(localisation.status).toBe(201)
    expect(localisation.corps.sourceLocation.reference).toBe('procedures/SOP-001.docx')
  })

  test('ajouter une localisation à une Source inconnue -> source_introuvable', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const localisation = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/sources/inconnue/localisations`,
      { jeton: admin.jeton, body: { systeme: 'github', reference: 'x' } },
    )
    expect(localisation.status).toBe(404)
    expect(localisation.corps.erreur).toBe('source_introuvable')
  })

  test('créer des SourceVersion successives : numeroVersion auto-incrémenté côté serveur', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const source = await requete(ctx, 'POST', `/clients/${clientId}/sources`, {
      jeton: admin.jeton,
      body: { type: 'document', titre: 'SOP-001' },
    })

    const v1 = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/sources/${source.corps.source.id}/versions`,
      { jeton: admin.jeton },
    )
    expect(v1.corps.sourceVersion.numeroVersion).toBe(1)

    const v2 = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/sources/${source.corps.source.id}/versions`,
      { jeton: admin.jeton },
    )
    expect(v2.corps.sourceVersion.numeroVersion).toBe(2)
  })

  test('créer une SourceVersion sur une Source inconnue -> source_introuvable', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const version = await requete(ctx, 'POST', `/clients/${clientId}/sources/inconnue/versions`, {
      jeton: admin.jeton,
    })
    expect(version.status).toBe(404)
    expect(version.corps.erreur).toBe('source_introuvable')
  })

  test('enregistrer une Extraction sur une SourceVersion inconnue -> version_introuvable', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const extraction = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/source-versions/inconnue/extractions`,
      { jeton: admin.jeton, body: { methode: 'saisie_manuelle' } },
    )
    expect(extraction.status).toBe(404)
    expect(extraction.corps.erreur).toBe('version_introuvable')
  })

  test('ajouter un ExtractionItem sur une Extraction inconnue -> extraction_introuvable', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const item = await requete(ctx, 'POST', `/clients/${clientId}/extractions/inconnue/items`, {
      jeton: admin.jeton,
      body: { contenu: 'x', position: 0 },
    })
    expect(item.status).toBe(404)
    expect(item.corps.erreur).toBe('extraction_introuvable')
  })

  test('créer un KnowledgeItem : toujours a_valider à la création, jamais valide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const { extractionItemId } = await creerExtractionItemDeTest(ctx, admin.jeton, clientId)

    const creation = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/extraction-items/${extractionItemId}/knowledge-items`,
      { jeton: admin.jeton, body: { libelle: 'Débit', valeurInterpretee: 'Stable' } },
    )
    expect(creation.status).toBe(201)
    expect(creation.corps.knowledgeItem.statut).toBe('a_valider')
    expect(creation.corps.knowledgeItem.validePar).toBeNull()
    expect(creation.corps.knowledgeItem.auditLog).toHaveLength(1)
  })

  test('créer un KnowledgeItem sur un ExtractionItem inconnu -> extraction_item_introuvable', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/extraction-items/inconnu/knowledge-items`,
      { jeton: admin.jeton, body: { libelle: 'Débit', valeurInterpretee: 'Stable' } },
    )
    expect(creation.status).toBe(404)
    expect(creation.corps.erreur).toBe('extraction_item_introuvable')
  })

  test('confirmer un KnowledgeItem : crée une Confirmation, confirmePar dérivé côté serveur', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const { extractionItemId } = await creerExtractionItemDeTest(ctx, admin.jeton, clientId)
    const creation = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/extraction-items/${extractionItemId}/knowledge-items`,
      { jeton: admin.jeton, body: { libelle: 'Débit', valeurInterpretee: 'Stable' } },
    )

    const confirmation = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/knowledge-items/${creation.corps.knowledgeItem.id}/confirmer`,
      { jeton: admin.jeton, body: { decision: 'confirme' } },
    )
    expect(confirmation.status).toBe(200)
    expect(confirmation.corps.knowledgeItem.statut).toBe('valide')
    expect(confirmation.corps.knowledgeItem.validePar).toBe('admin@pharmatech.example')
    expect(confirmation.corps.confirmation.confirmePar).toBe('admin@pharmatech.example')
    expect(confirmation.corps.confirmation.decision).toBe('confirme')
  })

  test('rejeter un KnowledgeItem', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const { extractionItemId } = await creerExtractionItemDeTest(ctx, admin.jeton, clientId)
    const creation = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/extraction-items/${extractionItemId}/knowledge-items`,
      { jeton: admin.jeton, body: { libelle: 'Débit', valeurInterpretee: 'Stable' } },
    )

    const rejet = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/knowledge-items/${creation.corps.knowledgeItem.id}/confirmer`,
      { jeton: admin.jeton, body: { decision: 'rejete' } },
    )
    expect(rejet.corps.knowledgeItem.statut).toBe('rejete')
  })

  test('confirmer un KnowledgeItem inconnu -> knowledge_item_introuvable', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const confirmation = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/knowledge-items/inconnu/confirmer`,
      { jeton: admin.jeton, body: { decision: 'confirme' } },
    )
    expect(confirmation.status).toBe(404)
    expect(confirmation.corps.erreur).toBe('knowledge_item_introuvable')
  })

  test('déclarer deux fois la même relation entre deux KnowledgeItem est idempotent', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const premiere = await requete(ctx, 'POST', `/clients/${clientId}/knowledge-relations`, {
      jeton: admin.jeton,
      body: { knowledgeItemSourceId: 'ki-1', knowledgeItemCibleId: 'ki-2', type: 'precise' },
    })
    expect(premiere.status).toBe(201)

    const seconde = await requete(ctx, 'POST', `/clients/${clientId}/knowledge-relations`, {
      jeton: admin.jeton,
      body: { knowledgeItemSourceId: 'ki-1', knowledgeItemCibleId: 'ki-2', type: 'precise' },
    })
    expect(seconde.status).toBe(200)
    expect(seconde.corps.knowledgeRelation.id).toBe(premiere.corps.knowledgeRelation.id)
  })

  test('déclarer un Conflict puis le résoudre : reste ouvert tant qu’aucune résolution explicite', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/conflicts`, {
      jeton: admin.jeton,
      body: {
        knowledgeItemSourceId: 'ki-1',
        knowledgeItemCibleId: 'ki-2',
        description: 'Deux valeurs différentes pour le même débit',
      },
    })
    expect(creation.status).toBe(201)
    expect(creation.corps.conflict.statut).toBe('ouvert')
    expect(creation.corps.conflict.resolution).toBeNull()

    const resolution = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/conflicts/${creation.corps.conflict.id}/resoudre`,
      { jeton: admin.jeton, body: { resolution: 'La valeur la plus récente fait foi' } },
    )
    expect(resolution.status).toBe(200)
    expect(resolution.corps.conflict.statut).toBe('resolu')
    expect(resolution.corps.conflict.resolution).toBe('La valeur la plus récente fait foi')
  })

  test('résoudre un Conflict inconnu -> conflict_introuvable', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const resolution = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/conflicts/inconnu/resoudre`,
      { jeton: admin.jeton, body: { resolution: 'x' } },
    )
    expect(resolution.status).toBe(404)
    expect(resolution.corps.erreur).toBe('conflict_introuvable')
  })

  test('migration locale idempotente : la première valeur gagne toujours', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const sourceLocale = {
      id: 'source-locale-1',
      clientId,
      type: 'document',
      titre: 'Ancien titre',
      createdAt: '2026-01-01T00:00:00.000Z',
    }

    const premiere = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/knowledge-engine/migration-locale`,
      { jeton: admin.jeton, body: { sources: [sourceLocale] } },
    )
    expect(premiere.status).toBe(200)

    const rejouee = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/knowledge-engine/migration-locale`,
      {
        jeton: admin.jeton,
        body: { sources: [{ ...sourceLocale, titre: 'Tentative d’écrasement' }] },
      },
    )
    expect(rejouee.status).toBe(200)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/knowledge-engine`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.sources).toHaveLength(1)
    expect(liste.corps.sources[0]?.titre).toBe('Ancien titre')
  })

  test('non authentifié -> 401', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/knowledge-engine`)
    expect(obtenir.status).toBe(401)
  })
})

describe('routerRequete — ContentPlan (Target Architecture, domaine "Deliverable Engine", Phase 7b du chantier de migration D1)', () => {
  async function creerClientDeTest(ctx: Contexte, jeton: string): Promise<string> {
    const creation = await requete(ctx, 'POST', '/clients', { jeton, body: { name: 'Ferring' } })
    return creation.corps.client.id
  }

  /**
   * Chaîne complète Requirement → Couverture → Test → Execution → Evidence
   * ancrée sur `assetNodeId`, menant à `readiness: 'pret'` — même patron
   * que `creerExecutionEnCoursDeTest` (Phase 6b/6c) mais avec un
   * `assetNodeId` partagé et poussée jusqu'à la preuve.
   */
  async function creerChainePreteDeTest(
    ctx: Contexte,
    jeton: string,
    clientId: string,
    assetNodeId: string,
  ): Promise<{ testId: string }> {
    const requirement = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/test-definition/requirements`,
      { jeton, body: { reference: 'REQ-1', titre: 'Débit stable', description: 'x', assetNodeId } },
    )
    const objectif = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/test-definition/test-objectives`,
      {
        jeton,
        body: {
          requirementId: requirement.corps.requirement.id,
          titre: 'Objectif',
          description: 'x',
        },
      },
    )
    const candidat = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/test-definition/test-candidates`,
      {
        jeton,
        body: { testObjectiveId: objectif.corps.testObjective.id, titre: 'C', description: 'x' },
      },
    )
    await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/test-definition/test-candidates/${candidat.corps.testCandidate.id}/statut`,
      { jeton, body: { statut: 'accepte' } },
    )
    const test = await requete(ctx, 'POST', `/clients/${clientId}/test-definition/tests`, {
      jeton,
      body: {
        testCandidateId: candidat.corps.testCandidate.id,
        titre: 'Test débit',
        description: 'x',
        etapes: [{ ordre: 1, action: 'Démarrer', resultatAttendu: 'Débit stable' }],
      },
    })
    await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/test-definition/tests/${test.corps.test.id}/approuver`,
      { jeton },
    )
    await requete(ctx, 'POST', `/clients/${clientId}/test-definition/couvertures`, {
      jeton,
      body: { requirementId: requirement.corps.requirement.id, testId: test.corps.test.id },
    })
    const demarrage = await requete(ctx, 'POST', `/clients/${clientId}/executions`, {
      jeton,
      body: { testId: test.corps.test.id, assetNodeId },
    })
    await requete(ctx, 'POST', `/clients/${clientId}/evidences`, {
      jeton,
      body: {
        executionId: demarrage.corps.execution.id,
        executionStepId: null,
        type: 'native',
        titre: 'Observation directe',
        description: 'Cycle sans alarme',
      },
    })
    await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/executions/${demarrage.corps.execution.id}/cloturer`,
      { jeton, body: { verdict: 'conforme' } },
    )
    return { testId: test.corps.test.id }
  }

  /** Démarre puis clôture une exécution (avec ou sans preuve) — pour les scénarios de retest. */
  async function executerTest(
    ctx: Contexte,
    jeton: string,
    clientId: string,
    testId: string,
    assetNodeId: string,
    verdict: 'conforme' | 'non_conforme',
    avecPreuve: boolean,
  ): Promise<void> {
    // Horodatages strictement croissants entre exécutions successives.
    await new Promise((resolve) => setTimeout(resolve, 3))
    const demarrage = await requete(ctx, 'POST', `/clients/${clientId}/executions`, {
      jeton,
      body: { testId, assetNodeId },
    })
    if (avecPreuve) {
      await requete(ctx, 'POST', `/clients/${clientId}/evidences`, {
        jeton,
        body: {
          executionId: demarrage.corps.execution.id,
          executionStepId: null,
          type: 'native',
          titre: 'Observation directe',
          description: 'x',
        },
      })
    }
    await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/executions/${demarrage.corps.execution.id}/cloturer`,
      { jeton, body: { verdict } },
    )
  }

  test('retest : seule la dernière exécution clôturée sur cet équipement compte', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const { testId } = await creerChainePreteDeTest(ctx, admin.jeton, clientId, 'noeud-1')
    const creation = await requete(ctx, 'POST', `/clients/${clientId}/content-plans`, {
      jeton: admin.jeton,
      body: { templateId: 'gabarit-iq', assetNodeId: 'noeud-1', contextSnapshot: '{}' },
    })
    const planId = creation.corps.contentPlan.id
    const recalculer = () =>
      requete(ctx, 'PATCH', `/clients/${clientId}/content-plans/${planId}/recalculer-readiness`, {
        jeton: admin.jeton,
      })

    // Un échec sur un AUTRE équipement ne dit rien de celui-ci.
    await executerTest(ctx, admin.jeton, clientId, testId, 'noeud-2', 'non_conforme', true)
    expect((await recalculer()).corps.contentPlan.readiness).toBe('pret')

    // Dernière exécution sur cet équipement : non conforme -> bloque.
    await executerTest(ctx, admin.jeton, clientId, testId, 'noeud-1', 'non_conforme', true)
    const apresEchec = await recalculer()
    expect(apresEchec.corps.contentPlan.readiness).toBe('bloque')
    expect(apresEchec.corps.raisons.join(' ')).toContain('dernière exécution')

    // Retest conforme mais sans preuve -> besoin_revue (plus bloqué).
    await executerTest(ctx, admin.jeton, clientId, testId, 'noeud-1', 'conforme', false)
    expect((await recalculer()).corps.contentPlan.readiness).toBe('besoin_revue')

    // Retest conforme prouvé -> pret : l'échec antérieur reste tracé, ne bloque plus.
    await executerTest(ctx, admin.jeton, clientId, testId, 'noeud-1', 'conforme', true)
    expect((await recalculer()).corps.contentPlan.readiness).toBe('pret')
    const executions = await ctx.executionRepo.listerExecutions(clientId)
    expect(executions.filter((e) => e.verdict === 'non_conforme')).toHaveLength(2)
  })

  test('GET sans rien configuré -> liste vide, jamais 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/content-plans`, {
      jeton: admin.jeton,
    })
    expect(obtenir.status).toBe(200)
    expect(obtenir.corps.contentPlans).toEqual([])
  })

  test('créer sans assetNodeId : readiness calculée serveur -> besoin_information', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/content-plans`, {
      jeton: admin.jeton,
      body: { templateId: 'gabarit-iq', contextSnapshot: '{}' },
    })
    expect(creation.status).toBe(201)
    expect(creation.corps.contentPlan.readiness).toBe('besoin_information')
    expect(creation.corps.contentPlan.statut).toBe('brouillon')
    expect(creation.corps.contentPlan.auditLog).toHaveLength(1)
    expect(creation.corps.contentPlan.auditLog[0]?.actor).toBe('admin@pharmatech.example')
  })

  test('créer avec un assetNodeId sans requirement -> besoin_information', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/content-plans`, {
      jeton: admin.jeton,
      body: { templateId: 'gabarit-iq', assetNodeId: 'noeud-1', contextSnapshot: '{}' },
    })
    expect(creation.status).toBe(201)
    expect(creation.corps.contentPlan.readiness).toBe('besoin_information')
  })

  test('créer avec corps invalide -> corps_invalide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/content-plans`, {
      jeton: admin.jeton,
      body: { contextSnapshot: '{}' },
    })
    expect(creation.status).toBe(400)
    expect(creation.corps.erreur).toBe('corps_invalide')
  })

  test('chaîne complète jusqu’à la preuve -> readiness pret', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    await creerChainePreteDeTest(ctx, admin.jeton, clientId, 'noeud-1')

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/content-plans`, {
      jeton: admin.jeton,
      body: { templateId: 'gabarit-iq', assetNodeId: 'noeud-1', contextSnapshot: '{}' },
    })
    expect(creation.status).toBe(201)
    expect(creation.corps.contentPlan.readiness).toBe('pret')
  })

  test('recalculer readiness : introuvable -> 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const recalcul = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/content-plans/inconnu/recalculer-readiness`,
      { jeton: admin.jeton },
    )
    expect(recalcul.status).toBe(404)
    expect(recalcul.corps.erreur).toBe('introuvable')
  })

  test('recalculer readiness : après ajout de la chaîne complète, repasse à pret', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/content-plans`, {
      jeton: admin.jeton,
      body: { templateId: 'gabarit-iq', assetNodeId: 'noeud-1', contextSnapshot: '{}' },
    })
    expect(creation.corps.contentPlan.readiness).toBe('besoin_information')

    const avantChaine = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/content-plans/${creation.corps.contentPlan.id}/recalculer-readiness`,
      { jeton: admin.jeton },
    )
    expect(avantChaine.corps.raisons).toEqual(['Aucune exigence rattachée à cet actif.'])

    await creerChainePreteDeTest(ctx, admin.jeton, clientId, 'noeud-1')

    const recalcul = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/content-plans/${creation.corps.contentPlan.id}/recalculer-readiness`,
      { jeton: admin.jeton },
    )
    expect(recalcul.status).toBe(200)
    expect(recalcul.corps.contentPlan.readiness).toBe('pret')
    expect(recalcul.corps.raisons).toEqual([])
    expect(recalcul.corps.contentPlan.auditLog).toHaveLength(3)
  })

  test('recalculer readiness sur un plan gelé -> deja_gele', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    await creerChainePreteDeTest(ctx, admin.jeton, clientId, 'noeud-1')

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/content-plans`, {
      jeton: admin.jeton,
      body: { templateId: 'gabarit-iq', assetNodeId: 'noeud-1', contextSnapshot: '{}' },
    })
    const id = creation.corps.contentPlan.id
    await requete(ctx, 'PATCH', `/clients/${clientId}/content-plans/${id}/valider`, {
      jeton: admin.jeton,
    })
    await requete(ctx, 'PATCH', `/clients/${clientId}/content-plans/${id}/geler`, {
      jeton: admin.jeton,
    })

    const recalcul = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/content-plans/${id}/recalculer-readiness`,
      { jeton: admin.jeton },
    )
    expect(recalcul.status).toBe(400)
    expect(recalcul.corps.erreur).toBe('deja_gele')
  })

  test('valider : introuvable -> 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const validation = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/content-plans/inconnu/valider`,
      { jeton: admin.jeton },
    )
    expect(validation.status).toBe(404)
    expect(validation.corps.erreur).toBe('introuvable')
  })

  test('valider un brouillon -> statut valide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/content-plans`, {
      jeton: admin.jeton,
      body: { templateId: 'gabarit-iq', contextSnapshot: '{}' },
    })
    const validation = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/content-plans/${creation.corps.contentPlan.id}/valider`,
      { jeton: admin.jeton },
    )
    expect(validation.status).toBe(200)
    expect(validation.corps.contentPlan.statut).toBe('valide')
    expect(validation.corps.contentPlan.auditLog).toHaveLength(2)
  })

  test('valider un plan déjà gelé -> deja_gele', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    await creerChainePreteDeTest(ctx, admin.jeton, clientId, 'noeud-1')

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/content-plans`, {
      jeton: admin.jeton,
      body: { templateId: 'gabarit-iq', assetNodeId: 'noeud-1', contextSnapshot: '{}' },
    })
    const id = creation.corps.contentPlan.id
    await requete(ctx, 'PATCH', `/clients/${clientId}/content-plans/${id}/valider`, {
      jeton: admin.jeton,
    })
    await requete(ctx, 'PATCH', `/clients/${clientId}/content-plans/${id}/geler`, {
      jeton: admin.jeton,
    })

    const revalidation = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/content-plans/${id}/valider`,
      { jeton: admin.jeton },
    )
    expect(revalidation.status).toBe(400)
    expect(revalidation.corps.erreur).toBe('deja_gele')
  })

  test('geler : introuvable -> 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const gel = await requete(ctx, 'PATCH', `/clients/${clientId}/content-plans/inconnu/geler`, {
      jeton: admin.jeton,
    })
    expect(gel.status).toBe(404)
    expect(gel.corps.erreur).toBe('introuvable')
  })

  test('geler un brouillon non validé -> non_valide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    await creerChainePreteDeTest(ctx, admin.jeton, clientId, 'noeud-1')

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/content-plans`, {
      jeton: admin.jeton,
      body: { templateId: 'gabarit-iq', assetNodeId: 'noeud-1', contextSnapshot: '{}' },
    })

    const gel = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/content-plans/${creation.corps.contentPlan.id}/geler`,
      { jeton: admin.jeton },
    )
    expect(gel.status).toBe(400)
    expect(gel.corps.erreur).toBe('non_valide')
  })

  test('geler un plan validé mais dont la readiness n’est plus pret -> donnees_non_pretes (jamais fait confiance à la valeur stockée)', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    // aucun requirement pour ce nœud -> readiness restera besoin_information
    const creation = await requete(ctx, 'POST', `/clients/${clientId}/content-plans`, {
      jeton: admin.jeton,
      body: { templateId: 'gabarit-iq', assetNodeId: 'noeud-vide', contextSnapshot: '{}' },
    })
    const id = creation.corps.contentPlan.id
    await requete(ctx, 'PATCH', `/clients/${clientId}/content-plans/${id}/valider`, {
      jeton: admin.jeton,
    })

    const gel = await requete(ctx, 'PATCH', `/clients/${clientId}/content-plans/${id}/geler`, {
      jeton: admin.jeton,
    })
    expect(gel.status).toBe(400)
    expect(gel.corps.erreur).toBe('donnees_non_pretes')
  })

  test('geler un plan validé et prêt -> statut gele', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    await creerChainePreteDeTest(ctx, admin.jeton, clientId, 'noeud-1')

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/content-plans`, {
      jeton: admin.jeton,
      body: { templateId: 'gabarit-iq', assetNodeId: 'noeud-1', contextSnapshot: '{}' },
    })
    const id = creation.corps.contentPlan.id
    await requete(ctx, 'PATCH', `/clients/${clientId}/content-plans/${id}/valider`, {
      jeton: admin.jeton,
    })

    const gel = await requete(ctx, 'PATCH', `/clients/${clientId}/content-plans/${id}/geler`, {
      jeton: admin.jeton,
    })
    expect(gel.status).toBe(200)
    expect(gel.corps.contentPlan.statut).toBe('gele')
    expect(gel.corps.contentPlan.readiness).toBe('pret')
  })

  test('geler un plan déjà gelé -> deja_gele', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    await creerChainePreteDeTest(ctx, admin.jeton, clientId, 'noeud-1')

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/content-plans`, {
      jeton: admin.jeton,
      body: { templateId: 'gabarit-iq', assetNodeId: 'noeud-1', contextSnapshot: '{}' },
    })
    const id = creation.corps.contentPlan.id
    await requete(ctx, 'PATCH', `/clients/${clientId}/content-plans/${id}/valider`, {
      jeton: admin.jeton,
    })
    await requete(ctx, 'PATCH', `/clients/${clientId}/content-plans/${id}/geler`, {
      jeton: admin.jeton,
    })

    const regel = await requete(ctx, 'PATCH', `/clients/${clientId}/content-plans/${id}/geler`, {
      jeton: admin.jeton,
    })
    expect(regel.status).toBe(400)
    expect(regel.corps.erreur).toBe('deja_gele')
  })

  test('migration locale : idempotente, id existant ignoré', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const planLocal: ContentPlanJson = {
      id: 'plan-local-1',
      clientId,
      templateId: 'gabarit-iq',
      assetNodeId: null,
      processId: null,
      methodProfileId: null,
      methodProfileType: null,
      contextSnapshot: '{}',
      readiness: 'besoin_information',
      statut: 'brouillon',
      auditLog: [{ timestamp: '2024-01-01T00:00:00.000Z', actor: 'local', action: 'création' }],
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    }
    const migration = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/content-plans/migration-locale`,
      { jeton: admin.jeton, body: { contentPlans: [planLocal] } },
    )
    expect(migration.status).toBe(200)

    const rejouee = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/content-plans/migration-locale`,
      {
        jeton: admin.jeton,
        body: { contentPlans: [{ ...planLocal, templateId: 'tentative-ecrasement' }] },
      },
    )
    expect(rejouee.status).toBe(200)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/content-plans`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.contentPlans).toHaveLength(1)
    expect(liste.corps.contentPlans[0]?.templateId).toBe('gabarit-iq')
  })

  test('non authentifié -> 401', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/content-plans`)
    expect(obtenir.status).toBe(401)
  })
})

describe('routerRequete — Integration (Target Architecture, domaine "Integration", Phase 7c du chantier de migration D1)', () => {
  async function creerClientDeTest(ctx: Contexte, jeton: string): Promise<string> {
    const creation = await requete(ctx, 'POST', '/clients', { jeton, body: { name: 'Ferring' } })
    return creation.corps.client.id
  }

  async function creerConnectorDeTest(
    ctx: Contexte,
    jeton: string,
    clientId: string,
  ): Promise<string> {
    const creation = await requete(ctx, 'POST', `/clients/${clientId}/connectors`, {
      jeton,
      body: {
        nom: 'Veeva Vault production',
        type: 'veeva_vault',
        config: { vaultDns: 'client.veevavault.com', nomUtilisateur: 'u', motDePasse: 'p' },
      },
    })
    return creation.corps.connector.id
  }

  test('GET sans rien configuré -> listes vides, jamais 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/integration`, {
      jeton: admin.jeton,
    })
    expect(obtenir.status).toBe(200)
    expect(obtenir.corps.connectors).toEqual([])
    expect(obtenir.corps.syncJobs).toEqual([])
    expect(obtenir.corps.externalReferences).toEqual([])
  })

  test('créer un connecteur : id/actif/createdAt dérivés côté serveur, config sérialisée', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/connectors`, {
      jeton: admin.jeton,
      body: {
        nom: 'Dossier réseau usine',
        type: 'dossier_reseau',
        config: { chemin: '\\\\serveur\\qualite' },
      },
    })
    expect(creation.status).toBe(201)
    expect(creation.corps.connector.actif).toBe(true)
    expect(creation.corps.connector.type).toBe('dossier_reseau')
    expect(JSON.parse(creation.corps.connector.config)).toEqual({ chemin: '\\\\serveur\\qualite' })
    expect(creation.corps.connector.createdAt).toEqual(expect.any(String))
  })

  test('créer un connecteur avec actif explicite -> respecté', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/connectors`, {
      jeton: admin.jeton,
      body: {
        nom: 'EDMS interne',
        actif: false,
        type: 'edms_generique',
        config: { url: 'https://edms.local', jeton: 't' },
      },
    })
    expect(creation.corps.connector.actif).toBe(false)
  })

  test('créer un connecteur avec corps invalide -> corps_invalide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/connectors`, {
      jeton: admin.jeton,
      body: { nom: 'X' },
    })
    expect(creation.status).toBe(400)
    expect(creation.corps.erreur).toBe('corps_invalide')
  })

  test('désactiver un connecteur : introuvable -> 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const desactivation = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/connectors/inconnu/desactiver`,
      { jeton: admin.jeton },
    )
    expect(desactivation.status).toBe(404)
    expect(desactivation.corps.erreur).toBe('introuvable')
  })

  test('désactiver un connecteur rend inactif sans le supprimer', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const connectorId = await creerConnectorDeTest(ctx, admin.jeton, clientId)

    const desactivation = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/connectors/${connectorId}/desactiver`,
      { jeton: admin.jeton },
    )
    expect(desactivation.status).toBe(200)
    expect(desactivation.corps.connector.actif).toBe(false)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/integration`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.connectors).toHaveLength(1)
  })

  test('basculer actif : inverse actif -> inactif -> actif', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const connectorId = await creerConnectorDeTest(ctx, admin.jeton, clientId)

    const premiereBascule = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/connectors/${connectorId}/basculer-actif`,
      { jeton: admin.jeton },
    )
    expect(premiereBascule.corps.connector.actif).toBe(false)

    const secondeBascule = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/connectors/${connectorId}/basculer-actif`,
      { jeton: admin.jeton },
    )
    expect(secondeBascule.corps.connector.actif).toBe(true)
  })

  test('supprimer un connecteur : introuvable -> 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const suppression = await requete(ctx, 'DELETE', `/clients/${clientId}/connectors/inconnu`, {
      jeton: admin.jeton,
    })
    expect(suppression.status).toBe(404)
    expect(suppression.corps.erreur).toBe('introuvable')
  })

  test('supprimer un connecteur : vraie suppression physique', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const connectorId = await creerConnectorDeTest(ctx, admin.jeton, clientId)

    const suppression = await requete(
      ctx,
      'DELETE',
      `/clients/${clientId}/connectors/${connectorId}`,
      { jeton: admin.jeton },
    )
    expect(suppression.status).toBe(200)
    expect(suppression.corps.ok).toBe(true)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/integration`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.connectors).toEqual([])
  })

  test('démarrer un SyncJob sur un connecteur inconnu -> connector_introuvable', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const demarrage = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/connectors/inconnu/sync-jobs`,
      { jeton: admin.jeton },
    )
    expect(demarrage.status).toBe(404)
    expect(demarrage.corps.erreur).toBe('connector_introuvable')
  })

  test('démarrer un SyncJob : statut en_attente, tentative 1', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const connectorId = await creerConnectorDeTest(ctx, admin.jeton, clientId)

    const demarrage = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/connectors/${connectorId}/sync-jobs`,
      { jeton: admin.jeton },
    )
    expect(demarrage.status).toBe(201)
    expect(demarrage.corps.syncJob.statut).toBe('en_attente')
    expect(demarrage.corps.syncJob.tentative).toBe(1)
  })

  test('garde-fou non-bloquant : indisponible -> nouvelle_tentative -> echec ne bloque jamais declarerReference', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const connectorId = await creerConnectorDeTest(ctx, admin.jeton, clientId)
    const demarrage = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/connectors/${connectorId}/sync-jobs`,
      { jeton: admin.jeton },
    )
    const syncJobId = demarrage.corps.syncJob.id

    await requete(ctx, 'PATCH', `/clients/${clientId}/sync-jobs/${syncJobId}/indisponible`, {
      jeton: admin.jeton,
    })
    await requete(ctx, 'PATCH', `/clients/${clientId}/sync-jobs/${syncJobId}/nouvelle-tentative`, {
      jeton: admin.jeton,
    })
    const echec = await requete(ctx, 'PATCH', `/clients/${clientId}/sync-jobs/${syncJobId}/echec`, {
      jeton: admin.jeton,
      body: { erreur: 'Timeout réseau' },
    })
    expect(echec.corps.syncJob.statut).toBe('echec')
    expect(echec.corps.syncJob.derniereErreur).toBe('Timeout réseau')
    expect(echec.corps.syncJob.tentative).toBe(2)

    const reference = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/connectors/${connectorId}/references`,
      {
        jeton: admin.jeton,
        body: { identifiantExterne: 'doc-1', libelle: 'Document indépendant' },
      },
    )
    expect(reference.status).toBe(201)
  })

  test('marquer échec sans erreur fournie -> corps_invalide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const connectorId = await creerConnectorDeTest(ctx, admin.jeton, clientId)
    const demarrage = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/connectors/${connectorId}/sync-jobs`,
      { jeton: admin.jeton },
    )

    const echec = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/sync-jobs/${demarrage.corps.syncJob.id}/echec`,
      { jeton: admin.jeton, body: {} },
    )
    expect(echec.status).toBe(400)
    expect(echec.corps.erreur).toBe('corps_invalide')
  })

  test('marquer réussi met à jour le statut sans toucher aux tentatives précédentes', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const connectorId = await creerConnectorDeTest(ctx, admin.jeton, clientId)
    const demarrage = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/connectors/${connectorId}/sync-jobs`,
      { jeton: admin.jeton },
    )
    const syncJobId = demarrage.corps.syncJob.id

    await requete(ctx, 'PATCH', `/clients/${clientId}/sync-jobs/${syncJobId}/nouvelle-tentative`, {
      jeton: admin.jeton,
    })
    const reussi = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/sync-jobs/${syncJobId}/reussi`,
      {
        jeton: admin.jeton,
      },
    )
    expect(reussi.corps.syncJob.statut).toBe('reussi')
    expect(reussi.corps.syncJob.tentative).toBe(2)
    expect(reussi.corps.syncJob.derniereErreur).toBeNull()
  })

  test('changer le statut d’un SyncJob introuvable -> 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const reussi = await requete(ctx, 'PATCH', `/clients/${clientId}/sync-jobs/inconnu/reussi`, {
      jeton: admin.jeton,
    })
    expect(reussi.status).toBe(404)
    expect(reussi.corps.erreur).toBe('introuvable')
  })

  test('déclarer une référence externe : pointeur, jamais le contenu dupliqué', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const connectorId = await creerConnectorDeTest(ctx, admin.jeton, clientId)

    const reference = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/connectors/${connectorId}/references`,
      {
        jeton: admin.jeton,
        body: { identifiantExterne: 'doc-42', libelle: 'Protocole IQ SCADA-305' },
      },
    )
    expect(reference.status).toBe(201)
    expect(reference.corps.externalReference.connectorId).toBe(connectorId)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/integration`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.externalReferences.map((r) => r.id)).toContain(
      reference.corps.externalReference.id,
    )
  })

  test('déclarer une référence avec corps invalide -> corps_invalide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const connectorId = await creerConnectorDeTest(ctx, admin.jeton, clientId)

    const reference = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/connectors/${connectorId}/references`,
      { jeton: admin.jeton, body: { identifiantExterne: 'doc-1' } },
    )
    expect(reference.status).toBe(400)
    expect(reference.corps.erreur).toBe('corps_invalide')
  })

  test('migration locale : idempotente, id existant ignoré', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const connectorLocal: ConnectorJson = {
      id: 'connector-local-1',
      clientId,
      nom: 'Ancien nom',
      actif: true,
      type: 'dossier_reseau',
      config: JSON.stringify({ chemin: '\\\\serveur\\qualite' }),
      createdAt: '2024-01-01T00:00:00.000Z',
    }
    const migration = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/integration/migration-locale`,
      {
        jeton: admin.jeton,
        body: { connectors: [connectorLocal], syncJobs: [], externalReferences: [] },
      },
    )
    expect(migration.status).toBe(200)

    const rejouee = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/integration/migration-locale`,
      {
        jeton: admin.jeton,
        body: {
          connectors: [{ ...connectorLocal, nom: 'Tentative d’écrasement' }],
          syncJobs: [],
          externalReferences: [],
        },
      },
    )
    expect(rejouee.status).toBe(200)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/integration`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.connectors).toHaveLength(1)
    expect(liste.corps.connectors[0]?.nom).toBe('Ancien nom')
  })

  test('migration locale avec corps invalide -> corps_invalide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const migration = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/integration/migration-locale`,
      { jeton: admin.jeton, body: { connectors: [] } },
    )
    expect(migration.status).toBe(400)
    expect(migration.corps.erreur).toBe('corps_invalide')
  })

  test('non authentifié -> 401', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/integration`)
    expect(obtenir.status).toBe(401)
  })
})

describe('routerRequete — Mission/Activity (Target Architecture, domaine "Work", Phase 8a du chantier de migration D1)', () => {
  async function creerClientDeTest(ctx: Contexte, jeton: string): Promise<string> {
    const creation = await requete(ctx, 'POST', '/clients', { jeton, body: { name: 'Ferring' } })
    return creation.corps.client.id
  }

  async function creerMissionDeTest(
    ctx: Contexte,
    jeton: string,
    clientId: string,
  ): Promise<string> {
    const creation = await requete(ctx, 'POST', `/clients/${clientId}/missions`, {
      jeton,
      body: { titre: 'Qualification ligne 3', description: 'IQ/OQ/PQ ligne de remplissage' },
    })
    return creation.corps.mission.id
  }

  test('GET sans rien configuré -> listes vides, jamais 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/missions`, {
      jeton: admin.jeton,
    })
    expect(obtenir.status).toBe(200)
    expect(obtenir.corps.missions).toEqual([])
    expect(obtenir.corps.activities).toEqual([])
    expect(obtenir.corps.dependencies).toEqual([])
    expect(obtenir.corps.associationsQualityEvent).toEqual([])
  })

  test('créer une mission : id/statut/auditLog dérivés côté serveur', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/missions`, {
      jeton: admin.jeton,
      body: { titre: 'Qualification ligne 3', description: 'IQ/OQ/PQ ligne de remplissage' },
    })
    expect(creation.status).toBe(201)
    expect(creation.corps.mission.statut).toBe('ouverte')
    expect(creation.corps.mission.auditLog).toHaveLength(1)
    expect(creation.corps.mission.auditLog[0]?.actor).toBe('admin@pharmatech.example')
    expect(creation.corps.mission.createdAt).toEqual(expect.any(String))
  })

  test('créer une mission avec corps invalide -> corps_invalide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/missions`, {
      jeton: admin.jeton,
      body: { titre: 'X' },
    })
    expect(creation.status).toBe(400)
    expect(creation.corps.erreur).toBe('corps_invalide')
  })

  test('changer le statut d’une mission introuvable -> 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const changement = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/missions/inconnue/statut`,
      { jeton: admin.jeton, body: { statut: 'en_cours' } },
    )
    expect(changement.status).toBe(404)
    expect(changement.corps.erreur).toBe('introuvable')
  })

  test('changer le statut d’une mission : audit_log cumulé', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const missionId = await creerMissionDeTest(ctx, admin.jeton, clientId)

    const changement = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/missions/${missionId}/statut`,
      { jeton: admin.jeton, body: { statut: 'en_cours' } },
    )
    expect(changement.status).toBe(200)
    expect(changement.corps.mission.statut).toBe('en_cours')
    expect(changement.corps.mission.auditLog).toHaveLength(2)
  })

  test('associer un QualityEvent à une mission : idempotent', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const missionId = await creerMissionDeTest(ctx, admin.jeton, clientId)
    const evenement = await requete(ctx, 'POST', `/clients/${clientId}/quality-events/evenements`, {
      jeton: admin.jeton,
      body: {
        type: 'change_control',
        titre: 'CC-1',
        description: '',
        origine: 'interne',
        referenceExterne: null,
        assetNodeId: null,
        processId: null,
        manufacturingContextId: null,
      },
    })
    const qualityEventId = evenement.corps.evenement.id

    const inexistant = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/missions/${missionId}/quality-events`,
      { jeton: admin.jeton, body: { qualityEventId: 'qe-inexistant' } },
    )
    expect(inexistant.status).toBe(404)

    const premiere = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/missions/${missionId}/quality-events`,
      { jeton: admin.jeton, body: { qualityEventId } },
    )
    expect(premiere.status).toBe(201)

    const seconde = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/missions/${missionId}/quality-events`,
      { jeton: admin.jeton, body: { qualityEventId } },
    )
    expect(seconde.status).toBe(200)
    expect(seconde.corps.association.id).toBe(premiere.corps.association.id)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/missions`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.associationsQualityEvent).toHaveLength(1)
  })

  test('créer une activité : id/statut/auditLog dérivés côté serveur', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const missionId = await creerMissionDeTest(ctx, admin.jeton, clientId)

    const creation = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/missions/${missionId}/activities`,
      {
        jeton: admin.jeton,
        body: { titre: 'IQ pompe doseuse', description: 'Vérification installation' },
      },
    )
    expect(creation.status).toBe(201)
    expect(creation.corps.activity.missionId).toBe(missionId)
    expect(creation.corps.activity.statut).toBe('a_faire')
    expect(creation.corps.activity.auditLog).toHaveLength(1)
  })

  test('créer une activité avec corps invalide -> corps_invalide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const missionId = await creerMissionDeTest(ctx, admin.jeton, clientId)

    const creation = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/missions/${missionId}/activities`,
      {
        jeton: admin.jeton,
        body: { titre: 'X' },
      },
    )
    expect(creation.status).toBe(400)
    expect(creation.corps.erreur).toBe('corps_invalide')
  })

  test('changer le statut d’une activité introuvable -> 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const changement = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/activities/inconnue/statut`,
      { jeton: admin.jeton, body: { statut: 'terminee' } },
    )
    expect(changement.status).toBe(404)
    expect(changement.corps.erreur).toBe('introuvable')
  })

  test('changer le statut d’une activité : audit_log cumulé', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const missionId = await creerMissionDeTest(ctx, admin.jeton, clientId)
    const creation = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/missions/${missionId}/activities`,
      {
        jeton: admin.jeton,
        body: { titre: 'IQ pompe doseuse', description: 'Vérification installation' },
      },
    )
    const activityId = creation.corps.activity.id

    const changement = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/activities/${activityId}/statut`,
      { jeton: admin.jeton, body: { statut: 'terminee' } },
    )
    expect(changement.status).toBe(200)
    expect(changement.corps.activity.statut).toBe('terminee')
    expect(changement.corps.activity.auditLog).toHaveLength(2)
  })

  test('ajouter une dépendance entre deux activités : idempotente', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const missionId = await creerMissionDeTest(ctx, admin.jeton, clientId)
    const source = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/missions/${missionId}/activities`,
      {
        jeton: admin.jeton,
        body: { titre: 'IQ', description: 'Installation' },
      },
    )
    const cible = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/missions/${missionId}/activities`,
      {
        jeton: admin.jeton,
        body: { titre: 'OQ', description: 'Opérationnel' },
      },
    )

    const premiere = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/activities/${source.corps.activity.id}/dependances`,
      { jeton: admin.jeton, body: { activityCibleId: cible.corps.activity.id } },
    )
    expect(premiere.status).toBe(201)

    const seconde = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/activities/${source.corps.activity.id}/dependances`,
      { jeton: admin.jeton, body: { activityCibleId: cible.corps.activity.id } },
    )
    expect(seconde.status).toBe(200)
    expect(seconde.corps.dependency.id).toBe(premiere.corps.dependency.id)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/missions`, { jeton: admin.jeton })
    expect(liste.corps.dependencies).toHaveLength(1)

    const autoDependance = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/activities/${source.corps.activity.id}/dependances`,
      { jeton: admin.jeton, body: { activityCibleId: source.corps.activity.id } },
    )
    expect(autoDependance.status).toBe(400)

    const cibleInexistante = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/activities/${source.corps.activity.id}/dependances`,
      { jeton: admin.jeton, body: { activityCibleId: 'activite-inexistante' } },
    )
    expect(cibleInexistante.status).toBe(404)
  })

  test('activité sur mission inexistante, statuts hors domaine -> refusés', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const missionId = await creerMissionDeTest(ctx, admin.jeton, clientId)

    const orpheline = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/missions/mission-inexistante/activities`,
      { jeton: admin.jeton, body: { titre: 'x', description: '' } },
    )
    expect(orpheline.status).toBe(404)

    const statutMission = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/missions/${missionId}/statut`,
      { jeton: admin.jeton, body: { statut: 'archivee' } },
    )
    expect(statutMission.status).toBe(400)

    const activite = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/missions/${missionId}/activities`,
      {
        jeton: admin.jeton,
        body: { titre: 'Revue', description: '' },
      },
    )
    const statutActivite = await requete(
      ctx,
      'PATCH',
      `/clients/${clientId}/activities/${activite.corps.activity.id}/statut`,
      { jeton: admin.jeton, body: { statut: 'annulee' } },
    )
    expect(statutActivite.status).toBe(400)
  })

  test('migration locale : idempotente, id existant ignoré', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const missionLocale: MissionJson = {
      id: 'mission-locale-1',
      clientId,
      workspaceId: null,
      assetNodeId: null,
      titre: 'Ancien titre',
      description: 'Ancienne description',
      statut: 'ouverte',
      auditLog: [
        { timestamp: '2024-01-01T00:00:00.000Z', actor: 'ancien@local', action: 'création' },
      ],
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    }
    const migration = await requete(ctx, 'POST', `/clients/${clientId}/missions/migration-locale`, {
      jeton: admin.jeton,
      body: {
        missions: [missionLocale],
        activities: [],
        dependencies: [],
        associationsQualityEvent: [],
      },
    })
    expect(migration.status).toBe(200)

    const rejouee = await requete(ctx, 'POST', `/clients/${clientId}/missions/migration-locale`, {
      jeton: admin.jeton,
      body: {
        missions: [{ ...missionLocale, titre: 'Tentative d’écrasement' }],
        activities: [],
        dependencies: [],
        associationsQualityEvent: [],
      },
    })
    expect(rejouee.status).toBe(200)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/missions`, { jeton: admin.jeton })
    expect(liste.corps.missions).toHaveLength(1)
    expect(liste.corps.missions[0]?.titre).toBe('Ancien titre')
  })

  test('migration locale avec corps invalide -> corps_invalide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const migration = await requete(ctx, 'POST', `/clients/${clientId}/missions/migration-locale`, {
      jeton: admin.jeton,
      body: { missions: [] },
    })
    expect(migration.status).toBe(400)
    expect(migration.corps.erreur).toBe('corps_invalide')
  })

  test('non authentifié -> 401', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/missions`)
    expect(obtenir.status).toBe(401)
  })
})

describe('routerRequete — ContextSnapshot (Target Architecture, domaine "Context Engine", Phase 8b du chantier de migration D1)', () => {
  async function creerClientDeTest(ctx: Contexte, jeton: string): Promise<string> {
    const creation = await requete(ctx, 'POST', '/clients', { jeton, body: { name: 'Ferring' } })
    return creation.corps.client.id
  }

  async function creerNoeudDeTest(
    ctx: Contexte,
    clientId: string,
    id: string,
    workspaceId: string | null,
  ): Promise<void> {
    await ctx.structureSystemeRepo.creerNoeud({
      id,
      clientId,
      workspaceId,
      levelKey: 'ligne',
      name: 'Granulateur GR-01',
      code: 'GR-01',
      parentId: null,
      associatedNodes: [],
      source: 'manuel',
      qmsConnectorId: null,
      periodicQualification: { applicable: false, deadline: null },
      qualificationStatus: 'qualifie',
      auditLog: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
  }

  test('GET sans rien configuré -> listes vides, jamais 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/context-snapshots`, {
      jeton: admin.jeton,
    })
    expect(obtenir.status).toBe(200)
    expect(obtenir.corps.contextSnapshots).toEqual([])
    expect(obtenir.corps.contextSnapshotItems).toEqual([])
  })

  test('assembler sans workspaceId ni assetNodeId -> snapshot vide, jamais une erreur', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/context-snapshots`, {
      jeton: admin.jeton,
      body: {},
    })
    expect(creation.status).toBe(201)
    expect(creation.corps.contextSnapshot.workspaceId).toBeNull()
    expect(creation.corps.contextSnapshot.assetNodeId).toBeNull()
    expect(creation.corps.contextSnapshotItems).toEqual([])
  })

  test('assembler avec assetNodeId : résolution exacte, manufacturing_context et quality_event rattachés inclus', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    await creerNoeudDeTest(ctx, clientId, 'noeud-1', null)
    await ctx.processContextRepo.creerProcess({
      id: 'process-1',
      clientId,
      nom: 'Granulation',
      description: '',
      type: 'production',
      sourceId: null,
      auditLog: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    await ctx.processContextRepo.creerManufacturingContext({
      id: 'mc-1',
      clientId,
      assetNodeId: 'noeud-1',
      processId: 'process-1',
      produit: 'Comprimé X',
      recette: null,
      format: null,
      configuration: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    await ctx.qualityEventRepo.creerEvenement({
      id: 'qe-1',
      clientId,
      type: 'deviation',
      titre: 'Déviation débit',
      description: '',
      origine: 'interne',
      referenceExterne: null,
      assetNodeId: 'noeud-1',
      processId: null,
      manufacturingContextId: null,
      statut: 'ouvert',
      auditLog: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    // QualityEvent sur un autre nœud, jamais inclus.
    await creerNoeudDeTest(ctx, clientId, 'noeud-2', null)
    await ctx.qualityEventRepo.creerEvenement({
      id: 'qe-2',
      clientId,
      type: 'deviation',
      titre: 'Déviation sans lien',
      description: '',
      origine: 'interne',
      referenceExterne: null,
      assetNodeId: 'noeud-2',
      processId: null,
      manufacturingContextId: null,
      statut: 'ouvert',
      auditLog: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/context-snapshots`, {
      jeton: admin.jeton,
      body: { assetNodeId: 'noeud-1' },
    })
    expect(creation.status).toBe(201)
    const types = creation.corps.contextSnapshotItems.map((i) => `${i.typeObjet}:${i.objetId}`)
    expect(types).toContain('asset_node:noeud-1')
    expect(types).toContain('manufacturing_context:mc-1')
    expect(types).toContain('quality_event:qe-1')
    expect(types).not.toContain('quality_event:qe-2')
  })

  test('assembler avec workspaceId : nœuds visibles par héritage (non assignés inclus)', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const migration = await requete(ctx, 'POST', `/clients/${clientId}/organisation/migrer`, {
      jeton: admin.jeton,
    })
    const workspaceRacineId = migration.corps.workspaceRacine.id
    await creerNoeudDeTest(ctx, clientId, 'noeud-non-assigne', null)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/context-snapshots`, {
      jeton: admin.jeton,
      body: { workspaceId: workspaceRacineId },
    })
    expect(creation.status).toBe(201)
    expect(
      creation.corps.contextSnapshotItems.some(
        (i) => i.typeObjet === 'asset_node' && i.objetId === 'noeud-non-assigne',
      ),
    ).toBe(true)
  })

  test('migration locale : idempotente, id existant ignoré', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const snapshotLocal: ContextSnapshotJson = {
      id: 'snapshot-local-1',
      clientId,
      workspaceId: null,
      assetNodeId: 'noeud-1',
      createdAt: '2024-01-01T00:00:00.000Z',
    }
    const itemLocal: ContextSnapshotItemJson = {
      id: 'item-local-1',
      clientId,
      contextSnapshotId: 'snapshot-local-1',
      typeObjet: 'asset_node',
      objetId: 'noeud-1',
    }
    const migration = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/context-snapshots/migration-locale`,
      {
        jeton: admin.jeton,
        body: { contextSnapshots: [snapshotLocal], contextSnapshotItems: [itemLocal] },
      },
    )
    expect(migration.status).toBe(200)

    const rejouee = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/context-snapshots/migration-locale`,
      {
        jeton: admin.jeton,
        body: { contextSnapshots: [snapshotLocal], contextSnapshotItems: [itemLocal] },
      },
    )
    expect(rejouee.status).toBe(200)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/context-snapshots`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.contextSnapshots).toHaveLength(1)
    expect(liste.corps.contextSnapshotItems).toHaveLength(1)
  })

  test('migration locale avec corps invalide -> corps_invalide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const migration = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/context-snapshots/migration-locale`,
      { jeton: admin.jeton, body: { contextSnapshots: [] } },
    )
    expect(migration.status).toBe(400)
    expect(migration.corps.erreur).toBe('corps_invalide')
  })

  test('non authentifié -> 401', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/context-snapshots`)
    expect(obtenir.status).toBe(401)
  })
})

describe('routerRequete — Reasoning Engine (Target Architecture, domaine "Reasoning Engine", Phase 8c du chantier de migration D1)', () => {
  async function creerClientDeTest(ctx: Contexte, jeton: string): Promise<string> {
    const creation = await requete(ctx, 'POST', '/clients', { jeton, body: { name: 'Ferring' } })
    return creation.corps.client.id
  }

  test('GET sans rien configuré -> listes vides, jamais 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/reasoning-engine`, {
      jeton: admin.jeton,
    })
    expect(obtenir.status).toBe(200)
    expect(obtenir.corps.configurations).toEqual([])
    expect(obtenir.corps.requests).toEqual([])
    expect(obtenir.corps.responses).toEqual([])
    expect(obtenir.corps.citations).toEqual([])
  })

  test('assurer une configuration : crée puis retourne la même par version (idempotent)', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/reasoning-engine/configurations`,
      {
        jeton: admin.jeton,
        body: {
          version: '1.0.0',
          outilsDisponibles: ['recherche_documents', 'lecture_asset_node'],
        },
      },
    )
    expect(creation.status).toBe(201)
    expect(creation.corps.configuration.version).toBe('1.0.0')
    expect(creation.corps.configuration.outilsDisponibles).toEqual([
      'recherche_documents',
      'lecture_asset_node',
    ])

    const rejouee = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/reasoning-engine/configurations`,
      {
        jeton: admin.jeton,
        body: {
          version: '1.0.0',
          outilsDisponibles: ['recherche_documents', 'lecture_asset_node'],
        },
      },
    )
    expect(rejouee.status).toBe(200)
    expect(rejouee.corps.configuration.id).toBe(creation.corps.configuration.id)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/reasoning-engine`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.configurations).toHaveLength(1)
  })

  test('assurer une configuration avec corps invalide -> corps_invalide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/reasoning-engine/configurations`,
      {
        jeton: admin.jeton,
        body: { version: '1.0.0' },
      },
    )
    expect(creation.status).toBe(400)
    expect(creation.corps.erreur).toBe('corps_invalide')
  })

  test('créer une AIRequest', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const configuration = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/reasoning-engine/configurations`,
      {
        jeton: admin.jeton,
        body: { version: '1.0.0', outilsDisponibles: [] },
      },
    )

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/reasoning-engine/requests`, {
      jeton: admin.jeton,
      body: {
        missionId: null,
        contextSnapshotId: null,
        aiConfigurationId: configuration.corps.configuration.id,
        objectif: 'Évaluer un impact de changement',
      },
    })
    expect(creation.status).toBe(201)
    expect(creation.corps.request.objectif).toBe('Évaluer un impact de changement')
    expect(creation.corps.request.aiConfigurationId).toBe(configuration.corps.configuration.id)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/reasoning-engine`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.requests).toHaveLength(1)
  })

  test('créer une AIRequest avec corps invalide -> corps_invalide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/reasoning-engine/requests`, {
      jeton: admin.jeton,
      body: { objectif: 'Évaluer' },
    })
    expect(creation.status).toBe(400)
    expect(creation.corps.erreur).toBe('corps_invalide')
  })

  test('créer une AIResponse', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const configuration = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/reasoning-engine/configurations`,
      {
        jeton: admin.jeton,
        body: { version: '1.0.0', outilsDisponibles: [] },
      },
    )
    const aiRequest = await requete(ctx, 'POST', `/clients/${clientId}/reasoning-engine/requests`, {
      jeton: admin.jeton,
      body: {
        aiConfigurationId: configuration.corps.configuration.id,
        objectif: 'Évaluer un impact de changement',
      },
    })

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/reasoning-engine/responses`, {
      jeton: admin.jeton,
      body: {
        aiRequestId: aiRequest.corps.request.id,
        texte: 'Voici la réponse.',
        etatConfiance: 'connu',
        traceAppelsOutils: [
          {
            outil: 'recherche_documents',
            parametres: { requete: 'granulation' },
            resultat: 'ok',
            horodatage: '2026-01-01T00:00:00.000Z',
          },
        ],
        versionMoteur: 'moteur-1',
      },
    })
    expect(creation.status).toBe(201)
    expect(creation.corps.response.texte).toBe('Voici la réponse.')
    expect(creation.corps.response.traceAppelsOutils).toHaveLength(1)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/reasoning-engine`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.responses).toHaveLength(1)
  })

  test('créer une AIResponse avec corps invalide -> corps_invalide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/reasoning-engine/responses`, {
      jeton: admin.jeton,
      body: { texte: 'x' },
    })
    expect(creation.status).toBe(400)
    expect(creation.corps.erreur).toBe('corps_invalide')
  })

  test('créer des citations en masse', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const configuration = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/reasoning-engine/configurations`,
      {
        jeton: admin.jeton,
        body: { version: '1.0.0', outilsDisponibles: [] },
      },
    )
    const aiRequest = await requete(ctx, 'POST', `/clients/${clientId}/reasoning-engine/requests`, {
      jeton: admin.jeton,
      body: { aiConfigurationId: configuration.corps.configuration.id, objectif: 'Évaluer' },
    })
    const aiResponse = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/reasoning-engine/responses`,
      {
        jeton: admin.jeton,
        body: {
          aiRequestId: aiRequest.corps.request.id,
          texte: 'Réponse',
          etatConfiance: 'connu',
          traceAppelsOutils: [],
        },
      },
    )

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/reasoning-engine/citations`, {
      jeton: admin.jeton,
      body: {
        citations: [
          {
            aiResponseId: aiResponse.corps.response.id,
            typeObjetCite: 'asset_node',
            objetId: 'noeud-1',
          },
          {
            aiResponseId: aiResponse.corps.response.id,
            typeObjetCite: 'requirement',
            objetId: 'qe-1',
          },
        ],
      },
    })
    expect(creation.status).toBe(201)
    expect(creation.corps.citations).toHaveLength(2)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/reasoning-engine`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.citations).toHaveLength(2)
  })

  test('créer des citations avec une entrée malformée -> corps_invalide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/reasoning-engine/citations`, {
      jeton: admin.jeton,
      body: { citations: [{ aiResponseId: 'r1', typeObjetCite: 'asset_node' }] },
    })
    expect(creation.status).toBe(400)
    expect(creation.corps.erreur).toBe('corps_invalide')
  })

  test('migration locale : idempotente, id existant ignoré', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const configurationLocale: AIConfigurationJson = {
      id: 'config-locale-1',
      clientId,
      version: '1.0.0',
      outilsDisponibles: ['recherche_documents'],
      createdAt: '2024-01-01T00:00:00.000Z',
    }
    const requestLocale: AIRequestJson = {
      id: 'request-locale-1',
      clientId,
      missionId: null,
      contextSnapshotId: null,
      aiConfigurationId: 'config-locale-1',
      objectif: 'Évaluer',
      createdAt: '2024-01-01T00:00:00.000Z',
    }
    const responseLocale: AIResponseJson = {
      id: 'response-locale-1',
      clientId,
      aiRequestId: 'request-locale-1',
      texte: 'Réponse locale',
      etatConfiance: 'infere',
      traceAppelsOutils: [],
      versionMoteur: null,
      createdAt: '2024-01-01T00:00:00.000Z',
    }
    const citationLocale: CitationAIResponseJson = {
      id: 'citation-locale-1',
      clientId,
      aiResponseId: 'response-locale-1',
      typeObjetCite: 'asset_node',
      objetId: 'noeud-1',
    }

    const corps = {
      configurations: [configurationLocale],
      requests: [requestLocale],
      responses: [responseLocale],
      citations: [citationLocale],
    }

    const migration = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/reasoning-engine/migration-locale`,
      { jeton: admin.jeton, body: corps },
    )
    expect(migration.status).toBe(200)

    const rejouee = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/reasoning-engine/migration-locale`,
      { jeton: admin.jeton, body: corps },
    )
    expect(rejouee.status).toBe(200)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/reasoning-engine`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.configurations).toHaveLength(1)
    expect(liste.corps.requests).toHaveLength(1)
    expect(liste.corps.responses).toHaveLength(1)
    expect(liste.corps.citations).toHaveLength(1)
  })

  test('migration locale avec corps invalide -> corps_invalide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const migration = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/reasoning-engine/migration-locale`,
      { jeton: admin.jeton, body: { configurations: [] } },
    )
    expect(migration.status).toBe(400)
    expect(migration.corps.erreur).toBe('corps_invalide')
  })

  test('non authentifié -> 401', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/reasoning-engine`)
    expect(obtenir.status).toBe(401)
  })
})

describe('routerRequete — Procedure/ProcedureStep (cerveau procédural, Phase 9a du chantier de migration D1)', () => {
  async function creerClientDeTest(ctx: Contexte, jeton: string): Promise<string> {
    const creation = await requete(ctx, 'POST', '/clients', { jeton, body: { name: 'Ferring' } })
    return creation.corps.client.id
  }

  test('GET sans rien configuré -> listes vides, jamais 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/procedures`, {
      jeton: admin.jeton,
    })
    expect(obtenir.status).toBe(200)
    expect(obtenir.corps.procedures).toEqual([])
    expect(obtenir.corps.procedureSteps).toEqual([])
  })

  test('créer une Procedure : numeroVersion = 1 pour une première référence', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/procedures`, {
      jeton: admin.jeton,
      body: {
        reference: 'SOP-QA-012',
        titre: 'Impact Assessment',
        effectiveDate: '2026-01-01',
        categorie: 'production',
      },
    })
    expect(creation.status).toBe(201)
    expect(creation.corps.procedure.numeroVersion).toBe(1)
    expect(creation.corps.procedure.reference).toBe('SOP-QA-012')

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/procedures`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.procedures).toHaveLength(1)
  })

  test('créer une deuxième Procedure pour la même référence : numeroVersion incrémenté, jamais une mutation', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const premiere = await requete(ctx, 'POST', `/clients/${clientId}/procedures`, {
      jeton: admin.jeton,
      body: {
        reference: 'SOP-QA-012',
        titre: 'Impact Assessment',
        effectiveDate: '2026-01-01',
        categorie: 'production',
      },
    })
    const seconde = await requete(ctx, 'POST', `/clients/${clientId}/procedures`, {
      jeton: admin.jeton,
      body: {
        reference: 'SOP-QA-012',
        titre: 'Impact Assessment (révision)',
        effectiveDate: '2026-06-01',
        categorie: 'production',
      },
    })
    expect(seconde.corps.procedure.numeroVersion).toBe(2)
    expect(seconde.corps.procedure.id).not.toBe(premiere.corps.procedure.id)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/procedures`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.procedures).toHaveLength(2)
  })

  test('créer une Procedure avec corps invalide -> corps_invalide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/procedures`, {
      jeton: admin.jeton,
      body: { reference: 'SOP-QA-012' },
    })
    expect(creation.status).toBe(400)
    expect(creation.corps.erreur).toBe('corps_invalide')
  })

  test('ajouter une étape : ordre auto-incrémenté', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const procedure = await requete(ctx, 'POST', `/clients/${clientId}/procedures`, {
      jeton: admin.jeton,
      body: {
        reference: 'SOP-QA-012',
        titre: 'Impact Assessment',
        effectiveDate: '2026-01-01',
        categorie: 'production',
      },
    })
    const procedureId = procedure.corps.procedure.id

    const premiere = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/procedures/${procedureId}/steps`,
      {
        jeton: admin.jeton,
        body: { description: 'Vérifier le contexte', obligatoire: true },
      },
    )
    expect(premiere.status).toBe(201)
    expect(premiere.corps.etape.ordre).toBe(1)

    const seconde = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/procedures/${procedureId}/steps`,
      {
        jeton: admin.jeton,
        body: { description: 'Documenter la décision', obligatoire: false, responsable: 'QA' },
      },
    )
    expect(seconde.corps.etape.ordre).toBe(2)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/procedures`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.procedureSteps).toHaveLength(2)
  })

  test('ajouter une étape à une procédure inexistante -> procedure_introuvable', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/procedures/procedure-inexistante/steps`,
      { jeton: admin.jeton, body: { description: 'x', obligatoire: true } },
    )
    expect(creation.status).toBe(404)
    expect(creation.corps.erreur).toBe('procedure_introuvable')
  })

  test('ajouter une étape avec corps invalide -> corps_invalide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const procedure = await requete(ctx, 'POST', `/clients/${clientId}/procedures`, {
      jeton: admin.jeton,
      body: {
        reference: 'SOP-QA-012',
        titre: 'Impact Assessment',
        effectiveDate: '2026-01-01',
        categorie: 'production',
      },
    })
    const procedureId = procedure.corps.procedure.id

    const creation = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/procedures/${procedureId}/steps`,
      {
        jeton: admin.jeton,
        body: { description: 'x' },
      },
    )
    expect(creation.status).toBe(400)
    expect(creation.corps.erreur).toBe('corps_invalide')
  })

  test('migration locale : idempotente, id existant ignoré', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const procedureLocale: ProcedureJson = {
      id: 'procedure-locale-1',
      clientId,
      reference: 'SOP-QA-012',
      numeroVersion: 1,
      titre: 'Impact Assessment',
      effectiveDate: '2024-01-01',
      categorie: 'production',
      sourceId: null,
      createdAt: '2024-01-01T00:00:00.000Z',
    }
    const etapeLocale: ProcedureStepJson = {
      id: 'etape-locale-1',
      clientId,
      procedureId: 'procedure-locale-1',
      ordre: 1,
      description: 'Vérifier le contexte',
      obligatoire: true,
      condition: null,
      responsable: null,
      createdAt: '2024-01-01T00:00:00.000Z',
    }

    const migration = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/procedures/migration-locale`,
      {
        jeton: admin.jeton,
        body: { procedures: [procedureLocale], procedureSteps: [etapeLocale] },
      },
    )
    expect(migration.status).toBe(200)

    const rejouee = await requete(ctx, 'POST', `/clients/${clientId}/procedures/migration-locale`, {
      jeton: admin.jeton,
      body: { procedures: [procedureLocale], procedureSteps: [etapeLocale] },
    })
    expect(rejouee.status).toBe(200)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/procedures`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.procedures).toHaveLength(1)
    expect(liste.corps.procedureSteps).toHaveLength(1)
  })

  test('migration locale avec corps invalide -> corps_invalide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const migration = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/procedures/migration-locale`,
      {
        jeton: admin.jeton,
        body: { procedures: [] },
      },
    )
    expect(migration.status).toBe(400)
    expect(migration.corps.erreur).toBe('corps_invalide')
  })

  test('non authentifié -> 401', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/procedures`)
    expect(obtenir.status).toBe(401)
  })
})

async function creerGabaritExportClient(
  ctx: Contexte,
  jeton: string,
  clientId: string,
  options: {
    metadata?: Record<string, unknown>
    fichier?: { octets: Uint8Array; nomFichier: string }
    sansFichier?: boolean
  } = {},
): Promise<{ status: number; corps: CorpsReponse }> {
  const formData = new FormData()
  formData.set(
    'metadata',
    JSON.stringify({ nom: 'Gabarit CQV', tagsTrouves: ['redacteurs'], ...options.metadata }),
  )
  if (!options.sansFichier) {
    const octets = options.fichier?.octets ?? new Uint8Array([1, 2, 3, 4])
    const nomFichier = options.fichier?.nomFichier ?? 'gabarit.docx'
    formData.set(
      'fichier',
      new File([octets.buffer as ArrayBuffer], nomFichier, {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    )
  }
  const url = options.metadata?.id
    ? `https://relais.workers.dev/clients/${clientId}/gabarits-export/migration-locale`
    : `https://relais.workers.dev/clients/${clientId}/gabarits-export`
  const reponse = await routerRequete(
    new Request(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jeton}` },
      body: formData,
    }),
    ctx,
  )
  const corps = await reponse.json().catch(() => null)
  return { status: reponse.status, corps }
}

describe("routerRequete — GabaritExportClient (gabarits d'export .docx personnalisés client, §4.3bis, Phase 9b du chantier de migration D1)", () => {
  async function creerClientDeTest(ctx: Contexte, jeton: string): Promise<string> {
    const creation = await requete(ctx, 'POST', '/clients', { jeton, body: { name: 'Ferring' } })
    return creation.corps.client.id
  }

  test('GET sans rien configuré -> liste vide, jamais 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/gabarits-export`, {
      jeton: admin.jeton,
    })
    expect(obtenir.status).toBe(200)
    expect(obtenir.corps.gabarits).toEqual([])
  })

  test('création -> métadonnées enregistrées, contenu relu identique via /contenu', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const octets = new Uint8Array([10, 20, 30, 40, 50])

    const creation = await creerGabaritExportClient(ctx, admin.jeton, clientId, {
      fichier: { octets, nomFichier: 'gabarit-cqv.docx' },
    })
    expect(creation.status).toBe(201)
    expect(creation.corps.gabarit.nom).toBe('Gabarit CQV')
    expect(creation.corps.gabarit.tagsTrouves).toEqual(['redacteurs'])
    expect(creation.corps.gabarit.clientId).toBe(clientId)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/gabarits-export`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.gabarits).toHaveLength(1)

    const reponseContenu = await routerRequete(
      new Request(
        `https://relais.workers.dev/gabarits-export/${creation.corps.gabarit.id}/contenu`,
        { headers: { Authorization: `Bearer ${admin.jeton}` } },
      ),
      ctx,
    )
    expect(reponseContenu.status).toBe(200)
    expect(new Uint8Array(await reponseContenu.arrayBuffer())).toEqual(octets)
  })

  test('un utilisateur sans accès au client ne peut ni lire ni supprimer son gabarit', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const creation = await creerGabaritExportClient(ctx, admin.jeton, clientId)
    const gabaritId = creation.corps.gabarit.id

    await requete(ctx, 'POST', '/admin/utilisateurs', {
      jeton: admin.jeton,
      body: {
        email: 'externe@autre-labo.example',
        motDePasse: 'MotDePasse!1',
        nom: 'N',
        prenom: 'P',
        role: 'utilisateur',
      },
    })
    const login = await requete(ctx, 'POST', '/auth/login', {
      body: { email: 'externe@autre-labo.example', motDePasse: 'MotDePasse!1' },
    })
    const jetonExterne = login.corps.jeton

    const lecture = await routerRequete(
      new Request(`https://relais.workers.dev/gabarits-export/${gabaritId}/contenu`, {
        headers: { Authorization: `Bearer ${jetonExterne}` },
      }),
      ctx,
    )
    expect(lecture.status).toBe(404)

    const suppression = await requete(ctx, 'DELETE', `/gabarits-export/${gabaritId}`, {
      jeton: jetonExterne,
    })
    expect(suppression.status).toBe(404)

    const toujoursLa = await requete(ctx, 'GET', `/clients/${clientId}/gabarits-export`, {
      jeton: admin.jeton,
    })
    expect(toujoursLa.corps.gabarits).toHaveLength(1)
  })

  test('création sans nom -> nom_obligatoire', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await creerGabaritExportClient(ctx, admin.jeton, clientId, {
      metadata: { nom: '' },
    })
    expect(creation.status).toBe(400)
    expect(creation.corps.erreur).toBe('nom_obligatoire')
  })

  test('création sans fichier -> corps_invalide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await creerGabaritExportClient(ctx, admin.jeton, clientId, {
      sansFichier: true,
    })
    expect(creation.status).toBe(400)
    expect(creation.corps.erreur).toBe('corps_invalide')
  })

  test('liste scopée à un client, jamais celle d’un autre', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientA = await creerClientDeTest(ctx, admin.jeton)
    const clientB = await creerClientDeTest(ctx, admin.jeton)
    await creerGabaritExportClient(ctx, admin.jeton, clientA, { metadata: { nom: 'Gabarit A' } })
    await creerGabaritExportClient(ctx, admin.jeton, clientB, { metadata: { nom: 'Gabarit B' } })

    const listeA = await requete(ctx, 'GET', `/clients/${clientA}/gabarits-export`, {
      jeton: admin.jeton,
    })
    expect(listeA.corps.gabarits.map((g) => g.nom)).toEqual(['Gabarit A'])
  })

  test('suppression retire le gabarit de la liste et son contenu', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const { corps } = await creerGabaritExportClient(ctx, admin.jeton, clientId)

    const suppression = await requete(ctx, 'DELETE', `/gabarits-export/${corps.gabarit.id}`, {
      jeton: admin.jeton,
    })
    expect(suppression.status).toBe(200)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/gabarits-export`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.gabarits).toEqual([])

    const reponseContenu = await routerRequete(
      new Request(`https://relais.workers.dev/gabarits-export/${corps.gabarit.id}/contenu`, {
        headers: { Authorization: `Bearer ${admin.jeton}` },
      }),
      ctx,
    )
    expect(reponseContenu.status).toBe(404)
  })

  test('migration locale : idempotente, id existant ignoré', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const migration = await creerGabaritExportClient(ctx, admin.jeton, clientId, {
      metadata: { id: 'gabarit-local-1', nom: 'Gabarit migré' },
    })
    expect(migration.status).toBe(201)

    const rejouee = await creerGabaritExportClient(ctx, admin.jeton, clientId, {
      metadata: { id: 'gabarit-local-1', nom: 'Gabarit migré (ignoré au rejeu)' },
    })
    expect(rejouee.status).toBe(201)
    expect(rejouee.corps.gabarit.nom).toBe('Gabarit migré')

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/gabarits-export`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.gabarits).toHaveLength(1)
  })

  test('non authentifié -> 401', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/gabarits-export`)
    expect(obtenir.status).toBe(401)
  })
})

describe('routerRequete — AiChatSessionLog (journal des sessions du panneau Chat, §4.4, Phase 9c du chantier de migration D1)', () => {
  async function creerClientDeTest(ctx: Contexte, jeton: string): Promise<string> {
    const creation = await requete(ctx, 'POST', '/clients', { jeton, body: { name: 'Ferring' } })
    return creation.corps.client.id
  }

  test('GET sans rien configuré -> liste vide, jamais 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/ai-chat-session-logs`, {
      jeton: admin.jeton,
    })
    expect(obtenir.status).toBe(200)
    expect(obtenir.corps.aiChatSessionLogs).toEqual([])
  })

  test('création -> entrée journalisée, jamais le contenu échangé (le corps ne le porte pas)', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/ai-chat-session-logs`, {
      jeton: admin.jeton,
      body: {
        startedAt: '2026-01-01T00:00:00.000Z',
        endedAt: '2026-01-01T00:05:00.000Z',
        mode: 'chat_normatif',
        aiProvider: 'openai',
        moteurVersion: 'gpt-x',
        documentJoint: false,
      },
    })
    expect(creation.status).toBe(201)
    expect(creation.corps.aiChatSessionLog.clientId).toBe(clientId)
    expect(creation.corps.aiChatSessionLog.mode).toBe('chat_normatif')

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/ai-chat-session-logs`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.aiChatSessionLogs).toHaveLength(1)
  })

  test('création avec corps invalide -> corps_invalide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/ai-chat-session-logs`, {
      jeton: admin.jeton,
      body: { startedAt: '2026-01-01T00:00:00.000Z' },
    })
    expect(creation.status).toBe(400)
    expect(creation.corps.erreur).toBe('corps_invalide')
  })

  test('liste scopée à un client, jamais celle d’un autre', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientA = await creerClientDeTest(ctx, admin.jeton)
    const clientB = await creerClientDeTest(ctx, admin.jeton)
    await requete(ctx, 'POST', `/clients/${clientA}/ai-chat-session-logs`, {
      jeton: admin.jeton,
      body: {
        startedAt: '2026-01-01T00:00:00.000Z',
        mode: 'chat_normatif',
        aiProvider: 'openai',
        documentJoint: false,
      },
    })
    await requete(ctx, 'POST', `/clients/${clientB}/ai-chat-session-logs`, {
      jeton: admin.jeton,
      body: {
        startedAt: '2026-01-01T00:00:00.000Z',
        mode: 'chat_normatif',
        aiProvider: 'openai',
        documentJoint: false,
      },
    })

    const listeA = await requete(ctx, 'GET', `/clients/${clientA}/ai-chat-session-logs`, {
      jeton: admin.jeton,
    })
    expect(listeA.corps.aiChatSessionLogs).toHaveLength(1)
    expect(listeA.corps.aiChatSessionLogs[0]?.clientId).toBe(clientA)
  })

  test('migration locale : idempotente, id existant ignoré', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const entreeLocale: AiChatSessionLogJson = {
      id: 'session-locale-1',
      clientId,
      startedAt: '2024-01-01T00:00:00.000Z',
      endedAt: '2024-01-01T00:05:00.000Z',
      mode: 'chat_normatif',
      aiProvider: 'openai',
      moteurVersion: 'gpt-x',
      documentJoint: false,
    }

    const migration = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/ai-chat-session-logs/migration-locale`,
      { jeton: admin.jeton, body: { aiChatSessionLogs: [entreeLocale] } },
    )
    expect(migration.status).toBe(200)

    const rejouee = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/ai-chat-session-logs/migration-locale`,
      { jeton: admin.jeton, body: { aiChatSessionLogs: [entreeLocale] } },
    )
    expect(rejouee.status).toBe(200)

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/ai-chat-session-logs`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.aiChatSessionLogs).toHaveLength(1)
  })

  test('migration locale avec corps invalide -> corps_invalide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const migration = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/ai-chat-session-logs/migration-locale`,
      { jeton: admin.jeton, body: {} },
    )
    expect(migration.status).toBe(400)
    expect(migration.corps.erreur).toBe('corps_invalide')
  })

  test('non authentifié -> 401', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/ai-chat-session-logs`)
    expect(obtenir.status).toBe(401)
  })
})

describe('routerRequete — ConnexionDrive / EtatMiroirDrive (miroir Drive par client, Phase 9d du chantier de migration D1)', () => {
  async function creerClientDeTest(ctx: Contexte, jeton: string): Promise<string> {
    const creation = await requete(ctx, 'POST', '/clients', { jeton, body: { name: 'Ferring' } })
    return creation.corps.client.id
  }

  test('GET sans rien configuré -> connexionDrive null, jamais 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/connexion-drive`, {
      jeton: admin.jeton,
    })
    expect(obtenir.status).toBe(200)
    expect(obtenir.corps.connexionDrive).toBeNull()
  })

  test('PUT enregistre la configuration, isolée par client', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientA = await creerClientDeTest(ctx, admin.jeton)
    const clientB = await creerClientDeTest(ctx, admin.jeton)

    const enregistrement = await requete(ctx, 'PUT', `/clients/${clientA}/connexion-drive`, {
      jeton: admin.jeton,
      body: { dossierId: 'dossier-a', jeton: 'jeton-a' },
    })
    expect(enregistrement.status).toBe(200)
    expect(enregistrement.corps.connexionDrive).toEqual({
      clientId: clientA,
      dossierId: 'dossier-a',
      jeton: 'jeton-a',
    })

    const obtenirA = await requete(ctx, 'GET', `/clients/${clientA}/connexion-drive`, {
      jeton: admin.jeton,
    })
    expect(obtenirA.corps.connexionDrive?.dossierId).toBe('dossier-a')

    const obtenirB = await requete(ctx, 'GET', `/clients/${clientB}/connexion-drive`, {
      jeton: admin.jeton,
    })
    expect(obtenirB.corps.connexionDrive).toBeNull()
  })

  test('PUT rejoué remplace intégralement la configuration existante (upsert, jamais un doublon)', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    await requete(ctx, 'PUT', `/clients/${clientId}/connexion-drive`, {
      jeton: admin.jeton,
      body: { dossierId: 'dossier-1', jeton: 'jeton-1' },
    })
    await requete(ctx, 'PUT', `/clients/${clientId}/connexion-drive`, {
      jeton: admin.jeton,
      body: { dossierId: 'dossier-2', jeton: 'jeton-2' },
    })

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/connexion-drive`, {
      jeton: admin.jeton,
    })
    expect(obtenir.corps.connexionDrive).toEqual({
      clientId,
      dossierId: 'dossier-2',
      jeton: 'jeton-2',
    })
  })

  test('PUT avec corps invalide -> corps_invalide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const enregistrement = await requete(ctx, 'PUT', `/clients/${clientId}/connexion-drive`, {
      jeton: admin.jeton,
      body: { dossierId: 'dossier-1' },
    })
    expect(enregistrement.status).toBe(400)
    expect(enregistrement.corps.erreur).toBe('corps_invalide')
  })

  test('DELETE efface uniquement la configuration du client visé', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientA = await creerClientDeTest(ctx, admin.jeton)
    const clientB = await creerClientDeTest(ctx, admin.jeton)
    await requete(ctx, 'PUT', `/clients/${clientA}/connexion-drive`, {
      jeton: admin.jeton,
      body: { dossierId: 'dossier-a', jeton: 'jeton-a' },
    })
    await requete(ctx, 'PUT', `/clients/${clientB}/connexion-drive`, {
      jeton: admin.jeton,
      body: { dossierId: 'dossier-b', jeton: 'jeton-b' },
    })

    const suppression = await requete(ctx, 'DELETE', `/clients/${clientA}/connexion-drive`, {
      jeton: admin.jeton,
    })
    expect(suppression.status).toBe(200)

    const obtenirA = await requete(ctx, 'GET', `/clients/${clientA}/connexion-drive`, {
      jeton: admin.jeton,
    })
    expect(obtenirA.corps.connexionDrive).toBeNull()
    const obtenirB = await requete(ctx, 'GET', `/clients/${clientB}/connexion-drive`, {
      jeton: admin.jeton,
    })
    expect(obtenirB.corps.connexionDrive).not.toBeNull()
  })

  test('GET etat-miroir-drive sans miroir réussi -> etatMiroirDrive null', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/etat-miroir-drive`, {
      jeton: admin.jeton,
    })
    expect(obtenir.status).toBe(200)
    expect(obtenir.corps.etatMiroirDrive).toBeNull()
  })

  test('PUT etat-miroir-drive enregistre l’horodatage, isolé par client', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const enregistrement = await requete(ctx, 'PUT', `/clients/${clientId}/etat-miroir-drive`, {
      jeton: admin.jeton,
      body: { dernierMiroirReussi: '2026-01-01T00:00:00.000Z' },
    })
    expect(enregistrement.status).toBe(200)
    expect(enregistrement.corps.etatMiroirDrive).toEqual({
      clientId,
      dernierMiroirReussi: '2026-01-01T00:00:00.000Z',
    })

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/etat-miroir-drive`, {
      jeton: admin.jeton,
    })
    expect(obtenir.corps.etatMiroirDrive?.dernierMiroirReussi).toBe('2026-01-01T00:00:00.000Z')
  })

  test('PUT etat-miroir-drive avec corps invalide -> corps_invalide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const enregistrement = await requete(ctx, 'PUT', `/clients/${clientId}/etat-miroir-drive`, {
      jeton: admin.jeton,
      body: {},
    })
    expect(enregistrement.status).toBe(400)
    expect(enregistrement.corps.erreur).toBe('corps_invalide')
  })

  test('non authentifié -> 401', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/connexion-drive`)
    expect(obtenir.status).toBe(401)
  })
})

describe('routerRequete — ClientConfig (configuration IA par client, Phase 9f du chantier de migration D1)', () => {
  async function creerClientDeTest(ctx: Contexte, jeton: string): Promise<string> {
    const creation = await requete(ctx, 'POST', '/clients', { jeton, body: { name: 'Ferring' } })
    return creation.corps.client.id
  }

  function configTestValide(): {
    aiProvider: string
    aiProviderConditionsAcquittees: null
    aiProviderReliabilityQualification: {
      chat_normatif: null
      audit_simule: null
    }
    exportTemplateId: null
    consentTelemetry: { granted: boolean; date: null; revocableAtAnyTime: boolean }
  } {
    return {
      aiProvider: 'openai',
      aiProviderConditionsAcquittees: null,
      aiProviderReliabilityQualification: { chat_normatif: null, audit_simule: null },
      exportTemplateId: null,
      consentTelemetry: { granted: false, date: null, revocableAtAnyTime: true },
    }
  }

  test('GET sans rien configuré -> clientConfig null, jamais 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/config`, {
      jeton: admin.jeton,
    })
    expect(obtenir.status).toBe(200)
    expect(obtenir.corps.clientConfig).toBeNull()
  })

  test('PUT enregistre la configuration, isolée par client', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientA = await creerClientDeTest(ctx, admin.jeton)
    const clientB = await creerClientDeTest(ctx, admin.jeton)

    const enregistrement = await requete(ctx, 'PUT', `/clients/${clientA}/config`, {
      jeton: admin.jeton,
      body: configTestValide(),
    })
    expect(enregistrement.status).toBe(200)
    expect(enregistrement.corps.clientConfig?.aiProvider).toBe('openai')

    const obtenirA = await requete(ctx, 'GET', `/clients/${clientA}/config`, {
      jeton: admin.jeton,
    })
    expect(obtenirA.corps.clientConfig?.aiProvider).toBe('openai')

    const obtenirB = await requete(ctx, 'GET', `/clients/${clientB}/config`, {
      jeton: admin.jeton,
    })
    expect(obtenirB.corps.clientConfig).toBeNull()
  })

  test('PUT rejoué remplace intégralement la configuration existante (upsert, jamais un doublon)', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    await requete(ctx, 'PUT', `/clients/${clientId}/config`, {
      jeton: admin.jeton,
      body: configTestValide(),
    })
    const misAJour = {
      ...configTestValide(),
      aiProvider: 'claude',
      aiProviderConditionsAcquittees: { fournisseur: 'claude', date: '2026-01-01T00:00:00.000Z' },
      aiProviderReliabilityQualification: {
        chat_normatif: {
          date: '2026-01-01',
          resultat: 'favorable',
          qualificationTestSetId: 'set-1',
          qualificationTestSetVersion: '1.0.0',
          moteurVersionQualifiee: 'claude-v1',
        },
        audit_simule: null,
      },
    }
    await requete(ctx, 'PUT', `/clients/${clientId}/config`, {
      jeton: admin.jeton,
      body: misAJour,
    })

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/config`, {
      jeton: admin.jeton,
    })
    expect(obtenir.corps.clientConfig?.aiProvider).toBe('claude')
    expect(obtenir.corps.clientConfig?.aiProviderConditionsAcquittees?.fournisseur).toBe('claude')
    expect(
      obtenir.corps.clientConfig?.aiProviderReliabilityQualification.chat_normatif
        ?.qualificationTestSetId,
    ).toBe('set-1')
  })

  test('PUT avec corps invalide -> corps_invalide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const enregistrement = await requete(ctx, 'PUT', `/clients/${clientId}/config`, {
      jeton: admin.jeton,
      body: { aiProvider: 'openai' },
    })
    expect(enregistrement.status).toBe(400)
    expect(enregistrement.corps.erreur).toBe('corps_invalide')
  })

  test('non authentifié -> 401', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/config`)
    expect(obtenir.status).toBe(401)
  })
})

describe('routerRequete — Organization/Workspace (Phase 2 du chantier de migration D1)', () => {
  async function creerClientDeTest(ctx: Contexte, jeton: string): Promise<string> {
    const creation = await requete(ctx, 'POST', '/clients', { jeton, body: { name: 'Ferring' } })
    return creation.corps.client.id
  }

  test("migrer un client crée une Organization dont l'id est strictement égal au Client.id, avec un Workspace racine global", async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const migration = await requete(ctx, 'POST', `/clients/${clientId}/organisation/migrer`, {
      jeton: admin.jeton,
    })
    expect(migration.status).toBe(201)
    expect(migration.corps.organization?.id).toBe(clientId)
    expect(migration.corps.workspaceRacine.type).toBe('global')
    expect(migration.corps.workspaceRacine.parentWorkspaceId).toBeNull()

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/organisation`, {
      jeton: admin.jeton,
    })
    expect(obtenir.corps.organization?.id).toBe(clientId)
    expect(obtenir.corps.workspaces).toHaveLength(1)
  })

  test('migrer deux fois le même client ne duplique jamais le Workspace racine', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const premiere = await requete(ctx, 'POST', `/clients/${clientId}/organisation/migrer`, {
      jeton: admin.jeton,
    })
    const seconde = await requete(ctx, 'POST', `/clients/${clientId}/organisation/migrer`, {
      jeton: admin.jeton,
    })
    expect(premiere.corps.workspaceRacine.id).toBe(seconde.corps.workspaceRacine.id)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/organisation`, {
      jeton: admin.jeton,
    })
    expect(obtenir.corps.workspaces).toHaveLength(1)
  })

  test('GET sur un client jamais migré -> organization null, jamais 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/organisation`, {
      jeton: admin.jeton,
    })
    expect(obtenir.status).toBe(200)
    expect(obtenir.corps.organization).toBeNull()
    expect(obtenir.corps.workspaces).toEqual([])
  })

  test('créer un Workspace site rattaché au Workspace racine', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    const migration = await requete(ctx, 'POST', `/clients/${clientId}/organisation/migrer`, {
      jeton: admin.jeton,
    })

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/organisation/workspaces`, {
      jeton: admin.jeton,
      body: { nom: 'Site A — Lyon', parentWorkspaceId: migration.corps.workspaceRacine.id },
    })
    expect(creation.status).toBe(201)
    expect(creation.corps.workspace.type).toBe('site')
    expect(creation.corps.workspace.parentWorkspaceId).toBe(migration.corps.workspaceRacine.id)
  })

  test('créer un Workspace pour un client jamais migré -> organization_introuvable', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/organisation/workspaces`, {
      jeton: admin.jeton,
      body: { nom: 'Site', parentWorkspaceId: 'workspace-inconnu' },
    })
    expect(creation.status).toBe(400)
    expect(creation.corps.erreur).toBe('organization_introuvable')
  })

  test('créer un Workspace avec un parent inconnu -> parent_introuvable', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    await requete(ctx, 'POST', `/clients/${clientId}/organisation/migrer`, { jeton: admin.jeton })

    const creation = await requete(ctx, 'POST', `/clients/${clientId}/organisation/workspaces`, {
      jeton: admin.jeton,
      body: { nom: 'Site', parentWorkspaceId: 'workspace-inconnu' },
    })
    expect(creation.status).toBe(400)
    expect(creation.corps.erreur).toBe('parent_introuvable')
  })

  test('un utilisateur non lié au client se voit refuser tout accès (404 générique)', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)
    await requete(ctx, 'POST', '/admin/utilisateurs', {
      jeton: admin.jeton,
      body: {
        email: 'b@pharmatech.example',
        motDePasse: 'MotDePasse!1',
        nom: 'N',
        prenom: 'P',
        role: 'utilisateur',
      },
    })
    const login = await requete(ctx, 'POST', '/auth/login', {
      body: { email: 'b@pharmatech.example', motDePasse: 'MotDePasse!1' },
    })
    const jetonB = login.corps.jeton

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/organisation`, {
      jeton: jetonB,
    })
    expect(obtenir.status).toBe(404)
  })

  test('non authentifié -> 401', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = await creerClientDeTest(ctx, admin.jeton)

    const obtenir = await requete(ctx, 'GET', `/clients/${clientId}/organisation`)
    expect(obtenir.status).toBe(401)
  })
})

describe('routerRequete — Projects (Phase 3a du chantier de migration D1)', () => {
  async function creerUtilisateurB(
    ctx: Contexte,
    jetonAdmin: string,
  ): Promise<{ email: string; jeton: string }> {
    const email = 'b@pharmatech.example'
    await requete(ctx, 'POST', '/admin/utilisateurs', {
      jeton: jetonAdmin,
      body: { email, motDePasse: 'MotDePasse!1', nom: 'N', prenom: 'P', role: 'utilisateur' },
    })
    const login = await requete(ctx, 'POST', '/auth/login', {
      body: { email, motDePasse: 'MotDePasse!1' },
    })
    return { email, jeton: login.corps.jeton }
  }

  test('créer un projet — owner_id = email de l’auteur, statut actif, phase concept', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)

    const creation = await requete(ctx, 'POST', '/projects', {
      jeton: admin.jeton,
      body: { name: 'Qualification ligne A', context: 'Ctx', scopeIn: 'In', scopeOut: 'Out' },
    })
    expect(creation.status).toBe(201)
    expect(creation.corps.projet.ownerId).toBe('admin@pharmatech.example')
    expect(creation.corps.projet.statut).toBe('actif')
    expect(creation.corps.projet.phase).toBe('concept')
    expect(creation.corps.projet.auditLog).toHaveLength(1)
  })

  test('nom obligatoire', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)

    const creation = await requete(ctx, 'POST', '/projects', {
      jeton: admin.jeton,
      body: { name: '' },
    })
    expect(creation.status).toBe(400)
    expect(creation.corps.erreur).toBe('nom_obligatoire')
  })

  test('un compte non-admin ne voit que ses projets (propriétaire ou partagé)', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const b = await creerUtilisateurB(ctx, admin.jeton)

    await requete(ctx, 'POST', '/projects', {
      jeton: admin.jeton,
      body: { name: 'Projet admin' },
    })
    const creeParB = await requete(ctx, 'POST', '/projects', {
      jeton: b.jeton,
      body: { name: 'Projet B' },
    })

    const listeAdmin = await requete(ctx, 'GET', '/projects', { jeton: admin.jeton })
    expect(listeAdmin.corps.projects).toHaveLength(2)

    const listeB = await requete(ctx, 'GET', '/projects', { jeton: b.jeton })
    expect(listeB.corps.projects).toHaveLength(1)
    expect(listeB.corps.projects[0]?.id).toBe(creeParB.corps.projet.id)
  })

  test('obtenir un projet non visible -> 404 générique', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const b = await creerUtilisateurB(ctx, admin.jeton)
    const creation = await requete(ctx, 'POST', '/projects', {
      jeton: admin.jeton,
      body: { name: 'Projet admin' },
    })

    const obtenir = await requete(ctx, 'GET', `/projects/${creation.corps.projet.id}`, {
      jeton: b.jeton,
    })
    expect(obtenir.status).toBe(404)
  })

  test('partager un projet en édition donne accès en modification à l’utilisateur partagé', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const b = await creerUtilisateurB(ctx, admin.jeton)
    const creation = await requete(ctx, 'POST', '/projects', {
      jeton: admin.jeton,
      body: { name: 'Projet admin' },
    })
    const id = creation.corps.projet.id

    const partage = await requete(ctx, 'POST', `/projects/${id}/partage`, {
      jeton: admin.jeton,
      body: { userId: b.email, accessLevel: 'édition' },
    })
    expect(partage.status).toBe(200)
    expect(partage.corps.projet.sharedWith).toEqual([{ userId: b.email, accessLevel: 'édition' }])

    const phase = await requete(ctx, 'PATCH', `/projects/${id}/phase`, {
      jeton: b.jeton,
      body: { phase: 'realisation' },
    })
    expect(phase.status).toBe(200)
    expect(phase.corps.projet.phase).toBe('realisation')

    const retrait = await requete(
      ctx,
      'DELETE',
      `/projects/${id}/partage/${encodeURIComponent(b.email)}`,
      {
        jeton: admin.jeton,
      },
    )
    expect(retrait.status).toBe(200)
    expect(retrait.corps.projet.sharedWith).toEqual([])
  })

  test('un partage en lecture seule ne permet pas la modification -> 403', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const b = await creerUtilisateurB(ctx, admin.jeton)
    const creation = await requete(ctx, 'POST', '/projects', {
      jeton: admin.jeton,
      body: { name: 'Projet admin' },
    })
    const id = creation.corps.projet.id
    await requete(ctx, 'POST', `/projects/${id}/partage`, {
      jeton: admin.jeton,
      body: { userId: b.email, accessLevel: 'lecture' },
    })

    const phase = await requete(ctx, 'PATCH', `/projects/${id}/phase`, {
      jeton: b.jeton,
      body: { phase: 'realisation' },
    })
    expect(phase.status).toBe(403)
  })

  test('cycle de vie statut : archiver -> désarchiver, avec gardes de transition', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const creation = await requete(ctx, 'POST', '/projects', {
      jeton: admin.jeton,
      body: { name: 'Projet' },
    })
    const id = creation.corps.projet.id

    const archiver = await requete(ctx, 'POST', `/projects/${id}/archiver`, { jeton: admin.jeton })
    expect(archiver.status).toBe(200)
    expect(archiver.corps.projet.statut).toBe('archive')
    expect(archiver.corps.projet.archivedBy).toBe('admin@pharmatech.example')

    const archiverDeNouveau = await requete(ctx, 'POST', `/projects/${id}/archiver`, {
      jeton: admin.jeton,
    })
    expect(archiverDeNouveau.status).toBe(409)
    expect(archiverDeNouveau.corps.erreur).toBe('deja_archive')

    const desarchiver = await requete(ctx, 'POST', `/projects/${id}/desarchiver`, {
      jeton: admin.jeton,
    })
    expect(desarchiver.status).toBe(200)
    expect(desarchiver.corps.projet.statut).toBe('actif')
  })

  test('suppression exige un projet déjà archivé', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const creation = await requete(ctx, 'POST', '/projects', {
      jeton: admin.jeton,
      body: { name: 'Projet' },
    })
    const id = creation.corps.projet.id

    const supprimerAvantArchivage = await requete(ctx, 'POST', `/projects/${id}/supprimer`, {
      jeton: admin.jeton,
    })
    expect(supprimerAvantArchivage.status).toBe(409)
    expect(supprimerAvantArchivage.corps.erreur).toBe('pas_archive')

    await requete(ctx, 'POST', `/projects/${id}/archiver`, { jeton: admin.jeton })
    const supprimer = await requete(ctx, 'POST', `/projects/${id}/supprimer`, {
      jeton: admin.jeton,
    })
    expect(supprimer.status).toBe(200)
    expect(supprimer.corps.projet.statut).toBe('supprime')
  })

  test('suspendre puis reprendre, avec gardes de transition', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const creation = await requete(ctx, 'POST', '/projects', {
      jeton: admin.jeton,
      body: { name: 'Projet' },
    })
    const id = creation.corps.projet.id

    const suspendre = await requete(ctx, 'POST', `/projects/${id}/suspendre`, {
      jeton: admin.jeton,
    })
    expect(suspendre.status).toBe(200)
    expect(suspendre.corps.projet.statut).toBe('suspendu')

    const reprendreDeNouveau = await requete(ctx, 'POST', `/projects/${id}/reprendre`, {
      jeton: admin.jeton,
    })
    expect(reprendreDeNouveau.status).toBe(200)
    expect(reprendreDeNouveau.corps.projet.statut).toBe('actif')

    const pasSuspendu = await requete(ctx, 'POST', `/projects/${id}/reprendre`, {
      jeton: admin.jeton,
    })
    expect(pasSuspendu.status).toBe(409)
    expect(pasSuspendu.corps.erreur).toBe('pas_suspendu')
  })

  test('ajouter puis retirer un lien entre deux sections, idempotent dans les deux sens', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const creation = await requete(ctx, 'POST', '/projects', {
      jeton: admin.jeton,
      body: { name: 'Projet' },
    })
    const id = creation.corps.projet.id

    const ajout = await requete(ctx, 'POST', `/projects/${id}/liens`, {
      jeton: admin.jeton,
      body: { fromSectionId: 's1', toSectionId: 's2' },
    })
    expect(ajout.corps.projet.links).toHaveLength(1)

    const ajoutInverse = await requete(ctx, 'POST', `/projects/${id}/liens`, {
      jeton: admin.jeton,
      body: { fromSectionId: 's2', toSectionId: 's1' },
    })
    expect(ajoutInverse.corps.projet.links).toHaveLength(1)

    const retrait = await requete(ctx, 'DELETE', `/projects/${id}/liens`, {
      jeton: admin.jeton,
      body: { fromSectionId: 's1', toSectionId: 's2' },
    })
    expect(retrait.corps.projet.links).toHaveLength(0)
  })

  test('lister les projets d’un client (usage panneau chat)', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const { corps: clientCorps } = await requete(ctx, 'POST', '/clients', {
      jeton: admin.jeton,
      body: { name: 'Ferring' },
    })
    const clientId = clientCorps.client.id
    await requete(ctx, 'POST', '/projects', {
      jeton: admin.jeton,
      body: { name: 'Projet lié', clientId },
    })
    await requete(ctx, 'POST', '/projects', {
      jeton: admin.jeton,
      body: { name: 'Projet sans client' },
    })

    const liste = await requete(ctx, 'GET', `/clients/${clientId}/projects`, { jeton: admin.jeton })
    expect(liste.corps.projects).toHaveLength(1)
    expect(liste.corps.projects[0]?.name).toBe('Projet lié')
  })

  test('non authentifié -> 401', async () => {
    const ctx = nouveauContexte()
    const liste = await requete(ctx, 'GET', '/projects')
    expect(liste.status).toBe(401)
  })

  test('migration locale : préserve id/owner_id/audit_log d’origine, idempotente si rejouée', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)

    const projetLocal: ProjectJson = {
      id: 'projet-local-1',
      name: 'Ancien projet local',
      context: 'Ctx',
      scopeIn: 'In',
      scopeOut: 'Out',
      deadline: null,
      languageDefault: 'fr',
      clientId: null,
      sections: [],
      documents: [],
      links: [],
      statut: 'actif',
      phase: 'concept',
      ownerId: 'admin@pharmatech.example',
      sharedWith: [],
      archivedAt: null,
      archivedBy: null,
      auditLog: [
        {
          timestamp: '2025-01-01T00:00:00.000Z',
          actor: 'admin@pharmatech.example',
          action: 'création',
        },
      ],
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    }

    const migration = await requete(ctx, 'POST', '/projects/migration-locale', {
      jeton: admin.jeton,
      body: { projects: [projetLocal] },
    })
    expect(migration.status).toBe(201)
    // Historique d'origine conservé, suivi d'une entrée serveur qui marque
    // la migration (qui, quand, origine non vérifiée — audit du 25/09/2026).
    const historiqueMigre = [
      ...projetLocal.auditLog,
      expect.objectContaining({
        actor: 'admin@pharmatech.example',
        action: "migration_locale (historique d'origine non vérifié)",
      }),
    ]
    expect(migration.corps.projects).toEqual([{ ...projetLocal, auditLog: historiqueMigre }])

    const obtenir = await requete(ctx, 'GET', `/projects/${projetLocal.id}`, { jeton: admin.jeton })
    expect(obtenir.corps.projet.createdAt).toBe('2025-01-01T00:00:00.000Z')
    expect(obtenir.corps.projet.auditLog).toEqual(historiqueMigre)

    const migrationRejouee = await requete(ctx, 'POST', '/projects/migration-locale', {
      jeton: admin.jeton,
      body: { projects: [projetLocal] },
    })
    expect(migrationRejouee.status).toBe(201)
    const liste = await requete(ctx, 'GET', '/projects', { jeton: admin.jeton })
    expect(liste.corps.projects.filter((p) => p.id === projetLocal.id)).toHaveLength(1)
  })
})

describe('routerRequete — Sections (Phase 3b du chantier de migration D1)', () => {
  function sectionMinimale(id: string, projectId: string): SectionJson {
    return {
      id,
      projectId,
      templateType: 'oq',
      templateEngineVersion: '0.1.0',
      ownerId: 'admin@pharmatech.example',
      sharedWith: [],
      language: 'fr',
      status: 'brouillon_aide',
      meta: { ref: '', titre: 'OQ presse P-200', version: '0.1' },
      workflow: { authors: ['admin@pharmatech.example'], reviewers: [], approverFinal: null },
      signatures: { redacteur: {}, verificateur: {}, approbateur: {} },
      revisions: [],
      values: {},
      tables: {},
      generationSource: { sourceDocumentId: null, generatedFields: [] },
      procedureId: null,
      assetNodeId: null,
      auditLog: [
        {
          timestamp: '2026-01-01T00:00:00.000Z',
          actor: 'admin@pharmatech.example',
          action: 'création',
        },
      ],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
  }

  async function creerProjetDeTest(ctx: Contexte, jeton: string): Promise<string> {
    const creation = await requete(ctx, 'POST', '/projects', { jeton, body: { name: 'Projet' } })
    return creation.corps.projet.id
  }

  test('crée une section (POST /sections, jamais le même chemin que la référence Project.sections[])', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const projectId = await creerProjetDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'POST', '/sections', {
      jeton: admin.jeton,
      body: sectionMinimale('s1', projectId),
    })
    expect(creation.status).toBe(201)
    expect(creation.corps.section.projectId).toBe(projectId)
    expect(creation.corps.section.templateType).toBe('oq')

    const obtenir = await requete(ctx, 'GET', `/sections/s1`, { jeton: admin.jeton })
    expect(obtenir.corps.section.id).toBe('s1')
  })

  test('liste les sections d’un projet, jamais celles d’un autre', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const projectA = await creerProjetDeTest(ctx, admin.jeton)
    const projectB = await creerProjetDeTest(ctx, admin.jeton)
    await requete(ctx, 'POST', '/sections', {
      jeton: admin.jeton,
      body: sectionMinimale('sa', projectA),
    })
    await requete(ctx, 'POST', '/sections', {
      jeton: admin.jeton,
      body: sectionMinimale('sb', projectB),
    })

    const listeA = await requete(ctx, 'GET', `/projects/${projectA}/sections`, {
      jeton: admin.jeton,
    })
    expect(listeA.corps.sections.map((s) => s.id)).toEqual(['sa'])

    const toutes = await requete(ctx, 'GET', '/sections', { jeton: admin.jeton })
    expect(toutes.corps.sections.map((s) => s.id).sort()).toEqual(['sa', 'sb'])
  })

  test('remplace une section — le projet d’origine et l’id restent figés, jamais écrasables par le corps', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const projectId = await creerProjetDeTest(ctx, admin.jeton)
    await requete(ctx, 'POST', '/sections', {
      jeton: admin.jeton,
      body: sectionMinimale('s1', projectId),
    })

    const creee = (await requete(ctx, 'GET', '/sections/s1', { jeton: admin.jeton })).corps.section
    const sectionModifiee = {
      ...sectionMinimale('id-different-ignoré', 'projet-different-ignoré'),
      status: 'en_verification',
      workflow: { authors: ['admin@pharmatech.example'], reviewers: [], approverFinal: 'x@y.z' },
      auditLog: [
        ...creee.auditLog,
        {
          timestamp: '2026-01-02T00:00:00.000Z',
          actor: 'admin@pharmatech.example',
          action: 'changement_statut',
        },
      ],
    }
    const remplacement = await requete(ctx, 'PUT', `/sections/s1`, {
      jeton: admin.jeton,
      body: sectionModifiee,
    })
    expect(remplacement.status).toBe(200)
    expect(remplacement.corps.section.id).toBe('s1')
    expect(remplacement.corps.section.projectId).toBe(projectId)
    expect(remplacement.corps.section.status).toBe('en_verification')
    expect(remplacement.corps.section.auditLog).toHaveLength(2)
  })

  test('remplacer une section introuvable -> 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const remplacement = await requete(ctx, 'PUT', `/sections/inconnue`, {
      jeton: admin.jeton,
      body: sectionMinimale('inconnue', 'un-projet'),
    })
    expect(remplacement.status).toBe(404)
  })

  test('non authentifié -> 401', async () => {
    const ctx = nouveauContexte()
    const liste = await requete(ctx, 'GET', '/sections')
    expect(liste.status).toBe(401)
  })

  test('restaure (filet de récupération GitHub) : crée si absente, remplace si déjà présente, jamais une fusion', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const projectId = await creerProjetDeTest(ctx, admin.jeton)

    const creation = await requete(ctx, 'PUT', '/sections/s1/restauration', {
      jeton: admin.jeton,
      body: sectionMinimale('id-ignoré-par-lurl', projectId),
    })
    expect(creation.status).toBe(200)
    expect(creation.corps.section.id).toBe('s1')
    const obtenirApresCreation = await requete(ctx, 'GET', '/sections/s1', { jeton: admin.jeton })
    expect(obtenirApresCreation.corps.section.templateType).toBe('oq')

    const remplacement = await requete(ctx, 'PUT', '/sections/s1/restauration', {
      jeton: admin.jeton,
      body: { ...sectionMinimale('s1', projectId), status: 'valide_en_interne' },
    })
    expect(remplacement.status).toBe(200)
    const obtenirApresRemplacement = await requete(ctx, 'GET', '/sections/s1', {
      jeton: admin.jeton,
    })
    expect(obtenirApresRemplacement.corps.section.status).toBe('valide_en_interne')
  })

  test('migration locale (filet de sécurité sectionsAMigrer) : crée la section telle quelle, idempotente au rejeu', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const projectId = await creerProjetDeTest(ctx, admin.jeton)
    const sectionLocale = {
      ...sectionMinimale('s-locale', projectId),
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    }

    const migration = await requete(ctx, 'POST', '/sections/migration-locale', {
      jeton: admin.jeton,
      body: { sections: [sectionLocale] },
    })
    expect(migration.status).toBe(201)
    expect(migration.corps.sections).toEqual([
      {
        ...sectionLocale,
        auditLog: [
          ...sectionLocale.auditLog,
          expect.objectContaining({
            action: "migration_locale (historique d'origine non vérifié)",
          }),
        ],
      },
    ])

    const obtenir = await requete(ctx, 'GET', '/sections/s-locale', { jeton: admin.jeton })
    expect(obtenir.corps.section.createdAt).toBe('2025-01-01T00:00:00.000Z')

    const migree = (await requete(ctx, 'GET', '/sections/s-locale', { jeton: admin.jeton })).corps
      .section
    const remplacement = await requete(ctx, 'PUT', '/sections/s-locale', {
      jeton: admin.jeton,
      body: {
        ...migree,
        status: 'en_verification',
        workflow: { ...migree.workflow, approverFinal: 'admin@pharmatech.example' },
      },
    })
    expect(remplacement.status).toBe(200)

    const migrationRejouee = await requete(ctx, 'POST', '/sections/migration-locale', {
      jeton: admin.jeton,
      body: { sections: [sectionLocale] },
    })
    expect(migrationRejouee.status).toBe(201)
    expect(migrationRejouee.corps.sections[0]?.status).toBe('en_verification')

    const obtenirApresRejeu = await requete(ctx, 'GET', '/sections/s-locale', {
      jeton: admin.jeton,
    })
    expect(obtenirApresRejeu.corps.section.status).toBe('en_verification')
  })
})

async function creerDocumentProjet(
  ctx: Contexte,
  jeton: string,
  projectId: string,
  options: {
    metadata?: Record<string, unknown>
    texte?: string
    contenu?: { octets: Uint8Array; nomFichier: string; typeMime: string }
  } = {},
): Promise<{ status: number; corps: CorpsReponse }> {
  const formData = new FormData()
  formData.set(
    'metadata',
    JSON.stringify({
      projectId,
      filename: 'reference.pdf',
      mimeType: 'application/pdf',
      ...options.metadata,
    }),
  )
  formData.set('texte', options.texte ?? 'Texte extrait du document.')
  if (options.contenu) {
    formData.set(
      'contenu',
      new File([options.contenu.octets.buffer as ArrayBuffer], options.contenu.nomFichier, {
        type: options.contenu.typeMime,
      }),
    )
  }
  const reponse = await routerRequete(
    new Request('https://relais.workers.dev/project-documents', {
      method: 'POST',
      headers: { Authorization: `Bearer ${jeton}` },
      body: formData,
    }),
    ctx,
  )
  const corps = await reponse.json().catch(() => null)
  return { status: reponse.status, corps }
}

describe('routerRequete — ProjectDocument (Phase 3c du chantier de migration D1)', () => {
  async function creerProjetDeTest(ctx: Contexte, jeton: string): Promise<string> {
    const creation = await requete(ctx, 'POST', '/projects', { jeton, body: { name: 'Projet' } })
    return creation.corps.projet.id
  }

  test('création sans contenu binaire -> hasBinaryContent=false, texte relu tel quel, listé sous le projet', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const projectId = await creerProjetDeTest(ctx, admin.jeton)

    const { status, corps } = await creerDocumentProjet(ctx, admin.jeton, projectId, {
      metadata: { filename: 'notes.md' },
      texte: 'Contenu de référence.',
    })
    expect(status).toBe(201)
    expect(corps.documentProjet.hasBinaryContent).toBe(false)
    expect(corps.documentProjet.extractedText).toBe('Contenu de référence.')
    expect(corps.documentProjet.status).toBe('reference_de_travail_non_maitre')

    const liste = await requete(ctx, 'GET', `/projects/${projectId}/documents`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.documentsProjet).toHaveLength(1)
    expect(liste.corps.documentsProjet[0]?.extractedText).toBe('Contenu de référence.')
  })

  test('création avec contenu binaire -> contenu relu identique via /contenu', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const projectId = await creerProjetDeTest(ctx, admin.jeton)
    const octets = new Uint8Array([1, 2, 3, 4, 5])

    const { status, corps } = await creerDocumentProjet(ctx, admin.jeton, projectId, {
      contenu: { octets, nomFichier: 'reference.pdf', typeMime: 'application/pdf' },
    })
    expect(status).toBe(201)
    expect(corps.documentProjet.hasBinaryContent).toBe(true)

    const reponseContenu = await routerRequete(
      new Request(
        `https://relais.workers.dev/project-documents/${corps.documentProjet.id}/contenu`,
        { headers: { Authorization: `Bearer ${admin.jeton}` } },
      ),
      ctx,
    )
    expect(reponseContenu.status).toBe(200)
    expect(reponseContenu.headers.get('Content-Type')).toBe('application/pdf')
    expect(new Uint8Array(await reponseContenu.arrayBuffer())).toEqual(octets)
  })

  test('création avec un contenu binaire vide (0 octet) -> hasBinaryContent=false, /contenu -> 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const projectId = await creerProjetDeTest(ctx, admin.jeton)

    const { corps } = await creerDocumentProjet(ctx, admin.jeton, projectId, {
      contenu: { octets: new Uint8Array([]), nomFichier: 'vide.pdf', typeMime: 'application/pdf' },
    })
    expect(corps.documentProjet.hasBinaryContent).toBe(false)

    const reponseContenu = await routerRequete(
      new Request(
        `https://relais.workers.dev/project-documents/${corps.documentProjet.id}/contenu`,
        { headers: { Authorization: `Bearer ${admin.jeton}` } },
      ),
      ctx,
    )
    expect(reponseContenu.status).toBe(404)
  })

  test('liste scopée à un projet, jamais celle d’un autre', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const projectA = await creerProjetDeTest(ctx, admin.jeton)
    const projectB = await creerProjetDeTest(ctx, admin.jeton)
    await creerDocumentProjet(ctx, admin.jeton, projectA, { metadata: { filename: 'a.pdf' } })
    await creerDocumentProjet(ctx, admin.jeton, projectB, { metadata: { filename: 'b.pdf' } })

    const listeA = await requete(ctx, 'GET', `/projects/${projectA}/documents`, {
      jeton: admin.jeton,
    })
    expect(listeA.corps.documentsProjet.map((d) => d.filename)).toEqual(['a.pdf'])
  })

  test('obtention par id -> 404 si introuvable', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const introuvable = await requete(ctx, 'GET', '/project-documents/inconnu', {
      jeton: admin.jeton,
    })
    expect(introuvable.status).toBe(404)
  })

  test('suppression retire le document de la liste', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const projectId = await creerProjetDeTest(ctx, admin.jeton)
    const { corps } = await creerDocumentProjet(ctx, admin.jeton, projectId)

    const suppression = await requete(
      ctx,
      'DELETE',
      `/project-documents/${corps.documentProjet.id}`,
      { jeton: admin.jeton },
    )
    expect(suppression.status).toBe(200)

    const liste = await requete(ctx, 'GET', `/projects/${projectId}/documents`, {
      jeton: admin.jeton,
    })
    expect(liste.corps.documentsProjet).toEqual([])
  })

  test('migration locale (filet de sécurité projectDocumentsAMigrer) : crée le document avec l’id imposé, idempotente au rejeu (l’existant côté serveur gagne toujours)', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const projectId = await creerProjetDeTest(ctx, admin.jeton)

    const formData = new FormData()
    formData.set(
      'metadata',
      JSON.stringify({ id: 'doc-locale', projectId, filename: 'locale.pdf' }),
    )
    formData.set('texte', 'Texte capturé localement.')
    const migration = await routerRequete(
      new Request('https://relais.workers.dev/project-documents/migration-locale', {
        method: 'POST',
        headers: { Authorization: `Bearer ${admin.jeton}` },
        body: formData,
      }),
      ctx,
    )
    const corpsMigration = (await migration.json()) as CorpsReponse
    expect(migration.status).toBe(201)
    expect(corpsMigration.documentProjet.id).toBe('doc-locale')
    expect(corpsMigration.documentProjet.extractedText).toBe('Texte capturé localement.')

    // Rejeu avec un texte différent : l'enregistrement déjà migré gagne toujours, jamais un écrasement.
    const formDataRejeu = new FormData()
    formDataRejeu.set(
      'metadata',
      JSON.stringify({ id: 'doc-locale', projectId, filename: 'locale.pdf' }),
    )
    formDataRejeu.set('texte', 'Texte different, jamais appliqué.')
    const migrationRejouee = await routerRequete(
      new Request('https://relais.workers.dev/project-documents/migration-locale', {
        method: 'POST',
        headers: { Authorization: `Bearer ${admin.jeton}` },
        body: formDataRejeu,
      }),
      ctx,
    )
    const corpsRejeu = (await migrationRejouee.json()) as CorpsReponse
    expect(migrationRejouee.status).toBe(201)
    expect(corpsRejeu.documentProjet.extractedText).toBe('Texte capturé localement.')
  })

  test('non authentifié -> 401', async () => {
    const ctx = nouveauContexte()
    const projectId = 'un-projet'
    const liste = await requete(ctx, 'GET', `/projects/${projectId}/documents`)
    expect(liste.status).toBe(401)
  })
})

describe('routerRequete — audit générique (/audit/authorize-action)', () => {
  test('exige une justification non vide, consigne une entrée d’audit', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)

    const sansJustification = await requete(ctx, 'POST', '/audit/authorize-action', {
      jeton: admin.jeton,
      body: { action: 'suppression_document', targetType: 'project_document', targetId: 'doc-1' },
    })
    expect(sansJustification.status).toBe(400)

    const { status, corps } = await requete(ctx, 'POST', '/audit/authorize-action', {
      jeton: admin.jeton,
      body: {
        action: 'suppression_document',
        targetType: 'project_document',
        targetId: 'doc-1',
        justification: 'Doublon importé par erreur',
      },
    })
    expect(status).toBe(200)
    expect(corps.authorized).toBe(true)
    expect(corps.auditId).toBeTruthy()
  })
})

describe('routerRequete — paramètres d’installation (dépôt GitHub, Relais IA, Drive normes, Relais OCR)', () => {
  async function creerUtilisateurEtLogin(
    ctx: Contexte,
    adminJeton: string,
    email: string,
  ): Promise<string> {
    await requete(ctx, 'POST', '/admin/utilisateurs', {
      jeton: adminJeton,
      body: { email, motDePasse: 'MotDePasse!1', nom: 'N', prenom: 'P', role: 'utilisateur' },
    })
    const login = await requete(ctx, 'POST', '/auth/login', {
      body: { email, motDePasse: 'MotDePasse!1' },
    })
    return login.corps.jeton
  }

  test('GET sur une clé jamais enregistrée -> parametre null (jamais 404)', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const { status, corps } = await requete(ctx, 'GET', '/parametres-installation/github', {
      jeton: admin.jeton,
    })
    expect(status).toBe(200)
    expect(corps.parametre).toBeNull()
  })

  test('un admin enregistre un paramètre, un simple utilisateur peut le relire (partagé à toute l’installation)', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const jetonUtilisateur = await creerUtilisateurEtLogin(
      ctx,
      admin.jeton,
      'employe@pharmatech.example',
    )

    const enregistrement = await requete(ctx, 'PUT', '/parametres-installation/github', {
      jeton: admin.jeton,
      body: {
        valeur: { owner: 'acme-corp', repo: 'validapharm-data', branche: 'main', jeton: 'ghp_xxx' },
      },
    })
    expect(enregistrement.status).toBe(200)
    expect(enregistrement.corps.parametre?.valeur.owner).toBe('acme-corp')

    const lecture = await requete(ctx, 'GET', '/parametres-installation/github', {
      jeton: jetonUtilisateur,
    })
    expect(lecture.status).toBe(200)
    // Le PAT GitHub n'est JAMAIS renvoyé (écriture seule) : tous les appels
    // GitHub passent par le relais du Worker.
    expect(lecture.corps.parametre?.valeur).toEqual({
      owner: 'acme-corp',
      repo: 'validapharm-data',
      branche: 'main',
      jetonConfigure: 'oui',
    })
    expect(JSON.stringify(enregistrement.corps)).not.toContain('ghp_xxx')
  })

  test('github : réenregistrer sans jeton conserve le PAT déjà en place ; premier enregistrement sans jeton refusé', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const sansJeton = await requete(ctx, 'PUT', '/parametres-installation/github', {
      jeton: admin.jeton,
      body: { valeur: { owner: 'acme-corp', repo: 'data', branche: 'main', jeton: '' } },
    })
    expect(sansJeton.status).toBe(400)
    expect(sansJeton.corps.erreur).toBe('jeton_obligatoire')

    await requete(ctx, 'PUT', '/parametres-installation/github', {
      jeton: admin.jeton,
      body: { valeur: { owner: 'acme-corp', repo: 'data', branche: 'main', jeton: 'ghp_secret' } },
    })
    const changementDeBranche = await requete(ctx, 'PUT', '/parametres-installation/github', {
      jeton: admin.jeton,
      body: { valeur: { owner: 'acme-corp', repo: 'data', branche: 'dev', jeton: '' } },
    })
    expect(changementDeBranche.status).toBe(200)
    const stocke = await ctx.parametresInstallationRepo.obtenir('github')
    expect(stocke?.valeur).toEqual({
      owner: 'acme-corp',
      repo: 'data',
      branche: 'dev',
      jeton: 'ghp_secret',
    })
  })

  test('un simple utilisateur ne peut pas enregistrer un paramètre (403)', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const jetonUtilisateur = await creerUtilisateurEtLogin(
      ctx,
      admin.jeton,
      'employe@pharmatech.example',
    )

    const { status } = await requete(ctx, 'PUT', '/parametres-installation/relais-ia', {
      jeton: jetonUtilisateur,
      body: { valeur: { relayUrl: 'https://relais.example.workers.dev', jeton: 'x' } },
    })
    expect(status).toBe(403)
  })

  test('clé inconnue -> 400, jamais une clé arbitraire stockée', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)

    const lecture = await requete(ctx, 'GET', '/parametres-installation/autre-chose', {
      jeton: admin.jeton,
    })
    expect(lecture.status).toBe(400)

    const ecriture = await requete(ctx, 'PUT', '/parametres-installation/autre-chose', {
      jeton: admin.jeton,
      body: { valeur: { x: 'y' } },
    })
    expect(ecriture.status).toBe(400)
  })

  test('un admin peut effacer un paramètre déjà enregistré', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    await requete(ctx, 'PUT', '/parametres-installation/drive-normes', {
      jeton: admin.jeton,
      body: { valeur: { dossierId: 'dossier-1', jeton: 'x' } },
    })

    const effacement = await requete(ctx, 'DELETE', '/parametres-installation/drive-normes', {
      jeton: admin.jeton,
    })
    expect(effacement.status).toBe(200)

    const lecture = await requete(ctx, 'GET', '/parametres-installation/drive-normes', {
      jeton: admin.jeton,
    })
    expect(lecture.corps.parametre).toBeNull()
  })

  test('relais-ocr (Phase 9e du chantier de migration D1) : enregistre et relit, même patron que relais-ia', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)

    const enregistrement = await requete(ctx, 'PUT', '/parametres-installation/relais-ocr', {
      jeton: admin.jeton,
      body: { valeur: { relayUrl: 'https://ocr-relay.workers.dev', jeton: 'jeton-ocr' } },
    })
    expect(enregistrement.status).toBe(200)

    const lecture = await requete(ctx, 'GET', '/parametres-installation/relais-ocr', {
      jeton: admin.jeton,
    })
    // Jeton du relais jamais renvoyé (écriture seule), mais bien stocké.
    expect(lecture.corps.parametre?.valeur).toEqual({
      relayUrl: 'https://ocr-relay.workers.dev',
      jetonConfigure: 'oui',
    })
    expect((await ctx.parametresInstallationRepo.obtenir('relais-ocr'))?.valeur.jeton).toBe(
      'jeton-ocr',
    )
  })

  test('sans authentification -> 401', async () => {
    const ctx = nouveauContexte()
    const { status } = await requete(ctx, 'GET', '/parametres-installation/github')
    expect(status).toBe(401)
  })
})

async function creerDocumentNormatif(
  ctx: Contexte,
  jeton: string,
  options: {
    metadata?: Record<string, unknown>
    texte?: string
    contenu?: { octets: Uint8Array; nomFichier: string; typeMime: string }
  } = {},
): Promise<{ status: number; corps: CorpsReponse }> {
  const formData = new FormData()
  formData.set(
    'metadata',
    JSON.stringify({
      category: 'iso',
      titre: 'ISO 13485',
      filename: 'iso-13485.pdf',
      source: 'televersement',
      mimeType: 'application/pdf',
      ...options.metadata,
    }),
  )
  formData.set('texte', options.texte ?? 'Texte extrait du document.')
  if (options.contenu) {
    formData.set(
      'contenu',
      new File([options.contenu.octets.buffer as ArrayBuffer], options.contenu.nomFichier, {
        type: options.contenu.typeMime,
      }),
    )
  }
  const reponse = await routerRequete(
    new Request('https://relais.workers.dev/documents-normatifs', {
      method: 'POST',
      headers: { Authorization: `Bearer ${jeton}` },
      body: formData,
    }),
    ctx,
  )
  const corps = await reponse.json().catch(() => null)
  return { status: reponse.status, corps }
}

describe('routerRequete — documents normatifs (Bibliothèque de normes)', () => {
  test('liste vide au départ', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const { status, corps } = await requete(ctx, 'GET', '/documents-normatifs', {
      jeton: admin.jeton,
    })
    expect(status).toBe(200)
    expect(corps.documents).toEqual([])
  })

  test('création sans contenu binaire (import GitHub/Drive natif) -> hasBinaryContent=false, texte relu tel quel', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const { status, corps } = await creerDocumentNormatif(ctx, admin.jeton, {
      metadata: { category: 'gmp', titre: 'Guide BPF', filename: 'guide.md', source: 'github' },
      texte: 'Contenu du guide.',
    })
    expect(status).toBe(201)
    expect(corps.document.hasBinaryContent).toBe(false)
    expect(corps.document.extractedText).toBe('Contenu du guide.')
    expect(corps.document.category).toBe('gmp')
    expect(corps.document.source).toBe('github')

    const liste = await requete(ctx, 'GET', '/documents-normatifs', { jeton: admin.jeton })
    expect(liste.corps.documents).toHaveLength(1)
    expect(liste.corps.documents[0]?.extractedText).toBe('Contenu du guide.')
  })

  test('création avec contenu binaire (téléversement) -> contenu relu identique via /contenu', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const octets = new Uint8Array([1, 2, 3, 4, 5])
    const { status, corps } = await creerDocumentNormatif(ctx, admin.jeton, {
      contenu: { octets, nomFichier: 'iso-13485.pdf', typeMime: 'application/pdf' },
    })
    expect(status).toBe(201)
    expect(corps.document.hasBinaryContent).toBe(true)

    const reponseContenu = await routerRequete(
      new Request(`https://relais.workers.dev/documents-normatifs/${corps.document.id}/contenu`, {
        headers: { Authorization: `Bearer ${admin.jeton}` },
      }),
      ctx,
    )
    expect(reponseContenu.status).toBe(200)
    expect(reponseContenu.headers.get('Content-Type')).toBe('application/pdf')
    expect(new Uint8Array(await reponseContenu.arrayBuffer())).toEqual(octets)
  })

  test('création avec un contenu binaire vide (0 octet, ex. jeton Drive expiré en cours de lot) -> hasBinaryContent=false, jamais un mensonge sur la disponibilité du fichier', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const { status, corps } = await creerDocumentNormatif(ctx, admin.jeton, {
      contenu: { octets: new Uint8Array([]), nomFichier: 'vide.pdf', typeMime: 'application/pdf' },
    })
    expect(status).toBe(201)
    expect(corps.document.hasBinaryContent).toBe(false)

    const reponseContenu = await routerRequete(
      new Request(`https://relais.workers.dev/documents-normatifs/${corps.document.id}/contenu`, {
        headers: { Authorization: `Bearer ${admin.jeton}` },
      }),
      ctx,
    )
    expect(reponseContenu.status).toBe(404)
  })

  test('/contenu sur un document sans contenu binaire -> 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const { corps } = await creerDocumentNormatif(ctx, admin.jeton, {
      metadata: { source: 'github' },
    })
    const reponseContenu = await routerRequete(
      new Request(`https://relais.workers.dev/documents-normatifs/${corps.document.id}/contenu`, {
        headers: { Authorization: `Bearer ${admin.jeton}` },
      }),
      ctx,
    )
    expect(reponseContenu.status).toBe(404)
  })

  test('suppression retire le document de la liste', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const { corps } = await creerDocumentNormatif(ctx, admin.jeton)

    const suppression = await requete(ctx, 'DELETE', `/documents-normatifs/${corps.document.id}`, {
      jeton: admin.jeton,
    })
    expect(suppression.status).toBe(200)

    const liste = await requete(ctx, 'GET', '/documents-normatifs', { jeton: admin.jeton })
    expect(liste.corps.documents).toEqual([])
  })

  test('suppression réservée aux admins : un utilisateur reçoit 403, le document reste', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const { corps } = await creerDocumentNormatif(ctx, admin.jeton)
    await requete(ctx, 'POST', '/admin/utilisateurs', {
      jeton: admin.jeton,
      body: {
        email: 'consultant@pharmatech.example',
        motDePasse: 'MotDePasse!1',
        nom: 'N',
        prenom: 'P',
        role: 'utilisateur',
      },
    })
    const login = await requete(ctx, 'POST', '/auth/login', {
      body: { email: 'consultant@pharmatech.example', motDePasse: 'MotDePasse!1' },
    })

    const refus = await requete(ctx, 'DELETE', `/documents-normatifs/${corps.document.id}`, {
      jeton: login.corps.jeton,
    })
    expect(refus.status).toBe(403)
    const liste = await requete(ctx, 'GET', '/documents-normatifs', { jeton: admin.jeton })
    expect(liste.corps.documents).toHaveLength(1)
  })

  test('réparation du contenu binaire -> hasBinaryContent passe à true, contenu relu identique, métadonnées inchangées', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const { corps } = await creerDocumentNormatif(ctx, admin.jeton, {
      metadata: { titre: 'Titre déjà personnalisé' },
      contenu: { octets: new Uint8Array([]), nomFichier: 'vide.pdf', typeMime: 'application/pdf' },
    })
    expect(corps.document.hasBinaryContent).toBe(false)

    const octets = new Uint8Array([9, 8, 7, 6])
    const reparation = await routerRequete(
      new Request(`https://relais.workers.dev/documents-normatifs/${corps.document.id}/contenu`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${admin.jeton}`, 'Content-Type': 'application/pdf' },
        body: octets,
      }),
      ctx,
    )
    const corpsReparation = (await reparation.json()) as CorpsReponse
    expect(reparation.status).toBe(200)
    expect(corpsReparation.document.hasBinaryContent).toBe(true)
    // Le titre déjà personnalisé (renommage) n'est jamais perdu par une réparation du seul contenu.
    expect(corpsReparation.document.titre).toBe('Titre déjà personnalisé')

    const reponseContenu = await routerRequete(
      new Request(`https://relais.workers.dev/documents-normatifs/${corps.document.id}/contenu`, {
        headers: { Authorization: `Bearer ${admin.jeton}` },
      }),
      ctx,
    )
    expect(reponseContenu.status).toBe(200)
    expect(reponseContenu.headers.get('Content-Type')).toBe('application/pdf')
    expect(new Uint8Array(await reponseContenu.arrayBuffer())).toEqual(octets)

    const audit = await requete(ctx, 'GET', '/admin/audit', { jeton: admin.jeton })
    expect(
      audit.corps.entrees.some((e) => e.action === 'reparation_contenu_document_normatif'),
    ).toBe(true)
  })

  test('réparation avec un corps vide -> 400, jamais un mensonge répété sur la disponibilité du fichier', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const { corps } = await creerDocumentNormatif(ctx, admin.jeton, {
      contenu: { octets: new Uint8Array([]), nomFichier: 'vide.pdf', typeMime: 'application/pdf' },
    })

    const reparation = await routerRequete(
      new Request(`https://relais.workers.dev/documents-normatifs/${corps.document.id}/contenu`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${admin.jeton}` },
        body: new Uint8Array([]),
      }),
      ctx,
    )
    expect(reparation.status).toBe(400)
    const corpsReparation = (await reparation.json()) as CorpsReponse
    expect(corpsReparation.erreur).toBe('contenu_vide')
  })

  test('réparation d’un document inconnu -> 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const reparation = await routerRequete(
      new Request('https://relais.workers.dev/documents-normatifs/inconnu/contenu', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${admin.jeton}` },
        body: new Uint8Array([1]),
      }),
      ctx,
    )
    expect(reparation.status).toBe(404)
  })

  test('réparation sans authentification -> 401', async () => {
    const ctx = nouveauContexte()
    const reparation = await routerRequete(
      new Request('https://relais.workers.dev/documents-normatifs/inconnu/contenu', {
        method: 'PUT',
        body: new Uint8Array([1]),
      }),
      ctx,
    )
    expect(reparation.status).toBe(401)
  })

  test('diagnostic : corrige hasBinaryContent=true -> false quand le contenu R2 est absent (ancien import de masse, #35/#36)', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    // Reproduit l'état des 177 documents historiques : le drapeau D1 ment
    // (`true`) alors qu'aucun octet n'a jamais été écrit en R2 — jamais
    // atteignable via `creerDocumentNormatif`, qui refuse déjà ce cas
    // depuis #35 ; seule une manipulation directe du dépôt le reproduit.
    await ctx.documentsNormatifsRepo.creer({
      id: 'legacy-1',
      category: 'gmp',
      titre: 'Norme historique mal importée',
      filename: 'norme-historique.pdf',
      source: 'drive',
      sourceRef: 'drive-id-legacy-1',
      mimeType: 'application/pdf',
      hasBinaryContent: true,
      uploadedAt: '2026-01-01T00:00:00.000Z',
      uploadedBy: admin.utilisateur.id,
    })

    const { status, corps } = await requete(ctx, 'POST', '/documents-normatifs/diagnostiquer', {
      jeton: admin.jeton,
      body: { ids: ['legacy-1'] },
    })

    expect(status).toBe(200)
    expect(corps.resultats).toEqual([{ id: 'legacy-1', hasBinaryContent: false, corrige: true }])

    const liste = await requete(ctx, 'GET', '/documents-normatifs', { jeton: admin.jeton })
    expect(liste.corps.documents[0]?.hasBinaryContent).toBe(false)

    const audit = await requete(ctx, 'GET', '/admin/audit', { jeton: admin.jeton })
    expect(
      audit.corps.entrees.some(
        (e) => e.action === 'correction_has_binary_content_document_normatif',
      ),
    ).toBe(true)
  })

  test('diagnostic : ne touche pas un document dont le contenu R2 est réellement présent', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const { corps: creation } = await creerDocumentNormatif(ctx, admin.jeton, {
      contenu: {
        octets: new Uint8Array([1, 2, 3]),
        nomFichier: 'reel.pdf',
        typeMime: 'application/pdf',
      },
    })

    const { status, corps } = await requete(ctx, 'POST', '/documents-normatifs/diagnostiquer', {
      jeton: admin.jeton,
      body: { ids: [creation.document.id] },
    })

    expect(status).toBe(200)
    expect(corps.resultats).toEqual([
      { id: creation.document.id, hasBinaryContent: true, corrige: false },
    ])
  })

  test('diagnostic : document inconnu -> non corrigé, jamais une erreur qui bloquerait le reste du lot', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)

    const { status, corps } = await requete(ctx, 'POST', '/documents-normatifs/diagnostiquer', {
      jeton: admin.jeton,
      body: { ids: ['inconnu'] },
    })

    expect(status).toBe(200)
    expect(corps.resultats).toEqual([{ id: 'inconnu', hasBinaryContent: false, corrige: false }])
  })

  test('diagnostic : corps sans ids -> 400', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)

    const { status, corps } = await requete(ctx, 'POST', '/documents-normatifs/diagnostiquer', {
      jeton: admin.jeton,
      body: {},
    })

    expect(status).toBe(400)
    expect(corps.erreur).toBe('corps_invalide')
  })

  test('diagnostic sans authentification -> 401', async () => {
    const ctx = nouveauContexte()
    const { status } = await requete(ctx, 'POST', '/documents-normatifs/diagnostiquer', {
      body: { ids: ['x'] },
    })
    expect(status).toBe(401)
  })

  test('categorie invalide -> 400', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const { status, corps } = await creerDocumentNormatif(ctx, admin.jeton, {
      metadata: { category: 'inconnue' },
    })
    expect(status).toBe(400)
    expect(corps.erreur).toBe('categorie_invalide')
  })

  test('renommage -> nouveau titre reflété dans la liste, consigné à l’audit', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const { corps } = await creerDocumentNormatif(ctx, admin.jeton)

    const renommage = await requete(ctx, 'PATCH', `/documents-normatifs/${corps.document.id}`, {
      jeton: admin.jeton,
      body: { titre: 'ISO 13485:2016 (renommé)' },
    })
    expect(renommage.status).toBe(200)
    expect(renommage.corps.document.titre).toBe('ISO 13485:2016 (renommé)')
    // Les autres champs (filename, texte extrait...) ne sont jamais touchés par un renommage.
    expect(renommage.corps.document.filename).toBe('iso-13485.pdf')
    expect(renommage.corps.document.extractedText).toBe('Texte extrait du document.')

    const liste = await requete(ctx, 'GET', '/documents-normatifs', { jeton: admin.jeton })
    expect(liste.corps.documents[0]?.titre).toBe('ISO 13485:2016 (renommé)')

    const audit = await requete(ctx, 'GET', '/admin/audit', { jeton: admin.jeton })
    expect(audit.corps.entrees.some((e) => e.action === 'renommage_document_normatif')).toBe(true)
  })

  test('renommage avec titre vide -> 400, jamais un titre vidé silencieusement', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const { corps } = await creerDocumentNormatif(ctx, admin.jeton)

    const renommage = await requete(ctx, 'PATCH', `/documents-normatifs/${corps.document.id}`, {
      jeton: admin.jeton,
      body: { titre: '   ' },
    })
    expect(renommage.status).toBe(400)
    expect(renommage.corps.erreur).toBe('titre_obligatoire')
  })

  test('renommage d’un document inconnu -> 404', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const renommage = await requete(ctx, 'PATCH', '/documents-normatifs/inconnu', {
      jeton: admin.jeton,
      body: { titre: 'Nouveau titre' },
    })
    expect(renommage.status).toBe(404)
    expect(renommage.corps.erreur).toBe('introuvable')
  })

  test('sans authentification -> 401 (lecture et écriture)', async () => {
    const ctx = nouveauContexte()
    const liste = await requete(ctx, 'GET', '/documents-normatifs')
    expect(liste.status).toBe(401)

    const creation = await routerRequete(
      new Request('https://relais.workers.dev/documents-normatifs', {
        method: 'POST',
        body: new FormData(),
      }),
      ctx,
    )
    expect(creation.status).toBe(401)

    const renommage = await requete(ctx, 'PATCH', '/documents-normatifs/inconnu', {
      body: { titre: 'x' },
    })
    expect(renommage.status).toBe(401)
  })
})

describe('routerRequete — OAuth Google (Drive normes)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  async function creerUtilisateurEtLogin(
    ctx: Contexte,
    adminJeton: string,
    email: string,
  ): Promise<string> {
    await requete(ctx, 'POST', '/admin/utilisateurs', {
      jeton: adminJeton,
      body: { email, motDePasse: 'MotDePasse!1', nom: 'N', prenom: 'P', role: 'utilisateur' },
    })
    const login = await requete(ctx, 'POST', '/auth/login', {
      body: { email, motDePasse: 'MotDePasse!1' },
    })
    return login.corps.jeton
  }

  test('demarrer : admin -> urlAutorisation Google valide, jamais le secret dans l’URL', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)

    const { status, corps } = await requete(ctx, 'GET', '/drive-oauth/demarrer', {
      jeton: admin.jeton,
    })

    expect(status).toBe(200)
    const url = new URL(corps.urlAutorisation)
    expect(url.origin).toBe('https://accounts.google.com')
    expect(url.searchParams.get('client_id')).toBe(GOOGLE_OAUTH_CLIENT_ID)
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://relais.workers.dev/drive-oauth/callback',
    )
    expect(url.searchParams.get('access_type')).toBe('offline')
    expect(url.searchParams.get('prompt')).toBe('consent')
    expect(url.searchParams.get('scope')).toBe('https://www.googleapis.com/auth/drive.readonly')
    expect(url.toString()).not.toContain(GOOGLE_OAUTH_CLIENT_SECRET)
    expect(url.searchParams.get('state')).toBeTruthy()
  })

  test('demarrer : non-admin -> 403', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const jetonUtilisateur = await creerUtilisateurEtLogin(ctx, admin.jeton, 'u@pharmatech.example')

    const { status } = await requete(ctx, 'GET', '/drive-oauth/demarrer', {
      jeton: jetonUtilisateur,
    })
    expect(status).toBe(403)
  })

  test('demarrer : sans authentification -> 401', async () => {
    const ctx = nouveauContexte()
    const { status } = await requete(ctx, 'GET', '/drive-oauth/demarrer')
    expect(status).toBe(401)
  })

  test('demarrer : OAuth Google non configuré côté serveur -> 501', async () => {
    const ctx = nouveauContexte({ sansOAuthGoogle: true })
    const admin = await bootstrapAdmin(ctx)

    const { status, corps } = await requete(ctx, 'GET', '/drive-oauth/demarrer', {
      jeton: admin.jeton,
    })
    expect(status).toBe(501)
    expect(corps.erreur).toBe('oauth_google_non_configure')
  })

  test('callback : succès -> refreshToken stocké sans perdre dossierId, redirection ok, audit consigné', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    // Un dossierId déjà configuré manuellement ne doit jamais être perdu par la connexion OAuth.
    await requete(ctx, 'PUT', '/parametres-installation/drive-normes', {
      jeton: admin.jeton,
      body: { valeur: { dossierId: 'dossier-existant-1', jeton: 'ancien-jeton-manuel' } },
    })
    const { corps: demarrage } = await requete(ctx, 'GET', '/drive-oauth/demarrer', {
      jeton: admin.jeton,
    })
    const etat = new URL(demarrage.urlAutorisation).searchParams.get('state') as string

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'jeton-frais',
        refresh_token: 'jeton-refresh-1',
        expires_in: 3599,
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const reponse = await routerRequete(
      new Request(`https://relais.workers.dev/drive-oauth/callback?code=code-1&state=${etat}`),
      ctx,
    )

    expect(reponse.status).toBe(302)
    expect(reponse.headers.get('Location')).toBe(
      'https://validapharm.pages.dev/normes?drive_oauth=ok',
    )
    expect(fetchMock).toHaveBeenCalledWith(
      'https://oauth2.googleapis.com/token',
      expect.objectContaining({ method: 'POST' }),
    )

    const parametre = await requete(ctx, 'GET', '/parametres-installation/drive-normes', {
      jeton: admin.jeton,
    })
    // Jeton de rafraîchissement Google stocké, mais jamais renvoyé au
    // navigateur (seul l'indicateur l'est).
    expect(parametre.corps.parametre?.valeur).toMatchObject({
      dossierId: 'dossier-existant-1',
      refreshTokenConfigure: 'oui',
    })
    expect(JSON.stringify(parametre.corps)).not.toContain('jeton-refresh-1')
    expect(
      (await ctx.parametresInstallationRepo.obtenir('drive-normes'))?.valeur.refreshToken,
    ).toBe('jeton-refresh-1')

    const audit = await requete(ctx, 'GET', '/admin/audit', { jeton: admin.jeton })
    expect(audit.corps.entrees.some((e) => e.action === 'connexion_oauth_drive')).toBe(true)
  })

  test('callback : état inconnu/absent -> redirection erreur, jamais un plantage', async () => {
    const ctx = nouveauContexte()

    const reponse = await routerRequete(
      new Request('https://relais.workers.dev/drive-oauth/callback?code=x&state=etat-inconnu'),
      ctx,
    )

    expect(reponse.status).toBe(302)
    expect(reponse.headers.get('Location')).toBe(
      'https://validapharm.pages.dev/normes?drive_oauth=erreur&raison=etat_invalide_ou_expire',
    )
  })

  test('callback : paramètres manquants -> redirection erreur', async () => {
    const ctx = nouveauContexte()

    const reponse = await routerRequete(
      new Request('https://relais.workers.dev/drive-oauth/callback'),
      ctx,
    )

    expect(reponse.status).toBe(302)
    expect(reponse.headers.get('Location')).toBe(
      'https://validapharm.pages.dev/normes?drive_oauth=erreur&raison=parametres_manquants',
    )
  })

  test('callback : échange de code refusé par Google -> redirection erreur, état tout de même consommé (jamais réutilisable)', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const { corps: demarrage } = await requete(ctx, 'GET', '/drive-oauth/demarrer', {
      jeton: admin.jeton,
    })
    const etat = new URL(demarrage.urlAutorisation).searchParams.get('state') as string
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

    const reponse = await routerRequete(
      new Request(`https://relais.workers.dev/drive-oauth/callback?code=code-1&state=${etat}`),
      ctx,
    )
    expect(reponse.status).toBe(302)
    expect(reponse.headers.get('Location')).toBe(
      'https://validapharm.pages.dev/normes?drive_oauth=erreur&raison=echange_jeton_echoue',
    )

    const rejeu = await routerRequete(
      new Request(`https://relais.workers.dev/drive-oauth/callback?code=code-1&state=${etat}`),
      ctx,
    )
    expect(rejeu.headers.get('Location')).toBe(
      'https://validapharm.pages.dev/normes?drive_oauth=erreur&raison=etat_invalide_ou_expire',
    )
  })

  test('rafraichir-jeton : sans authentification -> 401', async () => {
    const ctx = nouveauContexte()
    const { status } = await requete(ctx, 'POST', '/drive-oauth/rafraichir-jeton')
    expect(status).toBe(401)
  })

  test('rafraichir-jeton : aucune connexion OAuth -> 404 oauth_non_connecte', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)

    const { status, corps } = await requete(ctx, 'POST', '/drive-oauth/rafraichir-jeton', {
      jeton: admin.jeton,
    })
    expect(status).toBe(404)
    expect(corps.erreur).toBe('oauth_non_connecte')
  })

  test('rafraichir-jeton : succès -> jeton frais renvoyé', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    await requete(ctx, 'PUT', '/parametres-installation/drive-normes', {
      jeton: admin.jeton,
      body: { valeur: { dossierId: 'd1', refreshToken: 'jeton-refresh-1' } },
    })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'jeton-frais-2', expires_in: 3599 }),
      }),
    )

    const { status, corps } = await requete(ctx, 'POST', '/drive-oauth/rafraichir-jeton', {
      jeton: admin.jeton,
    })

    expect(status).toBe(200)
    expect(corps.jeton).toBe('jeton-frais-2')
    expect(corps.expiresIn).toBe(3599)
  })

  test('rafraichir-jeton : Google refuse (jeton de rafraîchissement révoqué) -> 400, jamais 5xx (AuthApiClient traite tout 5xx comme relais injoignable)', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    await requete(ctx, 'PUT', '/parametres-installation/drive-normes', {
      jeton: admin.jeton,
      body: { valeur: { refreshToken: 'jeton-refresh-revoque' } },
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

    const { status, corps } = await requete(ctx, 'POST', '/drive-oauth/rafraichir-jeton', {
      jeton: admin.jeton,
    })

    expect(status).toBe(400)
    expect(corps.erreur).toBe('rafraichissement_echoue')
  })

  test('rafraichir-jeton : OAuth Google non configuré côté serveur -> 501', async () => {
    const ctx = nouveauContexte({ sansOAuthGoogle: true })
    const admin = await bootstrapAdmin(ctx)

    const { status, corps } = await requete(ctx, 'POST', '/drive-oauth/rafraichir-jeton', {
      jeton: admin.jeton,
    })
    expect(status).toBe(501)
    expect(corps.erreur).toBe('oauth_google_non_configure')
  })
})

describe('routerRequete — protection réelle projets/sections/documents (décision du 25/09/2026)', () => {
  async function creerUtilisateur(
    ctx: Contexte,
    jetonAdmin: string,
    email: string,
  ): Promise<{ email: string; jeton: string; id: string }> {
    await requete(ctx, 'POST', '/admin/utilisateurs', {
      jeton: jetonAdmin,
      body: { email, motDePasse: 'MotDePasse!1', nom: 'N', prenom: 'P', role: 'utilisateur' },
    })
    const login = await requete(ctx, 'POST', '/auth/login', {
      body: { email, motDePasse: 'MotDePasse!1' },
    })
    const me = await requete(ctx, 'GET', '/auth/me', { jeton: login.corps.jeton })
    return { email, jeton: login.corps.jeton, id: me.corps.utilisateur.id }
  }

  function section(id: string, projectId: string, ownerId: string): SectionJson {
    return {
      id,
      projectId,
      templateType: 'oq',
      templateEngineVersion: '0.1.0',
      ownerId,
      sharedWith: [],
      language: 'fr',
      status: 'brouillon_aide',
      meta: { ref: '', titre: 'OQ', version: '0.1' },
      workflow: { authors: [ownerId], reviewers: [], approverFinal: null },
      signatures: { redacteur: {}, verificateur: {}, approbateur: {} },
      revisions: [],
      values: {},
      tables: {},
      generationSource: { sourceDocumentId: null, generatedFields: [] },
      procedureId: null,
      assetNodeId: null,
      auditLog: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
  }

  /**
   * A crée un client partagé avec B (C n'y a pas accès), puis un projet de
   * ce client, une section et un document.
   */
  async function preparer() {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const a = await creerUtilisateur(ctx, admin.jeton, 'a@pharmatech.example')
    const b = await creerUtilisateur(ctx, admin.jeton, 'b@pharmatech.example')
    const c = await creerUtilisateur(ctx, admin.jeton, 'c@pharmatech.example')
    const client = await requete(ctx, 'POST', '/clients', { jeton: a.jeton, body: { name: 'X' } })
    const clientId = client.corps.client.id
    await requete(ctx, 'PATCH', `/clients/${clientId}`, {
      jeton: a.jeton,
      body: { sharedWith: [b.id] },
    })
    const projet = await requete(ctx, 'POST', '/projects', {
      jeton: a.jeton,
      body: { name: 'Qualification ligne A', clientId },
    })
    const projectId = projet.corps.projet.id
    const creationSection = await requete(ctx, 'POST', '/sections', {
      jeton: a.jeton,
      body: section('s1', projectId, a.email),
    })
    expect(creationSection.status).toBe(201)
    const doc = await creerDocumentProjet(ctx, a.jeton, projectId)
    expect(doc.status).toBe(201)
    return { ctx, admin, a, b, c, clientId, projectId, documentId: doc.corps.documentProjet.id }
  }

  test('lecture ouverte à qui a accès au client du projet, modification refusée (403)', async () => {
    const { ctx, b, projectId, documentId } = await preparer()

    const liste = await requete(ctx, 'GET', '/projects', { jeton: b.jeton })
    expect(liste.corps.projects.map((p) => p.id)).toContain(projectId)
    expect((await requete(ctx, 'GET', `/projects/${projectId}`, { jeton: b.jeton })).status).toBe(
      200,
    )
    const sections = await requete(ctx, 'GET', `/projects/${projectId}/sections`, {
      jeton: b.jeton,
    })
    expect(sections.corps.sections.map((s) => s.id)).toEqual(['s1'])
    expect((await requete(ctx, 'GET', '/sections/s1', { jeton: b.jeton })).status).toBe(200)
    expect(
      (await requete(ctx, 'GET', `/project-documents/${documentId}`, { jeton: b.jeton })).status,
    ).toBe(200)

    const phase = await requete(ctx, 'PATCH', `/projects/${projectId}/phase`, {
      jeton: b.jeton,
      body: { phase: 'realisation' },
    })
    expect(phase.status).toBe(403)
    const nouvelleSection = await requete(ctx, 'POST', '/sections', {
      jeton: b.jeton,
      body: section('s2', projectId, b.email),
    })
    expect(nouvelleSection.status).toBe(403)
    const remplacement = await requete(ctx, 'PUT', '/sections/s1', {
      jeton: b.jeton,
      body: section('s1', projectId, b.email),
    })
    expect(remplacement.status).toBe(403)
    expect((await creerDocumentProjet(ctx, b.jeton, projectId)).status).toBe(403)
    const suppression = await requete(ctx, 'DELETE', `/project-documents/${documentId}`, {
      jeton: b.jeton,
    })
    expect(suppression.status).toBe(403)
    expect(await ctx.projectDocumentsRepo.parId(documentId)).not.toBeNull()
  })

  test('sans accès au client ni partage : tout est introuvable (404), rien ne fuit', async () => {
    const { ctx, c, projectId, documentId } = await preparer()

    expect((await requete(ctx, 'GET', '/projects', { jeton: c.jeton })).corps.projects).toEqual([])
    expect((await requete(ctx, 'GET', `/projects/${projectId}`, { jeton: c.jeton })).status).toBe(
      404,
    )
    for (const chemin of [
      `/projects/${projectId}/sections`,
      `/projects/${projectId}/documents`,
      '/sections/s1',
      `/project-documents/${documentId}`,
      `/project-documents/${documentId}/contenu`,
    ]) {
      expect((await requete(ctx, 'GET', chemin, { jeton: c.jeton })).status).toBe(404)
    }
    const toutes = await requete(ctx, 'GET', '/sections', { jeton: c.jeton })
    expect(toutes.corps.sections).toEqual([])

    const ecrasement = await requete(ctx, 'PUT', '/sections/s1/restauration', {
      jeton: c.jeton,
      body: section('s1', projectId, c.email),
    })
    // Restauration réservée aux admins (audit du 25/09/2026) : refusée
    // d'emblée, sans révéler si la section existe.
    expect(ecrasement.status).toBe(403)
    expect((await ctx.sectionsRepo.obtenirSection('s1'))?.ownerId).toBe('a@pharmatech.example')

    const suppression = await requete(ctx, 'DELETE', `/project-documents/${documentId}`, {
      jeton: c.jeton,
    })
    expect(suppression.status).toBe(404)
    expect(await ctx.projectDocumentsRepo.parId(documentId)).not.toBeNull()
  })

  test('partagé en édition : peut modifier, mais ni s’approprier le projet ni en changer le partage', async () => {
    const { ctx, a, b, projectId } = await preparer()
    await requete(ctx, 'POST', `/projects/${projectId}/partage`, {
      jeton: a.jeton,
      body: { userId: b.email, accessLevel: 'édition' },
    })

    const nouvelleSection = await requete(ctx, 'POST', '/sections', {
      jeton: b.jeton,
      body: section('s2', projectId, b.email),
    })
    expect(nouvelleSection.status).toBe(201)

    const projet = (await requete(ctx, 'GET', `/projects/${projectId}`, { jeton: b.jeton })).corps
      .projet
    const appropriation = await requete(ctx, 'PUT', `/projects/${projectId}/restauration`, {
      jeton: b.jeton,
      body: { ...projet, ownerId: b.email },
    })
    expect(appropriation.status).toBe(403)
    // La restauration (synchronisation GitHub) est réservée aux admins
    // depuis l'audit du 25/09/2026 : même une modification de contenu est
    // refusée à un partagé en édition par cette voie.
    const restauration = await requete(ctx, 'PUT', `/projects/${projectId}/restauration`, {
      jeton: b.jeton,
      body: { ...projet, context: 'Mis à jour par B' },
    })
    expect(restauration.status).toBe(403)
  })

  test('jamais un projet créé au nom d’un autre, ni rattaché à un client inaccessible', async () => {
    const { ctx, c, clientId } = await preparer()

    const creation = await requete(ctx, 'POST', '/projects', {
      jeton: c.jeton,
      body: { name: 'Intrus', clientId },
    })
    expect(creation.status).toBe(400)
    expect(creation.corps.erreur).toBe('client_introuvable')

    const restauration = await requete(ctx, 'PUT', '/projects/p-fabrique/restauration', {
      jeton: c.jeton,
      body: {
        id: 'p-fabrique',
        name: 'Fabriqué',
        ownerId: 'a@pharmatech.example',
        sharedWith: [],
        clientId: null,
      },
    })
    expect(restauration.status).toBe(403)
    expect(await ctx.projectsRepo.obtenirProjet('p-fabrique')).toBeNull()
  })

  test('seuls le créateur et un admin gèrent le partage, jamais un partagé en édition', async () => {
    const { ctx, admin, a, b, c, projectId } = await preparer()
    await requete(ctx, 'POST', `/projects/${projectId}/partage`, {
      jeton: a.jeton,
      body: { userId: b.email, accessLevel: 'édition' },
    })

    // B (édition) modifie le contenu, mais ne distribue ni ne retire de droits.
    const ajoutParB = await requete(ctx, 'POST', `/projects/${projectId}/partage`, {
      jeton: b.jeton,
      body: { userId: c.email, accessLevel: 'édition' },
    })
    expect(ajoutParB.status).toBe(403)
    const retraitParB = await requete(
      ctx,
      'DELETE',
      `/projects/${projectId}/partage/${encodeURIComponent(b.email)}`,
      { jeton: b.jeton },
    )
    expect(retraitParB.status).toBe(403)
    const s1 = (await requete(ctx, 'GET', '/sections/s1', { jeton: b.jeton })).corps.section
    const partageSection = await requete(ctx, 'PUT', '/sections/s1', {
      jeton: b.jeton,
      body: { ...s1, sharedWith: [{ userId: c.email, accessLevel: 'édition' }] },
    })
    expect(partageSection.status).toBe(403)
    const contenuSection = await requete(ctx, 'PUT', '/sections/s1', {
      jeton: b.jeton,
      body: { ...s1, values: { contenu: 'Rédigé par B' } },
    })
    expect(contenuSection.status).toBe(200)

    // Le créateur et un admin, eux, peuvent.
    const ajoutParA = await requete(ctx, 'POST', `/projects/${projectId}/partage`, {
      jeton: a.jeton,
      body: { userId: c.email, accessLevel: 'lecture' },
    })
    expect(ajoutParA.status).toBe(200)
    const retraitParAdmin = await requete(
      ctx,
      'DELETE',
      `/projects/${projectId}/partage/${encodeURIComponent(c.email)}`,
      { jeton: admin.jeton },
    )
    expect(retraitParAdmin.status).toBe(200)
    expect(retraitParAdmin.corps.projet.sharedWith.map((p) => p.userId)).toEqual([b.email])
  })

  test('un admin voit et modifie tout', async () => {
    const { ctx, admin, projectId, documentId } = await preparer()
    expect(
      (await requete(ctx, 'GET', `/projects/${projectId}/sections`, { jeton: admin.jeton })).status,
    ).toBe(200)
    const suppression = await requete(ctx, 'DELETE', `/project-documents/${documentId}`, {
      jeton: admin.jeton,
    })
    expect(suppression.status).toBe(200)
  })
})

describe('routerRequete — relais GitHub (le PAT ne quitte jamais le serveur)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  async function preparer() {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    await requete(ctx, 'PUT', '/parametres-installation/github', {
      jeton: admin.jeton,
      body: {
        valeur: { owner: 'acme-corp', repo: 'data', branche: 'main', jeton: 'ghp_secret' },
      },
    })
    const appels: { url: string; init: RequestInit | undefined }[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        appels.push({ url, init })
        return new Response(JSON.stringify({ object: { sha: 'a'.repeat(40) } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'X-RateLimit-Remaining': '4999' },
        })
      }),
    )
    return { ctx, admin, appels }
  }

  test('opération autorisée : relayée vers GitHub avec le PAT ajouté côté serveur', async () => {
    const { ctx, admin, appels } = await preparer()
    const reponse = await routerRequete(
      new Request('https://relais.workers.dev/github/api/repos/acme-corp/data/git/ref/heads/main', {
        headers: { Authorization: `Bearer ${admin.jeton}` },
      }),
      ctx,
    )
    expect(reponse.status).toBe(200)
    expect(reponse.headers.get('X-RateLimit-Remaining')).toBe('4999')
    expect(appels).toHaveLength(1)
    expect(appels[0]?.url).toBe('https://api.github.com/repos/acme-corp/data/git/ref/heads/main')
    expect((appels[0]?.init?.headers as Record<string, string>).Authorization).toBe(
      'Bearer ghp_secret',
    )
  })

  test('sans session -> 401 ; GitHub jamais appelé', async () => {
    const { ctx, appels } = await preparer()
    const reponse = await routerRequete(
      new Request('https://relais.workers.dev/github/api/repos/acme-corp/data/git/ref/heads/main'),
      ctx,
    )
    expect(reponse.status).toBe(401)
    expect(appels).toHaveLength(0)
  })

  test('toute opération hors liste blanche -> 403 ; GitHub jamais appelé', async () => {
    const { ctx, admin, appels } = await preparer()
    const interdits: [string, string, string?][] = [
      ['GET', '/github/api/repos/autre-org/autre-repo/git/ref/heads/main'],
      ['DELETE', '/github/api/repos/acme-corp/data'],
      ['GET', '/github/api/repos/acme-corp/data/collaborators'],
      ['PATCH', '/github/api/repos/acme-corp/data/git/refs/heads/main', '{"sha":"x","force":true}'],
      ['PATCH', '/github/api/repos/acme-corp/data/git/refs/heads/autre-branche', '{"force":false}'],
      ['POST', '/github/api/repos/acme-corp/data/hooks', '{}'],
      ['GET', '/github/api/user/repos'],
    ]
    for (const [methode, chemin, corps] of interdits) {
      const reponse = await routerRequete(
        new Request(`https://relais.workers.dev${chemin}`, {
          method: methode,
          headers: { Authorization: `Bearer ${admin.jeton}` },
          ...(corps ? { body: corps } : {}),
        }),
        ctx,
      )
      expect(reponse.status, `${methode} ${chemin}`).toBe(403)
    }
    expect(appels).toHaveLength(0)
  })

  test('dépôt non configuré -> 404 github_non_configure', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const reponse = await requete(
      ctx,
      'GET',
      '/github/api/repos/acme-corp/data/git/ref/heads/main',
      {
        jeton: admin.jeton,
      },
    )
    expect(reponse.status).toBe(404)
    expect(reponse.corps.erreur).toBe('github_non_configure')
  })
})

describe('routerRequete — relais IA et secrets des paramètres (jamais renvoyés au navigateur)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('/relais-ia : session exigée, jeton du relais ajouté côté serveur, corps relayé tel quel', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const nonConfigure = await requete(ctx, 'POST', '/relais-ia', {
      jeton: admin.jeton,
      body: { mode: 'chat_normatif', question: 'Q' },
    })
    expect(nonConfigure.status).toBe(404)
    expect(nonConfigure.corps.erreur).toBe('relais_ia_non_configure')

    await requete(ctx, 'PUT', '/parametres-installation/relais-ia', {
      jeton: admin.jeton,
      body: { valeur: { relayUrl: 'https://relais-ia.example.workers.dev', jeton: 'jeton-ia' } },
    })
    const appels: { url: string; init: RequestInit | undefined }[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        appels.push({ url, init })
        return new Response(JSON.stringify({ texte: 'Réponse' }), { status: 200 })
      }),
    )

    const sansSession = await requete(ctx, 'POST', '/relais-ia', {
      body: { mode: 'chat_normatif', question: 'Q' },
    })
    expect(sansSession.status).toBe(401)
    expect(appels).toHaveLength(0)

    const message = await requete(ctx, 'POST', '/relais-ia', {
      jeton: admin.jeton,
      body: { mode: 'chat_normatif', question: 'Q' },
    })
    expect(message.status).toBe(200)
    expect(message.corps.texte).toBe('Réponse')
    expect(appels[0]?.url).toBe('https://relais-ia.example.workers.dev')
    expect((appels[0]?.init?.headers as Record<string, string>).Authorization).toBe(
      'Bearer jeton-ia',
    )
    expect(JSON.parse(appels[0]?.init?.body as string)).toEqual({
      mode: 'chat_normatif',
      question: 'Q',
    })
  })

  test('réenregistrer sans secret conserve celui en place (relais IA, Drive normes)', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    await requete(ctx, 'PUT', '/parametres-installation/relais-ia', {
      jeton: admin.jeton,
      body: { valeur: { relayUrl: 'https://a.workers.dev', jeton: 'jeton-ia' } },
    })
    await requete(ctx, 'PUT', '/parametres-installation/relais-ia', {
      jeton: admin.jeton,
      body: { valeur: { relayUrl: 'https://b.workers.dev', jeton: '', jetonConfigure: 'oui' } },
    })
    expect((await ctx.parametresInstallationRepo.obtenir('relais-ia'))?.valeur).toEqual({
      relayUrl: 'https://b.workers.dev',
      jeton: 'jeton-ia',
    })

    await ctx.parametresInstallationRepo.enregistrer(
      'drive-normes',
      { dossierId: 'd1', jeton: '', refreshToken: 'refresh-google' },
      'admin',
    )
    const ajustement = await requete(ctx, 'PUT', '/parametres-installation/drive-normes', {
      jeton: admin.jeton,
      body: { valeur: { dossierId: 'd2', jeton: 'acces-court' } },
    })
    expect(JSON.stringify(ajustement.corps)).not.toContain('refresh-google')
    expect((await ctx.parametresInstallationRepo.obtenir('drive-normes'))?.valeur).toEqual({
      dossierId: 'd2',
      jeton: 'acces-court',
      refreshToken: 'refresh-google',
    })
  })
})

describe('routerRequete — correctifs de l’audit de sécurité du 25/09/2026', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  async function compte(ctx: Contexte, adminJeton: string, email: string) {
    await requete(ctx, 'POST', '/admin/utilisateurs', {
      jeton: adminJeton,
      body: { email, motDePasse: 'MotDePasse!1', nom: 'N', prenom: 'P', role: 'utilisateur' },
    })
    const login = await requete(ctx, 'POST', '/auth/login', {
      body: { email, motDePasse: 'MotDePasse!1' },
    })
    return { email, jeton: login.corps.jeton as string, id: login.corps.utilisateur.id }
  }

  function nouvelleSection(id: string, projectId: string): SectionJson {
    return {
      id,
      projectId,
      templateType: 'oq',
      templateEngineVersion: '0.1.0',
      ownerId: 'quelqu-un-d-autre@ex.com',
      sharedWith: [],
      language: 'fr',
      status: 'brouillon_aide',
      meta: { ref: '', titre: 'OQ', version: '0.1' },
      workflow: { authors: ['x@ex.com'], reviewers: [], approverFinal: null },
      signatures: {
        redacteur: {},
        verificateur: {},
        approbateur: { userId: 'faux@ex.com', date: '2020-01-01' },
      },
      revisions: [],
      values: {},
      tables: {},
      generationSource: { sourceDocumentId: null, generatedFields: [] },
      procedureId: null,
      assetNodeId: null,
      auditLog: [
        { timestamp: '2020-01-01T00:00:00.000Z', actor: 'faux@ex.com', action: 'création' },
      ],
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2020-01-01T00:00:00.000Z',
    }
  }

  /** Admin, un projet, et B partagé en édition dessus. */
  async function preparerSection() {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const b = await compte(ctx, admin.jeton, 'b@pharmatech.example')
    const projectId = (
      await requete(ctx, 'POST', '/projects', { jeton: admin.jeton, body: { name: 'P' } })
    ).corps.projet.id as string
    await requete(ctx, 'POST', `/projects/${projectId}/partage`, {
      jeton: admin.jeton,
      body: { userId: b.email, accessLevel: 'édition' },
    })
    const creation = await requete(ctx, 'POST', '/sections', {
      jeton: b.jeton,
      body: nouvelleSection('s1', projectId),
    })
    return { ctx, admin, b, projectId, creation }
  }

  async function lire(ctx: Contexte, jeton: string, id = 's1'): Promise<SectionJson> {
    return (await requete(ctx, 'GET', `/sections/${id}`, { jeton })).corps.section
  }

  test('C1 — création : propriétaire, historique, signatures et dates imposés par le serveur', async () => {
    const { creation, b } = await preparerSection()
    expect(creation.status).toBe(201)
    const section = creation.corps.section
    expect(section.ownerId).toBe(b.email)
    expect(section.signatures.approbateur).toEqual({})
    expect(section.auditLog).toHaveLength(1)
    expect(section.auditLog[0]).toMatchObject({ actor: b.email, action: 'création' })
    expect(section.auditLog[0]?.timestamp).not.toBe('2020-01-01T00:00:00.000Z')
    expect(section.createdAt).not.toBe('2020-01-01T00:00:00.000Z')
  })

  test('C1 — création : jamais une section déjà vérifiée ou approuvée', async () => {
    const { ctx, b, projectId } = await preparerSection()
    const reponse = await requete(ctx, 'POST', '/sections', {
      jeton: b.jeton,
      body: { ...nouvelleSection('s2', projectId), status: 'valide_en_interne' },
    })
    expect(reponse.status).toBe(400)
    expect(reponse.corps.erreur).toBe('statut_creation_invalide')
  })

  test('C1 — historique en ajout seul, nouvelles entrées attribuées à la personne connectée', async () => {
    const { ctx, b } = await preparerSection()
    const section = await lire(ctx, b.jeton)

    const reecriture = await requete(ctx, 'PUT', '/sections/s1', {
      jeton: b.jeton,
      body: {
        ...section,
        auditLog: [{ timestamp: '2020-01-01T00:00:00.000Z', actor: 'x', action: 'approbation' }],
      },
    })
    expect(reecriture.status).toBe(409)
    expect(reecriture.corps.erreur).toBe('historique_altere')

    const ajout = await requete(ctx, 'PUT', '/sections/s1', {
      jeton: b.jeton,
      body: {
        ...section,
        values: { a: 1 },
        signatures: { ...section.signatures, approbateur: { userId: 'faux', date: '2020' } },
        auditLog: [
          ...section.auditLog,
          {
            timestamp: '2020-01-01T00:00:00.000Z',
            actor: 'admin@pharmatech.example',
            action: 'modification',
          },
        ],
      },
    })
    expect(ajout.status).toBe(200)
    const derniere = ajout.corps.section.auditLog.at(-1)
    expect(derniere?.actor).toBe(b.email)
    expect(derniere?.timestamp).not.toBe('2020-01-01T00:00:00.000Z')
    expect(ajout.corps.section.signatures.approbateur).toEqual({})
  })

  test('C1 — écriture sans entrée d’historique : le serveur en ajoute une', async () => {
    const { ctx, b } = await preparerSection()
    const section = await lire(ctx, b.jeton)
    const reponse = await requete(ctx, 'PUT', '/sections/s1', {
      jeton: b.jeton,
      body: { ...section, values: { a: 2 } },
    })
    expect(reponse.status).toBe(200)
    expect(reponse.corps.section.auditLog).toHaveLength(2)
    expect(reponse.corps.section.auditLog[1]).toMatchObject({
      actor: b.email,
      action: 'modification',
    })
  })

  test('C4 — contrôle de version : une écriture basée sur une version périmée est refusée', async () => {
    const { ctx, b } = await preparerSection()
    const section = await lire(ctx, b.jeton)
    const premiere = await requete(ctx, 'PUT', '/sections/s1', {
      jeton: b.jeton,
      body: { ...section, values: { a: 1 }, versionAttendue: section.updatedAt },
    })
    expect(premiere.status).toBe(200)
    await new Promise((r) => setTimeout(r, 5))
    const perimee = await requete(ctx, 'PUT', '/sections/s1', {
      jeton: b.jeton,
      body: { ...section, tables: { t: [] }, versionAttendue: section.updatedAt },
    })
    expect(perimee.status).toBe(409)
    expect(perimee.corps.erreur).toBe('conflit_version')
  })

  async function amenerEnApprobation(ctx: Contexte, jeton: string, approbateur: string) {
    let s = await lire(ctx, jeton)
    const ecrire = async (changements: Partial<SectionJson>, action: string) => {
      const reponse = await requete(ctx, 'PUT', '/sections/s1', {
        jeton,
        body: {
          ...s,
          ...changements,
          auditLog: [...s.auditLog, { timestamp: 'x', actor: 'x', action }],
        },
      })
      expect(reponse.status, action).toBe(200)
      s = reponse.corps.section
      return s
    }
    await ecrire({ workflow: { ...s.workflow, approverFinal: approbateur } }, 'modification')
    await ecrire({ status: 'en_verification' }, 'changement_statut: engager_verification')
    await ecrire(
      {
        workflow: {
          ...s.workflow,
          reviewers: [{ userId: 'quelqu-un@ex.com', avis: 'OK', date: '2020-01-01' }],
        },
      },
      'avis',
    )
    await ecrire({ status: 'en_approbation' }, 'changement_statut: transmettre_approbation')
    return s
  }

  test('C1/C2 — un avis de relecture est toujours celui de la personne connectée, à l’heure du serveur', async () => {
    const { ctx, b } = await preparerSection()
    const s = await amenerEnApprobation(ctx, b.jeton, b.email)
    expect(s.workflow.reviewers[0]?.userId).toBe(b.email)
    expect(s.workflow.reviewers[0]?.date).not.toBe('2020-01-01')
  })

  test('C1/C2 — transitions contrôlées : pas de saut de statut, gardes vérifiées', async () => {
    const { ctx, b } = await preparerSection()
    const s = await lire(ctx, b.jeton)
    const saut = await requete(ctx, 'PUT', '/sections/s1', {
      jeton: b.jeton,
      body: { ...s, status: 'valide_en_interne' },
    })
    expect(saut.status).toBe(409)
    expect(saut.corps.erreur).toBe('transition_invalide')
    const sansRoles = await requete(ctx, 'PUT', '/sections/s1', {
      jeton: b.jeton,
      body: { ...s, status: 'en_verification' },
    })
    expect(sansRoles.corps.erreur).toBe('roles_manquants')
  })

  test('C2 — approbation réservée à l’approbateur désigné (ou un admin)', async () => {
    const { ctx, admin, b } = await preparerSection()
    const s = await amenerEnApprobation(ctx, b.jeton, admin.utilisateur.email)
    const parB = await requete(ctx, 'PUT', '/sections/s1', {
      jeton: b.jeton,
      body: { ...s, status: 'valide_en_interne' },
    })
    expect(parB.status).toBe(403)
    expect(parB.corps.erreur).toBe('approbateur_requis')
    const parApprobateur = await requete(ctx, 'PUT', '/sections/s1', {
      jeton: admin.jeton,
      body: { ...s, status: 'valide_en_interne' },
    })
    expect(parApprobateur.status).toBe(200)
  })

  test('C2 — après un rejet, les avis du cycle précédent ne suffisent plus', async () => {
    const { ctx, b } = await preparerSection()
    const s = await amenerEnApprobation(ctx, b.jeton, b.email)
    const sansMotif = await requete(ctx, 'PUT', '/sections/s1', {
      jeton: b.jeton,
      body: { ...s, status: 'brouillon_aide' },
    })
    expect(sansMotif.corps.erreur).toBe('motif_requis')
    const rejet = await requete(ctx, 'PUT', '/sections/s1', {
      jeton: b.jeton,
      body: {
        ...s,
        status: 'brouillon_aide',
        auditLog: [...s.auditLog, { timestamp: 'x', actor: 'x', action: 'rejet : incomplet' }],
      },
    })
    expect(rejet.status).toBe(200)
    await new Promise((r) => setTimeout(r, 5))
    let r = rejet.corps.section
    r = (
      await requete(ctx, 'PUT', '/sections/s1', {
        jeton: b.jeton,
        body: { ...r, status: 'en_verification' },
      })
    ).corps.section
    const transmission = await requete(ctx, 'PUT', '/sections/s1', {
      jeton: b.jeton,
      body: { ...r, status: 'en_approbation' },
    })
    expect(transmission.status).toBe(409)
    expect(transmission.corps.erreur).toBe('avis_manquant')
  })

  test('C1 — section validée verrouillée : seul l’historique (export) évolue', async () => {
    const { ctx, b } = await preparerSection()
    const s = await amenerEnApprobation(ctx, b.jeton, b.email)
    const validee = (
      await requete(ctx, 'PUT', '/sections/s1', {
        jeton: b.jeton,
        body: { ...s, status: 'valide_en_interne' },
      })
    ).corps.section
    const modification = await requete(ctx, 'PUT', '/sections/s1', {
      jeton: b.jeton,
      body: { ...validee, values: { a: 'changé' } },
    })
    expect(modification.status).toBe(409)
    expect(modification.corps.erreur).toBe('section_verrouillee')
    const exportJournalise = await requete(ctx, 'PUT', '/sections/s1', {
      jeton: b.jeton,
      body: {
        ...validee,
        auditLog: [...validee.auditLog, { timestamp: 'x', actor: 'x', action: 'export' }],
      },
    })
    expect(exportJournalise.status).toBe(200)
    expect(exportJournalise.corps.section.auditLog.at(-1)).toMatchObject({
      actor: b.email,
      action: 'export',
    })
  })

  test('M2 — le partage de section ne donne aucun droit hors du projet, et suit la révocation', async () => {
    const { ctx, admin, b, projectId } = await preparerSection()
    const c = await compte(ctx, admin.jeton, 'c@pharmatech.example')
    const s = await lire(ctx, b.jeton)
    // B (partagé en édition) ne peut pas distribuer de droits…
    const partage = await requete(ctx, 'PUT', '/sections/s1', {
      jeton: b.jeton,
      body: { ...s, sharedWith: [{ userId: c.email, accessLevel: 'édition' }] },
    })
    expect(partage.status).toBe(403)
    // …et une section partagée par un admin à C, sans accès au projet, reste invisible pour C.
    await requete(ctx, 'PUT', '/sections/s1', {
      jeton: admin.jeton,
      body: { ...s, sharedWith: [{ userId: c.email, accessLevel: 'édition' }] },
    })
    expect((await requete(ctx, 'GET', '/sections/s1', { jeton: c.jeton })).status).toBe(404)
    // Après retrait du partage du projet, B perd l'écriture et la lecture.
    await requete(ctx, 'DELETE', `/projects/${projectId}/partage/${encodeURIComponent(b.email)}`, {
      jeton: admin.jeton,
    })
    expect((await requete(ctx, 'GET', '/sections/s1', { jeton: b.jeton })).status).toBe(404)
  })

  test('C2 — migration locale client : historique marqué, `auditLog` non tableau refusé, appel consigné', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const clientId = (
      await requete(ctx, 'POST', '/clients', { jeton: admin.jeton, body: { name: 'C' } })
    ).corps.client.id as string
    const empoisonne = await requete(
      ctx,
      'POST',
      `/clients/${clientId}/structure-systeme/noeuds/migration-locale`,
      { jeton: admin.jeton, body: { noeuds: [{ id: 'n1', auditLog: null }] } },
    )
    expect(empoisonne.status).toBe(400)
    const audit = await requete(ctx, 'GET', '/admin/audit', { jeton: admin.jeton })
    expect(audit.corps.entrees.some((e) => e.action === 'migration_locale')).toBe(false)
  })

  test('C2/M3 — restauration réservée aux admins ; elle ne raccourcit jamais l’historique', async () => {
    const { ctx, admin, b, projectId } = await preparerSection()
    const s = await lire(ctx, b.jeton)
    const parB = await requete(ctx, 'PUT', '/sections/s1/restauration', {
      jeton: b.jeton,
      body: s,
    })
    expect(parB.status).toBe(403)
    const projet = (await requete(ctx, 'GET', `/projects/${projectId}`, { jeton: admin.jeton }))
      .corps.projet
    const raccourci = await requete(ctx, 'PUT', `/projects/${projectId}/restauration`, {
      jeton: admin.jeton,
      body: { ...projet, auditLog: [] },
    })
    expect(raccourci.status).toBe(200)
    expect(raccourci.corps.projet.auditLog.slice(0, projet.auditLog.length)).toEqual(
      projet.auditLog,
    )
    expect(raccourci.corps.projet.auditLog.at(-1)?.action).toBe('restauration_github')
  })

  test('M1 — document normatif : ni renommage ni remplacement par un tiers ; réparation seulement si vide', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const tiers = await compte(ctx, admin.jeton, 'tiers@pharmatech.example')
    const creation = await creerDocumentNormatif(ctx, admin.jeton, {
      contenu: {
        octets: new Uint8Array([1, 2, 3]),
        nomFichier: 'a.pdf',
        typeMime: 'application/pdf',
      },
    })
    const id = creation.corps.document.id
    const renommage = await requete(ctx, 'PATCH', `/documents-normatifs/${id}`, {
      jeton: tiers.jeton,
      body: { titre: 'Falsifié' },
    })
    expect(renommage.status).toBe(403)
    const remplacement = await routerRequete(
      new Request(`https://relais.workers.dev/documents-normatifs/${id}/contenu`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${tiers.jeton}`, 'Content-Type': 'text/html' },
        body: '<script>alert(1)</script>',
      }),
      ctx,
    )
    expect(remplacement.status).toBe(403)
    const parAdmin = await routerRequete(
      new Request(`https://relais.workers.dev/documents-normatifs/${id}/contenu`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${admin.jeton}` },
        body: 'autre',
      }),
      ctx,
    )
    expect(parAdmin.status).toBe(409)
    const lecture = await routerRequete(
      new Request(`https://relais.workers.dev/documents-normatifs/${id}/contenu`, {
        headers: { Authorization: `Bearer ${admin.jeton}` },
      }),
      ctx,
    )
    expect(lecture.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })

  test('M3 — relais GitHub réservé aux admins, sans autre branche ni chemin encodé', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const b = await compte(ctx, admin.jeton, 'b@pharmatech.example')
    await requete(ctx, 'PUT', '/parametres-installation/github', {
      jeton: admin.jeton,
      body: { valeur: { owner: 'acme', repo: 'data', branche: 'main', jeton: 'ghp_x' } },
    })
    const appels: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        appels.push(url)
        return new Response('{}', { status: 200 })
      }),
    )
    const appeler = (jeton: string, chemin: string) =>
      routerRequete(
        new Request(`https://relais.workers.dev/github/api/repos/acme/data/${chemin}`, {
          headers: { Authorization: `Bearer ${jeton}` },
        }),
        ctx,
      )
    expect((await appeler(b.jeton, 'contents/data/a.json?ref=main')).status).toBe(403)
    expect((await appeler(admin.jeton, 'contents/data/a.json?ref=autre')).status).toBe(403)
    expect((await appeler(admin.jeton, 'contents/..%2F..%2Fuser?ref=main')).status).toBe(403)
    expect(appels).toHaveLength(0)
    expect((await appeler(admin.jeton, 'contents/data/a%20b.json?ref=main')).status).toBe(200)
  })

  test('M4 — jeton Drive réservé aux admins', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const b = await compte(ctx, admin.jeton, 'b@pharmatech.example')
    const reponse = await requete(ctx, 'POST', '/drive-oauth/rafraichir-jeton', { jeton: b.jeton })
    expect(reponse.status).toBe(403)
  })

  test('M6 — l’identifiant d’audit renvoyé par authorize-action est celui réellement consigné', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const reponse = await requete(ctx, 'POST', '/audit/authorize-action', {
      jeton: admin.jeton,
      body: { action: 'test', targetType: 'client', targetId: 'c1', justification: 'j' },
    })
    const audit = await requete(ctx, 'GET', '/admin/audit', { jeton: admin.jeton })
    expect(audit.corps.entrees.some((e) => e.id === reponse.corps.auditId)).toBe(true)
  })

  test('M7 — connexion bloquée après 5 échecs, même pour le bon mot de passe', async () => {
    const ctx = { ...nouveauContexte(), limiteurConnexion: new LimiteurConnexion() }
    await bootstrapAdmin(ctx)
    for (let i = 0; i < 5; i++) {
      const echec = await requete(ctx, 'POST', '/auth/login', {
        body: { email: 'admin@pharmatech.example', motDePasse: 'faux' },
      })
      expect(echec.status).toBe(401)
    }
    const bloque = await requete(ctx, 'POST', '/auth/login', {
      body: { email: 'admin@pharmatech.example', motDePasse: 'CoffreFort!2026' },
    })
    expect(bloque.status).toBe(429)
    expect(bloque.corps.erreur).toBe('trop_de_tentatives')
  })

  test('M7 — les échecs d’un compte ne bloquent pas les collègues de la même adresse IP', async () => {
    const ctx = { ...nouveauContexte(), limiteurConnexion: new LimiteurConnexion() }
    await bootstrapAdmin(ctx)
    const depuisBureau = (email: string, motDePasse: string) =>
      routerRequete(
        new Request('https://relais.workers.dev/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.7' },
          body: JSON.stringify({ email, motDePasse }),
        }),
        ctx,
      )
    for (let i = 0; i < 6; i++) await depuisBureau('collegue@pharmatech.example', 'faux')
    const admin = await depuisBureau('admin@pharmatech.example', 'CoffreFort!2026')
    expect(admin.status).toBe(200)
  })

  test('M8 — changer de mot de passe révoque les autres sessions ; la session courante reçoit un nouveau jeton', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const autreSession = (
      await requete(ctx, 'POST', '/auth/login', {
        body: { email: 'admin@pharmatech.example', motDePasse: 'CoffreFort!2026' },
      })
    ).corps.jeton
    const changement = await requete(ctx, 'POST', '/auth/change-password', {
      jeton: admin.jeton,
      body: { motDePasseActuel: 'CoffreFort!2026', nouveauMotDePasse: 'NouveauCoffre!2026' },
    })
    expect(changement.status).toBe(200)
    expect((await requete(ctx, 'GET', '/auth/me', { jeton: autreSession })).status).toBe(401)
    expect((await requete(ctx, 'GET', '/auth/me', { jeton: admin.jeton })).status).toBe(401)
    expect((await requete(ctx, 'GET', '/auth/me', { jeton: changement.corps.jeton })).status).toBe(
      200,
    )
  })

  test('m3 — exception imprévue : JSON 500 avec en-têtes CORS, jamais une page HTML', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    ctx.clientsRepo.listerVisiblesPar = () => Promise.reject(new Error('panne D1'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const reponse = await routerRequete(
      new Request('https://relais.workers.dev/clients', {
        headers: { Authorization: `Bearer ${admin.jeton}` },
      }),
      ctx,
    )
    expect(reponse.status).toBe(500)
    expect(await reponse.json()).toEqual({ erreur: 'erreur_interne' })
    expect(reponse.headers.get('Access-Control-Allow-Origin')).toBeTruthy()
  })
})
