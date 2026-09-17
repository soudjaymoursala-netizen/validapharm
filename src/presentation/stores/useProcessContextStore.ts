import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  AssociationFonctionAssetNodeWire,
  AssociationFonctionProcessWire,
  FonctionActifWire,
  ManufacturingContextWire,
  ProcessWire,
} from '../../connecteurs/auth/AuthApiClient'
import type {
  AssociationFonctionAssetNode,
  AssociationFonctionProcess,
  FonctionActif,
  ManufacturingContext,
  Process,
  TypeProcess,
} from '../../logique-metier/domaine/types'
import {
  processesAMigrer,
  fonctionsActifAMigrer,
  associationsFonctionAssetNodeAMigrer,
  associationsFonctionProcessAMigrer,
  manufacturingContextsAMigrer,
} from '../../persistance/db'
import { useAuthStore } from './useAuthStore'

export function processWireVersDomaine(wire: ProcessWire): Process {
  return {
    id: wire.id,
    client_id: wire.clientId,
    nom: wire.nom,
    description: wire.description,
    type: wire.type as TypeProcess,
    source_id: wire.sourceId,
    audit_log: wire.auditLog,
    created_at: wire.createdAt,
    updated_at: wire.updatedAt,
  }
}

export function fonctionWireVersDomaine(wire: FonctionActifWire): FonctionActif {
  return {
    id: wire.id,
    client_id: wire.clientId,
    nom: wire.nom,
    description: wire.description,
    audit_log: wire.auditLog,
    created_at: wire.createdAt,
    updated_at: wire.updatedAt,
  }
}

export function associationFonctionAssetNodeWireVersDomaine(
  wire: AssociationFonctionAssetNodeWire,
): AssociationFonctionAssetNode {
  return {
    id: wire.id,
    client_id: wire.clientId,
    function_id: wire.functionId,
    asset_node_id: wire.assetNodeId,
    created_at: wire.createdAt,
  }
}

export function associationFonctionProcessWireVersDomaine(
  wire: AssociationFonctionProcessWire,
): AssociationFonctionProcess {
  return {
    id: wire.id,
    client_id: wire.clientId,
    function_id: wire.functionId,
    process_id: wire.processId,
    created_at: wire.createdAt,
  }
}

export function manufacturingContextWireVersDomaine(
  wire: ManufacturingContextWire,
): ManufacturingContext {
  return {
    id: wire.id,
    client_id: wire.clientId,
    asset_node_id: wire.assetNodeId,
    process_id: wire.processId,
    produit: wire.produit,
    recette: wire.recette,
    format: wire.format,
    configuration: wire.configuration,
    created_at: wire.createdAt,
    updated_at: wire.updatedAt,
  }
}

function processDomaineVersWire(p: Process): ProcessWire {
  return {
    id: p.id,
    clientId: p.client_id,
    nom: p.nom,
    description: p.description,
    type: p.type,
    sourceId: p.source_id,
    auditLog: p.audit_log,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }
}

function fonctionDomaineVersWire(f: FonctionActif): FonctionActifWire {
  return {
    id: f.id,
    clientId: f.client_id,
    nom: f.nom,
    description: f.description,
    auditLog: f.audit_log,
    createdAt: f.created_at,
    updatedAt: f.updated_at,
  }
}

function associationFonctionAssetNodeDomaineVersWire(
  a: AssociationFonctionAssetNode,
): AssociationFonctionAssetNodeWire {
  return {
    id: a.id,
    clientId: a.client_id,
    functionId: a.function_id,
    assetNodeId: a.asset_node_id,
    createdAt: a.created_at,
  }
}

function associationFonctionProcessDomaineVersWire(
  a: AssociationFonctionProcess,
): AssociationFonctionProcessWire {
  return {
    id: a.id,
    clientId: a.client_id,
    functionId: a.function_id,
    processId: a.process_id,
    createdAt: a.created_at,
  }
}

function manufacturingContextDomaineVersWire(c: ManufacturingContext): ManufacturingContextWire {
  return {
    id: c.id,
    clientId: c.client_id,
    assetNodeId: c.asset_node_id,
    processId: c.process_id,
    produit: c.produit,
    recette: c.recette,
    format: c.format,
    configuration: c.configuration,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }
}

export interface NouveauProcessInput {
  nom: string
  description: string
  type: TypeProcess
  /** Provenance documentaire — voir `Process.source_id`. `null`/omis pour une saisie directe. */
  sourceId?: string | null
}

export interface NouvelleFonctionInput {
  nom: string
  description: string
}

export interface NouveauManufacturingContextInput {
  assetNodeId: string
  processId: string
  produit: string
  recette: string | null
  format: string | null
  configuration: string | null
}

/**
 * Store `Process`/`FonctionActif`/`ManufacturingContext` (convergence
 * architecturale, `docs/convergence/CONVERGENCE_PLAN.md`).
 * EXTEND pur : `AssetNode` et sa hiérarchie (Structure Système, §4.10) ne
 * sont jamais mutés ici, seulement référencés par id.
 *
 * **Phase 5a du chantier de migration D1**
 * (docs/CHANTIER-MIGRATION-D1-RECAP.md) : Cloudflare D1 devient la source
 * de vérité — mêmes routes authentifiées scopées par client que les
 * autres domaines de ce chantier, le dédoublonnage client-side d'une
 * association déjà chargée reste entièrement côté client.
 *
 * @requirement Target Architecture §4/§5/§7
 */
export const useProcessContextStore = defineStore('processContext', () => {
  const processes = ref<Process[]>([])
  const fonctions = ref<FonctionActif[]>([])
  const associationsFonctionAssetNode = ref<AssociationFonctionAssetNode[]>([])
  const associationsFonctionProcess = ref<AssociationFonctionProcess[]>([])
  const manufacturingContexts = ref<ManufacturingContext[]>([])
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
   * réel qu'une seule fois (voir migration Dexie v43, `persistance/db.ts`).
   * Filtre par client avant envoi, même patron que les autres domaines de
   * ce chantier.
   */
  async function migrerProcessContextLocalVersServeur(clientId: string): Promise<void> {
    const processesDuClient = processesAMigrer.filter((p) => p.client_id === clientId)
    const fonctionsDuClient = fonctionsActifAMigrer.filter((f) => f.client_id === clientId)
    const associationsFonctionAssetNodeDuClient = associationsFonctionAssetNodeAMigrer.filter(
      (a) => a.client_id === clientId,
    )
    const associationsFonctionProcessDuClient = associationsFonctionProcessAMigrer.filter(
      (a) => a.client_id === clientId,
    )
    const manufacturingContextsDuClient = manufacturingContextsAMigrer.filter(
      (c) => c.client_id === clientId,
    )
    if (
      processesDuClient.length === 0 &&
      fonctionsDuClient.length === 0 &&
      associationsFonctionAssetNodeDuClient.length === 0 &&
      associationsFonctionProcessDuClient.length === 0 &&
      manufacturingContextsDuClient.length === 0
    ) {
      return
    }

    const { api, jeton } = await obtenirApi()
    const resultat = await api.migrerProcessContextLocal(jeton, clientId, {
      processes: processesDuClient.map(processDomaineVersWire),
      fonctions: fonctionsDuClient.map(fonctionDomaineVersWire),
      associationsFonctionAssetNode: associationsFonctionAssetNodeDuClient.map(
        associationFonctionAssetNodeDomaineVersWire,
      ),
      associationsFonctionProcess: associationsFonctionProcessDuClient.map(
        associationFonctionProcessDomaineVersWire,
      ),
      manufacturingContexts: manufacturingContextsDuClient.map(manufacturingContextDomaineVersWire),
    })
    if (!resultat.ok) {
      throw new Error(`Échec de la migration Process/FonctionActif : ${resultat.erreur}`)
    }
    for (const p of processesDuClient) {
      const index = processesAMigrer.indexOf(p)
      if (index !== -1) processesAMigrer.splice(index, 1)
    }
    for (const f of fonctionsDuClient) {
      const index = fonctionsActifAMigrer.indexOf(f)
      if (index !== -1) fonctionsActifAMigrer.splice(index, 1)
    }
    for (const a of associationsFonctionAssetNodeDuClient) {
      const index = associationsFonctionAssetNodeAMigrer.indexOf(a)
      if (index !== -1) associationsFonctionAssetNodeAMigrer.splice(index, 1)
    }
    for (const a of associationsFonctionProcessDuClient) {
      const index = associationsFonctionProcessAMigrer.indexOf(a)
      if (index !== -1) associationsFonctionProcessAMigrer.splice(index, 1)
    }
    for (const c of manufacturingContextsDuClient) {
      const index = manufacturingContextsAMigrer.indexOf(c)
      if (index !== -1) manufacturingContextsAMigrer.splice(index, 1)
    }
  }

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      try {
        await migrerProcessContextLocalVersServeur(clientId)
      } catch {
        // Nouvel essai au prochain chargement — ne bloque jamais l'affichage normal.
      }
      const { api, jeton } = await obtenirApi()
      const resultat = await api.obtenirProcessContext(jeton, clientId)
      if (resultat.ok) {
        processes.value = resultat.donnees.processes.map(processWireVersDomaine)
        fonctions.value = resultat.donnees.fonctions.map(fonctionWireVersDomaine)
        associationsFonctionAssetNode.value = resultat.donnees.associationsFonctionAssetNode.map(
          associationFonctionAssetNodeWireVersDomaine,
        )
        associationsFonctionProcess.value = resultat.donnees.associationsFonctionProcess.map(
          associationFonctionProcessWireVersDomaine,
        )
        manufacturingContexts.value = resultat.donnees.manufacturingContexts.map(
          manufacturingContextWireVersDomaine,
        )
      } else {
        processes.value = []
        fonctions.value = []
        associationsFonctionAssetNode.value = []
        associationsFonctionProcess.value = []
        manufacturingContexts.value = []
      }
    } catch {
      // Panne réseau réelle ou relais non configuré : jamais une exception
      // non gérée, même discipline que les autres stores de ce chantier.
      processes.value = []
      fonctions.value = []
      associationsFonctionAssetNode.value = []
      associationsFonctionProcess.value = []
      manufacturingContexts.value = []
    } finally {
      enChargement.value = false
    }
  }

  async function creerProcess(clientId: string, input: NouveauProcessInput): Promise<Process> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerProcess(jeton, clientId, {
      nom: input.nom,
      description: input.description,
      type: input.type,
      sourceId: input.sourceId ?? null,
    })
    if (!resultat.ok) {
      throw new Error(`Échec de la création du process : ${resultat.erreur}`)
    }
    const process = processWireVersDomaine(resultat.donnees.process)
    processes.value = [...processes.value, process]
    return process
  }

  async function creerFonction(
    clientId: string,
    input: NouvelleFonctionInput,
  ): Promise<FonctionActif> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerFonction(jeton, clientId, {
      nom: input.nom,
      description: input.description,
    })
    if (!resultat.ok) {
      throw new Error(`Échec de la création de la fonction : ${resultat.erreur}`)
    }
    const fonction = fonctionWireVersDomaine(resultat.donnees.fonction)
    fonctions.value = [...fonctions.value, fonction]
    return fonction
  }

  /**
   * Associe une fonction à un nœud d'actif (Equipment/System/...). N:M
   * assumé : un même `assetNodeId` peut être associé à plusieurs fonctions,
   * et une même fonction à plusieurs nœuds — aucune contrainte d'unicité,
   * idempotent côté client (ne recrée pas l'association si elle existe déjà
   * dans l'état déjà chargé).
   */
  async function associerFonctionAAssetNode(
    clientId: string,
    functionId: string,
    assetNodeId: string,
  ): Promise<AssociationFonctionAssetNode> {
    const existante = associationsFonctionAssetNode.value.find(
      (a) => a.function_id === functionId && a.asset_node_id === assetNodeId,
    )
    if (existante) return existante

    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerAssociationFonctionAssetNode(jeton, clientId, {
      functionId,
      assetNodeId,
    })
    if (!resultat.ok) {
      throw new Error(`Échec de l'association fonction/nœud d'actif : ${resultat.erreur}`)
    }
    const association = associationFonctionAssetNodeWireVersDomaine(
      resultat.donnees.associationFonctionAssetNode,
    )
    associationsFonctionAssetNode.value = [...associationsFonctionAssetNode.value, association]
    return association
  }

  async function associerFonctionAProcess(
    clientId: string,
    functionId: string,
    processId: string,
  ): Promise<AssociationFonctionProcess> {
    const existante = associationsFonctionProcess.value.find(
      (a) => a.function_id === functionId && a.process_id === processId,
    )
    if (existante) return existante

    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerAssociationFonctionProcess(jeton, clientId, {
      functionId,
      processId,
    })
    if (!resultat.ok) {
      throw new Error(`Échec de l'association fonction/process : ${resultat.erreur}`)
    }
    const association = associationFonctionProcessWireVersDomaine(
      resultat.donnees.associationFonctionProcess,
    )
    associationsFonctionProcess.value = [...associationsFonctionProcess.value, association]
    return association
  }

  /**
   * Un même `asset_node_id` peut apparaître dans plusieurs
   * `ManufacturingContext` (Equipment multi-process, SCADA multi-process,
   * multi-produit/recette/format — scénarios obligatoires §11_USE_CASES) :
   * aucune contrainte d'unicité ici, chaque appel crée un contexte
   * indépendant, jamais une relation déduite comme universelle.
   */
  async function creerManufacturingContext(
    clientId: string,
    input: NouveauManufacturingContextInput,
  ): Promise<ManufacturingContext> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerManufacturingContext(jeton, clientId, {
      assetNodeId: input.assetNodeId,
      processId: input.processId,
      produit: input.produit,
      recette: input.recette,
      format: input.format,
      configuration: input.configuration,
    })
    if (!resultat.ok) {
      throw new Error(`Échec de la création du contexte de fabrication : ${resultat.erreur}`)
    }
    const contexte = manufacturingContextWireVersDomaine(resultat.donnees.manufacturingContext)
    manufacturingContexts.value = [...manufacturingContexts.value, contexte]
    return contexte
  }

  function contextesPourAssetNode(assetNodeId: string): ManufacturingContext[] {
    return manufacturingContexts.value.filter((c) => c.asset_node_id === assetNodeId)
  }

  return {
    processes,
    fonctions,
    associationsFonctionAssetNode,
    associationsFonctionProcess,
    manufacturingContexts,
    enChargement,
    charger,
    creerProcess,
    creerFonction,
    associerFonctionAAssetNode,
    associerFonctionAProcess,
    creerManufacturingContext,
    contextesPourAssetNode,
  }
})
