import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { db } from '../../persistance/db'
import { useProcedureStore } from '../stores/useProcedureStore'
import RevueStructureProcedure from './RevueStructureProcedure.vue'

function routeurDeTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/clients/:clientId/procedures',
        name: 'revue-structure-procedure',
        component: RevueStructureProcedure,
        props: true,
      },
      {
        path: '/projets/:projectId/sections/:sectionId',
        name: 'editeur-section',
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

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.procedures.clear()
  await db.procedureSteps.clear()
  await db.sections.clear()
})

describe('RevueStructureProcedure — livrables liés (tâche #118)', () => {
  test('liste les livrables dont Section.procedure_id référence la procédure', async () => {
    const procedureStore = useProcedureStore()
    const procedure = await procedureStore.creerProcedure('client-1', {
      reference: 'PQ-COMPRESSION',
      titre: 'Protocole de qualification presse',
      effectiveDate: '2026-01-01',
      categorie: 'cqv',
    })

    const maintenant = new Date().toISOString()
    await db.sections.put({
      id: 'section-1',
      project_id: 'projet-1',
      template_type: 'oq',
      template_engine_version: '0.1.0',
      owner_id: 'admin@pharmatech.example',
      shared_with: [],
      language: 'fr',
      status: 'brouillon_aide',
      meta: { ref: '', titre: 'OQ presse P-200', version: '0.1' },
      workflow: { authors: [], reviewers: [], approver_final: null },
      signatures: { redacteur: {}, verificateur: {}, approbateur: {} },
      revisions: [],
      values: {},
      tables: {},
      generation_source: { source_document_id: null, generated_fields: [] },
      procedure_id: procedure.id,
      asset_node_id: null,
      audit_log: [],
      created_at: maintenant,
      updated_at: maintenant,
    })

    const router = routeurDeTest()
    await router.push({ name: 'revue-structure-procedure', params: { clientId: 'client-1' } })
    const wrapper = mount(RevueStructureProcedure, {
      props: { clientId: 'client-1' },
      global: { plugins: [router] },
    })
    await attendreQue(() => wrapper.text().includes('PQ-COMPRESSION'))
    await attendreQue(() => wrapper.text().includes('Livrables liés'))

    expect(wrapper.text()).toContain('OQ presse P-200')
  })

  test('aucun livrable lié -> pas de bloc "Livrables liés"', async () => {
    const procedureStore = useProcedureStore()
    await procedureStore.creerProcedure('client-1', {
      reference: 'PQ-AUTRE',
      titre: 'Autre protocole',
      effectiveDate: '2026-01-01',
      categorie: 'production',
    })

    const router = routeurDeTest()
    await router.push({ name: 'revue-structure-procedure', params: { clientId: 'client-1' } })
    const wrapper = mount(RevueStructureProcedure, {
      props: { clientId: 'client-1' },
      global: { plugins: [router] },
    })
    await attendreQue(() => wrapper.text().includes('PQ-AUTRE'))

    expect(wrapper.text()).not.toContain('Livrables liés')
  })
})
