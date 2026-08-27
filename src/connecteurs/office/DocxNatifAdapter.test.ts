import JSZip from 'jszip'
import { describe, expect, test } from 'vitest'
import { extraireImagesDocx, extraireTexteDocx } from './DocxNatifAdapter'
import { DocumentInvalideError } from './erreurs'

/**
 * Construit un `.docx` minimal mais réellement valide (structure OOXML
 * de base : `[Content_Types].xml` + `_rels/.rels` + `word/document.xml`,
 * `medias` optionnels sous `word/media/`) — jamais un fichier texte
 * renommé, pour vérifier l'extraction sur un document réel plutôt que
 * sur un cas dégénéré.
 */
async function construireDocxMinimal(
  texte: string,
  medias: Array<{ nom: string; contenu: string }> = [],
): Promise<ArrayBuffer> {
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
  for (const media of medias) {
    zip.file(`word/media/${media.nom}`, media.contenu)
  }
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

describe("extraireImagesDocx — schémas/photos incorporés (constat de l'utilisateur, 27/08/2026)", () => {
  test('extrait une image raster (PNG) avec son type MIME', async () => {
    const docx = await construireDocxMinimal('Procédure avec schéma.', [
      { nom: 'image1.png', contenu: 'contenu-binaire-simule-png' },
    ])

    const images = await extraireImagesDocx(docx)

    expect(images).toHaveLength(1)
    expect(images[0]?.nomFichier).toBe('word/media/image1.png')
    expect(images[0]?.contentType).toBe('image/png')
    expect(images[0]?.donnees).toBeInstanceOf(Blob)
  })

  test('plusieurs images incorporées sont toutes retournées', async () => {
    const docx = await construireDocxMinimal('Procédure.', [
      { nom: 'image1.jpeg', contenu: 'photo-1' },
      { nom: 'image2.png', contenu: 'schema-1' },
    ])

    const images = await extraireImagesDocx(docx)

    expect(images.map((i) => i.nomFichier).sort()).toEqual([
      'word/media/image1.jpeg',
      'word/media/image2.png',
    ])
  })

  test('un format non raster (EMF, dessin vectoriel Office) est signalé, jamais silencieusement omis', async () => {
    const docx = await construireDocxMinimal('Procédure avec schéma Visio collé.', [
      { nom: 'image1.emf', contenu: 'dessin-vectoriel-simule' },
    ])

    const images = await extraireImagesDocx(docx)

    expect(images).toHaveLength(1)
    expect(images[0]?.contentType).toBeNull()
  })

  test('un .docx sans média retourne une liste vide, jamais une erreur', async () => {
    const docx = await construireDocxMinimal('Procédure sans image.')
    expect(await extraireImagesDocx(docx)).toEqual([])
  })

  test("un fichier qui n'est pas un zip lève DocumentInvalideError", async () => {
    const donneesInvalides = new TextEncoder().encode("ceci n'est pas un docx").buffer
    await expect(extraireImagesDocx(donneesInvalides)).rejects.toThrow(DocumentInvalideError)
  })
})
