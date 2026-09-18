export interface EvidenceEnregistree {
  id: string
  clientId: string
  executionId: string
  executionStepId: string | null
  type: string
  titre: string
  description: string
  horodatage: string
  actor: string
}

export interface EvidenceLocationEnregistree {
  id: string
  clientId: string
  evidenceId: string
  systeme: string
  reference: string
}

export interface ProvenanceLinkEnregistre {
  id: string
  clientId: string
  evidenceId: string
  requirementId: string
  createdAt: string
}

/**
 * Dépôt Evidence/EvidenceLocation/ProvenanceLink (Target Architecture,
 * domaine "Evidence") — Phase 6c du chantier de migration D1 (voir
 * docs/CHANTIER-MIGRATION-D1-RECAP.md) : dernière brique du
 * Test/Execution/Evidence engine. Les 3 types sont immutables une fois
 * créés — aucune méthode de remplacement, contrairement à
 * Execution/TestCandidate/Test (mutables dans les phases précédentes).
 */
export interface EvidenceRepo {
  listerEvidences(clientId: string): Promise<EvidenceEnregistree[]>
  creerEvidence(evidence: EvidenceEnregistree): Promise<void>
  evidenceParId(id: string): Promise<EvidenceEnregistree | null>
  listerEvidenceLocations(clientId: string): Promise<EvidenceLocationEnregistree[]>
  creerEvidenceLocation(location: EvidenceLocationEnregistree): Promise<void>
  listerProvenanceLinks(clientId: string): Promise<ProvenanceLinkEnregistre[]>
  creerProvenanceLink(lien: ProvenanceLinkEnregistre): Promise<void>
}

export class EvidenceRepoMemoire implements EvidenceRepo {
  private readonly evidences = new Map<string, EvidenceEnregistree>()
  private readonly evidenceLocations = new Map<string, EvidenceLocationEnregistree>()
  private readonly provenanceLinks = new Map<string, ProvenanceLinkEnregistre>()

  async listerEvidences(clientId: string): Promise<EvidenceEnregistree[]> {
    return [...this.evidences.values()].filter((e) => e.clientId === clientId)
  }

  async creerEvidence(evidence: EvidenceEnregistree): Promise<void> {
    if (this.evidences.has(evidence.id)) return
    this.evidences.set(evidence.id, evidence)
  }

  async evidenceParId(id: string): Promise<EvidenceEnregistree | null> {
    return this.evidences.get(id) ?? null
  }

  async listerEvidenceLocations(clientId: string): Promise<EvidenceLocationEnregistree[]> {
    return [...this.evidenceLocations.values()].filter((l) => l.clientId === clientId)
  }

  async creerEvidenceLocation(location: EvidenceLocationEnregistree): Promise<void> {
    if (this.evidenceLocations.has(location.id)) return
    this.evidenceLocations.set(location.id, location)
  }

  async listerProvenanceLinks(clientId: string): Promise<ProvenanceLinkEnregistre[]> {
    return [...this.provenanceLinks.values()].filter((p) => p.clientId === clientId)
  }

  async creerProvenanceLink(lien: ProvenanceLinkEnregistre): Promise<void> {
    if (this.provenanceLinks.has(lien.id)) return
    this.provenanceLinks.set(lien.id, lien)
  }
}
