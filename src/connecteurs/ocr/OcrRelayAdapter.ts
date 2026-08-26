import {
  IndisponibleError,
  QuotaExceededError,
  ReponseInvalideError,
  TimeoutError,
} from './erreurs'

export interface ConfigOcrRelayAdapter {
  /** URL du relais serverless OCR (TD-001, Cloudflare Workers) — jamais une API de vision directement. */
  relayUrl: string
  jeton?: string
  /** Délai d'attente réseau en ms avant `TimeoutError` (défaut 45s — une extraction OCR asynchrone côté fournisseur peut prendre du temps, cf. `workers/ocr-relay`). */
  delaiMaxMs?: number
}

export interface ResultatExtractionOcr {
  texte: string
  fournisseur: string
  version_moteur: string | null
}

const DELAI_MAX_PAR_DEFAUT_MS = 45_000

/**
 * Adaptateur client du relais OCR (TD-001, `docs/convergence/
 * TECHNICAL_DECISIONS.md`) — même principe que `RelayProviderAdapter`
 * (connecteurs/ia) : n'appelle jamais un fournisseur de vision cloud
 * directement, uniquement le relais serverless sans état qui masque la
 * clé API et l'identité du fournisseur relayé.
 *
 * @requirement TD-001
 */
export class OcrRelayAdapter {
  private readonly delaiMaxMs: number

  constructor(private readonly config: ConfigOcrRelayAdapter) {
    this.delaiMaxMs = config.delaiMaxMs ?? DELAI_MAX_PAR_DEFAUT_MS
  }

  async extraireTexte(imageBytes: Blob, contentType: string): Promise<ResultatExtractionOcr> {
    const controleur = new AbortController()
    const minuteur = setTimeout(() => controleur.abort(), this.delaiMaxMs)

    let reponse: Response
    try {
      reponse = await fetch(this.config.relayUrl, {
        method: 'POST',
        signal: controleur.signal,
        headers: {
          'Content-Type': contentType,
          ...(this.config.jeton ? { Authorization: `Bearer ${this.config.jeton}` } : {}),
        },
        body: imageBytes,
      })
    } catch (erreur) {
      if (erreur instanceof Error && erreur.name === 'AbortError') throw new TimeoutError()
      throw new IndisponibleError()
    } finally {
      clearTimeout(minuteur)
    }

    if (reponse.status === 429) throw new QuotaExceededError()
    if (reponse.status >= 500) throw new IndisponibleError()
    if (!reponse.ok) {
      throw new ReponseInvalideError(`Appel au relais OCR échoué (${reponse.status}).`)
    }

    return extraireReponse(reponse)
  }
}

async function extraireReponse(reponse: Response): Promise<ResultatExtractionOcr> {
  let corps: unknown
  try {
    corps = await reponse.json()
  } catch {
    throw new ReponseInvalideError()
  }
  if (
    typeof corps !== 'object' ||
    corps === null ||
    typeof (corps as { texte?: unknown }).texte !== 'string'
  ) {
    throw new ReponseInvalideError()
  }
  const c = corps as { texte: string; fournisseur?: string; version_moteur?: string }
  return {
    texte: c.texte,
    fournisseur: c.fournisseur ?? 'inconnu',
    version_moteur: c.version_moteur ?? null,
  }
}
