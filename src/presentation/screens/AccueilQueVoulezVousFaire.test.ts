import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import { db } from '../../persistance/db'
import { useClientsStore } from '../stores/useClientsStore'
import { useEpinglageStore } from '../stores/useEpinglageStore'
import { useProjectsStore } from '../stores/useProjectsStore'
import AccueilQueVoulezVousFaire from './AccueilQueVoulezVousFaire.vue'

function routeurDeTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'accueil', component: { template: '<div />' } },
      { path: '/tableau-de-bord', name: 'tableau-de-bord', component: { template: '<div />' } },
      { path: '/clients', name: 'gestion-clients', component: { template: '<div />' } },
      { path: '/configuration', name: 'configuration-client', component: { template: '<div />' } },
      {
        path: '/projets/:projectId',
        name: 'fiche-projet',
        component: { template: '<div />' },
      },
      {
        path: '/clients/:clientId/ingestion-documentaire',
        name: 'source-intelligence',
        component: { template: '<div />' },
      },
      {
        path: '/clients/:clientId/structure-systeme',
        name: 'structure-systeme',
        component: { template: '<div />' },
      },
    ],
  })
}

/** `onMounted` enchaîne plusieurs `await` (chargement projets/clients, puis 2 comptages Dexie) — un seul `flushPromises()` peut résoudre trop tôt, d'où ce sondage court. */
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
  localStorage.clear()
  await reinitialiserAuthDeTest()
  await db.projects.clear()
  await db.sections.clear()
  await db.knowledgeItems.clear()
  await db.conflicts.clear()
  demonter = installerFauxWorkerAuth().demonter
})

afterEach(() => {
  demonter()
})

describe('AccueilQueVoulezVousFaire — cartes d’action', () => {
  test("affiche les cartes d'action vers des capacités réellement construites", async () => {
    const router = routeurDeTest()
    await router.push('/')
    const wrapper = mount(AccueilQueVoulezVousFaire, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.text()).toContain('Que voulez-vous faire ?')
    expect(wrapper.text()).toContain('Gérer mes clients')
    expect(wrapper.text()).toContain('Configurer la connexion GitHub')
  })
})

describe('AccueilQueVoulezVousFaire — Continuer mon travail', () => {
  test('sans projet actif : aucun bloc de reprise', async () => {
    const router = routeurDeTest()
    await router.push('/')
    const wrapper = mount(AccueilQueVoulezVousFaire, { global: { plugins: [router] } })
    await attendreQue(() => wrapper.text().includes('Mes clients'))

    expect(wrapper.text()).not.toContain('Continuer mon travail')
  })

  test('avec un projet actif : affiche son nom et le compte réel de sections validées', async () => {
    const projetsStore = useProjectsStore()
    const projet = await projetsStore.creerProjet({
      name: 'Qualification STICK002',
      context: '',
      scope_in: '',
      scope_out: '',
      deadline: null,
      language_default: 'fr',
      client_id: null,
    })
    await db.sections.bulkAdd([
      sectionMinimale(projet.id, 's1', 'valide_en_interne'),
      sectionMinimale(projet.id, 's2', 'brouillon_aide'),
    ])

    const router = routeurDeTest()
    await router.push('/')
    const wrapper = mount(AccueilQueVoulezVousFaire, { global: { plugins: [router] } })
    await attendreQue(() => wrapper.text().includes('section(s) validée(s)'))

    expect(wrapper.text()).toContain('Continuer mon travail')
    expect(wrapper.text()).toContain('Qualification STICK002')
    expect(wrapper.text()).toContain('1/2 section(s) validée(s)')
  })
})

describe('AccueilQueVoulezVousFaire — Mes clients', () => {
  test('affiche les comptes réels actifs/archivés', async () => {
    await connecterAdminDeTest('admin@pharmatech.example', 'CoffreFort!2026')
    const clientsStore = useClientsStore()
    await clientsStore.creerClient({ name: 'Ferring', adresse: null, secteur: null, details: null })
    await clientsStore.creerClient({ name: 'Sanofi', adresse: null, secteur: null, details: null })

    const router = routeurDeTest()
    await router.push('/')
    const wrapper = mount(AccueilQueVoulezVousFaire, { global: { plugins: [router] } })
    await attendreQue(() => wrapper.text().includes('Mes clients'))

    const lignesClients = wrapper.findAll('.accueil__ligne-stat')
    const ligneActifs = lignesClients.find((l) => l.text().includes('Clients actifs'))
    expect(ligneActifs?.text()).toContain('2')
  })

  test('un échec réseau sur le chargement des clients ne bloque jamais le reste de la grille', async () => {
    const clientsStore = useClientsStore()
    clientsStore.chargerClients = vi.fn().mockRejectedValue(new Error('Réseau indisponible'))

    const router = routeurDeTest()
    await router.push('/')
    const wrapper = mount(AccueilQueVoulezVousFaire, { global: { plugins: [router] } })
    await attendreQue(() => wrapper.text().includes('À vérifier'))

    expect(wrapper.text()).toContain('Impossible de charger vos clients')
    // Le reste de la grille (À vérifier, Mes projets, Raccourcis épinglés)
    // reste rendu malgré l'échec de ce seul appel réseau — jamais un
    // blocage total de l'accueil sur un incident isolé.
    expect(wrapper.text()).toContain('Mes projets')
    expect(wrapper.text()).toContain('Raccourcis épinglés')
  })
})

describe('AccueilQueVoulezVousFaire — À vérifier', () => {
  test('aucune donnée à vérifier : état neutre', async () => {
    const router = routeurDeTest()
    await router.push('/')
    const wrapper = mount(AccueilQueVoulezVousFaire, { global: { plugins: [router] } })
    await attendreQue(() => wrapper.text().includes('À vérifier'))

    expect(wrapper.text()).toContain('Rien à vérifier pour l’instant.'.replace('’', "'"))
  })

  test('agrège les informations non validées et les conflits ouverts réels', async () => {
    await db.knowledgeItems.bulkAdd([
      knowledgeItemMinimal('ki1', 'a_valider'),
      knowledgeItemMinimal('ki2', 'a_valider'),
      knowledgeItemMinimal('ki3', 'valide'),
    ])
    await db.conflicts.add(conflitMinimal('c1', 'ouvert'))

    const router = routeurDeTest()
    await router.push('/')
    const wrapper = mount(AccueilQueVoulezVousFaire, { global: { plugins: [router] } })
    await attendreQue(() => wrapper.text().includes('Conflit(s) non résolu(s)'))

    expect(wrapper.text()).toContain('Information(s) extraite(s) non validée(s)')
  })
})

describe('AccueilQueVoulezVousFaire — Raccourcis épinglés', () => {
  test('affiche les raccourcis épinglés et permet de les désépingler', async () => {
    useEpinglageStore().epingler({
      id: 'structure-systeme:client-1',
      libelle: 'Architecture — Ferring',
      routeName: 'structure-systeme',
      routeParams: { clientId: 'client-1' },
    })

    const router = routeurDeTest()
    await router.push('/')
    const wrapper = mount(AccueilQueVoulezVousFaire, { global: { plugins: [router] } })
    await attendreQue(() => wrapper.text().includes('Architecture — Ferring'))

    expect(wrapper.text()).toContain('Architecture — Ferring')

    await wrapper.find('.accueil__bouton-desepingler').trigger('click')
    expect(useEpinglageStore().raccourcis).toHaveLength(0)
  })
})

function sectionMinimale(
  projectId: string,
  id: string,
  status: 'valide_en_interne' | 'brouillon_aide',
) {
  const maintenant = new Date().toISOString()
  return {
    id,
    project_id: projectId,
    template_type: 'urs' as const,
    template_engine_version: '1',
    owner_id: 'utilisateur-local-phase1',
    shared_with: [],
    language: 'fr' as const,
    status,
    meta: { ref: 'REF-001', titre: 'Section', version: '1' },
    workflow: { authors: [], reviewers: [], approver_final: null },
    signatures: { redacteur: {}, verificateur: {}, approbateur: {} },
    revisions: [],
    values: {},
    tables: {},
    generation_source: { source_document_id: null, generated_fields: [] },
    audit_log: [],
    created_at: maintenant,
    updated_at: maintenant,
  }
}

function knowledgeItemMinimal(id: string, statut: 'a_valider' | 'valide' | 'rejete') {
  const maintenant = new Date().toISOString()
  return {
    id,
    client_id: 'client-1',
    extraction_item_id: 'extraction-item-1',
    libelle: 'Donnée extraite',
    valeur_interpretee: 'Valeur',
    statut,
    valide_par: null,
    audit_log: [],
    created_at: maintenant,
    updated_at: maintenant,
  }
}

function conflitMinimal(id: string, statut: 'ouvert' | 'resolu') {
  return {
    id,
    client_id: 'client-1',
    knowledge_item_source_id: 'ki1',
    knowledge_item_cible_id: 'ki2',
    description: 'Valeurs contradictoires',
    statut,
    resolution: null,
    created_at: new Date().toISOString(),
  }
}
