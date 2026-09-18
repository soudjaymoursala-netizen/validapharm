export interface ConnectorEnregistre {
  id: string
  clientId: string
  nom: string
  actif: boolean
  type: string
  config: string
  createdAt: string
}

export interface SyncJobEnregistre {
  id: string
  clientId: string
  connectorId: string
  statut: string
  tentative: number
  derniereErreur: string | null
  createdAt: string
  updatedAt: string
}

export interface ExternalReferenceEnregistre {
  id: string
  clientId: string
  connectorId: string
  identifiantExterne: string
  libelle: string
  createdAt: string
}

/**
 * Dépôt Integration (Target Architecture, domaine "Integration") — Phase
 * 7c du chantier de migration D1 (voir docs/CHANTIER-MIGRATION-D1-RECAP.md) :
 * troisième et dernière brique de la Phase 7. `remplacerConnector`/
 * `remplacerSyncJob` suivent le patron mutable déjà utilisé pour
 * ContentPlan/KnowledgeItem (statut/champs métier uniquement) ;
 * `supprimerConnector` est une vraie suppression physique — nouveau
 * patron dans ce chantier, justifié car `Connector` est une pure
 * configuration technique (pas un enregistrement GxP à préserver).
 * `ExternalReference` reste INSERT-only.
 */
export interface IntegrationRepo {
  listerConnectors(clientId: string): Promise<ConnectorEnregistre[]>
  creerConnector(connector: ConnectorEnregistre): Promise<void>
  connectorParId(id: string): Promise<ConnectorEnregistre | null>
  remplacerConnector(connector: ConnectorEnregistre): Promise<void>
  supprimerConnector(id: string): Promise<void>

  listerSyncJobs(clientId: string): Promise<SyncJobEnregistre[]>
  creerSyncJob(job: SyncJobEnregistre): Promise<void>
  syncJobParId(id: string): Promise<SyncJobEnregistre | null>
  remplacerSyncJob(job: SyncJobEnregistre): Promise<void>

  listerExternalReferences(clientId: string): Promise<ExternalReferenceEnregistre[]>
  creerExternalReference(reference: ExternalReferenceEnregistre): Promise<void>
}

export class IntegrationRepoMemoire implements IntegrationRepo {
  private readonly connectors = new Map<string, ConnectorEnregistre>()
  private readonly syncJobs = new Map<string, SyncJobEnregistre>()
  private readonly externalReferences = new Map<string, ExternalReferenceEnregistre>()

  async listerConnectors(clientId: string): Promise<ConnectorEnregistre[]> {
    return [...this.connectors.values()].filter((c) => c.clientId === clientId)
  }

  async creerConnector(connector: ConnectorEnregistre): Promise<void> {
    if (this.connectors.has(connector.id)) return
    this.connectors.set(connector.id, connector)
  }

  async connectorParId(id: string): Promise<ConnectorEnregistre | null> {
    return this.connectors.get(id) ?? null
  }

  async remplacerConnector(connector: ConnectorEnregistre): Promise<void> {
    this.connectors.set(connector.id, connector)
  }

  async supprimerConnector(id: string): Promise<void> {
    this.connectors.delete(id)
  }

  async listerSyncJobs(clientId: string): Promise<SyncJobEnregistre[]> {
    return [...this.syncJobs.values()].filter((j) => j.clientId === clientId)
  }

  async creerSyncJob(job: SyncJobEnregistre): Promise<void> {
    if (this.syncJobs.has(job.id)) return
    this.syncJobs.set(job.id, job)
  }

  async syncJobParId(id: string): Promise<SyncJobEnregistre | null> {
    return this.syncJobs.get(id) ?? null
  }

  async remplacerSyncJob(job: SyncJobEnregistre): Promise<void> {
    this.syncJobs.set(job.id, job)
  }

  async listerExternalReferences(clientId: string): Promise<ExternalReferenceEnregistre[]> {
    return [...this.externalReferences.values()].filter((r) => r.clientId === clientId)
  }

  async creerExternalReference(reference: ExternalReferenceEnregistre): Promise<void> {
    if (this.externalReferences.has(reference.id)) return
    this.externalReferences.set(reference.id, reference)
  }
}
