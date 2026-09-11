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

  test('le rang est relatif à la colonne des lignes précédentes, jamais une table globale colonne→rang : une ligne à colonne 2 puis une à colonne 1 sont deux racines (rang 1) — jamais un rattachement fantôme', () => {
    // Contrairement à une version antérieure de cette fonction, la colonne
    // absolue (2 puis 1) n'impose plus un rang fixe : la 2e ligne, de
    // colonne inférieure à la 1re, dépile et redevient elle aussi racine —
    // comportement voulu (voir docstring du module : une même profondeur
    // logique peut apparaître à des colonnes différentes selon la branche
    // sur un export SAP réel, la colonne absolue n'est jamais fiable seule).
    const grille = [ligne(2, 'ENG', 'ENGENEERING FL'), ligneAvecCaseACocher(1, 'SMP', 'SMP')]
    const resultat = preparerImportHierarchieSap(grille, SCHEMA_3_NIVEAUX, [])

    if (!resultat.ok) throw new Error('attendu ok:true')
    expect(resultat.plan.erreurs).toEqual([])
    expect(resultat.plan.aCreer).toMatchObject([
      { code: 'ENG', level_key: 'site', parent_id: null },
      { code: 'SMP', level_key: 'site', parent_id: null },
    ])
  })

  test('une ligne dont l’ancêtre a été rejeté (code déjà utilisé) est rejetée en cascade, jamais rattachée à un parent fantôme', () => {
    const grille = [
      ligneAvecCaseACocher(1, 'SMP', 'SMP'),
      ligne(2, 'ENG', 'ENGENEERING FL'),
      ligne(3, '10008400', 'STD CONDUCTIMETER (TESTO)'), // rang 3, enfant direct de ENG (rang 2)
    ]
    const resultat = preparerImportHierarchieSap(grille, SCHEMA_3_NIVEAUX, [
      { id: 'noeud-existant', code: 'ENG' }, // ENG existe déjà : sa création sera rejetée
    ])

    if (!resultat.ok) throw new Error('attendu ok:true')
    expect(resultat.plan.erreurs).toEqual([
      { ligne: 2, raison: 'code_deja_utilise' }, // ENG lui-même existe déjà
      { ligne: 3, raison: 'ancetre_manquant' }, // jamais rattaché à un id qui n'existera pas
    ])
    expect(resultat.plan.aCreer.map((n) => n.code)).toEqual(['SMP'])
  })

  test('profondeur variable selon la branche (certaines s’arrêtent plus tôt, d’autres vont plus loin), et une même profondeur logique décalée de quelques colonnes selon la branche : jamais confondue avec un niveau supplémentaire', () => {
    // Reproduit fidèlement le cas réel signalé : 7 niveaux configurés
    // (Site/Zone/Process/Ligne/Système/Équipement/Sous-équipement),
    // plusieurs branches « Système » sœurs sous la même « Ligne », certaines
    // sans équipement (feuille au rang 5), une avec équipement (rang 6) et
    // sous-équipement (rang 7) — et un décalage de colonne volontaire entre
    // deux équipements de rang identique (icône SAP de largeur différente).
    const schema7 = {
      levels: [
        { key: 'site', label: { fr: 'Site', en: 'Site', de: 'Standort' }, numbering_pattern: '' },
        { key: 'zone', label: { fr: 'Zone', en: 'Zone', de: 'Zone' }, numbering_pattern: '' },
        {
          key: 'process',
          label: { fr: 'Process', en: 'Process', de: 'Prozess' },
          numbering_pattern: '',
        },
        { key: 'ligne', label: { fr: 'Ligne', en: 'Line', de: 'Linie' }, numbering_pattern: '' },
        {
          key: 'systeme',
          label: { fr: 'Système', en: 'System', de: 'System' },
          numbering_pattern: '',
        },
        {
          key: 'equipement',
          label: { fr: 'Équipement', en: 'Equipment', de: 'Gerät' },
          numbering_pattern: '',
        },
        {
          key: 'sous-equipement',
          label: { fr: 'Sous-équipement', en: 'Sub-equipment', de: 'Untergerät' },
          numbering_pattern: '',
        },
      ],
    }

    const COL_SITE = 2
    const COL_ZONE = COL_SITE + 4
    const COL_PROCESS = COL_ZONE + 8
    const COL_LIGNE = COL_PROCESS + 4
    const COL_SYSTEME = COL_LIGNE + 8
    const COL_EQUIPEMENT = COL_SYSTEME + 4
    const COL_SOUS_EQUIPEMENT = COL_EQUIPEMENT + 4

    const grille = [
      ligne(COL_SITE, 'SMP', 'SMP'),
      ligne(COL_ZONE, 'SMP-PRD', 'PRODUCTION'),
      ligne(COL_PROCESS, 'SMP-PRD-GRN', 'GRANULATION'),
      ligne(COL_LIGNE, 'SMP-PRD-GRN-MINIGRAN', 'MINIRIN GRANULATION'),
      ligne(COL_SYSTEME, 'SMP-PRD-GRN-MINIGRAN-DDAVPISO', 'ISOLATOR DDAVP (systeme)'),
      ligne(COL_EQUIPEMENT, '10004143', 'ISOLATOR DDAVP (equipement)'),
      ligne(COL_SYSTEME, 'SMP-PRD-GRN-MINIGRAN-FINESTFT', 'TRANSFERT DE POUDRE DEC'), // feuille, rang 5
      ligne(COL_SYSTEME, 'SMP-PRD-GRN-MINIGRAN-FORBERG1', 'FORBERG GRANULATOR'), // feuille, rang 5
      ligne(COL_LIGNE, 'SMP-PRD-GRN-PENTGRAN', 'PENTASA GRANULATION'),
      // Même rang logique (5, « systeme ») que DDAVPISO ci-dessus, mais
      // décalé de 2 colonnes : icône SAP différente pour ce type de nœud.
      ligne(COL_SYSTEME + 2, 'SMP-PRD-GRN-PENTGRAN-FDBED001', 'FLUID BED DRYER'),
      ligne(COL_EQUIPEMENT + 2, '10006495', 'FLUID BED DRYER (equipement)'),
      ligne(COL_SOUS_EQUIPEMENT + 2, '10006495-01', 'CAPTEUR TEMPERATURE'), // rang 7 réel
    ]

    const resultat = preparerImportHierarchieSap(grille, schema7, [])
    if (!resultat.ok) throw new Error(`attendu ok:true, reçu ${JSON.stringify(resultat)}`)
    expect(resultat.plan.erreurs).toEqual([])
    expect(resultat.plan.aCreer).toHaveLength(12)

    const parCode = new Map(resultat.plan.aCreer.map((n) => [n.code, n]))
    const minigran = parCode.get('SMP-PRD-GRN-MINIGRAN')
    const ddavpiso = parCode.get('SMP-PRD-GRN-MINIGRAN-DDAVPISO')
    const equip1 = parCode.get('10004143')
    const finestft = parCode.get('SMP-PRD-GRN-MINIGRAN-FINESTFT')
    const pentgran = parCode.get('SMP-PRD-GRN-PENTGRAN')
    const fdbed001 = parCode.get('SMP-PRD-GRN-PENTGRAN-FDBED001')
    const equip2 = parCode.get('10006495')
    const sousEquip = parCode.get('10006495-01')

    expect(finestft).toMatchObject({ level_key: 'systeme', parent_id: minigran?.id })
    expect(equip1).toMatchObject({ level_key: 'equipement', parent_id: ddavpiso?.id })
    // Même rang logique que ddavpiso (systeme), colonne différente : doit
    // quand même être reconnu comme rang 5, enfant de PENTGRAN (rang 4).
    expect(fdbed001).toMatchObject({ level_key: 'systeme', parent_id: pentgran?.id })
    expect(equip2).toMatchObject({ level_key: 'equipement', parent_id: fdbed001?.id })
    expect(sousEquip).toMatchObject({ level_key: 'sous-equipement', parent_id: equip2?.id })
  })

  test('ré-import du même fichier : aucun nœud dupliqué, chaque ligne déjà importée est rejetée (jamais recréée)', () => {
    const grille = [
      ligneAvecCaseACocher(1, 'SMP', 'SMP'),
      ligne(2, 'ENG', 'ENGENEERING FL'),
      ligne(3, '10008400', 'STD CONDUCTIMETER (TESTO)'),
    ]

    const premierImport = preparerImportHierarchieSap(grille, SCHEMA_3_NIVEAUX, [])
    if (!premierImport.ok) throw new Error('attendu ok:true')
    expect(premierImport.plan.aCreer).toHaveLength(3)

    // Ré-importe le même fichier, en simulant que le premier lot a bien
    // été écrit (mêmes codes désormais dans `noeudsExistants`).
    const noeudsExistants = premierImport.plan.aCreer.map((n) => ({ id: n.id, code: n.code }))
    const reimport = preparerImportHierarchieSap(grille, SCHEMA_3_NIVEAUX, noeudsExistants)
    if (!reimport.ok) throw new Error('attendu ok:true')

    expect(reimport.plan.aCreer).toEqual([]) // jamais de doublon
    // Chaque ligne a son propre code déjà utilisé (fichier intégralement
    // déjà importé) : le code propre prime sur la cascade, chaque ligne
    // remonte donc sa vraie raison, jamais masquée par celle de son parent.
    expect(reimport.plan.erreurs).toEqual([
      { ligne: 1, raison: 'code_deja_utilise' },
      { ligne: 2, raison: 'code_deja_utilise' },
      { ligne: 3, raison: 'code_deja_utilise' },
    ])
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
