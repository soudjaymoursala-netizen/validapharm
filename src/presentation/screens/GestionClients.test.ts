import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { db } from '../../persistance/db'
import { useProfilLocalStore } from '../stores/useProfilLocalStore'
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

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.clients.clear()
  await db.profilLocal.clear()
})

describe('GestionClients — archivage (§4.31/URS-F-310, TD-033)', () => {
  test('archiver un client sans profil local configuré affiche une invite à configurer le profil, aucune écriture', async () => {
    const wrapper = mount(GestionClients, { global: { plugins: [routeurDeTest()] } })
    await flushPromises()

    const formulaire = wrapper.find('.formulaire-client')
    // Le formulaire est masqué par défaut — ouvrir via le bouton d'en-tête.
    if (!formulaire.exists()) {
      await wrapper.find('header button').trigger('click')
    }
    await wrapper.find('.formulaire-client input[type="text"]').setValue('PharmaTech Solutions')
    await wrapper.find('.formulaire-client').trigger('submit.prevent')
    await attendreQue(async () => (await db.clients.count()) > 0)

    await wrapper.find('.bouton-archiver').trigger('click')
    await flushPromises()

    expect(wrapper.find('.modale').text()).toContain('Aucun profil local configuré')
    expect((await db.clients.toArray())[0]?.statut).toBe('actif')
  })

  test('archive un client après double confirmation (nom retapé + mot de passe local), le client bascule dans les archives', async () => {
    const profilStore = useProfilLocalStore()
    await profilStore.definirProfil({
      nom: 'Lead',
      prenom: 'Quentin',
      email: 'q.lead@pharmatech.example',
      visa: 'QLD',
      motDePasse: 'CoffreFort!2026',
    })

    const wrapper = mount(GestionClients, { global: { plugins: [routeurDeTest()] } })
    await flushPromises()

    await wrapper.find('header button').trigger('click')
    await wrapper.find('.formulaire-client input[type="text"]').setValue('PharmaTech Solutions')
    await wrapper.find('.formulaire-client').trigger('submit.prevent')
    await attendreQue(async () => (await db.clients.count()) > 0)

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
    expect((await db.clients.toArray())[0]?.statut).toBe('actif')

    // Nom correct, mauvais mot de passe.
    await inputs[0]?.setValue('PharmaTech Solutions')
    await inputs[1]?.setValue('mauvais')
    await modale.find('form').trigger('submit.prevent')
    await attendreQue(() => {
      const bandeau = modale.find('.bandeau-erreur')
      return bandeau.exists() && bandeau.text().includes('Mot de passe incorrect')
    })
    expect(modale.find('.bandeau-erreur').text()).toContain('Mot de passe incorrect')
    expect((await db.clients.toArray())[0]?.statut).toBe('actif')

    // Les deux corrects — archivage accepté.
    await inputs[0]?.setValue('PharmaTech Solutions')
    await inputs[1]?.setValue('CoffreFort!2026')
    await modale.find('form').trigger('submit.prevent')
    await attendreQue(async () => (await db.clients.toArray())[0]?.statut === 'archive')

    const clientArchive = (await db.clients.toArray())[0]
    expect(clientArchive?.statut).toBe('archive')
    expect(clientArchive?.archived_by).toContain('QLD')
    expect(wrapper.find('.modale').exists()).toBe(false)

    // Le client archivé n'apparaît plus dans la liste active (0 client actif restant).
    await flushPromises()
    expect(wrapper.find('.etat-vide').exists()).toBe(true)
    expect(wrapper.find('.liste-clients').exists()).toBe(false)
  })
})
