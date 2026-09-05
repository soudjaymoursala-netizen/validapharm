import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { db } from '../../persistance/db'
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
  for (let tentative = 0; tentative < 50; tentative++) {
    await flushPromises()
    if (await condition()) return
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  throw new Error('attendreQue : condition jamais satisfaite')
}

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.methodProfilesRiskAssessment.clear()
  await db.risksAssessment.clear()
})

describe('RiskAssessmentAmdec', () => {
  test('configure un profil, crée une ligne AMDEC avec IPR calculé, enregistre une action résiduelle', async () => {
    const wrapper = mount(RiskAssessmentAmdec, {
      props: { clientId: 'client-1' },
      global: { plugins: [routeurDeTest()] },
    })
    await flushPromises()

    // Configuration du profil — aucun profil au départ, formulaire ouvert automatiquement
    const formConfig = wrapper.find('.bloc-config form')
    await formConfig.find('input[type="text"]').setValue('Processus_AMDEC.xlsx')
    const inputsNombre = formConfig.findAll('input[type="number"]')
    await inputsNombre[0]?.setValue(1)
    await inputsNombre[1]?.setValue(5)
    await inputsNombre[2]?.setValue(50)
    await formConfig.trigger('submit.prevent')
    await attendreQue(
      async () =>
        (await db.methodProfilesRiskAssessment.where('client_id').equals('client-1').count()) > 0,
    )

    const profil = (await db.methodProfilesRiskAssessment.toArray())[0]
    expect(profil?.echelle_min).toBe(1)
    expect(profil?.echelle_max).toBe(5)
    expect(profil?.seuil_action).toBe(50)

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
    await attendreQue(async () => (await db.risksAssessment.count()) > 0)

    const ligne = (await db.risksAssessment.toArray())[0]
    expect(ligne?.ipr_initial).toBe(30) // 5*2*3, sur échelle 1-5 → non normalisé, valeur brute
    expect(ligne?.verdict_initial).toBe('acceptable') // 30 < seuil 50

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
    await attendreQue(async () => (await db.risksAssessment.toArray())[0]?.ipr_residuel !== null)

    const ligneAvecAction = (await db.risksAssessment.toArray())[0]
    expect(ligneAvecAction?.ipr_residuel).toBe(10)
    expect(ligneAvecAction?.recommandation).toBe('Ajouter une sonde de contrôle')
  })

  test('créer une ligne AMDEC sans profil configuré est refusé (garde-fou)', async () => {
    // Seed direct d'une ligne pour vérifier qu'aucune écriture n'a lieu sans profil actif —
    // le formulaire "nouvelle ligne" ne s'affiche même pas tant qu'aucun profil n'existe.
    const wrapper = mount(RiskAssessmentAmdec, {
      props: { clientId: 'client-1' },
      global: { plugins: [routeurDeTest()] },
    })
    await flushPromises()

    expect(wrapper.find('.bloc-config').exists()).toBe(true)
    expect(wrapper.find('.bloc-nouvelle-ligne').exists()).toBe(false)
    expect(await db.risksAssessment.count()).toBe(0)
  })
})
