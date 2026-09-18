import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import type { Contexte } from '../../../workers/auth-worker/src/routeur'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import { useContextEngineStore } from './useContextEngineStore'

let ctx: Contexte
let demonter: () => void

async function creerClientDeTest(clientId: string): Promise<void> {
  await ctx.clientsRepo.creer({
    id: clientId,
    name: clientId,
    adresse: null,
    secteur: null,
    details: null,
    statut: 'actif',
    archivedAt: null,
    archivedBy: null,
    createdByUserId: 'admin-test',
    sharedWith: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
}

async function creerNoeudDeTest(clientId: string, id: string): Promise<void> {
  await ctx.structureSystemeRepo.creerNoeud({
    id,
    clientId,
    workspaceId: null,
    levelKey: 'equipement',
    name: id,
    code: id,
    parentId: null,
    associatedNodes: [],
    source: 'manuel',
    qmsConnectorId: null,
    periodicQualification: { applicable: false, deadline: null },
    qualificationStatus: 'non_qualifie',
    auditLog: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  })
}

beforeEach(async () => {
  setActivePinia(createPinia())
  await reinitialiserAuthDeTest()
  const installation = installerFauxWorkerAuth()
  ctx = installation.ctx
  demonter = installation.demonter
  await connecterAdminDeTest()
  await creerClientDeTest('client-1')
  await creerClientDeTest('client-A')
  await creerClientDeTest('client-B')
})

afterEach(() => {
  demonter()
})

describe('useContextEngineStore — assemblage et persistance', () => {
  test('assemblerSnapshot fige workspace_id/asset_node_id et persiste les éléments résolus par le serveur', async () => {
    const store = useContextEngineStore()
    await store.charger('client-1')

    await creerNoeudDeTest('client-1', 'granulateur-01')
    await ctx.processContextRepo.creerProcess({
      id: 'process-1',
      clientId: 'client-1',
      nom: 'Granulation',
      description: '',
      type: 'production',
      sourceId: null,
      auditLog: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    await ctx.processContextRepo.creerManufacturingContext({
      id: 'mc-1',
      clientId: 'client-1',
      assetNodeId: 'granulateur-01',
      processId: 'process-1',
      produit: 'Produit A',
      recette: null,
      format: null,
      configuration: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    await ctx.qualityEventRepo.creerEvenement({
      id: 'qe-1',
      clientId: 'client-1',
      type: 'change_control',
      titre: 'qe-1',
      description: '',
      origine: 'interne',
      referenceExterne: null,
      assetNodeId: 'granulateur-01',
      processId: null,
      manufacturingContextId: null,
      statut: 'ouvert',
      auditLog: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })

    const snapshot = await store.assemblerSnapshot('client-1', { assetNodeId: 'granulateur-01' })

    expect(snapshot.asset_node_id).toBe('granulateur-01')
    expect(snapshot.workspace_id).toBeNull()
    expect(store.snapshots).toHaveLength(1)

    const elements = store.elementsDuSnapshot(snapshot.id)
    expect(elements.map((e) => e.type_objet).sort()).toEqual([
      'asset_node',
      'manufacturing_context',
      'quality_event',
    ])
  })

  test("aucune fonction de mise à jour n'est exposée (ContextSnapshot immuable)", async () => {
    const store = useContextEngineStore()
    expect('mettreAJourSnapshot' in store).toBe(false)
    expect('changerStatutSnapshot' in store).toBe(false)
  })

  test('assembler sans workspaceId ni assetNodeId -> snapshot vide, jamais une erreur', async () => {
    const store = useContextEngineStore()
    await store.charger('client-A')
    const snapshot = await store.assemblerSnapshot('client-A', {})
    expect(store.elementsDuSnapshot(snapshot.id)).toHaveLength(0)
  })

  test('isolation stricte par client', async () => {
    const store = useContextEngineStore()
    await store.charger('client-A')
    await store.assemblerSnapshot('client-A', {})
    await store.charger('client-B')
    expect(store.snapshots).toHaveLength(0)
  })
})
