import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  ContextSnapshotItemWire,
  ContextSnapshotWire,
} from '../../connecteurs/auth/AuthApiClient'
import type { ContextSnapshot, ContextSnapshotItem } from '../../logique-metier/domaine/types'
import { contextSnapshotItemsAMigrer, contextSnapshotsAMigrer } from '../../persistance/db'
import { useAuthStore } from './useAuthStore'

export interface EntreesAssemblage {
  workspaceId?: string | null
  assetNodeId?: string | null
}

function contextSnapshotWireVersDomaine(w: ContextSnapshotWire): ContextSnapshot {
  return {
    id: w.id,
    client_id: w.clientId,
    workspace_id: w.workspaceId,
    asset_node_id: w.assetNodeId,
    created_at: w.createdAt,
  }
}

function contextSnapshotDomaineVersWire(s: ContextSnapshot): ContextSnapshotWire {
  return {
    id: s.id,
    clientId: s.client_id,
    workspaceId: s.workspace_id,
    assetNodeId: s.asset_node_id,
    createdAt: s.created_at,
  }
}

function contextSnapshotItemWireVersDomaine(w: ContextSnapshotItemWire): ContextSnapshotItem {
  return {
    id: w.id,
    client_id: w.clientId,
    context_snapshot_id: w.contextSnapshotId,
    type_objet: w.typeObjet as ContextSnapshotItem['type_objet'],
    objet_id: w.objetId,
  }
}

function contextSnapshotItemDomaineVersWire(i: ContextSnapshotItem): ContextSnapshotItemWire {
  return {
    id: i.id,
    clientId: i.client_id,
    contextSnapshotId: i.context_snapshot_id,
    typeObjet: i.type_objet,
    objetId: i.objet_id,
  }
}

/**
 * Store `ContextSnapshot` (convergence architecturale — spec
 * détaillée dans `docs/convergence/PHASE_14_CONTEXT_ENGINE_SPEC.md`).
 * Généralise la résolution Scope+Applicability+Effectivity+Override
 * (`resoudreRegleEffective`/`ancetresWorkspace`), jusqu'ici
 * câblée sur le seul store Structure Système, en une entité réutilisable
 * par toute `Mission`.
 *
 * **Migré vers le Worker/D1 (Phase 8b du chantier de migration D1)** —
 * l'assemblage (résolution des éléments de contexte pertinents,
 * anciennement `assemblerElementsContextSnapshot` côté client) est
 * désormais calculé côté serveur (route Worker
 * `gererAssemblerContextSnapshot`), à partir des mêmes dépôts D1 déjà
 * migrés (Organization/Workspace, Structure Système,
 * ManufacturingContext, QualityEvent) — jamais fait confiance à une
 * liste d'éléments fournie par le client.
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
   * Envoie au serveur les enregistrements capturés depuis les anciennes
   * tables IndexedDB locales juste avant leur suppression — n'a d'effet
   * réel qu'une seule fois (voir migration Dexie v52, `persistance/db.ts`).
   */
  async function migrerContextSnapshotsLocalVersServeur(clientId: string): Promise<void> {
    const snapshotsDuClient = contextSnapshotsAMigrer.filter((s) => s.client_id === clientId)
    const itemsDuClient = contextSnapshotItemsAMigrer.filter((i) => i.client_id === clientId)
    if (snapshotsDuClient.length === 0 && itemsDuClient.length === 0) {
      return
    }

    const { api, jeton } = await obtenirApi()
    const resultat = await api.migrerContextSnapshotsLocal(jeton, clientId, {
      contextSnapshots: snapshotsDuClient.map(contextSnapshotDomaineVersWire),
      contextSnapshotItems: itemsDuClient.map(contextSnapshotItemDomaineVersWire),
    })
    if (!resultat.ok) {
      throw new Error(`Échec de la migration ContextSnapshot : ${resultat.erreur}`)
    }
    for (const [tableau, duClient] of [
      [contextSnapshotsAMigrer, snapshotsDuClient],
      [contextSnapshotItemsAMigrer, itemsDuClient],
    ] as const) {
      for (const entree of duClient) {
        const index = (tableau as unknown[]).indexOf(entree)
        if (index !== -1) (tableau as unknown[]).splice(index, 1)
      }
    }
  }

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      try {
        await migrerContextSnapshotsLocalVersServeur(clientId)
      } catch {
        // Nouvel essai au prochain chargement — ne bloque jamais l'affichage normal.
      }
      const { api, jeton } = await obtenirApi()
      const resultat = await api.obtenirContextSnapshots(jeton, clientId)
      if (resultat.ok) {
        snapshots.value = resultat.donnees.contextSnapshots.map(contextSnapshotWireVersDomaine)
        items.value = resultat.donnees.contextSnapshotItems.map(contextSnapshotItemWireVersDomaine)
      } else {
        snapshots.value = []
        items.value = []
      }
    } catch {
      // Panne réseau réelle ou relais non configuré : jamais une exception
      // non gérée, même discipline que les autres stores de ce chantier.
      snapshots.value = []
      items.value = []
    } finally {
      enChargement.value = false
    }
  }

  /**
   * Assemble et persiste un nouveau `ContextSnapshot` — l'assemblage est
   * calculé côté serveur, puis le résultat est figé. Aucune mise à jour
   * possible ensuite : un nouveau besoin de contexte crée un nouveau
   * `ContextSnapshot`, jamais une modification de celui-ci (immutabilité,
   * invariant #12).
   */
  async function assemblerSnapshot(
    clientId: string,
    entrees: EntreesAssemblage,
  ): Promise<ContextSnapshot> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.assemblerContextSnapshot(jeton, clientId, {
      workspaceId: entrees.workspaceId ?? null,
      assetNodeId: entrees.assetNodeId ?? null,
    })
    if (!resultat.ok) {
      throw new Error(`Échec de l'assemblage du ContextSnapshot : ${resultat.erreur}`)
    }
    const snapshot = contextSnapshotWireVersDomaine(resultat.donnees.contextSnapshot)
    snapshots.value = [...snapshots.value, snapshot]

    const nouveauxItems = resultat.donnees.contextSnapshotItems.map(
      contextSnapshotItemWireVersDomaine,
    )
    if (nouveauxItems.length > 0) {
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
