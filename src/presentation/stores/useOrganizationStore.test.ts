import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { db } from '../../persistance/db'
import { useOrganizationStore } from './useOrganizationStore'

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.clients.clear()
  await db.organizations.clear()
  await db.workspaces.clear()
})

async function creerClient(nom: string) {
  const client = {
    id: crypto.randomUUID(),
    name: nom,
    statut: 'actif' as const,
    archived_at: null,
    archived_by: null,
    audit_log: [],
    created_at: new Date().toISOString(),
  }
  await db.clients.put(client)
  return client
}

describe('useOrganizationStore — migration Client -> Organization (décision structurante : id préservé)', () => {
  test('migrerClient crée une Organization dont l’id est strictement égal au Client.id, avec un Workspace racine global', async () => {
    const client = await creerClient('Client Pharma A')
    const store = useOrganizationStore()
    await store.charger()

    const organization = await store.migrerClient(client.id)
    if ('erreur' in organization) throw new Error('unreachable')
    expect(organization.id).toBe(client.id)

    const workspacesOrg = store.workspacesOrganization(organization.id)
    expect(workspacesOrg).toHaveLength(1)
    expect(workspacesOrg[0]?.type).toBe('global')
    expect(workspacesOrg[0]?.parent_workspace_id).toBeNull()
  })

  test('migrerClient est idempotent — migrer deux fois ne duplique jamais le Workspace racine', async () => {
    const client = await creerClient('Client Pharma B')
    const store = useOrganizationStore()

    const premiere = await store.migrerClient(client.id)
    const seconde = await store.migrerClient(client.id)
    if ('erreur' in premiere || 'erreur' in seconde) throw new Error('unreachable')
    expect(premiere.id).toBe(seconde.id)

    await store.charger()
    expect(store.workspacesOrganization(client.id)).toHaveLength(1)
  })

  test('migrerClient sur un client inconnu retourne une erreur explicite', async () => {
    const store = useOrganizationStore()
    const resultat = await store.migrerClient('client-inconnu')
    expect(resultat).toEqual({ erreur: 'client_introuvable' })
  })

  test('migrerTousLesClients migre chaque Client existant', async () => {
    const clientA = await creerClient('Client A')
    const clientB = await creerClient('Client B')
    const store = useOrganizationStore()

    const organizations = await store.migrerTousLesClients()
    expect(organizations.map((o) => o.id).sort()).toEqual([clientA.id, clientB.id].sort())
  })
})

describe('useOrganizationStore — scénario obligatoire "Global + N sites" (CONVERGENCE_PLAN.md, Phase 11)', () => {
  test('un site sans règle propre hérite du global ; un site avec sa propre règle la voit prévaloir', async () => {
    const client = await creerClient('Groupe Pharma')
    const store = useOrganizationStore()
    const organization = await store.migrerClient(client.id)
    if ('erreur' in organization) throw new Error('unreachable')

    const workspaceGlobal = store.workspacesOrganization(organization.id)[0]
    if (!workspaceGlobal) throw new Error('unreachable')

    const siteA = await store.creerWorkspaceSite(organization.id, {
      nom: 'Site A — Lyon',
      parentWorkspaceId: workspaceGlobal.id,
    })
    const siteB = await store.creerWorkspaceSite(organization.id, {
      nom: 'Site B — Marcy',
      parentWorkspaceId: workspaceGlobal.id,
    })
    if ('erreur' in siteA || 'erreur' in siteB) throw new Error('unreachable')

    const reglesAvecOverrideSiteB = new Map([
      [workspaceGlobal.id, 'ACFC v3 — méthode groupe'],
      [siteB.id, 'ACFC v5 — dérogation Site B'],
    ])

    const resolutionSiteA = store.resoudreRegle(siteA.id, reglesAvecOverrideSiteB)
    const resolutionSiteB = store.resoudreRegle(siteB.id, reglesAvecOverrideSiteB)

    expect(resolutionSiteA).toEqual({
      valeur: 'ACFC v3 — méthode groupe',
      workspaceIdOrigine: workspaceGlobal.id,
    })
    expect(resolutionSiteB).toEqual({
      valeur: 'ACFC v5 — dérogation Site B',
      workspaceIdOrigine: siteB.id,
    })
  })
})

describe('useOrganizationStore — garde-fous', () => {
  test('creerWorkspaceSite sur une Organization inconnue retourne une erreur explicite', async () => {
    const store = useOrganizationStore()
    const resultat = await store.creerWorkspaceSite('organization-inconnue', {
      nom: 'Site',
      parentWorkspaceId: 'workspace-inconnu',
    })
    expect(resultat).toEqual({ erreur: 'organization_introuvable' })
  })

  test('creerWorkspaceSite avec un parent inconnu retourne une erreur explicite', async () => {
    const client = await creerClient('Client')
    const store = useOrganizationStore()
    const organization = await store.migrerClient(client.id)
    if ('erreur' in organization) throw new Error('unreachable')

    const resultat = await store.creerWorkspaceSite(organization.id, {
      nom: 'Site',
      parentWorkspaceId: 'workspace-inconnu',
    })
    expect(resultat).toEqual({ erreur: 'parent_introuvable' })
  })

  test('resoudreRegle sans aucune règle définie retourne null, jamais une erreur', async () => {
    const client = await creerClient('Client')
    const store = useOrganizationStore()
    const organization = await store.migrerClient(client.id)
    if ('erreur' in organization) throw new Error('unreachable')
    const workspaceGlobal = store.workspacesOrganization(organization.id)[0]
    if (!workspaceGlobal) throw new Error('unreachable')

    expect(store.resoudreRegle(workspaceGlobal.id, new Map())).toBeNull()
  })
})
