import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DriveConnector, type FichierAMirroir } from '../../connecteurs/drive/DriveConnector'
import { etatMiroirDriveAMigrer } from '../../persistance/db'
import { useAuthStore } from './useAuthStore'
import { useConnexionGitHubStore } from './useConnexionGitHubStore'

export type ResultatMiroir = { ok: true; nbFichiers: number } | { ok: false; message: string }

/**
 * Orchestrateur du miroir Drive — relie le connecteur GitHub
 * (source de vérité, un seul dépôt pour toute l'installation) au
 * connecteur Drive (par client) : lit l'intégralité de l'état courant
 * depuis GitHub et l'écrit dans le dossier Drive dédié du client
 * (OQ-41 : "le miroir Drive reflète l'état du dépôt Git à l'identique").
 * L'horodatage du dernier miroir réussi est désormais stocké côté
 * Worker/D1 (Phase 9d du chantier de migration D1) plutôt que dans
 * IndexedDB par navigateur.
 *
 * Déclenchement manuel uniquement dans cet incrément ("Sauvegarder
 * maintenant") — le déclenchement automatique par heuristique
 * d'inactivité/fermeture de session reste backlog : il
 * suppose une détection de fin de session qui n'existe pas encore dans
 * l'application, et un faux déclenchement automatique non testé serait
 * pire qu'une absence honnête de cette capacité.
 */
export const useMiroirDriveStore = defineStore('miroirDrive', () => {
  const miroirEnCours = ref(false)

  /**
   * Envoie au serveur l'horodatage capturé depuis l'ancienne table
   * IndexedDB locale (`etatMiroirDriveAMigrer`) juste avant sa
   * suppression — n'a d'effet réel qu'une seule fois par client (voir
   * migration Dexie v57, `persistance/db.ts`). L'existant côté serveur
   * gagne toujours.
   */
  async function migrerEtatMiroirDriveLocalVersServeur(clientId: string): Promise<void> {
    const index = etatMiroirDriveAMigrer.findIndex((e) => e.client_id === clientId)
    if (index === -1) return
    const locale = etatMiroirDriveAMigrer[index]
    if (!locale || locale.dernierMiroirReussi === null) {
      if (index !== -1) etatMiroirDriveAMigrer.splice(index, 1)
      return
    }

    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) return
    const existant = await api.obtenirEtatMiroirDrive(authStore.jeton, clientId)
    // Copie locale conservée tant que l'écriture n'est pas confirmée.
    if (!existant.ok) return
    if (existant.donnees.etatMiroirDrive === null) {
      const ecriture = await api.enregistrerEtatMiroirDrive(
        authStore.jeton,
        clientId,
        locale.dernierMiroirReussi,
      )
      if (!ecriture.ok) return
    }
    etatMiroirDriveAMigrer.splice(index, 1)
  }

  async function miroirVersDrive(clientId: string): Promise<ResultatMiroir> {
    const githubConnecteur = await useConnexionGitHubStore().creerConnecteur()
    if (githubConnecteur === null) {
      return {
        ok: false,
        message:
          'Aucune connexion GitHub configurée — le miroir Drive lit son état depuis GitHub, pas depuis le cache local.',
      }
    }

    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) {
      return { ok: false, message: 'Aucune configuration Drive enregistrée pour ce client.' }
    }
    const resultatConnexion = await api.obtenirConnexionDrive(authStore.jeton, clientId)
    const connexionDrive =
      resultatConnexion.ok && resultatConnexion.donnees.connexionDrive
        ? resultatConnexion.donnees.connexionDrive
        : null
    if (connexionDrive === null) {
      return { ok: false, message: 'Aucune configuration Drive enregistrée pour ce client.' }
    }

    miroirEnCours.value = true
    try {
      const arborescence = await githubConnecteur.chargerArborescence()
      const fichiers: FichierAMirroir[] = await Promise.all(
        arborescence.map(async (entree) => ({
          chemin: entree.chemin,
          contenu: await githubConnecteur.lireBlob(entree.sha),
        })),
      )

      const driveConnecteur = new DriveConnector(connexionDrive)
      const confirmation = await driveConnecteur.miroir(fichiers)

      const etat = await api.enregistrerEtatMiroirDrive(
        authStore.jeton,
        clientId,
        new Date().toISOString(),
      )
      if (!etat.ok) {
        // Le miroir a bien eu lieu, mais sa date n'est pas tracée : le dire,
        // plutôt qu'un succès qui laisserait croire l'état à jour.
        return {
          ok: false,
          message: `${confirmation.nbFichiers} fichier(s) copié(s) vers Drive, mais la date du dernier miroir n'a pas pu être enregistrée (${etat.erreur}).`,
        }
      }
      return { ok: true, nbFichiers: confirmation.nbFichiers }
    } catch (erreur) {
      return {
        ok: false,
        message: erreur instanceof Error ? erreur.message : 'Erreur inconnue.',
      }
    } finally {
      miroirEnCours.value = false
    }
  }

  async function obtenirDernierMiroirReussi(clientId: string): Promise<string | null> {
    try {
      await migrerEtatMiroirDriveLocalVersServeur(clientId)
    } catch {
      // Nouvel essai au prochain appel — ne bloque jamais l'écran.
    }

    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) return null
    const resultat = await api.obtenirEtatMiroirDrive(authStore.jeton, clientId)
    return resultat.ok ? (resultat.donnees.etatMiroirDrive?.dernierMiroirReussi ?? null) : null
  }

  return { miroirEnCours, miroirVersDrive, obtenirDernierMiroirReussi }
})
