import { describe, expect, test } from 'vitest'
import type {
  Couverture,
  Evidence,
  Execution,
  QualityEvent,
  Requirement,
  Test as TestEntity,
} from '../domaine/types'
import { construireReadinessContentPlan } from './readinessContentPlan'

function requirement(surcharge: Partial<Requirement> = {}): Requirement {
  return {
    id: 'req-1',
    client_id: 'c1',
    reference: 'REQ-1',
    titre: 'Débit stable',
    description: '',
    asset_node_id: 'n1',
    process_id: null,
    audit_log: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...surcharge,
  }
}

function couverture(surcharge: Partial<Couverture> = {}): Couverture {
  return {
    id: 'cov-1',
    client_id: 'c1',
    requirement_id: 'req-1',
    test_id: 'test-1',
    created_at: '2026-01-01T00:00:00.000Z',
    ...surcharge,
  }
}

function uneTest(surcharge: Partial<TestEntity> = {}): TestEntity {
  return {
    id: 'test-1',
    client_id: 'c1',
    test_candidate_id: 'tc-1',
    titre: 'Test débit',
    description: '',
    etapes: [],
    statut: 'approuve',
    audit_log: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...surcharge,
  }
}

function execution(surcharge: Partial<Execution> = {}): Execution {
  return {
    id: 'exec-1',
    client_id: 'c1',
    test_id: 'test-1',
    asset_node_id: 'n1',
    executant: 'alice',
    statut: 'terminee',
    verdict: 'conforme',
    date_debut: '2026-01-01T00:00:00.000Z',
    date_fin: '2026-01-01T01:00:00.000Z',
    audit_log: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...surcharge,
  }
}

function evidence(surcharge: Partial<Evidence> = {}): Evidence {
  return {
    id: 'ev-1',
    client_id: 'c1',
    execution_id: 'exec-1',
    execution_step_id: null,
    type: 'native',
    titre: 'Capture',
    description: '',
    horodatage: '2026-01-01T00:00:00.000Z',
    actor: 'alice',
    ...surcharge,
  }
}

function qualityEvent(surcharge: Partial<QualityEvent> = {}): QualityEvent {
  return {
    id: 'qe-1',
    client_id: 'c1',
    type: 'deviation',
    titre: 'Écart',
    description: '',
    origine: 'interne',
    reference_externe: null,
    asset_node_id: 'n1',
    process_id: null,
    manufacturing_context_id: null,
    statut: 'ouvert',
    audit_log: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...surcharge,
  }
}

describe('construireReadinessContentPlan', () => {
  test('aucune ancre (assetNodeId null) -> besoin_information', () => {
    expect(
      construireReadinessContentPlan({
        assetNodeId: null,
        requirements: [],
        couvertures: [],
        tests: [],
        executions: [],
        evidences: [],
        qualityEvents: [],
      }),
    ).toBe('besoin_information')
  })

  test('aucun requirement pour ce nœud -> besoin_information', () => {
    expect(
      construireReadinessContentPlan({
        assetNodeId: 'n1',
        requirements: [],
        couvertures: [],
        tests: [],
        executions: [],
        evidences: [],
        qualityEvents: [],
      }),
    ).toBe('besoin_information')
  })

  test('requirement sans test couvrant -> besoin_revue', () => {
    expect(
      construireReadinessContentPlan({
        assetNodeId: 'n1',
        requirements: [requirement()],
        couvertures: [],
        tests: [],
        executions: [],
        evidences: [],
        qualityEvents: [],
      }),
    ).toBe('besoin_revue')
  })

  test('test couvrant encore en brouillon -> besoin_revue', () => {
    expect(
      construireReadinessContentPlan({
        assetNodeId: 'n1',
        requirements: [requirement()],
        couvertures: [couverture()],
        tests: [uneTest({ statut: 'brouillon' })],
        executions: [],
        evidences: [],
        qualityEvents: [],
      }),
    ).toBe('besoin_revue')
  })

  test('test approuvé sans aucune exécution -> besoin_information', () => {
    expect(
      construireReadinessContentPlan({
        assetNodeId: 'n1',
        requirements: [requirement()],
        couvertures: [couverture()],
        tests: [uneTest()],
        executions: [],
        evidences: [],
        qualityEvents: [],
      }),
    ).toBe('besoin_information')
  })

  test('exécution non terminée -> besoin_information', () => {
    expect(
      construireReadinessContentPlan({
        assetNodeId: 'n1',
        requirements: [requirement()],
        couvertures: [couverture()],
        tests: [uneTest()],
        executions: [execution({ statut: 'en_cours', verdict: null })],
        evidences: [],
        qualityEvents: [],
      }),
    ).toBe('besoin_information')
  })

  test('exécution terminée non conforme -> bloque', () => {
    expect(
      construireReadinessContentPlan({
        assetNodeId: 'n1',
        requirements: [requirement()],
        couvertures: [couverture()],
        tests: [uneTest()],
        executions: [execution({ verdict: 'non_conforme' })],
        evidences: [],
        qualityEvents: [],
      }),
    ).toBe('bloque')
  })

  test('exécution conforme sans preuve associée -> besoin_revue', () => {
    expect(
      construireReadinessContentPlan({
        assetNodeId: 'n1',
        requirements: [requirement()],
        couvertures: [couverture()],
        tests: [uneTest()],
        executions: [execution()],
        evidences: [],
        qualityEvents: [],
      }),
    ).toBe('besoin_revue')
  })

  test('chaîne complète (requirement -> test approuvé -> exécution conforme -> preuve) -> pret', () => {
    expect(
      construireReadinessContentPlan({
        assetNodeId: 'n1',
        requirements: [requirement()],
        couvertures: [couverture()],
        tests: [uneTest()],
        executions: [execution()],
        evidences: [evidence()],
        qualityEvents: [],
      }),
    ).toBe('pret')
  })

  test('conforme_avec_ecart + preuve -> pret (pas un blocage, seul non_conforme bloque)', () => {
    expect(
      construireReadinessContentPlan({
        assetNodeId: 'n1',
        requirements: [requirement()],
        couvertures: [couverture()],
        tests: [uneTest()],
        executions: [execution({ verdict: 'conforme_avec_ecart' })],
        evidences: [evidence()],
        qualityEvents: [],
      }),
    ).toBe('pret')
  })

  test('un événement qualité ouvert sur ce nœud bloque, même si la chaîne de traçabilité est autrement complète', () => {
    expect(
      construireReadinessContentPlan({
        assetNodeId: 'n1',
        requirements: [requirement()],
        couvertures: [couverture()],
        tests: [uneTest()],
        executions: [execution()],
        evidences: [evidence()],
        qualityEvents: [qualityEvent()],
      }),
    ).toBe('bloque')
  })

  test('un événement qualité clôturé ne bloque pas', () => {
    expect(
      construireReadinessContentPlan({
        assetNodeId: 'n1',
        requirements: [requirement()],
        couvertures: [couverture()],
        tests: [uneTest()],
        executions: [execution()],
        evidences: [evidence()],
        qualityEvents: [qualityEvent({ statut: 'cloture' })],
      }),
    ).toBe('pret')
  })

  test('un événement qualité sur un autre nœud ne bloque pas', () => {
    expect(
      construireReadinessContentPlan({
        assetNodeId: 'n1',
        requirements: [requirement()],
        couvertures: [couverture()],
        tests: [uneTest()],
        executions: [execution()],
        evidences: [evidence()],
        qualityEvents: [qualityEvent({ asset_node_id: 'autre-noeud' })],
      }),
    ).toBe('pret')
  })

  test('plusieurs requirements : le pire état l’emporte', () => {
    expect(
      construireReadinessContentPlan({
        assetNodeId: 'n1',
        requirements: [requirement({ id: 'req-1' }), requirement({ id: 'req-2' })],
        couvertures: [couverture({ id: 'cov-1', requirement_id: 'req-1', test_id: 'test-1' })],
        tests: [uneTest()],
        executions: [execution()],
        evidences: [evidence()],
        qualityEvents: [],
      }),
    ).toBe('besoin_revue')
  })
})
