export interface EntreeJournalAuditEnregistree {
  timestamp: string
  actor: string
  action: string
}

export interface RequirementEnregistre {
  id: string
  clientId: string
  reference: string
  titre: string
  description: string
  assetNodeId: string | null
  processId: string | null
  auditLog: EntreeJournalAuditEnregistree[]
  createdAt: string
  updatedAt: string
}

export interface TestObjectiveEnregistre {
  id: string
  clientId: string
  requirementId: string
  titre: string
  description: string
  createdAt: string
  updatedAt: string
}

export interface TestCandidateEnregistre {
  id: string
  clientId: string
  testObjectiveId: string
  riskAssessmentId: string | null
  titre: string
  description: string
  statut: string
  motifRejet: string | null
  dupliqueDeId: string | null
  remplaceParId: string | null
  auditLog: EntreeJournalAuditEnregistree[]
  createdAt: string
  updatedAt: string
}

export interface EtapeTestEnregistree {
  id: string
  ordre: number
  action: string
  resultatAttendu: string
}

export interface TestEnregistre {
  id: string
  clientId: string
  testCandidateId: string
  titre: string
  description: string
  etapes: EtapeTestEnregistree[]
  statut: string
  auditLog: EntreeJournalAuditEnregistree[]
  createdAt: string
  updatedAt: string
}

export interface CouvertureEnregistree {
  id: string
  clientId: string
  requirementId: string
  testId: string
  createdAt: string
}

/**
 * Dépôt Requirement/TestObjective/TestCandidate/Test/Couverture (Target
 * Architecture, domaine "Test") — Phase 6a du chantier de migration D1
 * (voir docs/CHANTIER-MIGRATION-D1-RECAP.md) : première brique du
 * Test/Execution/Evidence engine, uniquement la chaîne de définition.
 * `testCandidateParId`/`remplacerTestCandidate` et `testParId`/
 * `remplacerTest` suivent le patron mutable déjà utilisé pour CPP/CQA
 * (Phase 4b) et RiskAssessment (Phase 4d).
 */
export interface TestDefinitionRepo {
  listerRequirements(clientId: string): Promise<RequirementEnregistre[]>
  creerRequirement(requirement: RequirementEnregistre): Promise<void>
  listerTestObjectives(clientId: string): Promise<TestObjectiveEnregistre[]>
  creerTestObjective(objectif: TestObjectiveEnregistre): Promise<void>
  listerTestCandidates(clientId: string): Promise<TestCandidateEnregistre[]>
  creerTestCandidate(candidat: TestCandidateEnregistre): Promise<void>
  creerTestCandidats(candidats: TestCandidateEnregistre[]): Promise<void>
  testCandidateParId(id: string): Promise<TestCandidateEnregistre | null>
  remplacerTestCandidate(candidat: TestCandidateEnregistre): Promise<void>
  listerTests(clientId: string): Promise<TestEnregistre[]>
  creerTest(test: TestEnregistre): Promise<void>
  testParId(id: string): Promise<TestEnregistre | null>
  remplacerTest(test: TestEnregistre): Promise<void>
  listerCouvertures(clientId: string): Promise<CouvertureEnregistree[]>
  creerCouverture(couverture: CouvertureEnregistree): Promise<void>
}

export class TestDefinitionRepoMemoire implements TestDefinitionRepo {
  private readonly requirements = new Map<string, RequirementEnregistre>()
  private readonly testObjectives = new Map<string, TestObjectiveEnregistre>()
  private readonly testCandidates = new Map<string, TestCandidateEnregistre>()
  private readonly tests = new Map<string, TestEnregistre>()
  private readonly couvertures = new Map<string, CouvertureEnregistree>()

  async listerRequirements(clientId: string): Promise<RequirementEnregistre[]> {
    return [...this.requirements.values()].filter((r) => r.clientId === clientId)
  }

  async creerRequirement(requirement: RequirementEnregistre): Promise<void> {
    if (this.requirements.has(requirement.id)) return
    this.requirements.set(requirement.id, requirement)
  }

  async listerTestObjectives(clientId: string): Promise<TestObjectiveEnregistre[]> {
    return [...this.testObjectives.values()].filter((o) => o.clientId === clientId)
  }

  async creerTestObjective(objectif: TestObjectiveEnregistre): Promise<void> {
    if (this.testObjectives.has(objectif.id)) return
    this.testObjectives.set(objectif.id, objectif)
  }

  async listerTestCandidates(clientId: string): Promise<TestCandidateEnregistre[]> {
    return [...this.testCandidates.values()].filter((c) => c.clientId === clientId)
  }

  async creerTestCandidate(candidat: TestCandidateEnregistre): Promise<void> {
    if (this.testCandidates.has(candidat.id)) return
    this.testCandidates.set(candidat.id, candidat)
  }

  async creerTestCandidats(candidats: TestCandidateEnregistre[]): Promise<void> {
    for (const c of candidats) await this.creerTestCandidate(c)
  }

  async testCandidateParId(id: string): Promise<TestCandidateEnregistre | null> {
    return this.testCandidates.get(id) ?? null
  }

  async remplacerTestCandidate(candidat: TestCandidateEnregistre): Promise<void> {
    this.testCandidates.set(candidat.id, candidat)
  }

  async listerTests(clientId: string): Promise<TestEnregistre[]> {
    return [...this.tests.values()].filter((t) => t.clientId === clientId)
  }

  async creerTest(test: TestEnregistre): Promise<void> {
    if (this.tests.has(test.id)) return
    this.tests.set(test.id, test)
  }

  async testParId(id: string): Promise<TestEnregistre | null> {
    return this.tests.get(id) ?? null
  }

  async remplacerTest(test: TestEnregistre): Promise<void> {
    this.tests.set(test.id, test)
  }

  async listerCouvertures(clientId: string): Promise<CouvertureEnregistree[]> {
    return [...this.couvertures.values()].filter((c) => c.clientId === clientId)
  }

  async creerCouverture(couverture: CouvertureEnregistree): Promise<void> {
    if (this.couvertures.has(couverture.id)) return
    this.couvertures.set(couverture.id, couverture)
  }
}
