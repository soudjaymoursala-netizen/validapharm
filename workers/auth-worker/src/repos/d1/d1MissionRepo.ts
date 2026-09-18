import type { D1Database } from '../../d1Types'
import type {
  ActivityEnregistree,
  AssociationMissionQualityEventEnregistree,
  DependencyEnregistree,
  MissionEnregistree,
  MissionRepo,
} from '../missionRepo'

function ligneVersMission(l: Record<string, unknown>): MissionEnregistree {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    workspaceId: l.workspace_id as string | null,
    assetNodeId: l.asset_node_id as string | null,
    titre: l.titre as string,
    description: l.description as string,
    statut: l.statut as string,
    auditLog: JSON.parse(l.audit_log as string),
    createdAt: l.created_at as string,
    updatedAt: l.updated_at as string,
  }
}

function ligneVersActivity(l: Record<string, unknown>): ActivityEnregistree {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    missionId: l.mission_id as string,
    titre: l.titre as string,
    description: l.description as string,
    statut: l.statut as string,
    auditLog: JSON.parse(l.audit_log as string),
    createdAt: l.created_at as string,
    updatedAt: l.updated_at as string,
  }
}

function ligneVersDependency(l: Record<string, unknown>): DependencyEnregistree {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    activitySourceId: l.activity_source_id as string,
    activityCibleId: l.activity_cible_id as string,
    createdAt: l.created_at as string,
  }
}

function ligneVersAssociation(
  l: Record<string, unknown>,
): AssociationMissionQualityEventEnregistree {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    missionId: l.mission_id as string,
    qualityEventId: l.quality_event_id as string,
    createdAt: l.created_at as string,
  }
}

export class D1MissionRepo implements MissionRepo {
  constructor(private readonly db: D1Database) {}

  async listerMissions(clientId: string): Promise<MissionEnregistree[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM missions WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersMission(l as Record<string, unknown>))
  }

  async creerMission(m: MissionEnregistree): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO missions
          (id, client_id, workspace_id, asset_node_id, titre, description, statut, audit_log, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        m.id,
        m.clientId,
        m.workspaceId,
        m.assetNodeId,
        m.titre,
        m.description,
        m.statut,
        JSON.stringify(m.auditLog),
        m.createdAt,
        m.updatedAt,
      )
      .run()
  }

  async missionParId(id: string): Promise<MissionEnregistree | null> {
    const ligne = await this.db.prepare('SELECT * FROM missions WHERE id = ?').bind(id).first()
    return ligne ? ligneVersMission(ligne as Record<string, unknown>) : null
  }

  async remplacerMission(m: MissionEnregistree): Promise<void> {
    await this.db
      .prepare(`UPDATE missions SET statut = ?, audit_log = ?, updated_at = ? WHERE id = ?`)
      .bind(m.statut, JSON.stringify(m.auditLog), m.updatedAt, m.id)
      .run()
  }

  async listerActivities(clientId: string): Promise<ActivityEnregistree[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM activities WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersActivity(l as Record<string, unknown>))
  }

  async creerActivity(a: ActivityEnregistree): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO activities
          (id, client_id, mission_id, titre, description, statut, audit_log, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        a.id,
        a.clientId,
        a.missionId,
        a.titre,
        a.description,
        a.statut,
        JSON.stringify(a.auditLog),
        a.createdAt,
        a.updatedAt,
      )
      .run()
  }

  async activityParId(id: string): Promise<ActivityEnregistree | null> {
    const ligne = await this.db.prepare('SELECT * FROM activities WHERE id = ?').bind(id).first()
    return ligne ? ligneVersActivity(ligne as Record<string, unknown>) : null
  }

  async remplacerActivity(a: ActivityEnregistree): Promise<void> {
    await this.db
      .prepare(`UPDATE activities SET statut = ?, audit_log = ?, updated_at = ? WHERE id = ?`)
      .bind(a.statut, JSON.stringify(a.auditLog), a.updatedAt, a.id)
      .run()
  }

  async listerDependencies(clientId: string): Promise<DependencyEnregistree[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM dependencies WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersDependency(l as Record<string, unknown>))
  }

  async creerDependency(d: DependencyEnregistree): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO dependencies (id, client_id, activity_source_id, activity_cible_id, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(d.id, d.clientId, d.activitySourceId, d.activityCibleId, d.createdAt)
      .run()
  }

  async dependencyExistante(
    activitySourceId: string,
    activityCibleId: string,
  ): Promise<DependencyEnregistree | null> {
    const ligne = await this.db
      .prepare('SELECT * FROM dependencies WHERE activity_source_id = ? AND activity_cible_id = ?')
      .bind(activitySourceId, activityCibleId)
      .first()
    return ligne ? ligneVersDependency(ligne as Record<string, unknown>) : null
  }

  async listerAssociationsMissionQualityEvent(
    clientId: string,
  ): Promise<AssociationMissionQualityEventEnregistree[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM associations_mission_quality_event WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersAssociation(l as Record<string, unknown>))
  }

  async creerAssociationMissionQualityEvent(
    a: AssociationMissionQualityEventEnregistree,
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO associations_mission_quality_event
          (id, client_id, mission_id, quality_event_id, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(a.id, a.clientId, a.missionId, a.qualityEventId, a.createdAt)
      .run()
  }

  async associationMissionQualityEventExistante(
    missionId: string,
    qualityEventId: string,
  ): Promise<AssociationMissionQualityEventEnregistree | null> {
    const ligne = await this.db
      .prepare(
        'SELECT * FROM associations_mission_quality_event WHERE mission_id = ? AND quality_event_id = ?',
      )
      .bind(missionId, qualityEventId)
      .first()
    return ligne ? ligneVersAssociation(ligne as Record<string, unknown>) : null
  }
}
