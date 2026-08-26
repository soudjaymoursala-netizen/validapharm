import { describe, expect, test } from 'vitest'
import {
  evaluerGardesFinalisation,
  motifDeForcageValide,
  type ContexteGardeFinalisation,
} from './gardesFinalisation'

function contexte(overrides: Partial<ContexteGardeFinalisation> = {}): ContexteGardeFinalisation {
  return {
    templateType: 'oq',
    aLienVersContextProcede: true,
    aLienVersPlanMetrologie: true,
    aLienVersPlanMaintenance: true,
    ...overrides,
  }
}

describe('evaluerGardesFinalisation — entrée en vérification', () => {
  test.each(['oq', 'pq', 'validation_procede'] as const)(
    "U-01 : %s sans lien contexte_procede est bloqué à l'entrée en vérification",
    (templateType) => {
      const blocages = evaluerGardesFinalisation(
        contexte({ templateType, aLienVersContextProcede: false }),
        'entree_en_verification',
      )
      expect(blocages).toEqual(['U-01'])
    },
  )

  test('OQ/PQ/validation_procede avec lien contexte_procede : aucun blocage U-01', () => {
    const blocages = evaluerGardesFinalisation(contexte(), 'entree_en_verification')
    expect(blocages).not.toContain('U-01')
  })

  test("U-02 : IQ sans lien plan_metrologie est bloqué à l'entrée en vérification", () => {
    const blocages = evaluerGardesFinalisation(
      contexte({ templateType: 'iq', aLienVersPlanMetrologie: false }),
      'entree_en_verification',
    )
    expect(blocages).toEqual(['U-02'])
  })

  test('IQ avec lien plan_metrologie : aucun blocage', () => {
    const blocages = evaluerGardesFinalisation(
      contexte({ templateType: 'iq' }),
      'entree_en_verification',
    )
    expect(blocages).toEqual([])
  })

  test("un gabarit hors périmètre (ex. urs) n'est jamais bloqué par ces garde-fous", () => {
    const blocages = evaluerGardesFinalisation(
      contexte({
        templateType: 'urs',
        aLienVersContextProcede: false,
        aLienVersPlanMetrologie: false,
      }),
      'entree_en_verification',
    )
    expect(blocages).toEqual([])
  })

  test("U-03 (maintenance) ne se déclenche jamais à l'entrée en vérification, même sans lien", () => {
    const blocages = evaluerGardesFinalisation(
      contexte({ templateType: 'oq', aLienVersPlanMaintenance: false }),
      'entree_en_verification',
    )
    expect(blocages).not.toContain('U-03')
  })
})

describe('evaluerGardesFinalisation — clôture (valide_en_interne)', () => {
  test('U-03 : OQ sans lien plan_maintenance est bloqué à la clôture', () => {
    const blocages = evaluerGardesFinalisation(
      contexte({ templateType: 'oq', aLienVersPlanMaintenance: false }),
      'cloture_valide_en_interne',
    )
    expect(blocages).toEqual(['U-03'])
  })

  test('OQ avec lien plan_maintenance : aucun blocage à la clôture', () => {
    const blocages = evaluerGardesFinalisation(contexte(), 'cloture_valide_en_interne')
    expect(blocages).toEqual([])
  })

  test('U-01/U-02 ne se déclenchent jamais à la clôture, même sans lien', () => {
    const blocages = evaluerGardesFinalisation(
      contexte({
        templateType: 'oq',
        aLienVersContextProcede: false,
        aLienVersPlanMaintenance: true,
      }),
      'cloture_valide_en_interne',
    )
    expect(blocages).toEqual([])
  })

  test("PQ n'a aucun blocage de clôture (asymétrie délibérée, seul OQ est concerné par U-03)", () => {
    const blocages = evaluerGardesFinalisation(
      contexte({ templateType: 'pq', aLienVersPlanMaintenance: false }),
      'cloture_valide_en_interne',
    )
    expect(blocages).toEqual([])
  })
})

describe('motifDeForcageValide', () => {
  test('un motif non vide est valide', () => {
    expect(motifDeForcageValide('Décision documentée en revue projet')).toBe(true)
  })

  test("un motif absent, vide ou uniquement composé d'espaces est invalide", () => {
    expect(motifDeForcageValide(undefined)).toBe(false)
    expect(motifDeForcageValide('')).toBe(false)
    expect(motifDeForcageValide('   ')).toBe(false)
  })
})
