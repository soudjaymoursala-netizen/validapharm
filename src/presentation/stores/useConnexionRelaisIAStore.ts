import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from './useAuthStore'

export interface SaisieConnexionRelaisIA {
  relayUrl: string
  jeton: string
}

export type ConnexionRelaisIA = SaisieConnexionRelaisIA

export type ResultatEnregistrementParametreInstallation =
  { ok: true } | { ok: false; erreur: string }

const CLE_PARAMETRE = 'relais-ia'

/**
 * Store de configuration du relais IA — paramètre **global à
 * l'installation** (un seul relais serverless pour toute l'organisation,
 * même raisonnement que `useConnexionGitHubStore`), désormais stocké côté
 * Worker/D1 plutôt que dans IndexedDB par navigateur — même correctif que
 * pour le dépôt GitHub (signalé par l'utilisateur : configuration retrouvée
 * vide après connexion depuis un autre appareil).
 */
export const useConnexionRelaisIAStore = defineStore('connexionRelaisIA', () => {
  const connexion = ref<ConnexionRelaisIA | null>(null)
  const enChargement = ref(false)

  async function charger(): Promise<void> {
    enChargement.value = true
    try {
      const authStore = useAuthStore()
      const api = await authStore.client()
      if (!api || !authStore.jeton) {
        connexion.value = null
        return
      }
      const resultat = await api.obtenirParametreInstallation(authStore.jeton, CLE_PARAMETRE)
      connexion.value =
        resultat.ok && resultat.donnees.parametre
          ? (resultat.donnees.parametre.valeur as unknown as ConnexionRelaisIA)
          : null
    } finally {
      enChargement.value = false
    }
  }

  async function enregistrer(
    saisie: SaisieConnexionRelaisIA,
  ): Promise<ResultatEnregistrementParametreInstallation> {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) return { ok: false, erreur: 'relais_non_configure' }

    const valeur: ConnexionRelaisIA = {
      relayUrl: saisie.relayUrl.trim(),
      jeton: saisie.jeton.trim(),
    }
    const resultat = await api.enregistrerParametreInstallation(
      authStore.jeton,
      CLE_PARAMETRE,
      valeur,
    )
    if (!resultat.ok) return { ok: false, erreur: resultat.erreur }
    connexion.value = valeur
    return { ok: true }
  }

  async function effacer(): Promise<void> {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (api && authStore.jeton) {
      await api.effacerParametreInstallation(authStore.jeton, CLE_PARAMETRE)
    }
    connexion.value = null
  }

  return { connexion, enChargement, charger, enregistrer, effacer }
})
