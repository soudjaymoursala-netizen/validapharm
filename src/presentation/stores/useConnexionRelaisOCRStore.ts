import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from './useAuthStore'

export interface SaisieConnexionRelaisOCR {
  relayUrl: string
  jeton: string
}

/**
 * Configuration lue côté navigateur — sans le jeton du relais OCR, jamais
 * renvoyé par le Worker (25/09/2026). Aucun écran n'appelle encore le
 * relais OCR : le jour où ce sera le cas, passer par un relais du Worker
 * (même patron que `/relais-ia`).
 */
export interface ConnexionRelaisOCR {
  relayUrl: string
  jetonConfigure: boolean
}

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
      const valeur = resultat.ok ? resultat.donnees.parametre?.valeur : undefined
      connexion.value = valeur
        ? { relayUrl: valeur.relayUrl ?? '', jetonConfigure: valeur.jetonConfigure === 'oui' }
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

    const valeur = { relayUrl: saisie.relayUrl.trim(), jeton: saisie.jeton.trim() }
    const resultat = await api.enregistrerParametreInstallation(
      authStore.jeton,
      CLE_PARAMETRE,
      valeur,
    )
    if (!resultat.ok) return { ok: false, erreur: resultat.erreur }
    connexion.value = {
      relayUrl: valeur.relayUrl,
      jetonConfigure: resultat.donnees.parametre?.valeur.jetonConfigure === 'oui',
    }
    return { ok: true }
  }

  async function effacer(): Promise<void> {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (api && authStore.jeton) {
      const resultat = await api.effacerParametreInstallation(authStore.jeton, CLE_PARAMETRE)
      // Jamais afficher « effacée » si le serveur l'a conservée.
      if (!resultat.ok) throw new Error(`Échec de l'effacement : ${resultat.erreur}`)
    }
    connexion.value = null
  }

  return { connexion, enChargement, charger, enregistrer, effacer }
})
