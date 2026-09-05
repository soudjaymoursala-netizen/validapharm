import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { db } from '../../persistance/db'
import JournalAnomalies from './JournalAnomalies.vue'

// `flushPromises` seul ne suffit pas toujours à attendre la fin d'une
// transaction IndexedDB (fake-indexeddb) déclenchée par un handler
// d'événement — même patron que `ComputerSystemAssessment.test.ts`.
async function attendreQue(condition: () => Promise<boolean> | boolean): Promise<void> {
  for (let tentative = 0; tentative < 50; tentative++) {
    await flushPromises()
    if (await condition()) return
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  throw new Error('attendreQue : condition jamais satisfaite')
}

function routeurDeTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/clients', name: 'gestion-clients', component: { template: '<div />' } },
      {
        path: '/clients/:clientId/anomalies',
        name: 'journal-anomalies',
        component: { template: '<div />' },
      },
    ],
  })
}

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.qualityEvents.clear()
  await db.referencesQualityEvent.clear()
  await db.assetNodes.clear()
})

describe('JournalAnomalies', () => {
  test('le bouton de création reste désactivé tant que le type et le titre ne sont pas renseignés', async () => {
    const wrapper = mount(JournalAnomalies, {
      props: { clientId: 'client-1' },
      global: { plugins: [routeurDeTest()] },
    })
    await flushPromises()

    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
  })

  test('crée une déviation, la liste immédiatement, jamais un verrou sur un autre module', async () => {
    const wrapper = mount(JournalAnomalies, {
      props: { clientId: 'client-1' },
      global: { plugins: [routeurDeTest()] },
    })
    await flushPromises()

    await wrapper.find('select').setValue('deviation')
    await wrapper.find('input[type="text"]').setValue('Dérive de température sonde AUT-042')
    await flushPromises()

    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
    await wrapper.find('.formulaire').trigger('submit.prevent')

    await attendreQue(
      async () => (await db.qualityEvents.where('client_id').equals('client-1').count()) > 0,
    )
    const evenements = await db.qualityEvents.where('client_id').equals('client-1').toArray()
    expect(evenements).toHaveLength(1)
    expect(evenements[0]).toMatchObject({
      type: 'deviation',
      titre: 'Dérive de température sonde AUT-042',
      statut: 'ouvert',
    })
    expect(wrapper.text()).toContain('Dérive de température sonde AUT-042')
  })
})
