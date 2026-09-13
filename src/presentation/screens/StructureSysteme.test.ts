import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { AssetHierarchySchema, AssetNode } from '../../logique-metier/domaine/types'
import { db } from '../../persistance/db'
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
  for (let tentative = 0; tentative < 50; tentative++) {
    await flushPromises()
    if (condition()) return
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  throw new Error('attendreQue : condition jamais satisfaite')
}

/**
 * Pré-remplit directement IndexedDB (jamais via le store, dont l'état
 * réactif en mémoire resterait vide tant qu'un composant n'appelle pas
 * `charger()`) — reproduit un rechargement de page réel : les données
 * persistées survivent, l'état Pinia repart de zéro.
 */
async function preremplirHierarchieLocale(): Promise<void> {
  const maintenant = new Date().toISOString()
  const schema: AssetHierarchySchema = {
    client_id: CLIENT_ID,
    levels: [
      {
        key: 'site',
        label: { fr: 'Site', en: 'Site', de: 'Standort' },
        numbering_pattern: 'S-{n}',
      },
    ],
  }
  await db.assetHierarchySchemas.put(schema)
  const noeud: AssetNode = {
    id: 'noeud-site-nord',
    client_id: CLIENT_ID,
    workspace_id: null,
    level_key: 'site',
    name: 'Site Nord',
    code: 'SITE-01',
    parent_id: null,
    associated_nodes: [],
    source: 'manuel',
    qms_connector_id: null,
    periodic_qualification: { applicable: false, deadline: null },
    qualification_status: 'non_qualifie',
    audit_log: [{ timestamp: maintenant, actor: 'test', action: 'création' }],
    created_at: maintenant,
    updated_at: maintenant,
  }
  await db.assetNodes.put(noeud)
}

let demonter: () => void

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.assetHierarchySchemas.clear()
  await db.assetNodes.clear()
  await db.relationsTechniques.clear()
  await reinitialiserAuthDeTest()
  demonter = installerFauxWorkerAuth().demonter
  await connecterAdminDeTest()
})

afterEach(() => {
  demonter()
})

describe('StructureSysteme — panne de connectivité pendant le chargement du nom du client', () => {
  test("un Worker injoignable pour le nom du client n'empêche pas le chargement de la hiérarchie (purement locale, déjà persistée)", async () => {
    await preremplirHierarchieLocale()

    // Avant le correctif de `useClientsStore.obtenirClient`, cette panne
    // levait une exception non rattrapée dans le `onMounted` de l'écran —
    // qui interrompait la chaîne avant même d'atteindre
    // `structureStore.charger()`, pourtant purement local (IndexedDB), sans
    // aucun rapport avec le réseau : la hiérarchie déjà persistée restait
    // introuvable à l'écran malgré son existence réelle en base.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const router = routeurDeTest()
    await router.push({ name: 'structure-systeme', params: { clientId: CLIENT_ID } })
    const wrapper = mount(StructureSysteme, {
      props: { clientId: CLIENT_ID },
      global: { plugins: [router] },
    })

    // Le nœud pré-existant, purement local, doit apparaître malgré l'échec
    // du chargement du nom du client.
    await attendreQue(() => wrapper.text().includes('Site Nord'))
    expect(wrapper.text()).toContain('Site Nord')
    expect(wrapper.text()).toContain('Site (site)')

    // Dégradation attendue pour le nom du client : jamais de plantage, le
    // titre retombe sur l'identifiant brut du client.
    expect(wrapper.find('h1').text()).toContain(CLIENT_ID)
  })
})
