import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Client, SecteurClient } from '../../logique-metier/domaine/types'
import { IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1 } from '../identite/identiteLocale'
import { db } from '../../persistance/db'

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

export type ErreurArchivageClient = { erreur: 'introuvable' | 'deja_archive' | 'deja_actif' }

/**
 * Store de la Couche Présentation (SDS §6) pour l'entité `client` (FS §3
 * v12) — identité minimale (nom), distincte des réglages `ClientConfig`.
 * Nécessaire pour isoler par `client_id` la configuration du miroir Drive
 * (SDS §5bis/§7) et, plus tard, le fournisseur IA (`client_config`).
 *
 * **Archivage (§4.31/URS-F-310, TD-033)** : jamais une suppression
 * physique (ALCOA+) — `archiverClient` change `statut`, le client reste
 * lisible et restaurable. La garde de confirmation (nom retapé + mot de
 * passe local) est vérifiée par l'appelant (composant) avant d'invoquer
 * `archiverClient`, jamais dans le store lui-même — cohérent avec le
 * reste de l'app (les garde-fous sont explicites côté appelant).
 */
export const useClientsStore = defineStore('clients', () => {
  const clients = ref<Client[]>([])
  const enChargement = ref(false)

  const clientsActifs = computed(() => clients.value.filter((c) => c.statut !== 'archive'))
  const clientsArchives = computed(() => clients.value.filter((c) => c.statut === 'archive'))

  async function chargerClients(): Promise<void> {
    enChargement.value = true
    try {
      const tous = await db.clients.toArray()
      clients.value = tous.sort((a, b) => a.name.localeCompare(b.name))
    } finally {
      enChargement.value = false
    }
  }

  async function creerClient(input: NouveauClientInput): Promise<Client> {
    const maintenant = new Date().toISOString()
    const client: Client = {
      id: crypto.randomUUID(),
      name: input.name,
      adresse: input.adresse ?? null,
      secteur: input.secteur ?? null,
      details: input.details ?? null,
      statut: 'actif',
      archived_at: null,
      archived_by: null,
      audit_log: [
        { timestamp: maintenant, actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1, action: 'création' },
      ],
      created_at: maintenant,
    }
    await db.clients.put(client)
    clients.value = [...clients.value, client].sort((a, b) => a.name.localeCompare(b.name))
    return client
  }

  async function obtenirClient(clientId: string): Promise<Client | undefined> {
    return db.clients.get(clientId)
  }

  /**
   * Modification des informations d'entreprise (§13 du prompt maître,
   * Phase 40) — jamais le nom seul comme le faisait l'écran initial :
   * adresse/secteur/détails éditables après création, sans re-création.
   */
  async function modifierClient(
    clientId: string,
    input: ModificationClientInput,
  ): Promise<Client | { erreur: 'introuvable' }> {
    const existant = await db.clients.get(clientId)
    if (!existant) return { erreur: 'introuvable' }

    const misAJour: Client = {
      ...existant,
      name: input.name,
      adresse: input.adresse,
      secteur: input.secteur,
      details: input.details,
    }
    await db.clients.put(misAJour)
    clients.value = clients.value
      .map((c) => (c.id === clientId ? misAJour : c))
      .sort((a, b) => a.name.localeCompare(b.name))
    return misAJour
  }

  async function archiverClient(
    clientId: string,
    identiteDeclaree: string,
  ): Promise<Client | ErreurArchivageClient> {
    const existant = await db.clients.get(clientId)
    if (!existant) return { erreur: 'introuvable' }
    if (existant.statut === 'archive') return { erreur: 'deja_archive' }

    const maintenant = new Date().toISOString()
    const misAJour: Client = {
      ...existant,
      statut: 'archive',
      archived_at: maintenant,
      archived_by: identiteDeclaree,
      audit_log: [
        ...existant.audit_log,
        { timestamp: maintenant, actor: identiteDeclaree, action: 'archivage' },
      ],
    }
    await db.clients.put(misAJour)
    clients.value = clients.value.map((c) => (c.id === clientId ? misAJour : c))
    return misAJour
  }

  async function desarchiverClient(
    clientId: string,
    identiteDeclaree: string,
  ): Promise<Client | ErreurArchivageClient> {
    const existant = await db.clients.get(clientId)
    if (!existant) return { erreur: 'introuvable' }
    if (existant.statut !== 'archive') return { erreur: 'deja_actif' }

    const maintenant = new Date().toISOString()
    const misAJour: Client = {
      ...existant,
      statut: 'actif',
      archived_at: null,
      archived_by: null,
      audit_log: [
        ...existant.audit_log,
        { timestamp: maintenant, actor: identiteDeclaree, action: 'désarchivage' },
      ],
    }
    await db.clients.put(misAJour)
    clients.value = clients.value.map((c) => (c.id === clientId ? misAJour : c))
    return misAJour
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
  }
})
