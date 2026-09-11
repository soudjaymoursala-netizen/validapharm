import { defineStore } from 'pinia'
import { ref } from 'vue'
import { GitHubConnector } from '../../connecteurs/github/GitHubConnector'
import { useAuthStore } from './useAuthStore'

export interface SaisieConnexionGitHub {
  owner: string
  repo: string
  branche: string
  jeton: string
}

export type ConnexionGitHub = SaisieConnexionGitHub

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
 * sur chaque nouveau poste (signalé par l'utilisateur). Lecture ouverte à
 * tout utilisateur authentifié (le jeton doit être utilisable directement
 * depuis son navigateur), écriture réservée à un admin (voir
 * `routeur.ts` du Worker).
 */
export const useConnexionGitHubStore = defineStore('connexionGitHub', () => {
  const connexion = ref<ConnexionGitHub | null>(null)
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
          ? (resultat.donnees.parametre.valeur as unknown as ConnexionGitHub)
          : null
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

    const valeur: ConnexionGitHub = {
      owner: saisie.owner.trim(),
      repo: saisie.repo.trim(),
      branche: saisie.branche.trim() || 'main',
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

  /** Vérifie réellement la configuration en appelant l'API GitHub (lecture du SHA de branche) — pas une simple validation de forme des champs. */
  async function testerConnexion(): Promise<ResultatTestConnexion> {
    if (connexion.value === null) {
      return { ok: false, message: 'Aucune configuration enregistrée.' }
    }
    const connecteur = new GitHubConnector(connexion.value)
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

  return { connexion, enChargement, charger, enregistrer, effacer, testerConnexion }
})
