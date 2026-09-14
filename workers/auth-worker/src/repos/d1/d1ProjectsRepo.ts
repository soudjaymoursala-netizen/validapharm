import type { D1Database } from '../../d1Types'
import type { ProjectEnregistre, ProjectsRepo } from '../projectsRepo'

function ligneVersProjet(l: Record<string, unknown>): ProjectEnregistre {
  return {
    id: l.id as string,
    name: l.name as string,
    context: l.context as string,
    scopeIn: l.scope_in as string,
    scopeOut: l.scope_out as string,
    deadline: l.deadline as string | null,
    languageDefault: l.language_default as string,
    clientId: l.client_id as string | null,
    sections: JSON.parse(l.sections as string),
    documents: JSON.parse(l.documents as string),
    links: JSON.parse(l.links as string),
    statut: l.statut as ProjectEnregistre['statut'],
    phase: l.phase as ProjectEnregistre['phase'],
    ownerId: l.owner_id as string,
    sharedWith: JSON.parse(l.shared_with as string),
    archivedAt: l.archived_at as string | null,
    archivedBy: l.archived_by as string | null,
    auditLog: JSON.parse(l.audit_log as string),
    createdAt: l.created_at as string,
    updatedAt: l.updated_at as string,
  }
}

export class D1ProjectsRepo implements ProjectsRepo {
  constructor(private readonly db: D1Database) {}

  async obtenirProjet(id: string): Promise<ProjectEnregistre | null> {
    const ligne = await this.db
      .prepare('SELECT * FROM projects WHERE id = ?')
      .bind(id)
      .first<Record<string, unknown>>()
    return ligne ? ligneVersProjet(ligne) : null
  }

  async listerVisiblesPar(utilisateur: {
    id: string
    email: string
    role: string
  }): Promise<ProjectEnregistre[]> {
    if (utilisateur.role === 'admin') {
      const resultat = await this.db.prepare('SELECT * FROM projects').all()
      return resultat.results.map((l) => ligneVersProjet(l as Record<string, unknown>))
    }
    // Un projet partagé peut appartenir à n'importe quel propriétaire —
    // jamais filtrable en SQL par `sharedWith` (JSON) de façon fiable ici,
    // on filtre donc côté application après lecture complète (volume
    // attendu modeste, même choix que `clientsRepo.listerVisiblesPar`).
    const resultat = await this.db.prepare('SELECT * FROM projects').all()
    return resultat.results
      .map((l) => ligneVersProjet(l as Record<string, unknown>))
      .filter(
        (p) =>
          p.ownerId === utilisateur.email ||
          p.sharedWith.some((s) => s.userId === utilisateur.email),
      )
  }

  async listerParClient(clientId: string): Promise<ProjectEnregistre[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM projects WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersProjet(l as Record<string, unknown>))
  }

  async creerProjet(p: ProjectEnregistre): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO projects
          (id, name, context, scope_in, scope_out, deadline, language_default, client_id,
           sections, documents, links, statut, phase, owner_id, shared_with, archived_at,
           archived_by, audit_log, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        p.id,
        p.name,
        p.context,
        p.scopeIn,
        p.scopeOut,
        p.deadline,
        p.languageDefault,
        p.clientId,
        JSON.stringify(p.sections),
        JSON.stringify(p.documents),
        JSON.stringify(p.links),
        p.statut,
        p.phase,
        p.ownerId,
        JSON.stringify(p.sharedWith),
        p.archivedAt,
        p.archivedBy,
        JSON.stringify(p.auditLog),
        p.createdAt,
        p.updatedAt,
      )
      .run()
  }

  async remplacerProjet(p: ProjectEnregistre): Promise<void> {
    await this.db
      .prepare(
        `UPDATE projects SET
           name = ?, context = ?, scope_in = ?, scope_out = ?, deadline = ?,
           language_default = ?, client_id = ?, sections = ?, documents = ?, links = ?,
           statut = ?, phase = ?, owner_id = ?, shared_with = ?, archived_at = ?,
           archived_by = ?, audit_log = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(
        p.name,
        p.context,
        p.scopeIn,
        p.scopeOut,
        p.deadline,
        p.languageDefault,
        p.clientId,
        JSON.stringify(p.sections),
        JSON.stringify(p.documents),
        JSON.stringify(p.links),
        p.statut,
        p.phase,
        p.ownerId,
        JSON.stringify(p.sharedWith),
        p.archivedAt,
        p.archivedBy,
        JSON.stringify(p.auditLog),
        p.updatedAt,
        p.id,
      )
      .run()
  }
}
