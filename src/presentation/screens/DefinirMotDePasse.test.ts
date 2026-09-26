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
import DefinirMotDePasse from './DefinirMotDePasse.vue'

async function attendreQue(condition: () => Promise<boolean> | boolean): Promise<void> {
  const echeanceAttente = Date.now() + 3000
  for (let tentative = 0; Date.now() < echeanceAttente; tentative++) {
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

async function lienActivation(): Promise<string> {
  const authStore = useAuthStore()
  const api = await authStore.client()
  if (!api || !authStore.jeton) throw new Error('préparation de test échouée')
  const creation = await api.creerUtilisateur(authStore.jeton, {
    email: 'nouveau@pharmatech.example',
    nom: 'Martin',
    prenom: 'Claire',
    role: 'utilisateur',
  })
  if (!creation.ok) throw new Error(`création refusée : ${creation.erreur}`)
  return creation.donnees.lienActivation
}

async function monter(lien: string) {
  const url = new URL(lien)
  const routeur = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/definir-mot-de-passe', name: 'definir', component: DefinirMotDePasse },
      { path: '/connexion', name: 'connexion', component: { template: '<div />' } },
    ],
  })
  await routeur.push(`/definir-mot-de-passe${url.search}`)
  return mount(DefinirMotDePasse, { global: { plugins: [routeur] } })
}

describe('DefinirMotDePasse — activation par lien (décision du 26/09/2026)', () => {
  test('choisir son mot de passe active le compte ; le lien ne sert qu’une fois', async () => {
    const lien = await lienActivation()
    expect(new URL(lien).searchParams.get('serveur')).toBe(RELAY_URL_TEST)
    const wrapper = await monter(lien)
    expect(wrapper.find('h1').text()).toBe('Activer mon compte')

    const champs = wrapper.findAll('input[type="password"]')
    await champs[0]?.setValue('MonChoix!2026')
    await champs[1]?.setValue('MonChoix!2026')
    await wrapper.find('form').trigger('submit.prevent')
    await attendreQue(() => wrapper.text().includes('Mot de passe enregistré'))
    expect(wrapper.text()).toContain('nouveau@pharmatech.example')

    const connexion = await useAuthStore().login('nouveau@pharmatech.example', 'MonChoix!2026')
    expect(connexion).toEqual({ ok: true })

    const deuxieme = await monter(lien)
    const champs2 = deuxieme.findAll('input[type="password"]')
    await champs2[0]?.setValue('Autre!Choix26')
    await champs2[1]?.setValue('Autre!Choix26')
    await deuxieme.find('form').trigger('submit.prevent')
    await attendreQue(() => deuxieme.find('.erreur').exists())
    expect(deuxieme.find('.erreur').text()).toContain('n’est plus valable')
  })

  test('les deux saisies doivent correspondre', async () => {
    const wrapper = await monter(await lienActivation())
    const champs = wrapper.findAll('input[type="password"]')
    await champs[0]?.setValue('MonChoix!2026')
    await champs[1]?.setValue('Different!2026')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(wrapper.find('.erreur').text()).toContain('ne correspondent pas')
  })
})
