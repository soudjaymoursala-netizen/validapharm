import {
  IndisponibleError,
  QuotaExceededError,
  ReponseInvalideError,
  TimeoutError,
} from './erreurs'
import type { ContexteEnvoi, ModeUsageIA, ProviderAdapter, Reponse } from './ProviderAdapter'

export interface ConfigRelayProviderAdapter {
  /** URL du relais serverless (SDS §10quater, Cloudflare Workers) — jamais l'API du fournisseur directement. */
  relayUrl: string
  jeton?: string
  /** Nom du fournisseur configuré côté relais — affichage seul (URS-F-034), le relais route déjà en fonction de `client_config.ai_provider`. */
  nomAffiche: string
  /** Délai d'attente réseau en ms avant `TimeoutError` (défaut 30s — plus long qu'un appel API classique, une génération IA prend du temps). */
  delaiMaxMs?: number
}

const DELAI_MAX_PAR_DEFAUT_MS = 30_000

/**
 * Adaptateur fournisseur cloud (SDS §6/§10quater) — n'appelle jamais un
 * fournisseur IA directement, uniquement le relais serverless sans état
 * qui masque la clé API (répond à URS-NF-044ter, corrige AR-R-64).
 *
 * @requirement SDS §6, §10quater, URS-F-032, URS-NF-044ter
 *
 * Le relais route déjà vers le bon fournisseur/modèle selon `mode`
 * (`chat_normatif` | `audit_simule`, URS-F-038bis) et la configuration
 * serveur associée au client — ce connecteur ne connaît que l'URL du
 * relais, jamais l'identité du fournisseur final ni sa clé API.
 */
export class RelayProviderAdapter implements ProviderAdapter {
  readonly estCloud = true
  private readonly delaiMaxMs: number

  constructor(private readonly config: ConfigRelayProviderAdapter) {
    this.delaiMaxMs = config.delaiMaxMs ?? DELAI_MAX_PAR_DEFAUT_MS
  }

  get nomAffiche(): string {
    return this.config.nomAffiche
  }

  async envoyerMessage(
    mode: ModeUsageIA,
    contexte: ContexteEnvoi,
    question: string,
  ): Promise<Reponse> {
    const controleur = new AbortController()
    const minuteur = setTimeout(() => controleur.abort(), this.delaiMaxMs)

    let reponse: Response
    try {
      reponse = await fetch(this.config.relayUrl, {
        method: 'POST',
        signal: controleur.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.jeton ? { Authorization: `Bearer ${this.config.jeton}` } : {}),
        },
        body: JSON.stringify({
          mode,
          question,
          contenu_joint: contexte.contenu_joint,
          ...(contexte.contenu_joint ? { contenu: contexte.contenu } : {}),
        }),
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
      throw new ReponseInvalideError(`Appel au relais IA échoué (${reponse.status}).`)
    }

    return extraireReponse(reponse)
  }
}

async function extraireReponse(reponse: Response): Promise<Reponse> {
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
  const c = corps as { texte: string; version_moteur?: string; citations?: string[] }
  return {
    texte: c.texte,
    version_moteur: c.version_moteur ?? null,
    citations: c.citations ?? [],
  }
}
