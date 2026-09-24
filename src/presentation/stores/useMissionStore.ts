import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  ActivityWire,
  AssociationMissionQualityEventWire,
  DependencyWire,
  MissionWire,
} from '../../connecteurs/auth/AuthApiClient'
import type {
  Activity,
  AssociationMissionQualityEvent,
  Dependency,
  Mission,
  StatutActivity,
  StatutMission,
} from '../../logique-metier/domaine/types'
import {
  dependanceInvalide,
  type RaisonDependanceInvalide,
} from '../../logique-metier/graphe/dependancesActivites'
import {
  activitiesAMigrer,
  associationsMissionQualityEventAMigrer,
  dependenciesAMigrer,
  missionsAMigrer,
} from '../../persistance/db'
import { useAuthStore } from './useAuthStore'

export type ResultatAjoutDependance =
  { ok: true; dependance: Dependency } | { ok: false; raison: RaisonDependanceInvalide }

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

function missionWireVersDomaine(w: MissionWire): Mission {
  return {
    id: w.id,
    client_id: w.clientId,
    workspace_id: w.workspaceId,
    asset_node_id: w.assetNodeId,
    titre: w.titre,
    description: w.description,
    statut: w.statut as StatutMission,
    audit_log: w.auditLog,
    created_at: w.createdAt,
    updated_at: w.updatedAt,
  }
}

function missionDomaineVersWire(m: Mission): MissionWire {
  return {
    id: m.id,
    clientId: m.client_id,
    workspaceId: m.workspace_id,
    assetNodeId: m.asset_node_id,
    titre: m.titre,
    description: m.description,
    statut: m.statut,
    auditLog: m.audit_log,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
  }
}

function activityWireVersDomaine(w: ActivityWire): Activity {
  return {
    id: w.id,
    client_id: w.clientId,
    mission_id: w.missionId,
    titre: w.titre,
    description: w.description,
    statut: w.statut as StatutActivity,
    audit_log: w.auditLog,
    created_at: w.createdAt,
    updated_at: w.updatedAt,
  }
}

function activityDomaineVersWire(a: Activity): ActivityWire {
  return {
    id: a.id,
    clientId: a.client_id,
    missionId: a.mission_id,
    titre: a.titre,
    description: a.description,
    statut: a.statut,
    auditLog: a.audit_log,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
  }
}

function dependencyWireVersDomaine(w: DependencyWire): Dependency {
  return {
    id: w.id,
    client_id: w.clientId,
    activity_source_id: w.activitySourceId,
    activity_cible_id: w.activityCibleId,
    created_at: w.createdAt,
  }
}

function dependencyDomaineVersWire(d: Dependency): DependencyWire {
  return {
    id: d.id,
    clientId: d.client_id,
    activitySourceId: d.activity_source_id,
    activityCibleId: d.activity_cible_id,
    createdAt: d.created_at,
  }
}

function associationWireVersDomaine(
  w: AssociationMissionQualityEventWire,
): AssociationMissionQualityEvent {
  return {
    id: w.id,
    client_id: w.clientId,
    mission_id: w.missionId,
    quality_event_id: w.qualityEventId,
    created_at: w.createdAt,
  }
}

function associationDomaineVersWire(
  a: AssociationMissionQualityEvent,
): AssociationMissionQualityEventWire {
  return {
    id: a.id,
    clientId: a.client_id,
    missionId: a.mission_id,
    qualityEventId: a.quality_event_id,
    createdAt: a.created_at,
  }
}

/**
 * Store `Mission`/`Activity` (convergence architecturale —
 * spec détaillée dans `docs/convergence/PHASE_13_MISSION_ACTIVITY_SPEC.md`).
 * Une `Mission` est un conteneur de travail contextualisé, pas un
 * moteur de raisonnement en soi — ce store ne fait que la persistance et
 * les relations de base (dépendances entre `Activity`, association à des
 * `QualityEvent`), sans aucune logique de planification ou d'IA.
 *
 * **Migré vers le Worker/D1 (Phase 8a du chantier de migration D1)** —
 * même patron que les phases précédentes : `id`/timestamps/`actor`
 * toujours dérivés côté serveur, jamais fait confiance au client.
 *
 * @requirement docs/convergence/CONVERGENCE_PLAN.md
 * @requirement Target Architecture, domaine "Work"
 */
export const useMissionStore = defineStore('mission', () => {
  const missions = ref<Mission[]>([])
  const activities = ref<Activity[]>([])
  const dependencies = ref<Dependency[]>([])
  const associationsQualityEvent = ref<AssociationMissionQualityEvent[]>([])
  const enChargement = ref(false)

  /** Lève si le relais n'est pas configuré — mutations exigent désormais systématiquement le Worker/D1, même discipline que les autres stores de ce chantier. */
  async function obtenirApi() {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) {
      throw new Error("Relais d'authentification non configuré (Configuration client).")
    }
    return { api, jeton: authStore.jeton }
  }

  /**
   * Envoie au serveur les enregistrements capturés depuis les anciennes
   * tables IndexedDB locales juste avant leur suppression — n'a d'effet
   * réel qu'une seule fois (voir migration Dexie v51, `persistance/db.ts`).
   */
  async function migrerMissionsLocalVersServeur(clientId: string): Promise<void> {
    const missionsDuClient = missionsAMigrer.filter((m) => m.client_id === clientId)
    const activitiesDuClient = activitiesAMigrer.filter((a) => a.client_id === clientId)
    const dependenciesDuClient = dependenciesAMigrer.filter((d) => d.client_id === clientId)
    const associationsDuClient = associationsMissionQualityEventAMigrer.filter(
      (a) => a.client_id === clientId,
    )
    if (
      missionsDuClient.length === 0 &&
      activitiesDuClient.length === 0 &&
      dependenciesDuClient.length === 0 &&
      associationsDuClient.length === 0
    ) {
      return
    }

    const { api, jeton } = await obtenirApi()
    const resultat = await api.migrerMissionsLocal(jeton, clientId, {
      missions: missionsDuClient.map(missionDomaineVersWire),
      activities: activitiesDuClient.map(activityDomaineVersWire),
      dependencies: dependenciesDuClient.map(dependencyDomaineVersWire),
      associationsQualityEvent: associationsDuClient.map(associationDomaineVersWire),
    })
    if (!resultat.ok) {
      throw new Error(`Échec de la migration Mission : ${resultat.erreur}`)
    }
    for (const [tableau, duClient] of [
      [missionsAMigrer, missionsDuClient],
      [activitiesAMigrer, activitiesDuClient],
      [dependenciesAMigrer, dependenciesDuClient],
      [associationsMissionQualityEventAMigrer, associationsDuClient],
    ] as const) {
      for (const entree of duClient) {
        const index = (tableau as unknown[]).indexOf(entree)
        if (index !== -1) (tableau as unknown[]).splice(index, 1)
      }
    }
  }

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      try {
        await migrerMissionsLocalVersServeur(clientId)
      } catch {
        // Nouvel essai au prochain chargement — ne bloque jamais l'affichage normal.
      }
      const { api, jeton } = await obtenirApi()
      const resultat = await api.obtenirMissions(jeton, clientId)
      if (resultat.ok) {
        missions.value = resultat.donnees.missions.map(missionWireVersDomaine)
        activities.value = resultat.donnees.activities.map(activityWireVersDomaine)
        dependencies.value = resultat.donnees.dependencies.map(dependencyWireVersDomaine)
        associationsQualityEvent.value = resultat.donnees.associationsQualityEvent.map(
          associationWireVersDomaine,
        )
      } else {
        missions.value = []
        activities.value = []
        dependencies.value = []
        associationsQualityEvent.value = []
      }
    } catch {
      // Panne réseau réelle ou relais non configuré : jamais une exception
      // non gérée, même discipline que les autres stores de ce chantier.
      missions.value = []
      activities.value = []
      dependencies.value = []
      associationsQualityEvent.value = []
    } finally {
      enChargement.value = false
    }
  }

  async function creerMission(clientId: string, input: NouvelleMissionInput): Promise<Mission> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerMission(jeton, clientId, {
      workspaceId: input.workspaceId,
      assetNodeId: input.assetNodeId,
      titre: input.titre,
      description: input.description,
    })
    if (!resultat.ok) throw new Error(`Échec de la création de la mission : ${resultat.erreur}`)
    const mission = missionWireVersDomaine(resultat.donnees.mission)
    missions.value = [...missions.value, mission]
    return mission
  }

  async function changerStatutMission(
    clientId: string,
    missionId: string,
    statut: StatutMission,
  ): Promise<Mission | null> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.changerStatutMission(jeton, clientId, missionId, statut)
    if (!resultat.ok) return null
    const miseAJour = missionWireVersDomaine(resultat.donnees.mission)
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
    const { api, jeton } = await obtenirApi()
    const resultat = await api.associerQualityEvent(jeton, clientId, missionId, qualityEventId)
    if (!resultat.ok) {
      throw new Error(`Échec de l'association au QualityEvent : ${resultat.erreur}`)
    }
    const association = associationWireVersDomaine(resultat.donnees.association)
    if (!associationsQualityEvent.value.some((a) => a.id === association.id)) {
      associationsQualityEvent.value = [...associationsQualityEvent.value, association]
    }
    return association
  }

  function activitesDeMission(missionId: string): Activity[] {
    return activities.value.filter((a) => a.mission_id === missionId)
  }

  async function creerActivity(clientId: string, input: NouvelleActivityInput): Promise<Activity> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerActivity(jeton, clientId, input.missionId, {
      titre: input.titre,
      description: input.description,
    })
    if (!resultat.ok) throw new Error(`Échec de la création de l'activité : ${resultat.erreur}`)
    const activite = activityWireVersDomaine(resultat.donnees.activity)
    activities.value = [...activities.value, activite]
    return activite
  }

  async function changerStatutActivity(
    clientId: string,
    activityId: string,
    statut: StatutActivity,
  ): Promise<Activity | null> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.changerStatutActivity(jeton, clientId, activityId, statut)
    if (!resultat.ok) return null
    const miseAJour = activityWireVersDomaine(resultat.donnees.activity)
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
  ): Promise<ResultatAjoutDependance> {
    const raison = dependanceInvalide(
      activities.value,
      dependencies.value,
      activitySourceId,
      activityCibleId,
    )
    if (raison) return { ok: false, raison }
    const { api, jeton } = await obtenirApi()
    const resultat = await api.ajouterDependance(jeton, clientId, activitySourceId, activityCibleId)
    if (!resultat.ok) throw new Error(`Échec de l'ajout de la dépendance : ${resultat.erreur}`)
    const dependance = dependencyWireVersDomaine(resultat.donnees.dependency)
    if (!dependencies.value.some((d) => d.id === dependance.id)) {
      dependencies.value = [...dependencies.value, dependance]
    }
    return { ok: true, dependance }
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
