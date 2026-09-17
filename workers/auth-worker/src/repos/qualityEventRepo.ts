export interface EntreeJournalAuditEnregistree {
  timestamp: string
  actor: string
  action: string
}

export interface ReferenceExterneQualityEventEnregistree {
  systeme: string
  identifiant: string
}

export interface QualityEventEnregistre {
  id: string
  clientId: string
  type: string
  titre: string
  description: string
  origine: string
  referenceExterne: ReferenceExterneQualityEventEnregistree | null
  assetNodeId: string | null
  processId: string | null
  manufacturingContextId: string | null
  statut: string
  auditLog: EntreeJournalAuditEnregistree[]
  createdAt: string
  updatedAt: string
}

export interface ReferenceQualityEventEnregistree {
  id: string
  clientId: string
  qualityEventSourceId: string
  qualityEventCibleId: string
  createdAt: string
}

/**
 * Dépôt QualityEvent/ReferenceQualityEvent (URS catalogue §10 famille
 * H/I) — Phase 5b du chantier de migration D1 (voir
 * docs/CHANTIER-MIGRATION-D1-RECAP.md), dernière brique de la Phase 5.
 * Garde-fou central inchangé : ce dépôt ne fait jamais bloquer une
 * opération d'un autre module à partir d'un `QualityEvent` externe — un
 * événement externe est seulement référencé (`referenceExterne`), jamais
 * un verrou, discipline déjà appliquée côté store frontend
 * (`useQualityEventStore.ts`, déjà testée).
 */
export interface QualityEventRepo {
  listerEvenements(clientId: string): Promise<QualityEventEnregistre[]>
  creerEvenement(evenement: QualityEventEnregistre): Promise<void>
  evenementParId(id: string): Promise<QualityEventEnregistre | null>
  remplacerEvenement(evenement: QualityEventEnregistre): Promise<void>
  listerReferences(clientId: string): Promise<ReferenceQualityEventEnregistree[]>
  creerReference(reference: ReferenceQualityEventEnregistree): Promise<void>
}

export class QualityEventRepoMemoire implements QualityEventRepo {
  private readonly evenements = new Map<string, QualityEventEnregistre>()
  private readonly references = new Map<string, ReferenceQualityEventEnregistree>()

  async listerEvenements(clientId: string): Promise<QualityEventEnregistre[]> {
    return [...this.evenements.values()].filter((e) => e.clientId === clientId)
  }

  async creerEvenement(evenement: QualityEventEnregistre): Promise<void> {
    if (this.evenements.has(evenement.id)) return
    this.evenements.set(evenement.id, evenement)
  }

  async evenementParId(id: string): Promise<QualityEventEnregistre | null> {
    return this.evenements.get(id) ?? null
  }

  async remplacerEvenement(evenement: QualityEventEnregistre): Promise<void> {
    this.evenements.set(evenement.id, evenement)
  }

  async listerReferences(clientId: string): Promise<ReferenceQualityEventEnregistree[]> {
    return [...this.references.values()].filter((r) => r.clientId === clientId)
  }

  async creerReference(reference: ReferenceQualityEventEnregistree): Promise<void> {
    if (this.references.has(reference.id)) return
    this.references.set(reference.id, reference)
  }
}
