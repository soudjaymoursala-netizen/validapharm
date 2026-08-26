import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  ContentPlan,
  TemplateType,
  TypeMethodProfileReference,
} from '../../logique-metier/domaine/types'
import { IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1 } from '../identite/identiteLocale'
import { db } from '../../persistance/db'

export interface NouveauContentPlanInput {
  templateId: TemplateType
  assetNodeId: string | null
  processId: string | null
  methodProfileId: string | null
  methodProfileType: TypeMethodProfileReference | null
  contextSnapshot: unknown
}

export type ErreurEcritureContentPlan = {
  erreur: 'introuvable' | 'non_valide' | 'deja_gele'
}

/**
 * Store du `ContentPlan` (Phase 9 de convergence architecturale — spec
 * dans `docs/convergence/PHASE_9_CONTENT_PLAN_SPEC.md`). Ne couvre que la
 * planification (`Request → Resolve → Context Snapshot → Content Plan`) —
 * ni génération, ni rendu, ni approbation finale du livrable, qui restent
 * portés par le moteur de gabarits existant (`DefinitionGabarit`/
 * `RenduGabarit.vue`, KEEP) et le cycle de vie de `Section`, hors périmètre
 * ici. Aucune génération/validation/gel automatique par IA.
 *
 * @requirement Target Architecture, domaine "Deliverable Engine"
 */
export const useContentPlanStore = defineStore('contentPlan', () => {
  const contentPlans = ref<ContentPlan[]>([])
  const enChargement = ref(false)

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      contentPlans.value = await db.contentPlans.where('client_id').equals(clientId).toArray()
    } finally {
      enChargement.value = false
    }
  }

  /** `context_snapshot` est figé une seule fois ici et reste immutable ensuite. */
  async function creerContentPlan(
    clientId: string,
    input: NouveauContentPlanInput,
  ): Promise<ContentPlan> {
    const maintenant = new Date().toISOString()
    const plan: ContentPlan = {
      id: crypto.randomUUID(),
      client_id: clientId,
      template_id: input.templateId,
      asset_node_id: input.assetNodeId,
      process_id: input.processId,
      method_profile_id: input.methodProfileId,
      method_profile_type: input.methodProfileType,
      context_snapshot: JSON.stringify(input.contextSnapshot),
      statut: 'brouillon',
      audit_log: [
        { timestamp: maintenant, actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1, action: 'création' },
      ],
      created_at: maintenant,
      updated_at: maintenant,
    }
    await db.contentPlans.put(plan)
    contentPlans.value = [...contentPlans.value, plan]
    return plan
  }

  async function validerContentPlan(
    clientId: string,
    contentPlanId: string,
  ): Promise<ContentPlan | ErreurEcritureContentPlan> {
    const existant = await db.contentPlans.get(contentPlanId)
    if (!existant || existant.client_id !== clientId) return { erreur: 'introuvable' }
    if (existant.statut === 'gele') return { erreur: 'deja_gele' }

    return changerStatut(existant, 'valide')
  }

  /** Garde-fou non négociable : DOIT être `valide` au préalable — pas de saut direct depuis `brouillon`. */
  async function gelerContentPlan(
    clientId: string,
    contentPlanId: string,
  ): Promise<ContentPlan | ErreurEcritureContentPlan> {
    const existant = await db.contentPlans.get(contentPlanId)
    if (!existant || existant.client_id !== clientId) return { erreur: 'introuvable' }
    if (existant.statut === 'gele') return { erreur: 'deja_gele' }
    if (existant.statut !== 'valide') return { erreur: 'non_valide' }

    return changerStatut(existant, 'gele')
  }

  async function changerStatut(
    existant: ContentPlan,
    statut: ContentPlan['statut'],
  ): Promise<ContentPlan> {
    const maintenant = new Date().toISOString()
    const miseAJour: ContentPlan = {
      ...existant,
      statut,
      updated_at: maintenant,
      audit_log: [
        ...existant.audit_log,
        {
          timestamp: maintenant,
          actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1,
          action: `changement de statut : ${statut}`,
        },
      ],
    }
    await db.contentPlans.put(miseAJour)
    contentPlans.value = contentPlans.value.map((p) => (p.id === existant.id ? miseAJour : p))
    return miseAJour
  }

  return {
    contentPlans,
    enChargement,
    charger,
    creerContentPlan,
    validerContentPlan,
    gelerContentPlan,
  }
})
