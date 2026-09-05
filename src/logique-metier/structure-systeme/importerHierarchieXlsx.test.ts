import { describe, expect, test } from 'vitest'
import { preparerImportHierarchie } from './importerHierarchieXlsx'

const SCHEMA_TEST = {
  levels: [
    {
      key: 'batiment',
      label: { fr: 'Bâtiment', en: 'Building', de: 'Gebäude' },
      numbering_pattern: '',
    },
    { key: 'ligne', label: { fr: 'Ligne', en: 'Line', de: 'Linie' }, numbering_pattern: '' },
    {
      key: 'equipement',
      label: { fr: 'Équipement', en: 'Equipment', de: 'Gerät' },
      numbering_pattern: '',
    },
  ],
}

describe('preparerImportHierarchie', () => {
  test('grille vide est rejetée explicitement', () => {
    const resultat = preparerImportHierarchie([], SCHEMA_TEST, [])
    expect(resultat).toEqual({ ok: false, raison: 'grille_vide' })
  })

  test('un en-tête sans niveau correspondant est rejeté, jamais inventé', () => {
    const resultat = preparerImportHierarchie([['Zone inconnue', 'Ligne']], SCHEMA_TEST, [])
    expect(resultat).toEqual({
      ok: false,
      raison: 'colonne_niveau_inconnue',
      entete: 'Zone inconnue',
    })
  })

  test('la correspondance des en-têtes est insensible à la casse et aux accents', () => {
    const resultat = preparerImportHierarchie(
      [
        ['BATIMENT', 'ligne'],
        ['Bât A', 'Ligne 1'],
      ],
      SCHEMA_TEST,
      [],
    )
    expect(resultat.ok).toBe(true)
  })

  test('un ordre de colonnes incohérent avec le schéma (spécifique avant générique) est rejeté', () => {
    const resultat = preparerImportHierarchie([['Équipement', 'Bâtiment']], SCHEMA_TEST, [])
    expect(resultat).toEqual({
      ok: false,
      raison: 'ordre_colonnes_incoherent',
      entete: 'Bâtiment',
    })
  })

  test('construit un chemin racine→feuille et déduplique les ancêtres partagés entre lignes', () => {
    const resultat = preparerImportHierarchie(
      [
        ['Bâtiment', 'Ligne', 'Équipement'],
        ['Bât A', 'Ligne 1', 'Presse 1'],
        ['Bât A', 'Ligne 1', 'Convoyeur'],
        ['Bât A', 'Ligne 2', ''],
      ],
      SCHEMA_TEST,
      [],
    )

    if (!resultat.ok) throw new Error('attendu ok:true')
    const { aCreer, erreurs } = resultat.plan

    expect(erreurs).toEqual([])
    // Bât A (1) + Ligne 1 (1, partagée par 2 lignes) + Presse 1 + Convoyeur + Ligne 2 = 5 nœuds, pas 8.
    expect(aCreer).toHaveLength(5)

    const batA = aCreer.find((n) => n.name === 'Bât A')
    const ligne1 = aCreer.find((n) => n.name === 'Ligne 1')
    const ligne2 = aCreer.find((n) => n.name === 'Ligne 2')
    const presse1 = aCreer.find((n) => n.name === 'Presse 1')
    const convoyeur = aCreer.find((n) => n.name === 'Convoyeur')

    expect(batA?.parent_id).toBeNull()
    expect(ligne1?.parent_id).toBe(batA?.id)
    expect(ligne2?.parent_id).toBe(batA?.id)
    expect(presse1?.parent_id).toBe(ligne1?.id)
    expect(convoyeur?.parent_id).toBe(ligne1?.id)
    // Une seule instance de "Ligne 1" créée malgré 2 lignes la référençant.
    expect(aCreer.filter((n) => n.name === 'Ligne 1')).toHaveLength(1)
  })

  test('une case vide au milieu de la ligne est une erreur explicite, jamais une case sautée', () => {
    const resultat = preparerImportHierarchie(
      [
        ['Bâtiment', 'Ligne', 'Équipement'],
        ['Bât A', '', 'Presse 1'],
      ],
      SCHEMA_TEST,
      [],
    )

    if (!resultat.ok) throw new Error('attendu ok:true')
    expect(resultat.plan.erreurs).toEqual([{ ligne: 2, raison: 'case_vide_au_milieu' }])
    expect(resultat.plan.aCreer).toEqual([])
  })

  test('une ligne entièrement vide est ignorée silencieusement (séparateur de tableur)', () => {
    const resultat = preparerImportHierarchie(
      [
        ['Bâtiment', 'Ligne'],
        ['', ''],
        ['Bât A', 'Ligne 1'],
      ],
      SCHEMA_TEST,
      [],
    )

    if (!resultat.ok) throw new Error('attendu ok:true')
    expect(resultat.plan.erreurs).toEqual([])
    expect(resultat.plan.aCreer).toHaveLength(2)
  })

  test('un code explicite déjà utilisé (existant) est refusé, jamais renommé silencieusement', () => {
    const resultat = preparerImportHierarchie(
      [
        ['Bâtiment', 'Code'],
        ['Bât A', 'BAT-EXISTANT'],
      ],
      SCHEMA_TEST,
      [{ id: 'noeud-existant', code: 'BAT-EXISTANT' }],
    )

    if (!resultat.ok) throw new Error('attendu ok:true')
    expect(resultat.plan.erreurs).toEqual([{ ligne: 2, raison: 'code_deja_utilise' }])
    expect(resultat.plan.aCreer).toEqual([])
  })

  test('un code explicite déjà utilisé au sein du même lot est refusé pour la 2e occurrence', () => {
    const resultat = preparerImportHierarchie(
      [
        ['Bâtiment', 'Code'],
        ['Bât A', 'DUPLIQUE'],
        ['Bât B', 'DUPLIQUE'],
      ],
      SCHEMA_TEST,
      [],
    )

    if (!resultat.ok) throw new Error('attendu ok:true')
    expect(resultat.plan.aCreer).toHaveLength(1)
    expect(resultat.plan.erreurs).toEqual([{ ligne: 3, raison: 'code_deja_utilise' }])
  })

  test('un code est généré automatiquement si aucune colonne Code, jamais un champ vide', () => {
    const resultat = preparerImportHierarchie([['Bâtiment'], ['Bât A'], ['Bât B']], SCHEMA_TEST, [])

    if (!resultat.ok) throw new Error('attendu ok:true')
    expect(resultat.plan.aCreer.map((n) => n.code)).toEqual(['batiment-1', 'batiment-2'])
  })

  test('un sous-ensemble des niveaux (sans le niveau le plus fin) est accepté', () => {
    const resultat = preparerImportHierarchie(
      [
        ['Bâtiment', 'Ligne'],
        ['Bât A', 'Ligne 1'],
      ],
      SCHEMA_TEST,
      [],
    )

    if (!resultat.ok) throw new Error('attendu ok:true')
    expect(resultat.plan.aCreer.map((n) => n.level_key)).toEqual(['batiment', 'ligne'])
  })
})
