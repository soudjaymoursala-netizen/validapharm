import JSZip from 'jszip'
import { describe, expect, test } from 'vitest'
import { extraireImagesDocx, extraireTableauxDocx, extraireTexteDocx } from './DocxNatifAdapter'
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

/** Même structure OOXML minimale que `construireDocxMinimal`, mais avec un `<w:body>` fourni tel quel — pour construire des tableaux `<w:tbl>` réels dans les tests. */
async function construireDocxAvecCorps(corpsXml: string): Promise<ArrayBuffer> {
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
  <w:body>${corpsXml}</w:body>
</w:document>`,
  )
  return zip.generateAsync({ type: 'arraybuffer' })
}

describe('extraireTexteDocx', () => {
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

describe('extraireTableauxDocx — étapes sous tableau (calibré sur le manuel Markem-Imaje réel)', () => {
  test('extrait la grille de cellules et le titre le plus proche précédant le tableau', async () => {
    const docx = await construireDocxAvecCorps(`
      <w:p><w:r><w:t>Powering on the controller</w:t></w:r></w:p>
      <w:tbl>
        <w:tr>
          <w:tc><w:p><w:r><w:t>Previous achievement</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:t>Printer is fully installed and configured.</w:t></w:r></w:p></w:tc>
        </w:tr>
        <w:tr>
          <w:tc><w:p><w:r><w:t>Required time:</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:t>&gt;1.5 minutes</w:t></w:r></w:p></w:tc>
        </w:tr>
        <w:tr>
          <w:tc><w:p><w:r><w:t>1</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:t>Connect the printer power cable.</w:t></w:r></w:p></w:tc>
        </w:tr>
        <w:tr>
          <w:tc><w:p><w:r><w:t>2</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:t>Turn the switch key to the ON position.</w:t></w:r></w:p></w:tc>
        </w:tr>
      </w:tbl>
    `)

    const tableaux = await extraireTableauxDocx(docx)

    expect(tableaux).toHaveLength(1)
    expect(tableaux[0]?.titreProchePrecedent).toBe('Powering on the controller')
    expect(tableaux[0]?.lignes).toEqual([
      ['Previous achievement', 'Printer is fully installed and configured.'],
      ['Required time:', '>1.5 minutes'],
      ['1', 'Connect the printer power cable.'],
      ['2', 'Turn the switch key to the ON position.'],
    ])
  })

  test('plusieurs tableaux dans le même document sont rattachés chacun à leur propre titre le plus proche', async () => {
    const docx = await construireDocxAvecCorps(`
      <w:p><w:r><w:t>Powering on the head</w:t></w:r></w:p>
      <w:tbl>
        <w:tr><w:tc><w:p><w:r><w:t>1</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Press start.</w:t></w:r></w:p></w:tc></w:tr>
      </w:tbl>
      <w:p><w:r><w:t>Powering off the head</w:t></w:r></w:p>
      <w:tbl>
        <w:tr><w:tc><w:p><w:r><w:t>1</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Press stop.</w:t></w:r></w:p></w:tc></w:tr>
      </w:tbl>
    `)

    const tableaux = await extraireTableauxDocx(docx)

    expect(tableaux).toHaveLength(2)
    expect(tableaux[0]?.titreProchePrecedent).toBe('Powering on the head')
    expect(tableaux[1]?.titreProchePrecedent).toBe('Powering off the head')
  })

  test('une cellule sur plusieurs paragraphes est jointe par un saut de ligne', async () => {
    const docx = await construireDocxAvecCorps(`
      <w:tbl>
        <w:tr>
          <w:tc><w:p><w:r><w:t>2</w:t></w:r></w:p></w:tc>
          <w:tc>
            <w:p><w:r><w:t>Le voyant vert s'allume.</w:t></w:r></w:p>
            <w:p><w:r><w:t>Attendre 10 secondes.</w:t></w:r></w:p>
          </w:tc>
        </w:tr>
      </w:tbl>
    `)

    const tableaux = await extraireTableauxDocx(docx)

    expect(tableaux[0]?.lignes[0]?.[1]).toBe("Le voyant vert s'allume.\nAttendre 10 secondes.")
  })

  test('un .docx sans tableau retourne une liste vide, jamais une erreur', async () => {
    const docx = await construireDocxMinimal('Procédure sans tableau.')
    expect(await extraireTableauxDocx(docx)).toEqual([])
  })

  test("un fichier qui n'est pas un zip lève DocumentInvalideError", async () => {
    const donneesInvalides = new TextEncoder().encode("ceci n'est pas un docx").buffer
    await expect(extraireTableauxDocx(donneesInvalides)).rejects.toThrow(DocumentInvalideError)
  })
})
