import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { OrganizationWire, WorkspaceWire } from '../../connecteurs/auth/AuthApiClient'
import type { Organization, Workspace } from '../../logique-metier/domaine/types'
import {
  resoudreRegleEffective,
  type RegleEffective,
} from '../../logique-metier/organisation/resolutionEffective'
import { organizationsAMigrer, workspacesAMigrer } from '../../persistance/db'
import { useAuthStore } from './useAuthStore'
import { useClientsStore } from './useClientsStore'

export interface NouveauWorkspaceSiteInput {
  nom: string
  parentWorkspaceId: string
}

export type ErreurMigrationClient = { erreur: 'client_introuvable' }
export type ErreurCreationWorkspace = { erreur: 'organization_introuvable' | 'parent_introuvable' }

function organizationWireVersDomaine(wire: OrganizationWire): Organization {
  return { id: wire.id, nom: wire.nom, created_at: wire.createdAt }
}

function workspaceWireVersDomaine(wire: WorkspaceWire): Workspace {
  return {
    id: wire.id,
    organization_id: wire.organizationId,
    type: wire.type as Workspace['type'],
    nom: wire.nom,
    parent_workspace_id: wire.parentWorkspaceId,
    created_at: wire.createdAt,
  }
}

/**
 * Store de la migration `Client` → `Organization`/`Workspace` (spec
 * `docs/convergence/PHASE_11_ORGANIZATION_MIGRATION_SPEC.md`).
 * `Organization.id` reprend exactement l'`id` du `Client` migré : aucune
 * des ~25 tables existantes indexées par `client_id` n'est modifiée par ce
 * module, leur `client_id` référence désormais `Organization.id` (même
 * valeur) — décision structurante qui évite tout Big Bang.
 *
 * **Phase 2 du chantier de migration D1** (docs/CHANTIER-MIGRATION-D1-RECAP.md,
 * 14/09/2026) : Cloudflare D1 devient la source de vérité (Worker
 * `auth-worker`, routes `/clients/:clientId/organisation/...`) — comme
 * Structure Système (Phase 1), `charger()` est désormais scopé à un seul
 * client à la fois (jamais un chargement global de tous les clients), même
 * discipline de dégradation gracieuse sur panne réseau que
 * `useClientsStore.obtenirClient`/`useStructureSystemeStore.charger`.
 *
 * @requirement Target Architecture §3
 */
export const useOrganizationStore = defineStore('organization', () => {
  const organizations = ref<Organization[]>([])
  const workspaces = ref<Workspace[]>([])
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
   * Envoie au serveur l'Organization/les Workspaces capturés depuis les
   * anciennes tables IndexedDB locales (`organizationsAMigrer`/
   * `workspacesAMigrer`) juste avant leur suppression — n'a d'effet réel
   * qu'une seule fois, sur le premier navigateur qui ouvre l'application
   * avec ce code (voir migration Dexie v35, `persistance/db.ts`). Ne
   * retire chaque élément de la file qu'après succès, pour réessayer
   * automatiquement au prochain chargement en cas d'échec réseau — jamais
   * de retrait optimiste avant confirmation serveur.
   */
  async function migrerOrganisationsLocalesVersServeur(clientId: string): Promise<void> {
    const indexOrganization = organizationsAMigrer.findIndex((o) => o.id === clientId)
    if (indexOrganization === -1) return

    const { api, jeton } = await obtenirApi()
    const resultat = await api.migrerClientVersOrganisation(jeton, clientId)
    if (!resultat.ok)
      throw new Error(`Échec de la migration de l'organisation : ${resultat.erreur}`)

    // Le Workspace racine local n'est jamais recréé : la route de
    // migration en fabrique déjà un, idempotent — son contenu (type
    // "global", nom dérivé du client) est reconstitué serveur, rien
    // d'utilisateur n'y est perdu. Les sites, eux, doivent être recréés
    // dans l'ordre topologique (un parent doit exister côté serveur avant
    // son enfant) en faisant correspondre chaque ancien id local au
    // nouvel id serveur — un site n'est jamais retiré de la file avant
    // confirmation serveur de sa propre création (même discipline que
    // `migrerStructureSystemeLocaleVersServeur` pour les relations
    // techniques).
    const racineLocale = workspacesAMigrer.find(
      (w) => w.organization_id === clientId && w.parent_workspace_id === null,
    )
    const idAncienVersNouveau = new Map<string, string>()
    if (racineLocale) idAncienVersNouveau.set(racineLocale.id, resultat.donnees.workspaceRacine.id)
    if (racineLocale) {
      const index = workspacesAMigrer.findIndex((w) => w.id === racineLocale.id)
      if (index !== -1) workspacesAMigrer.splice(index, 1)
    }

    for (;;) {
      const site = workspacesAMigrer.find(
        (w) =>
          w.organization_id === clientId &&
          w.parent_workspace_id !== null &&
          idAncienVersNouveau.has(w.parent_workspace_id),
      )
      if (!site) break
      const creation = await api.creerWorkspace(jeton, clientId, {
        nom: site.nom,
        parentWorkspaceId: idAncienVersNouveau.get(site.parent_workspace_id as string) as string,
      })
      if (!creation.ok) break
      idAncienVersNouveau.set(site.id, creation.donnees.workspace.id)
      const index = workspacesAMigrer.findIndex((w) => w.id === site.id)
      if (index !== -1) workspacesAMigrer.splice(index, 1)
    }

    organizationsAMigrer.splice(indexOrganization, 1)
  }

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      const authStore = useAuthStore()
      const api = await authStore.client()
      if (!api || !authStore.jeton) {
        organizations.value = []
        workspaces.value = []
        return
      }
      try {
        await migrerOrganisationsLocalesVersServeur(clientId)
      } catch {
        // Nouvel essai au prochain chargement — ne bloque jamais l'affichage normal.
      }
      try {
        const resultat = await api.obtenirOrganisation(authStore.jeton, clientId)
        if (!resultat.ok) {
          organizations.value = []
          workspaces.value = []
          return
        }
        organizations.value = resultat.donnees.organization
          ? [organizationWireVersDomaine(resultat.donnees.organization)]
          : []
        workspaces.value = resultat.donnees.workspaces.map(workspaceWireVersDomaine)
      } catch {
        // Panne réseau réelle : jamais une exception non gérée, même
        // discipline que `useClientsStore.obtenirClient`.
        organizations.value = []
        workspaces.value = []
      }
    } finally {
      enChargement.value = false
    }
  }

  /**
   * Idempotente : si l'`Organization` existe déjà pour ce `clientId`, la
   * retourne telle quelle sans dupliquer son `Workspace` racine.
   */
  async function migrerClient(clientId: string): Promise<Organization | ErreurMigrationClient> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.migrerClientVersOrganisation(jeton, clientId)
    if (!resultat.ok) {
      if (resultat.erreur === 'introuvable') return { erreur: 'client_introuvable' }
      throw new Error(`Échec de la migration : ${resultat.erreur}`)
    }
    const organization = organizationWireVersDomaine(resultat.donnees.organization)
    const workspaceRacine = workspaceWireVersDomaine(resultat.donnees.workspaceRacine)
    if (!organizations.value.some((o) => o.id === organization.id)) {
      organizations.value = [...organizations.value, organization]
    }
    if (!workspaces.value.some((w) => w.id === workspaceRacine.id)) {
      workspaces.value = [...workspaces.value, workspaceRacine]
    }
    return organization
  }

  async function migrerTousLesClients(): Promise<Organization[]> {
    const clientsStore = useClientsStore()
    await clientsStore.chargerClients()
    const tousLesClients = clientsStore.clients
    const resultats: Organization[] = []
    for (const client of tousLesClients) {
      const resultat = await migrerClient(client.id)
      if (!('erreur' in resultat)) resultats.push(resultat)
    }
    return resultats
  }

  async function creerWorkspaceSite(
    organizationId: string,
    input: NouveauWorkspaceSiteInput,
  ): Promise<Workspace | ErreurCreationWorkspace> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerWorkspace(jeton, organizationId, {
      nom: input.nom,
      parentWorkspaceId: input.parentWorkspaceId,
    })
    if (!resultat.ok) {
      if (resultat.erreur === 'organization_introuvable' || resultat.erreur === 'introuvable') {
        return { erreur: 'organization_introuvable' }
      }
      if (resultat.erreur === 'parent_introuvable') return { erreur: 'parent_introuvable' }
      throw new Error(`Échec de la création du site : ${resultat.erreur}`)
    }
    const site = workspaceWireVersDomaine(resultat.donnees.workspace)
    workspaces.value = [...workspaces.value, site]
    return site
  }

  function workspacesOrganization(organizationId: string): Workspace[] {
    return workspaces.value.filter((w) => w.organization_id === organizationId)
  }

  /** Résout une règle effective en remontant l'arbre `Workspace` déjà chargé — voir `resoudreRegleEffective`. */
  function resoudreRegle<T>(
    workspaceId: string,
    reglesParWorkspace: ReadonlyMap<string, T>,
  ): RegleEffective<T> | null {
    const arbre = new Map(
      workspaces.value.map((w) => [w.id, { id: w.id, parent_workspace_id: w.parent_workspace_id }]),
    )
    return resoudreRegleEffective(workspaceId, reglesParWorkspace, arbre)
  }

  return {
    organizations,
    workspaces,
    enChargement,
    charger,
    migrerClient,
    migrerTousLesClients,
    creerWorkspaceSite,
    workspacesOrganization,
    resoudreRegle,
  }
})
