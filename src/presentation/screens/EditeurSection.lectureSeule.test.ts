import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  RELAY_URL_TEST,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import { useAuthStore } from '../stores/useAuthStore'
import { useClientsStore } from '../stores/useClientsStore'
import { useProjectsStore } from '../stores/useProjectsStore'
import { useSectionsStore } from '../stores/useSectionsStore'
import EditeurSection from './EditeurSection.vue'

/**
 * Protection réelle des projets/sections (décision utilisateur du
 * 25/09/2026) : un utilisateur qui a accès au client du projet peut LIRE
 * la section, mais ni la modifier ni l'exporter — l'écran le dit et
 * désactive ses contrôles, et le store ne fait plus passer un refus du
 * Worker (403) pour une sauvegarde réussie.
 */

function routeurDeTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/projets/:projectId', name: 'fiche-projet', component: { template: '<div />' } },
      {
        path: '/projets/:projectId/sections/:sectionId',
        name: 'editeur-section',
        component: EditeurSection,
        props: true,
      },
      {
        path: '/clients/:clientId/structure-systeme/:noeudId/dossier-vivant',
        name: 'dossier-vivant-actif',
        component: { template: '<div />' },
      },
    ],
  })
}

async function attendreQue(condition: () => boolean): Promise<void> {
  // Attente bornée dans le temps (3 s), jamais en nombre de tours : sous la
  // charge de la suite complète en CI, quelques centaines de ms ne suffisaient pas.
  const echeanceAttente = Date.now() + 3000
  for (let tentative = 0; Date.now() < echeanceAttente; tentative++) {
    await flushPromises()
    if (condition()) return
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  throw new Error('attendreQue : condition jamais satisfaite')
}

async function appelJson(
  methode: string,
  chemin: string,
  jeton: string | null,
  corps?: unknown,
): Promise<Record<string, unknown>> {
  const reponse = await fetch(`${RELAY_URL_TEST}${chemin}`, {
    method: methode,
    headers: {
      'Content-Type': 'application/json',
      ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}),
    },
    body: corps === undefined ? undefined : JSON.stringify(corps),
  })
  return (await reponse.json()) as Record<string, unknown>
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

describe('EditeurSection — lecture seule pour un lecteur du client', () => {
  test('bandeau, contrôles désactivés, et écriture refusée signalée (jamais un faux succès)', async () => {
    const { jeton: jetonAdmin } = await connecterAdminDeTest()
    const client = await useClientsStore().creerClient({ name: 'PharmaTech' })
    if ('erreur' in client) throw client
    const projet = await useProjectsStore().creerProjet({
      name: 'Qualification presse',
      context: '',
      scope_in: '',
      scope_out: '',
      deadline: null,
      language_default: 'fr',
      client_id: client.id,
    })
    const section = await useSectionsStore().creerSection({
      project_id: projet.id,
      template_type: 'oq',
      language: 'fr',
      titre: 'OQ presse',
      owner_id: 'admin@pharmatech.example',
    })

    // Lecteur : accès au client (partagé), aucun droit sur le projet.
    const email = 'lecteur@pharmatech.example'
    const motDePasse = 'MotDePasse!1'
    await appelJson('POST', '/admin/utilisateurs', jetonAdmin, {
      email,
      motDePasse,
      nom: 'L',
      prenom: 'L',
      role: 'utilisateur',
    })
    const login = await appelJson('POST', '/auth/login', null, { email, motDePasse })
    const me = await appelJson('GET', '/auth/me', login.jeton as string)
    const idLecteur = (me.utilisateur as { id: string }).id
    await appelJson('PATCH', `/clients/${client.id}`, jetonAdmin, { sharedWith: [idLecteur] })

    await useAuthStore().deconnecter()
    setActivePinia(createPinia())
    const connexion = await useAuthStore().login(email, motDePasse)
    expect(connexion.ok).toBe(true)

    const router = routeurDeTest()
    await router.push({
      name: 'editeur-section',
      params: { projectId: projet.id, sectionId: section.id },
    })
    const wrapper = mount(EditeurSection, {
      props: { projectId: projet.id, sectionId: section.id },
      global: { plugins: [router] },
    })
    await attendreQue(() => wrapper.find('.bandeau-lecture-seule').exists())

    expect(wrapper.text()).toContain('OQ presse')
    expect(wrapper.find('fieldset.zone-edition').attributes('disabled')).toBeDefined()

    await expect(
      useSectionsStore().mettreAJourValeurs(section.id, { contenu: 'tentative' }),
    ).rejects.toThrow('Modification refusée')

    for (let tour = 0; tour < 5; tour++) {
      await flushPromises()
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
  })
})
