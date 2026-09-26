import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { AssetNodeEnregistre } from '../../../workers/auth-worker/src/repos/structureSystemeRepo'
import type { Contexte } from '../../../workers/auth-worker/src/routeur'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import SuiviPeriodicite from './SuiviPeriodicite.vue'

const CLIENT_ID = 'client-1'

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
): AssetNodeEnregistre {
  const maintenant = new Date().toISOString()
  return {
    id,
    clientId: CLIENT_ID,
    workspaceId: null,
    levelKey: 'equipement',
    name: overrides.name ?? id,
    code: overrides.code ?? id.toUpperCase(),
    parentId: null,
    associatedNodes: [],
    source: 'manuel',
    qmsConnectorId: null,
    periodicQualification: {
      applicable: overrides.applicable ?? true,
      deadline: overrides.deadline ?? null,
    },
    qualificationStatus: 'qualifie',
    auditLog: [],
    createdAt: maintenant,
    updatedAt: maintenant,
  }
}

let ctx: Contexte
let demonter: () => void

beforeEach(async () => {
  setActivePinia(createPinia())
  await reinitialiserAuthDeTest()
  const installation = installerFauxWorkerAuth()
  ctx = installation.ctx
  demonter = installation.demonter
  await connecterAdminDeTest()
  await ctx.clientsRepo.creer({
    id: CLIENT_ID,
    name: 'Client de test',
    adresse: null,
    secteur: null,
    details: null,
    statut: 'actif',
    archivedAt: null,
    archivedBy: null,
    createdByUserId: 'admin-test',
    sharedWith: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
})

afterEach(() => {
  demonter()
})

describe('SuiviPeriodicite', () => {
  test('n’affiche que les nœuds soumis à périodicité, triés retard puis échéance proche', async () => {
    const hier = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const dansUnMois = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const dansDeuxAns = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)

    await ctx.structureSystemeRepo.creerNoeuds([
      noeudDeTest('en-retard', { name: 'Autoclave AUT-042', deadline: hier }),
      noeudDeTest('proche', { name: 'Isolateur ISO-01', deadline: dansUnMois }),
      noeudDeTest('a-jour', { name: 'Presse P-200', deadline: dansDeuxAns }),
      noeudDeTest('non-applicable', { name: 'Convoyeur CV-01', applicable: false }),
    ])

    const wrapper = mount(SuiviPeriodicite, {
      props: { clientId: CLIENT_ID },
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
    await ctx.structureSystemeRepo.creerNoeud(
      noeudDeTest('sans-echeance', { name: 'Ligne L-07', applicable: true, deadline: null }),
    )

    const wrapper = mount(SuiviPeriodicite, {
      props: { clientId: CLIENT_ID },
      global: { plugins: [routeurDeTest()] },
    })
    await attendreQue(() => wrapper.text().includes('Ligne L-07'))

    expect(wrapper.text()).toContain('Échéance non renseignée')
  })

  test('aucun nœud périodique -> état vide explicite', async () => {
    const wrapper = mount(SuiviPeriodicite, {
      props: { clientId: CLIENT_ID },
      global: { plugins: [routeurDeTest()] },
    })
    await attendreQue(() => wrapper.text().includes("n'est soumis à requalification périodique"))

    expect(wrapper.text()).toContain("n'est soumis à requalification périodique")
  })
})

describe('SuiviPeriodicite — panne de connectivité', () => {
  test("un Worker injoignable n'empêche jamais l'affichage de l'écran (dégradation gracieuse, jamais une exception non gérée)", async () => {
    // Depuis la migration D1 (Structure Système, docs/CHANTIER-MIGRATION-D1-RECAP.md),
    // les nœuds ne sont plus purement locaux : une panne réseau signifie
    // réellement une absence de données pour cet écran, jamais un crash —
    // même discipline que `useClientsStore.obtenirClient` (voir
    // `useStructureSystemeStore.charger`, catch autour de
    // `api.obtenirStructureSysteme`).
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const wrapper = mount(SuiviPeriodicite, {
      props: { clientId: CLIENT_ID },
      global: { plugins: [routeurDeTest()] },
    })
    await attendreQue(() => wrapper.text().includes("n'est soumis à requalification périodique"))

    expect(wrapper.find('h1').text()).toContain(CLIENT_ID)
    expect(wrapper.text()).toContain("n'est soumis à requalification périodique")
  })
})
