import { defineStore } from 'pinia'
import { ref } from 'vue'
import { instancierConnecteurDocumentaire } from '../../connecteurs/integration/instancierConnecteurDocumentaire'
import type { Connector, ConfigConnector } from '../../logique-metier/domaine/types'
import { codeDejaUtilise } from '../../logique-metier/structure-systeme/validerCodeUnique'
import { connectorsAMigrer } from '../../persistance/db'
import { useAuthStore } from './useAuthStore'
import {
  connectorDomaineVersWire,
  connectorWireVersDomaine,
  useIntegrationStore,
} from './useIntegrationStore'
import { useStructureSystemeStore } from './useStructureSystemeStore'

export type NouveauConnecteurInput = { nom: string; actif: boolean } & ConfigConnector

export type ResultatPullQms =
  | { ok: true; documentsCrees: number; documentsIgnores: number }
  | { ok: false; raison: 'connecteur_introuvable' }
  | { ok: false; raison: 'echec_connexion'; message: string }

/**
 * Configuration des connecteurs QMS/documentaires tiers — le type de
 * domaine `Connector` et sa table Dexie existaient
 * depuis longtemps sans jamais avoir de store ni d'écran (trouvé en
 * inventoriant les écarts §12 de la conception, corrigé le 31/08/2026).
 *
 * **Périmètre** : CRUD de la configuration uniquement (nom, type, actif,
 * paramètres de connexion). Les adaptateurs `veeva_vault`/`sharepoint`/
 * `dossier_reseau`/`edms_generique` restent non implémentés (aucun test
 * de connexion réel possible ici) — seuls `github`/`google_drive`
 * réutilisent les adaptateurs de stockage déjà existants et testés
 * ailleurs (`ConfigurationClient.vue`/`ConfigurationDrive.vue`) ; ce
 * registre ne fait ici que consigner leur configuration, jamais une
 * duplication de leur logique de connexion.
 *
 * **Migré vers le Worker/D1 (Phase 7c du chantier de migration D1)** —
 * même patron que `useIntegrationStore.ts` (domaine "Integration"
 * partagé, même dépôt Worker) : `id`/`createdAt` toujours dérivés côté
 * serveur. `supprimerConnecteur` reste une vraie suppression physique
 * (`Connector` est une pure configuration technique, pas un
 * enregistrement GxP à préserver).
 */
export const useConnecteursQMSStore = defineStore('connecteursQMS', () => {
  const connecteurs = ref<Connector[]>([])
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
   * Envoie au serveur les `Connector` capturés depuis l'ancienne table
   * IndexedDB locale juste avant sa suppression — n'a d'effet réel
   * qu'une seule fois (voir migration Dexie v50, `persistance/db.ts`).
   * Partage le même filet de sécurité que `useIntegrationStore` (même
   * domaine "Integration" côté Worker) — idempotent quel que soit
   * l'ordre d'appel des deux stores.
   */
  async function migrerConnecteursLocalVersServeur(clientId: string): Promise<void> {
    const connecteursDuClient = connectorsAMigrer.filter((c) => c.client_id === clientId)
    if (connecteursDuClient.length === 0) return

    const { api, jeton } = await obtenirApi()
    const resultat = await api.migrerIntegrationLocal(jeton, clientId, {
      connectors: connecteursDuClient.map(connectorDomaineVersWire),
      syncJobs: [],
      externalReferences: [],
    })
    if (!resultat.ok) {
      throw new Error(`Échec de la migration des connecteurs QMS : ${resultat.erreur}`)
    }
    for (const entree of connecteursDuClient) {
      const index = connectorsAMigrer.indexOf(entree)
      if (index !== -1) connectorsAMigrer.splice(index, 1)
    }
  }

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      try {
        await migrerConnecteursLocalVersServeur(clientId)
      } catch {
        // Nouvel essai au prochain chargement — ne bloque jamais l'affichage normal.
      }
      const { api, jeton } = await obtenirApi()
      const resultat = await api.obtenirIntegration(jeton, clientId)
      connecteurs.value = resultat.ok
        ? resultat.donnees.connectors.map(connectorWireVersDomaine)
        : []
    } catch {
      // Panne réseau réelle ou relais non configuré : jamais une exception
      // non gérée, même discipline que les autres stores de ce chantier.
      connecteurs.value = []
    } finally {
      enChargement.value = false
    }
  }

  async function creerConnecteur(clientId: string, input: NouveauConnecteurInput): Promise<void> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerConnector(jeton, clientId, {
      nom: input.nom,
      actif: input.actif,
      type: input.type,
      config: input.config,
    })
    if (!resultat.ok) throw new Error(`Échec de la création du connecteur : ${resultat.erreur}`)
    const connecteur = connectorWireVersDomaine(resultat.donnees.connector)
    connecteurs.value = [...connecteurs.value, connecteur]
  }

  async function basculerActif(connecteurId: string): Promise<void> {
    const connecteur = connecteurs.value.find((c) => c.id === connecteurId)
    if (!connecteur) return
    const { api, jeton } = await obtenirApi()
    const resultat = await api.basculerActifConnector(jeton, connecteur.client_id, connecteurId)
    if (!resultat.ok) return
    const misAJour = connectorWireVersDomaine(resultat.donnees.connector)
    connecteurs.value = connecteurs.value.map((c) => (c.id === connecteurId ? misAJour : c))
  }

  async function supprimerConnecteur(connecteurId: string): Promise<void> {
    const connecteur = connecteurs.value.find((c) => c.id === connecteurId)
    if (!connecteur) return
    const { api, jeton } = await obtenirApi()
    const resultat = await api.supprimerConnector(jeton, connecteur.client_id, connecteurId)
    if (!resultat.ok) return
    connecteurs.value = connecteurs.value.filter((c) => c.id !== connecteurId)
  }

  /**
   * Pull réel d'un connecteur QMS vers la Structure Système — seuls
   * `github` (réel) et `veeva_vault` (squelette non testé en conditions
   * réelles, cf. `VeevaVaultConnectorAdapter`) peuvent effectivement lister
   * des documents ; `google_drive` est écriture seule
   * (`DriveDocumentConnectorAdapter.listerDocuments` lève toujours), et
   * `sharepoint`/`dossier_reseau`/`edms_generique` restent non implémentés
   * — dans tous ces cas le `SyncJob` est marqué en échec avec un message
   * explicite, jamais une exception non gérée qui remonterait à l'écran.
   *
   * Idempotent : une référence déjà déclarée pour ce connecteur (pull
   * précédent) n'est jamais re-déclarée ni re-créée en nœud — vérifié à la
   * fois côté `ExternalReference` et côté code de nœud (double filet, au
   * cas où une panne réseau aurait interrompu un pull juste après la
   * déclaration de la référence mais avant la création du nœud).
   */
  async function tirerDocuments(
    clientId: string,
    connecteurId: string,
    cible: { parentId: string; levelKey: string },
  ): Promise<ResultatPullQms> {
    const connecteur = connecteurs.value.find((c) => c.id === connecteurId)
    if (!connecteur) return { ok: false, raison: 'connecteur_introuvable' }

    const integrationStore = useIntegrationStore()
    const structureStore = useStructureSystemeStore()
    await integrationStore.charger(clientId)

    const job = await integrationStore.demarrerSyncJob(clientId, connecteurId)
    if ('erreur' in job) return { ok: false, raison: 'connecteur_introuvable' }

    let documents: Array<{ identifiant: string; libelle: string }>
    try {
      const adaptateur = instancierConnecteurDocumentaire(connecteur)
      await adaptateur.tester()
      documents = await adaptateur.listerDocuments()
    } catch (erreur) {
      const message = erreur instanceof Error ? erreur.message : 'Erreur inconnue'
      await integrationStore.marquerEchec(clientId, job.id, message)
      return { ok: false, raison: 'echec_connexion', message }
    }

    const dejaReferences = new Set(
      integrationStore.referencesConnector(connecteurId).map((r) => r.identifiant_externe),
    )
    const nouveaux = documents.filter((d) => !dejaReferences.has(d.identifiant))

    for (const doc of nouveaux) {
      await integrationStore.declarerReference(clientId, connecteurId, {
        identifiantExterne: doc.identifiant,
        libelle: doc.libelle,
      })
    }

    const aCreer = nouveaux
      .map((doc) => ({
        level_key: cible.levelKey,
        name: doc.libelle,
        code: `qms:${connecteurId}:${doc.identifiant}`,
        parent_id: cible.parentId as string | null,
      }))
      .filter((n) => !codeDejaUtilise(structureStore.noeuds, n.code, null))

    const noeudsCrees = await structureStore.creerNoeudsPullQms(clientId, connecteurId, aCreer)
    await integrationStore.marquerReussi(clientId, job.id)

    return {
      ok: true,
      documentsCrees: noeudsCrees.length,
      documentsIgnores: documents.length - noeudsCrees.length,
    }
  }

  return {
    connecteurs,
    enChargement,
    charger,
    creerConnecteur,
    basculerActif,
    supprimerConnecteur,
    tirerDocuments,
  }
})
