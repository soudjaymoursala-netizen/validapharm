import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { MethodProfileACFC } from '../../logique-metier/domaine/types'
import { db } from '../../persistance/db'
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
    ],
  })
}

async function attendreQue(condition: () => boolean): Promise<void> {
  for (let tentative = 0; tentative < 50; tentative++) {
    await flushPromises()
    if (condition()) return
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  throw new Error('attendreQue : condition jamais satisfaite')
}

const CLIENT_ID = 'client-1'

async function creerProfilDeTest(): Promise<MethodProfileACFC> {
  const profil: MethodProfileACFC = {
    id: 'profil-1',
    client_id: CLIENT_ID,
    version: 'v1',
    effective_date: '2026-01-01T00:00:00.000Z',
    source: 'Procédure interne QD-00098219',
    origin: 'procedure_client',
    questions: [
      { id: 'q1', texte: { fr: 'Le composant est-il en contact direct avec le produit ?' } },
      { id: 'q2', texte: { fr: "Une défaillance impacte-t-elle la qualité de l'unité ?" } },
    ],
    decision_rule: 'au_moins_un_oui_critique',
    created_at: '2026-01-01T00:00:00.000Z',
  }
  await db.methodProfilesACFC.put(profil)
  return profil
}

let demonter: () => void

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.methodProfilesACFC.clear()
  await db.evaluationsACFC.clear()
  await reinitialiserAuthDeTest()
  demonter = installerFauxWorkerAuth().demonter
  await connecterAdminDeTest()
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
})
