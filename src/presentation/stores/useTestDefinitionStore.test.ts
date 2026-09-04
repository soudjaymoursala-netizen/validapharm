import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { db } from '../../persistance/db'
import type { RiskAssessment } from '../../logique-metier/domaine/types'
import { useTestDefinitionStore } from './useTestDefinitionStore'

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.requirements.clear()
  await db.testObjectives.clear()
  await db.testCandidates.clear()
  await db.tests.clear()
  await db.couvertures.clear()
  await db.risksAssessment.clear()
})

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

describe('useTestDefinitionStore — chaîne de définition de base', () => {
  test('Requirement -> TestObjective -> TestCandidate -> Test', async () => {
    const store = useTestDefinitionStore()
    await store.charger('client-1')

    const requirement = await store.creerRequirement('client-1', {
      reference: 'REQ-100',
      titre: 'Isolation par client du référentiel',
      description: '',
      assetNodeId: null,
      processId: null,
    })
    const objectif = await store.creerTestObjective('client-1', {
      requirementId: requirement.id,
      titre: "Vérifier qu'un client ne voit jamais les nœuds d'un autre",
      description: '',
    })
    const candidat = await store.creerTestCandidate('client-1', {
      testObjectiveId: objectif.id,
      titre: 'Créer 2 clients, vérifier isolation',
      description: '',
    })
    expect(candidat.statut).toBe('propose')

    await store.accepterTestCandidate('client-1', candidat.id)
    const test = await store.creerTestDepuisCandidat('client-1', candidat.id, {
      titre: 'Test isolation référentiel',
      description: '',
      etapes: [
        { action: 'Créer un nœud pour client A', resultatAttendu: 'Nœud créé' },
        { action: 'Charger client B', resultatAttendu: 'Aucun nœud visible' },
      ],
    })

    if ('erreur' in test) throw new Error('unreachable')
    expect(test.statut).toBe('brouillon')
    expect(test.etapes).toHaveLength(2)
    expect(test.etapes[0]?.ordre).toBe(1)
  })
})

describe('useTestDefinitionStore — garde-fous du cycle de vie', () => {
  test("un Test ne peut être créé qu'à partir d'un candidat accepté, jamais un candidat proposé", async () => {
    const store = useTestDefinitionStore()
    await store.charger('client-1')
    const requirement = await store.creerRequirement('client-1', {
      reference: 'REQ-001',
      titre: 'Test',
      description: '',
      assetNodeId: null,
      processId: null,
    })
    const objectif = await store.creerTestObjective('client-1', {
      requirementId: requirement.id,
      titre: 'Objectif',
      description: '',
    })
    const candidat = await store.creerTestCandidate('client-1', {
      testObjectiveId: objectif.id,
      titre: 'Candidat non accepté',
      description: '',
    })

    const resultat = await store.creerTestDepuisCandidat('client-1', candidat.id, {
      titre: 'Test',
      description: '',
      etapes: [],
    })
    expect(resultat).toEqual({ erreur: 'candidat_non_accepte' })
  })

  test('un candidat rejeté DOIT porter un motif tracé, jamais une suppression silencieuse', async () => {
    const store = useTestDefinitionStore()
    await store.charger('client-1')
    const requirement = await store.creerRequirement('client-1', {
      reference: 'REQ-001',
      titre: 'Test',
      description: '',
      assetNodeId: null,
      processId: null,
    })
    const objectif = await store.creerTestObjective('client-1', {
      requirementId: requirement.id,
      titre: 'Objectif',
      description: '',
    })
    const candidat = await store.creerTestCandidate('client-1', {
      testObjectiveId: objectif.id,
      titre: 'Candidat redondant',
      description: '',
    })

    const rejete = await store.rejeterTestCandidate(
      'client-1',
      candidat.id,
      'Redondant avec un autre test déjà accepté',
    )
    expect(rejete?.statut).toBe('rejete')
    expect(rejete?.motif_rejet).toBe('Redondant avec un autre test déjà accepté')
    expect(rejete?.audit_log).toHaveLength(2)
    expect(store.testCandidates).toHaveLength(1)

    const relu = await db.testCandidates.get(candidat.id)
    expect(relu?.statut).toBe('rejete')
  })

  test('un candidat peut être marqué besoin_information, besoin_revue, doublon ou remplace, chacun tracé', async () => {
    const store = useTestDefinitionStore()
    await store.charger('client-1')
    const requirement = await store.creerRequirement('client-1', {
      reference: 'REQ-001',
      titre: 'Test',
      description: '',
      assetNodeId: null,
      processId: null,
    })
    const objectif = await store.creerTestObjective('client-1', {
      requirementId: requirement.id,
      titre: 'Objectif',
      description: '',
    })
    const original = await store.creerTestCandidate('client-1', {
      testObjectiveId: objectif.id,
      titre: 'Candidat original',
      description: '',
    })
    const remplacant = await store.creerTestCandidate('client-1', {
      testObjectiveId: objectif.id,
      titre: 'Candidat remplaçant',
      description: '',
    })

    const besoinInfo = await store.marquerBesoinInformation(
      'client-1',
      original.id,
      'Manque la valeur limite attendue',
    )
    expect(besoinInfo?.statut).toBe('besoin_information')

    const besoinRevue = await store.marquerBesoinRevue(
      'client-1',
      original.id,
      'Critère d’acceptation ambigu',
    )
    expect(besoinRevue?.statut).toBe('besoin_revue')

    const doublon = await store.marquerDoublon('client-1', original.id, remplacant.id)
    expect(doublon?.statut).toBe('doublon')
    expect(doublon?.duplique_de_id).toBe(remplacant.id)

    const remplace = await store.marquerRemplace('client-1', original.id, remplacant.id)
    expect(remplace?.statut).toBe('remplace')
    expect(remplace?.remplace_par_id).toBe(remplacant.id)
  })

  test("approuverTest journalise l'approbation", async () => {
    const store = useTestDefinitionStore()
    await store.charger('client-1')
    const requirement = await store.creerRequirement('client-1', {
      reference: 'REQ-001',
      titre: 'Test',
      description: '',
      assetNodeId: null,
      processId: null,
    })
    const objectif = await store.creerTestObjective('client-1', {
      requirementId: requirement.id,
      titre: 'Objectif',
      description: '',
    })
    const candidat = await store.creerTestCandidate('client-1', {
      testObjectiveId: objectif.id,
      titre: 'Candidat',
      description: '',
    })
    await store.accepterTestCandidate('client-1', candidat.id)
    const test = await store.creerTestDepuisCandidat('client-1', candidat.id, {
      titre: 'Test',
      description: '',
      etapes: [],
    })
    if ('erreur' in test) throw new Error('unreachable')

    const approuve = await store.approuverTest('client-1', test.id)
    expect(approuve?.statut).toBe('approuve')
    expect(approuve?.audit_log).toHaveLength(2)
  })
})

describe('useTestDefinitionStore — Couverture (N:M Requirement <-> Test)', () => {
  test('un Test peut couvrir plusieurs Requirements, déclaré explicitement', async () => {
    const store = useTestDefinitionStore()
    await store.charger('client-1')
    const req1 = await store.creerRequirement('client-1', {
      reference: 'REQ-001',
      titre: 'Exigence 1',
      description: '',
      assetNodeId: null,
      processId: null,
    })
    const req2 = await store.creerRequirement('client-1', {
      reference: 'REQ-NF-046',
      titre: 'Exigence 2 (intégrité des données)',
      description: '',
      assetNodeId: null,
      processId: null,
    })
    const objectif = await store.creerTestObjective('client-1', {
      requirementId: req1.id,
      titre: 'Objectif',
      description: '',
    })
    const candidat = await store.creerTestCandidate('client-1', {
      testObjectiveId: objectif.id,
      titre: 'Candidat',
      description: '',
    })
    await store.accepterTestCandidate('client-1', candidat.id)
    const test = await store.creerTestDepuisCandidat('client-1', candidat.id, {
      titre: 'Test IQ couvrant aussi une exigence DI',
      description: '',
      etapes: [],
    })
    if ('erreur' in test) throw new Error('unreachable')

    await store.declarerCouverture('client-1', req1.id, test.id)
    await store.declarerCouverture('client-1', req2.id, test.id)

    expect(store.testsCouvrantRequirement(req1.id)).toHaveLength(1)
    expect(store.testsCouvrantRequirement(req2.id)).toHaveLength(1)
    expect(store.testsCouvrantRequirement(req1.id)[0]?.id).toBe(test.id)
  })

  test('déclarer deux fois la même couverture est idempotent', async () => {
    const store = useTestDefinitionStore()
    await store.charger('client-1')
    const requirement = await store.creerRequirement('client-1', {
      reference: 'REQ-001',
      titre: 'Exigence',
      description: '',
      assetNodeId: null,
      processId: null,
    })
    const objectif = await store.creerTestObjective('client-1', {
      requirementId: requirement.id,
      titre: 'Objectif',
      description: '',
    })
    const candidat = await store.creerTestCandidate('client-1', {
      testObjectiveId: objectif.id,
      titre: 'Candidat',
      description: '',
    })
    await store.accepterTestCandidate('client-1', candidat.id)
    const test = await store.creerTestDepuisCandidat('client-1', candidat.id, {
      titre: 'Test',
      description: '',
      etapes: [],
    })
    if ('erreur' in test) throw new Error('unreachable')

    await store.declarerCouverture('client-1', requirement.id, test.id)
    await store.declarerCouverture('client-1', requirement.id, test.id)
    expect(store.couvertures).toHaveLength(1)
  })

  test('un Requirement sans aucune couverture retourne une liste vide, pas une erreur', () => {
    const store = useTestDefinitionStore()
    expect(store.testsCouvrantRequirement('inconnu')).toEqual([])
  })
})

describe('useTestDefinitionStore — isolation stricte par client', () => {
  test("requirements/tests d'un client ne fuient pas vers un autre", async () => {
    const store = useTestDefinitionStore()
    await store.charger('client-A')
    await store.creerRequirement('client-A', {
      reference: 'REQ-001',
      titre: 'Exigence A',
      description: '',
      assetNodeId: null,
      processId: null,
    })
    await store.charger('client-B')
    expect(store.requirements).toHaveLength(0)
  })
})

describe('useTestDefinitionStore — Test Design Engine (Phase 35, TD-036)', () => {
  test('genererCandidatsRisquesPourObjectif crée des candidats proposés depuis les risques action_requise', async () => {
    await db.risksAssessment.put(risqueTest())
    const store = useTestDefinitionStore()
    await store.charger('client-1')

    const requirement = await store.creerRequirement('client-1', {
      reference: 'REQ-001',
      titre: 'Exigence liée au nœud à risque',
      description: '',
      assetNodeId: 'noeud-1',
      processId: null,
    })
    const objectif = await store.creerTestObjective('client-1', {
      requirementId: requirement.id,
      titre: 'Objectif',
      description: '',
    })

    const resultat = await store.genererCandidatsRisquesPourObjectif('client-1', objectif.id)
    expect(resultat).toEqual({ ok: true, nombreCrees: 1 })

    const candidats = store.testCandidates.filter((c) => c.test_objective_id === objectif.id)
    expect(candidats).toHaveLength(1)
    expect(candidats[0]?.risk_assessment_id).toBe('risque-1')
    expect(candidats[0]?.statut).toBe('propose')
    expect(candidats[0]?.titre).toContain('Perte de pression')
  })

  test('genererCandidatsRisquesPourObjectif est idempotent — ne recrée pas un candidat déjà généré', async () => {
    await db.risksAssessment.put(risqueTest())
    const store = useTestDefinitionStore()
    await store.charger('client-1')
    const requirement = await store.creerRequirement('client-1', {
      reference: 'REQ-001',
      titre: 'Exigence',
      description: '',
      assetNodeId: 'noeud-1',
      processId: null,
    })
    const objectif = await store.creerTestObjective('client-1', {
      requirementId: requirement.id,
      titre: 'Objectif',
      description: '',
    })

    await store.genererCandidatsRisquesPourObjectif('client-1', objectif.id)
    const second = await store.genererCandidatsRisquesPourObjectif('client-1', objectif.id)

    expect(second).toEqual({ ok: true, nombreCrees: 0 })
    expect(store.testCandidates.filter((c) => c.test_objective_id === objectif.id)).toHaveLength(1)
  })

  test('genererCandidatsRisquesPourObjectif retourne une erreur si objectif introuvable', async () => {
    const store = useTestDefinitionStore()
    await store.charger('client-1')
    const resultat = await store.genererCandidatsRisquesPourObjectif('client-1', 'inconnu')
    expect(resultat).toEqual({ ok: false, raison: 'objectif_introuvable' })
  })

  test('couvertureRisquesRequirement reflète non_couvert puis couvert après génération', async () => {
    await db.risksAssessment.put(risqueTest())
    const store = useTestDefinitionStore()
    await store.charger('client-1')
    const requirement = await store.creerRequirement('client-1', {
      reference: 'REQ-001',
      titre: 'Exigence',
      description: '',
      assetNodeId: 'noeud-1',
      processId: null,
    })
    const objectif = await store.creerTestObjective('client-1', {
      requirementId: requirement.id,
      titre: 'Objectif',
      description: '',
    })

    expect(store.couvertureRisquesRequirement(requirement.id)).toEqual([
      {
        risk_assessment_id: 'risque-1',
        mode_defaillance: 'Perte de pression',
        statut: 'non_couvert',
      },
    ])

    await store.genererCandidatsRisquesPourObjectif('client-1', objectif.id)

    expect(store.couvertureRisquesRequirement(requirement.id)).toEqual([
      { risk_assessment_id: 'risque-1', mode_defaillance: 'Perte de pression', statut: 'couvert' },
    ])
  })
})
