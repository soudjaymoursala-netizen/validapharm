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
import { IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1 } from '../identite/identiteLocale'
import { useExecutionStore } from '../stores/useExecutionStore'
import ExecutionTests from './ExecutionTests.vue'

const CLIENT_ID = 'client-1'

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

const maintenant = new Date().toISOString()

let ctx: Contexte
let demonter: () => void

async function creerTestApprouve(): Promise<string> {
  const testId = crypto.randomUUID()
  await ctx.testDefinitionRepo.creerTest({
    id: testId,
    clientId: CLIENT_ID,
    testCandidateId: 'candidat-1',
    titre: 'OQ-TEST-01',
    description: '',
    etapes: [
      { id: 'etape-1', ordre: 1, action: 'Lancer le cycle', resultatAttendu: 'Sans alarme' },
      { id: 'etape-2', ordre: 2, action: 'Relever F0', resultatAttendu: 'F0 >= 15 min' },
    ],
    statut: 'approuve',
    auditLog: [
      { timestamp: maintenant, actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1, action: 'création' },
    ],
    createdAt: maintenant,
    updatedAt: maintenant,
  })
  return testId
}

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
    createdAt: maintenant,
    updatedAt: maintenant,
  })
})

afterEach(() => {
  demonter()
})

// La clôture (irréversible) demande désormais une confirmation explicite.
beforeEach(() => {
  vi.spyOn(window, 'confirm').mockReturnValue(true)
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
    await attendreQue(async () => (await ctx.executionRepo.listerExecutions(CLIENT_ID)).length > 0)

    const execution = (await ctx.executionRepo.listerExecutions(CLIENT_ID))[0]
    expect(execution?.statut).toBe('en_cours')
    expect(execution?.verdict).toBeNull()
    if (!execution) throw new Error('exécution non créée')

    // Résultat de la première étape
    const premiereEtape = wrapper.find('.liste-etapes > li')
    await premiereEtape.find('select').setValue('conforme')
    await premiereEtape.find('button').trigger('click')
    await attendreQue(
      async () => (await ctx.executionRepo.listerExecutionSteps(CLIENT_ID)).length > 0,
    )

    const etapeEnregistree = (await ctx.executionRepo.listerExecutionSteps(CLIENT_ID))[0]
    expect(etapeEnregistree?.resultat).toBe('conforme')
    expect(etapeEnregistree?.testStepId).toBe('etape-1')

    // Mesure sur cette étape
    await flushPromises()
    const zoneMesure = wrapper.find('.ajout-mesure')
    const inputsMesure = zoneMesure.findAll('input[type="text"]')
    await inputsMesure[0]?.setValue('F0 sonde froide')
    await inputsMesure[1]?.setValue('15.4')
    await inputsMesure[2]?.setValue('min')
    await zoneMesure.find('button').trigger('click')
    await attendreQue(
      async () => (await ctx.executionRepo.listerMeasurements(CLIENT_ID)).length > 0,
    )
    expect((await ctx.executionRepo.listerMeasurements(CLIENT_ID))[0]?.valeur).toBe('15.4')

    // Preuve native
    const zonePreuve = wrapper.find('.carte-execution').findAll('.ligne-formulaire')[1]
    const inputsPreuve = zonePreuve?.findAll('input[type="text"]') ?? []
    await inputsPreuve[0]?.setValue('Observation directe du cycle')
    await zonePreuve?.find('button').trigger('click')
    await attendreQue(
      async () =>
        (await ctx.evidenceRepo.listerEvidences(CLIENT_ID)).filter(
          (e) => e.executionId === execution.id,
        ).length > 0,
    )
    expect((await ctx.evidenceRepo.listerEvidences(CLIENT_ID))[0]?.type).toBe('native')

    // Clôture avec verdict explicite — jamais déduit des résultats d'étape
    const zoneCloture = wrapper.find('.carte-execution').findAll('.ligne-formulaire').at(-1)
    await zoneCloture?.find('select').setValue('conforme')
    await zoneCloture?.find('button').trigger('click')
    await attendreQue(
      async () => (await ctx.executionRepo.listerExecutions(CLIENT_ID))[0]?.statut === 'terminee',
    )

    const executionCloturee = (await ctx.executionRepo.listerExecutions(CLIENT_ID))[0]
    expect(executionCloturee?.verdict).toBe('conforme')
    expect(executionCloturee?.dateFin).not.toBeNull()
  })

  test("un test non approuvé n'apparaît pas dans la liste de démarrage (garde-fou 7b)", async () => {
    await ctx.testDefinitionRepo.creerTest({
      id: crypto.randomUUID(),
      clientId: CLIENT_ID,
      testCandidateId: 'candidat-2',
      titre: 'Test brouillon',
      description: '',
      etapes: [],
      statut: 'brouillon',
      auditLog: [],
      createdAt: maintenant,
      updatedAt: maintenant,
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

describe('ExecutionTests — mutations non vérifiées', () => {
  async function demarrerExecutionDeTest(): Promise<{
    wrapper: ReturnType<typeof mount>
    executionId: string
  }> {
    const testId = await creerTestApprouve()
    const wrapper = mount(ExecutionTests, {
      props: { clientId: 'client-1' },
      global: { plugins: [routeurDeTest()] },
    })
    await attendreQue(() =>
      wrapper
        .find('.bloc-demarrage select')
        .findAll('option')
        .some((o) => o.attributes('value') === testId),
    )

    const formDemarrage = wrapper.find('.bloc-demarrage form')
    await formDemarrage.find('select').setValue(testId)
    await formDemarrage.trigger('submit.prevent')
    await attendreQue(async () => (await ctx.executionRepo.listerExecutions(CLIENT_ID)).length > 0)
    const executionId = (await ctx.executionRepo.listerExecutions(CLIENT_ID))[0]?.id
    if (!executionId) throw new Error('exécution non créée')
    return { wrapper, executionId }
  }

  test('une clôture bloquée (déjà clôturée entre-temps) affiche un message, ne casse pas silencieusement', async () => {
    const { wrapper } = await demarrerExecutionDeTest()

    const zoneCloture = wrapper.find('.carte-execution').findAll('.ligne-formulaire').at(-1)
    await zoneCloture?.find('select').setValue('conforme')

    // Reproduit une clôture déjà effectuée depuis un autre poste (garde-fou
    // d'immutabilité post-clôture, explicitement annoncé à l'utilisateur
    // dans le rappel de l'écran) — avant ce correctif, le clic échouait en
    // silence total.
    const executionStore = useExecutionStore()
    executionStore.cloturerExecution = vi
      .fn()
      .mockResolvedValue({ erreur: 'execution_deja_cloturee' })

    await zoneCloture?.find('button').trigger('click')
    await attendreQue(() => wrapper.find('.bandeau-erreur').exists())

    expect(wrapper.find('.bandeau-erreur').text()).toContain('déjà clôturée')
    expect((await ctx.executionRepo.listerExecutions(CLIENT_ID))[0]?.statut).toBe('en_cours')
  })

  test('un enregistrement de résultat bloqué (exécution déjà clôturée entre-temps) affiche un message', async () => {
    const { wrapper, executionId } = await demarrerExecutionDeTest()

    const premiereEtape = wrapper.find('.liste-etapes > li')
    await premiereEtape.find('select').setValue('conforme')

    const executionStore = useExecutionStore()
    executionStore.enregistrerResultatEtape = vi
      .fn()
      .mockResolvedValue({ erreur: 'execution_deja_cloturee' })

    await premiereEtape.find('button').trigger('click')
    await attendreQue(() => wrapper.find('.bandeau-erreur').exists())

    expect(wrapper.find('.bandeau-erreur').text()).toContain('déjà clôturée')
    const etapes = await ctx.executionRepo.listerExecutionSteps(CLIENT_ID)
    expect(etapes.filter((e) => e.executionId === executionId)).toHaveLength(0)
  })
})
