import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Contexte } from '../../../workers/auth-worker/src/routeur'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import ComputerSystemAssessment from './ComputerSystemAssessment.vue'

function routeurDeTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/clients', name: 'gestion-clients', component: { template: '<div />' } },
      {
        path: '/clients/:clientId/csv-assessment',
        name: 'csv-assessment',
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

const CLIENT_ID = 'client-1'

let ctx: Contexte
let demonter: () => void

beforeEach(async () => {
  setActivePinia(createPinia())
  await reinitialiserAuthDeTest()
  const installation = installerFauxWorkerAuth()
  ctx = installation.ctx
  demonter = installation.demonter
  await connecterAdminDeTest()
  await ctx.clientsRepo.creer({
    id: CLIENT_ID,
    name: CLIENT_ID,
    adresse: null,
    secteur: null,
    details: null,
    statut: 'actif',
    archivedAt: null,
    archivedBy: null,
    createdByUserId: 'admin-test',
    sharedWith: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
})

afterEach(() => {
  demonter()
})

describe('ComputerSystemAssessment', () => {
  test("le bouton d'enregistrement reste désactivé tant que le formulaire n'est pas complet", async () => {
    const wrapper = mount(ComputerSystemAssessment, {
      props: { clientId: CLIENT_ID },
      global: { plugins: [routeurDeTest()] },
    })
    await flushPromises()

    const submitBtn = wrapper.find('button[type="submit"]')
    expect(submitBtn.attributes('disabled')).toBeDefined()
  })

  test('enregistre une évaluation complète (catégorie fixe, jamais configurable par client)', async () => {
    const wrapper = mount(ComputerSystemAssessment, {
      props: { clientId: CLIENT_ID },
      global: { plugins: [routeurDeTest()] },
    })
    await flushPromises()

    await wrapper.find('input[type="text"]').setValue('SCADA ligne STICK002')
    await wrapper.find('.categorie input[type="radio"][value="4"]').setValue(true)
    await wrapper.find('textarea').setValue('Logiciel de supervision configurable, non modifié.')
    const pertinenceFieldsets = wrapper.findAll('.pertinence')
    await pertinenceFieldsets[0]?.find('input[value="true"]').setValue(true)
    await pertinenceFieldsets[1]?.find('input[value="false"]').setValue(true)
    const textareas = wrapper.findAll('textarea')
    await textareas[1]?.setValue('Supervision de paramètres GxP, pas de signature électronique.')
    await flushPromises()

    const submitBtn = wrapper.find('button[type="submit"]')
    expect(submitBtn.attributes('disabled')).toBeUndefined()

    await wrapper.find('.formulaire').trigger('submit.prevent')

    await attendreQue(
      async () => (await ctx.csvAssessmentRepo.listerEvaluations(CLIENT_ID)).length > 0,
    )
    const evals = await ctx.csvAssessmentRepo.listerEvaluations(CLIENT_ID)
    expect(evals[0]).toMatchObject({
      nomSysteme: 'SCADA ligne STICK002',
      categorieGamp5: 4,
      pertinenceGxp: true,
      pertinenceEresPart11: false,
    })
  })

  test("la catégorie 2 (retirée de GAMP 5) n'est plus proposée, mais une évaluation historique en catégorie 2 reste lisible", async () => {
    const maintenant = new Date().toISOString()
    await ctx.csvAssessmentRepo.creerEvaluation({
      id: 'csv-historique',
      clientId: CLIENT_ID,
      assetNodeId: null,
      nomSysteme: 'Automate historique',
      categorieGamp5: 2,
      justificationCategorie: 'Évaluée avant GAMP 5',
      pertinenceGxp: true,
      pertinenceEresPart11: false,
      justificationPertinence: 'x',
      auditLog: [{ timestamp: maintenant, actor: 'admin@test', action: 'création' }],
      createdAt: maintenant,
      updatedAt: maintenant,
    })
    const wrapper = mount(ComputerSystemAssessment, {
      props: { clientId: CLIENT_ID },
      global: { plugins: [routeurDeTest()] },
    })
    await attendreQue(() => wrapper.text().includes('Automate historique'))

    const valeurs = wrapper
      .findAll('.categorie input[type="radio"]')
      .map((radio) => radio.attributes('value'))
    expect(valeurs).toEqual(['1', '3', '4', '5'])
    expect(wrapper.text()).toContain('Catégorie 2 — Firmware (retirée de GAMP 5, historique)')
  })
})
