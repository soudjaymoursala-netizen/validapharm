import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  AssociationFonctionAssetNode,
  AssociationFonctionProcess,
  FonctionActif,
  ManufacturingContext,
  Process,
  TypeProcess,
} from '../../logique-metier/domaine/types'
import { IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1 } from '../identite/identiteLocale'
import { db } from '../../persistance/db'

export interface NouveauProcessInput {
  nom: string
  description: string
  type: TypeProcess
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
 * @requirement Target Architecture §4/§5/§7
 */
export const useProcessContextStore = defineStore('processContext', () => {
  const processes = ref<Process[]>([])
  const fonctions = ref<FonctionActif[]>([])
  const associationsFonctionAssetNode = ref<AssociationFonctionAssetNode[]>([])
  const associationsFonctionProcess = ref<AssociationFonctionProcess[]>([])
  const manufacturingContexts = ref<ManufacturingContext[]>([])
  const enChargement = ref(false)

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      processes.value = await db.processes.where('client_id').equals(clientId).toArray()
      fonctions.value = await db.fonctionsActif.where('client_id').equals(clientId).toArray()
      associationsFonctionAssetNode.value = await db.associationsFonctionAssetNode
        .where('client_id')
        .equals(clientId)
        .toArray()
      associationsFonctionProcess.value = await db.associationsFonctionProcess
        .where('client_id')
        .equals(clientId)
        .toArray()
      manufacturingContexts.value = await db.manufacturingContexts
        .where('client_id')
        .equals(clientId)
        .toArray()
    } finally {
      enChargement.value = false
    }
  }

  async function creerProcess(clientId: string, input: NouveauProcessInput): Promise<Process> {
    const maintenant = new Date().toISOString()
    const process: Process = {
      id: crypto.randomUUID(),
      client_id: clientId,
      nom: input.nom,
      description: input.description,
      type: input.type,
      audit_log: [
        { timestamp: maintenant, actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1, action: 'création' },
      ],
      created_at: maintenant,
      updated_at: maintenant,
    }
    await db.processes.put(process)
    processes.value = [...processes.value, process]
    return process
  }

  async function creerFonction(
    clientId: string,
    input: NouvelleFonctionInput,
  ): Promise<FonctionActif> {
    const maintenant = new Date().toISOString()
    const fonction: FonctionActif = {
      id: crypto.randomUUID(),
      client_id: clientId,
      nom: input.nom,
      description: input.description,
      audit_log: [
        { timestamp: maintenant, actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1, action: 'création' },
      ],
      created_at: maintenant,
      updated_at: maintenant,
    }
    await db.fonctionsActif.put(fonction)
    fonctions.value = [...fonctions.value, fonction]
    return fonction
  }

  /**
   * Associe une fonction à un nœud d'actif (Equipment/System/...). N:M
   * assumé : un même `assetNodeId` peut être associé à plusieurs fonctions,
   * et une même fonction à plusieurs nœuds — aucune contrainte d'unicité,
   * idempotent (ne recrée pas l'association si elle existe déjà).
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

    const association: AssociationFonctionAssetNode = {
      id: crypto.randomUUID(),
      client_id: clientId,
      function_id: functionId,
      asset_node_id: assetNodeId,
      created_at: new Date().toISOString(),
    }
    await db.associationsFonctionAssetNode.put(association)
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

    const association: AssociationFonctionProcess = {
      id: crypto.randomUUID(),
      client_id: clientId,
      function_id: functionId,
      process_id: processId,
      created_at: new Date().toISOString(),
    }
    await db.associationsFonctionProcess.put(association)
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
    const maintenant = new Date().toISOString()
    const contexte: ManufacturingContext = {
      id: crypto.randomUUID(),
      client_id: clientId,
      asset_node_id: input.assetNodeId,
      process_id: input.processId,
      produit: input.produit,
      recette: input.recette,
      format: input.format,
      configuration: input.configuration,
      created_at: maintenant,
      updated_at: maintenant,
    }
    await db.manufacturingContexts.put(contexte)
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
