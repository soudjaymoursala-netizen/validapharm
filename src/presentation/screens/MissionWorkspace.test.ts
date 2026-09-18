import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Contexte } from '../../../workers/auth-worker/src/routeur'
import { db } from '../../persistance/db'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import { useClientsStore } from '../stores/useClientsStore'
import { useMissionStore } from '../stores/useMissionStore'
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
      {
        path: '/clients/:clientId/missions',
        name: 'liste-missions',
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
  await ctx.missionRepo.creerMission({
    id: MISSION_ID,
    clientId: CLIENT_ID,
    workspaceId: null,
    assetNodeId: null,
    titre: 'Qualification granulateur GR-01',
    description: 'Requalification suite changement de recette',
    statut: 'ouverte',
    auditLog: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  })
}

async function creerQualityEventDeTest(): Promise<void> {
  await ctx.qualityEventRepo.creerEvenement({
    id: 'qe-1',
    clientId: CLIENT_ID,
    type: 'deviation',
    titre: 'Déviation débit granulateur',
    description: '',
    origine: 'interne',
    referenceExterne: null,
    assetNodeId: null,
    processId: null,
    manufacturingContextId: null,
    statut: 'ouvert',
    auditLog: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  })
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

let ctx: Contexte
let demonter: () => void

beforeEach(async () => {
  setActivePinia(createPinia())
  fournisseurEnvoyerMessage.mockReset()
  await db.clientConfigs.clear()
  // QualityEvent migré vers le Worker/D1 (Phase 5b du chantier de
  // migration D1) — un client réel doit exister pour que
  // `qualityEventStore.charger` (appelé par `onMounted`) soit autorisé par
  // `exigerAccesClient`, même patron que les autres domaines déjà migrés
  // consommés par cet écran (structure système, process context, ...).
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
  await creerMissionDeTest()
})

// `MissionWorkspace.onMounted` charge 9 stores en `Promise.all`, mais
// `monter()` n'attend que le titre de la mission — les autres chargements
// (contextStore, reasoningStore, qualityEventStore, structureStore,
// processContextStore, organizationStore, configStore, relaisStore)
// peuvent encore être en vol quand un test se termine, et aucun wrapper
// n'est jamais démonté d'un test à l'autre dans ce fichier. Sans cette
// pause, ces chargements résiduels continuent en arrière-plan pendant le
// test suivant, créant une contention de macrotâches (fake-indexeddb) qui
// a fait échouer un test plus loin dans ce fichier à plusieurs reprises en
// CI (jamais reproduit en local, où il n'y a pas cette accumulation de
// bruit de fond) malgré deux tentatives de fiabilisation ciblées
// uniquement sur ce test — la vraie cause était plus en amont.
afterEach(async () => {
  for (let tour = 0; tour < 5; tour++) {
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  demonter()
})

describe('MissionWorkspace — Activités et dépendances', () => {
  test('crée deux activités puis lie une dépendance entre elles', async () => {
    const wrapper = await monter()

    const formulaireActivite = wrapper.find('section.activites form')
    await formulaireActivite.find('input[type="text"]').setValue('Préparer protocole')
    await formulaireActivite.trigger('submit.prevent')
    await attendreQue(
      async () =>
        (await ctx.missionRepo.listerActivities(CLIENT_ID)).filter(
          (a) => a.missionId === MISSION_ID,
        ).length === 1,
    )

    await formulaireActivite.find('input[type="text"]').setValue('Exécuter essais')
    await formulaireActivite.trigger('submit.prevent')
    await attendreQue(
      async () =>
        (await ctx.missionRepo.listerActivities(CLIENT_ID)).filter(
          (a) => a.missionId === MISSION_ID,
        ).length === 2,
    )

    expect(wrapper.text()).toContain('Préparer protocole')
    expect(wrapper.text()).toContain('Exécuter essais')

    const activitesPersistees = await ctx.missionRepo.listerActivities(CLIENT_ID)
    const preparerProtocole = activitesPersistees.find((a) => a.titre === 'Préparer protocole')
    const executerEssais = activitesPersistees.find((a) => a.titre === 'Exécuter essais')

    const formulaireDependance = wrapper.find('section.activites form:nth-of-type(2)')
    expect(formulaireDependance.exists()).toBe(true)
    const selects = formulaireDependance.findAll('select')
    await selects[0]?.setValue(executerEssais?.id)
    await selects[1]?.setValue(preparerProtocole?.id)
    await formulaireDependance.trigger('submit.prevent')

    await attendreQue(
      async () => (await ctx.missionRepo.listerDependencies(CLIENT_ID)).length === 1,
    )
    const dependances = await ctx.missionRepo.listerDependencies(CLIENT_ID)
    expect(dependances).toHaveLength(1)
  })

  test("change le statut d'une activité", async () => {
    const wrapper = await monter()
    const formulaireActivite = wrapper.find('section.activites form')
    await formulaireActivite.find('input[type="text"]').setValue('Préparer protocole')
    await formulaireActivite.trigger('submit.prevent')
    await attendreQue(async () => (await ctx.missionRepo.listerActivities(CLIENT_ID)).length === 1)

    await wrapper.vm.$nextTick()
    const selectStatut = wrapper.find('section.activites li select')
    await selectStatut.setValue('terminee')

    await attendreQue(
      async () => (await ctx.missionRepo.listerActivities(CLIENT_ID))[0]?.statut === 'terminee',
    )
    expect((await ctx.missionRepo.listerActivities(CLIENT_ID))[0]?.statut).toBe('terminee')
  })
})

describe('MissionWorkspace — Événements qualité associés', () => {
  test('associe un QualityEvent existant à la Mission', async () => {
    await creerQualityEventDeTest()
    const wrapper = await monter()

    const formulaire = wrapper.find('section.quality-events form')
    // Le chargement du QualityEvent (`qualityEventStore.charger`) est
    // parallèle à celui de la Mission (`Promise.all` dans `onMounted`) —
    // `monter()` n'attend que le titre de la Mission, pas les options de ce
    // <select> : on attend explicitement leur apparition avant d'interagir,
    // sans quoi une course entre les deux chargements rendrait ce test
    // intermittent (flaky).
    await attendreQue(() => formulaire.find('option[value="qe-1"]').exists())
    await formulaire.find('select').setValue('qe-1')
    await formulaire.trigger('submit.prevent')

    await attendreQue(
      async () =>
        (await ctx.missionRepo.listerAssociationsMissionQualityEvent(CLIENT_ID)).length === 1,
    )
    const associations = await ctx.missionRepo.listerAssociationsMissionQualityEvent(CLIENT_ID)
    expect(associations[0]?.missionId).toBe(MISSION_ID)
    expect(associations[0]?.qualityEventId).toBe('qe-1')
  })
})

describe('MissionWorkspace — Contexte', () => {
  test('assemble un ContextSnapshot (vide, Mission sans workspace/actif) sans erreur', async () => {
    const wrapper = await monter()

    await wrapper.find('section.contexte button').trigger('click')
    await attendreQue(
      async () => (await ctx.contextSnapshotRepo.listerSnapshots(CLIENT_ID)).length === 1,
    )

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
    await ctx.testDefinitionRepo.creerRequirement({
      id: 'req-1',
      clientId: CLIENT_ID,
      reference: 'REQ-1',
      titre: 'Débit stable',
      description: '',
      assetNodeId: 'granulateur-01',
      processId: null,
      auditLog: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
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

    await attendreQue(
      async () => (await ctx.reasoningEngineRepo.listerResponses(CLIENT_ID)).length === 1,
    )
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

    await attendreQue(
      async () => (await ctx.reasoningEngineRepo.listerResponses(CLIENT_ID)).length === 1,
    )
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
    expect(await ctx.reasoningEngineRepo.listerResponses(CLIENT_ID)).toHaveLength(0)
  })
})

describe('MissionWorkspace — navigation retour vers la liste des missions', () => {
  let demonter: () => void
  let ctxLocal: Contexte

  beforeEach(async () => {
    await reinitialiserAuthDeTest()
    const installation = installerFauxWorkerAuth()
    demonter = installation.demonter
    ctxLocal = installation.ctx
    await connecterAdminDeTest()
  })

  afterEach(() => {
    demonter()
  })

  test('affiche un lien retour vers la liste des missions, avec le nom du client une fois chargé', async () => {
    const clientsStore = useClientsStore()
    const client = await clientsStore.creerClient({ name: 'PharmaTech Solutions' })
    if ('erreur' in client) throw client

    await ctxLocal.missionRepo.creerMission({
      id: MISSION_ID,
      clientId: client.id,
      workspaceId: null,
      assetNodeId: null,
      titre: 'Qualification granulateur GR-01',
      description: '',
      statut: 'ouverte',
      auditLog: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })

    const router = routeurDeTest()
    await router.push(`/clients/${client.id}/missions/${MISSION_ID}`)
    const wrapper = mount(MissionWorkspace, {
      props: { clientId: client.id, missionId: MISSION_ID },
      global: { plugins: [router] },
    })
    await attendreQue(() => wrapper.text().includes('PharmaTech Solutions'))

    const lien = wrapper.find('.lien-retour')
    expect(lien.exists()).toBe(true)
    expect(lien.text()).toBe('Missions')
    expect(wrapper.find('h1').text()).toContain('PharmaTech Solutions')
  })
})

describe('MissionWorkspace — changements de statut non vérifiés', () => {
  test('un échec de changement de statut de mission affiche un message, ne casse pas silencieusement', async () => {
    const wrapper = await monter()
    const missionStore = useMissionStore()
    missionStore.changerStatutMission = vi.fn().mockResolvedValue(null)

    await wrapper.find('header select').setValue('cloturee')
    await attendreQue(() => wrapper.find('.bandeau-erreur').exists())

    expect(wrapper.find('.bandeau-erreur').text()).toContain(
      'Impossible de changer le statut de la mission',
    )
  })

  test("un échec de changement de statut d'activité affiche un message, ne casse pas silencieusement", async () => {
    const wrapper = await monter()
    const formulaireActivite = wrapper.find('section.activites form')
    await formulaireActivite.find('input[type="text"]').setValue('Préparer protocole')
    await formulaireActivite.trigger('submit.prevent')
    await attendreQue(async () => (await ctx.missionRepo.listerActivities(CLIENT_ID)).length === 1)
    await attendreQue(() => wrapper.find('section.activites li select').exists())

    const missionStore = useMissionStore()
    missionStore.changerStatutActivity = vi.fn().mockResolvedValue(null)

    // Un seul déclenchement de `setValue` suivi d'un `attendreQue` séparé
    // s'est révélé intermittent en CI (jamais reproduit en local malgré
    // plusieurs répétitions — cause exacte non identifiée avec certitude,
    // probablement une re-création du nœud `<select>` par Vue entre la
    // récupération de la référence et l'événement `change`). Re-déclencher
    // `setValue` à chaque itération est sans risque ici (le mock est
    // idempotent) et élimine la fenêtre de course plutôt que de la
    // rétrécir davantage.
    await attendreQue(async () => {
      await wrapper.find('section.activites li select').setValue('terminee')
      return wrapper.find('.bandeau-erreur').exists()
    })

    expect(wrapper.find('.bandeau-erreur').text()).toContain(
      "Impossible de changer le statut de l'activité",
    )
  })
})
