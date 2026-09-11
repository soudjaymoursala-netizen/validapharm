import {
  IndisponibleError,
  QuotaExceededError,
  ReponseInvalideError,
  TimeoutError,
} from './erreurs'
import type { ContexteEnvoi, ModeUsageIA, ProviderAdapter, Reponse } from './ProviderAdapter'

export interface ConfigRelayProviderAdapter {
  /** URL du relais serverless (Cloudflare Workers) — jamais l'API du fournisseur directement. */
  relayUrl: string
  jeton?: string
  /** Nom du fournisseur configuré côté relais — affichage seul, le relais route déjà en fonction de `client_config.ai_provider`. */
  nomAffiche: string
  /** Délai d'attente réseau en ms avant `TimeoutError` (défaut 30s — plus long qu'un appel API classique, une génération IA prend du temps). */
  delaiMaxMs?: number
}

const DELAI_MAX_PAR_DEFAUT_MS = 30_000

/**
 * Adaptateur fournisseur cloud — n'appelle jamais un
 * fournisseur IA directement, uniquement le relais serverless sans état
 * qui masque la clé API (corrige le risque d'exposition de la clé API côté client).
 *
 * @requirement Adaptateur fournisseur cloud via relais serverless
 *
 * Le relais route déjà vers le bon fournisseur/modèle selon `mode`
 * (`chat_normatif` | `audit_simule`) et la configuration
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

  /**
   * Vérifie réellement la connexion (jeton valide, relais joignable) — un
   * `GET` dédié côté relais qui n'appelle jamais le fournisseur IA sous-
   * jacent (voir `relayHandler.ts`), pour ne jamais facturer un appel
   * fournisseur au seul geste de « Tester la connexion ».
   */
  async tester(): Promise<void> {
    if (this.config.relayUrl.trim().length === 0) {
      throw new ReponseInvalideError(
        'Relais IA non configuré : renseignez son URL avant de tester la connexion.',
      )
    }

    const controleur = new AbortController()
    const minuteur = setTimeout(() => controleur.abort(), this.delaiMaxMs)

    let reponse: Response
    try {
      reponse = await fetch(this.config.relayUrl, {
        method: 'GET',
        signal: controleur.signal,
        headers: {
          ...(this.config.jeton ? { Authorization: `Bearer ${this.config.jeton}` } : {}),
        },
      })
    } catch (erreur) {
      if (erreur instanceof Error && erreur.name === 'AbortError') throw new TimeoutError()
      throw new IndisponibleError()
    } finally {
      clearTimeout(minuteur)
    }

    if (reponse.status >= 500) throw new IndisponibleError()
    if (reponse.status === 401) {
      throw new ReponseInvalideError('Jeton invalide — vérifiez sa valeur.')
    }
    if (!reponse.ok) {
      throw new ReponseInvalideError(`Test du relais IA échoué (${reponse.status}).`)
    }
  }

  async envoyerMessage(
    mode: ModeUsageIA,
    contexte: ContexteEnvoi,
    question: string,
  ): Promise<Reponse> {
    // Relais jamais configuré (URL vide) : sans cette garde, `fetch('')`
    // interroge silencieusement la page courante et remonte un statut HTTP
    // technique (404/200 HTML...) sans aucun rapport avec la vraie cause —
    // constaté en test manuel, l'utilisateur ne voyait qu'un « échoué (404) »
    // sans comprendre qu'il fallait renseigner Configuration › Relais IA.
    if (this.config.relayUrl.trim().length === 0) {
      throw new ReponseInvalideError(
        "Relais IA non configuré : renseignez son URL dans Configuration › Relais IA avant d'utiliser l'assistant.",
      )
    }

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
