import { describe, expect, test } from 'vitest'
import type { RiskAssessment } from '../domaine/types'
import { genererCandidatsDepuisRisques } from './genererCandidatsDepuisRisques'

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
    controle_actuel: 'Contrôle visuel hebdomadaire',
    severite_initiale: 4,
    occurrence_initiale: 3,
    detectabilite_initiale: 2,
    ipr_initial: 24,
    verdict_initial: 'action_requise',
    recommandation: 'Ajouter un capteur de pression continu',
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

describe('genererCandidatsDepuisRisques', () => {
  test('propose un candidat pour un risque action_requise sur le même nœud', () => {
    const suggestions = genererCandidatsDepuisRisques(
      { asset_node_id: 'noeud-1' },
      [risqueTest()],
      [],
    )

    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]?.risk_assessment_id).toBe('risque-1')
    expect(suggestions[0]?.titre).toContain('Perte de pression')
    expect(suggestions[0]?.description).toContain('Joint défectueux')
    expect(suggestions[0]?.description).toContain('Ajouter un capteur de pression continu')
    expect(suggestions[0]?.description).toContain('jamais se limiter à une vérification')
  })

  test("ne propose rien si l'exigence n'a pas de nœud (aucune supposition)", () => {
    const suggestions = genererCandidatsDepuisRisques({ asset_node_id: null }, [risqueTest()], [])
    expect(suggestions).toEqual([])
  })

  test('ignore un risque sur un autre nœud', () => {
    const suggestions = genererCandidatsDepuisRisques(
      { asset_node_id: 'noeud-2' },
      [risqueTest({ asset_node_id: 'noeud-1' })],
      [],
    )
    expect(suggestions).toEqual([])
  })

  test('ignore un risque acceptable (verdict_initial ET verdict_residuel non action_requise)', () => {
    const suggestions = genererCandidatsDepuisRisques(
      { asset_node_id: 'noeud-1' },
      [risqueTest({ verdict_initial: 'acceptable', verdict_residuel: 'acceptable' })],
      [],
    )
    expect(suggestions).toEqual([])
  })

  test('propose un candidat si seul le verdict résiduel reste action_requise', () => {
    const suggestions = genererCandidatsDepuisRisques(
      { asset_node_id: 'noeud-1' },
      [risqueTest({ verdict_initial: 'acceptable', verdict_residuel: 'action_requise' })],
      [],
    )
    expect(suggestions).toHaveLength(1)
  })

  test('ne propose pas un risque déjà couvert par un candidat existant', () => {
    const suggestions = genererCandidatsDepuisRisques(
      { asset_node_id: 'noeud-1' },
      [risqueTest()],
      [{ risk_assessment_id: 'risque-1' }],
    )
    expect(suggestions).toEqual([])
  })

  test('un candidat existant lié à un autre risque ne bloque pas la proposition', () => {
    const suggestions = genererCandidatsDepuisRisques(
      { asset_node_id: 'noeud-1' },
      [risqueTest()],
      [{ risk_assessment_id: 'autre-risque' }],
    )
    expect(suggestions).toHaveLength(1)
  })

  test("n'invente jamais de contenu absent du risque — reflète le champ 'aucun' explicitement", () => {
    const suggestions = genererCandidatsDepuisRisques(
      { asset_node_id: 'noeud-1' },
      [risqueTest({ controle_actuel: '', recommandation: null })],
      [],
    )
    expect(suggestions[0]?.description).toContain('Contrôle actuel déclaré : aucun.')
    expect(suggestions[0]?.description).not.toContain('Action recommandée')
  })
})
