export interface EntreeJournalAuditEnregistree {
  timestamp: string
  actor: string
  action: string
}

export interface MissionEnregistree {
  id: string
  clientId: string
  workspaceId: string | null
  assetNodeId: string | null
  titre: string
  description: string
  statut: string
  auditLog: EntreeJournalAuditEnregistree[]
  createdAt: string
  updatedAt: string
}

export interface ActivityEnregistree {
  id: string
  clientId: string
  missionId: string
  titre: string
  description: string
  statut: string
  auditLog: EntreeJournalAuditEnregistree[]
  createdAt: string
  updatedAt: string
}

export interface DependencyEnregistree {
  id: string
  clientId: string
  activitySourceId: string
  activityCibleId: string
  createdAt: string
}

export interface AssociationMissionQualityEventEnregistree {
  id: string
  clientId: string
  missionId: string
  qualityEventId: string
  createdAt: string
}

/**
 * Dépôt Mission (Target Architecture, domaine "Work") — Phase 8a du
 * chantier de migration D1 (voir docs/CHANTIER-MIGRATION-D1-RECAP.md) :
 * première brique de la Phase 8. `remplacerMission`/`remplacerActivity`
 * suivent le patron mutable déjà utilisé pour ContentPlan/KnowledgeItem
 * (statut/audit_log/updatedAt uniquement). `Dependency`/
 * `AssociationMissionQualityEvent` restent INSERT-only.
 */
export interface MissionRepo {
  listerMissions(clientId: string): Promise<MissionEnregistree[]>
  creerMission(mission: MissionEnregistree): Promise<void>
  missionParId(id: string): Promise<MissionEnregistree | null>
  remplacerMission(mission: MissionEnregistree): Promise<void>

  listerActivities(clientId: string): Promise<ActivityEnregistree[]>
  creerActivity(activity: ActivityEnregistree): Promise<void>
  activityParId(id: string): Promise<ActivityEnregistree | null>
  remplacerActivity(activity: ActivityEnregistree): Promise<void>

  listerDependencies(clientId: string): Promise<DependencyEnregistree[]>
  creerDependency(dependency: DependencyEnregistree): Promise<void>
  dependencyExistante(
    activitySourceId: string,
    activityCibleId: string,
  ): Promise<DependencyEnregistree | null>

  listerAssociationsMissionQualityEvent(
    clientId: string,
  ): Promise<AssociationMissionQualityEventEnregistree[]>
  creerAssociationMissionQualityEvent(
    association: AssociationMissionQualityEventEnregistree,
  ): Promise<void>
  associationMissionQualityEventExistante(
    missionId: string,
    qualityEventId: string,
  ): Promise<AssociationMissionQualityEventEnregistree | null>
}

export class MissionRepoMemoire implements MissionRepo {
  private readonly missions = new Map<string, MissionEnregistree>()
  private readonly activities = new Map<string, ActivityEnregistree>()
  private readonly dependencies = new Map<string, DependencyEnregistree>()
  private readonly associations = new Map<string, AssociationMissionQualityEventEnregistree>()

  async listerMissions(clientId: string): Promise<MissionEnregistree[]> {
    return [...this.missions.values()].filter((m) => m.clientId === clientId)
  }

  async creerMission(mission: MissionEnregistree): Promise<void> {
    if (this.missions.has(mission.id)) return
    this.missions.set(mission.id, mission)
  }

  async missionParId(id: string): Promise<MissionEnregistree | null> {
    return this.missions.get(id) ?? null
  }

  async remplacerMission(mission: MissionEnregistree): Promise<void> {
    this.missions.set(mission.id, mission)
  }

  async listerActivities(clientId: string): Promise<ActivityEnregistree[]> {
    return [...this.activities.values()].filter((a) => a.clientId === clientId)
  }

  async creerActivity(activity: ActivityEnregistree): Promise<void> {
    if (this.activities.has(activity.id)) return
    this.activities.set(activity.id, activity)
  }

  async activityParId(id: string): Promise<ActivityEnregistree | null> {
    return this.activities.get(id) ?? null
  }

  async remplacerActivity(activity: ActivityEnregistree): Promise<void> {
    this.activities.set(activity.id, activity)
  }

  async listerDependencies(clientId: string): Promise<DependencyEnregistree[]> {
    return [...this.dependencies.values()].filter((d) => d.clientId === clientId)
  }

  async creerDependency(dependency: DependencyEnregistree): Promise<void> {
    if (this.dependencies.has(dependency.id)) return
    this.dependencies.set(dependency.id, dependency)
  }

  async dependencyExistante(
    activitySourceId: string,
    activityCibleId: string,
  ): Promise<DependencyEnregistree | null> {
    return (
      [...this.dependencies.values()].find(
        (d) => d.activitySourceId === activitySourceId && d.activityCibleId === activityCibleId,
      ) ?? null
    )
  }

  async listerAssociationsMissionQualityEvent(
    clientId: string,
  ): Promise<AssociationMissionQualityEventEnregistree[]> {
    return [...this.associations.values()].filter((a) => a.clientId === clientId)
  }

  async creerAssociationMissionQualityEvent(
    association: AssociationMissionQualityEventEnregistree,
  ): Promise<void> {
    if (this.associations.has(association.id)) return
    this.associations.set(association.id, association)
  }

  async associationMissionQualityEventExistante(
    missionId: string,
    qualityEventId: string,
  ): Promise<AssociationMissionQualityEventEnregistree | null> {
    return (
      [...this.associations.values()].find(
        (a) => a.missionId === missionId && a.qualityEventId === qualityEventId,
      ) ?? null
    )
  }
}
