import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ClientWire } from '../../connecteurs/auth/AuthApiClient'
import type { Client, SecteurClient } from '../../logique-metier/domaine/types'
import { useAuthStore } from './useAuthStore'

export interface NouveauClientInput {
  name: string
  adresse?: string | null
  secteur?: SecteurClient | null
  details?: string | null
}

export interface ModificationClientInput {
  name: string
  adresse: string | null
  secteur: SecteurClient | null
  details: string | null
}

export type ErreurClient = { erreur: string }

function wireVersClient(w: ClientWire): Client {
  return {
    id: w.id,
    name: w.name,
    adresse: w.adresse,
    secteur: w.secteur,
    details: w.details,
    statut: w.statut,
    archived_at: w.archivedAt,
    archived_by: w.archivedBy,
    // L'audit d'un client géré par le Worker vit désormais côté serveur
    // (table `audit_log` D1, consultable par un admin via `/admin/audit`)
    // — jamais dupliqué ici.
    audit_log: [],
    created_at: w.createdAt,
    created_by_user_id: w.createdByUserId,
    shared_with: w.sharedWith,
  }
}

function trierParNom(clients: Client[]): Client[] {
  return [...clients].sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Store de la Couche Présentation pour l'entité `client` — désormais
 * un client REST du Worker d'authentification
 * (Cloudflare D1 devient la source de vérité), plus un accès Dexie direct
 * : nécessaire pour qu'un admin voie réellement tous les clients de
 * l'organisation, structurellement impossible avec un stockage seulement
 * local par navigateur. `Project`/`Section`/gabarits restent inchangés
 * (IndexedDB + synchronisation GitHub).
 *
 * **Archivage (§4.31)** : jamais une suppression
 * physique (ALCOA+) — `archiverClient` change `statut`, le client reste
 * lisible et restaurable. Contrairement à avant, l'identité de
 * l'acteur (`archived_by`) est désormais résolue **côté serveur** depuis
 * la session authentifiée, jamais déclarée par l'appelant — la garde de
 * confirmation (re-saisie du vrai mot de passe, `useAuthStore.
 * verifierMotDePasse`) reste côté appelant (composant), avant d'invoquer
 * `archiverClient`, cohérent avec le reste de l'app.
 *
 * **Suppression définitive** (`supprimerDefinitivement`) :
 * réservée au rôle admin (vérifié côté serveur, jamais seulement côté
 * client), justification obligatoire, tracée en audit — jamais pour les
 * autres entités (`Project`/`Section` restent archivage-only).
 */
export const useClientsStore = defineStore('clients', () => {
  const clients = ref<Client[]>([])
  const enChargement = ref(false)

  const clientsActifs = computed(() => clients.value.filter((c) => c.statut !== 'archive'))
  const clientsArchives = computed(() => clients.value.filter((c) => c.statut === 'archive'))

  async function chargerClients(): Promise<void> {
    enChargement.value = true
    try {
      const authStore = useAuthStore()
      const api = await authStore.client()
      if (!api || !authStore.jeton) {
        clients.value = []
        return
      }
      const resultat = await api.listerClients(authStore.jeton)
      clients.value = resultat.ok ? trierParNom(resultat.donnees.clients.map(wireVersClient)) : []
    } finally {
      enChargement.value = false
    }
  }

  async function creerClient(input: NouveauClientInput): Promise<Client | ErreurClient> {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) return { erreur: 'relais_non_configure' }

    const resultat = await api.creerClient(authStore.jeton, input)
    if (!resultat.ok) return { erreur: resultat.erreur }

    const client = wireVersClient(resultat.donnees.client)
    clients.value = trierParNom([...clients.value, client])
    return client
  }

  async function obtenirClient(clientId: string): Promise<Client | undefined> {
    const existant = clients.value.find((c) => c.id === clientId)
    if (existant) return existant

    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) return undefined
    const resultat = await api.obtenirClient(authStore.jeton, clientId)
    return resultat.ok ? wireVersClient(resultat.donnees.client) : undefined
  }

  /**
   * Modification des informations d'entreprise (§13 du prompt maître) —
   * jamais le nom seul comme le faisait l'écran initial :
   * adresse/secteur/détails éditables après création, sans re-création.
   */
  async function modifierClient(
    clientId: string,
    input: ModificationClientInput,
  ): Promise<Client | ErreurClient> {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) return { erreur: 'relais_non_configure' }

    const resultat = await api.modifierClient(authStore.jeton, clientId, input)
    if (!resultat.ok) return { erreur: resultat.erreur }

    const client = wireVersClient(resultat.donnees.client)
    clients.value = trierParNom(clients.value.map((c) => (c.id === clientId ? client : c)))
    return client
  }

  async function archiverClient(clientId: string): Promise<Client | ErreurClient> {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) return { erreur: 'relais_non_configure' }

    const resultat = await api.modifierClient(authStore.jeton, clientId, { statut: 'archive' })
    if (!resultat.ok) return { erreur: resultat.erreur }

    const client = wireVersClient(resultat.donnees.client)
    clients.value = clients.value.map((c) => (c.id === clientId ? client : c))
    return client
  }

  async function desarchiverClient(clientId: string): Promise<Client | ErreurClient> {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) return { erreur: 'relais_non_configure' }

    const resultat = await api.modifierClient(authStore.jeton, clientId, { statut: 'actif' })
    if (!resultat.ok) return { erreur: resultat.erreur }

    const client = wireVersClient(resultat.donnees.client)
    clients.value = clients.value.map((c) => (c.id === clientId ? client : c))
    return client
  }

  /**
   * Suppression **définitive** — admin uniquement (vérifié côté serveur),
   * justification obligatoire, jamais un simple bouton côté client sans
   * garde réelle (contrairement à `archiverClient` qui reste
   * réversible).
   */
  async function supprimerDefinitivement(
    clientId: string,
    justification: string,
  ): Promise<{ ok: true } | ErreurClient> {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) return { erreur: 'relais_non_configure' }

    const resultat = await api.supprimerClientDefinitivement(
      authStore.jeton,
      clientId,
      justification,
    )
    if (!resultat.ok) return { erreur: resultat.erreur }

    clients.value = clients.value.filter((c) => c.id !== clientId)
    return { ok: true }
  }

  return {
    clients,
    clientsActifs,
    clientsArchives,
    enChargement,
    chargerClients,
    creerClient,
    obtenirClient,
    modifierClient,
    archiverClient,
    desarchiverClient,
    supprimerDefinitivement,
  }
})
