import type { D1Database } from '../../d1Types'
import type { DocumentNormatifEnregistre, DocumentsNormatifsRepo } from '../documentsNormatifsRepo'

function ligneVersDocument(ligne: Record<string, unknown>): DocumentNormatifEnregistre {
  return {
    id: ligne.id as string,
    category: ligne.category as string,
    titre: ligne.titre as string,
    filename: ligne.filename as string,
    source: ligne.source as string,
    sourceRef: ligne.source_ref as string | null,
    mimeType: ligne.mime_type as string,
    hasBinaryContent: Boolean(ligne.has_binary_content),
    uploadedAt: ligne.uploaded_at as string,
    uploadedBy: ligne.uploaded_by as string,
  }
}

export class D1DocumentsNormatifsRepo implements DocumentsNormatifsRepo {
  constructor(private readonly db: D1Database) {}

  async lister(): Promise<DocumentNormatifEnregistre[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM documents_normatifs ORDER BY uploaded_at DESC')
      .all()
    return resultat.results.map((l) => ligneVersDocument(l as Record<string, unknown>))
  }

  async parId(id: string): Promise<DocumentNormatifEnregistre | null> {
    const ligne = await this.db
      .prepare('SELECT * FROM documents_normatifs WHERE id = ?')
      .bind(id)
      .first()
    return ligne ? ligneVersDocument(ligne as Record<string, unknown>) : null
  }

  async creer(d: DocumentNormatifEnregistre): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO documents_normatifs
          (id, category, titre, filename, source, source_ref, mime_type, has_binary_content, uploaded_at, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        d.id,
        d.category,
        d.titre,
        d.filename,
        d.source,
        d.sourceRef,
        d.mimeType,
        d.hasBinaryContent ? 1 : 0,
        d.uploadedAt,
        d.uploadedBy,
      )
      .run()
  }

  async renommer(id: string, titre: string): Promise<void> {
    await this.db
      .prepare('UPDATE documents_normatifs SET titre = ? WHERE id = ?')
      .bind(titre, id)
      .run()
  }

  async marquerContenuDisponible(id: string): Promise<void> {
    await this.db
      .prepare('UPDATE documents_normatifs SET has_binary_content = 1 WHERE id = ?')
      .bind(id)
      .run()
  }

  async supprimer(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM documents_normatifs WHERE id = ?').bind(id).run()
  }
}
