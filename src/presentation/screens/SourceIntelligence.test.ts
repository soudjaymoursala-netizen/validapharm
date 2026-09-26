import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Contexte } from '../../../workers/auth-worker/src/routeur'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import SourceIntelligence from './SourceIntelligence.vue'

const CLIENT_ID = 'client-1'

function routeurDeTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/clients', name: 'gestion-clients', component: { template: '<div />' } },
      {
        path: '/clients/:clientId/ingestion-documentaire',
        name: 'source-intelligence',
        component: { template: '<div />' },
      },
    ],
  })
}

async function attendreQue(condition: () => Promise<boolean> | boolean): Promise<void> {
  // Attente bornée dans le temps (3 s), jamais en nombre de tours : sous la
  // charge de la suite complète en CI, quelques centaines de ms ne suffisaient pas.
  const echeanceAttente = Date.now() + 3000
  for (let tentative = 0; Date.now() < echeanceAttente; tentative++) {
    await flushPromises()
    if (await condition()) return
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  throw new Error('attendreQue : condition jamais satisfaite')
}

async function optionPresente(
  wrapper: ReturnType<typeof mount>,
  selector: string,
  valeur: string,
): Promise<void> {
  await attendreQue(() =>
    wrapper
      .find(selector)
      .findAll('option')
      .some((o) => o.attributes('value') === valeur),
  )
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
    name: CLIENT_ID,
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

describe('SourceIntelligence', () => {
  test('chaîne complète Source → Version → Extraction → ExtractionItem → KnowledgeItem validé', async () => {
    const wrapper = mount(SourceIntelligence, {
      props: { clientId: CLIENT_ID },
      global: { plugins: [routeurDeTest()] },
    })
    await flushPromises()

    // Source
    const formSource = wrapper.find('.bloc-sources form')
    await formSource.find('input[type="text"]').setValue('Manuel AC-104')
    await formSource.trigger('submit.prevent')
    await attendreQue(
      async () => (await ctx.knowledgeEngineRepo.listerSources(CLIENT_ID)).length > 0,
    )
    const source = (await ctx.knowledgeEngineRepo.listerSources(CLIENT_ID))[0]

    // Nouvelle version depuis la liste
    await attendreQue(() => wrapper.findAll('.bloc-sources li button').length > 0)
    await wrapper.find('.bloc-sources li button').trigger('click')
    await attendreQue(
      async () => (await ctx.knowledgeEngineRepo.listerSourceVersions(CLIENT_ID)).length > 0,
    )
    const version = (await ctx.knowledgeEngineRepo.listerSourceVersions(CLIENT_ID))[0]
    expect(version?.sourceId).toBe(source?.id)
    expect(version?.numeroVersion).toBe(1)
    if (!version) throw new Error('version non créée')

    // Extraction depuis la version
    await optionPresente(wrapper, '.bloc-extractions select', version.id)
    const formExtraction = wrapper.find('.bloc-extractions form')
    await formExtraction.find('select').setValue(version.id)
    await formExtraction.trigger('submit.prevent')
    await attendreQue(
      async () => (await ctx.knowledgeEngineRepo.listerExtractions(CLIENT_ID)).length > 0,
    )
    const extraction = (await ctx.knowledgeEngineRepo.listerExtractions(CLIENT_ID))[0]
    expect(extraction?.methode).toBe('saisie_manuelle')
    if (!extraction) throw new Error('extraction non créée')

    // Élément extrait (immutable)
    await optionPresente(wrapper, '.bloc-extraction-items select', extraction.id)
    const formItem = wrapper.find('.bloc-extraction-items form')
    await formItem.find('select').setValue(extraction.id)
    await formItem.find('textarea').setValue('F0 minimal requis : 15 minutes')
    await formItem.trigger('submit.prevent')
    await attendreQue(
      async () => (await ctx.knowledgeEngineRepo.listerExtractionItems(CLIENT_ID)).length > 0,
    )
    const item = (await ctx.knowledgeEngineRepo.listerExtractionItems(CLIENT_ID))[0]
    expect(item?.contenu).toBe('F0 minimal requis : 15 minutes')
    if (!item) throw new Error('élément extrait non créé')

    // KnowledgeItem — toujours créé "à valider", jamais "valide"
    await optionPresente(wrapper, '.bloc-knowledge-items select', item.id)
    const formKnowledge = wrapper.find('.bloc-knowledge-items form')
    await formKnowledge.find('select').setValue(item.id)
    const inputsKnowledge = formKnowledge.findAll('input[type="text"]')
    await inputsKnowledge[0]?.setValue('F0 minimal')
    await inputsKnowledge[1]?.setValue('15 min')
    await formKnowledge.trigger('submit.prevent')
    await attendreQue(
      async () => (await ctx.knowledgeEngineRepo.listerKnowledgeItems(CLIENT_ID)).length > 0,
    )

    const knowledgeItem = (await ctx.knowledgeEngineRepo.listerKnowledgeItems(CLIENT_ID))[0]
    expect(knowledgeItem?.statut).toBe('a_valider')

    // Validation humaine explicite
    await attendreQue(() => wrapper.find('.liste-knowledge li button').exists())
    const boutonsKnowledge = wrapper.find('.liste-knowledge li').findAll('button')
    await boutonsKnowledge[0]?.trigger('click')
    await attendreQue(
      async () =>
        (await ctx.knowledgeEngineRepo.listerKnowledgeItems(CLIENT_ID))[0]?.statut === 'valide',
    )

    const knowledgeItemValide = (await ctx.knowledgeEngineRepo.listerKnowledgeItems(CLIENT_ID))[0]
    expect(knowledgeItemValide?.statut).toBe('valide')
    expect(knowledgeItemValide?.validePar).toBe('admin@pharmatech.example')
    const confirmations = await ctx.knowledgeEngineRepo.listerConfirmations(CLIENT_ID)
    expect(confirmations).toHaveLength(1)
    expect(confirmations[0]?.decision).toBe('confirme')
  })

  test("un conflit déclaré reste ouvert tant qu'aucune résolution explicite n'est fournie (garde-fou)", async () => {
    const maintenant = new Date().toISOString()
    await ctx.knowledgeEngineRepo.creerKnowledgeItem({
      id: 'ki-1',
      clientId: CLIENT_ID,
      extractionItemId: 'item-1',
      libelle: 'F0 minimal',
      valeurInterpretee: '15 min',
      statut: 'a_valider',
      validePar: null,
      auditLog: [],
      createdAt: maintenant,
      updatedAt: maintenant,
    })
    await ctx.knowledgeEngineRepo.creerKnowledgeItem({
      id: 'ki-2',
      clientId: CLIENT_ID,
      extractionItemId: 'item-2',
      libelle: 'F0 minimal (autre document)',
      valeurInterpretee: '12 min',
      statut: 'a_valider',
      validePar: null,
      auditLog: [],
      createdAt: maintenant,
      updatedAt: maintenant,
    })
    const wrapper = mount(SourceIntelligence, {
      props: { clientId: CLIENT_ID },
      global: { plugins: [routeurDeTest()] },
    })
    await flushPromises()
    await optionPresente(wrapper, '.bloc-conflits select', 'ki-1')

    const formConflit = wrapper.find('.bloc-conflits form')
    const selects = formConflit.findAll('select')
    await selects[0]?.setValue('ki-1')
    await selects[1]?.setValue('ki-2')
    await formConflit.find('textarea').setValue('Deux valeurs différentes pour F0 minimal')
    await formConflit.trigger('submit.prevent')
    await attendreQue(
      async () => (await ctx.knowledgeEngineRepo.listerConflicts(CLIENT_ID)).length > 0,
    )

    expect((await ctx.knowledgeEngineRepo.listerConflicts(CLIENT_ID))[0]?.statut).toBe('ouvert')

    // Résolution explicite
    await attendreQue(() => wrapper.find('.liste-conflits li').exists())
    const ligneConflit = wrapper.find('.liste-conflits li')
    await ligneConflit
      .find('input[type="text"]')
      .setValue('Document le plus récent retenu : 15 min')
    await ligneConflit.find('button').trigger('click')
    await attendreQue(
      async () =>
        (await ctx.knowledgeEngineRepo.listerConflicts(CLIENT_ID))[0]?.statut === 'resolu',
    )

    const conflitResolu = (await ctx.knowledgeEngineRepo.listerConflicts(CLIENT_ID))[0]
    expect(conflitResolu?.statut).toBe('resolu')
    expect(conflitResolu?.resolution).toBe('Document le plus récent retenu : 15 min')
  })
})
