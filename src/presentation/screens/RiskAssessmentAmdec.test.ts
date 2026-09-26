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
import { useRiskAssessmentStore } from '../stores/useRiskAssessmentStore'
import RiskAssessmentAmdec from './RiskAssessmentAmdec.vue'

function routeurDeTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/clients', name: 'gestion-clients', component: { template: '<div />' } },
      {
        path: '/clients/:clientId/risk-assessment',
        name: 'risk-assessment-amdec',
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

describe('RiskAssessmentAmdec', () => {
  test('configure un profil, crée une ligne AMDEC avec IPR calculé, enregistre une action résiduelle', async () => {
    const wrapper = mount(RiskAssessmentAmdec, {
      props: { clientId: CLIENT_ID },
      global: { plugins: [routeurDeTest()] },
    })
    await attendreQue(() => wrapper.find('.bloc-config form').exists())

    // Configuration du profil — aucun profil au départ, formulaire ouvert automatiquement
    const formConfig = wrapper.find('.bloc-config form')
    await formConfig.find('input[type="text"]').setValue('Processus_AMDEC.xlsx')
    const inputsNombre = formConfig.findAll('input[type="number"]')
    await inputsNombre[0]?.setValue(1)
    await inputsNombre[1]?.setValue(5)
    await inputsNombre[2]?.setValue(50)
    await formConfig.trigger('submit.prevent')
    await attendreQue(
      async () => (await ctx.riskAssessmentRepo.listerProfils(CLIENT_ID)).length > 0,
    )

    const profil = (await ctx.riskAssessmentRepo.listerProfils(CLIENT_ID))[0]
    expect(profil?.echelleMin).toBe(1)
    expect(profil?.echelleMax).toBe(5)
    expect(profil?.seuilAction).toBe(50)

    // Le formulaire de config se referme, celui de nouvelle ligne apparaît
    await attendreQue(() => wrapper.find('.bloc-nouvelle-ligne form').exists())
    const formLigne = wrapper.find('.bloc-nouvelle-ligne form')
    const inputsTexte = formLigne.findAll('input[type="text"]')
    await inputsTexte[0]?.setValue('Cycle de stérilisation')
    await inputsTexte[1]?.setValue('Sous-charge thermique')
    const inputsNombreLigne = formLigne.findAll('input[type="number"]')
    await inputsNombreLigne[0]?.setValue(5)
    await inputsNombreLigne[1]?.setValue(2)
    await inputsNombreLigne[2]?.setValue(3)
    await formLigne.trigger('submit.prevent')
    await attendreQue(
      async () => (await ctx.riskAssessmentRepo.listerEvaluations(CLIENT_ID)).length > 0,
    )

    const ligne = (await ctx.riskAssessmentRepo.listerEvaluations(CLIENT_ID))[0]
    expect(ligne?.iprInitial).toBe(30) // 5*2*3, sur échelle 1-5 → non normalisé, valeur brute
    expect(ligne?.verdictInitial).toBe('acceptable') // 30 < seuil 50

    // Action résiduelle — jamais déduite, toujours une saisie explicite
    await attendreQue(() => wrapper.find('.carte-evaluation .ligne-formulaire').exists())
    const zoneAction = wrapper.find('.carte-evaluation .ligne-formulaire')
    const inputsTexteAction = zoneAction.findAll('input[type="text"]')
    await inputsTexteAction[0]?.setValue('Ajouter une sonde de contrôle')
    await inputsTexteAction[1]?.setValue('Responsable Qualité')
    const inputsNombreAction = zoneAction.findAll('input[type="number"]')
    await inputsNombreAction[0]?.setValue(5)
    await inputsNombreAction[1]?.setValue(1)
    await inputsNombreAction[2]?.setValue(2)
    await zoneAction.find('button').trigger('click')
    await attendreQue(
      async () =>
        (await ctx.riskAssessmentRepo.listerEvaluations(CLIENT_ID))[0]?.iprResiduel !== null,
    )

    const ligneAvecAction = (await ctx.riskAssessmentRepo.listerEvaluations(CLIENT_ID))[0]
    expect(ligneAvecAction?.iprResiduel).toBe(10)
    expect(ligneAvecAction?.recommandation).toBe('Ajouter une sonde de contrôle')

    // La recommandation et le responsable saisis doivent rester visibles une
    // fois l'action résiduelle enregistrée, pas seulement persistés en base.
    await attendreQue(() => wrapper.find('.carte-evaluation').text().includes('Ajouter une sonde'))
    expect(wrapper.find('.carte-evaluation').text()).toContain('Responsable Qualité')
  })

  test('créer une ligne AMDEC sans profil configuré est refusé (garde-fou)', async () => {
    // Seed direct d'une ligne pour vérifier qu'aucune écriture n'a lieu sans profil actif —
    // le formulaire "nouvelle ligne" ne s'affiche même pas tant qu'aucun profil n'existe.
    const wrapper = mount(RiskAssessmentAmdec, {
      props: { clientId: CLIENT_ID },
      global: { plugins: [routeurDeTest()] },
    })
    await attendreQue(() => wrapper.find('.bloc-config').exists())

    expect(wrapper.find('.bloc-config').exists()).toBe(true)
    expect(wrapper.find('.bloc-nouvelle-ligne').exists()).toBe(false)
    expect(await ctx.riskAssessmentRepo.listerEvaluations(CLIENT_ID)).toHaveLength(0)
  })

  test('affiche un état de chargement avant que le profil ne soit résolu', async () => {
    // Reproduit un profil déjà configuré, chargé de manière asynchrone —
    // avant ce correctif, l'écran affichait à tort « Aucun profil AMDEC
    // n'est configuré » tant que le onMounted n'avait pas terminé.
    const maintenant = new Date().toISOString()
    await ctx.riskAssessmentRepo.creerProfil({
      id: crypto.randomUUID(),
      clientId: CLIENT_ID,
      version: 'v1',
      effectiveDate: maintenant,
      source: 'Processus_AMDEC.xlsx',
      origin: 'procedure_client',
      echelleMin: 1,
      echelleMax: 5,
      seuilAction: 50,
      createdAt: maintenant,
    })

    const wrapper = mount(RiskAssessmentAmdec, {
      props: { clientId: CLIENT_ID },
      global: { plugins: [routeurDeTest()] },
    })

    expect(wrapper.find('.etat-vide').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Aucun profil AMDEC')

    await attendreQue(() => wrapper.find('.bloc-nouvelle-ligne').exists())
    expect(wrapper.find('.etat-vide').exists()).toBe(false)
  })
})

describe('RiskAssessmentAmdec — mutations non vérifiées', () => {
  test("un enregistrement d'action résiduelle bloqué (ligne supprimée entre-temps) affiche un message", async () => {
    const wrapper = mount(RiskAssessmentAmdec, {
      props: { clientId: CLIENT_ID },
      global: { plugins: [routeurDeTest()] },
    })
    await attendreQue(() => wrapper.find('.bloc-config form').exists())

    const formConfig = wrapper.find('.bloc-config form')
    await formConfig.find('input[type="text"]').setValue('Processus_AMDEC.xlsx')
    const inputsNombre = formConfig.findAll('input[type="number"]')
    await inputsNombre[0]?.setValue(1)
    await inputsNombre[1]?.setValue(5)
    await inputsNombre[2]?.setValue(50)
    await formConfig.trigger('submit.prevent')
    await attendreQue(() => wrapper.find('.bloc-nouvelle-ligne form').exists())

    const formLigne = wrapper.find('.bloc-nouvelle-ligne form')
    const inputsTexte = formLigne.findAll('input[type="text"]')
    await inputsTexte[0]?.setValue('Cycle de stérilisation')
    await inputsTexte[1]?.setValue('Sous-charge thermique')
    await formLigne.trigger('submit.prevent')
    await attendreQue(
      async () => (await ctx.riskAssessmentRepo.listerEvaluations(CLIENT_ID)).length > 0,
    )
    await attendreQue(() => wrapper.find('.carte-evaluation .ligne-formulaire').exists())

    // Reproduit une ligne AMDEC supprimée entre-temps sur un autre poste —
    // avant ce correctif, le clic sur « Enregistrer l'action résiduelle »
    // échouait en silence total.
    const riskStore = useRiskAssessmentStore()
    riskStore.enregistrerActionResiduelle = vi.fn().mockResolvedValue({ erreur: 'introuvable' })

    const zoneAction = wrapper.find('.carte-evaluation .ligne-formulaire')
    await zoneAction.find('button').trigger('click')
    await attendreQue(() => wrapper.find('.bandeau-erreur').exists())

    expect(wrapper.find('.bandeau-erreur').text()).toContain('introuvable')
    expect((await ctx.riskAssessmentRepo.listerEvaluations(CLIENT_ID))[0]?.iprResiduel).toBeNull()
  })
})
