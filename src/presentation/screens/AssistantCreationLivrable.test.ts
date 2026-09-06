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
import { useProcessContextStore } from '../stores/useProcessContextStore'
import { useProjectsStore } from '../stores/useProjectsStore'
import { useSectionsStore } from '../stores/useSectionsStore'
import AssistantCreationLivrable from './AssistantCreationLivrable.vue'

function routeurDeTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/projets/:projectId', name: 'fiche-projet', component: { template: '<div />' } },
      {
        path: '/projets/:projectId/sections/:sectionId',
        name: 'editeur-section',
        component: { template: '<div />' },
      },
      {
        path: '/projets/:projectId/assistant-livrable',
        name: 'assistant-creation-livrable',
        component: AssistantCreationLivrable,
        props: true,
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
  await db.processes.clear()
  await db.procedures.clear()
  await reinitialiserAuthDeTest()
  demonter = installerFauxWorkerAuth().demonter
  await connecterAdminDeTest()
})

afterEach(() => {
  demonter()
})

describe('AssistantCreationLivrable — chaîne de création de livrable assemblée (tâche #115)', () => {
  test('parcourt les 9 étapes en assemblant le contexte réel, puis crée le livrable avec sa provenance tracée', async () => {
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

    // Un autre projet du même client, avec un précédent du même type (OQ).
    const autreProjet = await projetsStore.creerProjet({
      name: 'Qualification presse P-100 (historique)',
      context: '',
      scope_in: '',
      scope_out: '',
      deadline: null,
      language_default: 'fr',
      client_id: client.id,
    })
    const sectionsStore = useSectionsStore()
    await sectionsStore.creerSection({
      project_id: autreProjet.id,
      template_type: 'oq',
      language: 'fr',
      titre: 'OQ presse P-100',
      owner_id: 'admin@pharmatech.example',
    })

    const processStore = useProcessContextStore()
    await processStore.creerProcess(client.id, {
      nom: 'Compression',
      description: 'Compression rotative',
      type: 'manufacturing',
    })

    const procedureStore = useProcedureStore()
    await procedureStore.creerProcedure(client.id, {
      reference: 'PQ-COMPRESSION',
      titre: 'Protocole de qualification presse',
      effectiveDate: '2026-01-01',
      categorie: 'cqv',
    })

    const router = routeurDeTest()
    await router.push({ name: 'assistant-creation-livrable', params: { projectId: projet.id } })
    const wrapper = mount(AssistantCreationLivrable, {
      props: { projectId: projet.id },
      global: { plugins: [router] },
    })
    await attendreQue(() => wrapper.text().includes('Qualification presse P-200'))

    // Étape 1 — type.
    expect(wrapper.text()).toContain('1. Quel type de livrable')
    await wrapper.find('input[type="text"]').setValue('OQ presse P-200')
    await wrapper.find('select').setValue('oq')
    await wrapper.find('button:not(:disabled)').trigger('click')
    await flushPromises()

    // Étape 2 — contexte (lecture seule).
    expect(wrapper.text()).toContain('2. Contexte du projet')
    await wrapper.find('.actions button:last-child').trigger('click')
    await flushPromises()

    // Étape 3 — architecture (réelle, vide ici).
    expect(wrapper.text()).toContain('3. Architecture associée')
    expect(wrapper.text()).toContain('Aucun actif défini')
    await wrapper.find('.actions button:last-child').trigger('click')
    await flushPromises()

    // Étape 4 — process (réel).
    expect(wrapper.text()).toContain('4. Process associé')
    expect(wrapper.text()).toContain('Compression')
    await wrapper.find('.actions button:last-child').trigger('click')
    await flushPromises()

    // Étape 5 — procédure (réelle, sélectionnable).
    expect(wrapper.text()).toContain('5. Procédure applicable')
    expect(wrapper.text()).toContain('PQ-COMPRESSION')
    const procedureEnBase = (await db.procedures.toArray())[0]
    const selectProcedure = wrapper.find('.etape select')
    await selectProcedure.setValue(procedureEnBase?.id)
    await wrapper.find('.actions button:last-child').trigger('click')
    await flushPromises()

    // Étape 6 — risques (réels, vides ici).
    expect(wrapper.text()).toContain('6. Risques pertinents')
    expect(wrapper.text()).toContain('Aucune évaluation de risque')
    await wrapper.find('.actions button:last-child').trigger('click')
    await flushPromises()

    // Étape 7 — méthode (réelle, vide ici) → charge les précédents en avançant.
    expect(wrapper.text()).toContain('7. Méthode en vigueur')
    await wrapper.find('.actions button:last-child').trigger('click')
    await attendreQue(() => wrapper.text().includes('8. Précédents pertinents'))

    // Étape 8 — précédents (réels : la section OQ de l'autre projet du même client).
    await attendreQue(() => wrapper.text().includes('OQ presse P-100'))
    expect(wrapper.text()).toContain('Qualification presse P-100 (historique)')
    await wrapper.find('.actions button:last-child').trigger('click')
    await flushPromises()

    // Étape 9 — génération.
    expect(wrapper.text()).toContain('9. Génération')
    const boutonVierge = wrapper.findAll('button').find((b) => b.text().includes('gabarit vierge'))
    await boutonVierge?.trigger('click')

    await attendreQue(async () => {
      const sections = await db.sections.where('project_id').equals(projet.id).toArray()
      return (sections[0]?.audit_log.length ?? 0) > 1
    })
    const sectionCreee = (await db.sections.where('project_id').equals(projet.id).toArray())[0]
    expect(sectionCreee?.template_type).toBe('oq')
    expect(sectionCreee?.meta.titre).toBe('OQ presse P-200')
    const derniereEntree = sectionCreee?.audit_log.at(-1)
    expect(derniereEntree?.action).toContain('contexte_assemble')
    expect(derniereEntree?.action).toContain('PQ-COMPRESSION')
    expect(derniereEntree?.action).toContain('1 précédent')
  })
})
