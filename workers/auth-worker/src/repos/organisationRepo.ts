export interface OrganizationEnregistree {
  id: string
  nom: string
  createdAt: string
}

export interface WorkspaceEnregistre {
  id: string
  organizationId: string
  type: string
  nom: string
  parentWorkspaceId: string | null
  createdAt: string
}

/**
 * Dépôt Organization/Workspace — Phase 2 du chantier de migration D1 (voir
 * docs/CHANTIER-MIGRATION-D1-RECAP.md). `Organization.id` reprend
 * exactement l'id du `Client` migré (même convention que l'ancienne
 * implémentation Dexie, `useOrganizationStore`) — jamais généré côté
 * dépôt, toujours imposé par l'appelant (le Worker le fixe lui-même à
 * `clientId`, jamais au client HTTP).
 */
export interface OrganisationRepo {
  obtenirOrganization(id: string): Promise<OrganizationEnregistree | null>
  creerOrganization(organization: OrganizationEnregistree): Promise<void>
  listerWorkspaces(organizationId: string): Promise<WorkspaceEnregistre[]>
  workspaceParId(id: string): Promise<WorkspaceEnregistre | null>
  creerWorkspace(workspace: WorkspaceEnregistre): Promise<void>
}

export class OrganisationRepoMemoire implements OrganisationRepo {
  private readonly organizations = new Map<string, OrganizationEnregistree>()
  private readonly workspaces = new Map<string, WorkspaceEnregistre>()

  async obtenirOrganization(id: string): Promise<OrganizationEnregistree | null> {
    return this.organizations.get(id) ?? null
  }

  async creerOrganization(organization: OrganizationEnregistree): Promise<void> {
    this.organizations.set(organization.id, organization)
  }

  async listerWorkspaces(organizationId: string): Promise<WorkspaceEnregistre[]> {
    return [...this.workspaces.values()].filter((w) => w.organizationId === organizationId)
  }

  async workspaceParId(id: string): Promise<WorkspaceEnregistre | null> {
    return this.workspaces.get(id) ?? null
  }

  async creerWorkspace(workspace: WorkspaceEnregistre): Promise<void> {
    this.workspaces.set(workspace.id, workspace)
  }
}
