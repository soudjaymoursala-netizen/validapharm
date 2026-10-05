import PizZip from 'pizzip'
import type { Langue } from '../../logique-metier/domaine/types'
import type { DonneesExportGabarit } from '../../logique-metier/export/donneesExportGabarit'

/**
 * Export Word par défaut en **vrai `.docx`** (OOXML), sans gabarit client
 * — décision du 29/09/2026. Remplace l'ancien « HTML encapsulé en `.doc` »,
 * que Word ouvrait avec un avertissement de format (audit UX du
 * 25/09/2026, constat 9).
 *
 * Consomme `DonneesExportGabarit`, exactement comme le `.docx` au gabarit
 * client (`GenerationDocxAdapter.ts`) : les deux documents portent les
 * mêmes valeurs, seule la mise en forme diffère.
 *
 * Le paquet est écrit directement (quatre parties XML minimales) avec
 * `pizzip`, déjà utilisé pour les gabarits clients : aucune dépendance
 * supplémentaire, aucun appel réseau.
 */
export function genererDocxParDefaut(donnees: DonneesExportGabarit, langue: Langue): ArrayBuffer {
  const zip = new PizZip()
  zip.file('[Content_Types].xml', TYPES_CONTENU)
  zip.file('_rels/.rels', RELATIONS_PAQUET)
  zip.file('word/_rels/document.xml.rels', RELATIONS_DOCUMENT)
  zip.file('word/styles.xml', styles(langue))
  zip.file('docProps/core.xml', proprietes(donnees.titre))
  zip.file('word/document.xml', documentXml(donnees))
  return zip.generate({ type: 'arraybuffer', compression: 'DEFLATE' }) as ArrayBuffer
}

function documentXml(d: DonneesExportGabarit): string {
  const corps: string[] = [
    paragraphe(d.titre, 'Title'),
    paragrapheLibelle([
      ['Référence', d.reference || '—'],
      ['Version', d.version || '—'],
    ]),
    paragrapheLibelle([['Statut', d.statut]]),
  ]
  if (d.responsabilite_transferee) {
    corps.push(
      paragraphe(
        "Responsabilité de conformité et de conservation réglementaire : transférée au système qualité du client dès la reprise formelle de ce livrable. ValidaPharm n'est jamais le système d'enregistrement officiel.",
        'Encadre',
      ),
    )
  }

  corps.push(paragraphe('Rédaction, relecture et approbation', 'Heading1'))
  corps.push(
    tableau(
      ['Rôle', 'Personne', 'Date', 'Avis / décision'],
      [
        ['Rédacteur(s)', d.redacteurs, '', ''],
        ...d.avis_relecture.map((a) => [
          'Relecteur',
          a.relecteur,
          a.date,
          `${a.avis} — ${a.cycle}`,
        ]),
        [
          'Approbateur final',
          d.approuve_par || d.approbateur_final,
          d.date_approbation,
          d.date_approbation ? 'Approuvé — validé en interne' : 'Approbation non encore donnée',
        ],
      ],
    ),
  )

  if (d.contenu_generique !== null) {
    corps.push(paragraphe('Contenu', 'Heading1'))
    corps.push(paragraphe(d.contenu_generique || '—'))
  }
  for (const s of d.sections) {
    corps.push(paragraphe(s.titre, 'Heading1'))
    for (const champ of s.champs) {
      // Un champ seul qui porte le nom de sa section n'a pas besoin d'un second titre identique.
      if (champ.libelle !== s.titre) corps.push(paragraphe(champ.libelle, 'Heading2'))
      corps.push(paragraphe(champ.valeur || '—'))
    }
    for (const t of s.tableaux) {
      if (t.libelle !== s.titre) corps.push(paragraphe(t.libelle, 'Heading2'))
      corps.push(
        t.cellules.length === 0 ? paragraphe('Aucune ligne.') : tableau(t.colonnes, t.cellules),
      )
    }
  }

  corps.push(paragraphe('Historique des révisions', 'Heading1'))
  corps.push(
    d.historique_revisions.length === 0
      ? paragraphe('Aucune révision.')
      : tableau(
          ['Version', 'Date', 'Auteur', 'Motif'],
          d.historique_revisions.map((r) => [r.version, r.date, r.auteur, r.motif]),
        ),
  )

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${NS_W}"><w:body>${corps.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr></w:body></w:document>`
}

function paragraphe(texte: string, style?: string): string {
  const proprietesParagraphe = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ''
  return `<w:p>${proprietesParagraphe}${runs(texte)}</w:p>`
}

/** « Libellé : valeur » (libellé en gras), plusieurs paires séparées par un tiret cadratin. */
function paragrapheLibelle(paires: Array<[string, string]>): string {
  const contenu = paires
    .map(
      ([libelle, valeur], index) =>
        `${index > 0 ? runs(' — ') : ''}${runs(`${libelle} : `, true)}${runs(valeur)}`,
    )
    .join('')
  return `<w:p>${contenu}</w:p>`
}

/** Texte → runs Word ; les retours à la ligne deviennent des sauts de ligne. */
function runs(texte: string, gras = false): string {
  const proprietesRun = gras ? '<w:rPr><w:b/></w:rPr>' : ''
  return texte
    .split(/\r?\n/)
    .map(
      (ligne, index) =>
        `<w:r>${proprietesRun}${index > 0 ? '<w:br/>' : ''}<w:t xml:space="preserve">${echapperXml(ligne)}</w:t></w:r>`,
    )
    .join('')
}

function tableau(entetes: string[], lignes: string[][]): string {
  const cellule = (texte: string, entete: boolean) =>
    `<w:tc><w:tcPr>${entete ? '<w:shd w:val="clear" w:color="auto" w:fill="E7ECF3"/>' : ''}</w:tcPr><w:p>${runs(texte, entete)}</w:p></w:tc>`
  const rangeeEntete = `<w:tr><w:trPr><w:tblHeader/></w:trPr>${entetes.map((e) => cellule(e, true)).join('')}</w:tr>`
  const rangees = lignes
    .map(
      (ligne) =>
        `<w:tr><w:trPr><w:cantSplit/></w:trPr>${entetes.map((_, i) => cellule(ligne[i] ?? '', false)).join('')}</w:tr>`,
    )
    .join('')
  // Un paragraphe vide après le tableau : Word fusionnerait sinon deux tableaux consécutifs.
  return `<w:tbl><w:tblPr><w:tblStyle w:val="Grille"/><w:tblW w:w="5000" w:type="pct"/></w:tblPr><w:tblGrid>${entetes.map(() => `<w:gridCol w:w="${Math.floor(LARGEUR_UTILE / entetes.length)}"/>`).join('')}</w:tblGrid>${rangeeEntete}${rangees}</w:tbl><w:p/>`
}

/** Échappement XML, et retrait des caractères de contrôle interdits en XML 1.0 (Word refuserait d'ouvrir le fichier). */
function echapperXml(texte: string): string {
  return texte
    .replace(/[^\t\n\r -퟿-�\u{10000}-\u{10FFFF}]/gu, '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

const NS_W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

/** Largeur utile d'une page A4 aux marges de 2 cm, en vingtièmes de point. */
const LARGEUR_UTILE = 9638

const TYPES_CONTENU = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`

const RELATIONS_PAQUET = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`

const RELATIONS_DOCUMENT = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`

const LANGUES_WORD: Record<Langue, string> = { fr: 'fr-FR', en: 'en-GB', de: 'de-DE' }

function styles(langue: Langue): string {
  const police =
    '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/>'
  const titre = (id: string, nom: string, taille: number, espaceAvant: number) =>
    `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${nom}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="${espaceAvant}" w:after="120"/><w:outlineLvl w:val="${id === 'Heading1' ? 0 : 1}"/></w:pPr><w:rPr><w:b/><w:color w:val="1F3B5C"/><w:sz w:val="${taille}"/></w:rPr></w:style>`
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="${NS_W}"><w:docDefaults><w:rPrDefault><w:rPr>${police}<w:sz w:val="22"/><w:lang w:val="${LANGUES_WORD[langue]}"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:color w:val="1F3B5C"/><w:sz w:val="40"/></w:rPr></w:style>${titre('Heading1', 'heading 1', 30, 360)}${titre('Heading2', 'heading 2', 24, 200)}<w:style w:type="paragraph" w:customStyle="1" w:styleId="Encadre"><w:name w:val="Encadré"/><w:basedOn w:val="Normal"/><w:pPr><w:pBdr><w:top w:val="single" w:sz="6" w:space="4" w:color="1F3B5C"/><w:left w:val="single" w:sz="6" w:space="4" w:color="1F3B5C"/><w:bottom w:val="single" w:sz="6" w:space="4" w:color="1F3B5C"/><w:right w:val="single" w:sz="6" w:space="4" w:color="1F3B5C"/></w:pBdr></w:pPr></w:style><w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style><w:style w:type="table" w:styleId="Grille"><w:name w:val="Table Grid"/><w:basedOn w:val="TableNormal"/><w:pPr><w:spacing w:after="0"/></w:pPr><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="8A99AD"/><w:left w:val="single" w:sz="4" w:space="0" w:color="8A99AD"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="8A99AD"/><w:right w:val="single" w:sz="4" w:space="0" w:color="8A99AD"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="8A99AD"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="8A99AD"/></w:tblBorders></w:tblPr></w:style></w:styles>`
}

function proprietes(titre: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${echapperXml(titre)}</dc:title><dc:creator>ValidaPharm</dc:creator></cp:coreProperties>`
}
