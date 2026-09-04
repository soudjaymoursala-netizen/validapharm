import { defineStore } from 'pinia'
import { ref } from 'vue'
import { GitHubConnector } from '../../connecteurs/github/GitHubConnector'
import { db, type EnregistrementConnexionGitHub } from '../../persistance/db'

export interface SaisieConnexionGitHub {
  owner: string
  repo: string
  branche: string
  jeton: string
}

export type ResultatTestConnexion =
  { ok: true; shaBranche: string } | { ok: false; message: string }

const IDENTIFIANT_ENREGISTREMENT_UNIQUE = 'unique'

/**
 * Store de Configuration client (FDS §2, "Configuration client") pour la
 * connexion au dépôt GitHub dédié — le jeton est stocké
 * exclusivement dans le stockage du navigateur (IndexedDB via Dexie),
 * jamais dans un fichier suivi par Git, jamais journalisé (ni dans
 * `audit_log`, ni dans aucun message affiché à l'écran).
 *
 * @requirement SDS §5
 */
export const useConnexionGitHubStore = defineStore('connexionGitHub', () => {
  const connexion = ref<EnregistrementConnexionGitHub | null>(null)
  const enChargement = ref(false)

  async function charger(): Promise<void> {
    enChargement.value = true
    try {
      connexion.value = (await db.connexionGitHub.get(IDENTIFIANT_ENREGISTREMENT_UNIQUE)) ?? null
    } finally {
      enChargement.value = false
    }
  }

  async function enregistrer(saisie: SaisieConnexionGitHub): Promise<void> {
    const enregistrement: EnregistrementConnexionGitHub = {
      id: IDENTIFIANT_ENREGISTREMENT_UNIQUE,
      owner: saisie.owner.trim(),
      repo: saisie.repo.trim(),
      branche: saisie.branche.trim() || 'main',
      jeton: saisie.jeton.trim(),
    }
    await db.connexionGitHub.put(enregistrement)
    connexion.value = enregistrement
  }

  async function effacer(): Promise<void> {
    await db.connexionGitHub.delete(IDENTIFIANT_ENREGISTREMENT_UNIQUE)
    connexion.value = null
  }

  /**
   * Vérifie réellement la configuration en appelant l'API GitHub (lecture
   * du SHA de branche) — pas une simple validation de forme des champs.
   */
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
