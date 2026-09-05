import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db, type EnregistrementConnexionAuthentification } from '../../persistance/db'

export interface SaisieConnexionAuthentification {
  relayUrl: string
}

const IDENTIFIANT_ENREGISTREMENT_UNIQUE = 'unique'

/**
 * Configuration de connexion au Worker d'authentification —
 * même principe que `useConnexionRelaisIAStore`/`useConnexionRelaisOCR` :
 * enregistrement unique, pas par client, un seul Worker serverless pour
 * toute l'installation. Doit être configuré **avant** toute connexion
 * (`Login.vue` en dépend pour savoir quel Worker appeler) — écran dédié
 * `ConfigurationAuthentification.vue`, volontairement exclu de la garde de
 * routeur globale (voir `router/index.ts`).
 */
export const useConnexionAuthentificationStore = defineStore('connexionAuthentification', () => {
  const connexion = ref<EnregistrementConnexionAuthentification | null>(null)
  const enChargement = ref(false)

  async function charger(): Promise<void> {
    enChargement.value = true
    try {
      connexion.value =
        (await db.connexionAuthentification.get(IDENTIFIANT_ENREGISTREMENT_UNIQUE)) ?? null
    } finally {
      enChargement.value = false
    }
  }

  async function enregistrer(saisie: SaisieConnexionAuthentification): Promise<void> {
    const enregistrement: EnregistrementConnexionAuthentification = {
      id: IDENTIFIANT_ENREGISTREMENT_UNIQUE,
      relayUrl: saisie.relayUrl.trim().replace(/\/+$/, ''),
    }
    await db.connexionAuthentification.put(enregistrement)
    connexion.value = enregistrement
  }

  return { connexion, enChargement, charger, enregistrer }
})
