import { defineStore } from 'pinia'
import { ref } from 'vue'
import { GitHubConnector, type FichierAEcrire } from '../../connecteurs/github/GitHubConnector'
import { ConflitShaError, FichierIntrouvableError } from '../../connecteurs/github/erreurs'
import {
  appliquerResolutions,
  construireMotifResolution,
  diffChamps,
  type ChampDivergent,
  type ChoixResolutionChamp,
} from '../../logique-metier/resolution-conflit/diffChamps'
import { db } from '../../persistance/db'

export type ResultatSynchronisation =
  | { ok: true; nbFichiers: number }
  | { ok: false; conflit: true }
  | { ok: false; conflit: false; message: string }

export type ResultatRecuperation = { ok: true; nbFichiers: number } | { ok: false; message: string }

export interface ConflitEnregistrement {
  type: 'project' | 'section'
  id: string
  local: Record<string, unknown>
  distant: Record<string, unknown>
  divergences: ChampDivergent[]
}

// Champs qui divergent par construction entre deux copies indépendantes
// sans constituer un conflit de contenu à faire trancher par l'utilisateur
// (FDS §3.6 : seuls les champs de contenu métier sont présentés).
const CHAMPS_IGNORES_DIFF = ['updated_at', 'audit_log', 'revisions', 'created_at']

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

  /**
   * Compare chaque projet/section local à sa contrepartie distante et
   * retourne les enregistrements dont au moins un champ diverge
   * réellement (FDS §3.6). Un enregistrement absent côté distant (jamais
   * encore poussé) n'est jamais un conflit.
   *
   * Portée assumée (voir en-tête du fichier) : diff au niveau champ
   * scalaire uniquement — un enregistrement dont seul `tables` diverge
   * sera signalé avec `tables` comme unique champ divergent (résolution
   * "tout ou rien" sur ce champ), pas une résolution ligne par ligne.
   */
  async function analyserConflit(): Promise<ConflitEnregistrement[]> {
    const connecteur = await obtenirConnecteur()
    if (connecteur === null) return []

    const [projets, sections] = await Promise.all([db.projects.toArray(), db.sections.toArray()])
    const conflits: ConflitEnregistrement[] = []

    for (const projet of projets) {
      const distant = await lireDistantOuNull(connecteur, `data/projects/${projet.id}.json`)
      if (distant === null) continue
      const divergences = diffChamps(
        projet as unknown as Record<string, unknown>,
        distant,
        CHAMPS_IGNORES_DIFF,
      )
      if (divergences.length > 0) {
        conflits.push({
          type: 'project',
          id: projet.id,
          local: projet as unknown as Record<string, unknown>,
          distant,
          divergences,
        })
      }
    }
    for (const section of sections) {
      const distant = await lireDistantOuNull(connecteur, `data/sections/${section.id}.json`)
      if (distant === null) continue
      const divergences = diffChamps(
        section as unknown as Record<string, unknown>,
        distant,
        CHAMPS_IGNORES_DIFF,
      )
      if (divergences.length > 0) {
        conflits.push({
          type: 'section',
          id: section.id,
          local: section as unknown as Record<string, unknown>,
          distant,
          divergences,
        })
      }
    }
    return conflits
  }

  /**
   * Applique les décisions de résolution prises pour chaque conflit
   * signalé par `analyserConflit()`, journalise le motif structuré
   * (FDS §3.6 : "capture, pour chaque champ en conflit, la décision
   * retenue"), puis relance `synchroniser()` pour pousser l'état fusionné.
   */
  async function confirmerResolutionConflits(
    resolutions: ReadonlyArray<{ conflit: ConflitEnregistrement; choix: ChoixResolutionChamp[] }>,
  ): Promise<ResultatSynchronisation> {
    const connecteur = await obtenirConnecteur()
    if (connecteur === null) {
      return { ok: false, conflit: false, message: 'Aucune connexion GitHub configurée.' }
    }

    const maintenant = new Date().toISOString()
    for (const { conflit, choix } of resolutions) {
      const motif = construireMotifResolution(choix)
      if (conflit.type === 'project') {
        const local = await db.projects.get(conflit.id)
        if (local === undefined) continue
        const fusionne = appliquerResolutions(
          local,
          conflit.distant as unknown as typeof local,
          choix,
        )
        await db.projects.put({
          ...fusionne,
          updated_at: maintenant,
          audit_log: [
            ...local.audit_log,
            {
              timestamp: maintenant,
              actor: local.audit_log.at(-1)?.actor ?? 'utilisateur',
              action: motif,
            },
          ],
        })
      } else {
        const local = await db.sections.get(conflit.id)
        if (local === undefined) continue
        const fusionne = appliquerResolutions(
          local,
          conflit.distant as unknown as typeof local,
          choix,
        )
        await db.sections.put({
          ...fusionne,
          updated_at: maintenant,
          audit_log: [
            ...local.audit_log,
            { timestamp: maintenant, actor: local.owner_id, action: motif },
          ],
          revisions: [
            ...local.revisions,
            { version: local.meta.version, date: maintenant, auteur: local.owner_id, motif },
          ],
        })
      }
    }

    // La résolution repart de l'état distant : le SHA connu devient donc
    // le SHA distant actuel avant de repousser l'état fusionné.
    const shaActuel = await connecteur.shaBrancheActuel()
    await enregistrerNouvelEtat(shaActuel)
    return synchroniser()
  }

  async function lireDistantOuNull(
    connecteur: GitHubConnector,
    chemin: string,
  ): Promise<Record<string, unknown> | null> {
    try {
      const { contenu } = await connecteur.lire(chemin)
      return JSON.parse(contenu) as Record<string, unknown>
    } catch (erreur) {
      if (erreur instanceof FichierIntrouvableError) return null
      throw erreur
    }
  }

  return {
    synchronisationEnCours,
    derniereSynchronisation,
    synchroniser,
    recupererDepuisGitHub,
    analyserConflit,
    confirmerResolutionConflits,
  }
})
