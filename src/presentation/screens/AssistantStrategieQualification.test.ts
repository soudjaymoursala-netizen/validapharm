import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Contexte } from '../../../workers/auth-worker/src/routeur'
import type { MethodProfileACFC } from '../../logique-metier/domaine/types'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import { useMethodProfileACFCStore } from '../stores/useMethodProfileACFCStore'
import AssistantStrategieQualification from './AssistantStrategieQualification.vue'

function routeurDeTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/clients/:clientId/strategie-qualification',
        name: 'assistant-strategie-qualification',
        component: { template: '<div />' },
      },
      {
        path: '/clients',
        name: 'gestion-clients',
        component: { template: '<div />' },
      },
      { path: '/clients/:clientId', name: 'fiche-client', component: { template: '<div />' } },
      {
        path: '/clients/:clientId/risk-assessment',
        name: 'risk-assessment-amdec',
        component: { template: '<div />' },
      },
      {
        path: '/clients/:clientId/structure-systeme/:noeudId/dossier-vivant',
        name: 'dossier-vivant-actif',
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

const CLIENT_ID = 'client-1'

async function creerProfilDeTest(): Promise<MethodProfileACFC> {
  const store = useMethodProfileACFCStore()
  await store.charger(CLIENT_ID)
  return store.creerNouvelleVersion(CLIENT_ID, {
    questions: [
      { texte: 'Le composant est-il en contact direct avec le produit ?' },
      { texte: "Une défaillance impacte-t-elle la qualité de l'unité ?" },
    ],
    source: 'Procédure interne QD-00098219',
    origin: 'procedure_client',
  })
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

async function monter() {
  const router = routeurDeTest()
  await router.push(`/clients/${CLIENT_ID}/strategie-qualification`)
  const wrapper = mount(AssistantStrategieQualification, {
    props: { clientId: CLIENT_ID },
    global: { plugins: [router] },
  })
  await attendreQue(() => !wrapper.text().includes('Chargement…'))
  return wrapper
}

describe('AssistantStrategieQualification — état de chargement', () => {
  test('affiche un état de chargement avant que la méthode ACFC ne soit résolue', async () => {
    await creerProfilDeTest()
    const router = routeurDeTest()
    await router.push(`/clients/${CLIENT_ID}/strategie-qualification`)
    const wrapper = mount(AssistantStrategieQualification, {
      props: { clientId: CLIENT_ID },
      global: { plugins: [router] },
    })

    // Avant que `onMounted` n'ait eu la moindre chance de résoudre
    // `methodeStore.charger`, l'écran ne doit jamais afficher par erreur «
    // Aucune méthode ACFC n'est configurée » alors qu'une méthode existe
    // bel et bien — seul un état de chargement neutre est correct ici.
    expect(wrapper.text()).toContain('Chargement…')
    expect(wrapper.text()).not.toContain("Aucune méthode ACFC n'est configurée")

    await attendreQue(() => !wrapper.text().includes('Chargement…'))
    expect(wrapper.text()).toContain('Procédure interne QD-00098219')
  })
})

describe('AssistantStrategieQualification — évaluation ACFC non vérifiée', () => {
  test("un échec d'enregistrement de l'évaluation affiche un message, ne casse pas silencieusement", async () => {
    await creerProfilDeTest()
    const wrapper = await monter()

    await wrapper.find('.nom-element input[type="text"]').setValue('Vanne de régulation V-101')
    const questions = wrapper.findAll('.liste-questions li')
    expect(questions).toHaveLength(2)
    for (const question of questions) {
      await question.find('input[value="non"]').setValue(true)
    }
    await attendreQue(() => wrapper.find('.resultat-partiel').exists())
    await wrapper.find('input[name="complexite"][value="catalogue"]').setValue(true)

    // Reproduit une réponse métier réelle (méthode ACFC réinitialisée ou
    // supprimée entre le chargement du formulaire et la soumission, sur un
    // autre poste) — avant ce correctif, le résultat de `creerEvaluation`
    // n'était jamais vérifié : "Évaluation enregistrée." s'affichait même
    // en cas d'échec silencieux côté store.
    const methodeStore = useMethodProfileACFCStore()
    methodeStore.creerEvaluation = vi.fn().mockResolvedValue({ erreur: 'aucun_profil_configure' })

    const boutonEnregistrer = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Enregistrer cette évaluation')
    await boutonEnregistrer?.trigger('click')
    await attendreQue(() => wrapper.find('.bandeau-erreur').exists())

    expect(wrapper.find('.bandeau-erreur').text()).toContain(
      "Impossible d'enregistrer l'évaluation",
    )
    expect(wrapper.find('.confirmation').exists()).toBe(false)
  })

  test('la conclusion (complexité × verdict) est enregistrée et reprise dans l’historique', async () => {
    await creerProfilDeTest()
    const wrapper = await monter()

    await wrapper.find('.nom-element input[type="text"]').setValue('Autoclave A1')
    const questions = wrapper.findAll('.liste-questions li')
    await questions[0]?.find('input[value="oui"]').setValue(true)
    await questions[1]?.find('input[value="non"]').setValue(true)
    await attendreQue(() => wrapper.find('.bloc-complexite').exists())

    const enregistrer = () =>
      wrapper.findAll('button').find((b) => b.text() === 'Enregistrer cette évaluation')
    // Sans complexité : bouton désactivé, et ce qui manque est dit.
    expect(enregistrer()?.attributes('disabled')).toBeDefined()
    expect(wrapper.find('.bloc-enregistrement').text()).toContain('la complexité')

    await wrapper.find('input[name="complexite"][value="specifique"]').setValue(true)
    await enregistrer()?.trigger('click')
    await attendreQue(() => wrapper.find('.confirmation').exists())

    const methodeStore = useMethodProfileACFCStore()
    expect(methodeStore.evaluations.at(-1)).toMatchObject({
      verdict: 'critique',
      complexite: 'specifique',
      conclusion: 'iq_oq_pq',
      version_grille: '0.2.0-provisoire',
    })
    await attendreQue(() => wrapper.find('.historique-acfc table').exists())
    expect(wrapper.find('.historique-acfc').text()).toContain('IQ+OQ+PQ')
    // Figé après enregistrement : la complexité ne se modifie plus.
    expect(
      wrapper.find('input[name="complexite"][value="catalogue"]').attributes('disabled'),
    ).toBeDefined()
  })
})
