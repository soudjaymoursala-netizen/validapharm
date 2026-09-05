import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { db } from '../../persistance/db'
import { IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1 } from '../identite/identiteLocale'
import ExecutionTests from './ExecutionTests.vue'

function routeurDeTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/clients', name: 'gestion-clients', component: { template: '<div />' } },
      {
        path: '/clients/:clientId/executions',
        name: 'execution-tests',
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

const maintenant = new Date().toISOString()

async function creerTestApprouve(): Promise<string> {
  const testId = crypto.randomUUID()
  await db.tests.put({
    id: testId,
    client_id: 'client-1',
    test_candidate_id: 'candidat-1',
    titre: 'OQ-TEST-01',
    description: '',
    etapes: [
      { id: 'etape-1', ordre: 1, action: 'Lancer le cycle', resultat_attendu: 'Sans alarme' },
      { id: 'etape-2', ordre: 2, action: 'Relever F0', resultat_attendu: 'F0 >= 15 min' },
    ],
    statut: 'approuve',
    audit_log: [
      { timestamp: maintenant, actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1, action: 'création' },
    ],
    created_at: maintenant,
    updated_at: maintenant,
  })
  return testId
}

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.tests.clear()
  await db.executions.clear()
  await db.executionSteps.clear()
  await db.measurements.clear()
  await db.executionEvents.clear()
  await db.evidences.clear()
  await db.evidenceLocations.clear()
})

describe('ExecutionTests', () => {
  test('démarre une exécution, enregistre un résultat + une mesure, consigne une preuve, clôture avec verdict explicite', async () => {
    const testId = await creerTestApprouve()
    const wrapper = mount(ExecutionTests, {
      props: { clientId: 'client-1' },
      global: { plugins: [routeurDeTest()] },
    })
    await flushPromises()
    // Le chargement du Test approuvé passe par plusieurs allers-retours
    // IndexedDB séquentiels dans onMounted (structure, tests, exécutions,
    // preuves) — un seul flushPromises() ne suffit pas toujours à les
    // vider avant que l'option n'apparaisse dans le <select>.
    await attendreQue(() =>
      wrapper
        .find('.bloc-demarrage select')
        .findAll('option')
        .some((o) => o.attributes('value') === testId),
    )

    // Démarrage
    const formDemarrage = wrapper.find('.bloc-demarrage form')
    await formDemarrage.find('select').setValue(testId)
    await formDemarrage.trigger('submit.prevent')
    await attendreQue(
      async () => (await db.executions.where('client_id').equals('client-1').count()) > 0,
    )

    const execution = (await db.executions.toArray())[0]
    expect(execution?.statut).toBe('en_cours')
    expect(execution?.verdict).toBeNull()
    if (!execution) throw new Error('exécution non créée')

    // Résultat de la première étape
    const premiereEtape = wrapper.find('.liste-etapes > li')
    await premiereEtape.find('select').setValue('conforme')
    await premiereEtape.find('button').trigger('click')
    await attendreQue(async () => (await db.executionSteps.count()) > 0)

    const etapeEnregistree = (await db.executionSteps.toArray())[0]
    expect(etapeEnregistree?.resultat).toBe('conforme')
    expect(etapeEnregistree?.test_step_id).toBe('etape-1')

    // Mesure sur cette étape
    await flushPromises()
    const zoneMesure = wrapper.find('.ajout-mesure')
    const inputsMesure = zoneMesure.findAll('input[type="text"]')
    await inputsMesure[0]?.setValue('F0 sonde froide')
    await inputsMesure[1]?.setValue('15.4')
    await inputsMesure[2]?.setValue('min')
    await zoneMesure.find('button').trigger('click')
    await attendreQue(async () => (await db.measurements.count()) > 0)
    expect((await db.measurements.toArray())[0]?.valeur).toBe('15.4')

    // Preuve native
    const zonePreuve = wrapper.find('.carte-execution').findAll('.ligne-formulaire')[1]
    const inputsPreuve = zonePreuve?.findAll('input[type="text"]') ?? []
    await inputsPreuve[0]?.setValue('Observation directe du cycle')
    await zonePreuve?.find('button').trigger('click')
    await attendreQue(
      async () => (await db.evidences.where('execution_id').equals(execution.id).count()) > 0,
    )
    expect((await db.evidences.toArray())[0]?.type).toBe('native')

    // Clôture avec verdict explicite — jamais déduit des résultats d'étape
    const zoneCloture = wrapper.find('.carte-execution').findAll('.ligne-formulaire').at(-1)
    await zoneCloture?.find('select').setValue('conforme')
    await zoneCloture?.find('button').trigger('click')
    await attendreQue(async () => (await db.executions.toArray())[0]?.statut === 'terminee')

    const executionCloturee = (await db.executions.toArray())[0]
    expect(executionCloturee?.verdict).toBe('conforme')
    expect(executionCloturee?.date_fin).not.toBeNull()
  })

  test("un test non approuvé n'apparaît pas dans la liste de démarrage (garde-fou 7b)", async () => {
    await db.tests.put({
      id: crypto.randomUUID(),
      client_id: 'client-1',
      test_candidate_id: 'candidat-2',
      titre: 'Test brouillon',
      description: '',
      etapes: [],
      statut: 'brouillon',
      audit_log: [],
      created_at: maintenant,
      updated_at: maintenant,
    })
    const wrapper = mount(ExecutionTests, {
      props: { clientId: 'client-1' },
      global: { plugins: [routeurDeTest()] },
    })
    await flushPromises()

    const options = wrapper
      .find('.bloc-demarrage select')
      .findAll('option')
      .map((o) => o.text())
    expect(options).not.toContain('Test brouillon')
  })
})
