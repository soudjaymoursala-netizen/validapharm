import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { AssetNodeEnregistre } from '../../../workers/auth-worker/src/repos/structureSystemeRepo'
import type { Contexte } from '../../../workers/auth-worker/src/routeur'
import type { Section } from '../../logique-metier/domaine/types'
import { db } from '../../persistance/db'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import { useAuthStore } from '../stores/useAuthStore'
import { sectionDomaineVersWire } from '../stores/useSectionsStore'
import DossierVivantActif from './DossierVivantActif.vue'

const CLIENT_ID = 'client-1'

async function seedNoeud(noeud: AssetNodeEnregistre): Promise<void> {
  await ctx.structureSystemeRepo.creerNoeud(noeud)
}

/**
 * `Section` vit désormais dans le Worker/D1 (Phase 3b du chantier de
 * migration D1) — remplace l'ancien `db.sections.put(...)` direct de
 * préparation de test, même pattern que `synchronisation.test.ts`.
 */
async function seedSection(section: Section): Promise<void> {
  const authStore = useAuthStore()
  const api = await authStore.client()
  if (!api || !authStore.jeton) throw new Error('session absente en préparation de test')
  const resultat = await api.restaurerSection(
    authStore.jeton,
    section.id,
    sectionDomaineVersWire(section),
  )
  if (!resultat.ok) throw new Error(`échec de préparation de test : ${resultat.erreur}`)
}

let ctx: Contexte
let demonter: () => void

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
      {
        path: '/projets/:projectId/sections/:sectionId',
        name: 'editeur-section',
        component: { template: '<div />' },
      },
    ],
  })
}

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.missions.clear()
  await db.qualityEvents.clear()
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

// `onMounted` charge 7 stores en `Promise.all` — même profil de risque
// que `MissionWorkspace.vue`, qui a fait échouer ses tests en CI à trois
// reprises (`91fd8f6`, `f72eb41`, `1dcae5a`) faute de laisser le temps
// aux promesses résiduelles de se résoudre entre les tests.
afterEach(async () => {
  for (let tour = 0; tour < 5; tour++) {
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  demonter()
})

describe('DossierVivantActif', () => {
  test('agrège le statut de qualification et les évaluations rattachées à l’actif', async () => {
    const maintenant = new Date().toISOString()
    await seedNoeud({
      id: 'noeud-1',
      clientId: CLIENT_ID,
      workspaceId: null,
      levelKey: 'equipement',
      name: 'Autoclave AUT-042',
      code: 'AUT-042',
      parentId: null,
      associatedNodes: [],
      source: 'manuel',
      qmsConnectorId: null,
      periodicQualification: { applicable: true, deadline: '2027-01-01' },
      qualificationStatus: 'qualifie',
      auditLog: [],
      createdAt: maintenant,
      updatedAt: maintenant,
    })
    await ctx.csvAssessmentRepo.creerEvaluation({
      id: 'eval-1',
      clientId: CLIENT_ID,
      assetNodeId: 'noeud-1',
      nomSysteme: 'PLC autoclave',
      categorieGamp5: 4,
      justificationCategorie: 'x',
      pertinenceGxp: true,
      pertinenceEresPart11: false,
      justificationPertinence: 'x',
      auditLog: [],
      createdAt: maintenant,
      updatedAt: maintenant,
    })

    await db.qualityEvents.put({
      id: 'event-1',
      client_id: CLIENT_ID,
      type: 'audit_finding',
      titre: 'Traçabilité incomplète de la requalification',
      description: 'x',
      origine: 'interne',
      reference_externe: null,
      asset_node_id: 'noeud-1',
      process_id: null,
      manufacturing_context_id: null,
      statut: 'ouvert',
      audit_log: [],
      created_at: maintenant,
      updated_at: maintenant,
    })

    const wrapper = mount(DossierVivantActif, {
      props: { clientId: CLIENT_ID, noeudId: 'noeud-1' },
      global: { plugins: [routeurDeTest()] },
    })
    // Attendre uniquement le nom du nœud ne suffit pas : Structure Système
    // et CSV Assessment/Quality Events se chargent via des `charger()`
    // concurrents distincts (voir le commentaire d'`attendreQue` en tête de
    // fichier) — un « PLC autoclave » pas encore arrivé a fait échouer ce
    // test en CI (jamais reproduit en local) tant que la condition
    // n'attendait que le nom du nœud.
    await attendreQue(() => wrapper.text().includes('PLC autoclave'))

    expect(wrapper.text()).toContain('Qualifié')
    expect(wrapper.text()).toContain('2027-01-01')
    expect(wrapper.text()).toContain('PLC autoclave')
    expect(wrapper.text()).toContain('Traçabilité incomplète de la requalification')
    expect(wrapper.text()).toContain("Constat d'audit")
  })

  test('liste les livrables explicitement liés à cet actif (tâche #118)', async () => {
    const maintenant = new Date().toISOString()
    await seedNoeud({
      id: 'noeud-2',
      clientId: CLIENT_ID,
      workspaceId: null,
      levelKey: 'equipement',
      name: 'Presse P-200',
      code: 'P-200',
      parentId: null,
      associatedNodes: [],
      source: 'manuel',
      qmsConnectorId: null,
      periodicQualification: { applicable: false, deadline: null },
      qualificationStatus: 'non_qualifie',
      auditLog: [],
      createdAt: maintenant,
      updatedAt: maintenant,
    })
    await seedSection({
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
      procedure_id: null,
      asset_node_id: 'noeud-2',
      audit_log: [],
      created_at: maintenant,
      updated_at: maintenant,
    })

    const wrapper = mount(DossierVivantActif, {
      props: { clientId: CLIENT_ID, noeudId: 'noeud-2' },
      global: { plugins: [routeurDeTest()] },
    })
    await attendreQue(() => wrapper.text().includes('Presse P-200'))

    expect(wrapper.text()).toContain('OQ presse P-200')
    expect(wrapper.text()).not.toContain('Aucun livrable explicitement lié')
  })

  test('affiche un état de chargement avant que le nœud ne soit résolu, jamais « Nœud introuvable » à tort', async () => {
    // Reproduit un nœud déjà en base, chargé de manière asynchrone — avant
    // ce correctif, `noeud` (computed dérivé de `structureStore.noeuds`,
    // vide avant `structureStore.charger()`) valait `null` pendant tout le
    // chargement, donc l'écran affichait à tort « Nœud introuvable » même
    // pour un nœud existant (même motif que `RiskAssessmentAmdec.vue`/
    // `ImpactAssessment.vue` — le commentaire du fichier de test notait
    // déjà cette course avant ce correctif, mais seulement comme une
    // contrainte de test à contourner, pas comme un bug de l'écran).
    const maintenant = new Date().toISOString()
    await seedNoeud({
      id: 'noeud-3',
      clientId: CLIENT_ID,
      workspaceId: null,
      levelKey: 'equipement',
      name: 'Étuve E-500',
      code: 'E-500',
      parentId: null,
      associatedNodes: [],
      source: 'manuel',
      qmsConnectorId: null,
      periodicQualification: { applicable: false, deadline: null },
      qualificationStatus: 'qualifie',
      auditLog: [],
      createdAt: maintenant,
      updatedAt: maintenant,
    })

    const wrapper = mount(DossierVivantActif, {
      props: { clientId: CLIENT_ID, noeudId: 'noeud-3' },
      global: { plugins: [routeurDeTest()] },
    })

    expect(wrapper.text()).toContain('Chargement…')
    expect(wrapper.text()).not.toContain('Nœud introuvable')

    await attendreQue(() => wrapper.text().includes('Étuve E-500'))
    expect(wrapper.text()).not.toContain('Chargement…')
  })

  test('nœud introuvable -> message explicite, jamais un écran vide silencieux', async () => {
    const wrapper = mount(DossierVivantActif, {
      props: { clientId: CLIENT_ID, noeudId: 'id-inconnu' },
      global: { plugins: [routeurDeTest()] },
    })
    await attendreQue(() => wrapper.text().includes('Nœud introuvable'))

    expect(wrapper.text()).toContain('Nœud introuvable')
  })
})
