import 'fake-indexeddb/auto'
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
      {
        path: '/clients/:clientId',
        name: 'fiche-client',
        component: { template: '<div />' },
      },
      { path: '/profil-local', name: 'profil-local', component: { template: '<div />' } },
      { path: '/parametres', name: 'parametres', component: { template: '<div />' } },
      { path: '/configuration', name: 'configuration-client', component: { template: '<div />' } },
      { path: '/normes', name: 'bibliotheque-normes', component: { template: '<div />' } },
      {
        path: '/clients/:clientId/process',
        name: 'gestion-process',
        component: { template: '<div />' },
      },
      {
        path: '/clients/:clientId/templates',
        name: 'templates-formulaires',
        component: { template: '<div />' },
      },
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
      {
        path: '/clients/:clientId/tests',
        name: 'definition-tests',
        component: { template: '<div />' },
      },
      {
        path: '/clients/:clientId/executions',
        name: 'execution-tests',
        component: { template: '<div />' },
      },
      {
        path: '/clients/:clientId/parametres-critiques',
        name: 'parametres-critiques',
        component: { template: '<div />' },
      },
      {
        path: '/clients/:clientId/ingestion-documentaire',
        name: 'source-intelligence',
        component: { template: '<div />' },
      },
      {
        path: '/clients/:clientId/plans-livrable',
        name: 'content-plan',
        component: { template: '<div />' },
      },
      {
        path: '/clients/:clientId/risk-assessment',
        name: 'risk-assessment-amdec',
        component: { template: '<div />' },
      },
      {
        path: '/clients/:clientId/anomalies',
        name: 'journal-anomalies',
        component: { template: '<div />' },
      },
      {
        path: '/clients/:clientId/connecteurs-qms',
        name: 'configuration-connecteurs-qms',
        component: { template: '<div />' },
      },
      {
        path: '/clients/:clientId/ia',
        name: 'configuration-ia',
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
  test('affiche les groupes Accueil, Mon espace, Mon travail', async () => {
    const router = routeurDeTest()
    await router.push('/')
    const wrapper = mount(BarreLaterale, { global: { plugins: [router] } })

    expect(wrapper.text()).toContain('Que voulez-vous faire ?')
    expect(wrapper.text()).toContain('Profil')
    expect(wrapper.text()).toContain('Paramètres')
    expect(wrapper.text()).toContain('Guides & normes')
    expect(wrapper.text()).toContain('Mes clients')
    expect(wrapper.text()).toContain('Tous mes projets')
    expect(wrapper.text()).toContain('Configuration GitHub')
  })

  test("aucun client mémorisé : invite à en choisir un plutôt qu'un lien cassé", async () => {
    const router = routeurDeTest()
    await router.push('/')
    const wrapper = mount(BarreLaterale, { global: { plugins: [router] } })

    expect(wrapper.text()).toContain('Choisissez un client pour accéder à ses outils')
    expect(wrapper.text()).not.toContain('Architecture')
  })

  test('un client mémorisé : accès direct à ses outils, regroupés par intention', async () => {
    useClientActifStore().definirClientActif('client-1')
    const router = routeurDeTest()
    await router.push('/')
    const wrapper = mount(BarreLaterale, { global: { plugins: [router] } })

    // Groupe « Le site » — les 5 branches du parcours + Missions.
    expect(wrapper.text()).toContain('Vue d’ensemble')
    expect(wrapper.text()).toContain('Architecture')
    expect(wrapper.text()).toContain('Process')
    expect(wrapper.text()).toContain('Procédures')
    expect(wrapper.text()).toContain('Templates & Formulaires')
    expect(wrapper.text()).toContain('Projets')
    // Groupe « Qualité & ingénierie ».
    expect(wrapper.text()).toContain('Stratégie de qualification')
    // Groupe « Connaissance & IA ».
    expect(wrapper.text()).toContain('Assistant IA')
    // Groupe « Configuration du site ».
    expect(wrapper.text()).toContain('Connecteurs QMS')

    const lienArchitecture = wrapper.findAll('a').find((a) => a.text() === 'Architecture')
    expect(lienArchitecture?.attributes('href')).toContain('client-1')
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

  test('Mode Assistant restreint réellement la navigation au parcours guidé', async () => {
    useClientActifStore().definirClientActif('client-1')
    const router = routeurDeTest()
    await router.push('/')
    const wrapper = mount(BarreLaterale, { global: { plugins: [router] } })

    // Mode Expert (par défaut) : accès complet, y compris aux écrans de
    // configuration avancée.
    expect(wrapper.text()).toContain('Exigences et tests')
    expect(wrapper.text()).toContain('Connecteurs QMS')
    expect(wrapper.text()).toContain('Configuration GitHub')

    const boutonAssistant = wrapper.findAll('button').find((b) => b.text() === 'Mode Assistant')
    await boutonAssistant?.trigger('click')

    // Mode Assistant : le parcours guidé reste visible…
    expect(wrapper.text()).toContain('Missions')
    expect(wrapper.text()).toContain('Architecture')
    expect(wrapper.text()).toContain('Stratégie de qualification')
    // …mais les écrans de configuration avancée disparaissent — jamais
    // supprimés du routeur, seulement masqués tant que le Mode Expert
    // n'est pas réactivé (aucun changement de comportement caché).
    expect(wrapper.text()).not.toContain('Exigences et tests')
    expect(wrapper.text()).not.toContain('Connecteurs QMS')
    expect(wrapper.text()).not.toContain('Configuration GitHub')

    // Réversible : retour au Mode Expert restaure l'accès complet.
    const boutonExpert = wrapper.findAll('button').find((b) => b.text() === 'Mode Expert')
    await boutonExpert?.trigger('click')
    expect(wrapper.text()).toContain('Connecteurs QMS')
  })
})
