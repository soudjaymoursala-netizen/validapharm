import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  Activity,
  AssociationMissionQualityEvent,
  Dependency,
  Mission,
  StatutActivity,
  StatutMission,
} from '../../logique-metier/domaine/types'
import { IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1 } from '../identite/identiteLocale'
import { db } from '../../persistance/db'

export interface NouvelleMissionInput {
  workspaceId: string | null
  assetNodeId: string | null
  titre: string
  description: string
}

export interface NouvelleActivityInput {
  missionId: string
  titre: string
  description: string
}

/**
 * Store `Mission`/`Activity` (convergence architecturale —
 * spec détaillée dans `docs/convergence/PHASE_13_MISSION_ACTIVITY_SPEC.md`).
 * Une `Mission` est un conteneur de travail contextualisé, pas un
 * moteur de raisonnement en soi — ce store ne fait que la persistance et
 * les relations de base (dépendances entre `Activity`, association à des
 * `QualityEvent`), sans aucune logique de planification ou d'IA.
 *
 * @requirement docs/convergence/CONVERGENCE_PLAN.md
 */
export const useMissionStore = defineStore('mission', () => {
  const missions = ref<Mission[]>([])
  const activities = ref<Activity[]>([])
  const dependencies = ref<Dependency[]>([])
  const associationsQualityEvent = ref<AssociationMissionQualityEvent[]>([])
  const enChargement = ref(false)

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      missions.value = await db.missions.where('client_id').equals(clientId).toArray()
      activities.value = await db.activities.where('client_id').equals(clientId).toArray()
      dependencies.value = await db.dependencies.where('client_id').equals(clientId).toArray()
      associationsQualityEvent.value = await db.associationsMissionQualityEvent
        .where('client_id')
        .equals(clientId)
        .toArray()
    } finally {
      enChargement.value = false
    }
  }

  async function creerMission(clientId: string, input: NouvelleMissionInput): Promise<Mission> {
    const maintenant = new Date().toISOString()
    const mission: Mission = {
      id: crypto.randomUUID(),
      client_id: clientId,
      workspace_id: input.workspaceId,
      asset_node_id: input.assetNodeId,
      titre: input.titre,
      description: input.description,
      statut: 'ouverte',
      audit_log: [
        { timestamp: maintenant, actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1, action: 'création' },
      ],
      created_at: maintenant,
      updated_at: maintenant,
    }
    await db.missions.put(mission)
    missions.value = [...missions.value, mission]
    return mission
  }

  async function changerStatutMission(
    clientId: string,
    missionId: string,
    statut: StatutMission,
  ): Promise<Mission | null> {
    const existante = await db.missions.get(missionId)
    if (!existante || existante.client_id !== clientId) return null
    const maintenant = new Date().toISOString()
    const miseAJour: Mission = {
      ...existante,
      statut,
      updated_at: maintenant,
      audit_log: [
        ...existante.audit_log,
        {
          timestamp: maintenant,
          actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1,
          action: `changement de statut : ${statut}`,
        },
      ],
    }
    await db.missions.put(miseAJour)
    missions.value = missions.value.map((m) => (m.id === missionId ? miseAJour : m))
    return miseAJour
  }

  /**
   * Association N:M optionnelle à un `QualityEvent` (ex. une Mission
   * ouverte en réponse à un Change Control) — jamais une étape obligatoire,
   * même discipline que `ReferenceQualityEvent`.
   */
  async function associerQualityEvent(
    clientId: string,
    missionId: string,
    qualityEventId: string,
  ): Promise<AssociationMissionQualityEvent> {
    const existante = associationsQualityEvent.value.find(
      (a) => a.mission_id === missionId && a.quality_event_id === qualityEventId,
    )
    if (existante) return existante

    const association: AssociationMissionQualityEvent = {
      id: crypto.randomUUID(),
      client_id: clientId,
      mission_id: missionId,
      quality_event_id: qualityEventId,
      created_at: new Date().toISOString(),
    }
    await db.associationsMissionQualityEvent.put(association)
    associationsQualityEvent.value = [...associationsQualityEvent.value, association]
    return association
  }

  function activitesDeMission(missionId: string): Activity[] {
    return activities.value.filter((a) => a.mission_id === missionId)
  }

  async function creerActivity(clientId: string, input: NouvelleActivityInput): Promise<Activity> {
    const maintenant = new Date().toISOString()
    const activite: Activity = {
      id: crypto.randomUUID(),
      client_id: clientId,
      mission_id: input.missionId,
      titre: input.titre,
      description: input.description,
      statut: 'a_faire',
      audit_log: [
        { timestamp: maintenant, actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1, action: 'création' },
      ],
      created_at: maintenant,
      updated_at: maintenant,
    }
    await db.activities.put(activite)
    activities.value = [...activities.value, activite]
    return activite
  }

  async function changerStatutActivity(
    clientId: string,
    activityId: string,
    statut: StatutActivity,
  ): Promise<Activity | null> {
    const existante = await db.activities.get(activityId)
    if (!existante || existante.client_id !== clientId) return null
    const maintenant = new Date().toISOString()
    const miseAJour: Activity = {
      ...existante,
      statut,
      updated_at: maintenant,
      audit_log: [
        ...existante.audit_log,
        {
          timestamp: maintenant,
          actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1,
          action: `changement de statut : ${statut}`,
        },
      ],
    }
    await db.activities.put(miseAJour)
    activities.value = activities.value.map((a) => (a.id === activityId ? miseAJour : a))
    return miseAJour
  }

  /**
   * Dépendance `Activity → Activity` (ordre attendu) — jamais un verrou
   * bloquant : aucune fonction de ce store n'empêche de changer le statut
   * d'une `Activity` dont une dépendance n'est pas encore `terminee`, même
   * discipline déjà appliquée à `QualityEvent`/`Connector`.
   */
  async function ajouterDependance(
    clientId: string,
    activitySourceId: string,
    activityCibleId: string,
  ): Promise<Dependency> {
    const existante = dependencies.value.find(
      (d) => d.activity_source_id === activitySourceId && d.activity_cible_id === activityCibleId,
    )
    if (existante) return existante

    const dependance: Dependency = {
      id: crypto.randomUUID(),
      client_id: clientId,
      activity_source_id: activitySourceId,
      activity_cible_id: activityCibleId,
      created_at: new Date().toISOString(),
    }
    await db.dependencies.put(dependance)
    dependencies.value = [...dependencies.value, dependance]
    return dependance
  }

  function dependancesDe(activityId: string): Dependency[] {
    return dependencies.value.filter((d) => d.activity_source_id === activityId)
  }

  return {
    missions,
    activities,
    dependencies,
    associationsQualityEvent,
    enChargement,
    charger,
    creerMission,
    changerStatutMission,
    associerQualityEvent,
    activitesDeMission,
    creerActivity,
    changerStatutActivity,
    ajouterDependance,
    dependancesDe,
  }
})
