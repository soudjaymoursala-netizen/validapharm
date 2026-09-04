import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { db } from '../../persistance/db'
import ConfigurationConnecteursQMS from './ConfigurationConnecteursQMS.vue'

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
        path: '/clients/:clientId/connecteurs-qms',
        name: 'configuration-connecteurs-qms',
        component: { template: '<div />' },
      },
    ],
  })
}

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.connectors.clear()
})

describe('ConfigurationConnecteursQMS', () => {
  test('crée un connecteur Veeva Vault et affiche le rappel "adaptateur non implémenté"', async () => {
    const wrapper = mount(ConfigurationConnecteursQMS, {
      props: { clientId: 'client-1' },
      global: { plugins: [routeurDeTest()] },
    })
    await flushPromises()

    await wrapper.find('input[type="text"]').setValue('Veeva Vault site Rennes')
    await wrapper.find('select').setValue('veeva_vault')
    await flushPromises()

    expect(wrapper.text()).toContain('adaptateur non implémenté')

    const inputs = wrapper.findAll('input[type="text"]')
    await inputs[1]?.setValue('rennes.veevavault.com')
    await inputs[2]?.setValue('qa-rennes')
    await flushPromises()

    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
    await wrapper.find('.formulaire').trigger('submit.prevent')

    await attendreQue(
      async () => (await db.connectors.where('client_id').equals('client-1').count()) > 0,
    )
    const connecteurs = await db.connectors.where('client_id').equals('client-1').toArray()
    expect(connecteurs).toHaveLength(1)
    expect(connecteurs[0]).toMatchObject({ nom: 'Veeva Vault site Rennes', type: 'veeva_vault' })
  })

  test('basculerActif inverse le statut actif/inactif depuis la liste', async () => {
    const wrapper = mount(ConfigurationConnecteursQMS, {
      props: { clientId: 'client-1' },
      global: { plugins: [routeurDeTest()] },
    })
    await flushPromises()

    await wrapper.find('input[type="text"]').setValue('Dossier réseau')
    await wrapper.find('select').setValue('dossier_reseau')
    await flushPromises()
    const inputsChemin = wrapper.findAll('input[type="text"]')
    expect(inputsChemin).toHaveLength(2)
    await inputsChemin[1]?.setValue('\\\\serveur\\partage')
    await wrapper.find('.formulaire').trigger('submit.prevent')

    await attendreQue(
      async () => (await db.connectors.where('client_id').equals('client-1').count()) > 0,
    )
    await attendreQue(() => wrapper.text().includes('Désactiver'))

    const boutonBasculer = wrapper.findAll('button').find((b) => b.text() === 'Désactiver')
    expect(boutonBasculer).toBeDefined()
    await boutonBasculer?.trigger('click')
    await attendreQue(async () => {
      const connecteurs = await db.connectors.where('client_id').equals('client-1').toArray()
      return connecteurs[0]?.actif === false
    })

    const connecteurs = await db.connectors.where('client_id').equals('client-1').toArray()
    expect(connecteurs[0]?.actif).toBe(false)
  })
})
