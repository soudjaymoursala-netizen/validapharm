import { pathToFileURL } from 'node:url'
import { describe, expect, test } from 'vitest'
import { DocumentPdfInvalideError } from './erreurs'
import { extraireTextePdf } from './PdfNatifAdapter'

/**
 * Configuration du worker/polices pour l'environnement de test (Node,
 * `jsdom`) — `import.meta.url` y résout vers une URL `http://localhost`
 * factice que le chargeur ESM de Node ne sait pas utiliser pour un
 * worker. En navigateur réel (Vite), la valeur par défaut de
 * `PdfNatifAdapter.ts` (résolution `import.meta.url` native) fonctionne
 * sans cette configuration — voir le docstring de l'adaptateur.
 */
function configTest() {
  return {
    workerSrc: pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')).href,
    standardFontDataUrl: pathToFileURL(
      require.resolve('pdfjs-dist/package.json').replace('package.json', 'standard_fonts/'),
    ).href,
  }
}

/**
 * Construit un PDF minimal mais réellement valide (xref/trailer à
 * offsets exacts, calculés) — jamais un fichier texte renommé, pour
 * vérifier l'extraction sur un document réel plutôt qu'un cas dégénéré.
 * Un flux de contenu par page, une ligne de texte par flux (`Tj`).
 */
function construirePdfMinimal(pages: string[]): Uint8Array {
  const objets: string[] = []
  const idPremierePage = 3
  const idsPages = pages.map((_, i) => idPremierePage + i)
  const idPolice = idPremierePage + pages.length
  const idsFlux = pages.map((_, i) => idPolice + 1 + i)

  objets.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`)
  objets.push(
    `2 0 obj\n<< /Type /Pages /Kids [${idsPages.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>\nendobj\n`,
  )
  pages.forEach((_, i) => {
    objets.push(
      `${idsPages[i]} 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 ${idPolice} 0 R >> >> /MediaBox [0 0 800 144] /Contents ${idsFlux[i]} 0 R >>\nendobj\n`,
    )
  })
  objets.push(`${idPolice} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`)
  pages.forEach((texte, i) => {
    const flux = `BT /F1 18 Tf 10 100 Td (${texte}) Tj ET`
    objets.push(
      `${idsFlux[i]} 0 obj\n<< /Length ${flux.length} >>\nstream\n${flux}\nendstream\nendobj\n`,
    )
  })

  const nombreObjets = objets.length
  let corps = '%PDF-1.4\n'
  const offsets: number[] = [0]
  for (const objet of objets) {
    offsets.push(corps.length)
    corps += objet
  }
  const debutXref = corps.length
  let xref = `xref\n0 ${nombreObjets + 1}\n0000000000 65535 f \n`
  for (let i = 1; i <= nombreObjets; i++) {
    xref += `${(offsets[i] ?? 0).toString().padStart(10, '0')} 00000 n \n`
  }
  const trailer = `trailer\n<< /Size ${nombreObjets + 1} /Root 1 0 R >>\nstartxref\n${debutXref}\n%%EOF`

  return new TextEncoder().encode(corps + xref + trailer)
}

describe('extraireTextePdf', () => {
  test("extrait le texte d'un PDF réellement valide à une page", async () => {
    const pdf = construirePdfMinimal(['Voici la procedure Impact Assessment'])
    const resultat = await extraireTextePdf(pdf.buffer as ArrayBuffer, configTest())
    expect(resultat.nombrePages).toBe(1)
    expect(resultat.texte).toContain('Voici la procedure Impact Assessment')
  })

  test('plusieurs pages sont extraites et jointes dans le bon ordre', async () => {
    const pdf = construirePdfMinimal(['Premiere page', 'Deuxieme page', 'Troisieme page'])
    const resultat = await extraireTextePdf(pdf.buffer as ArrayBuffer, configTest())

    expect(resultat.nombrePages).toBe(3)
    const indexPremiere = resultat.texte.indexOf('Premiere page')
    const indexDeuxieme = resultat.texte.indexOf('Deuxieme page')
    const indexTroisieme = resultat.texte.indexOf('Troisieme page')
    expect(indexPremiere).toBeGreaterThanOrEqual(0)
    expect(indexDeuxieme).toBeGreaterThan(indexPremiere)
    expect(indexTroisieme).toBeGreaterThan(indexDeuxieme)
  })

  test("un fichier qui n'est pas un PDF lève DocumentPdfInvalideError, jamais un crash", async () => {
    const donneesInvalides = new TextEncoder().encode("ceci n'est pas un pdf").buffer
    await expect(extraireTextePdf(donneesInvalides, configTest())).rejects.toThrow(
      DocumentPdfInvalideError,
    )
  })
})
