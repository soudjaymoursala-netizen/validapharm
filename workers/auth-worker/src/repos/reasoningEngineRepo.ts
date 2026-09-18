export interface AIConfigurationEnregistree {
  id: string
  clientId: string
  version: string
  outilsDisponibles: string[]
  createdAt: string
}

export interface TraceAppelOutilEnregistre {
  outil: string
  parametres: Record<string, string>
  resultat: string
  horodatage: string
}

export interface AIRequestEnregistree {
  id: string
  clientId: string
  missionId: string | null
  contextSnapshotId: string | null
  aiConfigurationId: string
  objectif: string
  createdAt: string
}

export interface AIResponseEnregistree {
  id: string
  clientId: string
  aiRequestId: string
  texte: string
  etatConfiance: string
  traceAppelsOutils: TraceAppelOutilEnregistre[]
  versionMoteur: string | null
  createdAt: string
}

export interface CitationAIResponseEnregistree {
  id: string
  clientId: string
  aiResponseId: string
  typeObjetCite: string
  objetId: string
}

/**
 * Dépôt Reasoning Engine (Target Architecture, domaine "Reasoning
 * Engine") — Phase 8c du chantier de migration D1 (voir
 * docs/CHANTIER-MIGRATION-D1-RECAP.md) : dernière brique de la Phase 8.
 * Seule la persistance CRUD des 4 entités migre — l'orchestration du
 * raisonnement (appels réseau réels au fournisseur LLM) reste côté
 * client. Les 4 entités sont entièrement immuables une fois créées,
 * INSERT-only.
 */
export interface ReasoningEngineRepo {
  listerConfigurations(clientId: string): Promise<AIConfigurationEnregistree[]>
  configurationParVersion(
    clientId: string,
    version: string,
  ): Promise<AIConfigurationEnregistree | null>
  creerConfiguration(configuration: AIConfigurationEnregistree): Promise<void>

  listerRequests(clientId: string): Promise<AIRequestEnregistree[]>
  creerRequest(request: AIRequestEnregistree): Promise<void>

  listerResponses(clientId: string): Promise<AIResponseEnregistree[]>
  creerResponse(response: AIResponseEnregistree): Promise<void>

  listerCitations(clientId: string): Promise<CitationAIResponseEnregistree[]>
  creerCitation(citation: CitationAIResponseEnregistree): Promise<void>
}

export class ReasoningEngineRepoMemoire implements ReasoningEngineRepo {
  private readonly configurations = new Map<string, AIConfigurationEnregistree>()
  private readonly requests = new Map<string, AIRequestEnregistree>()
  private readonly responses = new Map<string, AIResponseEnregistree>()
  private readonly citations = new Map<string, CitationAIResponseEnregistree>()

  async listerConfigurations(clientId: string): Promise<AIConfigurationEnregistree[]> {
    return [...this.configurations.values()].filter((c) => c.clientId === clientId)
  }

  async configurationParVersion(
    clientId: string,
    version: string,
  ): Promise<AIConfigurationEnregistree | null> {
    return (
      [...this.configurations.values()].find(
        (c) => c.clientId === clientId && c.version === version,
      ) ?? null
    )
  }

  async creerConfiguration(configuration: AIConfigurationEnregistree): Promise<void> {
    if (this.configurations.has(configuration.id)) return
    this.configurations.set(configuration.id, configuration)
  }

  async listerRequests(clientId: string): Promise<AIRequestEnregistree[]> {
    return [...this.requests.values()].filter((r) => r.clientId === clientId)
  }

  async creerRequest(request: AIRequestEnregistree): Promise<void> {
    if (this.requests.has(request.id)) return
    this.requests.set(request.id, request)
  }

  async listerResponses(clientId: string): Promise<AIResponseEnregistree[]> {
    return [...this.responses.values()].filter((r) => r.clientId === clientId)
  }

  async creerResponse(response: AIResponseEnregistree): Promise<void> {
    if (this.responses.has(response.id)) return
    this.responses.set(response.id, response)
  }

  async listerCitations(clientId: string): Promise<CitationAIResponseEnregistree[]> {
    return [...this.citations.values()].filter((c) => c.clientId === clientId)
  }

  async creerCitation(citation: CitationAIResponseEnregistree): Promise<void> {
    if (this.citations.has(citation.id)) return
    this.citations.set(citation.id, citation)
  }
}
