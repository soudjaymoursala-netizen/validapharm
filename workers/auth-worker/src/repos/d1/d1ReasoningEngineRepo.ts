import type { D1Database } from '../../d1Types'
import type {
  AIConfigurationEnregistree,
  AIRequestEnregistree,
  AIResponseEnregistree,
  CitationAIResponseEnregistree,
  ReasoningEngineRepo,
} from '../reasoningEngineRepo'

function ligneVersConfiguration(l: Record<string, unknown>): AIConfigurationEnregistree {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    version: l.version as string,
    outilsDisponibles: JSON.parse(l.outils_disponibles as string),
    createdAt: l.created_at as string,
  }
}

function ligneVersRequest(l: Record<string, unknown>): AIRequestEnregistree {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    missionId: l.mission_id as string | null,
    contextSnapshotId: l.context_snapshot_id as string | null,
    aiConfigurationId: l.ai_configuration_id as string,
    objectif: l.objectif as string,
    createdAt: l.created_at as string,
  }
}

function ligneVersResponse(l: Record<string, unknown>): AIResponseEnregistree {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    aiRequestId: l.ai_request_id as string,
    texte: l.texte as string,
    etatConfiance: l.etat_confiance as string,
    traceAppelsOutils: JSON.parse(l.trace_appels_outils as string),
    versionMoteur: l.version_moteur as string | null,
    createdAt: l.created_at as string,
  }
}

function ligneVersCitation(l: Record<string, unknown>): CitationAIResponseEnregistree {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    aiResponseId: l.ai_response_id as string,
    typeObjetCite: l.type_objet_cite as string,
    objetId: l.objet_id as string,
  }
}

export class D1ReasoningEngineRepo implements ReasoningEngineRepo {
  constructor(private readonly db: D1Database) {}

  async listerConfigurations(clientId: string): Promise<AIConfigurationEnregistree[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM ai_configurations WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersConfiguration(l as Record<string, unknown>))
  }

  async configurationParVersion(
    clientId: string,
    version: string,
  ): Promise<AIConfigurationEnregistree | null> {
    const ligne = await this.db
      .prepare('SELECT * FROM ai_configurations WHERE client_id = ? AND version = ?')
      .bind(clientId, version)
      .first()
    return ligne ? ligneVersConfiguration(ligne as Record<string, unknown>) : null
  }

  async creerConfiguration(configuration: AIConfigurationEnregistree): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO ai_configurations (id, client_id, version, outils_disponibles, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        configuration.id,
        configuration.clientId,
        configuration.version,
        JSON.stringify(configuration.outilsDisponibles),
        configuration.createdAt,
      )
      .run()
  }

  async listerRequests(clientId: string): Promise<AIRequestEnregistree[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM ai_requests WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersRequest(l as Record<string, unknown>))
  }

  async creerRequest(request: AIRequestEnregistree): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO ai_requests
          (id, client_id, mission_id, context_snapshot_id, ai_configuration_id, objectif, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        request.id,
        request.clientId,
        request.missionId,
        request.contextSnapshotId,
        request.aiConfigurationId,
        request.objectif,
        request.createdAt,
      )
      .run()
  }

  async listerResponses(clientId: string): Promise<AIResponseEnregistree[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM ai_responses WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersResponse(l as Record<string, unknown>))
  }

  async creerResponse(response: AIResponseEnregistree): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO ai_responses
          (id, client_id, ai_request_id, texte, etat_confiance, trace_appels_outils, version_moteur, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        response.id,
        response.clientId,
        response.aiRequestId,
        response.texte,
        response.etatConfiance,
        JSON.stringify(response.traceAppelsOutils),
        response.versionMoteur,
        response.createdAt,
      )
      .run()
  }

  async listerCitations(clientId: string): Promise<CitationAIResponseEnregistree[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM citations_ai_response WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersCitation(l as Record<string, unknown>))
  }

  async creerCitation(citation: CitationAIResponseEnregistree): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO citations_ai_response
          (id, client_id, ai_response_id, type_objet_cite, objet_id)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        citation.id,
        citation.clientId,
        citation.aiResponseId,
        citation.typeObjetCite,
        citation.objetId,
      )
      .run()
  }
}
