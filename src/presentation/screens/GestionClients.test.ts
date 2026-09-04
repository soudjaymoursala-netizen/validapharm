import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import { useClientsStore } from '../stores/useClientsStore'
import GestionClients from './GestionClients.vue'

function routeurDeTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'accueil', component: { template: '<div />' } },
      { path: '/tableau-de-bord', name: 'tableau-de-bord', component: { template: '<div />' } },
      { path: '/clients', name: 'gestion-clients', component: { template: '<div />' } },
      {
        path: '/clients/:clientId',
        name: 'fiche-client',
        component: { template: '<div />' },
      },
      { path: '/profil-local', name: 'profil-local', component: { template: '<div />' } },
      {
        path: '/clients/:clientId/missions',
        name: 'liste-missions',
        component: { template: '<div />' },
      },
      {
        path: '/clients/:clientId/drive',
        name: 'configuration-drive',
        component: { template: '<div />' },
      },
      {
        path: '/clients/:clientId/ia',
        name: 'configuration-ia',
        component: { template: '<div />' },
      },
      { path: '/clients/:clientId/chat', name: 'panneau-chat', component: { template: '<div />' } },
      {
        path: '/clients/:clientId/structure-systeme',
        name: 'structure-systeme',
        component: { template: '<div />' },
      },
      {
        path: '/clients/:clientId/strategie-qualification',
        name: 'assistant-strategie-qualification',
        component: { template: '<div />' },
      },
      {
        path: '/clients/:clientId/impact-assessment',
        name: 'impact-assessment',
        component: { template: '<div />' },
      },
      {
        path: '/clients/:clientId/csv-assessment',
        name: 'csv-assessment',
        component: { template: '<div />' },
      },
      {
        path: '/clients/:clientId/procedures',
        name: 'revue-structure-procedure',
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
  await reinitialiserAuthDeTest()
  demonter = installerFauxWorkerAuth().demonter
  await connecterAdminDeTest()
})

afterEach(() => {
  demonter()
})

describe('GestionClients — archivage (§4.31/URS-F-310, TD-046 — vraie session)', () => {
  test('archive un client après double confirmation (nom retapé + vrai mot de passe), le client bascule dans les archives', async () => {
    const clientsStore = useClientsStore()
    const wrapper = mount(GestionClients, { global: { plugins: [routeurDeTest()] } })
    await flushPromises()

    await wrapper.find('header button').trigger('click')
    await wrapper.find('.formulaire-client input[type="text"]').setValue('PharmaTech Solutions')
    await wrapper.find('.formulaire-client').trigger('submit.prevent')
    await attendreQue(() => clientsStore.clients.length > 0)

    await wrapper.find('.bouton-archiver').trigger('click')
    await flushPromises()

    const modale = wrapper.find('.modale')
    const inputs = modale.findAll('input')
    // Mauvais nom d'abord — doit être refusé.
    await inputs[0]?.setValue('Nom incorrect')
    await inputs[1]?.setValue('CoffreFort!2026')
    await modale.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(modale.find('.bandeau-erreur').text()).toContain('ne correspond pas')
    expect(clientsStore.clients[0]?.statut).toBe('actif')

    // Nom correct, mauvais mot de passe.
    await inputs[0]?.setValue('PharmaTech Solutions')
    await inputs[1]?.setValue('mauvais')
    await modale.find('form').trigger('submit.prevent')
    await attendreQue(() => {
      const bandeau = modale.find('.bandeau-erreur')
      return bandeau.exists() && bandeau.text().includes('Mot de passe incorrect')
    })
    expect(modale.find('.bandeau-erreur').text()).toContain('Mot de passe incorrect')
    expect(clientsStore.clients[0]?.statut).toBe('actif')

    // Les deux corrects (vrai mot de passe du compte connecté) — archivage accepté.
    await inputs[0]?.setValue('PharmaTech Solutions')
    await inputs[1]?.setValue('CoffreFort!2026')
    await modale.find('form').trigger('submit.prevent')
    await attendreQue(() => clientsStore.clientsArchives.length > 0)

    const clientArchive = clientsStore.clientsArchives[0]
    expect(clientArchive?.statut).toBe('archive')
    expect(clientArchive?.archived_by).toContain('admin@pharmatech.example')
    expect(wrapper.find('.modale').exists()).toBe(false)

    // Le client archivé n'apparaît plus dans la liste active (0 client actif restant).
    await flushPromises()
    expect(wrapper.find('.etat-vide').exists()).toBe(true)
    expect(wrapper.find('.liste-clients').exists()).toBe(false)
  })

  test('suppression définitive (admin) exige justification + vrai mot de passe, retire le client', async () => {
    const clientsStore = useClientsStore()
    const wrapper = mount(GestionClients, { global: { plugins: [routeurDeTest()] } })
    await flushPromises()

    await wrapper.find('header button').trigger('click')
    await wrapper.find('.formulaire-client input[type="text"]').setValue('Client à supprimer')
    await wrapper.find('.formulaire-client').trigger('submit.prevent')
    await attendreQue(() => clientsStore.clients.length > 0)

    await wrapper.find('.bouton-archiver').trigger('click')
    const modaleArchivage = wrapper.find('.modale')
    const inputsArchivage = modaleArchivage.findAll('input')
    await inputsArchivage[0]?.setValue('Client à supprimer')
    await inputsArchivage[1]?.setValue('CoffreFort!2026')
    await modaleArchivage.find('form').trigger('submit.prevent')
    await attendreQue(() => clientsStore.clientsArchives.length > 0)

    await wrapper.find('.lien-archives').trigger('click')
    await flushPromises()
    await wrapper.find('.liste-clients--archives .bouton-danger').trigger('click')
    await flushPromises()

    const modaleSuppression = wrapper.find('.modale')
    expect(modaleSuppression.text()).toContain('irréversible')
    const inputsSuppression = modaleSuppression.findAll('input')
    await inputsSuppression[0]?.setValue('Client à supprimer')
    await modaleSuppression.find('textarea').setValue('Test — nettoyage')
    await inputsSuppression[1]?.setValue('CoffreFort!2026')
    await modaleSuppression.find('form').trigger('submit.prevent')

    await attendreQue(() => clientsStore.clientsArchives.length === 0)
    expect(clientsStore.clients).toHaveLength(0)
  })
})
