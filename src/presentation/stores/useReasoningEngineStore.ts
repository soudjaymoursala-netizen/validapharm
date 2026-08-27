import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ProviderAdapter } from '../../connecteurs/ia/ProviderAdapter'
import type { ModeUsageIA } from '../../connecteurs/ia/ProviderAdapter'
import type {
  AIConfiguration,
  AIRequest,
  AIResponse,
  CitationAIResponse,
  TypeObjetCitable,
} from '../../logique-metier/domaine/types'
import { executerBoucleRaisonnement } from '../../logique-metier/raisonnement/boucleRaisonnement'
import { CATALOGUE_OUTILS_RAISONNEMENT } from '../../logique-metier/raisonnement/outilsRaisonnement'
import { db } from '../../persistance/db'

const VERSION_CONFIGURATION_ACTUELLE = 'v1'

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
 * Store du moteur de raisonnement (Phase 15 de convergence architecturale
 * — spec détaillée dans `docs/convergence/PHASE_15_REASONING_ENGINE_SPEC.md`,
 * TD-007/TD-008).
 *
 * **Garde-fou non négociable** : aucune fonction de ce store n'écrit le
 * contenu d'une `AIResponse` dans `Requirement`/`Test`/`KnowledgeItem` —
 * même principe que `Confirmation` (Phase 8a), cohérent avec le principe
 * fondateur n°1. `AIRequest`/`AIResponse` sont immuables une fois créés
 * (aucune fonction de mise à jour exposée).
 *
 * @requirement docs/convergence/CONVERGENCE_PLAN.md, Phase 15
 */
export const useReasoningEngineStore = defineStore('reasoningEngine', () => {
  const configurations = ref<AIConfiguration[]>([])
  const requests = ref<AIRequest[]>([])
  const responses = ref<AIResponse[]>([])
  const citations = ref<CitationAIResponse[]>([])
  const enChargement = ref(false)

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      configurations.value = await db.aiConfigurations.where('client_id').equals(clientId).toArray()
      requests.value = await db.aiRequests.where('client_id').equals(clientId).toArray()
      responses.value = await db.aiResponses.where('client_id').equals(clientId).toArray()
      citations.value = await db.citationsAIResponse.where('client_id').equals(clientId).toArray()
    } finally {
      enChargement.value = false
    }
  }

  /**
   * Garantit l'existence de l'`AIConfiguration` courante pour ce client —
   * versionnée (condition E4 de la revue panel), immuable une fois créée.
   * Une évolution future du catalogue d'outils créerait une nouvelle
   * version plutôt que de modifier celle-ci en place.
   */
  async function assurerConfiguration(clientId: string): Promise<AIConfiguration> {
    const existante = configurations.value.find((c) => c.version === VERSION_CONFIGURATION_ACTUELLE)
    if (existante) return existante

    const configuration: AIConfiguration = {
      id: crypto.randomUUID(),
      client_id: clientId,
      version: VERSION_CONFIGURATION_ACTUELLE,
      outils_disponibles: CATALOGUE_OUTILS_RAISONNEMENT.map((o) => o.nom),
      created_at: new Date().toISOString(),
    }
    await db.aiConfigurations.put(configuration)
    configurations.value = [...configurations.value, configuration]
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

    const [
      requirements,
      couvertures,
      tests,
      executions,
      evidences,
      knowledgeItems,
      assetNodes,
      relationsTechniques,
    ] = await Promise.all([
      db.requirements.where('client_id').equals(clientId).toArray(),
      db.couvertures.where('client_id').equals(clientId).toArray(),
      db.tests.where('client_id').equals(clientId).toArray(),
      db.executions.where('client_id').equals(clientId).toArray(),
      db.evidences.where('client_id').equals(clientId).toArray(),
      db.knowledgeItems.where('client_id').equals(clientId).toArray(),
      db.assetNodes.where('client_id').equals(clientId).toArray(),
      db.relationsTechniques.where('client_id').equals(clientId).toArray(),
    ])

    const resultat = await executerBoucleRaisonnement({
      objectif: entrees.objectif,
      fournisseur: entrees.fournisseur,
      mode: entrees.mode,
      maxIterations: entrees.maxIterations,
      donnees: {
        requirements,
        couvertures,
        tests,
        executions,
        evidences,
        knowledgeItems,
        assetNodes,
        relationsTechniques,
      },
    })

    const maintenant = new Date().toISOString()
    const request: AIRequest = {
      id: crypto.randomUUID(),
      client_id: clientId,
      mission_id: entrees.missionId,
      context_snapshot_id: entrees.contextSnapshotId,
      ai_configuration_id: configuration.id,
      objectif: entrees.objectif,
      created_at: maintenant,
    }
    await db.aiRequests.put(request)
    requests.value = [...requests.value, request]

    const response: AIResponse = {
      id: crypto.randomUUID(),
      client_id: clientId,
      ai_request_id: request.id,
      texte: resultat.reponse.texte,
      etat_confiance: resultat.reponse.etatConfiance,
      trace_appels_outils: resultat.trace,
      version_moteur: resultat.versionMoteur,
      created_at: maintenant,
    }
    await db.aiResponses.put(response)
    responses.value = [...responses.value, response]

    // Seules les citations résolvant réellement vers un objet connu sont
    // persistées avec un type — une citation non résolvable est déjà
    // visible dans `etat_confiance: 'a_verifier'` (rétrogradée par la
    // vérification déterministe) ; lui fabriquer un `type_objet_cite`
    // deviné serait une donnée inventée (spec §4).
    const donneesConnues = { requirements, tests, evidences, knowledgeItems, assetNodes }
    const nouvellesCitations: CitationAIResponse[] = resultat.reponse.citations.flatMap(
      (objetId) => {
        const type = determinerTypeObjetCite(objetId, donneesConnues)
        if (type === null) return []
        return [
          {
            id: crypto.randomUUID(),
            client_id: clientId,
            ai_response_id: response.id,
            type_objet_cite: type,
            objet_id: objetId,
          },
        ]
      },
    )
    if (nouvellesCitations.length > 0) {
      await db.citationsAIResponse.bulkPut(nouvellesCitations)
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
  },
): TypeObjetCitable | null {
  if (donnees.requirements.some((r) => r.id === objetId)) return 'requirement'
  if (donnees.tests.some((t) => t.id === objetId)) return 'test'
  if (donnees.evidences.some((e) => e.id === objetId)) return 'evidence'
  if (donnees.knowledgeItems.some((k) => k.id === objetId)) return 'knowledge_item'
  if (donnees.assetNodes.some((a) => a.id === objetId)) return 'asset_node'
  return null
}
