import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { db } from '../../persistance/db'
import { useContentPlanStore } from './useContentPlanStore'

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.contentPlans.clear()
  await db.requirements.clear()
  await db.couvertures.clear()
  await db.tests.clear()
  await db.executions.clear()
  await db.evidences.clear()
  await db.qualityEvents.clear()
})

/**
 * Sème la chaîne complète `Requirement → Couverture → Test → Execution →
 * Evidence` pour un client/nœud donné, de sorte que `construireReadinessContentPlan`
 * (Phase 28, TD-026) calcule `pret` — les tests du store n'injectent plus
 * `readiness` à la main, elle est désormais toujours calculée.
 */
async function semerChaineComplete(
  clientId: string,
  assetNodeId: string,
  requirementId: string = `req-${clientId}`,
) {
  const maintenant = '2026-01-01T00:00:00.000Z'
  await db.requirements.put({
    id: requirementId,
    client_id: clientId,
    reference: 'REQ-1',
    titre: 'Débit stable',
    description: '',
    asset_node_id: assetNodeId,
    process_id: null,
    audit_log: [],
    created_at: maintenant,
    updated_at: maintenant,
  })
  await db.tests.put({
    id: `test-${clientId}`,
    client_id: clientId,
    test_candidate_id: 'tc-1',
    titre: 'Test débit',
    description: '',
    etapes: [],
    statut: 'approuve',
    audit_log: [],
    created_at: maintenant,
    updated_at: maintenant,
  })
  await db.couvertures.put({
    id: `cov-${clientId}`,
    client_id: clientId,
    requirement_id: requirementId,
    test_id: `test-${clientId}`,
    created_at: maintenant,
  })
  await db.executions.put({
    id: `exec-${clientId}`,
    client_id: clientId,
    test_id: `test-${clientId}`,
    asset_node_id: assetNodeId,
    executant: 'alice',
    statut: 'terminee',
    verdict: 'conforme',
    date_debut: maintenant,
    date_fin: maintenant,
    audit_log: [],
    created_at: maintenant,
    updated_at: maintenant,
  })
  await db.evidences.put({
    id: `ev-${clientId}`,
    client_id: clientId,
    execution_id: `exec-${clientId}`,
    execution_step_id: null,
    type: 'native',
    titre: 'Capture',
    description: '',
    horodatage: maintenant,
    actor: 'alice',
  })
}

describe('useContentPlanStore — cycle nominal', () => {
  test('création -> validation -> gel, avec context_snapshot figé et readiness calculée', async () => {
    await semerChaineComplete('client-1', 'n1')
    const store = useContentPlanStore()
    await store.charger('client-1')

    const plan = await store.creerContentPlan('client-1', {
      templateId: 'urs',
      assetNodeId: 'n1',
      processId: null,
      methodProfileId: 'profil-acfc-1',
      methodProfileType: 'acfc',
      contextSnapshot: { version_profil: 'v3', questions: ['Q1', 'Q2'] },
    })
    expect(plan.readiness).toBe('pret')
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

describe('useContentPlanStore — readiness calculée automatiquement (Phase 28, TD-026)', () => {
  test('aucun asset_node_id -> readiness besoin_information dès la création', async () => {
    const store = useContentPlanStore()
    const plan = await store.creerContentPlan('client-1', {
      templateId: 'urs',
      assetNodeId: null,
      processId: null,
      methodProfileId: null,
      methodProfileType: null,
      contextSnapshot: {},
    })
    expect(plan.readiness).toBe('besoin_information')
  })

  test('recalculerReadiness reflète une nouvelle Evidence apparue après la création', async () => {
    const store = useContentPlanStore()
    await db.requirements.put({
      id: 'req-x',
      client_id: 'client-1',
      reference: 'REQ-X',
      titre: 'Débit stable',
      description: '',
      asset_node_id: 'n1',
      process_id: null,
      audit_log: [],
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    })
    const plan = await store.creerContentPlan('client-1', {
      templateId: 'urs',
      assetNodeId: 'n1',
      processId: null,
      methodProfileId: null,
      methodProfileType: null,
      contextSnapshot: {},
    })
    expect(plan.readiness).toBe('besoin_revue')

    await semerChaineComplete('client-1', 'n1', 'req-x')
    const recalcule = await store.recalculerReadiness('client-1', plan.id)
    if ('erreur' in recalcule) throw new Error('unreachable')
    expect(recalcule.readiness).toBe('pret')
    expect(recalcule.audit_log.at(-1)?.action).toBe('recalcul readiness : pret')
  })

  test('recalculerReadiness sur un ContentPlan gelé retourne une erreur explicite', async () => {
    await semerChaineComplete('client-1', 'n1')
    const store = useContentPlanStore()
    const plan = await store.creerContentPlan('client-1', {
      templateId: 'urs',
      assetNodeId: 'n1',
      processId: null,
      methodProfileId: null,
      methodProfileType: null,
      contextSnapshot: {},
    })
    await store.validerContentPlan('client-1', plan.id)
    await store.gelerContentPlan('client-1', plan.id)

    const resultat = await store.recalculerReadiness('client-1', plan.id)
    expect(resultat).toEqual({ erreur: 'deja_gele' })
  })

  test('recalculerReadiness sur un ContentPlan inconnu retourne une erreur explicite', async () => {
    const store = useContentPlanStore()
    const resultat = await store.recalculerReadiness('client-1', 'plan-inconnu')
    expect(resultat).toEqual({ erreur: 'introuvable' })
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

  test('un ContentPlan dont les données ne sont pas prêtes ne peut jamais être gelé, même validé', async () => {
    const store = useContentPlanStore()
    const plan = await store.creerContentPlan('client-1', {
      templateId: 'urs',
      assetNodeId: null,
      processId: null,
      methodProfileId: null,
      methodProfileType: null,
      contextSnapshot: {},
    })
    expect(plan.readiness).toBe('besoin_information')
    await store.validerContentPlan('client-1', plan.id)

    const resultat = await store.gelerContentPlan('client-1', plan.id)
    expect(resultat).toEqual({ erreur: 'donnees_non_pretes' })
  })

  test('un ContentPlan gelé est totalement immutable — aucune revalidation ni regel possible', async () => {
    await semerChaineComplete('client-1', 'n1')
    const store = useContentPlanStore()
    const plan = await store.creerContentPlan('client-1', {
      templateId: 'urs',
      assetNodeId: 'n1',
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

  test('readiness ne fuit pas les données de traçabilité d’un autre client', async () => {
    await semerChaineComplete('client-A', 'n1')
    const store = useContentPlanStore()
    const plan = await store.creerContentPlan('client-B', {
      templateId: 'urs',
      assetNodeId: 'n1',
      processId: null,
      methodProfileId: null,
      methodProfileType: null,
      contextSnapshot: {},
    })
    expect(plan.readiness).toBe('besoin_information')
  })
})
