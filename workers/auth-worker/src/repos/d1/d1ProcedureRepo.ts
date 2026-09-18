import type { D1Database } from '../../d1Types'
import type {
  ProcedureEnregistree,
  ProcedureRepo,
  ProcedureStepEnregistree,
} from '../procedureRepo'

function ligneVersProcedure(l: Record<string, unknown>): ProcedureEnregistree {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    reference: l.reference as string,
    numeroVersion: l.numero_version as number,
    titre: l.titre as string,
    effectiveDate: l.effective_date as string,
    categorie: l.categorie as string,
    sourceId: l.source_id as string | null,
    createdAt: l.created_at as string,
  }
}

function ligneVersEtape(l: Record<string, unknown>): ProcedureStepEnregistree {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    procedureId: l.procedure_id as string,
    ordre: l.ordre as number,
    description: l.description as string,
    obligatoire: Boolean(l.obligatoire),
    condition: l.condition as string | null,
    responsable: l.responsable as string | null,
    createdAt: l.created_at as string,
  }
}

export class D1ProcedureRepo implements ProcedureRepo {
  constructor(private readonly db: D1Database) {}

  async listerProcedures(clientId: string): Promise<ProcedureEnregistree[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM procedures WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersProcedure(l as Record<string, unknown>))
  }

  async procedureParId(clientId: string, id: string): Promise<ProcedureEnregistree | null> {
    const ligne = await this.db
      .prepare('SELECT * FROM procedures WHERE client_id = ? AND id = ?')
      .bind(clientId, id)
      .first()
    return ligne ? ligneVersProcedure(ligne as Record<string, unknown>) : null
  }

  async creerProcedure(procedure: ProcedureEnregistree): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO procedures
          (id, client_id, reference, numero_version, titre, effective_date, categorie, source_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        procedure.id,
        procedure.clientId,
        procedure.reference,
        procedure.numeroVersion,
        procedure.titre,
        procedure.effectiveDate,
        procedure.categorie,
        procedure.sourceId,
        procedure.createdAt,
      )
      .run()
  }

  async listerEtapes(clientId: string): Promise<ProcedureStepEnregistree[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM procedure_steps WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersEtape(l as Record<string, unknown>))
  }

  async creerEtape(etape: ProcedureStepEnregistree): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO procedure_steps
          (id, client_id, procedure_id, ordre, description, obligatoire, condition, responsable, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        etape.id,
        etape.clientId,
        etape.procedureId,
        etape.ordre,
        etape.description,
        etape.obligatoire ? 1 : 0,
        etape.condition,
        etape.responsable,
        etape.createdAt,
      )
      .run()
  }
}
