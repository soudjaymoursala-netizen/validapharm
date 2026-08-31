import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { db } from '../../persistance/db'
import ProfilLocal from './ProfilLocal.vue'

function routeurDeTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/clients', name: 'gestion-clients', component: { template: '<div />' } },
      { path: '/profil-local', name: 'profil-local', component: { template: '<div />' } },
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
  await db.profilLocal.clear()
})

describe('ProfilLocal', () => {
  test("aucun profil : le formulaire de création s'ouvre automatiquement", async () => {
    const wrapper = mount(ProfilLocal, { global: { plugins: [routeurDeTest()] } })
    await flushPromises()

    expect(wrapper.find('.formulaire').exists()).toBe(true)
    expect(wrapper.find('.bloc-profil').exists()).toBe(false)
  })

  test('crée le profil puis le modifie en re-saisissant le mot de passe actuel', async () => {
    const wrapper = mount(ProfilLocal, { global: { plugins: [routeurDeTest()] } })
    await flushPromises()

    const formulaire = wrapper.find('.formulaire')
    await formulaire.find('input[type="email"]').setValue('q.lead@pharmatech.example')
    await formulaire.find('input[type="text"]').setValue('QLD')
    const motsDePasse = formulaire.findAll('input[type="password"]')
    await motsDePasse[0]?.setValue('CoffreFort!2026')
    await motsDePasse[1]?.setValue('CoffreFort!2026')
    await formulaire.trigger('submit.prevent')
    await attendreQue(async () => (await db.profilLocal.get('unique')) !== undefined)

    const profil = await db.profilLocal.get('unique')
    expect(profil?.email).toBe('q.lead@pharmatech.example')
    expect(profil?.visa).toBe('QLD')

    // Le profil existe désormais — vue lecture, pas le formulaire
    await attendreQue(() => wrapper.find('.bloc-profil').exists())
    expect(wrapper.find('.bloc-profil').text()).toContain('q.lead@pharmatech.example')

    // Modification : nécessite le mot de passe actuel correct
    await wrapper.find('.bloc-profil button').trigger('click')
    await flushPromises()
    const formulaireEdition = wrapper.find('.formulaire')
    const champsTexte = formulaireEdition.findAll('input[type="text"]')
    await champsTexte[0]?.setValue('QL2')
    const champsMdp = formulaireEdition.findAll('input[type="password"]')
    await champsMdp[0]?.setValue('mauvais-mot-de-passe')
    await champsMdp[1]?.setValue('NouveauMdp!99')
    await champsMdp[2]?.setValue('NouveauMdp!99')
    await formulaireEdition.trigger('submit.prevent')
    await attendreQue(() => wrapper.find('.bandeau-erreur').exists())

    expect(wrapper.find('.bandeau-erreur').text()).toContain('Mot de passe actuel incorrect')
    expect((await db.profilLocal.get('unique'))?.visa).toBe('QLD')
  })
})
