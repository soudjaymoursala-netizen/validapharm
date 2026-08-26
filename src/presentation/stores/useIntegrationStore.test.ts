import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { db } from '../../persistance/db'
import { useIntegrationStore } from './useIntegrationStore'

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.connectors.clear()
  await db.syncJobs.clear()
  await db.externalReferences.clear()
})

describe('useIntegrationStore — cycle nominal', () => {
  test('Connector -> SyncJob -> ExternalReference, pour chaque type anticipé', async () => {
    const store = useIntegrationStore()
    await store.charger('client-1')

    const veeva = await store.creerConnector('client-1', {
      type: 'veeva_vault',
      nom: 'Veeva Vault production',
      config: { vaultDns: 'client.veevavault.com', nomUtilisateur: 'u', motDePasse: 'p' },
    })
    expect(veeva.actif).toBe(true)

    const job = await store.demarrerSyncJob('client-1', veeva.id)
    if ('erreur' in job) throw new Error('unreachable')
    expect(job.statut).toBe('en_attente')
    expect(job.tentative).toBe(1)

    const reference = await store.declarerReference('client-1', veeva.id, {
      identifiantExterne: 'doc-42',
      libelle: 'Protocole IQ SCADA-305',
    })
    expect(store.referencesConnector(veeva.id)).toEqual([reference])
  })

  test('un Connector peut être créé pour chaque type anticipé (github/drive/veeva/sharepoint/dossier_reseau/edms_generique)', async () => {
    const store = useIntegrationStore()

    const github = await store.creerConnector('client-1', {
      type: 'github',
      nom: 'Dépôt ValidaPharm',
      config: { owner: 'client', repo: 'depot', branche: null, jeton: 't' },
    })
    const drive = await store.creerConnector('client-1', {
      type: 'google_drive',
      nom: 'Miroir Drive',
      config: { dossierId: 'd1', jeton: 't' },
    })
    const sharepoint = await store.creerConnector('client-1', {
      type: 'sharepoint',
      nom: 'SharePoint QA',
      config: { siteUrl: 'https://client.sharepoint.com/sites/qa', jeton: 't' },
    })
    const dossierReseau = await store.creerConnector('client-1', {
      type: 'dossier_reseau',
      nom: 'Serveur de fichiers usine',
      config: { chemin: '\\\\serveur\\qualite' },
    })
    const edms = await store.creerConnector('client-1', {
      type: 'edms_generique',
      nom: 'EDMS interne',
      config: { url: 'https://edms.client.local', jeton: 't' },
    })

    expect(store.connectors.map((c) => c.type)).toEqual(
      expect.arrayContaining([
        github.type,
        drive.type,
        sharepoint.type,
        dossierReseau.type,
        edms.type,
      ]),
    )
  })
})

describe('useIntegrationStore — garde-fou non-bloquant (DEC-002/055)', () => {
  test('un SyncJob en échec ou indisponible ne bloque jamais une opération indépendante', async () => {
    const store = useIntegrationStore()
    const connector = await store.creerConnector('client-1', {
      type: 'veeva_vault',
      nom: 'Veeva Vault',
      config: { vaultDns: 'client.veevavault.com', nomUtilisateur: 'u', motDePasse: 'p' },
    })
    const job = await store.demarrerSyncJob('client-1', connector.id)
    if ('erreur' in job) throw new Error('unreachable')

    await store.marquerIndisponible('client-1', job.id)
    await store.marquerNouvelleTentative('client-1', job.id)
    const echoue = await store.marquerEchec('client-1', job.id, 'Timeout réseau')
    expect(echoue?.statut).toBe('echec')
    expect(echoue?.derniere_erreur).toBe('Timeout réseau')

    // Opération métier indépendante — jamais conditionnée au statut du SyncJob.
    const reference = await store.declarerReference('client-1', connector.id, {
      identifiantExterne: 'doc-1',
      libelle: 'Document indépendant',
    })
    expect(reference.id).toBeTruthy()
  })

  test('marquerReussi met à jour le statut sans toucher aux tentatives précédentes', async () => {
    const store = useIntegrationStore()
    const connector = await store.creerConnector('client-1', {
      type: 'veeva_vault',
      nom: 'Veeva Vault',
      config: { vaultDns: 'client.veevavault.com', nomUtilisateur: 'u', motDePasse: 'p' },
    })
    const job = await store.demarrerSyncJob('client-1', connector.id)
    if ('erreur' in job) throw new Error('unreachable')

    await store.marquerNouvelleTentative('client-1', job.id)
    const reussi = await store.marquerReussi('client-1', job.id)
    expect(reussi?.statut).toBe('reussi')
    expect(reussi?.tentative).toBe(2)
  })
})

describe('useIntegrationStore — garde-fous', () => {
  test('demarrerSyncJob sur un Connector inconnu retourne une erreur explicite', async () => {
    const store = useIntegrationStore()
    const resultat = await store.demarrerSyncJob('client-1', 'connector-inconnu')
    expect(resultat).toEqual({ erreur: 'connector_introuvable' })
  })

  test('desactiverConnector rend le connecteur inactif sans le supprimer', async () => {
    const store = useIntegrationStore()
    const connector = await store.creerConnector('client-1', {
      type: 'edms_generique',
      nom: 'EDMS',
      config: { url: 'https://edms.local', jeton: 't' },
    })
    const desactive = await store.desactiverConnector('client-1', connector.id)
    expect(desactive?.actif).toBe(false)
  })
})

describe('useIntegrationStore — isolation stricte par client', () => {
  test("les connecteurs d'un client ne fuient pas vers un autre", async () => {
    const store = useIntegrationStore()
    await store.charger('client-A')
    await store.creerConnector('client-A', {
      type: 'edms_generique',
      nom: 'EDMS A',
      config: { url: 'https://edms.local', jeton: 't' },
    })
    await store.charger('client-B')
    expect(store.connectors).toHaveLength(0)
  })
})
