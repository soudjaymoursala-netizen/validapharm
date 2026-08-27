import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  AssetHierarchySchema,
  AssetNode,
  Langue,
  Workspace,
} from '../../logique-metier/domaine/types'
import { noeudsVisiblesDepuisWorkspace as calculerNoeudsVisibles } from '../../logique-metier/organisation/noeudsVisiblesDepuisWorkspace'
import { introduitUnCycle } from '../../logique-metier/structure-systeme/detectionCycle'
import { codeDejaUtilise } from '../../logique-metier/structure-systeme/validerCodeUnique'
import { IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1 } from '../identite/identiteLocale'
import { db } from '../../persistance/db'

export interface NouveauNiveauInput {
  key: string
  label: Record<Langue, string>
  numbering_pattern: string
}

export interface NouveauNoeudInput {
  level_key: string
  name: string
  code: string
  parent_id: string | null
  /** Câblage Workspace, étape 1 — omis ou `null` : nœud non assigné à un site précis (comportement inchangé). */
  workspace_id?: string | null
}

export type ResultatActionNoeud =
  | { ok: true }
  | { ok: false; raison: 'code_deja_utilise' }
  | { ok: false; raison: 'cycle_introduit' }
  | { ok: false; raison: 'workspace_introuvable' }

/**
 * Store de la Couche Présentation pour le référentiel d'actifs (FS §4.10,
 * URS-F-100 à 100decies) — premier incrément : hiérarchie configurable +
 * CRUD de nœuds avec les deux garde-fous non négociables (absence de
 * cycle, unicité du code par client). Le graphe `associated_nodes[]`, le
 * pull QMS, le dossier vivant et le suivi de périodicité restent hors
 * périmètre (backlog).
 *
 * @requirement URS-F-100, URS-F-100bis, URS-F-100ter, URS-F-100nonies
 */
export const useStructureSystemeStore = defineStore('structureSysteme', () => {
  const schema = ref<AssetHierarchySchema | null>(null)
  const noeuds = ref<AssetNode[]>([])
  const enChargement = ref(false)

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      schema.value = (await db.assetHierarchySchemas.get(clientId)) ?? {
        client_id: clientId,
        levels: [],
      }
      noeuds.value = await db.assetNodes.where('client_id').equals(clientId).toArray()
    } finally {
      enChargement.value = false
    }
  }

  async function ajouterNiveau(clientId: string, niveau: NouveauNiveauInput): Promise<void> {
    // Relu frais depuis Dexie (jamais depuis `schema.value`, un ref
    // réactif Vue) — même piège que `reparenterNoeud` : un objet lu
    // depuis l'état réactif Pinia fait échouer le clonage structuré
    // d'IndexedDB dès le deuxième appel.
    const actuel = (await db.assetHierarchySchemas.get(clientId)) ?? {
      client_id: clientId,
      levels: [],
    }
    const misAJour: AssetHierarchySchema = { ...actuel, levels: [...actuel.levels, niveau] }
    await db.assetHierarchySchemas.put(misAJour)
    schema.value = misAJour
  }

  async function creerNoeud(
    clientId: string,
    input: NouveauNoeudInput,
  ): Promise<ResultatActionNoeud> {
    if (codeDejaUtilise(noeuds.value, input.code, null)) {
      return { ok: false, raison: 'code_deja_utilise' }
    }
    const workspaceId = input.workspace_id ?? null
    if (workspaceId !== null) {
      const workspace = await db.workspaces.get(workspaceId)
      if (!workspace || workspace.organization_id !== clientId) {
        return { ok: false, raison: 'workspace_introuvable' }
      }
    }
    // Pas de vérification de cycle à la création : un nœud neuf reçoit un
    // id inédit, qu'aucun nœud existant ne peut déjà avoir comme parent —
    // un cycle est structurellement impossible ici. Seul le reparentage
    // d'un nœud existant (`reparenterNoeud`) peut en introduire un.

    const maintenant = new Date().toISOString()
    const noeud: AssetNode = {
      id: crypto.randomUUID(),
      client_id: clientId,
      workspace_id: workspaceId,
      level_key: input.level_key,
      name: input.name,
      code: input.code,
      parent_id: input.parent_id,
      associated_nodes: [],
      source: 'manuel',
      qms_connector_id: null,
      periodic_qualification: { applicable: false, deadline: null },
      qualification_status: 'non_qualifie',
      audit_log: [
        { timestamp: maintenant, actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1, action: 'création' },
      ],
      created_at: maintenant,
      updated_at: maintenant,
    }
    await db.assetNodes.put(noeud)
    noeuds.value = [...noeuds.value, noeud]
    return { ok: true }
  }

  /**
   * Reparentage (URS-F-100octies) : revalide l'absence de cycle "avec la
   * même rigueur qu'à la création", jamais silencieux (journalisé).
   */
  async function reparenterNoeud(
    noeudId: string,
    nouveauParentId: string | null,
  ): Promise<ResultatActionNoeud> {
    if (introduitUnCycle(noeuds.value, noeudId, nouveauParentId)) {
      return { ok: false, raison: 'cycle_introduit' }
    }
    // Relu frais depuis Dexie (jamais depuis `noeuds.value`, un tableau
    // réactif Vue) — écrire un objet issu d'un ref réactif directement
    // dans IndexedDB fait échouer le clonage structuré des navigateurs.
    const noeud = await db.assetNodes.get(noeudId)
    if (!noeud) return { ok: true }

    const maintenant = new Date().toISOString()
    const misAJour: AssetNode = {
      ...noeud,
      parent_id: nouveauParentId,
      updated_at: maintenant,
      audit_log: [
        ...noeud.audit_log,
        {
          timestamp: maintenant,
          actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1,
          action: 'modification',
        },
      ],
    }
    await db.assetNodes.put(misAJour)
    noeuds.value = noeuds.value.map((n) => (n.id === noeudId ? misAJour : n))
    return { ok: true }
  }

  /**
   * Câblage Workspace, étape 1 (`CABLAGE_ETAPE_1_STRUCTURE_SYSTEME_SPEC.md`
   * §E1/E7) : un nœud est visible depuis `workspaceId` s'il y est assigné,
   * s'il est assigné à l'un de ses ancêtres (héritage descendant), ou s'il
   * n'a pas encore été assigné (`workspace_id: null`, non-régression).
   *
   * Délègue à la fonction pure extraite en Phase 14
   * (`logique-metier/organisation/noeudsVisiblesDepuisWorkspace.ts`),
   * réutilisée par l'assemblage de `ContextSnapshot` sans dupliquer la
   * logique — signature et comportement inchangés pour ce store.
   */
  function noeudsVisiblesDepuisWorkspace(
    workspaceId: string,
    arbre: ReadonlyMap<string, Pick<Workspace, 'id' | 'parent_workspace_id'>>,
  ): AssetNode[] {
    return calculerNoeudsVisibles(workspaceId, arbre, noeuds.value)
  }

  return {
    schema,
    noeuds,
    enChargement,
    charger,
    ajouterNiveau,
    creerNoeud,
    reparenterNoeud,
    noeudsVisiblesDepuisWorkspace,
  }
})
