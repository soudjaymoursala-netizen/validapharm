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
import { useAuthStore } from '../stores/useAuthStore'
import Profil from './Profil.vue'

function routeurDeTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'accueil', component: { template: '<div />' } },
      { path: '/profil', name: 'profil', component: Profil },
    ],
  })
}

/**
 * Même patron que `Login.test.ts` : `trigger('submit.prevent')` n'attend
 * que le prochain `nextTick`, jamais la résolution de la promesse du
 * gestionnaire `@submit.prevent` lui-même (Vue ne relie pas les deux) — un
 * simple `flushPromises()` court parfois trop tôt face à un appel réseau
 * réel (signature JWT/PBKDF2 dans le faux Worker), d'où ce sondage.
 */
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
})

afterEach(() => {
  demonter()
})

describe('Profil — identité du compte réel', () => {
  test('affiche prénom, nom, email et rôle du compte connecté', async () => {
    await connecterAdminDeTest('admin@pharmatech.example', 'CoffreFort!2026')
    const router = routeurDeTest()
    await router.push('/profil')
    const wrapper = mount(Profil, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.text()).toContain('Quentin')
    expect(wrapper.text()).toContain('Lead')
    expect(wrapper.text()).toContain('admin@pharmatech.example')
    expect(wrapper.text()).toContain('Administrateur')
  })

  test('modifier nom/prénom appelle authStore.modifierProfil et met à jour l’affichage', async () => {
    await connecterAdminDeTest('admin@pharmatech.example', 'CoffreFort!2026')
    const router = routeurDeTest()
    await router.push('/profil')
    const wrapper = mount(Profil, { global: { plugins: [router] } })
    await flushPromises()

    await wrapper.find('button').trigger('click')
    await wrapper.find('input[type="text"]').setValue('Nouveau prénom')
    await wrapper.find('form').trigger('submit.prevent')
    // Sonder le texte rendu, jamais l'état du store seul : `utilisateur.value`
    // est déjà mis à jour par `modifierProfil` avant que sa propre promesse
    // ne se résolve (elle attend encore l'écriture IndexedDB de la session
    // juste après) — sonder le store se termine alors avant que ce
    // composant n'ait fini sa propre continuation (`modeEditionIdentite =
    // false`), un DOM non encore repassé en lecture.
    await attendreQue(() => wrapper.text().includes('✓ Enregistré.'))

    expect(wrapper.text()).toContain('Nouveau prénom')
    expect(useAuthStore().utilisateur?.prenom).toBe('Nouveau prénom')
  })
})

describe('Profil — changement de mot de passe', () => {
  test('mot de passe actuel incorrect affiche une erreur claire', async () => {
    await connecterAdminDeTest('admin@pharmatech.example', 'CoffreFort!2026')
    const router = routeurDeTest()
    await router.push('/profil')
    const wrapper = mount(Profil, { global: { plugins: [router] } })
    await flushPromises()

    const champs = wrapper.findAll('input[type="password"]')
    await champs[0]?.setValue('mauvais-mot-de-passe')
    await champs[1]?.setValue('NouveauMotDePasse!2026')
    await champs[2]?.setValue('NouveauMotDePasse!2026')
    await wrapper.find('form').trigger('submit.prevent')
    await attendreQue(() => /incorrect|invalide/i.test(wrapper.text()))

    expect(wrapper.text()).toMatch(/incorrect|invalide/i)
  })

  test('nouveau mot de passe et confirmation différents : erreur locale, aucun appel réseau', async () => {
    await connecterAdminDeTest('admin@pharmatech.example', 'CoffreFort!2026')
    const router = routeurDeTest()
    await router.push('/profil')
    const wrapper = mount(Profil, { global: { plugins: [router] } })
    await flushPromises()

    const champs = wrapper.findAll('input[type="password"]')
    await champs[0]?.setValue('CoffreFort!2026')
    await champs[1]?.setValue('NouveauMotDePasse!2026')
    await champs[2]?.setValue('AutreConfirmation!2026')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    // Erreur purement locale (avant tout appel réseau) — aucune course possible ici,
    // contrairement aux autres tests de ce bloc.
    expect(wrapper.text()).toContain('La confirmation ne correspond pas')
  })

  test('changement réussi : confirmation affichée, reconnexion possible avec le nouveau mot de passe', async () => {
    await connecterAdminDeTest('admin@pharmatech.example', 'CoffreFort!2026')
    const router = routeurDeTest()
    await router.push('/profil')
    const wrapper = mount(Profil, { global: { plugins: [router] } })
    await flushPromises()

    const champs = wrapper.findAll('input[type="password"]')
    await champs[0]?.setValue('CoffreFort!2026')
    await champs[1]?.setValue('NouveauMotDePasse!2026')
    await champs[2]?.setValue('NouveauMotDePasse!2026')
    await wrapper.find('form').trigger('submit.prevent')
    await attendreQue(() => wrapper.text().includes('Mot de passe changé'))

    expect(wrapper.text()).toContain('Mot de passe changé')

    await useAuthStore().deconnecter()
    const resultat = await useAuthStore().login(
      'admin@pharmatech.example',
      'NouveauMotDePasse!2026',
    )
    expect(resultat.ok).toBe(true)
  })
})
