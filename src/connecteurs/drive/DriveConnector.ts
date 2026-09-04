import { AuthentificationError, QuotaDepasseError, TimeoutError } from './erreurs'

export interface ConfigDriveConnector {
  /** Dossier Drive dédié du client (SDS §5bis) — jamais la racine du compte. */
  dossierId: string
  jeton: string
  /** Délai d'attente réseau en ms avant `TimeoutError` (défaut 15s). */
  delaiMaxMs?: number
}

export interface FichierAMirroir {
  /** Conservé tel quel comme nom de fichier Drive (traçabilité — SDS §5bis ne définit pas de sous-dossiers). */
  chemin: string
  contenu: string
}

export interface ConfirmationMiroir {
  nbFichiers: number
}

const DELAI_MAX_PAR_DEFAUT_MS = 15_000
const TYPE_MIME_CONTENU = 'application/json'

/**
 * Connecteur Drive (SDS §5bis) — un seul point d'entrée (`miroir()`), aucune
 * logique métier propre. N'est **jamais une source de vérité, jamais lu par
 * l'application** : `miroir()` écrit un instantané
 * dans le dossier Drive dédié du client, en écrasant systématiquement le
 * contenu existant — jamais de tentative de fusion (cohérent avec "jamais
 * lu comme source").
 *
 * @requirement SDS §5bis
 *
 * Aucun accès disque natif, aucune bibliothèque cliente Drive tierce —
 * exclusivement l'API REST Drive v3 via `fetch` (mêmes conventions que
 * `GitHubConnector`, 08-conventions-codage.md §2).
 *
 * Contrairement à l'API Git Data de GitHub, l'API Drive n'offre pas
 * d'écriture groupée atomique multi-fichiers — chaque fichier nécessite sa
 * propre recherche (existe-t-il déjà ?) puis sa propre écriture
 * (création ou mise à jour du contenu). Compromis assumé : le miroir Drive
 * est un filet de secours déclenché manuellement/en fin de session,
 * pas un chemin chaud à fort volume comme la synchronisation
 * GitHub — la simplicité et la correction priment ici sur le nombre
 * d'appels.
 */
export class DriveConnector {
  private readonly delaiMaxMs: number

  constructor(private readonly config: ConfigDriveConnector) {
    this.delaiMaxMs = config.delaiMaxMs ?? DELAI_MAX_PAR_DEFAUT_MS
  }

  /**
   * Vérifie réellement l'accès (jeton valide, dossier accessible) en
   * lisant les métadonnées du dossier configuré — pas une simple
   * validation de forme des champs. Usage ponctuel (écran de
   * configuration), pas le chemin de `miroir()`.
   */
  async verifierDossier(): Promise<{ nom: string }> {
    const reponse = await this.appel(
      `https://www.googleapis.com/drive/v3/files/${this.config.dossierId}?fields=name,mimeType`,
    )
    const corps = (await reponse.json()) as { name: string; mimeType: string }
    if (corps.mimeType !== 'application/vnd.google-apps.folder') {
      throw new Error("L'identifiant configuré ne désigne pas un dossier Drive.")
    }
    return { nom: corps.name }
  }

  async miroir(fichiers: readonly FichierAMirroir[]): Promise<ConfirmationMiroir> {
    for (const fichier of fichiers) {
      const idExistant = await this.rechercherFichier(fichier.chemin)
      if (idExistant !== null) {
        await this.ecraserContenu(idExistant, fichier.contenu)
      } else {
        await this.creerFichier(fichier.chemin, fichier.contenu)
      }
    }
    return { nbFichiers: fichiers.length }
  }

  private async rechercherFichier(nom: string): Promise<string | null> {
    const nomEchappe = nom.replace(/'/g, "\\'")
    const requete = `'${this.config.dossierId}' in parents and name='${nomEchappe}' and trashed=false`
    const reponse = await this.appel(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(requete)}&fields=files(id)&spaces=drive`,
    )
    const corps = (await reponse.json()) as { files: Array<{ id: string }> }
    return corps.files[0]?.id ?? null
  }

  private async ecraserContenu(fichierId: string, contenu: string): Promise<void> {
    await this.appel(
      `https://www.googleapis.com/upload/drive/v3/files/${fichierId}?uploadType=media`,
      { method: 'PATCH', body: contenu, headers: { 'Content-Type': TYPE_MIME_CONTENU } },
    )
  }

  private async creerFichier(nom: string, contenu: string): Promise<void> {
    const frontiere = `validapharm-${crypto.randomUUID()}`
    const metadonnees = JSON.stringify({ name: nom, parents: [this.config.dossierId] })
    const corps =
      `--${frontiere}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n${metadonnees}\r\n` +
      `--${frontiere}\r\n` +
      `Content-Type: ${TYPE_MIME_CONTENU}\r\n\r\n${contenu}\r\n` +
      `--${frontiere}--`

    await this.appel('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      body: corps,
      headers: { 'Content-Type': `multipart/related; boundary=${frontiere}` },
    })
  }

  private async appel(url: string, options?: RequestInit): Promise<Response> {
    const controleur = new AbortController()
    const minuteur = setTimeout(() => controleur.abort(), this.delaiMaxMs)

    let reponse: Response
    try {
      reponse = await fetch(url, {
        ...options,
        signal: controleur.signal,
        headers: {
          Authorization: `Bearer ${this.config.jeton}`,
          ...options?.headers,
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
    if (reponse.status === 403) {
      const message = await extraireMessageErreur(reponse)
      throw new QuotaDepasseError(message ?? undefined)
    }

    throw new Error(`Appel à l'API Drive échoué (${reponse.status}) : ${url}`)
  }
}

/** Best-effort : le corps d'erreur Drive n'est pas garanti lisible deux fois, jamais bloquant si absent/invalide. */
async function extraireMessageErreur(reponse: Response): Promise<string | null> {
  try {
    const corps = (await reponse.json()) as { error?: { message?: string } }
    return corps.error?.message ?? null
  } catch {
    return null
  }
}
