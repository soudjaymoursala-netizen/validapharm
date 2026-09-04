import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { db } from '../../persistance/db'
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

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.evaluationsCSVAssessment.clear()
})

describe('ComputerSystemAssessment', () => {
  test("le bouton d'enregistrement reste désactivé tant que le formulaire n'est pas complet", async () => {
    const wrapper = mount(ComputerSystemAssessment, {
      props: { clientId: 'client-1' },
      global: { plugins: [routeurDeTest()] },
    })
    await flushPromises()

    const submitBtn = wrapper.find('button[type="submit"]')
    expect(submitBtn.attributes('disabled')).toBeDefined()
  })

  test('enregistre une évaluation complète (catégorie fixe, jamais configurable par client)', async () => {
    const wrapper = mount(ComputerSystemAssessment, {
      props: { clientId: 'client-1' },
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
      async () =>
        (await db.evaluationsCSVAssessment.where('client_id').equals('client-1').count()) > 0,
    )
    const evals = await db.evaluationsCSVAssessment.where('client_id').equals('client-1').toArray()
    expect(evals[0]).toMatchObject({
      nom_systeme: 'SCADA ligne STICK002',
      categorie_gamp5: 4,
      pertinence_gxp: true,
      pertinence_eres_part11: false,
    })
  })
})
