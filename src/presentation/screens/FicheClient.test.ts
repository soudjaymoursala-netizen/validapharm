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
import { useProjectsStore } from '../stores/useProjectsStore'
import FicheClient from './FicheClient.vue'

function routeurDeTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/clients', name: 'gestion-clients', component: { template: '<div />' } },
      {
        path: '/clients/:clientId',
        name: 'fiche-client',
        component: FicheClient,
        props: true,
      },
      {
        path: '/clients/:clientId/structure-systeme',
        name: 'structure-systeme',
        component: { template: '<div />' },
      },
      {
        path: '/clients/:clientId/process',
        name: 'gestion-process',
        component: { template: '<div />' },
      },
      {
        path: '/clients/:clientId/procedures',
        name: 'revue-structure-procedure',
        component: { template: '<div />' },
      },
      {
        path: '/clients/:clientId/templates',
        name: 'templates-formulaires',
        component: { template: '<div />' },
      },
      { path: '/tableau-de-bord', name: 'tableau-de-bord', component: { template: '<div />' } },
      {
        path: '/projets/:projectId',
        name: 'fiche-projet',
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

let demonter: () => void

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.projects.clear()
  await reinitialiserAuthDeTest()
  demonter = installerFauxWorkerAuth().demonter
  await connecterAdminDeTest()
})

afterEach(() => {
  demonter()
})

describe('FicheClient — page d’entrée d’un client (§13-15 du prompt maître)', () => {
  test('affiche le nom du client, ses informations, et les 5 branches du parcours', async () => {
    const clientsStore = useClientsStore()
    const client = await clientsStore.creerClient({
      name: 'PharmaTech Solutions',
      adresse: '12 rue de la Zone Industrielle',
      secteur: 'pharmaceutique',
      details: 'Fabrication de formes sèches',
    })
    if ('erreur' in client) throw client

    const router = routeurDeTest()
    await router.push({ name: 'fiche-client', params: { clientId: client.id } })
    const wrapper = mount(FicheClient, {
      props: { clientId: client.id },
      global: { plugins: [router] },
    })
    await attendreQue(() => wrapper.text().includes('PharmaTech Solutions'))

    expect(wrapper.find('h1').text()).toBe('PharmaTech Solutions')
    expect(wrapper.text()).toContain('12 rue de la Zone Industrielle')
    expect(wrapper.text()).toContain('Pharma')
    expect(wrapper.text()).toContain('Fabrication de formes sèches')

    const nomsBranches = wrapper.findAll('.branche h2').map((h2) => h2.text())
    expect(nomsBranches).toEqual([
      'Architecture',
      'Process',
      'Procédures',
      'Templates & Formulaires',
      'Projets',
    ])

    const lienProjets = wrapper.findAll('a.branche').find((a) => a.text().includes('Projets'))
    expect(lienProjets?.attributes('href')).toContain(`clientId=${client.id}`)
  })

  test('modifier les informations persiste via useClientsStore.modifierClient', async () => {
    const clientsStore = useClientsStore()
    const client = await clientsStore.creerClient({ name: 'Client Initial' })
    if ('erreur' in client) throw client

    const router = routeurDeTest()
    await router.push({ name: 'fiche-client', params: { clientId: client.id } })
    const wrapper = mount(FicheClient, {
      props: { clientId: client.id },
      global: { plugins: [router] },
    })
    await attendreQue(() => wrapper.text().includes('Client Initial'))

    await wrapper.find('.bouton-secondaire').trigger('click')
    const formulaire = wrapper.find('.formulaire-edition')
    expect(formulaire.exists()).toBe(true)
    await formulaire.find('input[type="text"]').setValue('Client Renommé')
    await formulaire.find('select').setValue('dispositif_medical')
    await formulaire.trigger('submit.prevent')

    await attendreQue(async () => {
      const relu = await clientsStore.obtenirClient(client.id)
      return relu?.name === 'Client Renommé'
    })
    const relu = await clientsStore.obtenirClient(client.id)
    expect(relu?.secteur).toBe('dispositif_medical')
    await attendreQue(() => wrapper.find('h1').text() === 'Client Renommé')
  })

  test('liste les projets récents de ce client uniquement', async () => {
    const clientsStore = useClientsStore()
    const projetsStore = useProjectsStore()
    const client = await clientsStore.creerClient({ name: 'Client A' })
    const autreClient = await clientsStore.creerClient({ name: 'Client B' })
    if ('erreur' in client || 'erreur' in autreClient)
      throw new Error('préparation de test échouée')

    await projetsStore.creerProjet({
      name: 'Projet de Client A',
      context: '',
      scope_in: '',
      scope_out: '',
      deadline: null,
      language_default: 'fr',
      client_id: client.id,
    })
    await projetsStore.creerProjet({
      name: 'Projet de Client B',
      context: '',
      scope_in: '',
      scope_out: '',
      deadline: null,
      language_default: 'fr',
      client_id: autreClient.id,
    })

    const router = routeurDeTest()
    await router.push({ name: 'fiche-client', params: { clientId: client.id } })
    const wrapper = mount(FicheClient, {
      props: { clientId: client.id },
      global: { plugins: [router] },
    })
    await attendreQue(() => wrapper.text().includes('Projets récents'))

    expect(wrapper.text()).toContain('Projet de Client A')
    expect(wrapper.text()).not.toContain('Projet de Client B')
  })
})
