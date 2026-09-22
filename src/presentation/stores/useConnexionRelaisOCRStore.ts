import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from './useAuthStore'

export interface SaisieConnexionRelaisOCR {
  relayUrl: string
  jeton: string
}

export type ConnexionRelaisOCR = SaisieConnexionRelaisOCR

export type ResultatEnregistrementParametreInstallation =
  { ok: true } | { ok: false; erreur: string }

const CLE_PARAMETRE = 'relais-ocr'

/**
 * Store de configuration du relais OCR (`workers/ocr-relay/`) — paramètre
 * **global à l'installation** (un seul relais serverless pour toute
 * l'organisation, même raisonnement que `useConnexionRelaisIAStore`),
 * stocké côté Worker/D1 (`parametres_installation`) — Phase 9e du
 * chantier de migration D1 (voir docs/CHANTIER-MIGRATION-D1-RECAP.md).
 * La table Dexie `connexionRelaisOCR` n'avait jamais été câblée à un
 * store ni un écran (déclarée mais jamais lue/écrite) : aucun filet de
 * sécurité de migration locale n'est nécessaire ici, contrairement aux
 * autres phases de ce chantier.
 */
export const useConnexionRelaisOCRStore = defineStore('connexionRelaisOCR', () => {
  const connexion = ref<ConnexionRelaisOCR | null>(null)
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
          ? (resultat.donnees.parametre.valeur as unknown as ConnexionRelaisOCR)
          : null
    } catch {
      // Panne réseau transitoire : la configuration déjà chargée (le cas
      // échéant) reste affichée, jamais effacée sur un simple incident.
    } finally {
      enChargement.value = false
    }
  }

  async function enregistrer(
    saisie: SaisieConnexionRelaisOCR,
  ): Promise<ResultatEnregistrementParametreInstallation> {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) return { ok: false, erreur: 'relais_non_configure' }

    const valeur: ConnexionRelaisOCR = {
      relayUrl: saisie.relayUrl.trim(),
      jeton: saisie.jeton.trim(),
    }
    const resultat = await api.enregistrerParametreInstallation(
      authStore.jeton,
      CLE_PARAMETRE,
      valeur as unknown as Record<string, string>,
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
