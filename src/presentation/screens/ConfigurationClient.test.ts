import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import { useConnexionGitHubStore } from '../stores/useConnexionGitHubStore'
import { useConnexionRelaisIAStore } from '../stores/useConnexionRelaisIAStore'
import ConfigurationClient from './ConfigurationClient.vue'

function routeurDeTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/tableau-de-bord', name: 'tableau-de-bord', component: { template: '<div />' } },
      {
        path: '/configuration',
        name: 'configuration-client',
        component: ConfigurationClient,
      },
    ],
  })
}

async function attendreQue(condition: () => boolean): Promise<void> {
  for (let tentative = 0; tentative < 50; tentative++) {
    await flushPromises()
    if (condition()) return
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

describe('ConfigurationClient — échecs de connectivité non silencieux', () => {
  test("un Worker injoignable pendant l'enregistrement du dépôt GitHub affiche un message", async () => {
    const router = routeurDeTest()
    await router.push('/configuration')
    const wrapper = mount(ConfigurationClient, { global: { plugins: [router] } })
    await flushPromises()

    await wrapper.find('.bloc-github input[type="text"]').setValue('acme-corp')
    await wrapper.findAll('.bloc-github input[type="text"]')[1]?.setValue('depot-test')
    await wrapper.find('.bloc-github input[type="password"]').setValue('ghp_test123')

    // Simule une panne réseau réelle juste au moment de l'enregistrement —
    // avant ce correctif, `enregistrer()` n'avait aucun `catch` : cette
    // exception (`IndisponibleAuthError`, levée par `AuthApiClient` plutôt
    // que renvoyée) remontait de manière non gérée, sans le moindre message.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await wrapper.find('.bloc-github form').trigger('submit.prevent')
    await attendreQue(() => wrapper.find('.bloc-github .erreur-enregistrement').exists())

    expect(wrapper.find('.bloc-github .erreur-enregistrement').text()).toContain('injoignable')
  })

  test("un Worker injoignable pendant l'effacement du dépôt GitHub affiche un message, ne bloque pas le formulaire en silence", async () => {
    const router = routeurDeTest()
    await router.push('/configuration')
    const wrapper = mount(ConfigurationClient, { global: { plugins: [router] } })
    await flushPromises()

    await wrapper.find('.bloc-github input[type="text"]').setValue('acme-corp')
    await wrapper.findAll('.bloc-github input[type="text"]')[1]?.setValue('depot-test')
    await wrapper.find('.bloc-github input[type="password"]').setValue('ghp_test123')
    await wrapper.find('.bloc-github form').trigger('submit.prevent')
    await attendreQue(() => wrapper.find('.bloc-github .confirmation-enregistrement').exists())

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const boutonEffacer = wrapper.findAll('.bloc-github button').find((b) => b.text() === 'Effacer')
    await boutonEffacer?.trigger('click')
    await attendreQue(() => wrapper.find('.bloc-github .erreur-enregistrement').exists())

    expect(wrapper.find('.bloc-github .erreur-enregistrement').text()).toContain('injoignable')
    // Le brouillon n'a pas été réinitialisé (l'échec a interrompu `effacer()`
    // avant ces lignes) — la saisie précédente reste visible plutôt que de
    // disparaître silencieusement comme si l'effacement avait réussi.
    expect(wrapper.find<HTMLInputElement>('.bloc-github input[type="text"]').element.value).toBe(
      'acme-corp',
    )
  })

  test('un échec au chargement de la section GitHub ne bloque pas le chargement de la section Relais IA', async () => {
    // Config Relais IA déjà enregistrée avant l'arrivée sur l'écran —
    // reproduit un compte réel qui a déjà configuré les deux sections.
    await useConnexionRelaisIAStore().enregistrer({
      relayUrl: 'https://relais.exemple.workers.dev',
      jeton: 'jeton-relais-test',
    })
    // Avant le correctif de useConnexionGitHubStore.charger(), une
    // exception ici (non rattrapée) interrompait le `onMounted` de
    // ConfigurationClient.vue avant même d'atteindre `relaisStore.charger()`
    // — la section Relais IA restait vide alors que la config existe bel et
    // bien côté serveur.
    useConnexionGitHubStore().charger = vi
      .fn()
      .mockRejectedValue(new Error("Worker d'authentification injoignable."))

    const router = routeurDeTest()
    await router.push('/configuration')
    const wrapper = mount(ConfigurationClient, { global: { plugins: [router] } })
    await attendreQue(
      () =>
        wrapper.find<HTMLInputElement>('.bloc-relais-ia input[type="url"]').element.value !== '',
    )

    expect(wrapper.find<HTMLInputElement>('.bloc-relais-ia input[type="url"]').element.value).toBe(
      'https://relais.exemple.workers.dev',
    )
  })
})
