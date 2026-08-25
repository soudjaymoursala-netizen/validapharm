import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  EvaluationACFC,
  MethodProfileACFC,
  OrigineMethodeACFC,
  QuestionACFC,
  ReponseQuestionACFC,
} from '../../logique-metier/domaine/types'
import { evaluerVerdictACFC } from '../../logique-metier/acfc/evaluerVerdictACFC'
import { IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1 } from '../identite/identiteLocale'
import { db } from '../../persistance/db'

export interface NouvelleQuestionInput {
  texte: string
}

export interface NouveauProfilInput {
  questions: NouvelleQuestionInput[]
  source: string
  origin: OrigineMethodeACFC
}

export interface NouvelleEvaluationInput {
  nomElement: string
  assetNodeId: string | null
  reponses: Record<string, ReponseQuestionACFC>
}

/**
 * Store de la méthode ACFC configurable par client (FS §4.6bis, remplace
 * la grille de criticité codée en dur — `docs/convergence/
 * TECHNICAL_DECISIONS.md` TD-002). Un `MethodProfileACFC` est immuable une
 * fois créé : toute modification des questions crée une **nouvelle
 * version**, jamais une mutation du profil existant, pour que les
 * évaluations passées restent reproductibles telles qu'elles ont été
 * produites (principe `ContextSnapshot` du package Target Architecture).
 *
 * @requirement URS-F-050 (F2, Analyse de risque)
 */
export const useMethodProfileACFCStore = defineStore('methodProfileACFC', () => {
  const profils = ref<MethodProfileACFC[]>([])
  const evaluations = ref<EvaluationACFC[]>([])
  const enChargement = ref(false)

  /** Le profil le plus récent (le seul utilisé pour de nouvelles évaluations). Aucun défaut fabriqué : `null` tant que le client n'a rien configuré. */
  const profilActif = computed<MethodProfileACFC | null>(() => {
    if (profils.value.length === 0) return null
    return [...profils.value].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null
  })

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      profils.value = await db.methodProfilesACFC.where('client_id').equals(clientId).toArray()
      evaluations.value = await db.evaluationsACFC.where('client_id').equals(clientId).toArray()
    } finally {
      enChargement.value = false
    }
  }

  function prochaineVersion(): string {
    return `v${profils.value.length + 1}`
  }

  async function creerNouvelleVersion(
    clientId: string,
    input: NouveauProfilInput,
  ): Promise<MethodProfileACFC> {
    const maintenant = new Date().toISOString()
    const questions: QuestionACFC[] = input.questions.map((q, index) => ({
      id: `q-${index + 1}-${crypto.randomUUID().slice(0, 8)}`,
      texte: { fr: q.texte },
    }))
    const profil: MethodProfileACFC = {
      id: crypto.randomUUID(),
      client_id: clientId,
      version: prochaineVersion(),
      effective_date: maintenant,
      source: input.source,
      origin: input.origin,
      questions,
      decision_rule: 'au_moins_un_oui_critique',
      created_at: maintenant,
    }
    await db.methodProfilesACFC.put(profil)
    profils.value = [...profils.value, profil]
    return profil
  }

  async function creerEvaluation(
    clientId: string,
    input: NouvelleEvaluationInput,
  ): Promise<EvaluationACFC | { erreur: 'aucun_profil_configure' }> {
    const profil = profilActif.value
    if (!profil) return { erreur: 'aucun_profil_configure' }

    const maintenant = new Date().toISOString()
    const verdict = evaluerVerdictACFC(profil.questions, input.reponses, profil.decision_rule)
    const evaluation: EvaluationACFC = {
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
    await db.evaluationsACFC.put(evaluation)
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
