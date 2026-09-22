import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ConnexionDriveWire } from '../../connecteurs/auth/AuthApiClient'
import { DriveConnector } from '../../connecteurs/drive/DriveConnector'
import { connexionDriveAMigrer } from '../../persistance/db'
import { useAuthStore } from './useAuthStore'

export interface SaisieConnexionDrive {
  dossierId: string
  jeton: string
}

export type ResultatTestConnexionDrive =
  { ok: true; nomDossier: string } | { ok: false; message: string }

function wireVersConnexion(w: ConnexionDriveWire): {
  client_id: string
  dossierId: string
  jeton: string
} {
  return { client_id: w.clientId, dossierId: w.dossierId, jeton: w.jeton }
}

/**
 * Store de configuration du miroir Drive — une connexion par
 * client (`client_id`), jamais globale (contrairement à GitHub) : le
 * dossier et le jeton sont isolés par client. Toutes les méthodes
 * prennent donc explicitement le `client_id` concerné, plutôt qu'un état
 * de connexion unique comme `useConnexionGitHubStore`. Désormais stocké
 * côté Worker/D1 (Phase 9d du chantier de migration D1) plutôt que dans
 * IndexedDB par navigateur — même correctif que pour le dépôt
 * GitHub/Relais IA : un stockage seulement local ne survivait jamais à un
 * changement d'appareil/poste.
 */
export const useConnexionDriveStore = defineStore('connexionDrive', () => {
  const connexion = ref<{ client_id: string; dossierId: string; jeton: string } | null>(null)
  const enChargement = ref(false)

  /**
   * Envoie au serveur la configuration Drive capturée depuis l'ancienne
   * table IndexedDB locale (`connexionDriveAMigrer`) juste avant sa
   * suppression — n'a d'effet réel qu'une seule fois par client (voir
   * migration Dexie v57, `persistance/db.ts`). L'existant côté serveur
   * gagne toujours (jamais d'écrasement d'une configuration déjà migrée
   * depuis un autre appareil).
   */
  async function migrerConnexionDriveLocaleVersServeur(clientId: string): Promise<void> {
    const index = connexionDriveAMigrer.findIndex((c) => c.client_id === clientId)
    if (index === -1) return
    const locale = connexionDriveAMigrer[index]
    if (!locale) return

    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) return
    const existant = await api.obtenirConnexionDrive(authStore.jeton, clientId)
    if (existant.ok && existant.donnees.connexionDrive === null) {
      await api.enregistrerConnexionDrive(authStore.jeton, clientId, {
        dossierId: locale.dossierId,
        jeton: locale.jeton,
      })
    }
    connexionDriveAMigrer.splice(index, 1)
  }

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      try {
        await migrerConnexionDriveLocaleVersServeur(clientId)
      } catch {
        // Nouvel essai au prochain chargement — ne bloque jamais l'écran.
      }

      const authStore = useAuthStore()
      const api = await authStore.client()
      if (!api || !authStore.jeton) {
        connexion.value = null
        return
      }
      const resultat = await api.obtenirConnexionDrive(authStore.jeton, clientId)
      connexion.value =
        resultat.ok && resultat.donnees.connexionDrive
          ? wireVersConnexion(resultat.donnees.connexionDrive)
          : null
    } catch {
      // Panne réseau transitoire : la configuration déjà chargée (le cas
      // échéant) reste affichée, jamais effacée sur un simple incident.
    } finally {
      enChargement.value = false
    }
  }

  async function enregistrer(clientId: string, saisie: SaisieConnexionDrive): Promise<void> {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) return

    const resultat = await api.enregistrerConnexionDrive(authStore.jeton, clientId, {
      dossierId: saisie.dossierId.trim(),
      jeton: saisie.jeton.trim(),
    })
    if (resultat.ok) connexion.value = wireVersConnexion(resultat.donnees.connexionDrive)
  }

  async function effacer(clientId: string): Promise<void> {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (api && authStore.jeton) {
      await api.effacerConnexionDrive(authStore.jeton, clientId)
    }
    connexion.value = null
  }

  async function testerConnexion(): Promise<ResultatTestConnexionDrive> {
    if (connexion.value === null) {
      return { ok: false, message: 'Aucune configuration enregistrée.' }
    }
    const connecteur = new DriveConnector(connexion.value)
    try {
      const { nom } = await connecteur.verifierDossier()
      return { ok: true, nomDossier: nom }
    } catch (erreur) {
      return {
        ok: false,
        message: erreur instanceof Error ? erreur.message : 'Erreur inconnue.',
      }
    }
  }

  return { connexion, enChargement, charger, enregistrer, effacer, testerConnexion }
})
