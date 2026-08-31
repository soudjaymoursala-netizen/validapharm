import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { db } from '../../persistance/db'
import DossierVivantActif from './DossierVivantActif.vue'

// `flushPromises` seul ne suffit pas : `onMounted` lance 6 `charger()`
// concurrents (Structure Système, ACFC, Impact, CSV, Risk, Missions), et
// un seul passage de microtâches n'attend pas la résolution complète de
// chaînes de promesses IndexedDB imbriquées à cette profondeur — trouvé
// en instrumentant le composant (31/08/2026, texte encore "Nœud
// introuvable" au moment de l'assertion alors que les données arrivaient
// juste après). Même patron que `ComputerSystemAssessment.test.ts`.
async function attendreQue(condition: () => boolean): Promise<void> {
  for (let tentative = 0; tentative < 50; tentative++) {
    await flushPromises()
    if (condition()) return
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  throw new Error('attendreQue : condition jamais satisfaite')
}

function routeurDeTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/clients', name: 'gestion-clients', component: { template: '<div />' } },
      {
        path: '/clients/:clientId/structure-systeme',
        name: 'structure-systeme',
        component: { template: '<div />' },
      },
      {
        path: '/clients/:clientId/missions/:missionId',
        name: 'mission-workspace',
        component: { template: '<div />' },
      },
    ],
  })
}

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.assetNodes.clear()
  await db.relationsTechniques.clear()
  await db.evaluationsCSVAssessment.clear()
  await db.missions.clear()
})

describe('DossierVivantActif (URS-F-101 à 101septies)', () => {
  test('agrège le statut de qualification et les évaluations rattachées à l’actif', async () => {
    const maintenant = new Date().toISOString()
    await db.assetNodes.put({
      id: 'noeud-1',
      client_id: 'client-1',
      workspace_id: null,
      level_key: 'equipement',
      name: 'Autoclave AUT-042',
      code: 'AUT-042',
      parent_id: null,
      associated_nodes: [],
      source: 'manuel',
      qms_connector_id: null,
      periodic_qualification: { applicable: true, deadline: '2027-01-01' },
      qualification_status: 'qualifie',
      audit_log: [],
      created_at: maintenant,
      updated_at: maintenant,
    })
    await db.evaluationsCSVAssessment.put({
      id: 'eval-1',
      client_id: 'client-1',
      asset_node_id: 'noeud-1',
      nom_systeme: 'PLC autoclave',
      categorie_gamp5: 4,
      justification_categorie: 'x',
      pertinence_gxp: true,
      pertinence_eres_part11: false,
      justification_pertinence: 'x',
      audit_log: [],
      created_at: maintenant,
      updated_at: maintenant,
    })

    const wrapper = mount(DossierVivantActif, {
      props: { clientId: 'client-1', noeudId: 'noeud-1' },
      global: { plugins: [routeurDeTest()] },
    })
    await attendreQue(() => wrapper.text().includes('Autoclave AUT-042'))

    expect(wrapper.text()).toContain('Qualifié')
    expect(wrapper.text()).toContain('2027-01-01')
    expect(wrapper.text()).toContain('PLC autoclave')
  })

  test('nœud introuvable -> message explicite, jamais un écran vide silencieux', async () => {
    const wrapper = mount(DossierVivantActif, {
      props: { clientId: 'client-1', noeudId: 'id-inconnu' },
      global: { plugins: [routeurDeTest()] },
    })
    await attendreQue(() => wrapper.text().includes('Nœud introuvable'))

    expect(wrapper.text()).toContain('Nœud introuvable')
  })
})
