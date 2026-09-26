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
    separation_taches: w.separationTaches === true,
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
  /** Compteur des modifications locales de la liste — voir `chargerClients`. */
  let mutationsLocales = 0
  const clients = ref<Client[]>([])
  const enChargement = ref(false)

  const clientsActifs = computed(() => clients.value.filter((c) => c.statut !== 'archive'))
  const clientsArchives = computed(() => clients.value.filter((c) => c.statut === 'archive'))

  /**
   * Un jeton JWT expire au bout de 12h (`workers/auth-worker/README.md`,
   * limite assumée) — après une longue inactivité, le Worker répond 401 à
   * ce chargement alors que la session locale (`useAuthStore.estConnecte`)
   * se croit toujours valide (jamais revérifiée tant qu'aucun appel réseau
   * n'échoue). Avant ce correctif, tout échec ici — y compris ce 401 et
   * une simple panne réseau transitoire — effaçait silencieusement
   * `clients.value`, laissant l'utilisateur « connecté » mais sans aucun
   * client visible jusqu'à une déconnexion/reconnexion manuelle. Un 401
   * déclenche désormais une vraie déconnexion (l'état reflète la réalité :
   * la prochaine navigation renvoie à l'écran de connexion via la garde de
   * routeur) ; toute autre panne (réseau, 5xx) ne touche jamais la liste
   * déjà chargée — même principe que le correctif « Site actif » de
   * `BarreLaterale.vue` (jamais confondre absence de réponse et absence de
   * données).
   */
  async function chargerClients(): Promise<void> {
    enChargement.value = true
    try {
      const authStore = useAuthStore()
      const api = await authStore.client()
      if (!api || !authStore.jeton) {
        clients.value = []
        return
      }
      // Une réponse tardive ne doit jamais écraser une modification locale
      // plus récente (client créé, archivé… pendant le chargement) : dans
      // ce cas la liste est relue, jamais remplacée par l'état périmé.
      for (let essai = 0; essai < 3; essai++) {
        const versionAuDepart = mutationsLocales
        const resultat = await api.listerClients(authStore.jeton)
        if (!resultat.ok) {
          if (resultat.status === 401) await authStore.deconnecter()
          // Autre échec (403, panne inattendue) : la liste déjà chargée reste affichée.
          return
        }
        if (versionAuDepart === mutationsLocales) {
          clients.value = trierParNom(resultat.donnees.clients.map(wireVersClient))
          return
        }
      }
    } catch {
      // Worker injoignable/délai dépassé (panne réseau transitoire) : idem, jamais d'effacement.
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
    mutationsLocales += 1
    return client
  }

  /**
   * Appelé au `onMounted` d'une vingtaine d'écrans (juste pour le nom du
   * client affiché en en-tête), presque toujours suivi d'autres appels
   * indépendants (souvent purement locaux, ex. `useStructureSystemeStore.
   * charger`) dans la même chaîne séquentielle. Avant ce correctif, une
   * panne réseau transitoire ici (Worker injoignable, délai dépassé)
   * levait une exception non rattrapée qui interrompait toute la chaîne —
   * empêchant même le chargement de données n'ayant aucun rapport avec le
   * réseau. Même principe que `chargerClients` : une panne de connectivité
   * dégrade (nom de client absent), jamais ne bloque le reste.
   */
  async function obtenirClient(clientId: string): Promise<Client | undefined> {
    const existant = clients.value.find((c) => c.id === clientId)
    if (existant) return existant

    try {
      const authStore = useAuthStore()
      const api = await authStore.client()
      if (!api || !authStore.jeton) return undefined
      const resultat = await api.obtenirClient(authStore.jeton, clientId)
      return resultat.ok ? wireVersClient(resultat.donnees.client) : undefined
    } catch {
      return undefined
    }
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
    mutationsLocales += 1
    return client
  }

  /** Règle de signature du client — réservée à son créateur ou à un admin (appliquée par le Worker, tracée). */
  async function definirSeparationTaches(
    clientId: string,
    active: boolean,
  ): Promise<Client | ErreurClient> {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) return { erreur: 'relais_non_configure' }
    const resultat = await api.modifierClient(authStore.jeton, clientId, {
      separationTaches: active,
    })
    if (!resultat.ok) return { erreur: resultat.erreur }
    const client = wireVersClient(resultat.donnees.client)
    clients.value = trierParNom(clients.value.map((c) => (c.id === clientId ? client : c)))
    mutationsLocales += 1
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
    mutationsLocales += 1
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
    mutationsLocales += 1
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
    motDePasse: string,
  ): Promise<{ ok: true } | ErreurClient> {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) return { erreur: 'relais_non_configure' }

    const resultat = await api.supprimerClientDefinitivement(
      authStore.jeton,
      clientId,
      justification,
      motDePasse,
    )
    if (!resultat.ok) return { erreur: resultat.erreur }

    clients.value = clients.value.filter((c) => c.id !== clientId)
    mutationsLocales += 1
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
    definirSeparationTaches,
    supprimerDefinitivement,
  }
})
