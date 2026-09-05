import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ContextSnapshot, ContextSnapshotItem } from '../../logique-metier/domaine/types'
import {
  assemblerElementsContextSnapshot,
  type EntreesAssemblageContextSnapshot,
} from '../../logique-metier/contexte/assemblageContextSnapshot'
import { db } from '../../persistance/db'

export type EntreesAssemblage = Omit<
  EntreesAssemblageContextSnapshot,
  'workspaceId' | 'assetNodeId'
> & {
  workspaceId?: string | null
  assetNodeId?: string | null
}

/**
 * Store `ContextSnapshot` (convergence architecturale — spec
 * détaillée dans `docs/convergence/PHASE_14_CONTEXT_ENGINE_SPEC.md`).
 * Généralise la résolution Scope+Applicability+Effectivity+Override
 * (`resoudreRegleEffective`/`ancetresWorkspace`), jusqu'ici
 * câblée sur le seul store Structure Système, en une entité réutilisable
 * par toute `Mission`.
 *
 * **Garde-fou non négociable** : aucune fonction de mise à jour n'est
 * exposée — un `ContextSnapshot` est immuable une fois créé (invariant #12
 * de `03_DOMAIN_DATA_MODEL.md`), même discipline que `Evidence`/
 * `ExecutionStep`.
 *
 * @requirement docs/convergence/CONVERGENCE_PLAN.md
 */
export const useContextEngineStore = defineStore('contextEngine', () => {
  const snapshots = ref<ContextSnapshot[]>([])
  const items = ref<ContextSnapshotItem[]>([])
  const enChargement = ref(false)

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      snapshots.value = await db.contextSnapshots.where('client_id').equals(clientId).toArray()
      items.value = await db.contextSnapshotItems.where('client_id').equals(clientId).toArray()
    } finally {
      enChargement.value = false
    }
  }

  /**
   * Assemble et persiste un nouveau `ContextSnapshot` — délègue l'assemblage
   * à `assemblerElementsContextSnapshot` (fonction pure), puis fige le
   * résultat. Aucune mise à jour possible ensuite : un nouveau besoin de
   * contexte crée un nouveau `ContextSnapshot`, jamais une modification de
   * celui-ci (immutabilité, invariant #12).
   */
  async function assemblerSnapshot(
    clientId: string,
    entrees: EntreesAssemblage,
  ): Promise<ContextSnapshot> {
    const workspaceId = entrees.workspaceId ?? null
    const assetNodeId = entrees.assetNodeId ?? null
    const elements = assemblerElementsContextSnapshot({
      ...entrees,
      workspaceId,
      assetNodeId,
    })

    const maintenant = new Date().toISOString()
    const snapshot: ContextSnapshot = {
      id: crypto.randomUUID(),
      client_id: clientId,
      workspace_id: workspaceId,
      asset_node_id: assetNodeId,
      created_at: maintenant,
    }
    await db.contextSnapshots.put(snapshot)
    snapshots.value = [...snapshots.value, snapshot]

    const nouveauxItems: ContextSnapshotItem[] = elements.map((element) => ({
      id: crypto.randomUUID(),
      client_id: clientId,
      context_snapshot_id: snapshot.id,
      type_objet: element.type_objet,
      objet_id: element.objet_id,
    }))
    if (nouveauxItems.length > 0) {
      await db.contextSnapshotItems.bulkPut(nouveauxItems)
      items.value = [...items.value, ...nouveauxItems]
    }

    return snapshot
  }

  function elementsDuSnapshot(snapshotId: string): ContextSnapshotItem[] {
    return items.value.filter((item) => item.context_snapshot_id === snapshotId)
  }

  return {
    snapshots,
    items,
    enChargement,
    charger,
    assemblerSnapshot,
    elementsDuSnapshot,
  }
})
