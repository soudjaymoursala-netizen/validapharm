import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  AIConfigurationWire,
  AIRequestWire,
  AIResponseWire,
  CitationAIResponseWire,
} from '../../connecteurs/auth/AuthApiClient'
import type { ProviderAdapter } from '../../connecteurs/ia/ProviderAdapter'
import type { ModeUsageIA } from '../../connecteurs/ia/ProviderAdapter'
import { construireNarratifContexte } from '../../logique-metier/contexte/narratifContexteSnapshot'
import { useContextEngineStore } from './useContextEngineStore'
import type {
  AIConfiguration,
  AIRequest,
  AIResponse,
  CitationAIResponse,
  EtatConfianceIA,
  TypeObjetCitable,
} from '../../logique-metier/domaine/types'
import { executerBoucleRaisonnement } from '../../logique-metier/raisonnement/boucleRaisonnement'
import { CATALOGUE_OUTILS_RAISONNEMENT } from '../../logique-metier/raisonnement/outilsRaisonnement'
import {
  aiConfigurationsAMigrer,
  aiRequestsAMigrer,
  aiResponsesAMigrer,
  citationsAIResponseAMigrer,
  db,
} from '../../persistance/db'
import { useAuthStore } from './useAuthStore'
import { useEvidenceStore } from './useEvidenceStore'
import { useExecutionStore } from './useExecutionStore'
import { useProcessContextStore } from './useProcessContextStore'
import { useQualityEventStore } from './useQualityEventStore'
import { useSourceIntelligenceStore } from './useSourceIntelligenceStore'
import { useStructureSystemeStore } from './useStructureSystemeStore'
import { useTestDefinitionStore } from './useTestDefinitionStore'

const VERSION_CONFIGURATION_ACTUELLE = 'v1'

function aiConfigurationWireVersDomaine(w: AIConfigurationWire): AIConfiguration {
  return {
    id: w.id,
    client_id: w.clientId,
    version: w.version,
    outils_disponibles: w.outilsDisponibles,
    created_at: w.createdAt,
  }
}

function aiConfigurationDomaineVersWire(c: AIConfiguration): AIConfigurationWire {
  return {
    id: c.id,
    clientId: c.client_id,
    version: c.version,
    outilsDisponibles: c.outils_disponibles,
    createdAt: c.created_at,
  }
}

function aiRequestWireVersDomaine(w: AIRequestWire): AIRequest {
  return {
    id: w.id,
    client_id: w.clientId,
    mission_id: w.missionId,
    context_snapshot_id: w.contextSnapshotId,
    ai_configuration_id: w.aiConfigurationId,
    objectif: w.objectif,
    created_at: w.createdAt,
  }
}

function aiRequestDomaineVersWire(r: AIRequest): AIRequestWire {
  return {
    id: r.id,
    clientId: r.client_id,
    missionId: r.mission_id,
    contextSnapshotId: r.context_snapshot_id,
    aiConfigurationId: r.ai_configuration_id,
    objectif: r.objectif,
    createdAt: r.created_at,
  }
}

function aiResponseWireVersDomaine(w: AIResponseWire): AIResponse {
  return {
    id: w.id,
    client_id: w.clientId,
    ai_request_id: w.aiRequestId,
    texte: w.texte,
    etat_confiance: w.etatConfiance as EtatConfianceIA,
    trace_appels_outils: w.traceAppelsOutils,
    version_moteur: w.versionMoteur,
    created_at: w.createdAt,
  }
}

function aiResponseDomaineVersWire(r: AIResponse): AIResponseWire {
  return {
    id: r.id,
    clientId: r.client_id,
    aiRequestId: r.ai_request_id,
    texte: r.texte,
    etatConfiance: r.etat_confiance,
    traceAppelsOutils: r.trace_appels_outils,
    versionMoteur: r.version_moteur,
    createdAt: r.created_at,
  }
}

function citationWireVersDomaine(w: CitationAIResponseWire): CitationAIResponse {
  return {
    id: w.id,
    client_id: w.clientId,
    ai_response_id: w.aiResponseId,
    type_objet_cite: w.typeObjetCite as TypeObjetCitable,
    objet_id: w.objetId,
  }
}

function citationDomaineVersWire(c: CitationAIResponse): CitationAIResponseWire {
  return {
    id: c.id,
    clientId: c.client_id,
    aiResponseId: c.ai_response_id,
    typeObjetCite: c.type_objet_cite,
    objetId: c.objet_id,
  }
}

export interface EntreesRaisonnement {
  objectif: string
  missionId: string | null
  contextSnapshotId: string | null
  fournisseur: ProviderAdapter
  mode: ModeUsageIA
  maxIterations?: number
}

export interface ResultatRaisonnement {
  request: AIRequest
  response: AIResponse
}

/**
 * Store du moteur de raisonnement (convergence architecturale
 * — spec détaillée dans `docs/convergence/PHASE_15_REASONING_ENGINE_SPEC.md`).
 *
 * **Garde-fou non négociable** : aucune fonction de ce store n'écrit le
 * contenu d'une `AIResponse` dans `Requirement`/`Test`/`KnowledgeItem` —
 * même principe que `Confirmation`, cohérent avec le principe
 * fondateur n°1. `AIRequest`/`AIResponse` sont immuables une fois créés
 * (aucune fonction de mise à jour exposée).
 *
 * @requirement docs/convergence/CONVERGENCE_PLAN.md
 */
export const useReasoningEngineStore = defineStore('reasoningEngine', () => {
  const configurations = ref<AIConfiguration[]>([])
  const requests = ref<AIRequest[]>([])
  const responses = ref<AIResponse[]>([])
  const citations = ref<CitationAIResponse[]>([])
  const enChargement = ref(false)

  /** Lève si le relais n'est pas configuré — mutations exigent désormais systématiquement le Worker/D1, même discipline que les autres stores de ce chantier. */
  async function obtenirApi() {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) {
      throw new Error("Relais d'authentification non configuré (Configuration client).")
    }
    return { api, jeton: authStore.jeton }
  }

  /**
   * Envoie au serveur les enregistrements capturés depuis les anciennes
   * tables IndexedDB locales juste avant leur suppression — n'a d'effet
   * réel qu'une seule fois (voir migration Dexie v53, `persistance/db.ts`).
   */
  async function migrerReasoningEngineLocalVersServeur(clientId: string): Promise<void> {
    const configurationsDuClient = aiConfigurationsAMigrer.filter((c) => c.client_id === clientId)
    const requestsDuClient = aiRequestsAMigrer.filter((r) => r.client_id === clientId)
    const responsesDuClient = aiResponsesAMigrer.filter((r) => r.client_id === clientId)
    const citationsDuClient = citationsAIResponseAMigrer.filter((c) => c.client_id === clientId)
    if (
      configurationsDuClient.length === 0 &&
      requestsDuClient.length === 0 &&
      responsesDuClient.length === 0 &&
      citationsDuClient.length === 0
    ) {
      return
    }

    const { api, jeton } = await obtenirApi()
    const resultat = await api.migrerReasoningEngineLocal(jeton, clientId, {
      configurations: configurationsDuClient.map(aiConfigurationDomaineVersWire),
      requests: requestsDuClient.map(aiRequestDomaineVersWire),
      responses: responsesDuClient.map(aiResponseDomaineVersWire),
      citations: citationsDuClient.map(citationDomaineVersWire),
    })
    if (!resultat.ok) {
      throw new Error(`Échec de la migration Reasoning Engine : ${resultat.erreur}`)
    }
    for (const [tableau, duClient] of [
      [aiConfigurationsAMigrer, configurationsDuClient],
      [aiRequestsAMigrer, requestsDuClient],
      [aiResponsesAMigrer, responsesDuClient],
      [citationsAIResponseAMigrer, citationsDuClient],
    ] as const) {
      for (const entree of duClient) {
        const index = (tableau as unknown[]).indexOf(entree)
        if (index !== -1) (tableau as unknown[]).splice(index, 1)
      }
    }
  }

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      try {
        await migrerReasoningEngineLocalVersServeur(clientId)
      } catch {
        // Nouvel essai au prochain chargement — ne bloque jamais l'affichage normal.
      }
      const { api, jeton } = await obtenirApi()
      const resultat = await api.obtenirReasoningEngine(jeton, clientId)
      if (resultat.ok) {
        configurations.value = resultat.donnees.configurations.map(aiConfigurationWireVersDomaine)
        requests.value = resultat.donnees.requests.map(aiRequestWireVersDomaine)
        responses.value = resultat.donnees.responses.map(aiResponseWireVersDomaine)
        citations.value = resultat.donnees.citations.map(citationWireVersDomaine)
      } else {
        configurations.value = []
        requests.value = []
        responses.value = []
        citations.value = []
      }
    } catch {
      // Panne réseau réelle ou relais non configuré : jamais une exception
      // non gérée, même discipline que les autres stores de ce chantier.
      configurations.value = []
      requests.value = []
      responses.value = []
      citations.value = []
    } finally {
      enChargement.value = false
    }
  }

  /**
   * Garantit l'existence de l'`AIConfiguration` courante pour ce client —
   * versionnée (condition E4 de la revue panel), immuable une fois créée.
   * Une évolution future du catalogue d'outils créerait une nouvelle
   * version plutôt que de modifier celle-ci en place. Idempotent côté
   * serveur (route Worker `gererAssurerConfiguration`) : jamais dupliquée.
   */
  async function assurerConfiguration(clientId: string): Promise<AIConfiguration> {
    const existante = configurations.value.find((c) => c.version === VERSION_CONFIGURATION_ACTUELLE)
    if (existante) return existante

    const { api, jeton } = await obtenirApi()
    const resultat = await api.assurerConfiguration(jeton, clientId, {
      version: VERSION_CONFIGURATION_ACTUELLE,
      outilsDisponibles: CATALOGUE_OUTILS_RAISONNEMENT.map((o) => o.nom),
    })
    if (!resultat.ok) {
      throw new Error(`Échec de la création de l'AIConfiguration : ${resultat.erreur}`)
    }
    const configuration = aiConfigurationWireVersDomaine(resultat.donnees.configuration)
    const dejaPresente = configurations.value.some((c) => c.id === configuration.id)
    if (!dejaPresente) {
      configurations.value = [...configurations.value, configuration]
    }
    return configuration
  }

  /**
   * Exécute le moteur de raisonnement et persiste `AIRequest`/`AIResponse`/
   * `CitationAIResponse` — charge les données nécessaires directement
   * depuis la base pour ce client (Requirement/Couverture/Test/Execution/
   * Evidence/KnowledgeItem), délègue l'orchestration à
   * `executerBoucleRaisonnement` (fonction pure hors accès base).
   */
  async function executerRaisonnement(
    clientId: string,
    entrees: EntreesRaisonnement,
  ): Promise<ResultatRaisonnement> {
    const configuration = await assurerConfiguration(clientId)

    // Structure Système migrée vers le Worker/D1 (Phase 1 du chantier de
    // migration D1) — chargée via le store dédié plutôt qu'un accès Dexie
    // direct, devenu impossible depuis cette migration.
    const structureStore = useStructureSystemeStore()
    await structureStore.charger(clientId)
    // ManufacturingContext migré vers le Worker/D1 (Phase 5a du chantier
    // de migration D1) — même patron que Structure Système ci-dessus.
    const processContextStore = useProcessContextStore()
    await processContextStore.charger(clientId)
    // QualityEvent migré vers le Worker/D1 (Phase 5b du chantier de
    // migration D1) — même patron que Process/ManufacturingContext ci-dessus.
    const qualityEventStore = useQualityEventStore()
    await qualityEventStore.charger(clientId)
    // Requirement/Couverture/Test migrés vers le Worker/D1 (Phase 6a du
    // chantier de migration D1) — même patron que ci-dessus.
    const testDefinitionStore = useTestDefinitionStore()
    await testDefinitionStore.charger(clientId)
    // Execution migrée vers le Worker/D1 (Phase 6b du chantier de
    // migration D1) — même patron que ci-dessus.
    const executionStore = useExecutionStore()
    await executionStore.charger(clientId)
    // Evidence migrée vers le Worker/D1 (Phase 6c du chantier de
    // migration D1) — même patron que ci-dessus.
    const evidenceStore = useEvidenceStore()
    await evidenceStore.charger(clientId)
    // Source/SourceVersion/Extraction/ExtractionItem/KnowledgeItem/
    // Confirmation/KnowledgeRelation/Conflict migrés vers le Worker/D1
    // (Phase 7a du chantier de migration D1) — même patron que ci-dessus.
    const sourceIntelligenceStore = useSourceIntelligenceStore()
    await sourceIntelligenceStore.charger(clientId)
    // ContextSnapshot/ContextSnapshotItem migrés vers le Worker/D1 (Phase
    // 8b du chantier de migration D1) — même patron que ci-dessus.
    const contextEngineStore = useContextEngineStore()
    await contextEngineStore.charger(clientId)

    const [procedures, procedureSteps] = await Promise.all([
      db.procedures.where('client_id').equals(clientId).toArray(),
      db.procedureSteps.where('client_id').equals(clientId).toArray(),
    ])
    const contextSnapshotItems = entrees.contextSnapshotId
      ? contextEngineStore.elementsDuSnapshot(entrees.contextSnapshotId)
      : []
    const requirements = testDefinitionStore.requirements
    const couvertures = testDefinitionStore.couvertures
    const tests = testDefinitionStore.tests
    const executions = executionStore.executions
    const evidences = evidenceStore.evidences
    const knowledgeItems = sourceIntelligenceStore.knowledgeItems
    const knowledgeRelations = sourceIntelligenceStore.knowledgeRelations
    const manufacturingContexts = processContextStore.manufacturingContexts
    const qualityEvents = qualityEventStore.evenements
    const assetNodes = structureStore.noeuds
    const relationsTechniques = structureStore.relationsTechniques

    // Narratif du ContextSnapshot en vigueur — réutilise
    // les mêmes objets déjà chargés pour les outils, jamais une seconde
    // résolution divergente.
    const narratifContexte = entrees.contextSnapshotId
      ? construireNarratifContexte({
          items: contextSnapshotItems,
          assetNodes,
          manufacturingContexts,
          qualityEvents,
        })
      : undefined

    const resultat = await executerBoucleRaisonnement({
      objectif: entrees.objectif,
      fournisseur: entrees.fournisseur,
      mode: entrees.mode,
      maxIterations: entrees.maxIterations,
      narratifContexte,
      donnees: {
        requirements,
        couvertures,
        tests,
        executions,
        evidences,
        knowledgeItems,
        assetNodes,
        relationsTechniques,
        procedures,
        procedureSteps,
        knowledgeRelations,
      },
    })

    const { api, jeton } = await obtenirApi()

    const creationRequest = await api.creerAIRequest(jeton, clientId, {
      missionId: entrees.missionId,
      contextSnapshotId: entrees.contextSnapshotId,
      aiConfigurationId: configuration.id,
      objectif: entrees.objectif,
    })
    if (!creationRequest.ok) {
      throw new Error(`Échec de la création de l'AIRequest : ${creationRequest.erreur}`)
    }
    const request = aiRequestWireVersDomaine(creationRequest.donnees.request)
    requests.value = [...requests.value, request]

    const creationResponse = await api.creerAIResponse(jeton, clientId, {
      aiRequestId: request.id,
      texte: resultat.reponse.texte,
      etatConfiance: resultat.reponse.etatConfiance,
      traceAppelsOutils: resultat.trace,
      versionMoteur: resultat.versionMoteur,
    })
    if (!creationResponse.ok) {
      throw new Error(`Échec de la création de l'AIResponse : ${creationResponse.erreur}`)
    }
    const response = aiResponseWireVersDomaine(creationResponse.donnees.response)
    responses.value = [...responses.value, response]

    // Seules les citations résolvant réellement vers un objet connu sont
    // persistées avec un type — une citation non résolvable est déjà
    // visible dans `etat_confiance: 'a_verifier'` (rétrogradée par la
    // vérification déterministe) ; lui fabriquer un `type_objet_cite`
    // deviné serait une donnée inventée (spec §4).
    const donneesConnues = {
      requirements,
      tests,
      evidences,
      knowledgeItems,
      assetNodes,
      procedureSteps,
    }
    const citationsAEnvoyer = resultat.reponse.citations.flatMap((objetId) => {
      const type = determinerTypeObjetCite(objetId, donneesConnues)
      if (type === null) return []
      return [{ aiResponseId: response.id, typeObjetCite: type, objetId }]
    })
    if (citationsAEnvoyer.length > 0) {
      const creationCitations = await api.creerCitationsAIResponse(
        jeton,
        clientId,
        citationsAEnvoyer,
      )
      if (!creationCitations.ok) {
        throw new Error(`Échec de la création des citations : ${creationCitations.erreur}`)
      }
      const nouvellesCitations = creationCitations.donnees.citations.map(citationWireVersDomaine)
      citations.value = [...citations.value, ...nouvellesCitations]
    }

    return { request, response }
  }

  function citationsDeReponse(aiResponseId: string): CitationAIResponse[] {
    return citations.value.filter((c) => c.ai_response_id === aiResponseId)
  }

  return {
    configurations,
    requests,
    responses,
    citations,
    enChargement,
    charger,
    assurerConfiguration,
    executerRaisonnement,
    citationsDeReponse,
  }
})

/** Retourne `null` si l'id cité ne correspond à aucun objet connu — jamais un type deviné. */
function determinerTypeObjetCite(
  objetId: string,
  donnees: {
    requirements: { id: string }[]
    tests: { id: string }[]
    evidences: { id: string }[]
    knowledgeItems: { id: string }[]
    assetNodes: { id: string }[]
    procedureSteps: { id: string }[]
  },
): TypeObjetCitable | null {
  if (donnees.requirements.some((r) => r.id === objetId)) return 'requirement'
  if (donnees.tests.some((t) => t.id === objetId)) return 'test'
  if (donnees.evidences.some((e) => e.id === objetId)) return 'evidence'
  if (donnees.knowledgeItems.some((k) => k.id === objetId)) return 'knowledge_item'
  if (donnees.assetNodes.some((a) => a.id === objetId)) return 'asset_node'
  if (donnees.procedureSteps.some((e) => e.id === objetId)) return 'procedure_step'
  return null
}
