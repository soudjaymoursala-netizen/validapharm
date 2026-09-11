import { defineStore } from 'pinia'
import { ref } from 'vue'
import { AuthApiClient } from '../../connecteurs/auth/AuthApiClient'
import { db, type EnregistrementConnexionAuthentification } from '../../persistance/db'

export interface SaisieConnexionAuthentification {
  relayUrl: string
}

export type ResultatTestConnexionAuthentification = { ok: true } | { ok: false; message: string }

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

  /**
   * Vérifie réellement la joignabilité du Worker à l'URL saisie — jamais
   * une authentification ici : à ce stade l'utilisateur n'a par
   * construction aucune session (cet écran sert justement à indiquer où se
   * connecter avant de se connecter), voir `routeur.ts` du Worker (`GET
   * /sante`, ouvert à tous).
   */
  async function testerConnexion(): Promise<ResultatTestConnexionAuthentification> {
    if (connexion.value === null) {
      return { ok: false, message: 'Aucune configuration enregistrée.' }
    }
    try {
      const api = new AuthApiClient(connexion.value.relayUrl)
      const resultat = await api.verifierSante()
      if (!resultat.ok) return { ok: false, message: `Échec (${resultat.erreur}).` }
      return { ok: true }
    } catch (erreur) {
      return { ok: false, message: erreur instanceof Error ? erreur.message : 'Erreur inconnue.' }
    }
  }

  return { connexion, enChargement, charger, enregistrer, testerConnexion }
})
