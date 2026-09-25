import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  AssetHierarchySchemaWire,
  AssetNodeWire,
  NiveauHierarchieWire,
  RelationTechniqueWire,
  SaisieCreationNoeudWire,
} from '../../connecteurs/auth/AuthApiClient'
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
import {
  preparerImportHierarchieSap,
  type ErreurLigneImportHierarchieSap,
} from '../../logique-metier/structure-systeme/importerHierarchieSapXlsx'
import { codeDejaUtilise } from '../../logique-metier/structure-systeme/validerCodeUnique'
import { extraireGrilleHtmlSap } from '../../connecteurs/office/HtmlSapAdapter'
import { extraireGrilleXlsx } from '../../connecteurs/office/XlsxNatifAdapter'
import { DocumentInvalideError } from '../../connecteurs/office/erreurs'
import {
  assetHierarchySchemasAMigrer,
  assetNodesAMigrer,
  relationsTechniquesAMigrer,
} from '../../persistance/db'
import { useAuthStore } from './useAuthStore'

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

export type ResultatAjoutNiveau = { ok: true } | { ok: false; raison: 'cle_deja_utilisee' }

export type ResultatModificationNiveau =
  | { ok: true }
  | { ok: false; raison: 'niveau_introuvable' }
  | { ok: false; raison: 'cle_deja_utilisee' }
  | { ok: false; raison: 'niveau_utilise_par_des_noeuds' }

export type ResultatSuppressionNiveau =
  { ok: true } | { ok: false; raison: 'niveau_utilise_par_des_noeuds' }

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

export type ResultatImportHierarchieSap =
  | { ok: true; noeudsCrees: number; erreurs: ErreurLigneImportHierarchieSap[] }
  | { ok: false; raison: 'fichier_illisible' }
  | { ok: false; raison: 'grille_vide' }
  | {
      ok: false
      raison: 'profondeur_insuffisante'
      profondeurRequise: number
      profondeurConfiguree: number
    }

export type ResultatCreationRelationTechnique =
  | { ok: true; relation: RelationTechnique }
  | { ok: false; raison: 'noeud_introuvable' }
  | { ok: false; raison: 'clients_differents' }

function schemaWireVersDomaine(wire: AssetHierarchySchemaWire): AssetHierarchySchema {
  return {
    client_id: wire.clientId,
    levels: wire.levels.map((l) => ({
      key: l.key,
      label: l.label,
      numbering_pattern: l.numberingPattern,
    })),
  }
}

function niveauDomaineVersWire(
  niveau: AssetHierarchySchema['levels'][number],
): NiveauHierarchieWire {
  return { key: niveau.key, label: niveau.label, numberingPattern: niveau.numbering_pattern }
}

function noeudWireVersDomaine(wire: AssetNodeWire): AssetNode {
  return {
    id: wire.id,
    client_id: wire.clientId,
    workspace_id: wire.workspaceId,
    level_key: wire.levelKey,
    name: wire.name,
    code: wire.code,
    parent_id: wire.parentId,
    associated_nodes: wire.associatedNodes,
    source: wire.source,
    qms_connector_id: wire.qmsConnectorId,
    periodic_qualification: wire.periodicQualification,
    qualification_status: wire.qualificationStatus as QualificationStatus,
    audit_log: wire.auditLog,
    created_at: wire.createdAt,
    updated_at: wire.updatedAt,
  }
}

/** Réservé au filet de sécurité de migration locale (`migrerStructureSystemeLocaleVersServeur`) — préserve tous les champs, y compris le statut de qualification/périodicité/journal d'audit/horodatages d'origine, jamais fabriqués. */
function noeudDomaineVersWireComplet(n: AssetNode): Omit<AssetNodeWire, 'clientId'> {
  return {
    id: n.id,
    workspaceId: n.workspace_id,
    levelKey: n.level_key,
    name: n.name,
    code: n.code,
    parentId: n.parent_id,
    associatedNodes: n.associated_nodes,
    source: n.source,
    qmsConnectorId: n.qms_connector_id,
    periodicQualification: n.periodic_qualification,
    qualificationStatus: n.qualification_status,
    auditLog: n.audit_log,
    createdAt: n.created_at,
    updatedAt: n.updated_at,
  }
}

function relationWireVersDomaine(wire: RelationTechniqueWire): RelationTechnique {
  return {
    id: wire.id,
    client_id: wire.clientId,
    type_relation: wire.typeRelation as TypeRelationTechnique,
    noeud_source_id: wire.noeudSourceId,
    noeud_cible_id: wire.noeudCibleId,
    created_at: wire.createdAt,
  }
}

/**
 * Store de la Couche Présentation pour le référentiel d'actifs —
 * hiérarchie configurable + CRUD de nœuds avec
 * les deux garde-fous non négociables (absence de cycle, unicité du code
 * par client), relations techniques et statut de
 * qualification (édition manuelle uniquement). Le
 * graphe `associated_nodes[]` et le pull QMS restent hors périmètre
 * (backlog).
 *
 * **Phase 1 du chantier de migration D1** (docs/CHANTIER-MIGRATION-D1-RECAP.md,
 * 14/09/2026) : Cloudflare D1 devient la source de vérité (Worker
 * `auth-worker`, routes `/clients/:clientId/structure-systeme/...`) —
 * disponible depuis n'importe quel appareil, contrairement à l'ancien
 * stockage IndexedDB seul. La logique métier (unicité de code, absence de
 * cycle, un niveau référencé par un nœud ne peut être ni renommé ni
 * supprimé) reste ici, déjà testée — le Worker ne fait que persister
 * l'état validé. La vérification qu'un `workspace_id` fourni existe bien
 * passe par l'API Organization/Workspace (Phase 2 du même chantier,
 * `/clients/:clientId/organisation`).
 */
export const useStructureSystemeStore = defineStore('structureSysteme', () => {
  const schema = ref<AssetHierarchySchema | null>(null)
  const noeuds = ref<AssetNode[]>([])
  const relationsTechniques = ref<RelationTechnique[]>([])
  const enChargement = ref(false)

  async function obtenirApi() {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) {
      throw new Error("Relais d'authentification non configuré (Configuration client).")
    }
    return { api, jeton: authStore.jeton }
  }

  /**
   * Envoie au serveur la Structure Système capturée depuis les anciennes
   * tables IndexedDB locales (`db.assetHierarchySchemasAMigrer`/
   * `assetNodesAMigrer`/`relationsTechniquesAMigrer`) juste avant leur
   * suppression — n'a d'effet réel qu'une seule fois, sur le premier
   * navigateur qui ouvre l'application avec ce code (voir migration Dexie
   * v34, `persistance/db.ts`) : sans ce filet, une hiérarchie déjà
   * configurée localement (statuts de qualification inclus) serait perdue
   * définitivement. Ne retire chaque élément de la file qu'après succès,
   * pour réessayer automatiquement au prochain chargement en cas d'échec
   * réseau — jamais de retrait optimiste avant confirmation serveur.
   */
  async function migrerStructureSystemeLocaleVersServeur(clientId: string): Promise<void> {
    const indexSchema = assetHierarchySchemasAMigrer.findIndex((s) => s.client_id === clientId)
    if (indexSchema !== -1) {
      const schemaLocal = assetHierarchySchemasAMigrer[indexSchema] as AssetHierarchySchema
      await enregistrerSchema(clientId, schemaLocal.levels)
      assetHierarchySchemasAMigrer.splice(indexSchema, 1)
    }

    const noeudsClient = assetNodesAMigrer.filter((n) => n.client_id === clientId)
    if (noeudsClient.length > 0) {
      const { api, jeton } = await obtenirApi()
      const resultat = await api.migrerNoeudsLocaux(
        jeton,
        clientId,
        noeudsClient.map(noeudDomaineVersWireComplet),
      )
      if (!resultat.ok) throw new Error(`Échec de la migration des nœuds : ${resultat.erreur}`)
      for (const n of noeudsClient) {
        const index = assetNodesAMigrer.findIndex((x) => x.id === n.id)
        if (index !== -1) assetNodesAMigrer.splice(index, 1)
      }
    }

    const relationsClient = relationsTechniquesAMigrer.filter((r) => r.client_id === clientId)
    for (const r of relationsClient) {
      const { api, jeton } = await obtenirApi()
      const ecriture = await api.creerRelationTechnique(jeton, clientId, {
        typeRelation: r.type_relation,
        noeudSourceId: r.noeud_source_id,
        noeudCibleId: r.noeud_cible_id,
      })
      // Même discipline que les nœuds ci-dessus : jamais retirer une
      // relation de la file de migration sans écriture confirmée.
      if (!ecriture.ok) {
        throw new Error(`Échec de la migration des relations techniques : ${ecriture.erreur}`)
      }
      const index = relationsTechniquesAMigrer.findIndex((x) => x.id === r.id)
      if (index !== -1) relationsTechniquesAMigrer.splice(index, 1)
    }
  }

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      const authStore = useAuthStore()
      const api = await authStore.client()
      if (!api || !authStore.jeton) {
        schema.value = { client_id: clientId, levels: [] }
        noeuds.value = []
        relationsTechniques.value = []
        return
      }
      try {
        await migrerStructureSystemeLocaleVersServeur(clientId)
      } catch {
        // Nouvel essai au prochain chargement — ne bloque jamais l'affichage normal.
      }
      // Même discipline que `useClientsStore.obtenirClient` : un Worker
      // injoignable (panne réseau) ne doit jamais faire planter le
      // chargement d'un écran avec une exception non gérée — juste un état
      // vide, réessayé au prochain `charger()`.
      try {
        const resultat = await api.obtenirStructureSysteme(authStore.jeton, clientId)
        if (!resultat.ok) {
          schema.value = { client_id: clientId, levels: [] }
          noeuds.value = []
          relationsTechniques.value = []
          return
        }
        schema.value = schemaWireVersDomaine(resultat.donnees.schema)
        noeuds.value = resultat.donnees.noeuds.map(noeudWireVersDomaine)
        relationsTechniques.value =
          resultat.donnees.relationsTechniques.map(relationWireVersDomaine)
      } catch {
        schema.value = { client_id: clientId, levels: [] }
        noeuds.value = []
        relationsTechniques.value = []
      }
    } finally {
      enChargement.value = false
    }
  }

  /** Relit toujours le schéma frais depuis le serveur avant modification — jamais depuis `schema.value` (un ref réactif Vue pourrait être obsolète face à une autre session/onglet). */
  async function schemaActuelFrais(clientId: string): Promise<AssetHierarchySchema> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.obtenirStructureSysteme(jeton, clientId)
    return resultat.ok
      ? schemaWireVersDomaine(resultat.donnees.schema)
      : { client_id: clientId, levels: [] }
  }

  async function enregistrerSchema(
    clientId: string,
    niveaux: AssetHierarchySchema['levels'],
  ): Promise<AssetHierarchySchema> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.enregistrerSchemaHierarchie(
      jeton,
      clientId,
      niveaux.map(niveauDomaineVersWire),
    )
    if (!resultat.ok) throw new Error(`Échec de l'enregistrement : ${resultat.erreur}`)
    return schemaWireVersDomaine(resultat.donnees.schema)
  }

  /**
   * Refuse une clé déjà utilisée par un autre niveau — même discipline que
   * `modifierNiveau`, qui la garantit déjà à la correction ; sans ce
   * contrôle à la création, deux niveaux identiques dans `<select>` (menu
   * « Niveau » du formulaire nœud) deviennent indiscernables l'un de
   * l'autre pour l'utilisateur comme pour le référencement `level_key`.
   */
  async function ajouterNiveau(
    clientId: string,
    niveau: NouveauNiveauInput,
  ): Promise<ResultatAjoutNiveau> {
    const actuel = await schemaActuelFrais(clientId)
    if (actuel.levels.some((n) => n.key === niveau.key)) {
      return { ok: false, raison: 'cle_deja_utilisee' }
    }
    const misAJour = await enregistrerSchema(clientId, [...actuel.levels, niveau])
    schema.value = misAJour
    return { ok: true }
  }

  /**
   * Corrige un niveau déjà créé (erreur de saisie : clé, libellé ou motif
   * de numérotation) — la clé n'est modifiable que si aucun nœud existant
   * ne la référence déjà (`level_key`), pour ne jamais faire pointer un
   * nœud vers un niveau qui a changé de sens sous ses pieds.
   */
  async function modifierNiveau(
    clientId: string,
    cleActuelle: string,
    changements: { key?: string; libelleFr?: string; numbering_pattern?: string },
  ): Promise<ResultatModificationNiveau> {
    const actuel = await schemaActuelFrais(clientId)
    const index = actuel.levels.findIndex((n) => n.key === cleActuelle)
    if (index === -1) return { ok: false, raison: 'niveau_introuvable' }
    const niveauActuel = actuel.levels[index] as AssetHierarchySchema['levels'][number]

    const nouvelleCle = changements.key?.trim()
    if (nouvelleCle && nouvelleCle !== cleActuelle) {
      if (actuel.levels.some((n) => n.key === nouvelleCle)) {
        return { ok: false, raison: 'cle_deja_utilisee' }
      }
      if (noeuds.value.some((n) => n.level_key === cleActuelle)) {
        return { ok: false, raison: 'niveau_utilise_par_des_noeuds' }
      }
    }

    const levels = [...actuel.levels]
    levels[index] = {
      key: nouvelleCle || cleActuelle,
      label:
        changements.libelleFr !== undefined
          ? { fr: changements.libelleFr, en: changements.libelleFr, de: changements.libelleFr }
          : niveauActuel.label,
      numbering_pattern: changements.numbering_pattern ?? niveauActuel.numbering_pattern,
    }
    schema.value = await enregistrerSchema(clientId, levels)
    return { ok: true }
  }

  /** Retire un niveau créé par erreur — refusé si des nœuds existants le référencent déjà (jamais d'orphelins silencieux). */
  async function supprimerNiveau(
    clientId: string,
    key: string,
  ): Promise<ResultatSuppressionNiveau> {
    if (noeuds.value.some((n) => n.level_key === key)) {
      return { ok: false, raison: 'niveau_utilise_par_des_noeuds' }
    }
    const actuel = await schemaActuelFrais(clientId)
    schema.value = await enregistrerSchema(
      clientId,
      actuel.levels.filter((n) => n.key !== key),
    )
    return { ok: true }
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
      // Organization/Workspace migrés vers le Worker/D1 (Phase 2 du chantier
      // de migration D1) — un workspace retourné par cet appel scopé au
      // client appartient forcément à ce client, aucune vérification
      // `organization_id` séparée n'est donc nécessaire ici.
      const { api, jeton } = await obtenirApi()
      const resultatOrganisation = await api.obtenirOrganisation(jeton, clientId)
      const workspace = resultatOrganisation.ok
        ? resultatOrganisation.donnees.workspaces.find((w) => w.id === workspaceId)
        : undefined
      if (!workspace) {
        return { ok: false, raison: 'workspace_introuvable' }
      }
    }
    // Pas de vérification de cycle à la création : un nœud neuf reçoit un
    // id inédit (généré côté serveur), qu'aucun nœud existant ne peut déjà
    // avoir comme parent — un cycle est structurellement impossible ici.
    // Seul le reparentage d'un nœud existant (`reparenterNoeud`) peut en
    // introduire un.

    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerNoeud(jeton, clientId, {
      levelKey: input.level_key,
      name: input.name,
      code: input.code,
      parentId: input.parent_id,
      workspaceId,
    })
    if (!resultat.ok) throw new Error(`Échec de la création du nœud : ${resultat.erreur}`)
    const noeud = noeudWireVersDomaine(resultat.donnees.noeud)
    noeuds.value = [...noeuds.value, noeud]
    return { ok: true }
  }

  /**
   * Import en lot d'une hiérarchie d'actifs depuis un classeur `.xlsx`
   * — lecture native minimale
   * (`XlsxNatifAdapter.extraireGrilleXlsx`) puis planification pure
   * (`preparerImportHierarchie`), jamais d'écriture avant validation
   * complète du plan. Écrit en un seul appel serveur (`creerNoeudsEnLot`)
   * plutôt qu'un `creerNoeud` par ligne, pour ne pas laisser une hiérarchie
   * partiellement importée si une erreur survient en cours de route
   * (la planification, elle, échoue ou réussit avant tout appel réseau).
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

    const schemaActuel = await schemaActuelFrais(clientId)
    const { api, jeton } = await obtenirApi()
    const listeActuelle = await api.obtenirStructureSysteme(jeton, clientId)
    const noeudsExistants = listeActuelle.ok
      ? listeActuelle.donnees.noeuds.map(noeudWireVersDomaine)
      : noeuds.value

    const resultat = preparerImportHierarchie(grille, schemaActuel, noeudsExistants)
    if (!resultat.ok) return resultat

    const nouveauxNoeuds = await ecrireNoeudsPlanifies(
      clientId,
      resultat.plan.aCreer,
      'création (import XLSX)',
    )
    return { ok: true, noeudsCrees: nouveauxNoeuds.length, erreurs: resultat.plan.erreurs }
  }

  /**
   * Import en lot d'une hiérarchie d'actifs depuis un export SAP (rapport
   * ALV arborescent téléchargé « vers feuille de calcul », profondeur
   * variable selon les branches) — voir la documentation de
   * `preparerImportHierarchieSap` pour la convention réelle reconnue.
   * Même discipline que `importerHierarchieDepuisXlsx` : planification
   * pure puis écriture en un seul appel serveur.
   */
  async function importerHierarchieSapDepuisXlsx(
    clientId: string,
    fichier: ArrayBuffer,
  ): Promise<ResultatImportHierarchieSap> {
    let grille: string[][]
    try {
      grille = (await extraireGrilleXlsx(fichier)).lignes
    } catch (erreur) {
      if (erreur instanceof DocumentInvalideError) {
        return { ok: false, raison: 'fichier_illisible' }
      }
      throw erreur
    }
    return finaliserImportHierarchieSap(clientId, grille)
  }

  /**
   * Même import qu'`importerHierarchieSapDepuisXlsx`, depuis le fichier
   * `.htm`/`.html` produit par SAP pour le même rapport (« Enregistrer
   * comme fichier HTML ») plutôt que « vers feuille de calcul » — voir
   * `HtmlSapAdapter.extraireGrilleHtmlSap` pour la convention réelle
   * reconnue (position de colonne réelle encodée dans l'attribut `id` de
   * chaque cellule, jamais le rendu visuel de l'arbre, non fiable pour
   * cette profondeur).
   */
  async function importerHierarchieSapDepuisHtml(
    clientId: string,
    contenuHtml: string,
  ): Promise<ResultatImportHierarchieSap> {
    let grille: string[][]
    try {
      grille = extraireGrilleHtmlSap(contenuHtml)
    } catch (erreur) {
      if (erreur instanceof DocumentInvalideError) {
        return { ok: false, raison: 'fichier_illisible' }
      }
      throw erreur
    }
    return finaliserImportHierarchieSap(clientId, grille)
  }

  async function finaliserImportHierarchieSap(
    clientId: string,
    grille: string[][],
  ): Promise<ResultatImportHierarchieSap> {
    const schemaActuel = await schemaActuelFrais(clientId)
    const { api, jeton } = await obtenirApi()
    const listeActuelle = await api.obtenirStructureSysteme(jeton, clientId)
    const noeudsExistants = listeActuelle.ok
      ? listeActuelle.donnees.noeuds.map(noeudWireVersDomaine)
      : noeuds.value

    const resultat = preparerImportHierarchieSap(grille, schemaActuel, noeudsExistants)
    if (!resultat.ok) return resultat

    const nouveauxNoeuds = await ecrireNoeudsPlanifies(
      clientId,
      resultat.plan.aCreer,
      'création (import SAP)',
    )
    return { ok: true, noeudsCrees: nouveauxNoeuds.length, erreurs: resultat.plan.erreurs }
  }

  /**
   * Envoie au serveur les nœuds calculés par une planification pure
   * (`preparerImportHierarchie`/`preparerImportHierarchieSap`) — leurs
   * `id` sont imposés tels quels (voir la documentation de
   * `SaisieCreationNoeudWire.id` côté Worker) : la planification les a
   * déjà utilisés pour chaîner `parent_id` entre nouveaux nœuds du même
   * lot, un identifiant régénéré côté serveur casserait ce chaînage.
   */
  async function ecrireNoeudsPlanifies(
    clientId: string,
    aCreer: readonly Pick<AssetNode, 'id' | 'level_key' | 'name' | 'code' | 'parent_id'>[],
    action: string,
  ): Promise<AssetNode[]> {
    if (aCreer.length === 0) return []
    const saisies: SaisieCreationNoeudWire[] = aCreer.map((n) => ({
      id: n.id,
      levelKey: n.level_key,
      name: n.name,
      code: n.code,
      parentId: n.parent_id,
    }))
    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerNoeudsEnLot(jeton, clientId, saisies, action)
    if (!resultat.ok) throw new Error(`Échec de l'import : ${resultat.erreur}`)
    const nouveauxNoeuds = resultat.donnees.noeuds.map(noeudWireVersDomaine)
    noeuds.value = [...noeuds.value, ...nouveauxNoeuds]
    return nouveauxNoeuds
  }

  /**
   * Écrit les nœuds résultant d'un pull QMS réel (Integration Gateway,
   * `useConnecteursQMSStore.tirerDocuments`) — `source: 'qms_pull'` et
   * `qms_connector_id` toujours dérivés côté serveur à partir du
   * `connectorId` vérifié, jamais fournis ici. Tous les nœuds partagent le
   * même parent déjà existant choisi à l'écran, contrairement à
   * `ecrireNoeudsPlanifies` (import) qui chaîne des parents au sein du même
   * lot — aucun `id` imposé ici, toujours généré côté serveur.
   */
  async function creerNoeudsPullQms(
    clientId: string,
    connectorId: string,
    aCreer: readonly Pick<AssetNode, 'level_key' | 'name' | 'code' | 'parent_id'>[],
  ): Promise<AssetNode[]> {
    if (aCreer.length === 0) return []
    const saisies: SaisieCreationNoeudWire[] = aCreer.map((n) => ({
      levelKey: n.level_key,
      name: n.name,
      code: n.code,
      parentId: n.parent_id,
    }))
    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerNoeudsPullQms(jeton, clientId, connectorId, saisies)
    if (!resultat.ok) throw new Error(`Échec du pull QMS : ${resultat.erreur}`)
    const nouveauxNoeuds = resultat.donnees.noeuds.map(noeudWireVersDomaine)
    noeuds.value = [...noeuds.value, ...nouveauxNoeuds]
    return nouveauxNoeuds
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
    const noeud = noeuds.value.find((n) => n.id === noeudId)
    if (!noeud) return { ok: true }

    const { api, jeton } = await obtenirApi()
    const resultat = await api.modifierNoeud(jeton, noeud.client_id, noeudId, {
      parentId: nouveauParentId,
      action: 'modification',
    })
    if (!resultat.ok) throw new Error(`Échec du reparentage : ${resultat.erreur}`)
    const misAJour = noeudWireVersDomaine(resultat.donnees.noeud)
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
    const source = noeuds.value.find((n) => n.id === noeudSourceId)
    const cible = noeuds.value.find((n) => n.id === noeudCibleId)
    if (!source || !cible) return { ok: false, raison: 'noeud_introuvable' }
    if (source.client_id !== clientId || cible.client_id !== clientId) {
      return { ok: false, raison: 'clients_differents' }
    }

    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerRelationTechnique(jeton, clientId, {
      typeRelation,
      noeudSourceId,
      noeudCibleId,
    })
    if (!resultat.ok) throw new Error(`Échec de la création de la relation : ${resultat.erreur}`)
    const relation = relationWireVersDomaine(resultat.donnees.relation)
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
   * donnée à impact GMP).
   */
  async function modifierQualificationNoeud(
    noeudId: string,
    changement: {
      qualification_status: QualificationStatus
      periodic_qualification: { applicable: boolean; deadline: string | null }
    },
  ): Promise<void> {
    const noeud = noeuds.value.find((n) => n.id === noeudId)
    if (!noeud) return

    const { api, jeton } = await obtenirApi()
    const resultat = await api.modifierNoeud(jeton, noeud.client_id, noeudId, {
      qualificationStatus: changement.qualification_status,
      periodicQualification: changement.periodic_qualification,
      action: 'modification',
    })
    if (!resultat.ok) throw new Error(`Échec de la modification : ${resultat.erreur}`)
    const misAJour = noeudWireVersDomaine(resultat.donnees.noeud)
    noeuds.value = noeuds.value.map((n) => (n.id === noeudId ? misAJour : n))
  }

  return {
    schema,
    noeuds,
    relationsTechniques,
    enChargement,
    charger,
    ajouterNiveau,
    modifierNiveau,
    supprimerNiveau,
    creerNoeud,
    creerNoeudsPullQms,
    importerHierarchieDepuisXlsx,
    importerHierarchieSapDepuisXlsx,
    importerHierarchieSapDepuisHtml,
    reparenterNoeud,
    noeudsVisiblesDepuisWorkspace,
    creerRelationTechnique,
    chaineTechniqueDepuisNoeud,
    modifierQualificationNoeud,
  }
})
