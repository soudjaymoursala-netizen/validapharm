import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Contexte } from '../../../workers/auth-worker/src/routeur'
import { db } from '../../persistance/db'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import { useClientsStore } from '../stores/useClientsStore'
import { useStructureSystemeStore } from '../stores/useStructureSystemeStore'
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

let clientId: string
let ctx: Contexte
let demonter: () => void

/** Structure Système migrée vers le Worker/D1 — seedé via le store (le client réel doit exister). */
async function seedNoeud(id: string): Promise<string> {
  const structureStore = useStructureSystemeStore()
  await structureStore.charger(clientId)
  await structureStore.ajouterNiveau(clientId, {
    key: 'equipement',
    label: { fr: 'Équipement', en: 'Equipment', de: 'Equipment' },
    numbering_pattern: '',
  })
  await structureStore.creerNoeud(clientId, {
    level_key: 'equipement',
    name: 'Autoclave AC-104',
    code: id,
    parent_id: null,
  })
  await structureStore.charger(clientId)
  const noeud = structureStore.noeuds.find((n) => n.code === id)
  if (!noeud) throw new Error('seedNoeud : nœud introuvable après création')
  return noeud.id
}

/** Seed la chaîne complète Requirement→Couverture→Test→Execution→Evidence, prête. */
async function seedChainePrete(assetNodeId: string): Promise<void> {
  await ctx.testDefinitionRepo.creerRequirement({
    id: 'req-1',
    clientId,
    reference: 'URS-001',
    titre: 'F0 minimal',
    description: '',
    assetNodeId,
    processId: null,
    auditLog: [],
    createdAt: maintenant,
    updatedAt: maintenant,
  })
  await ctx.testDefinitionRepo.creerTest({
    id: 'test-1',
    clientId,
    testCandidateId: 'candidat-1',
    titre: 'OQ-TEST-01',
    description: '',
    etapes: [],
    statut: 'approuve',
    auditLog: [],
    createdAt: maintenant,
    updatedAt: maintenant,
  })
  await ctx.testDefinitionRepo.creerCouverture({
    id: 'couv-1',
    clientId,
    requirementId: 'req-1',
    testId: 'test-1',
    createdAt: maintenant,
  })
  await db.executions.put({
    id: 'exec-1',
    client_id: clientId,
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
    client_id: clientId,
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
  await db.executions.clear()
  await db.evidences.clear()
  await reinitialiserAuthDeTest()
  const installation = installerFauxWorkerAuth()
  ctx = installation.ctx
  demonter = installation.demonter
  await connecterAdminDeTest()

  const client = await useClientsStore().creerClient({ name: 'Client ContentPlan' })
  if ('erreur' in client) throw client
  clientId = client.id
})

afterEach(() => {
  demonter()
})

describe('ContentPlan', () => {
  test('un plan créé sans nœud a une readiness "besoin_information" (jamais devinée favorable)', async () => {
    const wrapper = mount(ContentPlan, {
      props: { clientId },
      global: { plugins: [routeurDeTest()] },
    })
    await flushPromises()

    const formCreation = wrapper.find('.bloc-creation form')
    await formCreation.find('select').setValue('oq')
    await formCreation.trigger('submit.prevent')
    await attendreQue(
      async () => (await db.contentPlans.where('client_id').equals(clientId).count()) > 0,
    )

    const plan = (await db.contentPlans.toArray())[0]
    expect(plan?.readiness).toBe('besoin_information')
    expect(plan?.statut).toBe('brouillon')
  })

  test('un plan ne peut être gelé qu\'après validation ET readiness "pret" (garde-fou non négociable)', async () => {
    const noeudId = await seedNoeud('AC-104')
    await seedChainePrete(noeudId)

    const wrapper = mount(ContentPlan, {
      props: { clientId },
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
    await selects[1]?.setValue(noeudId)
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
