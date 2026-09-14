import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { db } from '../../persistance/db'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import { useProjectsStore } from '../stores/useProjectsStore'
import FicheProjet from './FicheProjet.vue'

function routeurDeTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/tableau-de-bord', name: 'tableau-de-bord', component: { template: '<div />' } },
      {
        path: '/projets/:projectId',
        name: 'fiche-projet',
        component: FicheProjet,
        props: true,
      },
      {
        path: '/projets/:projectId/sections/:sectionId',
        name: 'editeur-section',
        component: { template: '<div />' },
      },
      {
        path: '/projets/:projectId/assistant-creation-livrable',
        name: 'assistant-creation-livrable',
        component: { template: '<div />' },
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
  await db.projectDocuments.clear()
  await reinitialiserAuthDeTest()
  demonter = installerFauxWorkerAuth().demonter
  await connecterAdminDeTest()
})

afterEach(() => {
  demonter()
})

describe('FicheProjet — mutations de statut/partage non vérifiées', () => {
  test('un échec de suspension (déjà suspendu) affiche un message, ne casse pas silencieusement', async () => {
    const projetsStore = useProjectsStore()
    const projet = await projetsStore.creerProjet({
      name: 'Projet Test',
      context: '',
      scope_in: '',
      scope_out: '',
      deadline: null,
      language_default: 'fr',
      client_id: null,
    })

    const router = routeurDeTest()
    await router.push({ name: 'fiche-projet', params: { projectId: projet.id } })
    const wrapper = mount(FicheProjet, {
      props: { projectId: projet.id },
      global: { plugins: [router] },
    })
    await attendreQue(() => wrapper.text().includes('Projet Test'))

    // Reproduit une réponse métier réelle (double clic, ou statut déjà
    // changé depuis un autre poste) — avant ce correctif, aucun résultat
    // n'était jamais vérifié : le bouton "Suspendre" échouait en silence
    // total, sans le moindre message.
    projetsStore.suspendreProjet = vi.fn().mockResolvedValue({ erreur: 'deja_suspendu' })

    const boutonSuspendre = wrapper.findAll('button').find((b) => b.text() === 'Suspendre')
    await boutonSuspendre?.trigger('click')
    await attendreQue(() => wrapper.find('.bandeau-erreur').exists())

    expect(wrapper.find('.bandeau-erreur').text()).toContain('déjà suspendu')
    // Le statut affiché n'a pas basculé sur "Suspendu" : l'échec n'a rien changé.
    expect(wrapper.find('.pastille-statut').exists()).toBe(false)
  })

  test("un échec de partage (projet introuvable) affiche un message, garde la saisie de l'utilisateur", async () => {
    const projetsStore = useProjectsStore()
    const projet = await projetsStore.creerProjet({
      name: 'Projet Test',
      context: '',
      scope_in: '',
      scope_out: '',
      deadline: null,
      language_default: 'fr',
      client_id: null,
    })

    const router = routeurDeTest()
    await router.push({ name: 'fiche-projet', params: { projectId: projet.id } })
    const wrapper = mount(FicheProjet, {
      props: { projectId: projet.id },
      global: { plugins: [router] },
    })
    await attendreQue(() => wrapper.text().includes('Projet Test'))

    projetsStore.partagerProjet = vi.fn().mockResolvedValue({ erreur: 'introuvable' })

    await wrapper.find('.formulaire-partage input[type="email"]').setValue('collegue@exemple.com')
    await wrapper.find('.formulaire-partage').trigger('submit.prevent')
    await attendreQue(() => wrapper.find('.bandeau-erreur').exists())

    expect(wrapper.find('.bandeau-erreur').text()).toContain('introuvable')
    expect(
      wrapper.find<HTMLInputElement>('.formulaire-partage input[type="email"]').element.value,
    ).toBe('collegue@exemple.com')
  })
})
