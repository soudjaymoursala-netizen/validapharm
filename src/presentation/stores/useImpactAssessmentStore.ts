import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  EvaluationImpactAssessment,
  MethodProfileImpactAssessment,
  OrigineMethodeImpactAssessment,
  QuestionImpactAssessment,
} from '../../logique-metier/domaine/types'
import type { ReponseQuestionOuiNon } from '../../logique-metier/assessment/moteurQuestionsOuiNon'
import { evaluerVerdictImpactAssessment } from '../../logique-metier/assessment/evaluerVerdictImpactAssessment'
import { numeroVersion } from '../../logique-metier/versionnage/numeroVersion'
import { IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1 } from '../identite/identiteLocale'
import { db } from '../../persistance/db'

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
 * Store Impact Assessment / System Classification (F1, Phase 3 de
 * convergence architecturale). Même principe d'immuabilité que
 * `useMethodProfileACFCStore` (Phase 1) : une nouvelle version de méthode
 * ne mute jamais la précédente.
 *
 * @requirement URS-F-050 (F1, Impact Assessment / System Classification)
 */
export const useImpactAssessmentStore = defineStore('impactAssessment', () => {
  const profils = ref<MethodProfileImpactAssessment[]>([])
  const evaluations = ref<EvaluationImpactAssessment[]>([])
  const enChargement = ref(false)

  /** Tri sur le numéro de version (`vN`), jamais sur `created_at` — voir `useMethodProfileACFCStore.ts`. */
  const profilActif = computed<MethodProfileImpactAssessment | null>(() => {
    if (profils.value.length === 0) return null
    return (
      [...profils.value].sort((a, b) => numeroVersion(b.version) - numeroVersion(a.version))[0] ??
      null
    )
  })

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      profils.value = await db.methodProfilesImpactAssessment
        .where('client_id')
        .equals(clientId)
        .toArray()
      evaluations.value = await db.evaluationsImpactAssessment
        .where('client_id')
        .equals(clientId)
        .toArray()
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
    const maintenant = new Date().toISOString()
    const questions: QuestionImpactAssessment[] = input.questions.map((q, index) => ({
      id: `q-${index + 1}-${crypto.randomUUID().slice(0, 8)}`,
      texte: { fr: q.texte },
    }))
    const profil: MethodProfileImpactAssessment = {
      id: crypto.randomUUID(),
      client_id: clientId,
      version: prochaineVersion(),
      effective_date: maintenant,
      source: input.source,
      origin: input.origin,
      questions,
      decision_rule: 'au_moins_un_oui_impact_direct',
      created_at: maintenant,
    }
    await db.methodProfilesImpactAssessment.put(profil)
    profils.value = [...profils.value, profil]
    return profil
  }

  async function creerEvaluation(
    clientId: string,
    input: NouvelleEvaluationImpactInput,
  ): Promise<EvaluationImpactAssessment | { erreur: 'aucun_profil_configure' }> {
    const profil = profilActif.value
    if (!profil) return { erreur: 'aucun_profil_configure' }

    const maintenant = new Date().toISOString()
    const verdict = evaluerVerdictImpactAssessment(
      profil.questions,
      input.reponses,
      profil.decision_rule,
    )
    const evaluation: EvaluationImpactAssessment = {
      id: crypto.randomUUID(),
      client_id: clientId,
      method_profile_id: profil.id,
      method_profile_version: profil.version,
      asset_node_id: input.assetNodeId,
      nom_element: input.nomElement,
      reponses: input.reponses,
      verdict,
      audit_log: [
        { timestamp: maintenant, actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1, action: 'création' },
      ],
      created_at: maintenant,
      updated_at: maintenant,
    }
    await db.evaluationsImpactAssessment.put(evaluation)
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
