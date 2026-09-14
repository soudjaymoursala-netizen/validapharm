import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Section } from '../../logique-metier/domaine/types'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import { useAuthStore } from '../stores/useAuthStore'
import { useProjectsStore } from '../stores/useProjectsStore'
import { sectionDomaineVersWire, useSectionsStore } from '../stores/useSectionsStore'
import EditeurSection from './EditeurSection.vue'

/**
 * `Section` vit désormais dans le Worker/D1 (Phase 3b du chantier de
 * migration D1) — remplace l'ancien `db.sections.put(...)` direct de
 * préparation de test, même pattern que `synchronisation.test.ts`.
 */
async function seedSection(section: Section): Promise<void> {
  const authStore = useAuthStore()
  const api = await authStore.client()
  if (!api || !authStore.jeton) throw new Error('session absente en préparation de test')
  const resultat = await api.restaurerSection(
    authStore.jeton,
    section.id,
    sectionDomaineVersWire(section),
  )
  if (!resultat.ok) throw new Error(`échec de préparation de test : ${resultat.erreur}`)
}

function routeurDeTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/projets/:projectId', name: 'fiche-projet', component: { template: '<div />' } },
      {
        path: '/projets/:projectId/sections/:sectionId',
        name: 'editeur-section',
        component: EditeurSection,
        props: true,
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

// Même pause que `EditeurSection.liensStructurels.test.ts` — `onMounted`
// enchaîne plusieurs `charger()` après le rendu principal ; sans cette
// pause, `afterEach` peut démonter le faux Worker pendant qu'un de ces
// appels est encore en vol.
async function laisserSettlerMontageComplet(): Promise<void> {
  for (let tour = 0; tour < 5; tour++) {
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}

let demonter: () => void

beforeEach(async () => {
  setActivePinia(createPinia())
  await reinitialiserAuthDeTest()
  demonter = installerFauxWorkerAuth().demonter
  await connecterAdminDeTest()
})

afterEach(() => {
  demonter()
})

async function creerProjetDeTest() {
  const projetsStore = useProjectsStore()
  return projetsStore.creerProjet({
    name: 'Qualification presse P-200',
    context: '',
    scope_in: '',
    scope_out: '',
    deadline: null,
    language_default: 'fr',
    client_id: null,
  })
}

describe('EditeurSection — transitions de workflow non vérifiées', () => {
  test('un rejet bloqué ne vide pas le motif déjà saisi par l’utilisateur', async () => {
    const projet = await creerProjetDeTest()
    const sectionsStore = useSectionsStore()
    const section = await sectionsStore.creerSection({
      project_id: projet.id,
      template_type: 'urs',
      language: 'fr',
      titre: 'URS presse P-200',
      owner_id: 'admin@pharmatech.example',
    })
    // Pré-positionne le statut requis pour "Rejeter" sans passer par la
    // machine à états réelle (hors périmètre de ce test) — même technique
    // que les autres chantiers de cette session (pré-semer Dexie).
    await seedSection({ ...section, status: 'en_verification' })

    const router = routeurDeTest()
    await router.push({
      name: 'editeur-section',
      params: { projectId: projet.id, sectionId: section.id },
    })
    const wrapper = mount(EditeurSection, {
      props: { projectId: projet.id, sectionId: section.id },
      global: { plugins: [router] },
    })
    await attendreQue(() => wrapper.text().includes('Rejeter'))

    await wrapper.find('input[type="text"]').setValue('Motif de rejet détaillé')

    // Reproduit un rejet bloqué par un garde-fou de transition (ex. motif
    // requis mal formé côté machine à états, ou verrou concurrent) — avant
    // ce correctif, le champ était vidé même en cas d'échec.
    sectionsStore.rejeter = vi.fn().mockResolvedValue({
      ok: false,
      raisonTransition: 'transition_invalide',
    })

    const boutonRejeter = wrapper.findAll('button').find((b) => b.text() === 'Rejeter')
    await boutonRejeter?.trigger('click')
    await flushPromises()

    expect(wrapper.find<HTMLInputElement>('input[type="text"]').element.value).toBe(
      'Motif de rejet détaillé',
    )
    await laisserSettlerMontageComplet()
  })

  test('une validation IA bloquée ne réinitialise pas la checklist de relecture déjà cochée', async () => {
    const projet = await creerProjetDeTest()
    const sectionsStore = useSectionsStore()
    const section = await sectionsStore.creerSection({
      project_id: projet.id,
      template_type: 'urs',
      language: 'fr',
      titre: 'URS presse P-200',
      owner_id: 'admin@pharmatech.example',
    })
    await seedSection({ ...section, status: 'propose_par_ia_non_valide' })

    const router = routeurDeTest()
    await router.push({
      name: 'editeur-section',
      params: { projectId: projet.id, sectionId: section.id },
    })
    const wrapper = mount(EditeurSection, {
      props: { projectId: projet.id, sectionId: section.id },
      global: { plugins: [router] },
    })
    await attendreQue(() => wrapper.find('input[type="checkbox"]').exists())

    const caseARevoir = wrapper.find<HTMLInputElement>('input[type="checkbox"]')
    await caseARevoir.setValue(true)
    await attendreQue(() => {
      const bouton = wrapper
        .findAll('button')
        .find((b) => b.text().includes('Valider cette section'))
      return bouton !== undefined && !bouton.attributes('disabled')
    })

    // Reproduit une validation bloquée pour une raison indépendante de la
    // relecture elle-même (ex. rôle manquant) — avant ce correctif, la
    // checklist déjà cochée était effacée même quand rien n'avait été
    // validé, forçant à tout re-cocher pour rien.
    sectionsStore.validerSectionIA = vi.fn().mockResolvedValue({
      ok: false,
      raisonTransition: 'roles_manquants',
    })

    const boutonValider = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Valider cette section'))
    await boutonValider?.trigger('click')
    await flushPromises()

    expect(wrapper.find<HTMLInputElement>('input[type="checkbox"]').element.checked).toBe(true)
    await laisserSettlerMontageComplet()
  })
})

describe('EditeurSection — section introuvable', () => {
  test('affiche un message explicite, jamais "Chargement…" indéfiniment', async () => {
    const projet = await creerProjetDeTest()

    const router = routeurDeTest()
    await router.push({
      name: 'editeur-section',
      params: { projectId: projet.id, sectionId: 'section-inexistante' },
    })
    const wrapper = mount(EditeurSection, {
      props: { projectId: projet.id, sectionId: 'section-inexistante' },
      global: { plugins: [router] },
    })
    await attendreQue(() => wrapper.text().includes('Section introuvable'))

    expect(wrapper.text()).not.toContain('Chargement…')
    await laisserSettlerMontageComplet()
  })
})
