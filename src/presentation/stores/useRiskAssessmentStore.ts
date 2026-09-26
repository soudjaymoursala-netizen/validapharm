import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  MethodProfileRiskAssessmentWire,
  RiskAssessmentWire,
} from '../../connecteurs/auth/AuthApiClient'
import type {
  MethodProfileRiskAssessment,
  OrigineMethodeRiskAssessment,
  RiskAssessment,
} from '../../logique-metier/domaine/types'
import { calculerIPR } from '../../logique-metier/moteur-calcul/calculerIPR'
import { evaluerVerdictRiskAssessment } from '../../logique-metier/risque/evaluerVerdictRiskAssessment'
import { numeroVersion } from '../../logique-metier/versionnage/numeroVersion'
import { methodProfilesRiskAssessmentAMigrer, risksAssessmentAMigrer } from '../../persistance/db'
import { useAuthStore } from './useAuthStore'

export function profilRisqueWireVersDomaine(
  wire: MethodProfileRiskAssessmentWire,
): MethodProfileRiskAssessment {
  return {
    id: wire.id,
    client_id: wire.clientId,
    version: wire.version,
    effective_date: wire.effectiveDate,
    source: wire.source,
    origin: wire.origin as OrigineMethodeRiskAssessment,
    echelle_min: wire.echelleMin,
    echelle_max: wire.echelleMax,
    seuil_action: wire.seuilAction,
    created_at: wire.createdAt,
  }
}

export function evaluationRisqueWireVersDomaine(wire: RiskAssessmentWire): RiskAssessment {
  return {
    id: wire.id,
    client_id: wire.clientId,
    method_profile_id: wire.methodProfileId,
    method_profile_version: wire.methodProfileVersion,
    asset_node_id: wire.assetNodeId,
    parameter_id: wire.parameterId,
    etape_processus: wire.etapeProcessus,
    mode_defaillance: wire.modeDefaillance,
    effet_defaillance: wire.effetDefaillance,
    cause_potentielle: wire.causePotentielle,
    controle_actuel: wire.controleActuel,
    severite_initiale: wire.severiteInitiale,
    occurrence_initiale: wire.occurrenceInitiale,
    detectabilite_initiale: wire.detectabiliteInitiale,
    ipr_initial: wire.iprInitial,
    verdict_initial: wire.verdictInitial as RiskAssessment['verdict_initial'],
    recommandation: wire.recommandation,
    responsable: wire.responsable,
    date_cible: wire.dateCible,
    actions_menees: wire.actionsMenees,
    severite_residuelle: wire.severiteResiduelle,
    occurrence_residuelle: wire.occurrenceResiduelle,
    detectabilite_residuelle: wire.detectabiliteResiduelle,
    ipr_residuel: wire.iprResiduel,
    verdict_residuel: wire.verdictResiduel as RiskAssessment['verdict_residuel'],
    audit_log: wire.auditLog,
    created_at: wire.createdAt,
    updated_at: wire.updatedAt,
  }
}

function profilRisqueDomaineVersWire(
  p: MethodProfileRiskAssessment,
): MethodProfileRiskAssessmentWire {
  return {
    id: p.id,
    clientId: p.client_id,
    version: p.version,
    effectiveDate: p.effective_date,
    source: p.source,
    origin: p.origin,
    echelleMin: p.echelle_min,
    echelleMax: p.echelle_max,
    seuilAction: p.seuil_action,
    createdAt: p.created_at,
  }
}

function evaluationRisqueDomaineVersWire(e: RiskAssessment): RiskAssessmentWire {
  return {
    id: e.id,
    clientId: e.client_id,
    methodProfileId: e.method_profile_id,
    methodProfileVersion: e.method_profile_version,
    assetNodeId: e.asset_node_id,
    parameterId: e.parameter_id,
    etapeProcessus: e.etape_processus,
    modeDefaillance: e.mode_defaillance,
    effetDefaillance: e.effet_defaillance,
    causePotentielle: e.cause_potentielle,
    controleActuel: e.controle_actuel,
    severiteInitiale: e.severite_initiale,
    occurrenceInitiale: e.occurrence_initiale,
    detectabiliteInitiale: e.detectabilite_initiale,
    iprInitial: e.ipr_initial,
    verdictInitial: e.verdict_initial,
    recommandation: e.recommandation,
    responsable: e.responsable,
    dateCible: e.date_cible,
    actionsMenees: e.actions_menees,
    severiteResiduelle: e.severite_residuelle,
    occurrenceResiduelle: e.occurrence_residuelle,
    detectabiliteResiduelle: e.detectabilite_residuelle,
    iprResiduel: e.ipr_residuel,
    verdictResiduel: e.verdict_residuel,
    auditLog: e.audit_log,
    createdAt: e.created_at,
    updatedAt: e.updated_at,
  }
}

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
 * **Phase 4d du chantier de migration D1**
 * (docs/CHANTIER-MIGRATION-D1-RECAP.md) : Cloudflare D1 devient la source
 * de vérité — mêmes routes authentifiées scopées par client que les
 * autres domaines de la Phase 4, la logique métier (numéro de version
 * suivant, calcul IPR, verdict) reste entièrement côté client.
 *
 * @requirement Target Architecture §10, ICH Q9
 */
export const useRiskAssessmentStore = defineStore('riskAssessment', () => {
  const profils = ref<MethodProfileRiskAssessment[]>([])
  const evaluations = ref<RiskAssessment[]>([])
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
  const profilActif = computed<MethodProfileRiskAssessment | null>(() => {
    if (profils.value.length === 0) return null
    return (
      [...profils.value].sort((a, b) => numeroVersion(b.version) - numeroVersion(a.version))[0] ??
      null
    )
  })

  /**
   * Envoie au serveur les enregistrements capturés depuis les anciennes
   * tables IndexedDB locales juste avant leur suppression — n'a d'effet
   * réel qu'une seule fois (voir migration Dexie v42, `persistance/db.ts`).
   * Filtre par client avant envoi, même patron que les autres domaines de
   * la Phase 4.
   */
  async function migrerRiskAssessmentLocalVersServeur(clientId: string): Promise<void> {
    const profilsDuClient = methodProfilesRiskAssessmentAMigrer.filter(
      (p) => p.client_id === clientId,
    )
    const evaluationsDuClient = risksAssessmentAMigrer.filter((e) => e.client_id === clientId)
    if (profilsDuClient.length === 0 && evaluationsDuClient.length === 0) return

    const { api, jeton } = await obtenirApi()
    const resultat = await api.migrerRiskAssessmentLocal(jeton, clientId, {
      profilsRisque: profilsDuClient.map(profilRisqueDomaineVersWire),
      evaluationsRisque: evaluationsDuClient.map(evaluationRisqueDomaineVersWire),
    })
    if (!resultat.ok) {
      throw new Error(`Échec de la migration Risk Assessment : ${resultat.erreur}`)
    }
    for (const p of profilsDuClient) {
      const index = methodProfilesRiskAssessmentAMigrer.indexOf(p)
      if (index !== -1) methodProfilesRiskAssessmentAMigrer.splice(index, 1)
    }
    for (const e of evaluationsDuClient) {
      const index = risksAssessmentAMigrer.indexOf(e)
      if (index !== -1) risksAssessmentAMigrer.splice(index, 1)
    }
  }

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      try {
        await migrerRiskAssessmentLocalVersServeur(clientId)
      } catch {
        // Nouvel essai au prochain chargement — ne bloque jamais l'affichage normal.
      }
      const { api, jeton } = await obtenirApi()
      const resultat = await api.obtenirRiskAssessment(jeton, clientId)
      if (resultat.ok) {
        profils.value = resultat.donnees.profilsRisque.map(profilRisqueWireVersDomaine)
        evaluations.value = resultat.donnees.evaluationsRisque.map(evaluationRisqueWireVersDomaine)
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
    input: NouveauProfilRiskAssessmentInput,
  ): Promise<MethodProfileRiskAssessment> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerProfilRiskAssessment(jeton, clientId, {
      version: prochaineVersion(),
      source: input.source,
      origin: input.origin,
      echelleMin: input.echelleMin,
      echelleMax: input.echelleMax,
      seuilAction: input.seuilAction,
    })
    if (!resultat.ok) {
      throw new Error(`Échec de la création du profil Risk Assessment : ${resultat.erreur}`)
    }
    const profil = profilRisqueWireVersDomaine(resultat.donnees.profilRisque)
    profils.value = [...profils.value, profil]
    return profil
  }

  async function creerEvaluation(
    clientId: string,
    input: NouvelleEvaluationRiskAssessmentInput,
  ): Promise<RiskAssessment | { erreur: 'aucun_profil_configure' }> {
    const profil = profilActif.value
    if (!profil) return { erreur: 'aucun_profil_configure' }

    const echelle = { min: profil.echelle_min, max: profil.echelle_max }
    const resultatIPR = calculerIPR(
      input.severiteInitiale,
      input.occurrenceInitiale,
      input.detectabiliteInitiale,
      echelle,
    )
    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerEvaluationRiskAssessment(jeton, clientId, {
      methodProfileId: profil.id,
      methodProfileVersion: profil.version,
      assetNodeId: input.assetNodeId,
      parameterId: input.parameterId,
      etapeProcessus: input.etapeProcessus,
      modeDefaillance: input.modeDefaillance,
      effetDefaillance: input.effetDefaillance,
      causePotentielle: input.causePotentielle,
      controleActuel: input.controleActuel,
      severiteInitiale: input.severiteInitiale,
      occurrenceInitiale: input.occurrenceInitiale,
      detectabiliteInitiale: input.detectabiliteInitiale,
      iprInitial: resultatIPR.calcule ? resultatIPR.valeur : null,
      verdictInitial: evaluerVerdictRiskAssessment(resultatIPR, profil.seuil_action),
    })
    if (!resultat.ok) {
      throw new Error(`Échec de la création de l'évaluation Risk Assessment : ${resultat.erreur}`)
    }
    const evaluation = evaluationRisqueWireVersDomaine(resultat.donnees.evaluationRisque)
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
    const existant = evaluations.value.find((e) => e.id === riskAssessmentId)
    if (!existant || existant.client_id !== clientId) return { erreur: 'introuvable' }

    const profilFige = profils.value.find((p) => p.id === existant.method_profile_id)
    const echelle = profilFige
      ? { min: profilFige.echelle_min, max: profilFige.echelle_max }
      : { min: 1, max: 5 }
    const resultatIPR = calculerIPR(
      input.severiteResiduelle,
      input.occurrenceResiduelle,
      input.detectabiliteResiduelle,
      echelle,
    )

    const { api, jeton } = await obtenirApi()
    const resultat = await api.enregistrerActionResiduelleRiskAssessment(
      jeton,
      clientId,
      riskAssessmentId,
      {
        recommandation: input.recommandation,
        responsable: input.responsable,
        dateCible: input.dateCible,
        actionsMenees: input.actionsMenees,
        severiteResiduelle: input.severiteResiduelle,
        occurrenceResiduelle: input.occurrenceResiduelle,
        detectabiliteResiduelle: input.detectabiliteResiduelle,
        iprResiduel: resultatIPR.calcule ? resultatIPR.valeur : null,
        // Profil figé introuvable : aucun seuil connu, donc aucun verdict —
        // jamais « acceptable » par défaut (audit d'intégrité front, M4 :
        // un seuil infini rendait toute ligne acceptable, IPR 125 compris).
        verdictResiduel: profilFige
          ? evaluerVerdictRiskAssessment(resultatIPR, profilFige.seuil_action)
          : null,
      },
    )
    if (!resultat.ok) {
      if (resultat.erreur === 'introuvable') return { erreur: 'introuvable' }
      throw new Error(`Échec de l'enregistrement de l'action résiduelle : ${resultat.erreur}`)
    }
    const miseAJour = evaluationRisqueWireVersDomaine(resultat.donnees.evaluationRisque)
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
