import {
  AuthentificationError,
  ConflitShaError,
  FichierIntrouvableError,
  PorteeInsuffisanteError,
  QuotaApiDepasseError,
  TimeoutError,
} from './erreurs'

export interface ConfigGitHubConnector {
  owner: string
  repo: string
  /** Branche protégée servant de source de vérité. */
  branche?: string
  jeton: string
  /** Délai d'attente réseau en ms avant `TimeoutError` (défaut 15s). */
  delaiMaxMs?: number
}

export interface FichierLu {
  contenu: string
  sha: string
}

export interface EntreeArborescence {
  chemin: string
  sha: string
}

export interface FichierAEcrire {
  chemin: string
  contenu: string
}

export interface ConfirmationEcriture {
  commitSha: string
  nouvelleShaBranche: string
}

const BRANCHE_PAR_DEFAUT = 'main'
const DELAI_MAX_PAR_DEFAUT_MS = 15_000
const VERSION_API = '2022-11-28'

/**
 * Connecteur GitHub — seul point d'accès à la source de vérité.
 * Aucun binaire `git`, aucun accès disque : exclusivement l'API REST
 * GitHub via `fetch` (conventions §2).
 *
 * @requirement Mitigation des risques de conflit d'écriture et de quota API dépassé
 *
 * Stratégie d'appels délibérément alignée sur 09-architecture-
 * detaillee.md §5 : lecture en masse via l'API Git Trees (un seul appel
 * pour l'arborescence complète) plutôt qu'un appel par fichier, écriture
 * groupée via l'API Git Data (blob+arbre+commit, nombre d'appels constant
 * indépendant du nombre de fichiers modifiés) — jamais une boucle
 * lire/écrire fichier par fichier qui épuiserait le quota de 5000
 * requêtes/heure avant le volume de référence.
 */
export class GitHubConnector {
  private readonly branche: string
  private readonly delaiMaxMs: number

  constructor(private readonly config: ConfigGitHubConnector) {
    this.branche = config.branche ?? BRANCHE_PAR_DEFAUT
    this.delaiMaxMs = config.delaiMaxMs ?? DELAI_MAX_PAR_DEFAUT_MS
  }

  /** Lecture d'un fichier unique (API Contents) — usage ponctuel, pas la stratégie de synchronisation en masse. */
  async lire(chemin: string): Promise<FichierLu> {
    const reponse = await this.appel(
      `/repos/${this.config.owner}/${this.config.repo}/contents/${chemin}?ref=${this.branche}`,
    )
    const corps = (await reponse.json()) as { content: string; sha: string }
    return { contenu: decoderBase64Utf8(corps.content), sha: corps.sha }
  }

  /** SHA du commit actuellement pointé par la branche source de vérité. */
  async shaBrancheActuel(): Promise<string> {
    const reponse = await this.appel(
      `/repos/${this.config.owner}/${this.config.repo}/git/ref/heads/${this.branche}`,
    )
    const corps = (await reponse.json()) as { object: { sha: string } }
    return corps.object.sha
  }

  /**
   * Arborescence complète du dépôt en un seul appel (API Git Trees,
   * `recursive=1`) — à comparer au cache local par SHA pour ne récupérer
   * que les fichiers réellement changés.
   */
  async chargerArborescence(): Promise<EntreeArborescence[]> {
    const reponse = await this.appel(
      `/repos/${this.config.owner}/${this.config.repo}/git/trees/${this.branche}?recursive=1`,
    )
    const corps = (await reponse.json()) as {
      tree: Array<{ path: string; type: string; sha: string }>
    }
    return corps.tree
      .filter((entree) => entree.type === 'blob')
      .map((entree) => ({ chemin: entree.path, sha: entree.sha }))
  }

  /** Contenu d'un blob par SHA (API Git Blobs) — pour les fichiers changés identifiés par `chargerArborescence`. */
  async lireBlob(sha: string): Promise<string> {
    const reponse = await this.appel(
      `/repos/${this.config.owner}/${this.config.repo}/git/blobs/${sha}`,
    )
    const corps = (await reponse.json()) as { content: string }
    return decoderBase64Utf8(corps.content)
  }

  /**
   * Écriture groupée atomique (API Git Data : blob par fichier changé,
   * un arbre, un commit, une mise à jour de référence) — nombre d'appels
   * constant indépendant du nombre de fichiers.
   *
   * @param fichiers Fichiers à écrire (chemin + contenu complet).
   * @param shaBrancheAttendu SHA de la branche au moment de la dernière lecture (concurrence optimiste).
   * @param message Message de commit — encodage `{type} {ref} {action}` à la charge de l'appelant.
   * @throws ConflitShaError si la branche a changé depuis `shaBrancheAttendu` (avant ou pendant l'écriture).
   */
  async ecrireGroupe(
    fichiers: readonly FichierAEcrire[],
    shaBrancheAttendu: string,
    message: string,
  ): Promise<ConfirmationEcriture> {
    const shaActuel = await this.shaBrancheActuel()
    if (shaActuel !== shaBrancheAttendu) {
      throw new ConflitShaError()
    }

    const commitBase = await this.appel(
      `/repos/${this.config.owner}/${this.config.repo}/git/commits/${shaActuel}`,
    )
    const { tree: arbreBase } = (await commitBase.json()) as { tree: { sha: string } }

    const entreesArbre = await Promise.all(
      fichiers.map(async (fichier) => {
        const reponseBlob = await this.appel(
          `/repos/${this.config.owner}/${this.config.repo}/git/blobs`,
          { method: 'POST', body: JSON.stringify({ content: fichier.contenu }) },
        )
        const { sha } = (await reponseBlob.json()) as { sha: string }
        return { path: fichier.chemin, mode: '100644', type: 'blob', sha }
      }),
    )

    const reponseArbre = await this.appel(
      `/repos/${this.config.owner}/${this.config.repo}/git/trees`,
      {
        method: 'POST',
        body: JSON.stringify({ base_tree: arbreBase.sha, tree: entreesArbre }),
      },
    )
    const { sha: shaNouvelArbre } = (await reponseArbre.json()) as { sha: string }

    const reponseCommit = await this.appel(
      `/repos/${this.config.owner}/${this.config.repo}/git/commits`,
      {
        method: 'POST',
        body: JSON.stringify({ message, tree: shaNouvelArbre, parents: [shaActuel] }),
      },
    )
    const { sha: shaNouveauCommit } = (await reponseCommit.json()) as { sha: string }

    // force: false — GitHub rejette (422) si ce n'est pas un fast-forward,
    // c'est-à-dire si la branche a de nouveau changé entre le contrôle
    // ci-dessus et cette mise à jour (fenêtre de concurrence résiduelle,
    // traitée elle aussi comme un conflit).
    const reponseRef = await this.appel(
      `/repos/${this.config.owner}/${this.config.repo}/git/refs/heads/${this.branche}`,
      { method: 'PATCH', body: JSON.stringify({ sha: shaNouveauCommit, force: false }) },
      { statutConflitSupplementaire: 422 },
    )
    const { object } = (await reponseRef.json()) as { object: { sha: string } }

    return { commitSha: shaNouveauCommit, nouvelleShaBranche: object.sha }
  }

  private async appel(
    chemin: string,
    options?: RequestInit,
    reglages?: { statutConflitSupplementaire?: number },
  ): Promise<Response> {
    const controleur = new AbortController()
    const minuteur = setTimeout(() => controleur.abort(), this.delaiMaxMs)

    let reponse: Response
    try {
      reponse = await fetch(`https://api.github.com${chemin}`, {
        ...options,
        signal: controleur.signal,
        headers: {
          Authorization: `Bearer ${this.config.jeton}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': VERSION_API,
          ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
        },
      })
    } catch (erreur) {
      if (erreur instanceof Error && erreur.name === 'AbortError') {
        throw new TimeoutError()
      }
      throw erreur
    } finally {
      clearTimeout(minuteur)
    }

    if (reponse.ok) return reponse

    if (reponse.status === 401) throw new AuthentificationError()
    if (reponse.status === 404) throw new FichierIntrouvableError()
    if (reponse.status === 409 || reponse.status === reglages?.statutConflitSupplementaire) {
      throw new ConflitShaError()
    }
    if (reponse.status === 403) {
      if (reponse.headers.get('X-RateLimit-Remaining') === '0') {
        const resetEnteteEpoch = reponse.headers.get('X-RateLimit-Reset')
        throw new QuotaApiDepasseError(
          "Quota d'appels à l'API GitHub épuisé (5000/heure).",
          resetEnteteEpoch !== null ? new Date(Number(resetEnteteEpoch) * 1000) : null,
        )
      }
      throw new PorteeInsuffisanteError()
    }

    throw new Error(`Appel à l'API GitHub échoué (${reponse.status}) : ${chemin}`)
  }
}

function decoderBase64Utf8(base64: string): string {
  const binaire = atob(base64.replace(/\n/g, ''))
  const octets = Uint8Array.from(binaire, (caractere) => caractere.charCodeAt(0))
  return new TextDecoder('utf-8').decode(octets)
}
