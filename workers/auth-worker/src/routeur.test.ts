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
import { CSVAssessmentRepoMemoire } from './repos/csvAssessmentRepo'
import { DocumentsNormatifsRepoMemoire } from './repos/documentsNormatifsRepo'
import { ExecutionRepoMemoire } from './repos/executionRepo'
import { ImpactAssessmentRepoMemoire } from './repos/impactAssessmentRepo'
import { OrganisationRepoMemoire } from './repos/organisationRepo'
import { ParametersRepoMemoire } from './repos/parametersRepo'
import { ParametresInstallationRepoMemoire } from './repos/parametresInstallationRepo'
import { ProjectDocumentsRepoMemoire } from './repos/projectDocumentsRepo'
import { ProcessContextRepoMemoire } from './repos/processContextRepo'
import { ProjectsRepoMemoire } from './repos/projectsRepo'
import { QualityEventRepoMemoire } from './repos/qualityEventRepo'
import { RiskAssessmentRepoMemoire } from './repos/riskAssessmentRepo'
import { TestDefinitionRepoMemoire } from './repos/testDefinitionRepo'
import { SectionsRepoMemoire } from './repos/sectionsRepo'
import { StockageBinaireRepoMemoire } from './repos/stockageBinaireRepo'
import { StructureSystemeRepoMemoire } from './repos/structureSystemeRepo'
import { UtilisateursRepoMemoire } from './repos/utilisateursRepo'
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

    const suppression = await requete(ctx, 'DELETE', `/clients/${clientId}`, {
      jeton: admin.jeton,
      body: { justification: 'Client fermé, RGPD, demande écrite du 04/09/2026' },
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
        origine: 'production',
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
        origine: 'audit',
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
        origine: 'production',
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
        origine: 'audit',
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
      origine: 'production',
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
    expect(migration.corps.projects).toEqual([projetLocal])

    const obtenir = await requete(ctx, 'GET', `/projects/${projetLocal.id}`, { jeton: admin.jeton })
    expect(obtenir.corps.projet.createdAt).toBe('2025-01-01T00:00:00.000Z')
    expect(obtenir.corps.projet.auditLog).toEqual(projetLocal.auditLog)

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

    const sectionModifiee = {
      ...sectionMinimale('id-different-ignoré', 'projet-different-ignoré'),
      status: 'en_verification',
      auditLog: [
        ...sectionMinimale('s1', projectId).auditLog,
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
    expect(migration.corps.sections).toEqual([sectionLocale])

    const obtenir = await requete(ctx, 'GET', '/sections/s-locale', { jeton: admin.jeton })
    expect(obtenir.corps.section.createdAt).toBe('2025-01-01T00:00:00.000Z')

    const remplacement = await requete(ctx, 'PUT', '/sections/s-locale', {
      jeton: admin.jeton,
      body: { ...sectionLocale, status: 'en_verification' },
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

describe('routerRequete — paramètres d’installation (dépôt GitHub, Relais IA, Drive normes)', () => {
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
    expect(lecture.corps.parametre?.valeur).toEqual({
      owner: 'acme-corp',
      repo: 'validapharm-data',
      branche: 'main',
      jeton: 'ghp_xxx',
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
    expect(parametre.corps.parametre?.valeur).toMatchObject({
      dossierId: 'dossier-existant-1',
      refreshToken: 'jeton-refresh-1',
    })

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
