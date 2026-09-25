import { defineStore } from 'pinia'
import { ref } from 'vue'
import { RelayProviderAdapter } from '../../connecteurs/ia/RelayProviderAdapter'
import { useAuthStore } from './useAuthStore'
import { useConnexionAuthentificationStore } from './useConnexionAuthentificationStore'

/** Saisie admin : `jeton` vide = conserver le jeton déjà enregistré côté serveur. */
export interface SaisieConnexionRelaisIA {
  relayUrl: string
  jeton: string
}

/**
 * Configuration lue côté navigateur — **sans le jeton du relais**
 * (25/09/2026) : le Worker ne le renvoie plus ; les appels passent par
 * `<Worker d'authentification>/relais-ia`, qui l'ajoute côté serveur.
 */
export interface ConnexionRelaisIA {
  relayUrl: string
  jetonConfigure: boolean
}

export type ResultatEnregistrementParametreInstallation =
  { ok: true } | { ok: false; erreur: string }

export type ResultatTestConnexionRelaisIA = { ok: true } | { ok: false; message: string }

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

  /**
   * `ConfigurationClient.vue` (et `MissionWorkspace.vue`/
   * `RevueStructureProcedure.vue`/`EditeurSection.vue`) appellent ceci —
   * sans ce `catch`, une panne réseau transitoire (Worker injoignable,
   * délai dépassé) levait une exception non rattrapée. Sur
   * `ConfigurationClient.vue` en particulier, ça interrompait aussi le
   * chargement de la section suivante (`onMounted` enchaîne les trois
   * chargers), laissant croire que toute la configuration avait disparu.
   * Même principe que `useClientsStore.chargerClients()`.
   */
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
    saisie: SaisieConnexionRelaisIA,
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

  /**
   * Vérifie réellement la connexion (jeton valide, relais joignable) — un
   * simple `GET` côté relais, jamais un appel au fournisseur IA sous-jacent
   * (voir `RelayProviderAdapter.tester`), pour ne jamais facturer un appel
   * fournisseur au seul geste de test.
   */
  async function testerConnexion(): Promise<ResultatTestConnexionRelaisIA> {
    const acces = accesRelais()
    if (connexion.value === null || acces.relayUrl === undefined) {
      return { ok: false, message: 'Aucune configuration enregistrée.' }
    }
    const adaptateur = new RelayProviderAdapter({
      relayUrl: acces.relayUrl,
      jeton: acces.jetonRelais,
      nomAffiche: 'relais-ia',
    })
    try {
      await adaptateur.tester()
      return { ok: true }
    } catch (erreur) {
      return { ok: false, message: erreur instanceof Error ? erreur.message : 'Erreur inconnue.' }
    }
  }

  /**
   * Paramètres à passer à `construireAdaptateursIA` : l'adaptateur appelle
   * le relais du Worker d'authentification (`/relais-ia`) avec la session
   * courante — jamais le relais IA directement avec son jeton. `undefined`
   * tant qu'aucun relais IA n'est configuré (l'adaptateur affiche alors
   * « Relais IA non configuré »).
   */
  function accesRelais(): { relayUrl: string | undefined; jetonRelais: string | undefined } {
    const urlWorker = useConnexionAuthentificationStore().connexion?.relayUrl
    const jetonSession = useAuthStore().jeton
    if (connexion.value === null || !urlWorker || !jetonSession) {
      return { relayUrl: undefined, jetonRelais: undefined }
    }
    return { relayUrl: `${urlWorker}/relais-ia`, jetonRelais: jetonSession }
  }

  return { connexion, enChargement, charger, enregistrer, effacer, accesRelais, testerConnexion }
})
