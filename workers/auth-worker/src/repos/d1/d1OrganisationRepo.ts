import type { D1Database } from '../../d1Types'
import type {
  OrganisationRepo,
  OrganizationEnregistree,
  WorkspaceEnregistre,
} from '../organisationRepo'

function ligneVersWorkspace(l: Record<string, unknown>): WorkspaceEnregistre {
  return {
    id: l.id as string,
    organizationId: l.organization_id as string,
    type: l.type as string,
    nom: l.nom as string,
    parentWorkspaceId: l.parent_workspace_id as string | null,
    createdAt: l.created_at as string,
  }
}

export class D1OrganisationRepo implements OrganisationRepo {
  constructor(private readonly db: D1Database) {}

  async obtenirOrganization(id: string): Promise<OrganizationEnregistree | null> {
    const ligne = await this.db
      .prepare('SELECT * FROM organizations WHERE id = ?')
      .bind(id)
      .first<Record<string, unknown>>()
    if (!ligne) return null
    return {
      id: ligne.id as string,
      nom: ligne.nom as string,
      createdAt: ligne.created_at as string,
    }
  }

  async creerOrganization(organization: OrganizationEnregistree): Promise<void> {
    await this.db
      .prepare('INSERT INTO organizations (id, nom, created_at) VALUES (?, ?, ?)')
      .bind(organization.id, organization.nom, organization.createdAt)
      .run()
  }

  async listerWorkspaces(organizationId: string): Promise<WorkspaceEnregistre[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM workspaces WHERE organization_id = ?')
      .bind(organizationId)
      .all()
    return resultat.results.map((l) => ligneVersWorkspace(l as Record<string, unknown>))
  }

  async workspaceParId(id: string): Promise<WorkspaceEnregistre | null> {
    const ligne = await this.db.prepare('SELECT * FROM workspaces WHERE id = ?').bind(id).first()
    return ligne ? ligneVersWorkspace(ligne as Record<string, unknown>) : null
  }

  async creerWorkspace(workspace: WorkspaceEnregistre): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO workspaces (id, organization_id, type, nom, parent_workspace_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        workspace.id,
        workspace.organizationId,
        workspace.type,
        workspace.nom,
        workspace.parentWorkspaceId,
        workspace.createdAt,
      )
      .run()
  }
}
