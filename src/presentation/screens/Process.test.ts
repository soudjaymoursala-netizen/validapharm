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
import Process from './Process.vue'

function routeurDeTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/clients/:clientId',
        name: 'fiche-client',
        component: { template: '<div />' },
      },
      {
        path: '/clients/:clientId/process',
        name: 'gestion-process',
        component: Process,
        props: true,
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

let demonter: () => void

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.processes.clear()
  await db.fonctionsActif.clear()
  await db.associationsFonctionProcess.clear()
  await db.associationsFonctionAssetNode.clear()
  await reinitialiserAuthDeTest()
  demonter = installerFauxWorkerAuth().demonter
  await connecterAdminDeTest()
})

afterEach(() => {
  demonter()
})

describe('Process — écran Process/Fonction (§6 du prompt maître, Phase 40)', () => {
  test('crée un process, une fonction, puis les rattache l’un à l’autre', async () => {
    const clientsStore = useClientsStore()
    const client = await clientsStore.creerClient({ name: 'PharmaTech Solutions' })
    if ('erreur' in client) throw client

    const router = routeurDeTest()
    await router.push({ name: 'gestion-process', params: { clientId: client.id } })
    const wrapper = mount(Process, {
      props: { clientId: client.id },
      global: { plugins: [router] },
    })
    await attendreQue(() => wrapper.text().includes('PharmaTech Solutions'))

    // Créer un process.
    const formulaireProcess = wrapper.find('.bloc-process .formulaire')
    await formulaireProcess.find('input[type="text"]').setValue('Compression')
    await formulaireProcess.trigger('submit.prevent')
    await attendreQue(async () => (await db.processes.toArray()).length > 0)
    expect(wrapper.text()).toContain('Compression')

    // Créer une fonction.
    const formulaireFonction = wrapper.find('.bloc-fonctions .formulaire')
    await formulaireFonction.find('input[type="text"]').setValue('Régulation de température')
    await formulaireFonction.trigger('submit.prevent')
    await attendreQue(async () => (await db.fonctionsActif.toArray()).length > 0)
    expect(wrapper.text()).toContain('Régulation de température')

    // Rattacher la fonction au process.
    const fonctionId = (await db.fonctionsActif.toArray())[0]?.id
    const processId = (await db.processes.toArray())[0]?.id
    const selectFonction = wrapper.find('.bloc-rattachement select')
    await selectFonction.setValue(fonctionId)
    const selects = wrapper.findAll('.bloc-rattachement select')
    await selects[1]?.setValue(processId)
    await wrapper.find('.bloc-rattachement button').trigger('click')

    await attendreQue(async () => (await db.associationsFonctionProcess.toArray()).length > 0)
    const association = (await db.associationsFonctionProcess.toArray())[0]
    expect(association?.function_id).toBe(fonctionId)
    expect(association?.process_id).toBe(processId)
    expect(wrapper.text()).toContain('process : Compression')
  })

  test('affiche un état vide tant qu’aucun process ni fonction n’existe', async () => {
    const clientsStore = useClientsStore()
    const client = await clientsStore.creerClient({ name: 'Client Vide' })
    if ('erreur' in client) throw client

    const router = routeurDeTest()
    await router.push({ name: 'gestion-process', params: { clientId: client.id } })
    const wrapper = mount(Process, {
      props: { clientId: client.id },
      global: { plugins: [router] },
    })
    await attendreQue(() => wrapper.text().includes('Client Vide'))

    expect(wrapper.text()).toContain("Aucun process pour l'instant.")
    expect(wrapper.text()).toContain("Aucune fonction pour l'instant.")
  })
})
