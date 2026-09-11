// Fichier séparé de `useNormativeDocumentsStore.test.ts` : ce cas a besoin
// de `DOMParser` (extraction .docx réelle, `DocxNatifAdapter`), donc de
// l'environnement `jsdom` par défaut — incompatible avec `node`, utilisé
// par le reste des tests de ce store pour éviter la corruption binaire
// Blob/File/FormData entre jsdom et le `Request`/`fetch` natif de Node
// (voir l'en-tête de `useNormativeDocumentsStore.test.ts`). Ce test
// n'exerce que l'extraction de texte (une chaîne, jamais affectée par
// cette corruption qui ne touche que le contenu binaire transmis).
import 'fake-indexeddb/auto'
import JSZip from 'jszip'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import { useNormativeDocumentsStore } from './useNormativeDocumentsStore'

/** Même structure OOXML minimale que `DocxNatifAdapter.test.ts` — un `.docx` réellement valide, jamais un fichier texte renommé. */
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
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>${texte}</w:t></w:r></w:p>
  </w:body>
</w:document>`,
  )
  return zip.generateAsync({ type: 'arraybuffer' })
}

let demonter: () => void

beforeEach(async () => {
  setActivePinia(createPinia())
  await reinitialiserAuthDeTest()
  ;({ demonter } = installerFauxWorkerAuth())
  await connecterAdminDeTest()
})

afterEach(() => {
  demonter()
})

describe('useNormativeDocumentsStore — importerDepuisFichier (.docx)', () => {
  test('.docx réel : dispatch vers extraireTexteDocx', async () => {
    const store = useNormativeDocumentsStore()
    const tampon = await construireDocxMinimal('Guideline GAMP 5 — extrait.')
    const fichier = new File([tampon], 'gamp5.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })

    const document = await store.importerDepuisFichier(fichier, 'gmp', 'qa-1')

    expect(document.extracted_text).toBe('Guideline GAMP 5 — extrait.')
  })
})
