import 'fake-indexeddb/auto'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useConnectiviteServeurStore } from '../stores/useConnectiviteServeurStore'
import { useErreursGlobalesStore } from '../stores/useErreursGlobalesStore'
import CoquilleApplication from './CoquilleApplication.vue'

function routeurDeTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'accueil', component: { template: '<div>Accueil</div>' } },
      { path: '/connexion', name: 'connexion', component: { template: '<div>Connexion</div>' } },
      { path: '/profil', name: 'profil', component: { template: '<div>Profil</div>' } },
      { path: '/parametres', name: 'parametres', component: { template: '<div />' } },
      { path: '/normes', name: 'bibliotheque-normes', component: { template: '<div />' } },
      { path: '/configuration', name: 'configuration-client', component: { template: '<div />' } },
      { path: '/clients', name: 'gestion-clients', component: { template: '<div />' } },
      { path: '/tableau-de-bord', name: 'tableau-de-bord', component: { template: '<div />' } },
    ],
  })
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

describe('CoquilleApplication — menu mobile (responsive)', () => {
  test('le bouton hamburger ouvre le tiroir, le clic sur le fond le referme', async () => {
    const router = routeurDeTest()
    await router.push('/')
    const wrapper = mount(CoquilleApplication, { global: { plugins: [router] } })

    expect(wrapper.find('.sidebar').classes()).not.toContain('sidebar--ouverte')
    expect(wrapper.find('.coquille-application__fond').exists()).toBe(false)

    await wrapper.find('.coquille-application__bouton-menu').trigger('click')
    expect(wrapper.find('.sidebar').classes()).toContain('sidebar--ouverte')
    expect(wrapper.find('.coquille-application__fond').exists()).toBe(true)

    await wrapper.find('.coquille-application__fond').trigger('click')
    expect(wrapper.find('.sidebar').classes()).not.toContain('sidebar--ouverte')
    expect(wrapper.find('.coquille-application__fond').exists()).toBe(false)
  })

  test('navigation vers un autre écran referme automatiquement le tiroir', async () => {
    const router = routeurDeTest()
    await router.push('/')
    const wrapper = mount(CoquilleApplication, { global: { plugins: [router] } })

    await wrapper.find('.coquille-application__bouton-menu').trigger('click')
    expect(wrapper.find('.sidebar').classes()).toContain('sidebar--ouverte')

    await router.push('/profil')
    expect(wrapper.find('.sidebar').classes()).not.toContain('sidebar--ouverte')
  })

  test('écran de connexion : ni sidebar ni bouton menu (aucune route accessible sans session)', async () => {
    const router = routeurDeTest()
    await router.push('/connexion')
    const wrapper = mount(CoquilleApplication, { global: { plugins: [router] } })

    expect(wrapper.find('.sidebar').exists()).toBe(false)
    expect(wrapper.find('.coquille-application__bouton-menu').exists()).toBe(false)
  })
})

describe('CoquilleApplication — serveur injoignable', () => {
  test('bandeau affiché tant que le serveur est injoignable, retiré dès qu’il répond', async () => {
    const router = routeurDeTest()
    await router.push('/')
    const wrapper = mount(CoquilleApplication, { global: { plugins: [router] } })
    const connectivite = useConnectiviteServeurStore()

    expect(wrapper.find('.bandeau-serveur-injoignable').exists()).toBe(false)
    connectivite.signaler(false)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.bandeau-serveur-injoignable').text()).toContain('Serveur injoignable')
    connectivite.signaler(true)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.bandeau-serveur-injoignable').exists()).toBe(false)
  })
})

describe('CoquilleApplication — erreurs non gérées affichées (audit M1)', () => {
  test("l'erreur d'une action non gérée par l'écran apparaît dans un bandeau, sans doublon, jusqu'à fermeture ou navigation", async () => {
    const router = routeurDeTest()
    await router.push('/')
    const wrapper = mount(CoquilleApplication, {
      global: {
        plugins: [router],
        config: {
          errorHandler: (e: unknown) => useErreursGlobalesStore().signaler(e),
        },
      },
    })
    const erreurs = useErreursGlobalesStore()
    erreurs.signaler(new Error('Échec de la création : données incomplètes (corps_invalide)'))
    erreurs.signaler(new Error('Échec de la création : données incomplètes (corps_invalide)'))
    await wrapper.vm.$nextTick()

    const messages = wrapper.findAll('.erreurs-globales__message')
    expect(messages).toHaveLength(1)
    expect(messages[0]?.text()).toContain('Action non aboutie : Échec de la création')

    await messages[0]?.find('button').trigger('click')
    expect(wrapper.find('.erreurs-globales').exists()).toBe(false)

    erreurs.signaler(new Error('Autre échec'))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.erreurs-globales').exists()).toBe(true)
    await router.push('/profil')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.erreurs-globales').exists()).toBe(false)
  })
})

describe('CoquilleApplication — accessibilité de la navigation', () => {
  test('Échap referme le tiroir mobile et rend le focus au bouton', async () => {
    const router = routeurDeTest()
    await router.push('/')
    const wrapper = mount(CoquilleApplication, {
      global: { plugins: [router] },
      attachTo: document.body,
    })

    await wrapper.find('.coquille-application__bouton-menu').trigger('click')
    expect(wrapper.find('.sidebar').classes()).toContain('sidebar--ouverte')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.sidebar').classes()).not.toContain('sidebar--ouverte')
    expect(document.activeElement).toBe(wrapper.find('.coquille-application__bouton-menu').element)
    wrapper.unmount()
  })

  test('propose un lien « Aller au contenu » vers la zone principale', async () => {
    const router = routeurDeTest()
    await router.push('/')
    const wrapper = mount(CoquilleApplication, { global: { plugins: [router] } })

    const lien = wrapper.find('.lien-evitement')
    expect(lien.attributes('href')).toBe('#contenu-principal')
    expect(wrapper.find('#contenu-principal').exists()).toBe(true)
  })
})
