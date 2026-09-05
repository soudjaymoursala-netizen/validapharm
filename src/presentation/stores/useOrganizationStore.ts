import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Organization, Workspace } from '../../logique-metier/domaine/types'
import {
  resoudreRegleEffective,
  type RegleEffective,
} from '../../logique-metier/organisation/resolutionEffective'
import { db } from '../../persistance/db'
import { useClientsStore } from './useClientsStore'

export interface NouveauWorkspaceSiteInput {
  nom: string
  parentWorkspaceId: string
}

export type ErreurMigrationClient = { erreur: 'client_introuvable' }
export type ErreurCreationWorkspace = { erreur: 'organization_introuvable' | 'parent_introuvable' }

/**
 * Store de la migration `Client` → `Organization`/`Workspace` (spec
 * `docs/convergence/PHASE_11_ORGANIZATION_MIGRATION_SPEC.md`).
 * `Organization.id` reprend exactement l'`id` du `Client` migré : aucune
 * des ~25 tables existantes indexées par `client_id` n'est modifiée par ce
 * module, leur `client_id` référence désormais `Organization.id` (même
 * valeur) — décision structurante qui évite tout Big Bang.
 *
 * @requirement Target Architecture §3
 */
export const useOrganizationStore = defineStore('organization', () => {
  const organizations = ref<Organization[]>([])
  const workspaces = ref<Workspace[]>([])
  const enChargement = ref(false)

  async function charger(): Promise<void> {
    enChargement.value = true
    try {
      organizations.value = await db.organizations.toArray()
      workspaces.value = await db.workspaces.toArray()
    } finally {
      enChargement.value = false
    }
  }

  /**
   * Idempotente : si l'`Organization` existe déjà pour ce `clientId`, la
   * retourne telle quelle sans dupliquer son `Workspace` racine.
   */
  async function migrerClient(clientId: string): Promise<Organization | ErreurMigrationClient> {
    const existante = await db.organizations.get(clientId)
    if (existante) return existante

    const client = await useClientsStore().obtenirClient(clientId)
    if (!client) return { erreur: 'client_introuvable' }

    const maintenant = new Date().toISOString()
    const organization: Organization = { id: clientId, nom: client.name, created_at: maintenant }
    const workspaceRacine: Workspace = {
      id: crypto.randomUUID(),
      organization_id: clientId,
      type: 'global',
      nom: `${client.name} — Global`,
      parent_workspace_id: null,
      created_at: maintenant,
    }

    await db.organizations.put(organization)
    await db.workspaces.put(workspaceRacine)
    organizations.value = [...organizations.value, organization]
    workspaces.value = [...workspaces.value, workspaceRacine]
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
    const organization = await db.organizations.get(organizationId)
    if (!organization) return { erreur: 'organization_introuvable' }

    const parent = await db.workspaces.get(input.parentWorkspaceId)
    if (!parent || parent.organization_id !== organizationId) {
      return { erreur: 'parent_introuvable' }
    }

    const site: Workspace = {
      id: crypto.randomUUID(),
      organization_id: organizationId,
      type: 'site',
      nom: input.nom,
      parent_workspace_id: input.parentWorkspaceId,
      created_at: new Date().toISOString(),
    }
    await db.workspaces.put(site)
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
