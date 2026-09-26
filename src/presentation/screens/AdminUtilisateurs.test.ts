import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import { useAuthStore } from '../stores/useAuthStore'
import AdminUtilisateurs from './AdminUtilisateurs.vue'

async function attendreQue(condition: () => Promise<boolean> | boolean): Promise<void> {
  // Attente bornée dans le temps (3 s), jamais en nombre de tours : sous la
  // charge de la suite complète en CI, quelques centaines de ms ne suffisaient pas.
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
    // Plus de mot de passe saisi par l'admin : lien d'activation (26/09/2026).
    expect(wrapper.find('input[type="password"]').exists()).toBe(false)
    const champsTexte = wrapper.findAll('input[type="text"]')
    await champsTexte[0]?.setValue('Alice')
    await champsTexte[1]?.setValue('Dupont')
    await wrapper.find('form').trigger('submit.prevent')

    // L'adresse apparaît d'abord dans le panneau du lien d'activation : on
    // attend la ligne du compte dans la liste rechargée.
    await attendreQue(() => {
      const liste = wrapper.find('.liste-comptes')
      return liste.exists() && liste.text().includes('Alice Dupont')
    })
    const lien = wrapper.find('.lien-emis input').element as HTMLInputElement
    expect(lien.value).toContain('/definir-mot-de-passe?')
    expect(lien.value).toContain('type=activation')
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

    await ligneEmployeOuEchec()
      .findAll('.actions-compte button')
      .find((b) => b.text() === 'Promouvoir admin')
      ?.trigger('click')
    await attendreQue(() => ligneEmploye()?.find('.badge--admin').exists() ?? false)
    expect(ligneEmployeOuEchec().text()).toContain('Administrateur')

    // Désactivation confirmée (fenêtre de confirmation).
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const boutonDesactiver = ligneEmployeOuEchec()
      .findAll('.actions-compte button')
      .find((b) => b.text() === 'Désactiver')
    await boutonDesactiver?.trigger('click')
    await attendreQue(() => ligneEmploye()?.find('.badge--desactive').exists() ?? false)
    expect(ligneEmployeOuEchec().text()).toContain('Désactivé')
  })

  test('le dernier admin actif ne peut pas se rétrograder : refus expliqué, rôle inchangé', async () => {
    const wrapper = mount(AdminUtilisateurs, { global: { stubs: { RouterLink: true } } })
    await attendreQue(() => wrapper.text().includes('admin@pharmatech.example'))

    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const rétrograder = wrapper.findAll('button').find((b) => b.text() === 'Rétrograder')
    await rétrograder?.trigger('click')
    await attendreQue(() => wrapper.find('.bandeau-erreur').exists())

    expect(wrapper.find('.bandeau-erreur').text()).toContain('dernier administrateur actif')
    expect(wrapper.find('.badge--admin').exists()).toBe(true)
  })
})
