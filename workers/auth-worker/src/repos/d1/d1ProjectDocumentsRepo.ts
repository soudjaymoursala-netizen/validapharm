import type { D1Database } from '../../d1Types'
import type { ProjectDocumentEnregistre, ProjectDocumentsRepo } from '../projectDocumentsRepo'

function ligneVersDocument(ligne: Record<string, unknown>): ProjectDocumentEnregistre {
  return {
    id: ligne.id as string,
    projectId: ligne.project_id as string,
    filename: ligne.filename as string,
    status: ligne.status as string,
    mimeType: ligne.mime_type as string,
    hasBinaryContent: Boolean(ligne.has_binary_content),
    uploadedAt: ligne.uploaded_at as string,
    uploadedBy: ligne.uploaded_by as string,
  }
}

export class D1ProjectDocumentsRepo implements ProjectDocumentsRepo {
  constructor(private readonly db: D1Database) {}

  async listerParProjet(projectId: string): Promise<ProjectDocumentEnregistre[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM project_documents WHERE project_id = ? ORDER BY uploaded_at DESC')
      .bind(projectId)
      .all()
    return resultat.results.map((l) => ligneVersDocument(l as Record<string, unknown>))
  }

  async parId(id: string): Promise<ProjectDocumentEnregistre | null> {
    const ligne = await this.db
      .prepare('SELECT * FROM project_documents WHERE id = ?')
      .bind(id)
      .first()
    return ligne ? ligneVersDocument(ligne as Record<string, unknown>) : null
  }

  async creer(d: ProjectDocumentEnregistre): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO project_documents
          (id, project_id, filename, status, mime_type, has_binary_content, uploaded_at, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        d.id,
        d.projectId,
        d.filename,
        d.status,
        d.mimeType,
        d.hasBinaryContent ? 1 : 0,
        d.uploadedAt,
        d.uploadedBy,
      )
      .run()
  }

  async supprimer(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM project_documents WHERE id = ?').bind(id).run()
  }
}
