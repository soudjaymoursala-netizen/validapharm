import 'fake-indexeddb/auto'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import AccueilQueVoulezVousFaire from './AccueilQueVoulezVousFaire.vue'

beforeEach(() => {
  setActivePinia(createPinia())
})

function routeurDeTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'accueil', component: { template: '<div />' } },
      { path: '/tableau-de-bord', name: 'tableau-de-bord', component: { template: '<div />' } },
      { path: '/clients', name: 'gestion-clients', component: { template: '<div />' } },
      { path: '/configuration', name: 'configuration-client', component: { template: '<div />' } },
    ],
  })
}

describe('AccueilQueVoulezVousFaire', () => {
  test("affiche les cartes d'action vers des capacités réellement construites", async () => {
    const router = routeurDeTest()
    await router.push('/')
    const wrapper = mount(AccueilQueVoulezVousFaire, { global: { plugins: [router] } })

    expect(wrapper.text()).toContain('Que voulez-vous faire ?')
    expect(wrapper.text()).toContain('Voir mes projets')
    expect(wrapper.text()).toContain('Gérer mes clients')
    expect(wrapper.text()).toContain('Configurer la connexion GitHub')
  })

  test('chaque carte pointe vers une route réelle existante', async () => {
    const router = routeurDeTest()
    await router.push('/')
    const wrapper = mount(AccueilQueVoulezVousFaire, { global: { plugins: [router] } })

    const liens = wrapper.findAll('a')
    expect(liens).toHaveLength(3)
    liens.forEach((lien) => {
      expect(lien.attributes('href')).toBeTruthy()
    })
  })
})
