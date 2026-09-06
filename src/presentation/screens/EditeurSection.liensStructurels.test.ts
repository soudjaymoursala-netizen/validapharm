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
import { useClientsStore } from '../stores/useClientsStore'
import { useProcedureStore } from '../stores/useProcedureStore'
import { useProjectsStore } from '../stores/useProjectsStore'
import { useSectionsStore } from '../stores/useSectionsStore'
import { useStructureSystemeStore } from '../stores/useStructureSystemeStore'
import EditeurSection from './EditeurSection.vue'

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
  await db.projects.clear()
  await db.sections.clear()
  await db.procedures.clear()
  await db.assetNodes.clear()
  await reinitialiserAuthDeTest()
  demonter = installerFauxWorkerAuth().demonter
  await connecterAdminDeTest()
})

afterEach(() => {
  demonter()
})

describe('EditeurSection — liens structurels réels (tâche #118)', () => {
  test('affiche la procédure et le nœud déjà liés à la création par l’assistant', async () => {
    const clientsStore = useClientsStore()
    const client = await clientsStore.creerClient({ name: 'PharmaTech Compression' })
    if ('erreur' in client) throw client

    const projetsStore = useProjectsStore()
    const projet = await projetsStore.creerProjet({
      name: 'Qualification presse P-200',
      context: '',
      scope_in: '',
      scope_out: '',
      deadline: null,
      language_default: 'fr',
      client_id: client.id,
    })

    const procedureStore = useProcedureStore()
    const procedure = await procedureStore.creerProcedure(client.id, {
      reference: 'PQ-COMPRESSION',
      titre: 'Protocole de qualification presse',
      effectiveDate: '2026-01-01',
      categorie: 'cqv',
    })

    const structureStore = useStructureSystemeStore()
    await structureStore.creerNoeud(client.id, {
      level_key: 'equipement',
      name: 'Presse P-200',
      code: 'P-200',
      parent_id: null,
    })
    const noeud = (await db.assetNodes.toArray())[0]

    const sectionsStore = useSectionsStore()
    const section = await sectionsStore.creerSection({
      project_id: projet.id,
      template_type: 'oq',
      language: 'fr',
      titre: 'OQ presse P-200',
      owner_id: 'admin@pharmatech.example',
      procedure_id: procedure.id,
      asset_node_id: noeud?.id,
    })

    const router = routeurDeTest()
    await router.push({
      name: 'editeur-section',
      params: { projectId: projet.id, sectionId: section.id },
    })
    const wrapper = mount(EditeurSection, {
      props: { projectId: projet.id, sectionId: section.id },
      global: { plugins: [router] },
    })
    await attendreQue(() => wrapper.text().includes('Liens structurels'))

    expect(wrapper.text()).toContain('PQ-COMPRESSION')
    expect(wrapper.text()).toContain('Presse P-200 (P-200)')
  })

  test('lie manuellement une section créée sans procédure/actif, puis délie', async () => {
    const clientsStore = useClientsStore()
    const client = await clientsStore.creerClient({ name: 'PharmaTech Compression' })
    if ('erreur' in client) throw client

    const projetsStore = useProjectsStore()
    const projet = await projetsStore.creerProjet({
      name: 'Qualification presse P-200',
      context: '',
      scope_in: '',
      scope_out: '',
      deadline: null,
      language_default: 'fr',
      client_id: client.id,
    })

    const procedureStore = useProcedureStore()
    const procedure = await procedureStore.creerProcedure(client.id, {
      reference: 'PQ-COMPRESSION',
      titre: 'Protocole de qualification presse',
      effectiveDate: '2026-01-01',
      categorie: 'cqv',
    })

    const sectionsStore = useSectionsStore()
    const section = await sectionsStore.creerSection({
      project_id: projet.id,
      template_type: 'oq',
      language: 'fr',
      titre: 'OQ presse P-200',
      owner_id: 'admin@pharmatech.example',
    })

    const router = routeurDeTest()
    await router.push({
      name: 'editeur-section',
      params: { projectId: projet.id, sectionId: section.id },
    })
    const wrapper = mount(EditeurSection, {
      props: { projectId: projet.id, sectionId: section.id },
      global: { plugins: [router] },
    })
    await attendreQue(() => wrapper.text().includes('Liens structurels'))
    expect(wrapper.text()).toContain('Lier à une procédure')

    const selects = wrapper.findAll('.liens-structurels select')
    await selects[0]?.setValue(procedure.id)
    const boutonLier = wrapper.findAll('.liens-structurels button').find((b) => b.text() === 'Lier')
    await boutonLier?.trigger('click')
    await attendreQue(() => wrapper.text().includes('Délier'))

    const sectionEnBase = await db.sections.get(section.id)
    expect(sectionEnBase?.procedure_id).toBe(procedure.id)

    const boutonDelier = wrapper
      .findAll('.liens-structurels button')
      .find((b) => b.text() === 'Délier')
    await boutonDelier?.trigger('click')
    await attendreQue(() => wrapper.text().includes('Lier à une procédure'))

    const sectionApresDelien = await db.sections.get(section.id)
    expect(sectionApresDelien?.procedure_id).toBeNull()
  })
})
