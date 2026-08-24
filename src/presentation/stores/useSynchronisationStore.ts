import { defineStore } from 'pinia'
import { ref } from 'vue'
import { GitHubConnector, type FichierAEcrire } from '../../connecteurs/github/GitHubConnector'
import { ConflitShaError } from '../../connecteurs/github/erreurs'
import { db } from '../../persistance/db'

export type ResultatSynchronisation =
  | { ok: true; nbFichiers: number }
  | { ok: false; conflit: true }
  | { ok: false; conflit: false; message: string }

export type ResultatRecuperation = { ok: true; nbFichiers: number } | { ok: false; message: string }

const IDENTIFIANT_ENREGISTREMENT_UNIQUE = 'unique'

/**
 * Orchestrateur de synchronisation (SDS §3/§5) — relie le connecteur
 * GitHub (pur, sans état) aux stores métier. Aucune règle de décision
 * ici au-delà de l'orchestration : la détection de conflit et
 * l'atomicité restent entièrement dans `GitHubConnector`.
 *
 * @requirement SDS §3, §5, URS-NF-012, cadrage principe n°3 ("zéro perte
 * de données au changement de machine")
 *
 * Portée délibérément limitée à cet incrément : `synchroniser()` pousse
 * l'intégralité des projets/sections locaux (pas de synchronisation
 * incrémentale champ par champ), et `recupererDepuisGitHub()` écrase le
 * cache local avec l'état distant sans tentative de fusion — chemin de
 * récupération honnête après conflit, pas l'écran de résolution
 * field-par-field de FDS §3.6 (backlog séparé).
 */
export const useSynchronisationStore = defineStore('synchronisation', () => {
  const synchronisationEnCours = ref(false)
  const derniereSynchronisation = ref<string | null>(null)

  async function obtenirConnecteur(): Promise<GitHubConnector | null> {
    const connexion = await db.connexionGitHub.get(IDENTIFIANT_ENREGISTREMENT_UNIQUE)
    if (connexion === undefined) return null
    return new GitHubConnector(connexion)
  }

  async function obtenirEtat(): Promise<{ shaBrancheConnue: string | null }> {
    const etat = await db.etatSynchronisation.get(IDENTIFIANT_ENREGISTREMENT_UNIQUE)
    return { shaBrancheConnue: etat?.shaBrancheConnue ?? null }
  }

  async function enregistrerNouvelEtat(shaBrancheConnue: string): Promise<void> {
    const maintenant = new Date().toISOString()
    await db.etatSynchronisation.put({
      id: IDENTIFIANT_ENREGISTREMENT_UNIQUE,
      shaBrancheConnue,
      derniereSynchronisation: maintenant,
    })
    derniereSynchronisation.value = maintenant
  }

  /**
   * Pousse l'intégralité des projets et sections locaux vers GitHub en
   * une écriture groupée atomique. Sur premier appel (aucun SHA connu),
   * lit d'abord le SHA de branche actuel avant d'écrire.
   */
  async function synchroniser(): Promise<ResultatSynchronisation> {
    const connecteur = await obtenirConnecteur()
    if (connecteur === null) {
      return { ok: false, conflit: false, message: 'Aucune connexion GitHub configurée.' }
    }

    synchronisationEnCours.value = true
    try {
      let { shaBrancheConnue } = await obtenirEtat()
      if (shaBrancheConnue === null) {
        shaBrancheConnue = await connecteur.shaBrancheActuel()
      }

      const [projets, sections] = await Promise.all([db.projects.toArray(), db.sections.toArray()])
      const fichiers: FichierAEcrire[] = [
        ...projets.map((projet) => ({
          chemin: `data/projects/${projet.id}.json`,
          contenu: JSON.stringify(projet, null, 2),
        })),
        ...sections.map((section) => ({
          chemin: `data/sections/${section.id}.json`,
          contenu: JSON.stringify(section, null, 2),
        })),
      ]

      if (fichiers.length === 0) {
        return { ok: true, nbFichiers: 0 }
      }

      const confirmation = await connecteur.ecrireGroupe(
        fichiers,
        shaBrancheConnue,
        `sync ${fichiers.length} fichier(s)`,
      )
      await enregistrerNouvelEtat(confirmation.nouvelleShaBranche)
      return { ok: true, nbFichiers: fichiers.length }
    } catch (erreur) {
      if (erreur instanceof ConflitShaError) {
        return { ok: false, conflit: true }
      }
      return {
        ok: false,
        conflit: false,
        message: erreur instanceof Error ? erreur.message : 'Erreur inconnue.',
      }
    } finally {
      synchronisationEnCours.value = false
    }
  }

  /**
   * Récupère l'état distant et écrase le cache local — chemin de
   * récupération après conflit détecté par `synchroniser()`. Écrasement
   * délibéré (pas de fusion) : à utiliser en connaissance de cause,
   * jamais déclenché automatiquement.
   */
  async function recupererDepuisGitHub(): Promise<ResultatRecuperation> {
    const connecteur = await obtenirConnecteur()
    if (connecteur === null) {
      return { ok: false, message: 'Aucune connexion GitHub configurée.' }
    }

    synchronisationEnCours.value = true
    try {
      const arborescence = await connecteur.chargerArborescence()
      const entreesProjets = arborescence.filter((e) => e.chemin.startsWith('data/projects/'))
      const entreesSections = arborescence.filter((e) => e.chemin.startsWith('data/sections/'))

      for (const entree of entreesProjets) {
        const contenu = await connecteur.lireBlob(entree.sha)
        await db.projects.put(JSON.parse(contenu))
      }
      for (const entree of entreesSections) {
        const contenu = await connecteur.lireBlob(entree.sha)
        await db.sections.put(JSON.parse(contenu))
      }

      const shaActuel = await connecteur.shaBrancheActuel()
      await enregistrerNouvelEtat(shaActuel)
      return { ok: true, nbFichiers: entreesProjets.length + entreesSections.length }
    } catch (erreur) {
      return {
        ok: false,
        message: erreur instanceof Error ? erreur.message : 'Erreur inconnue.',
      }
    } finally {
      synchronisationEnCours.value = false
    }
  }

  return {
    synchronisationEnCours,
    derniereSynchronisation,
    synchroniser,
    recupererDepuisGitHub,
  }
})
