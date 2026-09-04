import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import JSZip from 'jszip'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { db } from '../../persistance/db'
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

let demonter: () => void

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.gabaritsExportClient.clear()
  await reinitialiserAuthDeTest()
  demonter = installerFauxWorkerAuth().demonter
  await connecterAdminDeTest()
})

afterEach(() => {
  demonter()
})

describe('TemplatesFormulaires — bibliothèque de gabarits (§8 du prompt maître, Phase 40)', () => {
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

    await attendreQue(async () => (await db.gabaritsExportClient.toArray()).length > 0)
    expect(wrapper.text()).toContain('QD-0007 Protocole OQ')
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
    expect(await db.gabaritsExportClient.toArray()).toHaveLength(0)
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
    await attendreQue(async () => (await db.gabaritsExportClient.toArray()).length > 0)

    await wrapper.find('.bouton-danger').trigger('click')
    await attendreQue(async () => (await db.gabaritsExportClient.toArray()).length === 0)
    expect(wrapper.text()).not.toContain('QD-0007 Protocole OQ')
  })
})
