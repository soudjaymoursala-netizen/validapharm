import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  EvaluationImpactAssessmentWire,
  MethodProfileImpactAssessmentWire,
} from '../../connecteurs/auth/AuthApiClient'
import type {
  EvaluationImpactAssessment,
  MethodProfileImpactAssessment,
  OrigineMethodeImpactAssessment,
  QuestionImpactAssessment,
} from '../../logique-metier/domaine/types'
import type { ReponseQuestionOuiNon } from '../../logique-metier/assessment/moteurQuestionsOuiNon'
import { evaluerVerdictImpactAssessment } from '../../logique-metier/assessment/evaluerVerdictImpactAssessment'
import { numeroVersion } from '../../logique-metier/versionnage/numeroVersion'
import {
  methodProfilesImpactAssessmentAMigrer,
  evaluationsImpactAssessmentAMigrer,
} from '../../persistance/db'
import { useAuthStore } from './useAuthStore'

export function profilImpactWireVersDomaine(
  wire: MethodProfileImpactAssessmentWire,
): MethodProfileImpactAssessment {
  return {
    id: wire.id,
    client_id: wire.clientId,
    version: wire.version,
    effective_date: wire.effectiveDate,
    source: wire.source,
    origin: wire.origin as OrigineMethodeImpactAssessment,
    questions: wire.questions,
    decision_rule: wire.decisionRule as 'au_moins_un_oui_impact_direct',
    created_at: wire.createdAt,
  }
}

export function evaluationImpactWireVersDomaine(
  wire: EvaluationImpactAssessmentWire,
): EvaluationImpactAssessment {
  return {
    id: wire.id,
    client_id: wire.clientId,
    method_profile_id: wire.methodProfileId,
    method_profile_version: wire.methodProfileVersion,
    asset_node_id: wire.assetNodeId,
    nom_element: wire.nomElement,
    reponses: wire.reponses as Record<string, ReponseQuestionOuiNon>,
    verdict: wire.verdict as EvaluationImpactAssessment['verdict'],
    audit_log: wire.auditLog,
    created_at: wire.createdAt,
    updated_at: wire.updatedAt,
  }
}

function profilImpactDomaineVersWire(
  p: MethodProfileImpactAssessment,
): MethodProfileImpactAssessmentWire {
  return {
    id: p.id,
    clientId: p.client_id,
    version: p.version,
    effectiveDate: p.effective_date,
    source: p.source,
    origin: p.origin,
    questions: p.questions,
    decisionRule: p.decision_rule,
    createdAt: p.created_at,
  }
}

function evaluationImpactDomaineVersWire(
  e: EvaluationImpactAssessment,
): EvaluationImpactAssessmentWire {
  return {
    id: e.id,
    clientId: e.client_id,
    methodProfileId: e.method_profile_id,
    methodProfileVersion: e.method_profile_version,
    assetNodeId: e.asset_node_id,
    nomElement: e.nom_element,
    reponses: e.reponses,
    verdict: e.verdict,
    auditLog: e.audit_log,
    createdAt: e.created_at,
    updatedAt: e.updated_at,
  }
}

export interface NouvelleQuestionImpactInput {
  texte: string
}

export interface NouveauProfilImpactInput {
  questions: NouvelleQuestionImpactInput[]
  source: string
  origin: OrigineMethodeImpactAssessment
}

export interface NouvelleEvaluationImpactInput {
  nomElement: string
  assetNodeId: string | null
  reponses: Record<string, ReponseQuestionOuiNon>
}

/**
 * Store Impact Assessment / System Classification (F1 de convergence
 * architecturale). Même principe d'immuabilité que
 * `useMethodProfileACFCStore` : une nouvelle version de méthode ne mute
 * jamais la précédente.
 *
 * **Phase 4c du chantier de migration D1**
 * (docs/CHANTIER-MIGRATION-D1-RECAP.md) : Cloudflare D1 devient la source
 * de vérité — mêmes routes authentifiées scopées par client qu'ACFC
 * (Phase 4a), la logique métier (numéro de version suivant, calcul du
 * verdict) reste entièrement côté client.
 *
 * @requirement Impact Assessment / System Classification
 */
export const useImpactAssessmentStore = defineStore('impactAssessment', () => {
  const profils = ref<MethodProfileImpactAssessment[]>([])
  const evaluations = ref<EvaluationImpactAssessment[]>([])
  const enChargement = ref(false)

  /** Lève si le relais n'est pas configuré — mutations exigent désormais systématiquement le Worker/D1, même discipline que `useMethodProfileACFCStore`. */
  async function obtenirApi() {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) {
      throw new Error("Relais d'authentification non configuré (Configuration client).")
    }
    return { api, jeton: authStore.jeton }
  }

  /** Tri sur le numéro de version (`vN`), jamais sur `created_at` — voir `useMethodProfileACFCStore.ts`. */
  const profilActif = computed<MethodProfileImpactAssessment | null>(() => {
    if (profils.value.length === 0) return null
    return (
      [...profils.value].sort((a, b) => numeroVersion(b.version) - numeroVersion(a.version))[0] ??
      null
    )
  })

  /**
   * Envoie au serveur les enregistrements capturés depuis les anciennes
   * tables IndexedDB locales juste avant leur suppression — n'a d'effet
   * réel qu'une seule fois (voir migration Dexie v41, `persistance/db.ts`).
   * Filtre par client avant envoi, même patron qu'ACFC.
   */
  async function migrerImpactAssessmentLocalVersServeur(clientId: string): Promise<void> {
    const profilsDuClient = methodProfilesImpactAssessmentAMigrer.filter(
      (p) => p.client_id === clientId,
    )
    const evaluationsDuClient = evaluationsImpactAssessmentAMigrer.filter(
      (e) => e.client_id === clientId,
    )
    if (profilsDuClient.length === 0 && evaluationsDuClient.length === 0) return

    const { api, jeton } = await obtenirApi()
    const resultat = await api.migrerImpactAssessmentLocal(jeton, clientId, {
      profilsImpact: profilsDuClient.map(profilImpactDomaineVersWire),
      evaluationsImpact: evaluationsDuClient.map(evaluationImpactDomaineVersWire),
    })
    if (!resultat.ok) {
      throw new Error(`Échec de la migration Impact Assessment : ${resultat.erreur}`)
    }
    for (const p of profilsDuClient) {
      const index = methodProfilesImpactAssessmentAMigrer.indexOf(p)
      if (index !== -1) methodProfilesImpactAssessmentAMigrer.splice(index, 1)
    }
    for (const e of evaluationsDuClient) {
      const index = evaluationsImpactAssessmentAMigrer.indexOf(e)
      if (index !== -1) evaluationsImpactAssessmentAMigrer.splice(index, 1)
    }
  }

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      try {
        await migrerImpactAssessmentLocalVersServeur(clientId)
      } catch {
        // Nouvel essai au prochain chargement — ne bloque jamais l'affichage normal.
      }
      const { api, jeton } = await obtenirApi()
      const resultat = await api.obtenirImpactAssessment(jeton, clientId)
      if (resultat.ok) {
        profils.value = resultat.donnees.profilsImpact.map(profilImpactWireVersDomaine)
        evaluations.value = resultat.donnees.evaluationsImpact.map(evaluationImpactWireVersDomaine)
      } else {
        profils.value = []
        evaluations.value = []
      }
    } catch {
      // Panne réseau réelle ou relais non configuré : jamais une exception
      // non gérée, même discipline que `useMethodProfileACFCStore.charger`.
      profils.value = []
      evaluations.value = []
    } finally {
      enChargement.value = false
    }
  }

  function prochaineVersion(): string {
    return `v${profils.value.length + 1}`
  }

  async function creerNouvelleVersion(
    clientId: string,
    input: NouveauProfilImpactInput,
  ): Promise<MethodProfileImpactAssessment> {
    const questions: QuestionImpactAssessment[] = input.questions.map((q, index) => ({
      id: `q-${index + 1}-${crypto.randomUUID().slice(0, 8)}`,
      texte: { fr: q.texte },
    }))
    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerProfilImpactAssessment(jeton, clientId, {
      version: prochaineVersion(),
      source: input.source,
      origin: input.origin,
      questions,
      decisionRule: 'au_moins_un_oui_impact_direct',
    })
    if (!resultat.ok) {
      throw new Error(`Échec de la création du profil Impact Assessment : ${resultat.erreur}`)
    }
    const profil = profilImpactWireVersDomaine(resultat.donnees.profilImpact)
    profils.value = [...profils.value, profil]
    return profil
  }

  async function creerEvaluation(
    clientId: string,
    input: NouvelleEvaluationImpactInput,
  ): Promise<EvaluationImpactAssessment | { erreur: 'aucun_profil_configure' }> {
    const profil = profilActif.value
    if (!profil) return { erreur: 'aucun_profil_configure' }

    const verdict = evaluerVerdictImpactAssessment(
      profil.questions,
      input.reponses,
      profil.decision_rule,
    )
    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerEvaluationImpactAssessment(jeton, clientId, {
      methodProfileId: profil.id,
      methodProfileVersion: profil.version,
      assetNodeId: input.assetNodeId,
      nomElement: input.nomElement,
      reponses: input.reponses,
      verdict,
    })
    if (!resultat.ok) {
      throw new Error(`Échec de la création de l'évaluation Impact Assessment : ${resultat.erreur}`)
    }
    const evaluation = evaluationImpactWireVersDomaine(resultat.donnees.evaluationImpact)
    evaluations.value = [...evaluations.value, evaluation]
    return evaluation
  }

  return {
    profils,
    evaluations,
    enChargement,
    profilActif,
    charger,
    creerNouvelleVersion,
    creerEvaluation,
  }
})
