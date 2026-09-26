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
import { useTestDefinitionStore } from '../stores/useTestDefinitionStore'
import DefinitionTests from './DefinitionTests.vue'

const CLIENT_ID = 'client-1'

function routeurDeTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/clients', name: 'gestion-clients', component: { template: '<div />' } },
      {
        path: '/clients/:clientId/tests',
        name: 'definition-tests',
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

describe('DefinitionTests', () => {
  test('chaîne complète Requirement → Objectif → Candidat → Test approuvé → Couverture', async () => {
    const wrapper = mount(DefinitionTests, {
      props: { clientId: CLIENT_ID },
      global: { plugins: [routeurDeTest()] },
    })
    await attendreQue(() => wrapper.find('.bloc-requirements form').exists())

    // Exigence
    const formRequirement = wrapper.find('.bloc-requirements form')
    const inputsRequirement = formRequirement.findAll('input[type="text"]')
    await inputsRequirement[0]?.setValue('URS-001')
    await inputsRequirement[1]?.setValue('F0 minimal du cycle')
    await formRequirement.trigger('submit.prevent')
    await attendreQue(
      async () => (await ctx.testDefinitionRepo.listerRequirements(CLIENT_ID)).length > 0,
    )

    // Objectif de test
    const formObjectif = wrapper.find('.bloc-objectifs form')
    const requirements = await ctx.testDefinitionRepo.listerRequirements(CLIENT_ID)
    await formObjectif.find('select').setValue(requirements[0]?.id)
    await formObjectif.find('input[type="text"]').setValue('Vérifier F0 en charge nominale')
    await formObjectif.trigger('submit.prevent')
    await attendreQue(
      async () => (await ctx.testDefinitionRepo.listerTestObjectives(CLIENT_ID)).length > 0,
    )

    // Candidat
    const formCandidat = wrapper.find('.bloc-candidats form')
    const testObjectives = await ctx.testDefinitionRepo.listerTestObjectives(CLIENT_ID)
    await formCandidat.find('select').setValue(testObjectives[0]?.id)
    await formCandidat.find('input[type="text"]').setValue('Cycle en charge maximale')
    await formCandidat.trigger('submit.prevent')
    await attendreQue(
      async () => (await ctx.testDefinitionRepo.listerTestCandidates(CLIENT_ID)).length > 0,
    )

    // Accepter le candidat — jamais automatique (garde-fou 7a)
    await wrapper.find('.liste-candidats button').trigger('click')
    await attendreQue(
      async () =>
        (await ctx.testDefinitionRepo.listerTestCandidates(CLIENT_ID))[0]?.statut === 'accepte',
    )

    // Test depuis le candidat accepté, 1 étape
    const formTest = wrapper.find('.bloc-tests form')
    const testCandidates = await ctx.testDefinitionRepo.listerTestCandidates(CLIENT_ID)
    await formTest.find('select').setValue(testCandidates[0]?.id)
    await formTest.findAll('input[type="text"]')[0]?.setValue('OQ-TEST-01')
    const ligneEtape = formTest.find('.ligne-etape')
    const inputsEtape = ligneEtape.findAll('input')
    await inputsEtape[0]?.setValue('Lancer le cycle')
    await inputsEtape[1]?.setValue('Cycle démarre sans alarme')
    await formTest.trigger('submit.prevent')
    await attendreQue(async () => (await ctx.testDefinitionRepo.listerTests(CLIENT_ID)).length > 0)

    const testCree = (await ctx.testDefinitionRepo.listerTests(CLIENT_ID))[0]
    expect(testCree?.statut).toBe('brouillon')
    expect(testCree?.etapes).toHaveLength(1)

    // Approuver
    await wrapper.find('.liste-tests button').trigger('click')
    // Approbation signée (décision du 26/09/2026) : fenêtre de signature.
    await attendreQue(() => wrapper.find('.fond-modale input[type="password"]').exists())
    await wrapper.find('.fond-modale input[type="password"]').setValue('CoffreFort!2026')
    await wrapper.find('.fond-modale form').trigger('submit.prevent')
    await attendreQue(
      async () => (await ctx.testDefinitionRepo.listerTests(CLIENT_ID))[0]?.statut === 'approuve',
    )

    // Couverture — déclaration explicite, jamais déduite
    const formCouverture = wrapper.find('.bloc-couverture form')
    const selectsCouverture = formCouverture.findAll('select')
    await selectsCouverture[0]?.setValue(requirements[0]?.id)
    await selectsCouverture[1]?.setValue(testCree?.id)
    await formCouverture.trigger('submit.prevent')
    await attendreQue(
      async () => (await ctx.testDefinitionRepo.listerCouvertures(CLIENT_ID)).length > 0,
    )

    const couverture = (await ctx.testDefinitionRepo.listerCouvertures(CLIENT_ID))[0]
    expect(couverture?.requirementId).toBe(requirements[0]?.id)
    expect(couverture?.testId).toBe(testCree?.id)
  })

  test('un test ne peut pas être créé depuis un candidat non accepté (garde-fou 7a)', async () => {
    const wrapper = mount(DefinitionTests, {
      props: { clientId: CLIENT_ID },
      global: { plugins: [routeurDeTest()] },
    })
    await attendreQue(() => wrapper.find('.bloc-requirements form').exists())

    const formRequirement = wrapper.find('.bloc-requirements form')
    const inputsRequirement = formRequirement.findAll('input[type="text"]')
    await inputsRequirement[0]?.setValue('URS-002')
    await inputsRequirement[1]?.setValue('Exigence test')
    await formRequirement.trigger('submit.prevent')
    await attendreQue(
      async () => (await ctx.testDefinitionRepo.listerRequirements(CLIENT_ID)).length > 0,
    )

    const formObjectif = wrapper.find('.bloc-objectifs form')
    const requirements = await ctx.testDefinitionRepo.listerRequirements(CLIENT_ID)
    await formObjectif.find('select').setValue(requirements[0]?.id)
    await formObjectif.find('input[type="text"]').setValue('Objectif test')
    await formObjectif.trigger('submit.prevent')
    await attendreQue(
      async () => (await ctx.testDefinitionRepo.listerTestObjectives(CLIENT_ID)).length > 0,
    )

    const formCandidat = wrapper.find('.bloc-candidats form')
    const testObjectives = await ctx.testDefinitionRepo.listerTestObjectives(CLIENT_ID)
    await formCandidat.find('select').setValue(testObjectives[0]?.id)
    await formCandidat.find('input[type="text"]').setValue('Candidat non traité')
    await formCandidat.trigger('submit.prevent')
    await attendreQue(
      async () => (await ctx.testDefinitionRepo.listerTestCandidates(CLIENT_ID)).length > 0,
    )

    // Candidat encore "propose" (jamais accepté) : n'apparaît pas dans le
    // formulaire de création de test — seuls les candidats acceptés y figurent.
    const optionsTest = wrapper
      .find('.bloc-tests form select')
      .findAll('option')
      .map((o) => o.text())
    expect(optionsTest).not.toContain('Candidat non traité')
    expect(await ctx.testDefinitionRepo.listerTests(CLIENT_ID)).toHaveLength(0)
  })
})

describe('DefinitionTests — mutations de statut non vérifiées', () => {
  test('un échec d’acceptation de candidat affiche un message, ne casse pas silencieusement', async () => {
    const wrapper = mount(DefinitionTests, {
      props: { clientId: CLIENT_ID },
      global: { plugins: [routeurDeTest()] },
    })
    await attendreQue(() => wrapper.find('.bloc-requirements form').exists())

    const formRequirement = wrapper.find('.bloc-requirements form')
    const inputsRequirement = formRequirement.findAll('input[type="text"]')
    await inputsRequirement[0]?.setValue('URS-003')
    await inputsRequirement[1]?.setValue('Exigence test')
    await formRequirement.trigger('submit.prevent')
    await attendreQue(
      async () => (await ctx.testDefinitionRepo.listerRequirements(CLIENT_ID)).length > 0,
    )

    const formObjectif = wrapper.find('.bloc-objectifs form')
    const requirements = await ctx.testDefinitionRepo.listerRequirements(CLIENT_ID)
    await formObjectif.find('select').setValue(requirements[0]?.id)
    await formObjectif.find('input[type="text"]').setValue('Objectif test')
    await formObjectif.trigger('submit.prevent')
    await attendreQue(
      async () => (await ctx.testDefinitionRepo.listerTestObjectives(CLIENT_ID)).length > 0,
    )

    const formCandidat = wrapper.find('.bloc-candidats form')
    const testObjectives = await ctx.testDefinitionRepo.listerTestObjectives(CLIENT_ID)
    await formCandidat.find('select').setValue(testObjectives[0]?.id)
    await formCandidat.find('input[type="text"]').setValue('Candidat à accepter')
    await formCandidat.trigger('submit.prevent')
    await attendreQue(
      async () => (await ctx.testDefinitionRepo.listerTestCandidates(CLIENT_ID)).length > 0,
    )

    // Reproduit une réponse métier réelle (candidat supprimé/modifié
    // entre-temps sur un autre poste) — avant ce correctif, le clic sur
    // "Accepter" échouait en silence total, sans le moindre message.
    const testStore = useTestDefinitionStore()
    testStore.accepterTestCandidate = vi.fn().mockResolvedValue(null)

    await wrapper.find('.liste-candidats button').trigger('click')
    await attendreQue(() => wrapper.find('.bandeau-erreur').exists())

    expect(wrapper.find('.bandeau-erreur').text()).toContain("Impossible d'accepter ce candidat")
    expect((await ctx.testDefinitionRepo.listerTestCandidates(CLIENT_ID))[0]?.statut).toBe(
      'propose',
    )
  })

  test('un échec d’approbation de test affiche un message, ne casse pas silencieusement', async () => {
    const wrapper = mount(DefinitionTests, {
      props: { clientId: CLIENT_ID },
      global: { plugins: [routeurDeTest()] },
    })
    await attendreQue(() => wrapper.find('.bloc-requirements form').exists())

    const formRequirement = wrapper.find('.bloc-requirements form')
    const inputsRequirement = formRequirement.findAll('input[type="text"]')
    await inputsRequirement[0]?.setValue('URS-004')
    await inputsRequirement[1]?.setValue('Exigence test')
    await formRequirement.trigger('submit.prevent')
    await attendreQue(
      async () => (await ctx.testDefinitionRepo.listerRequirements(CLIENT_ID)).length > 0,
    )

    const formObjectif = wrapper.find('.bloc-objectifs form')
    const requirements = await ctx.testDefinitionRepo.listerRequirements(CLIENT_ID)
    await formObjectif.find('select').setValue(requirements[0]?.id)
    await formObjectif.find('input[type="text"]').setValue('Objectif test')
    await formObjectif.trigger('submit.prevent')
    await attendreQue(
      async () => (await ctx.testDefinitionRepo.listerTestObjectives(CLIENT_ID)).length > 0,
    )

    const formCandidat = wrapper.find('.bloc-candidats form')
    const testObjectives = await ctx.testDefinitionRepo.listerTestObjectives(CLIENT_ID)
    await formCandidat.find('select').setValue(testObjectives[0]?.id)
    await formCandidat.find('input[type="text"]').setValue('Candidat à tester')
    await formCandidat.trigger('submit.prevent')
    await attendreQue(
      async () => (await ctx.testDefinitionRepo.listerTestCandidates(CLIENT_ID)).length > 0,
    )

    await wrapper.find('.liste-candidats button').trigger('click')
    await attendreQue(
      async () =>
        (await ctx.testDefinitionRepo.listerTestCandidates(CLIENT_ID))[0]?.statut === 'accepte',
    )

    const formTest = wrapper.find('.bloc-tests form')
    const testCandidates = await ctx.testDefinitionRepo.listerTestCandidates(CLIENT_ID)
    await formTest.find('select').setValue(testCandidates[0]?.id)
    await formTest.findAll('input[type="text"]')[0]?.setValue('OQ-TEST-02')
    const ligneEtape = formTest.find('.ligne-etape')
    const inputsEtape = ligneEtape.findAll('input')
    await inputsEtape[0]?.setValue('Lancer le cycle')
    await inputsEtape[1]?.setValue('Cycle démarre sans alarme')
    await formTest.trigger('submit.prevent')
    await attendreQue(async () => (await ctx.testDefinitionRepo.listerTests(CLIENT_ID)).length > 0)

    // Reproduit un test supprimé/modifié entre-temps sur un autre poste —
    // avant ce correctif, le clic sur "Approuver" échouait en silence
    // total, sans le moindre message.
    const testStore = useTestDefinitionStore()
    testStore.approuverTest = vi.fn().mockResolvedValue({ erreur: 'introuvable' })

    await wrapper.find('.liste-tests button').trigger('click')
    // Approbation signée (décision du 26/09/2026) : fenêtre de signature.
    await attendreQue(() => wrapper.find('.fond-modale input[type="password"]').exists())
    await wrapper.find('.fond-modale input[type="password"]').setValue('CoffreFort!2026')
    await wrapper.find('.fond-modale form').trigger('submit.prevent')
    // Le refus s'affiche dans la fenêtre de signature, qui reste ouverte.
    await attendreQue(() => wrapper.find('.fond-modale .erreur').exists())

    expect(wrapper.find('.fond-modale .erreur').text()).toContain('Impossible d’approuver ce test')
    expect((await ctx.testDefinitionRepo.listerTests(CLIENT_ID))[0]?.statut).toBe('brouillon')
  })
})
