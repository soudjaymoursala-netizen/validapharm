import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { ConflitEnregistrement } from '../stores/useSynchronisationStore'
import { useSynchronisationStore } from '../stores/useSynchronisationStore'
import ResolutionConflit from './ResolutionConflit.vue'

function routeurDeTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/resolution-conflit',
        name: 'resolution-conflit',
        component: { template: '<div />' },
      },
      { path: '/tableau-de-bord', name: 'tableau-de-bord', component: { template: '<div />' } },
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

function conflitDeTest(): ConflitEnregistrement {
  return {
    type: 'project',
    id: 'projet-1',
    local: { nom: 'Local' },
    distant: { nom: 'Distant' },
    divergences: [{ champ: 'nom', valeurLocale: 'Local', valeurDistante: 'Distant' }],
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('ResolutionConflit', () => {
  test('aucun conflit détecté : message clair, pas de blocage sur « Analyse des conflits… »', async () => {
    const syncStore = useSynchronisationStore()
    syncStore.analyserConflit = vi.fn().mockResolvedValue([])

    const wrapper = mount(ResolutionConflit, { global: { plugins: [routeurDeTest()] } })
    await attendreQue(() => wrapper.find('.etat-vide').exists())

    expect(wrapper.text()).toContain('Aucun conflit de contenu détecté')
  })

  test("une exception pendant l'analyse affiche un message, ne bloque pas indéfiniment sur « Analyse des conflits… »", async () => {
    // Reproduit un échec réseau/GitHub réel (`analyserConflit` fait des
    // appels à l'API GitHub) — avant ce correctif, `chargerConflits()`
    // n'avait aucun `try/catch` : une exception laissait `enChargement`
    // à `true` pour toujours, sans le moindre message ni possibilité de
    // savoir qu'une erreur s'était produite.
    const syncStore = useSynchronisationStore()
    syncStore.analyserConflit = vi.fn().mockRejectedValue(new Error('GitHub API indisponible'))

    const wrapper = mount(ResolutionConflit, { global: { plugins: [routeurDeTest()] } })
    await attendreQue(() => wrapper.find('.message-etat').exists())

    expect(wrapper.text()).not.toContain('Analyse des conflits…')
    expect(wrapper.find('.message-etat').text()).toContain('Impossible')
  })

  test('un conflit détecté : le bouton de confirmation reste désactivé tant que chaque champ divergent n’a pas de décision explicite', async () => {
    // Vérifie la garantie annoncée en tête du fichier source :
    // « Aucun choix par défaut silencieux ». Avant correctif,
    // `chargerConflits()` préremplissait chaque champ divergent avec
    // `choix: 'distante'`, activant le bouton de confirmation sans
    // qu'aucune décision réelle n'ait été prise par l'utilisateur.
    const syncStore = useSynchronisationStore()
    syncStore.analyserConflit = vi.fn().mockResolvedValue([conflitDeTest()])

    const wrapper = mount(ResolutionConflit, { global: { plugins: [routeurDeTest()] } })
    await attendreQue(() => wrapper.find('.conflit').exists())

    const boutonConfirmer = wrapper.find('.actions button')
    expect(boutonConfirmer.attributes('disabled')).toBeDefined()

    const radios = wrapper.findAll('input[type="radio"]')
    expect(radios.every((r) => (r.element as HTMLInputElement).checked)).toBe(false)
  })

  test('choisir une décision pour chaque champ active la confirmation et synchronise', async () => {
    const syncStore = useSynchronisationStore()
    syncStore.analyserConflit = vi.fn().mockResolvedValue([conflitDeTest()])
    syncStore.confirmerResolutionConflits = vi.fn().mockResolvedValue({ ok: true, nbFichiers: 1 })

    const wrapper = mount(ResolutionConflit, { global: { plugins: [routeurDeTest()] } })
    await attendreQue(() => wrapper.find('.conflit').exists())

    const radioLocale = wrapper.find('input[type="radio"]')
    await radioLocale.setValue(true)

    const boutonConfirmer = wrapper.find('.actions button')
    expect(boutonConfirmer.attributes('disabled')).toBeUndefined()

    await boutonConfirmer.trigger('click')
    await attendreQue(
      () =>
        (syncStore.confirmerResolutionConflits as ReturnType<typeof vi.fn>).mock.calls.length > 0,
    )

    const appelResolutions = (syncStore.confirmerResolutionConflits as ReturnType<typeof vi.fn>)
      .mock.calls[0]?.[0]
    expect(appelResolutions[0].choix).toEqual([{ champ: 'nom', choix: 'locale' }])
  })

  test('un nouveau conflit distant pendant la confirmation relance l’analyse avec un message explicite', async () => {
    const syncStore = useSynchronisationStore()
    syncStore.analyserConflit = vi.fn().mockResolvedValue([conflitDeTest()])
    syncStore.confirmerResolutionConflits = vi.fn().mockResolvedValue({ ok: false, conflit: true })

    const wrapper = mount(ResolutionConflit, { global: { plugins: [routeurDeTest()] } })
    await attendreQue(() => wrapper.find('.conflit').exists())

    const radioLocale = wrapper.find('input[type="radio"]')
    await radioLocale.setValue(true)
    await wrapper.find('.actions button').trigger('click')

    await attendreQue(() => wrapper.find('.message-etat').exists())
    expect(wrapper.find('.message-etat').text()).toContain('a de nouveau changé')
  })
})
