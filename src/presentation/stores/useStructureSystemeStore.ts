import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  chaineTechniqueDepuis,
  type EtapeChaineTechnique,
} from '../../logique-metier/architecture-technique/chaineTechnique'
import type {
  AssetHierarchySchema,
  AssetNode,
  Langue,
  QualificationStatus,
  RelationTechnique,
  TypeRelationTechnique,
  Workspace,
} from '../../logique-metier/domaine/types'
import { noeudsVisiblesDepuisWorkspace as calculerNoeudsVisibles } from '../../logique-metier/organisation/noeudsVisiblesDepuisWorkspace'
import { introduitUnCycle } from '../../logique-metier/structure-systeme/detectionCycle'
import {
  preparerImportHierarchie,
  type ErreurLigneImportHierarchie,
} from '../../logique-metier/structure-systeme/importerHierarchieXlsx'
import { codeDejaUtilise } from '../../logique-metier/structure-systeme/validerCodeUnique'
import { extraireGrilleXlsx } from '../../connecteurs/office/XlsxNatifAdapter'
import { DocumentInvalideError } from '../../connecteurs/office/erreurs'
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

export type ResultatImportHierarchie =
  | { ok: true; noeudsCrees: number; erreurs: ErreurLigneImportHierarchie[] }
  | { ok: false; raison: 'fichier_illisible' }
  | { ok: false; raison: 'grille_vide' }
  | { ok: false; raison: 'colonne_niveau_inconnue'; entete: string }
  | { ok: false; raison: 'ordre_colonnes_incoherent'; entete: string }

export type ResultatCreationRelationTechnique =
  | { ok: true; relation: RelationTechnique }
  | { ok: false; raison: 'noeud_introuvable' }
  | { ok: false; raison: 'clients_differents' }

/**
 * Store de la Couche Présentation pour le référentiel d'actifs —
 * hiérarchie configurable + CRUD de nœuds avec
 * les deux garde-fous non négociables (absence de cycle, unicité du code
 * par client), relations techniques et statut de
 * qualification (édition manuelle uniquement). Le
 * graphe `associated_nodes[]` et le pull QMS restent hors périmètre
 * (backlog).
 */
export const useStructureSystemeStore = defineStore('structureSysteme', () => {
  const schema = ref<AssetHierarchySchema | null>(null)
  const noeuds = ref<AssetNode[]>([])
  const relationsTechniques = ref<RelationTechnique[]>([])
  const enChargement = ref(false)

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      schema.value = (await db.assetHierarchySchemas.get(clientId)) ?? {
        client_id: clientId,
        levels: [],
      }
      noeuds.value = await db.assetNodes.where('client_id').equals(clientId).toArray()
      relationsTechniques.value = await db.relationsTechniques
        .where('client_id')
        .equals(clientId)
        .toArray()
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
   * Import en lot d'une hiérarchie d'actifs depuis un classeur `.xlsx`
   * — lecture native minimale
   * (`XlsxNatifAdapter.extraireGrilleXlsx`) puis planification pure
   * (`preparerImportHierarchie`), jamais d'écriture avant validation
   * complète du plan. Écrit en un seul lot Dexie (`bulkPut`) plutôt
   * qu'un `creerNoeud` par ligne, pour ne pas laisser une hiérarchie
   * partiellement importée si une erreur survient en cours de route
   * (la planification, elle, échoue ou réussit avant toute écriture).
   */
  async function importerHierarchieDepuisXlsx(
    clientId: string,
    fichier: ArrayBuffer,
  ): Promise<ResultatImportHierarchie> {
    let grille: string[][]
    try {
      grille = (await extraireGrilleXlsx(fichier)).lignes
    } catch (erreur) {
      if (erreur instanceof DocumentInvalideError) {
        return { ok: false, raison: 'fichier_illisible' }
      }
      throw erreur
    }

    // Relus frais depuis Dexie (jamais depuis `schema.value`/`noeuds.value`,
    // des refs réactifs Vue) — même piège que `ajouterNiveau`/`creerNoeud`.
    const schemaActuel = (await db.assetHierarchySchemas.get(clientId)) ?? {
      client_id: clientId,
      levels: [],
    }
    const noeudsExistants = await db.assetNodes.where('client_id').equals(clientId).toArray()

    const resultat = preparerImportHierarchie(grille, schemaActuel, noeudsExistants)
    if (!resultat.ok) return resultat

    const maintenant = new Date().toISOString()
    const nouveauxNoeuds: AssetNode[] = resultat.plan.aCreer.map((n) => ({
      id: n.id,
      client_id: clientId,
      workspace_id: null,
      level_key: n.level_key,
      name: n.name,
      code: n.code,
      parent_id: n.parent_id,
      associated_nodes: [],
      source: 'import_fichier',
      qms_connector_id: null,
      periodic_qualification: { applicable: false, deadline: null },
      qualification_status: 'non_qualifie',
      audit_log: [
        {
          timestamp: maintenant,
          actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1,
          action: 'création (import XLSX)',
        },
      ],
      created_at: maintenant,
      updated_at: maintenant,
    }))

    if (nouveauxNoeuds.length > 0) {
      await db.assetNodes.bulkPut(nouveauxNoeuds)
      noeuds.value = [...noeuds.value, ...nouveauxNoeuds]
    }

    return { ok: true, noeudsCrees: nouveauxNoeuds.length, erreurs: resultat.plan.erreurs }
  }

  /**
   * Reparentage : revalide l'absence de cycle "avec la
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
   * Délègue à la fonction pure extraite
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

  /**
   * Relation typée et dirigée entre deux `AssetNode` —
   * garde-fou : les deux nœuds doivent exister et appartenir au même
   * client, jamais silencieusement tolérée (même discipline que
   * `creerNoeud`/`workspace_introuvable`). Aucune détection de cycle
   * (voir `chaineTechniqueDepuis`).
   */
  async function creerRelationTechnique(
    clientId: string,
    typeRelation: TypeRelationTechnique,
    noeudSourceId: string,
    noeudCibleId: string,
  ): Promise<ResultatCreationRelationTechnique> {
    const source = await db.assetNodes.get(noeudSourceId)
    const cible = await db.assetNodes.get(noeudCibleId)
    if (!source || !cible) return { ok: false, raison: 'noeud_introuvable' }
    if (source.client_id !== clientId || cible.client_id !== clientId) {
      return { ok: false, raison: 'clients_differents' }
    }

    const relation: RelationTechnique = {
      id: crypto.randomUUID(),
      client_id: clientId,
      type_relation: typeRelation,
      noeud_source_id: noeudSourceId,
      noeud_cible_id: noeudCibleId,
      created_at: new Date().toISOString(),
    }
    await db.relationsTechniques.put(relation)
    relationsTechniques.value = [...relationsTechniques.value, relation]
    return { ok: true, relation }
  }

  /** Délègue à la fonction pure `chaineTechniqueDepuis`. */
  function chaineTechniqueDepuisNoeud(noeudDepartId: string): EtapeChaineTechnique[] {
    return chaineTechniqueDepuis(noeudDepartId, relationsTechniques.value, noeuds.value)
  }

  /**
   * Modification manuelle du statut de qualification et de la
   * périodicité — jamais de transition
   * automatique fabriquée par l'outil (même discipline que partout
   * ailleurs : rien n'est déduit à la place de l'utilisateur sur une
   * donnée à impact GMP). Trouvé figé à `non_qualifie` sans aucun moyen
   * de le faire évoluer, en simulant une requalification périodique
   * réelle (31/08/2026).
   */
  async function modifierQualificationNoeud(
    noeudId: string,
    changement: {
      qualification_status: QualificationStatus
      periodic_qualification: { applicable: boolean; deadline: string | null }
    },
  ): Promise<void> {
    const noeud = await db.assetNodes.get(noeudId)
    if (!noeud) return

    const maintenant = new Date().toISOString()
    const misAJour: AssetNode = {
      ...noeud,
      qualification_status: changement.qualification_status,
      periodic_qualification: changement.periodic_qualification,
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
  }

  return {
    schema,
    noeuds,
    relationsTechniques,
    enChargement,
    charger,
    ajouterNiveau,
    creerNoeud,
    importerHierarchieDepuisXlsx,
    reparenterNoeud,
    noeudsVisiblesDepuisWorkspace,
    creerRelationTechnique,
    chaineTechniqueDepuisNoeud,
    modifierQualificationNoeud,
  }
})
