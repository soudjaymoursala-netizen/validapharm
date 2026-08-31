import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { db } from '../../persistance/db'
import ParametresCritiques from './ParametresCritiques.vue'

function routeurDeTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/clients', name: 'gestion-clients', component: { template: '<div />' } },
      {
        path: '/clients/:clientId/parametres-critiques',
        name: 'parametres-critiques',
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
  await db.parameters.clear()
  await db.classificationsCriticiteParametre.clear()
  await db.cpps.clear()
  await db.cqas.clear()
})

describe('ParametresCritiques', () => {
  test('crée un paramètre, le classifie, déclare un CPP et un CQA séparément (Phase 2)', async () => {
    const wrapper = mount(ParametresCritiques, {
      props: { clientId: 'client-1' },
      global: { plugins: [routeurDeTest()] },
    })
    await flushPromises()

    // Paramètre
    const formParametre = wrapper.find('.bloc-parametres form')
    await formParametre.find('input[type="text"]').setValue('Température')
    await formParametre.trigger('submit.prevent')
    await attendreQue(
      async () => (await db.parameters.where('client_id').equals('client-1').count()) > 0,
    )

    const parametre = (await db.parameters.toArray())[0]
    expect(parametre?.nom).toBe('Température')

    // Le paramètre doit apparaître dans les sélecteurs avant qu'on interagisse
    // avec eux (chargement IndexedDB asynchrone dans onMounted — même leçon
    // que ExecutionTests.test.ts).
    await attendreQue(() =>
      wrapper
        .find('.bloc-classification select')
        .findAll('option')
        .some((o) => o.attributes('value') === parametre?.id),
    )

    // Classification (indicatif, ne crée ni CPP ni CQA)
    const formClassification = wrapper.find('.bloc-classification form')
    const selectsClassification = formClassification.findAll('select')
    await selectsClassification[0]?.setValue(parametre?.id)
    await selectsClassification[1]?.setValue('critique')
    await formClassification.find('textarea').setValue('Impact direct sur la stérilité')
    await formClassification.trigger('submit.prevent')
    await attendreQue(async () => (await db.classificationsCriticiteParametre.count()) > 0)
    expect(await db.cpps.count()).toBe(0)
    expect(await db.cqas.count()).toBe(0)

    // CPP — déclaration humaine explicite, distincte de la classification
    const formCPP = wrapper.find('.bloc-cpp form')
    await formCPP.find('select').setValue(parametre?.id)
    const inputsCPP = formCPP.findAll('input[type="text"]')
    await inputsCPP[0]?.setValue('Recette lot A')
    await formCPP.find('textarea').setValue('Justification CPP')
    await formCPP.trigger('submit.prevent')
    await attendreQue(async () => (await db.cpps.count()) > 0)

    const cpp = (await db.cpps.toArray())[0]
    expect(cpp?.parameter_id).toBe(parametre?.id)
    expect(cpp?.actif).toBe(true)

    // CQA — indépendant, pas de parameter_id
    const formCQA = wrapper.find('.bloc-cqa form')
    const inputsCQA = formCQA.findAll('input[type="text"]')
    await inputsCQA[0]?.setValue('Stérilité')
    await inputsCQA[1]?.setValue('Contexte CQA')
    const textareasCQA = formCQA.findAll('textarea')
    await textareasCQA[1]?.setValue('Justification CQA')
    await formCQA.trigger('submit.prevent')
    await attendreQue(async () => (await db.cqas.count()) > 0)

    const cqa = (await db.cqas.toArray())[0]
    expect(cqa?.nom).toBe('Stérilité')

    // Désactivation du CPP — jamais une suppression, un événement tracé
    await attendreQue(() => wrapper.find('.liste-cpp li').exists())
    const ligneCPP = wrapper.find('.liste-cpp li')
    await ligneCPP.find('input[type="text"]').setValue('Changement de recette')
    await ligneCPP.find('button').trigger('click')
    await attendreQue(async () => (await db.cpps.toArray())[0]?.actif === false)

    const cppDesactive = (await db.cpps.toArray())[0]
    expect(cppDesactive?.actif).toBe(false)
    expect(cppDesactive?.audit_log.at(-1)?.action).toContain('Changement de recette')
  })

  test('une classification "important" ne crée jamais de CPP (garde-fou DEC-019)', async () => {
    await db.parameters.put({
      id: 'param-1',
      client_id: 'client-1',
      asset_node_id: null,
      nom: 'Pression',
      description: '',
      unite: 'bar',
      audit_log: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    const wrapper = mount(ParametresCritiques, {
      props: { clientId: 'client-1' },
      global: { plugins: [routeurDeTest()] },
    })
    await flushPromises()
    await attendreQue(() =>
      wrapper
        .find('.bloc-classification select')
        .findAll('option')
        .some((o) => o.attributes('value') === 'param-1'),
    )

    const formClassification = wrapper.find('.bloc-classification form')
    const selects = formClassification.findAll('select')
    await selects[0]?.setValue('param-1')
    await selects[1]?.setValue('important')
    await formClassification.find('textarea').setValue('Justification')
    await formClassification.trigger('submit.prevent')
    await attendreQue(async () => (await db.classificationsCriticiteParametre.count()) > 0)

    expect(await db.cpps.count()).toBe(0)
    expect(await db.cqas.count()).toBe(0)
  })
})
