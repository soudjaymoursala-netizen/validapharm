import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { EvaluationCSVAssessmentWire } from '../../connecteurs/auth/AuthApiClient'
import type { CategorieGAMP5, EvaluationCSVAssessment } from '../../logique-metier/domaine/types'
import { evaluationsCSVAssessmentAMigrer } from '../../persistance/db'
import { useAuthStore } from './useAuthStore'

export function evaluationCsvWireVersDomaine(
  wire: EvaluationCSVAssessmentWire,
): EvaluationCSVAssessment {
  return {
    id: wire.id,
    client_id: wire.clientId,
    asset_node_id: wire.assetNodeId,
    nom_systeme: wire.nomSysteme,
    categorie_gamp5: wire.categorieGamp5 as CategorieGAMP5,
    justification_categorie: wire.justificationCategorie,
    pertinence_gxp: wire.pertinenceGxp,
    pertinence_eres_part11: wire.pertinenceEresPart11,
    justification_pertinence: wire.justificationPertinence,
    audit_log: wire.auditLog,
    created_at: wire.createdAt,
    updated_at: wire.updatedAt,
  }
}

function evaluationCsvDomaineVersWire(e: EvaluationCSVAssessment): EvaluationCSVAssessmentWire {
  return {
    id: e.id,
    clientId: e.client_id,
    assetNodeId: e.asset_node_id,
    nomSysteme: e.nom_systeme,
    categorieGamp5: e.categorie_gamp5,
    justificationCategorie: e.justification_categorie,
    pertinenceGxp: e.pertinence_gxp,
    pertinenceEresPart11: e.pertinence_eres_part11,
    justificationPertinence: e.justification_pertinence,
    auditLog: e.audit_log,
    createdAt: e.created_at,
    updatedAt: e.updated_at,
  }
}

export interface NouvelleEvaluationCSVInput {
  nomSysteme: string
  assetNodeId: string | null
  categorieGamp5: CategorieGAMP5
  justificationCategorie: string
  pertinenceGxp: boolean
  pertinenceEresPart11: boolean
  justificationPertinence: string
}

/**
 * Store Computer System Assessment (F3 de convergence architecturale).
 * Contrairement à `useMethodProfileACFCStore`/`useImpactAssessmentStore`,
 * il n'y a pas de `MethodProfile` : la catégorisation GAMP5 est une grille
 * normative fixe (PIC/S PI 011-3), pas configurable par client.
 *
 * **Phase 4c du chantier de migration D1**
 * (docs/CHANTIER-MIGRATION-D1-RECAP.md) : Cloudflare D1 devient la source
 * de vérité — même route authentifiée scopée par client que les autres
 * domaines de ce chantier.
 *
 * @requirement Computer System Assessment
 */
export const useCSVAssessmentStore = defineStore('csvAssessment', () => {
  const evaluations = ref<EvaluationCSVAssessment[]>([])
  const enChargement = ref(false)

  /** Lève si le relais n'est pas configuré — mutations exigent désormais systématiquement le Worker/D1. */
  async function obtenirApi() {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) {
      throw new Error("Relais d'authentification non configuré (Configuration client).")
    }
    return { api, jeton: authStore.jeton }
  }

  /**
   * Envoie au serveur les évaluations capturées depuis l'ancienne table
   * IndexedDB locale juste avant sa suppression (migration Dexie v41,
   * `persistance/db.ts`). Filtre par client avant envoi, même patron
   * qu'ACFC.
   */
  async function migrerCsvAssessmentLocalVersServeur(clientId: string): Promise<void> {
    const evaluationsDuClient = evaluationsCSVAssessmentAMigrer.filter(
      (e) => e.client_id === clientId,
    )
    if (evaluationsDuClient.length === 0) return

    const { api, jeton } = await obtenirApi()
    const resultat = await api.migrerCsvAssessmentLocal(jeton, clientId, {
      evaluationsCsv: evaluationsDuClient.map(evaluationCsvDomaineVersWire),
    })
    if (!resultat.ok) {
      throw new Error(`Échec de la migration Computer System Assessment : ${resultat.erreur}`)
    }
    for (const e of evaluationsDuClient) {
      const index = evaluationsCSVAssessmentAMigrer.indexOf(e)
      if (index !== -1) evaluationsCSVAssessmentAMigrer.splice(index, 1)
    }
  }

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      try {
        await migrerCsvAssessmentLocalVersServeur(clientId)
      } catch {
        // Nouvel essai au prochain chargement — ne bloque jamais l'affichage normal.
      }
      const { api, jeton } = await obtenirApi()
      const resultat = await api.obtenirCsvAssessment(jeton, clientId)
      if (resultat.ok) {
        evaluations.value = resultat.donnees.evaluationsCsv.map(evaluationCsvWireVersDomaine)
      } else {
        evaluations.value = []
      }
    } catch {
      evaluations.value = []
    } finally {
      enChargement.value = false
    }
  }

  async function creerEvaluation(
    clientId: string,
    input: NouvelleEvaluationCSVInput,
  ): Promise<EvaluationCSVAssessment> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerEvaluationCsvAssessment(jeton, clientId, {
      assetNodeId: input.assetNodeId,
      nomSysteme: input.nomSysteme,
      categorieGamp5: input.categorieGamp5,
      justificationCategorie: input.justificationCategorie,
      pertinenceGxp: input.pertinenceGxp,
      pertinenceEresPart11: input.pertinenceEresPart11,
      justificationPertinence: input.justificationPertinence,
    })
    if (!resultat.ok) {
      throw new Error(`Échec de la création de l'évaluation CSV : ${resultat.erreur}`)
    }
    const evaluation = evaluationCsvWireVersDomaine(resultat.donnees.evaluationCsv)
    evaluations.value = [...evaluations.value, evaluation]
    return evaluation
  }

  return {
    evaluations,
    enChargement,
    charger,
    creerEvaluation,
  }
})
