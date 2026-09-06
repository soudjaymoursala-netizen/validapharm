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
import Process from './Process.vue'

async function construireDocxMinimal(texte: string): Promise<ArrayBuffer> {
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
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
    <w:p><w:r><w:t>${texte}</w:t></w:r></w:p>
</w:body></w:document>`,
  )
  return zip.generateAsync({ type: 'arraybuffer' })
}

async function deposerDocument(
  wrapper: ReturnType<typeof mount>,
  buffer: ArrayBuffer,
  nomFichier: string,
): Promise<void> {
  const fichier = new File([buffer], nomFichier, {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
  const inputFichier = wrapper.find('.bloc-process input[type="file"]')
  Object.defineProperty(inputFichier.element, 'files', { value: [fichier], configurable: true })
  await inputFichier.trigger('change')
}

function routeurDeTest() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/clients/:clientId',
        name: 'fiche-client',
        component: { template: '<div />' },
      },
      {
        path: '/clients/:clientId/process',
        name: 'gestion-process',
        component: Process,
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

let demonter: () => void

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.processes.clear()
  await db.fonctionsActif.clear()
  await db.associationsFonctionProcess.clear()
  await db.associationsFonctionAssetNode.clear()
  await db.sources.clear()
  await db.sourceVersions.clear()
  await db.extractions.clear()
  await db.extractionItems.clear()
  await reinitialiserAuthDeTest()
  demonter = installerFauxWorkerAuth().demonter
  await connecterAdminDeTest()
})

afterEach(() => {
  demonter()
})

describe('Process — écran Process/Fonction (§6 du prompt maître)', () => {
  test('crée un process, une fonction, puis les rattache l’un à l’autre', async () => {
    const clientsStore = useClientsStore()
    const client = await clientsStore.creerClient({ name: 'PharmaTech Solutions' })
    if ('erreur' in client) throw client

    const router = routeurDeTest()
    await router.push({ name: 'gestion-process', params: { clientId: client.id } })
    const wrapper = mount(Process, {
      props: { clientId: client.id },
      global: { plugins: [router] },
    })
    await attendreQue(() => wrapper.text().includes('PharmaTech Solutions'))

    // Créer un process.
    const formulaireProcess = wrapper.find('.bloc-process .formulaire')
    await formulaireProcess.find('input[type="text"]').setValue('Compression')
    await formulaireProcess.trigger('submit.prevent')
    await attendreQue(async () => (await db.processes.toArray()).length > 0)
    expect(wrapper.text()).toContain('Compression')

    // Créer une fonction.
    const formulaireFonction = wrapper.find('.bloc-fonctions .formulaire')
    await formulaireFonction.find('input[type="text"]').setValue('Régulation de température')
    await formulaireFonction.trigger('submit.prevent')
    await attendreQue(async () => (await db.fonctionsActif.toArray()).length > 0)
    expect(wrapper.text()).toContain('Régulation de température')

    // Rattacher la fonction au process.
    const fonctionId = (await db.fonctionsActif.toArray())[0]?.id
    const processId = (await db.processes.toArray())[0]?.id
    const selectFonction = wrapper.find('.bloc-rattachement select')
    await selectFonction.setValue(fonctionId)
    const selects = wrapper.findAll('.bloc-rattachement select')
    await selects[1]?.setValue(processId)
    await wrapper.find('.bloc-rattachement button').trigger('click')

    await attendreQue(async () => (await db.associationsFonctionProcess.toArray()).length > 0)
    const association = (await db.associationsFonctionProcess.toArray())[0]
    expect(association?.function_id).toBe(fonctionId)
    expect(association?.process_id).toBe(processId)
    expect(wrapper.text()).toContain('process : Compression')
  })

  test('importer un document (.docx) extrait le texte, le préremplit et trace la provenance (tâche #113)', async () => {
    const clientsStore = useClientsStore()
    const client = await clientsStore.creerClient({ name: 'Client Import' })
    if ('erreur' in client) throw client

    const router = routeurDeTest()
    await router.push({ name: 'gestion-process', params: { clientId: client.id } })
    const wrapper = mount(Process, {
      props: { clientId: client.id },
      global: { plugins: [router] },
    })
    await attendreQue(() => wrapper.text().includes('Client Import'))

    const docx = await construireDocxMinimal('Description du process de compression.')
    await deposerDocument(wrapper, docx, 'Process compression.docx')
    const nomInput = () =>
      wrapper.find('.bloc-process .formulaire input[type="text"]').element as HTMLInputElement
    const descriptionTextarea = () =>
      wrapper.find('.bloc-process .formulaire textarea').element as HTMLTextAreaElement
    await attendreQue(() => descriptionTextarea().value.length > 0)

    expect(nomInput().value).toBe('Process compression')
    expect(descriptionTextarea().value).toContain('Description du process de compression.')
    expect(wrapper.text()).toContain('Texte extrait de « Process compression.docx »')

    const sourcesAvantSoumission = await db.sources.toArray()
    expect(sourcesAvantSoumission).toHaveLength(1)
    expect(sourcesAvantSoumission[0]?.titre).toBe('Process compression.docx')

    await wrapper.find('.bloc-process .formulaire').trigger('submit.prevent')
    await attendreQue(async () => (await db.processes.toArray()).length > 0)

    const process = (await db.processes.toArray())[0]
    expect(process?.source_id).toBe(sourcesAvantSoumission[0]?.id)
    expect(wrapper.text()).toContain('importé de « Process compression.docx »')
  })

  test('affiche un état vide tant qu’aucun process ni fonction n’existe', async () => {
    const clientsStore = useClientsStore()
    const client = await clientsStore.creerClient({ name: 'Client Vide' })
    if ('erreur' in client) throw client

    const router = routeurDeTest()
    await router.push({ name: 'gestion-process', params: { clientId: client.id } })
    const wrapper = mount(Process, {
      props: { clientId: client.id },
      global: { plugins: [router] },
    })
    await attendreQue(() => wrapper.text().includes('Client Vide'))

    expect(wrapper.text()).toContain("Aucun process pour l'instant.")
    expect(wrapper.text()).toContain("Aucune fonction pour l'instant.")
  })
})
