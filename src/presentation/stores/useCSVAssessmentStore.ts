import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CategorieGAMP5, EvaluationCSVAssessment } from '../../logique-metier/domaine/types'
import { IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1 } from '../identite/identiteLocale'
import { db } from '../../persistance/db'

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
 * Store Computer System Assessment (F3 de convergence
 * architecturale). Contrairement à `useMethodProfileACFCStore` et
 * `useImpactAssessmentStore`, il n'y a pas de `MethodProfile` : la
 * catégorisation GAMP5 est une grille normative fixe (PIC/S PI 011-3), pas
 * configurable par client — chaque évaluation sélectionne directement une
 * catégorie parmi les 5, avec justification.
 *
 * @requirement Computer System Assessment
 */
export const useCSVAssessmentStore = defineStore('csvAssessment', () => {
  const evaluations = ref<EvaluationCSVAssessment[]>([])
  const enChargement = ref(false)

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      evaluations.value = await db.evaluationsCSVAssessment
        .where('client_id')
        .equals(clientId)
        .toArray()
    } finally {
      enChargement.value = false
    }
  }

  async function creerEvaluation(
    clientId: string,
    input: NouvelleEvaluationCSVInput,
  ): Promise<EvaluationCSVAssessment> {
    const maintenant = new Date().toISOString()
    const evaluation: EvaluationCSVAssessment = {
      id: crypto.randomUUID(),
      client_id: clientId,
      asset_node_id: input.assetNodeId,
      nom_systeme: input.nomSysteme,
      categorie_gamp5: input.categorieGamp5,
      justification_categorie: input.justificationCategorie,
      pertinence_gxp: input.pertinenceGxp,
      pertinence_eres_part11: input.pertinenceEresPart11,
      justification_pertinence: input.justificationPertinence,
      audit_log: [
        { timestamp: maintenant, actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1, action: 'création' },
      ],
      created_at: maintenant,
      updated_at: maintenant,
    }
    await db.evaluationsCSVAssessment.put(evaluation)
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
