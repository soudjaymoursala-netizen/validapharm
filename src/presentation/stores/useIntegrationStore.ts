import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  ConnectorWire,
  ExternalReferenceWire,
  SyncJobWire,
} from '../../connecteurs/auth/AuthApiClient'
import type {
  ConfigConnector,
  Connector,
  ExternalReference,
  StatutSyncJob,
  SyncJob,
} from '../../logique-metier/domaine/types'
import { connectorsAMigrer, externalReferencesAMigrer, syncJobsAMigrer } from '../../persistance/db'
import { useAuthStore } from './useAuthStore'

export type NouveauConnectorInput = ConfigConnector & { nom: string }

export interface NouvelleReferenceInput {
  identifiantExterne: string
  libelle: string
}

export function connectorWireVersDomaine(w: ConnectorWire): Connector {
  return {
    id: w.id,
    client_id: w.clientId,
    nom: w.nom,
    actif: w.actif,
    created_at: w.createdAt,
    type: w.type,
    config: JSON.parse(w.config),
  } as Connector
}

export function connectorDomaineVersWire(c: Connector): ConnectorWire {
  return {
    id: c.id,
    clientId: c.client_id,
    nom: c.nom,
    actif: c.actif,
    type: c.type,
    config: JSON.stringify(c.config),
    createdAt: c.created_at,
  }
}

export function syncJobWireVersDomaine(w: SyncJobWire): SyncJob {
  return {
    id: w.id,
    client_id: w.clientId,
    connector_id: w.connectorId,
    statut: w.statut as StatutSyncJob,
    tentative: w.tentative,
    derniere_erreur: w.derniereErreur,
    created_at: w.createdAt,
    updated_at: w.updatedAt,
  }
}

export function syncJobDomaineVersWire(j: SyncJob): SyncJobWire {
  return {
    id: j.id,
    clientId: j.client_id,
    connectorId: j.connector_id,
    statut: j.statut,
    tentative: j.tentative,
    derniereErreur: j.derniere_erreur,
    createdAt: j.created_at,
    updatedAt: j.updated_at,
  }
}

export function externalReferenceWireVersDomaine(w: ExternalReferenceWire): ExternalReference {
  return {
    id: w.id,
    client_id: w.clientId,
    connector_id: w.connectorId,
    identifiant_externe: w.identifiantExterne,
    libelle: w.libelle,
    created_at: w.createdAt,
  }
}

export function externalReferenceDomaineVersWire(r: ExternalReference): ExternalReferenceWire {
  return {
    id: r.id,
    clientId: r.client_id,
    connectorId: r.connector_id,
    identifiantExterne: r.identifiant_externe,
    libelle: r.libelle,
    createdAt: r.created_at,
  }
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
 * **Migré vers le Worker/D1 (Phase 7c du chantier de migration D1)** —
 * même patron que les phases précédentes : `id`/timestamps toujours
 * dérivés côté serveur, jamais fait confiance au client. `config`
 * (secrets de connexion inclus) est stocké tel quel en JSON côté
 * serveur, jamais interprété.
 *
 * @requirement Target Architecture, domaine "Integration"
 */
export const useIntegrationStore = defineStore('integration', () => {
  const connectors = ref<Connector[]>([])
  const syncJobs = ref<SyncJob[]>([])
  const externalReferences = ref<ExternalReference[]>([])
  const enChargement = ref(false)

  /** Lève si le relais n'est pas configuré — mutations exigent désormais systématiquement le Worker/D1, même discipline que les autres stores de ce chantier. */
  async function obtenirApi() {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) {
      throw new Error("Relais d'authentification non configuré (Configuration client).")
    }
    return { api, jeton: authStore.jeton }
  }

  /**
   * Envoie au serveur les enregistrements capturés depuis les anciennes
   * tables IndexedDB locales juste avant leur suppression — n'a d'effet
   * réel qu'une seule fois (voir migration Dexie v50, `persistance/db.ts`).
   */
  async function migrerIntegrationLocalVersServeur(clientId: string): Promise<void> {
    const connectorsDuClient = connectorsAMigrer.filter((c) => c.client_id === clientId)
    const syncJobsDuClient = syncJobsAMigrer.filter((j) => j.client_id === clientId)
    const externalReferencesDuClient = externalReferencesAMigrer.filter(
      (r) => r.client_id === clientId,
    )
    if (
      connectorsDuClient.length === 0 &&
      syncJobsDuClient.length === 0 &&
      externalReferencesDuClient.length === 0
    ) {
      return
    }

    const { api, jeton } = await obtenirApi()
    const resultat = await api.migrerIntegrationLocal(jeton, clientId, {
      connectors: connectorsDuClient.map(connectorDomaineVersWire),
      syncJobs: syncJobsDuClient.map(syncJobDomaineVersWire),
      externalReferences: externalReferencesDuClient.map(externalReferenceDomaineVersWire),
    })
    if (!resultat.ok) {
      throw new Error(`Échec de la migration Integration : ${resultat.erreur}`)
    }
    for (const [tableau, duClient] of [
      [connectorsAMigrer, connectorsDuClient],
      [syncJobsAMigrer, syncJobsDuClient],
      [externalReferencesAMigrer, externalReferencesDuClient],
    ] as const) {
      for (const entree of duClient) {
        const index = (tableau as unknown[]).indexOf(entree)
        if (index !== -1) (tableau as unknown[]).splice(index, 1)
      }
    }
  }

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      try {
        await migrerIntegrationLocalVersServeur(clientId)
      } catch {
        // Nouvel essai au prochain chargement — ne bloque jamais l'affichage normal.
      }
      const { api, jeton } = await obtenirApi()
      const resultat = await api.obtenirIntegration(jeton, clientId)
      if (resultat.ok) {
        connectors.value = resultat.donnees.connectors.map(connectorWireVersDomaine)
        syncJobs.value = resultat.donnees.syncJobs.map(syncJobWireVersDomaine)
        externalReferences.value = resultat.donnees.externalReferences.map(
          externalReferenceWireVersDomaine,
        )
      } else {
        connectors.value = []
        syncJobs.value = []
        externalReferences.value = []
      }
    } catch {
      // Panne réseau réelle ou relais non configuré : jamais une exception
      // non gérée, même discipline que les autres stores de ce chantier.
      connectors.value = []
      syncJobs.value = []
      externalReferences.value = []
    } finally {
      enChargement.value = false
    }
  }

  async function creerConnector(
    clientId: string,
    input: NouveauConnectorInput,
  ): Promise<Connector> {
    const { nom, ...configConnector } = input
    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerConnector(jeton, clientId, {
      nom,
      type: configConnector.type,
      config: configConnector.config,
    })
    if (!resultat.ok) throw new Error(`Échec de la création du connecteur : ${resultat.erreur}`)
    const connector = connectorWireVersDomaine(resultat.donnees.connector)
    connectors.value = [...connectors.value, connector]
    return connector
  }

  async function desactiverConnector(
    clientId: string,
    connectorId: string,
  ): Promise<Connector | null> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.desactiverConnector(jeton, clientId, connectorId)
    if (!resultat.ok) return null
    const miseAJour = connectorWireVersDomaine(resultat.donnees.connector)
    connectors.value = connectors.value.map((c) => (c.id === connectorId ? miseAJour : c))
    return miseAJour
  }

  async function demarrerSyncJob(
    clientId: string,
    connectorId: string,
  ): Promise<SyncJob | { erreur: 'connector_introuvable' }> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.demarrerSyncJob(jeton, clientId, connectorId)
    if (!resultat.ok) {
      if (resultat.erreur === 'connector_introuvable') return { erreur: 'connector_introuvable' }
      throw new Error(`Échec du démarrage du SyncJob : ${resultat.erreur}`)
    }
    const job = syncJobWireVersDomaine(resultat.donnees.syncJob)
    syncJobs.value = [...syncJobs.value, job]
    return job
  }

  /**
   * Garde-fou non négociable : un `SyncJob` indisponible/en échec ne bloque
   * jamais une activité métier indépendante — aucun code de ce module ne
   * conditionne `declarerReference` ou toute autre opération au statut
   * d'un `SyncJob` (cohérent avec `QualityEvent`).
   */
  async function marquerIndisponible(clientId: string, syncJobId: string): Promise<SyncJob | null> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.marquerSyncJobIndisponible(jeton, clientId, syncJobId)
    return appliquerMiseAJourSyncJob(resultat)
  }

  async function marquerNouvelleTentative(
    clientId: string,
    syncJobId: string,
  ): Promise<SyncJob | null> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.marquerSyncJobNouvelleTentative(jeton, clientId, syncJobId)
    return appliquerMiseAJourSyncJob(resultat)
  }

  async function marquerEchec(
    clientId: string,
    syncJobId: string,
    erreur: string,
  ): Promise<SyncJob | null> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.marquerSyncJobEchec(jeton, clientId, syncJobId, erreur)
    return appliquerMiseAJourSyncJob(resultat)
  }

  async function marquerReussi(clientId: string, syncJobId: string): Promise<SyncJob | null> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.marquerSyncJobReussi(jeton, clientId, syncJobId)
    return appliquerMiseAJourSyncJob(resultat)
  }

  function appliquerMiseAJourSyncJob(
    resultat: { ok: true; donnees: { syncJob: SyncJobWire } } | { ok: false; erreur: string },
  ): SyncJob | null {
    if (!resultat.ok) return null
    const miseAJour = syncJobWireVersDomaine(resultat.donnees.syncJob)
    syncJobs.value = syncJobs.value.map((j) => (j.id === miseAJour.id ? miseAJour : j))
    return miseAJour
  }

  /** Pointeur vers un document externe — jamais son contenu dupliqué. */
  async function declarerReference(
    clientId: string,
    connectorId: string,
    input: NouvelleReferenceInput,
  ): Promise<ExternalReference> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.declarerReference(jeton, clientId, connectorId, {
      identifiantExterne: input.identifiantExterne,
      libelle: input.libelle,
    })
    if (!resultat.ok) {
      throw new Error(`Échec de la déclaration de la référence : ${resultat.erreur}`)
    }
    const reference = externalReferenceWireVersDomaine(resultat.donnees.externalReference)
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
