import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import JSZip from 'jszip'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Contexte } from '../../../workers/auth-worker/src/routeur'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import { useClientsStore } from '../stores/useClientsStore'
import TemplatesFormulaires from './TemplatesFormulaires.vue'

async function construireGabaritDocx(corpsXml: string): Promise<ArrayBuffer> {
  const zip = new JSZip()
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  )
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  )
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${corpsXml}</w:body></w:document>`,
  )
  return zip.generateAsync({ type: 'arraybuffer' })
}

const GABARIT_COMPLET =
  '<w:p><w:r><w:t>{titre} {redacteurs} {approbateur_final}</w:t></w:r></w:p>' +
  '<w:p><w:r><w:t>{#historique_revisions}{version}{/historique_revisions}</w:t></w:r></w:p>'

const GABARIT_INCOMPLET = '<w:p><w:r><w:t>{titre}</w:t></w:r></w:p>'

function routeurDeTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/clients/:clientId', name: 'fiche-client', component: { template: '<div />' } },
      {
        path: '/clients/:clientId/templates',
        name: 'templates-formulaires',
        component: TemplatesFormulaires,
        props: true,
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

async function deposerFichier(
  wrapper: ReturnType<typeof mount>,
  buffer: ArrayBuffer,
): Promise<void> {
  const fichier = new File([buffer], 'gabarit.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
  const inputFichier = wrapper.find('input[type="file"]')
  Object.defineProperty(inputFichier.element, 'files', { value: [fichier], configurable: true })
  await inputFichier.trigger('change')
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
})

afterEach(() => {
  demonter()
})

describe('TemplatesFormulaires — bibliothèque de gabarits (§8 du prompt maître)', () => {
  test('un gabarit valide (balises obligatoires) est importé et listé', async () => {
    const clientsStore = useClientsStore()
    const client = await clientsStore.creerClient({ name: 'PharmaTech Solutions' })
    if ('erreur' in client) throw client

    const router = routeurDeTest()
    await router.push({ name: 'templates-formulaires', params: { clientId: client.id } })
    const wrapper = mount(TemplatesFormulaires, {
      props: { clientId: client.id },
      global: { plugins: [router] },
    })
    await attendreQue(() => wrapper.text().includes('PharmaTech Solutions'))

    await wrapper.find('input[type="text"]').setValue('QD-0007 Protocole OQ')
    const buffer = await construireGabaritDocx(GABARIT_COMPLET)
    await deposerFichier(wrapper, buffer)

    await attendreQue(() => wrapper.text().includes('QD-0007 Protocole OQ'))
    expect(wrapper.find('.bandeau-erreur').exists()).toBe(false)
  })

  test('un gabarit sans les balises obligatoires est refusé, jamais listé', async () => {
    const clientsStore = useClientsStore()
    const client = await clientsStore.creerClient({ name: 'PharmaTech Solutions' })
    if ('erreur' in client) throw client

    const router = routeurDeTest()
    await router.push({ name: 'templates-formulaires', params: { clientId: client.id } })
    const wrapper = mount(TemplatesFormulaires, {
      props: { clientId: client.id },
      global: { plugins: [router] },
    })
    await attendreQue(() => wrapper.text().includes('PharmaTech Solutions'))

    await wrapper.find('input[type="text"]').setValue('Gabarit incomplet')
    const buffer = await construireGabaritDocx(GABARIT_INCOMPLET)
    await deposerFichier(wrapper, buffer)

    await attendreQue(() => wrapper.find('.bandeau-erreur').exists())
    expect(wrapper.find('.bandeau-erreur').text()).toContain('balises obligatoires manquantes')
    expect(wrapper.text()).not.toContain('Gabarit incomplet')
  })

  test('supprimer un gabarit le retire de la liste et de la base', async () => {
    const clientsStore = useClientsStore()
    const client = await clientsStore.creerClient({ name: 'PharmaTech Solutions' })
    if ('erreur' in client) throw client

    const router = routeurDeTest()
    await router.push({ name: 'templates-formulaires', params: { clientId: client.id } })
    const wrapper = mount(TemplatesFormulaires, {
      props: { clientId: client.id },
      global: { plugins: [router] },
    })
    await attendreQue(() => wrapper.text().includes('PharmaTech Solutions'))

    await wrapper.find('input[type="text"]').setValue('QD-0007 Protocole OQ')
    const buffer = await construireGabaritDocx(GABARIT_COMPLET)
    await deposerFichier(wrapper, buffer)
    await attendreQue(() => wrapper.text().includes('QD-0007 Protocole OQ'))

    await wrapper.find('.bouton-danger').trigger('click')
    await attendreQue(() => !wrapper.text().includes('QD-0007 Protocole OQ'))
    expect(wrapper.text()).not.toContain('QD-0007 Protocole OQ')
  })

  /**
   * Depuis la migration D1 (Phase 9b, docs/CHANTIER-MIGRATION-D1-RECAP.md),
   * les gabarits ne sont plus purement locaux : une panne réseau signifie
   * réellement une absence de données pour cet écran, jamais un crash —
   * même discipline que `StructureSysteme` (voir `useGabaritExportStore.
   * charger`, catch autour de `api.obtenirGabaritsExportClient`).
   */
  test("un Worker injoignable n'empêche jamais l'affichage de l'écran (dégradation gracieuse, jamais une exception non gérée)", async () => {
    const clientId = 'client-test-templates'
    await ctx.clientsRepo.creer({
      id: clientId,
      name: 'PharmaTech Solutions',
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

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const router = routeurDeTest()
    await router.push({ name: 'templates-formulaires', params: { clientId } })
    const wrapper = mount(TemplatesFormulaires, {
      props: { clientId },
      global: { plugins: [router] },
    })

    await attendreQue(() => wrapper.text().includes("Aucun template importé pour l'instant"))
    expect(wrapper.text()).toContain("Aucun template importé pour l'instant")

    // Dégradation attendue pour le nom du client : jamais de plantage, le
    // titre retombe sur l'identifiant brut du client.
    expect(wrapper.find('h1').text()).toContain(clientId)
  })
})
