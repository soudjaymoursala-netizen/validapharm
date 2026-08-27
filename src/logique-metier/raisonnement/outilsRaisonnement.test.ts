import { describe, expect, test } from 'vitest'
import type {
  Couverture,
  Evidence,
  Execution,
  KnowledgeItem,
  Requirement,
  Test as TestEntity,
} from '../domaine/types'
import {
  type DonneesOutilsRaisonnement,
  executerOutil,
  listerEvidencePourTest,
  listerKnowledgeItemsValides,
  listerRequirementsPourActif,
  listerTestsPourRequirement,
} from './outilsRaisonnement'

function requirement(id: string, assetNodeId: string | null): Requirement {
  return {
    id,
    client_id: 'client-1',
    reference: id,
    titre: `Requirement ${id}`,
    description: '',
    asset_node_id: assetNodeId,
    process_id: null,
    audit_log: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  }
}

function couverture(requirementId: string, testId: string): Couverture {
  return {
    id: `cov-${requirementId}-${testId}`,
    client_id: 'client-1',
    requirement_id: requirementId,
    test_id: testId,
    created_at: '2026-01-01T00:00:00.000Z',
  }
}

function uneTest(id: string): TestEntity {
  return {
    id,
    client_id: 'client-1',
    test_candidate_id: 'tc-1',
    titre: `Test ${id}`,
    description: '',
    etapes: [],
    statut: 'approuve',
    audit_log: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  }
}

function execution(id: string, testId: string): Execution {
  return {
    id,
    client_id: 'client-1',
    test_id: testId,
    asset_node_id: null,
    executant: 'operateur-1',
    statut: 'terminee',
    verdict: 'conforme',
    date_debut: '2026-01-01T00:00:00.000Z',
    date_fin: '2026-01-01T01:00:00.000Z',
    audit_log: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  }
}

function evidence(id: string, executionId: string): Evidence {
  return {
    id,
    client_id: 'client-1',
    execution_id: executionId,
    execution_step_id: null,
    type: 'native',
    titre: `Evidence ${id}`,
    description: '',
    horodatage: '2026-01-01T00:00:00.000Z',
    actor: 'operateur-1',
  }
}

function knowledgeItem(id: string, statut: KnowledgeItem['statut']): KnowledgeItem {
  return {
    id,
    client_id: 'client-1',
    extraction_item_id: 'ei-1',
    libelle: `Knowledge ${id}`,
    valeur_interpretee: 'valeur',
    statut,
    valide_par: statut === 'valide' ? 'expert-1' : null,
    audit_log: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  }
}

const donnees: DonneesOutilsRaisonnement = {
  requirements: [requirement('req-1', 'granulateur-01'), requirement('req-2', 'autre-actif')],
  couvertures: [couverture('req-1', 'test-1')],
  tests: [uneTest('test-1'), uneTest('test-2')],
  executions: [execution('exec-1', 'test-1')],
  evidences: [evidence('ev-1', 'exec-1')],
  knowledgeItems: [knowledgeItem('ki-1', 'valide'), knowledgeItem('ki-2', 'a_valider')],
}

describe('listerRequirementsPourActif', () => {
  test('ne retourne que les Requirement du bon AssetNode', () => {
    expect(listerRequirementsPourActif('granulateur-01', donnees).map((r) => r.id)).toEqual([
      'req-1',
    ])
    expect(listerRequirementsPourActif('actif-inconnu', donnees)).toHaveLength(0)
  })
})

describe('listerTestsPourRequirement', () => {
  test('résout via Couverture, jamais un lien direct', () => {
    expect(listerTestsPourRequirement('req-1', donnees).map((t) => t.id)).toEqual(['test-1'])
    expect(listerTestsPourRequirement('req-2', donnees)).toHaveLength(0)
  })
})

describe('listerEvidencePourTest', () => {
  test('résout via Execution (Test -> Execution -> Evidence)', () => {
    expect(listerEvidencePourTest('test-1', donnees).map((e) => e.id)).toEqual(['ev-1'])
    expect(listerEvidencePourTest('test-2', donnees)).toHaveLength(0)
  })
})

describe('listerKnowledgeItemsValides', () => {
  test('ne retourne que le statut valide', () => {
    expect(listerKnowledgeItemsValides(donnees).map((k) => k.id)).toEqual(['ki-1'])
  })
})

describe('executerOutil', () => {
  test('un outil inconnu ne lève jamais, retourne un message explicite', () => {
    const resultat = executerOutil({ nom: 'outil_inexistant', parametres: {} }, donnees)
    expect(resultat.resultat).toContain('Outil inconnu')
    expect(resultat.idsObtenus).toHaveLength(0)
  })

  test('un paramètre manquant ne lève jamais, retourne un message explicite', () => {
    const resultat = executerOutil(
      { nom: 'lister_requirements_pour_actif', parametres: {} },
      donnees,
    )
    expect(resultat.resultat).toContain('manquant')
    expect(resultat.idsObtenus).toHaveLength(0)
  })

  test('lister_requirements_pour_actif retourne les ids obtenus (base de la vérification de citation)', () => {
    const resultat = executerOutil(
      { nom: 'lister_requirements_pour_actif', parametres: { asset_node_id: 'granulateur-01' } },
      donnees,
    )
    expect(resultat.idsObtenus).toEqual(['req-1'])
    expect(resultat.resultat).toContain('req-1')
  })

  test('aucun résultat est explicite, jamais une chaîne vide ambiguë', () => {
    const resultat = executerOutil(
      { nom: 'lister_requirements_pour_actif', parametres: { asset_node_id: 'actif-inconnu' } },
      donnees,
    )
    expect(resultat.resultat).toBe('Aucun résultat.')
  })
})
