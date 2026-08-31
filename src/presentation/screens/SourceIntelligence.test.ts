import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { db } from '../../persistance/db'
import SourceIntelligence from './SourceIntelligence.vue'

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
  for (let tentative = 0; tentative < 50; tentative++) {
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

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.sources.clear()
  await db.sourceVersions.clear()
  await db.sourceLocations.clear()
  await db.extractions.clear()
  await db.extractionItems.clear()
  await db.knowledgeItems.clear()
  await db.confirmations.clear()
  await db.knowledgeRelations.clear()
  await db.conflicts.clear()
})

describe('SourceIntelligence', () => {
  test('chaîne complète Source → Version → Extraction → ExtractionItem → KnowledgeItem validé (Phase 8a)', async () => {
    const wrapper = mount(SourceIntelligence, {
      props: { clientId: 'client-1' },
      global: { plugins: [routeurDeTest()] },
    })
    await flushPromises()

    // Source
    const formSource = wrapper.find('.bloc-sources form')
    await formSource.find('input[type="text"]').setValue('Manuel AC-104')
    await formSource.trigger('submit.prevent')
    await attendreQue(
      async () => (await db.sources.where('client_id').equals('client-1').count()) > 0,
    )
    const source = (await db.sources.toArray())[0]

    // Nouvelle version depuis la liste
    await attendreQue(() => wrapper.findAll('.bloc-sources li button').length > 0)
    await wrapper.find('.bloc-sources li button').trigger('click')
    await attendreQue(async () => (await db.sourceVersions.count()) > 0)
    const version = (await db.sourceVersions.toArray())[0]
    expect(version?.source_id).toBe(source?.id)
    expect(version?.numero_version).toBe(1)
    if (!version) throw new Error('version non créée')

    // Extraction depuis la version
    await optionPresente(wrapper, '.bloc-extractions select', version.id)
    const formExtraction = wrapper.find('.bloc-extractions form')
    await formExtraction.find('select').setValue(version.id)
    await formExtraction.trigger('submit.prevent')
    await attendreQue(async () => (await db.extractions.count()) > 0)
    const extraction = (await db.extractions.toArray())[0]
    expect(extraction?.methode).toBe('saisie_manuelle')
    if (!extraction) throw new Error('extraction non créée')

    // Élément extrait (immutable)
    await optionPresente(wrapper, '.bloc-extraction-items select', extraction.id)
    const formItem = wrapper.find('.bloc-extraction-items form')
    await formItem.find('select').setValue(extraction.id)
    await formItem.find('textarea').setValue('F0 minimal requis : 15 minutes')
    await formItem.trigger('submit.prevent')
    await attendreQue(async () => (await db.extractionItems.count()) > 0)
    const item = (await db.extractionItems.toArray())[0]
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
    await attendreQue(async () => (await db.knowledgeItems.count()) > 0)

    const knowledgeItem = (await db.knowledgeItems.toArray())[0]
    expect(knowledgeItem?.statut).toBe('a_valider')

    // Validation humaine explicite
    await attendreQue(() => wrapper.find('.liste-knowledge li button').exists())
    const boutonsKnowledge = wrapper.find('.liste-knowledge li').findAll('button')
    await boutonsKnowledge[0]?.trigger('click')
    await attendreQue(async () => (await db.knowledgeItems.toArray())[0]?.statut === 'valide')

    const knowledgeItemValide = (await db.knowledgeItems.toArray())[0]
    expect(knowledgeItemValide?.statut).toBe('valide')
    expect(await db.confirmations.count()).toBe(1)
    expect((await db.confirmations.toArray())[0]?.decision).toBe('confirme')
  })

  test("un conflit déclaré reste ouvert tant qu'aucune résolution explicite n'est fournie (garde-fou)", async () => {
    const maintenant = new Date().toISOString()
    await db.knowledgeItems.bulkPut([
      {
        id: 'ki-1',
        client_id: 'client-1',
        extraction_item_id: 'item-1',
        libelle: 'F0 minimal',
        valeur_interpretee: '15 min',
        statut: 'a_valider',
        valide_par: null,
        audit_log: [],
        created_at: maintenant,
        updated_at: maintenant,
      },
      {
        id: 'ki-2',
        client_id: 'client-1',
        extraction_item_id: 'item-2',
        libelle: 'F0 minimal (autre document)',
        valeur_interpretee: '12 min',
        statut: 'a_valider',
        valide_par: null,
        audit_log: [],
        created_at: maintenant,
        updated_at: maintenant,
      },
    ])
    const wrapper = mount(SourceIntelligence, {
      props: { clientId: 'client-1' },
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
    await attendreQue(async () => (await db.conflicts.count()) > 0)

    expect((await db.conflicts.toArray())[0]?.statut).toBe('ouvert')

    // Résolution explicite
    await attendreQue(() => wrapper.find('.liste-conflits li').exists())
    const ligneConflit = wrapper.find('.liste-conflits li')
    await ligneConflit
      .find('input[type="text"]')
      .setValue('Document le plus récent retenu : 15 min')
    await ligneConflit.find('button').trigger('click')
    await attendreQue(async () => (await db.conflicts.toArray())[0]?.statut === 'resolu')

    const conflitResolu = (await db.conflicts.toArray())[0]
    expect(conflitResolu?.statut).toBe('resolu')
    expect(conflitResolu?.resolution).toBe('Document le plus récent retenu : 15 min')
  })
})
