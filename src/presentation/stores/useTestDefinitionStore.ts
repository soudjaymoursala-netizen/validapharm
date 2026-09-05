import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  Couverture,
  EtapeTest,
  Requirement,
  RiskAssessment,
  Test,
  TestCandidate,
  TestObjective,
} from '../../logique-metier/domaine/types'
import {
  evaluerCouvertureRisques,
  type CouvertureRisque,
} from '../../logique-metier/test-design/evaluerCouvertureRisques'
import { genererCandidatsDepuisRisques } from '../../logique-metier/test-design/genererCandidatsDepuisRisques'
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
 * TestCandidate → Test (convergence architecturale — spec
 * dans `docs/convergence/CONVERGENCE_PLAN.md`). N'inclut ni l'exécution
 * ni l'Evidence, ni aucune génération IA.
 *
 * @requirement Target Architecture, domaine "Test"
 */
export const useTestDefinitionStore = defineStore('testDefinition', () => {
  const requirements = ref<Requirement[]>([])
  const testObjectives = ref<TestObjective[]>([])
  const testCandidates = ref<TestCandidate[]>([])
  const tests = ref<Test[]>([])
  const couvertures = ref<Couverture[]>([])
  const risquesAssessment = ref<RiskAssessment[]>([])
  const enChargement = ref(false)

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      requirements.value = await db.requirements.where('client_id').equals(clientId).toArray()
      testObjectives.value = await db.testObjectives.where('client_id').equals(clientId).toArray()
      testCandidates.value = await db.testCandidates.where('client_id').equals(clientId).toArray()
      tests.value = await db.tests.where('client_id').equals(clientId).toArray()
      couvertures.value = await db.couvertures.where('client_id').equals(clientId).toArray()
      risquesAssessment.value = await db.risksAssessment
        .where('client_id')
        .equals(clientId)
        .toArray()
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
      risk_assessment_id: null,
      titre: input.titre,
      description: input.description,
      statut: 'propose',
      motif_rejet: null,
      duplique_de_id: null,
      remplace_par_id: null,
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

  /**
   * Propose des candidats de test depuis les risques réels du référentiel
   * (Test Design Engine) — délègue entièrement à la
   * fonction pure `genererCandidatsDepuisRisques` (aucune règle métier ici,
   * même discipline que `creerNoeud`/`ajouterNiveau`). Les candidats sont
   * créés au statut `propose`, comme n'importe quel candidat manuel —
   * l'utilisateur les accepte/rejette exactement de la même façon, jamais
   * une approbation automatique.
   */
  async function genererCandidatsRisquesPourObjectif(
    clientId: string,
    testObjectiveId: string,
  ): Promise<{ ok: true; nombreCrees: number } | { ok: false; raison: 'objectif_introuvable' }> {
    const objectif = testObjectives.value.find((o) => o.id === testObjectiveId)
    if (!objectif) return { ok: false, raison: 'objectif_introuvable' }
    const requirement = requirements.value.find((r) => r.id === objectif.requirement_id)
    if (!requirement) return { ok: false, raison: 'objectif_introuvable' }

    const candidatsExistants = testCandidates.value.filter(
      (c) => c.test_objective_id === testObjectiveId,
    )
    const suggestions = genererCandidatsDepuisRisques(
      requirement,
      risquesAssessment.value,
      candidatsExistants,
    )

    const maintenant = new Date().toISOString()
    const nouveaux: TestCandidate[] = suggestions.map((s) => ({
      id: crypto.randomUUID(),
      client_id: clientId,
      test_objective_id: testObjectiveId,
      risk_assessment_id: s.risk_assessment_id,
      titre: s.titre,
      description: s.description,
      statut: 'propose',
      motif_rejet: null,
      duplique_de_id: null,
      remplace_par_id: null,
      audit_log: [
        {
          timestamp: maintenant,
          actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1,
          action: 'création (proposé depuis analyse de risque)',
        },
      ],
      created_at: maintenant,
      updated_at: maintenant,
    }))

    if (nouveaux.length > 0) {
      await db.testCandidates.bulkPut(nouveaux)
      testCandidates.value = [...testCandidates.value, ...nouveaux]
    }
    return { ok: true, nombreCrees: nouveaux.length }
  }

  /**
   * Rapport de couverture des risques pour une exigence — délègue à la
   * fonction pure `evaluerCouvertureRisques`. Recalculé à l'affichage,
   * jamais persisté (comme `testsCouvrantRequirement`).
   */
  function couvertureRisquesRequirement(requirementId: string): CouvertureRisque[] {
    const requirement = requirements.value.find((r) => r.id === requirementId)
    if (!requirement) return []
    return evaluerCouvertureRisques(requirement, risquesAssessment.value, testCandidates.value)
  }

  async function accepterTestCandidate(
    clientId: string,
    testCandidateId: string,
  ): Promise<TestCandidate | null> {
    return changerStatutCandidate(clientId, testCandidateId, 'accepte', {})
  }

  /** Rejeter un candidat DOIT toujours être justifié — jamais une suppression silencieuse. */
  async function rejeterTestCandidate(
    clientId: string,
    testCandidateId: string,
    motif: string,
  ): Promise<TestCandidate | null> {
    return changerStatutCandidate(clientId, testCandidateId, 'rejete', { motifRejet: motif })
  }

  async function marquerBesoinInformation(
    clientId: string,
    testCandidateId: string,
    motif: string,
  ): Promise<TestCandidate | null> {
    return changerStatutCandidate(clientId, testCandidateId, 'besoin_information', {
      motifRejet: motif,
    })
  }

  async function marquerBesoinRevue(
    clientId: string,
    testCandidateId: string,
    motif: string,
  ): Promise<TestCandidate | null> {
    return changerStatutCandidate(clientId, testCandidateId, 'besoin_revue', { motifRejet: motif })
  }

  /** Marque ce candidat comme doublon d'un autre — trace explicitement lequel, jamais une simple suppression. */
  async function marquerDoublon(
    clientId: string,
    testCandidateId: string,
    dupliqueDeId: string,
  ): Promise<TestCandidate | null> {
    return changerStatutCandidate(clientId, testCandidateId, 'doublon', { dupliqueDeId })
  }

  /** Marque ce candidat comme remplacé par un autre, plus récent — trace explicitement lequel. */
  async function marquerRemplace(
    clientId: string,
    testCandidateId: string,
    remplaceParId: string,
  ): Promise<TestCandidate | null> {
    return changerStatutCandidate(clientId, testCandidateId, 'remplace', { remplaceParId })
  }

  async function changerStatutCandidate(
    clientId: string,
    testCandidateId: string,
    statut: TestCandidate['statut'],
    options: { motifRejet?: string; dupliqueDeId?: string; remplaceParId?: string },
  ): Promise<TestCandidate | null> {
    const existant = await db.testCandidates.get(testCandidateId)
    if (!existant || existant.client_id !== clientId) return null
    const maintenant = new Date().toISOString()
    const motifRejet = options.motifRejet ?? null
    const misAJour: TestCandidate = {
      ...existant,
      statut,
      motif_rejet: motifRejet,
      duplique_de_id: options.dupliqueDeId ?? null,
      remplace_par_id: options.remplaceParId ?? null,
      updated_at: maintenant,
      audit_log: [
        ...existant.audit_log,
        {
          timestamp: maintenant,
          actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1,
          action: `changement de statut : ${statut}${motifRejet ? ` (${motifRejet})` : ''}`,
        },
      ],
    }
    await db.testCandidates.put(misAJour)
    testCandidates.value = testCandidates.value.map((c) =>
      c.id === testCandidateId ? misAJour : c,
    )
    return misAJour
  }

  /** Un `Test` ne peut être créé qu'à partir d'un candidat accepté — jamais depuis un candidat proposé, rejeté, ou en attente. */
  async function creerTestDepuisCandidat(
    clientId: string,
    testCandidateId: string,
    input: NouveauTestInput,
  ): Promise<Test | { erreur: 'candidat_non_accepte' | 'candidat_introuvable' }> {
    const candidat = testCandidates.value.find((c) => c.id === testCandidateId)
    if (!candidat) return { erreur: 'candidat_introuvable' }
    if (candidat.statut !== 'accepte') return { erreur: 'candidat_non_accepte' }

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
    risquesAssessment,
    enChargement,
    charger,
    creerRequirement,
    creerTestObjective,
    creerTestCandidate,
    genererCandidatsRisquesPourObjectif,
    couvertureRisquesRequirement,
    accepterTestCandidate,
    rejeterTestCandidate,
    marquerBesoinInformation,
    marquerBesoinRevue,
    marquerDoublon,
    marquerRemplace,
    creerTestDepuisCandidat,
    approuverTest,
    declarerCouverture,
    testsCouvrantRequirement,
  }
})
