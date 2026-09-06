import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { db } from '../../persistance/db'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import { useClientActifStore } from '../stores/useClientActifStore'
import { useClientsStore } from '../stores/useClientsStore'
import { useProcedureStore } from '../stores/useProcedureStore'
import { useProjectsStore } from '../stores/useProjectsStore'
import { useSectionsStore } from '../stores/useSectionsStore'
import RechercheGlobale from './RechercheGlobale.vue'

function routeurDeTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/recherche', name: 'recherche-globale', component: RechercheGlobale },
      { path: '/clients/:clientId', name: 'fiche-client', component: { template: '<div />' } },
      {
        path: '/projets/:projectId/sections/:sectionId',
        name: 'editeur-section',
        component: { template: '<div />' },
      },
      {
        path: '/clients/:clientId/procedures',
        name: 'revue-structure-procedure',
        component: { template: '<div />' },
      },
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

let demonter: () => void

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.projects.clear()
  await db.sections.clear()
  await db.procedures.clear()
  await reinitialiserAuthDeTest()
  demonter = installerFauxWorkerAuth().demonter
  await connecterAdminDeTest()
  useClientActifStore().reinitialiser()
})

afterEach(() => {
  demonter()
})

describe('RechercheGlobale — recherche transverse (tâche #116)', () => {
  test('trouve un client par nom sans site actif', async () => {
    const clientsStore = useClientsStore()
    const client = await clientsStore.creerClient({ name: 'PharmaTech Compression' })
    if ('erreur' in client) throw client

    const router = routeurDeTest()
    await router.push({ name: 'recherche-globale', query: { q: 'compression' } })
    const wrapper = mount(RechercheGlobale, { global: { plugins: [router] } })

    await attendreQue(() => wrapper.text().includes('PharmaTech Compression'))
    expect(wrapper.text()).toContain('Clients')
    expect(wrapper.text()).toContain('Aucun site actif')
  })

  test('avec un site actif, trouve aussi les sections/procédures de ce site', async () => {
    const clientsStore = useClientsStore()
    const client = await clientsStore.creerClient({ name: 'PharmaTech Presse' })
    if ('erreur' in client) throw client
    useClientActifStore().definirClientActif(client.id)

    const projetsStore = useProjectsStore()
    const sectionsStore = useSectionsStore()
    const projet = await projetsStore.creerProjet({
      name: 'Qualification presse P-200',
      context: '',
      scope_in: '',
      scope_out: '',
      deadline: null,
      language_default: 'fr',
      client_id: client.id,
    })
    await sectionsStore.creerSection({
      project_id: projet.id,
      template_type: 'oq',
      language: 'fr',
      titre: 'OQ presse P-200',
      owner_id: 'admin@pharmatech.example',
    })

    const procedureStore = useProcedureStore()
    await procedureStore.creerProcedure(client.id, {
      reference: 'PQ-COMPRESSION',
      titre: 'Protocole de qualification presse',
      effectiveDate: '2026-01-01',
      categorie: 'cqv',
    })

    const router = routeurDeTest()
    await router.push({ name: 'recherche-globale', query: { q: 'presse' } })
    const wrapper = mount(RechercheGlobale, { global: { plugins: [router] } })

    await attendreQue(() => wrapper.text().includes('OQ presse P-200'))
    expect(wrapper.text()).toContain('Sections')
    expect(wrapper.text()).toContain('Procédures')
    expect(wrapper.text()).toContain('PQ-COMPRESSION')

    const lienSection = wrapper.findAll('a').find((a) => a.text().includes('OQ presse P-200'))
    expect(lienSection?.attributes('href')).toContain(projet.id)
  })

  test('aucun résultat affiche un état vide explicite', async () => {
    const router = routeurDeTest()
    await router.push({ name: 'recherche-globale', query: { q: 'introuvable-xyz' } })
    const wrapper = mount(RechercheGlobale, { global: { plugins: [router] } })

    await attendreQue(() => wrapper.text().includes('Aucun résultat'))
    expect(wrapper.text()).toContain('introuvable-xyz')
  })
})
