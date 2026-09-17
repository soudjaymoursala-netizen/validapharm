import { IndisponibleAuthError, ReponseInvalideAuthError, TimeoutAuthError } from './erreurs'

export interface UtilisateurWire {
  id: string
  email: string
  nom: string
  prenom: string
  role: 'admin' | 'utilisateur'
  statut: 'actif' | 'desactive'
  createdAt: string
}

export interface ClientWire {
  id: string
  name: string
  adresse: string | null
  secteur: 'pharmaceutique' | 'dispositif_medical' | 'autre' | null
  details: string | null
  statut: 'actif' | 'archive'
  archivedAt: string | null
  archivedBy: string | null
  createdByUserId: string
  sharedWith: string[]
  createdAt: string
  updatedAt: string
}

export interface EntreeAuditWire {
  id: string
  acteurUserId: string
  acteurEmail: string
  action: string
  targetType: string
  targetId: string
  justification: string | null
  timestamp: string
}

export interface ParametreInstallationWire {
  cle: string
  valeur: Record<string, string>
  updatedAt: string
  updatedBy: string
}

export interface DocumentNormatifWire {
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

export interface NiveauHierarchieWire {
  key: string
  label: Record<'fr' | 'en' | 'de', string>
  numberingPattern: string
}

export interface AssetHierarchySchemaWire {
  clientId: string
  levels: NiveauHierarchieWire[]
}

export interface AssetNodeWire {
  id: string
  clientId: string
  workspaceId: string | null
  levelKey: string
  name: string
  code: string
  parentId: string | null
  associatedNodes: string[]
  source: 'manuel' | 'qms_pull' | 'import_fichier'
  qmsConnectorId: string | null
  periodicQualification: { applicable: boolean; deadline: string | null }
  qualificationStatus: string
  auditLog: { timestamp: string; actor: string; action: string }[]
  createdAt: string
  updatedAt: string
}

export interface RelationTechniqueWire {
  id: string
  clientId: string
  typeRelation: string
  noeudSourceId: string
  noeudCibleId: string
  createdAt: string
}

export interface SaisieCreationNoeudWire {
  /** Réservé à l'import en lot (`creerNoeudsEnLot`) — voir sa documentation pour pourquoi le client impose l'identifiant dans ce cas précis. Ignoré par `creerNoeud` (création manuelle). */
  id?: string
  levelKey: string
  name: string
  code: string
  parentId: string | null
  workspaceId?: string | null
}

export interface QuestionACFCWire {
  id: string
  texte: Partial<Record<'fr' | 'en' | 'de', string>>
  famille?: string
}

export interface MethodProfileACFCWire {
  id: string
  clientId: string
  version: string
  effectiveDate: string
  source: string
  origin: string
  questions: QuestionACFCWire[]
  decisionRule: string
  createdAt: string
}

export interface EvaluationACFCWire {
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

export interface SaisieCreationProfilAcfcWire {
  version: string
  source: string
  origin: string
  questions: QuestionACFCWire[]
  decisionRule: string
}

export interface SaisieCreationEvaluationAcfcWire {
  methodProfileId: string
  methodProfileVersion: string
  assetNodeId: string | null
  nomElement: string
  reponses: Record<string, string>
  verdict: string | null
}

export interface ParameterWire {
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

export interface ClassificationCriticiteParametreWire {
  id: string
  clientId: string
  parameterId: string
  niveau: string
  contexte: string | null
  justification: string
  auditLog: { timestamp: string; actor: string; action: string }[]
  createdAt: string
}

export interface CPPWire {
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

export interface CQAWire {
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

export interface SaisieCreationParametreWire {
  nom: string
  description: string
  unite: string | null
  assetNodeId: string | null
}

export interface SaisieCreationClassificationWire {
  parameterId: string
  niveau: string
  contexte: string | null
  justification: string
}

export interface SaisieCreationCPPWire {
  parameterId: string
  contexte: string
  justification: string
}

export interface SaisieCreationCQAWire {
  nom: string
  description: string
  contexte: string
  justification: string
}

export interface QuestionImpactAssessmentWire {
  id: string
  texte: Partial<Record<'fr' | 'en' | 'de', string>>
}

export interface MethodProfileImpactAssessmentWire {
  id: string
  clientId: string
  version: string
  effectiveDate: string
  source: string
  origin: string
  questions: QuestionImpactAssessmentWire[]
  decisionRule: string
  createdAt: string
}

export interface EvaluationImpactAssessmentWire {
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

export interface SaisieCreationProfilImpactAssessmentWire {
  version: string
  source: string
  origin: string
  questions: QuestionImpactAssessmentWire[]
  decisionRule: string
}

export interface SaisieCreationEvaluationImpactAssessmentWire {
  methodProfileId: string
  methodProfileVersion: string
  assetNodeId: string | null
  nomElement: string
  reponses: Record<string, string>
  verdict: string | null
}

export interface EvaluationCSVAssessmentWire {
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

export interface SaisieCreationEvaluationCsvAssessmentWire {
  assetNodeId: string | null
  nomSysteme: string
  categorieGamp5: number
  justificationCategorie: string
  pertinenceGxp: boolean
  pertinenceEresPart11: boolean
  justificationPertinence: string
}

export interface MethodProfileRiskAssessmentWire {
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

export interface RiskAssessmentWire {
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

export interface SaisieCreationProfilRiskAssessmentWire {
  version: string
  source: string
  origin: string
  echelleMin: number
  echelleMax: number
  seuilAction: number
}

export interface SaisieCreationEvaluationRiskAssessmentWire {
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
}

export interface SaisieActionResiduelleRiskAssessmentWire {
  recommandation: string | null
  responsable: string | null
  dateCible: string | null
  actionsMenees: string | null
  severiteResiduelle: number | null
  occurrenceResiduelle: number | null
  detectabiliteResiduelle: number | null
  iprResiduel: number | null
  verdictResiduel: string | null
}

export interface ProcessWire {
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

export interface FonctionActifWire {
  id: string
  clientId: string
  nom: string
  description: string
  auditLog: { timestamp: string; actor: string; action: string }[]
  createdAt: string
  updatedAt: string
}

export interface AssociationFonctionAssetNodeWire {
  id: string
  clientId: string
  functionId: string
  assetNodeId: string
  createdAt: string
}

export interface AssociationFonctionProcessWire {
  id: string
  clientId: string
  functionId: string
  processId: string
  createdAt: string
}

export interface ManufacturingContextWire {
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

export interface SaisieCreationProcessWire {
  nom: string
  description: string
  type: string
  sourceId: string | null
}

export interface SaisieCreationFonctionWire {
  nom: string
  description: string
}

export interface SaisieCreationAssociationFonctionAssetNodeWire {
  functionId: string
  assetNodeId: string
}

export interface SaisieCreationAssociationFonctionProcessWire {
  functionId: string
  processId: string
}

export interface SaisieCreationManufacturingContextWire {
  assetNodeId: string
  processId: string
  produit: string
  recette: string | null
  format: string | null
  configuration: string | null
}

export interface QualityEventWire {
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

export interface ReferenceQualityEventWire {
  id: string
  clientId: string
  qualityEventSourceId: string
  qualityEventCibleId: string
  createdAt: string
}

export interface SaisieCreationQualityEventWire {
  type: string
  titre: string
  description: string
  origine: string
  referenceExterne: { systeme: string; identifiant: string } | null
  assetNodeId: string | null
  processId: string | null
  manufacturingContextId: string | null
}

export interface SaisieCreationReferenceQualityEventWire {
  sourceId: string
  cibleId: string
}

export interface RequirementWire {
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

export interface TestObjectiveWire {
  id: string
  clientId: string
  requirementId: string
  titre: string
  description: string
  createdAt: string
  updatedAt: string
}

export interface TestCandidateWire {
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

export interface EtapeTestWire {
  id: string
  ordre: number
  action: string
  resultatAttendu: string
}

export interface TestWire {
  id: string
  clientId: string
  testCandidateId: string
  titre: string
  description: string
  etapes: EtapeTestWire[]
  statut: string
  auditLog: { timestamp: string; actor: string; action: string }[]
  createdAt: string
  updatedAt: string
}

export interface CouvertureWire {
  id: string
  clientId: string
  requirementId: string
  testId: string
  createdAt: string
}

export interface SaisieCreationRequirementWire {
  reference: string
  titre: string
  description: string
  assetNodeId: string | null
  processId: string | null
}

export interface SaisieCreationTestObjectiveWire {
  requirementId: string
  titre: string
  description: string
}

export interface SaisieCreationTestCandidateWire {
  testObjectiveId: string
  titre: string
  description: string
}

export interface SaisieCandidatDepuisRisquesWire {
  testObjectiveId: string
  riskAssessmentId: string | null
  titre: string
  description: string
}

export interface SaisieCreationTestWire {
  testCandidateId: string
  titre: string
  description: string
  etapes: { ordre: number; action: string; resultatAttendu: string }[]
}

export interface SaisieCreationCouvertureWire {
  requirementId: string
  testId: string
}

export interface OrganizationWire {
  id: string
  nom: string
  createdAt: string
}

export interface WorkspaceWire {
  id: string
  organizationId: string
  type: string
  nom: string
  parentWorkspaceId: string | null
  createdAt: string
}

export interface ProjectWire {
  id: string
  name: string
  context: string
  scopeIn: string
  scopeOut: string
  deadline: string | null
  languageDefault: 'fr' | 'en' | 'de'
  clientId: string | null
  sections: string[]
  documents: string[]
  links: { fromSectionId: string; toSectionId: string; createdBy: string; createdAt: string }[]
  statut: 'actif' | 'suspendu' | 'archive' | 'supprime'
  phase: 'concept' | 'realisation' | 'operation' | 'retrait'
  ownerId: string
  sharedWith: { userId: string; accessLevel: 'lecture' | 'édition' }[]
  archivedAt: string | null
  archivedBy: string | null
  auditLog: { timestamp: string; actor: string; action: string }[]
  createdAt: string
  updatedAt: string
}

export interface SectionWire {
  id: string
  projectId: string
  templateType: string
  templateEngineVersion: string
  ownerId: string
  sharedWith: { userId: string; accessLevel: 'lecture' | 'édition' }[]
  language: 'fr' | 'en' | 'de'
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
  tables: Record<string, Array<Record<string, string | number | null>>>
  generationSource: { sourceDocumentId: string | null; generatedFields: string[] }
  procedureId: string | null
  assetNodeId: string | null
  auditLog: { timestamp: string; actor: string; action: string }[]
  createdAt: string
  updatedAt: string
}

export interface ProjectDocumentWire {
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

export interface SaisieCreationDocumentProjet {
  /** Réservé au filet de sécurité de migration locale (`migrerDocumentsLocaux`) — jamais fabriqué par un appel de création normal. */
  id?: string
  projectId: string
  filename: string
  status?: string
  mimeType: string
  texte: string
  contenu?: Blob
}

export interface SaisieCreationDocumentNormatif {
  category: string
  titre: string
  filename: string
  source: string
  sourceRef?: string | null
  mimeType: string
  texte: string
  contenu?: Blob
}

export type ResultatApi<T> =
  { ok: true; donnees: T } | { ok: false; erreur: string; status: number }

const DELAI_MAX_PAR_DEFAUT_MS = 15_000

/**
 * Client du Worker d'authentification — mêmes principes que
 * `RelayProviderAdapter`/`OcrRelayAdapter` : n'expose que l'URL du relais,
 * jamais l'implémentation D1 sous-jacente. Renvoie un `ResultatApi<T>`
 * typé pour tout échec métier attendu (identifiants invalides, rôle
 * insuffisant, justification manquante...) — jamais une exception pour un
 * cas prévu par la conception (même discipline que
 * `archiverClient`/`modifierClient`) ; les erreurs levées
 * (`IndisponibleAuthError`/`TimeoutAuthError`/`ReponseInvalideAuthError`)
 * restent réservées aux échecs de connectivité réels.
 */
export class AuthApiClient {
  constructor(
    private readonly relayUrl: string,
    private readonly delaiMaxMs: number = DELAI_MAX_PAR_DEFAUT_MS,
  ) {}

  // --- Vérification de connexion (« Tester la connexion », avant toute
  // authentification réelle — voir routeur.ts du Worker) ---

  verifierSante(): Promise<ResultatApi<{ ok: true }>> {
    return this.requete('GET', '/sante')
  }

  // --- Authentification ---

  login(
    email: string,
    motDePasse: string,
  ): Promise<ResultatApi<{ jeton: string; utilisateur: UtilisateurWire }>> {
    return this.requete('POST', '/auth/login', { body: { email, motDePasse } })
  }

  me(jeton: string): Promise<ResultatApi<{ utilisateur: UtilisateurWire }>> {
    return this.requete('GET', '/auth/me', { jeton })
  }

  modifierProfil(
    jeton: string,
    changements: { nom?: string; prenom?: string },
  ): Promise<ResultatApi<{ utilisateur: UtilisateurWire }>> {
    return this.requete('PATCH', '/auth/me', { jeton, body: changements })
  }

  changerMotDePasse(
    jeton: string,
    motDePasseActuel: string,
    nouveauMotDePasse: string,
  ): Promise<ResultatApi<{ ok: true }>> {
    return this.requete('POST', '/auth/change-password', {
      jeton,
      body: { motDePasseActuel, nouveauMotDePasse },
    })
  }

  verifierMotDePasse(jeton: string, motDePasse: string): Promise<ResultatApi<{ valide: boolean }>> {
    return this.requete('POST', '/auth/verify-password', { jeton, body: { motDePasse } })
  }

  // --- Administration des comptes ---

  listerUtilisateurs(jeton: string): Promise<ResultatApi<{ utilisateurs: UtilisateurWire[] }>> {
    return this.requete('GET', '/admin/utilisateurs', { jeton })
  }

  creerUtilisateur(
    jeton: string,
    saisie: {
      email: string
      motDePasse: string
      nom: string
      prenom: string
      role: 'admin' | 'utilisateur'
    },
  ): Promise<ResultatApi<{ utilisateur: UtilisateurWire }>> {
    return this.requete('POST', '/admin/utilisateurs', { jeton, body: saisie })
  }

  modifierUtilisateur(
    jeton: string,
    id: string,
    changements: { role?: 'admin' | 'utilisateur'; statut?: 'actif' | 'desactive' },
  ): Promise<ResultatApi<{ utilisateur: UtilisateurWire }>> {
    return this.requete('PATCH', `/admin/utilisateurs/${id}`, { jeton, body: changements })
  }

  // --- Audit ---

  listerAudit(jeton: string, limite = 50): Promise<ResultatApi<{ entrees: EntreeAuditWire[] }>> {
    return this.requete('GET', `/admin/audit?limite=${limite}`, { jeton })
  }

  autoriserAction(
    jeton: string,
    saisie: { action: string; targetType: string; targetId: string; justification: string },
  ): Promise<ResultatApi<{ authorized: true; auditId: string }>> {
    return this.requete('POST', '/audit/authorize-action', { jeton, body: saisie })
  }

  // --- Clients (D1 = source de vérité) ---

  listerClients(jeton: string): Promise<ResultatApi<{ clients: ClientWire[] }>> {
    return this.requete('GET', '/clients', { jeton })
  }

  creerClient(
    jeton: string,
    saisie: {
      name: string
      adresse?: string | null
      secteur?: ClientWire['secteur']
      details?: string | null
    },
  ): Promise<ResultatApi<{ client: ClientWire }>> {
    return this.requete('POST', '/clients', { jeton, body: saisie })
  }

  obtenirClient(jeton: string, id: string): Promise<ResultatApi<{ client: ClientWire }>> {
    return this.requete('GET', `/clients/${id}`, { jeton })
  }

  modifierClient(
    jeton: string,
    id: string,
    changements: Partial<{
      name: string
      adresse: string | null
      secteur: ClientWire['secteur']
      details: string | null
      statut: ClientWire['statut']
      sharedWith: string[]
    }>,
  ): Promise<ResultatApi<{ client: ClientWire }>> {
    return this.requete('PATCH', `/clients/${id}`, { jeton, body: changements })
  }

  supprimerClientDefinitivement(
    jeton: string,
    id: string,
    justification: string,
  ): Promise<ResultatApi<{ ok: true }>> {
    return this.requete('DELETE', `/clients/${id}`, { jeton, body: { justification } })
  }

  // --- Structure Système (référentiel d'actifs, D1 = source de vérité, Phase 1 du chantier de migration D1) ---

  obtenirStructureSysteme(
    jeton: string,
    clientId: string,
  ): Promise<
    ResultatApi<{
      schema: AssetHierarchySchemaWire
      noeuds: AssetNodeWire[]
      relationsTechniques: RelationTechniqueWire[]
    }>
  > {
    return this.requete('GET', `/clients/${clientId}/structure-systeme`, { jeton })
  }

  enregistrerSchemaHierarchie(
    jeton: string,
    clientId: string,
    levels: NiveauHierarchieWire[],
  ): Promise<ResultatApi<{ schema: AssetHierarchySchemaWire }>> {
    return this.requete('PUT', `/clients/${clientId}/structure-systeme/schema`, {
      jeton,
      body: { levels },
    })
  }

  creerNoeud(
    jeton: string,
    clientId: string,
    saisie: SaisieCreationNoeudWire,
  ): Promise<ResultatApi<{ noeud: AssetNodeWire }>> {
    return this.requete('POST', `/clients/${clientId}/structure-systeme/noeuds`, {
      jeton,
      body: saisie,
    })
  }

  creerNoeudsEnLot(
    jeton: string,
    clientId: string,
    noeuds: SaisieCreationNoeudWire[],
    action: string,
  ): Promise<ResultatApi<{ noeuds: AssetNodeWire[] }>> {
    return this.requete('POST', `/clients/${clientId}/structure-systeme/noeuds/lot`, {
      jeton,
      body: { noeuds, action },
    })
  }

  modifierNoeud(
    jeton: string,
    clientId: string,
    noeudId: string,
    changements: {
      parentId?: string | null
      qualificationStatus?: string
      periodicQualification?: { applicable: boolean; deadline: string | null }
      action?: string
    },
  ): Promise<ResultatApi<{ noeud: AssetNodeWire }>> {
    return this.requete('PATCH', `/clients/${clientId}/structure-systeme/noeuds/${noeudId}`, {
      jeton,
      body: changements,
    })
  }

  /** Réservé au filet de sécurité de migration locale — voir la documentation de la route Worker `gererMigrerNoeudsLocaux` : seule voie qui accepte un nœud déjà complet (statut de qualification/périodicité/journal d'audit/horodatages d'origine), jamais fabriqués ici. */
  migrerNoeudsLocaux(
    jeton: string,
    clientId: string,
    noeuds: Omit<AssetNodeWire, 'clientId'>[],
  ): Promise<ResultatApi<{ noeuds: AssetNodeWire[] }>> {
    return this.requete('POST', `/clients/${clientId}/structure-systeme/noeuds/migration-locale`, {
      jeton,
      body: { noeuds },
    })
  }

  creerRelationTechnique(
    jeton: string,
    clientId: string,
    saisie: { typeRelation: string; noeudSourceId: string; noeudCibleId: string },
  ): Promise<ResultatApi<{ relation: RelationTechniqueWire }>> {
    return this.requete('POST', `/clients/${clientId}/structure-systeme/relations-techniques`, {
      jeton,
      body: saisie,
    })
  }

  // --- ACFC (méthode configurable par client, F2 du catalogue §10, Phase 4a du chantier de migration D1) ---

  obtenirAcfc(
    jeton: string,
    clientId: string,
  ): Promise<ResultatApi<{ profils: MethodProfileACFCWire[]; evaluations: EvaluationACFCWire[] }>> {
    return this.requete('GET', `/clients/${clientId}/acfc`, { jeton })
  }

  creerProfilAcfc(
    jeton: string,
    clientId: string,
    saisie: SaisieCreationProfilAcfcWire,
  ): Promise<ResultatApi<{ profil: MethodProfileACFCWire }>> {
    return this.requete('POST', `/clients/${clientId}/acfc/profils`, { jeton, body: saisie })
  }

  creerEvaluationAcfc(
    jeton: string,
    clientId: string,
    saisie: SaisieCreationEvaluationAcfcWire,
  ): Promise<ResultatApi<{ evaluation: EvaluationACFCWire }>> {
    return this.requete('POST', `/clients/${clientId}/acfc/evaluations`, { jeton, body: saisie })
  }

  /** Réservé au filet de sécurité de migration locale — voir la documentation de la route Worker `gererMigrerAcfcLocal` : idempotente, l'existant côté serveur gagne toujours. */
  migrerAcfcLocal(
    jeton: string,
    clientId: string,
    donnees: { profils: MethodProfileACFCWire[]; evaluations: EvaluationACFCWire[] },
  ): Promise<ResultatApi<{ profils: MethodProfileACFCWire[]; evaluations: EvaluationACFCWire[] }>> {
    return this.requete('POST', `/clients/${clientId}/acfc/migration-locale`, {
      jeton,
      body: donnees,
    })
  }

  // --- Parameter/ClassificationCriticiteParametre/CPP/CQA (Target Architecture §10, Phase 4b du chantier de migration D1) ---

  obtenirParameters(
    jeton: string,
    clientId: string,
  ): Promise<
    ResultatApi<{
      parametresProcede: ParameterWire[]
      classifications: ClassificationCriticiteParametreWire[]
      cpps: CPPWire[]
      cqas: CQAWire[]
    }>
  > {
    return this.requete('GET', `/clients/${clientId}/parameters`, { jeton })
  }

  creerParametre(
    jeton: string,
    clientId: string,
    saisie: SaisieCreationParametreWire,
  ): Promise<ResultatApi<{ parametreProcede: ParameterWire }>> {
    return this.requete('POST', `/clients/${clientId}/parameters/parametres`, {
      jeton,
      body: saisie,
    })
  }

  creerClassificationCriticiteParametre(
    jeton: string,
    clientId: string,
    saisie: SaisieCreationClassificationWire,
  ): Promise<ResultatApi<{ classification: ClassificationCriticiteParametreWire }>> {
    return this.requete('POST', `/clients/${clientId}/parameters/classifications`, {
      jeton,
      body: saisie,
    })
  }

  declarerCPP(
    jeton: string,
    clientId: string,
    saisie: SaisieCreationCPPWire,
  ): Promise<ResultatApi<{ cpp: CPPWire }>> {
    return this.requete('POST', `/clients/${clientId}/parameters/cpps`, { jeton, body: saisie })
  }

  desactiverCPP(
    jeton: string,
    clientId: string,
    cppId: string,
    motif: string,
  ): Promise<ResultatApi<{ cpp: CPPWire }>> {
    return this.requete('PATCH', `/clients/${clientId}/parameters/cpps/${cppId}`, {
      jeton,
      body: { motif },
    })
  }

  declarerCQA(
    jeton: string,
    clientId: string,
    saisie: SaisieCreationCQAWire,
  ): Promise<ResultatApi<{ cqa: CQAWire }>> {
    return this.requete('POST', `/clients/${clientId}/parameters/cqas`, { jeton, body: saisie })
  }

  desactiverCQA(
    jeton: string,
    clientId: string,
    cqaId: string,
    motif: string,
  ): Promise<ResultatApi<{ cqa: CQAWire }>> {
    return this.requete('PATCH', `/clients/${clientId}/parameters/cqas/${cqaId}`, {
      jeton,
      body: { motif },
    })
  }

  /** Réservé au filet de sécurité de migration locale — voir la documentation de la route Worker `gererMigrerParametersLocal` : idempotente, l'existant côté serveur gagne toujours. */
  migrerParametersLocal(
    jeton: string,
    clientId: string,
    donnees: {
      parametresProcede: ParameterWire[]
      classifications: ClassificationCriticiteParametreWire[]
      cpps: CPPWire[]
      cqas: CQAWire[]
    },
  ): Promise<
    ResultatApi<{
      parametresProcede: ParameterWire[]
      classifications: ClassificationCriticiteParametreWire[]
      cpps: CPPWire[]
      cqas: CQAWire[]
    }>
  > {
    return this.requete('POST', `/clients/${clientId}/parameters/migration-locale`, {
      jeton,
      body: donnees,
    })
  }

  // --- Impact Assessment / System Classification (F1 du catalogue §10, Phase 4c du chantier de migration D1) ---

  obtenirImpactAssessment(
    jeton: string,
    clientId: string,
  ): Promise<
    ResultatApi<{
      profilsImpact: MethodProfileImpactAssessmentWire[]
      evaluationsImpact: EvaluationImpactAssessmentWire[]
    }>
  > {
    return this.requete('GET', `/clients/${clientId}/impact-assessment`, { jeton })
  }

  creerProfilImpactAssessment(
    jeton: string,
    clientId: string,
    saisie: SaisieCreationProfilImpactAssessmentWire,
  ): Promise<ResultatApi<{ profilImpact: MethodProfileImpactAssessmentWire }>> {
    return this.requete('POST', `/clients/${clientId}/impact-assessment/profils`, {
      jeton,
      body: saisie,
    })
  }

  creerEvaluationImpactAssessment(
    jeton: string,
    clientId: string,
    saisie: SaisieCreationEvaluationImpactAssessmentWire,
  ): Promise<ResultatApi<{ evaluationImpact: EvaluationImpactAssessmentWire }>> {
    return this.requete('POST', `/clients/${clientId}/impact-assessment/evaluations`, {
      jeton,
      body: saisie,
    })
  }

  /** Réservé au filet de sécurité de migration locale — voir la documentation de la route Worker `gererMigrerImpactAssessmentLocal` : idempotente, l'existant côté serveur gagne toujours. */
  migrerImpactAssessmentLocal(
    jeton: string,
    clientId: string,
    donnees: {
      profilsImpact: MethodProfileImpactAssessmentWire[]
      evaluationsImpact: EvaluationImpactAssessmentWire[]
    },
  ): Promise<
    ResultatApi<{
      profilsImpact: MethodProfileImpactAssessmentWire[]
      evaluationsImpact: EvaluationImpactAssessmentWire[]
    }>
  > {
    return this.requete('POST', `/clients/${clientId}/impact-assessment/migration-locale`, {
      jeton,
      body: donnees,
    })
  }

  // --- Computer System Assessment (F3 du catalogue §10, Phase 4c du chantier de migration D1) ---

  obtenirCsvAssessment(
    jeton: string,
    clientId: string,
  ): Promise<ResultatApi<{ evaluationsCsv: EvaluationCSVAssessmentWire[] }>> {
    return this.requete('GET', `/clients/${clientId}/csv-assessment`, { jeton })
  }

  creerEvaluationCsvAssessment(
    jeton: string,
    clientId: string,
    saisie: SaisieCreationEvaluationCsvAssessmentWire,
  ): Promise<ResultatApi<{ evaluationCsv: EvaluationCSVAssessmentWire }>> {
    return this.requete('POST', `/clients/${clientId}/csv-assessment/evaluations`, {
      jeton,
      body: saisie,
    })
  }

  /** Réservé au filet de sécurité de migration locale — voir la documentation de la route Worker `gererMigrerCsvAssessmentLocal` : idempotente, l'existant côté serveur gagne toujours. */
  migrerCsvAssessmentLocal(
    jeton: string,
    clientId: string,
    donnees: { evaluationsCsv: EvaluationCSVAssessmentWire[] },
  ): Promise<ResultatApi<{ evaluationsCsv: EvaluationCSVAssessmentWire[] }>> {
    return this.requete('POST', `/clients/${clientId}/csv-assessment/migration-locale`, {
      jeton,
      body: donnees,
    })
  }

  // --- Risk Assessment / AMDEC (Target Architecture §10, Phase 4d du chantier de migration D1) ---

  obtenirRiskAssessment(
    jeton: string,
    clientId: string,
  ): Promise<
    ResultatApi<{
      profilsRisque: MethodProfileRiskAssessmentWire[]
      evaluationsRisque: RiskAssessmentWire[]
    }>
  > {
    return this.requete('GET', `/clients/${clientId}/risk-assessment`, { jeton })
  }

  creerProfilRiskAssessment(
    jeton: string,
    clientId: string,
    saisie: SaisieCreationProfilRiskAssessmentWire,
  ): Promise<ResultatApi<{ profilRisque: MethodProfileRiskAssessmentWire }>> {
    return this.requete('POST', `/clients/${clientId}/risk-assessment/profils`, {
      jeton,
      body: saisie,
    })
  }

  creerEvaluationRiskAssessment(
    jeton: string,
    clientId: string,
    saisie: SaisieCreationEvaluationRiskAssessmentWire,
  ): Promise<ResultatApi<{ evaluationRisque: RiskAssessmentWire }>> {
    return this.requete('POST', `/clients/${clientId}/risk-assessment/evaluations`, {
      jeton,
      body: saisie,
    })
  }

  enregistrerActionResiduelleRiskAssessment(
    jeton: string,
    clientId: string,
    evaluationId: string,
    saisie: SaisieActionResiduelleRiskAssessmentWire,
  ): Promise<ResultatApi<{ evaluationRisque: RiskAssessmentWire }>> {
    return this.requete(
      'PATCH',
      `/clients/${clientId}/risk-assessment/evaluations/${evaluationId}/action-residuelle`,
      { jeton, body: saisie },
    )
  }

  /** Réservé au filet de sécurité de migration locale — voir la documentation de la route Worker `gererMigrerRiskAssessmentLocal` : idempotente, l'existant côté serveur gagne toujours. */
  migrerRiskAssessmentLocal(
    jeton: string,
    clientId: string,
    donnees: {
      profilsRisque: MethodProfileRiskAssessmentWire[]
      evaluationsRisque: RiskAssessmentWire[]
    },
  ): Promise<
    ResultatApi<{
      profilsRisque: MethodProfileRiskAssessmentWire[]
      evaluationsRisque: RiskAssessmentWire[]
    }>
  > {
    return this.requete('POST', `/clients/${clientId}/risk-assessment/migration-locale`, {
      jeton,
      body: donnees,
    })
  }

  // --- Process/FonctionActif/ManufacturingContext (Target Architecture §4/§5/§7, Phase 5a du chantier de migration D1) ---

  obtenirProcessContext(
    jeton: string,
    clientId: string,
  ): Promise<
    ResultatApi<{
      processes: ProcessWire[]
      fonctions: FonctionActifWire[]
      associationsFonctionAssetNode: AssociationFonctionAssetNodeWire[]
      associationsFonctionProcess: AssociationFonctionProcessWire[]
      manufacturingContexts: ManufacturingContextWire[]
    }>
  > {
    return this.requete('GET', `/clients/${clientId}/process-context`, { jeton })
  }

  creerProcess(
    jeton: string,
    clientId: string,
    saisie: SaisieCreationProcessWire,
  ): Promise<ResultatApi<{ process: ProcessWire }>> {
    return this.requete('POST', `/clients/${clientId}/process-context/processes`, {
      jeton,
      body: saisie,
    })
  }

  creerFonction(
    jeton: string,
    clientId: string,
    saisie: SaisieCreationFonctionWire,
  ): Promise<ResultatApi<{ fonction: FonctionActifWire }>> {
    return this.requete('POST', `/clients/${clientId}/process-context/fonctions`, {
      jeton,
      body: saisie,
    })
  }

  creerAssociationFonctionAssetNode(
    jeton: string,
    clientId: string,
    saisie: SaisieCreationAssociationFonctionAssetNodeWire,
  ): Promise<ResultatApi<{ associationFonctionAssetNode: AssociationFonctionAssetNodeWire }>> {
    return this.requete(
      'POST',
      `/clients/${clientId}/process-context/associations-fonction-asset-node`,
      { jeton, body: saisie },
    )
  }

  creerAssociationFonctionProcess(
    jeton: string,
    clientId: string,
    saisie: SaisieCreationAssociationFonctionProcessWire,
  ): Promise<ResultatApi<{ associationFonctionProcess: AssociationFonctionProcessWire }>> {
    return this.requete(
      'POST',
      `/clients/${clientId}/process-context/associations-fonction-process`,
      { jeton, body: saisie },
    )
  }

  creerManufacturingContext(
    jeton: string,
    clientId: string,
    saisie: SaisieCreationManufacturingContextWire,
  ): Promise<ResultatApi<{ manufacturingContext: ManufacturingContextWire }>> {
    return this.requete('POST', `/clients/${clientId}/process-context/manufacturing-contexts`, {
      jeton,
      body: saisie,
    })
  }

  /** Réservé au filet de sécurité de migration locale — voir la documentation de la route Worker `gererMigrerProcessContextLocal` : idempotente, l'existant côté serveur gagne toujours. */
  migrerProcessContextLocal(
    jeton: string,
    clientId: string,
    donnees: {
      processes: ProcessWire[]
      fonctions: FonctionActifWire[]
      associationsFonctionAssetNode: AssociationFonctionAssetNodeWire[]
      associationsFonctionProcess: AssociationFonctionProcessWire[]
      manufacturingContexts: ManufacturingContextWire[]
    },
  ): Promise<
    ResultatApi<{
      processes: ProcessWire[]
      fonctions: FonctionActifWire[]
      associationsFonctionAssetNode: AssociationFonctionAssetNodeWire[]
      associationsFonctionProcess: AssociationFonctionProcessWire[]
      manufacturingContexts: ManufacturingContextWire[]
    }>
  > {
    return this.requete('POST', `/clients/${clientId}/process-context/migration-locale`, {
      jeton,
      body: donnees,
    })
  }

  // --- QualityEvent/ReferenceQualityEvent (URS catalogue §10 famille H/I, Phase 5b du chantier de migration D1) ---

  obtenirQualityEvents(
    jeton: string,
    clientId: string,
  ): Promise<
    ResultatApi<{ evenements: QualityEventWire[]; references: ReferenceQualityEventWire[] }>
  > {
    return this.requete('GET', `/clients/${clientId}/quality-events`, { jeton })
  }

  creerEvenementQualityEvent(
    jeton: string,
    clientId: string,
    saisie: SaisieCreationQualityEventWire,
  ): Promise<ResultatApi<{ evenement: QualityEventWire }>> {
    return this.requete('POST', `/clients/${clientId}/quality-events/evenements`, {
      jeton,
      body: saisie,
    })
  }

  changerStatutQualityEvent(
    jeton: string,
    clientId: string,
    evenementId: string,
    statut: string,
  ): Promise<ResultatApi<{ evenement: QualityEventWire }>> {
    return this.requete(
      'PATCH',
      `/clients/${clientId}/quality-events/evenements/${evenementId}/statut`,
      { jeton, body: { statut } },
    )
  }

  creerReferenceQualityEvent(
    jeton: string,
    clientId: string,
    saisie: SaisieCreationReferenceQualityEventWire,
  ): Promise<ResultatApi<{ reference: ReferenceQualityEventWire }>> {
    return this.requete('POST', `/clients/${clientId}/quality-events/references`, {
      jeton,
      body: saisie,
    })
  }

  /** Réservé au filet de sécurité de migration locale — voir la documentation de la route Worker `gererMigrerQualityEventsLocal` : idempotente, l'existant côté serveur gagne toujours. */
  migrerQualityEventsLocal(
    jeton: string,
    clientId: string,
    donnees: { evenements: QualityEventWire[]; references: ReferenceQualityEventWire[] },
  ): Promise<
    ResultatApi<{ evenements: QualityEventWire[]; references: ReferenceQualityEventWire[] }>
  > {
    return this.requete('POST', `/clients/${clientId}/quality-events/migration-locale`, {
      jeton,
      body: donnees,
    })
  }

  // --- Requirement/TestObjective/TestCandidate/Test/Couverture (Target Architecture, domaine "Test", Phase 6a du chantier de migration D1) ---

  obtenirTestDefinition(
    jeton: string,
    clientId: string,
  ): Promise<
    ResultatApi<{
      requirements: RequirementWire[]
      testObjectives: TestObjectiveWire[]
      testCandidates: TestCandidateWire[]
      tests: TestWire[]
      couvertures: CouvertureWire[]
    }>
  > {
    return this.requete('GET', `/clients/${clientId}/test-definition`, { jeton })
  }

  creerRequirement(
    jeton: string,
    clientId: string,
    saisie: SaisieCreationRequirementWire,
  ): Promise<ResultatApi<{ requirement: RequirementWire }>> {
    return this.requete('POST', `/clients/${clientId}/test-definition/requirements`, {
      jeton,
      body: saisie,
    })
  }

  creerTestObjective(
    jeton: string,
    clientId: string,
    saisie: SaisieCreationTestObjectiveWire,
  ): Promise<ResultatApi<{ testObjective: TestObjectiveWire }>> {
    return this.requete('POST', `/clients/${clientId}/test-definition/test-objectives`, {
      jeton,
      body: saisie,
    })
  }

  creerTestCandidate(
    jeton: string,
    clientId: string,
    saisie: SaisieCreationTestCandidateWire,
  ): Promise<ResultatApi<{ testCandidate: TestCandidateWire }>> {
    return this.requete('POST', `/clients/${clientId}/test-definition/test-candidates`, {
      jeton,
      body: saisie,
    })
  }

  creerTestCandidatsDepuisRisques(
    jeton: string,
    clientId: string,
    candidats: SaisieCandidatDepuisRisquesWire[],
  ): Promise<ResultatApi<{ testCandidates: TestCandidateWire[] }>> {
    return this.requete(
      'POST',
      `/clients/${clientId}/test-definition/test-candidates/depuis-risques`,
      { jeton, body: { candidats } },
    )
  }

  changerStatutTestCandidate(
    jeton: string,
    clientId: string,
    testCandidateId: string,
    saisie: {
      statut: string
      motifRejet?: string | null
      dupliqueDeId?: string | null
      remplaceParId?: string | null
    },
  ): Promise<ResultatApi<{ testCandidate: TestCandidateWire }>> {
    return this.requete(
      'PATCH',
      `/clients/${clientId}/test-definition/test-candidates/${testCandidateId}/statut`,
      { jeton, body: saisie },
    )
  }

  creerTest(
    jeton: string,
    clientId: string,
    saisie: SaisieCreationTestWire,
  ): Promise<ResultatApi<{ test: TestWire }>> {
    return this.requete('POST', `/clients/${clientId}/test-definition/tests`, {
      jeton,
      body: saisie,
    })
  }

  approuverTest(
    jeton: string,
    clientId: string,
    testId: string,
  ): Promise<ResultatApi<{ test: TestWire }>> {
    return this.requete('PATCH', `/clients/${clientId}/test-definition/tests/${testId}/approuver`, {
      jeton,
    })
  }

  creerCouverture(
    jeton: string,
    clientId: string,
    saisie: SaisieCreationCouvertureWire,
  ): Promise<ResultatApi<{ couverture: CouvertureWire }>> {
    return this.requete('POST', `/clients/${clientId}/test-definition/couvertures`, {
      jeton,
      body: saisie,
    })
  }

  /** Réservé au filet de sécurité de migration locale — voir la documentation de la route Worker `gererMigrerTestDefinitionLocal` : idempotente, l'existant côté serveur gagne toujours. */
  migrerTestDefinitionLocal(
    jeton: string,
    clientId: string,
    donnees: {
      requirements: RequirementWire[]
      testObjectives: TestObjectiveWire[]
      testCandidates: TestCandidateWire[]
      tests: TestWire[]
      couvertures: CouvertureWire[]
    },
  ): Promise<
    ResultatApi<{
      requirements: RequirementWire[]
      testObjectives: TestObjectiveWire[]
      testCandidates: TestCandidateWire[]
      tests: TestWire[]
      couvertures: CouvertureWire[]
    }>
  > {
    return this.requete('POST', `/clients/${clientId}/test-definition/migration-locale`, {
      jeton,
      body: donnees,
    })
  }

  // --- Organization/Workspace (Phase 2 du chantier de migration D1) ---

  obtenirOrganisation(
    jeton: string,
    clientId: string,
  ): Promise<ResultatApi<{ organization: OrganizationWire | null; workspaces: WorkspaceWire[] }>> {
    return this.requete('GET', `/clients/${clientId}/organisation`, { jeton })
  }

  migrerClientVersOrganisation(
    jeton: string,
    clientId: string,
  ): Promise<ResultatApi<{ organization: OrganizationWire; workspaceRacine: WorkspaceWire }>> {
    return this.requete('POST', `/clients/${clientId}/organisation/migrer`, { jeton })
  }

  creerWorkspace(
    jeton: string,
    clientId: string,
    saisie: { nom: string; parentWorkspaceId: string },
  ): Promise<ResultatApi<{ workspace: WorkspaceWire }>> {
    return this.requete('POST', `/clients/${clientId}/organisation/workspaces`, {
      jeton,
      body: saisie,
    })
  }

  // --- Projects (Phase 3a du chantier de migration D1) ---

  listerProjets(jeton: string): Promise<ResultatApi<{ projects: ProjectWire[] }>> {
    return this.requete('GET', '/projects', { jeton })
  }

  listerProjetsClient(
    jeton: string,
    clientId: string,
  ): Promise<ResultatApi<{ projects: ProjectWire[] }>> {
    return this.requete('GET', `/clients/${clientId}/projects`, { jeton })
  }

  obtenirProjet(jeton: string, id: string): Promise<ResultatApi<{ projet: ProjectWire }>> {
    return this.requete('GET', `/projects/${id}`, { jeton })
  }

  /** Réservé à `useSynchronisationStore` (restauration depuis GitHub / fusion de conflit déjà résolue côté client) — écrase sans fusionner, voir la documentation de la route Worker `gererRestaurerProjet`. */
  restaurerProjet(
    jeton: string,
    id: string,
    projet: ProjectWire,
  ): Promise<ResultatApi<{ projet: ProjectWire }>> {
    return this.requete('PUT', `/projects/${id}/restauration`, { jeton, body: projet })
  }

  /** Réservé au filet de sécurité de migration locale — voir la documentation de la route Worker `gererMigrerProjetsLocaux` : seule voie qui accepte un projet déjà complet (id/owner_id/shared_with/audit_log/horodatages d'origine), jamais fabriqués ici. */
  migrerProjetsLocaux(
    jeton: string,
    projects: ProjectWire[],
  ): Promise<ResultatApi<{ projects: ProjectWire[] }>> {
    return this.requete('POST', '/projects/migration-locale', { jeton, body: { projects } })
  }

  creerProjet(
    jeton: string,
    saisie: {
      name: string
      context?: string
      scopeIn?: string
      scopeOut?: string
      deadline?: string | null
      languageDefault?: ProjectWire['languageDefault']
      clientId?: string | null
    },
  ): Promise<ResultatApi<{ projet: ProjectWire }>> {
    return this.requete('POST', '/projects', { jeton, body: saisie })
  }

  changerPhaseProjet(
    jeton: string,
    id: string,
    phase: ProjectWire['phase'],
  ): Promise<ResultatApi<{ projet: ProjectWire }>> {
    return this.requete('PATCH', `/projects/${id}/phase`, { jeton, body: { phase } })
  }

  archiverProjet(jeton: string, id: string): Promise<ResultatApi<{ projet: ProjectWire }>> {
    return this.requete('POST', `/projects/${id}/archiver`, { jeton })
  }

  desarchiverProjet(jeton: string, id: string): Promise<ResultatApi<{ projet: ProjectWire }>> {
    return this.requete('POST', `/projects/${id}/desarchiver`, { jeton })
  }

  suspendreProjet(jeton: string, id: string): Promise<ResultatApi<{ projet: ProjectWire }>> {
    return this.requete('POST', `/projects/${id}/suspendre`, { jeton })
  }

  reprendreProjet(jeton: string, id: string): Promise<ResultatApi<{ projet: ProjectWire }>> {
    return this.requete('POST', `/projects/${id}/reprendre`, { jeton })
  }

  supprimerProjet(jeton: string, id: string): Promise<ResultatApi<{ projet: ProjectWire }>> {
    return this.requete('POST', `/projects/${id}/supprimer`, { jeton })
  }

  partagerProjet(
    jeton: string,
    id: string,
    userId: string,
    accessLevel: 'lecture' | 'édition',
  ): Promise<ResultatApi<{ projet: ProjectWire }>> {
    return this.requete('POST', `/projects/${id}/partage`, { jeton, body: { userId, accessLevel } })
  }

  retirerPartageProjet(
    jeton: string,
    id: string,
    userId: string,
  ): Promise<ResultatApi<{ projet: ProjectWire }>> {
    return this.requete('DELETE', `/projects/${id}/partage/${encodeURIComponent(userId)}`, {
      jeton,
    })
  }

  ajouterDocumentProjet(
    jeton: string,
    id: string,
    documentId: string,
  ): Promise<ResultatApi<{ projet: ProjectWire }>> {
    return this.requete('POST', `/projects/${id}/documents`, { jeton, body: { documentId } })
  }

  ajouterSectionProjet(
    jeton: string,
    id: string,
    sectionId: string,
  ): Promise<ResultatApi<{ projet: ProjectWire }>> {
    return this.requete('POST', `/projects/${id}/sections`, { jeton, body: { sectionId } })
  }

  ajouterLienProjet(
    jeton: string,
    id: string,
    fromSectionId: string,
    toSectionId: string,
  ): Promise<ResultatApi<{ projet: ProjectWire }>> {
    return this.requete('POST', `/projects/${id}/liens`, {
      jeton,
      body: { fromSectionId, toSectionId },
    })
  }

  retirerLienProjet(
    jeton: string,
    id: string,
    fromSectionId: string,
    toSectionId: string,
  ): Promise<ResultatApi<{ projet: ProjectWire }>> {
    return this.requete('DELETE', `/projects/${id}/liens`, {
      jeton,
      body: { fromSectionId, toSectionId },
    })
  }

  // --- Sections (Phase 3b du chantier de migration D1) ---

  listerToutesLesSections(jeton: string): Promise<ResultatApi<{ sections: SectionWire[] }>> {
    return this.requete('GET', '/sections', { jeton })
  }

  listerSectionsProjet(
    jeton: string,
    projectId: string,
  ): Promise<ResultatApi<{ sections: SectionWire[] }>> {
    return this.requete('GET', `/projects/${projectId}/sections`, { jeton })
  }

  obtenirSection(jeton: string, id: string): Promise<ResultatApi<{ section: SectionWire }>> {
    return this.requete('GET', `/sections/${id}`, { jeton })
  }

  creerSection(
    jeton: string,
    section: SectionWire,
  ): Promise<ResultatApi<{ section: SectionWire }>> {
    return this.requete('POST', '/sections', { jeton, body: section })
  }

  remplacerSection(
    jeton: string,
    id: string,
    section: SectionWire,
  ): Promise<ResultatApi<{ section: SectionWire }>> {
    return this.requete('PUT', `/sections/${id}`, { jeton, body: section })
  }

  /** Filet de récupération après conflit GitHub — écrase par la version fournie (création ou remplacement selon existence), jamais une fusion. */
  restaurerSection(
    jeton: string,
    id: string,
    section: SectionWire,
  ): Promise<ResultatApi<{ section: SectionWire }>> {
    return this.requete('PUT', `/sections/${id}/restauration`, { jeton, body: section })
  }

  /** Réservé au filet de sécurité de migration locale — voir la documentation de la route Worker `gererMigrerSectionsLocales` : seule voie qui accepte une section déjà complète (id/owner_id/shared_with/audit_log/horodatages d'origine), jamais fabriqués ici. */
  migrerSectionsLocales(
    jeton: string,
    sections: SectionWire[],
  ): Promise<ResultatApi<{ sections: SectionWire[] }>> {
    return this.requete('POST', '/sections/migration-locale', { jeton, body: { sections } })
  }

  // --- ProjectDocument (section "Documents" d'un projet, §4.9 — Phase 3c du chantier de migration D1) ---

  listerDocumentsProjet(
    jeton: string,
    projectId: string,
  ): Promise<ResultatApi<{ documentsProjet: ProjectDocumentWire[] }>> {
    return this.requete('GET', `/projects/${projectId}/documents`, { jeton })
  }

  obtenirDocumentProjet(
    jeton: string,
    id: string,
  ): Promise<ResultatApi<{ documentProjet: ProjectDocumentWire }>> {
    return this.requete('GET', `/project-documents/${id}`, { jeton })
  }

  /** Corps `multipart/form-data` (jamais JSON) — même contrainte que `creerDocumentNormatif` (texte extrait et contenu binaire potentiellement volumineux). */
  creerDocumentProjet(
    jeton: string,
    saisie: SaisieCreationDocumentProjet,
  ): Promise<ResultatApi<{ documentProjet: ProjectDocumentWire }>> {
    const formData = new FormData()
    formData.set(
      'metadata',
      JSON.stringify({
        id: saisie.id ?? undefined,
        projectId: saisie.projectId,
        filename: saisie.filename,
        status: saisie.status ?? undefined,
        mimeType: saisie.mimeType,
      }),
    )
    formData.set('texte', saisie.texte)
    if (saisie.contenu) formData.set('contenu', saisie.contenu, saisie.filename)
    return this.requeteFormData('POST', '/project-documents', jeton, formData)
  }

  supprimerDocumentProjet(jeton: string, id: string): Promise<ResultatApi<{ ok: true }>> {
    return this.requete('DELETE', `/project-documents/${id}`, { jeton })
  }

  /** Contenu binaire brut d'un document — jamais du JSON, contourne `requete()` (même patron que `obtenirContenuDocumentNormatif`). */
  async obtenirContenuDocumentProjet(
    jeton: string,
    id: string,
  ): Promise<{ ok: true; blob: Blob } | { ok: false; erreur: string }> {
    const controleur = new AbortController()
    const minuteur = setTimeout(() => controleur.abort(), this.delaiMaxMs)
    let reponse: Response
    try {
      reponse = await fetch(`${this.relayUrl}/project-documents/${id}/contenu`, {
        signal: controleur.signal,
        headers: { Authorization: `Bearer ${jeton}` },
      })
    } catch (erreur) {
      if (erreur instanceof Error && erreur.name === 'AbortError') throw new TimeoutAuthError()
      throw new IndisponibleAuthError()
    } finally {
      clearTimeout(minuteur)
    }
    if (reponse.status >= 500) throw new IndisponibleAuthError()
    if (!reponse.ok) {
      const corps = await reponse.json().catch(() => null)
      const erreur =
        corps && typeof corps === 'object' && 'erreur' in corps && typeof corps.erreur === 'string'
          ? corps.erreur
          : 'erreur_inconnue'
      return { ok: false, erreur }
    }
    return { ok: true, blob: await reponse.blob() }
  }

  /** Réservé au filet de sécurité de migration locale — voir la documentation de la route Worker `gererMigrerDocumentProjetLocal` : idempotente, l'existant côté serveur gagne toujours (jamais un écrasement). Même corps `multipart/form-data` que `creerDocumentProjet`, avec `saisie.id` imposé. */
  migrerDocumentProjetLocal(
    jeton: string,
    saisie: SaisieCreationDocumentProjet & { id: string },
  ): Promise<ResultatApi<{ documentProjet: ProjectDocumentWire }>> {
    const formData = new FormData()
    formData.set(
      'metadata',
      JSON.stringify({
        id: saisie.id,
        projectId: saisie.projectId,
        filename: saisie.filename,
        status: saisie.status ?? undefined,
        mimeType: saisie.mimeType,
      }),
    )
    formData.set('texte', saisie.texte)
    if (saisie.contenu) formData.set('contenu', saisie.contenu, saisie.filename)
    return this.requeteFormData('POST', '/project-documents/migration-locale', jeton, formData)
  }

  // --- Paramètres d'installation (dépôt GitHub, Relais IA, Drive normes — globaux, partagés par tous les comptes) ---

  obtenirParametreInstallation(
    jeton: string,
    cle: string,
  ): Promise<ResultatApi<{ parametre: ParametreInstallationWire | null }>> {
    return this.requete('GET', `/parametres-installation/${cle}`, { jeton })
  }

  enregistrerParametreInstallation(
    jeton: string,
    cle: string,
    valeur: Record<string, string>,
  ): Promise<ResultatApi<{ parametre: ParametreInstallationWire }>> {
    return this.requete('PUT', `/parametres-installation/${cle}`, { jeton, body: { valeur } })
  }

  effacerParametreInstallation(jeton: string, cle: string): Promise<ResultatApi<{ ok: true }>> {
    return this.requete('DELETE', `/parametres-installation/${cle}`, { jeton })
  }

  // --- OAuth Google (Drive normes) — jeton de rafraîchissement longue durée, remplace la copie manuelle depuis l'OAuth Playground (voir #35/#36/#37) ---

  /** Réservé à un admin (même exigence que `enregistrerParametreInstallation`, dont cette connexion tient lieu) — l'appelant doit rediriger `window.location.href` vers l'URL renvoyée, jamais la charger en `fetch`. */
  demarrerConnexionOAuthDrive(jeton: string): Promise<ResultatApi<{ urlAutorisation: string }>> {
    return this.requete('GET', '/drive-oauth/demarrer', { jeton })
  }

  /** Jeton d'accès frais (jamais persisté par l'appelant, valable ~1h) à partir du jeton de rafraîchissement déjà connecté — `oauth_non_connecte` si `connecterDriveAvecGoogle` n'a jamais été fait. */
  rafraichirJetonOAuthDrive(
    jeton: string,
  ): Promise<ResultatApi<{ jeton: string; expiresIn: number }>> {
    return this.requete('POST', '/drive-oauth/rafraichir-jeton', { jeton })
  }

  // --- Documents normatifs (Bibliothèque de normes — global à l'installation) ---

  listerDocumentsNormatifs(
    jeton: string,
  ): Promise<ResultatApi<{ documents: DocumentNormatifWire[] }>> {
    return this.requete('GET', '/documents-normatifs', { jeton })
  }

  /** Corps `multipart/form-data` (jamais JSON) — le texte extrait et le contenu binaire éventuel peuvent être volumineux, jamais adaptés à un `JSON.stringify`. */
  creerDocumentNormatif(
    jeton: string,
    saisie: SaisieCreationDocumentNormatif,
  ): Promise<ResultatApi<{ document: DocumentNormatifWire }>> {
    const formData = new FormData()
    formData.set(
      'metadata',
      JSON.stringify({
        category: saisie.category,
        titre: saisie.titre,
        filename: saisie.filename,
        source: saisie.source,
        sourceRef: saisie.sourceRef ?? undefined,
        mimeType: saisie.mimeType,
      }),
    )
    formData.set('texte', saisie.texte)
    if (saisie.contenu) formData.set('contenu', saisie.contenu, saisie.filename)
    return this.requeteFormData('POST', '/documents-normatifs', jeton, formData)
  }

  renommerDocumentNormatif(
    jeton: string,
    id: string,
    titre: string,
  ): Promise<ResultatApi<{ document: DocumentNormatifWire }>> {
    return this.requete('PATCH', `/documents-normatifs/${id}`, { jeton, body: { titre } })
  }

  supprimerDocumentNormatif(jeton: string, id: string): Promise<ResultatApi<{ ok: true }>> {
    return this.requete('DELETE', `/documents-normatifs/${id}`, { jeton })
  }

  /** Recale `hasBinaryContent` sur le contenu réellement présent côté serveur pour ce lot de documents (voir #35/#36 : un ancien import de masse a pu marquer un fichier disponible à tort). */
  diagnostiquerContenuDocumentsNormatifs(
    jeton: string,
    ids: string[],
  ): Promise<
    ResultatApi<{ resultats: { id: string; hasBinaryContent: boolean; corrige: boolean }[] }>
  > {
    return this.requete('POST', '/documents-normatifs/diagnostiquer', { jeton, body: { ids } })
  }

  /** Contenu binaire brut d'un document — jamais du JSON, contourne `requete()`. */
  async obtenirContenuDocumentNormatif(
    jeton: string,
    id: string,
  ): Promise<{ ok: true; blob: Blob } | { ok: false; erreur: string }> {
    const controleur = new AbortController()
    const minuteur = setTimeout(() => controleur.abort(), this.delaiMaxMs)
    let reponse: Response
    try {
      reponse = await fetch(`${this.relayUrl}/documents-normatifs/${id}/contenu`, {
        signal: controleur.signal,
        headers: { Authorization: `Bearer ${jeton}` },
      })
    } catch (erreur) {
      if (erreur instanceof Error && erreur.name === 'AbortError') throw new TimeoutAuthError()
      throw new IndisponibleAuthError()
    } finally {
      clearTimeout(minuteur)
    }
    if (reponse.status >= 500) throw new IndisponibleAuthError()
    if (!reponse.ok) {
      const corps = await reponse.json().catch(() => null)
      const erreur =
        corps && typeof corps === 'object' && 'erreur' in corps && typeof corps.erreur === 'string'
          ? corps.erreur
          : 'erreur_inconnue'
      return { ok: false, erreur }
    }
    return { ok: true, blob: await reponse.blob() }
  }

  /**
   * Remplace le contenu binaire d'un document déjà existant (jamais ses
   * métadonnées) — corps brut, jamais du JSON ni du multipart : contourne
   * `requete()`/`requeteFormData()` comme `obtenirContenuDocumentNormatif`.
   * Réservé à la réparation d'un document dont le contenu s'est révélé
   * vide après coup (voir #35) — jamais un chemin de création.
   */
  async repararContenuDocumentNormatif(
    jeton: string,
    id: string,
    contenu: Blob,
    mimeType: string,
  ): Promise<ResultatApi<{ document: DocumentNormatifWire }>> {
    const controleur = new AbortController()
    const minuteur = setTimeout(() => controleur.abort(), this.delaiMaxMs)
    let reponse: Response
    try {
      reponse = await fetch(`${this.relayUrl}/documents-normatifs/${id}/contenu`, {
        method: 'PUT',
        signal: controleur.signal,
        headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': mimeType },
        body: contenu,
      })
    } catch (erreur) {
      if (erreur instanceof Error && erreur.name === 'AbortError') throw new TimeoutAuthError()
      throw new IndisponibleAuthError()
    } finally {
      clearTimeout(minuteur)
    }
    if (reponse.status >= 500) throw new IndisponibleAuthError()
    const corps = await reponse.json().catch(() => null)
    if (!reponse.ok) {
      const erreur =
        corps && typeof corps === 'object' && 'erreur' in corps && typeof corps.erreur === 'string'
          ? corps.erreur
          : 'erreur_inconnue'
      return { ok: false, erreur, status: reponse.status }
    }
    return { ok: true, donnees: corps as { document: DocumentNormatifWire } }
  }

  // --- Aide ---

  private async requeteFormData<T>(
    methode: string,
    chemin: string,
    jeton: string,
    formData: FormData,
  ): Promise<ResultatApi<T>> {
    const controleur = new AbortController()
    const minuteur = setTimeout(() => controleur.abort(), this.delaiMaxMs)

    let reponse: Response
    try {
      // Jamais de `Content-Type` explicite ici : le navigateur doit poser
      // lui-même l'en-tête `multipart/form-data; boundary=...` — un
      // `Content-Type` manuel casserait le découpage des parties.
      reponse = await fetch(`${this.relayUrl}${chemin}`, {
        method: methode,
        signal: controleur.signal,
        headers: { Authorization: `Bearer ${jeton}` },
        body: formData,
      })
    } catch (erreur) {
      if (erreur instanceof Error && erreur.name === 'AbortError') throw new TimeoutAuthError()
      throw new IndisponibleAuthError()
    } finally {
      clearTimeout(minuteur)
    }

    if (reponse.status >= 500) throw new IndisponibleAuthError()

    let corps: unknown
    try {
      corps = await reponse.json()
    } catch {
      throw new ReponseInvalideAuthError()
    }
    if (typeof corps !== 'object' || corps === null) {
      throw new ReponseInvalideAuthError()
    }

    if (!reponse.ok) {
      const erreur =
        'erreur' in corps && typeof (corps as { erreur?: unknown }).erreur === 'string'
          ? (corps as { erreur: string }).erreur
          : 'erreur_inconnue'
      return { ok: false, erreur, status: reponse.status }
    }
    return { ok: true, donnees: corps as T }
  }

  private async requete<T>(
    methode: string,
    chemin: string,
    options: { jeton?: string; body?: unknown } = {},
  ): Promise<ResultatApi<T>> {
    const controleur = new AbortController()
    const minuteur = setTimeout(() => controleur.abort(), this.delaiMaxMs)

    let reponse: Response
    try {
      reponse = await fetch(`${this.relayUrl}${chemin}`, {
        method: methode,
        signal: controleur.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(options.jeton ? { Authorization: `Bearer ${options.jeton}` } : {}),
        },
        ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      })
    } catch (erreur) {
      if (erreur instanceof Error && erreur.name === 'AbortError') throw new TimeoutAuthError()
      throw new IndisponibleAuthError()
    } finally {
      clearTimeout(minuteur)
    }

    if (reponse.status >= 500) throw new IndisponibleAuthError()

    let corps: unknown
    try {
      corps = await reponse.json()
    } catch {
      throw new ReponseInvalideAuthError()
    }
    if (typeof corps !== 'object' || corps === null) {
      throw new ReponseInvalideAuthError()
    }

    if (!reponse.ok) {
      const erreur =
        'erreur' in corps && typeof (corps as { erreur?: unknown }).erreur === 'string'
          ? (corps as { erreur: string }).erreur
          : 'erreur_inconnue'
      return { ok: false, erreur, status: reponse.status }
    }
    return { ok: true, donnees: corps as T }
  }
}
