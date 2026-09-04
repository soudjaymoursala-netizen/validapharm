import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { AuthApiClient, type UtilisateurWire } from '../../connecteurs/auth/AuthApiClient'
import { db } from '../../persistance/db'
import { useConnexionAuthentificationStore } from './useConnexionAuthentificationStore'

const IDENTIFIANT_SESSION_UNIQUE = 'unique'

export type ResultatLogin = { ok: true } | { ok: false; erreur: string }

/**
 * Session d'authentification réelle (TD-046) — remplace le verrou local
 * (TD-033) comme unique système d'identité de l'application : un jeton
 * JWT obtenu via `/auth/login`, vérifié côté serveur à chaque appel.
 *
 * @requirement TD-046
 */
export const useAuthStore = defineStore('auth', () => {
  const utilisateur = ref<UtilisateurWire | null>(null)
  const jeton = ref<string | null>(null)
  const enChargement = ref(false)
  /** Distingue "pas encore relu depuis IndexedDB" de "relu, aucune session" — la garde de routeur en dépend. */
  const sessionInitialisee = ref(false)

  const estConnecte = computed(() => utilisateur.value !== null && jeton.value !== null)
  const estAdmin = computed(() => utilisateur.value?.role === 'admin')

  async function client(): Promise<AuthApiClient | null> {
    const connexionStore = useConnexionAuthentificationStore()
    if (!connexionStore.connexion) await connexionStore.charger()
    const relayUrl = connexionStore.connexion?.relayUrl
    if (!relayUrl) return null
    return new AuthApiClient(relayUrl)
  }

  /** Relit la session persistée (IndexedDB) — appelé au démarrage de l'application. */
  async function charger(): Promise<void> {
    enChargement.value = true
    try {
      const session = await db.sessionAuthentification.get(IDENTIFIANT_SESSION_UNIQUE)
      if (session) {
        jeton.value = session.jeton
        utilisateur.value = session.utilisateur
      }
    } finally {
      enChargement.value = false
      sessionInitialisee.value = true
    }
  }

  async function login(email: string, motDePasse: string): Promise<ResultatLogin> {
    const api = await client()
    if (!api) return { ok: false, erreur: 'relais_non_configure' }

    const resultat = await api.login(email, motDePasse)
    if (!resultat.ok) return { ok: false, erreur: resultat.erreur }

    jeton.value = resultat.donnees.jeton
    utilisateur.value = resultat.donnees.utilisateur
    await db.sessionAuthentification.put({
      id: IDENTIFIANT_SESSION_UNIQUE,
      jeton: resultat.donnees.jeton,
      utilisateur: resultat.donnees.utilisateur,
    })
    return { ok: true }
  }

  async function deconnecter(): Promise<void> {
    jeton.value = null
    utilisateur.value = null
    await db.sessionAuthentification.delete(IDENTIFIANT_SESSION_UNIQUE)
  }

  /** Re-authentification pour un geste sensible (archivage, suppression définitive) — remplace le verrou local TD-033. */
  async function verifierMotDePasse(motDePasse: string): Promise<boolean> {
    if (!jeton.value) return false
    const api = await client()
    if (!api) return false
    const resultat = await api.verifierMotDePasse(jeton.value, motDePasse)
    return resultat.ok && resultat.donnees.valide
  }

  async function modifierProfil(changements: { nom?: string; prenom?: string }): Promise<boolean> {
    if (!jeton.value) return false
    const api = await client()
    if (!api) return false
    const resultat = await api.modifierProfil(jeton.value, changements)
    if (!resultat.ok) return false
    utilisateur.value = resultat.donnees.utilisateur
    await db.sessionAuthentification.put({
      id: IDENTIFIANT_SESSION_UNIQUE,
      jeton: jeton.value,
      utilisateur: resultat.donnees.utilisateur,
    })
    return true
  }

  async function changerMotDePasse(
    motDePasseActuel: string,
    nouveauMotDePasse: string,
  ): Promise<{ ok: true } | { ok: false; erreur: string }> {
    if (!jeton.value) return { ok: false, erreur: 'non_authentifie' }
    const api = await client()
    if (!api) return { ok: false, erreur: 'relais_non_configure' }
    const resultat = await api.changerMotDePasse(jeton.value, motDePasseActuel, nouveauMotDePasse)
    if (!resultat.ok) return { ok: false, erreur: resultat.erreur }
    return { ok: true }
  }

  return {
    utilisateur,
    jeton,
    enChargement,
    sessionInitialisee,
    estConnecte,
    estAdmin,
    client,
    charger,
    login,
    deconnecter,
    verifierMotDePasse,
    modifierProfil,
    changerMotDePasse,
  }
})
