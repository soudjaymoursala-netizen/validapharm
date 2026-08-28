import 'fake-indexeddb/auto'
import JSZip from 'jszip'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { db } from '../../persistance/db'
import { useGabaritExportStore } from './useGabaritExportStore'

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

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.gabaritsExportClient.clear()
})

describe('useGabaritExportStore — importerGabarit (Phase 26, TD-024)', () => {
  test('un gabarit avec toutes les balises obligatoires est accepté et persisté', async () => {
    const store = useGabaritExportStore()
    await store.charger('client-1')
    const fichier = await construireGabaritDocx(GABARIT_COMPLET)

    const resultat = await store.importerGabarit('client-1', 'Gabarit Sanofi', fichier)

    expect(resultat.ok).toBe(true)
    expect(store.gabarits).toHaveLength(1)
    const relu = await db.gabaritsExportClient.toArray()
    expect(relu).toHaveLength(1)
    expect(relu[0]?.nom).toBe('Gabarit Sanofi')
  })

  test('un gabarit sans les balises obligatoires est refusé, jamais enregistré (URS-F-026)', async () => {
    const store = useGabaritExportStore()
    await store.charger('client-1')
    const fichier = await construireGabaritDocx(GABARIT_INCOMPLET)

    const resultat = await store.importerGabarit('client-1', 'Gabarit incomplet', fichier)

    expect(resultat.ok).toBe(false)
    if (!resultat.ok) {
      expect(resultat.tagsManquants).toEqual([
        'redacteurs',
        'approbateur_final',
        'historique_revisions',
      ])
    }
    expect(store.gabarits).toHaveLength(0)
    expect(await db.gabaritsExportClient.toArray()).toHaveLength(0)
  })

  test('isolation stricte par client : le gabarit d’un client n’apparaît jamais chez un autre (URS-F-024)', async () => {
    const store = useGabaritExportStore()
    await store.charger('client-A')
    await store.importerGabarit(
      'client-A',
      'Gabarit A',
      await construireGabaritDocx(GABARIT_COMPLET),
    )

    await store.charger('client-B')
    expect(store.gabarits).toHaveLength(0)

    await store.charger('client-A')
    expect(store.gabarits).toHaveLength(1)
  })

  test('supprimerGabarit retire le gabarit de la liste et de la base', async () => {
    const store = useGabaritExportStore()
    await store.charger('client-1')
    const resultat = await store.importerGabarit(
      'client-1',
      'À supprimer',
      await construireGabaritDocx(GABARIT_COMPLET),
    )
    expect(resultat.ok).toBe(true)
    if (!resultat.ok) return

    await store.supprimerGabarit(resultat.gabarit.id)

    expect(store.gabarits).toHaveLength(0)
    expect(await db.gabaritsExportClient.get(resultat.gabarit.id)).toBeUndefined()
  })
})
