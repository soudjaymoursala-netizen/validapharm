import { describe, expect, test } from 'vitest'
import type { RiskAssessment, TestCandidate } from '../domaine/types'
import { evaluerCouvertureRisques } from './evaluerCouvertureRisques'

function risqueTest(overrides: Partial<RiskAssessment> = {}): RiskAssessment {
  return {
    id: 'risque-1',
    client_id: 'client-1',
    method_profile_id: 'profil-1',
    method_profile_version: '1',
    asset_node_id: 'noeud-1',
    parameter_id: null,
    etape_processus: 'Compression',
    mode_defaillance: 'Perte de pression',
    effet_defaillance: 'Comprimé hors spécification',
    cause_potentielle: 'Joint défectueux',
    controle_actuel: 'Contrôle visuel',
    severite_initiale: 4,
    occurrence_initiale: 3,
    detectabilite_initiale: 2,
    ipr_initial: 24,
    verdict_initial: 'action_requise',
    recommandation: null,
    responsable: null,
    date_cible: null,
    actions_menees: null,
    severite_residuelle: null,
    occurrence_residuelle: null,
    detectabilite_residuelle: null,
    ipr_residuel: null,
    verdict_residuel: null,
    audit_log: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function candidatTest(
  overrides: Partial<Pick<TestCandidate, 'risk_assessment_id' | 'statut'>> = {},
) {
  return {
    risk_assessment_id: 'risque-1' as string | null,
    statut: 'propose' as TestCandidate['statut'],
    ...overrides,
  }
}

describe('evaluerCouvertureRisques (Phase 35, TD-036)', () => {
  test('un risque action_requise sans candidat est non_couvert', () => {
    const resultat = evaluerCouvertureRisques({ asset_node_id: 'noeud-1' }, [risqueTest()], [])
    expect(resultat).toEqual([
      {
        risk_assessment_id: 'risque-1',
        mode_defaillance: 'Perte de pression',
        statut: 'non_couvert',
      },
    ])
  })

  test('un risque avec un candidat proposé est couvert', () => {
    const resultat = evaluerCouvertureRisques(
      { asset_node_id: 'noeud-1' },
      [risqueTest()],
      [candidatTest({ statut: 'propose' })],
    )
    expect(resultat[0]?.statut).toBe('couvert')
  })

  test('un candidat rejeté ne compte jamais comme une couverture', () => {
    const resultat = evaluerCouvertureRisques(
      { asset_node_id: 'noeud-1' },
      [risqueTest()],
      [candidatTest({ statut: 'rejete' })],
    )
    expect(resultat[0]?.statut).toBe('non_couvert')
  })

  test('un candidat doublon ne compte jamais comme une couverture', () => {
    const resultat = evaluerCouvertureRisques(
      { asset_node_id: 'noeud-1' },
      [risqueTest()],
      [candidatTest({ statut: 'doublon' })],
    )
    expect(resultat[0]?.statut).toBe('non_couvert')
  })

  test('un risque acceptable ne remonte jamais dans le rapport', () => {
    const resultat = evaluerCouvertureRisques(
      { asset_node_id: 'noeud-1' },
      [risqueTest({ verdict_initial: 'acceptable' })],
      [],
    )
    expect(resultat).toEqual([])
  })

  test('exigence sans nœud retourne une liste vide, jamais une supposition', () => {
    const resultat = evaluerCouvertureRisques({ asset_node_id: null }, [risqueTest()], [])
    expect(resultat).toEqual([])
  })

  test('un risque sur un autre nœud est ignoré', () => {
    const resultat = evaluerCouvertureRisques(
      { asset_node_id: 'noeud-2' },
      [risqueTest({ asset_node_id: 'noeud-1' })],
      [],
    )
    expect(resultat).toEqual([])
  })
})
