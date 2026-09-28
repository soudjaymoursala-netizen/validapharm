export interface QualificationFiabiliteIAEnregistree {
  date: string
  resultat: string
  qualificationTestSetId: string
  qualificationTestSetVersion: string
  moteurVersionQualifiee: string | null
  /** Compte qui a enregistré cette qualification (fixé par le serveur, audit M8). */
  par?: string
  /** Horodatage serveur de l'enregistrement (`date` reste la date de la campagne, saisie). */
  enregistreeLe?: string
}

export interface ClientConfigEnregistre {
  clientId: string
  aiProvider: string
  aiProviderConditionsAcquittees: { fournisseur: string; date: string; par?: string } | null
  aiProviderReliabilityQualification: {
    chat_normatif: QualificationFiabiliteIAEnregistree | null
    audit_simule: QualificationFiabiliteIAEnregistree | null
  }
  exportTemplateId: string | null
  consentTelemetry: { granted: boolean; date: string | null; revocableAtAnyTime: boolean }
}

/**
 * Dépôt de la configuration IA par client — un enregistrement mutable par
 * client (`clientId`), jamais un historique : `enregistrer` est toujours
 * un upsert complet (même discipline que `ConnexionDriveRepo`, Phase 9d).
 * Phase 9f du chantier de migration D1 (voir
 * docs/CHANTIER-MIGRATION-D1-RECAP.md) — dernière phase du chantier.
 */
export interface ClientConfigRepo {
  obtenirParClient(clientId: string): Promise<ClientConfigEnregistre | null>
  enregistrer(config: ClientConfigEnregistre): Promise<void>
}

export class ClientConfigRepoMemoire implements ClientConfigRepo {
  private readonly parClient = new Map<string, ClientConfigEnregistre>()

  async obtenirParClient(clientId: string): Promise<ClientConfigEnregistre | null> {
    return this.parClient.get(clientId) ?? null
  }

  async enregistrer(config: ClientConfigEnregistre): Promise<void> {
    this.parClient.set(config.clientId, config)
  }
}
