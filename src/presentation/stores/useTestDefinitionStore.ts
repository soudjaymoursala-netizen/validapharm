import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  Couverture,
  EtapeTest,
  Requirement,
  Test,
  TestCandidate,
  TestObjective,
} from '../../logique-metier/domaine/types'
import { IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1 } from '../identite/identiteLocale'
import { db } from '../../persistance/db'

export interface NouveauRequirementInput {
  reference: string
  titre: string
  description: string
  assetNodeId: string | null
  processId: string | null
}

export interface NouveauTestObjectiveInput {
  requirementId: string
  titre: string
  description: string
}

export interface NouveauTestCandidateInput {
  testObjectiveId: string
  titre: string
  description: string
}

export interface NouvelleEtapeTestInput {
  action: string
  resultatAttendu: string
}

export interface NouveauTestInput {
  titre: string
  description: string
  etapes: NouvelleEtapeTestInput[]
}

/**
 * Store de la chaîne de définition Requirement → TestObjective →
 * TestCandidate → Test (Phase 7a de convergence architecturale — spec
 * dans `docs/convergence/CONVERGENCE_PLAN.md`). N'inclut ni l'exécution
 * (Phase 7b) ni l'Evidence (Phase 7c), ni aucune génération IA.
 *
 * @requirement Target Architecture, domaine "Test"
 */
export const useTestDefinitionStore = defineStore('testDefinition', () => {
  const requirements = ref<Requirement[]>([])
  const testObjectives = ref<TestObjective[]>([])
  const testCandidates = ref<TestCandidate[]>([])
  const tests = ref<Test[]>([])
  const couvertures = ref<Couverture[]>([])
  const enChargement = ref(false)

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      requirements.value = await db.requirements.where('client_id').equals(clientId).toArray()
      testObjectives.value = await db.testObjectives.where('client_id').equals(clientId).toArray()
      testCandidates.value = await db.testCandidates.where('client_id').equals(clientId).toArray()
      tests.value = await db.tests.where('client_id').equals(clientId).toArray()
      couvertures.value = await db.couvertures.where('client_id').equals(clientId).toArray()
    } finally {
      enChargement.value = false
    }
  }

  async function creerRequirement(
    clientId: string,
    input: NouveauRequirementInput,
  ): Promise<Requirement> {
    const maintenant = new Date().toISOString()
    const requirement: Requirement = {
      id: crypto.randomUUID(),
      client_id: clientId,
      reference: input.reference,
      titre: input.titre,
      description: input.description,
      asset_node_id: input.assetNodeId,
      process_id: input.processId,
      audit_log: [
        { timestamp: maintenant, actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1, action: 'création' },
      ],
      created_at: maintenant,
      updated_at: maintenant,
    }
    await db.requirements.put(requirement)
    requirements.value = [...requirements.value, requirement]
    return requirement
  }

  async function creerTestObjective(
    clientId: string,
    input: NouveauTestObjectiveInput,
  ): Promise<TestObjective> {
    const maintenant = new Date().toISOString()
    const objectif: TestObjective = {
      id: crypto.randomUUID(),
      client_id: clientId,
      requirement_id: input.requirementId,
      titre: input.titre,
      description: input.description,
      created_at: maintenant,
      updated_at: maintenant,
    }
    await db.testObjectives.put(objectif)
    testObjectives.value = [...testObjectives.value, objectif]
    return objectif
  }

  async function creerTestCandidate(
    clientId: string,
    input: NouveauTestCandidateInput,
  ): Promise<TestCandidate> {
    const maintenant = new Date().toISOString()
    const candidat: TestCandidate = {
      id: crypto.randomUUID(),
      client_id: clientId,
      test_objective_id: input.testObjectiveId,
      titre: input.titre,
      description: input.description,
      statut: 'propose',
      motif_ecart: null,
      audit_log: [
        { timestamp: maintenant, actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1, action: 'création' },
      ],
      created_at: maintenant,
      updated_at: maintenant,
    }
    await db.testCandidates.put(candidat)
    testCandidates.value = [...testCandidates.value, candidat]
    return candidat
  }

  async function retenirTestCandidate(
    clientId: string,
    testCandidateId: string,
  ): Promise<TestCandidate | null> {
    return changerStatutCandidate(clientId, testCandidateId, 'retenu', null)
  }

  /** Écarter un candidat DOIT toujours être justifié — jamais une suppression silencieuse. */
  async function ecarterTestCandidate(
    clientId: string,
    testCandidateId: string,
    motif: string,
  ): Promise<TestCandidate | null> {
    return changerStatutCandidate(clientId, testCandidateId, 'ecarte', motif)
  }

  async function changerStatutCandidate(
    clientId: string,
    testCandidateId: string,
    statut: TestCandidate['statut'],
    motifEcart: string | null,
  ): Promise<TestCandidate | null> {
    const existant = await db.testCandidates.get(testCandidateId)
    if (!existant || existant.client_id !== clientId) return null
    const maintenant = new Date().toISOString()
    const misAJour: TestCandidate = {
      ...existant,
      statut,
      motif_ecart: motifEcart,
      updated_at: maintenant,
      audit_log: [
        ...existant.audit_log,
        {
          timestamp: maintenant,
          actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1,
          action: `changement de statut : ${statut}${motifEcart ? ` (${motifEcart})` : ''}`,
        },
      ],
    }
    await db.testCandidates.put(misAJour)
    testCandidates.value = testCandidates.value.map((c) =>
      c.id === testCandidateId ? misAJour : c,
    )
    return misAJour
  }

  /** Un `Test` ne peut être créé qu'à partir d'un candidat retenu — jamais depuis un candidat proposé ou écarté. */
  async function creerTestDepuisCandidat(
    clientId: string,
    testCandidateId: string,
    input: NouveauTestInput,
  ): Promise<Test | { erreur: 'candidat_non_retenu' | 'candidat_introuvable' }> {
    const candidat = testCandidates.value.find((c) => c.id === testCandidateId)
    if (!candidat) return { erreur: 'candidat_introuvable' }
    if (candidat.statut !== 'retenu') return { erreur: 'candidat_non_retenu' }

    const maintenant = new Date().toISOString()
    const etapes: EtapeTest[] = input.etapes.map((e, index) => ({
      id: crypto.randomUUID(),
      ordre: index + 1,
      action: e.action,
      resultat_attendu: e.resultatAttendu,
    }))
    const test: Test = {
      id: crypto.randomUUID(),
      client_id: clientId,
      test_candidate_id: testCandidateId,
      titre: input.titre,
      description: input.description,
      etapes,
      statut: 'brouillon',
      audit_log: [
        { timestamp: maintenant, actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1, action: 'création' },
      ],
      created_at: maintenant,
      updated_at: maintenant,
    }
    await db.tests.put(test)
    tests.value = [...tests.value, test]
    return test
  }

  async function approuverTest(clientId: string, testId: string): Promise<Test | null> {
    const existant = await db.tests.get(testId)
    if (!existant || existant.client_id !== clientId) return null
    const maintenant = new Date().toISOString()
    const misAJour: Test = {
      ...existant,
      statut: 'approuve',
      updated_at: maintenant,
      audit_log: [
        ...existant.audit_log,
        {
          timestamp: maintenant,
          actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1,
          action: 'approbation',
        },
      ],
    }
    await db.tests.put(misAJour)
    tests.value = tests.value.map((t) => (t.id === testId ? misAJour : t))
    return misAJour
  }

  /** Déclaration explicite de couverture, jamais déduite automatiquement — idempotent. */
  async function declarerCouverture(
    clientId: string,
    requirementId: string,
    testId: string,
  ): Promise<Couverture> {
    const existante = couvertures.value.find(
      (c) => c.requirement_id === requirementId && c.test_id === testId,
    )
    if (existante) return existante

    const couverture: Couverture = {
      id: crypto.randomUUID(),
      client_id: clientId,
      requirement_id: requirementId,
      test_id: testId,
      created_at: new Date().toISOString(),
    }
    await db.couvertures.put(couverture)
    couvertures.value = [...couvertures.value, couverture]
    return couverture
  }

  function testsCouvrantRequirement(requirementId: string): Test[] {
    const idsTests = couvertures.value
      .filter((c) => c.requirement_id === requirementId)
      .map((c) => c.test_id)
    return tests.value.filter((t) => idsTests.includes(t.id))
  }

  return {
    requirements,
    testObjectives,
    testCandidates,
    tests,
    couvertures,
    enChargement,
    charger,
    creerRequirement,
    creerTestObjective,
    creerTestCandidate,
    retenirTestCandidate,
    ecarterTestCandidate,
    creerTestDepuisCandidat,
    approuverTest,
    declarerCouverture,
    testsCouvrantRequirement,
  }
})
