import JSZip from 'jszip'
import { describe, expect, test } from 'vitest'
import { DocumentInvalideError } from './erreurs'
import { extraireGrilleXlsx } from './XlsxNatifAdapter'

const ESPACE_NOMS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'

/** Construit un `.xlsx` minimal (mais réel) — uniquement les deux parties lues par ce lecteur volontairement étroit, jamais un faux fichier renommé. */
async function construireXlsxMinimal(options: {
  chainesPartagees?: string[]
  lignesXml: string
}): Promise<ArrayBuffer> {
  const zip = new JSZip()
  if (options.chainesPartagees) {
    const si = options.chainesPartagees.map((texte) => `<si><t>${texte}</t></si>`).join('')
    zip.file('xl/sharedStrings.xml', `<?xml version="1.0"?><sst xmlns="${ESPACE_NOMS}">${si}</sst>`)
  }
  zip.file(
    'xl/worksheets/sheet1.xml',
    `<?xml version="1.0"?><worksheet xmlns="${ESPACE_NOMS}"><sheetData>${options.lignesXml}</sheetData></worksheet>`,
  )
  return zip.generateAsync({ type: 'arraybuffer' })
}

describe('extraireGrilleXlsx', () => {
  test('lit des valeurs texte via les chaînes partagées', async () => {
    const fichier = await construireXlsxMinimal({
      chainesPartagees: ['Bâtiment', 'Ligne', 'Bât A', 'Ligne 1'],
      lignesXml:
        '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>' +
        '<row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2" t="s"><v>3</v></c></row>',
    })

    const grille = await extraireGrilleXlsx(fichier)

    expect(grille.lignes).toEqual([
      ['Bâtiment', 'Ligne'],
      ['Bât A', 'Ligne 1'],
    ])
  })

  test('lit des valeurs texte inline (sans xl/sharedStrings.xml)', async () => {
    const fichier = await construireXlsxMinimal({
      lignesXml:
        '<row r="1"><c r="A1" t="inlineStr"><is><t>Sans chaînes partagées</t></is></c></row>',
    })

    const grille = await extraireGrilleXlsx(fichier)

    expect(grille.lignes).toEqual([['Sans chaînes partagées']])
  })

  test('lit des valeurs numériques', async () => {
    const fichier = await construireXlsxMinimal({
      lignesXml: '<row r="1"><c r="A1"><v>42</v></c></row>',
    })

    const grille = await extraireGrilleXlsx(fichier)

    expect(grille.lignes).toEqual([['42']])
  })

  test("respecte les colonnes vides entre deux cellules remplies (référence de cellule, pas l'ordre d'apparition)", async () => {
    const fichier = await construireXlsxMinimal({
      chainesPartagees: ['X', 'Z'],
      lignesXml: '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="s"><v>1</v></c></row>',
    })

    const grille = await extraireGrilleXlsx(fichier)

    expect(grille.lignes).toEqual([['X', '', 'Z']])
  })

  test("lit la dernière valeur mise en cache d'une formule, ne l'évalue jamais", async () => {
    const fichier = await construireXlsxMinimal({
      lignesXml: '<row r="1"><c r="A1"><f>1+1</f><v>2</v></c></row>',
    })

    const grille = await extraireGrilleXlsx(fichier)

    expect(grille.lignes).toEqual([['2']])
  })

  test("un fichier qui n'est pas un zip lève DocumentInvalideError, jamais un crash", async () => {
    const donneesInvalides = new TextEncoder().encode("ceci n'est pas un xlsx").buffer

    await expect(extraireGrilleXlsx(donneesInvalides)).rejects.toThrow(DocumentInvalideError)
  })

  test('un zip sans xl/worksheets/sheet1.xml (pas un .xlsx) lève DocumentInvalideError', async () => {
    const zip = new JSZip()
    zip.file('autre-chose.txt', 'contenu')
    const fichier = await zip.generateAsync({ type: 'arraybuffer' })

    await expect(extraireGrilleXlsx(fichier)).rejects.toThrow(DocumentInvalideError)
  })

  test('xl/worksheets/sheet1.xml illisible (XML invalide) lève DocumentInvalideError', async () => {
    const zip = new JSZip()
    zip.file('xl/worksheets/sheet1.xml', '<worksheet><sheetData><row>')
    const fichier = await zip.generateAsync({ type: 'arraybuffer' })

    await expect(extraireGrilleXlsx(fichier)).rejects.toThrow(DocumentInvalideError)
  })

  test('une feuille sans lignes retourne une grille vide, jamais une erreur', async () => {
    const fichier = await construireXlsxMinimal({ lignesXml: '' })

    const grille = await extraireGrilleXlsx(fichier)

    expect(grille.lignes).toEqual([])
  })
})
