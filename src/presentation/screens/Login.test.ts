import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import {
  RELAY_URL_TEST,
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import { useAuthStore } from '../stores/useAuthStore'
import { useConnexionAuthentificationStore } from '../stores/useConnexionAuthentificationStore'
import Login from './Login.vue'

function routeurDeTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'accueil', component: { template: '<div />' } },
      { path: '/connexion', name: 'connexion', component: Login },
      { path: '/configuration', name: 'configuration-client', component: { template: '<div />' } },
      { path: '/clients', name: 'gestion-clients', component: { template: '<div />' } },
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

async function bootstrapperAdmin(email: string, motDePasse: string): Promise<void> {
  await useConnexionAuthentificationStore().enregistrer({ relayUrl: RELAY_URL_TEST })
  const reponse = await fetch(`${RELAY_URL_TEST}/auth/bootstrap-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      motDePasse,
      nom: 'Lead',
      prenom: 'Quentin',
      jetonBootstrap: 'jeton-bootstrap-test',
    }),
  })
  if (!reponse.ok)
    throw new Error(`bootstrap-admin a échoué en préparation de test (${reponse.status})`)
}

let demonter: () => void

beforeEach(async () => {
  setActivePinia(createPinia())
  await reinitialiserAuthDeTest()
  demonter = installerFauxWorkerAuth().demonter
})

afterEach(() => {
  demonter()
})

describe('Login — écran de connexion', () => {
  test('sans relais configuré, invite à le configurer plutôt que de laisser saisir en silence', async () => {
    const router = routeurDeTest()
    await router.push('/connexion')
    const wrapper = mount(Login, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.text()).toContain("Aucun Worker d'authentification configuré")
  })

  test('identifiants corrects redirige vers "/" et connecte le store', async () => {
    await bootstrapperAdmin('admin@pharmatech.example', 'CoffreFort!2026')

    const router = routeurDeTest()
    await router.push('/connexion')
    const wrapper = mount(Login, { global: { plugins: [router] } })
    await flushPromises()

    await wrapper.find('input[type="email"]').setValue('admin@pharmatech.example')
    await wrapper.find('input[type="password"]').setValue('CoffreFort!2026')
    await wrapper.find('form').trigger('submit.prevent')
    // `seConnecter` attend `authStore.login()` (qui bascule `estConnecte`)
    // PUIS seulement ensuite `router.push('/')` — attendre uniquement
    // `estConnecte` laisse une fenêtre de course où la navigation n'a pas
    // encore abouti (flaky en CI, jamais reproduit en local : ordonnancement
    // des microtâches différent). On attend donc les deux conditions
    // ensemble, jamais l'une sans l'autre.
    await attendreQue(() => useAuthStore().estConnecte && router.currentRoute.value.path === '/')
    await flushPromises()

    expect(useAuthStore().estConnecte).toBe(true)
    expect(router.currentRoute.value.path).toBe('/')
  })

  test('mauvais mot de passe affiche un message clair, ne connecte pas', async () => {
    await connecterAdminDeTest('admin@pharmatech.example', 'CoffreFort!2026')
    await useAuthStore().deconnecter()

    const router = routeurDeTest()
    await router.push('/connexion')
    const wrapper = mount(Login, { global: { plugins: [router] } })
    await flushPromises()

    await wrapper.find('input[type="email"]').setValue('admin@pharmatech.example')
    await wrapper.find('input[type="password"]').setValue('mauvais')
    await wrapper.find('form').trigger('submit.prevent')
    await attendreQue(() => wrapper.text().includes('Email ou mot de passe incorrect'))

    expect(wrapper.text()).toContain('Email ou mot de passe incorrect')
    expect(useAuthStore().estConnecte).toBe(false)
  })

  test('redirige vers la query "redirect" après connexion, si présente', async () => {
    await bootstrapperAdmin('admin@pharmatech.example', 'CoffreFort!2026')

    const router = routeurDeTest()
    await router.push('/connexion?redirect=/clients')
    const wrapper = mount(Login, { global: { plugins: [router] } })
    await flushPromises()

    await wrapper.find('input[type="email"]').setValue('admin@pharmatech.example')
    await wrapper.find('input[type="password"]').setValue('CoffreFort!2026')
    await wrapper.find('form').trigger('submit.prevent')
    await attendreQue(() => router.currentRoute.value.path === '/clients')

    expect(router.currentRoute.value.path).toBe('/clients')
  })
})
