import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { db } from '../../persistance/db'
import ImpactAssessment from './ImpactAssessment.vue'

function routeurDeTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/clients', name: 'gestion-clients', component: { template: '<div />' } },
      {
        path: '/clients/:clientId/impact-assessment',
        name: 'impact-assessment',
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
  await db.methodProfilesImpactAssessment.clear()
  await db.evaluationsImpactAssessment.clear()
})

describe('ImpactAssessment', () => {
  test("n'affiche aucune question par défaut tant qu'aucune méthode n'est configurée (URS-F-056ter)", async () => {
    const wrapper = mount(ImpactAssessment, {
      props: { clientId: 'client-1' },
      global: { plugins: [routeurDeTest()] },
    })
    await flushPromises()

    expect(wrapper.text()).toContain("Aucune méthode Impact Assessment n'est configurée")
  })

  test('configure une méthode puis calcule le verdict Direct Impact sur une réponse "oui" (URS-F-056/056bis)', async () => {
    const wrapper = mount(ImpactAssessment, {
      props: { clientId: 'client-1' },
      global: { plugins: [routeurDeTest()] },
    })
    await flushPromises()

    await wrapper.find('input[type="text"]').setValue('Procédure interne QD-001')
    const questionInputs = wrapper.findAll('.ligne-question-config input[type="text"]')
    await questionInputs[0]?.setValue('Le système est-il en contact direct avec le produit ?')
    await wrapper.find('.formulaire').trigger('submit.prevent')

    await attendreQue(
      async () =>
        (await db.methodProfilesImpactAssessment.where('client_id').equals('client-1').count()) > 0,
    )
    await flushPromises()

    expect(wrapper.text()).not.toContain("Aucune méthode Impact Assessment n'est configurée")

    await wrapper.find('.nom-element input').setValue('Isolateur STICK002')
    const radioOui = wrapper.find('.liste-questions li input[type="radio"][value="oui"]')
    await radioOui.setValue(true)
    await flushPromises()

    expect(wrapper.text()).toContain('Direct Impact')

    const enregistrerBtn = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Enregistrer cette évaluation')
    await enregistrerBtn?.trigger('click')

    await attendreQue(
      async () =>
        (await db.evaluationsImpactAssessment.where('client_id').equals('client-1').count()) > 0,
    )
    const evals = await db.evaluationsImpactAssessment
      .where('client_id')
      .equals('client-1')
      .toArray()
    expect(evals[0]?.verdict).toBe('impact_direct')
    expect(evals[0]?.nom_element).toBe('Isolateur STICK002')

    await flushPromises()
    expect(wrapper.text()).toContain('Évaluations enregistrées')
    expect(wrapper.text()).toContain('Isolateur STICK002')

    const nouvelleBtn = wrapper.findAll('button').find((b) => b.text() === 'Nouvelle évaluation')
    await nouvelleBtn?.trigger('click')
    await flushPromises()
    expect((wrapper.find('.nom-element input').element as HTMLInputElement).value).toBe('')
    // L'historique reste visible après réinitialisation du formulaire.
    expect(wrapper.text()).toContain('Isolateur STICK002')
  })
})
