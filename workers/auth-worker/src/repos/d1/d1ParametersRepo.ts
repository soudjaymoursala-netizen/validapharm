import type { D1Database } from '../../d1Types'
import type {
  CPPEnregistre,
  CQAEnregistre,
  ClassificationCriticiteParametreEnregistree,
  ParameterEnregistre,
  ParametersRepo,
} from '../parametersRepo'

function ligneVersParametre(l: Record<string, unknown>): ParameterEnregistre {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    assetNodeId: l.asset_node_id as string | null,
    nom: l.nom as string,
    description: l.description as string,
    unite: l.unite as string | null,
    auditLog: JSON.parse(l.audit_log as string),
    createdAt: l.created_at as string,
    updatedAt: l.updated_at as string,
  }
}

function ligneVersClassification(
  l: Record<string, unknown>,
): ClassificationCriticiteParametreEnregistree {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    parameterId: l.parameter_id as string,
    niveau: l.niveau as string,
    contexte: l.contexte as string | null,
    justification: l.justification as string,
    auditLog: JSON.parse(l.audit_log as string),
    createdAt: l.created_at as string,
  }
}

function ligneVersCPP(l: Record<string, unknown>): CPPEnregistre {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    parameterId: l.parameter_id as string,
    contexte: l.contexte as string,
    justification: l.justification as string,
    actif: Boolean(l.actif),
    auditLog: JSON.parse(l.audit_log as string),
    createdAt: l.created_at as string,
    updatedAt: l.updated_at as string,
  }
}

function ligneVersCQA(l: Record<string, unknown>): CQAEnregistre {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    nom: l.nom as string,
    description: l.description as string,
    contexte: l.contexte as string,
    justification: l.justification as string,
    actif: Boolean(l.actif),
    auditLog: JSON.parse(l.audit_log as string),
    createdAt: l.created_at as string,
    updatedAt: l.updated_at as string,
  }
}

export class D1ParametersRepo implements ParametersRepo {
  constructor(private readonly db: D1Database) {}

  async listerParametres(clientId: string): Promise<ParameterEnregistre[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM parameters WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersParametre(l as Record<string, unknown>))
  }

  async creerParametre(p: ParameterEnregistre): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO parameters
          (id, client_id, asset_node_id, nom, description, unite, audit_log, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        p.id,
        p.clientId,
        p.assetNodeId,
        p.nom,
        p.description,
        p.unite,
        JSON.stringify(p.auditLog),
        p.createdAt,
        p.updatedAt,
      )
      .run()
  }

  async listerClassifications(
    clientId: string,
  ): Promise<ClassificationCriticiteParametreEnregistree[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM classifications_criticite_parametre WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersClassification(l as Record<string, unknown>))
  }

  async creerClassification(c: ClassificationCriticiteParametreEnregistree): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO classifications_criticite_parametre
          (id, client_id, parameter_id, niveau, contexte, justification, audit_log, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        c.id,
        c.clientId,
        c.parameterId,
        c.niveau,
        c.contexte,
        c.justification,
        JSON.stringify(c.auditLog),
        c.createdAt,
      )
      .run()
  }

  async listerCPPs(clientId: string): Promise<CPPEnregistre[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM cpps WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersCPP(l as Record<string, unknown>))
  }

  async creerCPP(c: CPPEnregistre): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO cpps
          (id, client_id, parameter_id, contexte, justification, actif, audit_log, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        c.id,
        c.clientId,
        c.parameterId,
        c.contexte,
        c.justification,
        c.actif ? 1 : 0,
        JSON.stringify(c.auditLog),
        c.createdAt,
        c.updatedAt,
      )
      .run()
  }

  async cppParId(id: string): Promise<CPPEnregistre | null> {
    const ligne = await this.db.prepare('SELECT * FROM cpps WHERE id = ?').bind(id).first()
    return ligne ? ligneVersCPP(ligne as Record<string, unknown>) : null
  }

  async remplacerCPP(c: CPPEnregistre): Promise<void> {
    await this.db
      .prepare(
        `UPDATE cpps
         SET contexte = ?, justification = ?, actif = ?, audit_log = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(
        c.contexte,
        c.justification,
        c.actif ? 1 : 0,
        JSON.stringify(c.auditLog),
        c.updatedAt,
        c.id,
      )
      .run()
  }

  async listerCQAs(clientId: string): Promise<CQAEnregistre[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM cqas WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersCQA(l as Record<string, unknown>))
  }

  async creerCQA(c: CQAEnregistre): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO cqas
          (id, client_id, nom, description, contexte, justification, actif, audit_log, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        c.id,
        c.clientId,
        c.nom,
        c.description,
        c.contexte,
        c.justification,
        c.actif ? 1 : 0,
        JSON.stringify(c.auditLog),
        c.createdAt,
        c.updatedAt,
      )
      .run()
  }

  async cqaParId(id: string): Promise<CQAEnregistre | null> {
    const ligne = await this.db.prepare('SELECT * FROM cqas WHERE id = ?').bind(id).first()
    return ligne ? ligneVersCQA(ligne as Record<string, unknown>) : null
  }

  async remplacerCQA(c: CQAEnregistre): Promise<void> {
    await this.db
      .prepare(
        `UPDATE cqas
         SET nom = ?, description = ?, contexte = ?, justification = ?, actif = ?, audit_log = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(
        c.nom,
        c.description,
        c.contexte,
        c.justification,
        c.actif ? 1 : 0,
        JSON.stringify(c.auditLog),
        c.updatedAt,
        c.id,
      )
      .run()
  }
}
