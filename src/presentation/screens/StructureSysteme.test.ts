import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Contexte } from '../../../workers/auth-worker/src/routeur'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import StructureSysteme from './StructureSysteme.vue'

const CLIENT_ID = 'client-test-structure'

function routeurDeTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/clients', name: 'gestion-clients', component: { template: '<div />' } },
      {
        path: '/clients/:clientId/structure-systeme',
        name: 'structure-systeme',
        component: StructureSysteme,
        props: true,
      },
      {
        path: '/clients/:clientId/suivi-periodicite',
        name: 'suivi-periodicite',
        component: { template: '<div />' },
      },
      {
        path: '/clients/:clientId/dossier-vivant/:noeudId',
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

/**
 * Pré-remplit directement les dépôts en mémoire du faux Worker (jamais via
 * le store, dont l'état réactif resterait vide tant qu'un composant
 * n'appelle pas `charger()`) — reproduit une hiérarchie déjà persistée côté
 * serveur (D1) avant le montage de l'écran.
 */
async function preremplirHierarchieServeur(ctx: Contexte): Promise<void> {
  const maintenant = new Date().toISOString()
  await ctx.structureSystemeRepo.enregistrerSchema({
    clientId: CLIENT_ID,
    levels: [
      {
        key: 'site',
        label: { fr: 'Site', en: 'Site', de: 'Standort' },
        numberingPattern: 'S-{n}',
      },
    ],
  })
  await ctx.structureSystemeRepo.creerNoeud({
    id: 'noeud-site-nord',
    clientId: CLIENT_ID,
    workspaceId: null,
    levelKey: 'site',
    name: 'Site Nord',
    code: 'SITE-01',
    parentId: null,
    associatedNodes: [],
    source: 'manuel',
    qmsConnectorId: null,
    periodicQualification: { applicable: false, deadline: null },
    qualificationStatus: 'non_qualifie',
    auditLog: [{ timestamp: maintenant, actor: 'test', action: 'création' }],
    createdAt: maintenant,
    updatedAt: maintenant,
  })
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

describe('StructureSysteme — chargement normal', () => {
  test('affiche la hiérarchie déjà persistée côté serveur', async () => {
    await preremplirHierarchieServeur(ctx)

    const router = routeurDeTest()
    await router.push({ name: 'structure-systeme', params: { clientId: CLIENT_ID } })
    const wrapper = mount(StructureSysteme, {
      props: { clientId: CLIENT_ID },
      global: { plugins: [router] },
    })

    await attendreQue(() => wrapper.text().includes('Site Nord'))
    expect(wrapper.text()).toContain('Site Nord')
    expect(wrapper.text()).toContain('Site (site)')
  })
})

describe('StructureSysteme — panne de connectivité', () => {
  test("un Worker injoignable n'empêche jamais l'affichage de l'écran (dégradation gracieuse, jamais une exception non gérée)", async () => {
    await preremplirHierarchieServeur(ctx)

    // Depuis la migration D1 (docs/CHANTIER-MIGRATION-D1-RECAP.md), la
    // hiérarchie n'est plus purement locale : une panne réseau signifie
    // réellement une absence de données pour cet écran (même la hiérarchie
    // déjà persistée côté serveur devient temporairement inaccessible),
    // jamais un crash — même discipline que `useClientsStore.obtenirClient`
    // (voir `useStructureSystemeStore.charger`, catch autour de
    // `api.obtenirStructureSysteme`).
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const router = routeurDeTest()
    await router.push({ name: 'structure-systeme', params: { clientId: CLIENT_ID } })
    const wrapper = mount(StructureSysteme, {
      props: { clientId: CLIENT_ID },
      global: { plugins: [router] },
    })

    await attendreQue(() => wrapper.text().includes("Aucun nœud pour l'instant."))
    expect(wrapper.text()).toContain("Aucun nœud pour l'instant.")

    // Dégradation attendue pour le nom du client : jamais de plantage, le
    // titre retombe sur l'identifiant brut du client.
    expect(wrapper.find('h1').text()).toContain(CLIENT_ID)
  })
})
