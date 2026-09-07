import { ErreurFournisseurIA, type FournisseurIA, type ResultatEnvoiIA } from './FournisseurIA'

/**
 * Fournisseur Claude (Anthropic) — Messages API, contrat REST documenté
 * par Anthropic (dernière vérification par recherche le 07/09/2026 — **à
 * revérifier contre la documentation Anthropic au moment du déploiement
 * réel**, aucun appel en conditions réelles n'a été possible depuis cette
 * session, même limite que `AzureVisionProvider`).
 *
 * `POST {endpoint}/v1/messages`, en-têtes `x-api-key` + `anthropic-version`,
 * corps `{ model, max_tokens, system, messages: [{ role: 'user', content }] }`
 * → `content[0].text` porte la réponse, `model` confirme la version
 * réellement utilisée (peut différer de l'alias demandé, ex. `-latest`).
 *
 * Aucune donnée n'est conservée par ce fournisseur au-delà du traitement
 * de la requête en cours (principe d'absence d'état, même limite que
 * `AzureVisionProvider`) — un seul appel HTTP, jamais de sondage ni
 * d'état intermédiaire.
 */
export interface ConfigClaudeProvider {
  cleApi: string
  /** Nombre maximal de jetons de sortie — plafond de coût par appel, jamais illimité. */
  maxTokens?: number
  endpoint?: string
}

const MAX_TOKENS_PAR_DEFAUT = 4096
const ENDPOINT_PAR_DEFAUT = 'https://api.anthropic.com'
const VERSION_API_ANTHROPIC = '2023-06-01'

interface ReponseMessagesAnthropic {
  content?: Array<{ type: string; text?: string }>
  model?: string
}

interface ReponseErreurAnthropic {
  error?: { type?: string; message?: string }
}

export class ClaudeProvider implements FournisseurIA {
  private readonly endpoint: string
  private readonly maxTokens: number

  constructor(private readonly config: ConfigClaudeProvider) {
    this.endpoint = config.endpoint ?? ENDPOINT_PAR_DEFAUT
    this.maxTokens = config.maxTokens ?? MAX_TOKENS_PAR_DEFAUT
  }

  async envoyerMessage(
    systemPrompt: string,
    userMessage: string,
    modele: string,
  ): Promise<ResultatEnvoiIA> {
    let reponse: Response
    try {
      reponse = await fetch(`${this.endpoint}/v1/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.config.cleApi,
          'anthropic-version': VERSION_API_ANTHROPIC,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modele,
          max_tokens: this.maxTokens,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
      })
    } catch {
      throw new ErreurFournisseurIA('Appel réseau au fournisseur Claude échoué.', null)
    }

    if (!reponse.ok) {
      const message = await messageErreur(reponse)
      throw new ErreurFournisseurIA(
        `Appel Claude refusé (statut ${reponse.status}) : ${message}`,
        reponse.status,
      )
    }

    const corps = (await reponse.json()) as ReponseMessagesAnthropic
    const texte = (corps.content ?? [])
      .filter((bloc) => bloc.type === 'text' && typeof bloc.text === 'string')
      .map((bloc) => bloc.text as string)
      .join('')

    if (texte.length === 0) {
      throw new ErreurFournisseurIA('Réponse Claude sans contenu textuel exploitable.', null)
    }

    return { texte, version_moteur: corps.model ?? null }
  }
}

async function messageErreur(reponse: Response): Promise<string> {
  try {
    const corps = (await reponse.json()) as ReponseErreurAnthropic
    return corps.error?.message ?? 'erreur inconnue'
  } catch {
    return 'erreur inconnue'
  }
}
