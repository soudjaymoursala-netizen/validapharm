import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { db } from '../../persistance/db'
import ListeMissions from './ListeMissions.vue'

function routeurDeTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/clients/:clientId/missions',
        name: 'liste-missions',
        component: { template: '<div />' },
      },
      {
        path: '/clients/:clientId/missions/:missionId',
        name: 'mission-workspace',
        component: { template: '<div />' },
      },
    ],
  })
}

// `fake-indexeddb` résout ses transactions via une macrotâche (pas
// seulement des microtâches) — `flushPromises()` seul ne suffit pas
// toujours à observer une écriture Dexie déclenchée par un gestionnaire
// d'événement Vue non attendu explicitement. Ce sondage évite un test
// intermittent (flaky) plutôt que de deviner un délai fixe.
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
  await db.missions.clear()
  await db.organizations.clear()
  await db.workspaces.clear()
  await db.assetNodes.clear()
})

describe('ListeMissions', () => {
  test('affiche "aucune mission" puis crée une Mission et navigue vers son workspace', async () => {
    const router = routeurDeTest()
    await router.push('/clients/client-1/missions')
    const wrapper = mount(ListeMissions, {
      props: { clientId: 'client-1' },
      global: { plugins: [router] },
    })
    await new Promise((r) => setTimeout(r, 0))

    expect(wrapper.text()).toContain('Aucune mission')

    await wrapper.find('button').trigger('click') // "Nouvelle mission"
    await wrapper.find('input[type="text"]').setValue('Qualification granulateur GR-01')
    await wrapper.find('form').trigger('submit.prevent')

    await attendreQue(
      async () => (await db.missions.where('client_id').equals('client-1').count()) > 0,
    )

    const missions = await db.missions.where('client_id').equals('client-1').toArray()
    expect(missions).toHaveLength(1)
    expect(missions[0]?.titre).toBe('Qualification granulateur GR-01')

    await attendreQue(() => router.currentRoute.value.name === 'mission-workspace')
    expect(router.currentRoute.value.name).toBe('mission-workspace')
  })
})
