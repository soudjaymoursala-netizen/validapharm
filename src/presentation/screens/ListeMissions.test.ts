import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { db } from '../../persistance/db'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import { useClientsStore } from '../stores/useClientsStore'
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
      {
        path: '/clients/:clientId',
        name: 'fiche-client',
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

describe('ListeMissions — navigation retour vers la fiche client', () => {
  let demonter: () => void

  beforeEach(async () => {
    await reinitialiserAuthDeTest()
    demonter = installerFauxWorkerAuth().demonter
    await connecterAdminDeTest()
  })

  afterEach(() => {
    demonter()
  })

  test('affiche un lien retour vers la fiche client, avec son nom une fois chargé', async () => {
    const clientsStore = useClientsStore()
    const client = await clientsStore.creerClient({ name: 'PharmaTech Solutions' })
    if ('erreur' in client) throw client

    const router = routeurDeTest()
    await router.push(`/clients/${client.id}/missions`)
    const wrapper = mount(ListeMissions, {
      props: { clientId: client.id },
      global: { plugins: [router] },
    })
    await attendreQue(() => wrapper.text().includes('PharmaTech Solutions'))

    const lien = wrapper.find('.lien-retour')
    expect(lien.exists()).toBe(true)
    expect(lien.text()).toBe('PharmaTech Solutions')
    expect(wrapper.find('h1').text()).toContain('PharmaTech Solutions')
  })
})
