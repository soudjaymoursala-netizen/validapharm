import type { D1Database } from '../../d1Types'
import type {
  CouvertureEnregistree,
  RequirementEnregistre,
  TestCandidateEnregistre,
  TestDefinitionRepo,
  TestEnregistre,
  TestObjectiveEnregistre,
} from '../testDefinitionRepo'

function ligneVersRequirement(l: Record<string, unknown>): RequirementEnregistre {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    reference: l.reference as string,
    titre: l.titre as string,
    description: l.description as string,
    assetNodeId: l.asset_node_id as string | null,
    processId: l.process_id as string | null,
    auditLog: JSON.parse(l.audit_log as string),
    createdAt: l.created_at as string,
    updatedAt: l.updated_at as string,
  }
}

function ligneVersTestObjective(l: Record<string, unknown>): TestObjectiveEnregistre {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    requirementId: l.requirement_id as string,
    titre: l.titre as string,
    description: l.description as string,
    createdAt: l.created_at as string,
    updatedAt: l.updated_at as string,
  }
}

function ligneVersTestCandidate(l: Record<string, unknown>): TestCandidateEnregistre {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    testObjectiveId: l.test_objective_id as string,
    riskAssessmentId: l.risk_assessment_id as string | null,
    titre: l.titre as string,
    description: l.description as string,
    statut: l.statut as string,
    motifRejet: l.motif_rejet as string | null,
    dupliqueDeId: l.duplique_de_id as string | null,
    remplaceParId: l.remplace_par_id as string | null,
    auditLog: JSON.parse(l.audit_log as string),
    createdAt: l.created_at as string,
    updatedAt: l.updated_at as string,
  }
}

function ligneVersTest(l: Record<string, unknown>): TestEnregistre {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    testCandidateId: l.test_candidate_id as string,
    titre: l.titre as string,
    description: l.description as string,
    etapes: JSON.parse(l.etapes as string),
    statut: l.statut as string,
    auditLog: JSON.parse(l.audit_log as string),
    createdAt: l.created_at as string,
    updatedAt: l.updated_at as string,
  }
}

function ligneVersCouverture(l: Record<string, unknown>): CouvertureEnregistree {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    requirementId: l.requirement_id as string,
    testId: l.test_id as string,
    createdAt: l.created_at as string,
  }
}

export class D1TestDefinitionRepo implements TestDefinitionRepo {
  constructor(private readonly db: D1Database) {}

  async listerRequirements(clientId: string): Promise<RequirementEnregistre[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM requirements WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersRequirement(l as Record<string, unknown>))
  }

  async creerRequirement(r: RequirementEnregistre): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO requirements
          (id, client_id, reference, titre, description, asset_node_id, process_id, audit_log, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        r.id,
        r.clientId,
        r.reference,
        r.titre,
        r.description,
        r.assetNodeId,
        r.processId,
        JSON.stringify(r.auditLog),
        r.createdAt,
        r.updatedAt,
      )
      .run()
  }

  async listerTestObjectives(clientId: string): Promise<TestObjectiveEnregistre[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM test_objectives WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersTestObjective(l as Record<string, unknown>))
  }

  async creerTestObjective(o: TestObjectiveEnregistre): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO test_objectives
          (id, client_id, requirement_id, titre, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(o.id, o.clientId, o.requirementId, o.titre, o.description, o.createdAt, o.updatedAt)
      .run()
  }

  async listerTestCandidates(clientId: string): Promise<TestCandidateEnregistre[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM test_candidates WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersTestCandidate(l as Record<string, unknown>))
  }

  async creerTestCandidate(c: TestCandidateEnregistre): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO test_candidates
          (id, client_id, test_objective_id, risk_assessment_id, titre, description, statut,
           motif_rejet, duplique_de_id, remplace_par_id, audit_log, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        c.id,
        c.clientId,
        c.testObjectiveId,
        c.riskAssessmentId,
        c.titre,
        c.description,
        c.statut,
        c.motifRejet,
        c.dupliqueDeId,
        c.remplaceParId,
        JSON.stringify(c.auditLog),
        c.createdAt,
        c.updatedAt,
      )
      .run()
  }

  async creerTestCandidats(candidats: TestCandidateEnregistre[]): Promise<void> {
    for (const c of candidats) await this.creerTestCandidate(c)
  }

  async testCandidateParId(id: string): Promise<TestCandidateEnregistre | null> {
    const ligne = await this.db
      .prepare('SELECT * FROM test_candidates WHERE id = ?')
      .bind(id)
      .first()
    return ligne ? ligneVersTestCandidate(ligne as Record<string, unknown>) : null
  }

  async remplacerTestCandidate(c: TestCandidateEnregistre): Promise<void> {
    await this.db
      .prepare(
        `UPDATE test_candidates
         SET statut = ?, motif_rejet = ?, duplique_de_id = ?, remplace_par_id = ?,
             audit_log = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(
        c.statut,
        c.motifRejet,
        c.dupliqueDeId,
        c.remplaceParId,
        JSON.stringify(c.auditLog),
        c.updatedAt,
        c.id,
      )
      .run()
  }

  async listerTests(clientId: string): Promise<TestEnregistre[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM tests WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersTest(l as Record<string, unknown>))
  }

  async creerTest(t: TestEnregistre): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO tests
          (id, client_id, test_candidate_id, titre, description, etapes, statut, audit_log, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        t.id,
        t.clientId,
        t.testCandidateId,
        t.titre,
        t.description,
        JSON.stringify(t.etapes),
        t.statut,
        JSON.stringify(t.auditLog),
        t.createdAt,
        t.updatedAt,
      )
      .run()
  }

  async testParId(id: string): Promise<TestEnregistre | null> {
    const ligne = await this.db.prepare('SELECT * FROM tests WHERE id = ?').bind(id).first()
    return ligne ? ligneVersTest(ligne as Record<string, unknown>) : null
  }

  async remplacerTest(t: TestEnregistre): Promise<void> {
    await this.db
      .prepare(
        `UPDATE tests
         SET statut = ?, audit_log = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(t.statut, JSON.stringify(t.auditLog), t.updatedAt, t.id)
      .run()
  }

  async listerCouvertures(clientId: string): Promise<CouvertureEnregistree[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM couvertures WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersCouverture(l as Record<string, unknown>))
  }

  async creerCouverture(c: CouvertureEnregistree): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO couvertures (id, client_id, requirement_id, test_id, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(c.id, c.clientId, c.requirementId, c.testId, c.createdAt)
      .run()
  }
}
