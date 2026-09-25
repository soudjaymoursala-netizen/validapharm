import { defineStore } from 'pinia'
import { ref } from 'vue'
import { GitHubConnector } from '../../connecteurs/github/GitHubConnector'
import { useAuthStore } from './useAuthStore'
import { useConnexionAuthentificationStore } from './useConnexionAuthentificationStore'

/** Saisie admin : `jeton` vide = conserver le PAT déjà enregistré côté serveur. */
export interface SaisieConnexionGitHub {
  owner: string
  repo: string
  branche: string
  jeton: string
}

/**
 * Configuration lue côté navigateur — **sans le PAT** (25/09/2026) : le
 * Worker ne le renvoie plus jamais, il l'ajoute lui-même dans son relais
 * GitHub (`/github/api/...`). Seul un indicateur de présence est exposé.
 */
export interface ConnexionGitHub {
  owner: string
  repo: string
  branche: string
  jetonConfigure: boolean
}

export type ResultatTestConnexion =
  { ok: true; shaBranche: string } | { ok: false; message: string }

export type ResultatEnregistrementParametreInstallation =
  { ok: true } | { ok: false; erreur: string }

const CLE_PARAMETRE = 'github'

/**
 * Store de Configuration client ("Configuration client") pour la
 * connexion au dépôt GitHub dédié — paramètre **global à l'installation**
 * (un seul dépôt pour toute l'organisation), désormais stocké côté
 * Worker/D1 (`parametres_installation`) plutôt que dans IndexedDB par
 * navigateur : un stockage seulement local ne survivait jamais à un
 * changement d'appareil/poste, obligeant chacun à ressaisir le jeton PAT
 * sur chaque nouveau poste (signalé par l'utilisateur). Écriture réservée
 * à un admin ; le PAT n'est plus jamais relu par le navigateur — tous les
 * appels GitHub passent par le relais du Worker (`creerConnecteur`).
 */
export const useConnexionGitHubStore = defineStore('connexionGitHub', () => {
  const connexion = ref<ConnexionGitHub | null>(null)
  const enChargement = ref(false)

  /**
   * `ConfigurationClient.vue` enchaîne cet appel avec `useConnexionRelaisIAStore.
   * charger()`/`useConnexionAuthentificationStore.charger()` dans un même
   * `onMounted` — sans ce `catch`, une panne réseau transitoire ici
   * (Worker injoignable, délai dépassé) levait une exception non rattrapée
   * qui interrompait aussi le chargement des deux sections suivantes,
   * laissant croire que toute la configuration (GitHub + Relais IA) avait
   * disparu. Même principe que `useClientsStore.chargerClients()`.
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
        ? {
            owner: valeur.owner ?? '',
            repo: valeur.repo ?? '',
            branche: valeur.branche || 'main',
            jetonConfigure: valeur.jetonConfigure === 'oui',
          }
        : null
    } catch {
      // Panne réseau transitoire : la configuration déjà chargée (le cas
      // échéant) reste affichée, jamais effacée sur un simple incident.
    } finally {
      enChargement.value = false
    }
  }

  async function enregistrer(
    saisie: SaisieConnexionGitHub,
  ): Promise<ResultatEnregistrementParametreInstallation> {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) return { ok: false, erreur: 'relais_non_configure' }

    const valeur = {
      owner: saisie.owner.trim(),
      repo: saisie.repo.trim(),
      branche: saisie.branche.trim() || 'main',
      jeton: saisie.jeton.trim(),
    }
    const resultat = await api.enregistrerParametreInstallation(
      authStore.jeton,
      CLE_PARAMETRE,
      valeur,
    )
    if (!resultat.ok) return { ok: false, erreur: resultat.erreur }
    connexion.value = {
      owner: valeur.owner,
      repo: valeur.repo,
      branche: valeur.branche,
      jetonConfigure: true,
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
   * Connecteur du dépôt de l'installation, **toujours en mode relais** :
   * les appels passent par le Worker avec la session courante, qui ajoute
   * le PAT côté serveur. `null` si aucun dépôt n'est configuré ou sans
   * session. Seul moyen de construire un connecteur pour ce dépôt.
   */
  async function creerConnecteur(): Promise<GitHubConnector | null> {
    await charger()
    const authStore = useAuthStore()
    const connexionAuth = useConnexionAuthentificationStore()
    if (!connexionAuth.connexion) await connexionAuth.charger()
    const relayUrl = connexionAuth.connexion?.relayUrl
    if (connexion.value === null || !relayUrl || !authStore.jeton) return null
    return new GitHubConnector({
      owner: connexion.value.owner,
      repo: connexion.value.repo,
      branche: connexion.value.branche,
      relais: { url: relayUrl, jetonSession: authStore.jeton },
    })
  }

  /** Vérifie réellement la configuration en appelant l'API GitHub (lecture du SHA de branche) — pas une simple validation de forme des champs. */
  async function testerConnexion(): Promise<ResultatTestConnexion> {
    const connecteur = await creerConnecteur()
    if (connecteur === null) {
      return { ok: false, message: 'Aucune configuration enregistrée.' }
    }
    try {
      const shaBranche = await connecteur.shaBrancheActuel()
      return { ok: true, shaBranche }
    } catch (erreur) {
      return {
        ok: false,
        message: erreur instanceof Error ? erreur.message : 'Erreur inconnue.',
      }
    }
  }

  return {
    connexion,
    enChargement,
    charger,
    enregistrer,
    effacer,
    creerConnecteur,
    testerConnexion,
  }
})
