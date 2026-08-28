import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { useClientActifStore } from '../stores/useClientActifStore'
import BarreLaterale from './BarreLaterale.vue'

function routeurDeTest(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'accueil', component: { template: '<div />' } },
      { path: '/tableau-de-bord', name: 'tableau-de-bord', component: { template: '<div />' } },
      { path: '/clients', name: 'gestion-clients', component: { template: '<div />' } },
      { path: '/configuration', name: 'configuration-client', component: { template: '<div />' } },
      { path: '/normes', name: 'bibliotheque-normes', component: { template: '<div />' } },
      {
        path: '/clients/:clientId/missions',
        name: 'liste-missions',
        component: { template: '<div />' },
      },
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
        path: '/clients/:clientId/chat',
        name: 'panneau-chat',
        component: { template: '<div />' },
      },
      {
        path: '/clients/:clientId/drive',
        name: 'configuration-drive',
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

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

describe('BarreLaterale — groupes de navigation', () => {
  test('affiche les groupes Accueil, Mon travail, Clients & configuration', async () => {
    const router = routeurDeTest()
    await router.push('/')
    const wrapper = mount(BarreLaterale, { global: { plugins: [router] } })

    expect(wrapper.text()).toContain('Que voulez-vous faire ?')
    expect(wrapper.text()).toContain('Mes projets')
    expect(wrapper.text()).toContain('Bibliothèque de normes')
    expect(wrapper.text()).toContain('Clients')
    expect(wrapper.text()).toContain('Configuration GitHub')
  })

  test("aucun client mémorisé : invite à en choisir un plutôt qu'un lien cassé", async () => {
    const router = routeurDeTest()
    await router.push('/')
    const wrapper = mount(BarreLaterale, { global: { plugins: [router] } })

    expect(wrapper.text()).toContain('Choisissez un client pour accéder à ses outils')
    expect(wrapper.text()).not.toContain('Structure Système')
  })

  test('un client mémorisé : accès direct à ses outils', async () => {
    useClientActifStore().definirClientActif('client-1')
    const router = routeurDeTest()
    await router.push('/')
    const wrapper = mount(BarreLaterale, { global: { plugins: [router] } })

    expect(wrapper.text()).toContain('Structure Système')
    expect(wrapper.text()).toContain('Stratégie de qualification')
    expect(wrapper.text()).toContain('Assistant IA')

    const lienStructure = wrapper.findAll('a').find((a) => a.text() === 'Structure Système')
    expect(lienStructure?.attributes('href')).toContain('client-1')
  })
})

describe('BarreLaterale — bascule Mode Expert / Assistant', () => {
  test('affiche les deux modes, expert actif par défaut', async () => {
    const router = routeurDeTest()
    await router.push('/')
    const wrapper = mount(BarreLaterale, { global: { plugins: [router] } })

    const boutons = wrapper.findAll('button')
    const boutonExpert = boutons.find((b) => b.text() === 'Mode Expert')
    expect(boutonExpert?.classes()).toContain('actif')
  })

  test('cliquer sur Mode Assistant bascule la préférence', async () => {
    const router = routeurDeTest()
    await router.push('/')
    const wrapper = mount(BarreLaterale, { global: { plugins: [router] } })

    const boutonAssistant = wrapper.findAll('button').find((b) => b.text() === 'Mode Assistant')
    await boutonAssistant?.trigger('click')

    expect(boutonAssistant?.classes()).toContain('actif')
    expect(localStorage.getItem('validapharm.mode_affichage')).toBe('assistant')
  })
})
