import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
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
  await db.assetNodes.clear()
  await db.relationsTechniques.clear()
  await db.evaluationsCSVAssessment.clear()
  await db.missions.clear()
  await db.qualityEvents.clear()
  await db.sections.clear()
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
})

describe('DossierVivantActif', () => {
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

    await db.qualityEvents.put({
      id: 'event-1',
      client_id: 'client-1',
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
      props: { clientId: 'client-1', noeudId: 'noeud-1' },
      global: { plugins: [routeurDeTest()] },
    })
    await attendreQue(() => wrapper.text().includes('Autoclave AUT-042'))

    expect(wrapper.text()).toContain('Qualifié')
    expect(wrapper.text()).toContain('2027-01-01')
    expect(wrapper.text()).toContain('PLC autoclave')
    expect(wrapper.text()).toContain('Traçabilité incomplète de la requalification')
    expect(wrapper.text()).toContain("Constat d'audit")
  })

  test('liste les livrables explicitement liés à cet actif (tâche #118)', async () => {
    const maintenant = new Date().toISOString()
    await db.assetNodes.put({
      id: 'noeud-2',
      client_id: 'client-1',
      workspace_id: null,
      level_key: 'equipement',
      name: 'Presse P-200',
      code: 'P-200',
      parent_id: null,
      associated_nodes: [],
      source: 'manuel',
      qms_connector_id: null,
      periodic_qualification: { applicable: false, deadline: null },
      qualification_status: 'non_qualifie',
      audit_log: [],
      created_at: maintenant,
      updated_at: maintenant,
    })
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
      procedure_id: null,
      asset_node_id: 'noeud-2',
      audit_log: [],
      created_at: maintenant,
      updated_at: maintenant,
    })

    const wrapper = mount(DossierVivantActif, {
      props: { clientId: 'client-1', noeudId: 'noeud-2' },
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
    await db.assetNodes.put({
      id: 'noeud-3',
      client_id: 'client-1',
      workspace_id: null,
      level_key: 'equipement',
      name: 'Étuve E-500',
      code: 'E-500',
      parent_id: null,
      associated_nodes: [],
      source: 'manuel',
      qms_connector_id: null,
      periodic_qualification: { applicable: false, deadline: null },
      qualification_status: 'qualifie',
      audit_log: [],
      created_at: maintenant,
      updated_at: maintenant,
    })

    const wrapper = mount(DossierVivantActif, {
      props: { clientId: 'client-1', noeudId: 'noeud-3' },
      global: { plugins: [routeurDeTest()] },
    })

    expect(wrapper.text()).toContain('Chargement…')
    expect(wrapper.text()).not.toContain('Nœud introuvable')

    await attendreQue(() => wrapper.text().includes('Étuve E-500'))
    expect(wrapper.text()).not.toContain('Chargement…')
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
