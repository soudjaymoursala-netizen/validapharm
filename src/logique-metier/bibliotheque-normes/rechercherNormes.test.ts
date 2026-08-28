import { describe, expect, test } from 'vitest'
import { listerNormesCatalogue, rechercherNormes } from './rechercherNormes'

describe('listerNormesCatalogue', () => {
  test('agrège les normes de tout le catalogue réel, une entrée par norme distincte', () => {
    const normes = listerNormesCatalogue()
    const libelles = normes.map((n) => n.norme)
    expect(libelles).toContain('ASTM E2500')
    expect(libelles).toContain('ICH Q8')
    // ASTM E2500 est partagée par plusieurs gabarits réels du catalogue — une seule entrée, pas une par gabarit.
    expect(libelles.filter((l) => l === 'ASTM E2500')).toHaveLength(1)
  })

  test('liste, pour chaque norme, les gabarits réels qui la citent', () => {
    const normes = listerNormesCatalogue()
    const astm = normes.find((n) => n.norme === 'ASTM E2500')
    expect(astm?.gabarits).toContain('contexte_procede')
    expect(astm?.gabarits).toContain('dq')
    expect(astm?.gabarits).toContain('urs')
  })

  test('trie les normes par ordre alphabétique', () => {
    const normes = listerNormesCatalogue()
    const libelles = normes.map((n) => n.norme)
    expect(libelles).toEqual([...libelles].sort((a, b) => a.localeCompare(b)))
  })
})

describe('rechercherNormes', () => {
  test('mot-clé vide retourne le catalogue complet', () => {
    expect(rechercherNormes('')).toEqual(listerNormesCatalogue())
  })

  test('recherche insensible à la casse', () => {
    const resultat = rechercherNormes('ich q8')
    expect(resultat.map((n) => n.norme)).toContain('ICH Q8')
  })

  test('recherche insensible aux accents (EudraLex cite des paragraphes accentués)', () => {
    const resultat = rechercherNormes('eudralex')
    expect(resultat.length).toBeGreaterThan(0)
    expect(resultat.every((n) => n.norme.toLowerCase().includes('eudralex'))).toBe(true)
  })

  test('mot-clé sans correspondance retourne un tableau vide', () => {
    expect(rechercherNormes('norme-inexistante-xyz')).toEqual([])
  })
})
