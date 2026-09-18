export interface ProcedureEnregistree {
  id: string
  clientId: string
  reference: string
  numeroVersion: number
  titre: string
  effectiveDate: string
  categorie: string
  sourceId: string | null
  createdAt: string
}

export interface ProcedureStepEnregistree {
  id: string
  clientId: string
  procedureId: string
  ordre: number
  description: string
  obligatoire: boolean
  condition: string | null
  responsable: string | null
  createdAt: string
}

/**
 * Dépôt Procedure/ProcedureStep (cerveau procédural) — Phase 9a du
 * chantier de migration D1 (voir docs/CHANTIER-MIGRATION-D1-RECAP.md).
 * Les deux entités sont entièrement immuables (INSERT-only) : une
 * nouvelle révision d'une `reference` crée une nouvelle `Procedure` avec
 * un `numeroVersion` incrémenté, jamais une modification en place.
 */
export interface ProcedureRepo {
  listerProcedures(clientId: string): Promise<ProcedureEnregistree[]>
  procedureParId(clientId: string, id: string): Promise<ProcedureEnregistree | null>
  creerProcedure(procedure: ProcedureEnregistree): Promise<void>

  listerEtapes(clientId: string): Promise<ProcedureStepEnregistree[]>
  creerEtape(etape: ProcedureStepEnregistree): Promise<void>
}

export class ProcedureRepoMemoire implements ProcedureRepo {
  private readonly procedures = new Map<string, ProcedureEnregistree>()
  private readonly etapes = new Map<string, ProcedureStepEnregistree>()

  async listerProcedures(clientId: string): Promise<ProcedureEnregistree[]> {
    return [...this.procedures.values()].filter((p) => p.clientId === clientId)
  }

  async procedureParId(clientId: string, id: string): Promise<ProcedureEnregistree | null> {
    const procedure = this.procedures.get(id)
    if (!procedure || procedure.clientId !== clientId) return null
    return procedure
  }

  async creerProcedure(procedure: ProcedureEnregistree): Promise<void> {
    if (this.procedures.has(procedure.id)) return
    this.procedures.set(procedure.id, procedure)
  }

  async listerEtapes(clientId: string): Promise<ProcedureStepEnregistree[]> {
    return [...this.etapes.values()].filter((e) => e.clientId === clientId)
  }

  async creerEtape(etape: ProcedureStepEnregistree): Promise<void> {
    if (this.etapes.has(etape.id)) return
    this.etapes.set(etape.id, etape)
  }
}
