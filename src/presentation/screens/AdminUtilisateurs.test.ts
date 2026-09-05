import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import { useAuthStore } from '../stores/useAuthStore'
import AdminUtilisateurs from './AdminUtilisateurs.vue'

async function attendreQue(condition: () => Promise<boolean> | boolean): Promise<void> {
  for (let tentative = 0; tentative < 50; tentative++) {
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

describe('AdminUtilisateurs — gestion des comptes', () => {
  test('liste le compte admin déjà connecté', async () => {
    const wrapper = mount(AdminUtilisateurs, { global: { stubs: { RouterLink: true } } })
    await attendreQue(() => wrapper.text().includes('admin@pharmatech.example'))
    expect(wrapper.find('.badge--admin').exists()).toBe(true)
  })

  test('créer un nouveau compte utilisateur, le lister ensuite', async () => {
    const wrapper = mount(AdminUtilisateurs, { global: { stubs: { RouterLink: true } } })
    await attendreQue(() => wrapper.text().includes('admin@pharmatech.example'))

    await wrapper.find('header button').trigger('click')
    await wrapper.find('input[type="email"]').setValue('employe@pharmatech.example')
    await wrapper.find('input[type="password"]').setValue('MotDePasse!1')
    const champsTexte = wrapper.findAll('input[type="text"]')
    await champsTexte[0]?.setValue('Alice')
    await champsTexte[1]?.setValue('Dupont')
    await wrapper.find('form').trigger('submit.prevent')

    await attendreQue(() => wrapper.text().includes('employe@pharmatech.example'))
    expect(wrapper.text()).toContain('Alice Dupont')
  })

  test('promouvoir un utilisateur admin, puis le désactiver', async () => {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) throw new Error('préparation de test échouée')
    await api.creerUtilisateur(authStore.jeton, {
      email: 'employe@pharmatech.example',
      motDePasse: 'MotDePasse!1',
      nom: 'Dupont',
      prenom: 'Alice',
      role: 'utilisateur',
    })

    const wrapper = mount(AdminUtilisateurs, { global: { stubs: { RouterLink: true } } })
    await attendreQue(() => wrapper.text().includes('employe@pharmatech.example'))

    // Pendant le rechargement déclenché par `basculerRole`/`basculerStatut`,
    // `enChargement` masque temporairement la liste (`v-else`, "Chargement…")
    // — cette fonction doit donc renvoyer `undefined` plutôt que jeter tant
    // que la ligne n'est pas revenue, sinon `attendreQue` rejetterait
    // immédiatement sur ce court intervalle au lieu de réessayer.
    function ligneEmploye() {
      return wrapper.findAll('li').find((li) => li.text().includes('employe@pharmatech.example'))
    }
    function ligneEmployeOuEchec() {
      const ligne = ligneEmploye()
      if (!ligne) throw new Error('ligne introuvable')
      return ligne
    }

    await ligneEmployeOuEchec().find('.actions-compte button').trigger('click')
    await attendreQue(() => ligneEmploye()?.find('.badge--admin').exists() ?? false)
    expect(ligneEmployeOuEchec().text()).toContain('admin')

    const boutonDesactiver = ligneEmployeOuEchec().findAll('.actions-compte button')[1]
    await boutonDesactiver?.trigger('click')
    await attendreQue(() => ligneEmploye()?.find('.badge--desactive').exists() ?? false)
    expect(ligneEmployeOuEchec().text()).toContain('desactive')
  })
})
