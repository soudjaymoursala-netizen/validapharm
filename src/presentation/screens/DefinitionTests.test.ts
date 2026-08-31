import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { db } from '../../persistance/db'
import DefinitionTests from './DefinitionTests.vue'

function routeurDeTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/clients', name: 'gestion-clients', component: { template: '<div />' } },
      {
        path: '/clients/:clientId/tests',
        name: 'definition-tests',
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
  await db.requirements.clear()
  await db.testObjectives.clear()
  await db.testCandidates.clear()
  await db.tests.clear()
  await db.couvertures.clear()
})

describe('DefinitionTests', () => {
  test('chaîne complète Requirement → Objectif → Candidat → Test approuvé → Couverture (Phase 7a)', async () => {
    const wrapper = mount(DefinitionTests, {
      props: { clientId: 'client-1' },
      global: { plugins: [routeurDeTest()] },
    })
    await flushPromises()

    // Exigence
    const formRequirement = wrapper.find('.bloc-requirements form')
    const inputsRequirement = formRequirement.findAll('input[type="text"]')
    await inputsRequirement[0]?.setValue('URS-001')
    await inputsRequirement[1]?.setValue('F0 minimal du cycle')
    await formRequirement.trigger('submit.prevent')
    await attendreQue(
      async () => (await db.requirements.where('client_id').equals('client-1').count()) > 0,
    )

    // Objectif de test
    const formObjectif = wrapper.find('.bloc-objectifs form')
    await formObjectif.find('select').setValue((await db.requirements.toArray())[0]?.id)
    await formObjectif.find('input[type="text"]').setValue('Vérifier F0 en charge nominale')
    await formObjectif.trigger('submit.prevent')
    await attendreQue(
      async () => (await db.testObjectives.where('client_id').equals('client-1').count()) > 0,
    )

    // Candidat
    const formCandidat = wrapper.find('.bloc-candidats form')
    await formCandidat.find('select').setValue((await db.testObjectives.toArray())[0]?.id)
    await formCandidat.find('input[type="text"]').setValue('Cycle en charge maximale')
    await formCandidat.trigger('submit.prevent')
    await attendreQue(
      async () => (await db.testCandidates.where('client_id').equals('client-1').count()) > 0,
    )

    // Accepter le candidat — jamais automatique (URS-F, garde-fou 7a)
    await wrapper.find('.liste-candidats button').trigger('click')
    await attendreQue(async () => (await db.testCandidates.toArray())[0]?.statut === 'accepte')

    // Test depuis le candidat accepté, 1 étape
    const formTest = wrapper.find('.bloc-tests form')
    await formTest.find('select').setValue((await db.testCandidates.toArray())[0]?.id)
    await formTest.findAll('input[type="text"]')[0]?.setValue('OQ-TEST-01')
    const ligneEtape = formTest.find('.ligne-etape')
    const inputsEtape = ligneEtape.findAll('input')
    await inputsEtape[0]?.setValue('Lancer le cycle')
    await inputsEtape[1]?.setValue('Cycle démarre sans alarme')
    await formTest.trigger('submit.prevent')
    await attendreQue(
      async () => (await db.tests.where('client_id').equals('client-1').count()) > 0,
    )

    const testCree = (await db.tests.toArray())[0]
    expect(testCree?.statut).toBe('brouillon')
    expect(testCree?.etapes).toHaveLength(1)

    // Approuver
    await wrapper.find('.liste-tests button').trigger('click')
    await attendreQue(async () => (await db.tests.toArray())[0]?.statut === 'approuve')

    // Couverture — déclaration explicite, jamais déduite
    const formCouverture = wrapper.find('.bloc-couverture form')
    const selectsCouverture = formCouverture.findAll('select')
    await selectsCouverture[0]?.setValue((await db.requirements.toArray())[0]?.id)
    await selectsCouverture[1]?.setValue((await db.tests.toArray())[0]?.id)
    await formCouverture.trigger('submit.prevent')
    await attendreQue(
      async () => (await db.couvertures.where('client_id').equals('client-1').count()) > 0,
    )

    const couverture = (await db.couvertures.toArray())[0]
    expect(couverture?.requirement_id).toBe((await db.requirements.toArray())[0]?.id)
    expect(couverture?.test_id).toBe((await db.tests.toArray())[0]?.id)
  })

  test('un test ne peut pas être créé depuis un candidat non accepté (garde-fou 7a)', async () => {
    const wrapper = mount(DefinitionTests, {
      props: { clientId: 'client-1' },
      global: { plugins: [routeurDeTest()] },
    })
    await flushPromises()

    const formRequirement = wrapper.find('.bloc-requirements form')
    const inputsRequirement = formRequirement.findAll('input[type="text"]')
    await inputsRequirement[0]?.setValue('URS-002')
    await inputsRequirement[1]?.setValue('Exigence test')
    await formRequirement.trigger('submit.prevent')
    await attendreQue(
      async () => (await db.requirements.where('client_id').equals('client-1').count()) > 0,
    )

    const formObjectif = wrapper.find('.bloc-objectifs form')
    await formObjectif.find('select').setValue((await db.requirements.toArray())[0]?.id)
    await formObjectif.find('input[type="text"]').setValue('Objectif test')
    await formObjectif.trigger('submit.prevent')
    await attendreQue(
      async () => (await db.testObjectives.where('client_id').equals('client-1').count()) > 0,
    )

    const formCandidat = wrapper.find('.bloc-candidats form')
    await formCandidat.find('select').setValue((await db.testObjectives.toArray())[0]?.id)
    await formCandidat.find('input[type="text"]').setValue('Candidat non traité')
    await formCandidat.trigger('submit.prevent')
    await attendreQue(
      async () => (await db.testCandidates.where('client_id').equals('client-1').count()) > 0,
    )

    // Candidat encore "propose" (jamais accepté) : n'apparaît pas dans le
    // formulaire de création de test — seuls les candidats acceptés y figurent.
    const optionsTest = wrapper
      .find('.bloc-tests form select')
      .findAll('option')
      .map((o) => o.text())
    expect(optionsTest).not.toContain('Candidat non traité')
    expect(await db.tests.count()).toBe(0)
  })
})
