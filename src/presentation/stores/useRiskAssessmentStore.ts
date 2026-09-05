import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  MethodProfileRiskAssessment,
  OrigineMethodeRiskAssessment,
  RiskAssessment,
} from '../../logique-metier/domaine/types'
import { calculerIPR } from '../../logique-metier/moteur-calcul/calculerIPR'
import { evaluerVerdictRiskAssessment } from '../../logique-metier/risque/evaluerVerdictRiskAssessment'
import { numeroVersion } from '../../logique-metier/versionnage/numeroVersion'
import { IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1 } from '../identite/identiteLocale'
import { db } from '../../persistance/db'

export interface NouveauProfilRiskAssessmentInput {
  echelleMin: number
  echelleMax: number
  seuilAction: number
  source: string
  origin: OrigineMethodeRiskAssessment
}

export interface NouvelleEvaluationRiskAssessmentInput {
  assetNodeId: string | null
  parameterId: string | null
  etapeProcessus: string
  modeDefaillance: string
  effetDefaillance: string
  causePotentielle: string
  controleActuel: string
  severiteInitiale: number | null
  occurrenceInitiale: number | null
  detectabiliteInitiale: number | null
}

export interface ActionResiduelleRiskAssessmentInput {
  recommandation: string | null
  responsable: string | null
  dateCible: string | null
  actionsMenees: string | null
  severiteResiduelle: number | null
  occurrenceResiduelle: number | null
  detectabiliteResiduelle: number | null
}

export type ErreurEcritureRiskAssessment = { erreur: 'introuvable' }

/**
 * Store Risk Assessment / AMDEC autonome (convergence
 * architecturale). Même principe d'immuabilité versionnée que
 * `useMethodProfileACFCStore`/`useImpactAssessmentStore` : une nouvelle
 * version de méthode ne mute jamais la précédente ; une évaluation figée
 * reste lisible avec l'échelle/le seuil de sa propre version.
 *
 * @requirement Target Architecture §10, ICH Q9
 */
export const useRiskAssessmentStore = defineStore('riskAssessment', () => {
  const profils = ref<MethodProfileRiskAssessment[]>([])
  const evaluations = ref<RiskAssessment[]>([])
  const enChargement = ref(false)

  /** Tri sur le numéro de version (`vN`), jamais sur `created_at` — voir `useMethodProfileACFCStore.ts`. */
  const profilActif = computed<MethodProfileRiskAssessment | null>(() => {
    if (profils.value.length === 0) return null
    return (
      [...profils.value].sort((a, b) => numeroVersion(b.version) - numeroVersion(a.version))[0] ??
      null
    )
  })

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      profils.value = await db.methodProfilesRiskAssessment
        .where('client_id')
        .equals(clientId)
        .toArray()
      evaluations.value = await db.risksAssessment.where('client_id').equals(clientId).toArray()
    } finally {
      enChargement.value = false
    }
  }

  function prochaineVersion(): string {
    return `v${profils.value.length + 1}`
  }

  async function creerNouvelleVersion(
    clientId: string,
    input: NouveauProfilRiskAssessmentInput,
  ): Promise<MethodProfileRiskAssessment> {
    const maintenant = new Date().toISOString()
    const profil: MethodProfileRiskAssessment = {
      id: crypto.randomUUID(),
      client_id: clientId,
      version: prochaineVersion(),
      effective_date: maintenant,
      source: input.source,
      origin: input.origin,
      echelle_min: input.echelleMin,
      echelle_max: input.echelleMax,
      seuil_action: input.seuilAction,
      created_at: maintenant,
    }
    await db.methodProfilesRiskAssessment.put(profil)
    profils.value = [...profils.value, profil]
    return profil
  }

  async function creerEvaluation(
    clientId: string,
    input: NouvelleEvaluationRiskAssessmentInput,
  ): Promise<RiskAssessment | { erreur: 'aucun_profil_configure' }> {
    const profil = profilActif.value
    if (!profil) return { erreur: 'aucun_profil_configure' }

    const maintenant = new Date().toISOString()
    const echelle = { min: profil.echelle_min, max: profil.echelle_max }
    const resultatIPR = calculerIPR(
      input.severiteInitiale,
      input.occurrenceInitiale,
      input.detectabiliteInitiale,
      echelle,
    )
    const evaluation: RiskAssessment = {
      id: crypto.randomUUID(),
      client_id: clientId,
      method_profile_id: profil.id,
      method_profile_version: profil.version,
      asset_node_id: input.assetNodeId,
      parameter_id: input.parameterId,
      etape_processus: input.etapeProcessus,
      mode_defaillance: input.modeDefaillance,
      effet_defaillance: input.effetDefaillance,
      cause_potentielle: input.causePotentielle,
      controle_actuel: input.controleActuel,
      severite_initiale: input.severiteInitiale,
      occurrence_initiale: input.occurrenceInitiale,
      detectabilite_initiale: input.detectabiliteInitiale,
      ipr_initial: resultatIPR.calcule ? resultatIPR.valeur : null,
      verdict_initial: evaluerVerdictRiskAssessment(resultatIPR, profil.seuil_action),
      recommandation: null,
      responsable: null,
      date_cible: null,
      actions_menees: null,
      severite_residuelle: null,
      occurrence_residuelle: null,
      detectabilite_residuelle: null,
      ipr_residuel: null,
      verdict_residuel: null,
      audit_log: [
        { timestamp: maintenant, actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1, action: 'création' },
      ],
      created_at: maintenant,
      updated_at: maintenant,
    }
    await db.risksAssessment.put(evaluation)
    evaluations.value = [...evaluations.value, evaluation]
    return evaluation
  }

  /**
   * Enregistre l'action et son évaluation résiduelle (SEV/OCC/DET/RPN après
   * action, cycle confirmé par le modèle AMDEC réel — `Processus_AMDEC.xlsx`,
   * Google Drive). Utilise l'échelle/le seuil du `MethodProfile` fixé au
   * moment de la création de cette évaluation (`method_profile_id`), jamais
   * le profil actif courant si une nouvelle version a été créée entretemps.
   */
  async function enregistrerActionResiduelle(
    clientId: string,
    riskAssessmentId: string,
    input: ActionResiduelleRiskAssessmentInput,
  ): Promise<RiskAssessment | ErreurEcritureRiskAssessment> {
    const existant = await db.risksAssessment.get(riskAssessmentId)
    if (!existant || existant.client_id !== clientId) return { erreur: 'introuvable' }

    const profil = await db.methodProfilesRiskAssessment.get(existant.method_profile_id)
    const echelle = profil
      ? { min: profil.echelle_min, max: profil.echelle_max }
      : { min: 1, max: 5 }
    const seuilAction = profil?.seuil_action ?? Infinity
    const resultatIPR = calculerIPR(
      input.severiteResiduelle,
      input.occurrenceResiduelle,
      input.detectabiliteResiduelle,
      echelle,
    )

    const maintenant = new Date().toISOString()
    const miseAJour: RiskAssessment = {
      ...existant,
      recommandation: input.recommandation,
      responsable: input.responsable,
      date_cible: input.dateCible,
      actions_menees: input.actionsMenees,
      severite_residuelle: input.severiteResiduelle,
      occurrence_residuelle: input.occurrenceResiduelle,
      detectabilite_residuelle: input.detectabiliteResiduelle,
      ipr_residuel: resultatIPR.calcule ? resultatIPR.valeur : null,
      verdict_residuel: evaluerVerdictRiskAssessment(resultatIPR, seuilAction),
      updated_at: maintenant,
      audit_log: [
        ...existant.audit_log,
        {
          timestamp: maintenant,
          actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1,
          action: 'action résiduelle enregistrée',
        },
      ],
    }
    await db.risksAssessment.put(miseAJour)
    evaluations.value = evaluations.value.map((e) => (e.id === existant.id ? miseAJour : e))
    return miseAJour
  }

  return {
    profils,
    evaluations,
    enChargement,
    profilActif,
    charger,
    creerNouvelleVersion,
    creerEvaluation,
    enregistrerActionResiduelle,
  }
})
