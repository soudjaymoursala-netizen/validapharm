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
import { useQualityEventStore } from '../stores/useQualityEventStore'
import JournalAnomalies from './JournalAnomalies.vue'

const CLIENT_ID = 'client-1'

// `flushPromises` seul ne suffit pas toujours à attendre la fin d'une
// transaction IndexedDB (fake-indexeddb) déclenchée par un handler
// d'événement — même patron que `ComputerSystemAssessment.test.ts`.
async function attendreQue(condition: () => Promise<boolean> | boolean): Promise<void> {
  for (let tentative = 0; tentative < 50; tentative++) {
    await flushPromises()
    if (await condition()) return
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
        path: '/clients/:clientId/anomalies',
        name: 'journal-anomalies',
        component: { template: '<div />' },
      },
    ],
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

// L'écran charge deux stores en `Promise.all` dans `onMounted` — même
// profil de risque que `MissionWorkspace.vue`, qui a fait échouer ses
// tests en CI à trois reprises (`91fd8f6`, `f72eb41`, `1dcae5a`) faute de
// laisser le temps aux promesses résiduelles de se résoudre entre les
// tests. Filet ajouté préventivement plutôt que d'attendre un incident.
afterEach(async () => {
  for (let tour = 0; tour < 5; tour++) {
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  demonter()
})

describe('JournalAnomalies', () => {
  test('le bouton de création reste désactivé tant que le type et le titre ne sont pas renseignés', async () => {
    const wrapper = mount(JournalAnomalies, {
      props: { clientId: CLIENT_ID },
      global: { plugins: [routeurDeTest()] },
    })
    await flushPromises()

    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
  })

  test('crée une déviation, la liste immédiatement, jamais un verrou sur un autre module', async () => {
    const wrapper = mount(JournalAnomalies, {
      props: { clientId: CLIENT_ID },
      global: { plugins: [routeurDeTest()] },
    })
    await flushPromises()

    await wrapper.find('select').setValue('deviation')
    await wrapper.find('input[type="text"]').setValue('Dérive de température sonde AUT-042')
    await flushPromises()

    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
    await wrapper.find('.formulaire').trigger('submit.prevent')

    await attendreQue(
      async () => (await ctx.qualityEventRepo.listerEvenements(CLIENT_ID)).length > 0,
    )
    const evenements = await ctx.qualityEventRepo.listerEvenements(CLIENT_ID)
    expect(evenements).toHaveLength(1)
    expect(evenements[0]).toMatchObject({
      type: 'deviation',
      titre: 'Dérive de température sonde AUT-042',
      statut: 'ouvert',
    })
    await attendreQue(() => wrapper.text().includes('Dérive de température sonde AUT-042'))
  })

  test('affiche un état de chargement avant que les événements ne soient résolus', async () => {
    // Reproduit un événement déjà en base, chargé de manière asynchrone —
    // avant ce correctif, l'écran affichait à tort « Aucun événement pour
    // l'instant » tant que le onMounted n'avait pas terminé.
    const maintenant = new Date().toISOString()
    await ctx.qualityEventRepo.creerEvenement({
      id: crypto.randomUUID(),
      clientId: CLIENT_ID,
      type: 'deviation',
      titre: 'Événement déjà en base',
      description: '',
      origine: 'interne',
      referenceExterne: null,
      assetNodeId: null,
      processId: null,
      manufacturingContextId: null,
      statut: 'ouvert',
      auditLog: [],
      createdAt: maintenant,
      updatedAt: maintenant,
    })

    const wrapper = mount(JournalAnomalies, {
      props: { clientId: CLIENT_ID },
      global: { plugins: [routeurDeTest()] },
    })

    expect(wrapper.find('.etat-vide').text()).toBe('Chargement…')
    expect(wrapper.text()).not.toContain("Aucun événement pour l'instant")

    await attendreQue(() => wrapper.text().includes('Événement déjà en base'))
  })

  test('un changement de statut bloqué (événement supprimé entre-temps) affiche un message, ne casse pas silencieusement', async () => {
    const wrapper = mount(JournalAnomalies, {
      props: { clientId: CLIENT_ID },
      global: { plugins: [routeurDeTest()] },
    })
    await flushPromises()

    await wrapper.find('select').setValue('deviation')
    await wrapper.find('input[type="text"]').setValue('Fuite détectée cuve B12')
    await wrapper.find('.formulaire').trigger('submit.prevent')
    await attendreQue(
      async () => (await ctx.qualityEventRepo.listerEvenements(CLIENT_ID)).length > 0,
    )
    await attendreQue(() => wrapper.find('.liste-evenements select').exists())

    // Reproduit un événement supprimé/modifié entre-temps sur un autre
    // poste — avant ce correctif, le changement de statut échouait en
    // silence total, sans le moindre message, et le sélecteur affichait
    // malgré tout le nouveau statut jamais persisté (mutation optimiste
    // via `v-model` avant correctif).
    const evenementsStore = useQualityEventStore()
    evenementsStore.changerStatut = vi.fn().mockResolvedValue(null)

    const selectStatut = wrapper.find('.liste-evenements select')
    await selectStatut.setValue('cloture')
    await attendreQue(() => wrapper.find('.bandeau-erreur').exists())

    expect(wrapper.find('.bandeau-erreur').text()).toContain('supprimé entre-temps')
    const evenements = await ctx.qualityEventRepo.listerEvenements(CLIENT_ID)
    expect(evenements[0]?.statut).toBe('ouvert')
  })
})
