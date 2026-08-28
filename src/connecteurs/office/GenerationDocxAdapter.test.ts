import JSZip from 'jszip'
import { describe, expect, test } from 'vitest'
import type { DonneesExportGabarit } from '../../logique-metier/export/donneesExportGabarit'
import { GabaritDocxInvalideError } from './erreurs'
import { genererDocxPersonnalise, verifierGabaritExportClient } from './GenerationDocxAdapter'

/** Même structure OOXML minimale que `DocxNatifAdapter.test.ts`, corps fourni tel quel pour poser des balises `docxtemplater` réelles. */
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

async function lireDocumentXml(zip: JSZip): Promise<string> {
  const fichier = zip.file('word/document.xml')
  if (!fichier) throw new Error('word/document.xml absent du .docx généré')
  return fichier.async('string')
}

const donneesMinimales: DonneesExportGabarit = {
  titre: 'Contexte procédé — Ligne A12',
  reference: 'REF-1',
  version: '0.1',
  statut: 'Brouillon (aide à la rédaction)',
  responsabilite_transferee: false,
  redacteurs: 'alice',
  approbateur_final: 'bob',
  contenu_generique: null,
  sections: [],
  historique_revisions: [
    { version: '0.2', date: '2026-02-01', auteur: 'alice', motif: 'correction' },
  ],
}

describe('genererDocxPersonnalise', () => {
  test('remplace les balises scalaires par les valeurs de DonneesExportGabarit', async () => {
    const gabarit = await construireGabaritDocx(
      '<w:p><w:r><w:t>{titre} - {reference} - {redacteurs} / {approbateur_final}</w:t></w:r></w:p>',
    )
    const resultat = await genererDocxPersonnalise(gabarit, donneesMinimales)
    const relu = await JSZip.loadAsync(resultat)
    const xml = await lireDocumentXml(relu)
    expect(xml).toContain('Contexte procédé — Ligne A12')
    expect(xml).toContain('REF-1')
    expect(xml).toContain('alice')
    expect(xml).toContain('bob')
  })

  test('boucle historique_revisions rendue correctement', async () => {
    const gabarit = await construireGabaritDocx(
      '<w:p><w:r><w:t>{#historique_revisions}{version}/{date}/{auteur}/{motif}{/historique_revisions}</w:t></w:r></w:p>',
    )
    const resultat = await genererDocxPersonnalise(gabarit, donneesMinimales)
    const relu = await JSZip.loadAsync(resultat)
    const xml = await lireDocumentXml(relu)
    expect(xml).toContain('0.2/2026-02-01/alice/correction')
  })

  test('une balise absente des données produit une cellule vide, jamais le texte "undefined" (bug réel corrigé)', async () => {
    const gabarit = await construireGabaritDocx(
      '<w:p><w:r><w:t>avant-{balise_qui_n_existe_pas}-après</w:t></w:r></w:p>',
    )
    const resultat = await genererDocxPersonnalise(gabarit, donneesMinimales)
    const relu = await JSZip.loadAsync(resultat)
    const xml = await lireDocumentXml(relu)
    expect(xml).not.toContain('undefined')
    expect(xml).toContain('avant--après')
  })

  test('produit un .docx réellement réouvrable (structure de zip valide)', async () => {
    const gabarit = await construireGabaritDocx('<w:p><w:r><w:t>{titre}</w:t></w:r></w:p>')
    const resultat = await genererDocxPersonnalise(gabarit, donneesMinimales)
    const relu = await JSZip.loadAsync(resultat)
    expect(relu.file('word/document.xml')).not.toBeNull()
    expect(relu.file('[Content_Types].xml')).not.toBeNull()
  })

  test('fichier qui n’est pas un .docx valide lève GabaritDocxInvalideError', async () => {
    const faux = new TextEncoder().encode('ceci n’est pas un zip').buffer
    await expect(genererDocxPersonnalise(faux as ArrayBuffer, donneesMinimales)).rejects.toThrow(
      GabaritDocxInvalideError,
    )
  })

  test('boucle mal fermée dans le gabarit lève GabaritDocxInvalideError, jamais une erreur brute', async () => {
    const gabarit = await construireGabaritDocx(
      '<w:p><w:r><w:t>{#historique_revisions}{version}</w:t></w:r></w:p>',
    )
    await expect(genererDocxPersonnalise(gabarit, donneesMinimales)).rejects.toThrow(
      GabaritDocxInvalideError,
    )
  })
})

describe('verifierGabaritExportClient', () => {
  test('les 3 balises obligatoires présentes -> aucune manquante', async () => {
    const gabarit = await construireGabaritDocx(
      '<w:p><w:r><w:t>{redacteurs} {approbateur_final}</w:t></w:r></w:p>' +
        '<w:p><w:r><w:t>{#historique_revisions}{version}{/historique_revisions}</w:t></w:r></w:p>',
    )
    const resultat = verifierGabaritExportClient(gabarit)
    expect(resultat.tagsObligatoiresManquants).toEqual([])
    expect(resultat.tagsTrouves).toEqual(
      expect.arrayContaining(['redacteurs', 'approbateur_final', 'historique_revisions']),
    )
  })

  test('balises obligatoires absentes -> toutes signalées', async () => {
    const gabarit = await construireGabaritDocx('<w:p><w:r><w:t>{titre}</w:t></w:r></w:p>')
    const resultat = verifierGabaritExportClient(gabarit)
    expect(resultat.tagsObligatoiresManquants).toEqual([
      'redacteurs',
      'approbateur_final',
      'historique_revisions',
    ])
  })

  test('gabarit invalide lève GabaritDocxInvalideError', () => {
    const faux = new TextEncoder().encode('pas un docx').buffer
    expect(() => verifierGabaritExportClient(faux as ArrayBuffer)).toThrow(GabaritDocxInvalideError)
  })
})
