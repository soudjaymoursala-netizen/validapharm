import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { db } from '../../persistance/db'
import SuiviPeriodicite from './SuiviPeriodicite.vue'

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
      {
        path: '/clients/:clientId/structure-systeme',
        name: 'structure-systeme',
        component: { template: '<div />' },
      },
      {
        path: '/clients/:clientId/structure-systeme/:noeudId/dossier-vivant',
        name: 'dossier-vivant-actif',
        component: { template: '<div />' },
      },
    ],
  })
}

function noeudDeTest(
  id: string,
  overrides: Partial<{
    name: string
    code: string
    applicable: boolean
    deadline: string | null
  }>,
) {
  const maintenant = new Date().toISOString()
  return {
    id,
    client_id: 'client-1',
    workspace_id: null,
    level_key: 'equipement',
    name: overrides.name ?? id,
    code: overrides.code ?? id.toUpperCase(),
    parent_id: null,
    associated_nodes: [],
    source: 'manuel' as const,
    qms_connector_id: null,
    periodic_qualification: {
      applicable: overrides.applicable ?? true,
      deadline: overrides.deadline ?? null,
    },
    qualification_status: 'qualifie' as const,
    audit_log: [],
    created_at: maintenant,
    updated_at: maintenant,
  }
}

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.assetNodes.clear()
})

describe('SuiviPeriodicite', () => {
  test('n’affiche que les nœuds soumis à périodicité, triés retard puis échéance proche', async () => {
    const hier = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const dansUnMois = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const dansDeuxAns = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)

    await db.assetNodes.bulkPut([
      noeudDeTest('en-retard', { name: 'Autoclave AUT-042', deadline: hier }),
      noeudDeTest('proche', { name: 'Isolateur ISO-01', deadline: dansUnMois }),
      noeudDeTest('a-jour', { name: 'Presse P-200', deadline: dansDeuxAns }),
      noeudDeTest('non-applicable', { name: 'Convoyeur CV-01', applicable: false }),
    ])

    const wrapper = mount(SuiviPeriodicite, {
      props: { clientId: 'client-1' },
      global: { plugins: [routeurDeTest()] },
    })
    await attendreQue(() => wrapper.text().includes('Autoclave AUT-042'))

    expect(wrapper.text()).toContain('Isolateur ISO-01')
    expect(wrapper.text()).toContain('Presse P-200')
    expect(wrapper.text()).not.toContain('Convoyeur CV-01')

    const noms = wrapper.findAll('.ligne-suivi__entete strong').map((el) => el.text())
    expect(noms).toEqual(['Autoclave AUT-042', 'Isolateur ISO-01', 'Presse P-200'])
    expect(wrapper.text()).toContain('en retard de 1 jour(s)')
  })

  test('échéance non renseignée affichée distinctement', async () => {
    await db.assetNodes.put(
      noeudDeTest('sans-echeance', { name: 'Ligne L-07', applicable: true, deadline: null }),
    )

    const wrapper = mount(SuiviPeriodicite, {
      props: { clientId: 'client-1' },
      global: { plugins: [routeurDeTest()] },
    })
    await attendreQue(() => wrapper.text().includes('Ligne L-07'))

    expect(wrapper.text()).toContain('Échéance non renseignée')
  })

  test('aucun nœud périodique -> état vide explicite', async () => {
    const wrapper = mount(SuiviPeriodicite, {
      props: { clientId: 'client-1' },
      global: { plugins: [routeurDeTest()] },
    })
    await attendreQue(() => wrapper.text().includes("n'est soumis à requalification périodique"))

    expect(wrapper.text()).toContain("n'est soumis à requalification périodique")
  })
})
