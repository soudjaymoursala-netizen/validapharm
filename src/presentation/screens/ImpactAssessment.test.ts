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
import ImpactAssessment from './ImpactAssessment.vue'

function routeurDeTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/clients', name: 'gestion-clients', component: { template: '<div />' } },
      {
        path: '/clients/:clientId/impact-assessment',
        name: 'impact-assessment',
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

const CLIENT_ID = 'client-1'

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

describe('ImpactAssessment', () => {
  test("n'affiche aucune question par défaut tant qu'aucune méthode n'est configurée", async () => {
    const wrapper = mount(ImpactAssessment, {
      props: { clientId: CLIENT_ID },
      global: { plugins: [routeurDeTest()] },
    })
    await attendreQue(() => wrapper.find('.bloc-config').exists())

    expect(wrapper.text()).toContain("Aucune méthode Impact Assessment n'est configurée")
  })

  test('affiche un état de chargement avant que le profil ne soit résolu', async () => {
    // Reproduit un profil déjà configuré, chargé de manière asynchrone —
    // avant ce correctif, l'écran affichait à tort « Aucune méthode Impact
    // Assessment n'est configurée » tant que le onMounted n'avait pas
    // terminé (même motif que RiskAssessmentAmdec.vue, `d68de27`).
    const maintenant = new Date().toISOString()
    await ctx.impactAssessmentRepo.creerProfil({
      id: crypto.randomUUID(),
      clientId: CLIENT_ID,
      version: 'v1',
      effectiveDate: maintenant,
      source: 'Procédure interne QD-001',
      origin: 'procedure_client',
      questions: [
        { id: crypto.randomUUID(), texte: { fr: 'Le système touche-t-il le produit ?' } },
      ],
      decisionRule: 'au_moins_un_oui_impact_direct',
      createdAt: maintenant,
    })

    const wrapper = mount(ImpactAssessment, {
      props: { clientId: CLIENT_ID },
      global: { plugins: [routeurDeTest()] },
    })

    expect(wrapper.find('.etat-vide').exists()).toBe(true)
    expect(wrapper.text()).not.toContain("Aucune méthode Impact Assessment n'est configurée")

    await attendreQue(() => wrapper.find('.bloc-evaluation').exists())
    expect(wrapper.find('.etat-vide').exists()).toBe(false)
  })

  test('configure une méthode puis calcule le verdict Direct Impact sur une réponse "oui"', async () => {
    const wrapper = mount(ImpactAssessment, {
      props: { clientId: CLIENT_ID },
      global: { plugins: [routeurDeTest()] },
    })
    await attendreQue(() => wrapper.find('.bloc-config').exists())

    await wrapper.find('input[type="text"]').setValue('Procédure interne QD-001')
    const questionInputs = wrapper.findAll('.ligne-question-config input[type="text"]')
    await questionInputs[0]?.setValue('Le système est-il en contact direct avec le produit ?')
    await wrapper.find('.formulaire').trigger('submit.prevent')

    await attendreQue(
      async () => (await ctx.impactAssessmentRepo.listerProfils(CLIENT_ID)).length > 0,
    )
    await flushPromises()

    expect(wrapper.text()).not.toContain("Aucune méthode Impact Assessment n'est configurée")

    // Les libellés de réponse doivent être lisibles, pas les valeurs brutes
    // de l'union (« sans_objet » plutôt que « Sans objet »).
    expect(wrapper.text()).toContain('Sans objet')
    expect(wrapper.text()).not.toContain('sans_objet')

    await wrapper.find('.nom-element input').setValue('Isolateur STICK002')
    const radioOui = wrapper.find('.liste-questions li input[type="radio"][value="oui"]')
    await radioOui.setValue(true)
    await flushPromises()

    expect(wrapper.text()).toContain('Direct Impact')

    const enregistrerBtn = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Enregistrer cette évaluation')
    await enregistrerBtn?.trigger('click')

    await attendreQue(
      async () => (await ctx.impactAssessmentRepo.listerEvaluations(CLIENT_ID)).length > 0,
    )
    const evals = await ctx.impactAssessmentRepo.listerEvaluations(CLIENT_ID)
    expect(evals[0]?.verdict).toBe('impact_direct')
    expect(evals[0]?.nomElement).toBe('Isolateur STICK002')

    await flushPromises()
    expect(wrapper.text()).toContain('Évaluations enregistrées')
    expect(wrapper.text()).toContain('Isolateur STICK002')

    const nouvelleBtn = wrapper.findAll('button').find((b) => b.text() === 'Nouvelle évaluation')
    await nouvelleBtn?.trigger('click')
    await flushPromises()
    expect((wrapper.find('.nom-element input').element as HTMLInputElement).value).toBe('')
    // L'historique reste visible après réinitialisation du formulaire.
    expect(wrapper.text()).toContain('Isolateur STICK002')
  })

  test('une réponse « Inconnu » sans aucun « Oui » : pas de verdict, évaluation enregistrée « à compléter »', async () => {
    const maintenant = new Date().toISOString()
    await ctx.impactAssessmentRepo.creerProfil({
      id: 'profil-1',
      clientId: CLIENT_ID,
      version: 'v1',
      effectiveDate: maintenant,
      source: 'Procédure interne QD-001',
      origin: 'procedure_client',
      questions: [
        { id: 'q1', texte: { fr: 'Le système touche-t-il le produit ?' } },
        { id: 'q2', texte: { fr: 'Le système génère-t-il des données GxP ?' } },
      ],
      decisionRule: 'au_moins_un_oui_impact_direct',
      createdAt: maintenant,
    })
    const wrapper = mount(ImpactAssessment, {
      props: { clientId: CLIENT_ID },
      global: { plugins: [routeurDeTest()] },
    })
    await attendreQue(() => wrapper.find('.bloc-evaluation').exists())

    await wrapper.find('.nom-element input').setValue('Balance B-12')
    const questions = wrapper.findAll('.liste-questions li')
    await questions[0]?.find('input[value="non"]').setValue(true)
    await questions[1]?.find('input[value="inconnu"]').setValue(true)
    await flushPromises()

    expect(wrapper.text()).toContain('À compléter')
    expect(wrapper.text()).not.toContain('Not Direct Impact')

    const enregistrerBtn = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Enregistrer cette évaluation')
    await enregistrerBtn?.trigger('click')
    await attendreQue(
      async () => (await ctx.impactAssessmentRepo.listerEvaluations(CLIENT_ID)).length > 0,
    )
    const evals = await ctx.impactAssessmentRepo.listerEvaluations(CLIENT_ID)
    expect(evals[0]?.verdict).toBeNull()

    // Une fois enregistrée, l'évaluation est figée : le verdict affiché
    // reste celui enregistré (audit UX du 26/09/2026).
    expect(questions[0]?.find('input[value="oui"]').attributes('disabled')).toBeDefined()

    // Nouvelle évaluation : un « Oui » suffit, l'inconnu restant
    // n'empêche plus de conclure.
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Nouvelle évaluation')
      ?.trigger('click')
    const questionsNouvelles = wrapper.findAll('.liste-questions li')
    await questionsNouvelles[0]?.find('input[value="oui"]').setValue(true)
    await questionsNouvelles[1]?.find('input[value="inconnu"]').setValue(true)
    await flushPromises()
    expect(wrapper.find('.resultat-partiel').text()).toContain('Direct Impact')
  })
})
