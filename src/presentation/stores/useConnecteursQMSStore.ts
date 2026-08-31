import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Connector, ConfigConnector } from '../../logique-metier/domaine/types'
import { db } from '../../persistance/db'

export type NouveauConnecteurInput = { nom: string; actif: boolean } & ConfigConnector

/**
 * Configuration des connecteurs QMS/documentaires tiers (URS-F-090 à
 * 090ter) — le type de domaine `Connector` et sa table Dexie existaient
 * depuis la Phase 10 sans jamais avoir de store ni d'écran (trouvé en
 * inventoriant les écarts §12 de la FDS, corrigé le 31/08/2026).
 *
 * **Périmètre** : CRUD de la configuration uniquement (nom, type, actif,
 * paramètres de connexion). Les adaptateurs `veeva_vault`/`sharepoint`/
 * `dossier_reseau`/`edms_generique` restent non implémentés (aucun test
 * de connexion réel possible ici) — seuls `github`/`google_drive`
 * réutilisent les adaptateurs de stockage déjà existants et testés
 * ailleurs (`ConfigurationClient.vue`/`ConfigurationDrive.vue`) ; ce
 * registre ne fait ici que consigner leur configuration, jamais une
 * duplication de leur logique de connexion.
 */
export const useConnecteursQMSStore = defineStore('connecteursQMS', () => {
  const connecteurs = ref<Connector[]>([])
  const enChargement = ref(false)

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      connecteurs.value = await db.connectors.where('client_id').equals(clientId).toArray()
    } finally {
      enChargement.value = false
    }
  }

  async function creerConnecteur(clientId: string, input: NouveauConnecteurInput): Promise<void> {
    const connecteur = {
      id: crypto.randomUUID(),
      client_id: clientId,
      nom: input.nom,
      actif: input.actif,
      type: input.type,
      config: input.config,
      created_at: new Date().toISOString(),
    } as Connector
    await db.connectors.put(connecteur)
    connecteurs.value = [...connecteurs.value, connecteur]
  }

  async function basculerActif(connecteurId: string): Promise<void> {
    const connecteur = await db.connectors.get(connecteurId)
    if (!connecteur) return
    const misAJour: Connector = { ...connecteur, actif: !connecteur.actif }
    await db.connectors.put(misAJour)
    connecteurs.value = connecteurs.value.map((c) => (c.id === connecteurId ? misAJour : c))
  }

  async function supprimerConnecteur(connecteurId: string): Promise<void> {
    await db.connectors.delete(connecteurId)
    connecteurs.value = connecteurs.value.filter((c) => c.id !== connecteurId)
  }

  return { connecteurs, enChargement, charger, creerConnecteur, basculerActif, supprimerConnecteur }
})
