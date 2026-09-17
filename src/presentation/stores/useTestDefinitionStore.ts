import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  CouvertureWire,
  RequirementWire,
  TestCandidateWire,
  TestObjectiveWire,
  TestWire,
} from '../../connecteurs/auth/AuthApiClient'
import type {
  Couverture,
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
import {
  couverturesAMigrer,
  requirementsAMigrer,
  testCandidatesAMigrer,
  testObjectivesAMigrer,
  testsAMigrer,
} from '../../persistance/db'
import { useAuthStore } from './useAuthStore'
import { useRiskAssessmentStore } from './useRiskAssessmentStore'

export function requirementWireVersDomaine(wire: RequirementWire): Requirement {
  return {
    id: wire.id,
    client_id: wire.clientId,
    reference: wire.reference,
    titre: wire.titre,
    description: wire.description,
    asset_node_id: wire.assetNodeId,
    process_id: wire.processId,
    audit_log: wire.auditLog,
    created_at: wire.createdAt,
    updated_at: wire.updatedAt,
  }
}

export function testObjectiveWireVersDomaine(wire: TestObjectiveWire): TestObjective {
  return {
    id: wire.id,
    client_id: wire.clientId,
    requirement_id: wire.requirementId,
    titre: wire.titre,
    description: wire.description,
    created_at: wire.createdAt,
    updated_at: wire.updatedAt,
  }
}

export function testCandidateWireVersDomaine(wire: TestCandidateWire): TestCandidate {
  return {
    id: wire.id,
    client_id: wire.clientId,
    test_objective_id: wire.testObjectiveId,
    risk_assessment_id: wire.riskAssessmentId,
    titre: wire.titre,
    description: wire.description,
    statut: wire.statut as TestCandidate['statut'],
    motif_rejet: wire.motifRejet,
    duplique_de_id: wire.dupliqueDeId,
    remplace_par_id: wire.remplaceParId,
    audit_log: wire.auditLog,
    created_at: wire.createdAt,
    updated_at: wire.updatedAt,
  }
}

export function testWireVersDomaine(wire: TestWire): Test {
  return {
    id: wire.id,
    client_id: wire.clientId,
    test_candidate_id: wire.testCandidateId,
    titre: wire.titre,
    description: wire.description,
    etapes: wire.etapes.map((e) => ({
      id: e.id,
      ordre: e.ordre,
      action: e.action,
      resultat_attendu: e.resultatAttendu,
    })),
    statut: wire.statut as Test['statut'],
    audit_log: wire.auditLog,
    created_at: wire.createdAt,
    updated_at: wire.updatedAt,
  }
}

export function couvertureWireVersDomaine(wire: CouvertureWire): Couverture {
  return {
    id: wire.id,
    client_id: wire.clientId,
    requirement_id: wire.requirementId,
    test_id: wire.testId,
    created_at: wire.createdAt,
  }
}

function requirementDomaineVersWire(r: Requirement): RequirementWire {
  return {
    id: r.id,
    clientId: r.client_id,
    reference: r.reference,
    titre: r.titre,
    description: r.description,
    assetNodeId: r.asset_node_id,
    processId: r.process_id,
    auditLog: r.audit_log,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function testObjectiveDomaineVersWire(o: TestObjective): TestObjectiveWire {
  return {
    id: o.id,
    clientId: o.client_id,
    requirementId: o.requirement_id,
    titre: o.titre,
    description: o.description,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
  }
}

function testCandidateDomaineVersWire(c: TestCandidate): TestCandidateWire {
  return {
    id: c.id,
    clientId: c.client_id,
    testObjectiveId: c.test_objective_id,
    riskAssessmentId: c.risk_assessment_id,
    titre: c.titre,
    description: c.description,
    statut: c.statut,
    motifRejet: c.motif_rejet,
    dupliqueDeId: c.duplique_de_id,
    remplaceParId: c.remplace_par_id,
    auditLog: c.audit_log,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }
}

function testDomaineVersWire(t: Test): TestWire {
  return {
    id: t.id,
    clientId: t.client_id,
    testCandidateId: t.test_candidate_id,
    titre: t.titre,
    description: t.description,
    etapes: t.etapes.map((e) => ({
      id: e.id,
      ordre: e.ordre,
      action: e.action,
      resultatAttendu: e.resultat_attendu,
    })),
    statut: t.statut,
    auditLog: t.audit_log,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  }
}

function couvertureDomaineVersWire(c: Couverture): CouvertureWire {
  return {
    id: c.id,
    clientId: c.client_id,
    requirementId: c.requirement_id,
    testId: c.test_id,
    createdAt: c.created_at,
  }
}

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
 * **Phase 6a du chantier de migration D1**
 * (docs/CHANTIER-MIGRATION-D1-RECAP.md) : Cloudflare D1 devient la source
 * de vérité — mêmes routes authentifiées scopées par client que les
 * autres domaines de ce chantier.
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

  /** Lève si le relais n'est pas configuré — mutations exigent désormais systématiquement le Worker/D1, même discipline que les autres stores de ce chantier. */
  async function obtenirApi() {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) {
      throw new Error("Relais d'authentification non configuré (Configuration client).")
    }
    return { api, jeton: authStore.jeton }
  }

  /**
   * Envoie au serveur les enregistrements capturés depuis les anciennes
   * tables IndexedDB locales juste avant leur suppression — n'a d'effet
   * réel qu'une seule fois (voir migration Dexie v45, `persistance/db.ts`).
   * Filtre par client avant envoi, même patron que les autres domaines de
   * ce chantier.
   */
  async function migrerTestDefinitionLocalVersServeur(clientId: string): Promise<void> {
    const requirementsDuClient = requirementsAMigrer.filter((r) => r.client_id === clientId)
    const testObjectivesDuClient = testObjectivesAMigrer.filter((o) => o.client_id === clientId)
    const testCandidatesDuClient = testCandidatesAMigrer.filter((c) => c.client_id === clientId)
    const testsDuClient = testsAMigrer.filter((t) => t.client_id === clientId)
    const couverturesDuClient = couverturesAMigrer.filter((c) => c.client_id === clientId)
    if (
      requirementsDuClient.length === 0 &&
      testObjectivesDuClient.length === 0 &&
      testCandidatesDuClient.length === 0 &&
      testsDuClient.length === 0 &&
      couverturesDuClient.length === 0
    ) {
      return
    }

    const { api, jeton } = await obtenirApi()
    const resultat = await api.migrerTestDefinitionLocal(jeton, clientId, {
      requirements: requirementsDuClient.map(requirementDomaineVersWire),
      testObjectives: testObjectivesDuClient.map(testObjectiveDomaineVersWire),
      testCandidates: testCandidatesDuClient.map(testCandidateDomaineVersWire),
      tests: testsDuClient.map(testDomaineVersWire),
      couvertures: couverturesDuClient.map(couvertureDomaineVersWire),
    })
    if (!resultat.ok) {
      throw new Error(`Échec de la migration Test Definition : ${resultat.erreur}`)
    }
    for (const r of requirementsDuClient) {
      const index = requirementsAMigrer.indexOf(r)
      if (index !== -1) requirementsAMigrer.splice(index, 1)
    }
    for (const o of testObjectivesDuClient) {
      const index = testObjectivesAMigrer.indexOf(o)
      if (index !== -1) testObjectivesAMigrer.splice(index, 1)
    }
    for (const c of testCandidatesDuClient) {
      const index = testCandidatesAMigrer.indexOf(c)
      if (index !== -1) testCandidatesAMigrer.splice(index, 1)
    }
    for (const t of testsDuClient) {
      const index = testsAMigrer.indexOf(t)
      if (index !== -1) testsAMigrer.splice(index, 1)
    }
    for (const c of couverturesDuClient) {
      const index = couverturesAMigrer.indexOf(c)
      if (index !== -1) couverturesAMigrer.splice(index, 1)
    }
  }

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      try {
        await migrerTestDefinitionLocalVersServeur(clientId)
      } catch {
        // Nouvel essai au prochain chargement — ne bloque jamais l'affichage normal.
      }
      // RiskAssessment vit désormais dans le Worker/D1 (Phase 4d du
      // chantier de migration D1) — délègue à `useRiskAssessmentStore`,
      // seule source de vérité, plutôt que de dupliquer l'appel API ici.
      const riskAssessmentStore = useRiskAssessmentStore()
      await riskAssessmentStore.charger(clientId)
      risquesAssessment.value = riskAssessmentStore.evaluations

      const { api, jeton } = await obtenirApi()
      const resultat = await api.obtenirTestDefinition(jeton, clientId)
      if (resultat.ok) {
        requirements.value = resultat.donnees.requirements.map(requirementWireVersDomaine)
        testObjectives.value = resultat.donnees.testObjectives.map(testObjectiveWireVersDomaine)
        testCandidates.value = resultat.donnees.testCandidates.map(testCandidateWireVersDomaine)
        tests.value = resultat.donnees.tests.map(testWireVersDomaine)
        couvertures.value = resultat.donnees.couvertures.map(couvertureWireVersDomaine)
      } else {
        requirements.value = []
        testObjectives.value = []
        testCandidates.value = []
        tests.value = []
        couvertures.value = []
      }
    } catch {
      // Panne réseau réelle ou relais non configuré : jamais une exception
      // non gérée, même discipline que les autres stores de ce chantier.
      requirements.value = []
      testObjectives.value = []
      testCandidates.value = []
      tests.value = []
      couvertures.value = []
    } finally {
      enChargement.value = false
    }
  }

  async function creerRequirement(
    clientId: string,
    input: NouveauRequirementInput,
  ): Promise<Requirement> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerRequirement(jeton, clientId, {
      reference: input.reference,
      titre: input.titre,
      description: input.description,
      assetNodeId: input.assetNodeId,
      processId: input.processId,
    })
    if (!resultat.ok) {
      throw new Error(`Échec de la création du requirement : ${resultat.erreur}`)
    }
    const requirement = requirementWireVersDomaine(resultat.donnees.requirement)
    requirements.value = [...requirements.value, requirement]
    return requirement
  }

  async function creerTestObjective(
    clientId: string,
    input: NouveauTestObjectiveInput,
  ): Promise<TestObjective> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerTestObjective(jeton, clientId, {
      requirementId: input.requirementId,
      titre: input.titre,
      description: input.description,
    })
    if (!resultat.ok) {
      throw new Error(`Échec de la création du test objective : ${resultat.erreur}`)
    }
    const objectif = testObjectiveWireVersDomaine(resultat.donnees.testObjective)
    testObjectives.value = [...testObjectives.value, objectif]
    return objectif
  }

  async function creerTestCandidate(
    clientId: string,
    input: NouveauTestCandidateInput,
  ): Promise<TestCandidate> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerTestCandidate(jeton, clientId, {
      testObjectiveId: input.testObjectiveId,
      titre: input.titre,
      description: input.description,
    })
    if (!resultat.ok) {
      throw new Error(`Échec de la création du test candidate : ${resultat.erreur}`)
    }
    const candidat = testCandidateWireVersDomaine(resultat.donnees.testCandidate)
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
    if (suggestions.length === 0) return { ok: true, nombreCrees: 0 }

    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerTestCandidatsDepuisRisques(
      jeton,
      clientId,
      suggestions.map((s) => ({
        testObjectiveId,
        riskAssessmentId: s.risk_assessment_id,
        titre: s.titre,
        description: s.description,
      })),
    )
    if (!resultat.ok) {
      throw new Error(`Échec de la génération de candidats depuis les risques : ${resultat.erreur}`)
    }
    const nouveaux = resultat.donnees.testCandidates.map(testCandidateWireVersDomaine)
    testCandidates.value = [...testCandidates.value, ...nouveaux]
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
    const { api, jeton } = await obtenirApi()
    const resultat = await api.changerStatutTestCandidate(jeton, clientId, testCandidateId, {
      statut,
      motifRejet: options.motifRejet ?? null,
      dupliqueDeId: options.dupliqueDeId ?? null,
      remplaceParId: options.remplaceParId ?? null,
    })
    if (!resultat.ok) return null
    const candidat = testCandidateWireVersDomaine(resultat.donnees.testCandidate)
    testCandidates.value = testCandidates.value.map((c) =>
      c.id === testCandidateId ? candidat : c,
    )
    return candidat
  }

  /** Un `Test` ne peut être créé qu'à partir d'un candidat accepté — revérifié aussi côté serveur, jamais fait confiance au client seul. */
  async function creerTestDepuisCandidat(
    clientId: string,
    testCandidateId: string,
    input: NouveauTestInput,
  ): Promise<Test | { erreur: 'candidat_non_accepte' | 'candidat_introuvable' }> {
    const candidat = testCandidates.value.find((c) => c.id === testCandidateId)
    if (!candidat) return { erreur: 'candidat_introuvable' }
    if (candidat.statut !== 'accepte') return { erreur: 'candidat_non_accepte' }

    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerTest(jeton, clientId, {
      testCandidateId,
      titre: input.titre,
      description: input.description,
      etapes: input.etapes.map((e) => ({
        ordre: 0,
        action: e.action,
        resultatAttendu: e.resultatAttendu,
      })),
    })
    if (!resultat.ok) {
      if (
        resultat.erreur === 'candidat_non_accepte' ||
        resultat.erreur === 'candidat_introuvable'
      ) {
        return { erreur: resultat.erreur }
      }
      throw new Error(`Échec de la création du test : ${resultat.erreur}`)
    }
    const test = testWireVersDomaine(resultat.donnees.test)
    tests.value = [...tests.value, test]
    return test
  }

  async function approuverTest(clientId: string, testId: string): Promise<Test | null> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.approuverTest(jeton, clientId, testId)
    if (!resultat.ok) return null
    const test = testWireVersDomaine(resultat.donnees.test)
    tests.value = tests.value.map((t) => (t.id === testId ? test : t))
    return test
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

    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerCouverture(jeton, clientId, { requirementId, testId })
    if (!resultat.ok) {
      throw new Error(`Échec de la déclaration de couverture : ${resultat.erreur}`)
    }
    const couverture = couvertureWireVersDomaine(resultat.donnees.couverture)
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
