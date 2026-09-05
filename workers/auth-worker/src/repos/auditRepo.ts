import type { EntreeAudit } from '../types'

/**
 * Journal d'audit — append-only, jamais modifié ni supprimé
 * (ALCOA+, même discipline que `Client.audit_log`/`EntreeJournalAudit`
 * côté frontend) : trace chaque action sensible (connexion, gestion de
 * compte, suppression définitive) avec acteur/horodatage/justification.
 */
export interface AuditRepo {
  consigner(entree: EntreeAudit): Promise<void>
  lister(limite: number): Promise<EntreeAudit[]>
}

export class AuditRepoMemoire implements AuditRepo {
  private readonly entrees: EntreeAudit[] = []

  async consigner(entree: EntreeAudit): Promise<void> {
    this.entrees.push(entree)
  }

  async lister(limite: number): Promise<EntreeAudit[]> {
    return [...this.entrees].reverse().slice(0, limite)
  }
}
