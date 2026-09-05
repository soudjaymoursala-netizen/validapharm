import { describe, expect, test } from 'vitest'
import type {
  AssetNode,
  Couverture,
  Evidence,
  Execution,
  KnowledgeItem,
  KnowledgeRelation,
  Procedure,
  ProcedureStep,
  RelationTechnique,
  Requirement,
  Test as TestEntity,
  TypeRelationTechnique,
} from '../domaine/types'
import {
  type DonneesOutilsRaisonnement,
  executerOutil,
  listerEtapesProcedure,
  listerEvidencePourTest,
  listerKnowledgeItemsValides,
  listerRequirementsPourActif,
  listerTestsPourRequirement,
  tracerChaineTechnique,
  tracerRelationsConnaissance,
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

function assetNode(code: string): AssetNode {
  return {
    id: code,
    client_id: 'client-1',
    workspace_id: null,
    level_key: 'equipement',
    name: code,
    code,
    parent_id: null,
    associated_nodes: [],
    source: 'manuel',
    qms_connector_id: null,
    periodic_qualification: { applicable: false, deadline: null },
    qualification_status: 'non_qualifie',
    audit_log: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  }
}

function relationTechnique(
  type: TypeRelationTechnique,
  sourceId: string,
  cibleId: string,
): RelationTechnique {
  return {
    id: `${sourceId}-${type}-${cibleId}`,
    client_id: 'client-1',
    type_relation: type,
    noeud_source_id: sourceId,
    noeud_cible_id: cibleId,
    created_at: '2026-01-01T00:00:00.000Z',
  }
}

function knowledgeRelation(sourceId: string, cibleId: string, type: string): KnowledgeRelation {
  return {
    id: `${sourceId}-${type}-${cibleId}`,
    client_id: 'client-1',
    knowledge_item_source_id: sourceId,
    knowledge_item_cible_id: cibleId,
    type,
    created_at: '2026-01-01T00:00:00.000Z',
  }
}

function procedure(id: string, reference: string, numeroVersion: number): Procedure {
  return {
    id,
    client_id: 'client-1',
    reference,
    numero_version: numeroVersion,
    titre: `Procédure ${reference}`,
    effective_date: '2026-01-01',
    source_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
  }
}

function procedureStep(
  id: string,
  procedureId: string,
  ordre: number,
  description: string,
): ProcedureStep {
  return {
    id,
    client_id: 'client-1',
    procedure_id: procedureId,
    ordre,
    description,
    obligatoire: true,
    condition: null,
    responsable: null,
    created_at: '2026-01-01T00:00:00.000Z',
  }
}

const donnees: DonneesOutilsRaisonnement = {
  requirements: [requirement('req-1', 'granulateur-01'), requirement('req-2', 'autre-actif')],
  couvertures: [couverture('req-1', 'test-1')],
  tests: [uneTest('test-1'), uneTest('test-2')],
  executions: [execution('exec-1', 'test-1')],
  evidences: [evidence('ev-1', 'exec-1')],
  knowledgeItems: [knowledgeItem('ki-1', 'valide'), knowledgeItem('ki-2', 'a_valider')],
  assetNodes: [assetNode('granulateur-01'), assetNode('plc-01')],
  relationsTechniques: [relationTechnique('controle_par', 'granulateur-01', 'plc-01')],
  procedures: [procedure('proc-v1', 'SOP-QA-012', 1), procedure('proc-v2', 'SOP-QA-012', 2)],
  procedureSteps: [
    procedureStep('step-v1-1', 'proc-v1', 1, 'Étape v1 (ancienne)'),
    procedureStep('step-v2-1', 'proc-v2', 1, 'Vérifier le contexte'),
    procedureStep('step-v2-2', 'proc-v2', 2, 'Identifier les impacts'),
  ],
  knowledgeRelations: [knowledgeRelation('ki-1', 'ki-2', 'precise')],
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

describe('tracerChaineTechnique', () => {
  test('trace la relation sortante et son type', () => {
    const chaine = tracerChaineTechnique('granulateur-01', donnees)
    expect(chaine).toEqual([{ noeud: assetNode('plc-01'), typeRelation: 'controle_par' }])
  })

  test('un nœud sans relation sortante retourne une chaîne vide', () => {
    expect(tracerChaineTechnique('plc-01', donnees)).toEqual([])
  })
})

describe('tracerRelationsConnaissance', () => {
  test('trace la relation sortante et son type', () => {
    const chaine = tracerRelationsConnaissance('ki-1', donnees)
    expect(chaine).toEqual([{ item: knowledgeItem('ki-2', 'a_valider'), typeRelation: 'precise' }])
  })

  test('un KnowledgeItem sans relation sortante retourne une chaîne vide', () => {
    expect(tracerRelationsConnaissance('ki-2', donnees)).toEqual([])
  })
})

describe('listerEtapesProcedure', () => {
  test('résout toujours la version la plus récente de la référence, jamais une version arbitraire', () => {
    const etapes = listerEtapesProcedure('SOP-QA-012', donnees)
    expect(etapes.map((e) => e.description)).toEqual([
      'Vérifier le contexte',
      'Identifier les impacts',
    ])
  })

  test('une référence inconnue retourne une liste vide', () => {
    expect(listerEtapesProcedure('INCONNUE', donnees)).toEqual([])
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

  test('tracer_chaine_technique retourne le nœud cible et son type de relation', () => {
    const resultat = executerOutil(
      { nom: 'tracer_chaine_technique', parametres: { asset_node_id: 'granulateur-01' } },
      donnees,
    )
    expect(resultat.idsObtenus).toEqual(['plc-01'])
    expect(resultat.resultat).toContain('controle_par')
  })

  test('lister_etapes_procedure retourne les étapes de la dernière version, dans l’ordre', () => {
    const resultat = executerOutil(
      { nom: 'lister_etapes_procedure', parametres: { reference: 'SOP-QA-012' } },
      donnees,
    )
    expect(resultat.idsObtenus).toEqual(['step-v2-1', 'step-v2-2'])
    expect(resultat.resultat).toContain('Vérifier le contexte')
  })

  test('tracer_relations_connaissance retourne le KnowledgeItem cible et son type de relation', () => {
    const resultat = executerOutil(
      { nom: 'tracer_relations_connaissance', parametres: { knowledge_item_id: 'ki-1' } },
      donnees,
    )
    expect(resultat.idsObtenus).toEqual(['ki-2'])
    expect(resultat.resultat).toContain('precise')
  })
})
