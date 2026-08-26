import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db, type EnregistrementConnexionRelaisIA } from '../../persistance/db'

export interface SaisieConnexionRelaisIA {
  relayUrl: string
  jeton: string
}

const IDENTIFIANT_ENREGISTREMENT_UNIQUE = 'unique'

/**
 * Store de configuration du relais IA (SDS §10quater) — enregistrement
 * unique, pas par client (même raisonnement que
 * `useConnexionGitHubStore` : un seul relais serverless pour toute
 * l'installation).
 *
 * @requirement SDS §10quater, URS-NF-044ter
 */
export const useConnexionRelaisIAStore = defineStore('connexionRelaisIA', () => {
  const connexion = ref<EnregistrementConnexionRelaisIA | null>(null)
  const enChargement = ref(false)

  async function charger(): Promise<void> {
    enChargement.value = true
    try {
      connexion.value = (await db.connexionRelaisIA.get(IDENTIFIANT_ENREGISTREMENT_UNIQUE)) ?? null
    } finally {
      enChargement.value = false
    }
  }

  async function enregistrer(saisie: SaisieConnexionRelaisIA): Promise<void> {
    const enregistrement: EnregistrementConnexionRelaisIA = {
      id: IDENTIFIANT_ENREGISTREMENT_UNIQUE,
      relayUrl: saisie.relayUrl.trim(),
      jeton: saisie.jeton.trim(),
    }
    await db.connexionRelaisIA.put(enregistrement)
    connexion.value = enregistrement
  }

  async function effacer(): Promise<void> {
    await db.connexionRelaisIA.delete(IDENTIFIANT_ENREGISTREMENT_UNIQUE)
    connexion.value = null
  }

  return { connexion, enChargement, charger, enregistrer, effacer }
})
