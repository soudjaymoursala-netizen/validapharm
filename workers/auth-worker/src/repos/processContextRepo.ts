export interface EntreeJournalAuditEnregistree {
  timestamp: string
  actor: string
  action: string
}

export interface ProcessEnregistre {
  id: string
  clientId: string
  nom: string
  description: string
  type: string
  sourceId: string | null
  auditLog: EntreeJournalAuditEnregistree[]
  createdAt: string
  updatedAt: string
}

export interface FonctionActifEnregistree {
  id: string
  clientId: string
  nom: string
  description: string
  auditLog: EntreeJournalAuditEnregistree[]
  createdAt: string
  updatedAt: string
}

export interface AssociationFonctionAssetNodeEnregistree {
  id: string
  clientId: string
  functionId: string
  assetNodeId: string
  createdAt: string
}

export interface AssociationFonctionProcessEnregistree {
  id: string
  clientId: string
  functionId: string
  processId: string
  createdAt: string
}

export interface ManufacturingContextEnregistre {
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

/**
 * Dépôt Process/FonctionActif/ManufacturingContext (Target Architecture
 * §4/§5/§7) — Phase 5a du chantier de migration D1 (voir
 * docs/CHANTIER-MIGRATION-D1-RECAP.md). Regroupe les 5 types du même
 * sous-domaine dans un seul dépôt (même patron que `ParametersRepo`
 * regroupant Parameter/ClassificationCriticiteParametre/CPP/CQA). Ce
 * dépôt ne fait que persister l'état qu'on lui donne — la logique métier
 * (dédoublonnage client-side d'une association déjà existante) reste
 * côté store frontend (`useProcessContextStore.ts`, déjà testée).
 */
export interface ProcessContextRepo {
  listerProcesses(clientId: string): Promise<ProcessEnregistre[]>
  creerProcess(process: ProcessEnregistre): Promise<void>
  listerFonctions(clientId: string): Promise<FonctionActifEnregistree[]>
  creerFonction(fonction: FonctionActifEnregistree): Promise<void>
  listerAssociationsFonctionAssetNode(
    clientId: string,
  ): Promise<AssociationFonctionAssetNodeEnregistree[]>
  creerAssociationFonctionAssetNode(
    association: AssociationFonctionAssetNodeEnregistree,
  ): Promise<void>
  listerAssociationsFonctionProcess(
    clientId: string,
  ): Promise<AssociationFonctionProcessEnregistree[]>
  creerAssociationFonctionProcess(association: AssociationFonctionProcessEnregistree): Promise<void>
  listerManufacturingContexts(clientId: string): Promise<ManufacturingContextEnregistre[]>
  creerManufacturingContext(contexte: ManufacturingContextEnregistre): Promise<void>
}

export class ProcessContextRepoMemoire implements ProcessContextRepo {
  private readonly processes = new Map<string, ProcessEnregistre>()
  private readonly fonctions = new Map<string, FonctionActifEnregistree>()
  private readonly associationsFonctionAssetNode = new Map<
    string,
    AssociationFonctionAssetNodeEnregistree
  >()
  private readonly associationsFonctionProcess = new Map<
    string,
    AssociationFonctionProcessEnregistree
  >()
  private readonly manufacturingContexts = new Map<string, ManufacturingContextEnregistre>()

  async listerProcesses(clientId: string): Promise<ProcessEnregistre[]> {
    return [...this.processes.values()].filter((p) => p.clientId === clientId)
  }

  async creerProcess(process: ProcessEnregistre): Promise<void> {
    if (this.processes.has(process.id)) return
    this.processes.set(process.id, process)
  }

  async listerFonctions(clientId: string): Promise<FonctionActifEnregistree[]> {
    return [...this.fonctions.values()].filter((f) => f.clientId === clientId)
  }

  async creerFonction(fonction: FonctionActifEnregistree): Promise<void> {
    if (this.fonctions.has(fonction.id)) return
    this.fonctions.set(fonction.id, fonction)
  }

  async listerAssociationsFonctionAssetNode(
    clientId: string,
  ): Promise<AssociationFonctionAssetNodeEnregistree[]> {
    return [...this.associationsFonctionAssetNode.values()].filter((a) => a.clientId === clientId)
  }

  async creerAssociationFonctionAssetNode(
    association: AssociationFonctionAssetNodeEnregistree,
  ): Promise<void> {
    if (this.associationsFonctionAssetNode.has(association.id)) return
    this.associationsFonctionAssetNode.set(association.id, association)
  }

  async listerAssociationsFonctionProcess(
    clientId: string,
  ): Promise<AssociationFonctionProcessEnregistree[]> {
    return [...this.associationsFonctionProcess.values()].filter((a) => a.clientId === clientId)
  }

  async creerAssociationFonctionProcess(
    association: AssociationFonctionProcessEnregistree,
  ): Promise<void> {
    if (this.associationsFonctionProcess.has(association.id)) return
    this.associationsFonctionProcess.set(association.id, association)
  }

  async listerManufacturingContexts(clientId: string): Promise<ManufacturingContextEnregistre[]> {
    return [...this.manufacturingContexts.values()].filter((c) => c.clientId === clientId)
  }

  async creerManufacturingContext(contexte: ManufacturingContextEnregistre): Promise<void> {
    if (this.manufacturingContexts.has(contexte.id)) return
    this.manufacturingContexts.set(contexte.id, contexte)
  }
}
