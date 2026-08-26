import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DriveConnector, type FichierAMirroir } from '../../connecteurs/drive/DriveConnector'
import { GitHubConnector } from '../../connecteurs/github/GitHubConnector'
import { db } from '../../persistance/db'

export type ResultatMiroir = { ok: true; nbFichiers: number } | { ok: false; message: string }

const IDENTIFIANT_ENREGISTREMENT_UNIQUE = 'unique'

/**
 * Orchestrateur du miroir Drive (SDS §5bis) — relie le connecteur GitHub
 * (source de vérité, un seul dépôt pour toute l'installation) au
 * connecteur Drive (par client) : lit l'intégralité de l'état courant
 * depuis GitHub et l'écrit dans le dossier Drive dédié du client
 * (OQ-41 : "le miroir Drive reflète l'état du dépôt Git à l'identique").
 *
 * @requirement SDS §5bis, URS-NF-010/011/047
 *
 * Déclenchement manuel uniquement dans cet incrément ("Sauvegarder
 * maintenant", URS-NF-011) — le déclenchement automatique par heuristique
 * d'inactivité/fermeture de session (SDS §5bis) reste backlog : il
 * suppose une détection de fin de session qui n'existe pas encore dans
 * l'application, et un faux déclenchement automatique non testé serait
 * pire qu'une absence honnête de cette capacité.
 */
export const useMiroirDriveStore = defineStore('miroirDrive', () => {
  const miroirEnCours = ref(false)

  async function miroirVersDrive(clientId: string): Promise<ResultatMiroir> {
    const connexionGitHub = await db.connexionGitHub.get(IDENTIFIANT_ENREGISTREMENT_UNIQUE)
    if (connexionGitHub === undefined) {
      return {
        ok: false,
        message:
          'Aucune connexion GitHub configurée — le miroir Drive lit son état depuis GitHub, pas depuis le cache local.',
      }
    }
    const connexionDrive = await db.connexionDrive.get(clientId)
    if (connexionDrive === undefined) {
      return { ok: false, message: 'Aucune configuration Drive enregistrée pour ce client.' }
    }

    miroirEnCours.value = true
    try {
      const githubConnecteur = new GitHubConnector(connexionGitHub)
      const arborescence = await githubConnecteur.chargerArborescence()
      const fichiers: FichierAMirroir[] = await Promise.all(
        arborescence.map(async (entree) => ({
          chemin: entree.chemin,
          contenu: await githubConnecteur.lireBlob(entree.sha),
        })),
      )

      const driveConnecteur = new DriveConnector(connexionDrive)
      const confirmation = await driveConnecteur.miroir(fichiers)

      await db.etatMiroirDrive.put({
        client_id: clientId,
        dernierMiroirReussi: new Date().toISOString(),
      })
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
    const etat = await db.etatMiroirDrive.get(clientId)
    return etat?.dernierMiroirReussi ?? null
  }

  return { miroirEnCours, miroirVersDrive, obtenirDernierMiroirReussi }
})
