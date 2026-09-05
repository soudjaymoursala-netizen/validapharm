import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  Connector,
  ConfigConnector,
  ExternalReference,
  SyncJob,
} from '../../logique-metier/domaine/types'
import { db } from '../../persistance/db'

export type NouveauConnectorInput = ConfigConnector & { nom: string }

export interface NouvelleReferenceInput {
  identifiantExterne: string
  libelle: string
}

/**
 * Store de l'Integration Gateway générique (convergence
 * architecturale — spec dans
 * `docs/convergence/PHASE_10_INTEGRATION_GATEWAY_SPEC.md`). Ne fait
 * aucun appel réseau lui-même — orchestre `Connector`/`SyncJob`/
 * `ExternalReference` ; l'accès réel au système externe passe par un
 * adaptateur `ConnecteurDocumentaire` (`src/connecteurs/integration/`),
 * instancié séparément à partir de `Connector.config`.
 *
 * @requirement Target Architecture, domaine "Integration"
 */
export const useIntegrationStore = defineStore('integration', () => {
  const connectors = ref<Connector[]>([])
  const syncJobs = ref<SyncJob[]>([])
  const externalReferences = ref<ExternalReference[]>([])
  const enChargement = ref(false)

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      connectors.value = await db.connectors.where('client_id').equals(clientId).toArray()
      syncJobs.value = await db.syncJobs.where('client_id').equals(clientId).toArray()
      externalReferences.value = await db.externalReferences
        .where('client_id')
        .equals(clientId)
        .toArray()
    } finally {
      enChargement.value = false
    }
  }

  async function creerConnector(
    clientId: string,
    input: NouveauConnectorInput,
  ): Promise<Connector> {
    const { nom, ...configConnector } = input
    const connector = {
      id: crypto.randomUUID(),
      client_id: clientId,
      nom,
      actif: true,
      created_at: new Date().toISOString(),
      ...configConnector,
    } as Connector
    await db.connectors.put(connector)
    connectors.value = [...connectors.value, connector]
    return connector
  }

  async function desactiverConnector(
    clientId: string,
    connectorId: string,
  ): Promise<Connector | null> {
    const existant = await db.connectors.get(connectorId)
    if (!existant || existant.client_id !== clientId) return null

    const miseAJour = { ...existant, actif: false } as Connector
    await db.connectors.put(miseAJour)
    connectors.value = connectors.value.map((c) => (c.id === connectorId ? miseAJour : c))
    return miseAJour
  }

  async function demarrerSyncJob(
    clientId: string,
    connectorId: string,
  ): Promise<SyncJob | { erreur: 'connector_introuvable' }> {
    const connector = await db.connectors.get(connectorId)
    if (!connector || connector.client_id !== clientId) return { erreur: 'connector_introuvable' }

    const job: SyncJob = {
      id: crypto.randomUUID(),
      client_id: clientId,
      connector_id: connectorId,
      statut: 'en_attente',
      tentative: 1,
      derniere_erreur: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    await db.syncJobs.put(job)
    syncJobs.value = [...syncJobs.value, job]
    return job
  }

  /**
   * Garde-fou non négociable : un `SyncJob` indisponible/en échec ne bloque
   * jamais une activité indépendante — aucun code de ce module ne
   * conditionne `declarerReference` ou toute autre opération métier au
   * statut d'un `SyncJob` (cohérent avec `QualityEvent`).
   */
  async function marquerIndisponible(clientId: string, syncJobId: string): Promise<SyncJob | null> {
    return changerStatutSyncJob(clientId, syncJobId, 'indisponible', null)
  }

  async function marquerNouvelleTentative(
    clientId: string,
    syncJobId: string,
  ): Promise<SyncJob | null> {
    const existant = await db.syncJobs.get(syncJobId)
    if (!existant || existant.client_id !== clientId) return null

    const miseAJour: SyncJob = {
      ...existant,
      statut: 'nouvelle_tentative',
      tentative: existant.tentative + 1,
      updated_at: new Date().toISOString(),
    }
    await db.syncJobs.put(miseAJour)
    syncJobs.value = syncJobs.value.map((j) => (j.id === syncJobId ? miseAJour : j))
    return miseAJour
  }

  async function marquerEchec(
    clientId: string,
    syncJobId: string,
    erreur: string,
  ): Promise<SyncJob | null> {
    return changerStatutSyncJob(clientId, syncJobId, 'echec', erreur)
  }

  async function marquerReussi(clientId: string, syncJobId: string): Promise<SyncJob | null> {
    return changerStatutSyncJob(clientId, syncJobId, 'reussi', null)
  }

  async function changerStatutSyncJob(
    clientId: string,
    syncJobId: string,
    statut: SyncJob['statut'],
    derniereErreur: string | null,
  ): Promise<SyncJob | null> {
    const existant = await db.syncJobs.get(syncJobId)
    if (!existant || existant.client_id !== clientId) return null

    const miseAJour: SyncJob = {
      ...existant,
      statut,
      derniere_erreur: derniereErreur,
      updated_at: new Date().toISOString(),
    }
    await db.syncJobs.put(miseAJour)
    syncJobs.value = syncJobs.value.map((j) => (j.id === syncJobId ? miseAJour : j))
    return miseAJour
  }

  /** Pointeur vers un document externe — jamais son contenu dupliqué. */
  async function declarerReference(
    clientId: string,
    connectorId: string,
    input: NouvelleReferenceInput,
  ): Promise<ExternalReference> {
    const reference: ExternalReference = {
      id: crypto.randomUUID(),
      client_id: clientId,
      connector_id: connectorId,
      identifiant_externe: input.identifiantExterne,
      libelle: input.libelle,
      created_at: new Date().toISOString(),
    }
    await db.externalReferences.put(reference)
    externalReferences.value = [...externalReferences.value, reference]
    return reference
  }

  function syncJobsConnector(connectorId: string): SyncJob[] {
    return syncJobs.value.filter((j) => j.connector_id === connectorId)
  }

  function referencesConnector(connectorId: string): ExternalReference[] {
    return externalReferences.value.filter((r) => r.connector_id === connectorId)
  }

  return {
    connectors,
    syncJobs,
    externalReferences,
    enChargement,
    charger,
    creerConnector,
    desactiverConnector,
    demarrerSyncJob,
    marquerIndisponible,
    marquerNouvelleTentative,
    marquerEchec,
    marquerReussi,
    declarerReference,
    syncJobsConnector,
    referencesConnector,
  }
})
