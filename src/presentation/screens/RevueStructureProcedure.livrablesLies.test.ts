import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Section } from '../../logique-metier/domaine/types'
import {
  connecterAdminDeTest,
  creerProjetDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import { useAuthStore } from '../stores/useAuthStore'
import { useProcedureStore } from '../stores/useProcedureStore'
import { sectionDomaineVersWire } from '../stores/useSectionsStore'
import RevueStructureProcedure from './RevueStructureProcedure.vue'

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

function routeurDeTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/clients/:clientId/procedures',
        name: 'revue-structure-procedure',
        component: RevueStructureProcedure,
        props: true,
      },
      {
        path: '/projets/:projectId/sections/:sectionId',
        name: 'editeur-section',
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

let demonter: () => void

beforeEach(async () => {
  setActivePinia(createPinia())
  await reinitialiserAuthDeTest()
  const installation = installerFauxWorkerAuth()
  demonter = installation.demonter
  await connecterAdminDeTest()
  await creerProjetDeTest(installation.ctx, 'projet-1')
  await installation.ctx.clientsRepo.creer({
    id: 'client-1',
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

describe('RevueStructureProcedure — livrables liés (tâche #118)', () => {
  test('liste les livrables dont Section.procedure_id référence la procédure', async () => {
    const procedureStore = useProcedureStore()
    const procedure = await procedureStore.creerProcedure('client-1', {
      reference: 'PQ-COMPRESSION',
      titre: 'Protocole de qualification presse',
      effectiveDate: '2026-01-01',
      categorie: 'cqv',
    })

    const maintenant = new Date().toISOString()
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
      procedure_id: procedure.id,
      asset_node_id: null,
      audit_log: [],
      created_at: maintenant,
      updated_at: maintenant,
    })

    const router = routeurDeTest()
    await router.push({ name: 'revue-structure-procedure', params: { clientId: 'client-1' } })
    const wrapper = mount(RevueStructureProcedure, {
      props: { clientId: 'client-1' },
      global: { plugins: [router] },
    })
    await attendreQue(() => wrapper.text().includes('PQ-COMPRESSION'))
    await attendreQue(() => wrapper.text().includes('Livrables liés'))

    expect(wrapper.text()).toContain('OQ presse P-200')
  })

  test('aucun livrable lié -> pas de bloc "Livrables liés"', async () => {
    const procedureStore = useProcedureStore()
    await procedureStore.creerProcedure('client-1', {
      reference: 'PQ-AUTRE',
      titre: 'Autre protocole',
      effectiveDate: '2026-01-01',
      categorie: 'production',
    })

    const router = routeurDeTest()
    await router.push({ name: 'revue-structure-procedure', params: { clientId: 'client-1' } })
    const wrapper = mount(RevueStructureProcedure, {
      props: { clientId: 'client-1' },
      global: { plugins: [router] },
    })
    await attendreQue(() => wrapper.text().includes('PQ-AUTRE'))

    expect(wrapper.text()).not.toContain('Livrables liés')
  })
})

describe('RevueStructureProcedure — révisions (R-21)', () => {
  test('une révision antérieure est marquée obsolète, la dernière applicable', async () => {
    const procedureStore = useProcedureStore()
    for (const titre of ['Nettoyage P-101', 'Nettoyage P-101 (révisé)']) {
      await procedureStore.creerProcedure('client-1', {
        reference: 'SOP-QA-012',
        titre,
        effectiveDate: '2026-01-01',
        categorie: 'production',
      })
    }

    const router = routeurDeTest()
    await router.push({ name: 'revue-structure-procedure', params: { clientId: 'client-1' } })
    const wrapper = mount(RevueStructureProcedure, {
      props: { clientId: 'client-1' },
      global: { plugins: [router] },
    })
    await attendreQue(() => wrapper.text().includes('SOP-QA-012 — v2'))

    const articles = wrapper.findAll('article.procedure')
    const v1 = articles.find((a) => a.text().includes('SOP-QA-012 — v1'))
    const v2 = articles.find((a) => a.text().includes('SOP-QA-012 — v2'))
    expect(v1?.text()).toContain('Obsolète — remplacée par la v2')
    expect(v2?.text()).toContain('Version applicable')
    expect(v2?.text()).not.toContain('Obsolète')
  })
})
