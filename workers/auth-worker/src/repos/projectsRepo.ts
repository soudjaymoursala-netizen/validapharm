export type StatutProjetEnregistre = 'actif' | 'suspendu' | 'archive' | 'supprime'
export type PhaseProjetEnregistree = 'concept' | 'realisation' | 'operation' | 'retrait'

export interface PartageProjetEnregistre {
  userId: string
  accessLevel: 'lecture' | 'édition'
}

export interface LienProjetEnregistre {
  fromSectionId: string
  toSectionId: string
  createdBy: string
  createdAt: string
}

export interface EntreeAuditProjet {
  timestamp: string
  actor: string
  action: string
}

export interface ProjectEnregistre {
  id: string
  name: string
  context: string
  scopeIn: string
  scopeOut: string
  deadline: string | null
  languageDefault: string
  clientId: string | null
  sections: string[]
  documents: string[]
  links: LienProjetEnregistre[]
  statut: StatutProjetEnregistre
  phase: PhaseProjetEnregistree
  ownerId: string
  sharedWith: PartageProjetEnregistre[]
  archivedAt: string | null
  archivedBy: string | null
  auditLog: EntreeAuditProjet[]
  createdAt: string
  updatedAt: string
}

/**
 * Dépôt Project — Phase 3a du chantier de migration D1 (voir
 * docs/CHANTIER-MIGRATION-D1-RECAP.md). `listerVisiblesPar` reproduit
 * exactement la visibilité déjà appliquée côté client
 * (`peutVoirProjet`/`useProjectsStore.chargerProjets`) : un admin voit
 * tout, les autres ne voient que ce qu'ils possèdent (`ownerId`) ou ce qui
 * leur a été explicitement partagé (`sharedWith`) — même convention que
 * `clientsRepo.listerVisiblesPar`.
 */
export interface ProjectsRepo {
  obtenirProjet(id: string): Promise<ProjectEnregistre | null>
  listerVisiblesPar(utilisateur: {
    id: string
    email: string
    role: string
  }): Promise<ProjectEnregistre[]>
  listerParClient(clientId: string): Promise<ProjectEnregistre[]>
  creerProjet(projet: ProjectEnregistre): Promise<void>
  remplacerProjet(projet: ProjectEnregistre): Promise<void>
}

export class ProjectsRepoMemoire implements ProjectsRepo {
  private readonly projets = new Map<string, ProjectEnregistre>()

  async obtenirProjet(id: string): Promise<ProjectEnregistre | null> {
    return this.projets.get(id) ?? null
  }

  async listerVisiblesPar(utilisateur: {
    id: string
    email: string
    role: string
  }): Promise<ProjectEnregistre[]> {
    const tous = [...this.projets.values()]
    if (utilisateur.role === 'admin') return tous
    return tous.filter(
      (p) =>
        p.ownerId === utilisateur.email || p.sharedWith.some((s) => s.userId === utilisateur.email),
    )
  }

  async listerParClient(clientId: string): Promise<ProjectEnregistre[]> {
    return [...this.projets.values()].filter((p) => p.clientId === clientId)
  }

  async creerProjet(projet: ProjectEnregistre): Promise<void> {
    this.projets.set(projet.id, projet)
  }

  async remplacerProjet(projet: ProjectEnregistre): Promise<void> {
    this.projets.set(projet.id, projet)
  }
}
