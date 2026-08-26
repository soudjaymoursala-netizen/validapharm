import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { db } from '../../persistance/db'
import { useContentPlanStore } from './useContentPlanStore'

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.contentPlans.clear()
})

describe('useContentPlanStore — cycle nominal', () => {
  test('création -> validation -> gel, avec context_snapshot figé', async () => {
    const store = useContentPlanStore()
    await store.charger('client-1')

    const plan = await store.creerContentPlan('client-1', {
      templateId: 'urs',
      assetNodeId: null,
      processId: null,
      methodProfileId: 'profil-acfc-1',
      methodProfileType: 'acfc',
      contextSnapshot: { version_profil: 'v3', questions: ['Q1', 'Q2'] },
    })
    expect(plan.statut).toBe('brouillon')
    const snapshotOrigine = plan.context_snapshot

    const valide = await store.validerContentPlan('client-1', plan.id)
    if ('erreur' in valide) throw new Error('unreachable')
    expect(valide.statut).toBe('valide')
    expect(valide.context_snapshot).toBe(snapshotOrigine)

    const gele = await store.gelerContentPlan('client-1', plan.id)
    if ('erreur' in gele) throw new Error('unreachable')
    expect(gele.statut).toBe('gele')
    expect(gele.context_snapshot).toBe(snapshotOrigine)
    expect(gele.audit_log).toHaveLength(3)
  })
})

describe('useContentPlanStore — garde-fous', () => {
  test('un ContentPlan brouillon ne peut pas être gelé directement — doit passer par valide', async () => {
    const store = useContentPlanStore()
    const plan = await store.creerContentPlan('client-1', {
      templateId: 'urs',
      assetNodeId: null,
      processId: null,
      methodProfileId: null,
      methodProfileType: null,
      contextSnapshot: {},
    })

    const resultat = await store.gelerContentPlan('client-1', plan.id)
    expect(resultat).toEqual({ erreur: 'non_valide' })
  })

  test('un ContentPlan gelé est totalement immutable — aucune revalidation ni regel possible', async () => {
    const store = useContentPlanStore()
    const plan = await store.creerContentPlan('client-1', {
      templateId: 'urs',
      assetNodeId: null,
      processId: null,
      methodProfileId: null,
      methodProfileType: null,
      contextSnapshot: {},
    })
    await store.validerContentPlan('client-1', plan.id)
    await store.gelerContentPlan('client-1', plan.id)

    const revalidation = await store.validerContentPlan('client-1', plan.id)
    expect(revalidation).toEqual({ erreur: 'deja_gele' })

    const regel = await store.gelerContentPlan('client-1', plan.id)
    expect(regel).toEqual({ erreur: 'deja_gele' })
  })

  test('un ContentPlan inconnu retourne une erreur explicite, jamais une exception', async () => {
    const store = useContentPlanStore()
    const resultat = await store.validerContentPlan('client-1', 'plan-inconnu')
    expect(resultat).toEqual({ erreur: 'introuvable' })
  })
})

describe('useContentPlanStore — isolation stricte par client', () => {
  test("les plans d'un client ne fuient pas vers un autre", async () => {
    const store = useContentPlanStore()
    await store.charger('client-A')
    await store.creerContentPlan('client-A', {
      templateId: 'urs',
      assetNodeId: null,
      processId: null,
      methodProfileId: null,
      methodProfileType: null,
      contextSnapshot: {},
    })
    await store.charger('client-B')
    expect(store.contentPlans).toHaveLength(0)
  })
})
