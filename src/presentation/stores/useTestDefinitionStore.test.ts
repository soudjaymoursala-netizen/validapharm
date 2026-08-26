import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { db } from '../../persistance/db'
import { useTestDefinitionStore } from './useTestDefinitionStore'

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.requirements.clear()
  await db.testObjectives.clear()
  await db.testCandidates.clear()
  await db.tests.clear()
  await db.couvertures.clear()
})

describe('useTestDefinitionStore — chaîne de définition de base', () => {
  test('Requirement -> TestObjective -> TestCandidate -> Test', async () => {
    const store = useTestDefinitionStore()
    await store.charger('client-1')

    const requirement = await store.creerRequirement('client-1', {
      reference: 'URS-F-100',
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

    await store.retenirTestCandidate('client-1', candidat.id)
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
  test("un Test ne peut être créé qu'à partir d'un candidat retenu, jamais un candidat proposé", async () => {
    const store = useTestDefinitionStore()
    await store.charger('client-1')
    const requirement = await store.creerRequirement('client-1', {
      reference: 'URS-F-001',
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
      titre: 'Candidat non retenu',
      description: '',
    })

    const resultat = await store.creerTestDepuisCandidat('client-1', candidat.id, {
      titre: 'Test',
      description: '',
      etapes: [],
    })
    expect(resultat).toEqual({ erreur: 'candidat_non_retenu' })
  })

  test('un candidat écarté DOIT porter un motif tracé, jamais une suppression silencieuse', async () => {
    const store = useTestDefinitionStore()
    await store.charger('client-1')
    const requirement = await store.creerRequirement('client-1', {
      reference: 'URS-F-001',
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

    const ecarte = await store.ecarterTestCandidate(
      'client-1',
      candidat.id,
      'Redondant avec un autre test déjà retenu',
    )
    expect(ecarte?.statut).toBe('ecarte')
    expect(ecarte?.motif_ecart).toBe('Redondant avec un autre test déjà retenu')
    expect(ecarte?.audit_log).toHaveLength(2)
    expect(store.testCandidates).toHaveLength(1)

    const relu = await db.testCandidates.get(candidat.id)
    expect(relu?.statut).toBe('ecarte')
  })

  test("approuverTest journalise l'approbation", async () => {
    const store = useTestDefinitionStore()
    await store.charger('client-1')
    const requirement = await store.creerRequirement('client-1', {
      reference: 'URS-F-001',
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
    await store.retenirTestCandidate('client-1', candidat.id)
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
      reference: 'URS-F-001',
      titre: 'Exigence 1',
      description: '',
      assetNodeId: null,
      processId: null,
    })
    const req2 = await store.creerRequirement('client-1', {
      reference: 'URS-NF-046',
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
    await store.retenirTestCandidate('client-1', candidat.id)
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
      reference: 'URS-F-001',
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
    await store.retenirTestCandidate('client-1', candidat.id)
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
      reference: 'URS-F-001',
      titre: 'Exigence A',
      description: '',
      assetNodeId: null,
      processId: null,
    })
    await store.charger('client-B')
    expect(store.requirements).toHaveLength(0)
  })
})
