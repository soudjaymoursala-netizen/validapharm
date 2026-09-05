import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  ContentPlan,
  TemplateType,
  TypeMethodProfileReference,
} from '../../logique-metier/domaine/types'
import { IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1 } from '../identite/identiteLocale'
import { db } from '../../persistance/db'
import { construireReadinessContentPlan } from '../../logique-metier/deliverable/readinessContentPlan'
import {
  evaluerReglesConformite,
  type RegleConformite,
} from '../../logique-metier/conformite/evaluerReglesConformite'

export interface NouveauContentPlanInput {
  templateId: TemplateType
  assetNodeId: string | null
  processId: string | null
  methodProfileId: string | null
  methodProfileType: TypeMethodProfileReference | null
  contextSnapshot: unknown
}

export type ErreurEcritureContentPlan = {
  erreur: 'introuvable' | 'non_valide' | 'deja_gele' | 'donnees_non_pretes'
}

/**
 * Garde-fou non négociable — un `ContentPlan` dont
 * `readiness` n'est pas `pret` ne peut jamais être gelé. Implémenté
 * via le Compliance Engine généralisé
 * (`evaluerReglesConformite`) — comportement strictement identique à avant
 * ce refactor.
 */
const REGLES_GEL_CONTENT_PLAN: readonly RegleConformite<Pick<ContentPlan, 'readiness'>>[] = [
  {
    code: 'readiness_non_prete',
    bloque: (plan) => plan.readiness !== 'pret',
    message: 'Les données ne sont pas encore prêtes (readiness ≠ pret).',
  },
]

/**
 * Store du `ContentPlan` (convergence architecturale — spec
 * dans `docs/convergence/PHASE_9_CONTENT_PLAN_SPEC.md`). Ne couvre que la
 * planification (`Request → Resolve → Context Snapshot → Content Plan`) —
 * ni génération, ni rendu, ni approbation finale du livrable, qui restent
 * portés par le moteur de gabarits existant (`DefinitionGabarit`/
 * `RenduGabarit.vue`, KEEP) et le cycle de vie de `Section`, hors périmètre
 * ici. Aucune génération/validation/gel automatique par IA.
 *
 * **Étendu** : `readiness` n'est plus fourni par
 * l'appelant — calculé automatiquement à la création et recalculable à la
 * demande via `construireReadinessContentPlan`
 * (`logique-metier/deliverable/readinessContentPlan.ts`).
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

  /**
   * Recharge la chaîne réelle `Requirement → Couverture → Test → Execution
   * → Evidence` + `QualityEvent` pour ce client et calcule `readiness` via
   * `construireReadinessContentPlan` — jamais une valeur
   * fournie par l'appelant.
   */
  async function calculerReadiness(clientId: string, assetNodeId: string | null) {
    const [requirements, couvertures, tests, executions, evidences, qualityEvents] =
      await Promise.all([
        db.requirements.where('client_id').equals(clientId).toArray(),
        db.couvertures.where('client_id').equals(clientId).toArray(),
        db.tests.where('client_id').equals(clientId).toArray(),
        db.executions.where('client_id').equals(clientId).toArray(),
        db.evidences.where('client_id').equals(clientId).toArray(),
        db.qualityEvents.where('client_id').equals(clientId).toArray(),
      ])
    return construireReadinessContentPlan({
      assetNodeId,
      requirements,
      couvertures,
      tests,
      executions,
      evidences,
      qualityEvents,
    })
  }

  /** `context_snapshot` est figé une seule fois ici et reste immutable ensuite. */
  async function creerContentPlan(
    clientId: string,
    input: NouveauContentPlanInput,
  ): Promise<ContentPlan> {
    const maintenant = new Date().toISOString()
    const readiness = await calculerReadiness(clientId, input.assetNodeId)
    const plan: ContentPlan = {
      id: crypto.randomUUID(),
      client_id: clientId,
      template_id: input.templateId,
      asset_node_id: input.assetNodeId,
      process_id: input.processId,
      method_profile_id: input.methodProfileId,
      method_profile_type: input.methodProfileType,
      context_snapshot: JSON.stringify(input.contextSnapshot),
      readiness,
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

  /**
   * Recalcule `readiness` à la demande (nouvelles Executions/Evidence
   * apparues après la création du plan) — jamais automatique en tâche de
   * fond, toujours une action explicite tracée dans `audit_log`.
   */
  async function recalculerReadiness(
    clientId: string,
    contentPlanId: string,
  ): Promise<ContentPlan | ErreurEcritureContentPlan> {
    const existant = await db.contentPlans.get(contentPlanId)
    if (!existant || existant.client_id !== clientId) return { erreur: 'introuvable' }
    if (existant.statut === 'gele') return { erreur: 'deja_gele' }

    const readiness = await calculerReadiness(clientId, existant.asset_node_id)
    const maintenant = new Date().toISOString()
    const miseAJour: ContentPlan = {
      ...existant,
      readiness,
      updated_at: maintenant,
      audit_log: [
        ...existant.audit_log,
        {
          timestamp: maintenant,
          actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1,
          action: `recalcul readiness : ${readiness}`,
        },
      ],
    }
    await db.contentPlans.put(miseAJour)
    contentPlans.value = contentPlans.value.map((p) => (p.id === existant.id ? miseAJour : p))
    return miseAJour
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

  /**
   * Garde-fous non négociables : DOIT être `valide` au préalable (pas de
   * saut direct depuis `brouillon`) ET `readiness` DOIT être `pret` — un
   * plan dont les données sont encore incomplètes (`besoin_information`/
   * `besoin_revue`/`bloque`) ne peut jamais être gelé, cohérent avec le
   * principe fondateur n°1 (aucune promotion automatique/prématurée).
   */
  async function gelerContentPlan(
    clientId: string,
    contentPlanId: string,
  ): Promise<ContentPlan | ErreurEcritureContentPlan> {
    const existant = await db.contentPlans.get(contentPlanId)
    if (!existant || existant.client_id !== clientId) return { erreur: 'introuvable' }
    if (existant.statut === 'gele') return { erreur: 'deja_gele' }
    if (existant.statut !== 'valide') return { erreur: 'non_valide' }
    const [regleBloquante] = evaluerReglesConformite(existant, REGLES_GEL_CONTENT_PLAN)
    if (regleBloquante) return { erreur: 'donnees_non_pretes' }

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
    recalculerReadiness,
  }
})
