import { AuthentificationError, QuotaDepasseError, TimeoutError } from './erreurs'

export interface ConfigDriveReaderConnector {
  /** Dossier Drive à parcourir en lecture (peut être le même dossier que le miroir d'écriture, ou un autre dédié à la bibliothèque de normes). */
  dossierId: string
  jeton: string
  delaiMaxMs?: number
}

export interface FichierDrive {
  id: string
  nom: string
  mimeType: string
  modifiedTime: string
}

const DELAI_MAX_PAR_DEFAUT_MS = 15_000
/** Types natifs Google (Docs/Sheets/Slides/...) — sans équivalent binaire téléchargeable, exportés en texte brut via l'API Drive plutôt que téléchargés. */
const MIME_TYPES_GOOGLE_NATIFS: ReadonlySet<string> = new Set([
  'application/vnd.google-apps.document',
  'application/vnd.google-apps.spreadsheet',
  'application/vnd.google-apps.presentation',
])

/**
 * Connecteur Drive **en lecture** — délibérément une classe distincte de
 * `DriveConnector` (miroir écriture seule, jamais lu comme source, voir sa
 * documentation) : la bibliothèque de normes a besoin de parcourir un
 * dossier Drive et de lire le contenu réel de ses fichiers, un besoin
 * fonctionnellement opposé au miroir de sauvegarde. Mêmes conventions que
 * `DriveConnector`/`GitHubConnector` : API REST Drive v3 via `fetch`
 * uniquement, aucune bibliothèque cliente tierce.
 *
 * @requirement Bibliothèque de normes — lecture Drive
 */
export class DriveReaderConnector {
  private readonly delaiMaxMs: number

  constructor(private readonly config: ConfigDriveReaderConnector) {
    this.delaiMaxMs = config.delaiMaxMs ?? DELAI_MAX_PAR_DEFAUT_MS
  }

  /** Vérifie réellement l'accès en listant le dossier configuré — pas une simple validation de forme. */
  async tester(): Promise<boolean> {
    await this.listerFichiers()
    return true
  }

  /** Liste les fichiers directement contenus dans le dossier configuré (non récursif — cohérent avec `GitHubConnector.chargerArborescence` qui, lui, est récursif par API Git native ; Drive n'offre pas d'équivalent aussi direct). */
  async listerFichiers(): Promise<FichierDrive[]> {
    const requete = `'${this.config.dossierId}' in parents and trashed=false`
    const reponse = await this.appel(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(requete)}&fields=files(id,name,mimeType,modifiedTime)&spaces=drive`,
    )
    const corps = (await reponse.json()) as { files: FichierDrive[] }
    return corps.files
  }

  /**
   * Télécharge le contenu binaire réel d'un fichier (jamais pour un
   * document Google natif — utiliser `lireTexteExporte` à la place, un
   * Google Doc n'a pas de représentation binaire téléchargeable).
   */
  async telechargerContenu(fichierId: string): Promise<ArrayBuffer> {
    const reponse = await this.appel(
      `https://www.googleapis.com/drive/v3/files/${fichierId}?alt=media`,
    )
    return reponse.arrayBuffer()
  }

  /** Exporte un document Google natif (Docs/Sheets/Slides) en texte brut — seule voie de lecture pour ce type de fichier. */
  async lireTexteExporte(fichierId: string): Promise<string> {
    const reponse = await this.appel(
      `https://www.googleapis.com/drive/v3/files/${fichierId}/export?mimeType=text/plain`,
    )
    return reponse.text()
  }

  estDocumentGoogleNatif(mimeType: string): boolean {
    return MIME_TYPES_GOOGLE_NATIFS.has(mimeType)
  }

  private async appel(url: string): Promise<Response> {
    const controleur = new AbortController()
    const minuteur = setTimeout(() => controleur.abort(), this.delaiMaxMs)

    let reponse: Response
    try {
      reponse = await fetch(url, {
        signal: controleur.signal,
        headers: { Authorization: `Bearer ${this.config.jeton}` },
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
