import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { db } from '../../persistance/db'
import ContentPlan from './ContentPlan.vue'

function routeurDeTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/clients', name: 'gestion-clients', component: { template: '<div />' } },
      {
        path: '/clients/:clientId/plans-livrable',
        name: 'content-plan',
        component: { template: '<div />' },
      },
    ],
  })
}

async function attendreQue(condition: () => Promise<boolean> | boolean): Promise<void> {
  for (let tentative = 0; tentative < 50; tentative++) {
    await flushPromises()
    if (await condition()) return
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  throw new Error('attendreQue : condition jamais satisfaite')
}

const maintenant = new Date().toISOString()

async function seedNoeud(id: string): Promise<void> {
  await db.assetNodes.put({
    id,
    client_id: 'client-1',
    workspace_id: null,
    level_key: 'equipement',
    name: 'Autoclave AC-104',
    code: 'AC-104',
    parent_id: null,
    associated_nodes: [],
    source: 'manuel',
    qms_connector_id: null,
    periodic_qualification: { applicable: false, deadline: null },
    qualification_status: 'qualifie',
  } as never)
}

/** Seed la chaîne complète Requirement→Couverture→Test→Execution→Evidence, prête. */
async function seedChainePrete(assetNodeId: string): Promise<void> {
  await db.requirements.put({
    id: 'req-1',
    client_id: 'client-1',
    reference: 'URS-001',
    titre: 'F0 minimal',
    description: '',
    asset_node_id: assetNodeId,
    process_id: null,
    audit_log: [],
    created_at: maintenant,
    updated_at: maintenant,
  } as never)
  await db.tests.put({
    id: 'test-1',
    client_id: 'client-1',
    test_candidate_id: 'candidat-1',
    titre: 'OQ-TEST-01',
    description: '',
    etapes: [],
    statut: 'approuve',
    audit_log: [],
    created_at: maintenant,
    updated_at: maintenant,
  } as never)
  await db.couvertures.put({
    id: 'couv-1',
    client_id: 'client-1',
    requirement_id: 'req-1',
    test_id: 'test-1',
    created_at: maintenant,
  } as never)
  await db.executions.put({
    id: 'exec-1',
    client_id: 'client-1',
    test_id: 'test-1',
    asset_node_id: assetNodeId,
    executant: 'local',
    statut: 'terminee',
    verdict: 'conforme',
    date_debut: maintenant,
    date_fin: maintenant,
    audit_log: [],
    created_at: maintenant,
    updated_at: maintenant,
  } as never)
  await db.evidences.put({
    id: 'ev-1',
    client_id: 'client-1',
    execution_id: 'exec-1',
    execution_step_id: null,
    type: 'native',
    titre: 'Observation',
    description: '',
    audit_log: [],
    created_at: maintenant,
    updated_at: maintenant,
  } as never)
}

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.contentPlans.clear()
  await db.assetNodes.clear()
  await db.requirements.clear()
  await db.couvertures.clear()
  await db.tests.clear()
  await db.executions.clear()
  await db.evidences.clear()
  await db.qualityEvents.clear()
})

describe('ContentPlan', () => {
  test('un plan créé sans nœud a une readiness "besoin_information" (jamais devinée favorable)', async () => {
    const wrapper = mount(ContentPlan, {
      props: { clientId: 'client-1' },
      global: { plugins: [routeurDeTest()] },
    })
    await flushPromises()

    const formCreation = wrapper.find('.bloc-creation form')
    await formCreation.find('select').setValue('oq')
    await formCreation.trigger('submit.prevent')
    await attendreQue(
      async () => (await db.contentPlans.where('client_id').equals('client-1').count()) > 0,
    )

    const plan = (await db.contentPlans.toArray())[0]
    expect(plan?.readiness).toBe('besoin_information')
    expect(plan?.statut).toBe('brouillon')
  })

  test('un plan ne peut être gelé qu\'après validation ET readiness "pret" (garde-fou non négociable)', async () => {
    await seedNoeud('noeud-1')
    await seedChainePrete('noeud-1')

    const wrapper = mount(ContentPlan, {
      props: { clientId: 'client-1' },
      global: { plugins: [routeurDeTest()] },
    })
    await flushPromises()
    await attendreQue(
      () =>
        wrapper
          .findAll('.bloc-creation select')[1]
          ?.findAll('option')
          .some((o) => o.text().includes('Autoclave AC-104')) ?? false,
    )

    const formCreation = wrapper.find('.bloc-creation form')
    const selects = formCreation.findAll('select')
    await selects[0]?.setValue('oq')
    await selects[1]?.setValue('noeud-1')
    await formCreation.trigger('submit.prevent')
    await attendreQue(async () => (await db.contentPlans.count()) > 0)

    const planPret = (await db.contentPlans.toArray())[0]
    expect(planPret?.readiness).toBe('pret')

    // Geler avant validation : refusé
    await attendreQue(() => wrapper.find('.carte-plan').exists())
    const boutons = wrapper.find('.carte-plan').findAll('button')
    const boutonValider = boutons.find((b) => b.text() === 'Valider')
    expect(boutonValider).toBeTruthy()
    await boutonValider?.trigger('click')
    await attendreQue(async () => (await db.contentPlans.toArray())[0]?.statut === 'valide')

    // Geler après validation, readiness prête : accepté
    await attendreQue(() =>
      wrapper
        .find('.carte-plan')
        .findAll('button')
        .some((b) => b.text() === 'Geler'),
    )
    const boutonGeler = wrapper
      .find('.carte-plan')
      .findAll('button')
      .find((b) => b.text() === 'Geler')
    await boutonGeler?.trigger('click')
    await attendreQue(async () => (await db.contentPlans.toArray())[0]?.statut === 'gele')

    const planGele = (await db.contentPlans.toArray())[0]
    expect(planGele?.statut).toBe('gele')
  })
})
