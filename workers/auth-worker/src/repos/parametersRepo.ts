export interface EntreeJournalAuditEnregistree {
  timestamp: string
  actor: string
  action: string
}

export interface ParameterEnregistre {
  id: string
  clientId: string
  assetNodeId: string | null
  nom: string
  description: string
  unite: string | null
  auditLog: EntreeJournalAuditEnregistree[]
  createdAt: string
  updatedAt: string
}

export interface ClassificationCriticiteParametreEnregistree {
  id: string
  clientId: string
  parameterId: string
  niveau: string
  contexte: string | null
  justification: string
  auditLog: EntreeJournalAuditEnregistree[]
  createdAt: string
}

export interface CPPEnregistre {
  id: string
  clientId: string
  parameterId: string
  contexte: string
  justification: string
  actif: boolean
  auditLog: EntreeJournalAuditEnregistree[]
  createdAt: string
  updatedAt: string
}

export interface CQAEnregistre {
  id: string
  clientId: string
  nom: string
  description: string
  contexte: string
  justification: string
  actif: boolean
  auditLog: EntreeJournalAuditEnregistree[]
  createdAt: string
  updatedAt: string
}

/**
 * Dépôt Parameter/ClassificationCriticiteParametre/CPP/CQA (Target
 * Architecture §10) — Phase 4b du chantier de migration D1 (voir
 * docs/CHANTIER-MIGRATION-D1-RECAP.md). Garde-fou central inchangé : ce
 * dépôt ne fait jamais de promotion automatique classification -> CPP/CQA,
 * ce sont des actes de déclaration humaine distincts, déjà séparés côté
 * store frontend (`useParameterStore.ts`) — même discipline que
 * `ACFCRepo`/`StructureSystemeRepo`.
 */
export interface ParametersRepo {
  listerParametres(clientId: string): Promise<ParameterEnregistre[]>
  creerParametre(parametre: ParameterEnregistre): Promise<void>
  listerClassifications(clientId: string): Promise<ClassificationCriticiteParametreEnregistree[]>
  creerClassification(classification: ClassificationCriticiteParametreEnregistree): Promise<void>
  listerCPPs(clientId: string): Promise<CPPEnregistre[]>
  creerCPP(cpp: CPPEnregistre): Promise<void>
  cppParId(id: string): Promise<CPPEnregistre | null>
  remplacerCPP(cpp: CPPEnregistre): Promise<void>
  listerCQAs(clientId: string): Promise<CQAEnregistre[]>
  creerCQA(cqa: CQAEnregistre): Promise<void>
  cqaParId(id: string): Promise<CQAEnregistre | null>
  remplacerCQA(cqa: CQAEnregistre): Promise<void>
}

export class ParametersRepoMemoire implements ParametersRepo {
  private readonly parametres = new Map<string, ParameterEnregistre>()
  private readonly classifications = new Map<string, ClassificationCriticiteParametreEnregistree>()
  private readonly cpps = new Map<string, CPPEnregistre>()
  private readonly cqas = new Map<string, CQAEnregistre>()

  async listerParametres(clientId: string): Promise<ParameterEnregistre[]> {
    return [...this.parametres.values()].filter((p) => p.clientId === clientId)
  }

  async creerParametre(parametre: ParameterEnregistre): Promise<void> {
    if (this.parametres.has(parametre.id)) return
    this.parametres.set(parametre.id, parametre)
  }

  async listerClassifications(
    clientId: string,
  ): Promise<ClassificationCriticiteParametreEnregistree[]> {
    return [...this.classifications.values()].filter((c) => c.clientId === clientId)
  }

  async creerClassification(
    classification: ClassificationCriticiteParametreEnregistree,
  ): Promise<void> {
    if (this.classifications.has(classification.id)) return
    this.classifications.set(classification.id, classification)
  }

  async listerCPPs(clientId: string): Promise<CPPEnregistre[]> {
    return [...this.cpps.values()].filter((c) => c.clientId === clientId)
  }

  async creerCPP(cpp: CPPEnregistre): Promise<void> {
    if (this.cpps.has(cpp.id)) return
    this.cpps.set(cpp.id, cpp)
  }

  async cppParId(id: string): Promise<CPPEnregistre | null> {
    return this.cpps.get(id) ?? null
  }

  async remplacerCPP(cpp: CPPEnregistre): Promise<void> {
    this.cpps.set(cpp.id, cpp)
  }

  async listerCQAs(clientId: string): Promise<CQAEnregistre[]> {
    return [...this.cqas.values()].filter((c) => c.clientId === clientId)
  }

  async creerCQA(cqa: CQAEnregistre): Promise<void> {
    if (this.cqas.has(cqa.id)) return
    this.cqas.set(cqa.id, cqa)
  }

  async cqaParId(id: string): Promise<CQAEnregistre | null> {
    return this.cqas.get(id) ?? null
  }

  async remplacerCQA(cqa: CQAEnregistre): Promise<void> {
    this.cqas.set(cqa.id, cqa)
  }
}
