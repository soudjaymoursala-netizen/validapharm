import type { D1Database } from '../../d1Types'
import type { ClientConfigEnregistre, ClientConfigRepo } from '../clientConfigRepo'

interface LigneClientConfig {
  client_id: string
  ai_provider: string
  ai_provider_conditions_acquittees: string | null
  ai_provider_reliability_qualification: string
  export_template_id: string | null
  consent_telemetry: string
}

function ligneVersConfig(ligne: LigneClientConfig): ClientConfigEnregistre {
  return {
    clientId: ligne.client_id,
    aiProvider: ligne.ai_provider,
    aiProviderConditionsAcquittees: ligne.ai_provider_conditions_acquittees
      ? (JSON.parse(
          ligne.ai_provider_conditions_acquittees,
        ) as ClientConfigEnregistre['aiProviderConditionsAcquittees'])
      : null,
    aiProviderReliabilityQualification: JSON.parse(
      ligne.ai_provider_reliability_qualification,
    ) as ClientConfigEnregistre['aiProviderReliabilityQualification'],
    exportTemplateId: ligne.export_template_id,
    consentTelemetry: JSON.parse(
      ligne.consent_telemetry,
    ) as ClientConfigEnregistre['consentTelemetry'],
  }
}

/** Implémentation D1 du dépôt de configuration IA par client — voir `d1ConnexionDriveRepo.ts` pour la discipline générale d'upsert. */
export class D1ClientConfigRepo implements ClientConfigRepo {
  constructor(private readonly db: D1Database) {}

  async obtenirParClient(clientId: string): Promise<ClientConfigEnregistre | null> {
    const ligne = await this.db
      .prepare('SELECT * FROM client_configs WHERE client_id = ?')
      .bind(clientId)
      .first<LigneClientConfig>()
    return ligne ? ligneVersConfig(ligne) : null
  }

  async enregistrer(config: ClientConfigEnregistre): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO client_configs (
           client_id, ai_provider, ai_provider_conditions_acquittees,
           ai_provider_reliability_qualification, export_template_id, consent_telemetry
         )
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(client_id) DO UPDATE SET
           ai_provider = excluded.ai_provider,
           ai_provider_conditions_acquittees = excluded.ai_provider_conditions_acquittees,
           ai_provider_reliability_qualification = excluded.ai_provider_reliability_qualification,
           export_template_id = excluded.export_template_id,
           consent_telemetry = excluded.consent_telemetry`,
      )
      .bind(
        config.clientId,
        config.aiProvider,
        config.aiProviderConditionsAcquittees
          ? JSON.stringify(config.aiProviderConditionsAcquittees)
          : null,
        JSON.stringify(config.aiProviderReliabilityQualification),
        config.exportTemplateId,
        JSON.stringify(config.consentTelemetry),
      )
      .run()
  }
}
