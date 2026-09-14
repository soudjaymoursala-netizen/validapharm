import 'fake-indexeddb/auto'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { db } from '../../persistance/db'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import { useProjectsStore } from '../stores/useProjectsStore'
import { useSectionsStore } from '../stores/useSectionsStore'
import PipelineQualification from './PipelineQualification.vue'

let demonter: () => void

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.sections.clear()
  await reinitialiserAuthDeTest()
  demonter = installerFauxWorkerAuth().demonter
  await connecterAdminDeTest()
})

afterEach(() => {
  demonter()
})

function routeurDeTest(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/projets/:projectId/sections/:sectionId',
        name: 'editeur-section',
        component: { template: '<div />' },
      },
    ],
  })
}

describe('PipelineQualification', () => {
  test(
    "un plan de support créé (Plan de métrologie) alors qu'un autre ne l'est pas encore " +
      '(Plan de maintenance) ne casse pas le rendu — bug trouvé en simulant un vrai parcours ' +
      'de qualification (RouterLink résolu pour un plan sans section, sectionId undefined)',
    async () => {
      const projets = useProjectsStore()
      const sections = useSectionsStore()
      const projet = await projets.creerProjet({
        name: 'Qualification presse à comprimer',
        context: 'Test',
        scope_in: 'Presse',
        scope_out: '',
        deadline: null,
        language_default: 'fr',
        client_id: null,
      })
      await sections.creerSection({
        project_id: projet.id,
        template_type: 'plan_metrologie',
        language: 'fr',
        titre: 'Plan de métrologie',
        owner_id: 'user-1',
      })
      // Volontairement AUCUNE section 'plan_maintenance' créée — c'est le cas qui déclenchait le bug.

      const router = routeurDeTest()
      const wrapper = mount(PipelineQualification, {
        props: {
          sections: sections.sectionsParProjet[projet.id] ?? [],
          langue: 'fr',
          projectId: projet.id,
        },
        global: { plugins: [router] },
      })

      expect(wrapper.text()).toContain('Plan de métrologie')
      expect(wrapper.text()).not.toContain('Plan de maintenance')
    },
  )
})
