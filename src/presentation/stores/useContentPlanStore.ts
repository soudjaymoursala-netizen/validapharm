import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  ContentPlanWire,
  SaisieCreationContentPlanWire,
} from '../../connecteurs/auth/AuthApiClient'
import type {
  ContentPlan,
  ReadinessContentPlan,
  StatutContentPlan,
  TemplateType,
  TypeMethodProfileReference,
} from '../../logique-metier/domaine/types'
import { contentPlansAMigrer } from '../../persistance/db'
import { useAuthStore } from './useAuthStore'

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

export function contentPlanWireVersDomaine(w: ContentPlanWire): ContentPlan {
  return {
    id: w.id,
    client_id: w.clientId,
    template_id: w.templateId as TemplateType,
    asset_node_id: w.assetNodeId,
    process_id: w.processId,
    method_profile_id: w.methodProfileId,
    method_profile_type: w.methodProfileType as TypeMethodProfileReference | null,
    context_snapshot: w.contextSnapshot,
    readiness: w.readiness as ReadinessContentPlan,
    statut: w.statut as StatutContentPlan,
    audit_log: w.auditLog,
    created_at: w.createdAt,
    updated_at: w.updatedAt,
  }
}

export function contentPlanDomaineVersWire(p: ContentPlan): ContentPlanWire {
  return {
    id: p.id,
    clientId: p.client_id,
    templateId: p.template_id,
    assetNodeId: p.asset_node_id,
    processId: p.process_id,
    methodProfileId: p.method_profile_id,
    methodProfileType: p.method_profile_type,
    contextSnapshot: p.context_snapshot,
    readiness: p.readiness,
    statut: p.statut,
    auditLog: p.audit_log,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }
}

/**
 * Store du `ContentPlan` (convergence architecturale — spec
 * dans `docs/convergence/PHASE_9_CONTENT_PLAN_SPEC.md`). Ne couvre que la
 * planification (`Request → Resolve → Context Snapshot → Content Plan`) —
 * ni génération, ni rendu, ni approbation finale du livrable, qui restent
 * portés par le moteur de gabarits existant (`DefinitionGabarit`/
 * `RenduGabarit.vue`, KEEP) et le cycle de vie de `Section`, hors périmètre
 * ici. Aucune génération/validation/gel automatique par IA.
 *
 * **Migré vers le Worker/D1 (Phase 7b du chantier de migration D1)** —
 * même patron que les phases précédentes : `id`/timestamps/identité
 * (`actor` de `audit_log`) toujours dérivés côté serveur, jamais fait
 * confiance au client. `readiness` n'est plus calculée côté client (elle
 * l'était auparavant via `construireReadinessContentPlan` en rechargeant
 * QualityEvent/Requirement/Couverture/Test/Execution/Evidence) — le Worker
 * la calcule désormais lui-même à partir des mêmes dépôts D1, y compris
 * dans le garde-fou non négociable de `gelerContentPlan` (jamais fait
 * confiance à une valeur `readiness` fournie par le client ou stockée).
 *
 * @requirement Target Architecture, domaine "Deliverable Engine"
 */
export const useContentPlanStore = defineStore('contentPlan', () => {
  const contentPlans = ref<ContentPlan[]>([])
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
   * Envoie au serveur les enregistrements capturés depuis l'ancienne table
   * IndexedDB locale juste avant sa suppression — n'a d'effet réel qu'une
   * seule fois (voir migration Dexie v49, `persistance/db.ts`).
   */
  async function migrerContentPlansLocalVersServeur(clientId: string): Promise<void> {
    const contentPlansDuClient = contentPlansAMigrer.filter((p) => p.client_id === clientId)
    if (contentPlansDuClient.length === 0) return

    const { api, jeton } = await obtenirApi()
    const resultat = await api.migrerContentPlansLocal(jeton, clientId, {
      contentPlans: contentPlansDuClient.map(contentPlanDomaineVersWire),
    })
    if (!resultat.ok) {
      throw new Error(`Échec de la migration ContentPlan : ${resultat.erreur}`)
    }
    for (const entree of contentPlansDuClient) {
      const index = contentPlansAMigrer.indexOf(entree)
      if (index !== -1) contentPlansAMigrer.splice(index, 1)
    }
  }

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      try {
        await migrerContentPlansLocalVersServeur(clientId)
      } catch {
        // Nouvel essai au prochain chargement — ne bloque jamais l'affichage normal.
      }
      const { api, jeton } = await obtenirApi()
      const resultat = await api.obtenirContentPlans(jeton, clientId)
      contentPlans.value = resultat.ok
        ? resultat.donnees.contentPlans.map(contentPlanWireVersDomaine)
        : []
    } catch {
      // Panne réseau réelle ou relais non configuré : jamais une exception
      // non gérée, même discipline que les autres stores de ce chantier.
      contentPlans.value = []
    } finally {
      enChargement.value = false
    }
  }

  /** `context_snapshot` est figé une seule fois ici et reste immutable ensuite ; `readiness` est calculée côté serveur, jamais fournie par l'appelant. */
  async function creerContentPlan(
    clientId: string,
    input: NouveauContentPlanInput,
  ): Promise<ContentPlan> {
    const { api, jeton } = await obtenirApi()
    const saisie: SaisieCreationContentPlanWire = {
      templateId: input.templateId,
      assetNodeId: input.assetNodeId,
      processId: input.processId,
      methodProfileId: input.methodProfileId,
      methodProfileType: input.methodProfileType,
      contextSnapshot: JSON.stringify(input.contextSnapshot),
    }
    const resultat = await api.creerContentPlan(jeton, clientId, saisie)
    if (!resultat.ok) throw new Error(`Échec de la création du ContentPlan : ${resultat.erreur}`)
    const plan = contentPlanWireVersDomaine(resultat.donnees.contentPlan)
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
    const { api, jeton } = await obtenirApi()
    const resultat = await api.recalculerReadinessContentPlan(jeton, clientId, contentPlanId)
    if (!resultat.ok) {
      if (resultat.erreur === 'introuvable' || resultat.erreur === 'deja_gele') {
        return { erreur: resultat.erreur }
      }
      throw new Error(`Échec du recalcul de la readiness : ${resultat.erreur}`)
    }
    const miseAJour = contentPlanWireVersDomaine(resultat.donnees.contentPlan)
    contentPlans.value = contentPlans.value.map((p) => (p.id === contentPlanId ? miseAJour : p))
    return miseAJour
  }

  async function validerContentPlan(
    clientId: string,
    contentPlanId: string,
  ): Promise<ContentPlan | ErreurEcritureContentPlan> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.validerContentPlan(jeton, clientId, contentPlanId)
    if (!resultat.ok) {
      if (resultat.erreur === 'introuvable' || resultat.erreur === 'deja_gele') {
        return { erreur: resultat.erreur }
      }
      throw new Error(`Échec de la validation : ${resultat.erreur}`)
    }
    const miseAJour = contentPlanWireVersDomaine(resultat.donnees.contentPlan)
    contentPlans.value = contentPlans.value.map((p) => (p.id === contentPlanId ? miseAJour : p))
    return miseAJour
  }

  /**
   * Garde-fous non négociables, revérifiés côté serveur : DOIT être
   * `valide` au préalable (pas de saut direct depuis `brouillon`) ET
   * `readiness` DOIT être `pret` — un plan dont les données sont encore
   * incomplètes (`besoin_information`/`besoin_revue`/`bloque`) ne peut
   * jamais être gelé, cohérent avec le principe fondateur n°1 (aucune
   * promotion automatique/prématurée).
   */
  async function gelerContentPlan(
    clientId: string,
    contentPlanId: string,
  ): Promise<ContentPlan | ErreurEcritureContentPlan> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.gelerContentPlan(jeton, clientId, contentPlanId)
    if (!resultat.ok) {
      if (
        resultat.erreur === 'introuvable' ||
        resultat.erreur === 'deja_gele' ||
        resultat.erreur === 'non_valide' ||
        resultat.erreur === 'donnees_non_pretes'
      ) {
        return { erreur: resultat.erreur }
      }
      throw new Error(`Échec du gel : ${resultat.erreur}`)
    }
    const miseAJour = contentPlanWireVersDomaine(resultat.donnees.contentPlan)
    contentPlans.value = contentPlans.value.map((p) => (p.id === contentPlanId ? miseAJour : p))
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
