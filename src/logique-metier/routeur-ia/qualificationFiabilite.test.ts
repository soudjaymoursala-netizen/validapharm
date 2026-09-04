import { describe, expect, test } from 'vitest'
import {
  conditionsTraitementAcquittees,
  deriveVersionDetectee,
  peutActiverFournisseur,
  type QualificationFiabilite,
} from './qualificationFiabilite'

function qualification(surcharge: Partial<QualificationFiabilite> = {}): QualificationFiabilite {
  return {
    date: '2026-01-01',
    resultat: 'favorable',
    qualification_test_set_id: 'set-1',
    qualification_test_set_version: '1.0.0',
    moteur_version_qualifiee: 'claude-v1',
    ...surcharge,
  }
}

describe('peutActiverFournisseur', () => {
  test('bloque tant qu’aucune qualification n’est consignée', () => {
    expect(peutActiverFournisseur(null)).toBe(false)
  })

  test('autorise dès qu’une qualification existe', () => {
    expect(peutActiverFournisseur(qualification())).toBe(true)
  })
})

describe('conditionsTraitementAcquittees', () => {
  test('aucun accusé -> non acquittées', () => {
    expect(conditionsTraitementAcquittees(null, 'claude')).toBe(false)
  })

  test('accusé pour le fournisseur actuel -> acquittées', () => {
    expect(
      conditionsTraitementAcquittees({ fournisseur: 'claude', date: '2026-01-01' }, 'claude'),
    ).toBe(true)
  })

  test('accusé pour un AUTRE fournisseur (changement récent) -> non acquittées, jamais réutilisé', () => {
    expect(
      conditionsTraitementAcquittees({ fournisseur: 'claude', date: '2026-01-01' }, 'openai'),
    ).toBe(false)
  })
})

describe('deriveVersionDetectee', () => {
  test('aucune qualification -> jamais de dérive', () => {
    expect(deriveVersionDetectee('claude-v2', null)).toBe(false)
  })

  test('même version -> pas de dérive', () => {
    expect(deriveVersionDetectee('claude-v1', qualification())).toBe(false)
  })

  test('version différente -> dérive détectée', () => {
    expect(deriveVersionDetectee('claude-v2', qualification())).toBe(true)
  })

  test('version de session inconnue (fournisseur n’exposant aucun identifiant) -> pas de fausse alerte', () => {
    expect(deriveVersionDetectee(null, qualification())).toBe(false)
  })

  test('version qualifiée inconnue (qualifiée avant que le fournisseur n’expose de version) -> pas de fausse alerte', () => {
    expect(
      deriveVersionDetectee('claude-v2', qualification({ moteur_version_qualifiee: null })),
    ).toBe(false)
  })
})
