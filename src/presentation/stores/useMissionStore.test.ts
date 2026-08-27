import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { db } from '../../persistance/db'
import { useMissionStore } from './useMissionStore'

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.missions.clear()
  await db.activities.clear()
  await db.dependencies.clear()
  await db.associationsMissionQualityEvent.clear()
})

describe('useMissionStore — création de base', () => {
  test('crée une Mission, statut ouverte par défaut', async () => {
    const store = useMissionStore()
    await store.charger('client-1')
    const mission = await store.creerMission('client-1', {
      workspaceId: null,
      assetNodeId: null,
      titre: 'Qualification granulateur GR-01',
      description: 'Requalification suite déplacement de site',
    })
    expect(mission.statut).toBe('ouverte')
    expect(mission.audit_log).toHaveLength(1)
    expect(store.missions).toHaveLength(1)
  })

  test('crée une Mission ancrée sur un AssetNode et un Workspace', async () => {
    const store = useMissionStore()
    await store.charger('client-1')
    const mission = await store.creerMission('client-1', {
      workspaceId: 'site-lyon',
      assetNodeId: 'granulateur-01',
      titre: 'Requalification GR-01',
      description: '',
    })
    expect(mission.workspace_id).toBe('site-lyon')
    expect(mission.asset_node_id).toBe('granulateur-01')
  })
})

describe('useMissionStore — changement de statut', () => {
  test('changerStatutMission journalise le changement', async () => {
    const store = useMissionStore()
    await store.charger('client-1')
    const mission = await store.creerMission('client-1', {
      workspaceId: null,
      assetNodeId: null,
      titre: 'Mission A',
      description: '',
    })
    const miseAJour = await store.changerStatutMission('client-1', mission.id, 'cloturee')
    expect(miseAJour?.statut).toBe('cloturee')
    expect(miseAJour?.audit_log).toHaveLength(2)
  })
})

describe('useMissionStore — Activity rattachée à une Mission', () => {
  test('une Activity créée est toujours rattachée à sa Mission, statut a_faire par défaut', async () => {
    const store = useMissionStore()
    await store.charger('client-1')
    const mission = await store.creerMission('client-1', {
      workspaceId: null,
      assetNodeId: null,
      titre: 'Mission A',
      description: '',
    })
    const activite = await store.creerActivity('client-1', {
      missionId: mission.id,
      titre: 'Rédiger le protocole IQ',
      description: '',
    })
    expect(activite.mission_id).toBe(mission.id)
    expect(activite.statut).toBe('a_faire')
    expect(store.activitesDeMission(mission.id)).toHaveLength(1)
  })

  test('changerStatutActivity journalise le changement', async () => {
    const store = useMissionStore()
    await store.charger('client-1')
    const mission = await store.creerMission('client-1', {
      workspaceId: null,
      assetNodeId: null,
      titre: 'Mission A',
      description: '',
    })
    const activite = await store.creerActivity('client-1', {
      missionId: mission.id,
      titre: 'Exécuter IQ',
      description: '',
    })
    const misAJour = await store.changerStatutActivity('client-1', activite.id, 'terminee')
    expect(misAJour?.statut).toBe('terminee')
    expect(misAJour?.audit_log).toHaveLength(2)
  })
})

describe('useMissionStore — dépendances entre Activity (ordre attendu, jamais un verrou)', () => {
  test('ajouterDependance enregistre un ordre attendu', async () => {
    const store = useMissionStore()
    await store.charger('client-1')
    const mission = await store.creerMission('client-1', {
      workspaceId: null,
      assetNodeId: null,
      titre: 'Mission A',
      description: '',
    })
    const protocole = await store.creerActivity('client-1', {
      missionId: mission.id,
      titre: 'Rédiger le protocole IQ',
      description: '',
    })
    const execution = await store.creerActivity('client-1', {
      missionId: mission.id,
      titre: 'Exécuter IQ',
      description: '',
    })
    await store.ajouterDependance('client-1', execution.id, protocole.id)
    expect(store.dependancesDe(execution.id)).toHaveLength(1)
  })

  test("aucun garde-fou de blocage : le statut d'une Activity dépendante peut changer même si sa dépendance n'est pas terminée", async () => {
    const store = useMissionStore()
    await store.charger('client-1')
    const mission = await store.creerMission('client-1', {
      workspaceId: null,
      assetNodeId: null,
      titre: 'Mission A',
      description: '',
    })
    const protocole = await store.creerActivity('client-1', {
      missionId: mission.id,
      titre: 'Rédiger le protocole IQ',
      description: '',
    })
    const execution = await store.creerActivity('client-1', {
      missionId: mission.id,
      titre: 'Exécuter IQ',
      description: '',
    })
    await store.ajouterDependance('client-1', execution.id, protocole.id)

    // protocole reste "a_faire" — aucune fonction de ce store n'empêche
    // pourtant de faire avancer l'activité dépendante.
    const misAJour = await store.changerStatutActivity('client-1', execution.id, 'en_cours')
    expect(misAJour?.statut).toBe('en_cours')
  })

  test('ajouter deux fois la même paire est idempotent', async () => {
    const store = useMissionStore()
    await store.charger('client-1')
    const mission = await store.creerMission('client-1', {
      workspaceId: null,
      assetNodeId: null,
      titre: 'Mission A',
      description: '',
    })
    const a = await store.creerActivity('client-1', {
      missionId: mission.id,
      titre: 'A',
      description: '',
    })
    const b = await store.creerActivity('client-1', {
      missionId: mission.id,
      titre: 'B',
      description: '',
    })
    await store.ajouterDependance('client-1', a.id, b.id)
    await store.ajouterDependance('client-1', a.id, b.id)
    expect(store.dependancesDe(a.id)).toHaveLength(1)
  })
})

describe('useMissionStore — association optionnelle à un QualityEvent (jamais une étape obligatoire)', () => {
  test('associerQualityEvent relie une Mission à un QualityEvent existant', async () => {
    const store = useMissionStore()
    await store.charger('client-1')
    const mission = await store.creerMission('client-1', {
      workspaceId: null,
      assetNodeId: null,
      titre: 'Mission suite Change Control',
      description: '',
    })
    await store.associerQualityEvent('client-1', mission.id, 'qe-123')
    expect(store.associationsQualityEvent).toHaveLength(1)
    expect(store.associationsQualityEvent.at(0)?.quality_event_id).toBe('qe-123')
  })

  test('associer deux fois la même paire est idempotent', async () => {
    const store = useMissionStore()
    await store.charger('client-1')
    const mission = await store.creerMission('client-1', {
      workspaceId: null,
      assetNodeId: null,
      titre: 'Mission A',
      description: '',
    })
    await store.associerQualityEvent('client-1', mission.id, 'qe-123')
    await store.associerQualityEvent('client-1', mission.id, 'qe-123')
    expect(store.associationsQualityEvent).toHaveLength(1)
  })
})

describe('useMissionStore — isolation stricte par client', () => {
  test("les Missions et Activity d'un client ne fuient pas vers un autre", async () => {
    const store = useMissionStore()
    await store.charger('client-A')
    const mission = await store.creerMission('client-A', {
      workspaceId: null,
      assetNodeId: null,
      titre: 'Mission A',
      description: '',
    })
    await store.creerActivity('client-A', {
      missionId: mission.id,
      titre: 'Activité A',
      description: '',
    })
    await store.charger('client-B')
    expect(store.missions).toHaveLength(0)
    expect(store.activities).toHaveLength(0)
  })
})
