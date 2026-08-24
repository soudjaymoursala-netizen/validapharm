import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Client } from '../../logique-metier/domaine/types'
import { db } from '../../persistance/db'

export interface NouveauClientInput {
  name: string
}

/**
 * Store de la Couche Présentation (SDS §6) pour l'entité `client` (FS §3
 * v12) — identité minimale (nom), distincte des réglages `ClientConfig`.
 * Nécessaire pour isoler par `client_id` la configuration du miroir Drive
 * (SDS §5bis/§7) et, plus tard, le fournisseur IA (`client_config`).
 */
export const useClientsStore = defineStore('clients', () => {
  const clients = ref<Client[]>([])
  const enChargement = ref(false)

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
    const client: Client = {
      id: crypto.randomUUID(),
      name: input.name,
      created_at: new Date().toISOString(),
    }
    await db.clients.put(client)
    clients.value = [...clients.value, client].sort((a, b) => a.name.localeCompare(b.name))
    return client
  }

  async function obtenirClient(clientId: string): Promise<Client | undefined> {
    return db.clients.get(clientId)
  }

  return { clients, enChargement, chargerClients, creerClient, obtenirClient }
})
