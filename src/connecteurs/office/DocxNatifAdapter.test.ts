import JSZip from 'jszip'
import { describe, expect, test } from 'vitest'
import { extraireTexteDocx } from './DocxNatifAdapter'
import { DocumentInvalideError } from './erreurs'

/**
 * Construit un `.docx` minimal mais réellement valide (structure OOXML
 * de base : `[Content_Types].xml` + `_rels/.rels` + `word/document.xml`)
 * — jamais un fichier texte renommé, pour vérifier l'extraction sur un
 * document réel plutôt que sur un cas dégénéré.
 */
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

describe('extraireTexteDocx (Phase 19, TD-014)', () => {
  test("extrait le texte brut d'un .docx réellement valide", async () => {
    const docx = await construireDocxMinimal('Voici la procédure Impact Assessment.')
    const resultat = await extraireTexteDocx(docx)
    expect(resultat.texte.trim()).toBe('Voici la procédure Impact Assessment.')
  })

  test('plusieurs paragraphes sont séparés par un saut de ligne', async () => {
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
    <w:p><w:r><w:t>Étape 1 : vérifier le contexte.</w:t></w:r></w:p>
    <w:p><w:r><w:t>Étape 2 : identifier les impacts.</w:t></w:r></w:p>
  </w:body>
</w:document>`,
    )
    const docx = await zip.generateAsync({ type: 'arraybuffer' })

    const resultat = await extraireTexteDocx(docx)
    expect(resultat.texte).toBe(
      'Étape 1 : vérifier le contexte.\nÉtape 2 : identifier les impacts.',
    )
  })

  test("un fichier qui n'est pas un zip lève DocumentInvalideError, jamais un crash", async () => {
    const donneesInvalides = new TextEncoder().encode("ceci n'est pas un docx").buffer
    await expect(extraireTexteDocx(donneesInvalides)).rejects.toThrow(DocumentInvalideError)
  })

  test('un zip sans word/document.xml (pas un .docx) lève DocumentInvalideError', async () => {
    const zip = new JSZip()
    zip.file('autre-fichier.txt', 'contenu quelconque')
    const archive = await zip.generateAsync({ type: 'arraybuffer' })

    await expect(extraireTexteDocx(archive)).rejects.toThrow(DocumentInvalideError)
  })
})
