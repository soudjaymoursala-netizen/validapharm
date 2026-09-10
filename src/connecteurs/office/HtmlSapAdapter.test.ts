import { describe, expect, test } from 'vitest'
import { extraireGrilleHtmlSap } from './HtmlSapAdapter'

/**
 * Construit une ligne de donnée SAP réaliste : case à cocher + cellules
 * `<nobr id="l{ligne}{colonne}">texte</nobr>` — même convention d'`id` que
 * l'export réel (numéro de ligne SAP interne, puis colonne caractère
 * réelle). `icone: true` place la cellule dans la police `SAPDings`
 * (jamais du texte réel, ignorée).
 */
function ligneHtml(
  numeroLigne: number,
  cellules: Array<{ colonne: number; texte: string; icone?: boolean }>,
): string {
  const prefixeLigne = String(numeroLigne).padStart(4, '0')
  const corps = cellules
    .map(({ colonne, texte, icone }) => {
      const id = `l${prefixeLigne}${String(colonne).padStart(3, '0')}`
      const police = icone ? 'SAPDings' : 'courier new'
      return `<font face="${police}"><nobr id=${id}>${texte}</nobr></font>`
    })
    .join('')
  return `<input type="checkbox">${corps}<br>`
}

/** Ligne d'en-tête/légende — jamais de case à cocher, toujours ignorée. */
function ligneEntete(numeroLigne: number, texte: string): string {
  const prefixeLigne = String(numeroLigne).padStart(4, '0')
  return `<font face="courier new"><nobr id=l${prefixeLigne}002><b>${texte}</b></nobr></font><br>`
}

/** Ligne purement décorative (trait de connexion de l'arbre) — jamais de case à cocher non plus. */
function ligneConnecteur(numeroLigne: number, trait: string): string {
  const prefixeLigne = String(numeroLigne).padStart(4, '0')
  return `<font face="courier new"><nobr id=l${prefixeLigne}003>${trait}</nobr></font><br>`
}

const DOCUMENT_SAP_TYPE = `<html><body>
${ligneEntete(1, 'Functional Location')}
${ligneEntete(2, 'Description')}
${ligneHtml(4, [
  { colonne: 4, texte: 'SMP' },
  { colonne: 40, texte: 'SMP' },
])}
${ligneConnecteur(5, '|')}
${ligneHtml(6, [
  { colonne: 3, texte: '  ' },
  { colonne: 5, texte: '|--' },
  { colonne: 9, texte: '5', icone: true },
  { colonne: 12, texte: 'SMP-ENG' },
  { colonne: 52, texte: 'ENGENEERING FL' },
])}
${ligneConnecteur(7, '|   |')}
${ligneHtml(8, [
  { colonne: 3, texte: '  ' },
  { colonne: 5, texte: '|' },
  { colonne: 6, texte: '   ' },
  { colonne: 9, texte: '|--' },
  { colonne: 13, texte: '5', icone: true },
  { colonne: 16, texte: '10008400' },
  { colonne: 56, texte: 'STD CONDUCTIMETER (TESTO)' },
])}
</body></html>`

describe('extraireGrilleHtmlSap', () => {
  test('ignore les en-têtes et les lignes purement décoratives (aucune case à cocher)', () => {
    const grille = extraireGrilleHtmlSap(
      `<html><body>${ligneEntete(1, 'Functional Location')}${ligneConnecteur(2, '|')}</body></html>`,
    )
    expect(grille).toEqual([])
  })

  test('reconstruit une grille exploitable par preparerImportHierarchieSap, profondeur par colonne réelle (id)', () => {
    const grille = extraireGrilleHtmlSap(DOCUMENT_SAP_TYPE)

    expect(grille).toHaveLength(3)

    // Racine : code en colonne 4, description en colonne 40.
    expect(grille[0]?.[4]).toBe('SMP')
    expect(grille[0]?.[40]).toBe('SMP')
    expect(grille[0]?.[0]).toBeUndefined()

    // Niveau 2 : code en colonne 12 (jamais confondu avec la case à
    // cocher, le trait décoratif « |-- » ou l'icône SAPDings).
    expect(grille[1]?.[12]).toBe('SMP-ENG')
    expect(grille[1]?.[52]).toBe('ENGENEERING FL')
    expect(grille[1]?.some((valeur, i) => i !== 12 && i !== 52 && valeur !== undefined)).toBe(false)

    // Niveau 3 : code en colonne 16, jamais l'icône (colonne 13) ni les traits (5, 6, 9).
    expect(grille[2]?.[16]).toBe('10008400')
    expect(grille[2]?.[56]).toBe('STD CONDUCTIMETER (TESTO)')
  })

  test('un id sans partie numérique valide (jamais un export SAP réel) est ignoré, jamais une exception', () => {
    const grille = extraireGrilleHtmlSap(
      '<html><body><input type="checkbox"><font><nobr id=colonneA>ABC</nobr></font><br></body></html>',
    )
    expect(grille).toEqual([])
  })

  test('une ligne à une seule cellule (aucune autre pour déterminer la colonne réelle par préfixe commun) retombe en colonne 0, jamais une exception', () => {
    const grille = extraireGrilleHtmlSap(
      `<html><body>${ligneHtml(4, [{ colonne: 4, texte: 'SMP' }])}</body></html>`,
    )
    expect(grille).toHaveLength(1)
    expect(grille[0]?.[0]).toBe('SMP')
  })
})
