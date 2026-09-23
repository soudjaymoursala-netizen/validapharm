import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import { useConnecteursQMSStore } from './useConnecteursQMSStore'
import { useStructureSystemeStore } from './useStructureSystemeStore'

// `tirerDocuments` instancie de vrais adaptateurs (`GitHubDocumentConnectorAdapter`
// etc.) qui appellent `fetch` directement, en dehors du relais Worker — doit être
// stubbé AVANT `installerFauxWorkerAuth()` pour que celui-ci le capture comme
// passe-plat pour toute URL hors du faux Worker (voir sa documentation).
let fetchMock: ReturnType<typeof vi.fn>

function reponseMock(corps: unknown, options: { status?: number } = {}): Response {
  const status = options.status ?? 200
  return { ok: status >= 200 && status < 300, status, json: async () => corps } as Response
}

let demonter: () => void

beforeEach(async () => {
  setActivePinia(createPinia())
  await reinitialiserAuthDeTest()
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  const installation = installerFauxWorkerAuth()
  demonter = installation.demonter
  await connecterAdminDeTest()
  for (const id of ['client-1', 'client-A', 'client-B']) {
    await installation.ctx.clientsRepo.creer({
      id,
      name: id,
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
})

afterEach(() => {
  demonter()
})

describe('useConnecteursQMSStore — creerConnecteur', () => {
  test('crée un connecteur Veeva Vault et le persiste', async () => {
    const store = useConnecteursQMSStore()
    await store.charger('client-1')

    await store.creerConnecteur('client-1', {
      nom: 'Veeva Vault site Rennes',
      actif: true,
      type: 'veeva_vault',
      config: {
        vaultDns: 'rennes.veevavault.com',
        nomUtilisateur: 'qa-rennes',
        motDePasse: 's3cret',
      },
    })

    expect(store.connecteurs).toHaveLength(1)
    expect(store.connecteurs[0]?.nom).toBe('Veeva Vault site Rennes')
    expect(store.connecteurs[0]?.type).toBe('veeva_vault')
  })

  test('isolation stricte par client', async () => {
    const store = useConnecteursQMSStore()
    await store.charger('client-A')
    await store.creerConnecteur('client-A', {
      nom: 'Connecteur A',
      actif: true,
      type: 'dossier_reseau',
      config: { chemin: '\\\\serveur\\partage' },
    })

    await store.charger('client-B')
    expect(store.connecteurs).toHaveLength(0)

    await store.charger('client-A')
    expect(store.connecteurs).toHaveLength(1)
  })
})

describe('useConnecteursQMSStore — basculerActif', () => {
  test('bascule actif -> inactif -> actif', async () => {
    const store = useConnecteursQMSStore()
    await store.charger('client-1')
    await store.creerConnecteur('client-1', {
      nom: 'EDMS',
      actif: true,
      type: 'edms_generique',
      config: { url: 'https://edms.example.com', jeton: 'jeton' },
    })
    const id = store.connecteurs[0]?.id ?? ''

    await store.basculerActif(id)
    expect(store.connecteurs.find((c) => c.id === id)?.actif).toBe(false)

    await store.basculerActif(id)
    expect(store.connecteurs.find((c) => c.id === id)?.actif).toBe(true)
  })
})

describe('useConnecteursQMSStore — supprimerConnecteur', () => {
  test('retire le connecteur de la liste et de la base', async () => {
    const store = useConnecteursQMSStore()
    await store.charger('client-1')
    await store.creerConnecteur('client-1', {
      nom: 'SharePoint',
      actif: true,
      type: 'sharepoint',
      config: { siteUrl: 'https://sharepoint.example.com', jeton: 'jeton' },
    })
    const id = store.connecteurs[0]?.id ?? ''

    await store.supprimerConnecteur(id)

    expect(store.connecteurs).toHaveLength(0)

    await store.charger('client-1')
    expect(store.connecteurs).toHaveLength(0)
  })
})

describe('useConnecteursQMSStore — tirerDocuments (pull réel vers AssetNode)', () => {
  async function preparerConnecteurEtParent(
    store: ReturnType<typeof useConnecteursQMSStore>,
    structureStore: ReturnType<typeof useStructureSystemeStore>,
    input: Parameters<typeof store.creerConnecteur>[1],
  ): Promise<{ connecteurId: string; parentId: string }> {
    await store.charger('client-1')
    await store.creerConnecteur('client-1', input)
    const connecteurId = store.connecteurs[0]?.id ?? ''

    await structureStore.charger('client-1')
    await structureStore.creerNoeud('client-1', {
      level_key: 'dossier',
      name: 'Documents importés',
      code: 'DOC',
      parent_id: null,
    })
    const parentId = structureStore.noeuds[0]?.id ?? ''
    return { connecteurId, parentId }
  }

  test('GitHub : crée un AssetNode par document, source qms_pull, idempotent au second pull', async () => {
    const store = useConnecteursQMSStore()
    const structureStore = useStructureSystemeStore()
    const { connecteurId, parentId } = await preparerConnecteurEtParent(store, structureStore, {
      nom: 'GitHub dépôt normes',
      actif: true,
      type: 'github',
      config: { owner: 'client', repo: 'depot', branche: null, jeton: 'x' },
    })

    fetchMock
      .mockResolvedValueOnce(reponseMock({ object: { sha: 'sha-branche' } })) // tester()
      .mockResolvedValueOnce(
        reponseMock({ tree: [{ path: 'docs/urs.md', type: 'blob', sha: 'sha-1' }] }),
      ) // listerDocuments()

    const resultat = await store.tirerDocuments('client-1', connecteurId, {
      parentId,
      levelKey: 'document',
    })
    expect(resultat).toEqual({ ok: true, documentsCrees: 1, documentsIgnores: 0 })

    const pulles = structureStore.noeuds.filter((n) => n.source === 'qms_pull')
    expect(pulles).toHaveLength(1)
    expect(pulles[0]?.qms_connector_id).toBe(connecteurId)
    expect(pulles[0]?.parent_id).toBe(parentId)
    expect(pulles[0]?.name).toBe('docs/urs.md')

    // Second pull : même document renvoyé par GitHub -> déjà référencé,
    // jamais un second AssetNode créé.
    fetchMock
      .mockResolvedValueOnce(reponseMock({ object: { sha: 'sha-branche' } }))
      .mockResolvedValueOnce(
        reponseMock({ tree: [{ path: 'docs/urs.md', type: 'blob', sha: 'sha-1' }] }),
      )
    const second = await store.tirerDocuments('client-1', connecteurId, {
      parentId,
      levelKey: 'document',
    })
    expect(second).toEqual({ ok: true, documentsCrees: 0, documentsIgnores: 1 })
    expect(structureStore.noeuds.filter((n) => n.source === 'qms_pull')).toHaveLength(1)
  })

  test('Drive (écriture seule) -> echec_connexion explicite, jamais de nœud créé', async () => {
    const store = useConnecteursQMSStore()
    const structureStore = useStructureSystemeStore()
    const { connecteurId, parentId } = await preparerConnecteurEtParent(store, structureStore, {
      nom: 'Drive miroir',
      actif: true,
      type: 'google_drive',
      config: { dossierId: 'dossier-1', jeton: 'x' },
    })

    fetchMock.mockResolvedValueOnce(
      reponseMock({ name: 'Dossier', mimeType: 'application/vnd.google-apps.folder' }),
    ) // tester() -> verifierDossier()

    const resultat = await store.tirerDocuments('client-1', connecteurId, {
      parentId,
      levelKey: 'document',
    })
    expect(resultat.ok).toBe(false)
    expect(resultat).toMatchObject({ raison: 'echec_connexion' })
    expect(structureStore.noeuds.filter((n) => n.source === 'qms_pull')).toHaveLength(0)
  })

  test('adaptateur non implémenté (SharePoint) -> echec_connexion, message explicite', async () => {
    const store = useConnecteursQMSStore()
    const structureStore = useStructureSystemeStore()
    const { connecteurId, parentId } = await preparerConnecteurEtParent(store, structureStore, {
      nom: 'SharePoint',
      actif: true,
      type: 'sharepoint',
      config: { siteUrl: 'https://sharepoint.example.com', jeton: 'x' },
    })

    const resultat = await store.tirerDocuments('client-1', connecteurId, {
      parentId,
      levelKey: 'document',
    })
    expect(resultat.ok).toBe(false)
    if (resultat.ok || resultat.raison !== 'echec_connexion') {
      throw new Error('résultat inattendu : ' + JSON.stringify(resultat))
    }
    expect(resultat.message).toContain('non implémenté')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(structureStore.noeuds.filter((n) => n.source === 'qms_pull')).toHaveLength(0)
  })

  test('connecteur introuvable -> connecteur_introuvable, aucun appel réseau', async () => {
    const store = useConnecteursQMSStore()
    await store.charger('client-1')

    const resultat = await store.tirerDocuments('client-1', 'inconnu', {
      parentId: 'x',
      levelKey: 'document',
    })
    expect(resultat).toEqual({ ok: false, raison: 'connecteur_introuvable' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
