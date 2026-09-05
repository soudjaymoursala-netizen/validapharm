import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DriveConnector } from '../../connecteurs/drive/DriveConnector'
import { db, type EnregistrementConnexionDrive } from '../../persistance/db'

export interface SaisieConnexionDrive {
  dossierId: string
  jeton: string
}

export type ResultatTestConnexionDrive =
  { ok: true; nomDossier: string } | { ok: false; message: string }

/**
 * Store de configuration du miroir Drive — une connexion par
 * client (`client_id`), jamais globale (contrairement à GitHub) : le
 * dossier et le jeton sont isolés par client. Toutes les méthodes
 * prennent donc explicitement le `client_id` concerné, plutôt qu'un état
 * de connexion unique comme `useConnexionGitHubStore`.
 */
export const useConnexionDriveStore = defineStore('connexionDrive', () => {
  const connexion = ref<EnregistrementConnexionDrive | null>(null)
  const enChargement = ref(false)

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      connexion.value = (await db.connexionDrive.get(clientId)) ?? null
    } finally {
      enChargement.value = false
    }
  }

  async function enregistrer(clientId: string, saisie: SaisieConnexionDrive): Promise<void> {
    const enregistrement: EnregistrementConnexionDrive = {
      client_id: clientId,
      dossierId: saisie.dossierId.trim(),
      jeton: saisie.jeton.trim(),
    }
    await db.connexionDrive.put(enregistrement)
    connexion.value = enregistrement
  }

  async function effacer(clientId: string): Promise<void> {
    await db.connexionDrive.delete(clientId)
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
