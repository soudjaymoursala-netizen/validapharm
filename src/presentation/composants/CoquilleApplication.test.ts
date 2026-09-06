import 'fake-indexeddb/auto'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
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
