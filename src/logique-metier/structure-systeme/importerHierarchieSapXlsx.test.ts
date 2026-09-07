import { describe, expect, test } from 'vitest'
import { preparerImportHierarchieSap } from './importerHierarchieSapXlsx'

const SCHEMA_3_NIVEAUX = {
  levels: [
    { key: 'site', label: { fr: 'Site', en: 'Site', de: 'Standort' }, numbering_pattern: '' },
    {
      key: 'departement',
      label: { fr: 'Département', en: 'Department', de: 'Abteilung' },
      numbering_pattern: '',
    },
    {
      key: 'equipement',
      label: { fr: 'Équipement', en: 'Equipment', de: 'Gerät' },
      numbering_pattern: '',
    },
  ],
}

/** Construit une ligne « code + description » avec le code à `colonneCode` (0-based) et la description 3 colonnes plus loin — même forme qu'un export SAP réel (cellules intermédiaires vides = indentation). */
function ligne(colonneCode: number, code: string, description: string): string[] {
  const l: string[] = []
  l[colonneCode] = code
  l[colonneCode + 3] = description
  return l.map((v) => v ?? '')
}

/** Ligne racine avec la case à cocher SAP en colonne A (jamais un code). */
function ligneAvecCaseACocher(colonneCode: number, code: string, description: string): string[] {
  const l = ligne(colonneCode, code, description)
  l[0] = 'X'
  return l
}

/** Grille représentative d'un export SAP réel : en-têtes/légende + case à cocher + arborescence sur 3 niveaux. */
const GRILLE_SAP_TYPE = [
  ['Functional Location', '', '', '', '', '', 'Valid From'],
  ['Description', '', '', '', 'SMP'],
  [],
  ligneAvecCaseACocher(1, 'SMP', 'SMP'),
  [],
  ligne(2, 'ENG', 'ENGENEERING FL'),
  [],
  ligne(3, '10008400', 'STD CONDUCTIMETER (TESTO)'),
]

describe('preparerImportHierarchieSap', () => {
  test('grille vide est rejetée explicitement', () => {
    const resultat = preparerImportHierarchieSap([], SCHEMA_3_NIVEAUX, [])
    expect(resultat).toEqual({ ok: false, raison: 'grille_vide' })
  })

  test('grille ne contenant que des en-têtes/légende est rejetée comme vide', () => {
    const resultat = preparerImportHierarchieSap(
      [['Functional Location'], ['Description']],
      SCHEMA_3_NIVEAUX,
      [],
    )
    expect(resultat).toEqual({ ok: false, raison: 'grille_vide' })
  })

  test('construit l’arborescence depuis la position de colonne du code, ignore en-têtes/lignes vides/case à cocher', () => {
    const resultat = preparerImportHierarchieSap(GRILLE_SAP_TYPE, SCHEMA_3_NIVEAUX, [])

    if (!resultat.ok) throw new Error('attendu ok:true')
    const { aCreer, erreurs } = resultat.plan
    expect(erreurs).toEqual([])
    expect(aCreer).toHaveLength(3)

    const smp = aCreer.find((n) => n.code === 'SMP')
    const eng = aCreer.find((n) => n.code === 'ENG')
    const equip = aCreer.find((n) => n.code === '10008400')

    expect(smp).toMatchObject({ level_key: 'site', name: 'SMP', parent_id: null })
    expect(eng).toMatchObject({ level_key: 'departement', name: 'ENGENEERING FL' })
    expect(eng?.parent_id).toBe(smp?.id)
    expect(equip).toMatchObject({
      level_key: 'equipement',
      name: 'STD CONDUCTIMETER (TESTO)',
    })
    expect(equip?.parent_id).toBe(eng?.id)
  })

  test('profondeur du fichier supérieure aux niveaux configurés est refusée, jamais un niveau fabriqué', () => {
    const schemaTropCourt = { levels: SCHEMA_3_NIVEAUX.levels.slice(0, 2) }
    const resultat = preparerImportHierarchieSap(GRILLE_SAP_TYPE, schemaTropCourt, [])
    expect(resultat).toEqual({
      ok: false,
      raison: 'profondeur_insuffisante',
      profondeurRequise: 3,
      profondeurConfiguree: 2,
    })
  })

  test('une ligne apparaissant avant que son ancêtre de rang immédiatement supérieur n’ait été créé est une erreur explicite, jamais rattachée à la racine', () => {
    const grille = [
      ligne(2, 'ENG', 'ENGENEERING FL'), // rang 2, mais rien n'a encore été créé au rang 1
      ligneAvecCaseACocher(1, 'SMP', 'SMP'), // rang 1, établi seulement après
    ]
    const resultat = preparerImportHierarchieSap(grille, SCHEMA_3_NIVEAUX, [])

    if (!resultat.ok) throw new Error('attendu ok:true')
    expect(resultat.plan.erreurs).toEqual([{ ligne: 1, raison: 'ancetre_manquant' }])
    expect(resultat.plan.aCreer.map((n) => n.code)).toEqual(['SMP'])
  })

  test('un code déjà utilisé (existant) est refusé, jamais renommé silencieusement', () => {
    const grille = [ligneAvecCaseACocher(1, 'SMP', 'SMP')]
    const resultat = preparerImportHierarchieSap(grille, SCHEMA_3_NIVEAUX, [
      { id: 'noeud-existant', code: 'SMP' },
    ])

    if (!resultat.ok) throw new Error('attendu ok:true')
    expect(resultat.plan.erreurs).toEqual([{ ligne: 1, raison: 'code_deja_utilise' }])
    expect(resultat.plan.aCreer).toEqual([])
  })

  test('un code déjà utilisé au sein du même lot est refusé pour la 2e occurrence', () => {
    const grille = [
      ligneAvecCaseACocher(1, 'SMP', 'SMP'),
      ligne(2, 'DUP', 'Département A'),
      ligne(2, 'DUP', 'Doublon'), // même rang, même code que la ligne précédente
    ]
    const resultat = preparerImportHierarchieSap(grille, SCHEMA_3_NIVEAUX, [])

    if (!resultat.ok) throw new Error('attendu ok:true')
    expect(resultat.plan.aCreer.map((n) => n.code)).toEqual(['SMP', 'DUP'])
    expect(resultat.plan.erreurs).toEqual([{ ligne: 3, raison: 'code_deja_utilise' }])
  })

  test('une ligne avec plus de deux cellules significatives est une erreur explicite, jamais devinée', () => {
    const ligneAmbigue = ligne(1, 'AUTRE', 'Nom')
    ligneAmbigue[3] = 'EXTRA' // 3e cellule significative, forme inattendue
    const grille = [ligneAvecCaseACocher(1, 'SMP', 'SMP'), ligneAmbigue]
    const resultat = preparerImportHierarchieSap(grille, SCHEMA_3_NIVEAUX, [])

    if (!resultat.ok) throw new Error('attendu ok:true')
    expect(resultat.plan.erreurs).toEqual([{ ligne: 2, raison: 'forme_ligne_inattendue' }])
    expect(resultat.plan.aCreer.map((n) => n.code)).toEqual(['SMP'])
  })

  test('un code seul sans description utilise le code comme nom', () => {
    const grille = [['X', 'SMP']]
    const resultat = preparerImportHierarchieSap(grille, SCHEMA_3_NIVEAUX, [])

    if (!resultat.ok) throw new Error('attendu ok:true')
    expect(resultat.plan.aCreer).toEqual([
      expect.objectContaining({ code: 'SMP', name: 'SMP', level_key: 'site', parent_id: null }),
    ])
  })
})
