export interface EntreeJournalAuditEnregistree {
  timestamp: string
  actor: string
  action: string
}

export interface SourceEnregistree {
  id: string
  clientId: string
  type: string
  titre: string
  createdAt: string
}

export interface SourceLocationEnregistree {
  id: string
  clientId: string
  sourceId: string
  systeme: string
  reference: string
}

export interface SourceVersionEnregistree {
  id: string
  clientId: string
  sourceId: string
  numeroVersion: number
  createdAt: string
}

export interface ExtractionEnregistree {
  id: string
  clientId: string
  sourceVersionId: string
  methode: string
  horodatage: string
}

export interface ExtractionItemEnregistre {
  id: string
  clientId: string
  extractionId: string
  contenu: string
  position: number
}

export interface KnowledgeItemEnregistre {
  id: string
  clientId: string
  extractionItemId: string
  libelle: string
  valeurInterpretee: string
  statut: string
  validePar: string | null
  auditLog: EntreeJournalAuditEnregistree[]
  createdAt: string
  updatedAt: string
}

export interface ConfirmationEnregistree {
  id: string
  clientId: string
  knowledgeItemId: string
  decision: string
  confirmePar: string
  horodatage: string
}

export interface KnowledgeRelationEnregistree {
  id: string
  clientId: string
  knowledgeItemSourceId: string
  knowledgeItemCibleId: string
  type: string
  createdAt: string
}

export interface ConflictEnregistre {
  id: string
  clientId: string
  knowledgeItemSourceId: string
  knowledgeItemCibleId: string
  description: string
  statut: string
  resolution: string | null
  createdAt: string
}

/**
 * Dépôt Source/SourceLocation/SourceVersion/Extraction/ExtractionItem/
 * KnowledgeItem/Confirmation/KnowledgeRelation/Conflict (Target
 * Architecture, domaines "Source Intelligence" et "Knowledge") — Phase 7a
 * du chantier de migration D1 (voir docs/CHANTIER-MIGRATION-D1-RECAP.md) :
 * première brique de la Phase 7 (Knowledge Engine). `knowledgeItemParId`/
 * `remplacerKnowledgeItem` et `conflictParId`/`remplacerConflict` suivent
 * le patron mutable déjà utilisé pour TestCandidate/Test (Phase 6a) et
 * Execution (Phase 6b) — toutes les autres entités sont immutables une
 * fois créées.
 */
export interface KnowledgeEngineRepo {
  listerSources(clientId: string): Promise<SourceEnregistree[]>
  creerSource(source: SourceEnregistree): Promise<void>
  sourceParId(id: string): Promise<SourceEnregistree | null>
  listerSourceLocations(clientId: string): Promise<SourceLocationEnregistree[]>
  creerSourceLocation(localisation: SourceLocationEnregistree): Promise<void>
  listerSourceVersions(clientId: string): Promise<SourceVersionEnregistree[]>
  creerSourceVersion(version: SourceVersionEnregistree): Promise<void>
  sourceVersionParId(id: string): Promise<SourceVersionEnregistree | null>
  listerExtractions(clientId: string): Promise<ExtractionEnregistree[]>
  creerExtraction(extraction: ExtractionEnregistree): Promise<void>
  extractionParId(id: string): Promise<ExtractionEnregistree | null>
  listerExtractionItems(clientId: string): Promise<ExtractionItemEnregistre[]>
  creerExtractionItem(item: ExtractionItemEnregistre): Promise<void>
  listerKnowledgeItems(clientId: string): Promise<KnowledgeItemEnregistre[]>
  creerKnowledgeItem(item: KnowledgeItemEnregistre): Promise<void>
  knowledgeItemParId(id: string): Promise<KnowledgeItemEnregistre | null>
  remplacerKnowledgeItem(item: KnowledgeItemEnregistre): Promise<void>
  listerConfirmations(clientId: string): Promise<ConfirmationEnregistree[]>
  creerConfirmation(confirmation: ConfirmationEnregistree): Promise<void>
  listerKnowledgeRelations(clientId: string): Promise<KnowledgeRelationEnregistree[]>
  creerKnowledgeRelation(relation: KnowledgeRelationEnregistree): Promise<void>
  listerConflicts(clientId: string): Promise<ConflictEnregistre[]>
  creerConflict(conflit: ConflictEnregistre): Promise<void>
  conflictParId(id: string): Promise<ConflictEnregistre | null>
  remplacerConflict(conflit: ConflictEnregistre): Promise<void>
}

export class KnowledgeEngineRepoMemoire implements KnowledgeEngineRepo {
  private readonly sources = new Map<string, SourceEnregistree>()
  private readonly sourceLocations = new Map<string, SourceLocationEnregistree>()
  private readonly sourceVersions = new Map<string, SourceVersionEnregistree>()
  private readonly extractions = new Map<string, ExtractionEnregistree>()
  private readonly extractionItems = new Map<string, ExtractionItemEnregistre>()
  private readonly knowledgeItems = new Map<string, KnowledgeItemEnregistre>()
  private readonly confirmations = new Map<string, ConfirmationEnregistree>()
  private readonly knowledgeRelations = new Map<string, KnowledgeRelationEnregistree>()
  private readonly conflicts = new Map<string, ConflictEnregistre>()

  async listerSources(clientId: string): Promise<SourceEnregistree[]> {
    return [...this.sources.values()].filter((s) => s.clientId === clientId)
  }

  async creerSource(source: SourceEnregistree): Promise<void> {
    if (this.sources.has(source.id)) return
    this.sources.set(source.id, source)
  }

  async sourceParId(id: string): Promise<SourceEnregistree | null> {
    return this.sources.get(id) ?? null
  }

  async listerSourceLocations(clientId: string): Promise<SourceLocationEnregistree[]> {
    return [...this.sourceLocations.values()].filter((l) => l.clientId === clientId)
  }

  async creerSourceLocation(localisation: SourceLocationEnregistree): Promise<void> {
    if (this.sourceLocations.has(localisation.id)) return
    this.sourceLocations.set(localisation.id, localisation)
  }

  async listerSourceVersions(clientId: string): Promise<SourceVersionEnregistree[]> {
    return [...this.sourceVersions.values()].filter((v) => v.clientId === clientId)
  }

  async creerSourceVersion(version: SourceVersionEnregistree): Promise<void> {
    if (this.sourceVersions.has(version.id)) return
    this.sourceVersions.set(version.id, version)
  }

  async sourceVersionParId(id: string): Promise<SourceVersionEnregistree | null> {
    return this.sourceVersions.get(id) ?? null
  }

  async listerExtractions(clientId: string): Promise<ExtractionEnregistree[]> {
    return [...this.extractions.values()].filter((e) => e.clientId === clientId)
  }

  async creerExtraction(extraction: ExtractionEnregistree): Promise<void> {
    if (this.extractions.has(extraction.id)) return
    this.extractions.set(extraction.id, extraction)
  }

  async extractionParId(id: string): Promise<ExtractionEnregistree | null> {
    return this.extractions.get(id) ?? null
  }

  async listerExtractionItems(clientId: string): Promise<ExtractionItemEnregistre[]> {
    return [...this.extractionItems.values()].filter((i) => i.clientId === clientId)
  }

  async creerExtractionItem(item: ExtractionItemEnregistre): Promise<void> {
    if (this.extractionItems.has(item.id)) return
    this.extractionItems.set(item.id, item)
  }

  async listerKnowledgeItems(clientId: string): Promise<KnowledgeItemEnregistre[]> {
    return [...this.knowledgeItems.values()].filter((k) => k.clientId === clientId)
  }

  async creerKnowledgeItem(item: KnowledgeItemEnregistre): Promise<void> {
    if (this.knowledgeItems.has(item.id)) return
    this.knowledgeItems.set(item.id, item)
  }

  async knowledgeItemParId(id: string): Promise<KnowledgeItemEnregistre | null> {
    return this.knowledgeItems.get(id) ?? null
  }

  async remplacerKnowledgeItem(item: KnowledgeItemEnregistre): Promise<void> {
    this.knowledgeItems.set(item.id, item)
  }

  async listerConfirmations(clientId: string): Promise<ConfirmationEnregistree[]> {
    return [...this.confirmations.values()].filter((c) => c.clientId === clientId)
  }

  async creerConfirmation(confirmation: ConfirmationEnregistree): Promise<void> {
    if (this.confirmations.has(confirmation.id)) return
    this.confirmations.set(confirmation.id, confirmation)
  }

  async listerKnowledgeRelations(clientId: string): Promise<KnowledgeRelationEnregistree[]> {
    return [...this.knowledgeRelations.values()].filter((r) => r.clientId === clientId)
  }

  async creerKnowledgeRelation(relation: KnowledgeRelationEnregistree): Promise<void> {
    if (this.knowledgeRelations.has(relation.id)) return
    this.knowledgeRelations.set(relation.id, relation)
  }

  async listerConflicts(clientId: string): Promise<ConflictEnregistre[]> {
    return [...this.conflicts.values()].filter((c) => c.clientId === clientId)
  }

  async creerConflict(conflit: ConflictEnregistre): Promise<void> {
    if (this.conflicts.has(conflit.id)) return
    this.conflicts.set(conflit.id, conflit)
  }

  async conflictParId(id: string): Promise<ConflictEnregistre | null> {
    return this.conflicts.get(id) ?? null
  }

  async remplacerConflict(conflit: ConflictEnregistre): Promise<void> {
    this.conflicts.set(conflit.id, conflit)
  }
}
