import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { QualityEvent } from '../../logique-metier/domaine/types'
import { db } from '../../persistance/db'
import MissionWorkspace from './MissionWorkspace.vue'

// Le composant construit lui-même ses adaptateurs IA via
// `construireAdaptateursIA`/`adaptateurAvecBascule` — ceux-ci
// parleraient à un vrai relais/Ollama en réseau. On les remplace par un
// double de test entièrement contrôlable, même principe que le mock de
// `ProviderAdapter` dans `useReasoningEngineStore.test.ts`.
const { fournisseurEnvoyerMessage } = vi.hoisted(() => ({ fournisseurEnvoyerMessage: vi.fn() }))

vi.mock('../stores/construireAdaptateursIA', () => ({
  construireAdaptateursIA: () => ({
    principal: { nomAffiche: 'Test', estCloud: true, envoyerMessage: fournisseurEnvoyerMessage },
    local: { nomAffiche: 'Local', estCloud: false, envoyerMessage: fournisseurEnvoyerMessage },
  }),
  adaptateurAvecBascule: (principal: unknown) => principal,
}))

function reponse(texte: string) {
  return { texte, version_moteur: 'v1', citations: [] }
}

function routeurDeTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/clients/:clientId/missions/:missionId',
        name: 'mission-workspace',
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

const CLIENT_ID = 'client-1'
const MISSION_ID = 'mission-1'

async function creerMissionDeTest(): Promise<void> {
  await db.missions.put({
    id: MISSION_ID,
    client_id: CLIENT_ID,
    workspace_id: null,
    asset_node_id: null,
    titre: 'Qualification granulateur GR-01',
    description: 'Requalification suite changement de recette',
    statut: 'ouverte',
    audit_log: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  })
}

async function creerQualityEventDeTest(): Promise<QualityEvent> {
  const evenement: QualityEvent = {
    id: 'qe-1',
    client_id: CLIENT_ID,
    type: 'deviation',
    titre: 'Déviation débit granulateur',
    description: '',
    origine: 'interne',
    reference_externe: null,
    asset_node_id: null,
    process_id: null,
    manufacturing_context_id: null,
    statut: 'ouvert',
    audit_log: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  }
  await db.qualityEvents.put(evenement)
  return evenement
}

async function monter() {
  const router = routeurDeTest()
  await router.push(`/clients/${CLIENT_ID}/missions/${MISSION_ID}`)
  const wrapper = mount(MissionWorkspace, {
    props: { clientId: CLIENT_ID, missionId: MISSION_ID },
    global: { plugins: [router] },
  })
  await attendreQue(() => wrapper.text().includes('Qualification granulateur GR-01'))
  return wrapper
}

beforeEach(async () => {
  setActivePinia(createPinia())
  fournisseurEnvoyerMessage.mockReset()
  await db.missions.clear()
  await db.activities.clear()
  await db.dependencies.clear()
  await db.associationsMissionQualityEvent.clear()
  await db.qualityEvents.clear()
  await db.contextSnapshots.clear()
  await db.contextSnapshotItems.clear()
  await db.aiConfigurations.clear()
  await db.aiRequests.clear()
  await db.aiResponses.clear()
  await db.citationsAIResponse.clear()
  await db.organizations.clear()
  await db.workspaces.clear()
  await db.assetNodes.clear()
  await db.clientConfigs.clear()
  await db.connexionRelaisIA.clear()
  await db.requirements.clear()
  await db.couvertures.clear()
  await db.tests.clear()
  await creerMissionDeTest()
})

describe('MissionWorkspace — Activités et dépendances', () => {
  test('crée deux activités puis lie une dépendance entre elles', async () => {
    const wrapper = await monter()

    const formulaireActivite = wrapper.find('section.activites form')
    await formulaireActivite.find('input[type="text"]').setValue('Préparer protocole')
    await formulaireActivite.trigger('submit.prevent')
    await attendreQue(
      async () => (await db.activities.where('mission_id').equals(MISSION_ID).count()) === 1,
    )

    await formulaireActivite.find('input[type="text"]').setValue('Exécuter essais')
    await formulaireActivite.trigger('submit.prevent')
    await attendreQue(
      async () => (await db.activities.where('mission_id').equals(MISSION_ID).count()) === 2,
    )

    expect(wrapper.text()).toContain('Préparer protocole')
    expect(wrapper.text()).toContain('Exécuter essais')

    const activitesPersistees = await db.activities.toArray()
    const preparerProtocole = activitesPersistees.find((a) => a.titre === 'Préparer protocole')
    const executerEssais = activitesPersistees.find((a) => a.titre === 'Exécuter essais')

    const formulaireDependance = wrapper.find('section.activites form:nth-of-type(2)')
    expect(formulaireDependance.exists()).toBe(true)
    const selects = formulaireDependance.findAll('select')
    await selects[0]?.setValue(executerEssais?.id)
    await selects[1]?.setValue(preparerProtocole?.id)
    await formulaireDependance.trigger('submit.prevent')

    await attendreQue(async () => (await db.dependencies.count()) === 1)
    const dependances = await db.dependencies.toArray()
    expect(dependances).toHaveLength(1)
  })

  test("change le statut d'une activité", async () => {
    const wrapper = await monter()
    const formulaireActivite = wrapper.find('section.activites form')
    await formulaireActivite.find('input[type="text"]').setValue('Préparer protocole')
    await formulaireActivite.trigger('submit.prevent')
    await attendreQue(async () => (await db.activities.count()) === 1)

    await wrapper.vm.$nextTick()
    const selectStatut = wrapper.find('section.activites li select')
    await selectStatut.setValue('terminee')

    await attendreQue(async () => (await db.activities.toArray())[0]?.statut === 'terminee')
    expect((await db.activities.toArray())[0]?.statut).toBe('terminee')
  })
})

describe('MissionWorkspace — Événements qualité associés', () => {
  test('associe un QualityEvent existant à la Mission', async () => {
    await creerQualityEventDeTest()
    const wrapper = await monter()

    const formulaire = wrapper.find('section.quality-events form')
    await formulaire.find('select').setValue('qe-1')
    await formulaire.trigger('submit.prevent')

    await attendreQue(async () => (await db.associationsMissionQualityEvent.count()) === 1)
    const associations = await db.associationsMissionQualityEvent.toArray()
    expect(associations[0]?.mission_id).toBe(MISSION_ID)
    expect(associations[0]?.quality_event_id).toBe('qe-1')
  })
})

describe('MissionWorkspace — Contexte', () => {
  test('assemble un ContextSnapshot (vide, Mission sans workspace/actif) sans erreur', async () => {
    const wrapper = await monter()

    await wrapper.find('section.contexte button').trigger('click')
    await attendreQue(async () => (await db.contextSnapshots.count()) === 1)

    expect(wrapper.text()).toContain('Aucun élément de contexte résolu.')
  })
})

describe('MissionWorkspace — Raisonnement', () => {
  test('invoque le Reasoning Engine et affiche le badge de confiance', async () => {
    // Une confiance "connu" n'est retenue que si toutes les citations sont
    // vérifiables via un appel d'outil réellement effectué dans la session
    // (garde déterministe de `boucleRaisonnement.ts`) — on simule donc un
    // appel d'outil avant la réponse finale, comme dans le scénario réel de
    // `useReasoningEngineStore.test.ts`.
    await db.requirements.put({
      id: 'req-1',
      client_id: CLIENT_ID,
      reference: 'REQ-1',
      titre: 'Débit stable',
      description: '',
      asset_node_id: 'granulateur-01',
      process_id: null,
      audit_log: [],
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    })
    fournisseurEnvoyerMessage
      .mockResolvedValueOnce(
        reponse(
          'APPEL_OUTIL: {"nom": "lister_requirements_pour_actif", "parametres": {"asset_node_id": "granulateur-01"}}',
        ),
      )
      .mockResolvedValueOnce(
        reponse(
          'REPONSE_FINALE: {"texte": "Analyse terminée", "etat_confiance": "connu", "citations": ["req-1"]}',
        ),
      )

    const wrapper = await monter()
    const formulaireRaisonnement = wrapper.find('section.raisonnement form')
    await formulaireRaisonnement
      .find('input[type="text"]')
      .setValue("Évaluer l'impact du changement")
    await formulaireRaisonnement.trigger('submit.prevent')

    await attendreQue(async () => (await db.aiResponses.count()) === 1)
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Analyse terminée')
    const badge = wrapper.find('.badge-confiance--connu')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toContain('Connu (vérifié)')
  })

  test('une réponse non vérifiable est rétrogradée à "à vérifier"', async () => {
    fournisseurEnvoyerMessage.mockResolvedValueOnce(
      reponse(
        'REPONSE_FINALE: {"texte": "Réponse", "etat_confiance": "connu", "citations": ["id-jamais-vu"]}',
      ),
    )

    const wrapper = await monter()
    const formulaireRaisonnement = wrapper.find('section.raisonnement form')
    await formulaireRaisonnement.find('input[type="text"]').setValue('Objectif')
    await formulaireRaisonnement.trigger('submit.prevent')

    await attendreQue(async () => (await db.aiResponses.count()) === 1)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.badge-confiance--a_verifier').exists()).toBe(true)
  })

  test('un échec réseau du fournisseur IA est affiché, jamais un échec silencieux', async () => {
    fournisseurEnvoyerMessage.mockRejectedValueOnce(new Error('Appel au relais IA échoué (404).'))

    const wrapper = await monter()
    const formulaireRaisonnement = wrapper.find('section.raisonnement form')
    await formulaireRaisonnement.find('input[type="text"]').setValue('Objectif')
    await formulaireRaisonnement.trigger('submit.prevent')

    await attendreQue(() => wrapper.find('.bandeau-erreur').exists())
    expect(wrapper.find('[role="alert"]').text()).toContain('Appel au relais IA échoué (404).')
    expect(await db.aiResponses.count()).toBe(0)
  })
})
